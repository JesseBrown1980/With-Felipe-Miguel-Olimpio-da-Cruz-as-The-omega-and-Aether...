# Fixed-27 RIME wave V2 review

Date: 2026-07-23

## Operator correction

CANON: The 27 are 27 different ordered `-,.,+` values. They are not 27
starting colors, derived colors, or a larger palette.

Canonical order:

`--- --. --+ -.- -.. -.+ -+- -+. -++ .-- .-. .-+ ..- ... ..+ .+- .+. .++ +-- +-. +-+ +.- +.. +.+ ++- ++. +++`

The color/time/space field names are axis projections of each whole value.
Every identity carries one change-state trit. The 27-slot GPU/SGRAM photo stores
one change-state trit per identity in the canonical order.

## Source and runtime gates

MEASURED:

- Rust toolchain: `1.81`.
- C: and D: source hashes match for all seven Rust source files.
- C: format, check, Clippy with warnings denied, and 10/10 tests pass.
- D: format, check, Clippy with warnings denied, and 10/10 tests pass.
- The identity test proves 27 unique width-three tuples, including `---`,
  `...`, and `+++`.
- The textual center glyph is `.`; the V2 validators accept only `-,.,+`.
- The Deep Wave second cascade remains `6×6×6×6×6×12 = 93,312` routes,
  with nearest third `31,104`.

## Receipts, storage, and GPU photo

MEASURED:

- C:/D: structural receipt SHA-256:
  `d265e5025c356e091e665e5f8e7fa92962663372fd0aa046300f80557cee829e`.
- Corrected 27-byte state/photo/storage SHA-256:
  `abf9db7a1e5cb97d01625c78bf31077ac111a0e7e034272a98cba77ee7aa047d`.
- Local, SGRAM, cloud-manifest, GPU readback, C state, and D state are
  byte-identical.
- NVIDIA GeForce GTX 1050 CUDA round trip passes.
- GPU payload:
  `.+-+-.-.++-.-.+.+--.+.+-+-.`
- Identity-order SHA-256:
  `e6cd0965e9b7c58a9e700bceb60a6d4894f6fd1bfe94fdb117e972040e3f000c`.
- Historical V1 `-0+` evidence is preserved under its original names. V2 uses
  new filenames and immutable storage key `fixed27-values-v2`.

## Live system and boundary

CANON:

- Council request `council-q-1784828876034-92rubf`.
- Verdict envelope `868c7c9833c445397553363c9a71f1ad`.
- `CONVERGE: 155/251`; dominant domains:
  `daemons(152), audit(29), language_glyph(24)`.
- Signature `VERIFIED`; schema action `allow`; zero violations.

UNVERIFIED:

- Actual trained GNN/reverse-gain-GNN/FNN/GSLM weights.
- Physical gravity interpretation.
- Real cloud transport. The `cloud-manifest` backend remains a local
  projection until a Codex Cloud task produces independent execution evidence.
- Liris mid-push completion and bilateral clearance.

## Cloud readiness

MEASURED:

- Acer Codex CLI is logged in with ChatGPT and exposes CloudTasks.
- Acer currently has zero cloud tasks and no configured cloud environment.
- The fixed-27 source is not present on the current GitHub branch.
- The current `C:\asolaria-acer` worktree is too dirty to publish safely.

HOLD:

- Do not launch a cloud task until a clean, scoped source branch is visible to
  a configured Codex Cloud environment and Liris confirms its push is complete.
