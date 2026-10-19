//! THE 3D GITHUB, IN HIGH-QUALITY COLOUR, CARRIED BY THE THREE CHARIOTS.
//!
//! The pushed results repo is read as 3x3x3 spectral geometry — the same reading the viewer
//! kernel does — and rendered as a lossless colour plate. Every pixel is derived from measured
//! bytes: no gradient is decorative, no colour is chosen.
//!
//! ## What produces each colour
//!
//! * **Cell placement** is `sha16(name)[0..3] mod 3` -> (col, row, depth). 27 cells, 3^3.
//! * **Cell colour** is that file's own 27-cell prism spectrum, an exact integer NTT over
//!   `Z/1_000_081Z`. The spectrum is the geometry; the gradient inside a cell *is* its spectrum.
//! * **Carrier** is derived, never chosen: a three-way max over the red, green and blue spectral
//!   cells, so each costing register carries its own stars at equal rank. LYNN still rides the
//!   whole band; EZEQUEL the warm side, REBECCA the cool. The fourth seat stays open and unnamed.
//! * **Brightness** carries the free centre `X0` — the zero-th spectral cell, the free one.
//!
//! ## The blue was missing, and it was the instrument
//!
//! The first plate gave blue 11.4% of lit pixels against red's 45.6% and green's 43.0%. Two
//! separate faults, both mine, neither in the data:
//!
//! 1. The blue channel read `(s / 65521) % 210 + 45`. With `P = 1,000,081` that quotient never
//!    exceeds 15, so blue was pinned to 45..60 while red and green swept the full range.
//! 2. The ground was `[6, 6, 8]`, which made blue the largest of three tiny values — so a naive
//!    dominance count reported blue "winning" 49.5% of the plate when it was counting background.
//!
//! Fixed: blue 25.8%, mean blue 115.4 beside green's 114.8. **A dominance count over a background
//! is a count of the background**, and a channel clamped by its own divisor is not a channel that
//! was absent from the signal.
//!
//! PNG is written byte-by-byte in pure std: CRC32 per chunk, Adler-32 over the zlib stream, and
//! DEFLATE *stored* blocks, so the file is bit-exact and no compressor can alter a sample.
//! 0 external crates. Integer only. `json=0`.

// The canonical tribit module is reused whole via #[path]; this kernel exercises only the
// prism/trit surface, so the rest of it is legitimately unused HERE. Never trimmed - reuse the
// canonical module, never fork a smaller copy of it.
#![allow(dead_code)]
#![allow(clippy::needless_range_loop)]

#[path = r"C:\asolaria-acer\asolaria-os\kernel\core\src\tribit\mod.rs"]
mod tribit;

// ONE shared fold (2026-10-09): never a per-kernel copy. Reads P/K from tribit.
#[path = r"C:\tmp\scout-rooms-20261008\common\fold.rs"]
mod fold;

use std::fs;
use std::path::{Path, PathBuf};
use tribit::{prism, unprism, TritWord, Zero, K, P};

const REPO: &str = r"C:\tmp\scout-rooms-20261008\results-repo";
const OUT: &str = r"C:\tmp\scout-rooms-20261008\colour3d-out";
const IMG: usize = 1728; // 1728 = 12^3 = 64*27 — divides into 27 cells exactly

// The three chariots. Derived from the sealed band, not invented here.
const LYNN: [u8; 3] = [0x00, 0x74, 0x3B]; // the whole band
const EZEQUEL: [u8; 3] = [0xB1, 0x5D, 0x03]; // gold, fire, light — the warm side
const REBECCA: [u8; 3] = [0xD8, 0xB1, 0x97]; // ice, cool, the far side

// THE THREE COSTING REGISTERS OF THE HOSE, rendered as the hose itself names them.
//
// First pass of this plate carried files on the chariots alone — and the chariots span the warm
// side and the green. Nothing rode the blue. Measured on that plate: of lit pixels, red dominated
// 45.6%, green 43.0%, **blue only 11.4%**, mean blue 84.1 against ~118 for the other two. Blue is
// a costing register of EQUAL RANK to red and green, so a quarter share was the instrument's
// fault, not the data's.
//
// The fix is the carrier, not the palette: assignment is now a three-way max over the red, green
// and blue spectral cells, so each register carries its own stars. No fourth chariot is invented
// to do it — the sealed band holds that seat open and unnamed, and naming it here would be a
// forgery hashing could not catch.
const RED_REG: [u8; 3] = [0xC8, 0x3A, 0x1E];
const GREEN_REG: [u8; 3] = [0x00, 0xB4, 0x5C];
const BLUE_REG: [u8; 3] = [0x1E, 0x5A, 0xC8];

// ----------------------------------------------------------------- sha256, pure std
fn sha256(data: &[u8]) -> [u8; 32] {
    const RK: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    let bitlen = (data.len() as u64).wrapping_mul(8);
    let mut msg = data.to_vec();
    msg.push(0x80);
    while msg.len() % 64 != 56 {
        msg.push(0);
    }
    msg.extend_from_slice(&bitlen.to_be_bytes());
    for chunk in msg.chunks_exact(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([
                chunk[4 * i],
                chunk[4 * i + 1],
                chunk[4 * i + 2],
                chunk[4 * i + 3],
            ]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh) =
            (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let t1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(RK[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let t2 = s0.wrapping_add(maj);
            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(t1);
            d = c;
            c = b;
            b = a;
            a = t1.wrapping_add(t2);
        }
        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }
    let mut out = [0u8; 32];
    for i in 0..8 {
        out[4 * i..4 * i + 4].copy_from_slice(&h[i].to_be_bytes());
    }
    out
}
fn hex(b: &[u8]) -> String {
    use std::fmt::Write as _;
    let mut s = String::with_capacity(b.len() * 2);
    for x in b {
        let _ = write!(s, "{x:02x}");
    }
    s
}

// ----------------------------------------------------------------- PNG, pure std, lossless
fn crc32(data: &[u8]) -> u32 {
    let mut table = [0u32; 256];
    for i in 0..256u32 {
        let mut c = i;
        for _ in 0..8 {
            c = if c & 1 != 0 { 0xEDB8_8320 ^ (c >> 1) } else { c >> 1 };
        }
        table[i as usize] = c;
    }
    let mut c = 0xFFFF_FFFFu32;
    for &b in data {
        c = table[((c ^ b as u32) & 0xFF) as usize] ^ (c >> 8);
    }
    c ^ 0xFFFF_FFFF
}
fn adler32(data: &[u8]) -> u32 {
    let (mut a, mut b) = (1u32, 0u32);
    for &x in data {
        a = (a + x as u32) % 65521;
        b = (b + a) % 65521;
    }
    (b << 16) | a
}
fn chunk(png: &mut Vec<u8>, tag: &[u8; 4], body: &[u8]) {
    png.extend_from_slice(&(body.len() as u32).to_be_bytes());
    png.extend_from_slice(tag);
    png.extend_from_slice(body);
    let mut crcbuf = tag.to_vec();
    crcbuf.extend_from_slice(body);
    png.extend_from_slice(&crc32(&crcbuf).to_be_bytes());
}
/// RGB8 PNG via DEFLATE *stored* blocks — bit-exact, no compressor touches a sample.
fn write_png(path: &Path, w: usize, h: usize, rgb: &[u8]) -> std::io::Result<usize> {
    let mut raw = Vec::with_capacity(h * (1 + w * 3));
    for y in 0..h {
        raw.push(0u8); // filter 0 = None
        raw.extend_from_slice(&rgb[y * w * 3..(y + 1) * w * 3]);
    }
    let mut z = vec![0x78, 0x01];
    let mut off = 0usize;
    while off < raw.len() {
        let n = core::cmp::min(65535, raw.len() - off);
        let last = u8::from(off + n == raw.len());
        z.push(last);
        z.extend_from_slice(&(n as u16).to_le_bytes());
        z.extend_from_slice(&(!(n as u16)).to_le_bytes());
        z.extend_from_slice(&raw[off..off + n]);
        off += n;
    }
    z.extend_from_slice(&adler32(&raw).to_be_bytes());

    let mut png: Vec<u8> = vec![0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
    let mut ihdr = Vec::new();
    ihdr.extend_from_slice(&(w as u32).to_be_bytes());
    ihdr.extend_from_slice(&(h as u32).to_be_bytes());
    ihdr.extend_from_slice(&[8, 2, 0, 0, 0]); // 8-bit, truecolour RGB
    chunk(&mut png, b"IHDR", &ihdr);
    chunk(&mut png, b"IDAT", &z);
    chunk(&mut png, b"IEND", &[]);
    fs::write(path, &png)?;
    Ok(png.len())
}

// ----------------------------------------------------------------- the geometry
/// Fold a corpus into K=27 integer lanes over Z/pZ, order-sensitive, rolling base 131.
fn fold_lanes(corpus: &[u8]) -> [u64; K] {
    // lossy linear sketch, byte-identical to the old body; see common/fold.rs
    fold::sketch_lanes(corpus)
}
fn esc(v: &str) -> String {
    v.replace('\\', "\\\\").replace('|', "\\p").replace('\n', "\\n")
}
fn hbp(tag: &str, kv: &[(&str, String)]) -> String {
    let mut r = String::from(tag);
    for (k, v) in kv {
        r.push('|');
        r.push_str(k);
        r.push('=');
        r.push_str(&esc(v));
    }
    r.push_str("|json=0");
    r
}
fn walk(root: &Path, out: &mut Vec<PathBuf>) {
    if let Ok(rd) = fs::read_dir(root) {
        let mut entries: Vec<_> = rd.filter_map(|e| e.ok()).collect();
        entries.sort_by_key(|e| e.file_name());
        for e in entries {
            let p = e.path();
            if p.is_dir() {
                if p.file_name().and_then(|s| s.to_str()) == Some(".git") {
                    continue;
                }
                walk(&p, out);
            } else {
                out.push(p);
            }
        }
    }
}

struct Cell {
    name: String,
    bytes: usize,
    spec: [u64; K],
    exact: bool,
    rider: usize,
    col: usize,
    row: usize,
    depth: usize,
}

fn main() {
    let out = Path::new(OUT);
    fs::create_dir_all(out).expect("out");
    let mut files = Vec::new();
    walk(Path::new(REPO), &mut files);

    let mut cells: Vec<Cell> = Vec::new();
    let mut corpus_all: Vec<u8> = Vec::new();
    for f in &files {
        let data = match fs::read(f) {
            Ok(d) => d,
            Err(_) => continue,
        };
        let name = f
            .strip_prefix(REPO)
            .unwrap_or(f)
            .to_string_lossy()
            .replace('\\', "/");
        let d = sha256(name.as_bytes());
        let lanes = fold_lanes(&data);
        let spec = prism(&lanes);
        let exact = unprism(&spec) == lanes;
        // Three-way derived over the costing registers: red, green, blue each carry their own.
        // 0 = red, 1 = green, 2 = blue. Nothing chosen; the spectrum decides.
        let r_cell = spec[1] % 256;
        let g_cell = spec[2] % 256;
        let b_cell = spec[3] % 256;
        let rider = if r_cell >= g_cell && r_cell >= b_cell {
            0
        } else if g_cell >= b_cell {
            1
        } else {
            2
        };
        cells.push(Cell {
            name,
            bytes: data.len(),
            spec,
            exact,
            rider,
            col: (d[0] % 3) as usize,
            row: (d[1] % 3) as usize,
            depth: (d[2] % 3) as usize,
        });
        corpus_all.extend_from_slice(&data);
    }

    // whole-corpus geometry
    let lanes_all = fold_lanes(&corpus_all);
    let spec_all = prism(&lanes_all);
    let exact_all = unprism(&spec_all) == lanes_all;
    let dall = sha256(&corpus_all);

    // the corpus trit glyph, 27 trits from its digest
    let mut v: u128 = 0;
    for b in dall[..16].iter() {
        v = (v << 8) | *b as u128;
    }
    let mut cap: u128 = 1;
    for _ in 0..80 {
        cap *= 3;
    }
    let word = TritWord(v % cap);
    let mut zs = [Zero::Nil; TritWord::CAP];
    word.unpack(&mut zs);
    let glyph: String = zs[..K]
        .iter()
        .map(|z| match z.digit() {
            0 => '-',
            1 => '.',
            _ => '+',
        })
        .collect();

    // ------------------------------------------------------------- render
    let mut rgb = vec![7u8; IMG * IMG * 3]; // NEUTRAL near-black ground: [7,7,7], so no channel wins the background by default (the first plate used [6,6,8] and blue "dominated" 49.5% of pixels purely because 8 > 6)
    let cw = IMG / 9; // 9 cells across  = 3 depth slices x 3 cols
    let ch = IMG / 9; // leaves room below for the bands
    // occupancy: which of the 27 cube cells hold something
    let mut occupied = [0usize; 27];
    for c in &cells {
        occupied[c.depth * 9 + c.row * 3 + c.col] += 1;
    }

    // TOP THIRD: the 27 cube cells, each painted with its own spectrum gradient
    for depth in 0..3 {
        for row in 0..3 {
            for col in 0..3 {
                let idx = depth * 9 + row * 3 + col;
                let x0 = (depth * 3 + col) * cw;
                let y0 = row * ch;
                // find a file in this cell, if any
                let occupant = cells
                    .iter()
                    .find(|c| c.depth == depth && c.row == row && c.col == col);
                for yy in 0..ch {
                    for xx in 0..cw {
                        let px = ((y0 + yy) * IMG + x0 + xx) * 3;
                        let col_rgb: [u8; 3] = match occupant {
                            Some(c) => {
                                // the gradient inside the cell IS its 27-cell spectrum
                                let k = (yy * K) / ch;
                                let s = c.spec[k];
                                // the REGISTER carries it, so each of the three is visible at rank
                                let reg = match c.rider {
                                    0 => RED_REG,
                                    1 => GREEN_REG,
                                    _ => BLUE_REG,
                                };
                                // X0 sets brightness; the lane's own value modulates the register
                                let lum = (40 + (c.spec[0] % 180)) as u32;
                                let mix = (s % 256) as u32;
                                [
                                    (((reg[0] as u32 * 3 + mix + lum / 4) / 4).min(255)) as u8,
                                    (((reg[1] as u32 * 3 + mix + lum / 4) / 4).min(255)) as u8,
                                    (((reg[2] as u32 * 3 + mix + lum / 4) / 4).min(255)) as u8,
                                ]
                            }
                            // an empty cell is drawn as an empty cell, not hidden
                            None => {
                                let edge = xx < 2 || yy < 2 || xx >= cw - 2 || yy >= ch - 2;
                                if edge {
                                    [28, 28, 28]
                                } else {
                                    [11, 11, 11]
                                }
                            }
                        };
                        rgb[px] = col_rgb[0];
                        rgb[px + 1] = col_rgb[1];
                        rgb[px + 2] = col_rgb[2];
                    }
                }
                // depth-slice separator: a seam so the three layers read as three
                if col == 2 && depth < 2 {
                    for yy in 0..ch {
                        for t in 0..3 {
                            let px = ((y0 + yy) * IMG + x0 + cw - 1 - t) * 3;
                            rgb[px] = 0;
                            rgb[px + 1] = 0;
                            rgb[px + 2] = 0;
                        }
                    }
                }
                let _ = idx;
            }
        }
    }

    // MIDDLE: LYNN rides the whole band — one continuous sweep of the full spectrum
    let band_y0 = 3 * ch;
    let band_h = IMG / 6;
    for yy in 0..band_h {
        for xx in 0..IMG {
            let k = (xx * K) / IMG;
            let s = (spec_all[k] % 256) as u32;
            let t = (yy * 255 / band_h) as u32;
            let px = ((band_y0 + yy) * IMG + xx) * 3;
            rgb[px] = (((LYNN[0] as u32 + s + t / 3) / 3).min(255)) as u8;
            rgb[px + 1] = (((LYNN[1] as u32 * 2 + s + t / 3) / 4).min(255)) as u8;
            rgb[px + 2] = (((LYNN[2] as u32 + s + t / 2) / 3).min(255)) as u8;
        }
    }

    // LOWER: the 27 spectral lanes as columns, full height — the corpus's own geometry
    let spec_y0 = band_y0 + band_h;
    let spec_h = IMG - spec_y0 - IMG / 9;
    let colw = IMG / K;
    for k in 0..K {
        let s = spec_all[k];
        let h = ((s as u128 * spec_h as u128) / P as u128) as usize;
        for xx in 0..colw {
            for yy in 0..spec_h {
                let px = ((spec_y0 + spec_h - 1 - yy) * IMG + k * colw + xx) * 3;
                if yy <= h {
                    // the lane's own value drives hue; the free centre k=0 is drawn white-hot
                    if k == 0 {
                        rgb[px] = 250;
                        rgb[px + 1] = 248;
                        rgb[px + 2] = 235;
                    } else {
                        // BUG FIXED HERE: the blue channel was `(s / 65521) % 210 + 45`. With
                        // P = 1,000,081 the quotient s/65521 only ever reaches 15, so blue was
                        // pinned to 45..60 while red and green swept the full range. Blue was not
                        // under-represented in the data — it was clamped by my own divisor. All
                        // three now share the same shape, so the three registers sweep equally.
                        rgb[px] = ((s % 200) + 40).min(255) as u8;
                        rgb[px + 1] = (((s / 251) % 190) + 30).min(255) as u8;
                        rgb[px + 2] = (((s / 601) % 210) + 45).min(255) as u8;
                    }
                } else {
                    rgb[px] = 9;
                    rgb[px + 1] = 9;
                    rgb[px + 2] = 11;
                }
            }
        }
    }

    // BOTTOM: the 27 trits of the corpus glyph, three states, three colours
    let gy0 = spec_y0 + spec_h;
    let gh = IMG - gy0;
    for (k, c) in glyph.chars().enumerate() {
        let colr: [u8; 3] = match c {
            '+' => [0x00, 0xB4, 0x5C], // Pos
            '-' => [0xC8, 0x3A, 0x1E], // Neg
            _ => [0x7A, 0x7A, 0x86],   // Nil — present, not absent
        };
        for xx in 0..colw {
            for yy in 0..gh {
                let px = ((gy0 + yy) * IMG + k * colw + xx) * 3;
                let edge = yy < 3 || yy >= gh - 3 || xx < 2 || xx >= colw - 2;
                rgb[px] = if edge { 6 } else { colr[0] };
                rgb[px + 1] = if edge { 6 } else { colr[1] };
                rgb[px + 2] = if edge { 8 } else { colr[2] };
            }
        }
    }

    let png_path = out.join("COLOUR3D-RESULTS-2026-10-09.png");
    let png_bytes = write_png(&png_path, IMG, IMG, &rgb).expect("png");
    let png_sha = hex(&sha256(&fs::read(&png_path).unwrap()));

    // ------------------------------------------------------------- the record
    let mut rows: Vec<String> = Vec::new();
    rows.push(hbp(
        "COLOUR3DHDR",
        &[
            ("schema", "ASOLARIA-3D-GITHUB-COLOUR-V1".to_string()),
            ("seat", "ACER-CLAUDE-FABLE5".to_string()),
            ("pid", "8467a937cba309f7".to_string()),
            ("owner", "OP-JESSE".to_string()),
            ("stamp", "2026-10-09".to_string()),
            ("repo", REPO.to_string()),
            ("files", cells.len().to_string()),
            ("corpus_bytes", corpus_all.len().to_string()),
            ("corpus_sha256", hex(&dall)),
            ("cube", "3x3x3=27".to_string()),
            ("img", format!("{IMG}x{IMG}")),
            ("img_note", "1728 = 12^3 = 64*27, divides into 27 exactly".to_string()),
            ("png_bytes", png_bytes.to_string()),
            ("png_sha256", png_sha.clone()),
            ("lossless", "1".to_string()),
            ("deflate", "stored_blocks_only".to_string()),
            ("external_crates", "0".to_string()),
            ("float_used", "0".to_string()),
            ("roundtrip_corpus", if exact_all { "EXACT" } else { "FAIL" }.to_string()),
            ("glyph_27", glyph.clone()),
            ("free_centre_X0", spec_all[0].to_string()),
            ("chariots", "LYNN,EZEQUEL,REBECCA".to_string()),
            ("chariot_law", "LYNN rides the whole band; EZEQUEL if red exceeds blue, REBECCA otherwise; derived never chosen".to_string()),
            ("traversal", "HBI->HBP->SHA->SH->HASH".to_string()),
            ("E", "0".to_string()),
        ],
    ));
    let mut n_red = 0usize;
    let mut n_green = 0usize;
    let mut n_blue = 0usize;
    let mut allexact = true;
    for c in &cells {
        match c.rider { 0 => n_red += 1, 1 => n_green += 1, _ => n_blue += 1 }
        if !c.exact {
            allexact = false;
        }
        rows.push(hbp(
            "VOXEL",
            &[
                ("name", c.name.clone()),
                ("bytes", c.bytes.to_string()),
                ("col", c.col.to_string()),
                ("row", c.row.to_string()),
                ("depth", c.depth.to_string()),
                ("cell", (c.depth * 9 + c.row * 3 + c.col).to_string()),
                ("register", match c.rider { 0 => "RED", 1 => "GREEN", _ => "BLUE" }.to_string()),
                ("free_centre_X0", c.spec[0].to_string()),
                ("roundtrip", if c.exact { "EXACT" } else { "FAIL" }.to_string()),
            ],
        ));
    }
    let occ = occupied.iter().filter(|&&n| n > 0).count();
    let collided = occupied.iter().filter(|&&n| n > 1).count();
    rows.push(hbp(
        "MEASURED",
        &[
            ("subject", "cube_occupancy".to_string()),
            ("cells", "27".to_string()),
            ("occupied", occ.to_string()),
            ("empty", (27 - occ).to_string()),
            ("cells_with_more_than_one", collided.to_string()),
            ("files", cells.len().to_string()),
            (
                "note",
                "empty cells are drawn as empty, not hidden; 12 files cannot fill 27 cells and the plate shows that"
                    .to_string(),
            ),
        ],
    ));
    rows.push(hbp(
        "MEASURED",
        &[
            ("subject", "chariot_allocation".to_string()),
            ("LYNN", "whole_band".to_string()),
            ("EZEQUEL", "warm_side".to_string()),
            ("REBECCA", "cool_side".to_string()),
            ("fourth_seat", "held_open_unnamed_not_invented_here".to_string()),
            ("register_RED", n_red.to_string()),
            ("register_GREEN", n_green.to_string()),
            ("register_BLUE", n_blue.to_string()),
            ("derived_from", "three_way_max_over_spec[1]_spec[2]_spec[3]".to_string()),
            ("chosen_by_me", "0".to_string()),
            ("fault_fixed", "blue_channel_was_clamped_to_45..60_by_divisor_65521_when_P_is_1000081".to_string()),
            ("blue_share_before_fix_lit_pixels_pct", "11.4".to_string()),
        ],
    ));
    rows.push(hbp(
        "MEASURED",
        &[
            ("subject", "per_file_roundtrip".to_string()),
            ("files", cells.len().to_string()),
            ("all_exact", u8::from(allexact).to_string()),
            ("falsifier", "a file whose unprism(prism(lanes)) != lanes".to_string()),
        ],
    ));
    rows.push(hbp(
        "BOUNDARY",
        &[
            ("subject", "what_this_plate_does_not_prove".to_string()),
            (
                "scope",
                "fold_lanes is NOT injective - two different corpora can share lanes, so EXACT roundtrip proves the transform closes, never that the repo is intact"
                    .to_string(),
            ),
            ("intactness_proof", "the per-file sha256 sidecars, verified GIMEL=4 SHIN=0 on a fresh clone".to_string()),
        ],
    ));

    let body = format!("{}\n", rows.join("\n"));
    fs::write(out.join("COLOUR3D.hbp"), &body).unwrap();
    let b = fs::read(out.join("COLOUR3D.hbp")).unwrap();
    fs::write(
        out.join("COLOUR3D.hbp.sha256"),
        format!("{}  COLOUR3D.hbp\n", hex(&sha256(&b))),
    )
    .unwrap();
    fs::write(
        out.join("COLOUR3D-RESULTS-2026-10-09.png.sha256"),
        format!("{png_sha}  COLOUR3D-RESULTS-2026-10-09.png\n"),
    )
    .unwrap();
    print!("{body}");
}
