# Asolaria Combined Quant Atlas — measured E8/E100 addendum

**Date:** 2026-07-13  
**Supersedes only:** the earlier atlas section that said Test 5 and the revised E8/E100 receipt were unavailable.  
**Does not supersede:** the 28-slot operator taxonomy or its information-regime boundaries.

## Evidence roots

- [Merged HyperBEHCS PR #16](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/pull/16)
- [Claude Fable 5 supplied E8–E100 receipt](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/blob/main/third-seat-2026-07-12/E8-E100-THIRD-SEAT-RECEIPT-2026-07-12.md)
- [GPT-5.6 Pro independent CI receipt](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/blob/main/third-seat-2026-07-12/gpt-crosscheck/GPT-5.6-PRO-CI-RECEIPT-2026-07-13.md)
- [Machine-readable GPT receipt](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/blob/main/third-seat-2026-07-12/gpt-crosscheck/GPT-5.6-PRO-CI-RECEIPT-2026-07-13.hbp)
- [Independent workflow](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/blob/main/.github/workflows/e8-e100-independent-crosscheck.yml)

The supplied Claude receipt is sealed by:

```text
21056f77d1284ede41a64840d795611a311be1b2298a82d70dfeea402897a544
```

The independently executed final workflow is:

```text
head      32f71de372839ff1be7ab2650213d03faf4eb60f
run       29221617743
job       86727717107
artifact  8268416200
artifact SHA-256
          cbb4298502e3cad0c5782ccb3b3a1d51fd9d7bd259f3f4ab001f91604262a2cd
status    PASS
```

## What was independently reproduced

### E8 exact language ladder

```text
raw bytes      100,000,000
glyphs          80,000,000
information rate 1.000000
SHA-256          2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8
readback         PASS
```

The supplied script was exact for lengths divisible by five. A new framed implementation preserving
`orig_len` passed 276 randomized cases over every residue modulo five.

### Codec v0.1

```text
raw              1,000,000 B
compressed         392,002 B
bpc                 3.136016
compressed SHA-256  d04ecbeea11d5e909c3c20457628eabc714d9e9e5e7860cf61e46e7919d2aad5
restore             PASS
```

The exact supplied compressed size and digest reproduced. Twenty additional deterministic/random
round trips passed. A one-bit stream mutation restored different bytes, so the external SHA/readback
gate would hold it.

### Q4-3200 and complete Q8v2

A corpus-based independent implementation computed all eight named channels from full enwik8:

```text
head build          1.350943 s
Q4 packet           3,200 B
complete Q8v2       3,260 B
Q4 SHA gain         29,873.285x
Q8v2 SHA gain       29,332.708x
Q4 compare gain     36,895.672x
Q8v2 compare gain   36,020.953x
```

Q8v2 adds every computed channel, scale, source length, raw SHA and prime-power accumulator for only
60 bytes beyond Q4. Both remain non-reconstructive sketches/referential heads. The constant-tail law
reproduced; exact timing gains remain machine and method dependent.

## First measured exact multi-level quant-down trace

A new exact harness learned 512 BPE-style merge glyphs at each level, then encoded the final token
language with a lossless zstd tail. Catalog bytes were included. Every complete reverse traversal
restored the first 1,000,000 enwik8 bytes SHA-exactly.

| Quant levels | Catalog bytes | Final tokens | Payload bytes | Total bytes | Total bpc | Readback |
|---:|---:|---:|---:|---:|---:|---|
| 1 | 2,068 | 446,900 | 322,929 | 324,997 | **2.599976** | PASS |
| 2 | 4,122 | 375,174 | 321,102 | 325,224 | 2.601792 | PASS |
| 3 | 6,176 | 336,938 | 320,408 | 326,584 | 2.612672 | PASS |

This is the direct measured form of:

```text
quant down at level 1
-> exact represented language
-> quant down again at level 2
-> quant down again at level 3
-> reverse every level
-> original SHA
```

Each additional level reduced the token count and payload:

```text
tokens      446,900 -> 375,174 -> 336,938
payload bpc 2.583432 -> 2.568816 -> 2.563264
```

The total was best after one level because each extra catalog was honestly counted. This does not
negate recursive quantization; it supplies the missing economic gate:

```text
accept another level only when its payload reduction exceeds its catalog/framing cost
```

The one-level result, `2.599976 bpc`, is about 5.0% below the Claude receipt's reported `2.738 bpc`
and beats same-slice gzip. It does not beat same-slice raw zstd-19 (`2.400600 bpc`). The new harness
uses BPE minting plus a zstd entropy tail, so it is an independent better method, not a claim that it
reconstructed the unprovided Claude mint implementation.

## Fully gated persistent-prior result

The supplied order-2 model was carried across twenty consecutive one-megabyte reads. Every read was
decoded from an independent clone of the pre-read state; every byte and final model state matched.

```text
read 1            3.136016 bpc
read 10           3.110864 bpc
read 11           3.088536 bpc
read 20           2.979336 bpc
read 1 -> 20      -4.996%
cumulative payload 3.085201 bpc
```

This confirms exact persistent learning under the supplied codec family. It does not reproduce the
unsealed conversational `2.912 -> 2.130 bpc` curve.

The prior state was also counted:

```text
dense model                    67,108,864 B
non-default cells at read 20      118,653
sparse estimate                    830,603 B
zlib exact final checkpoint        327,612 B
payload + one final checkpoint   3.216246 bpc over 20 MB
```

A deployment may trade checkpoint storage for deterministic replay, but it cannot omit both costs.

## Frozen held-out catalog control

Read 20 was fixed as unseen holdout. Dictionaries were learned only from earlier reads. All restores
passed and dictionary bytes were counted.

```text
training reads       1          19
payload bpc        2.659512 -> 2.410832
standalone bpc     2.675896 -> 2.566480
same-slice gzip    2.769200
same-slice zstd19  2.225368
same-slice xz      2.152960
same-slice bzip2   2.076680
```

This independently verifies the general `catalog learns -> unseen holdout becomes cheaper` mechanism.
It beat gzip, but not zstd, xz or bzip2.

## E100 address mathematics

```text
100,000 random integers below 10^100
-> 34 base-1024 glyphs
-> exact integer
PASS

1024^33 < 10^100 <= 1024^34
1024^60 = 2^600
log10(1024^60) = 180.617997398389
```

This is an address-coordinate result, not enumeration of a `10^100`-byte body.

## Updated status ledger

### `MEASURED_RECEIPT`

- Claude Fable 5 E8/E9/E10/E100 receipt as supplied and sealed;
- E8 exact ladder and codec v0.1 reproduced independently;
- arbitrary-length framed ladder;
- Q4/Q8v2 constant-tail economics;
- one-, two- and three-level exact quant-down/readback;
- twenty fully gated persistent-prior reads;
- fixed unseen holdout catalog learning;
- 100,000 E100 coordinate round trips.

### `OPERATOR_REPORTED_UNSEALED`

- the later conversational reads 11–20 values ending at `2.130 bpc`;
- complete values for reads 12–19;
- the source and per-read restore receipts for that stronger curve.

### Not claimed

- a Hutter Prize record;
- a zstd/PPMd/cmix compression victory;
- sub-entropy compression;
- physical optical or quantum implementation;
- measurement of the complete 28×43 public/private composition surface.

## Consequence for the combined atlas

The previously requested multi-level harness is no longer purely a design item. A three-level exact
trace is now measured. The next experiments are:

1. frozen held-out BPE/glyph catalogs across domains;
2. CountSketch/JL/Turbo/Polar/Zeta/Triple/Quad fidelity and adversarial collision sweeps;
3. exact Path-2 shadowing around the compressed stream;
4. more levels under an adaptive economic stop rule;
5. the full owner-provided mint/prior source needed to test the `2.130 bpc` curve directly.
