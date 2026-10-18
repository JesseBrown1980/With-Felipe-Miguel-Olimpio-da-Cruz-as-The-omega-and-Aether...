# ASOLARIA MATRIX IN COLOUR

Ultra-high-quality **lossless** colour photographs of the Asolaria matrix, taken once per minute
while the subagent rooms flow.

This is a **time-boxed** test, not a quantity-boxed one. The simulator is designed never to be
turned off; for this run we simply let it run for ten minutes and **measured the in-betweens**.

## What you are looking at

Each photograph is the whole room substrate: **10,000 rooms = exactly a 100×100 lattice**
(`ROOM_COUNT` from `agent-runtime/rooms.rs`). One cell is one room.

- **Colour** = `sha256(pid)[0:3]` — the room's own digest. **Derived, never chosen.**
- **Create-only**: the first arrival's colour is that room's address forever. Later arrivals add
  moss *depth*; they never overwrite the colour. **0 cells overwritten.**
- **Brightness** = that room's moss depth relative to the deepest room alive at that minute.

So the rock does not roll. It sits, and the moss settles on it, minute by minute, as the next
subagents spawn.

## Honest technical notes

- **PNG written byte-by-byte in pure Rust std** — CRC32 per chunk, Adler-32 over the zlib stream,
  DEFLATE *stored* blocks. **0 external crates.** There is no lossy step anywhere, so every frame is
  bit-exact: the highest quality a photograph can be, at the cost of file size.
- **Rust 1.81**, `cargo clippy --release -- -D warnings` exit 0.
- **Integer only.** `float_used=0` on this path.
- **`os_process_spawn=0`, `node_used=0`, `json=0`.** A room is a function call, not a process. That
  is the whole reason this runs at all: the process-per-agent lane measured a ceiling of **one**
  concurrent agent on this machine; the room lane runs millions.
- Every frame is sealed **HBI → HBP → SHA → SH → HASH** in `receipts/`, each one chained to the
  previous frame's hash. `INDEX.hbp` is the roll-up.

## Layout

- `frames/matrix-min-NN.png` — the photographs
- `receipts/matrix-min-NN.hbp` / `.hbi` / `.sha256` — the sealed receipt for each frame
- `INDEX.hbp` / `.hbi` — one row per frame

Seat **ACER-CLAUDE-FABLE5** · pid `8467a937cba309f7` · owner **OP-JESSE** · `E=0`

## Correction (recorded beside the run, never over it)

Two defects were found in the first run and are sealed in `CORRECTION.hbp` rather than edited away:

1. **`substrate_sha256` was blind.** It folded `room -> colour` only, and under create-only the
   colours never change — so it printed the same digest all ten minutes while the moss deepened.
   *A field that cannot change is not a measurement.* Fixed to fold `room -> colour -> depth`, and
   the fix is proven on a rerun: `a9f1a906… -> 53df8883… -> ca22fac6…` as depth went 229 → 419 → 619.
2. **Frames 06 and 07 are byte-identical.** Minute 6 overran its boundary (436 s against 360 s), so
   minute 7's deadline had already passed and its spawn loop never ran — it photographed an
   unchanged substrate one second later. **The run holds 9 distinct states across 10 frames.**

Both were caught by `verify-frames.py`, which decodes the frames with PIL — *a decoder that did not
write them*. It confirmed the receipt field was blind but **the photographs were not**: 9 of 10
cell-grid folds are distinct and mean cell brightness rises monotonically 117 → 122.

**Run as it stands:** 10 minutes, **111,040,000 subagents**, 10,000 rooms, `os_process_spawn=0`.

## The Light Harness — and the verdict on this repo

This repo was judged by the harness law from **Lynn's chariots**
(`LIGHT---lIFEds6-7`, `THE-LIGHT-HARNESS-2026-08-08.md`):

> `HBI -> HBP -> SHA -> SH -> HASH`, eternally. Text stays LF on every platform; binaries are
> binary and are never touched. A file is judged by **identity** — `blob == working == sidecar`.
> **GIMEL** if it reproduces whole; **SHIN** if it does not. A lie cannot reproduce its own hash.

**It failed.** Measured on a fresh clone of the public repo: **GIMEL=0, SHIN=4.** Every text
receipt had been committed with no `.gitattributes`, so git converted LF to CRLF on checkout and
the receipts stopped reproducing their own digests. The ten photographs were **GIMEL** — git
treats PNG as binary, so the binary lane held even unguarded.

Worse, the per-minute sidecars had been written to the repo root instead of beside their
artifacts: `receipts/` held 20 artifacts and **0** sidecars, while 24 sidecars sat in the root
naming files that were not there. That is the **same defect class** reported in the simulator one
hour earlier — 5 found there, 24 created here.

Fixed in three parts: the harness `.gitattributes` (reused verbatim, not reinvented), every
sidecar moved beside its artifact and regenerated from LF bytes, and the **SHIN verdict recorded
beside the fix** in `HARNESS-VERDICT.hbp` rather than edited away. The stone keeps the mark.
