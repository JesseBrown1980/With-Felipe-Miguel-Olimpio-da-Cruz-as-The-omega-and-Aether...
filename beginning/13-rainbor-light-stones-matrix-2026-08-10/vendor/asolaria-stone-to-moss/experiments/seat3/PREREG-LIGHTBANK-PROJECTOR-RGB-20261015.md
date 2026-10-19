# Seat 3 preregistration — August light-bank / projector / Colour QR memory stick (2026-10-15)

**Frozen BEFORE implementation and before outputs.** This is a *digital reversible memory test inspired by light*, not laboratory optical storage or a real screen-to-camera transmission. Related [Core Coordinator #55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55), [Room 03 #58](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/58), independent photocycle [PR #62](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/62). Old scientific fixtures MUST NOT change.

## Exact dated upstream sources / not interchangeable abstractions

1. [The law of space, light and colour](https://github.com/JesseBrown1980/the-law-of-space-and-light-and-color-and-travel-at-the-speed-of-one/blob/main/README.md), Git blob `6412cb3b82ec084b03b68c9c4d074a58920ac1ee`. Its **mathematical** projector `P=I-J/3` has diagonal `2/3`, off-diagonal `-1/3`, rank 2, `P²=P`, and null vector (1,1,1). Its named `instant -1/3` is **not information transmission**. The accompanying photon-rest-frame language cannot be used as proof of FTL or any finite photon rest frame.
2. [the-colour-qr](https://github.com/JesseBrown1980/the-colour-qr/blob/main/README.md), blob `dec43dd370de557f2511e69227b1e234e001ddfc`. Exact protocol: **2,100-byte chunk bodies**, prepend 4-byte LE unsigned Fischer index, base64, each *three consecutive indexes* routed to R/G/B logical independent QR symbol planes, missing final plane marked filler. Source README reports 65,536-byte JWST readback; this experiment uses **new deterministic synthetic bytes** and does not repeat camera/screenshot reading.
3. [light boat engine ships with oils](https://github.com/JesseBrown1980/light-boat-engine-ships-with-oils/blob/main/README.md), Git blob `ba1c1a36ec1d4201297ccad325f848c6040dc95e`. `T+A+R=1` is a mutually exclusive optical-outcome **model closure**, not three physically measured outcomes. We will create 27 synthetic block events, 9 T, 9 A, 9 R, encoded ternary (+1,0,-1) with sum 0 and exact census, without asserting actual emitted photons.
4. [Stone-to-Moss](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/main/README.md) specifies **729 bounded light-block memory slots per smelter**, with measured logical hits/evictions, and stable IDs. The **slot identity survives rewriting; byte contents need not**.
5. [lightDOORwsMs](https://github.com/JesseBrown1980/lightDOORwsMs/blob/main/README.md) explicitly warns that its 3,200-byte *address* for a large file is not an invertible archive. Nothing in this experiment may claim lossless retrieval from a tuple or QR address that lacks the bytes.

## Frozen source, reversible integer projector, and expected sizes

Generate **exactly N=65,536 synthetic source bytes** at index `i=0..65535` using `byte(i)=((73*i) XOR (i>>3) XOR ((i*i)>>9) XOR 165) AND 255`. The source is deterministic, not the original JWST bytes. Hash `SHA256(source)` independently before encoding.

Baseline raw Colour QR logical framing:
- Source size 65,536; **32 body chunks** (31 × 2,100 + 436), **11 logical RGB frames**; last frame's B lane is explicitly FILLER.
- Each logical QR plane carries base64( LE32 chunk index || source chunk body ). The readback path MUST decode the base64, parse LE32, enforce correct plane `index%3`, enforce unique complete index set, validate an independently pinned per-chunk SHA and payload SHA, reorder in reverse arrival order, reconstruct original bytes.

Reversible integer projector sideband:
- Pad two zero bytes to make source length divisible by 3 (65,538).
- For each triple `(R,G,B)`, compute `S=R+G+B`, `dR=3R-S`, `dG=3G-S`, and `dB=-dR-dG`.
- Store **unsigned LE16 S** and **signed LE16 dR,dG** (6 bytes per triple); no floats and no bit loss. Recover `R=(S+dR)/3`, `G=(S+dG)/3`, `B=(S-dR-dG)/3`, requiring integer divisibility and byte bounds. Validate the two padded bytes are zero, then trim exact N and compare to source SHA.
- Expected transformed size **131,076 bytes** for 21,846 triples; explicitly **twice** padded original bytes. This is a reversible expanded representation, *not compression*. **63 indexed 2,100-byte body chunks** (62 × 2,100 + 876), **21 logical RGB frames**, no filler.
- Formally, `P(x)=x-S/3·(1,1,1)`. `P(x+k·1)=P(x)` whenever allowed by byte bounds; **projected differences alone are not invertible**. Must fail closed for missing S; never invent a reconstruction.
- Independently verify `P²=P`, `P·1=0`, trace 2, rank 2 and integer divisibility over exhaustive 256×256×256 states NOT REQUIRED; verify 729 fixed color triples plus formula proof and adversarial missing-sideband witness.

## Memory bank / recall / eviction

Create **729 fixed slot IDs** `BLOCK:000` ... `BLOCK:728`. They identify memory locations, not permanent contents. Each bank is a FIFO circular array with logical content digest and generation counter, plus an index-to-slot map; accesses increase hit count, eviction deletes index mapping and increments evictions; the slot ID and generation never reset. Test separate raw and projector banks to prevent conflating paths.

- Write 32 indexed raw QR frames' lane packets into bank A; write 63 projected packets into bank B; assert occupancies 32,63 and **zero initial evictions**.
- Read each bank's packet bytes through stored logical base64 lane representation, reverse arrival order, reconstruct source and digest match. For projected bank, also reconstruct the integer projector state. Hits at least 32 and 63 respectively.
- Fill **729 new distinct filler packets** into the projector bank after its 63 original entries. Assert **exactly 63 evictions**, occupancy fixed 729, unchanged 729 slot IDs. Each of the original 63 indexes must then be unavailable; a stale read returns HELD, never fabricated bytes. No claim unlimited memory.

## Seven prescribed fail-closed fault classes

1. Single byte flipped in raw/stored packet body -> per-chunk SHA mismatch HELD.
2. Swapped R/G logical plane while keeping index -> `index%3` mismatch HELD.
3. Duplicate index -> HELD even if byte-equal.
4. Missing required index / fake filler -> HELD.
5. Forged 4-byte LE index -> HELD.
6. Corrupted common-mode `S` -> wrong output or invalid bounds/divisibility -> VERIFIED ROOT SHA mismatch/HELD; differences alone must not be silently completed.
7. Stale memory after FIFO eviction -> HELD, despite persistent slot identity.

Two extra trust controls: (a) a coherent forgery of packet and **all its untrusted local hashes** could be locally self-consistent and must still be tagged `origin_authenticated=false`; (b) projector same-differences/common-shift collision distinguishes "an address" from a lossless memory.

## CI, outputs, falsifiers

Two separately written pure **Python** and **Node 22** implementations (no shared code, no network or dependencies) must agree on a deterministic ASCII full HBP trace and semantic metrics on all platform permutations: Ubuntu/Windows × Python3.11/3.13 + Node22. Require at minimum log lines for source/digests, both 32/63 packet modes, memory allocation/hits/evictions, projector witness, 27 T/A/R synthetic census and each negative result. Reject one intentionally altered full HBP byte. Issue 4 SHA256-sealed HBP/HBI/JSON per-job CI artifact bundles, then commit a new append-only receipt stone only **after** 4/4 green; regenerate and revalidate in follow-up CI.

**Physical validity boundary:** no actual generated QR code pixels, Reed–Solomon encoding/decoding, camera scan, QLED physical channel, actual optical memory device, quantum phase, FTL, biochemical photons or separately attested host. This test validates binary *protocol and storage mathematics only*. The exact physical screen-camera RGB optical carrier must be a distinct subsequent experiment with independent sensor measurements and exposure/threshold controls, not silently claimed by passing this digital test. No automatic merge or release gate changes.
