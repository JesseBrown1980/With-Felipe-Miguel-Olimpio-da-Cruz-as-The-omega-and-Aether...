# asolaria-qprism-throat

The Q-PRISM **combined throat** (Layer 3 coordinator). It selects recovery
Path 1 (retained-output LZ) or Path 2 (CRT two shadows) from the evidence a
caller actually holds, cross-validates both when both are present, and returns
bytes **only** when they pass a post-recovery SHA-256 check against the pinned
original. Every other outcome is `Held(reason)`: consent withheld, insufficient
evidence, decode failure, cross-path disagreement or integrity mismatch.

It never fabricates bytes: a hash cannot regenerate discarded data, and
selecting a path recovers nothing the evidence does not already carry.

```toml
[dependencies]
asolaria-qprism-throat = "0.1"
```

Bound to the real `decode_path1` / `decode_path2_crt` of
`asolaria-qprism-recovery`. Integer-only, `#![forbid(unsafe_code)]`, Rust 1.81.

License: MIT.
