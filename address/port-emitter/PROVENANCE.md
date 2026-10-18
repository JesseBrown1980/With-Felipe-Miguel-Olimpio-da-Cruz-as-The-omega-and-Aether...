# Provenance — asolaria-port-address-emitter (address/port-emitter)

Integer Rust 1.81 port of the owner's Hilbert-traced nested logical ports. Ported (Node to Rust, same
output on the integer domain below), not vendored: no upstream `.mjs` bytes are copied into this tree.

## Upstream

| file | repo @ commit | git blob id | sha256 | lines ported |
|---|---|---|---|---|
| `src/port-address-emitter.mjs` | `JesseBrown1980/bigpickle-rebuild` @ `c592599c8f3d000b07cd5f4218b7d6b24d49d7d5` | `8ccac7c13e4c076d87f2f4874d9aa4e3af903d58` | `d0b579e162a86f27f225989e34233c6b10f427321724842814d630eb2488b0c2` | 22-99 |
| `src/district-fabric.mjs` (`hilbertXY`) | same | `b40d206330b3b9b69ff207d1df6fa44e1d9ac421` | `49a32651cfbcc5377ee8b1905d8b76d628431ea32db70d541cb4aba488fd85fd` | 61-74 (called, through `aether-loop`) |
| `tests/unit/port-address-emitter.test.mjs` | same | `2f594c535e1d40564bc8b737267de0d5704251f4` | `435091b7760469d5b6a81575deb9e8b46a682e0b78f9a8c7526b47e4d659f18c` | 11-78 (all nine tests) |

The same blob `8ccac7c13e4c` is `emitter/port-address-emitter.mjs` in
`JesseBrown1980/Asolaria-the-full-works-200-nanoseconds-agent-emitter-plus-` @
`ba78127db9b0638ac0e695e99973e300c8b96db9` (identical sha256). That tree has 16 files and no
`district-fabric.mjs`, the module the emitter imports at :20; this port takes `hilbertXY` from
bigpickle-rebuild's `district-fabric.mjs`.

`UPSTREAM-SOURCES.sha256` pins the four files above by relative path; CI fetches them from
raw.githubusercontent.com into a temporary directory, runs `sha256sum -c` there and checks each git blob
id. Those files are only hashed, never run.

## What maps where

| crate item | upstream | notes |
|---|---|---|
| `ports::ports_for_index` | port-address-emitter.mjs:33-54 | trace through `aether_loop::district_fabric::hilbert_xy` |
| `ports::capacity` | :28-31 | decimal string of `2^(bits*levels)`; `Err(CapacityRangeError)` for `bits >= 1024` |
| `emitter::address_string` | :56-58 | |
| `emitter::index_for_pid` | :60-68 | `sha` (:26) is `aether_loop::sha::sha256_hex` (same computation as district-fabric.mjs:28) |
| `emitter::PortAddressEmitter` | :70-90 | upstream `next()` is `next_address()`; its `start + counter` and `counter++` (:80-81) add as JS Numbers through `l0_edge::jsnum::Dbl` |
| `emitter::port_addr_row` | :92-99 | `extra` entries in ECMAScript `Object.entries` order |
| `DEFAULT_IP` / `DEFAULT_LEVELS` / `DEFAULT_BITS` | :22-24 | the fallback literals |

`hilbertXY` comes from the `aether-loop` crate (`loop/`, path dependency, `pub fn hilbert_xy(n: i64, d:
i64)`), which ports district-fabric.mjs:61-74. It is not duplicated here. Upstream's comment at :16 says
the emitter "Reuses hilbertXY (no new code)".

## Integer domain

- `index: u64`. Upstream computes `Math.max(0, Math.floor(index))` (:42) on a JS Number; on non-negative
  integers that is the identity. The upstream callers inside the module pass integers: `start + counter`
  (:75, :80) and `indexForPid` (< 2^52). Negative, fractional, NaN and Infinity Numbers, and integer
  Numbers at or above 2^64 (as `index` or `start`), have no `u64` form. Upstream computes ports for the
  latter: the referee mirror gives `portsForIndex(2**64, {levels: 4, bits: 16})` = `[0,0,0,0]` and
  `portsForIndex(2**64 + 2**40, {levels: 3, bits: 16})` = `[0,0,256]`.
- `start + counter` (:80) and `counter++` (:81) are JS Number additions: the sum is rounded to binary64,
  ties to even. Up to 2^53 every sum is exact; past it the index is the binary64 value nearest the sum,
  so with `start = 2^53` the first four indexes are `2^53, 2^53, 2^53 + 2, 2^53 + 4`, and `counter++`
  at `2^53` gives `2^53`. `next_address` computes both with `l0_edge::jsnum::Dbl` (`from_u64`, `Add`),
  path dependency `model/l0-edge`. A `u64` start or counter that is not a binary64 value enters the
  addition as the binary64 value nearest it; the referee books those cases as `u64-extension`.
  `next_address` panics when the rounded index is 2^64 or above (for example `start = 2^64 - 2048` with
  `counter = 1024`, where upstream's index is the Number 2^64), since `Address::index` is `u64`.
- `bits <= MAX_BITS = 31`, because `hilbert_xy` takes the in-block index `d < 2^(2*bits)` as `i64`;
  `ports_for_index` panics above that. The upstream default is 16 (:24, "16-bit port (0..65535, real TCP
  range)").
- JS `t / 2` and `t ^ rx` in `hilbertXY` (district-fabric.mjs:64-65) go through ToInt32. The referee
  mirrors ToInt32 explicitly and agrees with the loop crate's integer `t / 2` and `t ^ rx` for every
  `d` it feeds, up to `2^62` at `bits = 31`. The loop crate's own doc comment notes its callers keep
  inputs below 2^31.
- Every division in these lines is by a power of two (2, 4, `2^bits`, `2^(2*bits)`), so binary64 holds
  the quotient exactly. The referee checks that every value the JS lines compute is a binary64 value. Where
  all of them are, the double results equal the integer results.
- `u64` indexes that are not binary64 values (for example `2^64 - 1`) are not JS Numbers. The crate runs
  the same integer lines on them, and the referee books them separately as `u64-extension`.

## Where upstream yields NaN

`indexForPid` with `bits * levels == 0` takes an empty hex slice, and `parseInt('', 16)` is NaN (:66).
In those cases `index_for_pid` and `for_pid` return `None`. The referee measured the upstream addresses:

| levels | bits | upstream `full` |
|---|---|---|
| 0 | 16 | `127.0.0.1:` |
| 2 | 0 | `127.0.0.1:0.0` |
| 3 | 0 | `127.0.0.1:0.0.NaN` |

## Not brought in

- JS Number `index` and `start` values outside `u64`: negative, fractional, NaN, Infinity, and integer
  Numbers at or above 2^64. Upstream computes addresses for the integer ones at or above 2^64 (see
  Integer domain); this port has no `u64` form for them, and `next_address` panics where `start +
  counter` rounds to 2^64 or above.
- The environment overrides `process.env.ASOLARIA_PORT_IP`, `ASOLARIA_PORT_LEVELS` and
  `ASOLARIA_PORT_BITS`, which upstream reads when the module loads (:22-24). The constants here are their
  fallback literals. `Number(...)` of an environment string accepts non-integer text, which has no form in
  this integer port.
- V8's BigInt maximum-length RangeError for very large `bits * levels` (the `capacity` result past V8's
  BigInt length limit). Its exact boundary depends on V8's internal digit arithmetic and cannot be
  measured here without Node. This crate computes the exact decimal string for every `bits < 1024`, at a
  cost quadratic in `bits * levels`.

## Referee and tests

- `referee/referee_ports.py` (stdlib, integer-only): mirrors port-address-emitter.mjs and
  district-fabric.mjs:61-74 line by line. It generates the cases and feeds them to `examples/emit_ports.rs`
  on stdin:
  - every index in `[0, 2*side^levels)` for `bits` 0-4 by `levels` 0-4, plus `levels=3, bits=5`
  - the full 256x256 curve
  - the first 65,536 indexes at the default shape
  - 400 sha256-seeded indexes in each of three classes, for each of 16 shapes
  - block and capacity boundaries
  - 156 capacities, 2,060 PIDs, 90 `port_addr` rows
  - 13 sequential emitters (5,061 rows, 3 of them booked `u64-extension`); seven start at `2^53 - 4` or
    above, where the :80 sum is rounded, up to `2^64 - 2048`, and one of them starts at `2^53 + 1`,
    which is not a binary64 value

  It compares every answer byte for byte: 373,399 rows, 0 mismatches, of which 6,411 are
  `u64-extension` rows (12,231 values there are not binary64 values; 0 elsewhere). The `next` mirror
  rounds the :80-81 additions with its own integer `js_add`, not with the Rust `Dbl`. It also runs the
  nine upstream unit tests against the mirror. `--check` exits 1 on any mismatch: a mangled output line
  fails it, and the crate before the :80-81 rounding was ported fails it with 22 mismatched rows from
  `next` cases (19 booked `next`, 3 booked `u64-extension`).
- `tests/upstream_unit.rs` reproduces the nine upstream tests assertion by assertion.
- `tests/golden.rs` pins values that the referee computed. Two of them (`2^64 - 1` and `2^62 - 1` as
  indexes) are `u64-extension` values with no JS Number form, and are marked so there.

## Privacy

Only the owner's code was read. The upstream header names the owner (:17), and that line is not
reproduced. No third-party personal data is in these files.

## Build

`cargo +1.81.0`, edition 2021, `rust-version = "1.81"`, `#![forbid(unsafe_code)]`, no floating point in
`src/`, `tests/` or `examples/`. The lock pins sha2 0.10.9 and matches `loop/Cargo.lock` plus the path
crates `asolaria-l0-edge` (no dependencies) and this one.
`CARGO_TARGET_DIR=scratchpad/targets/port-address-emitter`. Not committed or pushed.
