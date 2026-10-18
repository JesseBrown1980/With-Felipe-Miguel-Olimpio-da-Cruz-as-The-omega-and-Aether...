# 07 — Glyphs and the cosign origin (2026-04-12 → 2026-04-20)

Build-order step 7 of the beginning. In these nine days the index language becomes glyphs and the
federation starts signing what it says. It opens on 2026-04-12 with the D0 runtime and the first session run
entirely in the 256-glyph alphabet, fixes the glyph function on 2026-04-16 (GLYPH-GENESIS), writes the glyph
grammar and the D11 proof levels on 2026-04-17, and on 2026-04-18/19 lays down the ed25519 public-key
registry, the first committed cosign chain, the device-instance key lifecycle, the Shannon civilisation
pipeline with its 23-stage loop, and the device and hardware registries. It closes on 2026-04-20 when the
same packages are committed again as the first trees of `asolaria-behcs-256`.

The owner's words, from the files:

- The 2026-04-12 session commit (`627c511`, "D0 ALIVE + D49 IMPULSE + LAW-011 + 2 orbitals + 256-glyph
  session"): "D0 runtime persistent (PID 40226): signal decay 0.95/5s, inbox consumer 10s, D43→D36 reinfer
  feedback loop, D49 self-originating impulse layer (first impulse: D43_MISTAKE REINFER fired
  autonomously)." "Agent cron kicker (PID 39316): 7 named agents kicked every 5m through BEHCS bus,
  glyph-encoded (IX-700), despawn-heal in every envelope." "Session glyph: Γ>∑£√×D≈". `d0-runtime.js` calls
  itself "the missing nervous system. Turns the 47D brain atlas into a living organism", and "D0 sits UNDER
  all dimensions. Not a new dim — the meta-layer."
- `GLYPH-GENESIS.js`: "The single canonical source of truth. 10 lines of math that carry the entire Falcon
  glyph language. Same input → same glyph on any device, any time, forever. Jesse Daniel Brown — 2026-04-16".
- `kernel/D11-proof-levels.json`: "D11 stamp catalog: PROVEN / OBSERVED / INHERITED / ASSUMED. Created
  2026-04-17 as part of 300B taint cleanup (Priority 1)."
- `packages/kernel/src/ed25519-registry.ts`: "D-055 ed25519 signing-key registry … device-bound: ed25519
  private keys (never leave the device); substrate-independent: signed envelopes (any peer with the public
  key verifies)".
- `packages/kernel/src/cosign-schema.md`: "`prev_sha` is NOT the sha of the previous entry — it's the sha
  of the entire chain up to (but not including) this entry: `prev_sha[i] = sha256( lines[0..i-1].join('\n') + '\n' )`".
- `packages/shannon-civ/src/twenty-three-stage-loop.ts`: "The existing L0-L6 pipeline is 7 stages. Liris
  shipped a 23-stage loop that expands into pre-staging, per-layer gates, and post-verdict cascade."
- `packages/supervisor-registry/src/hardware-registry.ts`: "TRUE UNITY at the hardware level. Every physical
  component (CPU, GPU, disk, RAM, NIC, USB, camera, microphone, firmware blob, radio, sensor) gets a
  BEHCS-256 HW-* glyph and a Brown-Hilbert PID address, and qualifies for its own supervisor."

## What is here

102 files, 884,342 bytes, under `vendor/`, each byte-identical to its source blob (`git hash-object
--no-filters` equals the recorded blob for 102 of 102; `sha256sum -c UPSTREAM.sha256` 102 OK). Three source
repositories: `Asolaria` (the 132-ref mirror), `asolaria-behcs-256` and `asolaria-federation-1024` (full
clones). Every file is read from the earliest commit, across the three, that adds its blob; `PROVENANCE.md`
has one row per file. By part:

- **D0 runtime and the 256-glyph session (2026-04-12, `Asolaria @ 627c511`)**: `tools/behcs/d0-runtime.js`
  (e153f1c0, 34,572 B), the session's data `data/behcs/d0-runtime/{cron-kicks.ndjson, mistakes.ndjson,
  phone-wave-reflect.json, final-self-reflect-pipeline.json, session-summary-20260412.json}`, the Aether
  fabric cube map `data/behcs/cubes/aether-fabric-cube-map.json` (5 agents and 4 nodes, each with its glyph),
  the glyph-encoded `tools/behcs/agent-cron-kicker.js` (the session's `tools/behcs/behcs-sidecar.js` is held, see below),
  `tmp/debora-behcs-v2.py` and `reports/phone-tunnel-smoke-latest.md` — every file the session summary lists
  under `github_needs` except `BEHCS-LAW-011.json`, which step 06 already carries. Beside them
  `tools/behcs/d0-behcs-encoder.js` (0d41ac3a, "Transform D0 runtime output into BEHCS 256-symbol code",
  `asolaria-behcs-256 @ 7d1d37f`, 2026-04-20).
- **GLYPH-GENESIS (authored 2026-04-16)** in JS, TS and Rust: `GLYPH-GENESIS.js` (9fe2f76a, 5,383 B; 256
  alphabet entries; `asolaria-behcs-256 @ 7d1d37f`, 2026-04-20), `packages/kernel/src/glyph-genesis.ts`
  (e8cdcb3c, the kernel's glyph registry, which loads `kernel/glyph-families.json` and reports
  `censusGap = 256 - declaredCount`), and the Rust `no_std` port `kernel/core/src/glyph_genesis/mod.rs` from
  the federation-1024 genesis commit `282b9e9` (f2a8932d, 2026-05-13 10:35) with its rustfmt'd successor
  `e5fb0ee` (63ea26f9, 10:40; the blob aether's `kernel/lane` pin `dc1da1a9` carries) as a variant. The
  Rust header names its source as "`C:/asolaria-behcs-256/GLYPH-GENESIS.js` (sha16=`b06bb7701f8794f7`,
  5383B)"; the vendored `GLYPH-GENESIS.js` has sha256 `b06bb7701f8794f7…` and 5,383 B. Also here: the
  Falcon glyph-language generator `tools/behcs/generate-falcon-glyph-language.js` (2bf81fbc; IX-769 spec,
  IX-770 plan, the `behcs.falcon.hotpath.32.v1` table) and `src/kernel/behcs256-kernel.js` (097b723b,
  "Item 012 · BEHCS-256 canonical kernel", `5673625`, 2026-04-20 18:20).
- **The glyph grammar and D11 (created 2026-04-17)**: `kernel/glyph-families.json` in its earliest committed
  state (8d47afda, 8,898 B, `asolaria-behcs-256 @ f551800`, 2026-04-29) and in the state the Asolaria mirror
  carries at `kernel/` (2d6b9344, 31,614 B, `80bf516`, 2026-04-30); both declare 14 families (dimension,
  proof, drift, shannon, op, profile, law, device, colony, portal, wave, event, mood, meta), the operators
  concat, nest, modify, lift, pipe and mood_tone, the moods M-INDICATIVE / M-EYEWITNESS / M-SUBJUNCTIVE and
  the blast radii device / instance / operation / colony. `kernel/D11-proof-levels.json` (937d112f). The
  `packages/kernel` grammar: `tokenizer.ts`, `parser.ts`, `grammar.ts`, `closure-test.ts`, `index.ts`,
  `__tests__/examples.test.ts`, `package.json`, `tsconfig.json` (`asolaria-behcs-256 @ 7d1d37f`).
- **Keys and the cosign origin (2026-04-18/19)**: the ed25519 public-key registry `kernel/ed25519-registry.json`
  in its first state (957fd1fa, one key, `dev-acer-4abb0a9c`) and after the Liris and Falcon enrolments
  (fb49c0e8, three keys: `dev-acer-4abb0a9c`, `dev-liris-4c19e180`, `dev-falcon-7a3de0cd`); public keys only.
  Its code `packages/kernel/src/{ed25519-registry, binding-classes, key-rotation-scheduler, key-revocation}.ts`
  with their tests, and the entry schema `cosign-schema.{json,md}`. `COSIGN_CHAIN.ndjson` in all three
  committed versions (b4a323e6 20 rows at `b25ebea`, 1006ac99 24 rows at `818a09c`, 9180f7ce 37 rows at
  `6022b69`, all 2026-04-18), the verifiers `scripts/verify-cosign-chain.mjs` and
  `scripts/cosign-entry-sig-verify.ts`, the PRE-006 review `plans/PRE/cosign-review.json`, the K-001 audit
  harness `packages/cosign-audit/{src/harness.ts, tests/harness.test.ts}`, the hardware-mirror records
  `data/cosign/{A-008-legacy-inventory-2026-04-18.md, acer-hw-mirror-2026-04-18.json,
  federation-hw-merge-2026-04-18.json}`, the whole `packages/device-instance` (manifest schema, instance,
  ACER integration, key rotation, binding, and their tests), the two device identities
  `data/device-instance/_asolaria_identity.json` and `_asolaria_falcon_identity.json`, the design notes
  `plans/D/device-bound-instance-as-root.md` (D-054) and `plans/D/hardware-root-anchoring.md` (D-058), and
  the WAVE-IMMUNE-L1 supervisor `packages/immune-l1-supervisor/{package.json, src/daemon.mjs,
  keys/supervisor.ed25519.pub.pem}` (2026-04-20) with its public key only.
- **Shannon civilisation L0-L6 and the 23-stage loop (2026-04-18/19)**: `packages/shannon-civ` — the
  G-087 L3-L5 receiver `acer-dispatch.ts` (two versions), `profile-schema.ts`, `scan-dispatcher.ts`,
  `verdict-tracker.ts`, `l3-profile-cache.ts`, `l4-aggregator.ts`, `l5-cache.ts`, `l6-latency.ts`,
  `twenty-three-stage-loop.ts` (S00_ingress … S22_outcome_commit, 23 stages),
  `l3-l4-signal-primitives.ts`, `index.ts`, `package.json`, eight test files, and the three versions of
  `scripts/acer-dispatch-daemon.mjs` (G-088 to G-090).
- **Device and hardware registries (2026-04-18 / 04-20)**: `packages/supervisor-registry/src/device-registry.ts`
  (d5d596b6 "mirror ontology v2 from liris" and b0fa13bb "mirror canonical ontology v2 from liris (15547
  bytes)", both 2026-04-18), `src/hardware-registry.ts`, the two hardware-mirror demos
  `demo/{run-acer-hw-mirror.ts, absorb-acer-mirror.ts}`, `package.json` and `tsconfig.json`
  (`asolaria-behcs-256 @ 5cfa3e0`, 2026-04-20).

## Measured here

- The three `COSIGN_CHAIN.ndjson` versions are append-only: the 20-row file is a byte prefix of the 24-row
  file, which is a byte prefix of the 37-row file. Recomputing the owner's rolling rule
  (`prev_sha[i] = sha256(lines[0..i-1].join('\n') + '\n')`, row 1 `prev_sha = null`) gives 20 of 20,
  24 of 24 and 37 of 37 rows matching. Rows 36 and 37 carry `entry_sig` (key `dev-liris-4c19e180`); both
  verify as ed25519 against the public key in `ed25519-registry.json` fb49c0e8 over the material
  `cosign-entry-sig-verify.ts` defines (the entry without `entry_sig`, top-level keys sorted,
  `JSON.stringify`). This check ran in the cold lane with Python's `hashlib` and `cryptography` libraries
  and is not part of any vendored file.
- Every row of the 2026-04-18 chain names `"authority":"COSIGN-MERGED-034"`, a row of the earlier merged
  chain (`cosign_chain_merged_canonical_v1`, from 2026-04-06) that aether already keeps at
  `canon-archive/continuity-E--memory/COSIGN_CHAIN.ndjson` (6831c686, 13 rows). That file and these three
  are different chains; nothing here duplicates it.

## Date range

Commits run from 2026-04-12 01:47 -03:00 (`627c511`, the D0 session) through 2026-04-18 17:54 (`77b89d5`,
the first `device-registry.ts`) to 2026-04-20 18:20 (`asolaria-behcs-256 @ 5673625`). Four files were first
committed later but carry earlier content dates: `kernel/glyph-families.json` (committed 2026-04-29 and
2026-04-30, `"created": "2026-04-17"`), `kernel/D11-proof-levels.json` (2026-04-30, created 2026-04-17),
`data/cosign/acer-hw-mirror-2026-04-18.json` and `federation-hw-merge-2026-04-18.json` (2026-04-30,
registered and merged 2026-04-18). The Rust GLYPH-GENESIS port is committed 2026-05-13 (its source
"authored 2026-04-16").

## Held, not vendored (`HELD.hbp`, blob ids only)

- `packages/immune-l1-supervisor/keys/supervisor.ed25519.pem` (22615393, 119 B): an ed25519 private key, the
  build order's held blob; its public half is vendored. The owner was told to rotate it.
- `data/behcs/d0-runtime/self-reflect-law011.json` (7029430e): one line records a phone unlock PIN.
- `tools/behcs/behcs-sidecar.js` (39620274, 28,236 B, `Asolaria @ 627c511`): line 71 hardcodes the Liris peer's
  64-hex auth token in its `PEERS` table. It was vendored at first and moved to `HELD.hbp` by the 2026-10-18
  verification. Its code is a step-7 component (the 2026-04-12 session's sidecar); it can be vendored once
  the token is rotated and the line is redacted.
- The reverse-gain signal taxonomy and its fixtures, held under OWNER-RULES 7.j because they carry a
  worked origin-inference case about named people (names, a date of birth, a residence address, a phone
  number, tax-form declarations) and the owner's home IP:
  `packages/meta-language/src/gnn-signal-taxonomy.ts` (3e1ef7d9, "Enriched signal taxonomy for reverse-gain
  GNN. Pipeline input to Shannon L3/L4 + Gulp-2000 training"), its test 8529a89d,
  `packages/shannon-civ/tests/l3-l4-signal-primitives.test.ts` (46dbe654) and
  `plans/meta-learnings/MANIFEST.json` (482c4db4). The taxonomy's 15 signal classes themselves are generic:
  legal-instrument-self-declaration, sworn-testimony, surname-romanization-prior, given-name-cultural-prior,
  vpn-exit-cluster-affinity, voip-carrier-obfuscator, timezone-activity-window, language-choice-suppression,
  payment-chain-associate, pivot-vs-residence, certificate-signer-regional, population-imbalance-marker,
  candidate-set-completeness, identity-laundering-pattern, document-sec-review-status. The L3/L4
  classifiers that consume them, `packages/shannon-civ/src/l3-l4-signal-primitives.ts`, carry no case data
  and are vendored. If the owner publishes the taxonomy without the case fixture, it can be vendored then.
  No vendored file contains the MASK_GLYPHS set, `mineReverseGain` or `jlMagnitude` (0 files match).

A credential and PII scan ran over every vendored file (gh?_, sk-, AIza, hf_, xox, Bearer, BEGIN PRIVATE KEY,
password=, "token":, private seeds, phone numbers, e-mail addresses, PINs, URLs with user info). Apart from the
held files above it found no credential (the 2026-10-18 verification found one more, the sidecar's peer token, now held); `private_key_b64` appears only as a field name in code, and the
`token.txt` and vault paths in `daemon.mjs`, `hardware-root-anchoring.md` and `cosign-entry-sig-verify.ts`
are paths, not contents. What the vendored files do carry, as committed: the three ed25519 public keys; the
federation's own device identifiers (host names, ADB and disk serial numbers, MAC addresses and RFC1918 LAN
addresses of the federation's machines and phones: DEV-ACER, DEV-LIRIS, DEV-FALCON, DEV-AETHER, DEV-GAIA and
the orbital phones) in the hardware and device registries, the fabric cube map and the device identities;
and the operators' names as the owner's files write them (OWNER-RULES 5). The `jbd.slack-with-natalie-brian`
agent in the cron kicker is an id only: its entry reads "Draft prep ONLY — HD-2 hard-deny on send" and its
check returns the constant `HD2_ENFORCED` without reading anything.

## Not found, and left to other steps

- The four outputs of `generate-falcon-glyph-language.js` (`data/behcs/codex/glyph-language/*.json`) and the
  IX-770 rollout plan: not in the Asolaria mirror, `asolaria-behcs-256` or `asolaria-federation-1024`
  history, and not in aether (searched by path name). They can be regenerated with the vendored generator
  against the IX-700 alphabet in step 06's Falcon tarball, or retrieved from ACER or Falcon.
- `scripts/verify-cosign-chain.mjs` reads `C:/tmp/cosign-chain-binary.ndjson`, and the cosign schema names
  the canonical chain as `liris:9999/cosign-chain.ndjson`; neither location is in these repositories. The
  committed `COSIGN_CHAIN.ndjson` versions are the copies on record.
- Left to step 08 (named there, or committed in its window): `packages/supervisor-registry/src/compile.ts`
  (19579bb8) with `cache.ts`, `index.ts`, `look-type-look-decide.ts` and the six smoke/summon demos of the
  same package, and `src/behcs/reverseGainPromotionGate.js` (cb066da6, 2026-04-24, in the "Add BEHCS
  hardening contracts" batch). Step 09 also names `glyph_genesis`; both of its versions are here, so step 09
  can point to this directory.
- Referenced, not copied, because aether already has them: `BEHCS-LAW-011.json`, `codex-bridge.js`,
  `behcs-bus.js`, the IX-700 alphabet and `tools/shannon-consensus/` (step 06), the merged cosign chain
  (`canon-archive/`), and the later Rust cosign ledger and gate (`ledger/cosign-council`,
  `ledger/cosign-attribution`, `gate/hookwall/src/cosign_chain`, `gate/hookwall/src/crypto`). Replaying the
  2026-04-18 rows through `ledger/cosign-council` is a later step; nothing outside this directory was changed.
