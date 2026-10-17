//! `asolaria`: Ed25519 keygen / sign / verify, the tighten-only gate verdict and the observed
//! L0 path, from the shell. Results are HBP rows (`json=0`); only `keygen` writes a file.

#![forbid(unsafe_code)]

mod envelope;

use std::ffi::OsString;
use std::fs::{File, OpenOptions};
use std::io::{self, Read, Write};
use std::path::Path;
use std::process::ExitCode;

use asolaria_hookwall::crypto::{
    derive_public, sign, verify, CryptoErr, PrivateKey, PublicKey, Signature, PRIVATE_KEY_LEN,
    PUBLIC_KEY_LEN, SIGNATURE_LEN,
};
use asolaria_observed::{observe_and_compose, Observed};
use asolaria_verdict::{compose, strictest, Composed, Severity, GATE_NAMES};
use l0_edge::event::parse_events;
use zeroize::Zeroizing;

const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Seed files longer than this are rejected before parsing (64 hex + CRLF fits easily).
const SEED_FILE_READ_LIMIT: u64 = 80;

/// Envelopes larger than this are a usage error; real envelopes are a few hundred bytes.
const ENVELOPE_READ_LIMIT: u64 = 1024 * 1024;

const HELP: &str = "\
asolaria - Ed25519 signing and tighten-only gate verdicts for the Asolaria Aether stack

USAGE
  asolaria keygen --out <seed-file>
  asolaria pubkey --key <seed-file>
  asolaria sign   --key <seed-file> <file|->
  asolaria verify --pub <64 hex> --sig <128 hex> <file|->
  asolaria gate   <envelope-file|-> [--pub <64 hex> --sig <128 hex>]
  asolaria observe --events <events.hbp|-> <envelope-file|-> [--pub <64 hex> --sig <128 hex>]
  asolaria help [<command>] | <command> --help | --version

OUTPUT
  One pipe-delimited HBP row per command on stdout, e.g. VERIFY|ok=1|json=0.
  Errors go to stderr as ERROR|kind=<usage|io>|reason=<escaped>|json=0.

EXIT CODES
  0  success / gate or observe PROCEED     3  HOLD
  1  verify failed, I/O error, or the result row could not be written
  2  usage, envelope or events parse error
  4  BLOCK
  Only 0 means PROCEED: treat every other exit code as do-not-proceed.
  -h or --help before -- prints help with exit 0 and no GATE row: put -- before file paths and
  require the GATE row.

SCOPE
  Real Ed25519 (ed25519-dalek, verify_strict). The gates are deterministic software policy
  over the values you supply; they are not measurements and enforce nothing by themselves.
  observe computes the scores from the events file you supply, which decides the L0 term; --sig
  does not cover it.
  signature=verified only means the exact bytes were signed by the key passed as --pub: take
  --pub from a trusted channel. No key registry; signed envelopes have no expiry or nonce and
  can be replayed. Nothing persists. No physical attestation. A seed file is a secret: keep it
  0600 and outside any repository.
";

const HELP_KEYGEN: &str = "\
USAGE
  asolaria keygen --out <seed-file>

Writes 32 bytes of OS randomness as 64 lowercase hex characters and a newline to a NEW file
(mode 0600 on Unix; an existing file is never overwritten, exit 2). Prints
KEYGEN|public=<hex>|seed_file=<path>|json=0 and never the seed. The seed file is a secret:
keep it outside any repository. If the row cannot be written, the seed file is removed (exit 1).
";

const HELP_PUBKEY: &str = "\
USAGE
  asolaria pubkey --key <seed-file>

Prints PUBKEY|public=<hex>|json=0 for a seed file of exactly 64 hex characters and an
optional trailing newline. Anything else is a usage error (exit 2).
";

const HELP_SIGN: &str = "\
USAGE
  asolaria sign --key <seed-file> <file|->

Signs the exact bytes of <file> (or stdin for -) with Ed25519 and prints
SIGN|sig=<128 hex>|public=<64 hex>|bytes=<n>|json=0.
";

const HELP_VERIFY: &str = "\
USAGE
  asolaria verify --pub <64 hex> --sig <128 hex> <file|->

Exit 0 and VERIFY|ok=1|json=0 when the signature is valid for the exact bytes; exit 1 and
VERIFY|ok=0|reason=<signature_invalid|key_malformed>|json=0 otherwise. Malformed hex is exit 2.
";

const HELP_GATE: &str = "\
USAGE
  asolaria gate <envelope-file|-> [--pub <64 hex> --sig <128 hex>]

Parses a key=value envelope (see README), composes the five gates and prints
GATE|verdict=..|hookwall=..|spawn_gate=..|tier_gate=..|fischer=..|input_guard=..|
signature=<verified|invalid|unchecked>|reason=..|json=0 (one line).
With --pub/--sig, an invalid signature makes the verdict BLOCK (tighten-only). --pub must
come from a trusted channel, never from the envelope's sender.
Exit 0 PROCEED, 3 HOLD, 4 BLOCK, 2 usage/parse error, 1 I/O error. Only 0 means PROCEED.
";

const HELP_OBSERVE: &str = "\
USAGE
  asolaria observe --events <events.hbp|-> <envelope-file|-> [--pub <64 hex> --sig <128 hex>]

Reads EVENT rows and an envelope with a payload key and without score keys (see README; a missing
payload, or forward_score_q, reverse_risk_q, composite, l0_real, shannon_q, shannon_above or
g4_state, is a usage error, exit 2). Scores the edge actor -> target with the L0 EdgeLevelGNN over
the events, computes the asolaria-score signals, composite and reverse gain, composes the five
gates and prints the GATE|.. row of `gate` with the score keys of asolaria-hookwall.mjs:48-51
after the verdict: score=<composite>|l0_real=<true|false>|mark=..|reverse_risk=<1 - composite>.
--pub/--sig cover the envelope bytes only, not the events file, which decides the L0 term.
Exit codes as for gate.
";

/// Per-command usage text, for `<command> --help` and `help <command>`.
fn command_help(command: &str) -> Option<&'static str> {
    match command {
        "keygen" => Some(HELP_KEYGEN),
        "pubkey" => Some(HELP_PUBKEY),
        "sign" => Some(HELP_SIGN),
        "verify" => Some(HELP_VERIFY),
        "gate" => Some(HELP_GATE),
        "observe" => Some(HELP_OBSERVE),
        _ => None,
    }
}

/// What a command prints on stdout, its exit code, and a file to remove if printing fails.
struct Report {
    text: String,
    code: u8,
    remove_on_write_failure: Option<String>,
}

impl Report {
    fn row(text: String, code: u8) -> Report {
        Report {
            text: format!("{text}\n"),
            code,
            remove_on_write_failure: None,
        }
    }

    fn help(text: &str) -> Report {
        Report {
            text: text.to_string(),
            code: 0,
            remove_on_write_failure: None,
        }
    }
}

enum Fail {
    Usage(String),
    Io(String),
    /// Output could not be written after a gate HOLD/BLOCK; keeps that exit code.
    Lost(String, u8),
}

impl Fail {
    fn exit_code(&self) -> u8 {
        match self {
            Fail::Usage(_) => 2,
            Fail::Io(_) => 1,
            Fail::Lost(_, code) => *code,
        }
    }

    fn row(&self) -> String {
        let (kind, reason) = match self {
            Fail::Usage(reason) => ("usage", reason),
            Fail::Io(reason) | Fail::Lost(reason, _) => ("io", reason),
        };
        format!("ERROR|kind={kind}|reason={}|json=0", escape(reason))
    }
}

fn usage(reason: impl Into<String>) -> Fail {
    Fail::Usage(reason.into())
}

/// Percent-encodes `%`, `|`, and control characters so a value never splits or ends an HBP row.
fn escape(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for c in value.chars() {
        if c == '%' || c == '|' || c.is_control() {
            let mut buf = [0u8; 4];
            for byte in c.encode_utf8(&mut buf).bytes() {
                out.push_str(&format!("%{byte:02X}"));
            }
        } else {
            out.push(c);
        }
    }
    out
}

/// Appends lowercase hex in place, with no intermediate allocation (used for the seed too).
fn push_hex(out: &mut String, bytes: &[u8]) {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    for byte in bytes {
        out.push(char::from(DIGITS[usize::from(byte >> 4)]));
        out.push(char::from(DIGITS[usize::from(byte & 0x0f)]));
    }
}

fn to_hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    push_hex(&mut out, bytes);
    out
}

fn nibble(c: u8) -> Option<u8> {
    match c {
        b'0'..=b'9' => Some(c - b'0'),
        b'a'..=b'f' => Some(c - b'a' + 10),
        b'A'..=b'F' => Some(c - b'A' + 10),
        _ => None,
    }
}

/// Decodes exactly `out.len() * 2` hex digits into `out`; false (with `out` zeroed) otherwise.
fn decode_hex_into(text: &[u8], out: &mut [u8]) -> bool {
    if text.len() != out.len() * 2 {
        return false;
    }
    for (slot, pair) in out.iter_mut().zip(text.chunks_exact(2)) {
        match (nibble(pair[0]), nibble(pair[1])) {
            (Some(high), Some(low)) => *slot = (high << 4) | low,
            _ => {
                out.iter_mut().for_each(|b| *b = 0);
                return false;
            }
        }
    }
    true
}

fn decode_public(text: &str) -> Result<PublicKey, Fail> {
    let mut out = [0u8; PUBLIC_KEY_LEN];
    if decode_hex_into(text.as_bytes(), &mut out) {
        Ok(PublicKey(out))
    } else {
        Err(usage(format!(
            "--pub must be exactly {} hex characters",
            PUBLIC_KEY_LEN * 2
        )))
    }
}

fn decode_signature(text: &str) -> Result<Signature, Fail> {
    let mut out = [0u8; SIGNATURE_LEN];
    if decode_hex_into(text.as_bytes(), &mut out) {
        Ok(Signature(out))
    } else {
        Err(usage(format!(
            "--sig must be exactly {} hex characters",
            SIGNATURE_LEN * 2
        )))
    }
}

/// Parsed command line: `--name value` / `--name=value` options plus positionals.
struct Args {
    options: Vec<(&'static str, String)>,
    positionals: Vec<String>,
    help: bool,
}

impl Args {
    fn parse(raw: &[String], allowed: &[&'static str]) -> Result<Args, Fail> {
        let mut options: Vec<(&'static str, String)> = Vec::new();
        let mut positionals = Vec::new();
        let mut iter = raw.iter();
        let mut only_positionals = false;
        while let Some(arg) = iter.next() {
            if only_positionals || arg == "-" || !arg.starts_with('-') {
                positionals.push(arg.clone());
                continue;
            }
            if arg == "--" {
                only_positionals = true;
                continue;
            }
            if arg == "--help" || arg == "-h" {
                return Ok(Args {
                    options,
                    positionals,
                    help: true,
                });
            }
            let (name, inline) = match arg.split_once('=') {
                Some((name, value)) => (name, Some(value.to_string())),
                None => (arg.as_str(), None),
            };
            let name = allowed
                .iter()
                .copied()
                .find(|known| *known == name)
                .ok_or_else(|| usage(format!("unknown option {name}")))?;
            let value = match inline {
                Some(value) => value,
                None => iter
                    .next()
                    .cloned()
                    .ok_or_else(|| usage(format!("{name} needs a value")))?,
            };
            if options.iter().any(|(seen, _)| *seen == name) {
                return Err(usage(format!("{name} given more than once")));
            }
            options.push((name, value));
        }
        Ok(Args {
            options,
            positionals,
            help: false,
        })
    }

    fn get(&self, name: &str) -> Option<&str> {
        self.options
            .iter()
            .find(|(seen, _)| *seen == name)
            .map(|(_, value)| value.as_str())
    }

    fn require(&self, name: &str) -> Result<&str, Fail> {
        self.get(name)
            .ok_or_else(|| usage(format!("missing required option {name}")))
    }

    fn positionals(&self, count: usize, what: &str) -> Result<&[String], Fail> {
        if self.positionals.len() == count {
            Ok(&self.positionals)
        } else {
            Err(usage(format!(
                "expected {what}, got {} positional argument(s)",
                self.positionals.len()
            )))
        }
    }
}

/// Reads a file's exact bytes, or stdin's when `source` is `-`.
fn read_input(source: &str) -> Result<Vec<u8>, Fail> {
    let mut bytes = Vec::new();
    if source == "-" {
        io::stdin()
            .lock()
            .read_to_end(&mut bytes)
            .map_err(|e| Fail::Io(format!("reading stdin: {e}")))?;
    } else {
        bytes = std::fs::read(source).map_err(|e| Fail::Io(format!("reading {source}: {e}")))?;
    }
    Ok(bytes)
}

/// Like `read_input`, but more than `limit` bytes is a usage error (read stops at `limit + 1`).
fn read_input_limited(source: &str, limit: u64) -> Result<Vec<u8>, Fail> {
    let mut bytes = Vec::new();
    let read = if source == "-" {
        io::stdin().lock().take(limit + 1).read_to_end(&mut bytes)
    } else {
        File::open(source)
            .map_err(|e| Fail::Io(format!("reading {source}: {e}")))?
            .take(limit + 1)
            .read_to_end(&mut bytes)
    };
    let name = if source == "-" { "stdin" } else { source };
    read.map_err(|e| Fail::Io(format!("reading {name}: {e}")))?;
    if bytes.len() as u64 > limit {
        return Err(usage(format!("{name} is larger than {limit} bytes")));
    }
    Ok(bytes)
}

/// Loads a seed file: exactly 64 hex characters, optionally followed by one newline.
fn read_seed(path: &str) -> Result<PrivateKey, Fail> {
    let file = File::open(path).map_err(|e| Fail::Io(format!("opening {path}: {e}")))?;
    let mut buf = Zeroizing::new(Vec::with_capacity(SEED_FILE_READ_LIMIT as usize + 1));
    file.take(SEED_FILE_READ_LIMIT + 1)
        .read_to_end(&mut buf)
        .map_err(|e| Fail::Io(format!("reading {path}: {e}")))?;
    let body = buf
        .strip_suffix(b"\r\n")
        .or_else(|| buf.strip_suffix(b"\n"))
        .unwrap_or(&buf);
    let mut key = PrivateKey([0u8; PRIVATE_KEY_LEN]);
    if !decode_hex_into(body, &mut key.0) {
        return Err(usage(format!(
            "seed file {path} must hold exactly {} hex characters and an optional newline",
            PRIVATE_KEY_LEN * 2
        )));
    }
    Ok(key)
}

fn public_of(key: &PrivateKey) -> Result<PublicKey, Fail> {
    derive_public(key).map_err(|e| Fail::Io(format!("deriving public key: {e:?}")))
}

fn create_secret_file(path: &str) -> Result<File, Fail> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    options.open(path).map_err(|e| {
        if e.kind() == io::ErrorKind::AlreadyExists {
            usage(format!("{path} already exists; refusing to overwrite"))
        } else {
            Fail::Io(format!("creating {path}: {e}"))
        }
    })
}

fn cmd_keygen(raw: &[String]) -> Result<Report, Fail> {
    let args = Args::parse(raw, &["--out"])?;
    if args.help {
        return Ok(Report::help(HELP_KEYGEN));
    }
    args.positionals(0, "no positional arguments")?;
    let out = args.require("--out")?;

    let mut key = PrivateKey([0u8; PRIVATE_KEY_LEN]);
    getrandom::getrandom(&mut key.0)
        .map_err(|e| Fail::Io(format!("OS randomness unavailable: {e}")))?;
    let public = public_of(&key)?;
    let mut text = Zeroizing::new(String::with_capacity(PRIVATE_KEY_LEN * 2 + 1));
    push_hex(&mut text, &key.0);
    text.push('\n');

    let mut file = create_secret_file(out)?;
    let written = file.write_all(text.as_bytes()).and_then(|()| file.sync_all());
    if let Err(e) = written {
        drop(file);
        let _ = std::fs::remove_file(out);
        return Err(Fail::Io(format!("writing {out}: {e}")));
    }
    let mut report = Report::row(
        format!(
            "KEYGEN|public={}|seed_file={}|json=0",
            to_hex(&public.0),
            escape(&Path::new(out).display().to_string())
        ),
        0,
    );
    report.remove_on_write_failure = Some(out.to_string());
    Ok(report)
}

fn cmd_pubkey(raw: &[String]) -> Result<Report, Fail> {
    let args = Args::parse(raw, &["--key"])?;
    if args.help {
        return Ok(Report::help(HELP_PUBKEY));
    }
    args.positionals(0, "no positional arguments")?;
    let key = read_seed(args.require("--key")?)?;
    Ok(Report::row(
        format!("PUBKEY|public={}|json=0", to_hex(&public_of(&key)?.0)),
        0,
    ))
}

fn cmd_sign(raw: &[String]) -> Result<Report, Fail> {
    let args = Args::parse(raw, &["--key"])?;
    if args.help {
        return Ok(Report::help(HELP_SIGN));
    }
    let source = &args.positionals(1, "one input file or -")?[0];
    let key = read_seed(args.require("--key")?)?;
    let message = read_input(source)?;
    let signature = sign(&message, &key).map_err(|e| Fail::Io(format!("signing: {e:?}")))?;
    Ok(Report::row(
        format!(
            "SIGN|sig={}|public={}|bytes={}|json=0",
            to_hex(&signature.0),
            to_hex(&public_of(&key)?.0),
            message.len()
        ),
        0,
    ))
}

fn verify_reason(err: CryptoErr) -> &'static str {
    match err {
        CryptoErr::KeyMalformed => "key_malformed",
        _ => "signature_invalid",
    }
}

fn cmd_verify(raw: &[String]) -> Result<Report, Fail> {
    let args = Args::parse(raw, &["--pub", "--sig"])?;
    if args.help {
        return Ok(Report::help(HELP_VERIFY));
    }
    let source = &args.positionals(1, "one input file or -")?[0];
    let public = decode_public(args.require("--pub")?)?;
    let signature = decode_signature(args.require("--sig")?)?;
    let message = read_input(source)?;
    Ok(match verify(&message, &signature, &public) {
        Ok(()) => Report::row("VERIFY|ok=1|json=0".to_string(), 0),
        Err(err) => Report::row(
            format!("VERIFY|ok=0|reason={}|json=0", verify_reason(err)),
            1,
        ),
    })
}

fn severity_exit(severity: Severity) -> u8 {
    match severity {
        Severity::Proceed => 0,
        Severity::Hold => 3,
        Severity::Block => 4,
    }
}

/// Value printed for every gate when a forged signature BLOCKs an envelope that did not parse.
const UNEVALUATED: &str = "UNEVALUATED";

fn gate_row(
    verdict: Severity,
    observation: &str,
    per_gate: &[(&str, &str)],
    signature: &str,
    reason: &str,
) -> String {
    let mut row = format!("GATE|verdict={}{observation}", verdict.as_str());
    for (name, severity) in per_gate {
        row.push_str(&format!("|{name}={severity}"));
    }
    row.push_str(&format!(
        "|signature={signature}|reason={}|json=0",
        escape(reason)
    ));
    row
}

/// The `--pub`/`--sig` pair: both or neither.
fn signature_option(args: &Args) -> Result<Option<(PublicKey, Signature)>, Fail> {
    match (args.get("--pub"), args.get("--sig")) {
        (Some(public), Some(signature)) => {
            Ok(Some((decode_public(public)?, decode_signature(signature)?)))
        }
        (None, None) => Ok(None),
        _ => Err(usage("--pub and --sig must be given together")),
    }
}

/// Outcome of the optional signature check over the exact envelope bytes.
struct SignatureCheck {
    state: &'static str,
    failure: Option<&'static str>,
}

fn check_signature(check: Option<(PublicKey, Signature)>, bytes: &[u8]) -> SignatureCheck {
    let failure = check.and_then(|(public, signature)| {
        verify(bytes, &signature, &public).err().map(verify_reason)
    });
    let state = match (check.is_some(), failure) {
        (false, _) => "unchecked",
        (true, None) => "verified",
        (true, Some(_)) => "invalid",
    };
    SignatureCheck { state, failure }
}

/// Input that does not parse: a usage error, or BLOCK with every gate unevaluated when the
/// signature failed.
fn unparseable(why: String, input: &str, signature: &SignatureCheck) -> Result<Report, Fail> {
    let Some(sig_why) = signature.failure else {
        return Err(usage(why));
    };
    let per_gate = GATE_NAMES.map(|name| (name, UNEVALUATED));
    let reason = format!("BLOCK by signature ({sig_why}); {input} unparseable: {why}");
    Ok(Report::row(
        gate_row(Severity::Block, "", &per_gate, signature.state, &reason),
        severity_exit(Severity::Block),
    ))
}

/// The GATE row and exit code: the composition, tightened to BLOCK by a failed signature.
fn verdict_row(composed: &Composed, observation: &str, signature: &SignatureCheck) -> (String, u8) {
    let signature_severity = if signature.failure.is_some() {
        Severity::Block
    } else {
        Severity::Proceed
    };
    let verdict = strictest(&[composed.verdict, signature_severity]);
    let reason = match signature.failure {
        Some(why) => format!(
            "BLOCK by signature ({why}); envelope alone: {}",
            composed.reason
        ),
        None => composed.reason.clone(),
    };
    let per_gate = composed
        .per_gate
        .map(|(name, severity)| (name, severity.as_str()));
    (
        gate_row(verdict, observation, &per_gate, signature.state, &reason),
        severity_exit(verdict),
    )
}

fn cmd_gate(raw: &[String]) -> Result<Report, Fail> {
    let args = Args::parse(raw, &["--pub", "--sig"])?;
    if args.help {
        return Ok(Report::help(HELP_GATE));
    }
    let source = &args.positionals(1, "one envelope file or -")?[0];
    let check = signature_option(&args)?;
    let bytes = read_input_limited(source, ENVELOPE_READ_LIMIT)?;
    let signature = check_signature(check, &bytes);

    let parsed = std::str::from_utf8(&bytes)
        .map_err(|_| "envelope is not UTF-8".to_string())
        .and_then(|text| envelope::parse(text).map_err(|e| format!("envelope: {e}")));
    let env = match parsed {
        Ok(env) => env,
        Err(why) => return unparseable(why, "envelope", &signature),
    };
    let (row, code) = verdict_row(&compose(&env), "", &signature);
    Ok(Report::row(row, code))
}

/// JavaScript `String(n)` of `n = units / 10^4`, a value with at most four decimals.
fn js_number_of_e4(units: u32) -> String {
    let (whole, fraction) = (units / 10_000, units % 10_000);
    if fraction == 0 {
        return whole.to_string();
    }
    let digits = format!("{fraction:04}");
    format!("{whole}.{}", digits.trim_end_matches('0'))
}

/// The score keys of the hookwall observation row (asolaria-hookwall.mjs:48-51), as JavaScript
/// renders `sc.composite`, `sc.l0_real`, `sc.mark` and `sc.reverseRisk`.
fn observation_keys(observed: &Observed) -> String {
    let score = &observed.envelope.fischer_score;
    let gain = &observed.reverse_gain;
    let mark = if gain.promoted {
        "FORWARD_GNN_MARK_GENIUS"
    } else {
        "REVERSE_GAIN_MARK_MISTAKE"
    };
    format!(
        "|score={}|l0_real={}|mark={mark}|reverse_risk={}",
        escape(&score.composite),
        score.l0_real,
        js_number_of_e4(gain.reverse_risk_e4)
    )
}

fn cmd_observe(raw: &[String]) -> Result<Report, Fail> {
    let args = Args::parse(raw, &["--events", "--pub", "--sig"])?;
    if args.help {
        return Ok(Report::help(HELP_OBSERVE));
    }
    let source = &args.positionals(1, "one envelope file or -")?[0];
    let events_source = args.require("--events")?;
    if events_source == "-" && source == "-" {
        return Err(usage(
            "--events and the envelope cannot both be read from stdin",
        ));
    }
    let check = signature_option(&args)?;
    let bytes = read_input_limited(source, ENVELOPE_READ_LIMIT)?;
    let events_bytes = read_input(events_source)?;
    let signature = check_signature(check, &bytes);

    let parsed = std::str::from_utf8(&bytes)
        .map_err(|_| "envelope is not UTF-8".to_string())
        .and_then(|text| envelope::parse_policy(text).map_err(|e| format!("envelope: {e}")));
    let policy = match parsed {
        Ok(policy) => policy,
        Err(why) => return unparseable(why, "envelope", &signature),
    };
    let parsed = std::str::from_utf8(&events_bytes)
        .map_err(|_| "events file is not UTF-8".to_string())
        .and_then(|text| parse_events(text).map_err(|e| format!("events: {e}")));
    let events = match parsed {
        Ok(events) => events,
        Err(why) => return unparseable(why, "events", &signature),
    };

    let (observed, composed) = observe_and_compose(&events, policy);
    let (row, code) = verdict_row(&composed, &observation_keys(&observed), &signature);
    Ok(Report::row(row, code))
}

fn run(raw: Vec<String>) -> Result<Report, Fail> {
    let Some((command, rest)) = raw.split_first() else {
        return Ok(Report::help(HELP));
    };
    match command.as_str() {
        "keygen" => cmd_keygen(rest),
        "pubkey" => cmd_pubkey(rest),
        "sign" => cmd_sign(rest),
        "verify" => cmd_verify(rest),
        "gate" => cmd_gate(rest),
        "observe" => cmd_observe(rest),
        "help" | "--help" | "-h" => match rest {
            [] => Ok(Report::help(HELP)),
            [topic] => command_help(topic)
                .map(Report::help)
                .ok_or_else(|| usage(format!("no help for {topic}; run `asolaria help`"))),
            _ => Err(usage("help takes at most one command name")),
        },
        "--version" | "-V" | "version" => Ok(Report::row(
            format!("VERSION|name=asolaria|version={VERSION}|json=0"),
            0,
        )),
        other => Err(usage(format!(
            "unknown command {other}; run `asolaria help`"
        ))),
    }
}

fn main() -> ExitCode {
    let raw: Result<Vec<String>, OsString> = std::env::args_os()
        .skip(1)
        .map(OsString::into_string)
        .collect();
    let outcome = match raw {
        Ok(raw) => run(raw),
        Err(_) => Err(usage("arguments must be valid UTF-8")),
    };
    let fail = match outcome {
        Ok(report) => match write_stdout(&report.text) {
            Ok(()) => return ExitCode::from(report.code),
            Err(e) => write_failure(report, &e),
        },
        Err(fail) => fail,
    };
    // Best effort: if stderr is gone too, the exit code still carries the result.
    let _ = writeln!(io::stderr().lock(), "{}", fail.row());
    ExitCode::from(fail.exit_code())
}

fn write_stdout(text: &str) -> io::Result<()> {
    let mut out = io::stdout().lock();
    out.write_all(text.as_bytes())?;
    out.flush()
}

/// The result row was lost (closed pipe, full disk). Never report success: a gate HOLD/BLOCK
/// keeps its exit code, everything else becomes an I/O error, and a fresh seed file is removed.
fn write_failure(report: Report, err: &io::Error) -> Fail {
    let mut reason = format!("writing output: {err}");
    if let Some(path) = report.remove_on_write_failure {
        let removed = std::fs::remove_file(&path).is_ok();
        reason.push_str(if removed {
            "; seed file removed"
        } else {
            "; seed file could not be removed"
        });
    }
    match report.code {
        0 | 1 => Fail::Io(reason),
        verdict => Fail::Lost(reason, verdict),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escape_removes_pipes_and_newlines_reversibly() {
        assert_eq!(escape("a|b\nc%d\re"), "a%7Cb%0Ac%25d%0De");
        assert!(!escape("|\n\r\t").contains(['|', '\n', '\r', '\t']));
    }

    #[test]
    fn hex_roundtrip_and_rejection() {
        let mut out = [0u8; 2];
        assert!(decode_hex_into(b"aB0f", &mut out));
        assert_eq!(out, [0xab, 0x0f]);
        assert_eq!(to_hex(&out), "ab0f");
        assert!(!decode_hex_into(b"ab0", &mut out));
        assert!(!decode_hex_into(b"zz00", &mut out));
        assert_eq!(out, [0, 0]);
    }

    #[test]
    fn args_reject_unknown_duplicate_and_missing_values() {
        let s = |v: &[&str]| v.iter().map(|a| a.to_string()).collect::<Vec<_>>();
        assert!(Args::parse(&s(&["--bogus", "x"]), &["--key"]).is_err());
        assert!(Args::parse(&s(&["--key", "a", "--key=b"]), &["--key"]).is_err());
        assert!(Args::parse(&s(&["--key"]), &["--key"]).is_err());
        let ok = Args::parse(&s(&["--key=k", "-", "--", "-x"]), &["--key"]).ok().unwrap();
        assert_eq!(ok.get("--key"), Some("k"));
        assert_eq!(ok.positionals, s(&["-", "-x"]));
        assert!(Args::parse(&s(&["--key", "-h"]), &["--key"]).ok().is_some_and(|a| !a.help));
        assert!(Args::parse(&s(&["--help", "--bogus"]), &["--key"]).ok().is_some_and(|a| a.help));
    }

    #[test]
    fn js_number_of_e4_is_the_shortest_decimal() {
        let cases = [
            (0, "0"),
            (10_000, "1"),
            (2139, "0.2139"),
            (7200, "0.72"),
            (1, "0.0001"),
        ];
        for (units, text) in cases {
            assert_eq!(js_number_of_e4(units), text);
        }
    }

    #[test]
    fn readme_documents_every_envelope_key() {
        let readme = include_str!("../README.md");
        for key in envelope::KEYS {
            assert!(readme.contains(&format!("| `{key}` |")), "{key} missing from README");
        }
    }
}
