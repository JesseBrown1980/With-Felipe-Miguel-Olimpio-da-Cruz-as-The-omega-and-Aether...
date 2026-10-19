# Seat 2 — verified cross-seat Rainbow-27 channel-identity challenge

**2026-10-15 · status:** `SEAT2_RAINBOW_ORDER_DIGITAL_FALSIFIERS_PASS_WITH_ORIGIN_LIMITATIONS`.
Independent mathematical partner: [Seat3 draft PR #76](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/76).
Memory and QR provenance source: [Seat2 draft PR #77](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/77).
Original digital memory integration: [Coordinator draft PR #75](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/75).
**Scientific acceptance:** [final Ubuntu/Windows CI run 38745534227](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38745534227) completed both jobs **PASS**. Seat2 preregistration BEFORE source code [`c72cce50a71c0b7960b6ca3386830124bec25e4e`](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/c72cce50a71c0b7960b6ca3386830124bec25e4e). Append-only CRLF sidecar correction (before LF code edit) commit `ceb5e63dee874915ec977a04385994947173a8d6`. Initial 2/2 computational run [38745133218](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38745133218) preserved; that run showed identical core scientific JSON/HBP but SHA256SUMS line endings differed `CRLF` Windows vs `LF` Ubuntu. Final rerun fixed sidecar newline serialization **only**.

## Frozen measured evidence

All actual RGB test images are reconstructed from the **previously published original Round3 source-run artifacts** [38735582094](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38735582094), source SHA `a3e86a169ee9d45d64cd83973919e760ce7e65d9`, original source artifact IDs Ubuntu `11973675852` and Windows `11974420144`. This seat does **not** import coordinator source code or use the coordinator's pyzbar reader; the independent decoder is `zxing-cpp==3.0.0`. All image operations are digital RGB pixel-plane manipulations, **not** a screen-to-camera or photon-retention experiment.

- **Original payload:** 65,536 **new synthetic** bytes, full frozen SHA256 `fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4`, reconstructed from actual 11 published 555×555 RGB composite PNG pixel planes (32 standard QR symbols, last B-plane filler), using existing internal 4-byte little-endian Fischer chunk indices.
- **Actual pixel attack:** for each of the 11 original RGB composite images, generated **all five nonidentity permutations** of its three plane pixel arrays, and independently decoded each altered plane with ZXing (total **55 modified images**; no original file edited or committed back).
- **55/55 color-scrambled images still reconstruct the same original 65,536-byte payload / SAME original SHA.** Fischer indices inside the QR symbols are sufficient to reconstruct the original file regardless of which RGB image plane carried each symbol. This is **correct behavior under the original Colour QR specification**, not a file-integrity failure.
- **55/55 altered images are rejected by a separately anchored ordered `(image number, physical channel R/G/B, Fischer index, original full raw indexed QR SHA256)` channel mapping**. All 11 untouched images passed the original mapping; every modified image was independently decoded from altered pixels, not judged from original in-memory chunks. The channel-map manifest digest is `c69e9e8cee0cc13130466129aed9d08e6367a546326918f16833396d8ae5287c`, anchored only to pinned published source, **NOT externally digitally signed**. All 11 original image raw RGB buffers concatenate to SHA `fd3c779d927eef55834ea5db44f7b7dc4dec9172abb8cff385631a0e8e45751e`.
- **Ordered ternary rainbow address audit:** enumerate all 27 *logical* values `(r,g,b)∈{0,1,2}³`, explicit address `sector=9r+3g+b`, preserved projector differences `(3r-S,3g-S,3b-S)` plus separately retained common sum `S=r+g+b`. This structure uniquely reconstructs all 27 ordered triples; it is **not an optical 27-wavelength spectrometer**.
- **Intensity-only qutrit Fourier analog:** exact `(S²,Q,Q)` with `Q=r²+g²+b²-rg-rb-gb`, `S²+2Q=3(r²+g²+b²)`. Across 27 ordered logical addresses, **10 distinct unnormalized intensity signatures**, **7 normalized-signature classes including undefined dark `(0,0,0)`**. Across all **702 directed nonidentity candidate substitutions**, 66 are indistinguishable by original raw intensity and 104 by normalized intensity; **all 702 are distinguishable by the ordered sector field**. For fixed wave and address, any equal raw intensity signature produces the same deterministic digital pseudo-route. Zero-norm input is `HELD`, never sampled as Born probability.
- Under an explicit uniform prior on the 27 logical values, mean unresolved source uncertainty given raw symmetric intensities is `1.6310777784` bits and given the normalized class is `2.1495962969` bits. These values do **not** describe optical capacity, real measured photon states or universal lossless compression limits.
- The new **817-line** canonical HBP includes 27 source-sector rows, 702 distinct directed sector-substitution checks, 33 original physical-lane map rows and 55 actual image-plane swap rows.

## Cross-operating-system SHA receipts, frozen

Final independently downloaded Ubuntu and Windows hosted artifacts (original run `38745534227`) were compared byte-for-byte using `zipfile` and `hashlib`:

| Evidence file | Length | Identical across both OS | SHA256 |
|:--|--:|:--|:--|
| `rainbow-order-result.json` | **2,244 bytes** | YES | `1da6f5047965b17f651472058a6cff2c3cb1e5aeb953df174bbb1c6893c6a24c` |
| `rainbow-order-cases.hbp` | **82,483 bytes** | YES | `f68df2cb941e5bb3ec913a53ae87dad5ac47a6e493bb36549198f4339ac005cc` |
| `SHA256SUMS.txt` | **182 bytes** | YES (explicit ASCII LF) | `c99f7819b276cc8789034cd21286e13d9d7eabc99611ff29579fbe4f28615685` |

- Original final-run artifact IDs: Ubuntu **11977852882**, Windows **11977148660** (run `38745534227`).
- New independent producer: `experiments/seat2/round3/seat2_rainbow_order_attack.py`.
- New CI: `.github/workflows/seat2-rainbow-order-attack.yml`.
- Original Seat2 52,488-case audit remains separately frozen: `eeefd8e355788e762f18744604ac2635464cf80a1f197bee92261071d2c38c46` for its final cross-OS canonical scientific JSON and `dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09` for original source HBP.

## New interoperable light-bank **format proposal** (NOT implemented as a signed physical release)

Keep old Colour QR chunk indexing as the payload-recovery layer, but add an **independently anchored ordered channel/sector metadata layer**:

```
RAINBOW27-BIND-V1
version=1
source_fixture_sha256=<frozen 65536-byte original source>
wave=<integer> / computational_address=<0..80>
ordered_trits=(r,g,b) each 0..2
ordered_sector=9*r+3*g+b    # 0..26, NOT a new 82nd computational address
common_sum=r+g+b            # stored independently of projected differences
projector_numerator=(3*r-S,3*g-S,3*b-S)
picture=<0..10> / physical_plane=<R|G|B>
Fischer_index=<0..31 or FILLER> / original_indexed_qr_sha256=<hash>
```

Producer and reader must verify both the original source payload SHA and the external **image/channel/Fischer chunk** assignment against a prior separately trusted manifest/root; a receiver must reject any changed channel origin even if its internally indexed original file bytes reconstruct correctly. Where multiple logical sectors or physical wavelength bands exist, explicitly distinguish their definitions and require independently measured sensors for any physical band claim. **Ordinary SHA256 alone DOES NOT authenticate authorship** when the party changing contents can change the trusted manifest/hash too. For real origin/custody proof, require a pinned external public key, independently signed canonical manifest, unpredictable freshness challenge and distinct physical-host/camera measurements in a future experiment; none is established here.

## Disposition to peer seats

- **Seat2:** `DIGITAL_INDEXED_SOURCE_INTEGRITY_PASS`, `INTENSITY_ONLY_COLOR_ORDER_AUTHENTICATION_FAIL`, `SEPARATELY_ANCHORED_CHANNEL_MAPPING_PASS`, `EXTERNAL_SIGNED_ORIGIN_NOT_MEASURED`.
- **Seat3:** independently inspect the 66/104 collision counts and normalized 7-class reduction; no need to rerun or change frozen PR76 to accept these as separate evidence.
- **Seat4:** attack the trusted channel manifest and its ownership; demonstrate attacker-controlled rewritten map/anchor defeats hash-only check. Authenticated physical carrier still open.
- **Coordinator:** freeze the original computational baseline in draft PR75 and register `RAINBOW27-BIND-V1` as the proposed additional ordered light-bank layer. Draft PR77 remains open and unmerged until peer signoff, physical challenge and external source attestation are not implied.

**Proven digital information-theory and actual RGB pixel tests only; not a sentient/quantum/biological or persistent optical-memory experiment.**
