# asolaria-matrix-in-colour

The owner's repository `JesseBrown1980/asolaria-matrix-in-colour` @ `7035def`, vendored whole
and byte-identical under `vendor/asolaria-matrix-in-colour/` (66 files, `PROVENANCE.md`), with
its harness running in aether:

- `verify-frames.py` ported to integer Rust 1.81 (the `verify-frames` binary). Its output is the
  same bytes as the script's on all ten frames.
- The repository's own seals checked by tests: the sidecars, the `.hbi` rows, the frame chain,
  `INDEX.hbp` and the two hash rows.
- A second read of the frames, in the one PNG format their receipts name, that shares no code
  with the `png` crate.

`check.sh` runs the gates. It is its own crate in a subdirectory of `colour/`, not part of the
`colour` package, and changes no other file in `colour/`; `colour/check.sh main` still exits 0
with it there.

## What the repository is

From its README (vendored `README.md`):

- README.md:3-4: "Ultra-high-quality **lossless** colour photographs of the Asolaria matrix,
  taken once per minute while the subagent rooms flow."
- README.md:6-7: "This is a **time-boxed** test, not a quantity-boxed one. The simulator is
  designed never to be turned off; for this run we simply let it run for ten minutes and
  **measured the in-betweens**."
- README.md:11-12: "Each photograph is the whole room substrate: **10,000 rooms = exactly a
  100×100 lattice** (`ROOM_COUNT` from `agent-runtime/rooms.rs`). One cell is one room."
- README.md:14: "**Colour** = `sha256(pid)[0:3]` — the room's own digest. **Derived, never
  chosen.**"
- README.md:17: "**Brightness** = that room's moss depth relative to the deepest room alive at
  that minute."
- README.md:59: "**Run as it stands:** 10 minutes, **111,040,000 subagents**, 10,000 rooms,
  `os_process_spawn=0`."

Beside the ten frames it holds one receipt per frame (`receipts/matrix-min-NN.{hbp,hbi}`, each
with a `.sha256` sidecar), `INDEX.hbp`, `CORRECTION.hbp` (two defects of the run, "recorded
beside the run, never over it"), `HARNESS-VERDICT.hbp` (the repository judged by the Light
Harness and failed, then fixed) and `verify-frames.py`.

## The frames

Measured on the vendored files (`tests/parity.rs`, `src/stored.rs`):

- Ten PNGs, 1024 × 1024, 8-bit RGB, 3,147,060 bytes each. The chunks are IHDR, IDAT, IEND and
  nothing else. The zlib stream is 49 stored DEFLATE blocks (48 of 65,535 bytes and one of
  1,072), and every row has filter None. Every chunk CRC and the Adler-32 hold. That matches
  the receipts' `format=PNG RGB8 truecolour|compression=DEFLATE stored (no lossy step)`. The
  stored read gives the same pixels as the `png` crate on all ten.
- Layout: a 12-px margin of (8, 8, 8) around 100 × 100 cells of 10 px. Each cell is a 9 × 9 block
  of one colour, with a 1-px (8, 8, 8) gutter on its right and bottom. A test checks every
  pixel of all ten frames. The script samples each cell at offset (4, 4), inside the block.
- `frames/matrix-min-06.png` and `-07.png` are the same file (blob `70941885d777`, sha256
  `fb51a34ab313127a…`). `CORRECTION.hbp` `DEFECT|id=2`: "minute 6 overran its deadline
  (elapsed 436s against a 360s boundary), so minute 7's 420s boundary had already passed and its
  spawn loop never executed".
- Rooms whose sampled cell changed between consecutive frames
  (`cargo run --release --example cells_changed`): 9572, 8777, 7452, 6980, 7762, **0** (06 to
  07), 4951, 5141, 6930, of 10,000.

**What they encode.** A picture of the room lattice, one cell per room, drawn by the rule quoted
above. They are not a colour QR carrier. `qr/colour-qr`'s default integer reader
(`colour-qr ungenerate`, built from this working tree into a scratch target directory) found
no symbol in any of the 30 planes (ten frames × R, G, B, `read=no_symbol_in_this_plane`, 0 bytes
out). The colour crate's `colorpid::pid_color` uses the same rule as README.md:14 (the first
three bytes of `sha256(key)`). But the frames carry neither the pids nor the depths, and the
program that drew them (`agent-runtime/rooms.rs`) is not in the repository. So no cell is traced
to a pid here, and the brightness formula is not rebuilt.

## The harness

### `verify-frames.py` and the `verify-frames` binary

The script decodes each frame with Pillow and samples the centre pixel of each of the 10,000
cells (verify-frames.py:24-33). For each frame it prints the integer mean channel value, the
cells with `r + g + b > 30`, the distinct cell colours and the first 16 hex digits of the
sha256 of the cell bytes. It also prints whether every grid digest is distinct and whether the
means never fall.

The script has no floating point. Its one division is `//` (line 54) and everything it prints is
an integer, a hex string or `True`/`False`, so the port needs no float handling. The port reads
8-bit RGB only and refuses other PNG types, so it does not port the `convert("RGB")` call of
lines 49-50, which these frames never reach.

verify-frames.py:20 is `REPO = r"C:\tmp\scout-rooms-20261008\repo"`. Outside Windows that is a
single relative directory name. So `check.sh python` runs the vendored script **unmodified**
from a temporary directory that holds a directory of that name containing copies of the frames.
It runs under `python3 -I -B` with the script copied elsewhere. Its output, under Python 3.13.16
and Pillow 12.3.0, exit 0:

```text
frame                           px   mean_rgb  nonzero  distinct         grid_sha16
matrix-min-01.png      1024x1024          117     9998      9998   4d411f7cc8d681e2 
matrix-min-02.png      1024x1024          119     9998      9998   cbf441008eac1011 CHANGED
matrix-min-03.png      1024x1024          121     9998      9999   250ad18411b7888e CHANGED
matrix-min-04.png      1024x1024          121     9998      9998   e561912f3e84e3d8 CHANGED
matrix-min-05.png      1024x1024          122     9998     10000   4d327faa50d44a35 CHANGED
matrix-min-06.png      1024x1024          122     9998      9997   6e2fe375dd13ed3d CHANGED
matrix-min-07.png      1024x1024          122     9998      9997   6e2fe375dd13ed3d IDENTICAL<-BLIND
matrix-min-08.png      1024x1024          122     9998     10000   5d6213ac8807d53f CHANGED
matrix-min-09.png      1024x1024          122     9998      9999   80c9b28312e21cb8 CHANGED
matrix-min-10.png      1024x1024          122     9998      9998   5aa1d723a48ca927 CHANGED

frames                      : 10
every frame grid distinct   : False  <- some frames identical
mean cell brightness trend  : [117, 119, 121, 121, 122, 122, 122, 122, 122, 122]
monotonic non-decreasing    : True
rooms lit (of 10000)        : 9998 at final frame
distinct cell colours       : 9998 at final frame

CORRECTED FOLD (for future runs): fold room->colour->DEPTH, not room->colour.
The depth witness that DID work all along is each frame's own photo_sha256,
which changed every minute and is already in INDEX.hbp.
```

That output is `tests/fixtures/verify-frames.python.out` (1,529 bytes, sha256
`0bec1f8bf0368612…`). `cargo run --release --bin verify-frames` prints the same 1,529 bytes,
the first row's trailing space included, and exits 0. `tests/parity.rs` compares them byte for
byte, and both `check.sh` lanes with `cmp`.

What the script's output reproduces, checked in `tests/parity.rs` against the rows' own text:

- `CORRECTION.hbp` `DEFECT|id=2`: "photo_sha256 fb51a34ab313127a on both, and an independent PIL
  cell-grid fold gave 6e2fe375dd13ed3d on both".
- `MEASURED_IS`: "independent PIL decode of all 10 frames: 9 of 10 cell-grid folds distinct,
  mean cell brightness monotonic non-decreasing 117->122".
- `NAMED|claim=2 rooms went unlit`: "the verifier counted 9998 lit cells using a brightness
  threshold of 30". At frame 10 the two cells under the threshold are rooms 582 (5, 10, 0) and
  3241 (22, 2, 2) in grid order (a Pillow probe over the same samples).

`DEFECT|id=1` (the blind `substrate_sha256`) is not from the script. `tests/upstream.rs` checks it
on the receipts: all ten carry the same `substrate_sha256`, whose first 16 hex digits are the
"eceb8dad3056406a" its evidence names.

### The Light Harness

README.md:66-68 quotes the law: "`HBI -> HBP -> SHA -> SH -> HASH`, eternally. Text stays LF on
every platform; binaries are binary and are never touched. A file is judged by **identity** —
`blob == working == sidecar`. **GIMEL** if it reproduces whole; **SHIN** if it does not."

`tests/upstream.rs` checks the vendored bytes:

| Check | Result |
|---|---|
| `.sha256` sidecars, each naming a file in its own directory | 27 of 27 hold |
| text files under the vendored `.gitattributes` LF rule | 56, no CR, each ends in LF |
| `.hbi` rows: row N is the hex of `.hbp` line N, and its `sha256` is that line's | 13 files, 69 of 69 rows |
| receipts: `frame_hash` = sha256 of the first three rows joined by LF | 10 of 10 |
| receipts: `prev_frame_hash` = first 16 hex of the previous `frame_hash` (minute 1: 16 zeros) | 10 of 10 |
| receipts: `MATRIXPHOTO` `bytes`, `sha256`, `sh`, `w`, `h` against the frame file | 10 of 10 |
| `INDEX.hbp` rows against the receipts and frames | 10 of 10 |
| `CORRECTIONHASH` and `HARNESSVERDICTHASH` `merkle` = sha256 of every earlier row joined by LF; `sh` = its first 16 hex | 2 of 2 |
| `HARNESSVERDICTHASH` `shin=2`, `gimel=1`, `fixes=3` against the SHIN, GIMEL and FIX rows | holds |

The seal rule (rows joined by LF, no final LF) was found by measurement. The program that wrote
the receipts is not in the repository.

`HARNESS-VERDICT.hbp` was measured again with git 2.43.0 on Linux:

- **SHIN, before the fix.** Cloned with `core.autocrlf=true` and checked out at `c513fca` (the
  parent of 7035def, before `.gitattributes`). The sidecars sitting beside their artifacts gave
  GIMEL=0, SHIN=4: "CORRECTION.hbp claims d6c34721cd7bbd9f but working gave 696d8107a2a04c38"
  and "INDEX.hbp claims 0194423f6c9a74a8 but working gave 1b90fef8e5dab456", as the verdict
  records, plus CORRECTION.hbi and INDEX.hbi. The root held 24 sidecars, and `receipts/` held 20
  artifacts and 0 sidecars. At `c513fca` each of the four sidecars equals the sha256 of its LF
  blob, so only the CRLF checkout broke them. `tests/upstream.rs` repeats the two quoted
  examples from bytes (LF to CRLF).
- **The fix, after.** Cloned with `core.autocrlf=true` at 7035def: 27 of 27 sidecars hold and
  `git status` is clean. That is the re-clone the verdict's `NAMED|claim=the fix restores GIMEL`
  row (`status=UNVERIFIED_until_reclone`) asks for, on that seat.
- **GIMEL, the photographs.** The row's "min01 041d36c6d96f58b1, min06 fb51a34ab313127a, min10
  816d5e23aac99430" are the vendored frames' own sha256 (`tests/upstream.rs`).

## Gates

`check.sh main` (the default):

1. `sha256sum -c` of `UPSTREAM.sha256` (66 vendored files and the Python fixture) and of every
   vendored sidecar.
2. `cargo +1.81.0 fmt --check`
3. `cargo +1.81.0 clippy --locked --all-targets -- -D warnings`
4. `cargo +1.81.0 test --locked`
5. The `verify-frames` binary against the recorded Python output (`cmp`).
6. No `f32`, `f64` or `as f..` in this crate's `src/`, `tests/` and `examples/`.

`check.sh python` is the cold lane. It needs Pillow (`PYTHON=<python with Pillow>`, default
`python3`), runs the unmodified vendored script as described above, and compares its output
with the fixture and with the Rust binary.

Measured on 2026-10-18 (rustc 1.81.0, Python 3.13.16, Pillow 12.3.0): `check.sh main` exit 0
with 17 tests passed (4 unit, 4 `parity`, 9 `upstream`), and `check.sh python` exit 0.
Like `colour/check.sh`, this script is not called from `.github/workflows/gate.yml`.

The crate has `#![forbid(unsafe_code)]`. Its own arithmetic is integer-only. The dependencies
are exact-pinned: `png =0.17.16` (default features off) and `sha2 =0.10.9`, at the versions
`qr/colour-qr/Cargo.lock` already locks. The vendored files are never edited or reformatted.

## Not checked

- The pids behind the cell colours, and the brightness formula: neither is in the repository
  (see "What they encode").
- `CORRECTION.hbp` `DEFECT|id=1` `fix_proven` (a 3-tick rerun, `a9f1a906… -> 53df8883… ->
  ca22fac6…`), and the run's own figures (subagent counts, moss depths, timings). These are
  records of a run on the owner's machine and cannot be recomputed from the files.
- The receipts' `distinct_colours=9995` is the run's own figure, the same in all ten receipts;
  what it counted is not in the repository. The script's `distinct` counts drawn cell colours
  after brightness (9,997 to 10,000 across the frames). The two are not compared.
