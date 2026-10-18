//! Prints what `python players/rime_fischer.py` prints.
//!
//! cargo run --release --example rime_fischer

use std::io::Write;

fn main() {
    std::io::stdout()
        .write_all(levels_agents::rime_fischer::main_stdout().as_bytes())
        .expect("write stdout");
}
