//! Port of relay-hbp-writer.mjs:1-19 — append-only HBP ledger + out-of-line payload store.
//! Each seat writes only its own lane files; return the byte position each append landed at.

use std::fs::OpenOptions;
use std::io::{self, Write};
use std::path::Path;

use hbp::relay::RelayError;

/// relay-hbp-writer.mjs:5 `fileSize` — current size in bytes, or 0 if absent.
pub fn file_size(path: &str) -> u64 {
    std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
}

/// The message node:fs puts on a failed call (`CODE: description, syscall 'path'`, the libuv
/// errno text), so a read failure carries the text the JS reports. Unlisted errnos keep Rust's text.
pub(crate) fn node_fs_error(e: &io::Error, syscall: &str, path: Option<&str>) -> RelayError {
    let known = if cfg!(target_os = "linux") {
        match e.raw_os_error() {
            Some(1) => Some(("EPERM", "operation not permitted")),
            Some(2) => Some(("ENOENT", "no such file or directory")),
            Some(5) => Some(("EIO", "i/o error")),
            Some(13) => Some(("EACCES", "permission denied")),
            Some(20) => Some(("ENOTDIR", "not a directory")),
            Some(21) => Some(("EISDIR", "illegal operation on a directory")),
            Some(24) => Some(("EMFILE", "too many open files")),
            Some(36) => Some(("ENAMETOOLONG", "name too long")),
            Some(40) => Some(("ELOOP", "too many symbolic links encountered")),
            _ => None,
        }
    } else {
        None
    };
    let at = path.map(|p| format!(" '{p}'")).unwrap_or_default();
    match known {
        Some((code, desc)) => RelayError(format!("{code}: {desc}, {syscall}{at}")),
        None => RelayError(format!("{syscall}{at}: {e}")),
    }
}

/// node:fs `readFileSync(path)`: the whole file, with Node's message on failure (an open error
/// names the path; a read error such as EISDIR does not).
pub(crate) fn read_file(path: &str) -> Result<Vec<u8>, RelayError> {
    use std::io::Read;
    let mut f = std::fs::File::open(path).map_err(|e| node_fs_error(&e, "open", Some(path)))?;
    let mut buf = Vec::new();
    f.read_to_end(&mut buf)
        .map_err(|e| node_fs_error(&e, "read", None))?;
    Ok(buf)
}

/// relay-driver.mjs:59/81 and relay-hbi-indexer.mjs:15-16: `existsSync(p) ? readFileSync(p,
/// 'utf8') : <empty>`. An absent path reads as empty; any other read failure is returned. The
/// bytes are decoded as `Buffer.toString('utf8')` does: each ill-formed subsequence becomes U+FFFD
/// (String::from_utf8_lossy applies the same maximal-subpart rule) and a leading BOM is kept.
pub(crate) fn read_text_if_exists(path: &str) -> Result<String, RelayError> {
    if !Path::new(path).exists() {
        return Ok(String::new());
    }
    let bytes = read_file(path)?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

fn append_bytes(path: &str, bytes: &[u8]) -> io::Result<()> {
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(Path::new(path))?;
    f.write_all(bytes)
}

/// relay-hbp-writer.mjs:8-12 `appendBlob` — append a payload blob; return its `{off, len}`.
pub fn append_blob(payloads_path: &str, buf: &[u8]) -> Result<(u64, u64), RelayError> {
    let off = file_size(payloads_path);
    append_bytes(payloads_path, buf).map_err(|e| RelayError(format!("WRITE_PAYLOAD: {e}")))?;
    Ok((off, buf.len() as u64))
}

/// relay-hbp-writer.mjs:15-19 `appendRow` — append an LF-terminated RELAY row; return its byte offset.
pub fn append_row(hbp_path: &str, row: &str) -> Result<u64, RelayError> {
    let off = file_size(hbp_path);
    let mut line = row.as_bytes().to_vec();
    line.push(b'\n');
    append_bytes(hbp_path, &line).map_err(|e| RelayError(format!("WRITE_ROW: {e}")))?;
    Ok(off)
}
