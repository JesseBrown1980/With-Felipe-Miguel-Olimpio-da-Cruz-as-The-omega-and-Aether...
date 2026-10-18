# Provenance: agents/levels

This directory brings in two owner components that run the HRM, Bobby Fischer and MTP agents per
level:

1. **PR #124 of asolaria-stone-to-moss**, `experiments/seat1/proxima-rust181`, at the PR head. It is
   a Rust 1.81, std-only, integer-only crate whose `level(depth)` (`src/lib.rs:133-149`) runs HRM
   fast/slow, MTP-1/2/3 and Bobby Fischer at depths 1..7 (3, 9, 27, 81, 243, 729, 2187 cells), and
   whose `report()` (`lib.rs:150-170`) writes `ASOLARIA-PROXIMA-RUST181.hbp`. It is vendored byte
   for byte and runs as its own crate.
2. **The universe simulator's slice agents** at the levels 3 / 27 / rime (`players/rime_agents.py`)
   and the rime Fischer solvers (`players/rime_fischer.py`, `rime_fischer_cluster.py`,
   `rime_27fischers.py`). The Fischer agent, the MCP agent, the three solvers and the four-agent
   run of `rime_agents.py:166-170` are ported to Rust here. The MTP and HRM agents of the same file
   are ported in `model/hrm-mtp` (`hrm_mtp::rime`) and used from there through a path dependency.

## Lanes

| Lane | What runs there | Here |
|---|---|---|
| Hot (per request, in process) | Rust 1.81 only, integers, HBP text, SHA-256. No Node, JSON, HTTP or Python. | `src/`, `examples/` |
| Cold (verification) | Stdlib Python referees; the vendored upstream Python run unchanged. | `tools/`, `vendor/` |

`src/`, `tests/` and `examples/` hold no `f32` or `f64`. The vendored PR #124 crate holds none
either (`src/`, measured with the same grep).

## Sources (remeasured 2026-10-18)

| Short | Repository @ commit | Remeasured |
|---|---|---|
| PR124 | `JesseBrown1980/asolaria-stone-to-moss` PR #124 head `5303c9b2ed0c0ce33da684706d57caef516ffd2b` (author line: Jesse Daniel Brown, 2026-10-16) | `git ls-remote origin refs/pull/124/head` = `5303c9b2…` (`refs/heads/main` = `12717c6c…`); REST `state=open`, `draft=true`, `merged=false`, head `5303c9b2…`, updated 2026-10-16T14:43:18Z; title "[Seat 1 DRAFT] Asolaria Rust1.81 seven-level Proxima ternary HRM/MTP/Fischer Chariots + HTTP-0" |
| USIM | `JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills` @ `3f9f42dab6247c40b30921b253e3f73c9e942ca5` | `git ls-remote … HEAD` = `3f9f42da…` |

PR #124 is an open draft. Its README ends "**Do not merge or release without review.**"
(`README.md:48`); it is vendored here from the PR head as the task names it.

## Vendored files

Every file under `vendor/` is byte-identical to its upstream: `git hash-object` gives the upstream
blob id, `sha256sum -c UPSTREAM.sha256` checks the bytes, and each file was also fetched from
`raw.githubusercontent.com` at the pinned commit and compared by blob id (31 of 31 equal). Each file
was read in full and scanned for personal data (names of private people, phone numbers, e-mail
addresses, chats, LAN addresses, keys) before copying. The owner's name in the universe-simulator
headers ("Operator: Jesse Daniel Brown") is the author line of the owner's own files.
`players/rime_agents.py`, `players/rime_sphere.py` and `receipts/operator/rime_agents.txt` are the
same blobs `model/hrm-mtp/vendor/universe-simulator/` holds.

PR124 files, upstream path `experiments/seat1/proxima-rust181/<path>`, vendored at
`vendor/asolaria-stone-to-moss/experiments/seat1/proxima-rust181/<path>`:

| path | blob | sha256 |
|---|---|---|
| `Cargo.toml` | `b875e238481ad7643e8bbdb7b6a1909b460416b0` | `8c28c2003091697ac3030c4335351e74295ff1dee0805348b8d8cc611779081c` |
| `Cargo.lock` | `0ed46f8af90948202e60b486c117a0f415b4c22e` | `15c687b12aa4aae96d7ee3c9aa8d2867ddad739d9e50d3ad1781516e953be190` |
| `rust-toolchain.toml` | `5eb2c4a3034282392158fdfeabe320f1f1d2fe8f` | `f8b70626385e3e58c503afb75b66abec9d7ef839d769277f62934d77c96e549c` |
| `src/lib.rs` | `0a26e3d24ac0b0211c31c3aa32e23d50d7d0c3ec` | `b780974eb2d43e4b2fe2c4ee1ee5920ec4c6cc664ae2247fcdabc76ae2319315` |
| `src/main.rs` | `edf4c31c2d3e990d9d07a52d2066d052be7b6858` | `c585acd30709476c3f10c4d022f6d973f7c62504f99578e2983cda1923b8f77a` |
| `src/memory.rs` | `d00433d04a363b6d94e531a71d06a48c19bc9a10` | `0d3efac78d2be16fa504df79affa7584d8d98738c15c3d262c62fc9aad35b860` |
| `src/long_horizon.rs` | `18f0f3036057335a440d546e494e74b17a475d28` | `cb1eb9ef822b44755bc14e923f996747999e77ae97cf35f8471200b6286cd60b` |
| `src/sha256.rs` | `c93c5ea29f5bee0413500cf6e7a32a1493da37f6` | `0284cad255fce4d95495bf88b0274f4e4fe489d20a81e5999680c89d02247226` |
| `src/camera.rs` | `31863006f39f3130d36056bac1964891ceeaa7b4` | `6c605bae7b48e73c9240deeb4efbe99f3198d0914c52808a42c72bd7ac799dc5` |
| `src/freeze_play.rs` | `0aa2d6ad767caaa3425ac049c98546376aadac43` | `f277a14506bc7816c1ad59ce750130cc40709b9a404214b6a5b55857d46ea9fa` |
| `src/motion.rs` | `ca3498a42b696f1623db1ae9fff3e9fb0a5d8046` | `ef82326f51281d07abc31e16308263ce4c0bbc0fa034ec891449c80ed9871079` |
| `independent_referee.py` | `85387770f842c17e81f1fbb44162d77d764c88b4` | `d4589de3214b40f45a18c860fe7226b0747c172a75902fe5f37cc66a2b05eccb` |
| `independent_memory_referee.py` | `e6b21a489e69fdbbeafba53145281d96265a6349` | `c806d1e5ad3f0b80d56e73f3b743b7555d497b4f5a1658dfc51a526aaac4eac4` |
| `independent_nine_jump_referee.py` | `569b41a26c7a3ef276f52ed45dd67f07324c5467` | `7f713859b6c95fce43bf3d1ba1b8f100739a5bbb0eb5c5250dcf5b7990cd2aa1` |
| `independent_camera_referee.py` | `2f902c90e37fad94df6aadf1fb9fb92ac3a19a09` | `07751f7a6f46e25d7a81cd7521b852c272caedc837885585484ad334a73b7d9f` |
| `README.md` | `4f6ba2bc782384e17b986548369181d3ca63960a` | `dda31ae19408bc17c06535606a62e82fdbb90c4c70f8e505af36926179bda785` |
| `PREREG-ASOLARIA-RUST181-20261015.md` | `70e53d5abc92682dc506bed4d6d2d2320f5077d5` | `52a9d93a46bfb4df3945aaf4e80a30b6348e0f1c7aa16c015197f964fff56d8b` |
| `PARTICLE-MEMORY-PREREG-20261015.md` | `bf699a0837adb8f0dc9e0288b6cf90f135972555` | `1e16ad309fbe693fdd529d8b973032a4ac5b83d0798acae98f1980396bed32ac` |
| `TEN-BILLION-YEAR-PREREG-20261015.md` | `e30986fb2fe063f0e2b9608e33eb45a074a9c830` | `11a11d9e609c9195616d1dcac3bd289887a020c6fda43b3dca4365ff6b42492c` |
| `FREEZE-PLAY-RUST181-PREREG-20261015.md` | `06147505865e25bbba7ec5ff4137b70e19890323` | `f36174acd5c4afa09c7bf30bf5216ff9b669bd35ebffad7d59d0dc2625fd41e8` |
| `NINE-JUMP-MOTION-PREREG-20261015.md` | `c64653cd9cb022a02a3244233477cdd724a8e651` | `0c1ed4cac04f3c746cc01ecc79ba0b7bc5c5db1e4df5bd552626e8f1a68effe2` |
| `SEAT1-R3-INDIVIDUAL-MEMORY-10GYR-RESULTS-20261015.md` | `cafda2b5d743dbe8d8bf65e5f553123d9f1b2f99` | `90adbaa26ff5b08674fcfb1fe2291a4ba18dd9a19008b23c5a6eadc3469c1b5c` |
| `web/index.html` | `d79b87811503f70ad7bff3fe474a0f07bb0c10d3` | `27e8765d892cd622a068a9a9ad9d0e7e6b030fa82ac6bbd7bee62fb9aec7062c` |

USIM files, vendored at `vendor/universe-simulator/<path>`:

| path | blob | sha256 |
|---|---|---|
| `players/rime_agents.py` | `824b17b0e7207f041732c048c321489b75d76c3f` | `a15f6a5c66f5cb1e33904b43905c9dfdd829f8cebecab4240e0cfd8bd9f62e1c` |
| `players/rime_sphere.py` | `449ac82b82223349ca8fc41d8e9b005fd3beda06` | `519b39cd1e0ff1879ddbc67b0dcf05c01e99ae4684ae22de63b511755335f7f3` |
| `players/rime_fischer.py` | `cbdf20564f1b38f3ddd08062ead8174ecc3d236a` | `945340f5c130d9eb099e4bcea23c93ba94d54adde64e29022028beeebf124b47` |
| `players/rime_fischer_cluster.py` | `2895e1e4a1fb4629005422429aeaf8020d15c6cf` | `3e3e6b5dfc1737fcdca5b684a3c6cc06c930159cb5ca5908b1a7ace4607c8cc3` |
| `players/rime_27fischers.py` | `c26228781c7e726b12efa8d18d6c68cc711cfd80` | `275c32d7866226c2c4139fbf9c2a0ed5e9a551072f95f307ae97a07d17220402` |
| `receipts/operator/rime_agents.txt` | `0a9b35e973395126ec8b7612a04d055ad048f5fc` | `82e8af9d0e35e0428eb0a5666a511828efc3eb954fd613366b4a0df889adfe54` |
| `receipts/operator/rime_fischer_cluster.txt` | `f6f976eebcef60788655eeb74a391bd8849955a2` | `32213cc8d76434322d1ed18399a8c51f4ffb74315f75e5a1fab79a7dd093b6fb` |
| `receipts/operator/rime_27fischers.txt` | `def001b30ac3d44f4aa912828f1acb549975d386` | `5926405e3730da1544b69d040c8c7407aad070a6da8fe5af1a3796d82bb5c743` |

### PR124 files not vendored

Two file names carry the alias described in the third row; those two files are named here by a
neutral label and their blob id.

| path | blob | reason |
|---|---|---|
| candidate register (`.hbp`, PR root) | `16c31ef405241d0dede6f2e502cc7932868424fe` | holds the full name of a private person (privacy rule) |
| planetary candidate report (`.md`, PR root, dated 20261015) | `d30fa92fd230b068ee6407bc5ca7405a3defedda` | same |
| `CAMERA-FITS-PREREG-20261015.md` | `f63b71084343ca91d4da3e87749bbfeccae5fc22` | holds a model-object alias formed from that person's surname (lines 3, 24) |
| `src/bin/observational_rv.rs` | `de98f6366a28d3b03930f0e3ce6be5fce4a14be2` | the same alias as a JSON key (line 236); writes `NINE-REAL-OBSERVATION-WINDOWS.json` and reads `ORIGINAL-SOURCE-MANIFEST.json` (lines 249-254); its inputs, CDS J/A+A/700/A11 `spec.dat` / `photo.dat`, are not in the PR |
| `real_observations/REAL-PROXIMA-NINE-WINDOW-SCIENTIFIC-RECEIPT-20261016.md` | `f16f1151585c2d383dcf6fe497c1a1afac86bf85` | the alias (lines 62, 80) |
| `real_observations/acquire.py` | `c5114b4047c1abe5ff152a64262f277e4c35d6b2` | downloads over HTTPS and writes JSON (line 89) |
| `real_observations/independent_referee.py` | `bd7917a0fcee68d2e2212f4fd7e1e824a1990c98` | the alias (line 53); reads and writes JSON (lines 37, 93, 118) |
| `real_observations/verify_image_ternary.py` | `abf7a30eb6d00f09dbc510c890b6f37985a7f92c` | reads and writes JSON (lines 14, 66) |

None of these is part of the library or the main binary: `src/lib.rs` declares the modules
`memory`, `long_horizon`, `sha256`, `camera`, `freeze_play`, `motion` (lines 4-9), all vendored, and
Cargo builds `src/bin/observational_rv.rs` only when the file is present. With the full upstream tree
in a scratch copy, `cargo +1.81.0 test --locked --offline` runs 25 library tests and 3 tests of
`observational_rv` (28 pass, MEASURED); the vendored tree runs the 25 library tests.
`FREEZE-PLAY-RUST181-PREREG-20261015.md:9` links `./CAMERA-FITS-PREREG-20261015.md`, which is not
present here.

## What the ports reproduce, line by line

| Upstream (USIM @ `3f9f42d`) | Rust |
|---|---|
| `rime_sphere.py:15-28` `is_prime`, `:30-36` `factor`, `:38-43` `primitive_root` | `sphere::{is_prime, factor, primitive_root}` (with Python `pow(b, e, m)`, `pow(a, -1, m)`, `pow(b, -e, m)`, `math.isqrt` as `pow_mod`, `inv_mod`, `pow_mod_neg`, `isqrt`) |
| `rime_agents.py:30-62` `fischer_agent()` | `fischer_agent::{fischer_agent, fischer_agent_lines}` |
| `rime_agents.py:65-98` `mtp_agent()` (line 93 as the script prints it; the owner's book amends that line, see below) | `hrm_mtp::rime::{mtp_agent, mtp_agent_lines}` (model/hrm-mtp); banner and GATE lines `rime_agents::mtp_agent_block` |
| `rime_agents.py:101-132` `hrm_agent()` | `hrm_mtp::rime::{HrmTables, hrm_agent, hrm_agent_lines}` (model/hrm-mtp); banner and GATE lines `rime_agents::hrm_agent_block` |
| `rime_agents.py:135-164` `mcp_agent()` | `mcp_agent::{mcp_agent, mcp_agent_lines, cell_encode, cell_fischer, crt}` |
| `rime_agents.py:166-170` (`__main__`) | `rime_agents::{rime_agents_run, rime_agents_stdout}`, example `rime_agents` |
| `rime_fischer.py:20-73` `factor_pp`, `bsgs`, `crt`, `factor_pe`, `per_rime_fischer`, `rime_fischer`; `:75-98` `main` | `rime_fischer::*`, `rime_fischer::main_stdout`, example `rime_fischer` |
| `rime_fischer_cluster.py:26-58` `bsgs`, `to_balanced_base3`, `per_rime_worker`; `:60-76` `crt`, `factor_pe` (the same functions as `rime_fischer.py:40-56`); `:78-106` `main` | `cluster::{bsgs, to_balanced_base3, per_rime_worker, play, main_stdout}`, example `rime_fischer_cluster` |
| `rime_27fischers.py:26-59` `bsgs` (the same computation as the cluster's), `dlog_mod_27`, `crt` on Python integers, `cube27`, `find_27_primes`; `:61-97` `main` | `the27::*`, `bignum::Big` for the 163-digit `M`, example `rime_27fischers` |

Notes on the ports, each a statement of what upstream computes:

- `rime_agents.py:40` computes `w27 = pow(g, n // 27, p)` and `rime_fischer_cluster.py:30` computes
  `factor = pow(g, (order - m) % order, p)`; neither value is read afterwards, and the ports do not
  compute them.
- `rime_agents.py:55-56` sets `k = 77777` (the exponent used to build `x` at line 35) and asserts
  `pow(g, k, p) == x`; the comment at lines 53-54 names the full discrete log and
  `rime_fischer_cluster.py`. The port does the same; the solve itself is `rime_fischer` / `cluster`.
- `rime_fischer.py` `bsgs` keeps the first `j` per baby step (`setdefault`, line 33), tries `m` giant
  steps and returns `i*m + j`; the cluster / 27 `bsgs` keeps the last `j` (`table[e] = j`), tries
  `m + 1` giant steps and returns `(i*m + j) % order`. Each port keeps its own form.
- `rime_fischer_cluster.py:91-92` maps the towers over a `multiprocessing.Pool` with one process per
  tower; `cluster::play` runs one scoped thread per tower and reads the results in tower order, the
  order `pool.map` returns.
- `rime_27fischers.py:92` computes `ctr = (a+b+c)//3`, `rem = (a+b+c) - 3*ctr`,
  `c_rev = 3*ctr + rem - a - b`, so `c_rev = c` for every `a, b, c`; the port computes the same.
- `mcp_agent` `crt` reduces modulo `M` after each cell (line 152), and the port does the same. The
  eighth batch value `1000081 % M` (line 154) is written as 1,000,081 (M = 4,814,857), as clippy
  rejects the no-op `%`.
- `rime_fischer.py` `crt` (lines 40-45) sums the terms as Python integers of any size and reduces
  once at the end (line 45). `rime_fischer::crt` returns `u64`: it reduces each term modulo `M` in
  `u128`, the same value, for every `prod(ms)` below 2^64 (upstream passes the towers of `p - 1`),
  and panics for a larger product.
- No agent reads another's return value (`rime_agents.py:168`); the four-agent run calls them in that
  order and concatenates their prints.
- Python's `pow(b, -0, m)` is `pow(b, 0, m)` and needs no inverse; `sphere::pow_mod_neg` returns the
  same for exponent 0. `rime_agents.py:43` calls it with `p` prime and `g` a primitive root.

### The owner's amendment to the MTP "direction 0 (hold)" line

The port prints `rime_agents.py:93` as the script at `3f9f42d` prints it and as the owner receipt
`rime_agents.txt` holds it: "direction 0 (hold)     : accuracy 1.0000  — the free center, costs
nothing, says nothing". The owner's book at the same commit amends that line:

- USIM `books/COMBINED-BOOK-OF-LAWS.md:178` (Law 24): "**⚠ AMENDED 2026-07-27 — see Law 36 in Book
  V.** The original text of this law said direction **0** (hold) = accuracy 1.0, "the free center,
  costs nothing and says nothing." That was true only because *hold* had been defined as "look at
  the byte you already have." The centre was made vacuous by definition and the vacuum was reported
  as a measurement. Re-defined per the operator's photo and re-measured, the centre is the
  **largest** term. The original line is wrong and is superseded."
- `:565-566`: "### Law 36 — The Four-Point Law (the centre is not empty; it is the largest term)" /
  "**MEASURED. Number provisional. This law supersedes the "free center" line inside Law 24.**"
- `:587`: "**MEASURED** (`trijection/rime_fourpoint.py`, new file, no live source edited)", with
  train enwik8[19,500,000 .. 20,000,000), held-out enwik8[20,000,000 .. 20,200,000), 20,000 anchors,
  and a table of colours −/0/+ by shells r = 1, 2, 3; its "0 COMBINED" row reads raw 0.6954.

The script that measured Law 36 is not in any repository found (see "Not brought in"), so the
four-point MTP is not ported; `rime_agents.py`, which still prints the line above, is.

### Float in upstream's MTP and HRM lines

`rime_agents.py` computes these lines in binary64: `hits / tot` (line 90) printed `:.4f` (lines
94-95), and the bpc as a running `float` sum of `-math.log2((count + 1) / (tot + 256))` (lines 113,
125) over `n` printed `:.4f` (line 129). `tools/levels_referee.py` runs that float code unchanged
and compares only printed text. The port holds every count as an integer:

- MTP: `hrm_mtp::rime::format_ratio` forms the double nearest `hits / tot` in integer arithmetic
  and formats its exact value as Python's `:.4f` does, so the line equals upstream's for every
  input.
- HRM bpc: `hrm_mtp::rime::hrm_agent_lines` rounds the exact `log2` sum over `n` (a Q64 sum) to 4
  decimals and returns the distance of that value from the nearest rounding boundary, the tie
  margin, in units of 10^-12. `rime_agents::BPC_BINARY64_BOUND_1E12` = 120 bounds how far
  upstream's binary64 value can lie from the exact one for a read of at least 500,003 bytes (each
  term is below 19 bits, so every partial sum is below 2^21 and each addition rounds by at most
  2^-33 bits; `math.log2` is assumed within 2 ulp); the two print the same 4 decimals whenever
  the tie margin exceeds it. `rime_agents::rime_agents_run` returns the margin, the `rime_agents`
  example writes it to stderr as an `HRMBPC` row (verification only, not upstream), and
  `tests/fixtures.rs` asserts it exceeds the bound on the synthetic bytes. MEASURED: tie margin
  15,617,139 on enwik8 and 27,777,478 on the synthetic fixture bytes.

## How the two level ladders relate (code)

- PR124 computes all three agents per depth in one call, `level(depth)` (`lib.rs:133-149`); the one
  call edge between them is `independent_fischer` calling `mtp123(depth, B_PERIOD)` itself
  (`lib.rs:118`). HRM values are written to the LEVEL row only.
- USIM runs Fischer, MTP, HRM, MCP in sequence (`rime_agents.py:168`) with no data passed.
- USIM `books/RIME-SESSION-2026-07-25-RESULTS.md:17` states, for `cascade27.mjs`: "Law 23 Fischer
  orders candidates. Law 25 HRM proposes. Law 24 MTP gates." See "Not brought in".

## Measured (this container, 2026-10-18)

Toolchain `cargo 1.81.0 (2dbb1af80 2024-08-20)`, clippy 0.1.81, rustfmt 1.7.1-stable, Python
3.13.16. Target dirs under `scratchpad/targets/levels-agents*`. The crate was also built and tested
against `model/hrm-mtp` and `model/l0-edge` as committed on aether `f36f399` (`git archive`; unchanged at `fefa7e2`), with
the same results.

| What | Command | Result |
|---|---|---|
| upstream bytes | `sha256sum -c UPSTREAM.sha256` | 31 / 31 OK; 31 / 31 equal to raw.githubusercontent.com by blob id; 31 / 31 equal to `git rev-parse <commit>:<path>` in the local clones |
| this crate, lint | `cargo +1.81.0 clippy --locked --all-targets -- -D warnings` | clean (no allowed lints) |
| this crate, tests | `cargo +1.81.0 test --locked` | 23 passed (unit 16, `tests/fixtures.rs` 2, `tests/receipts.rs` 5) |
| format | `cargo +1.81.0 fmt -- --check` (rustfmt 1.7.1); also stable rustfmt 1.9.0 | clean, both |
| no float | `grep -rnE '\bf32\b\|\bf64\b\|as f[0-9]' src/ tests/ examples/` | no match |
| referee, fixtures | `python3 -I tools/levels_referee.py fixtures --check` | 6 checks, 0 failures: both fixtures equal; vendored `rime_fischer_cluster.py` and `rime_27fischers.py` stdout equal their owner receipts byte for byte; `fischer_agent()` equals receipt lines 3-9, `mcp_agent()` lines 23-28; 1.3 s |
| Rust vs owner receipts | examples `rime_fischer_cluster`, `rime_27fischers` | byte-identical to `rime_fischer_cluster.txt` (sha256 `32213cc8…`) and `rime_27fischers.txt` (sha256 `5926405e…`), and to a fresh run of each vendored script |
| Rust vs upstream stdout | example `rime_fischer` | byte-identical to a fresh run of the vendored `rime_fischer.py` (sha256 `cd03fa1e3d8746def039d9f383644ae3d3f4a2a7a1235410d37d8a00a300b8e0`): towers `[16, 27, 5, 463]`, 5 / 5 targets reached, moves 8 / 6 / 3 / 22 |
| four agents on enwik8 | `cargo run --release --example rime_agents -- enwik8` (enwik8 sha256 `2b49720e…`, from model/hrm-mtp's fetch) | **stdout byte-identical to the owner receipt `rime_agents.txt`** (30 lines, sha256 `82e8af9d…`), 0.06 s; stderr `HRMBPC\|tie_margin_1e-12=15617139\|binary64_bound_1e-12=120` |
| referee, enwik8 | `python3 -I tools/levels_referee.py agents --enwik8 enwik8 --rust agents.txt` | the vendored `rime_agents.py` (ENWIK8 pointed at enwik8) also prints `rime_agents.txt` byte for byte; Rust equals it; 2 checks, 0 failures; 1.0 s |
| tie margin, synthetic bytes | example `rime_agents` on `synthetic_bytes()` (sha256 `750b3f63…`) | 27,777,478 (units of 10^-12), above the bound 120; asserted by `tests/fixtures.rs` |
| `crt`, `pow_mod_neg` vs Python | stdlib differential (6 seeds x 4,000 commands; 3 seeds x 5,000 `crt` commands with residues up to 2^64 - 1) | every `crt` with `prod(ms)` below 2^64 and every `pow(b, -e, m)` (exponent 0 included) equal Python; each of the 3,525 `crt` commands with `prod(ms)` at or above 2^64 panics |
| Fischer levels | `fischer_agent()` | p = 1,000,081, g = 7; level 3: third #2; level 27: k mod 27 = 17, trime digits `[-0-]`; level rime: k = 77777, invert True |
| MTP / HRM levels (enwik8) | as printed | x1 0.3517, x3 0.0667, x27 0.0000, backward x1 0.3317; deep 99 % / mid 0 % / base 0 %, bpc 3.5328 |
| MCP | `mcp_agent()` | G = [2, 6, 2], M = 4,814,857, 9 / 9 values round-trip |
| PR124 crate, lint | `cargo +1.81.0 clippy --locked --offline --all-targets -- -D warnings` (vendored dir, `CARGO_TARGET_DIR` outside it) | clean |
| PR124 crate, tests | `cargo +1.81.0 test --locked --offline` | 25 passed (lib) |
| PR124 run | `cargo +1.81.0 run --locked --offline --release -- "$T/out"` (`$T` outside `vendor/`) | `ASOLARIA_RUST181_TERNARY_PASS levels=7 epochs=200 actual_cpu_instructions=TRUE` |
| PR124 HBP | `sha256sum "$T/out/ASOLARIA-PROXIMA-RUST181.hbp"` | **`53257ac9d02e7498a8849f0e258750be24cd7092d851739b3edbf90db97f645d`, 3,132 B**, equal to the value the owner records at `SEAT1-R3-INDIVIDUAL-MEMORY-10GYR-RESULTS-20261015.md:14` (recorded there for the CI runs of commit `473175e6`, line 12) and `TEN-BILLION-YEAR-PREREG-20261015.md:9` |
| PR124 other outputs | `sha256sum` | `EPOCHS-RUST181.csv` `08b161d4…`, `PARTICLE-MEMORY-R1.ledger` `c8b1038b…`, `PARTICLE-MEMORY-R1.hbp` `dc462622…`, `TEN-BILLION-YEAR-R1.hbp` `50074acd…`: each equal to SEAT1-R3 lines 15-18; `FREEZE-PLAY-R4.hbp` `f681d840…`, `NINE-JUMP-MOTION-R5.hbp` `8b8ceca9…`, `NINE-JUMP-MOTION-R5.csv` `1bc455c4…`, `RAINBOW-QR-R4.tsv` `0a2a1922…`, `SYNTHETIC-FITS-R4.fits` `665eefb0…` (`git grep` finds no recorded value for these five at `5303c9b2` or on `main` `12717c6c`) |
| PR124 referees | `python3 -I independent_referee.py "$T/out"`, `independent_memory_referee.py`, `independent_nine_jump_referee.py`, `independent_camera_referee.py` | `PASS_INDEPENDENT_FISCHER_GATES+SEVEN_LEVELS+200_EPOCHS+E200_MODULAR`, `PASS_81_INDEPENDENT_PARTICLE_MEMORIES_2187_EVENT_REPLAYS_7_DEPTHS_10GYR_MASS_GATE`, `PASS_9_OF_9_EXACT_RUNG_CHECKPOINTS_6_HELD_3_PASSED_ALIASING_DETECTED`, `PASS_INDEPENDENT_CAMERA_63_PIXELS_126_EVENTS_RAINBOW7_HASH_TIMESTAMPS_BRANCH_GATE` |
| PR124 line mirror | `python3 -I tools/proxima_levels_referee.py --check "$T/out"` | the stdlib mirror of `lib.rs:11-170` rebuilds the HBP with sha256 `53257ac9…` (3,132 B) and equals the Rust output byte for byte; 0.4 s |

PR124 LEVEL rows, recomputed by the mirror (depth / cells / HRM_fast / HRM_slow / MTP_checks /
BobbyFischer / Shannon −,0,+ / GNN_cycle): 1/3/0/0/6/PASS/1,1,1/−1; 2/9/0/0/6/PASS/3,3,3/−3;
3/27/0/0/6/PASS/9,9,9/−6; 4/81/0/0/6/PASS/27,27,27/−18; 5/243/0/0/6/PASS/81,81,81/−54;
6/729/0/0/6/PASS/243,243,243/−162; 7/2187/0/0/6/PASS/729,729,729/−486.

- `HRM_fast` and `HRM_slow` are 0 at every depth. The trit at index `i` is
  `TRITS[(i + i/3 + i/9) % 3]` (`lib.rs:137`); within each aligned triple `i/3` and `i/9` are fixed,
  so the triple is a permutation of {−1, 0, +1} and sums to 0.
- `MTP_checks=6` counts, for two periods, `mtp123` comparing binary `powmod` with decimal-digit
  `powmod_decimal` at +1, +3, +9 (`lib.rs:100-109`); the LEVEL row writes `MTP1=PASS|MTP2=PASS|MTP3=PASS`
  as literal text next to that count (`lib.rs:159`).
- The PR's own words: README:32, "MTP1/2/3 three **new integer orbital lookahead proxies**
  (+1,+3,+9 model-years) … These are architecture-compatible mathematical substitutes, **not
  byte-identical ports of the originally trained HRM/GNN/LLM/MTP weights**, which were not available
  from the inspected source pins"; PREREG:18, "HRM/GNN likewise represent tested new arithmetic
  integration interfaces until a pinned trained model is imported".

## Coordination with model/hrm-mtp

`model/hrm-mtp` (another builder's directory, committed on aether main at `1d6d3d6`) already ports `mtp_agent()` and
`hrm_agent()` of `rime_agents.py` and the whole sector play of `players/rime_windunwind.py`
(`hrm_mtp::rime::windunwind::{Bank, Sphere, play_sector}`, which includes the Fischer wind / unwind
of lines 79-86). This directory does not port those again: the four-agent run takes MTP and HRM from
`hrm_mtp::rime` through `asolaria-hrm-mtp = { path = "../../model/hrm-mtp", version = "0.1.0" }`
(which in turn depends on `model/l0-edge`, committed at `60d26ad`). `Cargo.lock` keeps the versions of model/hrm-mtp's lock
(sha2 0.10.9).

## Not brought in, with the evidence of where it should be

- **`cascade27.mjs`**, the code the owner's session notes name for "Law 23 Fischer orders candidates.
  Law 25 HRM proposes. Law 24 MTP gates." (USIM `books/RIME-SESSION-2026-07-25-RESULTS.md:17`), at
  `/root/_horizon/cascade27.mjs` (USIM `books/lineage/RIME-SESSION-32633.md:301`). MEASURED: no path
  containing `cascade27` in any commit of USIM (`git log --all --name-only`); at `3f9f42d` the name
  occurs only in prose (`books/`). No code found passes HRM output to MTP or Fischer, so no such chain
  is wired here.
- **A trained HRM model.** PR124's HRM is "a two-rate signed-trit summarizer" (README:32); USIM's
  HRM is count tables frozen at run time from enwik bytes. The bigpickle-rebuild stub names the
  trained model's place as `D:/Asolaria-HRM/` (`src/hrm-slow-fast.mjs:14-18`); no owner HRM checkpoint
  was located on disk or on the owner's Hugging Face pages in this build's census. The owner's HF
  canon `HRM-MTP-THOUGHT-GEOMETRY-INTEGRATION.md:27` (sha256 `4409f055…`) reads: "**zero
  `.pt`/`.ckpt`/`.safetensors` weights on disk → training was never run.**"
- **The second set of owner numbers for the USIM agents** (Law 24: 0.3667 / 0.0767 / 0.3775,
  `RUNBOOK.md:69-70`, `CODEBOOK.md:52`; Law 25: 97 % / 3.7454, `receipts/FABLE5-PLAY-KEYS-ENWIK9.hbp:17`).
  The FABLE5 header reads `heldout=enwik9[20000000..20600000)|table=order2_frozen_top1|anchors=4000`
  (`:4`), a configuration `rime_agents.py` does not have (it holds out bytes 500,000..600,000,
  lines 68-69, with 1,200 anchors, line 79); the script that wrote it was not located. The run here
  reproduces `rime_agents.txt`.
- **`rime_windunwind.py` receipt text.** Ported in model/hrm-mtp, not here. Its receipt
  (`receipts/operator/rime_windunwind.txt:29`) reads "all 27 byte-exact = True" where the script at
  `3f9f42d` prints "all 27 sectors byte-exact" (line 108), and the receipt's sector rows carry no
  "(deep N%)" field (script line 99): the receipt was printed by another revision of the script.
- **PR124's real-observation lane** (`src/bin/observational_rv.rs`, `real_observations/*`): left out
  under the privacy and no-JSON rules (table above); its source data is not in the PR.
- **`trijection/rime_fourpoint.py`**, the four-point MTP of Law 36 that supersedes the "direction 0
  (hold)" line (USIM `books/COMBINED-BOOK-OF-LAWS.md:178, 565-566, 587`; see "The owner's amendment
  to the MTP "direction 0 (hold)" line"). MEASURED 2026-10-18: no path containing `fourpoint` in any
  commit of USIM (`git log --all --name-only`, 0) or at `3f9f42d` (`git ls-tree -r`, 0), which has
  no `trijection/` directory at all (0 paths); none in the private mirror
  `scratchpad/asolaria-mirror.git` (`git log --all --name-only`, 0); no file named `*fourpoint*` on
  this container (`find / -xdev`, 0). At `3f9f42d` the name occurs only in prose:
  `books/COMBINED-BOOK-OF-LAWS.md:587`, `books/COMBINED-BOOK-OF-LAWS-622823.md:587`,
  `books/lineage/COMBINED-BOOK-OF-LAWS-v1-77149.md:581`, `books/lineage/COMBINED-BOOK-OF-LAWS-v2-115083.md:583`.
