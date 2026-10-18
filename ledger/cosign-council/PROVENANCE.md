# ledger/cosign-council provenance

Upstream: `github.com/JesseBrown1980/asolaria-federation-1024` @ `dc1da1a9cd88b77eb463053312b7c42a7dbe9b33`
(on-disk mirror `/home/user/asolaria-federation-1024`, `git rev-parse HEAD` == `dc1da1a9`, clean worktree).
Every upstream file was taken with `git show dc1da1a9:<path>`. Each blob id below is `git hash-object` of the
copy and equals `git rev-parse dc1da1a9:<path>`. `UPSTREAM.sha256` pins the sha256 of each copy.

## 1. Vendored byte-identical (34 files)

| Copy | Upstream path | Blob | sha256 | Lines |
|---|---|---|---|---|
| `cosign-ledger/src/lib.rs` | `servers/cosign-ledger/src/lib.rs` | `4ab9fe0b8353041f04600d7aea19596bc3e06ed5` | `28fed0643b196e78a6d28aa2b57d24f7d38104ba598e8f455c51f2f90b7047cf` | 207 |
| `cosign-ledger/src/py_parity/canon.rs` | `servers/cosign-ledger/src/py_parity/canon.rs` | `1f28b197837fafdf3a4bae647d66894c8540fd95` | `ff827b2d5112e13b00bebc9e044f1cbd500a1c833525f7642fb2d53bab6d3be0` | 113 |
| `cosign-ledger/src/py_parity/chain.rs` | `servers/cosign-ledger/src/py_parity/chain.rs` | `460cfbc35073446e7afb7728d47ae7e966228f5d` | `5b02de242e0f35b28d69f6140326daa17dbbc943162db250ce59fc1427f98302` | 125 |
| `cosign-ledger/src/py_parity/json_tok.rs` | `servers/cosign-ledger/src/py_parity/json_tok.rs` | `0dc1d52aa7483df1d9b20c9f7310b13c1db50bc4` | `b199b0a977fc66f306922b0bba333dc7008d92bb9afa3747629a7577ad0e0e29` | 306 |
| `cosign-ledger/src/py_parity/mod.rs` | `servers/cosign-ledger/src/py_parity/mod.rs` | `5ed2d38ef6dbcbba7617310863da86ebe63b12c0` | `d20c92c9f80491f9768c1b4bd0ec2a43f3499e2cc67c62b3514f49233edc8785` | 17 |
| `cosign-serve/fixtures/daemon-row-hash.ndjson` | `servers/cosign-serve/fixtures/daemon-row-hash.ndjson` | `2f3ac8ced4a0924e7a0efd341d49f45b9b6cc08b` | `360ab88716b5a84b9e8c47d6f3d95c9743bfcd7730fb34208198ba0421d1308a` | 2 |
| `cosign-serve/src/http.rs` | `servers/cosign-serve/src/http.rs` | `d7315c0c302f75ac1d85d4cf2de3f20508ca9fb6` | `9f24043ca0742f2f9e9f6c398e2f46460cbba35ffbfef804d6374a1ba3d9b1cd` | 110 |
| `cosign-serve/src/main.rs` | `servers/cosign-serve/src/main.rs` | `dd59b64b7bf6b498c50ac560ae536d411e79d35d` | `689aca1c9ced532dfca913eaaefd7a0dbee30f76e99ba7e81d9cedeaea09ef7a` | 146 |
| `cosign-serve/src/resume.rs` | `servers/cosign-serve/src/resume.rs` | `bd63add88888782bd462b645e6c30f600c144c1f` | `e77f6db633229e6fa8f180ec459a04c3b5c7acd5a1c1b8abfc46841d277d7ea5` | 23 |
| `cosign-serve/src/routes.rs` | `servers/cosign-serve/src/routes.rs` | `19fad37000ace88be00878833b5b91875d9538cf` | `5fc5642762a0aa4ed90cc7c55d989309e1440decbfe77346e5c954c67aa435c0` | 211 |
| `cosign-serve/src/store.rs` | `servers/cosign-serve/src/store.rs` | `39d0f9d45b6f9d1642eba95c7a699c78e51f8876` | `9c4d295469e5d39cb6990261d3c9b7f2cf346327df337bc67e61fe217e0606eb` | 72 |
| `cosign-serve/tests/parity_differential.rs` | `servers/cosign-serve/tests/parity_differential.rs` | `cbc2ce21a91feec10e831ebc4ce70b49972f26d1` | `4151808d9998dbbb0c50c95e18e100f5a6c6943437a4c6eca9e535bf26b92c3a` | 21 |
| `cosign-serve/tests/parity_replay.rs` | `servers/cosign-serve/tests/parity_replay.rs` | `0ae4e8e1be9006eec374ace91746c6c0aa446127` | `3c24ead57d85fbb08084f07846562477124a4843975e33af3fad01c7bdd913ac` | 66 |
| `council-serve/src/engine_drive.rs` | `servers/council-serve/src/engine_drive.rs` | `e00bf19e4d3eb77e440f16110f9326e8a4782c81` | `8b80b7f31514207afdd9c0421699660e432b83633592b80d6fbc3ffbdb68d0bb` | 27 |
| `council-serve/src/http.rs` | `servers/council-serve/src/http.rs` | `72c40e764b673a70c2f95ba540657d090735f981` | `110152a618176af9ed0d08b74acddd6c9b8739b7d7b8e3bd3f1ca2b4e6ed70f3` | 48 |
| `council-serve/src/lane_event.rs` | `servers/council-serve/src/lane_event.rs` | `5a0484ee3bc0cabacec6807e2bfc5df2fc975932` | `c6bcc17c5b6363cc986e1466f7af8538243a2447290ec5b93b0794045a4137cd` | 311 |
| `council-serve/src/lane_health.rs` | `servers/council-serve/src/lane_health.rs` | `a5dd839f67c9b5498da5dba6ae93233042d15da8` | `376f2434a3eb280c8d632eeacb0baca1a281ecfae31d3c0d1b22490a7cad5a8f` | 255 |
| `council-serve/src/main.rs` | `servers/council-serve/src/main.rs` | `efb84a095a92ee8dba3ae6ceb4853a20041a7ce6` | `e75c6085205d4cf528512ab942782844a80a5b512581565fea190c025fc69ddf` | 64 |
| `council-serve/src/mcp_health.rs` | `servers/council-serve/src/mcp_health.rs` | `3b2eb8a37546e0e3a38e3a1bc20f579dd771f1d7` | `9f2b052c6698a1a8c1818bacb4a3ad8abf1d09fd599f6d51efdce04f8a4f7d46` | 581 |
| `council-serve/src/policy.rs` | `servers/council-serve/src/policy.rs` | `9b7b703f91aa7218dd62aecaf5c907f663de7c90` | `cab91488f161af42525039ba76738c70ba80aaebaa60d613ade02f10c191b6c3` | 180 |
| `council-serve/src/ptc_dispatch.rs` | `servers/council-serve/src/ptc_dispatch.rs` | `c58142b7b17f9759c24a4a4f19625776416996aa` | `310b8b019cc7a92499a558772e90a9ef23bf7b4dad7a2bf655fa388c9e312ea1` | 264 |
| `council-serve/src/recovery.rs` | `servers/council-serve/src/recovery.rs` | `2eb44c0c2ce2e7aed785d0d123b7edb8b5d4c36c` | `f39f8f84520da64a98cfe50c37e179ba663b1dfff6c1bb06d39bc143dfc2cc83` | 177 |
| `council-serve/src/routes.rs` | `servers/council-serve/src/routes.rs` | `2b79e00e17524a2e55cc41bb6d3bcff1f095ec6a` | `b6b1a0eb174a1606499c5c05fb04296cdd77f14ecce7c961f76e2e9887a11e7c` | 1930 |
| `council-serve/src/routes.rs.sha256` | `servers/council-serve/src/routes.rs.sha256` | `6fc71f73ee28233652c7154570cf45b0b8058123` | `59e1cdf8207c91ad875bf17af73f43b238ec063909e30f663a873b4df316b09f` | 1 |
| `council-serve/src/stale_branch.rs` | `servers/council-serve/src/stale_branch.rs` | `fa6ccaade2db7af9674a845a2923e1b4893d34d7` | `a5af4a2de2e7dbc11bdd33219bc5474690d730dbf86897818550a255a46140f5` | 188 |
| `vendor/federation-1024/servers/cosign-ledger/Cargo.toml` | `servers/cosign-ledger/Cargo.toml` | `d00d03252e2a4b54d990e6725468dd3217e44e2d` | `e65bca6c31e47b1871b125ceb66ba48b275b270383e9ace16109fa2adce1e28c` | 18 |
| `vendor/federation-1024/servers/cosign-ledger/Cargo.toml.sha256` | `servers/cosign-ledger/Cargo.toml.sha256` | `7cae59ef017f9422a7d59722a7382f801a1d17e2` | `e68058099b14e20199dadbadbe4e9c189d54cde4627e167bee475e82fb234582` | 1 |
| `vendor/federation-1024/servers/cosign-serve/Cargo.toml` | `servers/cosign-serve/Cargo.toml` | `2ec88c45333db128804ee53a30d72a651c7d9ff7` | `0c5e4004a8544a01670bb8268951b0197e18c24fe2e8234ab0a6f6fe78927e32` | 15 |
| `vendor/federation-1024/servers/cosign-serve/Cargo.toml.sha256` | `servers/cosign-serve/Cargo.toml.sha256` | `b39c1c9f3c2c45eda8f716c94fc0159060ea4330` | `ccd0aff55dedec7b72e16d5bef067a567b58703b9316b135df767ded8942a48b` | 1 |
| `vendor/federation-1024/servers/council-serve/Cargo.toml` | `servers/council-serve/Cargo.toml` | `e41a78fb4b3f7ee9d4052204250240b69ff08429` | `08e93d7d38b5808f8cd3f01f915765db4555765dd12086ca64949ddd59ef8d7c` | 15 |
| `vendor/federation-1024/servers/council-serve/Cargo.toml.sha256` | `servers/council-serve/Cargo.toml.sha256` | `7d4e561ed0741b307e0c980cf117293b849444df` | `0f100c776d7b815e4af5029094fbe93415eadb070365c7090c101981585ad4a0` | 1 |
| `vendor/federation-1024/servers/vote-quorum/Cargo.toml` | `servers/vote-quorum/Cargo.toml` | `1b29e40af78e232d6d12052c318e4a682ad285ab` | `6189fff400c7e9b4359988057a8e5cc9401b189a9810ac7a8702ebedfbc44330` | 20 |
| `vendor/federation-1024/servers/vote-quorum/Cargo.toml.sha256` | `servers/vote-quorum/Cargo.toml.sha256` | `f278856388bbe2be71b14b5c6817da04b01febaf` | `8885a3073710881a938cbf77c3a0eb01c3f1a42ade43fa35763c8d71e9686564` | 1 |
| `vote-quorum/src/canon.rs` | `servers/vote-quorum/src/canon.rs` | `1d352dc907e408a04800e0ccbb9cf6331732c7db` | `6b3c6227c16379361c2fe5014c1a0227306c64e834a5cb0c1a5f462f715624b6` | 250 |

Each upstream sidecar agrees with its file: `Cargo.toml.sha256` with the manifest beside it, and
`council-serve/src/routes.rs.sha256` (`b6b1a0eb...`) with `routes.rs`.

The four upstream manifests are kept under `vendor/` for provenance only. They name their
dependencies with `{ workspace = true }` (federation-1024 `Cargo.toml:46,53`), so they cannot be the
active manifests here. The active manifests are glue (section 3).

## 2. One copy of `schedule.rs`

Upstream `servers/council-serve/src/schedule.rs` (blob `6b3c8d7fe8b8262164305ded95a172044d56ea6b`, sha256
`ab90e5a327477dbd559980e0d7d8f147403aa7297d5903cddd357aaad4a4b787`, 179 lines) is already in aether as
`proposals/verify-schedule/schedule.rs`, with the same blob id. It is not copied here. `council-serve` depends on that
crate by path (`asolaria-verify-schedule`, `version = "0.1.0"`). Glue `council-serve/src/lib.rs` re-exports it as
`schedule`, so upstream `routes.rs:17` (`use crate::schedule;`) compiles unchanged. Its 7 upstream tests run in
that crate (`cargo test --manifest-path proposals/verify-schedule/Cargo.toml`), not in this workspace.

## 3. Line-range extracts (EXTRACTS.sha256)

`main.rs` and `http.rs` hold the listeners, so they are not compiled whole. `build.rs` reads the vendored file,
checks that the first and last line of each range are where they should be, and writes the range to
`OUT_DIR` for `include!`. `EXTRACTS.sha256` (the kernel/lane format) pins the sha256 of each range's own lines.
`referee/referee.py --check` recomputes all ten ranges.

| Range | What it is | How it is used |
|---|---|---|
| cosign-serve `main.rs:16-18` | `DEFAULT_BIND`, `DEFAULT_LIVE_PATH`, `DEFAULT_SHADOW_PATH` | items |
| cosign-serve `main.rs:21-25` | `struct Shared { live_path, append_enabled, writer }` | item |
| cosign-serve `main.rs:28-37` | the four `ASOLARIA_COSIGN_*` environment reads | the body of `CosignServe::from_env`, wrapped in `{ ... }` with the tail `(bind, live_path, shadow_path, append_enabled)` |
| cosign-serve `main.rs:39-54` | `ensure_clean_tail`, `resume_from`, open the shadow, `Arc::new(Shared { .. })` | the body of `CosignServe::open`, wrapped in `{ ... }` with the tail `Ok(Self { shared })` |
| cosign-serve `main.rs:81-112` | `now_iso`, `unix_utc_parts`, `civil_from_days` | items (append stamps `ts`) |
| cosign-serve `main.rs:123-146` | `json_escape`, `json_pair_str`, `json_pair_num` | items (route bodies) |
| cosign-serve `http.rs:8-13` | `pub struct Request` | item in `mod http` |
| council-serve `main.rs:30-32` | `pub struct Shared { pub vote_dir }` | item |
| council-serve `routes.rs:21-30` | `hbp_escape` | item in `mod producer` |
| council-serve `routes.rs:168-296` | `render_schedule`, `parse_proposal`, `find_key`, `json_str`, `json_unit_q` | items in `mod producer` |

The only text added around a range is the two wrappers named in the table. The `routes.rs` ranges also compile
inside `routes` (the whole file). The copy in `producer` gives in-process callers upstream's own function,
without the file and environment reads of `routes.rs:117-144`.

## 4. What is not compiled, and why (process boundary)

- cosign-serve `main.rs:27` `fn main`. Its listener is `main.rs:56-78`: bind `127.0.0.1:5091`, print the
  `COSIGNSERVE|...` boot row (`:57-62`, with `hbp_escape` at `:114-121`), and run one thread per connection
  under `MAX_CONN` (`:19`). Also `http.rs:15-110` (socket read, HTTP framing, `write_status`). These lines are
  not ported. `CosignServe::handle` passes a request to `routes::route` the way `http.rs:17-20` does after
  reading the socket.
- council-serve `main.rs:34-64` `fn main`: bind `127.0.0.1:5090`, start `engine_drive::spawn_gated()`
  (`main.rs:43`; `engine_drive.rs`, a thread that sleeps and asserts that `SPAWNER_EMIT` is false), and accept
  connections. Also `http.rs` (all of it). These lines are not ported. `route` is called directly.

## 5. Glue (written for this directory)

`Cargo.toml` (workspace), `rust-toolchain.toml`, `Cargo.lock`. `cosign-ledger/Cargo.toml`, `cosign-serve/Cargo.toml`
plus `build.rs` plus `src/lib.rs`, `vote-quorum/Cargo.toml` plus `src/glue.rs`, and `council-serve/Cargo.toml` plus `build.rs` plus `src/lib.rs`.
`cosign-serve/tests/inprocess.rs` and `council-serve/tests/inprocess.rs`. `vectors/` (the referee's printer).
`referee/referee.py`, `referee/REFEREE.hbp` and `referee/LIVE-CHAIN.hbp`. Package names are the upstream ones
(`asolaria-server-cosign-ledger`, `-cosign-serve`, `-vote-quorum`, `-council-serve`), so upstream `use` lines
resolve unchanged. That includes `host8/vendor/.../host8-serve/src/main.rs:14`
(`use asolaria_server_cosign_ledger::CosignChain`), which the integrator can point at this copy.

Dependencies are the upstream workspace lines written in: `sha2 = { version = "0.10", default-features = false }` and
`ed25519-dalek = { version = "2.1", default-features = false, features = ["zeroize"] }`. `ed25519-dalek`
is declared by upstream `cosign-ledger/Cargo.toml:18`; no line of its `src/` uses it. Every third-party
version in `Cargo.lock` equals the version in federation-1024's own `Cargo.lock`: sha2 0.10.9,
ed25519-dalek 2.2.0, curve25519-dalek 4.1.3, zeroize 1.8.2, ed25519 2.2.3, signature 2.2.0, subtle 2.6.1,
digest 0.10.7, syn 2.0.117, and the rest.

The upstream `[profile]` lines (federation-1024 `Cargo.toml:55-65`: release `opt-level = "z"`, `lto`,
`codegen-units = 1`, `panic = "abort"`, `strip`; dev `panic = "abort"`) are not carried. A library's profile
does not apply to the crates that depend on it, so this is recorded rather than changed. In process, a panic in
upstream code therefore unwinds into the caller of `CosignServe::handle` instead of ending the process.
Measured in a debug build: a shadow row with `seq` 18446744073709551615, then `POST /api/cosign/append`, panics with
"attempt to add with overflow" at `cosign-ledger/src/py_parity/chain.rs:43:20`; the caller catches the unwind,
and the next append answers 500 `{"ok":false,"error":"writer-poisoned"}` (`routes.rs:73-80`).

## 6. Relation to other aether copies

- `kernel/lane/core/src/cosign_chain/mod.rs` is upstream `kernel/core/src/cosign_chain/mod.rs` (blob `c8342ed3`).
  `cosign-ledger/src/lib.rs` is a different upstream file, "Phase-2.5 demote of kernel/core/src/cosign_chain/mod.rs
  to userspace crate" (`lib.rs:1`). There, `CosignChain::append` and `validate_end_to_end` return
  `Err(CosignChainErr::Unimplemented)` (`lib.rs:127-137`, "v0.1 stub"). The module-level `append` (`lib.rs:155-173`)
  hashes the row with sha256, drops the digest, and returns a counter. The kernel copy implements the sha-link
  `append` and `validate_end_to_end` (`cosign_chain/mod.rs:137-182`). Each file exists once in aether.
- `proposals/verify-schedule` is section 2.

## 7. Privacy scan (OWNER-RULES 5, build contract 6)

Before copying, all 36 candidate files (the 34 above plus the two vote-quorum files below) were scanned for
emails, phone numbers, IPv4 addresses, PEM or OpenSSH keys, token, password and secret strings, user-directory
paths and personal names (regexes, plus a list of every capitalised word).

- Clean and vendored: the 34 files above. The only IPv4 literals are the loopback binds `127.0.0.1:5091`
  (cosign-serve `main.rs:16`) and `127.0.0.1:5090` (council-serve `main.rs:26`). The paths are operator-machine
  ledger locations: `C:/asolaria-acer/COSIGN_CHAIN.ndjson` (cosign-serve `main.rs:17`,
  `tests/parity_differential.rs:13`) and `C:/HyperBEHCS/data/vote-quorum` (council-serve `main.rs:27`).
  `routes.rs:2` names a seat ("liris"). The fixture rows hold synthetic values only.
- Vendored on the owner decision of 2026-10-18: upstream `servers/vote-quorum/src/lib.rs` (blob
  `d4cccb9426be197e59b4aa0bb7c2c04c10ab113a`, sha256
  `fd15c363e9b865f595c509c58c0e4250435c007a3b381a576b66f21798566fd1`, 231 lines). Its `QUINTUPLE`
  constant (`lib.rs:17`) and the vectors of its unit tests (`lib.rs:157-219`) carry operator first-name role
  tokens of people other than the owner. `evaluate`, `rule_for` and `is_authorized` (`lib.rs:62-142`) read that
  constant, so the file cannot be split without changing it. `servers/vote-quorum/src/bin/vote-quorum-parity.rs`
  (blob `c43a875bb5cfec2de2940639bee9e7beb837db6c`, sha256
  `2e94f0fbf772aab012e76005a8ef064aff7c72c28d23da453a0255fdd42b2323`, 205 lines) is clean, but it calls
  `evaluate` (its line 20 imports it), so it was held with `lib.rs`. Both were held until the owner's clearance,
  because the build contract says "vendor only clean files". Owner decision, 2026-10-18: "Publish as-is" (the
  operator first names and the `OP-<NAME>` role tokens; one answer covers `ledger/cosign-council`,
  `ledger/hyperbehcs-daemons` and `loop/vendor-pid-mod`), resting on the operator-name authorization recorded
  verbatim in OWNER-RULES 5 (owner, 2026-10-18): "Rayssa chiqueto. Jesse Daniel Brown, amy slanikov, Dan Edens,
  felipe Smith. All authorize for 1 year." (valid until 2027-10-18; no surname the files do not already carry is
  added). On that decision both files were copied byte-identical (blob and sha256 above equal upstream),
  `vote-quorum/Cargo.toml` `[lib] path` was set to `src/lib.rs`, the `[[bin]] vote-quorum-parity` was added,
  `src/glue.rs` was deleted, and both files were added to `UPSTREAM.sha256` (now 36 entries, `sha256sum -c`
  36/36 OK). `src/glue.rs` had been upstream `lib.rs:7-14` (the attributes, `extern crate alloc`, `pub mod canon`);
  the restored `lib.rs` carries those same lines, so `pub mod canon` is unchanged.
- The same kind of operator role tokens appears in two other aether directories; the owner's clearance of
  2026-10-18 is the one decision for all three, and all three are now vendored:
  - `loop/vendor-pid-mod/src/pid-mod.rs` (committed in asolaria-aether, `85faeb1`) carries them; its
    `PROVENANCE.md` records the owner decision (its "Owner review flag" section).
  - `ledger/hyperbehcs-daemons` vendored the owner's Python vote-quorum daemon (sha256 `9fd9de52…`, lines 15
    and 46) and its Rust port `src/vote_quorum.rs` (sha256 `99ed6c25…`) on the same decision; its `HELD.sha256`
    was removed (its `PROVENANCE.md`, "Owner decision, 2026-10-18").
- The private mirror `scratchpad/asolaria-mirror.git` was read for one measurement only (README, "Live chain"):
  `COSIGN_CHAIN.ndjson` @ `6022b69` (blob `9180f7ce`), as a temp copy outside this directory. Only aggregate
  counts are reported, and nothing from it is copied or quoted.
- The owner's live `COSIGN_CHAIN.ndjson` (section 8) was read in place, read-only, by `referee.py --live-ledger`
  and by upstream's ignored `parity_replay` test. Only counts and its sha256 are reported and pinned
  (`referee/LIVE-CHAIN.hbp`); no row is copied, printed or quoted.

## 8. Owner files on disk that this directory reads or cites but does not copy

| File (owner upload, 2026-10-17 UTC) | Bytes, lines | sha256 | git blob | Where it is in aether |
|---|---|---|---|---|
| `3a996ffd-asolaria-cosign-chain-daemon.py` (21:20:47), ACER `C:\HyperBEHCS\bin\asolaria-cosign-chain-daemon.py` | 5,997, 137 | `a2c863db85a747f3b5272d72b2dc6215f7dda3470a6290621de1bc70def22ea2` | `c1753dcca67cca6c3cb0352c200206a30835d689` | vendored byte-identical by `ledger/hyperbehcs-daemons` (`vendor/acer-hyperbehcs-bin/`) |
| `201de94d-asolaria-vote-quorum-daemon.py` (21:20:47), ACER `C:\HyperBEHCS\bin\asolaria-vote-quorum-daemon.py` | 11,786, 263 | `9fd9de52e84caf667ccdcee1c37193a4e9197a86f7c951fc04677a65de6db9ae` | `bcb542ed0d87a02651b70292fb4596349bead70f` | vendored byte-identical by `ledger/hyperbehcs-daemons` (its `UPSTREAM.sha256`; owner decision, 2026-10-18) |
| `348a53a3-COSIGN_CHAIN.ndjson` (21:29:37), the live cosign chain | 1,697,115, 5,439 | `39aaa803ad47d794ec3e3f989fcb8b0ca24aef254451941d50419dfbf2791939` | — | not copied (operator ledger; read in place, section 7) |

Recipe lines cited in README:

- cosign daemon: `append_row` 55-74; row hash 70-73 (`json.dumps({row without "row_hash"}, sort_keys=True,
  ensure_ascii=False)`, `sha16`, the row written with `json.dumps(row, ensure_ascii=False)`); `ANCHOR` 26, equal to
  `APPENDED_BY_DAEMON` (`cosign-ledger/src/py_parity/mod.rs:16`); `json.loads` of the request body 88.
- vote-quorum daemon: `QUORUM_RULES` 51, `append_row` 79-87 (`json.dumps(row_dict, sort_keys=True,
  ensure_ascii=False)` at 83), `is_authorized` 118, `evaluate_quorum` 125.

`sign-gate.js` (federation-1024 `kernel/core/src/sign_gate/mod.rs:3-4`) is not among these files and is not on
disk (README, "Not brought in").
