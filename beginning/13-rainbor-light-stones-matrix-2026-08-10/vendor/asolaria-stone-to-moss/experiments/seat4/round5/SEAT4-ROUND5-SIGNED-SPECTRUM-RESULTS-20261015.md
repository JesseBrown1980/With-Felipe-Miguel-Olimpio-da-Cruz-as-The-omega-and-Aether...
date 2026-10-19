# Seat 4 Round 5 — Signed logical-spectrum source mapping, permutation, erasure and replay

**2026-10-15 | independent mathematical protocol review | CLASSICAL DIGITAL SOFTWARE | REAL SOURCE AUTHENTICATION HELD**

Preregistered FIRST at Git commit `bb27f4e0202e122c18ac5ccfcc6fe856fb260152`. Separate from completed Seat4 compact-address/strict route draft #82. This file is a post-execution interpretation, **not** a backdated preregistration.

## Tested hypothesis and exact result

A seven-band **logical** source assignment is a bijection `f: B -> P`, with `B={red,orange,yellow,green,blue,indigo,violet}` and seven numbered **digital** ports. Freeze `f=[2,5,0,6,1,4,3]` in an Ed25519 authority-signed canonical manifest. A second Ed25519 witness key signs ordered frame evidence, including the original ordered ternary sector `9r+3g+b`, 81 original site identities, source bank digest, frame nonce/epoch/sequence, seven port declarations and seven independently recomputed SHA256 software observation tags. The observer checks both signatures against caller-supplied pinned public keys and a replay ledger.

Two distinct **test-only** signer keys are intentionally reproducible from public deterministic fixture seeds in `sign_spectrum.js`. This is useful for reproducible authentication-policy tests, but anyone can derive these fixture private keys; therefore **NO real external source is independently authenticated**.

The original digital input is **unmodified Seat1 PR #80 archived CI evidence** from run 38745842295 at source Git commit `7b5faf1103a7b42b603b44b08a5a5bfa994d0f76`. Checks: 81 original site-memory JSON SHA `02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22`, 567-bank-row SHA `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345`, base 567-index `6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee`, ordered alias full SHA `2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e`.

### Original cross-OS hosted result (first full execution)

[Actions run #38762814580](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38762814580): **5/5 SUCCESS**, Ubuntu/Windows × Python 3.11/3.13 and independent fifth artifact comparator. Each computation job used Node22 Ed25519 fixture signing and a separately authored Python `cryptography` verifier, independently checking **2,188 signatures** (one mapping plus 2,187 frame signatures). Python also exercised eight separate unsigned-mutant signatures. All four complete scientific receipts and their SHA256SUMS were compared byte-exact.

- **2,187 actual signed digital frames** = 27 logical ordered sectors × 81 sites.
- **15,309 logical source/channel observation bindings** = 2,187 frames × 7 named digital bands.
- **5,039/5,039 nonidentity members of permutation group S7** rejected by pinned signatures after actual digital port and tag reassignment (identity permutation is lawful).
- **19 recorded adversarial/policy findings (including the aggregate permutation sweep)** against signature, source-root, channel-map, one-/two-band erasure, sector trit order, stale epoch/nonce, old sequence, direct replay, changed observed source SHA, witness signer compromise and mapping signer compromise. All intentionally unauthorized scenarios were held in the simulation.
- Important: no one-band or two-band **payload recovery** is claimed. Erasure is a **fail-closed full-observation HOLD**, while previously signed logical sector metadata can still be identified.
- Replay protection depends on a trusted challenge nonce and persistent consumed-sequence state. This test uses a **fixed publicly known nonce for cross-platform reproduction**; restarting the trust ledger is not evidence of physical replay resistance.
- A source and *both* test keys controlled by a hostile actor can fabricate consistent signed digital pseudo-observations, because the tags are pure deterministic hashes of public metadata. No physical spectral photon is witnessed by this experiment.

### First hosted full-byte manifest and evidence digests

| Evidence file | Exact bytes | SHA-256 |
|---|---:|---|
| `seat4-map.json` | 979 | `36f51607b8ff0b39d4af92f80471b7c7878852f3f83c03cec66f9155b18d4ca7` |
| `seat4-signed-frames.jsonl` | 3,822,876 | `72eaf241f5be67e24832e348cb3eac1764a56a2fd4ad24e0be83fc3ec394ffe7` |
| `seat4-results.json` | 2,953 | `4bd638b42ae8b53a1139e775a6446d852e27234013fe1d97c82305ea35cd6d38` |
| `seat4-results.hbp` | 701 | `077bf98dc7c10e3125ce1147270cc927ce978ab63a19ec30e4655267f1770400` |
| `seat4-independent-python.json` | 560 | `dbd071939154683d71ebdd0b38e825bef911df0f31ec1c53b8191fcb8b29687d` |
| `SHA256SUMS` | 438 | `a8c01573563b36e22a4b502326ae05b51068ee3550d1b4a023567cb255e24757` |

The immutable [Seat 4 Round 5 HBP stone](../../../stones/2026-10-15-rainbow81/seat4-round5-signed-spectrum-mapping-20261015.hbp) is committed **after** first hosted evidence, rather than retroactively declared preregistered. Follow-up CI is configured to compare fresh complete regenerated HBP bytes against this record; see exact latest run verdict separately before claiming that final step green.

## Formal implications and falsifiers

**Conditional guarantee:** Given both distinct securely held, independently trusted signing private keys, trusted out-of-band public keys, a fixed authentic source root/assignment and independently controlled nonce+monotonic ledger, a network adversary unable to forge signatures cannot silently substitute any nonidentity port permutation in a signed observer frame. All 5,039 are actual digital tests of this necessary condition. A missing required band must fail complete seven-band acceptance. The signed ordered ID remains logically known, but the erased measurement is not reconstructed.

**What this cannot prove:** distinct test public keys are not independent real custodians. Simulated hashes are not spectra; signing a detector's self-report is not verification the detector measured photons. No 7 spectral frequencies, no independent spectrometer, no signed physical custody, no real light persistence or photon memory, quantum advantage, FTL or neural response. If the source signer and witness collude or the verifier's trusted expected source/map is compromised, signatures alone cannot establish true origin.

## Next external-stage scientific acceptance

To promote from digitally signed test to authentic real-source spectrum mapping, demand **two genuinely independently controlled signing keys**, preapproved public-key identities, spectrometer calibration/wavelength table and uncertainty, real captured raw measurements bound to a fresh challenge nonce and correct instrument channel IDs, independent physical custody records, durable replay-state persistence, and adversarial physical channel swaps/erasures. Report measured photon/detector error rates and distinguish source-origin signature confidence from spectral correctness.

**Status:** mathematical/digital protocol tests PASS. Actual independent authenticated physical spectrum mapping = **HOLD**. PR remains DRAFT; Release Issue #10 remains OPEN, old sources/prerelease unmodified.
