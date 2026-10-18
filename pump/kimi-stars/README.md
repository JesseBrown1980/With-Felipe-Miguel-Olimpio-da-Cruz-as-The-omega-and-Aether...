# pump/kimi-stars

The owner's codex-to-GGUF pump for two generated GGUFs, in the Rust 1.81 hot lane. A codex is a
seed plus the owner's program that produced the artifact (`FABLE5-DELETE-AND-REGENERATE.hbp:2`:
"the_whole_object_can_be_DELETED_and_REGENERATED_from_the_key"). The owner bounds the claim
(`FABLE5-DELETE-AND-REGENERATE.hbp:8`):
`BOUND|applies_to=GENERATED_objects|not_claimed_for=arbitrary_incompressible_data|json=0`.

| Command | Upstream program (USIM @ `3f9f42d`) | Seed | Output |
|---|---|---|---|
| `pump kimi-k3 <seed> <out-dir>` | `measurements/divide_kimi_k3.py` (11,001 B) | `key/KIMI-K3-STAR.txt` (3,110 B) | `KIMI-K3-STAR-256.gguf` 202,115,456 B, sha256 `56d08746a77efd9ea30345ada15bab3fc2c36e09647d1e77156a96b9a4b83a18`; receipt `FABLE5-KIMI-K3-STAR.hbp` sha256 `b48e43ac…f924` |
| `pump stars-shells <seed> <out-dir>` | `measurements/stars_shells.py` (11,185 B), run as `stars_shells.py 8` | `key/MYTHOS-SELF-EMISSION.txt` (3,796 B) | `ASOLARIA-STARS-SHELLS.gguf` 4,596,880 B, sha256 `ae23392ad473718e2196e525a4355af20cdbd57bbb5dc3e85a8719b62552784d`; receipt `FABLE5-STARS-SHELLS.hbp` sha256 `6ab33165…bf2c` |

USIM is `JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills`.
Each command writes the four files its program writes, into `<out-dir>`: the GGUF, its `.sha256`
sidecar, the receipt and the receipt's `.sha256` sidecar. It also prints the receipt. It
computes from the seed before it creates `<out-dir>` or any file in it, so a seed it does not
take (see "Not brought in") leaves no file. The programs write the GGUF and the receipt into
two fixed `D:/` directories (`divide_kimi_k3.py:41-43,154-156,240`;
`stars_shells.py:48-49,202,244`); the bytes are the same.

## Lanes

| Lane | What | Where |
|---|---|---|
| Hot | Rust 1.81, integers only, no Python, numpy, JSON or Node. | `src/` |
| Cold (CI only) | The owner's two programs, vendored unmodified, run with numpy; their outputs are compared byte for byte with the Rust outputs. The owner's Python is the referee. | `tools/cold-lane.sh`, `tools/parity.sh`, `tools/make_seeds.py` (stdlib) |

## How the Rust reproduces each part

`kimi-k3` (`src/kimi.rs`, port of `divide_kimi_k3.py`):

- GC (`:57-65`): BLAKE2b with an 8-byte digest per 81-byte record (`blake2` 0.10.6
  `Blake2bVar::new(8)`, the parameter-block digest length Python's `digest_size=8` sets), counted;
  records whose digest occurs at least twice are kept.
- Colour (`:67-89`): `colour::verdict::{ownership, colour, colour_row}` (the existing port in
  `colour/src/verdict.rs`).
- Beings (`:91-118`): each being's cube `acc * (acc >= 2)` is held as its occupied voxels
  (key `r*65536 + g*256 + b`, count), sorted, so no 2^24-entry array is built. The `BEING` rows use
  `colour::verdict::being_row`; a test checks them against `colour::verdict::beings`.
- Rime (`:120-143`): `W = pow(7, 37040, 1000081) = 951846`; the radial profile, `v` and the rimed
  prism `(v @ WK[IDX].T) % P` in integers, with the float steps below.
- GGUF (`:145-217`): header, 14 metadata entries in upstream order, 12 tensor infos (numpy shape
  order), 32-byte alignment of the header and of each tensor's data. The data is streamed through
  a SHA-256 writer: each 256^3 cube is written as zero runs between its occupied voxels, and
  `slice_*` (`c8[:, :, 128]`) from the voxels with `b == 128`.
- Receipt (`:219-244`): rows `K3HDR`…`GGUF`, then `K3FTR` with the first 32 hex digits of the
  SHA-256 of the rows above it, and `rows=12`.

`stars-shells` (`src/stars.rs`): the computation is `colour::stars::regenerate(seed, 8)`, the
existing port of all of `stars_shells.py` (`colour/src/stars.rs`, which cites each line); this
crate writes its outputs as the script does.

### Float sites and their integer emulation

The owner's rule is integers and trits only. Where upstream computes with a Python `float` or a
numpy `float64`, the Rust reproduces the IEEE-754 binary64 result bit for bit with
`colour::binary64::B64` (integer mantissa and exponent, round to nearest, ties to even).
`l0_edge::jsnum::Dbl` was not used: it holds non-negative values only and has no subtraction,
square root or truncation (`model/l0-edge/src/jsnum.rs:9-16` and its methods), which these lines
need.

| Upstream | Value upstream computes | Rust site |
|---|---|---|
| `divide_kimi_k3.py:70-72` | `own = float(count)`, `tot = sum(own) or 1.0`, `100.0 * o / tot` | `colour/src/verdict.rs:61-66` (called at `src/kimi.rs:273`) |
| `divide_kimi_k3.py:75-88` | `max`, `min`, `-`, `abs`, `<= 3.0`, `> 5.0` | `colour/src/verdict.rs:67-87` |
| `divide_kimi_k3.py:166-168,229-230` | `f"{x:.4f}"` | `B64::format_fixed(4)`: `src/kimi.rs:357-359`, `colour/src/verdict.rs:100-103` |
| `divide_kimi_k3.py:133` | `np.sqrt` of the `int64` squared radius | `src/kimi.rs:197` |
| `divide_kimi_k3.py:136` | `(d / (N * 0.87) * K).astype(int)`, `N * 0.87` = `256.0 * 0.87` | `src/kimi.rs:199-200` |
| `divide_kimi_k3.py:134-138` | `w`, `prof` and `prof.sum()` as `float64` sums of integer counts | `src/kimi.rs:213-220`, `u64` (every partial sum is an integer below 2^53, so the `float64` sums are exact) |
| `divide_kimi_k3.py:139` | `(prof / s * 100000.0).astype(np.int64)` | `src/kimi.rs:221-226` |
| `divide_kimi_k3.py:177-181` | `astype(np.float32)` of integer values | `src/binary32.rs` (`bits_of`, round to nearest even above 2^24), `src/kimi.rs:513,523,536` |
| `stars_shells.py:158-165` | `np.sqrt`, `np.histogram` bins, `vol`, `dens`, `0.6 * dens[pk]` | `colour/src/stars.rs:181-184,200-223` |
| `stars_shells.py:186-188,205-208` | `float32` counts (a voxel stops at 2^24) and `astype(np.float32)` of indices (round to nearest even above 2^24) | `colour/src/stars.rs:258-262,296-303,341-346` (`colour::gguf::binary32_increment`, `binary32_bits`) |

`radial_bin_of_squared_radius` is checked against numpy for every integer squared radius
`0..=49152` (test `radial_bins_of_every_squared_radius_match_numpy`); `bits_of` against numpy's
`astype(np.float32)` patterns, including the round-to-even cases above 2^24.

## Measured (2026-10-17, this host: 4 CPUs, Linux 6.18, Python 3.13.16)

- **Byte-exact.** On the owner's seeds the Rust pump writes all 8 files equal (`cmp`) to the files
  the owner's programs write in a fresh `D:` work directory, with numpy 2.5.4 (`regen/venv`) and
  again with numpy 2.5.3 (`/usr/bin/python3`). The GGUF digests equal the stored ones: KIMI
  `56d08746…3a18` (the upstream LFS pointer's `oid`; `cmp`-equal to the LFS bytes) and
  STARS-SHELLS `ae23392a…784d`; both receipts and all four sidecars equal the stored upstream files.
- **Parity on 10 synthetic seeds** (`tools/parity.sh`): 4 of 4 files equal on each of the 9
  seeds both programs take. Six `kimi-k3` seeds: random 3,110 B; repeated 81-byte records
  (`GC tie_ge_tau=20`); every triple of an 8-step grid twice (10,416 voxels per being, every
  radial bin occupied); 3,000 B of `0x80` (all triples tied, `tot` 0, empty cubes, `RIMED`
  zeros); red-only (two empty beings); and a 300,000 B body whose 64 triples repeat about 1,560
  times each (counts above 255 clipped, shell 7). Three `stars-shells` seeds: random 3,796 B
  (stops at round 4), 30 B (stops at round 5) and 3,000 B over 8 byte values. The tenth, a random
  80 B `kimi-k3` seed, is taken by neither: `divide_kimi_k3.py` exits with status 1 (`TypeError`
  from `~kept_mask`, `:65`), the pump exits with status 2, and neither writes a file.
- **Stars-shells final rounds above 2^24 records.** A seed that runs all 8 rounds holds
  (seed bytes // 3) * 3^8 records in its final round (each round triples the corpus,
  `stars_shells.py:131-134`), so from 7,674 bytes the final round holds more than 2^24 records
  and `star_time` (`:205`) can hold indices that numpy rounds to binary32. On 7,674 zero bytes
  (`ROUND|n=8|bytes=50349114|stars=16783038|shells=8`) the pump writes all 4 files equal to the
  owner's program (GGUF 409,381,448 B, sha256 `1fa9cadd…44ce`, `RINGS|n=2|of=6`), and also on
  7,671 zero bytes (16,776,477 records; GGUF 409,223,996 B, sha256 `03c9addb…5b67`).
  `stars_shells.py 8` took 65,469 and 55,373 ms, the pump 15,242 and 5,415 ms. The owner's seed
  stops at round 2 with 11,385 records. The rounding is `colour::gguf::binary32_bits` and
  `binary32_increment` (`colour/`, 2026-10-17 22:25 state).
- **Wall time, integer milliseconds** (bash `date +%s%N` around each process; the Rust time is the
  release binary including process start and writing the files; the host ran other jobs during
  these runs):

  | run | `divide_kimi_k3.py` | `pump kimi-k3` | `stars_shells.py 8` | `pump stars-shells` |
  |---|---:|---:|---:|---:|
  | cold lane 1 | 3812 | 255 | 1499 | 40 |
  | cold lane 2 | 3360 | 221 | 1132 | 29 |
  | cold lane 3 | 3409 | 213 | 1090 | 34 |
  | `check.sh cold` | 5439 | 350 | 1528 | 69 |
  | numpy 2.5.3 | 5195 | 199 | 1699 | 28 |
  | cold lane, `KIMI_LFS_GGUF` set | 3862 | 361 | 1226 | 100 |

  Five further back-to-back runs of the binary alone: `kimi-k3` 807, 714, 426, 349, 326 ms (each
  overwriting the previous 202 MB file); `stars-shells` 41, 38, 36, 36, 41 ms.
- **Peak resident memory** (`getrusage` `ru_maxrss`, KiB, lowest to highest of 3 runs each):
  `pump kimi-k3` 11,092 to 11,164; `divide_kimi_k3.py` 769,900 to 770,036; `pump stars-shells`
  21,536 to 21,580; `stars_shells.py 8` 59,072 to 59,792.
- **Disk.** Each cold-lane run peaks near 420 MB (two KIMI GGUFs) and deletes both after the
  comparison; the scripts refuse to start with less than 2 GiB + 420 MiB free.
- `cargo test` (debug, 18 tests) takes 7,323 to 8,043 ms over 3 runs, most of it hashing the
  streamed 202 MB GGUF.

## Not brought in, with the evidence

- **Console output.** Both programs print progress text with float formatting
  (`divide_kimi_k3.py:52-55,64-65,73-74,88-89,94-95,117-118,142-143,215-217,244-245`;
  `stars_shells.py:55,91-92,95,98-99,105-106,111-112,125-127,137,139-140,145,150-151,167-169,171,173-178,181,192,242,264`). It is not
  written to any file; the binary prints the receipt instead.
- **`stars_shells.py`'s round argument.** `MAXR = int(sys.argv[1]) if len(sys.argv) > 1 else 8`
  (`:52`). The pump runs `MAXR = 8`, the default and the argument of the owner's recorded command.
- **Seeds `divide_kimi_k3.py` does not take.** The script raises before it opens any output in
  two cases, and `kimi::divide` returns an error there (exit status 2, no file written): a body
  with no whole 81-byte record (0 to 80 bytes), where `kept_mask` (`:63`) is an empty `float64`
  array and `~kept_mask` (`:65`) raises `TypeError` (the script exits with status 1); and a body
  of 2^32 bytes or more, where `struct.pack("<I", len(raw))` (`:174`) raises. The first case is
  measured on 0, 80 and 81 bytes (81 bytes: both write the same four files) and is a parity seed;
  the second is from the code (a 4 GiB seed was not run).

## Check

```sh
pump/kimi-stars/check.sh main                       # pins, fmt, clippy, tests, binary vs stored bytes, no float
PYTHON=<python with numpy> pump/kimi-stars/check.sh cold     # owner's programs vs Rust, owner's seeds
PYTHON=<python with numpy> pump/kimi-stars/check.sh parity   # owner's programs vs Rust, 10 synthetic seeds
```

Upstream files, blob ids and digests: [PROVENANCE.md](PROVENANCE.md).
