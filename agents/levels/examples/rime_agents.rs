//! Prints what players/rime_agents.py prints (lines 166-170), with the MTP and HRM agents
//! reading the first 600,000 bytes of the file named on the command line. Upstream reads
//! `D:/asolaria-absorb/enwik9`; the first 100,000,000 bytes of enwik9 are enwik8.
//!
//! On stderr, one HBP row (verification only, not upstream): the bpc line's tie margin and the
//! bound it is compared with, both in units of 10^-12 (`levels_agents::rime_agents`).
//!
//! cargo run --release --example rime_agents -- path/to/enwik8

use levels_agents::rime_agents::{rime_agents_run, BPC_BINARY64_BOUND_1E12, DATA_BYTES};
use std::io::{Read, Write};

fn main() {
    let path = std::env::args()
        .nth(1)
        .expect("usage: rime_agents <enwik8 or enwik9>");
    let mut data = Vec::with_capacity(DATA_BYTES);
    std::fs::File::open(&path)
        .expect("open the enwik file")
        .take(DATA_BYTES as u64)
        .read_to_end(&mut data)
        .expect("read the enwik file");
    let (stdout, margin) = rime_agents_run(&data);
    std::io::stdout()
        .write_all(stdout.as_bytes())
        .expect("write stdout");
    eprintln!(
        "HRMBPC|tie_margin_1e-12={margin}|binary64_bound_1e-12={BPC_BINARY64_BOUND_1E12}|json=0"
    );
}
