# Proof: nanoseconds per PID on ACER, native hot path, ternary lane (2026-10-18 11:34 UTC)

**Machine:** Intel Core i5-8300H @ 2.30 GHz (AVX2, no SHA hardware), 1 thread
**Build:** Rust 1.81.0, release build, `clippy -D warnings` passes
**Code:** host8's mint functions copied byte-for-byte; the ternary kernel `tribit/mod.rs` included via `#[path]`, not copied
**Raw output:** `PROOF-RAW-NANOSECONDS.log`. Every number below appears there as an integer **picoseconds** value (`ps_per_op_median`), from two separate invocations.

## Gates checked before any timing (both invocations)
| Gate | Result |
|---|---|
| host8 test vector `sha16("abc") = ba7816bf8f01cfea` | ✅ holds |
| Faster table-hex `sha16` gives the same PIDs | ✅ 100,001 / 100,001 |
| **Trits, not bits:** 41 trits per PID (3⁴⁰ < 2⁶⁴ ≤ 3⁴¹, so 40 trits fail) | ✅ `40_trits_enough=0`, `41_trits_enough=1` |
| Ternary PID equals binary PID at every step | ✅ 100,001 / 100,001 |
| Trit round trip is exact (trits → value → trits) | ✅ 100,001 / 100,001 |
| `TritWord` value equals the PID | ✅ 100,001 / 100,001 |
| `unprism(prism(lanes)) == lanes`, K = 27, P = 1,000,081 | ✅ 10,000 / 10,000 |

## The nanoseconds (median of 3 runs; invocation 1 / invocation 2)
| Operation | ns per op | ops per second |
|---|---|---|
| Trit encode: 64-bit PID → 41 trits (`TritWord`) | **79.3 / 79.3** | 12.6M |
| Trit decode: 41 trits → PID | 216.1 / 216.1 | 4.63M |
| `fnv1a64` hash with canonicalize (host8's 8-byte handle hash) | 163.6 / 162.9 | 6.1M |
| `host_handle8` string (`fnv1a64` + `{:016x}`) | 323.7 / 322.1 | 3.1M |
| Raw SHA-256 digest of 32 bytes | **265.6 / 265.9** | 3.76M |
| Binary PID emit, no allocation | 277.6 / 281.0 | 3.6M |
| **Ternary PID emit: trits in, trits out** | **599.8 / 598.5** | **1.67M** |
| host8 `sha16` chain as written (hex via 32× `format!`) | 3,055.5 / 3,059.0 | 327k |
| Proposed table-hex `sha16` chain (same PIDs) | 500.0 / 499.8 | 2.0M |
| `tribit` `prism` + `unprism` seal, K = 27, exact | 23,252.5 / 22,893.8 | 43k |
| JS `revolver.next()`, cold lane, comparison only | 1,758.4 | 569k |

## What it shows
- **The 200 ns class holds natively.** The hash is 266 ns and trit encoding is 79 ns, on a CPU without SHA hardware.
- **Carried in trits, a PID emit costs about 600 ns here.** That's the 278 ns emit plus the trit encode (79 ns) and decode (216 ns).
  Decode is the slow part: the canonical `TritWord::unpack` does a `u128` modulo and divide for each of the 41 trits.
  A faster decode would be a change to the canonical kernel, so that's the owner's call. I didn't touch `tribit/mod.rs`.
- **The K = 27 seal is about 23 µs** (27×27 modular multiplications per transform), so it belongs per cube or per batch, not per PID.
- **Run-to-run noise is small.** Compared with the earlier run, `fnv1a64` moved from 148 to 163 ns. Each table row shows both invocations.

## Verify it yourself
    sha256sum -c SHA256SUMS                       # inside the zip
    cd native-emit-bench
    cargo +1.81 clippy --release -- -D warnings   # must exit 0
    cargo +1.81 run --release                     # prints the gates and the ps/op rows
The `#[path]` line in `src/main.rs` points at `C:/asolaria-acer/asolaria-os/kernel/core/src/tribit/mod.rs`, with sha256 `50e4cb85…` in the raw log. On another machine, point it at your copy of the same file.
