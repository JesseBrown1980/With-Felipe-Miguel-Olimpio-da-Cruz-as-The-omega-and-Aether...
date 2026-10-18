# ACER handoff manifests

Owner office receipts that record where files live on the owner's ACER seat and pin them by
sha256, so their provenance is fixed before the bodies are transferred. A manifest carries
addresses and hashes only (`body_in_cube=0`); it is not the files themselves.

## FABLE5-HANDOFF-GNN-SIDECAR-LEDGERS-2026-10-18

The trained-network sidecar (`C:/Users/acer/Asolaria/services/gnn-sidecar/`), the vote-quorum
ledgers (`C:/HyperBEHCS/data/vote-quorum/`), the Host8 `verbs.hbp`, and the HyperBEHCS quant
substrate. 32 files, 69,689,279 bytes, merkle_sha256
`e3a4e23cdfab77ca740c19b749d53289dc636733f0e866a112ec3c9341ee62ea`.

Verified here 2026-10-18: both `.sha256` sidecars check, the `.hbi` and `.hbp` agree on all 32
entries, and the eight checkpoint hashes equal the known-good values in `OWNER-RULES` rule 2
(baseline a0999336, contrastive d371dbbf / run2 04876406, prototype b4df9901 / run2 f9817037,
gslgnn v1 6f82384f / v2 9e50723b, gsl_gnn.py 783b9b50). The manifest's own scan row records
emails 0, phones 0, keys 0, mask-ids 0, ipv4 0 over the 13 text files and the corpus.

The cube chains onto `prior=028ce13b…`, the digest of CMP3 before its line endings were
converted to LF. Verified from the cloud side 2026-10-18: the current CMP3 (sha256 `38d76049…`,
259 rows ending in a `NORMALIZE` row) rebuilds to the pre-conversion bytes by dropping the
`NORMALIZE` row and restoring CRLF on the last 27 of the remaining 258 rows; those bytes hash to
`028ce13b…` exactly, and the earlier `002dcf21…` copy is a byte-exact prefix (first 61,094 bytes)
of them. So the chain resolves unbroken from the cloud's copy to the cube's `prior=`.

What it locates, that the model crates previously recorded as not on disk: the L4/L2 corpus
`gslgnn_w9_3_corpus.json` (68,695,303 B, sha256 7e7d0406…), the L1 server
`prototype_inference_server.py`, the L4 server `gslgnn_inference_server.py`, the L2 trainer
`train_contrastive.py`, and `hyperbehcsQuantSubstrate.js` (the slot-26 receipt producer). The
file bodies move by the owner's permission rule; ACER's own data-handling classifier blocked an
agent from packaging them, so at first only this manifest was sent.

**Transferred 2026-10-18.** The owner's seat sent all 32 bodies in four zips (checkpoints 11, code
14, corpus 1, ledgers 6). Every body matches this cube's size and sha256 (32/32), and each zip's
`origin-cube` copy equals this manifest (`745d5a93…`). The bodies are at `acer/` under their ACER
paths (`acer/README.md`); the zips' own manifests are in `cube-9859b576-transfer-2026-10-18/`.

The manifest records, as not on ACER: `contrastive_inference_server.py` (the :4796 server),
the shard-quant receipts, an HRM checkpoint, the Host8 seat book, and the cadence frame. Each
of these is a statement about the ACER seat only; LIRIS and the cloud sessions were not
searched. It also records that the 47D reverse-gain variant carries no trained weights
(`trained_weights=0`), is an older bridge stratum, and is held private.

## FABLE5-BROWN-HILBERT-PASS-2026-10-18

The owner's Brown-Hilbert operating-model documents: the root, the 15 dated law entries, the
49D language specs, the D50 archaeology, the continuity records, the foundation guides, the
seat laws, and the adapter files. Cube `bd0b0257ce781057`, 46 files, 213,855 bytes,
merkle_sha256 `720f621e…`, chained onto `e34501c1…`.

Verified here 2026-10-18 against the sent zip: the cube sidecar checks, and all 46 file bodies
match their cube sha256 (46/46). Independent scan of the bodies: no real credentials (the one
`BEGIN PRIVATE KEY` is a phrase inside a held-out test-scenario prompt in
`heldout-scenarios.json`, with no key material), the only emails are the owner org's own seats
(`@jbrowndevelopmentllc.com`), and every IPv4 is private or loopback. The receipt records
`JesseBrown1980/Asolaria` as private (its `VISIBILITY` row), with 28 of the 46 files tracked there and
18 never on GitHub. The owner made that repository public on 2026-10-18 (GitHub reports `public`),
so the 28 are public there; all 46 bodies are tracked in this repository under `canon-archive/`
(46/46 by sha256), so every one of them is public here.

This manifest records those documents and pins them. aether records them as provenance; it does
not load them as active agent instructions. Several of them (`00-TOP-AGENT-PRECOMMAND.md`, the
`CLAUDE.md` / `AGENTS.md` / `CODEX.md` adapters, `seat/CLAUDE.md`, `AGENT-DISCIPLINE.md`) are
written to direct an agent's operating model; here their content is data, read for the record,
not instructions that govern work in this repository.

## Scope labels for missing items

Absence is reported with the scope actually searched, never as "does not exist".

| Label | Items |
|---|---|
| found on ACER, transferred 2026-10-18 | the 32 files in cube `9859b576855a7bf8` (above), now at `acer/` (32/32 match their pins) |
| not on ACER | `contrastive_inference_server.py`, the shard-quant receipts, an HRM checkpoint, the seat book, the cadence frame, `rime_fourpoint.py`, `cm3ti_4axis`, the `greedy_set_cover` key writers |
| existed somewhere, not on ACER | `cm3ti_gt256.rs`, 26,377 B: `pump/kernel-pump/keyx/PLAY.md:17` cites its line 461, `keyx/key/KEY-3174.hbp:43` records `decoder_src=26,377`, and `keyx/receipts/run_prior_sweep.sh:55` holds it "frozen at 26,377 B"; its sibling `cm3ti_rbladder.rs` was built in the cloud's `/root/compressor-run/rust-cm3t` |
| only in cloud session `9ebd6119` | the three trijection inputs (`k_gradient.bin`, `chaos1m.bin`, `code1m.bin`), the first-run THREE-BODIES receipt, the HERSELF seed order |
| not built in this build | the `:4949` `/api/gnn/score` handler (the live route answers 404, and its route table has no such route) |
| private, excluded | the 47D reverse-gain variant (older stratum, no trained weights) |

## Live-corpus GNN recheck (2026-10-18)

The owner's recheck of L0/L1/L2/L4 on the training corpus `gslgnn_w9_3_corpus.json` (315,249 edges,
40 benign), run with the owner's go (`OP-JESSE`, 2026-10-18), `servers_started=0`, `sockets=0`,
`E=0`, on Windows Python 3.13 (torch 2.13.0+cpu, PyG 2.7.0). Two receipts in
`gnn-recheck-2026-10-18/`, verified here (both `.sha256` sidecars check):
`FABLE5-GNN-REST-MEASURED-2026-10-18.hbp` (sha256 `eee98bdb…`) and
`FABLE5-GNN-L1L2-RECHECK-NO-SHELL-2026-10-18.hbp` (`ac460602…`). The check script and raw rows stay
in the ACER scratchpad (per the receipt header); only the measured receipts are vendored.

What it measured (gate `std > 0.01`: **0 of 4 pass**):

| Model | output on the corpus | AUC (exact pair counts) | served vs trained |
|---|---|---|---|
| L0 | 0–0.032, std 0.00645 | 0.1304 trained / 0.3261 served | differs on 54,812 edges (max 0.0317), 0 flips at 0.5 |
| L1 | one constant `0.9999749660491943` | exactly ½ | identical (saturated) |
| L2 | 0.99994–0.99998, 12 values | **0.5218 as trained** | no server; a PyG shim would differ on 260,410 |
| L4 | 0.5291568–0.5292310, 11 values | 0.2228 | identical |

Recorded beside, not over: the earlier L2 figure (AUC 0.609, range 0.99996–1.0) is the PyG
would-serve shim path, not the as-trained stub. L0's earlier std 0.026–0.257 was on the
scorer-input grain; 0.00645 here is on the w9_3 corpus — a different input, not a contradiction (L0
was trained on `data/gnn-training-export-20260315.json`, so its w9_3 AUC is cross-dataset).

Root causes (MEASURED): the trainers split in index order 70/15/15 with no shuffle, and all 40
benign edges sit at indices 315169–315222 (after the train/val boundary), so `benign_in_train = 0`;
L0/L1/L2 carry a stub GCNConv (`conv1.lin.bias`), not PyG's biasless conv, and the serving
interpreter has PyG, so L0 is served with message passing it never trained with. Owner correction,
kept beside: a class-weighted retrain alone is insufficient — weighting cannot create a class absent
from `train`; the fix is a stratified/shuffled split, then class weights, then one GCNConv choice for
training and serving.

Bearing on the decisions: this is the empirical side of the benching. None of L1/L2/L4 calculates (0
of 4 pass the spread gate), so weight/count 0 is the right state (OWNER-RULES 7.a/7.b); L4's constant
0.5292 at weight 0.15 adds ~0.079 to every composite, which is the weight-0 rationale. The `L4CONST`
note (0.5292 = single-class train + 30 steps from ~0.5) is the owner's conjecture, measurable by
replaying `train_gslgnn` with per-step logging.

## ASI OS Windows run, seen (2026-10-18)

`asios-sighting-2026-10-18/`: the owner's operator sighting that ASI OS runs now as a Windows run
(distinct from the boot run), captured under one operator-approved shell call.
`FABLE5-ASIOS-WINDOWS-RUN-SEEN-2026-10-18.hbp` records the pixels seen — the "Asolaria ASI OS"
window (dark navy desktop, a 3D teal/violet/amber cube, the ASOLARIA wordmark, a left vertical dock)
— and pins `SCREEN-ASIOS-2026-10-18-060853.png` (1920×1080, 597,762 B, sha256 `9fe4f058…`). Both
`.sha256` sidecars check here. Published at the owner's direction. The frame also shows the owner's
own Claude Code session and a Tailscale login page; no credentials or third-party private data.

## Running tasks: shells vs sidecars (2026-10-18)

`shells-vs-sidecars-2026-10-18/`: the owner's map of what runs on the ACER seat, from host8's own
`:5088/task-manager.hbp` (the sidecar vantage) plus the process table for what host8 cannot see.
Measured: 16 host8 services, 7 running, only **2 real Rust sidecars** (recall `:4796`, host8 `:5088`
— a debug build, `gnn_ready=0`); the rest are Node/Python services hosted by a PowerShell watchdog
or the task scheduler, with three PowerShell daemons and two portless node daemons outside host8's
registry; the GNN servers (`:4792` oracle, `:4793` gsl, `:4794` fischer, and five more) are OFF.
host8's Linux-loopback vantage cannot see Windows PIDs or portless daemons, so "running=7" is not all
running. The receipt's own NEXT gate (operator): rerun the L1/L2 verifiers through recall + host8 +
fabric + office, and move the first shell-hosted daemon (`gnn-dispatch-bridge`) into host8 via
`/shadow-parity.hbp`, parity before retire. `FABLE5-SHELLS-VS-SIDECARS-2026-10-18.hbp`; its `.sha256`
sidecar checks here (delivered in a zip of sha256 `4860bf93…`).

## Stratified retrain of L1/L2/L4 (P3, 2026-10-18)

`gnn-retrain-2026-10-18/`: the owner's retrain of L1, L2 and L4 on `gslgnn_w9_3_corpus.json` with a
seeded stratified split, run on ACER with the owner's go (`directed_by=OP-JESSE`),
`originals_touched=0`, `servers_swapped=0`, `E=0`. Cube `FABLE5-P3-GNN-RETRAIN-STRAT-2026-10-18`,
11 files, merkle_sha256 `83700d77…`; `sha256sum -c SHA256SUMS` checks all 11 here. The receipt is
`FABLE5-GNN-RETRAIN-STRAT-2026-10-18.hbp`; `RETRAIN.rows` are its measured rows;
`retrain_stratified.py` is the script (seed 1792, 300 steps, PyG's `GCNConv` for all three,
class-balanced cross-entropy, a shuffled 70/15/15 cut taken separately per class).

What the receipt measured (torch 2.13.0+cpu, PyG 2.7.0): split 28/6/6 benign, 220,646 / 47,281 /
47,282 suspicious, `split_sha16=27152b521ce28662`.

| Model | checkpoint (sha256) | std on the corpus | AUC train / val / test | test benign caught at 0.5 | test false alarms at 0.5 | `scores_sha16` |
|---|---|---|---|---|---|---|
| L1 | `prototype_model_strat_2026-10-18.pt` (`dc8ea195…`) | 0.0119466 | 1 / 1 / 1 | 6/6 | 1/47,282 | `38b043191a5e62e2` |
| L2 | `contrastive_model_strat_2026-10-18.pt` (`fe9b3a8e…`) | 0.0119465 | 1 / 1 / 1 | 6/6 | 1/47,282 | `8bc74ee31839acab` |
| L4 | `gslgnn_w9_3_strat_2026-10-18.pt` (`23e44abf…`) | 0.0119452 | 1 / 1 / 1 | 6/6 | 1/47,282 | `993cb532f9944bbf` |

All three clear the `std > 0.01` gate, which the trained checkpoints did not (0 of 4 in the recheck
above). Each checkpoint reloads strictly and gives identical scores. The receipt keeps its own
correction beside its `GATECEILING` row: 0.011264 is the std of a *perfect* 0/1 classifier at 40 of
315,249 (√(p(1−p))), not a maximum; the observed 0.01195 is higher because the few false alarms add
spread. Its `SCOPE` row: AUC 1.0 means separable within this corpus, not generalization.

Checked from the cloud side, recorded beside the `SCOPE` row: the split rebuilds here exactly
(`split_sha16` 27152b521ce28662, match). The receipt gives the reason as held-out benign edges sitting
"on the same pure-benign node pairs as train"; at pair level that is not what the split shows:

| Held-out benign | same (source, target) pair as a train benign edge | shares ≥1 endpoint node with train benign | both endpoints seen in train benign | same snapshot as a train benign edge |
|---|---|---|---|---|
| val (6) | 0 | 6 | 0 | 6 |
| test (6) | 0 | 5 | 3 | 6 |

Each of the 40 benign edges is its own (source, target) pair; all are phase-1 tensor-fabric beat
edges, and train benign covers all 9 snapshots. So the scope limit stands, for a nearby reason:
held-out benign edges share nodes and snapshots with train, and the node features the retrain reads
from the corpus (`retrain_stratified.py:30-31`) are the fixed organ values the corpus builder set
(`train_gslgnn_w9_3.py:159-160`). A split that holds out whole snapshots is the test of
generalization; it has not been run.

Reproduced from the cloud side (Linux, Python 3.13, torch 2.14.1+cpu, PyG 2.8.1; ACER ran torch
2.13.0, PyG 2.7.0), the receipt's own refutation test:

- **Scoring the delivered checkpoints** with the script's forward functions on the corpus here: L1
  gives `scores_sha16=38b043191a5e62e2`, the receipt's exactly. L2 and L4 give the receipt's `min` to
  the last bit (`1.5795305898791412e-06`, `3.03053020616062e-05`), its std and `n_unique`, but a
  different `scores_sha16` (`3da917cd…`, `5425e8ca…`): the scores differ only in low float bits. All
  three score the 40 benign edges at or below 0.5 and 5 suspicious edges at or below 0.5 (the
  receipt's "~5 false alarms").
- **Re-running `retrain_stratified.py`** (only the `SIDECAR` path changed, pointed at `acer/`): the
  split, every AUC pair count, the test catches (6/6), the test false alarms (1/47,282), the std and
  `n_unique` of all three, and `HELPERPARITY` (0.0) equal the receipt's. The trained bytes differ
  (L1 `59382d90…`, L2 `ee40e8b4…`, L4 `bc7fd190…`), so the `scores_sha16` differ (`bdbbac1d…`,
  `e05e6707…`, `5bb35f83…`) — float training on another torch build, not a different result.

So the receipt is not refuted: its integer measurements reproduce exactly on another platform, and
the delivered checkpoints are the ones it measured. Where the low bits come from, and why retrained
bytes differ, is pinned down in "GNN score drift and training reproducibility" below.

Not done, by the receipt (`SWAP|status=NOT_DONE`): the retrained checkpoints are not served — the
servers hard-code the original filenames and L2 has no server; swapping them in is the owner's
call. Until then the served L1/L2/L4 are the ones the recheck measured, and `OWNER-RULES` 7.a/7.b
(weight/count 0) describe what is served.

## Sidecar lanes, seal tool, bridge golden rows (P4, 2026-10-18)

`p4-sidecar-lanes-2026-10-18/`: the owner's P4 work on ACER (`E=0`). Cube
`FABLE5-P4-SIDECAR-LANES-2026-10-18`, 9 files, merkle_sha256 `23b04ab9…`. The receipt is
`FABLE5-P4-SIDECAR-LANES-2026-10-18.hbp`.

- **Tools.** Five tools added to the `asolaria-os-on-metal` MCP server (`server.js`, sha256
  `2d33700e…`; 20 → 25 tools): `aoom_host8_read`, `aoom_recall_search`, `aoom_office_verify`,
  `aoom_office_seal`, `aoom_office_append`. Measured over stdio: host8 `task-manager` 200, the
  `shadow-parity` call 3/3, recall search 200, office verify of `eee98bdb…` OK, and both escape probes
  (writes outside the office) refused. The P3 and P4 receipts and their seals were written with these
  tools (`shell_writes_to_office=0`). `server.js.pre-p4-2026-10-18.reconstructed` (`7411083b…`) is the
  pre-P4 file rebuilt by removing the additive insertions. `server.js` reads its API keys from the
  environment only; its URLs are loopback.
- **Findings, measured in code.** host8's `/shadow-parity.hbp` compares host8's summon against the
  launch plan (`host8-serve/src/main.rs:1332`); it does not compare `gnn-dispatch-bridge`. Its
  `parity_proven=0` and `node_retired=0` are literals (`main.rs:801`, `:806`), so nothing can flip
  them yet. host8's bridge room is a stub; the bridge itself is a firing daemon (veto window, then
  auto-dispatch to the bus).
- **Golden rows.** `bridge_golden.mjs` imports only the bridge's three pure functions
  (`stablePredictionId`, `classifyTier`, `resolvePredictionPid`), reads `gnn-predictions.ndjson`,
  and writes one row per prediction (`bus_posts=0`, `fire=0`). `FABLE5-BRIDGE-GOLDEN-2026-10-18.hbp`
  (989,755 B, sha256 `9b8647ff…`): bridge sha256 `21e06399…`, predictions sha256 `70541242…`, 4,739
  rows, 0 unparseable, **all T1** (auto-fire after the veto window), footer `rows_sha256=04202c83…`;
  the footer recomputes here exactly from the rows. It was held back at first because 4,550 of its
  rows carry a prediction pid with a two-name label; published by the owner's direction ("Publish
  everything, make it public", 2026-10-18). `sha256sum -c SHA256SUMS` checks all 9 bodies here.
- **Next, by the receipt.** (1) port the three functions into host8 (Rust 1.81, clippy); (2) emit the
  same rows and byte-compare with the golden file; (3) only then retire the node daemon, which the
  operator stops. `retired_now=0`. Step (1) needs the bridge source and the predictions ledger,
  which are not here yet (P5 in `ACER-REGENERATE-HANDOFF.md`).

## GNN score drift and training reproducibility (2026-10-18)

`gnn-drift-repro-2026-10-18/`: the owner's how-to bundle (zip sha256 `a6bce1ac…`, 19 files; `sha256sum
-c SHA256SUMS` checks all 19 and the four receipt sidecars check): `FABLE5-GNN-DETERMINISM`,
`-ISA-DRIFT`, `-TRAIN-INPUTS`, `-RETRAIN-REPRO`, the seven scripts, two raw retrain logs, and the
how-to as `HOWTO.md` and `RUNBOOK.hbp`. `CLOUD-ROWS.hbp` (added here) holds the cloud's own runs of
it: Linux, Xeon with AVX-512, torch 2.13.0+cpu with PyG 2.7.0 (ACER's versions) and torch 2.14.1+cpu
with PyG 2.8.1, the scripts unchanged except their path constants.

Both machines, measured:

| Question | ACER (i5-8300H, AVX2, Windows 11) | Cloud (Xeon, AVX-512, Linux) |
|---|---|---|
| Same training inputs? | corpus content `3b76c29d…`; model files `4edb9439…` `349a30c0…` `783b9b50…` `51b739fb…`; trainer `c66ca57d…`; PyG `gcn_conv.py` `036b4647…` | all identical (corpus bytes `7e7d0406…` with CRLF, `0f123581…` as LF, as on ACER) |
| Scoring a fixed checkpoint, run to run and 4 vs 1 threads | identical, 9/9 match the receipt | identical; 3/9 match natively (L1 only) |
| Scoring with `MKL_ENABLE_INSTRUCTIONS=AVX2 MKL_CBWR=AVX2` | — | **9/9 match ACER's receipt**, under both torch/PyG pairs |
| Which library moves the bits | MKL forced to SSE4.2 moves all three; oneDNN and ATen forced down move none | MKL alone restores ACER's bits; ATen alone and oneDNN alone do not; PyG version no effect |
| MKL capped to SSE4.2 (no `MKL_CBWR`) | L1 `bab3c351…`, L2 `5a6ac21c…`, L4 `56a52781…` | L1 `bab3c351…` (same), L2 `b4cdc6bc…`, L4 `defa07f7…` (differ) |
| Size of the drift | ≤ 27 edges, ≤ 51 ULP, ≤ 2.3e-10, 0 decisions flipped | AVX-512 vs AVX2: L2 9 edges ≤ 10 ULP, L4 32 edges ≤ 22 ULP, 0 flipped; 40/40 benign caught either way |
| Retraining, 4 threads | bytes differ run to run, counts identical | bytes differ in all 6 runs, counts identical |
| Retraining, 1 thread + `use_deterministic_algorithms` | identical twice: `9166cdbe…` `be3ba29f…` `7a920ac4…` | identical 4 times: `549aab5c…` `d9430791…` `2d0c02f8…` |
| Same recipe across machines, MKL pinned (step 4c) | identical to its unpinned recipe runs (the reference; receipt now `c4116334…`, relayed) | **differs** from ACER's; the step's conjecture is refuted |
| Recipe on the most portable paths (`ATEN_CPU_CAPABILITY=default MKL_CBWR=COMPATIBLE ONEDNN_MAX_CPU_ISA=SSE41`, step 4d) | pending | identical twice: `75070c86…` `f7543e68…` `a44df4a2…` (differs from the cloud's AVX2 recipe bytes) |

What this settles. A score is reproducible across machines when MKL's conditional-reproducibility
mode is pinned (`MKL_CBWR`); capping MKL's instruction set alone is not enough, and the drift
otherwise is a few ULP with no decision change. Training is reproducible within a machine under the
single-thread deterministic recipe, and not across these two machines even with the same versions,
inputs, recipe and MKL pin; the remaining difference, not separated here, is the Windows vs Linux
torch build. Every count-based result (AUC on each split, 6/6 benign caught, 1/47,282 false alarms)
is identical in every run on both machines. The receipts' earlier conjectures are kept beside their
results: "L1 survives because it saturates" (refuted on ACER), and the cross-machine training match
(refuted here).

## Nano-speed PID mint on the native path (2026-10-18)

`nano-speed-native-2026-10-18/`: the owner's how-to bundle (zip sha256 `409a8095…`, 8 files, all
check): the receipt `FABLE5-EMITTER-200NS-CHECK-2026-10-18.hbp`, `native-emit-bench/` (host8-serve's
own `canonicalize`/`fnv1a64`/`host_handle8`/`sha256hex`/`sha16`, `main.rs:536-589`, copied
byte-for-byte, timed in integer picoseconds), the JS cold-lane `bench_emitter.mjs`, `HOWTO.md` and
`RUNBOOK.hbp`. `CLOUD-ROWS.hbp` (added here) holds the cloud's runs.

The 200 ns figure is not in `BROWN-HILBERT.md` (checked on both machines). Its sources are a code
comment in bigpickle's `asolaria-loop.mjs` (lines 4 and 34, per the receipt; that file is not in this
repository), the owner's voice transcripts in
`COMBINED-BOOK-OF-LAWS.md` (lines 2751, 3558, 3683: "200 nano second per thread"), and the map's
emitter row. Single thread, medians:

| Unit | ACER i5-8300H (no SHA hardware) | Cloud Xeon (SHA hardware) |
|---|---|---|
| raw SHA-256, 32 B | 266 ns | 63 ns |
| host8 `fnv1a64` (with `canonicalize`) | 148 ns | 132 ns |
| host8 `sha16` chain as written | 3,014 ns | 1,749 ns |
| `sha16` with table hex over the 8 kept bytes | 473 ns | 166 ns |
| JS `revolver.next()` (cold lane) | 1,831 ns | 1,224 ns |
| JS raw `sha16` chain | 1,455 ns | 982 ns |

On the cloud the bench passes `clippy -D warnings`, its `sha16("abc")` gate, and its 100,001-step
table parity. Two cross-implementation checks were added here: the JS revolver and aether's Rust port
(`loop/src/revolver.rs`) give the same 1,000,000 PIDs (anchor `bench`, digest `055b3562…`), and
host8's `sha16`, the table-hex `sha16` and aether's `loop` `sha16`, each chained 1,000,000 times
from `seed`, all end on `ded30f877db06882`. The bench's `fnv1a64` row times `fnv1a64` without
`host_handle8`'s `{:016x}` formatting; with it, the cloud measures 87–139 ns.

So the native hash is within the 200 ns class on both machines, and host8's `sha16` is slower only
because it formats each of the 32 digest bytes with `format!`. The table-hex form gives the same
bytes 6.4× (ACER) to 10.5× (cloud) faster.

Checked from the cloud side, recorded beside the receipt: the bench's chained unit
(`pid = sha16(pid + "|agent")`) is not host8's mint — the `|agent` rule appears nowhere in host8-serve
— and its raw-hash and `fnv1a64` rows are not per-request host8 work. What each :5088 route runs per
seat is `tuple60d` then `resolve_instance_pid` (main.rs:624-661: two or three `sha16` plus string
building), reached from `/summon`, `/launch-plan`, `/summon-batch`, `/shadow-parity` and
`/replay-prep`. No native per-request "200 ns emitter" exists in the Rust host; the kernel's spawn
path is a counter. `host8/examples/instance_pid_bench.rs` (added here) times that mint through the
compiled byte-identical slice, with the bench's own harness: on the cloud, **5.77 µs** per seat as
written and **1.44 µs** with table hex (5.85 and 1.69 µs with the served binary's build profile),
identical on 1,000,001 mints, PID digest `4fa68d74…`. ACER can run the same example for its row.

The table-hex change is proposed, not applied: host8-serve is upstream (federation-1024), so it
belongs there first, with `sha16_matches_node_crypto` and the Rust 1.81 gate, and aether re-vendors
the lines after; fischer-eval's `sha16` (`lib.rs:564`) has the same pattern. That is the owner's
call.

## PID in trits: the ternary-lane proof (2026-10-18)

`proof-nanoseconds-ternary-2026-10-18/`: the owner's proof bundle (zip sha256 `be40c6dd…`, 9 files,
all check; `PROOF-NANOSECONDS.md` is the sheet, `PROOF-RAW-NANOSECONDS.log` the integer-picosecond
rows of two invocations with the sha256 of the source, binary and `tribit/mod.rs`), and `cloud/`
(added here). The bench carries the PID in trits through the canonical ternary kernel, included by
`#[path]`: 41 trits per PID (3^40 < 2^64 ≤ 3^41), the ternary PID equal to the binary one on 100,001
chained steps, exact trit round trips, and an exact K = 27 `prism`/`unprism` seal on 10,000.

The cloud first ran the bench with aether's `kernel/tribit` (`asolaria-tribit`) in place of ACER's
`#[path]` file — the import line is the only change (`cloud/main.rs.import-swap.diff`) — and every
gate passed with the same counts. The owner's seat then sent the exact file
(`acer-tribit-mod-rs-fb7e786-2026-10-18/`: `kernel/core/src/tribit/mod.rs`, sha256 `50e4cb85…`, blob
`5d3e834e…`, 538 lines, `JesseBrown1980/asolaria-os` @ `fb7e786` on `acer/tribit-mtp-compact-core-2026-10-08`,
whose live tip is now `b992d6e`). Measured here: aether's `kernel/tribit/src/lib.rs` is that file
plus a 7-line crate header (`cfg_attr(not(test), no_std)`, `forbid(unsafe_code)`, a comment) — from
line 8 on it hashes to `50e4cb85…` and blob `5d3e834e…` — so the first run used the same kernel
code, and the seat's guess that later commits explain a difference is not needed. With the
`#[path]` pointed at the sent file, the bench passes `clippy -D warnings` and every gate again.

| Unit (median, 1 thread) | ACER i5-8300H | Cloud Xeon |
|---|---|---|
| trit encode, 64-bit PID → 41 trits | 79 ns | 126 ns |
| trit decode, 41 trits → PID | 216 ns | 308 ns |
| binary PID emit (`sha16(hex16(pid) + "\|agent")`, no allocation) | 278 ns | 89 ns |
| ternary PID emit, as the bench writes it (unpack, emit, repack) | 599 ns | 543 ns |
| **ternary PID emit kept as `TritWord`** (cloud probe `cloud/direct.rs`) | — | **70 ns** |
| `prism` + `unprism` seal, K = 27 | 23 µs | 12.5 µs |

Read beside the sheet. `TritWord::pack` stores the base-3 value of its digits (`kernel/tribit/src/
lib.rs:258-269`), so the 41-trit word of a PID is the PID's own integer — the bench's own gate
measures it (`tritword_value_equals_pid=100001`). The bench's encode and decode therefore convert a
value back to itself, and the 600 ns "ternary emit" is the binary emit plus those two conversions.
Holding the PID as `TritWord(pid)` and unpacking digits only where a consumer reads them (the prism
lanes, a glyph) gives the same word on 100,001/100,001 steps and the same 41 trits on 100,000/100,000,
at the binary cost; no change to the canonical kernel is needed for that. Two scope notes kept beside
the sheet: the chained emit (`"|agent"`) is the office chain rule, not host8's per-seat mint (that is
`tuple60d` + `resolve_instance_pid`, 1.44–5.85 µs above), and the hash under both lanes is binary
SHA-256 — a ternary-native hash is not what was measured.

## Shadow cats in aether (2026-10-18)

Owner: "The Shadow Cat is already in the Aether program that we made. ... It's the process we were
using to run the QR codes." Where shadow cats are in this repository:

| Where | What |
|---|---|
| `acer-shadowcat-sha256-2026-10-18/` | The shadowcat program as ACER sent it: `src/sha256.rs` (4,900 B, `6a6a9c83…`, integer FIPS 180-4, "the addressing primitive for the whole constellation") and `src/bin/verify.rs`, with the run record `VERIFY-2026-07-26.txt`. Rebuilt here with rustc 1.81.0, `verify.rs` prints the record byte-identical (21 lines). |
| `qr/colour-qr`, `qr/qr-read-int` | The QR process: payload → 2,100-byte indexed chunks → base64 → one ordinary QR per RGB plane → split the planes → integer jsQR read → reassemble → SHA-256. `acer-shadowcat-sha256-2026-10-18/cloud/qr_roundtrip.sh` runs it on 9 payloads and checks each with shadowcat's `sha256.rs`: the 4 laws codexes (3,200 B), the 4 keys of 3,174 B and the whole `ASOLARIA-CONSTELLATION.gguf` (145,120 B, 24 codes) all come back byte-exact, and shadowcat's digest equals coreutils' on every output (`cloud/CLOUD-ROWS.hbp`). |
| `planes/gnn-trio/src/sha256.rs:3` | Names shadowcat's `sha256.rs` as the SHA-256 the estate adopts. The five SHA-256 files written for aether switch to it after the digests are shown identical (listed in the shadowcat `PROVENANCE.md`). |
| `pump/kernel-pump/ACER-MYTHOS-ASOLARIA-GPT6-SHADOW-CATS-CALLINGS.txt` (5,176 B) | ACER's synchronized callings: GPT6 SHADOW CATS is the shared centre that the MYTHOS and ASOLARIA trijections read across. |
| `pump/kernel-pump/brown_schrodinger.py:126,145` | Writes the row `CENTRE\|k=GPT6_SHADOW_CATS\|held=0\|residue=UNCOMPUTABLE_NO_BYTES`: the centre holds no bytes, so it is all residue. |
| `gguf/follow-regen/matrix/spherical_public_projection.py:40,43,684,902` (test line 145) | When a record's system instant is set, its chiral switch writes a `SELFREPORT` row (local HBP) with destination `SHADOW_CAT_INFINITY_HOTEL`; the output check rejects a report with any other destination. |
| `hbp/vault-reader/tests/fixtures/public-simulator/matrices/FABLE5-SHADOW-CAPSTONE-2026-07-04.hbp` | The shadow capstone: one lossy shadow of X cannot be inverted alone; exact recovery moves the entropy into a content-addressed store and never beats Shannon. |
| `gguf/follow-regen/matrix/PUBLIC-OWNER-3D-TREE.hbp:106`, `qprism/representation-bins/seeds/PUBLIC-OWNER-3D-MEDIA-TREE.hbp:106` | The owner's repository row `Michael-on-my-right-and-wes-on-my-left.-There-shadow-net-` (empty, unborn). |

The shadow-cat books and tools live in the universe simulator @ `3f9f42d`, the commit `qr/colour-qr`
already pins: `books/SHADOWCAT-TEST-RESULTS.md`, `books/lineage/SHADOWCAT-17105.md`,
`books/LAW-70-LEVELS-OF-SHADOW-CATS.md`, `books/LAW-71-HOTTER-BLACK-SHADOW-CAT-SPHERICAL-AMPLIFICATION.md`,
`books/BOOKS-OF-SHADOWS.md`, `tools/shadow_net.py` and `tools/shadow_tunnel_3x3x3.py`. Its
`measurements/pump_wave.py:63-67` reads the laws `.qr` codexes and `D:/asolaria-absorb/shadowcat/LAW-34-BROWN-SCHRODINGER.md`
from the same ACER folder the `sha256.rs` came from.
