# host8 provenance

Upstream: `github.com/JesseBrown1980/asolaria-federation-1024` @ `dc1da1a9cd88b77eb463053312b7c42a7dbe9b33`
(on-disk mirror read at `/home/user/asolaria-federation-1024`, `git log` HEAD == `dc1da1a`).

Vendored byte-identical (git blob id == upstream blob id; sha256 in `UPSTREAM.sha256`). All 18 vendored
files were privacy-scanned before copy (emails, phone numbers, IPv4 and MAC addresses, PEM blocks and
API-key patterns, user-profile paths, personal names): no third-party personal data found. Present, and
all the owner's own, from the owner's public repository:

- the owner's first name: `ADMIN_OVERRIDE = "ADMIN-OVERRIDE-OP-JESSE"` (kernel/core/src/envelope/fedenv.rs:24,
  matched as a cosign token at :171, set in a test at :348), `"jesse-pixel-backend"`
  (host8-serve/src/fable5_descriptors.rs:48), `special-op-jesse-watchdog-kicker.mjs` (host8-serve/src/main.rs:147);
- the owner's surname in the method name "Brown-Hilbert" (agent-runtime/src/lib.rs:15, :421;
  host8-serve/src/main.rs:1574);
- the federation's vantage names (`VantageId` at agent-runtime/src/lib.rs:164-169: Acer, Liris, Falcon,
  Aether): a Windows profile path under `C:\Users\acer\` (host8-serve/src/main.rs:55), the `acer` device
  token as the default `device` (host8-serve/src/main.rs:1001, :1178, :1343; replay_prep.rs:301) and in
  test fixtures, and `liris` (fedenv.rs, syscall/mod.rs, agent-runtime/src/lib.rs, gnn-oracle/src/lib.rs,
  fable5_descriptors.rs);
- the owner's device paths on `C:` and `D:` (host8-serve/src/main.rs:39-50, :1663;
  agent-runtime/src/rooms.rs:1, :93, :125-126; fischer-eval/src/lib.rs:806);
- loopback bind addresses `127.0.0.1:5088` (host8-serve/src/main.rs:33) and `127.0.0.1:5089`
  (fischer-eval/src/main.rs:13).

Other matches were FNV constants, synthetic test PIDs and timestamps.

| upstream path | git blob id | sha256 |
|---|---|---|
| servers/host8-serve/Cargo.toml | 1b35900cb7aafd0b71971bc332f8cc63161a70c5 | eaea112a38d4281359cd8feaba2e2d157ba264682b5087e4424ef1118a566728 |
| servers/host8-serve/src/main.rs | 6cd22f99140b015433a2a3d62c1f049a72ddaee9 | 9da49e56f64d60689355b7abec7f29871188e4ffd99bbd7c4aa5ee39aecfd776 |
| servers/host8-serve/src/replay_prep.rs | af65a3d9631ac12f95b68aab9166c2d291839f35 | ea74a25a3487a185c83a90983c0277794b239d1604d82357e88751c76685ed7f |
| servers/host8-serve/src/fable5_descriptors.rs | ed26bd875c5ad3b9403218a72dedc3a1a3ccccad | b26483647a8471760273a1fb4da4532e56cef85ff0704d9a16ee01ff0ab86b6d |
| servers/host8-serve/src/spawn_cognition.rs | 37f4a6aac1933a42ee9d3a32c3fabca6cb6fcb64 | 6ed13b68771164a4d2833f3b5d006856aacdb446a39c0df2ff8fe34b1e24c3fb |
| servers/agent-runtime/Cargo.toml | 9ca452368c0c589acf927c5795a06de26f1d0488 | f03aa490b5fa083e696032e4131ed37d65c343109fbe32f2c73b08ac3bf31b8b |
| servers/agent-runtime/src/lib.rs | a2acbd3eb17eb1938157ece15118b1e2d1200da6 | 3c8604550c69495e5861c1a3a749711685158c976e10367d71b881aa791c6767 |
| servers/agent-runtime/src/rooms.rs | d352d9d6e852fdae4be33993f5d1d5be9c665dd4 | 8fa5ad6913f39ce98d059cb7d8472635cc179a234d25aaf0c52f16b2755ff64f |
| servers/agent-runtime/src/runners.rs | 70d9d87f488c7d8b4849884beedbc44c3e57c1af | 6885b890c3783ab13e014307cc1ba28e684de382da6bb2d0b3dc4b804b109d42 |
| servers/gnn-oracle/Cargo.toml | c07f890c7f634f1f072817b5ad2674dd30974588 | 70a93fbf4588463ae342a9a6339ad032d043facdbfaae7d2020a1260dd39fdb2 |
| servers/gnn-oracle/src/lib.rs | 41e4c109fbbec73a7d262f6998fcbc76d940e5d7 | 421a346e81ce126d9754c0ad165cd0bea5fa5ec0064fa3f688e65d1228f77552 |
| servers/fischer-eval/Cargo.toml | e10223738df5c29f60ceff08c5465ce11eab3dae | 555f2d22097073d6c5d894d6e57d4fb6c1bf6bf2ab8c151de9070ee8c1160e8d |
| servers/fischer-eval/src/lib.rs | d8774234245bd41e4fb5d4f50ca557141e8294c4 | ee0a89ee9e32a764aa23ece56f302fd2526603496f6308e0262c5ad0da798bdb |
| servers/fischer-eval/src/main.rs | e79c1960517823f4321b1dbb586ca927bca9d4dc | 831621aaece59580cae736c34ff0b6ab7b689b2fd989ce7cebbd7e76aa5b24ee |
| kernel/core/src/envelope/fedenv.rs | 07065b738acc7c4dbcdf2cc59067ff6f65e8a00c | b3911662e6f56eab89b76cab650379ce7885af78802a621988a2efbd8c53bae9 |
| kernel/core/src/spawn_gate/mod.rs | dba09d1886317c056a9b23fc6a723ba457f80abf | 4ccdd5932a0d674bb7152d397f6f93185c692b3a31d81f7e146791f9224af862 |
| kernel/boot/src/init.rs | d349b930367e65287fe0ff292713a176930bca7e | ae4e11d14c642055ba0f8eca33569dfdf2934cfce8484b3565fd4c80be6b232c |
| kernel/core/src/syscall/mod.rs | 17d12e5efcd47f7f9c6680c9e45ed9d9d4e45e9a | 3a0e9e07f7860ffa44869da2632028f6b92e3fafb7a153999ce940379070d1a6 |

## Slices of host8-serve/src/main.rs included verbatim (blob 6cd22f99)

Each file is `sed -n 'A,Bp'` of the vendored `servers/host8-serve/src/main.rs`; sha256 in `UPSTREAM.sha256`.

| src/upstream file | main.rs lines | upstream items | sha256 |
|---|---|---|---|
| main-0069-0081-seat-struct.rs | 69-81 | `Seat` | a1d4610ab87668c2c66f644d8e47430997ed49ed6d65a6f4c56b775ef77bbe0e |
| main-0324-0429-seat-parse.rs | 324-429 | `row_value`, `row_handle8`, `seat_from_row`, `seat_from_per_seat_file` | 4926624ae71e7cebaf6bbe114e1813b67ec7aeba5f523967228f5cb7e4198612 |
| main-0536-0589-handle8-sha16.rs | 536-589 | `canonicalize`, `fnv1a64`, `host_handle8`, `sha256hex`, `sha16` | caba8c5d46d4a8e91de9175b4c2cd6c340333d314e0ad178f970413cdec029e9 |
| main-0601-0615-verb-catalog-parse.rs | 601-615 | the parse loop of `load_verb_catalog` | d6d1f990459944baf64986a9548040775be7c40fbfc7ef0dea4390b3add58a04 |
| main-0619-0661-tuple60d-instance-pid.rs | 619-661 | `tuple60d`, `resolve_instance_pid` | bfb28c937cad72fda24d113cf45fcf7767393afdc879d1dbe8d7a88cdff15974 |
| main-1572-1616-seat-tests.rs | 1572-1616 | upstream's four seat-parse tests | 7236ff662d8d658ed489c5661e7315268a37fd586d4d5ea32a02c9f2d270dfa4 |
| main-1654-1711-node-parity-tests.rs | 1654-1711 | upstream's node vectors and three parity tests | db64f0b1c22bb4e8471c3a20cae788829ee08863991715716b3affe18c6a33a9 |

## Compiled surface vs. vendored bytes

- `src/rooms.rs` IS the upstream `servers/agent-runtime/src/rooms.rs`, byte-identical (blob
  `d352d9d6…`), compiled and run by this crate; its six upstream parity tests pass unmodified.
- `src/identity.rs` includes the seven slices above with `include!`. Upstream's fns and `Seat` are private
  to its binary, so they stay private here; identity.rs exposes them through one-line public wrappers with
  the same names and a public `Seat` with the same seven fields. `load_verb_catalog` (main.rs:595-617) is
  brought in without its file read (:596-599): lines 600 and 616 are restated and the caller passes the
  `verbs.hbp` text (`verb_catalog_from_hbp`). The test `included_slices_equal_vendored_main_rs_lines` and
  the CI `sed -n | cmp` step check every slice against main.rs.
- `src/pid_sources.rs` is the OWNER-RULES 7d deliverable: the two caller_pid/slot/syscall_no lanes,
  each its own function — the Host8 launch-plan lane (`main.rs:1224-1235`, `SYS_SPAWN_GATED=9` at
  `main.rs:1129`; upstream passes `room_id = room_id_from_pid(&instance_pid)`, main.rs:1205) and the
  kernel init-table lane (`syscall/mod.rs:291,311` + `init.rs:149-163`).
- `servers/agent-runtime`, `servers/fischer-eval` and `servers/gnn-oracle` are workspace members, compiled
  unchanged with their own upstream tests (23; 12 lib + 3 bin; 14). Each Cargo.toml declares no
  dependencies; agent-runtime/src/lib.rs:41-47 carries its own `AccessTier` copy "without forcing this
  userspace crate to depend on `kernel-core`". fischer-eval's binary `fischer-eval-host8` is upstream's
  loopback HBP server (src/main.rs:28 `TcpListener::bind`, default `127.0.0.1:5089` at :13); it is compiled
  for its 3 unit tests and is never started by any check.
- Carried for provenance, not compiled here:
  - `servers/host8-serve` (Cargo.toml, main.rs, replay_prep.rs, fable5_descriptors.rs, spawn_cognition.rs).
    Its Cargo.toml:15-21 declares seven path dependencies: `asolaria-kernel-core` (`../../kernel/core`),
    `asolaria-server-agent-runtime`, `-cosign-ledger`, `-fischer-eval`, `-gnn-oracle`, `-highway` and
    `-tier-policy`, plus `sha2 = { workspace = true }` (:23). Where each one is:
    - agent-runtime, fischer-eval, gnn-oracle: vendored and compiled here (above);
    - kernel-core: not in aether as that package. Three of its modules are vendored here (below);
      `kernel/lane/core` (package `asolaria-kernel-lane-core`) carries twelve of its modules, and
      `spawn_gate` (used at main.rs:21) is not among them. `gate/hookwall` (package
      `asolaria-hookwall`) carries `spawn_gate/mod.rs` from blob `dba09d18` with comment lines 8-10,
      78 and 80 replaced (its PROVENANCE.md), blob `9a4d1306`;
    - cosign-ledger: not vendored here; aether carries it at `ledger/cosign-council/cosign-ledger`
      (package `asolaria-server-cosign-ledger`, src/lib.rs blob `4ab9fe0b` == upstream);
    - highway, tier-policy: not vendored here and not in aether (upstream at federation-1024@dc1da1a9
      `servers/highway`, `servers/tier-policy`).
  - kernel modules `kernel/core/src/envelope/fedenv.rs`, `kernel/core/src/spawn_gate/mod.rs`,
    `kernel/core/src/syscall/mod.rs` and `kernel/boot/src/init.rs` (no crate manifest of their own here).
- Nothing here is wired into gate/observed.

## Same blobs elsewhere in aether (for the integrator)

| here | blob | also at |
|---|---|---|
| kernel/core/src/envelope/fedenv.rs | 07065b73 | kernel/lane/core/src/envelope/fedenv.rs |
| kernel/core/src/syscall/mod.rs | 17d12e5e | kernel/lane/core/src/syscall/mod.rs |
| kernel/boot/src/init.rs | d349b930 | kernel/lane/vendor/federation-1024/kernel/boot/src/init.rs |
| servers/fischer-eval/Cargo.toml | e1022373 | gate/fischer-upstream/vendor/federation-1024/servers/fischer-eval/Cargo.toml |
| servers/fischer-eval/src/lib.rs | d8774234 | gate/fischer-upstream/vendor/federation-1024/servers/fischer-eval/src/lib.rs |
| servers/fischer-eval/src/main.rs | e79c1960 | gate/fischer-upstream/vendor/federation-1024/servers/fischer-eval/src/main.rs |
