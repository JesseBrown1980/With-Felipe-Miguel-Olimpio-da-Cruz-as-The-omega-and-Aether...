# kernel/tribit-referees

Cold-lane referees beside `kernel/tribit`. This directory holds three of the owner's
balanced-ternary research scripts, vendored byte-identical. Each one has an integer Rust 1.81
port that prints exactly what the script prints. For `trunk.py N`, that holds when N is a
non-negative ASCII decimal integer (`PROVENANCE.md` §5). Nothing in the stack consumes them, and
no request path reaches them.

| Script | Upstream | Computes |
|---|---|---|
| `crank.py` | The-Brown-Light-erdos-Engine-block-powered-by-light@a2a6c44 (the same blob is in the-browns-solution-to-erods…@5bdc268 and both Hugging Face mirrors) | Of the residues that survive levels 0..k-1, the fraction whose balanced digit k of `2^n` is −1. It runs over one full period `2·3^k` per level, for 13 levels: `1/2`, then `1/3` at each level |
| `compose.py` | does-the-closure-survive-81-levels@00dc393 | The arms `2a−b−c, 2b−a−c, 2c−a−b`. It runs over nested ternary trees to depth 13, and down one path to depths 27 and 81. It runs in exact integers/Fractions and in float64 |
| `trunk.py` | does-2-to-the-n-always-contain-a-digit-2-in-base-3@02299b4 | The low 320 balanced digits of `2^n` for `n = 0..N`. It reports the lowest −1, the record setters and the distribution |

```bash
python -I vendor/The-Brown-Light-erdos-Engine-block-powered-by-light/crank.py
cargo +1.81.0 run --release --example crank      # same bytes
python -I tools/referee.py --check --rust "${CARGO_TARGET_DIR:-target}/release/examples"
```

`PROVENANCE.md` records the following:

- blob ids;
- the GitHub / Hugging Face diff;
- each run's output and the README receipts it reproduces (82 of 82 checked);
- the float sites of each script, with line numbers;
- how each port follows its script.

Three support modules are Claude's code, not upstream code:

- `src/binary64.rs`, an integer model of the binary64 values that the scripts print or compute;
- `src/wide.rs`, a 256-bit integer for compose.py's Fraction lane;
- `src/frac.rs`, a reduced fraction printed as Python's `str(Fraction)`.
