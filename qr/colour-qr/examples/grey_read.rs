//! Measures README.md:53 "Do not convert to grey": each fixture PNG converted to one grey
//! plane (jsQR's weights 2126/7152/722 per 10,000, index.html:545, rounded half up) and read
//! once as a single plane with the default reader (qr-read-int), or with the labelled
//! secondary (rqrr) when the first argument is `--rqrr-secondary` in a build with that feature.
#![forbid(unsafe_code)]

use colour_qr::ungenerate::read_plane_with;
use colour_qr::{atob, decode_png, Reader};

#[cfg(feature = "rqrr-secondary")]
fn secondary() -> Reader {
    Reader::RqrrSecondary
}

#[cfg(not(feature = "rqrr-secondary"))]
fn secondary() -> Reader {
    panic!("--rqrr-secondary needs a build with `--features rqrr-secondary`")
}

fn main() {
    let mut args: Vec<String> = std::env::args().skip(1).collect();
    let reader = if args.first().map(String::as_str) == Some("--rqrr-secondary") {
        args.remove(0);
        secondary()
    } else {
        Reader::Integer
    };
    for path in args {
        let img = decode_png(&std::fs::read(&path).expect("read png")).expect("decode png");
        let grey: Vec<u8> = img
            .data
            .chunks_exact(4)
            .map(|p| {
                let y = 2126 * u32::from(p[0]) + 7152 * u32::from(p[1]) + 722 * u32::from(p[2]);
                u8::try_from((y + 5000) / 10_000).unwrap_or(255)
            })
            .collect();
        let read = match read_plane_with(reader, img.width, img.height, &grey) {
            None => "no_symbol".to_string(),
            Some(text) => match atob(&text) {
                Some(d) if d.len() >= 5 => {
                    format!("chunk_{}", u32::from_le_bytes([d[0], d[1], d[2], d[3]]))
                }
                _ => "symbol_not_a_chunk".to_string(),
            },
        };
        let name = path.rsplit('/').next().unwrap_or(&path);
        println!(
            "GREY_READ|png={name}|reader={}|read={read}|json=0",
            reader.label()
        );
    }
}
