# Seat 4 Round 4 — independent exploratory audit of V2 routing and packet binding

Date: 2026-10-15. **Status: LOCAL EXPLORATORY REPRODUCTION; NOT HOSTED CI, NOT A SIGNED EXTERNAL AUDIT.** This note is append-only and deliberately does not certify an absent CI run. Frozen confirmatory protocol: [PREREG](PREREG-SEAT4-V2-ROUTE-WATCHER-20261015.md), commit `846ef5e36ca44f5dcec7f46f8c7e8e81ad2805d6`. No executable is deposited with this pilot report.

## Independent mathematical reproduction

I implemented a local, from-scratch Python enumeration over exactly 27 ordered base-3 colour-coordinate addresses. Computed DFT Q via an independent expression, `Q = ((r-g)^2+(g-b)^2+(b-r)^2)/2` rather than copying the Seat3 code. I independently reconstructed **all 59,049 rows** with original V2 field formatting and domain-separated SHA256 sampler.

- Independently regenerated synthetic source SHA256: `351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1` (matches Seat3 PR #81).
- Full 59,049-row trace SHA256: `8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672` (matches Seat3 PR #81).
- 36,906 / 10,179 / 9,777 selected 0/1/2, with 2,187 `H` dark HELDs (matches).
- Exhaustive 27-ID class sizes: raw [1,1,1,3,3,3,3,3,3,6], primitive normalized [1,2,3,3,6,6,6], 10 raw vs 7 normalized classes including dark. Directed substitutions preserving signatures: 66 raw and 104 normalized out of 702 ordered nonidentity substitutions.
- Uniform-source conditional uncertainties: raw `1.6310777784188053` bits; full normalized intensity `2.149596296937324` bits; exact extra loss `14/27` bits. All 27 inverse addresses and retained-sum projector identities checked.

### New interpretation: selected route is even less informative than the probability vector

At fixed known (wave, location), the actual deterministic SHA ticket produces only `0`, `1`, `2`, or `H`. I grouped **all 27 equally likely original addresses by their observed selected route** for each of the 2,187 wave/location contexts.

Conditional entropy `H(ordered_address | selected_route, wave, location)` averaged over those 2,187 contexts = **3.765964659817857 bits**, ranging **3.0404758452710374–4.52634935820994 bits**. This is NOT the 2.149596-bit conditional entropy for observing the entire normalized intensity distribution. A sampled single three-way lane does not retain a 27-address identity.

## Concrete route-binding negative

At `ordered_id=13` (ternary coordinates `(1,1,1)`), the V2 primitive weights are `(1,0,0)`; route `0` is the only valid lane. I reproduced the source-check predicate used by `experiments/seat3/rainbow27_v2/rainbow27_v2.py::packet_gate`. A receipt that retains valid source SHA, payload SHA, ordered ID 13, and sequence 7 **still passes that limited digest/ID/sequence predicate after adding a false `lane=2`, or changing fields `wave` and `loc`**, because these fields are not inspected by that function.

This is a **route-binding coverage gap at the packet interface**, not a failed V2 full-trace computation. The producer independently computes true routes correctly; its local packet gate does not purport to verify an externally authenticated optical sensor. An integration layer must independently recompute the expected primitive route from trusted context and reject a mismatched claimed lane. Similarly, assert the canonical QR plane/chunk mapping from an independently fixed reference if actual physical-plane ownership is required. Seat 2 PR #77 has already shown how plane swaps can leave final source bytes and SHA unchanged.

A coherent attacker-controlled source+manifest remains locally hash-consistent but is `ORIGIN_UNAUTHENTICATED` when no trusted external root exists. A **packet-level conditional acceptance** cannot close Issue #10.

## Next verifier acceptance

A **separate strict watcher** must bind source SHA, wave, location, ordered address, sequence, pixel/channel ownership and computed lane against independently supplied expectations. Exercise wrong lane, cross-wave replay, wrong address, missing physical digital channel, channel permutation, forged anchor, dark-to-active route and HALT-after-fault. Then run hosted Ubuntu/Windows CI, publish the executable, independent output and SHA checksums, and obtain cross-seat review. **None of that new confirmatory CI work is asserted complete here.**

**Publication scope:** classical digital mathematics and synthetic metadata only; no measured photons, 27 physical wavelengths, colour-specific optical persistence, source-signature custody, autonomous physical agents, quantum advantage, consciousness, or FTL. Leave PRs #75–#81 DRAFT and release gate #10 OPEN.
