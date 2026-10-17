# Provenance: asolaria-hookwall

Upstream: `asolaria-federation-1024`, commit `dc1da1a9cd88b77eb463053312b7c42a7dbe9b33`,
directory `kernel/core/src/`. The parent crate `kernel-core` (its `lib.rs`, `Cargo.toml` and every
other module) is **not** copied. Only the files below are.

## Copied files

Blob SHA-1 is `git rev-parse <commit>:<path>` of the upstream file. "Copy" is the sha256 of the file
in this crate as it stands now.

| Crate path | Upstream path | Upstream blob SHA-1 | Lines taken | Copy sha256 |
|---|---|---|---|---|
| `src/hookwall/mod.rs` | `kernel/core/src/hookwall/mod.rs` | `1514379e5a7b188562ad7d6f54aeab5baacd7a7b` | all 197 | `a3aa96913a556998981d20c7baef8bd1e6042d41a2543f731970614001d0d111` |
| `src/spawn_gate/mod.rs` | `kernel/core/src/spawn_gate/mod.rs` | `dba09d1886317c056a9b23fc6a723ba457f80abf` | all 188 | `4c9f92e725ba5c662403e68d740b5f019930b35b5f06e1b5c3247ef094b30c4b` |
| `src/sign_gate/mod.rs` | `kernel/core/src/sign_gate/mod.rs` | `883f6c2d84191f2f99b1d79c2c3074910fc3b61c` | all 210 | `2bed84cdcf8e09a1eaf120f51be01b9056093ce477055415438ddc528b23e86b` |
| `src/tier_gate/mod.rs` | `kernel/core/src/tier_gate/mod.rs` | `18e6f793aa36720da58fee1b7abc3e167b68e082` | all 349 | `770c8575ffc00c08efdf1624ef9029727b0d45901617a452402529242222fdfb` |
| `src/crypto/mod.rs` | `kernel/core/src/crypto/mod.rs` | `c4d8d1168fa9a0062822bf709a51f6847bdac9ff` | all 347 | `70ad81e78b7b76d76b01fc5b387c7dfc0224c9d112ab52b2aa6a72597708559e` |
| `src/cosign_chain/mod.rs` | `kernel/core/src/cosign_chain/mod.rs` | `c8342ed32a1d2dc5962b80b6e7a3e9cad4f05ce1` | all 401 | `1578f604c59c158ca3a3dcdccbb6acf71f37777c8a7a51316fd71b00e6e45fbe` |
| `src/syscall/mod.rs` | `kernel/core/src/syscall/mod.rs` | `17d12e5efcd47f7f9c6680c9e45ed9d9d4e45e9a` | first 75 of 752, verbatim | `d97d14a044dfa1da21afbaaff57aed7a2cd7db4c2943bf0b42243facee2f86b4` |

Each file was taken with `git show <commit>:<path>` and checked with `cmp` against the upstream
tree before any edit. `src/syscall/mod.rs` is the upstream file cut after line 75 (`SyscallErr`,
`Handle`, `NanoTime`, `HookwallVerdict`, `AccessTier`); it is unedited.

`src/lib.rs`, `Cargo.toml`, `Cargo.lock` and `rust-toolchain.toml` are new glue. The dependencies are
the upstream workspace declarations, unchanged: `ed25519-dalek 2.1` (no default features,
`zeroize`), `zeroize 1.7` (no default features, `derive`) and `sha2 0.10` (no default features).
`Cargo.lock` pins the versions first resolved for this extract and built on Rust 1.81:
`ed25519-dalek 2.2.0`, `curve25519-dalek 4.1.3`, `zeroize 1.8.2`, `sha2 0.10.9`.

## Edits

Five files differ from upstream **only** in comments, each a one-for-one line replacement, logged
below from the actual diff. `src/crypto/mod.rs` is the one **logic** change: it completes the
upstream "Phase-2" plan and wires `ed25519-dalek` (next section). Line numbers are upstream line
numbers. Recompute any entry with
`git -C <upstream> show dc1da1a9:kernel/core/src/<file> | diff - src/<file>`.

Why the comment edits: no drive path, and no persistence, policy-file, GNN, enforcement, wiring or
operator-attestation claims that the code does not perform. In `sign_gate`, upstream lines 36, 50
and 58 describe ed25519 verification and are kept verbatim, because Phase-2 makes them true; line 11
keeps its ed25519 wording but notes that nothing here calls sign-gate on the entry path. The
sign_gate line 3 "before" text has its drive letter replaced by `<DRIVE>` so this file does not
reintroduce the path; the blob SHA-1 identifies the exact original.

#### `src/hookwall/mod.rs`

- L3
  - before: `` //! Per REPO_LAW Invariant 2: hookwall fires on every syscall. Pre and post hooks emit ``
  - after:  `` //! Per REPO_LAW Invariant 2 (design intent): hookwall fires on every syscall. Pre and post hooks emit ``
- L4
  - before: `` //! verdicts (PROCEED/HOLD/BLOCK) which append to cosign-chain (Invariant 4). ``
  - after:  `` //! verdicts (PROCEED/HOLD/BLOCK). Nothing in this crate calls them automatically or persists them. ``
- L15
  - before: `` /// Slots 0-15 map 1:1 to canonical 16 syscalls; slots 16-63 reserved for Phase-3 expansion (tier-2 cosign required). ``
  - after:  `` /// Slots 0-15 map 1:1 to canonical 16 syscalls; slots 16-63 reserved for Phase-3 expansion (upstream plan: tier-2 cosign; not checked here). ``
- L21
  - before: ``     /// Tier-1 micro: T1 envelopes, auto-allow if signature valid. ``
  - after:  ``     /// Tier-1 micro: `hookwall_pre` returns Proceed (no signature check). ``
- L23
  - before: ``     /// Tier-2 cosign: requires cosign-chain row before PROCEED. ``
  - after:  ``     /// Tier-2 cosign: `hookwall_pre` returns Hold (no cosign-chain row is checked). ``
- L25
  - before: ``     /// Tier-3 firmware: requires quintet cosign + operator-witness. ``
  - after:  ``     /// Tier-3 firmware: `hookwall_pre` returns Block (no cosign or witness is checked). ``
- L58
  - before: `` /// Real impl in Phase-3 reads `hookwall-policy.json` and consults GNN gate. ``
  - after:  `` /// Checks only the slot bound (`Invalid` if >= 64) and the hook tier; reads no policy file or model. ``
- L73
  - before: `` /// [`compose_verdict_row`], and persists it through `crate::cosign_chain::append` ``
  - after:  `` /// [`compose_verdict_row`], and passes it to `crate::cosign_chain::append`, which only ``
- L74
  - before: `` /// (Invariant 4 — append-only audit chain). Returns the verdict-row sequence number ``
  - after:  `` /// hashes it and advances an in-memory counter: no row is stored and nothing persists. ``
- L75
  - before: `` /// implicitly via `Ok(())`; the chain-side sequence is observable via ``
  - after:  `` /// The counter value is discarded (`Ok(())`); the upstream `sys_cosign_append` ``
- L76
  - before: `` /// `sys_cosign_append` semantics. ``
  - after:  `` /// wrapper is not part of this extract. ``
- L101
  - before: `` /// 16 bytes is the minimum size accepted by `cosign_chain::append` for chain-row hash ``
  - after:  `` /// 16 bytes is the minimum size the upstream `sys_cosign_append` accepts for chain-row hash ``
- L102
  - before: `` /// material (`MIN_COSIGN_ROW_BYTES`). This layout is the canonical hookwall-verdict ``
  - after:  `` /// material (`MIN_COSIGN_ROW_BYTES`, not in this extract). This layout is the canonical hookwall-verdict ``

#### `src/spawn_gate/mod.rs`

- L8
  - before: `` //! PURE / E=0: this computes a verdict ONLY. It does NOT append to the cosign chain — the append-only ``
  - after:  `` //! PURE / E=0: this computes a verdict ONLY. It does NOT call the cosign chain; `hookwall_post -> ``
- L9
  - before: `` //! SEAL (hookwall_post -> cosign_chain::append) is a separate, GATED, fire-time step. `seal_row` ``
  - after:  `` //! cosign_chain::append` only hashes a row and advances an in-memory counter (nothing persists). `seal_row` ``
- L10
  - before: `` //! composes the 16-byte HVD witness bytes (still E=0); appending them is the caller's gated job. ``
  - after:  `` //! composes the 16-byte HVD witness bytes (still E=0); storing them is left to the caller. ``
- L78
  - before: `` /// Compose the 16-byte append-only HVD seal row for a gate verdict (reuses ``
  - after:  `` /// Compose the 16-byte HVD witness row for a gate verdict (reuses ``
- L80
  - before: `` /// cosign chain. The actual append (the audit SEAL) is `hookwall_post`, a GATED fire-time step. ``
  - after:  `` /// cosign chain. `hookwall_post` only hashes such a row and advances an in-memory counter. ``

#### `src/sign_gate/mod.rs`

- L3
  - before: `` //! Source: `<DRIVE>:/asolaria-behcs-256/src/hookwall/sign-gate.js` ``
  - after:  `` //! Source: `src/hookwall/sign-gate.js` in the upstream asolaria-behcs-256 JavaScript tree (not vendored). ``
- L11
  - before: `` //! Sign-gate is the security check on the uniform entry: ed25519-verify then deny/allow filter. ``
  - after:  `` //! Sign-gate checks the uniform entry (design intent; not called by `hookwall_pre` here): ed25519-verify then deny/allow filter. ``
- L40
  - before: ``     /// True if envelope was rescued by an allow rule (overrides a deny). ``
  - after:  ``     /// True if any VIRUS-named envvar rescued a deny; this overrides EVERY deny term, not only HD-virus. ``
- L52
  - before: ``     /// Signature missing. ``
  - after:  ``     /// Signature missing, invalid, or the owner key is malformed (every `crypto::verify` failure). ``
- L114
  - before: `` /// Combined gate: verify sig + deny-check + allow-rescue. ``
  - after:  `` /// Combined gate: verify sig + deny-check + unscoped allow-rescue. ``
- L115
  - before: `` /// Returns a full `GateVerdict` recording all 3 sub-decisions. ``
  - after:  `` /// Returns a full `GateVerdict` recording all 3 sub-decisions. Unused by verdict: the rescue is unscoped. ``
- L189
  - before: ``         // crypto::verify stub returns Unimplemented → SignGateErr::SigMissing → sig_valid=false ``
  - after:  ``         // crypto::verify rejects the all-zero key + signature → SignGateErr::SigMissing → sig_valid=false ``

#### `src/tier_gate/mod.rs`

- L1
  - before: `` //! Tier-gating enforcement primitive · Phase-9 Module 1 ``
  - after:  `` //! Tier-gating policy check · Phase-9 Module 1 ``
- L3
  - before: `` //! Per Phase-9-Prep scout + cycle-72 dashboard canon: enforce the **7-tier** access ``
  - after:  `` //! Per Phase-9-Prep scout + cycle-72 dashboard canon: decide the **7-tier** access ``
- L9
  - before: `` //! No agent caller (regardless of cosign) can reach Sovereignty targets; only the ``
  - after:  `` //! `check` returns Deny for every non-Sovereignty caller (regardless of cosign) on Sovereignty targets; only the ``
- L10
  - before: `` //! Sovereignty tier itself (operator-physical) can access anything. ``
  - after:  `` //! Sovereignty caller tier gets Allow on every target. ``
- L12
  - before: `` //! Wiring into `syscall` is performed by the Stoker scout in a non-overlapping change. ``
  - after:  `` //! Standalone policy check: not wired into `syscall`; in this repo only `gate/verdict` calls it. ``
- L21
  - before: `` //! - **Sovereignty** caller (operator-physical): Allow everything ``
  - after:  `` //! - **Sovereignty** caller (a caller-supplied label; nothing here attests operator presence): Allow everything ``
- L63
  - before: `` /// always Allows (operator-physical authority is universal). ``
  - after:  `` /// always Allows. The tier is a caller-supplied label; nothing here attests operator presence. ``

#### `src/cosign_chain/mod.rs`

- L3
  - before: `` //! Per REPO_LAW Invariant 4: cosign-chain is append-only; sha-linked rows; gc preserves audit. ``
  - after:  `` //! Per REPO_LAW Invariant 4 (design intent): append-only, sha-linked rows. `CosignChain` keeps rows ``
- L4
  - before: `` //! Every hookwall verdict + every tier-2+ envelope dispatch appends a row. ``
  - after:  `` //! in memory only; module-level `append` stores no row. Nothing here persists and there is no gc. ``
- L11
  - before: `` //! The `prev_sha16` field chains each row to its predecessor — tampering with row N-k invalidates ``
  - after:  `` //! `prev_sha16` links each row to the previous row's hashed fields; `validate_end_to_end` re-derives it. ``
- L12
  - before: `` //! all rows ≥ N-k via the sha-link. ``
  - after:  `` //! Limits: 64-bit truncated sha256, `sig` is not hashed, and a `kind` containing `|` is ambiguous. ``
- L83
  - before: ``     /// ed25519 signature over the canonical bytes (row + ts + prev + kind + payload). ``
  - after:  ``     /// ed25519 signature over the canonical bytes (row + ts + prev + kind + payload); not verified here. ``
- L135
  - before: ``     /// Signature verification is NOT enforced here yet — that requires real ed25519 ``
  - after:  ``     /// Signature verification is NOT enforced here: `crypto::verify` is real ed25519, but a row ``
- L136
  - before: ``     /// public-key infrastructure plumbed via `crypto` module, landing in v0.3. ``
  - after:  ``     /// carries no signer public key to verify against. ``
- L160
  - before: ``     /// non-empty. Signature verification is skipped (v0.3 wires real ed25519). ``
  - after:  ``     /// non-empty. Signature verification is skipped (rows carry no signer public key). ``
- L163
  - before: ``     /// integrity violation encountered. Useful for boot-time chain integrity checks ``
  - after:  ``     /// integrity violation encountered. Useful for re-validating an in-memory chain ``
- L164
  - before: ``     /// and for re-validating after loading rows from external storage. ``
  - after:  ``     /// (e.g. one built with tampered rows in tests); nothing loads rows from storage. ``
- L200
  - before: `` /// Module-level append entrypoint — wired by `crate::syscall::sys_cosign_append`. ``
  - after:  `` /// Module-level append entrypoint (upstream calls it from `sys_cosign_append`, not in this extract). ``
- L202
  - before: `` /// Phase-3 v0.2.3: hashes `row` via sha256 (canonical witness for the row payload), ``
  - after:  `` /// Phase-3 v0.2.3: hashes `row` via sha256 and drops the digest, then advances an in-memory ``
- L203
  - before: `` /// bumps the in-memory sequence counter, and returns the new chain length (1-indexed). ``
  - after:  `` /// process-wide counter and returns its new value (1-indexed). No row is stored; nothing persists. ``
- L205
  - before: `` /// v0.1 contract: `row` must be ≥ 16 bytes (the caller enforces this via the half-wire ``
  - after:  `` /// v0.1 contract: `row` must be ≥ 16 bytes (only upstream `sys_cosign_append` enforces this ``
- L206
  - before: `` /// rejection); returns `KindMalformed` if the row slice is empty as a defensive check. ``
  - after:  `` /// size); returns `KindMalformed` if the row slice is empty as a defensive check. ``
- L213
  - before: ``     // Computing the digest here keeps the wire honest: callers cannot bypass crypto. ``
  - after:  ``     // The digest is dropped: it is not stored, returned or checked. ``

## Phase-2: `src/crypto/mod.rs` wired to `ed25519-dalek` (logic change)

Upstream (Phase-1) `crypto` declared `ed25519-dalek` and `zeroize` but called neither:

- `sign`/`verify` used a 64-byte tag `sha256(public || ":sign:" || msg) || sha256(that)`. It is
  computed from the *public* key, so anyone holding the public key could make a tag `verify`
  accepted, and `sign_gate`'s signature check was forgeable.
- `derive_public` was `sha256(seed || ":derive:")`, not an Ed25519 public key.
- `PrivateKey` was not zeroized on drop, and its derived `Debug` printed the seed.

Its own comments planned the fix ("Real `ed25519-dalek` binding lands in v0.2", "Phase-2 replaces
this with ed25519-dalek curve signatures"). This crate carries it out:

- `sign`: RFC 8032 Ed25519 via `SigningKey::from_bytes(seed).sign(msg)` (deterministic).
- `verify`: `VerifyingKey::from_bytes` then `verify_strict`, which also rejects small-order (weak)
  public keys and non-canonical signatures. A key that is not a curve point returns `KeyMalformed`;
  every other failure returns `SignatureInvalid`, as the upstream comment on `VerificationFailed`
  planned. `VerificationFailed` and `Unimplemented` stay in the `#[non_exhaustive]` enum but are no
  longer returned. Like ed25519-dalek's strict mode, `verify` accepts mixed-order keys (a key plus a
  torsion component); only that key's holder can sign for it. `sign_gate::SignGateErr::SigMissing`
  now also covers an invalid signature and a malformed owner key (doc updated).
- `derive_public`: the real Ed25519 public key of the seed.
- `PrivateKey` derives `Zeroize` + `ZeroizeOnDrop`; its `Debug` prints `PrivateKey(<redacted>)`.
  `ed25519-dalek`'s `SigningKey` also zeroizes its own copy. Copies a caller takes out of the public
  `.0` field are not covered.
- Removed as dead code after the switch: the Phase-1 helpers `expected_sig_bytes` and `ct_eq`, and
  the `ct_eq` unit test.
- `canonical_envelope_bytes` and the error, signature and key types are unchanged.

Upstream doc lines kept verbatim because they are now true: line 1 (`ed25519 envelope signing`),
line 3 (`Wraps ed25519-dalek 2.1 no_std`), the three length constants, `KeyMalformed`, `Signature`
and `PublicKey`. Still corrected, because they remain untrue: line 4 (the canonical bytes are a
plain concatenation; the IX-700 CBOR form is not implemented), lines 6-7 (no trust roots are
embedded and nothing is read from a TPM or disk), lines 9-10 (the binding is no longer pending).

Tests: the upstream tests are kept, with mismatch results now `SignatureInvalid`; two type-trivial
length assertions were dropped and fixed seeds go through `test_only_key`. New tests cover
RFC 8032 §7.1 TEST 1 (key derivation, signature and verification all exact), a tampered message,
rejection of the Phase-1 tag forged from the public key, the small-order identity-key forgery
(lenient verification accepts it, `verify_strict` rejects it), a non-point public key
(`KeyMalformed`), and the redacted `Debug` plus explicit zeroize.

`src/lib.rs` glue tests: `phase2` checks end to end through `sign_gate::gate_envelope` that a
Phase-1-forged tag is rejected, a genuine signature is admitted, and a genuine signature for a
different envelope is rejected. `known_limitations` pins the unscoped rescue below.

## Key material review

- Test seeds are throwaway repeated-byte fills behind the TEST-ONLY helper `test_only_key(fill)`
  (`crypto`) or `phase2::test_only_key()` (`lib.rs`). They are not real keys.
- `rfc8032_test_1_vector` uses the published RFC 8032 §7.1 TEST 1 secret key. It is a public test
  vector, labelled as such.
- `sign_gate` and `cosign_chain` tests use all-zero `Signature([0u8; 64])` / `PublicKey([0u8; 32])`
  values. These are public and non-secret.
- No PEM blocks, real secret keys, API tokens or trust-root files are present in any file.

## Known upstream limitations (logic not changed)

- `sign_gate`'s allow-rescue is unscoped: any envvar name matching the VIRUS pattern (e.g. `XVIRUS`)
  rescues every deny term (`drift`, `off-fabric`, ...), not only `HD-virus`. Pinned by
  `known_limitations::any_virus_envvar_rescues_every_deny_term`. Because of this, `gate_envelope`
  stays out of `gate/verdict`.
- `deny_check` is a case-sensitive substring match (ported from the JS source), so `DRIFT` or
  `Off-Fabric` pass `spawn_gate`. `gate/verdict` adds a case-insensitive check on top.
- `cosign_chain` stores each row's `sig` but does not verify it: a row carries no signer public key.
- Resolved by Phase-2: forged `sign_gate` signatures (see above).

Not changed and not contamination: upstream host and device labels in comments (`liris`, `acer`,
`USB-SOVLINUX-2TB`, `D-DRIVE-LIRIS` in `syscall` and `tier_gate`, and the hookwall reservation tag).
None is a path, credential or private-person marker. The Sovereignty tier is a caller-supplied
label; nothing here attests operator presence.

## Lints

`cargo +1.81.0 test --locked` passes (62 tests). Plain `cargo +1.81.0 clippy --locked --all-targets
-- -D warnings` fails on upstream code in three places (the first two rows); logic was not changed to
silence them. The third row would be a fourth failure and is handled in source:

| Lint | Location | How it is handled |
|---|---|---|
| `clippy::identity_op` | `src/crypto/mod.rs:77` (`6 * 1`, upstream `canonical_envelope_bytes`) | CI flag `-A clippy::identity_op` |
| `clippy::manual_range_contains` | `src/sign_gate/mod.rs:105` (twice) | CI flag `-A clippy::manual_range_contains` |
| `unused_imports` (rustc) | `src/syscall/mod.rs:8` (`use core::result::Result;`) | `#[allow(unused_imports)]` on `pub mod syscall;` in `src/lib.rs`, because cutting the file at line 75 removed every use |

The CI job `hookwall-gate` runs:

```
cargo +1.81.0 clippy --locked --all-targets -- -D warnings -A clippy::identity_op -A clippy::manual_range_contains
```
