#![forbid(unsafe_code)]
//! Read-only reader for HBI/HBP vault trees (HBI -> HBP -> SHA -> SH -> HASH).
//!
//! `read_vault(root)` walks `root`, pairs every `X.hbi` with `X.hbp`, `X.hbi.sha256`,
//! `X.hbp.sha256` and the BigPickle trinity sidecars `X.sha256` / `X.hex`, resolves the pointer
//! rows that the public HBI corpus carries, recomputes what each row declares and returns one
//! `VAULTOBJ` row per object plus integer totals. Files are opened read-only; nothing is
//! written. Every check names the upstream line it reproduces; `README.md` lists them.
//!
//! Rows are parsed with the vendored codec's `parse_row` and rendered with its `encode_row`
//! (`asolaria-hbi-hbp` src/lib.rs:117-187). Receipt chains use its `verify_chain`
//! (src/lib.rs:249-272); `IDX` pointers use the `IdxPointer` row shape (src/lib.rs:194-210) and
//! the `AGT-<sha16>` address of `agt` (src/lib.rs:107-111). The BigPickle trinity is checked by
//! the aether `hbp` crate's `verify_hbp` (port of `hbp-reader.mjs:118-156`).

pub mod sha;
pub mod text;

use asolaria_hbi_hbp::{encode_row, parse_row, sha256_hex, verify_chain};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

const CHUNK: usize = 1 << 20;
const HEAD_CAP: u64 = 65536;

/// Object kinds, in the order the totals list them.
pub const KINDS: [&str; 8] = [
    "hbi", "hbp", "trinity", "file", "range", "index", "chain", "center",
];

/// Balanced trit: +1 every declared check equal, -1 a check differs on present bytes,
/// 0 unresolved (absent or zero-filled bytes, outside the root, or nothing declared).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Trit {
    Plus,
    Zero,
    Minus,
}

impl Trit {
    pub fn render(self) -> &'static str {
        match self {
            Trit::Plus => "+1",
            Trit::Zero => "0",
            Trit::Minus => "-1",
        }
    }
}

/// One result row.
#[derive(Clone, Debug)]
pub struct Obj {
    pub path: String,
    pub kind: &'static str,
    pub bytes: u64,
    pub sha256: String,
    pub pointer: String,
    pub verified: Trit,
    pub reason: String,
}

impl Obj {
    /// `VAULTOBJ|path=|kind=|bytes=|sha256=|pointer=|verified=|reason=|json=0`.
    pub fn row(&self) -> String {
        encode_row(
            "VAULTOBJ",
            &[
                ("path", &self.path),
                ("kind", self.kind),
                ("bytes", &self.bytes.to_string()),
                ("sha256", &self.sha256),
                ("pointer", &self.pointer),
                ("verified", self.verified.render()),
                ("reason", &self.reason),
            ],
        )
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Presence {
    Present,
    Absent,
    Short,
    ZeroFilled,
}

#[derive(Default)]
struct Checks {
    pass: Vec<String>,
    differ: Vec<String>,
    unresolved: Vec<String>,
    info: Vec<String>,
}

impl Checks {
    fn eq(&mut self, name: &str, equal: bool) {
        if equal {
            self.pass.push(name.to_string());
        } else {
            self.differ.push(format!("{name}_differs"));
        }
    }

    fn verdict(&self, presence: Presence) -> (Trit, String) {
        let mut tokens: Vec<String> = Vec::new();
        let trit;
        if !self.differ.is_empty() {
            let mark = match presence {
                Presence::Present => None,
                Presence::Absent => Some("bytes_absent"),
                Presence::Short => Some("bytes_short"),
                Presence::ZeroFilled => Some("bytes_zero_filled"),
            };
            if let Some(m) = mark {
                trit = Trit::Zero;
                tokens.push(m.to_string());
            } else {
                trit = Trit::Minus;
            }
            tokens.extend(self.differ.iter().cloned());
            tokens.extend(self.unresolved.iter().cloned());
        } else if !self.unresolved.is_empty() {
            trit = Trit::Zero;
            tokens.extend(self.unresolved.iter().cloned());
        } else if !self.pass.is_empty() {
            trit = Trit::Plus;
            tokens.push(format!("ok:{}", self.pass.join("+")));
        } else {
            trit = Trit::Zero;
            tokens.push("no_check_declared".to_string());
        }
        tokens.extend(self.info.iter().cloned());
        (trit, tokens.join("+"))
    }

    /// As `verdict`, for a declared extent (a byte range, or an index's rows): when fewer bytes
    /// are present than the extent declares (`short`), the result is 0 even if every check on
    /// the present bytes is equal (README: "shorter than declared" reads 0).
    fn verdict_extent(&self, presence: Presence, short: bool) -> (Trit, String) {
        if !short || !self.differ.is_empty() {
            return self.verdict(presence);
        }
        let mark = if presence == Presence::Absent {
            "bytes_absent"
        } else {
            "bytes_short"
        };
        let mut tokens = vec![mark.to_string()];
        tokens.extend(self.unresolved.iter().cloned());
        tokens.extend(self.info.iter().cloned());
        (Trit::Zero, tokens.join("+"))
    }
}

/// Whole-file facts, measured in one streaming pass.
#[derive(Clone, Debug)]
struct Facts {
    len: u64,
    sha256: String,
    cr: u64,
    last: Option<u8>,
    all_zero: bool,
    rows: Option<u64>,
}

fn file_facts(path: &Path) -> io::Result<Facts> {
    let mut f = File::open(path)?;
    let mut buf = vec![0u8; CHUNK];
    let mut sha = sha::Sha256::new();
    let mut rc = text::RowCounter::new();
    let (mut len, mut cr, mut last, mut all_zero) = (0u64, 0u64, None, true);
    loop {
        let n = f.read(&mut buf)?;
        if n == 0 {
            break;
        }
        let d = &buf[..n];
        sha.update(d);
        rc.update(d);
        cr += d.iter().filter(|&&b| b == b'\r').count() as u64;
        all_zero = all_zero && d.iter().all(|&b| b == 0);
        last = Some(d[n - 1]);
        len += n as u64;
    }
    Ok(Facts {
        len,
        sha256: sha.finish_hex(),
        cr,
        last,
        all_zero,
        rows: rc.finish(),
    })
}

/// Facts of the byte range `[start, start + len)` of a file of `file_len` bytes.
struct Slice {
    present: u64,
    sha256: String,
    all_zero: bool,
    head: Vec<u8>,
    last: Option<u8>,
    /// The present bytes equal `expect` (when given), compared while streaming.
    same: bool,
}

fn slice_facts(
    path: &Path,
    start: u64,
    len: u64,
    file_len: u64,
    expect: Option<&[u8]>,
) -> io::Result<Slice> {
    let present = if start >= file_len {
        0
    } else {
        (file_len - start).min(len)
    };
    let mut sha = sha::Sha256::new();
    let (mut head, mut last, mut all_zero) = (Vec::new(), None, true);
    let mut same = expect.map_or(true, |e| e.len() as u64 == present);
    let mut at = 0usize;
    if present > 0 {
        let mut f = File::open(path)?;
        f.seek(SeekFrom::Start(start))?;
        let mut left = present;
        let mut buf = vec![0u8; CHUNK];
        while left > 0 {
            let want = left.min(CHUNK as u64) as usize;
            f.read_exact(&mut buf[..want])?;
            let d = &buf[..want];
            sha.update(d);
            if (head.len() as u64) < HEAD_CAP {
                let room = (HEAD_CAP as usize - head.len()).min(want);
                head.extend_from_slice(&d[..room]);
            }
            all_zero = all_zero && d.iter().all(|&b| b == 0);
            if let (true, Some(e)) = (same, expect) {
                same = e[at..at + want] == *d;
            }
            at += want;
            last = Some(d[want - 1]);
            left -= want as u64;
        }
    }
    Ok(Slice {
        present,
        sha256: sha.finish_hex(),
        all_zero,
        head,
        last,
        same,
    })
}

/// Row `r` (1-based, rows end at `\n`): (start, end without `\n`, end with `\n`).
type Bounds = BTreeMap<u64, (u64, u64, Option<u64>)>;

fn row_bounds(path: &Path, needed: &BTreeSet<u64>) -> io::Result<Bounds> {
    let mut out = Bounds::new();
    let mut f = File::open(path)?;
    let mut buf = vec![0u8; CHUNK];
    let (mut pos, mut row, mut row_start) = (0u64, 1u64, 0u64);
    loop {
        let n = f.read(&mut buf)?;
        if n == 0 {
            break;
        }
        for &b in &buf[..n] {
            if b == b'\n' {
                if needed.contains(&row) {
                    out.insert(row, (row_start, pos, Some(pos + 1)));
                }
                row += 1;
                row_start = pos + 1;
            }
            pos += 1;
        }
    }
    if row_start < pos && needed.contains(&row) {
        out.insert(row, (row_start, pos, None));
    }
    Ok(out)
}

/// One parsed `.hbi` row (vendored `parse_row`; one trailing `\r` is not part of the row).
struct Row {
    line: usize,
    raw: String,
    tag: String,
    fields: Vec<(String, String)>,
}

impl Row {
    fn get(&self, k: &str) -> Option<&str> {
        self.fields
            .iter()
            .find(|(a, _)| a == k)
            .map(|(_, v)| v.as_str())
    }
    fn has(&self, k: &str) -> bool {
        self.get(k).is_some()
    }
}

fn parse_rows(text: &str) -> Vec<Row> {
    let mut rows = Vec::new();
    let mut pieces: Vec<&str> = text.split('\n').collect();
    if text.ends_with('\n') {
        pieces.pop();
    }
    for (i, piece) in pieces.iter().enumerate() {
        let line = piece.strip_suffix('\r').unwrap_or(piece);
        if line.is_empty() {
            continue;
        }
        let (tag, fields) = parse_row(line);
        rows.push(Row {
            line: i + 1,
            raw: line.to_string(),
            tag,
            fields,
        });
    }
    rows
}

/// Pointer key -> sibling prefix. `file`/`path`/`artifact`/`name` use bare `bytes`/`sha256`
/// (`ARTIFACT|file=|bytes=|sha256=`, `HBP|path=|sha256=`, `INDEX|artifact=|bytes=|sha256=`,
/// `ARTIFACT|name=|sha256=` from stone-to-moss `tools/seal_quantum_gravity_81.py:89-97`,
/// `experiments/integration/seat1/upstream_bridge.py:338-348`,
/// `experiments/seat1/recurrence/seat1_recurrence_72.py:262-268`, where `name` is a file in the
/// `.hbi` directory); `target`/`source`/`<p>_file`/`<p>_path` use `<prefix>_bytes|_sha256|_rows`
/// (`hbp_file=|hbp_bytes=|hbp_sha256=|hbp_rows=`, `target=|target_bytes=|target_rows=|target_sha256=`).
fn pointer_prefix(key: &str) -> Option<String> {
    match key {
        "file" | "path" | "artifact" | "name" => Some(String::new()),
        "target" | "source" => Some(format!("{key}_")),
        _ => key
            .strip_suffix("_file")
            .or_else(|| key.strip_suffix("_path"))
            .filter(|p| !p.is_empty())
            .map(|p| format!("{p}_")),
    }
}

fn sibling_keys(prefix: &str) -> Vec<String> {
    let mut v = vec![format!("{prefix}bytes"), format!("{prefix}sha256")];
    if prefix.is_empty() {
        v.push("cr".to_string());
        v.push("terminal_lf".to_string());
    } else {
        v.push(format!("{prefix}rows"));
    }
    v
}

/// The file pointers a row declares: (key, value, prefix), first occurrence of each key.
fn file_pointers(row: &Row) -> Vec<(String, String, String)> {
    let mut seen: BTreeSet<&str> = BTreeSet::new();
    let mut out = Vec::new();
    for (k, v) in &row.fields {
        if !seen.insert(k.as_str()) {
            continue;
        }
        if let Some(prefix) = pointer_prefix(k) {
            if sibling_keys(&prefix).iter().any(|s| row.has(s)) {
                out.push((k.clone(), v.clone(), prefix));
            }
        }
    }
    out
}

/// The anchor a row sets for the byte-range rows after it: its first file pointer
/// (`ROOT|path=`, `RGBINDEXHDR|target=`, `FABLE5HBIHDR|source=`, `HBIHDR|source_file=`, ...).
fn anchor_key(row: &Row, ptrs: &[(String, String, String)]) -> Option<usize> {
    if ptrs.is_empty() || range_form(row).is_some() {
        None
    } else {
        Some(0)
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Form {
    StartEnd,
    OffsetLength,
    OffsetLen,
    Idx,
    RowIdx,
}

impl Form {
    /// `IDX` and `HBIROW` byte rows index the paired `X.hbp`, not the current anchor.
    fn pair(self) -> bool {
        matches!(self, Form::Idx | Form::RowIdx)
    }
}

/// A byte-range row: `INDEX|byte_start=|byte_end_exclusive=`, `RANGE|offset=|length=`,
/// `BODYREF|offset=|length=`, `FABLE5HBIROW|offset=|len=`, `IDX|pid=|off=|len=`, and
/// `HBIROW|row=|off=|len=|sha256=` (or `offset=`) into the paired `X.hbp`, as
/// asolaria-omega-omnibit-tournament `scripts/verify_receipt_privacy.py:73-117` reads it
/// (writer of the `offset=` form: `tools/movable-flashlight/hbp.py:91-135`).
fn range_form(row: &Row) -> Option<Form> {
    if row.has("byte_start") && row.has("byte_end_exclusive") {
        Some(Form::StartEnd)
    } else if row.tag == "HBIROW" && row.has("len") && (row.has("off") || row.has("offset")) {
        Some(Form::RowIdx)
    } else if row.has("offset") && row.has("length") {
        Some(Form::OffsetLength)
    } else if row.has("offset") && row.has("len") {
        Some(Form::OffsetLen)
    } else if row.tag == "IDX" && row.has("off") && row.has("len") {
        Some(Form::Idx)
    } else {
        None
    }
}

fn range_span(row: &Row, form: Form) -> Option<(u64, u64)> {
    let u = |k: &str| row.get(k).and_then(text::strict_uint);
    match form {
        Form::StartEnd => {
            let (s, e) = (u("byte_start")?, u("byte_end_exclusive")?);
            if e < s {
                None
            } else {
                Some((s, e - s))
            }
        }
        Form::OffsetLength => Some((u("offset")?, u("length")?)),
        Form::OffsetLen => Some((u("offset")?, u("len")?)),
        Form::Idx => Some((u("off")?, u("len")?)),
        // `item.get("off", item.get("offset", ""))` (verify_receipt_privacy.py:92)
        Form::RowIdx => {
            let off = if row.has("off") { "off" } else { "offset" };
            Some((u(off)?, u("len")?))
        }
    }
}

/// Lowercase hex of `b`, the alphabet of the hex-row writers (`pais_path3_bridge.rs:97-102`,
/// `github3d.rs:149-155`) and of Python `bytes.hex()` (`verify_receipt_privacy.py:107-109`).
fn hex_lower(b: &[u8]) -> String {
    const H: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(b.len() * 2);
    for &x in b {
        s.push(H[(x >> 4) as usize] as char);
        s.push(H[(x & 15) as usize] as char);
    }
    s
}

/// Bytes of an even-length lowercase hex string; `None` for any other text.
fn unhex_lower(s: &str) -> Option<Vec<u8>> {
    let b = s.as_bytes();
    if b.len() % 2 != 0 {
        return None;
    }
    let nib = |c: u8| match c {
        b'0'..=b'9' => Some(c - b'0'),
        b'a'..=b'f' => Some(c - b'a' + 10),
        _ => None,
    };
    b.chunks(2)
        .map(|p| Some((nib(p[0])? << 4) | nib(p[1])?))
        .collect()
}

/// Rust `str::lines()` over bytes (rows end at `\n`; a `\r` before that `\n` is not part of
/// the row; no row after a final `\n`), as the hex-row writers split the `.hbp` text
/// (`pais_path3_bridge.rs:674-677` `hbp.lines()`).
fn rust_lines(data: &[u8]) -> Vec<(usize, usize)> {
    let mut out = Vec::new();
    let mut start = 0usize;
    for (i, &b) in data.iter().enumerate() {
        if b == b'\n' {
            let end = if i > start && data[i - 1] == b'\r' {
                i - 1
            } else {
                i
            };
            out.push((start, end));
            start = i + 1;
        }
    }
    if start < data.len() {
        out.push((start, data.len()));
    }
    out
}

/// `len(data.splitlines())` for Python `bytes` (boundaries `\n`, `\r`, `\r\n`), the row count
/// of the movable-flashlight verifier (`hbp.py:161`).
fn bytes_splitlines_count(data: &[u8]) -> u64 {
    let (mut n, mut in_line, mut i) = (0u64, false, 0usize);
    while i < data.len() {
        match data[i] {
            b'\r' => {
                n += 1;
                in_line = false;
                if data.get(i + 1) == Some(&b'\n') {
                    i += 1;
                }
            }
            b'\n' => {
                n += 1;
                in_line = false;
            }
            _ => in_line = true,
        }
        i += 1;
    }
    n + u64::from(in_line)
}

fn sha16(s: &str) -> String {
    sha256_hex(s.as_bytes())[..16].to_string()
}

/// Some `needle` in `hay` is followed by a byte of `class`: when `hay.match(/<needle>(<class>+)/)`
/// captures (`hbp/src/reader.rs:187-202`). Needle and class are ASCII, so the raw bytes and
/// their lossy UTF-8 text give the same answer.
fn declares(hay: &[u8], needle: &[u8], class: impl Fn(u8) -> bool) -> bool {
    hay.windows(needle.len() + 1)
        .any(|w| w.starts_with(needle) && class(w[needle.len()]))
}

#[derive(Clone)]
struct Target {
    display: String,
    rel: Option<String>,
    facts: Option<Facts>,
}

struct RangeRec {
    tag: String,
    form: Form,
    start: u64,
    len: u64,
}

struct Anchor {
    row: usize,
    target: Target,
    bounds: Option<Bounds>,
    ranges: Vec<RangeRec>,
}

/// The `.hbi` being read: relative path, its directory, digest, length, the paired `.hbp`
/// path, and the paired `.hbp` bytes when that file is present.
struct HbiCtx<'a> {
    rel: &'a str,
    dir: &'a [&'a str],
    sha: &'a str,
    len: u64,
    hbp_rel: &'a str,
    hbp: Option<&'a [u8]>,
}

/// One `HBIROW` byte row (`Form::RowIdx`) of the current `.hbi`, in order.
struct PairRec {
    row: Option<u64>,
    span: Option<(u64, u64)>,
}

enum Resolve {
    Found(String),
    Absent,
    Outside,
}

/// The walked tree: display path (relative, `/`-separated, names as `name_key` renders them)
/// -> real path.
pub struct Vault {
    files: BTreeMap<String, PathBuf>,
    facts: HashMap<String, Facts>,
}

/// Display form of a raw file name (`OsStr::as_encoded_bytes`): UTF-8 text as written with `\`
/// doubled, and each byte of a sequence that is not UTF-8 as `\xHH`. Distinct names give
/// distinct keys, so no file is hidden behind another.
fn name_key(raw: &[u8]) -> String {
    let mut out = String::with_capacity(raw.len());
    for chunk in raw.utf8_chunks() {
        for c in chunk.valid().chars() {
            if c == '\\' {
                out.push_str("\\\\");
            } else {
                out.push(c);
            }
        }
        for b in chunk.invalid() {
            out.push_str(&format!("\\x{b:02x}"));
        }
    }
    out
}

fn walk(dir: &Path, rel: &str, out: &mut BTreeMap<String, PathBuf>) -> io::Result<()> {
    let mut entries = Vec::new();
    for e in std::fs::read_dir(dir)? {
        let e = e?;
        entries.push((name_key(e.file_name().as_encoded_bytes()), e));
    }
    entries.sort_by(|a, b| a.0.cmp(&b.0));
    for (name, e) in entries {
        let ft = e.file_type()?;
        let child = if rel.is_empty() {
            name.clone()
        } else {
            format!("{rel}/{name}")
        };
        if ft.is_dir() {
            if name != ".git" {
                walk(&e.path(), &child, out)?;
            }
        } else if ft.is_file() {
            out.insert(child, e.path());
        }
    }
    Ok(())
}

fn presence_of(len: u64, all_zero: bool, declared_len: Option<u64>) -> Presence {
    if len == 0 {
        if declared_len == Some(0) {
            Presence::Present
        } else {
            Presence::Absent
        }
    } else if declared_len.is_some_and(|d| d > len) {
        Presence::Short
    } else if all_zero {
        Presence::ZeroFilled
    } else {
        Presence::Present
    }
}

/// Strict tuple fields of a footer row, as `strict_tuple_fields` (`verify_public_repo.py:360-374`).
fn strict_fields(line: &str) -> Option<BTreeMap<String, String>> {
    let mut out = BTreeMap::new();
    for piece in line.split('|').skip(1) {
        let (k, v) = piece.split_once('=')?;
        if k.is_empty() || v.is_empty() || out.contains_key(k) {
            return None;
        }
        out.insert(k.to_string(), v.to_string());
    }
    Some(out)
}

/// Footer self-commitments over the rows before the footer (`body` = those rows joined by
/// `\n`, plus `\n`; `rows` = all rows, footer included):
/// - `<TAG>FTR|body_sha256=<64>|rows=` (`strict_tuple_receipt`, `verify_public_repo.py:377-401`;
///   writers e.g. `collect_public_folder_inventory.py:1090-1093`), with the LF-only byte rule of
///   `verify_public_repo.py:385-386`;
/// - `<TAG>FTR|receipt=<sha256(body)[:32]>|rows=` (simulator writers
///   `constellation/absorb_all.py:194-196`, `quality_sphere_16k.py:449-451`,
///   `three_body_collider.py:181-183`); a 64-hex receipt is compared with the whole digest.
///   A `receipt=` value that is not 32 or 64 lowercase hex declares no digest and is not checked.
fn footer_checks(data: &[u8], c: &mut Checks) {
    let Ok(t) = std::str::from_utf8(data) else {
        return;
    };
    let lines = text::splitlines(t);
    let Some(last) = lines.last() else {
        return;
    };
    let tag = last.split('|').next().unwrap_or("");
    let body_form = last.contains("|body_sha256=");
    let receipt_form = !body_form && last.contains("|receipt=");
    if !tag.ends_with("FTR") || !(body_form || receipt_form) {
        return;
    }
    let Some(f) = strict_fields(last) else {
        c.differ.push("footer_fields_differs".to_string());
        return;
    };
    let receipt_hex = |v: &str| {
        (v.len() == 32 || v.len() == 64)
            && v.bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    };
    if receipt_form && !f.get("receipt").is_some_and(|v| receipt_hex(v)) {
        return;
    }
    let body = format!("{}\n", lines[..lines.len() - 1].join("\n"));
    let digest = sha256_hex(body.as_bytes());
    let mut differ = Vec::new();
    if body_form {
        if !data.ends_with(b"\n") || data.contains(&b'\r') {
            differ.push("footer_lf_bytes_differs");
        }
        if f.get("body_sha256").map(|s| s.as_str()) != Some(digest.as_str()) {
            differ.push("footer_body_sha256_differs");
        }
    } else if f
        .get("receipt")
        .is_some_and(|v| v.as_str() != &digest[..v.len()])
    {
        differ.push("footer_receipt_differs");
    }
    if let Some(r) = f.get("rows") {
        if r != &lines.len().to_string() {
            differ.push("footer_rows_differs");
        }
    }
    if differ.is_empty() {
        c.pass.push(
            if body_form {
                "footer_body_sha256"
            } else {
                "footer_receipt"
            }
            .to_string(),
        );
    } else {
        c.differ.extend(differ.into_iter().map(String::from));
    }
}

const CENTER_MEMBERS: [&str; 5] = ["hbi", "hbp", "sha", "sh", "hash"];

impl Vault {
    /// Walk `root` (directories named `.git` and symbolic links are not entered).
    pub fn open(root: &Path) -> io::Result<Self> {
        let mut files = BTreeMap::new();
        walk(root, "", &mut files)?;
        Ok(Self {
            files,
            facts: HashMap::new(),
        })
    }

    fn facts(&mut self, rel: &str) -> io::Result<Facts> {
        if let Some(f) = self.facts.get(rel) {
            return Ok(f.clone());
        }
        let f = file_facts(&self.files[rel])?;
        self.facts.insert(rel.to_string(), f.clone());
        Ok(f)
    }

    /// Resolve a declared relative path against the `.hbi` directory (stone-to-moss
    /// `tools/seal_quantum_gravity_81.py:89-97` `name=`; FOLLOW `verify_public_repo.py:1522-1533`
    /// `hbp_file=hbp_path.name`), then the root (`verify_public_repo.py:1943-1946`
    /// `ROOT / ..._path`), then each directory between them, nearest first (Claude's addition,
    /// not from upstream: it finds a repository root that sits below `<root>`, as when a vault
    /// holds several trees). Values that are absolute, carry `\`, a drive or scheme colon in the
    /// first component, `~`, or a `..` component are not under the root.
    fn resolve(&self, dir: &[&str], value: &str) -> Resolve {
        let first = value.split('/').next().unwrap_or("");
        if value.is_empty()
            || value.starts_with('/')
            || value.starts_with('~')
            || value.contains('\\')
            || first.contains(':')
            || value.split('/').any(|c| c == "..")
        {
            return Resolve::Outside;
        }
        let comps: Vec<&str> = value
            .split('/')
            .filter(|c| !c.is_empty() && *c != ".")
            .collect();
        if comps.is_empty() {
            return Resolve::Outside;
        }
        let between = (1..dir.len()).rev();
        for k in [dir.len(), 0].into_iter().chain(between) {
            let mut parts: Vec<&str> = dir[..k].to_vec();
            parts.extend(comps.iter().copied());
            let cand = parts.join("/");
            if self.files.contains_key(&cand) {
                return Resolve::Found(cand);
            }
        }
        Resolve::Absent
    }

    fn sidecar_check(&self, rel: &str, sha: &str, c: &mut Checks) -> io::Result<()> {
        let side = format!("{rel}.sha256");
        let Some(real) = self.files.get(&side) else {
            return Ok(());
        };
        let data = std::fs::read(real)?;
        // the target's own name (`path.name`); a name that is not UTF-8 equals no sidecar text
        let name = self.files[rel].file_name().and_then(|n| n.to_str());
        if name.is_some_and(|n| data == format!("{sha}  {n}\n").as_bytes()) {
            c.pass.push("sidecar_exact".to_string());
            return Ok(());
        }
        let Ok(t) = std::str::from_utf8(&data) else {
            c.differ.push("sidecar_not_utf8".to_string());
            return Ok(());
        };
        let f = text::py_fields(t);
        if f.len() != 2 {
            c.differ.push("sidecar_shape_differs".to_string());
            return Ok(());
        }
        // FOLLOW `verify_public_repo.py:3968-3973` compares the name field as written;
        // omnibit `scripts/verify_receipt_privacy.py:35-44` first strips leading `*`
        // (`items[1].lstrip("*")`, the `sha256sum` binary-mode marker).
        let name_ok = name == Some(f[1]);
        let star_ok =
            !name_ok && f[1].starts_with('*') && name == Some(f[1].trim_start_matches('*'));
        let sha_ok = f[0].to_ascii_lowercase() == sha;
        if sha_ok && name_ok {
            c.pass.push("sidecar_named".to_string());
        } else if sha_ok && star_ok {
            c.pass.push("sidecar_named_star".to_string());
        }
        if !(name_ok || star_ok) {
            c.differ.push("sidecar_name_differs".to_string());
        }
        if !sha_ok {
            c.differ.push("sidecar_sha256_differs".to_string());
        }
        Ok(())
    }

    /// Read every `.hbi` under the root; returns the result rows and totals, in order.
    pub fn read(&mut self) -> io::Result<Vec<String>> {
        let mut out = Vec::new();
        self.read_each(&mut |row| {
            out.push(row);
            Ok(())
        })?;
        Ok(out)
    }

    /// As `read`, handing each row to `emit` as soon as it is produced; only integer counts
    /// are kept for the totals.
    pub fn read_each(&mut self, emit: &mut dyn FnMut(String) -> io::Result<()>) -> io::Result<()> {
        let hbis: Vec<String> = self
            .files
            .keys()
            .filter(|k| k.ends_with(".hbi"))
            .cloned()
            .collect();
        let mut sink = Sink {
            tally: Tally::default(),
            emit,
            err: None,
        };
        for rel in &hbis {
            self.read_hbi(rel, &mut sink)?;
            if let Some(e) = sink.err.take() {
                return Err(e);
            }
        }
        for row in sink.tally.rows(hbis.len(), self.files.len()) {
            (sink.emit)(row)?;
        }
        Ok(())
    }

    fn read_hbi(&mut self, rel: &str, objs: &mut Sink) -> io::Result<()> {
        let data = std::fs::read(&self.files[rel])?;
        let sha = sha256_hex(&data);
        let len = data.len() as u64;
        let stem = &rel[..rel.len() - 4];
        let dir: Vec<&str> = {
            let mut v: Vec<&str> = rel.split('/').collect();
            v.pop();
            v
        };
        let text_opt = std::str::from_utf8(&data).ok();

        // the .hbi itself
        let mut c = Checks::default();
        self.sidecar_check(rel, &sha, &mut c)?;
        footer_checks(&data, &mut c);
        if text_opt.is_none() {
            c.info.push("binary_no_rows".to_string());
        }
        let all_zero = data.iter().all(|&b| b == 0);
        let (t, r) = c.verdict(presence_of(len, all_zero, None));
        objs.push(Obj {
            path: rel.to_string(),
            kind: "hbi",
            bytes: len,
            sha256: sha.clone(),
            pointer: "self".to_string(),
            verified: t,
            reason: r,
        });

        // the paired .hbp
        let hbp_rel = format!("{stem}.hbp");
        let mut hbp_bytes: Option<Vec<u8>> = None;
        if let Some(real) = self.files.get(&hbp_rel).cloned() {
            let hdata = std::fs::read(&real)?;
            let hsha = sha256_hex(&hdata);
            let mut c = Checks::default();
            self.sidecar_check(&hbp_rel, &hsha, &mut c)?;
            footer_checks(&hdata, &mut c);
            let hz = hdata.iter().all(|&b| b == 0);
            let (t, r) = c.verdict(presence_of(hdata.len() as u64, hz, None));
            objs.push(Obj {
                path: hbp_rel.clone(),
                kind: "hbp",
                bytes: hdata.len() as u64,
                sha256: hsha,
                pointer: format!("pair:{rel}"),
                verified: t,
                reason: r,
            });
            hbp_bytes = Some(hdata);
        } else {
            objs.push(Obj {
                path: hbp_rel.clone(),
                kind: "hbp",
                bytes: 0,
                sha256: String::new(),
                pointer: format!("pair:{rel}"),
                verified: Trit::Zero,
                reason: "hbp_absent".to_string(),
            });
        }

        // the BigPickle trinity (hbp-emitter.mjs writeHBP: X.hbp, X.sha256, X.hex, X.hbi)
        let trinity = self.files.contains_key(&format!("{stem}.sha256"))
            || self.files.contains_key(&format!("{stem}.hex"))
            || data.starts_with(b"!HBI-v0");
        if trinity {
            objs.push(self.trinity_obj(stem, rel, &data, hbp_bytes.as_deref()));
        }

        let Some(text) = text_opt else {
            return Ok(());
        };
        let rows = parse_rows(text);
        let ctx = HbiCtx {
            rel,
            dir: &dir,
            sha: &sha,
            len,
            hbp_rel: &hbp_rel,
            hbp: hbp_bytes.as_deref(),
        };
        self.read_rows(&ctx, &rows, objs)
    }

    /// The BigPickle trinity of `X.hbp`, by the aether `hbp` crate's `verify_hbp` (port of
    /// `hbp-reader.mjs:118-156`), on walked files only: `X.hbp` must be in the walk, and
    /// `X.sha256` / `X.hex`, which `verify_hbp` opens by name (`existsSync` then read,
    /// `hbp/src/reader.rs:155-161`), must be walked files whenever that name exists, so no
    /// symbolic link is followed (`sidecar_not_walked` otherwise). The `.hbi` comparison counts
    /// when `X.hbi` is the BigPickle index (`!HBI-v0`) or declares a value it compares
    /// (`sha256=` then hex, or `bytes=` then a digit; `reader.rs:250-266`); otherwise it is
    /// recorded as `trinity_hbi_not_declared`.
    fn trinity_obj(&self, stem: &str, rel: &str, hbi: &[u8], hbp: Option<&[u8]>) -> Obj {
        let hbp_rel = format!("{stem}.hbp");
        let pointer = format!("pair:{rel}");
        let zero = |why: &str| Obj {
            path: hbp_rel.clone(),
            kind: "trinity",
            bytes: 0,
            sha256: String::new(),
            pointer: pointer.clone(),
            verified: Trit::Zero,
            reason: why.to_string(),
        };
        let (Some(real), Some(data)) = (self.files.get(&hbp_rel), hbp) else {
            return zero("hbp_absent");
        };
        let Some(p) = real.to_str() else {
            return zero("path_not_utf8");
        };
        let base = &p[..p.len() - 4];
        for ext in ["sha256", "hex"] {
            if !self.files.contains_key(&format!("{stem}.{ext}"))
                && Path::new(&format!("{base}.{ext}")).exists()
            {
                return zero("sidecar_not_walked");
            }
        }
        let v = hbp::reader::verify_hbp(p);
        if v.errors.iter().any(|e| e == "hbp missing") {
            return zero("hbp_absent");
        }
        let hbi_declared = hbi.starts_with(b"!HBI-v0")
            || declares(hbi, b"sha256=", |b| {
                b.is_ascii_digit() || (b'a'..=b'f').contains(&b)
            })
            || declares(hbi, b"bytes=", |b| b.is_ascii_digit());
        let mut c = Checks::default();
        for (name, val) in [("sha", v.sha_ok), ("hex", v.hex_ok), ("hbi", v.hbi_ok)] {
            match val {
                Some(_) if name == "hbi" && !hbi_declared => {
                    c.info.push("trinity_hbi_not_declared".to_string());
                }
                Some(ok) => c.eq(&format!("trinity_{name}"), ok),
                None => {}
            }
        }
        let bytes = v.bytes.unwrap_or(0) as u64;
        let all_zero = data.iter().all(|&b| b == 0);
        let (t, r) = c.verdict(presence_of(bytes, all_zero, None));
        Obj {
            path: hbp_rel,
            kind: "trinity",
            bytes,
            sha256: v.sha256.unwrap_or_default(),
            pointer,
            verified: t,
            reason: r,
        }
    }

    /// The paired file `rel` (`X.hbp`, or `X.json` beside `X.hbi`), looked up in the walk by
    /// its own name; declared path values go through `resolve` instead.
    fn pair_target(&mut self, rel: &str) -> io::Result<Target> {
        let facts = if self.files.contains_key(rel) {
            Some(self.facts(rel)?)
        } else {
            None
        };
        Ok(Target {
            display: rel.to_string(),
            rel: facts.as_ref().map(|_| rel.to_string()),
            facts,
        })
    }

    fn target(&mut self, dir: &[&str], value: &str) -> io::Result<(Target, Option<&'static str>)> {
        match self.resolve(dir, value) {
            Resolve::Found(trel) => {
                let facts = self.facts(&trel)?;
                Ok((
                    Target {
                        display: trel.clone(),
                        rel: Some(trel),
                        facts: Some(facts),
                    },
                    None,
                ))
            }
            Resolve::Absent => Ok((
                Target {
                    display: value.to_string(),
                    rel: None,
                    facts: None,
                },
                Some("target_absent"),
            )),
            Resolve::Outside => Ok((
                Target {
                    display: value.to_string(),
                    rel: None,
                    facts: None,
                },
                Some("path_not_under_root"),
            )),
        }
    }

    fn file_obj(
        &self,
        row: &Row,
        key: &str,
        prefix: &str,
        t: &Target,
        why: Option<&str>,
        hbi: &str,
    ) -> Obj {
        let pointer = format!("{hbi}:{}:{key}", row.line);
        let Some(f) = &t.facts else {
            return Obj {
                path: t.display.clone(),
                kind: "file",
                bytes: 0,
                sha256: String::new(),
                pointer,
                verified: Trit::Zero,
                reason: why.unwrap_or("target_absent").to_string(),
            };
        };
        let mut c = Checks::default();
        let mut declared_len = None;
        if let Some(v) = row.get(&format!("{prefix}bytes")) {
            match text::strict_uint(v) {
                Some(n) => {
                    declared_len = Some(n);
                    c.eq("bytes", n == f.len);
                }
                None => c.unresolved.push("declared_bytes_malformed".to_string()),
            }
        }
        if let Some(v) = row.get(&format!("{prefix}sha256")) {
            if text::is_sha256_hex(v) {
                c.eq("sha256", v == f.sha256);
            } else {
                c.unresolved.push("declared_sha256_malformed".to_string());
            }
        }
        if prefix.is_empty() {
            if let Some(v) = row.get("cr") {
                match text::strict_uint(v) {
                    Some(n) => c.eq("cr", n == f.cr),
                    None => c.unresolved.push("declared_cr_malformed".to_string()),
                }
            }
            if let Some(v) = row.get("terminal_lf") {
                match v {
                    "0" | "1" => c.eq("terminal_lf", (v == "1") == (f.last == Some(b'\n'))),
                    _ => c
                        .unresolved
                        .push("declared_terminal_lf_malformed".to_string()),
                }
            }
        } else if let Some(v) = row.get(&format!("{prefix}rows")) {
            match (text::strict_uint(v), f.rows) {
                (None, _) => c.unresolved.push("declared_rows_malformed".to_string()),
                (Some(_), None) => c.differ.push("rows_target_not_utf8".to_string()),
                (Some(n), Some(m)) => c.eq("rows", n == m),
            }
        }
        let (tr, r) = c.verdict(presence_of(f.len, f.all_zero, declared_len));
        Obj {
            path: t.display.clone(),
            kind: "file",
            bytes: f.len,
            sha256: f.sha256.clone(),
            pointer,
            verified: tr,
            reason: r,
        }
    }

    fn read_rows(&mut self, ctx: &HbiCtx, rows: &[Row], objs: &mut Sink) -> io::Result<()> {
        let (hbi, dir, hbi_sha, hbi_len, hbp_rel) =
            (ctx.rel, ctx.dir, ctx.sha, ctx.len, ctx.hbp_rel);
        // needed row numbers per anchor row, for RANGE/BODYREF row-boundary checks
        let mut needed: HashMap<usize, BTreeSet<u64>> = HashMap::new();
        let mut cur: Option<usize> = None;
        for (i, row) in rows.iter().enumerate() {
            let ptrs = file_pointers(row);
            if anchor_key(row, &ptrs).is_some() {
                cur = Some(i);
            }
            if let (Some(a), Some(_)) = (cur, range_form(row)) {
                for k in ["first_row", "last_row", "row"] {
                    if let Some(n) = row.get(k).and_then(text::strict_uint) {
                        needed.entry(a).or_default().insert(n);
                    }
                }
            }
        }

        let receipts: Vec<(usize, String)> = rows
            .iter()
            .filter(|r| r.raw.contains("|prev_event_hash=") && r.raw.contains("|event_hash="))
            .map(|r| (r.line, r.raw.clone()))
            .collect();

        let mut anchor: Option<Anchor> = None;
        let mut pair: Option<Target> = None;
        let mut pair_recs: Vec<PairRec> = Vec::new();
        let mut pair_first: Option<usize> = None;
        let mut hex_rows: Vec<Option<u64>> = Vec::new();
        let mut hex_first: Option<usize> = None;
        let mut lines: Option<Vec<(usize, usize)>> = None;
        let mut hbp_rows: Option<Vec<Row>> = None;
        for (i, row) in rows.iter().enumerate() {
            // movable-flashlight footer, over the HBIROW rows before it
            if row.tag == "HBIFTR" && (row.has("indexed_bytes") || row.has("complete")) {
                if pair.is_none() {
                    pair = Some(self.pair_target(hbp_rel)?);
                }
                let arow = anchor.as_ref().map(|a| &rows[a.row]);
                objs.push(flashlight_obj(
                    hbi,
                    row,
                    arow,
                    &pair_recs,
                    pair.as_ref(),
                    ctx.hbp,
                ));
            }
            // whole-file pointers
            let ptrs = file_pointers(row);
            let akey = anchor_key(row, &ptrs);
            for (pi, (key, value, prefix)) in ptrs.iter().enumerate() {
                let (t, why) = self.target(dir, value)?;
                objs.push(self.file_obj(row, key, prefix, &t, why, hbi));
                if akey == Some(pi) {
                    let bounds = match (&t.rel, needed.get(&i)) {
                        (Some(trel), Some(set)) => Some(row_bounds(&self.files[trel], set)?),
                        _ => None,
                    };
                    anchor = Some(Anchor {
                        row: i,
                        target: t,
                        bounds,
                        ranges: Vec::new(),
                    });
                }
            }
            // the paired file, for X.hbi rows `HBP|bytes=|sha256=` / `JSON|..` with no path key
            if ptrs.is_empty()
                && (row.tag == "HBP" || row.tag == "JSON")
                && (row.has("bytes") || row.has("sha256"))
            {
                let stem = &hbp_rel[..hbp_rel.len() - 4];
                let ext = if row.tag == "HBP" { "hbp" } else { "json" };
                let t = self.pair_target(&format!("{stem}.{ext}"))?;
                objs.push(self.file_obj(row, "pair", "", &t, None, hbi));
            }
            // byte-range pointers
            if let Some(form) = range_form(row) {
                if form == Form::RowIdx {
                    pair_first.get_or_insert(row.line);
                    pair_recs.push(PairRec {
                        row: row.get("row").and_then(text::strict_uint),
                        span: range_span(row, form),
                    });
                }
                let o = if form.pair() {
                    if pair.is_none() {
                        pair = Some(self.pair_target(hbp_rel)?);
                    }
                    let p = pair.clone();
                    self.range_obj(hbi, row, form, p.as_ref(), None, None)?
                } else {
                    let (t, b, arow) = match &anchor {
                        Some(a) => (
                            Some(a.target.clone()),
                            a.bounds.as_ref(),
                            Some(&rows[a.row]),
                        ),
                        None => (None, None, None),
                    };
                    let b = b.cloned();
                    self.range_obj(hbi, row, form, t.as_ref(), b.as_ref(), arow)?
                };
                objs.push(o);
                if let (Some(a), Some((s, l))) = (anchor.as_mut(), range_span(row, form)) {
                    if !form.pair() {
                        a.ranges.push(RangeRec {
                            tag: row.tag.clone(),
                            form,
                            start: s,
                            len: l,
                        });
                    }
                }
            }
            // hex rows `HBI|row=|sha256=|hex=`, one per row of the paired .hbp
            if row.tag == "HBI" && row.has("row") && row.has("sha256") && row.has("hex") {
                hex_first.get_or_insert(row.line);
                hex_rows.push(row.get("row").and_then(text::strict_uint));
                let l = lines.get_or_insert_with(|| ctx.hbp.map(rust_lines).unwrap_or_default());
                objs.push(hexrow_obj(hbi, row, hbp_rel, ctx.hbp, l));
            }
            // index aggregates
            if let Some(o) = index_obj(hbi, row, anchor.as_ref(), rows) {
                objs.push(o);
            }
            // declared sha16 emitter chain
            if row.tag == "HBIROW"
                && row.get("kind") == Some("emitter")
                && row.raw.contains("chain=pid[n]=sha16(pid[n-1]|name)")
            {
                objs.push(chain_obj(hbi, hbi_sha, hbi_len, row, &rows[i + 1..]));
            }
            // receipt chain (emitted at its first row)
            if receipts.first().map(|r| r.0) == Some(row.line) {
                objs.push(receipt_obj(hbi, hbi_sha, hbi_len, &receipts));
            }
            // CENTER commitments
            if row.tag == "CENTER" && CENTER_MEMBERS.iter().all(|k| row.has(k)) {
                // the paired .hbp rows are parsed only when a CENTER row needs them
                let hr = hbp_rows.get_or_insert_with(|| {
                    ctx.hbp
                        .and_then(|d| std::str::from_utf8(d).ok())
                        .map(parse_rows)
                        .unwrap_or_default()
                });
                objs.push(center_obj(hbi, hbi_sha, hbi_len, row, hr));
            }
        }
        if let Some(first) = hex_first {
            let t = self.pair_target(hbp_rel)?;
            let n_lines = lines.as_ref().map_or(0, |l| l.len() as u64);
            objs.push(hex_index_obj(hbi, first, &hex_rows, &t, n_lines));
        }
        if let Some(first) = pair_first {
            let t = self.pair_target(hbp_rel)?;
            objs.push(rowidx_index_obj(hbi, first, &pair_recs, &t));
        }
        Ok(())
    }

    fn range_obj(
        &self,
        hbi: &str,
        row: &Row,
        form: Form,
        target: Option<&Target>,
        bounds: Option<&Bounds>,
        anchor_row: Option<&Row>,
    ) -> io::Result<Obj> {
        let span = range_span(row, form);
        let pointer = match span {
            Some((s, l)) => format!("{hbi}:{}:{s}-{}", row.line, u128::from(s) + u128::from(l)),
            None => format!("{hbi}:{}", row.line),
        };
        let mk = |path: String, why: &str| Obj {
            path,
            kind: "range",
            bytes: 0,
            sha256: String::new(),
            pointer: pointer.clone(),
            verified: Trit::Zero,
            reason: why.to_string(),
        };
        let Some(t) = target else {
            return Ok(mk(String::new(), "anchor_absent"));
        };
        let (Some(trel), Some(f)) = (&t.rel, &t.facts) else {
            return Ok(mk(t.display.clone(), "anchor_unresolved"));
        };
        let Some((start, len)) = span else {
            return Ok(mk(t.display.clone(), "declared_range_malformed"));
        };
        // declared `hex=` compared as `chunk.hex() != expected_hex.lower()`
        // (verify_receipt_privacy.py:107-109)
        let hex = row.get("hex").map(|h| unhex_lower(&h.to_ascii_lowercase()));
        let expect = hex.as_ref().and_then(|h| h.as_deref());
        let s = slice_facts(&self.files[trel], start, len, f.len, expect)?;
        let mut c = Checks::default();
        if let Some(v) = row.get("bytes") {
            match text::strict_uint(v) {
                Some(n) => c.eq("bytes", n == s.present && n == len),
                None => c.unresolved.push("declared_bytes_malformed".to_string()),
            }
        }
        for key in ["sha256", "row_sha256"] {
            if let Some(v) = row.get(key) {
                if text::is_sha256_hex(v) {
                    c.eq(key, v == s.sha256);
                } else {
                    c.unresolved.push(format!("declared_{key}_malformed"));
                }
            }
        }
        if let Some(h) = &hex {
            c.eq("hex", h.is_some() && s.same);
        }
        if let Some(v) = row.get("includes_lf") {
            match v {
                "0" | "1" => c.eq("includes_lf", (v == "1") == (s.last == Some(b'\n'))),
                _ => c
                    .unresolved
                    .push("declared_includes_lf_malformed".to_string()),
            }
        }
        if !form.pair() {
            for key in ["tag", "kind"] {
                if let Some(v) = row.get(key) {
                    let want = format!("{v}|");
                    c.eq(key, s.head.starts_with(want.as_bytes()));
                }
            }
        }
        if form == Form::Idx {
            if let Some(pid) = row.get("pid").filter(|p| p.starts_with("AGT-")) {
                c.eq("agt", pid == format!("AGT-{}", &s.sha256[..16]));
            }
        }
        if let Some(a) = anchor_row {
            let rows_declared = row.has("first_row") || row.has("row");
            if rows_declared {
                match (
                    a.get("range_length_includes_terminal_lf"),
                    a.get("offset_basis"),
                ) {
                    (Some(lf), basis) if lf == "0" || lf == "1" => {
                        if basis.is_some_and(|b| b != "zero_based_utf8_bytes") {
                            c.unresolved.push("offset_basis_unsupported".to_string());
                        } else {
                            let u = |k: &str| row.get(k).and_then(text::strict_uint);
                            let (first, last) = if row.has("first_row") {
                                (u("first_row"), u("last_row"))
                            } else {
                                (u("row"), u("row"))
                            };
                            let ok = match (first, last, bounds) {
                                (Some(fr), Some(lr), Some(b)) => match (b.get(&fr), b.get(&lr)) {
                                    (Some(x), Some(y)) => {
                                        let end = if lf == "1" { y.2 } else { Some(y.1) };
                                        x.0 == start
                                            && end.map(u128::from)
                                                == Some(u128::from(start) + u128::from(len))
                                    }
                                    _ => false,
                                },
                                _ => false,
                            };
                            c.eq("row_bounds", ok);
                        }
                    }
                    _ => {}
                }
            }
        }
        let presence = if len > 0 && s.present == 0 {
            Presence::Absent
        } else if s.present < len {
            Presence::Short
        } else if s.present > 0 && s.all_zero {
            Presence::ZeroFilled
        } else {
            Presence::Present
        };
        let (tr, r) = c.verdict_extent(presence, s.present < len);
        Ok(Obj {
            path: t.display.clone(),
            kind: "range",
            bytes: s.present,
            sha256: s.sha256,
            pointer,
            verified: tr,
            reason: r,
        })
    }
}

/// Ranges in order from 0, each starting where the one before it ends, ending at `total`
/// (sums in `u128`, as Python's integers do not wrap).
fn contiguous(recs: &[&RangeRec], total: u64) -> bool {
    let mut at = 0u128;
    for r in recs {
        if u128::from(r.start) != at {
            return false;
        }
        at = u128::from(r.start) + u128::from(r.len);
    }
    !recs.is_empty() && at == u128::from(total)
}

/// Aggregate rows over the ranges of the current anchor: `FOOTER|indexed_rows=|indexed_bytes=|
/// coverage=`, `<X>INDEXFTR|range_count=|bodyref_count=|covered_bytes=|coverage_exact=`,
/// `<X>HBIFTR|rows=` (no `body_sha256`).
fn index_obj(hbi: &str, row: &Row, anchor: Option<&Anchor>, rows: &[Row]) -> Option<Obj> {
    let footer = row.tag == "FOOTER"
        && (row.has("indexed_rows") || row.has("indexed_bytes") || row.has("coverage"));
    let idxftr = row.tag.ends_with("INDEXFTR")
        && [
            "range_count",
            "bodyref_count",
            "covered_bytes",
            "coverage_exact",
        ]
        .iter()
        .any(|k| row.has(k));
    let hbiftr = row.tag.ends_with("HBIFTR") && row.has("rows") && !row.has("body_sha256");
    if !(footer || idxftr || hbiftr) {
        return None;
    }
    let pointer = format!("{hbi}:{}", row.line);
    let Some(a) = anchor else {
        return Some(Obj {
            path: String::new(),
            kind: "index",
            bytes: 0,
            sha256: String::new(),
            pointer,
            verified: Trit::Zero,
            reason: "anchor_absent".to_string(),
        });
    };
    let total = a.target.facts.as_ref().map(|f| f.len);
    let mut c = Checks::default();
    let num = |c: &mut Checks, key: &str, name: &str, have: u128| {
        if let Some(v) = row.get(key) {
            match text::strict_uint(v) {
                Some(n) => c.eq(name, u128::from(n) == have),
                None => c.unresolved.push(format!("declared_{key}_malformed")),
            }
        }
    };
    let cover = |c: &mut Checks, recs: &[&RangeRec], want: bool| match total {
        Some(t) => c.eq("coverage", contiguous(recs, t) == want),
        None => c.unresolved.push("anchor_unresolved".to_string()),
    };
    if footer {
        let recs: Vec<&RangeRec> = a
            .ranges
            .iter()
            .filter(|r| r.form == Form::StartEnd)
            .collect();
        num(&mut c, "indexed_rows", "count", recs.len() as u128);
        num(
            &mut c,
            "indexed_bytes",
            "sum",
            recs.iter().map(|r| u128::from(r.len)).sum(),
        );
        match row.get("coverage") {
            Some("EXACT") => cover(&mut c, &recs, true),
            Some(_) => c.unresolved.push("coverage_value_unsupported".to_string()),
            None => {}
        }
    } else if idxftr {
        let ranges: Vec<&RangeRec> = a.ranges.iter().filter(|r| r.tag == "RANGE").collect();
        let bodyrefs = a.ranges.iter().filter(|r| r.tag == "BODYREF").count() as u128;
        num(&mut c, "range_count", "range_count", ranges.len() as u128);
        num(&mut c, "bodyref_count", "bodyref_count", bodyrefs);
        num(
            &mut c,
            "covered_bytes",
            "sum",
            ranges.iter().map(|r| u128::from(r.len)).sum(),
        );
        match row.get("coverage_exact") {
            Some("1") => cover(&mut c, &ranges, true),
            Some("0") => cover(&mut c, &ranges, false),
            Some(_) => c
                .unresolved
                .push("declared_coverage_exact_malformed".to_string()),
            None => {}
        }
    } else {
        let n = a.ranges.len() as u128;
        num(&mut c, "rows", "count", n);
        if let Some(v) = rows[a.row].get("rows") {
            match (
                text::strict_uint(v),
                row.get("rows").and_then(text::strict_uint),
            ) {
                (Some(h), Some(fv)) => c.eq("header_rows", h == fv),
                _ => c
                    .unresolved
                    .push("declared_header_rows_malformed".to_string()),
            }
        }
    }
    let (tr, r) = c.verdict(Presence::Present);
    let f = a.target.facts.as_ref();
    Some(Obj {
        path: a.target.display.clone(),
        kind: "index",
        bytes: f.map(|f| f.len).unwrap_or(0),
        sha256: f.map(|f| f.sha256.clone()).unwrap_or_default(),
        pointer,
        verified: tr,
        reason: r,
    })
}

/// An `index` result over the paired `.hbp` `t`. An indexed extent past the end of the `.hbp`
/// (`short`) gives 0; absent or zero-filled `.hbp` bytes give 0 when a check differs, as for a
/// declared `bytes=` longer than the file (`presence_of`).
fn pair_index(hbi: &str, line: usize, t: &Target, c: &Checks, short: bool) -> Obj {
    let presence = match &t.facts {
        Some(f) if f.len > 0 && short => Presence::Short,
        Some(f) => presence_of(f.len, f.all_zero, None),
        None => Presence::Absent,
    };
    let (tr, r) = c.verdict_extent(presence, short && t.facts.is_some());
    let f = t.facts.as_ref();
    Obj {
        path: t.display.clone(),
        kind: "index",
        bytes: f.map_or(0, |f| f.len),
        sha256: f.map(|f| f.sha256.clone()).unwrap_or_default(),
        pointer: format!("{hbi}:{line}"),
        verified: tr,
        reason: r,
    }
}

/// movable-flashlight `HBIFTR|source_file=|indexed_bytes=|source_bytes=|complete=` over the
/// `HBIROW` rows before it. Writer (asolaria-omega-omnibit-tournament
/// `tools/movable-flashlight/hbp.py:97-128`): `row_count` = number of rows, `indexed_bytes` =
/// sum of row lengths, `complete` = that sum equals the `.hbp` length, rendered `1`/`0`
/// (`tuple_value`, :29-31). Verifier (:139-163): row count = `len(data.splitlines())`.
fn flashlight_obj(
    hbi: &str,
    row: &Row,
    anchor: Option<&Row>,
    recs: &[PairRec],
    pair: Option<&Target>,
    hbp: Option<&[u8]>,
) -> Obj {
    let mut c = Checks::default();
    let sum: u128 = recs
        .iter()
        .filter_map(|r| r.span)
        .map(|(_, l)| u128::from(l))
        .sum();
    let count = recs.len() as u64;
    if let Some(v) = row.get("indexed_bytes") {
        match text::strict_uint(v) {
            Some(n) => c.eq("indexed_bytes", u128::from(n) == sum),
            None => c
                .unresolved
                .push("declared_indexed_bytes_malformed".to_string()),
        }
    }
    if let Some(v) = anchor
        .filter(|a| a.tag == "HBIHDR")
        .and_then(|a| a.get("row_count"))
    {
        match text::strict_uint(v) {
            Some(n) => c.eq("row_count", n == count),
            None => c
                .unresolved
                .push("declared_row_count_malformed".to_string()),
        }
    }
    let total = pair.and_then(|t| t.facts.as_ref()).map(|f| f.len);
    match (total, hbp) {
        (Some(t), Some(d)) => {
            if let Some(v) = row.get("complete") {
                match v {
                    "0" | "1" => c.eq("complete", (v == "1") == (sum == u128::from(t))),
                    _ => c.unresolved.push("declared_complete_malformed".to_string()),
                }
            }
            c.eq("source_rows", count == bytes_splitlines_count(d));
        }
        _ => c.unresolved.push("hbp_absent".to_string()),
    }
    let absent = Target {
        display: String::new(),
        rel: None,
        facts: None,
    };
    let short = total.is_some_and(|t| sum > u128::from(t));
    pair_index(hbi, row.line, pair.unwrap_or(&absent), &c, short)
}

/// `HBI|row=|sha256=|hex=`: one row per row of the paired `.hbp`, with the `sha256` and the
/// lowercase hex of that row's bytes. Writers: FOLLOW
/// `tournament/public-dependencies/gitram/pais_path3_bridge.rs:674-677` (`hbi_for`) and
/// asolaria-rotating-lighthouse `viewer/github3d.rs:444-458`. Recomputed: `hex` equals the hex
/// of `.hbp` row `row`, `sha256` equals that row's digest, and the declared hex decodes to bytes
/// whose digest is the declared `sha256` (`hex_sha256`, the payload round trip).
fn hexrow_obj(
    hbi: &str,
    row: &Row,
    hbp_rel: &str,
    hbp: Option<&[u8]>,
    lines: &[(usize, usize)],
) -> Obj {
    let mut c = Checks::default();
    let n = row
        .get("row")
        .and_then(text::strict_uint)
        .filter(|&n| n >= 1);
    let sha_decl = row.get("sha256").filter(|v| text::is_sha256_hex(v));
    let hex_decl = row.get("hex").unwrap_or("");
    if n.is_none() {
        c.unresolved.push("declared_row_malformed".to_string());
    }
    if sha_decl.is_none() {
        c.unresolved.push("declared_sha256_malformed".to_string());
    }
    let line = match (hbp, n) {
        (Some(d), Some(n)) => usize::try_from(n - 1)
            .ok()
            .and_then(|k| lines.get(k))
            .map(|&(s, e)| (s, e, &d[s..e])),
        _ => None,
    };
    let line_sha = line.map(|(_, _, l)| sha256_hex(l));
    match unhex_lower(hex_decl) {
        None => c.unresolved.push("declared_hex_malformed".to_string()),
        Some(d) => {
            if let Some(s) = sha_decl {
                // equal bytes have equal digests: reuse the row's digest when they match
                let dsha = match (line, &line_sha) {
                    (Some((_, _, l)), Some(h)) if l == d.as_slice() => h.clone(),
                    _ => sha256_hex(&d),
                };
                c.eq("hex_sha256", dsha == s);
            }
        }
    }
    let (bytes, sha, pointer, presence) = match (line, line_sha) {
        (Some((s, e, l)), Some(ls)) => {
            c.eq("hex", hex_lower(l) == hex_decl);
            if let Some(sd) = sha_decl {
                c.eq("sha256", ls == sd);
            }
            let p = if !l.is_empty() && l.iter().all(|&b| b == 0) {
                Presence::ZeroFilled
            } else {
                Presence::Present
            };
            (l.len() as u64, ls, format!("{hbi}:{}:{s}-{e}", row.line), p)
        }
        _ => {
            c.unresolved.push(
                if hbp.is_none() {
                    "hbp_absent"
                } else {
                    "target_row_absent"
                }
                .to_string(),
            );
            (
                0,
                String::new(),
                format!("{hbi}:{}", row.line),
                Presence::Absent,
            )
        }
    };
    let (tr, r) = c.verdict(presence);
    Obj {
        path: hbp_rel.to_string(),
        kind: "range",
        bytes,
        sha256: sha,
        pointer,
        verified: tr,
        reason: r,
    }
}

/// The hex rows of one `.hbi` together: numbered 1..n in order (`row_sequence`) and one per
/// `.hbp` row (`rows`), as `hbi_for` writes them (`pais_path3_bridge.rs:674-677`).
fn hex_index_obj(hbi: &str, first: usize, nums: &[Option<u64>], t: &Target, n_lines: u64) -> Obj {
    let mut c = Checks::default();
    c.eq(
        "row_sequence",
        nums.iter()
            .enumerate()
            .all(|(k, n)| *n == Some(k as u64 + 1)),
    );
    if t.facts.is_some() {
        c.eq("rows", nums.len() as u64 == n_lines);
    } else {
        c.unresolved.push("hbp_absent".to_string());
    }
    pair_index(hbi, first, t, &c, nums.len() as u64 > n_lines)
}

/// The `HBIROW` byte rows of one `.hbi` together (`verify_receipt_privacy.py:83-117`): each
/// `row` equals its position (`row_sequence`); each offset equals the end of the row before
/// it, from 0, and the last end equals the `.hbp` length (`coverage`).
fn rowidx_index_obj(hbi: &str, first: usize, recs: &[PairRec], t: &Target) -> Obj {
    let mut c = Checks::default();
    let (mut seq, mut contiguous, mut cursor, mut malformed) = (true, true, 0u128, false);
    for (k, r) in recs.iter().enumerate() {
        match (r.row, r.span) {
            (Some(n), Some((off, len))) => {
                seq &= n == k as u64 + 1;
                contiguous &= u128::from(off) == cursor;
                cursor = u128::from(off) + u128::from(len);
            }
            _ => malformed = true,
        }
    }
    c.eq("row_sequence", seq);
    match &t.facts {
        Some(f) => c.eq("coverage", contiguous && cursor == u128::from(f.len)),
        None => c.unresolved.push("hbp_absent".to_string()),
    }
    if malformed {
        c.unresolved.push("declared_range_malformed".to_string());
    }
    let short = t.facts.as_ref().is_some_and(|f| cursor > u128::from(f.len));
    pair_index(hbi, first, t, &c, short)
}

/// `HBIROW|kind=emitter|seed=..|chain=pid[n]=sha16(pid[n-1]|name)`: recompute every `EMIT`
/// row after it. `seed=sha16(EMITTER-SEED|<x>)` is evaluated as written (the owner's emitter
/// `asolaria-office-service/fable5-office-render/bigpickle-map-and-ramp.py:3,8-9`).
fn chain_obj(hbi: &str, sha: &str, len: u64, row: &Row, after: &[Row]) -> Obj {
    let mut c = Checks::default();
    let seed = match row.get("seed") {
        Some(v) if text::is_sha16_hex(v) => Some(v.to_string()),
        _ => {
            let marker = "seed=sha16(EMITTER-SEED|";
            row.raw.find(marker).and_then(|p| {
                let rest = &row.raw[p + marker.len()..];
                rest.find(')')
                    .map(|q| sha16(&format!("EMITTER-SEED|{}", &rest[..q])))
            })
        }
    };
    match seed {
        None => c.unresolved.push("seed_not_declared".to_string()),
        Some(seed) => {
            let emits: Vec<&Row> = after.iter().filter(|r| r.tag == "EMIT").collect();
            let mut prev = seed;
            let (mut ok, mut first_bad) = (0usize, None);
            for e in &emits {
                let pid = e.get("pid").unwrap_or("");
                let good = e
                    .get("name")
                    .is_some_and(|n| sha16(&format!("{prev}|{n}")) == pid);
                if good {
                    ok += 1;
                } else if first_bad.is_none() {
                    first_bad = Some(e.line);
                }
                prev = pid.to_string();
            }
            let n = emits.len();
            if n == 0 {
                c.unresolved.push("no_emit_rows".to_string());
            } else if let Some(l) = first_bad {
                c.differ
                    .push(format!("chain_link_differs:{ok}/{n}:line:{l}"));
            } else {
                c.pass.push(format!("chain:{ok}/{n}"));
            }
        }
    }
    let (t, r) = c.verdict(Presence::Present);
    Obj {
        path: hbi.to_string(),
        kind: "chain",
        bytes: len,
        sha256: sha.to_string(),
        pointer: format!("{hbi}:{}", row.line),
        verified: t,
        reason: r,
    }
}

/// Hash-chained receipts (`<row>|prev_event_hash=<64>|event_hash=<64>`), vendored `verify_chain`.
fn receipt_obj(hbi: &str, sha: &str, len: u64, receipts: &[(usize, String)]) -> Obj {
    let all: Vec<String> = receipts.iter().map(|r| r.1.clone()).collect();
    let mut c = Checks::default();
    if verify_chain(&all) {
        c.pass.push(format!("receipt_chain:{}", all.len()));
    } else {
        let bad = (1..=all.len())
            .find(|&k| !verify_chain(&all[..k]))
            .map(|k| receipts[k - 1].0)
            .unwrap_or(0);
        c.differ.push(format!("receipt_chain_differs:line:{bad}"));
    }
    let (t, r) = c.verdict(Presence::Present);
    Obj {
        path: hbi.to_string(),
        kind: "chain",
        bytes: len,
        sha256: sha.to_string(),
        pointer: format!("{hbi}:{}", receipts[0].0),
        verified: t,
        reason: r,
    }
}

/// `.hbi` `CENTER|..|hbi=|hbp=|sha=|sh=|hash=` against the paired `.hbp` CENTER row
/// (`verify_public_repo.py:1790-1799`); `algorithm=SHA256_UTF8_DOMAIN_NUL_MEMBER_V1|domain=`
/// recomputed as `sha256(domain + "\0" + MEMBER)` (`verify_public_repo.py:1948-1954`).
fn center_obj(hbi: &str, sha: &str, len: u64, row: &Row, hbp_rows: &[Row]) -> Obj {
    let mut c = Checks::default();
    let mine: Vec<&str> = CENTER_MEMBERS
        .iter()
        .map(|k| row.get(k).unwrap_or(""))
        .collect();
    match hbp_rows
        .iter()
        .find(|r| r.tag == "CENTER" && CENTER_MEMBERS.iter().all(|k| r.has(k)))
    {
        None => c.unresolved.push("hbp_center_absent".to_string()),
        Some(h) => {
            let theirs: Vec<&str> = CENTER_MEMBERS
                .iter()
                .map(|k| h.get(k).unwrap_or(""))
                .collect();
            c.eq("center_equals_hbp", mine == theirs);
            match (h.get("algorithm"), h.get("domain")) {
                (Some("SHA256_UTF8_DOMAIN_NUL_MEMBER_V1"), Some(d)) => {
                    let ok = CENTER_MEMBERS.iter().zip(theirs.iter()).all(|(m, v)| {
                        sha256_hex(format!("{d}\0{}", m.to_ascii_uppercase()).as_bytes()) == *v
                    });
                    c.eq("domain_nul_member", ok);
                }
                (Some(alg), _) => c.info.push(format!("algorithm_not_recomputed:{alg}")),
                (None, _) => {}
            }
        }
    }
    match row.get("sha_equals_hash") {
        Some("0") => c.eq("sha_ne_hash", mine[2] != mine[4]),
        Some("1") => c.eq("sha_eq_hash", mine[2] == mine[4]),
        _ => {}
    }
    let (t, r) = c.verdict(Presence::Present);
    Obj {
        path: hbi.to_string(),
        kind: "center",
        bytes: len,
        sha256: sha.to_string(),
        pointer: format!("{hbi}:{}", row.line),
        verified: t,
        reason: r,
    }
}

/// Where result rows go as they are produced: counted, then handed to `emit` (the first
/// error of `emit` is kept and ends the read after the current `.hbi`).
struct Sink<'a> {
    tally: Tally,
    emit: &'a mut dyn FnMut(String) -> io::Result<()>,
    err: Option<io::Error>,
}

impl Sink<'_> {
    fn push(&mut self, o: Obj) {
        if self.err.is_none() {
            self.tally.add(&o);
            if let Err(e) = (self.emit)(o.row()) {
                self.err = Some(e);
            }
        }
    }
}

/// Integer counts behind the totals rows: per kind `[objects, +1, -1, 0]`, and per
/// `<trit>:<token head>` of the rows that are not `+1`.
#[derive(Default)]
struct Tally {
    kinds: [[u64; 4]; KINDS.len()],
    reasons: BTreeMap<String, u64>,
}

impl Tally {
    fn add(&mut self, o: &Obj) {
        let slot = match o.verified {
            Trit::Plus => 1,
            Trit::Minus => 2,
            Trit::Zero => 3,
        };
        if let Some(k) = KINDS.iter().position(|k| *k == o.kind) {
            self.kinds[k][0] += 1;
            self.kinds[k][slot] += 1;
        }
        if o.verified != Trit::Plus {
            for tok in o.reason.split('+') {
                let head = tok.split(':').next().unwrap_or(tok);
                *self
                    .reasons
                    .entry(format!("{}:{head}", o.verified.render()))
                    .or_default() += 1;
            }
        }
    }

    fn rows(&self, hbis: usize, files: usize) -> Vec<String> {
        let mut out = Vec::new();
        let mut all = [0u64; 4];
        for (k, c) in KINDS.iter().zip(self.kinds.iter()) {
            for (a, n) in all.iter_mut().zip(c.iter()) {
                *a += n;
            }
            out.push(encode_row(
                "VAULTKIND",
                &[
                    ("kind", k),
                    ("objects", &c[0].to_string()),
                    ("verified", &c[1].to_string()),
                    ("failed", &c[2].to_string()),
                    ("unresolved", &c[3].to_string()),
                ],
            ));
        }
        for (k, n) in &self.reasons {
            out.push(encode_row(
                "VAULTREASON",
                &[("reason", k), ("count", &n.to_string())],
            ));
        }
        out.push(encode_row(
            "VAULTTOTAL",
            &[
                ("hbi", &hbis.to_string()),
                ("files", &files.to_string()),
                ("objects", &all[0].to_string()),
                ("verified", &all[1].to_string()),
                ("failed", &all[2].to_string()),
                ("unresolved", &all[3].to_string()),
            ],
        ));
        out
    }
}

/// Walk `root` and read every `.hbi` beneath it.
pub fn read_vault(root: &Path) -> io::Result<Vec<String>> {
    Vault::open(root)?.read()
}

/// As `read_vault`, writing each row and its `\n` to `out` as soon as its `.hbi` is read.
pub fn write_vault(root: &Path, out: &mut dyn Write) -> io::Result<()> {
    Vault::open(root)?.read_each(&mut |row| {
        out.write_all(row.as_bytes())?;
        out.write_all(b"\n")
    })
}
