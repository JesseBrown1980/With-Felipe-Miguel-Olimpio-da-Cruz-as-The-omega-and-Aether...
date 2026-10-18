//! `pump kimi-k3 <seed> <out-dir>` and `pump stars-shells <seed> <out-dir>`.
//!
//! Each writes the four files its upstream script writes, into `<out-dir>`: the GGUF, its
//! `.sha256` sidecar, the receipt and the receipt's `.sha256` sidecar. Upstream writes the GGUF
//! and the receipt into two fixed `D:/` directories (`divide_kimi_k3.py:41-43,154-156,240`,
//! `stars_shells.py:48-49,202,244`); the bytes are the same. The receipt is also printed.

#![forbid(unsafe_code)]

use pump_kimi_stars::{kimi, stars, write};
use std::fs::{self, File};
use std::io::{self, BufWriter, Write};
use std::path::Path;
use std::process::ExitCode;

const USAGE: &str =
    "usage: pump kimi-k3 <seed> <out-dir>\n       pump stars-shells <seed> <out-dir>";

fn write_text(dir: &Path, name: &str, text: &str) -> io::Result<()> {
    fs::write(dir.join(name), text.as_bytes())
}

fn gguf_file(dir: &Path, name: &str) -> io::Result<BufWriter<File>> {
    Ok(BufWriter::with_capacity(
        1 << 20,
        File::create(dir.join(name))?,
    ))
}

fn finish(
    dir: &Path,
    gguf_name: &str,
    receipt_name: &str,
    sha: &str,
    receipt: &str,
) -> io::Result<()> {
    write_text(
        dir,
        &format!("{gguf_name}.sha256"),
        &write::sidecar(sha, gguf_name),
    )?;
    write_text(dir, receipt_name, receipt)?;
    let receipt_sha = pump_kimi_stars::sha256_hex(receipt.as_bytes());
    write_text(
        dir,
        &format!("{receipt_name}.sha256"),
        &write::sidecar(&receipt_sha, receipt_name),
    )?;
    io::stdout().write_all(receipt.as_bytes())
}

fn run(args: &[String]) -> Result<(), String> {
    let [cmd, seed, out] = args else {
        return Err(USAGE.into());
    };
    let body = fs::read(seed).map_err(|e| format!("{seed}: {e}"))?;
    let dir = Path::new(out);
    let io_err = |e: io::Error| format!("{out}: {e}");
    // Each command computes from the seed before it creates <out-dir> or any file in it, so an
    // error or a panic in the computation leaves no output file.
    match cmd.as_str() {
        "kimi-k3" => {
            let star = kimi::divide(&body)?;
            fs::create_dir_all(dir).map_err(io_err)?;
            let file = gguf_file(dir, kimi::GGUF_NAME).map_err(io_err)?;
            let (file, w) = kimi::emit(&star, file).map_err(io_err)?;
            file.into_inner().map_err(|e| io_err(e.into_error()))?;
            finish(
                dir,
                kimi::GGUF_NAME,
                kimi::RECEIPT_NAME,
                &w.gguf_sha256,
                &w.receipt,
            )
            .map_err(io_err)
        }
        "stars-shells" => {
            let r = stars::regenerate(&body);
            fs::create_dir_all(dir).map_err(io_err)?;
            let file = gguf_file(dir, stars::GGUF_NAME).map_err(io_err)?;
            let (file, w) = stars::emit(&r, file).map_err(io_err)?;
            file.into_inner().map_err(|e| io_err(e.into_error()))?;
            finish(
                dir,
                stars::GGUF_NAME,
                stars::RECEIPT_NAME,
                &w.gguf_sha256,
                &w.receipt,
            )
            .map_err(io_err)
        }
        _ => Err(USAGE.into()),
    }
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match run(&args) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("{e}");
            ExitCode::from(2)
        }
    }
}
