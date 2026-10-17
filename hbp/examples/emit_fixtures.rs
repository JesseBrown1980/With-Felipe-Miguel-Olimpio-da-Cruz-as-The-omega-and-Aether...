//! Emit the shared parity fixtures (identical literals to the Python referee and the cold-lane
//! upstream-JS measurement). Usage: `emit_fixtures <out_dir>` writes `<out_dir>/trinity/`,
//! `<out_dir>/variants/` and `<out_dir>/relay.txt`, and prints one `<name> <sha256>` line per packet.

#[path = "../tests/common/mod.rs"]
mod common;

fn main() {
    let out = std::env::args()
        .nth(1)
        .expect("usage: emit_fixtures <out_dir>");
    let trinity = format!("{out}/trinity");
    for (name, sha) in common::emit_trinity(&trinity) {
        println!("{name} {sha}");
    }
    let variants = common::build_variants(&trinity, &format!("{out}/variants"));
    println!("variants {}", variants.len());
    let rows = common::relay_fixture_rows().join("\n") + "\n";
    std::fs::write(format!("{out}/relay.txt"), rows.as_bytes()).unwrap();
}
