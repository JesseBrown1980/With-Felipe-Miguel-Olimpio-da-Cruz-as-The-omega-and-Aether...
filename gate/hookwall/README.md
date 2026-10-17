# asolaria-hookwall

Layer-5 gate primitives for the Asolaria stack, extracted from the
`asolaria-federation-1024` kernel (`kernel/core/src` at `dc1da1a9`).
`no_std`, `#![forbid(unsafe_code)]`, Rust 1.81.

| Module | What it does |
|---|---|
| `crypto` | RFC 8032 **Ed25519** via `ed25519-dalek`: `sign`, `verify` (`verify_strict`: also rejects small-order keys and non-canonical signatures), `derive_public`. `PrivateKey` is zeroized on drop and its `Debug` is redacted. |
| `sign_gate` | Ed25519 check over envelope bytes, then a deny-tag filter. Its allow-rescue is unscoped (see limits). |
| `hookwall` | Pre/post hook verdicts from a slot bound and a hook tier. |
| `spawn_gate` | Deny tags plus forward/reverse score thresholds; strictest wins. |
| `tier_gate` | Caller→target 7-tier Allow / Escalate / Deny policy. |
| `cosign_chain` | In-memory hash-linked rows; nothing persists. |

```rust
use asolaria_hookwall::crypto::{derive_public, sign, verify, PrivateKey};

let key = PrivateKey(seed); // 32 secret bytes from a CSPRNG
let public = derive_public(&key)?;
let sig = sign(b"envelope bytes", &key)?;
assert!(verify(b"envelope bytes", &sig, &public).is_ok());
```

## Limits

- Scores, tiers and tags are caller-supplied values, not measurements.
- `sign_gate`'s VIRUS-envvar rescue clears every deny term, so `gate_envelope`
  is not used for admission in this stack. `asolaria-verdict` composes the
  other gates instead.
- `cosign_chain` stores row signatures but does not verify them: a row has no
  signer public key.
- Copies a caller takes out of `PrivateKey.0` are not zeroized.

Every edit relative to upstream, with blob hashes, is in `PROVENANCE.md`.
License: MIT OR Apache-2.0.
