//! End-to-end tests: every case runs the real `asolaria` binary.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};

const BIN: &str = env!("CARGO_BIN_EXE_asolaria");
const EXAMPLE: &str = include_str!("../examples/envelope.hbp");

/// y = 2 with every other byte zero has no curve point (it fails Edwards decompression).
const NON_POINT_KEY: &str = "0200000000000000000000000000000000000000000000000000000000000000";

/// A unique, self-removing directory under `std::env::temp_dir()`.
struct TempDir(PathBuf);

impl TempDir {
    fn new(label: &str) -> TempDir {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let path = std::env::temp_dir().join(format!(
            "asolaria-cli-{label}-{}-{nanos}-{}",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir(&path).expect("create temp dir");
        TempDir(path)
    }

    fn file(&self, name: &str, contents: &[u8]) -> PathBuf {
        let path = self.0.join(name);
        std::fs::write(&path, contents).expect("write temp file");
        path
    }

    fn path(&self, name: &str) -> PathBuf {
        self.0.join(name)
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn run(args: &[&str]) -> Output {
    Command::new(BIN).args(args).output().expect("run asolaria")
}

fn run_stdin(args: &[&str], input: &[u8]) -> Output {
    let mut child = Command::new(BIN)
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn asolaria");
    child
        .stdin
        .take()
        .expect("stdin")
        .write_all(input)
        .expect("write stdin");
    child.wait_with_output().expect("wait asolaria")
}

fn stdout(out: &Output) -> String {
    String::from_utf8(out.stdout.clone()).expect("utf8 stdout")
}

fn code(out: &Output) -> i32 {
    out.status.code().expect("exit code")
}

fn p(path: &Path) -> &str {
    path.to_str().expect("utf8 path")
}

/// Value of `key` in a single HBP row.
fn field(row: &str, key: &str) -> String {
    row.trim_end()
        .split('|')
        .find_map(|part| part.strip_prefix(&format!("{key}=")))
        .unwrap_or_else(|| panic!("{key} missing from {row}"))
        .to_string()
}

struct Keys {
    dir: TempDir,
    seed: PathBuf,
    public: String,
}

fn keygen(label: &str) -> Keys {
    let dir = TempDir::new(label);
    let seed = dir.path("seed.hex");
    let out = run(&["keygen", "--out", p(&seed)]);
    assert_eq!(code(&out), 0, "{out:?}");
    let public = field(&stdout(&out), "public");
    Keys { dir, seed, public }
}

fn sign_file(keys: &Keys, file: &Path) -> String {
    let out = run(&["sign", "--key", p(&keys.seed), p(file)]);
    assert_eq!(code(&out), 0, "{out:?}");
    field(&stdout(&out), "sig")
}

fn flip_hex_bit(hex: &str, index: usize) -> String {
    let mut chars: Vec<char> = hex.chars().collect();
    let nibble = chars[index].to_digit(16).expect("hex") ^ 1;
    chars[index] = char::from_digit(nibble, 16).expect("nibble");
    chars.into_iter().collect()
}

fn gate_text(text: &str, extra: &[&str]) -> Output {
    let dir = TempDir::new("gate");
    let env = dir.file("envelope.hbp", text.as_bytes());
    let mut args = vec!["gate", p(&env)];
    args.extend_from_slice(extra);
    run(&args)
}

#[test]
fn keygen_pubkey_sign_verify_roundtrip() {
    let keys = keygen("roundtrip");
    assert_eq!(keys.public.len(), 64);

    let pubkey = run(&["pubkey", "--key", p(&keys.seed)]);
    assert_eq!(code(&pubkey), 0);
    assert_eq!(stdout(&pubkey), format!("PUBKEY|public={}|json=0\n", keys.public));

    let message = keys.dir.file("msg.bin", b"exact bytes\r\n\0 with a trailing NUL");
    let signed = run(&["sign", "--key", p(&keys.seed), p(&message)]);
    let row = stdout(&signed);
    assert!(row.starts_with("SIGN|sig="), "{row}");
    assert_eq!(field(&row, "public"), keys.public);
    assert_eq!(field(&row, "bytes"), "34");
    assert_eq!(field(&row, "json"), "0");
    let sig = field(&row, "sig");
    assert_eq!(sig.len(), 128);

    let verified = run(&["verify", "--pub", &keys.public, "--sig", &sig, p(&message)]);
    assert_eq!(code(&verified), 0);
    assert_eq!(stdout(&verified), "VERIFY|ok=1|json=0\n");

    // stdin path signs and verifies the same bytes.
    let from_stdin = run_stdin(
        &["sign", "--key", p(&keys.seed), "-"],
        b"exact bytes\r\n\0 with a trailing NUL",
    );
    assert_eq!(field(&stdout(&from_stdin), "sig"), sig, "Ed25519 is deterministic");
    let verified_stdin = run_stdin(
        &["verify", "--pub", &keys.public, "--sig", &sig, "-"],
        b"exact bytes\r\n\0 with a trailing NUL",
    );
    assert_eq!(code(&verified_stdin), 0);
}

#[test]
fn seed_never_appears_on_stdout_or_stderr() {
    let keys = keygen("secret");
    let seed_text = std::fs::read_to_string(&keys.seed).expect("seed");
    assert!(seed_text.ends_with('\n'));
    let seed_hex = seed_text.trim_end();
    assert_eq!(seed_hex.len(), 64);
    assert!(seed_hex.bytes().all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase()));
    assert_ne!(seed_hex, keys.public);

    let message = keys.dir.file("msg.txt", b"hello");
    let other = keys.dir.path("seed2.hex");
    for out in [
        run(&["sign", "--key", p(&keys.seed), p(&message)]),
        run(&["pubkey", "--key", p(&keys.seed)]),
        run(&["keygen", "--out", p(&other)]),
    ] {
        let all = format!(
            "{}{}",
            String::from_utf8_lossy(&out.stdout),
            String::from_utf8_lossy(&out.stderr)
        );
        assert!(!all.contains(seed_hex), "seed leaked: {all}");
    }
    let other_seed = std::fs::read_to_string(&other).expect("seed2");
    let keygen_again = run(&["keygen", "--out", p(&keys.dir.path("seed3.hex"))]);
    assert!(!stdout(&keygen_again).contains(other_seed.trim_end()));
    let third = std::fs::read_to_string(keys.dir.path("seed3.hex")).expect("seed3");
    assert!(!stdout(&keygen_again).contains(third.trim_end()));
    assert_ne!(other_seed, third, "fresh randomness per keygen");
}

#[test]
fn keygen_refuses_to_overwrite() {
    let keys = keygen("overwrite");
    let before = std::fs::read(&keys.seed).expect("seed");
    let again = run(&["keygen", "--out", p(&keys.seed)]);
    assert_eq!(code(&again), 2, "{again:?}");
    assert!(again.stdout.is_empty());
    assert_eq!(std::fs::read(&keys.seed).expect("seed"), before);

    let unrelated = keys.dir.file("notes.txt", b"keep me");
    assert_eq!(code(&run(&["keygen", "--out", p(&unrelated)])), 2);
    assert_eq!(std::fs::read(&unrelated).expect("notes"), b"keep me");
}

#[cfg(unix)]
#[test]
fn seed_file_mode_is_0600() {
    use std::os::unix::fs::PermissionsExt;
    let keys = keygen("mode");
    let mode = std::fs::metadata(&keys.seed).expect("meta").permissions().mode();
    assert_eq!(mode & 0o777, 0o600, "mode {mode:o}");
}

#[test]
fn verify_rejects_tamper_wrong_key_flipped_bit_and_non_point() {
    let keys = keygen("verify");
    let message = keys.dir.file("msg.txt", b"pay 10");
    let sig = sign_file(&keys, &message);

    let tampered = keys.dir.file("tampered.txt", b"pay 99");
    let out = run(&["verify", "--pub", &keys.public, "--sig", &sig, p(&tampered)]);
    assert_eq!(code(&out), 1);
    assert_eq!(stdout(&out), "VERIFY|ok=0|reason=signature_invalid|json=0\n");

    let other = keygen("verify-other");
    let out = run(&["verify", "--pub", &other.public, "--sig", &sig, p(&message)]);
    assert_eq!(code(&out), 1);
    assert_eq!(field(&stdout(&out), "reason"), "signature_invalid");

    for index in [0, 70, 127] {
        let flipped = flip_hex_bit(&sig, index);
        let out = run(&["verify", "--pub", &keys.public, "--sig", &flipped, p(&message)]);
        assert_eq!(code(&out), 1, "nibble {index}");
        assert_eq!(field(&stdout(&out), "ok"), "0");
    }

    let out = run(&["verify", "--pub", NON_POINT_KEY, "--sig", &sig, p(&message)]);
    assert_eq!(code(&out), 1);
    assert_eq!(stdout(&out), "VERIFY|ok=0|reason=key_malformed|json=0\n");
}

#[test]
fn malformed_hex_lengths_and_arguments_exit_2() {
    let keys = keygen("usage");
    let message = keys.dir.file("msg.txt", b"m");
    let sig = sign_file(&keys, &message);
    let cases: Vec<Vec<String>> = vec![
        vec!["verify".into(), "--pub".into(), keys.public[..62].into(), "--sig".into(), sig.clone(), p(&message).into()],
        vec!["verify".into(), "--pub".into(), format!("{}0", keys.public), "--sig".into(), sig.clone(), p(&message).into()],
        vec!["verify".into(), "--pub".into(), format!("zz{}", &keys.public[2..]), "--sig".into(), sig.clone(), p(&message).into()],
        vec!["verify".into(), "--pub".into(), keys.public.clone(), "--sig".into(), sig[..126].into(), p(&message).into()],
        vec!["verify".into(), "--pub".into(), keys.public.clone(), "--sig".into(), format!("{}g", &sig[..127]), p(&message).into()],
        vec!["verify".into(), "--pub".into(), keys.public.clone(), p(&message).into()],
        vec!["verify".into(), "--pub".into(), keys.public.clone(), "--pub".into(), keys.public.clone(), "--sig".into(), sig.clone(), p(&message).into()],
        vec!["sign".into(), "--key".into(), p(&keys.seed).into()],
        vec!["sign".into(), "--bogus".into(), "x".into(), p(&message).into()],
        vec!["keygen".into()],
        vec!["frobnicate".into()],
    ];
    for args in cases {
        let refs: Vec<&str> = args.iter().map(String::as_str).collect();
        let out = run(&refs);
        assert_eq!(code(&out), 2, "{args:?}: {out:?}");
        assert!(out.stdout.is_empty(), "{args:?}");
        let err = String::from_utf8_lossy(&out.stderr);
        assert!(err.starts_with("ERROR|kind=usage|"), "{err}");
        assert!(err.trim_end().ends_with("|json=0"), "{err}");
    }

    let seed_text = std::fs::read_to_string(&keys.seed).expect("seed");
    let hex = seed_text.trim_end();
    let bad_seeds: Vec<Vec<u8>> = vec![
        hex[..62].as_bytes().to_vec(),
        format!("{hex}00\n").into_bytes(),
        format!("{hex}\n\n").into_bytes(),
        format!(" {hex}").into_bytes(),
        format!("{}zz\n", &hex[..62]).into_bytes(),
        Vec::new(),
    ];
    for (i, bad) in bad_seeds.iter().enumerate() {
        let path = keys.dir.file(&format!("bad{i}.hex"), bad);
        let out = run(&["pubkey", "--key", p(&path)]);
        assert_eq!(code(&out), 2, "bad seed {i}");
        let err = String::from_utf8_lossy(&out.stderr).to_string();
        assert!(!err.contains(&hex[..16]), "error echoed seed material");
    }
}

#[test]
fn missing_files_are_io_errors() {
    let dir = TempDir::new("io");
    let out = run(&["pubkey", "--key", p(&dir.path("absent.hex"))]);
    assert_eq!(code(&out), 1);
    assert!(String::from_utf8_lossy(&out.stderr).starts_with("ERROR|kind=io|"));
    let out = run(&["gate", p(&dir.path("absent.hbp"))]);
    assert_eq!(code(&out), 1);
}

#[test]
fn gate_clean_example_proceeds_unchecked() {
    let example = Path::new(env!("CARGO_MANIFEST_DIR")).join("examples/envelope.hbp");
    let out = run(&["gate", p(&example)]);
    assert_eq!(code(&out), 0, "{out:?}");
    let row = stdout(&out);
    assert!(row.starts_with("GATE|verdict=PROCEED|hookwall=PROCEED|spawn_gate=PROCEED|tier_gate=PROCEED|fischer=PROCEED|input_guard=PROCEED|signature=unchecked|reason="), "{row}");
    assert!(row.ends_with("|json=0\n"), "{row}");
    assert_eq!(row.matches('\n').count(), 1);
    assert!(!row.contains('{'));

    let piped = run_stdin(&["gate", "-"], EXAMPLE.as_bytes());
    assert_eq!(stdout(&piped), row);
}

#[test]
fn gate_with_valid_signature_is_verified_and_same_verdict() {
    let keys = keygen("gate-valid");
    let env = keys.dir.file("envelope.hbp", EXAMPLE.as_bytes());
    let sig = sign_file(&keys, &env);
    let unchecked = run(&["gate", p(&env)]);
    let out = run(&["gate", p(&env), "--pub", &keys.public, "--sig", &sig]);
    assert_eq!(code(&out), 0, "{out:?}");
    let row = stdout(&out);
    assert_eq!(field(&row, "signature"), "verified");
    assert_eq!(field(&row, "verdict"), "PROCEED");
    assert_eq!(
        row.replace("signature=verified", "signature=unchecked"),
        stdout(&unchecked)
    );
}

#[test]
fn gate_with_forged_signature_blocks_even_a_clean_envelope() {
    let keys = keygen("gate-forged");
    let env = keys.dir.file("envelope.hbp", EXAMPLE.as_bytes());
    let sig = sign_file(&keys, &env);
    let other = keygen("gate-forger");

    let forged_cases = [
        (keys.public.clone(), flip_hex_bit(&sig, 5)),
        (other.public.clone(), sig.clone()),
        (NON_POINT_KEY.to_string(), sig.clone()),
    ];
    for (public, signature) in forged_cases {
        let out = run(&["gate", p(&env), "--pub", &public, "--sig", &signature]);
        assert_eq!(code(&out), 4, "{out:?}");
        let row = stdout(&out);
        assert_eq!(field(&row, "verdict"), "BLOCK");
        assert_eq!(field(&row, "signature"), "invalid");
        for gate in ["hookwall", "spawn_gate", "tier_gate", "fischer", "input_guard"] {
            assert_eq!(field(&row, gate), "PROCEED", "{gate}: {row}");
        }
        assert!(field(&row, "reason").starts_with("BLOCK by signature"), "{row}");
    }

    // A valid signature over different bytes (one appended comment) does not carry over.
    let edited = keys.dir.file("edited.hbp", format!("{EXAMPLE}# appended\n").as_bytes());
    let out = run(&["gate", p(&edited), "--pub", &keys.public, "--sig", &sig]);
    assert_eq!(code(&out), 4);

    // --pub without --sig is a usage error, not a silent unchecked run.
    let out = run(&["gate", p(&env), "--pub", &keys.public]);
    assert_eq!(code(&out), 2);
}

#[test]
fn gate_blocks_what_the_composition_blocks() {
    let cases = [
        ("verb=tick", "verb=self_authorize", "fischer"),
        ("pid=BH.VERDICT.EXAMPLE000000001\n", "", "fischer"),
        ("pid=BH.VERDICT.EXAMPLE000000001", "pid=UNKNOWN", "input_guard"),
        ("target_tier=public", "target_tier=secret", "tier_gate"),
        ("hook_tier=micro", "hook_tier=firmware", "hookwall"),
        ("slot=0", "slot=64", "hookwall"),
        ("event_tags=safe-tag", "event_tags=safe-tag,DRIFT", "input_guard"),
        ("g4_state=UNKNOWN", "g4_state=converged", "input_guard"),
    ];
    for (from, to, deciding) in cases {
        assert!(EXAMPLE.contains(from), "{from}");
        let out = gate_text(&EXAMPLE.replacen(from, to, 1), &[]);
        assert_eq!(code(&out), 4, "{to}: {out:?}");
        let row = stdout(&out);
        assert_eq!(field(&row, "verdict"), "BLOCK", "{to}");
        assert_eq!(field(&row, deciding), "BLOCK", "{to}: {row}");
    }
}

#[test]
fn gate_hold_path_exits_3() {
    let unsealed_write = EXAMPLE
        .replacen("hbp_path=ledger/example.hbp\n", "", 1)
        .replacen("verb=tick", "verb=write", 1);
    for text in [
        EXAMPLE.replacen("hook_tier=micro", "hook_tier=cosign", 1),
        EXAMPLE.replacen("forward_score_q=800", "forward_score_q=100", 1),
        unsealed_write,
    ] {
        let out = gate_text(&text, &[]);
        assert_eq!(code(&out), 3, "{out:?}");
        assert_eq!(field(&stdout(&out), "verdict"), "HOLD");
    }
}

#[test]
fn gate_rejects_unknown_duplicate_missing_and_malformed_keys() {
    let cases = [
        format!("{EXAMPLE}colour=blue\n"),
        format!("{EXAMPLE}slot=0\n"),
        EXAMPLE.replacen("hook_tier=micro\n", "", 1),
        EXAMPLE.replacen("caller_pid=43981", "caller_pid=-1", 1),
        EXAMPLE.replacen("reverse_risk_q=100", "reverse_risk_q=1001", 1),
        EXAMPLE.replacen("l0_real=1", "l0_real=yes", 1),
        EXAMPLE.replacen("caller_tier=public", "caller_tier=Public", 1),
        format!("{EXAMPLE}just some text\n"),
    ];
    for text in cases {
        let out = gate_text(&text, &[]);
        assert_eq!(code(&out), 2, "{out:?}");
        assert!(out.stdout.is_empty());
        assert!(String::from_utf8_lossy(&out.stderr).starts_with("ERROR|kind=usage|reason=envelope"));
    }
    let out = run_stdin(&["gate", "-"], &[0xff, 0xfe, b'\n']);
    assert_eq!(code(&out), 2);
}

#[test]
fn gate_row_has_fixed_fields_for_every_verdict() {
    for (text, verdict) in [
        (EXAMPLE.to_string(), "PROCEED"),
        (EXAMPLE.replacen("hook_tier=micro", "hook_tier=cosign", 1), "HOLD"),
        (EXAMPLE.replacen("verb=tick", "verb=bad|verb", 1), "BLOCK"),
    ] {
        let row = stdout(&gate_text(&text, &[]));
        assert_eq!(row.matches('\n').count(), 1, "{row}");
        let keys: Vec<&str> = row
            .trim_end()
            .split('|')
            .map(|part| part.split('=').next().unwrap_or(""))
            .collect();
        assert_eq!(
            keys,
            ["GATE", "verdict", "hookwall", "spawn_gate", "tier_gate", "fischer", "input_guard", "signature", "reason", "json"],
            "{row}"
        );
        assert_eq!(field(&row, "verdict"), verdict);
    }
}

#[test]
fn help_and_version() {
    for args in [&[][..], &["help"][..], &["--help"][..]] {
        let out = run(args);
        assert_eq!(code(&out), 0);
        let text = stdout(&out);
        for word in ["keygen", "pubkey", "sign", "verify", "gate", "EXIT CODES", "SCOPE"] {
            assert!(text.contains(word), "{word}");
        }
    }
    let out = run(&["--version"]);
    assert_eq!(stdout(&out), format!("VERSION|name=asolaria|version={}|json=0\n", env!("CARGO_PKG_VERSION")));
}

/// Runs with stdout's read end closed before the binary can write (it first waits on stdin).
fn run_with_broken_stdout(args: &[&str], input: &[u8]) -> Output {
    let mut child = Command::new(BIN)
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn asolaria");
    drop(child.stdout.take());
    let mut stdin = child.stdin.take().expect("stdin");
    stdin.write_all(input).expect("write stdin");
    drop(stdin);
    child.wait_with_output().expect("wait asolaria")
}

#[test]
fn lost_output_never_exits_0_or_panics_and_block_stays_4() {
    let block = EXAMPLE.replacen("verb=tick", "verb=self_authorize", 1);
    for (text, expected) in [(block.as_str(), 4), (EXAMPLE, 1)] {
        let out = run_with_broken_stdout(&["gate", "-"], text.as_bytes());
        assert_eq!(code(&out), expected, "{out:?}");
        let err = String::from_utf8_lossy(&out.stderr);
        assert!(err.starts_with("ERROR|kind=io|reason=writing output"), "{err}");
        assert!(!err.contains("panicked"), "{err}");
    }
}

#[cfg(target_os = "linux")]
#[test]
fn full_disk_stdout_keeps_verdict_code_and_removes_unannounced_seed() {
    let full = || std::fs::OpenOptions::new().write(true).open("/dev/full").expect("/dev/full");
    let dir = TempDir::new("devfull");
    let block = dir.file("block.hbp", EXAMPLE.replacen("pid=BH.VERDICT.EXAMPLE000000001\n", "", 1).as_bytes());
    let out = Command::new(BIN).args(["gate", p(&block)]).stdout(full()).output().expect("run");
    assert_eq!(code(&out), 4, "{out:?}");

    let seed = dir.path("lost.seed");
    let out = Command::new(BIN).args(["keygen", "--out", p(&seed)]).stdout(full()).output().expect("run");
    assert_eq!(code(&out), 1, "{out:?}");
    assert!(String::from_utf8_lossy(&out.stderr).contains("seed file removed"));
    assert!(!seed.exists(), "a seed whose public key was never shown must not be left behind");

    let out = Command::new(BIN).arg("--version").stdout(full()).output().expect("run");
    assert_eq!(code(&out), 1);
    let out = Command::new(BIN).args(["verify", "--pub", "00", "--sig", "00", "x"]).stderr(full()).output().expect("run");
    assert_eq!(code(&out), 2, "a lost ERROR row keeps the usage exit code");
}

#[test]
fn control_and_bidi_characters_in_envelopes_exit_2_even_when_signed() {
    let keys = keygen("spoof");
    for (from, to) in [
        ("target=fabric", "target=prod\u{1b}[2K\rtarget=fabric"),
        ("payload=heartbeat", "payload=rm -rf /\rpayload=heartbeat"),
        ("actor=helm", "actor=he\0lm"),
        ("actor=helm", "actor=\u{202E}mleh"),
    ] {
        let env = keys.dir.file("spoof.hbp", EXAMPLE.replacen(from, to, 1).as_bytes());
        let sig = sign_file(&keys, &env);
        for extra in [&[][..], &["--pub", &keys.public, "--sig", &sig][..]] {
            let mut args = vec!["gate", p(&env)];
            args.extend_from_slice(extra);
            let out = run(&args);
            assert_eq!(code(&out), 2, "{to:?}: {out:?}");
            assert!(out.stdout.is_empty());
            assert!(String::from_utf8_lossy(&out.stderr).contains("control or bidi character"));
        }
    }
    let out = run_stdin(&["gate", "-"], format!("\u{FEFF}{EXAMPLE}").as_bytes());
    assert_eq!(code(&out), 2);
    assert!(String::from_utf8_lossy(&out.stderr).contains("byte order mark"));
}

#[test]
fn forged_signature_over_unparseable_envelope_is_block_4() {
    let keys = keygen("forged-garbage");
    let env = keys.dir.file("envelope.hbp", EXAMPLE.as_bytes());
    let sig = sign_file(&keys, &env);
    for garbage in [&b"garbage\n"[..], b"slot=x\n", &[0xff, 0xfe, b'\n']] {
        let bad = keys.dir.file("garbage.hbp", garbage);
        let out = run(&["gate", p(&bad), "--pub", &keys.public, "--sig", &sig]);
        assert_eq!(code(&out), 4, "{out:?}");
        let row = stdout(&out);
        assert_eq!(field(&row, "verdict"), "BLOCK");
        assert_eq!(field(&row, "signature"), "invalid");
        for gate in ["hookwall", "spawn_gate", "tier_gate", "fischer", "input_guard"] {
            assert_eq!(field(&row, gate), "UNEVALUATED", "{row}");
        }
        assert!(field(&row, "reason").contains("envelope unparseable"), "{row}");
        // Without a signature check the same envelope is a plain parse error.
        assert_eq!(code(&run(&["gate", p(&bad)])), 2);
    }
    // A correctly signed but unparseable envelope stays a parse error, not a verdict.
    let bad = keys.dir.file("signed-garbage.hbp", b"garbage\n");
    let good_sig = sign_file(&keys, &bad);
    assert_eq!(code(&run(&["gate", p(&bad), "--pub", &keys.public, "--sig", &good_sig])), 2);
}

#[test]
fn oversized_envelope_is_a_usage_error() {
    let mut text = EXAMPLE.to_string();
    text.push_str(&"#".repeat(1024 * 1024));
    let out = run_stdin(&["gate", "-"], text.as_bytes());
    assert_eq!(code(&out), 2, "{out:?}");
    assert!(String::from_utf8_lossy(&out.stderr).contains("larger than 1048576 bytes"));
}

#[test]
fn subcommand_help_and_help_topics() {
    for command in ["keygen", "pubkey", "sign", "verify", "gate"] {
        for args in [vec![command, "--help"], vec![command, "-h"], vec!["help", command]] {
            let out = run(&args);
            assert_eq!(code(&out), 0, "{args:?}: {out:?}");
            let text = stdout(&out);
            assert!(text.starts_with("USAGE\n"), "{text}");
            assert!(text.contains(&format!("asolaria {command}")), "{text}");
        }
    }
    assert_eq!(code(&run(&["help", "frobnicate"])), 2);
    // `-h` as an option value is a value, not a help request.
    let dir = TempDir::new("help-value");
    let out = run(&["pubkey", "--key", p(&dir.path("-h"))]);
    assert_eq!(code(&out), 1);
}

#[test]
fn out_of_range_u8_says_maximum() {
    let out = gate_text(&EXAMPLE.replacen("slot=0", "slot=256", 1), &[]);
    assert_eq!(code(&out), 2);
    assert!(String::from_utf8_lossy(&out.stderr).contains("slot: 256 is above the maximum 255"));
}
