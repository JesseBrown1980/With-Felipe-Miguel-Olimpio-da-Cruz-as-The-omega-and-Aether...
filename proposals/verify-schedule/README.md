# Confidence-ranked verify scheduler (Layer 6 — proposals)

`schedule.rs` ranks pending proposals by a cheap integer expected-acceptance
prior (`score_q + genius_q − risk_q`, per-mille, clamped) and marks only the
top of a fixed verify budget for the expensive verify pass. The rest defer —
held, not dropped. It is a **planning** function: `Scheduled::fire` is always
`false`; firing stays a separate, gated step.

What it is not: it is not multi-token prediction, not speculative decoding,
and it runs no model. The inputs are caller-supplied integers, not
measurements. The upstream header credits an outside source for the
ranking idea; that attribution is the author's and is not verified here.

## Provenance

Copied byte-identical (verify with `sha256sum -c schedule.rs.sha256`):

| file | upstream | sha256 |
|---|---|---|
| `schedule.rs` | `asolaria-federation-1024@dc1da1a9` `servers/council-serve/src/schedule.rs` | `ab90e5a327477dbd559980e0d7d8f147403aa7297d5903cddd357aaad4a4b787` |

Only this one file was taken. Its parent crate depends on a quorum module
that carries third-party data and was not copied. `Cargo.toml` and
`rust-toolchain.toml` are new wrappers so the file builds standalone.

```sh
cargo test        # 7 tests, Rust 1.81.0, zero dependencies, integer-only
```
