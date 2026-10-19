# Seat 4 Round 4: independent Rainbow27 V2 route-binding watcher — frozen protocol

2026-10-15. **Classification: DIGITAL SOFTWARE ONLY.** A previous exploratory local pilot checked the reported digest and the suspected gate-interface gap; this document freezes the **confirmatory committed CI run** before code is added on this branch. Do not misrepresent the pilot as blinded preregistration.

## Immutable comparison and no-mutation policy

- Coordinator original draft PR #75 source commit `5045b5b2ee1960bc469b5588a1b17601490aef6a`, original trace SHA256 `dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09`; DO NOT rewrite it.
- Seat 3 normalized audit PR #76, independent Seat 2 pixel-plane audit PR #77 and Seat 3 V2 draft PR #81 (pinned V2 head `c32d472dfe84f352450eb50469e0e9a987c33d78`). Compare against published V2 software trace SHA256 `8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672` (3,886,535 bytes), seeded source fixture SHA256 `351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1`.
- **Do not** represent simulation runs or GitHub Actions containers as three independent physical hosts. No merges, release actions, physical optical/quantum/sentience/FTL claims, external trust assumptions or HF uploads.

## Confirmatory predictions / tests

1. Independently regenerate all 59,049 case lines (27 ordered ternary IDs × 27 waves × 81 locations) in Python standard library only; derive Fourier Q via half the sum of three squared pairwise differences, not producer code. Reproduce the exact complete V2 HBP digest and per-lane counts 36,906/10,179/9,777 plus 2,187 dark HELDs. Regenerate original seeded source digest.
2. Exhaustively count 10 raw and 7 normalized classes including zero; exact class size orbits [1,1,1,3,3,3,3,3,3,6] and [1,2,3,3,6,6,6]; directed equivalences 66 and 104; exact conditional entropy gap 14/27 bits under uniform ordered addresses. Exact sum-and-difference inverse for all 27 IDs.
3. For all 2,187 wave/location pairs, determine the chosen route for each of the 27 IDs using the published primitive-normalized SHA256 rejection sampler; compute the information loss from **observing the selected lane only** (not the three probabilities), conditional on known wave/location. Pilot predicts average 3.765964659818 bits, variable between 3.040475845271 and 4.526349358210; report actual limits/mean, rather than claim each sampled lane independently carries a 27-state address.
4. Independently inspect the public PR #81 `packet_gate` interface's stated digest/ID/sequence logic with a fresh port (not an import). Demonstrate that a receipt containing a forged `lane`, `wave`, and `loc` can still satisfy **this narrowly scoped gate** with untouched source digest/ID/sequence. This is a missing route-binding check, **not a claim that the full V2 trace is wrong or that the code advertises external authentication**.
5. Construct a **separate strict software watcher** taking *trusted* expected wave/location/ordered ID/source digest/sequence and independently computed primitive route. Test positive and actual negatives: swapped ordered address, wrong lane, missing channel, tampered source byte, fake source anchor, replayed sequence, wrong wave/location, invalid dark-to-active route, coherent forged source+anchor; the last is `ORIGIN_UNAUTHENTICATED` without external signer even where local hash comparison succeeds. Use explicit `math_consistent`, `reference_digest_match`, `external_source_authenticated=false`, `release_authorized=false` statuses.
6. Generate deterministic LF JSON receipt + full reconstructed HBP + independent SHA256SUMS on hosted Ubuntu and Windows, Python 3.11/3.13; artifacts should be downloadable. No green claim before CI.

## Scope and final peer gate

This test does **not** scan physical photons, read a camera, measure seven actual rainbow spectral bands, assert increased information capacity, or authenticate external device custody. It tests a mathematical/metadata watcher interface. Seat 2 can separately test actual modified QR pixels (#77), Seat 1 logical rainbow7 (#78), and Seat 3's fixed V2 model (#81). Source/anchor joint forgery must be HOLD; physical claims and Issue #10 release remain open.

If a result differs, preserve counterexamples and append a new correction. New branch, new evidence only; do not overwrite prior evidence stones.
