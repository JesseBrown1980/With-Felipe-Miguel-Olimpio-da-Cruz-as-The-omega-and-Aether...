//! Prints what `python players/rime_fischer_cluster.py` prints.
//!
//! cargo run --release --example rime_fischer_cluster

use std::io::Write;

fn main() {
    std::io::stdout()
        .write_all(levels_agents::cluster::main_stdout().as_bytes())
        .expect("write stdout");
}
