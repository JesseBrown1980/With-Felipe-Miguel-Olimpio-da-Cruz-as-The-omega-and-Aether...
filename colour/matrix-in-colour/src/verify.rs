//! `verify-frames.py` (the vendored script, 83 lines) in integers. The script uses no floating
//! point: its one division is `//` (line 54), so every printed value is an integer, a hex string
//! or a boolean, and the port prints the same bytes.

use crate::{decode_png, sha256_hex, Error, RgbImage, CELL, GRID, MARGIN};
use core::fmt::Write as _;
use std::path::Path;

/// verify-frames.py:24-33 `cell_grid`: pixel `(MARGIN + rx*CELL + CELL//2 - 1, MARGIN +
/// ry*CELL + CELL//2 - 1)` of each room, rows `ry` outer, columns `rx` inner.
pub fn cell_grid(img: &RgbImage) -> Result<Vec<[u8; 3]>, Error> {
    let mut out = Vec::with_capacity(GRID * GRID);
    for ry in 0..GRID {
        for rx in 0..GRID {
            let x = MARGIN + rx * CELL + CELL / 2 - 1;
            let y = MARGIN + ry * CELL + CELL / 2 - 1;
            let px = img.pixel(x, y).ok_or_else(|| {
                Error::Format(format!(
                    "pixel ({x}, {y}) is outside {}x{}",
                    img.width, img.height
                ))
            })?;
            out.push(px);
        }
    }
    Ok(out)
}

/// One printed row of verify-frames.py:59.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FrameRow {
    pub file: String,
    pub width: usize,
    pub height: usize,
    /// Line 54 `tot // (len(g) * 3)`.
    pub mean: u64,
    /// Line 55: cells whose `r + g + b > 30`.
    pub nonzero: usize,
    /// Line 56: distinct `(r, g, b)` among the cells.
    pub distinct: usize,
    /// Line 57: sha256 of the cells' bytes in grid order.
    pub grid_sha256: String,
}

fn channel_sum(c: &[u8; 3]) -> u64 {
    c.iter().map(|&v| u64::from(v)).sum()
}

/// verify-frames.py:51-57 for one decoded frame.
pub fn frame_row(file: &str, img: &RgbImage) -> Result<FrameRow, Error> {
    let g = cell_grid(img)?;
    let tot: u64 = g.iter().map(channel_sum).sum();
    let cells = u64::try_from(g.len()).map_err(|e| Error::Format(e.to_string()))?;
    let mean = tot / (cells * 3);
    let nonzero = g.iter().filter(|c| channel_sum(c) > 30).count();
    let mut set = g.clone();
    set.sort_unstable();
    set.dedup();
    let bytes: Vec<u8> = g.iter().flatten().copied().collect();
    Ok(FrameRow {
        file: file.to_string(),
        width: img.width,
        height: img.height,
        mean,
        nonzero,
        distinct: set.len(),
        grid_sha256: sha256_hex(&bytes),
    })
}

/// verify-frames.py:37-39: the names in `<repo>/frames` that end in `.png`, sorted by code point.
pub fn frame_names(repo: &Path) -> Result<Vec<String>, Error> {
    let mut names = Vec::new();
    for entry in std::fs::read_dir(repo.join("frames"))? {
        let name = entry?.file_name();
        if !name.as_encoded_bytes().ends_with(b".png") {
            continue;
        }
        let name = name
            .into_string()
            .map_err(|n| Error::Format(format!("file name is not UTF-8: {n:?}")))?;
        names.push(name);
    }
    names.sort_unstable();
    Ok(names)
}

/// verify-frames.py:36-61 over `<repo>/frames`.
pub fn verify_frames(repo: &Path) -> Result<Report, Error> {
    let mut rows = Vec::new();
    for name in frame_names(repo)? {
        let bytes = std::fs::read(repo.join("frames").join(&name))?;
        rows.push(frame_row(&name, &decode_png(&bytes)?)?);
    }
    Ok(Report { rows })
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Report {
    pub rows: Vec<FrameRow>,
}

fn py_bool(b: bool) -> &'static str {
    if b {
        "True"
    } else {
        "False"
    }
}

impl Report {
    /// Line 64: every grid digest differs from every other.
    pub fn all_distinct(&self) -> bool {
        let mut shas: Vec<&str> = self.rows.iter().map(|r| r.grid_sha256.as_str()).collect();
        shas.sort_unstable();
        shas.dedup();
        shas.len() == self.rows.len()
    }

    pub fn means(&self) -> Vec<u64> {
        self.rows.iter().map(|r| r.mean).collect()
    }

    /// Line 66.
    pub fn monotonic(&self) -> bool {
        self.rows.windows(2).all(|w| w[0].mean <= w[1].mean)
    }

    /// What verify-frames.py:40-78 prints, byte for byte, and `main()`'s return value.
    pub fn render(&self) -> (String, u8) {
        let Some(last) = self.rows.last() else {
            return ("no frames\n".to_string(), 1);
        };
        let mut out = String::new();
        let _ = writeln!(
            out,
            "{:<22} {:>11} {:>10} {:>8} {:>9} {:>18}",
            "frame", "px", "mean_rgb", "nonzero", "distinct", "grid_sha16"
        );
        let mut prev: Option<&str> = None;
        for r in &self.rows {
            let changed = match prev {
                None => "",
                Some(p) if p != r.grid_sha256 => "CHANGED",
                Some(_) => "IDENTICAL<-BLIND",
            };
            let _ = writeln!(
                out,
                "{:<22} {}x{:<6} {:>10} {:>8} {:>9} {:>18} {}",
                r.file,
                r.width,
                r.height,
                r.mean,
                r.nonzero,
                r.distinct,
                &r.grid_sha256[..16],
                changed
            );
            prev = Some(&r.grid_sha256);
        }
        let all_distinct = self.all_distinct();
        let means: Vec<String> = self.means().iter().map(u64::to_string).collect();
        out.push('\n');
        let _ = writeln!(out, "frames                      : {}", self.rows.len());
        let _ = writeln!(
            out,
            "every frame grid distinct   : {}  <- {}",
            py_bool(all_distinct),
            if all_distinct {
                "the photographs are NOT blind"
            } else {
                "some frames identical"
            }
        );
        let _ = writeln!(out, "mean cell brightness trend  : [{}]", means.join(", "));
        let _ = writeln!(
            out,
            "monotonic non-decreasing    : {}",
            py_bool(self.monotonic())
        );
        let _ = writeln!(
            out,
            "rooms lit (of 10000)        : {} at final frame",
            last.nonzero
        );
        let _ = writeln!(
            out,
            "distinct cell colours       : {} at final frame",
            last.distinct
        );
        out.push('\n');
        out.push_str(
            "CORRECTED FOLD (for future runs): fold room->colour->DEPTH, not room->colour.\n\
             The depth witness that DID work all along is each frame's own photo_sha256,\n\
             which changed every minute and is already in INDEX.hbp.\n",
        );
        (out, 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn flat(width: usize, height: usize, rgb: [u8; 3]) -> RgbImage {
        RgbImage {
            width,
            height,
            data: rgb.repeat(width * height),
        }
    }

    #[test]
    fn no_frames_prints_and_returns_one() {
        assert_eq!(
            Report { rows: vec![] }.render(),
            ("no frames\n".to_string(), 1)
        );
    }

    #[test]
    fn a_frame_too_small_for_the_lattice_is_an_error() {
        // The last sample is at 12 + 99*10 + 4 = 1006, so 1006 wide is one short.
        assert!(cell_grid(&flat(1006, 1024, [1, 2, 3])).is_err());
        assert_eq!(
            cell_grid(&flat(1007, 1007, [1, 2, 3])).unwrap().len(),
            10_000
        );
    }

    #[test]
    fn floor_mean_and_threshold() {
        let row = frame_row("x.png", &flat(1024, 1024, [10, 10, 11])).unwrap();
        assert_eq!((row.mean, row.nonzero, row.distinct), (10, 10_000, 1));
        let row = frame_row("x.png", &flat(1024, 1024, [10, 10, 10])).unwrap();
        assert_eq!((row.mean, row.nonzero), (10, 0));
    }
}
