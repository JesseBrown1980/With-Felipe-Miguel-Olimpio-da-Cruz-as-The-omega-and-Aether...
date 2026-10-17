//! The vendored the-colour-qr @ 1938a9b against its own sidecars and receipt rows.

use colour_qr::sha256_hex;
use std::path::PathBuf;

fn vendor() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("vendor/the-colour-qr")
}

fn read(rel: &str) -> Vec<u8> {
    std::fs::read(vendor().join(rel)).unwrap()
}

fn get<'a>(row: &[(&str, &'a str)], key: &str) -> &'a str {
    row.iter().find(|(k, _)| *k == key).unwrap().1
}

/// Every `.sha256` sidecar (`<hex>  <name>` for the file in its own directory) holds.
#[test]
fn every_sidecar_holds() {
    let sidecars = [
        ".github/workflows/pages.yml.sha256",
        ".nojekyll.sha256",
        "COLOUR-QR-RECEIPT-2026-08-06.hbp.sha256",
        "CREATE-THIS-REPO.md.sha256",
        "HANDOFF-TO-LOCAL-CLAUDE.md.sha256",
        "README.md.sha256",
        "index.html.sha256",
    ];
    for s in sidecars {
        let line = String::from_utf8(read(s)).unwrap();
        let (hex, name) = line.trim_end().split_once("  ").unwrap();
        let dir = s.rsplit_once('/').map_or("", |(d, _)| d);
        let target = if dir.is_empty() {
            name.to_string()
        } else {
            format!("{dir}/{name}")
        };
        assert_eq!(sha256_hex(&read(&target)), hex, "{s}");
    }
}

/// COLOUR-QR-RECEIPT-2026-08-06.hbp has three rows (.nojekyll, README.md, index.html). The
/// first two equal the vendored files. The index.html row records 267,679 B / sha16
/// 4212990d22153880, the page as committed in 974338a; 1938a9b appended the corridor block
/// (index.html:10308-10347) and regenerated index.html.sha256, which the vendored page equals.
#[test]
fn every_receipt_row_is_read() {
    let text = String::from_utf8(read("COLOUR-QR-RECEIPT-2026-08-06.hbp")).unwrap();
    let rows: Vec<Vec<(&str, &str)>> = text
        .lines()
        .map(|l| {
            assert!(l.starts_with("COLOURQR|"), "{l}");
            l.split('|')
                .skip(1)
                .filter_map(|f| f.split_once('='))
                .collect()
        })
        .collect();
    assert_eq!(rows.len(), 3);
    let mut index_row = None;
    for row in &rows {
        assert_eq!(get(row, "room"), "44");
        assert_eq!(get(row, "door"), "the-colour-qr");
        assert_eq!(
            get(row, "rule"),
            "rust_1.81_clippy_integer_ternary_no_float"
        );
        assert_eq!(get(row, "json"), "0");
        let file = get(row, "file");
        let bytes = read(file);
        if file == "index.html" {
            index_row = Some((get(row, "bytes"), get(row, "sha16")));
            continue;
        }
        assert_eq!(get(row, "bytes"), bytes.len().to_string(), "{file}");
        assert_eq!(get(row, "sha16"), &sha256_hex(&bytes)[..16], "{file}");
    }
    assert_eq!(index_row, Some(("267679", "4212990d22153880")));
    let page = read("index.html");
    assert_eq!(page.len(), 272_097);
    assert_eq!(
        sha256_hex(&page),
        "7b9a0830aa01efe770c8b69a4c5712069fba3a82eab7c00ab4dc2392379d573a"
    );
}
