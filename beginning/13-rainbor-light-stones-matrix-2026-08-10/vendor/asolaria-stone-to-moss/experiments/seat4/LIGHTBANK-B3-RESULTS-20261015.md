# Seat 4 B3 — August Light Bank x Colour QR x projector: results

**2026-10-15 · software evidence, NOT optical-memory hardware.**
Coordinator #55, Seat4 #59, new [draft PR #66](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/66).

## Historical sources preserved

1. August RAINBOR [light-bank sketch](https://github.com/JesseBrown1980/RAINBOR/blob/master/README.md), historical commit `56de9ee137f204452d7dff41f7b1e953b6ff5c3e`. Its physical claims are labeled design/conjecture by the original source.
2. [Original Colour QR](https://github.com/JesseBrown1980/the-colour-qr/blob/main/README.md), commit `1938a9b076b8fc3e81d0a271ca05e84a0e938854`: **2100-byte indexed chunks, 4-byte little-endian Fischer index, Base64, independent ordinary R/G/B QR symbols**. This is a separate transport layer from our new symbolic bank encoding.
3. [Space/light/colour projector](https://github.com/JesseBrown1980/the-law-of-space-and-light-and-color-and-travel-at-the-speed-of-one/blob/main/README.md), commit `1b2dd747bccee378b94790bc4ad367bdbf7e5bf8`: exact `P=I-J/3`, rank 2, nullity 1; the common mode is mathematically lost unless preserved separately.
4. Frozen Seat1 photocycle and Seat4 B2 actual byte traces, original SHA 8,748 snapshots / 349,920 digital transitions / 1,296 earlier rejected corruptions.
5. Existing independent 40-case GF2 reversible-vs-lossy law table.

B3 protocol preregistered **before** B3 algorithm code at `c5bae17518e34b55f9447e60fd6bf9c8e1053334`. Colour QR and projector source instructions were added append-only, after the operator provided the actual URLs and before those new transport/projector algorithms were committed.

## Measured digital experiment

[Initial passing hosted B3 run 38733339711](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38733339711): **all five jobs passed** (four Ubuntu/Windows Python3.11/3.13+Node22 storage recomputations and one Linux ordinary RGB QR *pixel* test). Python and an independently authored Node program agree byte-for-byte on the complete source archive, ALL bank bytes and Colour QR indexed packet stream; every one of three independent 2-of-3 storage-bank combinations recovers exact original bytes. A bank alone is information-insufficient, as proved by explicit distinct source completions consistent with the surviving bank.

**Independent external audit:** downloaded Ubuntu/Python3.11 and Windows/Python3.11 artifacts from run 38733339711; compared all **24/24** decompressed files byte-for-byte and independently checked each of 23 data files against the LF `SHA256SUMS`. **0 differences**. The source archive and all three bank SHA256 values match between operating systems. This independently validates the artifacts, not merely the CI summary.

| Result | Measured |
| --- | ---: |
| Canonical five-source archive bytes | **35,607,597** |
| Fixed 512-source-byte stripes | **69,547** |
| Three symbolic RGB/ternary bank sizes | **35,608,171 bytes each** |
| Recovered full archive pair combinations | **3/3 exact** (A+B, A+P, B+P) |
| Exactly recoverable with only one bank | **NO** (3 concrete ambiguity witnesses) |
| RGB Colour QR 2,100-source-byte packets | **16,956** |
| RGB Colour QR groups (3 planes) | **5,652** |
| Original-source byte-exact Colour QR transport | PASS, Python/Node independent |
| Projector rank/nullity | **2/1** over exact rationals |
| Projector common-mode collisions | **1,029** |
| Recovered projector triples *given side-channel sum* | **343/343** |
| Actual QR v40 L PNG triple-plane and two-plane/filler decoding (software) | **PASS** |
| Optical physical source / real light bank device measured | **NO** |

### Exact SHA256 evidence

| Full byte artifact | SHA-256 |
| --- | --- |
| Five-record source archive | `1288a63f2d5895bc555813b2703947b94c8179974a46bcf132b55d82dd9e7b9c` |
| A bank G27 | `d0e59818cfc80c7c8ed9f1571c76cf7fed54bd2dc94dae9705a2a0f575f36939` |
| B bank G27 | `8931528d3a0eefd14b2743e6a4a4c68703709af95abccc23b408549525b41bb1` |
| P bank G27 | `319549787a6633c9f7d3f5eeebcb3d974626f814346b993af4cbb445c182bd18` |
| Original Colour QR indexed 3-plane transport stream | `293e02518d7972c89c488d5525231f1a40636d467fb1f7ca1b4cc9c69c503952` |
| Canonical B3 result JSON, frozen in GitHub | `40a1a961fb3bae45ad1253b9c0ad91ce31e8dfdb59ef48be3f1e0086291f8b4d` |
| Original cross-OS 24-file evidence manifest | `4a81e83c8bff6348a3631a9c4b3145acaf41e933350b272802c1fd917f9185ee` |

Artifacts: [Ubuntu source+sticks archive](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38733339711/artifacts/11970358617), [Windows source+sticks archive](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38733339711/artifacts/11971103985), [two actual PNG QR composites + decode results](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38733339711/artifacts/11971043696).

Later follow-on commits attach the [append-only JSON result stone](../../stones/2026-10-15-rainbow81/seat4-lightbank-b3-three-path-memory.json) with SHA sidecar, and a standalone offline verifier. Those enhancements require their own completed final CI verification before they can be reported as passing; never retroactively imply the earlier run tested later code.

## What the mathematical results mean

**2-of-3 bank code:** each 512-byte source stripe is two independent 256-byte halves, A and B; the third bank stores P=A XOR B. All three combinations decode the original 512 bytes *exactly*. This is **erasure resilience**, not compression or encryption. The 27-colour trit phase rotation is a reversible digital symbol mapping of the bytes, not physically modulated optics. The 3 banks store about 3× original archive bytes before metadata, and their total uncompressed evidence package is larger still.

**Projector loss:** for input x=(a,b,c) and sum s, the integer-numerator version y=3x-(s,s,s) discards the common mode. For every nonzero integer k, y(x+k(1,1,1))=y(x), so no inverse from y alone exists. Preserve s and x=(y+s)/3 can be reconstructed exactly. This is the same **recoverability principle** Seat4 tested for rank-80/rank-79 cyclic GF(2) software laws, now extended to the original August 3×3 rational projector. Neither says information travels instantaneously.

**Actual RGB QR pixels:** ordinary QR image encoding and decoding was independently executed on the full 3-channel frame (0,1,2) and last two-channel frame (30,31; 2100+436 bytes, B filler). The model does *not* demonstrate optical-camera capture or decoding all 5652 rendered images; the full 16,956-packet audit is indexing/Base64 transport plus byte-exact reassembly.

## Fail-closed controls and limits

Three independent bank-glyph digest corruptions, illegal G27 symbols/high digits, bank-ID swaps, stale nonce, altered length, forged archive digest, duplicate/missing indexed QR chunk, wrong RGB plane and malformed Base64 are rejected; full-source reconstruction with only one bank is explicitly HELD, not PASS. A downstream checksum detects unauthorised changes **only when anchored to authentic precommitted source**; the digest itself cannot infer all missing information or authenticate a compromised coherent producer/watcher.

Three symbolic RGB levels per axis are NOT actual light storage or a measured 27-colour photonic channel. The original cited pages are design/protocol references, not independent evidence of a working solid-state light-memory stick or faster-than-light dynamics. No measured real neuron, channelrhodopsin kinetics, optical retention lifetime, standalone flash hardware, encrypted/secret-shared data, three physically attested hosts, or real-world release authority is shown. Keep PR #66 **draft and unmerged** pending Seat2 independently challenges data/source provenance and coordinator approvals.

## Append-only packaging correction (same scientific source, not a new measurement)

The strengthened initial offline-replay CI passed computations, but independently unpacking its Ubuntu and Windows artifacts revealed two extra, unsealed `sources/__pycache__/*.pyc` files generated by dynamic import **after** writing `SHA256SUMS`. The replay-program bytecode differed between operating systems and violated the *complete downloadable bundle* integrity requirement. This is an artifact-package **HELD** for that intermediate run, even though all original archive/bank/QR bytes and source SHA values matched. Do not call those newer 29-file ZIPs universally byte-identical.

Correction: the offline verifier now sets `sys.dont_write_bytecode=True` before dynamically loading the two producer modules; CI now scans the **final post-replay filesystem**, rejects any .pyc or __pycache__, and requires that the SHA256SUMS entries equal exactly the set of all archived files. Passing this new *post-replay closed-world* gate on both OSs is required before certifying the final corrected capsule. The earlier original 24-file B3 artifacts DID pass a complete byte-for-byte cross-OS comparison and remain valid initial scientific evidence. Failed packaging runs remain in Actions history. B3 frozen input and bank/source digests are unchanged.
