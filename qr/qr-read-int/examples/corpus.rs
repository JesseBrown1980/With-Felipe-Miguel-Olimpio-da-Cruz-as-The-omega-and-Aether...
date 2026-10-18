//! Writes the page-parity corpus (`tests/corpus`) as binary PGM files plus `CORPUS.hbp` into a
//! directory, for `tools/jsqr_page.py` to hand to the owner's page.
//!
//! Usage: corpus <out-dir>
#![forbid(unsafe_code)]

#[path = "../tests/corpus/mod.rs"]
mod corpus;

use std::io::Write;
use std::path::Path;

fn main() -> std::io::Result<()> {
    let dir = std::env::args()
        .nth(1)
        .ok_or_else(|| std::io::Error::other("usage: corpus <out-dir>"))?;
    let dir = Path::new(&dir);
    std::fs::create_dir_all(dir)?;
    let mut list = std::fs::File::create(dir.join("CORPUS.hbp"))?;
    let planes = corpus::corpus();
    for p in &planes {
        let file = format!("{}.pgm", p.name);
        let mut pgm = format!("P5\n{} {}\n255\n", p.width, p.height).into_bytes();
        pgm.extend_from_slice(&p.grey);
        std::fs::write(dir.join(&file), pgm)?;
        writeln!(
            list,
            "PLANE|name={}|w={}|h={}|grey_sha256={}|file={file}|json=0",
            p.name,
            p.width,
            p.height,
            corpus::sha256::hex(&p.grey)
        )?;
    }
    println!(
        "CORPUS|planes={}|dir={}|json=0",
        planes.len(),
        dir.display()
    );
    Ok(())
}
