# GPT-5.6 Pro independently directed CI receipt — E8/E100 quant cross-check

**Date:** 2026-07-13  
**Repository:** `JesseBrown1980/HYPER-BECHS--the-third-set`  
**PR:** `#16`  
**Tested head:** `adc899ba5d6253890f4b402dd43e5fd586bac2bd`  
**Workflow run:** `29220974232`  
**Job:** `86725845765`  
**Artifact:** `8268195415`  
**Artifact SHA-256:** `bcc0a99b3bb6b4b578d17862048abf225280aa81f44e48bcd50ddf4c362c5c2e`  
**Runner:** GitHub Actions Ubuntu 24.04, Python 3.12, NumPy 2.4.4

## Outcome

Every workflow step passed:

```text
supplied receipt/sidecar verification      PASS
source compile and local property tests    PASS
public enwik8 fetch, size and SHA check    PASS
supplied E8 ladder rerun                    PASS
supplied codec-v0.1 rerun                   PASS
corpus Q4-3200/Q8v2 cross-check             PASS
20-read fully gated persistent prior        PASS
fixed-holdout learned-catalog control       PASS
100,000 E100 coordinate round trips         PASS
artifact upload                             PASS
```

This is an independent execution of the committed branch. It does not rewrite Claude Fable 5's
supplied receipt as a GPT-local result.

## Supplied package and original-code reruns

The supplied receipt SHA-256 verified as:

```text
21056f77d1284ede41a64840d795611a311be1b2298a82d70dfeea402897a544
```

Public enwik8 was independently fetched and verified:

```text
bytes  = 100,000,000
sha256 = 2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8
```

The supplied ladder reproduced byte-identically:

```text
glyphs       = 80,000,000
information  = 1.000000
encode       = 1.0 s
decode       = 0.8 s
READBACK     = VERIFIED_CLONE_0_LOSS
```

The supplied codec v0.1 reproduced the exact receipt output:

```text
input SHA       = 369b688978f649681136198fb96db14c1616756260c55fb4b65e9bc049552cad
compressed      = 392,002 B
compressed SHA  = d04ecbeea11d5e909c3c20457628eabc714d9e9e5e7860cf61e46e7919d2aad5
bpc             = 3.136
encode/decode   = 3.4 s / 7.0 s
RESTORE         = BYTE_IDENTICAL_0_LOSS
```

The codec additionally passed twenty zero-length, short, repetitive, patterned and random tests. A
one-bit compressed-stream mutation produced a different restoration, confirming that the external
SHA/readback gate would hold corrupted output.

## Arbitrary-length BEHCS framing

The supplied ladder requires `len(raw) % 5 == 0`. The independent framed implementation preserves
`orig_len`, pads only the final partial word and passed 276 property cases across all residues modulo
five and randomized lengths through 8,138 bytes.

## Quant head: historical Q4-3200 and complete Q8v2

The corpus-based independent implementation computed all eight named channels from full enwik8.

```text
head build             = 1.350943 s
Q4 historical packet   = 3,200 B
Q8v2 complete packet   = 3,260 B
Q4 SHA gain            = 29,873.285x
Q8v2 SHA gain          = 29,332.708x
Q4 compare gain        = 36,895.672x
Q8v2 compare gain      = 36,020.953x
Q4 payload ratio       = 31,250.000x
Q8v2 payload ratio     = 30,674.847x
```

Q8v2 adds all computed channels, scale, source length, raw SHA-256 and prime-power accumulator for
only 60 bytes beyond Q4. Both remain non-reconstructive sketches/referential heads; neither replaces
the retained body, and no similarity-fidelity claim is made.

The constant-size-tail law reproduced. Exact gain integers differ from Claude's seat because host,
timer and comparison method differ; the law is portable while the rate is machine-specific.

## Fully gated persistent order-2 prior — reads 1–20

Every read used state learned only from earlier reads. The decoder began from an independent clone of
the pre-read state. Every read passed both byte-identical restore and encoder/decoder state equality.

| Read | Offset | Compressed bytes | bpc | Non-default prior cells | zlib checkpoint bytes | Gate |
|---:|---:|---:|---:|---:|---:|---|
| 1 | 0 | 392,002 | 3.136016 | 32,289 | — | PASS |
| 2 | 1,000,000 | 389,825 | 3.118600 | 44,575 | — | PASS |
| 3 | 2,000,000 | 387,885 | 3.103080 | 53,369 | — | PASS |
| 4 | 3,000,000 | 392,504 | 3.140032 | 61,481 | — | PASS |
| 5 | 4,000,000 | 387,084 | 3.096672 | 67,523 | 216555 | PASS |
| 6 | 5,000,000 | 382,181 | 3.057448 | 72,245 | — | PASS |
| 7 | 6,000,000 | 386,386 | 3.091088 | 77,267 | — | PASS |
| 8 | 7,000,000 | 382,473 | 3.059784 | 80,876 | — | PASS |
| 9 | 8,000,000 | 378,586 | 3.028688 | 83,577 | — | PASS |
| 10 | 9,000,000 | 388,858 | 3.110864 | 88,936 | 264067 | PASS |
| 11 | 10,000,000 | 386,067 | 3.088536 | 92,076 | — | PASS |
| 12 | 11,000,000 | 386,221 | 3.089768 | 95,343 | — | PASS |
| 13 | 12,000,000 | 387,518 | 3.100144 | 99,792 | — | PASS |
| 14 | 13,000,000 | 389,044 | 3.112352 | 102,921 | — | PASS |
| 15 | 14,000,000 | 378,875 | 3.031000 | 105,520 | 299657 | PASS |
| 16 | 15,000,000 | 388,790 | 3.110320 | 109,194 | — | PASS |
| 17 | 16,000,000 | 385,329 | 3.082632 | 112,278 | — | PASS |
| 18 | 17,000,000 | 383,103 | 3.064824 | 114,488 | — | PASS |
| 19 | 18,000,000 | 387,854 | 3.102832 | 116,947 | — | PASS |
| 20 | 19,000,000 | 372,417 | 2.979336 | 118,653 | 327612 | PASS |

Measured curve:

```text
read 1 -> read 10   3.136016 -> 3.110864   -0.802%
read 11 -> read 20  3.088536 -> 2.979336   -3.536%
read 1 -> read 20   3.136016 -> 2.979336   -4.996%
20-read payload bpc = 3.085201
```

This independently confirms modest persistent-prior benefit and exact state evolution. It does **not**
reproduce the unsealed `2.912 -> 2.130` curve. Under the supplied codec family the measured improvement
was about 5.0%, and chunk heterogeneity remained substantial.

State accounting at read 20:

```text
dense prior table             = 67,108,864 B
non-default cells             = 118,653
sparse estimate               = 830,603 B
zlib-compressed exact snapshot= 327,612 B
payload + one final snapshot  = 3.216246 bpc over 20 MB
```

The state may instead be reconstructed by replaying earlier streams, trading checkpoint bytes for
replay time. It cannot be omitted from both the storage and computation ledgers.

## Fixed holdout learned-catalog control

Read 20 was fixed as unseen holdout. Dictionaries were trained only on earlier reads. Every row
restored byte-identically and includes dictionary bytes in `standalone_bpc`.

| Training reads | Dictionary bytes | Payload bpc | Payload+dictionary bpc | Same-slice zstd-19 bpc | Payload delta vs zstd | Gate |
|---:|---:|---:|---:|---:|---:|---|
| 1 | 2,048 | 2.659512 | 2.675896 | 2.225368 | +19.509% | PASS |
| 2 | 2,048 | 2.659088 | 2.675472 | 2.225368 | +19.490% | PASS |
| 4 | 4,096 | 2.574584 | 2.607352 | 2.225368 | +15.693% | PASS |
| 8 | 8,192 | 2.490472 | 2.556008 | 2.225368 | +11.913% | PASS |
| 12 | 12,288 | 2.489096 | 2.587400 | 2.225368 | +11.851% | PASS |
| 16 | 16,384 | 2.412792 | 2.543864 | 2.225368 | +8.422% | PASS |
| 19 | 19,456 | 2.410832 | 2.566480 | 2.225368 | +8.334% | PASS |

Same-slice non-dictionary baselines:

```text
gzip -9 = 2.769200 bpc
bzip2 -9= 2.076680 bpc
xz -6   = 2.152960 bpc
zstd-19 = 2.225368 bpc
```

The learned catalog produced a genuine held-out improvement as training/catalog size grew and beat
gzip, but it did not beat same-slice zstd, xz or bzip2. This control validates the general catalog-
reuse mechanism while preventing a claim that the supplied unsealed mint result has been reproduced.

## E100 address plane

```text
100,000 random integers below 10^100 -> 34 base-1024 glyphs -> exact integer  PASS
1024^33 < 10^100 <= 1024^34                                    PASS
1024^60 = 2^600                                                 EXACT
log10(1024^60) = 180.617997398389
```

This verifies address-coordinate mathematics. It does not enumerate a `10^100`-byte body.

## Cross-check verdict

### Independently reproduced

- supplied E8 BEHCS-1024 exact round trip;
- supplied codec v0.1 compressed size, compressed SHA and byte-identical restore;
- arbitrary-length exact BEHCS framing;
- constant-size Q4/Q8 tail economics on full enwik8;
- exact E100 base-1024 addressing mathematics;
- persistent prior state can improve later payloads while preserving exact reconstruction;
- a learned catalog can improve an unseen fixed holdout when its cost is counted.

### Not reproduced or not self-contained in the supplied package

- the exact Test-5 gain integers;
- E9 and E10 reruns in this workflow;
- Test 6's ten XOR-pass hashes;
- Test 7's virtual-window generator;
- the 512-glyph `2.738 bpc` mint;
- the `2.912 -> 2.130 bpc` extended prior curve;
- any claim that the result beats zstd or the Hutter field.

Those remain valid targets for another sealed test, not discarded claims.
