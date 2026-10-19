# Seat 1 — Round 4 preregistration: Seat 3 V2 × ordered Rainbow27 × seven-label digital memory bank

**Pre-code experimental lock, 15 October 2026.** This is a digital cross-seat verification, **not** a new measured optical experiment, physical persistence demonstration, independent-source attestation, or proof of a quantum/Born-process sampler.

## Pinned independent inputs and parent

- Parent **Seat 1 PR #80** branch exact head `7b5faf1103a7b42b603b44b08a5a5bfa994d0f76` (15,309 logical address index, 567 full-byte bank entries, 81 original QR-recovered memories). It is a **draft**; no merge.
- Peer **Seat 3 V2 PR #81** exact head `c32d472dfe84f352450eb50469e0e9a987c33d78` (59,049 Python/Node exact digital normalized routes). Independently verified peer trace SHA-256 `8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672`; V2 source fixture SHA-256 `351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1`.
- Frozen Seat 1 original QR source SHA256 `02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22`; Rainbow7 full-bank `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345`; original 567-entry index `6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee`; ordered 15,309-entry index `2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e`.
- Only fixed source head/trace hashes and remote checkout commits are trusted **as GitHub repository contents**; they are **not** independently authenticated physical memory or external publisher identity.

## Independent crosswalk hypothesis (fail-fast)

Seat 3's V2 routing `(S²,Q,Q)`, gcd-primitive normalisation and SHA-ticket lane may be used as a deterministic **route hint**, *only if* the original ordered ternary `id=9r+3g+b` remains an explicit separate key into Seat 1's seven symbolic labels and 81 original QR site records. V2's intensity loses the identity, and V2 source bytes are a synthetic **different fixture** from Seat 1's QR payload. A route may navigate an independently source-pinned bank, but V2's synthetic 256-byte source bytes MUST NOT be treated as equivalent to or substituted for the 65,536-byte QR memory fixture.

## Fixed test matrix and deterministic trace

Crosswalk all V2 `27 waves × 81 locations × 27 ordered sectors = 59,049` published `CASE` rows in fixed `wave,location,id` order against **all seven** Seat 1 original bank bands `red,orange,yellow,green,blue,indigo,violet` for the same indexed site. This means **413,343 actual logical alias lookups**, but still only **567 unique persisted bank entries and 81 source memory records**. Dark `(0,0,0)` rows have `lane=H` and **still retain ordered key/memory**; no route is taken. All other rows have integer `lane∈{0,1,2}` from mathematically normalized primitive weights. Separate the sampled lane, ordered address and band label; never silently equate them.

Independent crosswalk producer must reconstruct `RGB=id//9,(id//3)%3,id%3`, `S=r+g+b`, `Q=r²+g²+b²-rg-rb-gb`, `raw=(S²,Q,Q)`, primitive by integer gcd; independently derive seeded sample from SHA256('ASOLARIA-R27-V2|TICKET|' + 2-byte LE wave + 2-byte LE location + 4-byte LE retry), rejection before modulo primitive sum, `H` for zero. Require exact agreement with **every** peer V2 `CASE` line, its source-pin header and frozen trace SHA.

For every live crosswalk row, make seven actual indexed bank lookups; parse exact original `JSONL` bytes at advertised offsets/lengths, check per-record SHA256, decode the record, and compare the site's stored original source payload against the correct QR record. Retain a canonical ASCII line per route `ROUTE|w=NN|loc=NN|id=NN|rgb=RGB|lane=L|lookups=7|site_sha256=HEX` where `site_sha256` is SHA256 of deterministic compact, recursively sorted ASCII-safe JSON of site source object (chosen as a fixture hash, not a signature). Result count 59,049 + header/footer lines; across Linux and Windows require identical bytes and SHA256, separate from all existing frozen traces.

Expected numerics: 59,049 V2 rows, 413,343 logical lookups, 2,187 zero held, 56,862 routed, 27 distinct ordered addresses, 7 symbolic band labels, 81 original source identities, 10 raw intensity classes, 7 normalized including undefined zero, H(X|I_norm) ≈ 2.1495962969373235 bits. The lane census should equal peer V2's observed `[36906,10179,9777]`, but a different published peer digest/census is a **failure** until reviewed, not a changeable constant.

## Preregistered falsification controls (actually mutate inputs, not assertion labels)

1. **Permuted-address forgery:** choose a row with original `id=18` (200) and swap `rgb` to (020) **without correcting id**; reject prior to bank read even though intensity primitive and route lane collide.
2. **Amplitude tamper:** mutate `rgb=100` into `200` without correcting ordered id; reject even though normalized intensity and SHA-selected lane collide.
3. **Wrong destination:** change `band=violet` lookup to `band=red` under a claimed violet label; reject as wrong provenance-bound alias, even if site payload is identical.
4. **Missing channel:** drop all violet entries for a wave; do not claim 7/7 full-band readback. The 2,187 wave×sector×site lookup failures for missing one symbolic band MUST be surfaced, not magically reconstructed. Existing 6 bands remain locally available.
5. **One-byte stored bank mutation:** alter a byte at an exact pinned offset without modifying source pin; fail at entry digest or JSON parse.
6. **Duplicated or stale location:** change `loc` in a V2 case without matching the pinned frame address; reject at sequence/address stage even where sampled lane coincidentally matches.
7. **Coherently forged local data:** if attacker changes source, bank and local expected hashes together, internal agreement **may pass**, but external origin remains `HELD_UNAUTHENTICATED`. Pinned external source digest must reject altered bank.

## Governance

Run after prereg commit, independent Seat 1 Python crosswalk against Seat 3's **unmodified exact pinned** V2 Python and Node outputs, original Seat 1 QR/regenerated seven-band source, on Ubuntu/Windows. Store readback traces, SHA256 sidecars, numeric counts, review-able negative-control evidence and the exact code/source Git SHA in a new draft PR to the Seat 1 #80 branch. Seek mathematical review by Seat 3 and source review by Seat 2 on coordinator Issue #55. No auto-merge, no paid HF Jobs, no releases or physical/light claims.
