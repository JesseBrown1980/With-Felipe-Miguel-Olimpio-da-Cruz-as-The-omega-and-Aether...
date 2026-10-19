# Seat 4 / light-bank memory sticks — preregistered three-path / fourth-watcher archival experiment

**Date: 2026-10-15. PREREGISTRATION BEFORE any new producer/code/CI results.** Draft, software-only B3 scientific question. Parent: Core Four-Seat review [#55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55); Seat 4 Room [#59](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/59). Do not merge or physically publish without independent Seat 2 provenance peer review.

## Original August light-bank provenance

August 8, 2026 [RAINBOR](https://github.com/JesseBrown1980/RAINBOR) at commit 56de9ee137f204452d7dff41f7b1e953b6ff5c3e, README Git blob fd326cd52a71cf55c3948e131011b57825ec6412 and HBP Git blob f5e8a5004157229988f8a181e68773c0a2055955:
- light-bank and light hard-drive memory-stack concept, three paths meeting at a fourth point, double/triple slit and optical rerouting.
- README itself calls physical behavior and cryptography **DESIGN/CONJECTURE**, not a certified realized memory stick.
- HBP SHA256 **bb870f697af209f228f0d42c0de15ece58b550ed9e9bbb31f855956190ac7306**.
- No verified physical optical-memory-stick devices or historical executable encoding rules recovered. **Do not invent recovered hardware, experimental photon data, device access, storage capacity or encryption.**

Implement a **new** reproducible digital interpretation of three light banks as "sticks", with glyphs representing **three RGB ternary levels** (0,1,2 for each channel) and 27 symbolic colour states per glyph. This is a static binary archive with symbolic light encoding, not retention of photons over real time.

## Frozen actual scientific memories

Build one canonical binary memory archive from five separately sourced records (no user credentials):

1. Original Seat 1 **8,748-snapshot** photocycle HBP, regenerating the exact frozen source commit dd5e47db9522141de3949a23759a5d647ecdafbd, SHA256 **de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b**.
2. The **349,920-step** Seat 4 Room04 B2 *digital* full trace, independently regenerated from unmodified PR #63 source at commit 8b8a9e4faa5b72fd1d5c290c686c1417a36d38ff; SHA256 **2b9575a8d46c2d2f0842d590081641ed2b20daddccc7153107d76efa0d597277** (34,876,953 bytes).
3. Seat 4's 1,296 injected-fault HBP from the same source; SHA256 **ad471bc627451f65d6f26797ddf6c03546ac1f74ab8e3698d9825f1409f9bbb2**.
4. Public independent retention table, 40 rank/nullspace cases; SHA256 **f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78**.
5. The exact August RAINBOR-HUB light-bank design HBP above, SHA256 **bb870f697af209f228f0d42c0de15ece58b550ed9e9bbb31f855956190ac7306**.

Keep original source SHA and model/operation counts unchanged. Binary archive is deterministic name/length/SHA/content envelope, names ASCII sorted, explicit big-endian integer encoding and UTF-8 independent Python and Node parsers. A recomputed archive's SHA must match across languages. Provenance of the archive is via individually pinned content hashes, **not** a trusted physical sensor.

## Digital optical addressing and loss/recovery mathematics

A "light bank stick" is a byte stream of 27-valued RGB ternary glyphs, **not a physical memory stick**.

For every data byte b in 0..255, define two 27-state symbols:
  a=floor(b/27), c=b mod 27 (a≤9,c≤26).
Represent each glyph g∈{0,...,26} as exactly three base-3 RGB channels:
  (R,G,B)=(floor(g/9),floor(g/3) mod 3,g mod 3).
For each stripe and bank, rotate this 3-trit tuple left by (stripe_index+bank_id) mod 3 ("time/color/space" phase). The inverse recovers g; 27×27=729 representations >256, but inverse **rejects values outside 0..255** (e.g. invalid high digit). Encoding two glyphs per byte is **not compression**.

Memory is striped in fixed 512-byte source blocks, padded only at the final block, then divided into two 256-byte source shards A and B. Third parity shard P=A XOR B. Encode each bank's 256-byte shard to 512 RGB ternary glyphs with the phase law above. Only the archive's original full length (header-pinned) is exposed on reconstruction; discard final padding. **Any 2 of {A,B,P} must reconstruct the original entire archive byte-exact**:
 - A,B available: join A+B;
 - A,P available: recover B=P XOR A;
 - B,P available: recover A=P XOR B.

With only one shard, there are many mathematically possible original pairs. A complete reconstruction is **HELD**. This is an erasure code with ~3× glyph-byte expansion for full 3-bank storage, not quantum/optical memory, not secret-sharing (individual data shards leak information), not encryption. A downstream SHA can detect but cannot recover missing unknown bits.

## Test and falsifiers (must actually execute)

- Exhaustively test 256 byte values × 3 rotations × 3 bank IDs (2304 glyph round-trips), reject noncanonical invalid 2-glyph combinations.
- Process **all source bytes**, with Python and independently authored Node implementations generating **byte-identical A,B,P glyph banks**, exact canonical archive and SHA. Archive includes all 349,920 prior site-tick records by copying genuine trace bytes.
- Reconstruct the whole original archive with all **three 2-of-3 surviving subsets**, checked against original bytes and all five pinned SHA input sources (full-source recoverability, not only summary/hash matches).
- At 27 deterministic wave-address samples (stripe indices modulo total), erase one bank; each pair recovers exactly. Prove two erased sticks are ambiguous using concrete distinct completions consistent with remaining bank; HOLD rather than report PASS.
- Independently corrupt a stored glyph in each bank; detect by the pinned per-bank digest and reject its use. If the other two banks survive, use those to recover exactly. Flip an authenticated address, rotate a bank ID, stale/replay nonce, out-of-range glyph, wrong expected source HBP and unanchored forged manifest; each must be rejected or explicitly source-authentication HOLD.
- Compare honest full source archive with a *lossy* RGB quantizer that suppresses the blue trit (0 and 1 collide): distinct data become equal after quantization. A valid downstream SHA over identical quantized outputs **does not** restore information. Keep this distinct from the previously demonstrated GF(2) rank-79/80 results.
- Check original Seat 4 HALT remains 17 accepted/64 denied in the archived receipt/test; no external software permission, no real human prompt per simulated transition.
- Four CI jobs Ubuntu/Windows × Python 3.11/3.13 with Node 22. Output binary archive, 3 bank glyphs or their full SHA and manifest, independent language evidence and actual fault ledger; publish size, wall-time, memory-capacity expansion honestly. Prefer downloadable complete artifacts; never upload credentials, secrets or private user data. No automatic merge.

**Acceptance:** exact original source SHA, all five pinned memory items, deterministic archive and bank SHA across platforms/languages, recovered byte-exact bytes for all three two-bank subsets, singleton ambiguity certified, all tampering/forgeries rejected or provenance held, resource cost recorded, original frozen HBP unchanged, and separate physical/not-physical classifications. **No claim that actual light stores memory**, photon lifetime, quantum information, optogenetic biology or four independent physical hosts. The August RAINBOR source is a *design anchor* only; B3 runs digital models that are newly defined here.
