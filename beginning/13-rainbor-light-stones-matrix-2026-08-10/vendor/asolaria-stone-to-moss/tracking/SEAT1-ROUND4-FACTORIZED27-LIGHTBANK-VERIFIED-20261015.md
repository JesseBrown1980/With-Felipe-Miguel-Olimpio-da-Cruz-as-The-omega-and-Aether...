# Seat 1 — Round 4 factorized ordered Rainbow27 light-bank resolver: execution evidence

**Date:** 2026-10-15. **Status:** SOFTWARE_EXECUTED / SOURCE_PINNED / BYTE_EXACT_CROSS_OS / PEER_REVIEW_PENDING.
This file is a new follow-up to [PR #80](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/80) and [Seat 3 PR #85](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/85); historical source receipts and commits are unchanged. Work published as **draft [PR #86](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/86)** targeting the original Seat 1 PR #80 branch.

## Evidence source and prerequisites

- Preregistration **first independent commit**: `8718ce910c26558d82bb4c4ded052a6929eb5821`.
- Pinned original source PR80 SHA: `7b5faf1103a7b42b603b44b08a5a5bfa994d0f76`.
- Original 81 light-bank JSON SHA256: `02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22`.
- Retained 567-row full-byte bank SHA256: `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345`.
- Retained bank index SHA256: `6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee`.
- Original 15,309-row expanded address index SHA256: `2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e`.
- Final **[GitHub Actions run 38753226025](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38753226025)**: **3/3 PASS** (Ubuntu + Windows software producer/replay, third raw-byte cross-OS artifact parity).
- All four original source/index files above are regenerated from *unchanged* upstream code in CI; their SHA256 is verified at the point of read before any alias is emitted.

## Verified computational results — not physical measurements

| Observable | Exact tested value |
| --- | ---: |
| Original unique memory sources | 81 |
| Full-byte Rainbow7 bank entries retained | 567 |
| Logical ordered sector × rainbow band × site aliases | **15,309** |
| Baseline expanded address index | **2,344,761 bytes** |
| Factorized retained base index | **70,043 bytes** |
| Avoided duplicated metadata | **2,274,718 bytes** |
| Fraction of old expanded-index metadata avoided | **97.012787%** |
| Retained original bank bytes, unchanged | **184,815 bytes** |
| Full-bank payload compression attributable to this change | **0 bytes** |
| Python streaming expanded HBI root | `2480163f…77ec35e` |
| Independently implemented Node streamed root | `2480163f…77ec35e` |
| Independent Python–Node result HBP SHA256 | **`b4d19c59c28b38e1b54a702d6898b98041966bbb5ae6cb14940be16397150f5c`** |
| Active malformed-input and byte-corruption controls per language | **12/12 rejected** |
| Actually removed 81 violet base rows | **2,187 failed** logical aliases, **13,122 retained** |
| Actually removed one red/site-000 base row | **27 failed** logical aliases, **15,282 retained** |

The two implementations use only a 567-entry lookup map and the 184,815-byte bank. `sector=9r+3g+b` derives the three ordered ternary coordinates on demand. Python/Node streamed and SHA256-checked each **old canonical expanded HBI line** without making a persistent expanded address map. All alias lookups validate the underlying payload SHA256. Ordered `(2,0,0)` and `(0,2,0)` retain **distinct logical identity**, even though permutation-invariant three-channel intensity and referenced payload bytes coincide. The dark zero sector remains addressable without inventing a normalized probability distribution.

## Historical correction ledger — retained, not concealed

1. First hosted run **[38752712450](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38752712450)**: original-bank reconstruction, 15,309 streamed expanded hashes and both runtimes passed in Ubuntu and Windows, but Windows **FAILED final byte-for-byte SHA256 sidecar comparison** because Python text-mode emitted CRLF whereas Node emitted LF.
2. Source-only correction at `2ac14d7bf1ddc339a778d8b58f8a7c6ee438f5c3`: write sidecar as explicit ASCII bytes instead of a text stream. **[38752930852](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38752930852) 3/3 green**.
3. Strengthened non-synthetic erasures in both languages: actually delete 81 violet index rows or one red/site-000 entry, probe **all 15,309** virtual aliases in each deletion, verify reason `MISSING_BASE_ROW`, check exact missing/retained counts, and restore the unchanged 567-row map. Final **[38753226025](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38753226025) 3/3 green** with both erasures included.

## Separate security/physics boundaries

**No proof of externally authenticated source**: the fixed SHA values detect departures from these known bytes, not a synchronized replacement of bytes+trusted reference by an attacker with control of both. External origin classification is `HELD`, pending independent signature/witness authority.

The expansion is **address multiplication rather than memory-byte multiplication**. The seven rainbow bands remain logical labels. This is **not** an experimental photonic memory, spectrum measurement, physical light persistence, chemical channelrhodopsin result, 27 independent wavelengths, quantum state, faster-than-light communication or physical throughput benchmark. Running on two GitHub Actions operating systems is not proof of independently attested physical hardware.

## Follow-up peer review

- **Seat 3:** independently challenge factorization, byte arithmetic, streamed address order and 27-address injectivity; review the full result HBP.
- **Seat 2:** try coherent source + pinned-reference replacement, stale source attachment and alternate valid bank with forged anchors.
- **Seat 4:** verify deletion/alias propagation, corrupt access stage, bounded memory cost and optional one-click visualization without equating it to optical hardware.
- **Coordinator #55:** do not merge/release while PR #80 and PR #85 remain draft or until independent peer signoffs and provenance gates are resolved.

No Hugging Face Jobs, automatic merge, remote HF publication, physical measurements or independent host-signature claims were made.
