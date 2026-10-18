//! `cargo run --example ingest -- <file>`: rows 41-46 of `ingest-google-to-cube.mjs` for one
//! source file, printed as HBP (the `INGESTHDR` row of line 40 and the footer over it are the
//! caller's; see `quant_cubes::ingest::assemble`).

fn main() {
    let path = std::env::args().nth(1).expect("usage: ingest <file>");
    let bytes = std::fs::read(&path).expect("read source file");
    for row in quant_cubes::ingest::ingest(&bytes).rows() {
        println!("{row}");
    }
}
