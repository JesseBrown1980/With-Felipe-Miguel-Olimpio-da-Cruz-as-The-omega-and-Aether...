# Seat 3 protocol — factorized Rainbow27 × Rainbow7 resolver, strict byte watcher (2026-10-15)

**Frozen BEFORE this branch's implementation.** This work uses already-known PR80/PR81 results, therefore this is a post-hoc engineering construction and independent *implementation* validation, not a blinded scientific preregistration. Historical releases/fixtures must remain untouched.

### Immutable references
- Source 81-site JSON `16689 bytes`, SHA256 `02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22`.
- Source Rainbow7 bank `184815 bytes`, SHA256 `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345`.
- Source Rainbow7 base index `70043 bytes`, SHA256 `6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee`.
- Original Seat1 PR80 expanded 15309-row index `2344761 bytes`, SHA256 `2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e`.
- Original Seat3 PR81 Rainbow27 V2 primitive-weight pseudo-route HBP `3886535 bytes`, SHA256 `8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672` (59049 rows + header).
- Pin original PR80 Git SHA `7b5faf1103a7b42b603b44b08a5a5bfa994d0f76`, PR81 Git SHA `c32d472dfe84f352450eb50469e0e9a987c33d78`; retrieve actual original hosted evidence from source Actions runs `38745842295` and `38747014513`; never regenerate alleged historical artifacts by importing original producer code.

### Exact functional contract

Build a **bounded, load-once 567-key** `FactorizedRainbowResolver` with seven rainbow-band/site keys and the original 184815-byte immutable bank. For **each** logical address `(sector∈[0,26], band∈{red,orange,yellow,green,blue,indigo,violet}, site∈[0,80])`, derive `r=sector//9, g=(sector//3)%3, b=sector%3` and return exact old `ADDR` metadata and a byte-accurate source slice + original verified leaf hash **without caching or materializing 15309 `ADDR` references**. Parse and root-verify *every* base row, validate original 81-site source identity and 7 band-content clones, strictly reject duplicate/missing bank entries, overlap/invalid bounds, bad UTF-8/JSON source and altered byte or SHA. Sector is a logical identity, not a measurable wavelength.

Full Golden:
1. Stream all **15309** generated `ADDR` rows in canonical sector-major/band-major/site-major order directly to a SHA256 accumulator (never store expanded HBI), match original `2344761 B` and SHA256 `2480163...`.
2. Read and verify all **15309 logical sector-band-site lookups** against source bank and original per-row byte hashes; verify 567 source payload references, only 81 unique original records.
3. Optional strict watcher consumes **59049 PR81 source route rows**, independently recomputes exact 3-point qutrit raw `(S²,Q,Q)`, primitive gcd weights, SHA256 ticket `ASOLARIA-R27-V2|TICKET| + LE16(wave) + LE16(location) + LE32(retry)`, UInt256 BE rejection sampling. Compare claimed lane, ordered `id`, RGB metadata and wave/location against derived results before 7 × actual memory reads per row, totaling **413343 full digital bank reads**.
4. Simulation erasure: remove the **violet** bank only for one synthetic wave, confirm exactly `2187` held violet lookups and `13122` available other-band reads in that wave; 27 aliases cannot magically reconstruct erased band rows. No gate requiring a human every simulated step.
5. Security: fail closed on changed `source`, `bank`, `base index`, `expected expanded hash`, wrong sector/RGB alias, wrong band or site, wrong pseudo-route, stale expected wave/location/sequence, corrupted data and all violet-band missing lookups. A locally re-hashed fake source+manifest with attacker-owned roots must remain explicitly **ORIGIN_UNAUTHENTICATED** and not count as source attestation.
6. Create **independent stdlib Python and Node.js implementations**, each replaying original data (do not run producer) and producing byte-identical HBP/JSON results and SHA256 sidecars on Ubuntu & Windows, Python3.11/3.13 and Node22. A final parity job must match all outputs across four matrix jobs. A genuine deliberate tamper test must cause each verifier to reject, even if its own JSON claims PASS. Preserve long traces as CI artifacts only. No arbitrary new data copies under sector aliases.

**Quantitative interpretations:** output reports 15309 addresses, 567 bank-band/site keys, 81 distinct underlying memories, 2344761 expanded bytes versus 70043 existing index bytes (2274718 repeated ASCII metadata bytes avoided by on-demand factorization). Do not equate alias-count with distinct physical information, compression of original bank/payload, quantum/photonic persistence, actual 7 wavelengths, biological ion-channel activity, source-authenticated origin or physically independent execution machines.

### Explicit release gates
- Code and receipts in a new DRAFT PR only; independent Seats 1/2/4 may challenge. Keep prior PR80, PR81, PR83, PR85 and frozen experiments unchanged. Do not automatically merge.
- Source-root integrity is anchored to **previously known GitHub digests**, *not* externally signed physical custody. Flag `source_origin_authenticated=false`. Publishing CI is not optically storing photons.
- Release Issue #10 is separate; do not claim its real host/signing/HF upload gates have passed.
