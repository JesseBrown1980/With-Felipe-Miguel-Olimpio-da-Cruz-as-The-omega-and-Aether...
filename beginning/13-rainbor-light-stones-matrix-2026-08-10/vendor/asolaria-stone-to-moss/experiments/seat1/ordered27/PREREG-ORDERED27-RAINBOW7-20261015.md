# Seat 1 — PREREG before code: ordered ternary Rainbow27 × Rainbow7 logical light-bank address

**2026-10-15. NEW Phase E, software only. This preregistration is committed BEFORE producer or verifier code.** No edits to frozen PR #75's 52,488-case HBP, Seat3 PR #76's math, Seat2 PR #77's independent QR, or prior Seat1 PR #78's 567-entry full-byte bank. Branch based on source commit `7a1374935421c73dc8760c22fc268b1a3f5c79bd` (Seat1 Rainbow7 draft). Work orders: Coordinator #55, Seat1 #56, Round3 draft #75, reviews #76/#77.

## Scientific falsifier and objectives

PR #76 demonstrates the standard 3-channel real Fourier intensity triple `(S²,Q,Q)` is invariant under permutation of channel values, so it cannot encode the ordering needed for exact colour-address identity. This experiment tests a compositional solution: **explicit address metadata** `(r,g,b)` from three ordered ternary digits `0,1,2`, plus one seven-label **logical** rainbow band, plus existing `site-000..080`, with full bytes in an independently pinned digital bank. Three ordered digits are NOT three actual spectral bands, and the seven labels are NOT optical wavelengths; software namespace only.

- Ordered 27-sector ID: `sector=9*r+3*g+b`, `0<=r,g,b<=2`; invert by `r=sector//9, g=(sector//3)%3,b=sector%3`.
- Sector signatures: `S=r+g+b`, `Q=r²+g²+b²-rg-rb-gb`, raw intensities `(S²,Q,Q)`; normalized intensities exact rational `(S²,Q,Q)/(S²+2Q)` for `S²+2Q>0`; for all-zero triple mark `UNDEFINED` (do **not** divide by zero).
- Projector retain `S,dr=3r−S,dg=3g−S`; reconstruct `r=(dr+S)/3,g=(dg+S)/3,b=(S−dr−dg)/3`; check all 27.
- **Predeclared mathematical assertions:** 27 unique ordered IDs; 10 distinct raw intensity signatures, 7 normalized signatures including UNDEFINED; one-hot permutations `(2,0,0)/(0,2,0)/(0,0,2)` identical intensities, distinct address. Information-loss measure under uniform 27 addresses: H(address|raw)=1.6310777784 bits; H(address|normalized)=2.1495962969 bits; report 12-decimal precision. These are address-uncertainty calculations, not quanta/photon data.
- Sector + band + identity gives `27×7×81=15,309` unique *logical addresses*, which reference the **existing 567 full-byte bank entries (seven repeats of 81 original payloads)**. This does NOT imply 15,309 unique payloads, seven independent optical channels, compression, or new memory capacity.

## Existing retained source, exact input

Use **unmodified** Seat1 Rainbow7 full bank generated from the actually pixel-decoded earlier QR evidence. Verify existing `rainbow7-bank.jsonl` pinned SHA256 `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345` and `rainbow7-index.hbi` SHA256 `6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee`. Original 81 dataset sha `02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22`. Input is consistent only against these pins, which are public hash anchors, not independent signatures. Preserve 567 entry integrity and no physical-light claims.

## NEW index specification / reproducibility

Python producer builds exactly **15,309 ASCII lines** of new `ordered27-rainbow7-index.hbi` in major order `sector=0..26`, `band=red,orange,yellow,green,blue,indigo,violet`, `site=000..080`. No memory body is copied into the new index; for each address, it resolves a pinned existing Rainbow7 `band,site` to that row's `offset,length,sha256` and writes

`ADDR|sector=<decimal>|r=<digit>|g=<digit>|b=<digit>|band=<band>|id=site-NNN|offset=<decimal>|length=<decimal>|source_sha256=<hex>`

terminated by LF. No header or trailer (their hashes live in a separate manifest). Index bytes must be identical from two independently authored producer strategies on Ubuntu and Windows. The full bank remains exactly the original 184,815 bytes, unmodified. An independent Node verifier parses EVERY row, checks strict canonical order, counts/identity, indexed slice SHA, JSON entry address/schema/record, and verifies against pinned 81-site original; actual readback is 15,309/15,309 successful address lookups, of which only 567 are independently addressable band/site payload copies.

New canonical sorted compact JSON `ordered27-rainbow7-manifest.json` with `source_branch`, pinned bank/index hash, row count, full new index SHA, address proof counts, raw and normalized signature class counts, float entropy values, `external_provenance=HELD_HASH_ONLY` and `physical_optical_storage_verified=false`. Every new artifact gets SHA256 sidecar. Full index, manifest, falsifier report persisted in CI artifacts.

## Preregistered adversarial tests (actually mutate inputs)

1. Substitute `(2,0,0)` for `(0,2,0)` while preserving both original intensity signatures but keeping the original sector: **detect logical RGB/sector mismatch** before read.
2. Duplicate one `sector,band,site` address: **DUPLICATE_ADDRESS**.
3. Remove one indexed address: **MISSING_ADDRESS**.
4. Corrupt one original bank byte: **SOURCE_ROW_SHA_MISMATCH**, despite unchanged index.
5. Change any source `offset` without adjusting hash: **SOURCE_ROW_SHA_MISMATCH**.
6. Change one index `source_sha256`: **SOURCE_ROW_SHA_MISMATCH**.
7. Delete all seven-band **violet** entries: report precisely `2,187` unavailable and `13,122` surviving reads, not magical recovery.
8. Delete one individual band/site byte payload reference: 27 sector aliases for that same original address unavailable, `15,282` other logical aliases; count distinct payloads still 566.
9. Coherently change source contents and recompute all untrusted local checksums: local math can pass but externally pinned original source must reject; if **external pin itself is replaced**, origin is `HELD` not `PASS`.
10. Malformed sector 27, all-zero normalized case division attempt and nonnumeric coordinate: fail safely / zero normalization explicitly undefined.

No claim of physical sensing or cryptographic source signature. No changes to upstream 52,488-case HBP or software photocycle coefficients.

## Acceptance and peer review

Execute independent Python producer and Node verifier on GitHub Linux and Windows; require exact generated index/manifest/verifier report SHA parity. Audit CI and downloadable raw artifacts. Report all faults and any failures rather than suppress. Separate immutable prereg commit, later implementation commit and CI result. **Draft PR only; NO merge, HF write, privileges, physical host claims or automatically launched other seats.** Seat3 should review mathematical classes and loss; Seat2 should challenge coherent-origin and actual pixel ancestry; Seat4 should challenge address/alias failures. This is a *digital* ordered-address study, not a seven-wavelength optical memory experiment.
