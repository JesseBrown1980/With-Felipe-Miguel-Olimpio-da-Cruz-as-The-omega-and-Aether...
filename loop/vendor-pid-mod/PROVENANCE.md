# Provenance — vendored pid-mod

`src/pid-mod.rs` is vendored **byte-identical** from upstream.

- Upstream repo: `https://github.com/JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything`
- Commit: `29307bfedb512235f69bf7c290ee72b2813c7c92` (2026-08-08)
- Path: `kernels/asolaria-os-metal-kernel/pid-mod.rs`
- git blob id: `816c1fc7d3dae98db525536179115e40137e71df`
- sha256: `a86044324e98ac3b4c59d8dcc5fc1af30686456d74c2ae37d5b56a66bdc076de` (pinned in `UPSTREAM.sha256`)

The file is a `no_std` BEHCS-1024 PID string parser/validator. It carries its own 27 `#[test]`
functions, all of which pass under `cargo +1.81.0 test`. `src/lib.rs` is a thin wrapper that supplies
the `alloc` extern crate the upstream `use alloc::{string::String, vec::Vec}` lines expect, and includes
the vendored file via `#[path]` without altering a byte.

## Owner review flag (privacy rule) — decision pending

The vendored bytes carry personal data of someone other than the owner, in upstream comments and test
vectors (already published in the public upstream repo above). They are cited here by line only:

- a Windows user-directory name inside a file path: line 4;
- an operator role token formed from that person's first name: lines 12, 27, 46, 121, 175 (comments and
  code) and 404, 422, 423, 499, 534, 602, 603 (test vectors), 13 lines in all with line 4.

The owner's own operator role token appears at lines 45, 121, 175, 530 and 598.

BUILD-CONTRACT rule 6 says to vendor only clean files, and the byte-identical requirement and the 27
upstream tests (which use those vectors) rule out redaction. The file stays here unpublished until the
owner decides: if the owner clears these tokens, it is vendored as is; otherwise this crate is dropped
and reported as not brought in.
