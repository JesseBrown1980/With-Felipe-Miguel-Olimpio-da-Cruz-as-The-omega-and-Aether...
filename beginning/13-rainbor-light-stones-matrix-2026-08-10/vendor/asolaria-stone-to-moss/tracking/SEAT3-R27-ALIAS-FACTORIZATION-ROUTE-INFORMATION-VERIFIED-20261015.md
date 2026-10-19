# Seat 3 — Independent Round 3 alias-factorization and sampled-lane information audit

**October 15, 2026.** Post-hoc math and storage review, source-pinned **independent reimplementation**, not a blind preregistration or physical experiment. Independent protocol frozen *before the new checker* at commit `7b56c406a306baadf9bbc5d64277de9da80a3cd9`. [Draft PR #85](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/85) preserves all previous Seat 1 / Seat 3 source and evidence. Review upstream [Seat 1 PR #80](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/80), head `7b5faf1103a7b42b603b44b08a5a5bfa994d0f76` and [Seat 3 Rainbow27 V2 PR #81](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/81), head `c32d472dfe84f352450eb50469e0e9a987c33d78`.

## Third independently authored, source-pinned audit

**[Hosted Actions 38749735081](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38749735081): 5/5 PASS** — Ubuntu/Windows × Python 3.11/3.13, **plus fifth check that downloads all four result artifacts and verifies complete byte-for-byte parity and checksum sidecars**. The audit fetched **original previously hosted GitHub Actions artifacts by pinned run IDs**, not self-generated or rewritten summaries:

- PR80 [Actions 38745842295](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38745842295) original artifact `ordered27-rainbow7-ubuntu-latest`, artifact ID `11979425143`, PR80 producer Git blob `025ac142481586fd767f1431328622fc4e2e29e0`.
- PR81 [Actions 38747014513](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38747014513) original artifact `rainbow27-v2-ubuntu-latest-py3.11`, artifact ID `11980006384`, PR81 producer Git blob `097c2d93cc6cfeb6f03a2df75d9529b267dadc44`.

All source artifact SHA256 roots, full counts, 81 individual JSON source site records, 567 band/site rows, 15,309 alias rows, 59,049 original Rainbow27 V2 HBP rows and **each** primitive-weight SHA256 digital selected lane were reconstructed independently from bytes. Six actual independent negative mutations were **HELD** (wrong ordered metadata with same intensity, impossible sector, altered source bank, altered index, altered HBP, missing required source). No upstream code was imported or executed in the checker.

### Theorem 1 — no additional independent stored memories from 15,309 aliases

| Verified original object | Exact bytes | SHA256 |
|---|---:|---|
| 81 original source-record JSON | 16,689 | `02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22` |
| Existing 567-row Rainbow7 bank | 184,815 | `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345` |
| Existing 567-row bank lookup index | 70,043 | `6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee` |
| New 15,309-row sector/band/site index | **2,344,761** | `2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e` |

For every fixed `(band,site)` among the existing 567 bank entries, **all 27 sector identifiers have exactly the same `(offset,length,SHA256)`**. The code independently generated the entire **2,344,761-byte original expanded index byte-for-byte** from the unmodified 70,043-byte original 567-entry index and `sector=9r+3g+b`.

Thus the 27-fold alias expansion is exactly *factorizable*: the full textual index consumes **2,274,718 extra redundant bytes** compared to reusing the existing bank index plus the public ternary sector formula. A factorized lookup representation avoids **97.0127872% of expanded-index bytes**, without changing or dropping any retained payload byte. The expanded index alone occupies **12.68707×** the bank it points to.

This is **metadata economy / removal of repeated pointers**, not 97% compression of the underlying 81 distinct original memory records or additional storage capacity. All 15,309 logical addresses still exist; only 567 stored band/site rows, copies of 81 original records, are referenced. Trust in who assigned `sector` to original measured channel information remains a separate source-authentication question.

### Theorem 2 — normalized intensity loses less information than the FINAL selected pseudo-lane

All 59,049 original cases were independently recomputed for 2,187 fixed `(wave,location)` seeds and 27 possible ordered ternary source IDs at each seed, using the exact SHA256 rejection ticket and primitive-gcd three-channel intensity weights.

For a declared **uniform source distribution over the 27 address IDs at each fixed wave/location**, the following conditional Shannon information quantities are verified:

| Observation known to decoder | Remaining uncertainty of original ordered address |
|---|---:|
| Full trusted ordered index `9r+3g+b` | 0 bits |
| Full normalized-intensity signature, including explicit undefined zero | **2.149596297 bits** |
| Actual pseudo-lane `0,1,2` or dark `H`, with wave/location known | **3.765964660 bits**, averaged across 2,187 seeds |

The final lane selection throws away an **additional mean 1.616368363 bits** beyond the normalized signature. Conditional mutual information between uniformly selected ordered address and actual observed selected lane given wave/location is only **0.988922842 bits** in this specific software test (`log₂27−3.765964660`). Per-seed conditional uncertainty ranges from **3.040475845** to **4.526349358** bits.

For each `(wave,location)`, the normalized primitive intensity signature completely determines the selected lane, so the coarsening is mathematical, not a failure of the software producer. The independent source trace returns the original lane census **36,906 / 10,179 / 9,777** and **2,187 undefined zero inputs held**. The average best exact single-address guess from lane alone under the fixed uniform-source model is **0.109282122**; this is not a measured physical decoder error rate or a prior-independent guarantee.

**Implication:** if the target is a *stable 27-identity ordered light-address universe*, do not attempt to recover the identity from one sampled lane. Retain the source-anchored ordered ID and source/colour amplitude or phase data independently, using the pseudo-lane only as a routing decision. Multiple digital aliases can help navigate, not magically increase the entropy of the underlying stored information.

### Complete receipt and source-root checks

The fifth CI job verified the exact complete file bytes across four hosted configurations:

- **965-byte HBP** `peer-entropy-factorization.hbp` SHA256 `9efc74c0d1ab1a6a80a33dc252969752a500b7ec8ef390479ce68f60b99f6a01`.
- **2,341-byte canonical JSON** `peer-entropy-factorization.json` SHA256 `94737ace9f07a9cfe0370cb1ba9138b2cc58f7f44b6061f180a7178d388448d9`.

Upstream artifacts are finite-lived CI files, not a permanent external physical archive. Subsequent replays must obtain the correctly source-pinned original bytes; **missing artifacts are a HOLD**, not permission to invent replacements.

### Seat handoff and scope

Seat1 should decide whether to replace the expanded index with a factorized resolver behind the *same canonical address semantics*; Seat2 should challenge whether sector-label ownership has an actual independent signer/root rather than only a self-asserted hash; Seat4 should challenge whether observed RGB image planes and physical spectral channels have meaningful provenance in the route/sector references. This independent review **does not** establish any physical photon memory, 27 separate light spectra, quantum advantage, human neural computation, or external source authentication. All historical results and [Release Issue #10](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/10) stay unchanged and PR #85 remains **DRAFT**.
