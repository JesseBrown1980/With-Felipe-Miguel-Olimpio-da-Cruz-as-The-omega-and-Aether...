//! Measures README.md:53 "Do not convert to grey": each fixture PNG converted to one grey
//! plane (jsQR's weights 2126/7152/722 per 10,000, index.html:545, rounded half up) and read
//! once as a single plane.
#![forbid(unsafe_code)]

use colour_qr::ungenerate::read_plane;
use colour_qr::{atob, decode_png};

fn main() {
    for path in std::env::args().skip(1) {
        let img = decode_png(&std::fs::read(&path).expect("read png")).expect("decode png");
        let grey: Vec<u8> = img
            .data
            .chunks_exact(4)
            .map(|p| {
                let y = 2126 * u32::from(p[0]) + 7152 * u32::from(p[1]) + 722 * u32::from(p[2]);
                u8::try_from((y + 5000) / 10_000).unwrap_or(255)
            })
            .collect();
        let read = match read_plane(img.width, img.height, &grey) {
            None => "no_symbol".to_string(),
            Some(text) => match atob(&text) {
                Some(d) if d.len() >= 5 => {
                    format!("chunk_{}", u32::from_le_bytes([d[0], d[1], d[2], d[3]]))
                }
                _ => "symbol_not_a_chunk".to_string(),
            },
        };
        let name = path.rsplit('/').next().unwrap_or(&path);
        println!("GREY_READ|png={name}|read={read}|json=0");
    }
}
