#![forbid(unsafe_code)]
//! Regenerate `tests/fixtures/codec` and `tests/fixtures/tamper`:
//! `gen_fixtures <tests/fixtures> <tests/fixtures> [<tests/cases/CASES.hbp>]` (public copies are
//! read from the first directory: `public-simulator`, `public-colour`, `public-omnibit`; the
//! optional third path receives the case rows).

#[path = "../tests/common/gen.rs"]
mod gen;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 && args.len() != 4 {
        eprintln!("usage: gen_fixtures <fixtures dir> <out dir> [<cases file>]");
        std::process::exit(2);
    }
    gen::generate(
        std::path::Path::new(&args[1]),
        std::path::Path::new(&args[2]),
    );
    if let Some(cases) = args.get(3) {
        std::fs::write(cases, gen::cases_spec()).expect("write cases");
    }
}
