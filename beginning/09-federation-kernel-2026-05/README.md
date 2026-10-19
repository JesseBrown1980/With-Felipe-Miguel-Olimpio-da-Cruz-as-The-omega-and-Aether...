# 09 — The federation kernel genesis (2026-05-11 → 05-22)

Build-order step 9 of the beginning. In these days the system is restarted from the floor up as a Rust
operating system: "a bare-metal-floor-up remake of the Asolaria fabric as a BEHCS-1024-native operating
system with hookwall and GNN as kernel-adjacent primitives, deployed across a 4-device federation"
(federation `README.md`). The kernel is first committed under `federation-remake-1024/` in the Asolaria
mirror on 2026-05-11. The `asolaria-federation-1024` repository follows on 2026-05-13 with the genesis
commit, seven same-morning follow-ups, and a phase-3 commit on 05-17. Alongside it come the BEHCS-1024
language consumer in the dashboard (05-11), the redacted GitHub remake staging (05-13), the HyperBEHCS
Hermes worker lanes (data dated 05-16 to 05-22), and the AETHER-16 Bridge kiosk (05-22).

The kiosk is not the first use of the name "aether". In the Asolaria mirror the name first appears on
2026-04-11:

- `fbcb630` (00:42:18) adds files that mention a "Xylos lore taxonomy from AETHER bundle"
  (`tools/cube/omni-processor/omnitranslator-v0.js`) and cite
  `reports/aether-phase0-liris-prereq-20260406-160720/`, a path no mirror commit contains. Its commit
  message does not mention aether.
- `9e62d29` (22:46:34) is "BEHCS: Aether 5th node registration + dashboard bridge wiring plan", and
  `1be8a9d` (23:04:31) is "CELEBRATION: Aether dashboard LIVE on Felipe's phone".

Five mirror commit subjects mention aether: these two and the three kiosk commits of 2026-05-22 (below).
One more commit, `627c511` (2026-04-12 01:47:39, "D0 ALIVE + D49 IMPULSE + LAW-011 + 2 orbitals +
256-glyph session"), names it only in its message body ("Aether fabric cubed: ..."). That makes six commit
messages in the mirror, not counting the commits of 2026-10-18 and later.

This step's own files of 05-12 and 05-13 name it too. The federation `README.md` lists aether (Galaxy
A06, "BEHCS node 4, edge relay") among the devices, `REPO_LAW.md` names the four vantages "(acer, liris,
falcon, aether)", and the 05-12 PIXEL-BROADCAST receipt is addressed to
"@QUAD-ACER-FALCON-LIRIS-AETHER". What the kiosk adds is the name "AETHER-16": `da39126` is the first
mirror commit whose diff contains it.

`vendor/` holds 176 files, 1,433,104 bytes, at their original paths, read with `git cat-file -p`. They
come from four public repositories: a bare mirror of all 132 refs of `Asolaria`, and bare partial clones
of `asolaria-federation-1024`, `Asolaria-hermes-work` and
`what-is-asolaria---how-do-we-get-reductions-in-everything`. Every file is byte-identical:
`git hash-object --no-filters` equals the recorded blob for 176 of 176, and `sha256sum -c UPSTREAM.sha256`
passes 176 of 176. Both checks were run. Four genesis files that carry tokens are held, not vendored (see
"Held"). Each blob is vendored once, from the commit and repository where
it first appeared. Later versions of a path go in `vendor/<repo>-variant-<commit7>/` (see `PROVENANCE.md`).

## The first kernel in the Asolaria mirror (2026-05-11, `eb61d3c` 17:46:48 and `665b81d` 17:47:04)

`vendor/Asolaria/federation-remake-1024/` holds six core modules and eight kernel docs:

- **Core modules**: `agent_runtime`, `cosign_chain`, `envelope`, `hookwall`, `pid`, `syscall`.
- **Kernel docs**: `ATLAS_INTEGRATION`, `JOINT_PID_REGEX_OPTION_B_ACER_ACK`, `MICROKERNEL_REFACTOR_PLAN`,
  `PHASE_10_SHIP_CHECKLIST`, `PHASE_3_WIRING_STATUS`, `PHASE_8_CROSS_DEVICE_FEDERATION`,
  `SCOUT_ABILITIES_AND_CONDITIONS`, `USERSPACE_ABI`.

`eb61d3c` is "Phase-3 syscall wiring (cycles 31-67): 9 FULL + 5 HALF + sys_fork doc + sys_exit diverging".

The **first Rust hookwall** is `hookwall/mod.rs` blob `080e3490` (5,127 B). Its header reads: "Per
REPO_LAW Invariant 2: hookwall fires on every syscall. Pre and post hooks emit verdicts
(PROCEED/HOLD/BLOCK) which append to cosign-chain (Invariant 4)". It reserves `HOOKWALL_SLOT_COUNT = 64`,
and it states its own status: "v0.1 stub: API surface only. Real verdict-emission + tier-gate
enforcement lands in Phase-3." The federation genesis carries the same blob. Its rustfmt version
`93de20f7` (2026-05-13 10:40) is in the `e5fb0ee` variant directory; it differs only in whitespace and
the order of one `use` list. aether's `kernel/lane` holds the later v0.2, `1514379e`.

Eleven paths of the 2026-05-13 federation genesis have exactly these 2026-05-11 bytes. They are vendored
only here:

| federation-1024 @ 282b9e9 path | blob | vendored at |
|---|---|---|
| `kernel/core/src/agent_runtime/mod.rs` | `baedc79f` | `vendor/Asolaria/federation-remake-1024/kernel/core/src/agent_runtime/mod.rs` |
| `kernel/core/src/cosign_chain/mod.rs` | `cb57b430` | `vendor/Asolaria/federation-remake-1024/kernel/core/src/cosign_chain/mod.rs` |
| `kernel/core/src/envelope/mod.rs` | `91a1e0ea` | `vendor/Asolaria/federation-remake-1024/kernel/core/src/envelope/mod.rs` |
| `kernel/core/src/hookwall/mod.rs` | `080e3490` | `vendor/Asolaria/federation-remake-1024/kernel/core/src/hookwall/mod.rs` |
| `kernel/docs/ATLAS_INTEGRATION.md` | `bba40913` | `vendor/Asolaria/federation-remake-1024/kernel/docs/ATLAS_INTEGRATION.md` |
| `kernel/docs/JOINT_PID_REGEX_OPTION_B_ACER_ACK.md` | `cb6112ef` | `vendor/Asolaria/federation-remake-1024/kernel/docs/JOINT_PID_REGEX_OPTION_B_ACER_ACK.md` |
| `kernel/docs/MICROKERNEL_REFACTOR_PLAN.md` | `7ae48a52` | `vendor/Asolaria/federation-remake-1024/kernel/docs/MICROKERNEL_REFACTOR_PLAN.md` |
| `kernel/docs/PHASE_10_SHIP_CHECKLIST.md` | `c8488f29` | `vendor/Asolaria/federation-remake-1024/kernel/docs/PHASE_10_SHIP_CHECKLIST.md` |
| `kernel/docs/PHASE_8_CROSS_DEVICE_FEDERATION.md` | `eea02e79` | `vendor/Asolaria/federation-remake-1024/kernel/docs/PHASE_8_CROSS_DEVICE_FEDERATION.md` |
| `kernel/docs/SCOUT_ABILITIES_AND_CONDITIONS.md` | `c4bffa1c` | `vendor/Asolaria/federation-remake-1024/kernel/docs/SCOUT_ABILITIES_AND_CONDITIONS.md` |
| `kernel/docs/USERSPACE_ABI.md` | `8ed12bae` | `vendor/Asolaria/federation-remake-1024/kernel/docs/USERSPACE_ABI.md` |

The mirror's `pid/mod.rs` (`8f1082b7`), `syscall/mod.rs` (`982c78d8`) and `PHASE_3_WIRING_STATUS.md`
(`252fcbf8`) differ from their genesis versions, so both versions are vendored.

## The BEHCS-1024 language consumer (2026-05-11, `ee641af` 17:47:19)

`packages/dashboard/src/super-os-viz/super-dashboard-server.mjs` (`771438a7`, 150,968 B, the largest file
here) serves `/api/glyphs` and `/api/behcs1024/context` with `tuple_dim: 60`. Line 22 imports
`BEHCS1024_PLANES` and `encodeBehcs1024Digit` from `./behcs1024-language-kernel.mjs`. That kernel was never
committed to a public repository; aether already holds ACER's delivered copy (see "Already in aether").

## The federation genesis (2026-05-13, `282b9e9` 10:35:32, "genesis: federation remake v0")

The genesis tree has 105 files. 78 are vendored from it into `vendor/asolaria-federation-1024/`; the other
27 are covered elsewhere:

- 11 are the 2026-05-11 files above, vendored from the mirror.
- 2 are already in aether (`KERNEL_TARGETS.md`, `glyph_genesis/mod.rs`).
- 3 are left for step 10 (`gnn/mod.rs`, and `servers/gnn-oracle` `Cargo.toml` and `lib.rs`).
- 4 carry tokens and are held: `W18-WAVE-SYNTHESIS-ACER-2026-05-12.md`, `SUBSTRATE_CONFLICT_MATRIX.md`
  and its `.json`, and `kernel/docs/DRIVER_MODEL.md` (see "Held").
- 7 are screen captures, held.

The base directory also holds `vfs/mod.rs` from `f0dcd83` and `build.rs` from `dc1da1a`, making 80 files.
The 78 genesis files are:

- **Root canon and workspace (23 files)**: the README ("Asolaria Federation · BEHCS-1024 OS", anchor PID
  `ASOLARIA-FEDERATION-REMAKE-1024-PID-2026-05-11`, quintuple-cosign window 2026-05-11 → 05-25),
  `REPO_LAW.md` (18,792 B), `ASOLARIA_FEDERATION_REMAKE_200_STEP_PLAN.md` and the other root files
  listed below.
  - `REPO_LAW.md` is "CLASS-1 IMMUTABLE LAW" with "exactly twelve invariants". Invariant 1 is "BEHCS-1024
    alphabet is canonical (`alphabet-1024.json`, phase-A seal COSIGN seq=49)". It is also the public piece
    of the BEHCS-1024 foundation-v2 item.
  - The other root files: `FEDERATION_DECISIONS.md`, `AGENT_ROSTER.ndjson` and its schema,
    `AUTHORIZATION.ndjson`, `FEDERATION_LEDGER.ndjson`, `CODEOWNERS`, `LICENSE`,
    `PLAN_ADJUSTMENT_UIAUTOMATION_ABSORPTION_2026_05_12.md`, `ACER_OWN_NEXT_STEP_GUIDE.md`,
    `ACER_PHASE_1_CONTRIB.md`, the workspace `Cargo.toml`/`Cargo.lock`, `.editorconfig`, `.gitignore`,
    the four issue templates, the PR template and `ci.yml`.
- **Kernel crate (29 files)**: `kernel/Cargo.{toml,lock}`, `kernel/boot` (`Cargo.toml`, `init.rs`,
  `main.rs`), `kernel/core/Cargo.toml`, `lib.rs`, and 13 core modules: `atlas`, `bus_and_kick`,
  `bus_fabric`, `crypto`, `cycle_orch`, `frame_alloc`, `highway`, `pid`, `sign_gate`, `syscall`, `tier`,
  `tier_gate` and `transit`. The rest are five kernel docs (the sixth, `DRIVER_MODEL.md`, is held), three
  scripts (`build-img.sh`, `qemu-test.sh`, `sbom.sh`) and `tests/triple_runtime_parity.rs`. Some module headers:
  - `atlas`: "BEHCS-1024 codepoint → domain/supervisor/lane lookup".
  - `bus_and_kick`: "BEHCS-256 absorb (partial Rust port)" of `packages/bus-and-kick/src/primitive.mjs`.
  - `cycle_orch`: "BEHCS-256 absorb (selective Rust port)" of the cycle-orchestrator's peer FSM and SLO
    gate.
  - `tier_gate`: "enforce the 7-tier access matrix at the caller→target decision layer".
  - `transit`: "cross-tier transit executor".
- **Servers (8 files)**: `agent-runtime`, `cosign-ledger`, `highway` and `tier-policy` (`Cargo.toml` and
  `src/lib.rs` each). `tier-policy` and `highway` are the "Phase-2.5 demote" of the kernel's `tier` and
  `highway` modules to userspace crates. Neither is carried anywhere else in aether.
- **Tools (18 files)**:
  - `tools/bench/envelope-10k-bench.mjs`.
  - The omniscrcpy tools: `omniscrcpy-glyph-encode.mjs`, `omniscrcpy-spacedesk-viewer-proxy.mjs` and
    `spacedesk-deep-walk-acer.ps1`.
  - Thirteen ACER broadcast receipts of 2026-05-12 (`broadcasts/acer-emit/`).
  - One UI-tree look (`broadcasts/looks/spacedesk-deep-walk-acer-...json`).
  - The receipts name the screen captures they describe (window titles, LAN addresses, PIDs) but carry
    no image bytes.

## Same-morning follow-ups (2026-05-13) and phase 3 (05-17)

Seven commits follow the genesis on the morning of 2026-05-13, from 10:40:07 to 11:30:43. The next commit
is phase 3, on 05-17.

- **`e5fb0ee` 10:40:07, "ci: apply rustfmt across kernel + servers — 25 files reformatted"**: 19 of the
  25 are in `vendor/asolaria-federation-1024-variant-e5fb0ee/`. Of the other six, four are already in
  aether (`glyph_genesis`, `pid` `816c1fc7`, `sign_gate` `883f6c2d`, `tier` `721d699d`) and two are for
  step 10 (`gnn`, `gnn-oracle`). The `tier_gate` here (`18e6f793`, 13,054 B) is the upstream of aether's
  `gate/hookwall` `tier_gate` port.
- **`f0dcd83` 10:42:40, "syscall: complete 16/16 FULL wire — vfs module backs sys_read/sys_write"**:
  `lib.rs` and `syscall/mod.rs` (31,348 B) as variants. The first `vfs/mod.rs` (`046d0bb6`, "v0.1:
  routing-by-fd-value scaffold") is in the base directory.
- **`3067a0f` 10:45:46, "ci: bump rust toolchain 1.75 → 1.81 to match ed25519-dalek 2.2 MSRV"**: the
  `ci.yml` variant. This is where the 1.81 toolchain that aether uses enters the line.
- **`fa2ee20` 10:50:26, "ci: silence clippy warning-as-error spam via lint allow blocks"**: `lib.rs`,
  `PHASE_3_WIRING_STATUS.md` and `servers/agent-runtime/src/lib.rs` as variants.
- **`a8aec37` 11:14:12, "docs: add phase-4 gnn architecture contract"**: adds one file,
  `kernel/docs/GNN_ARCH.md` (`682207b5`, 5,353 B). It belongs to step 10 and is pinned by id in
  `PROVENANCE.md`, not vendored.
- **`e797ffa` 11:29:03 / `f425c0a` 11:30:43**: a `.gitignore` change ("ignore runtime broadcast
  receipts") and its revert 1 min 40 s later. The reverted blob `81249cf3` is pinned in PROVENANCE.
- **`d82bb25` 2026-05-17 13:30:15, "phase-3: atlas BEHCS-1024 dispatch + cosign_chain v0.2 + hookwall
  v0.2 + vfs v0.3"**: `atlas/mod.rs` `4b03649a`, `cosign_chain/mod.rs` `30897ad0` and `vfs/mod.rs`
  `2186702f` as variants. The hookwall v0.2 `1514379e` of this commit is already in aether.

## Atlas `build.rs` and the later atlas, named by the step

Step 9 names "atlas mod.rs/build.rs". `build.rs` did not exist in the window, so its first two versions are
vendored here:

- **`build.rs` `43b9c0eb`** (3,078 B): first committed in `Asolaria @ 30dbf86` on 2026-06-17, at
  `vendor/Asolaria/federation-remake-1024/kernel/core/build.rs`.
- **`build.rs` `775c05ed`** (3,180 B): its `cargo fmt` version, read from `dc1da1a` (first at `7bdd52e`,
  2026-07-02). It is at `vendor/asolaria-federation-1024/kernel/core/build.rs`.

Its header: "Build-time codegen of atlas tables from C:/HyperBEHCS/store/atlas-canonical-1024.hbp ...
Until validated, the kernel still uses hand-coded match arms in src/atlas/mod.rs". That `.hbp` input is
already in aether (`acer/HyperBEHCS/store/atlas-canonical-1024.hbp`).

The atlas has three versions:

- `5aef4ee0` (7,090 B, genesis, 05-13): base directory.
- `4b03649a` (11,568 B, `d82bb25`, 05-17): variant directory.
- `c8922f0a` (11,679 B, first at `c595358`, 2026-07-07, read from `dc1da1a`): in
  `vendor/asolaria-federation-1024-variant-dc1da1a/`. It pairs with `775c05ed`.

## The 05-13 BEHCS-1024 GitHub remake staging (`2699437` 17:24:10, "BEHCS-1024 P16 redacted projection")

All 20 paths under `staging/behcs1024-github-candidate-20260513/` are vendored, with the two redaction
tools `tools/behcs/behcs1024-redacted-projection.mjs` and `behcs1024-redaction-adapter.mjs`. The staging
files are:

- the plan `BEHCS-1024-REMAKE-GITHUB-200-STEP-IMPROVEMENT-PLAN.md`;
- `behcs1024-free-agent-wave.mjs`, `fabric-revolver.mjs`, `behcs-bus.js` (67,700 B) and
  `bus-supervisor.mjs`;
- the omnicoder server, pilot and page, and the Falcon omnicoder scripts;
- `Start-Asolaria.ps1` and `Start-GnnSidecar.ps1`;
- the gnn-sidecar `inference_server.py`;
- the two projected reports, `PROJECTION-MANIFEST.json`, an `.env.example` whose keys are all empty, and
  the README.

The README says "Files projected: 17 · Redactions applied: 38 · Remaining blockers: 0" and "Keep runtime
data, screenshots, bus receipts, and private topology out of Git". Of the commit's five generated
top-level `reports/`, two are byte-identical to staging files and three are pinned by id; the gap map
says to skip the generated reports.

One thing to state plainly: the redacted `tools/Start-Asolaria.ps1` (`709ef670`) still carries the owner's
own Gmail address, as `ASOLARIA_UI_CHROME_EMAIL`. It is the owner's address, in line with rules 7.m and 7.n,
so it is vendored, not held.

## BEHCS-1024 foundation v2 and alphabet-1024

The public pieces are here:

- `REPO_LAW.md` (above).
- The glyph-alphabet audit
  `vendor/what-is-asolaria---how-do-we-get-reductions-in-everything/docs/pipe-audit-2026-05-31/16-AUDIT-behcs-glyph-alphabet.txt`
  (5,327 B). The audit is dated 2026-05-31 and was committed in `724ad64` on 2026-06-27. It finds
  `behcs.mjs` to be "a pure, stateless ESM module" that exports `BEHCS256` (cp0000-cp00ff) and
  `BEHCS1024` (cp0000-cp03ff) synthetic codepoints.

The foundation v2 docs that exist are already in aether, as are `alphabet-1024.json` and `behcs.mjs` (see
below).

## HyperBEHCS Hermes worker lanes (Asolaria-hermes-work, read from `84f0b20`)

There are 16 files. All were first committed on 2026-06-28 (`8a66283`, "Consolidate Asolaria Hermes
work"), though their names and data carry dates from 2026-05-16 to 05-22:

- `asolaria/tools/behcs/behcs1024-prism-overlay-mint.mjs` (`5f5c6be4`): "Mints a sidecar supervisor
  overlay for the BEHCS 1024 Prism frontend".
- Five worker and handoff tools, 73,273 B in all: the spindle worker, the two-latch handoff and its
  validator, and the dry-run and prompt-preview sweeps.
- Six unit tests.
- The two two-latch receipts dated `20260516`.
- `hyperbehcs/store/Start-Hermes-Spindle-Dispatcher-2026-05-20.ps1`.
- `hyperbehcs/store/system-upgrade-2026-05-22/omnidispatcher-spec-2026-05-22.md` ("PROPOSAL ·
  CP=PENDING-APEX-MINT").

The spec's companions in the same repository were not named by step 9 and are not vendored. They are the
`fedenv-v1-schema-2026-05-22.md` (`0a6c6518`) and the `asolaria-acer/federation-remake-1024/tools/omnidispatcher/`
code. The 10,000-room rotor is already in aether.

## labs/aether-16-bit, the AETHER-16 Bridge kiosk (2026-05-22)

There are 12 files, 42,815 B, in three versions of the same four paths:

- `da39126` 05:18:29 in `vendor/Asolaria/`, "add AETHER-16 Bridge v2 kiosk canon".
- `e504626` 20:37:28 in `Asolaria-variant-e504626/`, "enhance ... kiosk visuals".
- `5978a43` 20:49:59 in `Asolaria-variant-5978a43/`, "link AETHER HPB planet source in kiosk".

The four paths are `bridge-kiosk.html`, `AETHER-16-BRIDGE-KIOSK.hbi`, `.receipt.hbp` and
`.receipt.sha256`. The receipt reads "project=AETHER 16 BIT ... canon=AETHER-16 Bridge v2 ...
hermes_role=Prism Relay Operator ... runtime_authority=false ... json_dependency=removed". Its
`[BOUNDARY]` sets backend, fetch, websocket, storage and every execution and mutation lane to `disabled`.
Apart from the construction-gap audit, which names it, nothing in aether references it. It is the
first record of the "AETHER-16" name, not of "aether" itself (see the top of this README).

## Already in aether (referenced, not re-vendored)

The exact bytes of each of these are in aether's committed tree. Blob ids are in `PROVENANCE.md`.

- From the federation:
  - `KERNEL_TARGETS.md`: `beginning/08-.../vendor/asolaria-federation-1024/`.
  - Both `glyph_genesis/mod.rs` versions: `beginning/07-.../`.
  - `pid/mod.rs` `816c1fc7`: `loop/vendor-pid-mod/src/pid-mod.rs`.
  - `sign_gate` `883f6c2d`, `tier` `721d699d`, hookwall v0.2 `1514379e` and the later `bus_fabric`
    `5de1be37`: `kernel/lane/core/src/`.
  - The ported gate primitives (comment-edited, not byte-identical): `gate/hookwall/src/{hookwall,sign_gate,tier_gate}/`.
  - aether's `kernel/lane` also carries later versions of `agent_runtime`, `cosign_chain`, `crypto`,
    `envelope`, `frame_alloc`, `lib.rs`, `syscall` and `vfs`; none equals a blob vendored here.
- ACER deliveries:
  - `behcs1024-language-kernel.mjs` (2,144 B): `acer/C/asolaria-acer/packages/dashboard/src/super-os-viz/`.
  - `00-IMMUTABLE-FOUNDATION-v2.md` and `02-PORT-NAMESPACE-CANON.md`: `acer/C/asolaria-foundation-v1/`.
  - `atlas-canonical-1024.hbp`: `acer/HyperBEHCS/store/`.
  - The HyperBEHCS home: `README.md`, `AGENT.md`/`.hbp`, `lib/hyperbehcs-{substrate,targets}.cjs`,
    `bin/hyperbehcs-daemon.js`, `bin/append-autopilot-v2-omnirow.mjs` and `store/100-pid-roster-W113.hbp`.
- Canon archive:
  - The foundation v1 `00-IMMUTABLE-FOUNDATION.md` (with the 2026-05-06 v2 amendment text) and
    `01-SUPER-STARTUP-GUIDE.md`.
  - The HyperBEHCS hot-path law, `brown-hilbert/15-2026-05-16-hyperbehcs-hot-path.md`.
- Elsewhere:
  - `alphabet-1024.json` (Q-PRISM copy): `eval/vendor/qprism-control/qprism/data/`.
  - bigpickle `src/behcs.mjs`: `model/hrm-mtp/vendor/bigpickle-rebuild/`.
  - The Hermes 10,000-room rotor (`.mjs`, unit test, latest report):
    `quants/cubes/vendor/Asolaria-hermes-work/room-rotor/`.

## Held (`HELD.hbp`, blob ids only)

- **Four genesis files that carry tokens.** They were vendored on 2026-10-18 by mistake and moved to
  `HELD.hbp` on 2026-10-19.
  - `W18-WAVE-SYNTHESIS-ACER-2026-05-12.md` (`8a85ffa8`, 20,238 B). Line 57, "Tokens in canon (non-key,
    but T6-class)", gives the full 36-character "BEAST bearer" UUID. It is the same string as the live
    Bearer token on line 40 of `gates/hookwall-v2.js` (mirror blob `76e19530`), which step 6 holds and
    which the audit's `critic.build_order[0]` says to rotate before anything else is copied. aether's tree
    has only the audit's truncated `a2548ed8-...`, so vendoring this file would have put the full token
    into aether for the first time. Lines 41 and 57 also carry the usb_raw_io auth token.
  - `substrate-conflict-matrix.json` (`ae9ef5df`, 3,702 B), `SUBSTRATE_CONFLICT_MATRIX.md` (`d9e0e575`,
    12,901 B) and `kernel/docs/DRIVER_MODEL.md` (`fc809e15`, 9,448 B). Each gives the usb_raw_io auth
    token as a literal value. That token authorizes raw writes to `\\.\PHYSICALDRIVE2`, and W18 classes
    it as T6 (the SECRET tier). The rest of each file is canon with no other secret. They are held under
    the token rule until the owner decides whether to release them.
- **Seven rows of ACER desktop screen captures** from the genesis (6 distinct PNG blobs, 264,140 to
  951,606 B; `c693b6de` sits at two paths). Some show live terminal sessions, desktop file names and
  partly visible text from other windows. These are runtime captures, not defining files, and the
  staging README's own rule keeps screenshots out of Git.
- **The HyperBEHCS vote_quorum daemon** (`C:\HyperBEHCS\bin\asolaria-vote-quorum-daemon.py` and its
  `.pyc`), held by rule 7.j and 7.m. It was never committed publicly; it is recorded only.

The first credential scan, on 2026-10-18, reported no credential. That was wrong. It matched `Bearer`
case-sensitively and `"token":` only, so it missed the lowercase `bearer` in W18 and the `"auth_token":`
values. The 2026-10-19 rescan of the 176 files still vendored is case-insensitive. It also covers token,
secret, password and API-key assignments that have a literal value, and UUIDs. It found no credential:

- Every `sk-` hit is the end of an ordinary word (`spacedesk-`, `risk-`, `disk-`, `task-`).
- The five `bearer` hits are the `BearerMissing` error variant in both versions of `bus_and_kick/mod.rs`,
  and one plan line that prefers bearer-token routes.
- The only UUID is a Claude session id, cited twice in `super-dashboard-server.mjs`.
- The private-key hits are code comments; no file holds key bytes.
- The only email is the owner's own.
- The rest are LAN addresses (192.168.1.x, 192.168.100.x, 172.26.128.1), local paths and the five
  authorized operators' names (rule 5).

Files that name `reverse-gain`, `47d-reverse-gain-*-connor.json` or the connor trail contain names, sizes
and route labels only. None contains the MASK_GLYPHS set or the 47D reverse-gain data, and none of them
was moved to HELD.

## Corrections to the construction-gap audit (measured)

1. The first Rust hookwall `080e3490` is `Asolaria @ eb61d3c`, 2026-05-11 17:46:48. The federation
   genesis has the same blob; `e5fb0ee` rustfmt'd it to `93de20f7`.
2. aether's hookwall `1514379e` was first committed in federation `d82bb25` on 2026-05-17 (13:30:15).
   The 2026-06-17 that the audit's critic gives ("aether holds only the 2026-06-17 1514379e", in
   `critic.missed` and `critic.corrections`) is only its first mirror commit (`30dbf86`). aether's own
   `gate/hookwall/PROVENANCE.md` and `kernel/lane/PROVENANCE.md` cite the blob at federation `dc1da1a`
   and give no date for it.
3. `build.rs` `43b9c0eb` first appears in `Asolaria @ 30dbf86` (2026-06-17), before federation `786621c`
   (07-01). The `dc1da1a` blob `775c05ed` first appears at `7bdd52e` (07-02), not `786621c`.
4. The atlas has three blobs (genesis `5aef4ee0`, phase-3 `4b03649a`, `dc1da1a` `c8922f0a` from
   2026-07-07). The critic attached `c8922f0a` to the genesis.
5. Five blobs the critic gives as the `dc1da1a` versions are the `e5fb0ee` rustfmt blobs of 2026-05-13
   10:40:07: `bus_and_kick` `21ce76ff`, `highway` `51260b32`, `transit` `c4504e87`, `servers/highway`
   `0179691b` and `tier-policy` `e5f47996`. Their pre-format `282b9e9` originals are vendored too.
6. The staging commit `2699437` has 20 paths under `staging/`, not 18. It has 27 rows in all: 20
   staging, 2 tools and 5 reports.
7. The five hyperbehcs-hermes tools total 73,273 B, not 73,573 B. Every Hermes-work file was first
   committed on 2026-06-28.
8. Already in aether through ACER deliveries, contrary to the map's "retrieve from ACER":
   `behcs1024-language-kernel.mjs`, foundation `00-v2` and `02`, `atlas-canonical-1024.hbp`, and the
   HyperBEHCS home files.
9. The `.gitignore` revert came 1 min 40 s after the change (11:29:03 → 11:30:43, by both author and
   committer date), not 1 min 38 s as the inventory notes said.

## Counts and dates

- **Files**: 176, totalling **1,433,104 bytes**. The largest is `super-dashboard-server.mjs` (150,968 B).
  - **Asolaria**: 50 (42 base, 4 + 4 kiosk variants).
  - **asolaria-federation-1024**: 109 (80 base; variants `e5fb0ee` 19, `f0dcd83` 2, `3067a0f` 1,
    `fa2ee20` 3, `d82bb25` 3 and `dc1da1a` 1).
  - **Asolaria-hermes-work**: 16.
  - **what-is-asolaria---how-do-we-get-reductions-in-everything**: 1.
- **Not vendored**: 10 pinned by id in PROVENANCE and 7 left for step 10 (gnn-oracle, `gnn/mod.rs`,
  `GNN_ARCH.md`). Held: 12 rows (4 token files, 7 screen-capture rows and the vote_quorum daemon).
- **Date range (per-blob beginning)**: 2026-05-11 17:46:48 (`eb61d3c`) to 2026-07-07 (`c8922f0a`).
  - The construction body is 2026-05-11 to 05-22.
  - The later beginnings are named by the step but first committed after the window: `build.rs` (06-17,
    07-02), the audit (06-27), the Hermes files (06-28) and the `dc1da1a` atlas (07-07).

## Not found (to step 14's list)

- **A12-OMNIQUANT-RUST** (2026-05-20): `src/{jl,polar,triple,turbo}.rs` and `Cargo.toml`.
  - Searched: `*OMNIQUANT*`, `*omniquant*` and `*A12-*` over all 132 Asolaria refs, the federation
    clone, Asolaria-hermes-work, asolaria-behcs-256, the reductions repo and the other beginning-src
    clones; aether, including the ACER deliveries.
  - The only trace is CANON formula rows citing
    `D:/AsolariaGuides/autopilot-overnight-2026-05-20/W45-REFOCUS-18-MAINS/A12-OMNIQUANT-RUST/`.
  - ACER only.
- **Foundation v2 docs 03-07** (`03-CUBE-OF-CUBES`, `05-100B-PID-MINTING`, `06-AUTO-TRANSLATE-LAYERS`
  and others).
  - ACER's own `ITEM7-STATUS.hbp` reads `NOT_ON_ACER`; ACER has only 00, 00-v2, 01 and 02.
  - Owner to say whether they existed as files.
- **Falcon `/sdcard/asolaria-behcs-1024/alphabet/alphabet-1024.json` and the BEHCS-1024 master
  `README.md`**: on the owner's phone only.
  - aether's Q-PRISM `alphabet-1024.json` has the sha256 recorded for the Liris atlas-local copy.
  - The Falcon copy has not been hashed.
- **Atlas v55/v56** (where the canon holds 60D): `NOT_ON_ACER_by_name` per `ITEM7-STATUS.hbp`.
- **The kiosk's lab files and PLANET LINK sources**:
  - The receipt's `[FILES]` names `index.html`, `style.css` and `app.js`.
  - The PLANET LINK sources are `C:\AETHER_16BIT\output\cosmos_AETHER-COSMOS-016.hpb`,
    `C:\AETHER_16BIT\hermes\receipts.hpb` and `hyperbehcs-hermes/aether_receipts/*.hpb`.
  - None is in any public repo. The owner's or ACER's drive.
- **Files the staging cites but never committed**: the candidate hash manifest
  (`reports/behcs1024-github-candidate-hash-manifest-20260513.json`) and the Liris mirror packet. These
  are local generated artifacts on ACER and Liris (low priority).
- **The genesis atlas's named source** `D:/asolaria-whiteroom/behcs-1024-atlas/atlas-index.ndjson` (1,024
  lines): in no public clone.
  - aether holds ACER's `acer/HyperBEHCS/store/atlas-index-1024.hbp`, a different format; it is not
    claimed to be equal.
