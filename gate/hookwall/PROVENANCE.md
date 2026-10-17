# Provenance: asolaria-hookwall

Upstream: `asolaria-federation-1024`, commit `dc1da1a9cd88b77eb463053312b7c42a7dbe9b33`,
directory `kernel/core/src/`. The parent crate `kernel-core` (its `lib.rs`, `Cargo.toml` and every
other module) is **not** copied. Only the files below are.

## Copied files

Blob SHA-1 is `git hash-object` of the upstream file at that commit. "Copy" is the sha256 of the file
in this crate after the edits listed further down.

| Crate path | Upstream path | Upstream blob SHA-1 | Lines taken | Copy sha256 |
|---|---|---|---|---|
| `src/hookwall/mod.rs` | `kernel/core/src/hookwall/mod.rs` | `1514379e5a7b188562ad7d6f54aeab5baacd7a7b` | all 197 | `a3aa96913a556998981d20c7baef8bd1e6042d41a2543f731970614001d0d111` |
| `src/spawn_gate/mod.rs` | `kernel/core/src/spawn_gate/mod.rs` | `dba09d1886317c056a9b23fc6a723ba457f80abf` | all 188 | `4c9f92e725ba5c662403e68d740b5f019930b35b5f06e1b5c3247ef094b30c4b` |
| `src/sign_gate/mod.rs` | `kernel/core/src/sign_gate/mod.rs` | `883f6c2d84191f2f99b1d79c2c3074910fc3b61c` | all 210 | `09acaec7a76c9a7360fcde16ecf197a4cbfd515b55c2aa56d92fd054b0fe089d` |
| `src/tier_gate/mod.rs` | `kernel/core/src/tier_gate/mod.rs` | `18e6f793aa36720da58fee1b7abc3e167b68e082` | all 349 | `770c8575ffc00c08efdf1624ef9029727b0d45901617a452402529242222fdfb` |
| `src/crypto/mod.rs` | `kernel/core/src/crypto/mod.rs` | `c4d8d1168fa9a0062822bf709a51f6847bdac9ff` | all 347 | `56144edb65338356cf953da8e28fda4bf9ce61839a83eb94f9e68946bbbd502f` |
| `src/cosign_chain/mod.rs` | `kernel/core/src/cosign_chain/mod.rs` | `c8342ed32a1d2dc5962b80b6e7a3e9cad4f05ce1` | all 401 | `a27ccb13f0d4421aab8ae3f0a5f11d054cbe5c206704ebdc4e286652bf97cb00` |
| `src/syscall/mod.rs` | `kernel/core/src/syscall/mod.rs` | `17d12e5efcd47f7f9c6680c9e45ed9d9d4e45e9a` | first 75 of 752, verbatim | `d97d14a044dfa1da21afbaaff57aed7a2cd7db4c2943bf0b42243facee2f86b4` |

Each file was taken with `git show <commit>:<path>` and checked with `cmp` against both the upstream
working tree and the earlier critic extract before any edit. `src/syscall/mod.rs` is the upstream
file cut after line 75 (`SyscallErr`, `Handle`, `NanoTime`, `HookwallVerdict`, `AccessTier`); it is
unedited. The 16 syscall functions after line 75 are not included.

`src/lib.rs`, `Cargo.toml`, `Cargo.lock` and `rust-toolchain.toml` are new glue. The only
dependency is `sha2 0.10` (no default features), the one crate the copied code calls. The upstream
crate also declared `ed25519-dalek` and `zeroize`; no copied code calls either, so they are not
declared here. `Cargo.lock` keeps the critic extract's resolved versions for every remaining package.

## Edits

Only comments and test-only seed literals changed; no library logic changed and all 53 upstream
tests still pass. The glue `src/lib.rs` adds 2 tests that pin known limitations (55 in total). Line numbers are upstream line numbers. Each edit replaces one line with one line,
except the crypto test-module insertion (5 lines), which shifts later crypto lines by 5.

Why: the task's honesty rules (no drive path, no persistence / policy-file / GNN / enforcement /
wiring claims the code does not perform), plus two findings made while reading:

- `crypto::sign`/`verify` are **not ed25519**. The 64-byte tag is
  `sha256(public || ":sign:" || msg) || sha256(that)`, computed from the *public* key, so anyone who
  knows the public key can produce a tag that `verify` accepts. The header claimed an ed25519-dalek
  wrapper and TPM key storage; both corrected.
- `PrivateKey` is not zeroized on drop and derives `Debug`; the doc claimed zeroizing.

The sign_gate line 3 "before" text below has its drive letter replaced by `<DRIVE>` so this file
does not reintroduce the path; the upstream blob SHA-1 identifies the exact original.

#### `src/hookwall/mod.rs`

- L3 (comment)
  - before: `` //! Per REPO_LAW Invariant 2: hookwall fires on every syscall. Pre and post hooks emit ``
  - after:  `` //! Per REPO_LAW Invariant 2 (design intent): hookwall fires on every syscall. Pre and post hooks emit ``
- L4 (comment)
  - before: `` //! verdicts (PROCEED/HOLD/BLOCK) which append to cosign-chain (Invariant 4). ``
  - after:  `` //! verdicts (PROCEED/HOLD/BLOCK). Nothing in this crate calls them automatically or persists them. ``
- L58 (comment)
  - before: `` /// Real impl in Phase-3 reads `hookwall-policy.json` and consults GNN gate. ``
  - after:  `` /// Checks only the slot bound (`Invalid` if >= 64) and the hook tier; reads no policy file or model. ``
- L73 (comment)
  - before: `` /// [`compose_verdict_row`], and persists it through `crate::cosign_chain::append` ``
  - after:  `` /// [`compose_verdict_row`], and passes it to `crate::cosign_chain::append`, which only ``
- L74 (comment)
  - before: `` /// (Invariant 4 — append-only audit chain). Returns the verdict-row sequence number ``
  - after:  `` /// hashes it and advances an in-memory counter: no row is stored and nothing persists. ``
- L75 (comment)
  - before: `` /// implicitly via `Ok(())`; the chain-side sequence is observable via ``
  - after:  `` /// The counter value is discarded (`Ok(())`); the upstream `sys_cosign_append` ``
- L76 (comment)
  - before: `` /// `sys_cosign_append` semantics. ``
  - after:  `` /// wrapper is not part of this extract. ``
- L101 (comment)
  - before: `` /// 16 bytes is the minimum size accepted by `cosign_chain::append` for chain-row hash ``
  - after:  `` /// 16 bytes is the minimum size the upstream `sys_cosign_append` accepts for chain-row hash ``
- L102 (comment)
  - before: `` /// material (`MIN_COSIGN_ROW_BYTES`). This layout is the canonical hookwall-verdict ``
  - after:  `` /// material (`MIN_COSIGN_ROW_BYTES`, not in this extract). This layout is the canonical hookwall-verdict ``
- L15 (comment, review round 2)
  - before: `` /// Slots 0-15 map 1:1 to canonical 16 syscalls; slots 16-63 reserved for Phase-3 expansion (tier-2 cosign required). ``
  - after:  `` /// Slots 0-15 map 1:1 to canonical 16 syscalls; slots 16-63 reserved for Phase-3 expansion (upstream plan: tier-2 cosign; not checked here). ``
- L21 (comment, review round 2)
  - before: ``     /// Tier-1 micro: T1 envelopes, auto-allow if signature valid. ``
  - after:  ``     /// Tier-1 micro: `hookwall_pre` returns Proceed (no signature check). ``
- L23 (comment, review round 2)
  - before: ``     /// Tier-2 cosign: requires cosign-chain row before PROCEED. ``
  - after:  ``     /// Tier-2 cosign: `hookwall_pre` returns Hold (no cosign-chain row is checked). ``
- L25 (comment, review round 2)
  - before: ``     /// Tier-3 firmware: requires quintet cosign + operator-witness. ``
  - after:  ``     /// Tier-3 firmware: `hookwall_pre` returns Block (no cosign or witness is checked). ``

#### `src/spawn_gate/mod.rs`

- L8 (comment)
  - before: `` //! PURE / E=0: this computes a verdict ONLY. It does NOT append to the cosign chain — the append-only ``
  - after:  `` //! PURE / E=0: this computes a verdict ONLY. It does NOT call the cosign chain; `hookwall_post -> ``
- L9 (comment)
  - before: `` //! SEAL (hookwall_post -> cosign_chain::append) is a separate, GATED, fire-time step. `seal_row` ``
  - after:  `` //! cosign_chain::append` only hashes a row and advances an in-memory counter (nothing persists). `seal_row` ``
- L10 (comment)
  - before: `` //! composes the 16-byte HVD witness bytes (still E=0); appending them is the caller's gated job. ``
  - after:  `` //! composes the 16-byte HVD witness bytes (still E=0); storing them is left to the caller. ``
- L78 (comment)
  - before: `` /// Compose the 16-byte append-only HVD seal row for a gate verdict (reuses ``
  - after:  `` /// Compose the 16-byte HVD witness row for a gate verdict (reuses ``
- L80 (comment)
  - before: `` /// cosign chain. The actual append (the audit SEAL) is `hookwall_post`, a GATED fire-time step. ``
  - after:  `` /// cosign chain. `hookwall_post` only hashes such a row and advances an in-memory counter. ``

#### `src/sign_gate/mod.rs`

- L3 (comment)
  - before: `` //! Source: `<DRIVE>:/asolaria-behcs-256/src/hookwall/sign-gate.js` ``
  - after:  `` //! Source: `src/hookwall/sign-gate.js` in the upstream asolaria-behcs-256 JavaScript tree (not vendored). ``
- L11 (comment)
  - before: `` //! Sign-gate is the security check on the uniform entry: ed25519-verify then deny/allow filter. ``
  - after:  `` //! Sign-gate checks the uniform entry: `crypto::verify` (sha256 placeholder, not ed25519) then deny/allow filter. ``
- L58 (comment)
  - before: `` /// Verify the ed25519 signature over the envelope canonical bytes. ``
  - after:  `` /// Check the `crypto::verify` placeholder tag (sha256-derived, not ed25519) over the canonical bytes. ``
- L189 (comment)
  - before: ``         // crypto::verify stub returns Unimplemented → SignGateErr::SigMissing → sig_valid=false ``
  - after:  ``         // crypto::verify returns VerificationFailed → SignGateErr::SigMissing → sig_valid=false ``
- L36 (comment, review round 2)
  - before: ``     /// True if signature verified successfully. ``
  - after:  ``     /// True if the `crypto::verify` placeholder accepted the tag; forgeable from the public key alone. ``
- L40 (comment, review round 2)
  - before: ``     /// True if envelope was rescued by an allow rule (overrides a deny). ``
  - after:  ``     /// True if any VIRUS-named envvar rescued a deny; this overrides EVERY deny term, not only HD-virus. ``
- L50 (comment, review round 2)
  - before: ``     /// Algorithm not supported (only ed25519 in v0.1). ``
  - after:  ``     /// Algorithm label is not "ed25519" (the check run is still the sha256 placeholder). ``
- L114 (comment, review round 2)
  - before: `` /// Combined gate: verify sig + deny-check + allow-rescue. ``
  - after:  `` /// Combined gate: placeholder tag check (forgeable) + deny-check + unscoped allow-rescue. ``
- L115 (comment, review round 2)
  - before: `` /// Returns a full `GateVerdict` recording all 3 sub-decisions. ``
  - after:  `` /// Returns a full `GateVerdict` recording all 3 sub-decisions. Not an admission control; unused by verdict. ``

#### `src/crypto/mod.rs`

- L1 (comment)
  - before: `` //! Crypto substrate · Phase-2 Step 28 · ed25519 envelope signing ``
  - after:  `` //! Crypto substrate · Phase-2 Step 28 · placeholder envelope tags (NOT ed25519) ``
- L3 (comment)
  - before: `` //! Wraps `ed25519-dalek` 2.1 no_std. Sign + verify on the BEHCS-1024 envelope wire format ``
  - after:  `` //! Does NOT use `ed25519-dalek` (not a dependency). `sign`/`verify` are sha256 placeholders whose tag ``
- L4 (comment)
  - before: `` //! (canonical bytes per IX-700 schema in `kernel/docs/USERSPACE_ABI.md`, Step 30). ``
  - after:  `` //! is derived from the PUBLIC key, so anyone holding the public key can forge a passing tag. ``
- L6 (comment)
  - before: `` //! Key storage: per-vantage trust roots embedded at build time via `KERNEL_TRUST_ROOTS.json`; ``
  - after:  `` //! Key storage: none. No trust roots are embedded and no key is loaded from a TPM or disk; ``
- L7 (comment)
  - before: `` //! private key lives in TPM or `/sealed/` partition per Phase-9 tier security. ``
  - after:  `` //! callers pass key bytes directly. ``
- L50 (comment)
  - before: `` /// ed25519 private key seed (zeroized on drop in v0.2 via the `zeroize` crate). ``
  - after:  `` /// Private key seed bytes. Not zeroized on drop, and the derived `Debug` prints them. ``
- L15 (comment, review round 2)
  - before: `` /// ed25519 signature length in bytes. ``
  - after:  `` /// Placeholder tag length in bytes (ed25519-sized; not an ed25519 signature). ``
- L18 (comment, review round 2)
  - before: `` /// ed25519 public key length in bytes. ``
  - after:  `` /// Public key length in bytes (ed25519-sized; not parsed as an ed25519 key). ``
- L21 (comment, review round 2)
  - before: `` /// ed25519 private key length in bytes (32-byte seed; full keypair derived). ``
  - after:  `` /// Private key seed length in bytes (ed25519-sized; no ed25519 keypair is derived). ``
- L34 (comment, review round 2)
  - before: ``     /// Provided key bytes do not parse as a valid ed25519 key. ``
  - after:  ``     /// Reserved: no function in this extract returns it. ``
- L42 (comment, review round 2)
  - before: `` /// ed25519 signature wrapped for type safety. ``
  - after:  `` /// 64-byte placeholder tag wrapped for type safety (not an ed25519 signature). ``
- L46 (comment, review round 2)
  - before: `` /// ed25519 public key wrapped for type safety. ``
  - after:  `` /// 32-byte public key wrapped for type safety (not an ed25519 point). ``
- L212 (test-seed)
  - before: ``         let priv_key = PrivateKey([7u8; 32]); ``
  - after:  ``         let priv_key = test_only_key(7); ``
- L223 (test-seed)
  - before: ``         let k1 = PrivateKey([1u8; 32]); ``
  - after:  ``         let k1 = test_only_key(1); ``
- L224 (test-seed)
  - before: ``         let k2 = PrivateKey([2u8; 32]); ``
  - after:  ``         let k2 = test_only_key(2); ``
- L233 (test-seed)
  - before: ``         let sk = PrivateKey([0x11u8; 32]); ``
  - after:  ``         let sk = test_only_key(0x11); ``
- L242 (test-seed)
  - before: ``         let p1 = derive_public(&PrivateKey([0x01u8; 32])).unwrap(); ``
  - after:  ``         let p1 = derive_public(&test_only_key(0x01)).unwrap(); ``
- L243 (test-seed)
  - before: ``         let p2 = derive_public(&PrivateKey([0x02u8; 32])).unwrap(); ``
  - after:  ``         let p2 = derive_public(&test_only_key(0x02)).unwrap(); ``
- L253 (test-seed)
  - before: ``         let sk = PrivateKey([0x42u8; 32]); ``
  - after:  ``         let sk = test_only_key(0x42); ``
- L270 (test-seed)
  - before: ``         let sk = PrivateKey([0xA7u8; 32]); ``
  - after:  ``         let sk = test_only_key(0xA7); ``
- L280 (test-seed)
  - before: ``         let sk = PrivateKey([0x5Cu8; 32]); ``
  - after:  ``         let sk = test_only_key(0x5C); ``
- L313 (test-seed)
  - before: ``         let sk_a = PrivateKey([0x11u8; 32]); ``
  - after:  ``         let sk_a = test_only_key(0x11); ``
- L314 (test-seed)
  - before: ``         let sk_b = PrivateKey([0x22u8; 32]); ``
  - after:  ``         let sk_b = test_only_key(0x22); ``
- between upstream L179 and L180 (test module), inserted:
  ```rust

      /// TEST-ONLY: throwaway seed `[fill; 32]` from a public fill byte. Never a real key.
      fn test_only_key(fill: u8) -> PrivateKey {
          PrivateKey([fill; PRIVATE_KEY_LEN])
      }
  ```

#### `src/cosign_chain/mod.rs`

- L3 (comment)
  - before: `` //! Per REPO_LAW Invariant 4: cosign-chain is append-only; sha-linked rows; gc preserves audit. ``
  - after:  `` //! Per REPO_LAW Invariant 4 (design intent): append-only, sha-linked rows. `CosignChain` keeps rows ``
- L4 (comment)
  - before: `` //! Every hookwall verdict + every tier-2+ envelope dispatch appends a row. ``
  - after:  `` //! in memory only; module-level `append` stores no row. Nothing here persists and there is no gc. ``
- L200 (comment)
  - before: `` /// Module-level append entrypoint — wired by `crate::syscall::sys_cosign_append`. ``
  - after:  `` /// Module-level append entrypoint (upstream calls it from `sys_cosign_append`, not in this extract). ``
- L202 (comment)
  - before: `` /// Phase-3 v0.2.3: hashes `row` via sha256 (canonical witness for the row payload), ``
  - after:  `` /// Phase-3 v0.2.3: hashes `row` via sha256 and drops the digest, then advances an in-memory ``
- L203 (comment)
  - before: `` /// bumps the in-memory sequence counter, and returns the new chain length (1-indexed). ``
  - after:  `` /// process-wide counter and returns its new value (1-indexed). No row is stored; nothing persists. ``
- L205 (comment)
  - before: `` /// v0.1 contract: `row` must be ≥ 16 bytes (the caller enforces this via the half-wire ``
  - after:  `` /// v0.1 contract: `row` must be ≥ 16 bytes (only upstream `sys_cosign_append` enforces this ``
- L206 (comment)
  - before: `` /// rejection); returns `KindMalformed` if the row slice is empty as a defensive check. ``
  - after:  `` /// size); returns `KindMalformed` if the row slice is empty as a defensive check. ``
- L213 (comment)
  - before: ``     // Computing the digest here keeps the wire honest: callers cannot bypass crypto. ``
  - after:  ``     // The digest is dropped: it is not stored, returned or checked. ``
- L11 (comment, review round 2)
  - before: `` //! The `prev_sha16` field chains each row to its predecessor — tampering with row N-k invalidates ``
  - after:  `` //! `prev_sha16` links each row to the previous row's hashed fields; `validate_end_to_end` re-derives it. ``
- L12 (comment, review round 2)
  - before: `` //! all rows ≥ N-k via the sha-link. ``
  - after:  `` //! Limits: 64-bit truncated sha256, `sig` is not hashed, and a `kind` containing `|` is ambiguous. ``
- L83 (comment, review round 2)
  - before: ``     /// ed25519 signature over the canonical bytes (row + ts + prev + kind + payload). ``
  - after:  ``     /// Unverified 64-byte field (no ed25519 here); excluded from the canonical bytes. ``
- L163 (comment, review round 2)
  - before: ``     /// integrity violation encountered. Useful for boot-time chain integrity checks ``
  - after:  ``     /// integrity violation encountered. Useful for re-validating an in-memory chain ``
- L164 (comment, review round 2)
  - before: ``     /// and for re-validating after loading rows from external storage. ``
  - after:  ``     /// (e.g. one built with tampered rows in tests); nothing loads rows from storage. ``

#### `src/tier_gate/mod.rs`

- L1 (comment)
  - before: `` //! Tier-gating enforcement primitive · Phase-9 Module 1 ``
  - after:  `` //! Tier-gating policy check · Phase-9 Module 1 ``
- L3 (comment)
  - before: `` //! Per Phase-9-Prep scout + cycle-72 dashboard canon: enforce the **7-tier** access ``
  - after:  `` //! Per Phase-9-Prep scout + cycle-72 dashboard canon: decide the **7-tier** access ``
- L9 (comment)
  - before: `` //! No agent caller (regardless of cosign) can reach Sovereignty targets; only the ``
  - after:  `` //! `check` returns Deny for every non-Sovereignty caller (regardless of cosign) on Sovereignty targets; only the ``
- L10 (comment)
  - before: `` //! Sovereignty tier itself (operator-physical) can access anything. ``
  - after:  `` //! Sovereignty caller tier gets Allow on every target. ``
- L12 (comment)
  - before: `` //! Wiring into `syscall` is performed by the Stoker scout in a non-overlapping change. ``
  - after:  `` //! Standalone policy check: not wired into `syscall`; in this repo only `gate/verdict` calls it. ``
- L21 (comment, review round 2)
  - before: `` //! - **Sovereignty** caller (operator-physical): Allow everything ``
  - after:  `` //! - **Sovereignty** caller (a caller-supplied label; nothing here attests operator presence): Allow everything ``
- L63 (comment, review round 2)
  - before: `` /// always Allows (operator-physical authority is universal). ``
  - after:  `` /// always Allows. The tier is a caller-supplied label; nothing here attests operator presence. ``

## Key material review

- `crypto/mod.rs` tests built private-key seeds from repeated-byte literals
  (`PrivateKey([0x42u8; 32])` and similar: fills 7, 1, 2, 0x11, 0x01, 0x02, 0x42, 0xA7, 0x5C, 0x22).
  These are not RFC 8032 vectors and not real keys, but they are seeds, so they now go through the
  in-test helper `test_only_key(fill)` labelled TEST-ONLY. Values, and so test behaviour, are unchanged.
- `sign_gate` and `cosign_chain` tests use all-zero `Signature([0u8; 64])` / `PublicKey([0u8; 32])`
  placeholders. These are public, non-secret values and were left as is.
- No PEM blocks, secret keys, API tokens, trust-root files or other embedded key material were found
  in any copied file.

## Known upstream limitations (logic not changed)

Pinned by the glue tests in `src/lib.rs` (`known_limitations`), so a behaviour change shows in CI:

- `sign_gate::gate_envelope` admits a forged envelope. `crypto::verify` accepts
  `sha256(public || ":sign:" || msg) || sha256(that)`, which anyone holding the public key can
  compute, so `sig_valid` is forgeable.
- Its allow-rescue is unscoped: any envvar name matching the VIRUS pattern (e.g. `XVIRUS`) rescues
  every deny term (`drift`, `off-fabric`, ...), not only `HD-virus`.
- `gate_envelope` must stay out of any composition until real ed25519 and a scoped rescue exist.
  `gate/verdict` does not call it.
- `deny_check` is a case-sensitive substring match (ported from the JS source), so `DRIFT` or
  `Off-Fabric` pass `spawn_gate`. `gate/verdict` adds a case-insensitive check on top.

Not changed and not contamination: upstream host and device labels in comments (`liris`, `acer`,
`USB-SOVLINUX-2TB`, `D-DRIVE-LIRIS` in `syscall` and `tier_gate`, and the hookwall reservation tag).
None is a path, credential or private-person marker. `syscall/mod.rs` stays verbatim. The
Sovereignty tier is a caller-supplied label; nothing here attests operator presence (now stated in
the `tier_gate` docs).

## Lints

`cargo +1.81.0 test --locked` passes (55 tests: 53 upstream plus 2 glue pins). `cargo +1.81.0 clippy --locked --all-targets -- -D warnings`
fails on upstream code in three places. Logic was not changed to silence them:

| Lint | Location | How it is handled |
|---|---|---|
| `clippy::identity_op` | `src/crypto/mod.rs:69` (`6 * 1`) | CI flag `-A clippy::identity_op` |
| `clippy::manual_range_contains` | `src/sign_gate/mod.rs:105` (twice) | CI flag `-A clippy::manual_range_contains` |
| `unused_imports` (rustc) | `src/syscall/mod.rs:8` (`use core::result::Result;`) | `#[allow(unused_imports)]` on `pub mod syscall;` in `src/lib.rs`, because cutting the file at line 75 removed every use |

CI command that passes:

```
cargo +1.81.0 clippy --locked --all-targets -- -D warnings -A clippy::identity_op -A clippy::manual_range_contains
```

`.github/workflows/gate.yml` is outside this crate and was not edited. A CI step for this crate must
use the command above, with both `-A` flags. `gate/verdict` clippy passes without them because
path dependencies are not linted there.
