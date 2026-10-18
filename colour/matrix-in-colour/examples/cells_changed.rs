//! Rooms whose sampled cell changed between consecutive frames, one row per pair.
//! `cargo run --example cells_changed [REPO]`

use matrix_in_colour::{cell_grid, decode_png, frame_names, VENDOR};
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let repo = std::env::args_os().nth(1).map_or_else(
        || PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(VENDOR),
        PathBuf::from,
    );
    let mut prev: Option<(String, Vec<[u8; 3]>)> = None;
    for name in frame_names(&repo)? {
        let grid = cell_grid(&decode_png(&std::fs::read(
            repo.join("frames").join(&name),
        )?)?)?;
        if let Some((from, before)) = &prev {
            let cells = before.iter().zip(&grid).filter(|(a, b)| a != b).count();
            println!("CELLS_CHANGED|from={from}|to={name}|cells={cells}|of=10000|json=0");
        }
        prev = Some((name, grid));
    }
    Ok(())
}
