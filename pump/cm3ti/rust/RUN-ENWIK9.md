# Running the stacked-cubes codec on enwik9 (1 GB) — the Hutter target

`cm3ti_stack_1g.rs` is the memory-hardened crown (stacked 6+12+24 sector cubes):
history stored as u8 (not i32) and a bounded 2^24-slot match table, so it fits
~3.3 GB RAM on 1 GB of text instead of ~20 GB. Ratio is unchanged (10 MB: 1.8991
vs 1.8990; lossless). All integer, deterministic.

## Resource reality (measured/estimated)
- RAM: ~3.3 GB for enwik9 (fits a normal machine; OOMs a 7 GB cloud sandbox only
  because of other overhead + safety margin — runs clean on 8 GB+).
- Time: ~4.2 hours for one full enc+dec pass at ~15 s/MB single-thread. This is why
  a 2-core ephemeral sandbox can't do it (snapshots kill a 4-hour job); a persistent
  machine (your 64-core box) or a long-lived cloud instance can.
- No GPU: the codec is pure integer CPU context-mixing. GPUs are neither used nor
  needed. (The 2D "shadow" slices are a *visualization lens*, not part of the codec.)

## Run (on a machine that can run ~4h)
    # get the corpus
    wget http://mattmahoney.net/dc/enwik9.zip && unzip enwik9.zip   # 1,000,000,000 bytes
    rustc -O cm3ti_stack_1g.rs -o cm3ti_stack_1g
    ./cm3ti_stack_1g enwik9 10        # prints byte-exact total bpc + SHA restore

## Honest notes for the prize
- SGRAM sharding is a SCREENING tool (parallel, ~+6% ratio from per-shard cold start).
  The Hutter number must be a SINGLE-STREAM run with the total (compressed + decoder)
  counted. Shard to explore fast; quote only the monolithic number.
- Our best is 1.7953 bpc on enwik8 (100 MB). The record is ~0.886 bpc on enwik9 (1 GB),
  held by fx2-cmix. The gap is large and real — it's specialist cmix-family engineering.
  "More data helps" is a genuine trend (10 MB 1.8990 -> 100 MB 1.7953), and enwik9 should
  continue it, but it will not close a ~0.9 bpc gap by itself. Measure, don't assume.
