# quants/recovery: quants 22-24

Quants 22, 23 and 24 of the owner's combined quant registry, as the owner's own Rust crates,
vendored byte-identically and tested on Rust 1.81.0.

| n | Registry id | Crate (vendored unchanged) | Tests on 1.81.0 |
|---:|---|---|---|
| 22 | `Q-PATH1-CONTENT-ADDRESS-v1` | `dbbh-coms-quant-prism/` @ `3038680` | 19 passed |
| 23 | `Q-PATH2-CRT-MULTICYLINDER-v1` | `path2-two-shadow-recovery/` @ `e1c6303` (multi-cylinder code from its pull request #1) | 30 passed |
| 24 | `Q-PIE-SHELL-CYLINDER-v1` | the same crate | (included above) |

The atlas names quant 24's owner "Path 2 / Q-PRISM 3D". The Q-PRISM 3D PIE-resolution code
(`qprism-3d-slice-harness@2f48332` `src/lib.rs:642-673`) is already vendored in `quants/exact`.

`crosscheck/` is tests only (13 tests). It reads the registry rows (`vendor/Algorithms-of-Asolaria/…REGISTRY…hbp`,
lines 28-30) and calls these crates side by side with `codec/dbbh-dbwh`, the primary throat, which
ported lines from both. It records the measured differences in both directions. With cylinder 3's
first residue changed on the audit's 1024-byte packet:

| Subset | codec `white_hole_emit` | path2 `recover_from` |
|---|---|---|
| `[0,1,2,3]` | `VerifiedClone(object)` | `Err(InconsistentResidue)` |
| `[2,3]`, and each other two-cylinder subset with cylinder 3 | `Held(AddressMismatch)` | `Ok`: bytes 0-5 differ from the object |
| `[0,1]` | `VerifiedClone(object)` | `Ok(object)` |

The codec reads cylinders in order until their product reaches 2^48 and compares the AGT of that
reconstruction. path2 `recover_from` compares every selected residue and computes no digest. path2
`WatcherGate::verify_projection` compares sha256, every cylinder's shadows and the frequency shells.
With one cylinder selected on the unchanged empty object, the codec returns `VerifiedClone` of the
empty object and path2 returns `Err(InsufficientJointCapacity)`. Both are owner code. Sources, pins,
line maps and every check are in [PROVENANCE.md](PROVENANCE.md).

```sh
sha256sum -c UPSTREAM.sha256
for c in dbbh-coms-quant-prism path2-two-shadow-recovery crosscheck; do
  (cd "$c" && cargo +1.81.0 clippy --locked --all-targets -- -D warnings \
           && cargo +1.81.0 test --locked --all-targets)
done
```
