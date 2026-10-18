#![forbid(unsafe_code)]
//! `vault-read <root>`: one `VAULTOBJ` row per object under `<root>`, then integer totals.
//! Read-only: files are opened for reading and nothing is written inside `<root>`. Rows are
//! written as each `.hbi` is read.

use std::io::Write;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 2 {
        eprintln!("usage: vault-read <root>");
        std::process::exit(2);
    }
    let stdout = std::io::stdout();
    let mut out = std::io::BufWriter::new(stdout.lock());
    let res = vault_reader::write_vault(std::path::Path::new(&args[1]), &mut out)
        .and_then(|()| out.flush());
    if let Err(e) = res {
        eprintln!("vault-read: {e}");
        std::process::exit(1);
    }
}
