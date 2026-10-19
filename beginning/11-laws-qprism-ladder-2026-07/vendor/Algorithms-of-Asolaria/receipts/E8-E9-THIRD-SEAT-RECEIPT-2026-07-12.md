# E8/E9 THIRD-SEAT RECEIPT — BEHCS-1024 Universal Quant/Unquant + Asolaria Codec v0.1
**Date (UTC):** 2026-07-12 23:42–23:52
**Seat:** independent third seat — Claude Fable 5 (Anthropic), sandboxed Linux container
**Operator:** Jesse Daniel Brown (Asolaria) — direction, architecture, claim under test
**Prior lanes:** acer (origin/measurement, Codex/GPT-5.5 xhigh lanes), liris (attack-verify)
**Doctrine:** TRILATERAL-REALITY-EVIDENCE (acer origin + liris verify + third-seat execution)

## Claim under test (operator's final form)
> "We don't beat Shannon. We prove that any information externally present can be
> quanted and unquanted using the multi-level languages with the 60-tuple catalogs."
Formally: for external corpus X, encode(X) -> BEHCS-1024 glyph stream G, decode(G) -> X',
require sha256(X') == sha256(X), with information rate exactly 1.0 (no sub-entropy claim).

## Environment
- Container: Ubuntu Linux, 1 vCPU Intel Xeon @ 2.80 GHz, ~4 GB RAM
- Python 3.12.3, numpy 2.4.4
- Corpora fetched live from mattmahoney.net/dc/ (Hutter Prize corpora)

## Test 1 — E8 universal quant/unquant (enwik8, 100,000,000 B)
Method: 5 bytes = 40 bits -> 4 glyphs x 10 bits (BEHCS-1024 lane); exact inverse; sha both sides.
Code: `tools/behcs/behcs_ladder_roundtrip.py`.
```
sha256_black = 2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8
sha256_white = 2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8
glyphs = 80,000,000   info_rate = 1.000000   encode 10.7 s  decode 7.1 s
READBACK = VERIFIED_CLONE_0_LOSS                                    MEASURED
```

## Test 2 — E9 universal quant/unquant (enwik9, 1,000,000,000 B)
Same method, chunked (10 x 100 MB).
```
sha256_black = 159b85351e5f76e60cbe32e04c677847a9ecba3adc79addab6f4c6c7aa3744bc
sha256_white = 159b85351e5f76e60cbe32e04c677847a9ecba3adc79addab6f4c6c7aa3744bc
glyphs = 800,000,000  info_rate = 1.000000   encode 28.3 s  decode 20.4 s
READBACK = VERIFIED_CLONE_0_LOSS                                    MEASURED
```

## Test 3 — Asolaria Codec v0 (FAILED, preserved as evidence)
Order-2 adaptive model + naive arithmetic coder WITHOUT carry handling.
Claimed 19,507 B from 1,000,000 B (0.156 bpc) — information-theoretically impossible.
Decoder crashed (ZeroDivisionError); restore never matched. Verdict: the claimed size
was an artifact of silent information destruction. The restore gate convicted it.
```
outcome = HELD (restore FAILED)                     MISTAKE, kept per doctrine
```

## Test 4 — Asolaria Codec v0.1 (first true codec receipt)
Order-2 adaptive model + Subbotin carryless range coder. Code: `tools/codecs/asolaria_codec_v0_1.py`.
Input: first 1,000,000 B of enwik8.
```
sha256_in   = 369b688978f649681136198fb96db14c1616756260c55fb4b65e9bc049552cad
compressed  = 392,002 B   sha256_comp = d04ecbeea11d5e909c3c20457628eabc714d9e9e5e7860cf61e46e7919d2aad5
bpc = 3.136   ratio = 2.55:1   enc 5.4 s   dec 12.5 s
RESTORE = BYTE_IDENTICAL_0_LOSS                                     MEASURED
```
Ladder position (bits/char, enwik-class text): gzip 2.92 · zstd-19 2.16 · PPMd 1.72 ·
cmix-class ~1.2 · Hutter record ~0.933 · **this codec 3.14**. No prize-relevant
compression is claimed. This is rung zero: a correct, verified baseline.

## Baselines measured on this seat (full enwik8, same session)
gzip -9: 36,445,248 B (2.916 bpc) · bzip2 -9: 29,008,758 B (2.321) ·
zstd -19: 26,954,633 B (2.156) · xz -6: 26,665,156 B (2.133) · 7z PPMd o16: 21,553,033 B (1.724)

## Findings
1. UNIVERSAL QUANT/UNQUANT: PROVEN AS STATED for the tested E8/E9 corpus lengths. External information (both Hutter corpora,
   never seen by the catalogs) is exactly representable in the BEHCS-1024 glyph language
   and exactly recoverable, at information rate 1.0. Shannon is paid in full; no
   sub-entropy claim is made or needed. This is representational universality with
   exact invertibility — the honest form of "0 loss."
2. THE READBACK GATE WORKS: a false compression number (v0) was detected and destroyed
   by the byte-identical restore requirement, exactly as the DBBH->DBWH doctrine
   prescribes. The correct successor (v0.1) survives the same gate.
3. NOT CLAIMED: any compression advantage over standard tools; any Hutter Prize
   qualification; any quantum result. Those require future work (learned-prior codec).

## Reproduction
```
curl -O https://mattmahoney.net/dc/enwik8.zip && unzip enwik8.zip
curl -O https://mattmahoney.net/dc/enwik9.zip && unzip enwik9.zip
python3 tools/behcs/behcs_ladder_roundtrip.py enwik8
python3 tools/behcs/behcs_ladder_roundtrip.py enwik9
python3 tools/codecs/asolaria_codec_v0_1.py enwik8 1000000
```
Any machine, any OS with Python 3 + numpy. No GPU. No network after corpus fetch.

## Framing boundary
The supplied Python ladder harness assumes the corpus length is divisible by five; E8 and E9 satisfy that condition. The already-published Rust BEHCS ladder carries original length/padding metadata. Universal arbitrary-length file framing should therefore preserve `orig_len` explicitly rather than inferring it from the glyph stream.

## Credits
- Jesse Daniel Brown — architect of the BEHCS language ladder, the claim, and the
  verification doctrine this receipt follows.
- Claude Fable 5 (Anthropic) — third-seat implementation and execution of all tests
  in this receipt; independent sidecar/CI audits earlier this session.
- Codex / GPT-5.5 xhigh lanes — acer/liris bilateral construction and attack-verify
  receipts that this third seat's work composes with (per repo record).
