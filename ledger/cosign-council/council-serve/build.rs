//! Writes line ranges of the byte-identical upstream `src/main.rs` and `src/routes.rs`
//! (asolaria-federation-1024 @ dc1da1a9, servers/council-serve) to OUT_DIR for `include!`.
//! Every range is a run of whole items, written as it is. `EXTRACTS.sha256` pins each range.

use std::env;
use std::fs;
use std::path::Path;

fn range(text: &str, first: usize, last: usize, first_starts: &str, last_is: &str) -> String {
    let lines: Vec<&str> = text.split_inclusive('\n').collect();
    assert!(
        lines[first - 1].starts_with(first_starts),
        "line {first} moved: {:?}",
        lines[first - 1]
    );
    assert_eq!(lines[last - 1], last_is, "line {last} moved");
    lines[first - 1..last].concat()
}

fn main() {
    println!("cargo:rerun-if-changed=src/main.rs");
    println!("cargo:rerun-if-changed=src/routes.rs");
    let out = env::var("OUT_DIR").expect("OUT_DIR");
    let out = Path::new(&out);
    let main_rs = fs::read_to_string("src/main.rs").expect("src/main.rs");
    let routes_rs = fs::read_to_string("src/routes.rs").expect("src/routes.rs");
    let items = [
        (
            "main_30_32.rs",
            range(&main_rs, 30, 32, "pub struct Shared {", "}\n"),
        ),
        (
            "routes_21_30.rs",
            range(&routes_rs, 21, 30, "fn hbp_escape(", "}\n"),
        ),
        (
            "routes_168_296.rs",
            range(
                &routes_rs,
                168,
                296,
                "/// Pure: parse an ndjson loop ledger",
                "}\n",
            ),
        ),
    ];
    for (name, text) in items {
        fs::write(out.join(name), text).expect("write extract");
    }
}
