# asolaria-ste-certificate

Search / centrality reduction: the Sidon-Tower-Embedding (STE) distance-uniqueness certificate of
the reductions repository (`01-rebuild/_scratch/sidon-cross-fix.mjs` @ `29307bf`), ported to
integer-only Rust 1.81 (`no_std` + `alloc`, BigInt as `u128`), with the two probes beside it
(`distance-probe.mjs`, `sidon-probe.mjs`).

```
CROSS-FIX towers=11 points=627 pairs=196251 distinct_dist=196251 collisions=0
min_dist=37349 max_dist=2617523875674652731
INTRA all towers zero-collision: OK
```

```rust
let c = ste_certificate::cross_fix::certificate();
assert_eq!((c.all.tot, c.all.coll), (196_251, 0));
```

Check it the way CI does, from this directory:

```
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
python3 -I tools/ste_referee.py --check
for s in sidon-cross-fix distance-probe sidon-probe; do
  cargo +1.81.0 run --locked -q --example ste_stdout -- $s | cmp - <(python3 -I tools/ste_referee.py --stdout $s)
done
```

Sources, measured agreement, the read-note references and what was not brought in:
[PROVENANCE.md](PROVENANCE.md).
