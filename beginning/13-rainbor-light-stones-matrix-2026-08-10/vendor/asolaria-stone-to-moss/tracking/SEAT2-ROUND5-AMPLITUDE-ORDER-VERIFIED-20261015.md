# Seat 2 — verified normalized-amplitude and ordered-rainbow provenance challenge

**Date:** 2026-10-15. **Final classification:** `SEAT2_AMPLITUDE_AND_ORDER_SIDEBAND_DIGITAL_PASS_WITH_ORIGIN_LIMITATIONS`.
**Review branch:** `agent/seat-2/round3-rgb-provenance-20261015`, [draft PR #77](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/77). **Final hosted run:** [#38748210766](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38748210766), Ubuntu Python3.11 and Windows Python3.11 **BOTH SUCCESS**. This review adds a **new sideband-verifier prototype** without modifying frozen Coordinator [PR75](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/75) or Seat3 [PR76](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/76) and without editing prior Seat2 55-plane-swap results.

## Provenance and ordering of scientific acts

1. **Original scientific grounding**: pinned independent Seat3 normalized intensity correction [stone](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/agent/seat-3/round3-qutrit-rainbow27-independent-20261015/stones/2026-10-15-rainbow81/seat3-round3-normalized-intensity-correction-20261015.hbp), 1,259 bytes SHA256 `4d4c4c28ca76f6d97ab1f16916bfe79936e09189e8b8f904b377bbc77a57a69c`. Both hosted jobs separately fetched this file at Seat3 commit `a9f7f73acf3c515de68b0dfff6edc5e30f544e47`, decoded and checked exact bytes/digest **before** tests.
2. **Original image and memory source**: downloaded original coordinator hosted artifacts from run [38735582094](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38735582094), source head `a3e86a169ee9d45d64cd83973919e760ce7e65d9`. Ubuntu and Windows jobs each used their original respective hosted source artifacts. Decoded all 32 original QR image planes via **ZXing-C++**, not coordinator ZBar, obtaining all 65,536 *synthetic* bytes, SHA256 `fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4`. Independently reassembled and verified channel ownership manifest SHA256 `c69e9e8cee0cc13130466129aed9d08e6367a546326918f16833396d8ae5287c`. Source is not a historical JWST file or a physically stored photon.
3. **Prereg first**: [`PREREG-AMPLITUDE-ORDER-BIND-V1-20261015.md`](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/agent/seat-2/round3-rgb-provenance-20261015/experiments/seat2/round3/PREREG-AMPLITUDE-ORDER-BIND-V1-20261015.md) committed FIRST at `549faf01cfe644b298f83f3223e780a1a2ea4f99` before new executable test `14403668639ed42d7ca482a70f9c4673ea55f636` and hosted workflow `3726816c74d231676a5ba00dd7083067c7f8a49c`. Earlier full RGB planes and QR fault suite remain independently available on the original Seat2 branch/CI.
4. **Source**: `experiments/seat2/round3/seat2_amplitude_order_bind.py`. CI workflow `.github/workflows/seat2-amplitude-order-bind.yml`.

## Independent exact mathematical falsification

For all `(r,g,b)∈{0,1,2}³`, define 27 distinct **logical** ordered addresses `sector=9r+3g+b`, free common-mode sum `S=r+g+b`, projector numerators `d=(3r−S,3g−S,3b−S)`, raw Fourier amplitudes/intensity numerators `(S²,Q,Q)`, `Q=r²+g²+b²-rg-rb-gb`.

- Rank-two projection alone loses common mode; the sideband carries sum **separately**, yielding each channel exactly `(d_i+S)/3`. This is NOT an extra Brown-Hilbert computational seat among the 81.
- Of 27 ordered ternary addresses, the raw 3-point DFT intensity has exactly **10** distinct classes. After normalization to proportional probabilities, exactly **7** classes including **1 undefined all-zero class** (6 defined normalized distributions).
- Test enumerated **all 702 directed distinct substitutions**: **66** retain unnormalized intensity, **104** retain normalized probabilities. Every changed candidate was rejected by the **independently pinned, ordered source/amplitude sideband** (not rejected from normalized intensity alone).
- Exact uniform-prior residual uncertainty `H(X|I_raw) = 1.631077778419 bits`; `H(X|I_norm+undefined) = 2.149596296937 bits`; extra loss **exactly `14/27` bits**. No optical storage capacity or spectral experiment follows from these finite-set statements.
- Scale attack `(1,0,0)→(2,0,0)`: same **normalized** probability weights but different raw intensity and source identity. At fixed `wave=0,address=1`, the coordinator's SHA-ticket/modulus selects digital lanes **2** and **1**, respectively. The same common normalized rational quantile chooses lane **1** for both. This is a reproducible **software modulo-denominator dependency**, not evidence normalized intensities distinguish amplitude, photon detection or secure source authentication.
- Another scale-equivalent pair `(1,1,1)→(2,2,2)` has the same normalized `(1,0,0)` distribution yet distinct exact source channels and amplitude. The bounded ternary sector number captures exact trit values only inside this 27-address domain; general intensity measurements require raw amplitude and channel data separately.

## Independently constructed attack bodies and verdicts

Every original sector's sideband was independently generated and validated with source commit SHA, original QR channel-map SHA, wave/address (0/1), exact ordered triple, sector, sum, projector arms, unnormalized intensities and a **deterministically derived identifier (NOT an unpredictable nonce)**. Its consumer checks the *separately pinned* original expected record hash, not the attacker-presented claim.

- **702/702** changed ordered-identity/amplitude substitutions rejected.
- **297/297** explicitly mutated metadata/control records rejected (27 each for `MISSING_R`, `MISSING_G`, `MISSING_B`, corrupted common sum, corrupted projector arms, corrupted deterministic ID, forged source SHA, forged channel-map SHA, wrong wave, wrong address, wrong sector).
- **32/32** removal-of-one-original-QE-indexed-QR-fragment tests rejected against the separately frozen complete indexed source. These remove individually decoded indexed fragments; do not call them 32 new screen-to-camera or photographed physical erasure measurements.
- **1** explicitly compromised reference test shows an adversary replacing both source record **and** supposed trusted root can pass *self-consistent hash-only checks*, while the original separately pinned anchor rejects. **This remains a trust-root vulnerability**, not a security pass.
- **27 original reference records** accepted unchanged; normalized zero input correctly classified HELD in probabilistic routing. No direct real optical/radio hardware or external network privilege tested.

## Reproducibility: downloaded Ubuntu and Windows results are bit identical

Final complete independently downloaded hosted scientific artifacts (Ubuntu Actions artifact `11978424570`; Windows `11979328215`):

| Evidence | Bytes | SHA256 | Byte-identical Ubuntu/Windows |
|---|---:|---|---|
| `seat2-amplitude-order-result.json` | 2,280 | `ab60b0a00c7759dfdb1c23c6b4a3e95ba460b91bd6c195beac74f7509769b73e` | YES |
| `seat2-amplitude-order-cases.hbp` | 234,574 (1,059 rows) | `91674911a5430ba31a67d09c881f543af2db80aa3fa995687ff8fd12423ccfe6` | YES |
| `SHA256SUMS.txt` | 198 | `283bb3696e5cfc1504d4511c5d44fb8bd3ff5583b7e3e995782ab8d680772275` | YES |

The auxiliary captured `summary.txt` differs in platform LF/CRLF newlines; not included as canonical scientific evidence. The two GitHub Actions artifact ZIP containers differ in transport/package metadata. No claim that entire ZIP contents or console summary are byte-identical. CI scientific files are pinned and exactly compared.

## Interpretation and next gate

**Measured digital:** 27-sector ordered amplitude and common-mode recovery; independent falsification of normalized intensity order/amplitude invariants; fail-closed when an independently pinned sideband rejects changed source, address, wave or channel map; genuine QR image-pixel source re-decoding and missing-fragment controls; Ubuntu/Windows exact canonical byte reproduction.

**Not measured/proven:** externally signed source ownership; independent trust root / permission boundary; protected unpredictable physical freshness nonce; 27 physical wavelength bands; an optical persistent memory stick; real camera photon readback; quantum hardware advantage/entanglement; calibrated biological photocycle; conscious light-being; three independently controlled hardware hosts or Release Issue #10 completion.

The present `RAINBOW27-AMPLITUDE-ORDER-BIND-V1` is an **additional software integrity sideband verifier**, not yet a production signed media specification or a deployed module on PR75. Require Seat4 to test reference-and-root replacement; then design a signature/canonicalization protocol with an independently pinned public verification key and fresh authenticated source challenge. Coordinator should leave PR75/PR76 source/historical receipts unchanged, PR77 as **DRAFT** pending peer acceptance.
