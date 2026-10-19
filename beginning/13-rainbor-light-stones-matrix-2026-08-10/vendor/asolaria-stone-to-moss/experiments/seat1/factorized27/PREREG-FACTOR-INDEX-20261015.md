# Seat 1 preregistration — Rainbow27 factorized light-bank resolver (Round 4)

Date: 2026-10-15. **Frozen before implementation / output.** Originating challenge: Seat 3 mathematical audit draft [PR #85](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/85) reviewing Seat 1 [PR #80](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/80) and Rainbow27 V2 [PR #81](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/81). Build on **PR #80 exact head `7b5faf1103a7b42b603b44b08a5a5bfa994d0f76`**, not on unrelated `main`; retain older records unmodified. This is a separate draft child PR. Do not merge/publish without independent review.

## New falsifiable hypothesis

A 567-row stored Rainbow7 bank index plus the injective **ordered** ternary encoding `sector=9r+3g+b` for `r,g,b ∈ {0,1,2}` permits exactly **27 × 7 × 81 = 15,309** logical addresses to resolve to the **same original 567 bank entries**, without holding a 15,309-row index persistently. This reduces **address metadata**, not stored memory bytes, memory entropy, independent record count, quantum channels or light/physical wavelength count.

The previous 15,309-line expanded index is **2,344,761 B**, original 567-row bank index **70,043 B**, source bank **184,815 B**. Expected removed duplicated metadata **2,274,718 B**, about **97.012787% of expanded index bytes**. The bank remains unchanged. Do not claim physical compression, a photon memory or new measured wavelength capacity. Every logical lookup must preserve `(sector, band, site)` *in the returned address* despite payload aliases. The symmetry of `(S²,Q,Q)` may neither replace nor infer ordered ID; normalized or sampled lanes are routing features only.

## Frozen authenticating references (SHA256 of original bytes)

- 81 original QR-digital source JSON: `02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22`.
- 567-entry base bank JSONL: `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345`.
- 567-entry HBI: `6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee`.
- Old expanded HBI: `2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e`.

**These pinned hashes check against known bytes only; they do not prove who signed or created those references** if the verifier or its anchors are replaced.

## Exact required test protocol

1. Reproduce the legacy QR-digital 81-memory and Rainbow7 567-entry bank using *existing unchanged* producer and verifier programs from PR #80. Fail before reading if the three pinned roots are wrong. Parse the 567 entries, authenticate every payload's offset/length/hash and exact 81-original record ancestry, fail duplicates/gaps and malformed metadata.
2. Implement a production **lazy** resolver storing only 567 rows and the unchanged bank; require `sector` as an integer in [0,26], band in exact `(red,orange,yellow,green,blue,indigo,violet)` and ID in `site-000…site-080`. Compute r,g,b from sector. Do not store an expanded per-sector index.
3. Stream **every** logical address in sector→band→site order to a rolling SHA256 of virtual legacy textual `ADDR|sector=n|r=r|g=g|b=b|band=name|id=site-NNN|offset=x|length=y|source_sha256=h\n`. The streamed checksum **must equal** the published expanded HBI reference and byte count **2,344,761**. No materialized 15,309-row string/list is required for runtime.
4. Read/validate the 15,309 logical resolved references (not 15,309 stored memories), prove 27 sector aliases point to the same base offset/length/SHA for each band/site; all 27 ordered IDs unique and reversible. Frozen dark case sector zero remains representable and is not silently normalized. Demonstrate ordered `(2,0,0)` sector 18 and `(0,2,0)` sector 6 yield identical symmetric intensity but distinct address labels.
5. **Actual corruption controls**, each must fail closed with a named reason: tamper byte in source bank, tamper source JSON, tamper original base HBI, remove one base record, malformed sector negative/27/fraction/string, wrong band/site, conflicting r,g,b vs sector, and stale/wrong externally pinned root. Missing violet removes 2,187 logical resolves and exactly one base row loses 27 aliases. A coherent source+bank+local-hash replacement with the supposedly *trusted* root also replaced is **HELD / not authenticated by hashes alone**; do not report successfully prevented forged origin.
6. Independent Node.js implementation recomputes streamed expanded digest and all 15,309 reads, costs and negative-control results from the three unchanged *original files*, without importing Python producer functions. Python and Node must create byte-identical compact canonical JSON and HBP summary evidence on Ubuntu and Windows; full original input roots remain unchanged.
7. Source-controlled status fields explicitly: `physical_optical_memory_verified=false`, `quantum_effect_verified=false`, `external_origin_authenticated=false`, `compression_of_payload_bytes=0`, `independent_payloads=567`, `original_memories=81`; no implied external privilege or public release authorization.
8. CI must archive all summary receipts, SHA256 sidecars, and both original pinned bank/source/index reference bytes. GitHub-hosted runners are not independently attested physical hosts. Require both OS jobs passing and an artifact download compare job.

**Acceptance:** exact virtual HBI SHA, count, bytes and errors as specified; independent dual-language, dual-OS byte equality, real fault rejection and peer approvals. Divergence becomes INVESTIGATE. No unreviewed merge, no Hugging Face Jobs or releases. Planned reviewers: Seat 3 mathematical reviewer, Seat 2 provenance referee, Seat 4 runtime/adversary, Coordinator #55.
