//! The `aether-universe` binary: flags, then the console loop. Integer only.

#![deny(
    clippy::float_arithmetic,
    clippy::cast_precision_loss,
    clippy::float_cmp
)]
#![forbid(unsafe_code)]

use aether_universe::game;
use std::io::IsTerminal;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut cfg = match game::parse_args(&args) {
        Ok(c) => c,
        Err(e) if e == "help" => {
            println!("{}", game::USAGE);
            return;
        }
        Err(e) => {
            eprintln!("REFUSED|reason=bad_flag|detail={e}|json=0");
            eprintln!("{}", game::USAGE);
            std::process::exit(2);
        }
    };
    cfg.prompt = std::io::stdin().is_terminal() && cfg.script.is_none();
    let stdin = std::io::stdin();
    let mut input = stdin.lock();
    let stdout = std::io::stdout();
    let mut out = stdout.lock();
    let code = game::run(cfg, &mut input, &mut out);
    std::process::exit(code);
}
