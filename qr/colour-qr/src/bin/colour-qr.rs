//! colour-qr generate <payload> <out-dir>      write <stem>-code-NN.png, one per three chunks
//! colour-qr ungenerate <out-file> <png>...    read the planes, reassemble, write the bytes
//! colour-qr ungenerate --rqrr-secondary <out-file> <png>...
//!     the same with the labelled secondary QR read (third-party rqrr, floating-point geometry); only in a
//!     build with the `rqrr-secondary` feature
//! All print HBP rows on stdout.
#![forbid(unsafe_code)]

use colour_qr::{generate_png, sha256_hex, ungenerate_with, PlaneRead, Reader, PLANE_NAMES};
use std::path::Path;
use std::process::ExitCode;

const USAGE: &str = "usage: colour-qr generate <payload> <out-dir> | \
ungenerate [--rqrr-secondary] <out-file> <png>...";

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let result = match args.first().map(String::as_str) {
        Some("generate") if args.len() == 3 => run_generate(&args[1], &args[2]),
        Some("ungenerate") if args.get(1).map(String::as_str) == Some("--rqrr-secondary") => {
            match secondary_reader() {
                Ok(reader) if args.len() >= 4 => run_ungenerate(reader, &args[2], &args[3..]),
                Ok(_) => Err(USAGE.into()),
                Err(e) => Err(e),
            }
        }
        Some("ungenerate") if args.len() >= 3 => {
            run_ungenerate(Reader::Integer, &args[1], &args[2..])
        }
        _ => Err(USAGE.into()),
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("colour-qr: {e}");
            ExitCode::FAILURE
        }
    }
}

fn run_generate(payload_path: &str, out_dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    let payload = std::fs::read(payload_path)?;
    let stem = Path::new(payload_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("payload");
    let codes = generate_png(&payload)?;
    let chunks = payload.len().div_ceil(colour_qr::CHUNK_BYTES);
    println!(
        "COLOURQR_IN|file={stem}|bytes={}|chunks={chunks}|codes={}|sha256={}|json=0",
        payload.len(),
        codes.len(),
        sha256_hex(&payload)
    );
    std::fs::create_dir_all(out_dir)?;
    for (code, png) in &codes {
        let name = format!("{stem}-code-{:02}.png", code.number);
        std::fs::write(Path::new(out_dir).join(&name), png)?;
        let planes: Vec<String> = code
            .planes
            .iter()
            .zip(PLANE_NAMES)
            .map(|(p, n)| match p {
                Some(i) => format!("{n}=chunk_{i}"),
                None => format!("{n}=filler"),
            })
            .collect();
        println!(
            "COLOURQR_CODE|code={:02}|file={name}|{}|px={}x{}|png_bytes={}|png_sha256={}|json=0",
            code.number,
            planes.join("|"),
            code.image.width,
            code.image.height,
            png.len(),
            sha256_hex(png)
        );
    }
    Ok(())
}

#[cfg(feature = "rqrr-secondary")]
fn secondary_reader() -> Result<Reader, Box<dyn std::error::Error>> {
    Ok(Reader::RqrrSecondary)
}

#[cfg(not(feature = "rqrr-secondary"))]
fn secondary_reader() -> Result<Reader, Box<dyn std::error::Error>> {
    Err("--rqrr-secondary needs a build with `--features rqrr-secondary`".into())
}

fn run_ungenerate(
    reader: Reader,
    out_file: &str,
    pngs: &[String],
) -> Result<(), Box<dyn std::error::Error>> {
    let files = pngs
        .iter()
        .map(std::fs::read)
        .collect::<Result<Vec<_>, _>>()?;
    let views: Vec<&[u8]> = files.iter().map(Vec::as_slice).collect();
    println!("COLOURQR_READER|reader={}|json=0", reader.label());
    let (reads, chunks) = ungenerate_with(reader, &views)?;
    for (path, planes) in pngs.iter().zip(&reads) {
        for (read, name) in planes.iter().zip(PLANE_NAMES) {
            let detail = match read {
                PlaneRead::Chunk { index, body_bytes } => {
                    format!("read=chunk|index={index}|body_bytes={body_bytes}")
                }
                other => format!("read={}", other.label().replace(' ', "_")),
            };
            println!("COLOURQR_PLANE|file={path}|plane={name}|{detail}|json=0");
        }
    }
    let out = chunks.reassemble();
    std::fs::write(out_file, &out.bytes)?;
    println!(
        "COLOURQR_OUT|bytes={}|chunks={}|contiguous_from_0={}/{}|sha256={}|json=0",
        out.bytes.len(),
        out.chunks,
        chunks.contiguous_from_zero(),
        chunks.span(),
        out.sha256
    );
    Ok(())
}
