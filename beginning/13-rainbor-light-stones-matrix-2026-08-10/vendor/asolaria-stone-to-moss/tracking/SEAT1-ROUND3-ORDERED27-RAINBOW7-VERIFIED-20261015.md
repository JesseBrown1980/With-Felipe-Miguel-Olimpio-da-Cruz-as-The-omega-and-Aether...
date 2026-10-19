# Seat 1 — Round 3 ordered Rainbow27 × logical Rainbow7 light-bank scientific evidence

**2026-10-15 · RESULT: EXECUTED_DIGITAL / CROSS_OS_EXACT / PEER_REVIEW_PENDING · physical results NONE**

Separate follow-up to existing Seat 1 draft [PR #78](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/78). Reviewed sources: coordinator Round 3 draft PR #75; mathematical Seat 3 draft #76; provenance Seat 2 draft #77. No changes to those source PRs or frozen HBP values. The preregistration was committed first at **`03a208d9ee7633bb5ca88f2dbacebd5605d8a415`**, before any code. Independent Python production and Node verification follow in separate files. Corrected verification code **`eba20fb0e3b0d607032df91787f3a7acb1b2276f`**.

### Hosted Linux/Windows evidence and byte hashes

**Final [GitHub Actions run 38745842295](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38745842295): 3/3 PASS** — Linux, Windows and third-job full artifact equality. Source pixel-QR readback and previous full bank are regenerated fresh on each runner, independently checked before the new tests. Raw index, JSON manifest and full Node adversarial reports are downloadable from the same run.

| Exact SHA-256 object | Digest | Scope |
|---|---|---|
| Previous 81-site actually decoded digital QR source | `02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22` | Immutable memory source, not independent signature |
| Previous 567 full-data bank | `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345` | 184,815 bytes unchanged |
| Previous bank HBI index | `6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee` | 567 records |
| NEW 15,309-address ordered HBI | `2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e` | Byte-identical OS outputs |
| NEW canonical producer JSON manifest | `ca3d42d39f67b8b6104cd9ec5ee8681f31f2b5b3729fcf29a904642fd153d637` | Byte-identical OS outputs |
| NEW Node adversarial result JSON | `6850a187f4d328440311649b73ecd842fbcde905596458f838a6729d02d3aa93` | Byte-identical OS outputs |

### New mathematical and stored-state results

- **27/27 unique ordered ternary sectors**, with `sector=9r+3g+b`. Explicitly retained `S=r+g+b, dr=3r−S, dg=3g−S` reconstruct original ordered (r,g,b) exactly for all 27.
- Unnormalized real three-channel Fourier intensity `(S²,Q,Q)` supplies **10 signatures**, normalized supplies **7** including `UNDEFINED` at all-zero input. The one-hot permutations (2,0,0), (0,2,0), (0,0,2) collide in intensity; explicit ordered sector ID keeps them distinguishable.
- For uniformly distributed 27 sectors: conditional address uncertainty **1.631077778419 bits** raw vs **2.149596296937 bits** normalized. Intensity alone cannot serve as the unique address.
- **15,309/15,309 exact indexed software reads** across 27 × 7 × 81. These resolve to **567 retained full-byte bank records**, which themselves are only seven labeled replicas of **81 original site memories**. The new index *references* preexisting bytes; no new payload storage capacity or compression is claimed.
- **9/9 active negative controls rejected**, including channel-order substitution with identical intensity; missing and duplicate address; original full-bank byte corruption; shifted offset; forged row digest; actually coherent source+all seven-band-copy checksum manipulation; malformed sector and nonnumeric coordinate.
- **Erasure accounting**: remove the violet band: **2,187** logical lookups unavailable, **13,122** others intact; remove one original band/site bank reference: **27** logical aliases unavailable, **15,282** others intact. Neither missing data nor failed integrity is silently reconstructed.

### Append-only correction: the coherent falsifier must rewrite every duplicate

First new CI run [38745413179](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38745413179) passed original digital-index tests (earlier, weaker counterfeit-failure check). The first stronger adversarial attempt [38745654070](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38745654070) **FAILED for the intended reason:** the test altered one original bank entry but left six band copies untouched; the verifier detected `PINNED_SOURCE_RECORD_DIFFERENT`. This is preserved evidence of a test-fixture mistake, not evidence that an actual coherent forgery succeeded.

The correction in commit `eba20fb0e3b0d607032df91787f3a7acb1b2276f` simultaneously alters **all seven** full-data copies of the original site record and recomputes **all 189** corresponding ordered-sector alias hashes. The forged bank now **passes the locally rewritten, internally consistent** 15,309-case comparison. It nevertheless **fails the original external pinned bank hash**. If the adversary is allowed to replace that original anchor too, the system still has no trustworthy independent source verification; classification **HELD_HASH_ONLY**, not cryptographically authenticated. Full corrected CI **3/3 PASS**.

### Requested independent seats and next true experiment

- **Seat 2**: independently prove the external pin's trust assumptions and execute a counterfeit with full bank/index/manifest changes; compare against independently pinned signed external digest or explicitly HELD.
- **Seat 3**: analytically verify 10/7 class counts, entropies and projector inversion; quantify address redundancy and real extra *bytes* consumed by the new HBI. Does adding a label ever imply a physical wavelength? (Expected no.)
- **Seat 4**: independently implement lookup without this producer code; exercise missing actual source byte, wrong band/sector, image pixel loss, and eventual on-device memory retention as a **separately preregistered hardware test**.
- **Coordinator #55**: keep drafts #75/#76/#77/#78 and this child PR separate until peer review. Avoid summing incompatible case counts. No releases, merges or HF upload authorized by software green CI.

**Evidence boundary:** no physical light bank stick, spectrum-resolved detector, optical storage persistence, biological opsin/channel conductance or neuronal current; classical integer math and actual digital QR image decode only. No quantum or superluminal conclusion. Public SHA-256 is neither an Ed25519 signature nor independent origin authentication.
