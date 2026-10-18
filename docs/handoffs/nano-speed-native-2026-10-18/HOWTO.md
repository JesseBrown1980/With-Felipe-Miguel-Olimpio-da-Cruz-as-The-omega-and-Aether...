# How to reproduce: nano-speed PID mint on the native hot path (ACER, 2026-10-18)

Seat ACER-CLAUDE-FABLE5 (pid 8467a937cba309f7). The numbers are in the sealed receipt `FABLE5-EMITTER-200NS-CHECK-2026-10-18.hbp`.
**Use the native Rust bench, not the JS one.** The hot path is HBP/HBI on the Rust host; JS is the cold lane, kept only for comparison.

## Where "200 ns" comes from
- It isn't in `BROWN-HILBERT.md`. It's a code comment, "PID ~200ns", in `bigpickle-rebuild/src/asolaria-loop.mjs` (lines 4 and 34), plus the June emitter memory.
- The native measurement below confirms it: on a laptop CPU without SHA hardware, hashing runs at **148–266 ns per op**.

## What you need
- Rust **1.81** (`rustup toolchain install 1.81`), and the `sha2 = 0.10.9` crate, the same version as host8's `Cargo.lock`.
- No other dependencies. The bench copies host8's own functions byte-for-byte from
  `federation-remake-1024/servers/host8-serve/src/main.rs` lines 536–589: `canonicalize`, `fnv1a64`, `host_handle8`, `sha256hex`, `sha16`.

## Run it
    cd native-emit-bench
    cargo +1.81 clippy --release -- -D warnings      # must exit 0
    cargo +1.81 run --release
Add `--offline` if `sha2` is already in your cargo cache. On Windows, use Git Bash or WSL, **not PowerShell**.

## What it checks before timing
- `PARITY|...|holds=1`: host8's own test vector, `sha16("abc") == "ba7816bf8f01cfea"`. If it fails, the bench exits without timing anything.
- `TABLEPARITY|steps=100001|identical=100001`: the proposed faster `sha16` gives byte-identical PIDs across 100,001 chained steps.

## Expected output on ACER (i5-8300H, AVX2, no SHA hardware, 1 thread)
Timings are **integer picoseconds** per op (`ps_per_op_median`); divide by 1000 for nanoseconds.

| Unit (`NATIVEBENCH` row) | ns per op | ops per second |
|---|---|---|
| `raw_sha256_digest(32B,no_hex)` | **266** | 3.76M |
| `host8_fnv1a64_handle8(exact)`, the 8-byte host handle | **148** | 6.77M |
| `host8_sha16_chain(exact,incl_hex)`, host8's PID mint as written | 3,014 | 332k |
| `proposed_sha16_table_chain(same_output)` | **473** | 2.11M |

A CPU with SHA hardware or AVX-512 should be faster. Record your own row next to ours rather than over it.

## The finding
- host8's `sha16` spends about 2.8 µs per PID on hex formatting: 32 calls to `format!("{:02x}")`, about 11× the cost of the hash.
- **Proposed fix (not applied to host8):** hex-encode only the 8 bytes `sha16` keeps, using a 16-character lookup table. That gives the same bytes, 6.4× faster. It's `sha16_table` in `src/main.rs`.
- Applying it to host8 needs the normal gate: Rust 1.81 `cargo fmt --check`, `cargo clippy -D warnings`, host8's `sha16_matches_node_crypto` test, then CI. That's the owner's call.

## JS cold lane, for comparison only
    node bench_emitter.mjs        # needs D:/bigpickle-rebuild/src (path hard-coded)
ACER result: `revolver.next()` takes **1,831 ns** and a raw node sha16 chain takes 1,455 ns. That's the cold lane. My earlier "200 ns is about 9× too fast" verdict came from this JS run, and it's corrected beside in the receipt.

## Verify this zip
    sha256sum -c SHA256SUMS
`CUBE.hbp` lists every file with its sha256 and a merkle root.
