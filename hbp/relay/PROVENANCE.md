# hbp-relay — provenance

Rust 1.81 port of the PHASE-1 RELAY auto-driver (E=0): local lane append + verify + reverse-walk,
the append-only HBP ledger writer, the byte-offset HBI sidecar, and the EMIT carve-out guard (the
structural path guard and the content scan). The RELAY row grammar itself is the sibling `hbp`
crate (`hbp::relay`, a port of relay-envelope.mjs); this crate depends on it by path and does not
duplicate it.

This is a PORT, not a byte-copy vendoring: no upstream bytes are checked in here. Parity is shown by
(a) the Rust test suite reproducing all 23 upstream assertions, (b) a stdlib Python referee that
mirrors the upstream JS function by function, (c) byte-identity of the emitted lane files to the
bytes the upstream JS emits (captured from the upstream, embedded as gold in the test and the
referee), and (d) the measurements below.

## Ported from (verification cold lane; pinned by git blob id + sha256)

Source: reductions repo @ `29307bfedb512235f69bf7c290ee72b2813c7c92` (`29307bf`), `relay-driver/`.

| upstream file | git blob | sha256 | ported to |
|---|---|---|---|
| relay-driver.mjs      | fa6b5dbccfcaa6915eda5dd3408c3fb854018fef | a79bc83a5d7e72bb0d0db33f2e24a96db116c1ee03e9c8e7a79af4fd54a7ffc2 | src/driver.rs |
| relay-hbp-writer.mjs  | 037432fac0d4240e71e2ec76779d9214fff8a96f | 7e66a7dcd3cd3bf894bea0d014aa42cc7e964c7b3b6b61b4cb4ced0a0df671c6 | src/writer.rs |
| relay-hbi-indexer.mjs | 9a0290c76139bbf5ad18f117fe5944bd3c55b8ae | 5a716adb8d641f73f6a93ab1245d670ba70e8c62cabbbbafde56d2443e95b4c0 | src/indexer.rs, src/jsnum.rs |
| relay-carveout.mjs    | bd5e6d0f1572f92c02028326cbe71b062e4e6d16 | eecb284c878b008f8befe68accc0684d4eaa5553d7e6b365db4302b0b30c8169 | src/carveout.rs |
| relay-driver.test.mjs | d692cc074ed76e5676049b830bccc50aa5df4db8 | c3d7becd1f367a011ab47a34e1104012782478e5c714e767b971fd352c7e586e | tests/relay_test.rs, tools/referee.py |

The upstream JS is not stored in this repo (same convention as the sibling `hbp` crate). The CI
snippet's upstream-sha256 step verifies these five blobs where the integrator wires the JS tree.

## Dependency

`hbp` (path `..`, version 0.1.0) supplies `hbp::relay`: GENESIS, FIELD_ORDER, class_of, sha256hex,
sha16, clean, build_row, parse_row, Fields, ParsedRow, RelayError (port of relay-envelope.mjs).
Measured against `hbp` as committed at 85faeb1 (`hbp/src/relay.rs` sha256 b0c7a296…).

## How the port reproduces the JS

- Lane files (relay-driver.mjs:59/81, relay-hbi-indexer.mjs:15-16): an absent file is an empty lane
  (`existsSync`); a file that exists is read as bytes and decoded as `Buffer.toString('utf8')`
  decodes it, each ill-formed subsequence becoming U+FFFD and a leading BOM kept
  (`String::from_utf8_lossy` applies the same maximal-subpart rule). A file that exists but cannot
  be read (a directory, no permission) is returned as `Err` with node's message text, where the JS
  throws. `verify_lane`, `reverse_walk` and `load_index` return `Result` for this.
- Sidecar tokens (relay-hbi-indexer.mjs:19): a token without `=` stores key `t.slice(0, -1)` with
  value `t`. An absent `row_hash` at the lane head stays absent (`LaneHead::row_hash` is `Option`),
  so the next emit returns `MISSING_FIELD: antecedent` as buildRow throws it (relay-envelope.mjs:46);
  an absent `seq` prints as `undefined` in `LANE_HEAD_CORRUPT`.
- `readBlob` (relay-hbi-indexer.mjs:26-35): `off`/`len` go through JS `Number()` (ECMA-262
  StringToNumber: trimmed whitespace, decimal with fraction/exponent, `Infinity`, 0x/0o/0b), rounded
  once to the nearest double, then `Number.isInteger`, the cap, and the double sum `off + len`; the
  two messages print values with Number::toString. src/jsnum.rs computes all of this in integers
  (`l0_edge::jsnum::Dbl` has neither operation). Open/read failures carry node's message text.
- `emit` with neither `payload` nor `payload_file` stores `String(undefined)`, the 9 bytes
  `undefined` (relay-driver.mjs:32).
- Content scan (relay-carveout.mjs:14-26, 31-36): the eleven detection rules ("The patterns below
  are DETECTION patterns, not secrets.", :8), in table order, each matched by hand over the Latin-1
  text with the JS non-unicode regex meaning of `\b` (ASCII word characters), `\s` (TAB..CR,
  SPACE, NBSP) and the `i` flag (ASCII folding). The openssh header literal is assembled with
  `concat!`; the t5 fixture (relay-driver.test.mjs:67) and the per-rule test fixtures are assembled
  at run time, so no key-header or token-shaped literal sits in the sources.
- Structural guard (relay-carveout.mjs:40-74): `canonicalize` works on UTF-16 code units, as
  `cur.slice(parent.length + 1)` (:45) does; directly under `/` that slice drops the component's
  first unit (half of a surrogate pair for an astral first character), and the denylist then sees
  what the JS sees. The denylist folds ASCII only (a non-ASCII segment never matches), and an empty
  allow-root applies no allowlist (`if (allowRoot)`, :68).
- Paths: node `path.posix` (`resolve`, `dirname`, `sep` = `/`). Upstream imports `node:path`, which
  is `path.win32` on Windows (the upstream fixtures are `C:/...` paths); that variant is not ported,
  so the crate is POSIX-only. On Linux all eight upstream t9 deny inputs and t10a are rejected by
  the `:` rule (relay-carveout.mjs:59) in the JS and in the port alike; the denylist, trailing
  dot/space, 8.3, `$`-stream and allow-root branches are covered by the Linux-native fixtures in
  `carveout_paths_follow_node_path_posix` and by the generated cases below.

## Measured (Linux, node 22.22.0 running the unmodified upstream JS as the cold lane)

- Upstream JS suite: 23 PASS / 0 FAIL. Rust `phase1_relay_suite_23_assertions`: 23 PASS / 0 FAIL.
  Referee `--check`: 23 PASS / 0 FAIL and `CHECK OK`.
- Gold lane bytes, equal in upstream JS, Rust and referee: seed-3 `relay-acer.hbp` 768 B sha256
  664ced2f50c9cd2c2a04ae9bdc78da46a935c6eb448012ca0a57ad065739aa9b, `relay-acer.hbi` 517 B
  af005973b13d60b139d14263cea8437ce375e12208d2b6656d11333411ded09b, `relay-acer.payloads` 39 B
  0397014785bb208dfd6186a34d41a3e7c1b6ee721adead7435d04556e721de1d; file-sourced one-row
  `relay-acer.hbp` 254 B fde766004f7cf8955db751d018def73633b91fba77658c5479771e287f906fa1.
- Differential runs (op scripts executed by upstream JS, `examples/relay_ops`-style Rust driver
  and referee on identical fixture trees; per-op results compared as text, every lane file
  compared by sha256 afterwards):
  - 245 targeted ops (non-UTF-8 and unreadable lane files, sidecar token forms, multibyte path
    components under `/`, every scan rule, `Number()` forms and messages, empty allow-root, CR/CRLF,
    Linux-native carve-out fixtures): 0 differing, lane files identical. A further 8 ops with the
    payload store missing or a directory (len 0 and len 2): 0 differing, node's error text in the
    `PAYLOAD:` failures.
  - Seeds 1-6 generated fuzz, 44,059 ops (scan fuzz with hits on all eleven rules, `Number()`
    strings, carve-out paths, tampered lanes and sidecars, emits): 0 differing, lane files identical.
  - The referee's own `--cross` scripts, seeds 1-3, 6,920 ops: 0 differing, lane files identical.
  - UTF-8 decoding of 20,000 generated byte strings: node `Buffer.toString('utf8')`, Rust
    `String::from_utf8_lossy` and Python `decode('utf-8', 'replace')` give identical bytes.
- `python3 -I tools/referee.py --cross <relay_ops>` (seeds 1-3): 6,920 ops, 0 differing. Run against
  the same runner built on the port as it stood before these changes: 1,176 differing.

## Privacy scan

The five upstream files were scanned before porting. The only key/secret-shaped strings present are
detection patterns and example paths in relay-carveout.mjs / relay-driver.test.mjs (a
`.ssh/id_ed25519` example path, a key-header fixture line, format descriptors for cloud tokens);
there is no third-party personal data (no private person's name, phone, email, chat, LAN address,
or real key). The detection rules are ported as rules; no fixture or test string reproduces a real
credential.
