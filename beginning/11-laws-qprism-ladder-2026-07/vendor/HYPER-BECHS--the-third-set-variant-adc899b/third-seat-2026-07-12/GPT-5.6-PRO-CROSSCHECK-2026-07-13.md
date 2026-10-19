# GPT-5.6 Pro cross-check — E8/E100 receipt and combined-quant follow-up

**Date:** 2026-07-13  
**Input receipt SHA-256:** `21056f77d1284ede41a64840d795611a311be1b2298a82d70dfeea402897a544`  
**Supplied seat:** Claude Fable 5, as recorded by the operator  
**Cross-check seat:** GPT-5.6 Pro local sandbox + independently directed GitHub Actions

## Package integrity

The two uploaded E8/E100 Markdown copies were byte-identical. The supplied sidecar verified exactly.
The two codec copies were byte-identical; the two ladder copies were byte-identical.

```text
receipt = 21056f77d1284ede41a64840d795611a311be1b2298a82d70dfeea402897a544
codec   = 538fcce605d344506ec1cf0954e0f4ea76dfb1cd30f5328f8cbcc1fd6bb237b7
ladder  = 233fe7430538daa44a0b175ee873a50151a6699a81cec0d202e4332dd677140e
```

## Source coverage boundary

The supplied package contains executable source for:

1. the BEHCS-1024 5-byte ↔ four 10-bit-glyph ladder;
2. codec v0.1, an adaptive order-2 carryless range coder.

It does **not** contain the generating source for:

- Test 3's failed v0 codec;
- Test 5's corpus-specific quant8 timings;
- Test 6's E10 XOR-stream runner;
- Test 7's virtual E100 object/window generator;
- Test 8's 512-glyph mint or persistent-prior curve.

The sealed receipt is evidence of the supplied seat's report. Tests 5–8 are not self-contained
reproductions until their code/logs are also present. This branch adds independent implementations
for the corpus quant head, arbitrary-length ladder, fully gated persistent prior, held-out learned
catalog control and E100 coordinate mathematics.

## Local code cross-check already completed

The supplied codec was imported and tested on 20 deterministic, repetitive and random inputs from
zero through 8,192 bytes. Every case restored byte-identically. A one-bit compressed-stream mutation
produced a different restoration, so the external SHA/readback gate would hold it.

The supplied ladder is exact for corpora whose byte length is divisible by five. It asserts on other
lengths. The independent framed version added here preserves `orig_len`, pads only the final partial
word and passed 276 randomized length cases locally.

## Arithmetic cross-check

### Exact or internally coherent

```text
100,000,000 / 3,200 = 31,250
1,000,000,000 / 3,200 = 312,500
10,000,000,000 / 3,200 = 3,125,000
342,210 * 8 / 1,000,000 = 2.73768 bpc
2.912 -> 2.437 = -16.3118%
2.912 -> 2.130 = -26.8544%
1024^33 < 10^100 <= 1024^34
1024^60 = 2^600 ≈ 4.149515568880993e180
```

### Corrections and scope

- `1024^60 = 10^180` is order-of-magnitude shorthand, not exact equality.
- The operator's later phase-2 statement `2.420 -> 2.130 = -12.7%` recomputes to **-11.9835%**.
- The displayed Test-5 gains cannot be reproduced exactly from the rounded times in the prose. For
  example, `808 ms / 19.3 us = 41,865`, not 41,826. This can be normal hidden precision, but the raw
  nanosecond samples are needed for exact recomputation.
- Test 6 is a 10-GB exact-throughput test over ten deterministic XOR variants of enwik9, not ten
  billion previously unseen natural-language bytes.
- Test 7's 20 windows establish sampled generator/address correctness. They do not enumerate or hash
  an actual `10^100`-byte body. The 34-glyph capacity and BigInt coordinate statements are testable.
- Test 8 says the 512-glyph mint beat gzip, but the mint is reported on one 1-MB slice while the
  listed gzip baseline is for full 100-MB enwik8. A same-slice baseline is required.

## Persistent-prior accounting gap

The supplied order-2 model is a dense:

```text
65,536 contexts × 256 symbols × uint32 = 67,108,864 bytes
```

If decoder state is reconstructed by replaying every earlier stream, that dense table need not be
stored separately but random access pays replay cost. If random access uses a checkpoint, the prior
state or an exact sparse/compressed equivalent belongs in the total ledger. Counting only a
20,480-byte glyph catalog while omitting persistent frequency state would undercount the system.

The new independent prior runner reports per read:

```text
compressed bytes and bpc
byte-identical restore
encoder/decoder state equality
non-default prior cells
raw dense-state bytes
sparse checkpoint estimate
periodic zlib checkpoint bytes
cumulative payload bpc
```

## Status of the operator's extended reads 11–20

The operator supplied this later summary in conversation:

```text
read 11 = 2.420 bpc
read 20 = 2.130 bpc
phase 1 read 1->10 = 2.912 -> 2.437
catalog = 5,120 glyphs / 20,480 bytes
```

The full values for reads 12–19, the mint/prior source, per-read compressed streams, restore hashes
and a resealed sidecar were not supplied. This is therefore retained as
`OPERATOR_REPORTED_UNSEALED`, not discarded and not silently promoted to a measured receipt.

## Independent replication matrix added in this branch

| Surface | Independent method | Gate |
|---|---|---|
| supplied package | exact SHA sidecar + source hashes | fail on mismatch |
| BEHCS ladder | original E8 run plus framed arbitrary-length property test | SHA/byte equality |
| codec v0.1 | original E8 first-MB rerun plus random/repetitive fuzz | byte equality |
| quant8 | corpus CountSketch/Turbo/Polar/Zeta/Triple/Quad/hist/prime-power implementation | deterministic Q4/Q8 hashes; scope says non-reconstructive |
| full Q8 packet | packs all computed channels, scale, source length and raw SHA | explicit identity witness |
| persistent prior | 20 one-MB reads; state learned only from earlier reads | restore and state equality on every read |
| catalog learning | zstd dictionary trained only on preceding reads, fixed read-20 holdout | dictionary counted; exact restore |
| E100 address plane | 100,000 random 100-digit offsets converted to 34 base-1024 glyphs and back | exact integer equality |

The zstd dictionary lane is a control, not an Asolaria ownership claim. It separates a general
learned-dictionary effect from the specific persistent-order2/glyph implementation.

## Claims that can be upgraded only after CI

The pull-request workflow downloads and SHA-verifies public enwik8, reruns the original ladder and
codec, executes the 20-read fully gated curve, runs the fixed-holdout catalog control, creates
Q4-3200 and self-contained Q8v2 measurements, validates E100 address mathematics and uploads all
logs. Results are not predeclared here; the workflow artifacts and exact commit are the evidence.

## Remaining quant surfaces to test after this receipt

1. exact multi-level traversal with a printed quant-down result at every level;
2. Q4-3200 versus self-contained Q8v2 fidelity and collision/adversarial sweeps;
3. public ternary Triple versus spherical Triple versus any private exact Triple implementation;
4. Zeta-log versus Zeta-mod6/von-Mangoldt lanes;
5. CountSketch versus seeded Achlioptas JL;
6. phrase/glyph/word/verb/noun catalogs with frozen held-out evaluation;
7. catalog-version and random-access checkpoint cost;
8. Path-2 CRT, shell and watcher composition around the compressed stream;
9. same-slice gzip/bzip2/zstd/xz/PPMd comparisons;
10. cross-domain transfer, shuffled-text and random-byte negative controls.

## Evidence tags

```text
SUPPLIED_CLAUDE_RECEIPT_SHA_VERIFIED       yes
SUPPLIED_TESTS_1_2_4_SOURCE_PRESENT        yes
SUPPLIED_TESTS_5_6_7_8_SOURCE_PRESENT      no
GPT_LOCAL_CODEC_PROPERTY_TESTS             pass
GPT_LOCAL_FRAMED_LADDER_PROPERTY_TESTS     pass
GPT_GITHUB_ACTIONS_CORPUS_RERUN            pending PR CI
EXTENDED_READS_11_20                       OPERATOR_REPORTED_UNSEALED
```
