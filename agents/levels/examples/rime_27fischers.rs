//! Prints what `python players/rime_27fischers.py` prints.
//!
//! cargo run --release --example rime_27fischers

use std::io::Write;

fn main() {
    std::io::stdout()
        .write_all(levels_agents::the27::main_stdout().as_bytes())
        .expect("write stdout");
}
