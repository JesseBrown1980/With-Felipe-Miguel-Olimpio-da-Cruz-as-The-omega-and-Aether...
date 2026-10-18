//! Print the shadowcat SHA-256 of each file named on the command line, read in 64 KiB pieces.
#[path = "../src/sha256.rs"]
#[allow(dead_code)]
mod sha256;

use std::io::Read;

fn main() {
    let mut buf = vec![0u8; 65536];
    for path in std::env::args().skip(1) {
        let mut f = std::fs::File::open(&path).expect("open");
        let mut h = sha256::Sha256::new();
        loop {
            let n = f.read(&mut buf).expect("read");
            if n == 0 {
                break;
            }
            h.update(&buf[..n]);
        }
        println!("{}  {}", sha256::hex(&h.finish()), path);
    }
}
