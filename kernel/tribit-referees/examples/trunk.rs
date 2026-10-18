//! Prints exactly what `python trunk.py [N]` prints (N defaults to 200000, trunk.py:45), for N
//! given as a non-negative ASCII decimal integer. For other arguments that trunk.py:45 `int()`
//! accepts (N < 0, `1_000`, non-ASCII digits) this panics; PROVENANCE.md §5 records those runs.

fn main() {
    let n = match std::env::args().nth(1) {
        Some(a) => a
            .trim()
            .parse::<u64>()
            .expect("N: a non-negative ASCII decimal integer"),
        None => tribit_referees::trunk::DEFAULT_N,
    };
    print!("{}", tribit_referees::trunk::stdout(n));
}
