# Provenance: asolaria-kernel-lane

Sources:

- **FED**: `asolaria-federation-1024` @ `dc1da1a9cd88b77eb463053312b7c42a7dbe9b33`, `kernel/core`, `kernel/boot`, `kernel/docs/receipts`.
- **ASI-OS**: `asolaria-asi-os` @ `457159d6a56c95fd0c31a168e8aa535b591080b3`, `src/main.rs` (blob `bb5e14034c071f4f2dc968cd5a63f31258b1876c`).

Every file was taken with `git show <commit>:<path>`. `UPSTREAM.sha256` pins the sha256 of each vendored file. Each git blob id below is `git hash-object` of the copy, and it equals `git rev-parse <commit>:<path>`.

## 1. Vendored byte-identical (whole files)

| Copy | Upstream path (FED) | Blob | Lines |
|---|---|---|---|
| `core/src/syscall/mod.rs` | `kernel/core/src/syscall/mod.rs` | `17d12e5efcd47f7f9c6680c9e45ed9d9d4e45e9a` | 752 |
| `core/src/hookwall/mod.rs` | `kernel/core/src/hookwall/mod.rs` | `1514379e5a7b188562ad7d6f54aeab5baacd7a7b` | 197 |
| `core/src/cosign_chain/mod.rs` | `kernel/core/src/cosign_chain/mod.rs` | `c8342ed32a1d2dc5962b80b6e7a3e9cad4f05ce1` | 401 |
| `core/src/crypto/mod.rs` | `kernel/core/src/crypto/mod.rs` | `c4d8d1168fa9a0062822bf709a51f6847bdac9ff` | 347 |
| `core/src/envelope/mod.rs` | `kernel/core/src/envelope/mod.rs` | `e84bcab5fa521b8abc836fd20da2f8b980e71bc5` | 309 |
| `core/src/envelope/fedenv.rs` | `kernel/core/src/envelope/fedenv.rs` | `07065b738acc7c4dbcdf2cc59067ff6f65e8a00c` | 427 |
| `core/src/vfs/mod.rs` | `kernel/core/src/vfs/mod.rs` | `57ac03fff2312c9c284fccd03fae906d144fc464` | 718 |
| `core/src/frame_alloc/mod.rs` | `kernel/core/src/frame_alloc/mod.rs` | `b5a3fa6818ea3a23e7934a24f100b8da6f7e9088` | 252 |
| `core/src/agent_runtime/mod.rs` | `kernel/core/src/agent_runtime/mod.rs` | `664c9148cc387d7e1b2411b152c2ac374c1891ec` | 655 |
| `core/src/tier/mod.rs` | `kernel/core/src/tier/mod.rs` | `721d699d8a3930247e7e01014372ec8bb05b1bc2` | 222 |
| `core/src/gnn/mod.rs` | `kernel/core/src/gnn/mod.rs` | `05a9cca49bf5cd3a5814ce99219f7a2439562e76` | 208 |
| `core/src/bus_fabric/mod.rs` | `kernel/core/src/bus_fabric/mod.rs` | `5de1be37a9265586682b68c3d30809f62e381227` | 287 |
| `core/src/sign_gate/mod.rs` | `kernel/core/src/sign_gate/mod.rs` | `883f6c2d84191f2f99b1d79c2c3074910fc3b61c` | 210 |
| `vendor/federation-1024/kernel/boot/src/init.rs` | `kernel/boot/src/init.rs` | `d349b930367e65287fe0ff292713a176930bca7e` | 267 |
| `vendor/.../receipts/ACER-DEVICE-TIME-60D-BOOT-PROOF-2026-07-08.hbp` | `kernel/docs/receipts/` | `ca4bb032c72e03af6c44f27694c8ba82b7b7bdca` | 8 |
| `vendor/.../receipts/ACER-DEVICE-PID-MINT-BOOT-PROOF-2026-07-08.hbp` | `kernel/docs/receipts/` | `82851c2113ea16f12503aaffdb136aec32de8f41` | 9 |
| `vendor/.../receipts/ACER-DEVICE-VOXEL-20260708.hbp` | `kernel/docs/receipts/` | `e81b82e8b7cd7d95ca5bfffcf9cc5f3a68f85ccc` | 4 |
| `vendor/.../receipts/ACER-HWINV-BUILD-BOOT-PROOF-2026-07-07.hbp` | `kernel/docs/receipts/` | `3c941ec0048b1041971842217f61dac238942c74` | 10 |
| `vendor/.../receipts/ACER-KERNEL-GREEN-HARNESS-2026-07-07.hbp` | `kernel/docs/receipts/` | `5ab9789750b6fe2662e2cea1d136a4cf53de4b7a` | 18 |

Totals (`wc -l`): the 13 core files hold 4,985 lines, 5,252 with `init.rs`, and 5,301 with the 5 receipts as well.

The core module set is `syscall` plus every module a syscall body calls: `vfs`, `envelope` (with `fedenv`, which `envelope/mod.rs:23` declares), `frame_alloc`, `agent_runtime`, `hookwall`, `cosign_chain`, `tier` and `gnn`. It also includes `crypto`, because `cosign_chain/mod.rs:16` uses its `Signature`, and the two requested modules with no syscall caller, `bus_fabric` and `sign_gate`. Upstream's 178 unit tests in these files run in this crate (`cargo test -p asolaria-kernel-lane-core`): 178 pass, and 1 is `#[ignore]` upstream (`vfs/mod.rs:551`). Each receipt's sha256 equals its upstream `.hbp.sha256` sidecar.

`init.rs` is compiled through `build.rs`, which writes it to `OUT_DIR` with each of its 24 leading `//!` lines turned into `//`. `include!` rejects inner doc comments, and no other byte changes. `src/init.rs` adds crate-visible wrappers around the private `emit_init_ready`, `dispatch_envelope`, `emit_envelope` and `hook_context`, and constants for `INIT_ENVELOPE_MAX`, `RECV_WAIT_NS` and `RECV_FAILURE_THRESHOLD`.

`core/src/lib.rs` and `core/Cargo.toml` are glue. `lib.rs` carries upstream `lib.rs` lines 14-35 (the attributes and the named lint allows) and 72-105 (`KERNEL_VERSION`, `FEDERATION_ANCHOR_PID`, `test_sync`) verbatim. It declares the 12 modules above in rustfmt order. The dependency is the upstream workspace line `sha2 = { version = "0.10", default-features = false }`. The other upstream workspace dependencies are `ed25519-dalek`, `zeroize` and `crossbeam-queue`, and none of these modules uses them. The lock resolves `sha2 0.10.9`. The lane crate depends on the core crate under upstream's crate name, `asolaria_kernel_core = { package = "asolaria-kernel-lane-core", ... }`, so `init.rs`'s `use asolaria_kernel_core::...` lines compile unchanged.

## 2. Verbatim line blocks (`upstream-lines` markers)

`EXTRACTS.sha256` holds the sha256 of each upstream line range, computed from `git show <commit>:<path> | sed -n 'a,bp'`. `tools/referee.py --check` compares every marked block in `src/` and `core/src/lib.rs` with it. `--upstream <repo>=<checkout>` also compares each block with the upstream file directly. That run was done for FED and ASI-OS, and all 12 blocks were `ok+upstream`.

| Block | In |
|---|---|
| FED `kernel/core/src/lib.rs:14-35`, `:72-105` | `core/src/lib.rs` |
| FED `kernel/boot/src/hwinv.rs:51-93` (`HEX`, `put_hex8`, `put_hex16`, `put_bytes`, `put_u32`), `:95-96` (`DEVICE_CAP`), `:103-145` (`HwTuple`), `:280-313` (`BOOTPID` row) | `src/boot.rs` |
| FED `kernel/boot/src/rtc.rs:57-80` (`write_utc`), `:162-167` (`BOOTTIME` row), `:174-208` (`put_2`, `put_u4`, `put_u64`) | `src/boot.rs` |
| FED `kernel/boot/src/bootproj.rs:12-38` (`boot_pid` and the `BOOTPROJ` row) | `src/boot.rs` |
| FED `kernel/boot/src/driver_rst_vmd.rs:18-39` (`BOOTDRIVER` row) | `src/boot.rs` |
| ASI-OS `src/main.rs:361-375` (`HOST8KERNEL` parse in `live_status`) | `src/host8kernel.rs` |

## 3. Code written here, and how each piece differs from the upstream lines it follows

- `src/boot.rs`
  - `PciDev` (hwinv.rs:332-342) and `BootTime` (rtc.rs:12-22) are `pub` instead of `pub(crate)`.
  - `pci_scan` runs hwinv.rs:359-441 over a caller-supplied list of device-functions. The port reads (`cfg_read32`) stay on the metal. The PCI line statements (hwinv.rs:384-405) are one nesting level up.
  - `emit_device_pid` (hwinv.rs:264-319) takes `hw_digest`, `coord` and `device_digest` from `behcs1024_60d::project_60d`. That function returns upstream's `sha256(tuple)`, `project_60d(tuple)` and `sha256(BE16 coord)`, and its upstream code is byte-identical there (hwinv.rs:99-101, 147-262).
  - Each emitter returns its row bytes where upstream calls `serial_print`.
  - The `sha256` that `bootproj.rs:19` calls is `sha2::Sha256` over input truncated at `TUPLE_CAP`, which is what `hwinv::sha256` computes. `tests/receipts.rs` checks it against `behcs1024_60d`'s upstream `sha256` on the receipt preimage.
- `src/lane.rs`
  - `kernel_lane_context` is the `HookContext` literal of syscall/mod.rs:288-294 and 308-314.
  - `dispatch_verdict` is init.rs:102-106.
  - `verdict_row` is `compose_verdict_row` (hookwall/mod.rs:104-133) over that context.
- `src/sim.rs`
  - `run_step` runs one turn of init.rs:69-89, calling upstream `dispatch_envelope`.
  - For `SHTD` it runs init.rs:102-118 and 127-132, then stops where line 133 calls `sys_exit(0)`, which never returns (syscall/mod.rs:155-160).
  - On the 32nd consecutive receive failure it runs init.rs:85, then stops at `sys_exit(2)`.
  - `exchange` calls upstream `init::exchange`. It does not take `SHTD`, because that dispatch would call `sys_exit(0)`.
  - `BootLane` appends no cosign row of its own: the counter advances only by the appends the upstream code makes (measured: `init_ready` and 3 `run_step` calls advance it by 4). The tests count a step's appends by appending their own probe row (`COSIGN_PROBE`, `tests/common/mod.rs`) before and after it, because `cosign_chain` has no counter getter (cosign_chain/mod.rs:198-220).
- `src/host8kernel.rs`
  - `KERNEL_UNREACHABLE_BODY` is ASI-OS main.rs:283.
  - `api_kernel_body` is main.rs:282-284 without the HTTP GET.
- `build.rs`, `tests/`, `tools/referee.py` and `tests/fixtures/kernel-lane.hbp` are this crate's own. The transcript row format is test glue, not an upstream format.
  - The referee computes every transcript row from its mirror of the upstream lines, including the `GNN`, `GNNTOPN` and `GNNAGG` rows (gnn/mod.rs:78-150, syscall/mod.rs:355-374) and the `recv_failed` count of `run()`'s loop (init.rs:69-89).
  - The `HEALTHSPLIT` rows pin the line split of the asi-os parse, Rust `str::lines` (main.rs:363), on bodies holding `\r`, `\x0b`, `\x0c`, `\x1c`, `\x85` and ` `. host8-serve escapes its row fields (servers/host8-serve/src/main.rs:670-681), so its own bodies hold none of these.

## 4. Reuse check against existing aether crates

- `gate/hookwall`: no file there is byte-identical to upstream. The `git hash-object` values are `hookwall` `f4424a52`, `cosign_chain` `4d6969dd`, `sign_gate` `8c857b0b`, `crypto` `e19dd30c`, `syscall` `4fd21be1` (its first 75 lines), `spawn_gate` `9a4d1306` and `tier_gate` `aa28f5fa`. These differ from the upstream blobs listed in §1, and the differences are recorded in its PROVENANCE.md. Its `HookwallVerdict` and `AccessTier` are also types of that crate. Upstream `syscall/mod.rs` uses `crate::hookwall`, `crate::cosign_chain` and its own `HookwallVerdict`, so this crate keeps byte-identical copies of `hookwall` and `cosign_chain` and does not depend on `gate/hookwall`.
- `crypto` here is upstream's Phase-1 code (crypto/mod.rs:87-168): `sign` and `verify` compute `sha256(public || ":sign:" || msg) || sha256(that)`, and `derive_public` is `sha256(seed || ":derive:")`. The Ed25519 binding is in `gate/hookwall` (Claude's rewrite, kept per OWNER-RULES 8). On the boot-lane path nothing calls `crypto::sign` or `crypto::verify`: `cosign_chain` uses only the `Signature` type, and `sign_gate::gate_envelope` has no caller in FED (`git grep`).
- `kernel/behcs1024-60d` is used as a path dependency for `project_60d`. Nothing is duplicated.
- Overlap with `host8/` (another builder, uncommitted at the time of writing):
  - `host8/vendor/federation-1024/kernel/boot/src/init.rs`, `.../core/src/syscall/mod.rs` and `.../core/src/envelope/fedenv.rs` have the same sha256 as the copies here.
  - `host8/src/pid_sources.rs` `kernel_init_pid_source` computes the same kernel-lane triple as `lane::kernel_lane_context_for`.

## 5. Privacy scan (OWNER-RULES 5)

Every vendored file and block was read and grepped for e-mail addresses, phone numbers, user-directory paths, LAN addresses, keys and personal names.

- Clean, vendored: the 13 core files, `init.rs`, the 5 receipts and all blocks.
- Owner or system identifiers, kept:
  - `fedenv.rs:24` and `:348`: `ADMIN_OVERRIDE = "ADMIN-OVERRIDE-OP-JESSE"`, the owner's operator tag inside a policy constant.
  - Receipts: `owner=OP-JESSE`, seat `ACER-CLAUDE-FABLE5`, seat pid `8467a937cba309f7`, and the owner's machine model `acer_Nitro_AN515-52`.
  - Colony names `acer`, `liris`, `falcon` and `aether` in comments and constants.
  - `sign_gate/mod.rs:3` (`C:/asolaria-behcs-256/...`) and `tier/mod.rs:181` (`C:/asolaria-acer/...`) are drive paths with no user directory.
- Not vendored, because the earlier traces flag third-party data in them: `kernel/core/src/pid/mod.rs` (a user-directory path, and role tokens naming a person), `kernel/core/src/link_auth/mod.rs` (comments naming a second person), `kernel/core/tests/triple_runtime_parity.rs`, and the `LIRIS-*` receipts (device hostnames and a volume serial). None is needed on this lane: `sys_pid_current` uses only `FEDERATION_ANCHOR_PID` and `sha2`.

## 6. Measured behaviour (vendored code; the stdlib referee gives the same transcript)

- `sys_pid_current()` = `0xe00b1a465d6dcb50`, the `fingerprint` in ACER-KERNEL-GREEN-HARNESS. The `INIT` envelope is 32 bytes: `INIT`, seq 0, then the pid little-endian at bytes 12..20 (`50 cb 6d 5d 46 1a 0b e0`).
- Hook table: `EXEC` gives `[2, 3]`, and every other type gives `[9, 10]`. `sys_hookwall_pre` returns `Proceed` for both. Every verdict row is `slot, syscall_no, 01, 01, 00×8, 00, "HVD"`.
- Each dispatch makes exactly one cosign append, from `sys_hookwall_post`, and so does `emit_init_ready`.
- On the QEMU q35 receipt inputs:

  | Value | Result |
  |---|---|
  | `device_pid` | `d0162de451e51b30` |
  | `device_pid_full` | `d0162de4…b4e9` |
  | `hw_tuple_pid_full` | `22063f89…06a9` |
  | `coord_prefix` | `979.310.131.995.978.505` |
  | full 60-glyph coordinate | equals ACERVOXEL `bh_coord` |
  | `boot_pid` | `74d289e1bdbefd66` |
  | `BOOTDRIVER` status | `NOT_APPLICABLE` |

  All of these equal the receipts.
- The receipt rows and the code's serial rows carry different field sets. The receipt `BOOTTIME` row has `src=cmos_rtc_0x70_0x71+rdtsc`, and rtc.rs:167 writes `src=cmos_rtc+tsc`. The receipt `BOOTPROJ` row has `model=device+time`, which bootproj.rs:23-38 does not write. The receipt `BOOTDRIVER` row has `status_on_q35=NOT_APPLICABLE`, and driver_rst_vmd.rs:37 writes `status=NOT_APPLICABLE|no_8086:282A_on_this_device`. Every field both carry is equal.
- Console path (`exchange`, seq from 1). The console sends `PING`, `VERS` and `PIDA` through `init::exchange` (console.rs:305-308, 344-355):
  - `PING` replies `PONG` with seq 2 (32 B).
  - `VERS` replies with `0.2.0-phase3-scaffold` (33 B).
  - `PIDA` replies with the 46-byte anchor (58 B).
- `init::exchange` with types the console does not issue (`XCHG` rows of the transcript, same seq):
  - `EXEC` carries a 20-byte zero payload, so `sys_exec` returns `Invalid` and the reply is `EERR invalid`.
  - `INIT` replies `UNKN` + `INIT`.
- Headless `run()`:
  - After `emit_init_ready`, the loop receives its own `INIT` and replies `UNKN` + `INIT`. Every later turn receives the previous reply and replies `UNKN` + `UNKN`.
  - Between turns, the single slot holds init's latest reply, so a producer's `sys_envelope_send` returns `Exhausted`.
  - init.rs:55-58 says: "with no input source wired, this loop can only ever read init's own INIT-ready envelope, then waits forever".
- `run()` fed an `EXEC` envelope whose payload is at least 32 bytes:
  - `sys_exec` enqueues the payload into the slot (syscall/mod.rs:131).
  - The `EOKx` reply send then returns `Exhausted`. init ignores that result (init.rs:214), and `seq` still advances.
  - The next turn dispatches the payload as an envelope.
- `SHTD`: init emits `FINI` + `init-shutdown`, and posts `Proceed`. `sys_cosign_append(b"init-shutdown")` returns `Invalid`, because 13 bytes is under the 16-byte floor (syscall/mod.rs:329-332). Then comes `sys_exit(0)`.
- An envelope of 513-1024 bytes in the slot fails every `run()` receive into its 512-byte buffer. `dispatch_dequeue_bytes` restores the slot (envelope/mod.rs:208-211). The 32nd failure emits `SOS!`, whose send is refused because the slot is still occupied. Then comes `sys_exit(2)`.
- `sys_gnn_infer` writes `0` (`RoutingDecision::Local`) and returns `Ok(1)` for every input, because the model is not loaded (gnn/mod.rs:125-130). `aggregate_verdict` returns `Hold`, and `rank_top_n` returns items in input order with scores 1000, 999, and so on.
- `sys_tier_query` maps `_big-pickle-quarantine` to Hidden, `sovlinux` to Shadow, `vault/secret/` to Secret, `stealth/` to Stealth and `restricted/` to Restricted (case-insensitive), and everything else to Public. An empty path, a NUL or non-UTF-8 input gives `Invalid`.
- Release build on this host (x86_64, 4 CPUs, load average about 2: host context, as a whole number). Each figure is the median of 7 rounds (elapsed ns / iterations, integer); the range covers 3 runs:

  | Operation | Time |
  |---|---|
  | `exchange(PING)` round trip | 231-262 ns |
  | `run_step` | 162-175 ns |
  | `boot_rows` for the 6 q35 functions | 3,523-3,609 ns |
