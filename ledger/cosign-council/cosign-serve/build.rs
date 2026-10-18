//! Writes line ranges of the byte-identical upstream `src/main.rs` and `src/http.rs`
//! (asolaria-federation-1024 @ dc1da1a9, servers/cosign-serve) to OUT_DIR for `include!`.
//! Item ranges are written as they are. Statement ranges are wrapped in `{ ... }` with one tail
//! expression, so they can stand as a function body; the wrapper is the only added text.
//! `EXTRACTS.sha256` pins the sha256 of each range's own lines.

use std::env;
use std::fs;
use std::path::Path;

fn range(text: &str, first: usize, last: usize, first_starts: &str, last_is: &str) -> String {
    let lines: Vec<&str> = text.split_inclusive('\n').collect();
    let out = lines[first - 1..last].concat();
    assert!(
        lines[first - 1].starts_with(first_starts),
        "line {first} moved: {:?}",
        lines[first - 1]
    );
    assert_eq!(lines[last - 1], last_is, "line {last} moved");
    out
}

fn main() {
    println!("cargo:rerun-if-changed=src/main.rs");
    println!("cargo:rerun-if-changed=src/http.rs");
    let out = env::var("OUT_DIR").expect("OUT_DIR");
    let out = Path::new(&out);
    let main_rs = fs::read_to_string("src/main.rs").expect("src/main.rs");
    let http_rs = fs::read_to_string("src/http.rs").expect("src/http.rs");

    let items = [
        (
            "main_16_18.rs",
            range(
                &main_rs,
                16,
                18,
                "const DEFAULT_BIND",
                "const DEFAULT_SHADOW_PATH: &str = \"COSIGN_CHAIN.shadow.ndjson\";\n",
            ),
        ),
        (
            "main_21_25.rs",
            range(&main_rs, 21, 25, "struct Shared {", "}\n"),
        ),
        (
            "main_81_112.rs",
            range(&main_rs, 81, 112, "fn now_iso()", "}\n"),
        ),
        (
            "main_123_146.rs",
            range(&main_rs, 123, 146, "fn json_escape(", "}\n"),
        ),
        (
            "http_8_13.rs",
            range(&http_rs, 8, 13, "pub struct Request {", "}\n"),
        ),
    ];
    for (name, text) in items {
        fs::write(out.join(name), text).expect("write extract");
    }

    let env_reads = range(
        &main_rs,
        28,
        37,
        "    let bind = env::var(",
        "        .unwrap_or(false);\n",
    );
    fs::write(
        out.join("main_28_37.rs"),
        format!("{{\n{env_reads}    (bind, live_path, shadow_path, append_enabled)\n}}\n"),
    )
    .expect("write extract");

    let open = range(
        &main_rs,
        39,
        54,
        "    store::ensure_clean_tail(&shadow_path)?;",
        "    });\n",
    );
    fs::write(
        out.join("main_39_54.rs"),
        format!("{{\n{open}    Ok(Self {{ shared }})\n}}\n"),
    )
    .expect("write extract");
}
