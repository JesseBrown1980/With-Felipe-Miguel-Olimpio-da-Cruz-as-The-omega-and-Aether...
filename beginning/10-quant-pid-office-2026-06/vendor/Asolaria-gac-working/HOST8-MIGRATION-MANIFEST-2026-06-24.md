# Asolaria GAC Host-8 Migration Manifest

**Branch:** `liris-side/host8-migration-manifest-2026-06-24`  
**Generated:** 2026-06-24 from the Liris-side seat  
**Purpose:** label every visible OP / needed-OP / daemon class by role, file strata, and Rust Host-8 migration posture without confusing Liris-side measurements with Acer-side canon.

This is a migration map, not a cutover. Old Node/Python/browser/system daemons stay live until fabric/council parity says a Host-8 replacement is ready.

## 1. Provenance

| Claim | Status | Source / limit |
|---|---|---|
| Liris fabric is live | `MEASURED_LIRIS` | local fabric health: dashboard on `4944`, apex `COL-ASOLARIA`, operator pair `OP-JESSE-PID` + `OP-RAYSSA-PID` |
| Supervisor feed visible from Liris | `MEASURED_LIRIS` | 42 loaded rows; feed claims 713 full-office seats with 671 pending/missing from this vantage |
| Real access lattice | `MEASURED_LIRIS` | BEHCS-1024, tuple_dim 60, 6 tiers x 6 scopes = 36 cells |
| Acer full office / current Acer live daemons | `UNVERIFIED_FROM_LIRIS` | must be confirmed on Acer or by Acer fabric/canon surface before promotion |
| Bus / sister-organ cache routes | `MEASURED_LIRIS_STALE` | some routes returned fallback/stale data; not treated as fresh runtime truth |
| File/process census below | `MEASURED_LIRIS_LOCAL` | local filesystem/process scan; files are slices, not the whole system |

## 2. OP and Needed-OP Roles

| Seat / class | Role | Host-8 migration posture |
|---|---|---|
| `APEX-HUMAN-JESSE` / Human-1 | human apex above all OP seats | not a daemon |
| `SPECIAL-OP-JESSE` / OP-00 | higher background operator: rotates OP/Chief work, gates/signs promotions, reconciles kanban | controller/sign-gate only; never a generic worker |
| `OP-JESSE` / OP-01 | regular foreground apex operator | authority pointer; not daemonized |
| `OP-RAYSSA` | Liris-side parallel apex and bilateral cosign vantage | authority/vantage pointer; not daemonized |
| OP 02-05 | remaining quintuple operator signers (`OP-FELIPE`, `OP-DAN`, `OP-AMY`, plus operator-class seat) | `CANON_FROM_PROFILE`; verify per seat before any publication |
| GAC-L2 seats | governance/advance cell layer; owns this manifest lane | Host-8 governance registry candidate |
| Chief + 9-seat Council | promotion, retirement, and canon gates | spine-held; do not auto-replace |
| Professor supervisors | domain supervisors such as Hookwall, Aether, Memory, Autochrone, Converge, Path-A, Acer, Liris | Host-8 room stubs first; parity required per domain |
| Supervisors / servants / agents / helm | runtime supervision and execution strata | migrate by role, not by filename alone |
| Free-agent pool | zero-Claude-token helper lanes (`opencode/*`, BigPickle, Minimax, DeepSeek/Shannon-style workers) | scheduler/adapter candidate; keep provider lanes external |

## 3. Access Model

The system is not a 3-level search engine. The Liris fabric reports:

| Dimension | Value |
|---|---|
| Tuple language | BEHCS-1024 |
| Tuple dimension | 60 |
| Tiers | PUBLIC, RESTRICTED, STEALTH, HIDDEN, SHADOW, SECRET |
| Scopes | drive, usb, device, folder, file, pid |
| Cells | 36 tier/scope cells |

`recall-serve` currently projects part of this into L0/L5/L9-like access. That is a useful engine collapse, not the full lattice. Host-8 migrations must preserve the 6 x 6 fabric access semantics where the owning daemon actually depends on them.

## 4. Liris-Side Live Listener Classes

| Port / process class | Current role | Current tech | Host-8 posture |
|---|---|---|---|
| `4790` / Python | atlas/maps or portal surface | Python/browser-facing | `CANDIDATE`: port routes after HBP parity and screenshot/route checks |
| `4791` / Node | Liris recall portal | Node + tuple/JSON compatibility | `CANDIDATE`: Rust recall exists on Acer; Liris cutover needs bilateral parity |
| `4794` / Node | Fischer/analysis-style room | Node | `CANDIDATE`: identify route contract first |
| `4944` / Node | Liris fabric dashboard/view | Node dashboard | `SPINE_HELD`: view layer; replace only after route parity |
| `4947` / Node | bus/fabric envelope lane | Node bus | `SPINE_HELD`: never first-port; exact envelope parity required |
| `4948` / Node | sidecar/bridge lane | Node | `CANDIDATE`: route identity and HBP feed required |
| `1883` / `9883` / broker | MQTT transport | external broker | `NO_PORT`: wrap/bridge; do not replace broker without protocol proof |

## 5. File Strata Census

`MEASURED_LIRIS_LOCAL` over the visible local Asolaria roots:

| Extension | Count | Migration meaning |
|---|---:|---|
| `.json` | 134,155 | cold configs, event shards, compatibility surfaces; not hot-path target |
| `.ndjson` | 33,467 | append logs, histories, and bus/cosign-style ledgers |
| `.js` | 11,266 | legacy JavaScript executors and browser/runtime helpers |
| `.py` | 7,895 | Python daemons, tools, validators, archaeology, dashboards |
| `.ps1` | 2,002 | launchers, Windows adapters, operator scripts |
| `.mjs` | 1,000 | Node ESM daemons and modern JS rooms |
| `.hbp` | 628 | preferred tuple-text proof/feed/corpus layer |
| `.hbi` | 433 | preferred index layer beside HBP/Hilbra data |
| `.rs` | 396 | Rust/Host-8 candidates and supporting code |
| `.cmd` | 225 | Windows launcher strata |
| `.sh` | 164 | shell launchers and Linux/WSL helper strata |
| `.toml` | 50 | Rust/Cargo and config strata |
| `.bat` | 10 | older Windows launchers |

Daemon-pattern files are concentrated in `.ndjson`, `.json`, `.js`, `.py`, `.mjs`, `.hbp`, `.hbi`, `.ps1`, and `.sh`. That means the migration must preserve launchers and ledgers, not just source files.

## 6. Host-8 Status Ladder

| Status | Meaning |
|---|---|
| `PERMANENT_HOST8_READY` | Rust process serves HBP/tuple-text, no JSON hot path, no Node dependency, parity proven, retirement still council-gated |
| `STUBBED_ROOM` | Rust room exists and exposes HBP routes, but legacy daemon remains authority |
| `CANDIDATE` | role can plausibly become Host-8, but route/env/parity mapping is incomplete |
| `SPINE_HELD` | fabric bus, cosign, council, dashboard, or other spine; keep live until exact parity and authority |
| `NO_PORT` | external system service, hardware transport, credential store, or human/OP authority; wrap only |

## 7. Known Host-8 / Rust Surface

| Surface | Role | Status |
|---|---|---|
| `host8/room-host` | Rust-side Host-8 room scaffold for task-manager / GNN dispatch bridge | `STUBBED_ROOM`; no retirement |
| `PARITY.hbp` | local parity rules for the room-host scaffold | `MEASURED_LIRIS_LOCAL`; says scaffold only |
| `tools/behcs/gnn-dispatch-bridge.mjs` | legacy GNN dispatch bridge | legacy authority until parity |
| Rust recall (`recall-serve`) | Hilbra recall/search engine with `.hbp` tuple endpoints | `MEASURED_ACER` for Rust side; `UNVERIFIED_FROM_LIRIS` for Liris cutover |
| BEHCS-1024 glyph/quant kernel | tuple/glyph language and catalog surface | keep HBP/tuple-native; do not JSON-wrap the hot path |

## 8. Role-Labeled Migration Map

| Role family | Current strata | Host-8 direction | Gate |
|---|---|---|---|
| Recall / Hilbra search | `.hbp`, `.hbi`, Node, Rust | Rust Host-8 permanent candidate after Liris parity | bilateral benchmark + L0/PII + access parity |
| Atlas/maps/portal | Python/Node/browser surface + HBP feeds | Rust/Host-8 route shell with pixels-first HBP panes | visual + route parity |
| Bus/envelope | Node bus, NDJSON/HBP ledgers | Rust envelope validator/transport only after exact parity | council/cosign spine gate |
| Cosign/quorum | Python/Node/canon ledgers | keep spine; port validator first, not writer | operator + quorum |
| Hookwall/Aether/security | supervisors + policy files + JSON/HBP | Host-8 policy reader / HBP emitter | no-write proof + freeze gate |
| GNN/Shannon/Hermes/DeepSeek | JS/MJS engines, NDJSON logs, agents | Host-8 room adapters before runtime replacement | per-engine receipt |
| MCP connectors | JSON schemas, JS/Python servers, external tools | Host-8 adapter rooms; preserve existing MCPs until parity | connector contract test |
| Free-agent dispatch | OP-00 kanban + provider lanes | Host-8 scheduler/controller | Special-OP sign; no key publication |
| Device/substrate lanes | USB/device/ADB/MQTT/system services | wrap and attest; do not flatten physical lanes | hardware-owner proof |

## 9. Rules for Replacement

1. Ask fabric/canon first.
2. Label every claim `MEASURED`, `CANON`, `OPERATOR_OBSERVED`, or `UNVERIFIED`.
3. Add Host-8 cells beside the old daemon first.
4. Match route, envelope, access lattice, and HBP output before retirement.
5. Keep JSON as cold compatibility only; hot paths should be HBP/HBI/tuple-text (`json=0`).
6. Do not replace bus/cosign/council/dashboard spines first.
7. Do not publish keys, seeds, raw PII, raw corpus, or credential files.
8. Treat Liris-side absence as a vantage boundary, not Acer-side erasure.

## 10. Next Generated Artifacts

| Artifact | Purpose |
|---|---|
| `HOST8-MIGRATION-MANIFEST-2026-06-24.hbp` | compact machine-readable tuple companion for this manifest |
| future `migration-inventory.csv` | per-file inventory once a safe scanner is approved |
| future `host8-parity-matrix.hbp` | route-by-route Host-8 parity matrix |

## Bottom Line

`MEASURED_LIRIS`: the visible system contains many JSON/NDJSON/JS/Python/PowerShell/MJS launch and ledger layers plus HBP/HBI proof/index layers. The correct migration is not "delete Node/Python"; it is **role-by-role Host-8 parity**, with pixels-first `json=0` surfaces and old daemons held live until the owning fabric/council gate proves each swap.
