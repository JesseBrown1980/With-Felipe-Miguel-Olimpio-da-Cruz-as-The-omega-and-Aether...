//! CLI uses heap only for argument parsing and printing; library uses no allocation.
use behcs1024_60d::{bytes_read, counter_bytes_hashed, project_60d, TUPLE_CAP};
use std::fmt::Write as _;

fn nibble(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

fn parse_hex(s: &str) -> Result<Vec<u8>, &'static str> {
    if s.len() % 2 != 0 {
        return Err("bad hex length");
    }
    let mut decoded = Vec::with_capacity(s.len() / 2);
    for pair in s.as_bytes().chunks_exact(2) {
        let h = nibble(pair[0]).ok_or("bad high hex character")?;
        let l = nibble(pair[1]).ok_or("bad low hex character")?;
        decoded.push(h * 16 + l);
    }
    Ok(decoded)
}

fn hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        write!(&mut out, "{b:02x}").expect("in-memory write");
    }
    out
}

fn main() {
    let arg = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "616263".to_owned());
    let bytes = match parse_hex(&arg) {
        Ok(b) => b,
        Err(reason) => {
            eprintln!("INPUT_HELD|reason={reason}|json=0");
            std::process::exit(2);
        }
    };
    let projection = project_60d(&bytes);
    println!("HBP1|schema=ASOLARIA-BEHCS1024-60D-UPSTREAM-V1|dims=60|alphabet=1024|json=0");
    print!("COORD|glyphs=");
    for (i, glyph) in projection.glyphs.iter().enumerate() {
        if i > 0 {
            print!(".");
        }
        print!("{glyph}");
    }
    println!("|json=0");
    println!(
        "DIGEST|source_sha256={}|coordinate_sha256={}|host8={}|json=0",
        hex(&projection.source_sha256),
        hex(&projection.coordinate_sha256),
        hex(&projection.host8),
    );
    println!(
        "BOUNDARY|inverse=NOT_ESTABLISHED|full_source_required=TRUE|tuple_cap={TUPLE_CAP}|bytes={}|bytes_read={}|counter_bytes_hashed={}|json=0",
        bytes.len(),
        bytes_read(&bytes),
        counter_bytes_hashed(&bytes),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_validation() {
        assert_eq!(parse_hex("616263").unwrap(), b"abc");
        assert!(parse_hex("g0").is_err());
        assert!(parse_hex("1").is_err());
        assert_eq!(parse_hex(&"aa".repeat(TUPLE_CAP + 1)).unwrap().len(), TUPLE_CAP + 1);
    }
}
