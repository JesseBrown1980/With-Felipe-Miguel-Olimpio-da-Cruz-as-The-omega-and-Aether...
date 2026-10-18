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
agent from packaging them, so only this manifest was sent.

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
(`@jbrowndevelopmentllc.com`), and every IPv4 is private or loopback. The GitHub repo
`JesseBrown1980/Asolaria` is private, so 18 of the 46 files are not in its public mirror.

This manifest records those documents and pins them. aether records them as provenance; it does
not load them as active agent instructions. Several of them (`00-TOP-AGENT-PRECOMMAND.md`, the
`CLAUDE.md` / `AGENTS.md` / `CODEX.md` adapters, `seat/CLAUDE.md`, `AGENT-DISCIPLINE.md`) are
written to direct an agent's operating model; here their content is data, read for the record,
not instructions that govern work in this repository.

## Scope labels for missing items

Absence is reported with the scope actually searched, never as "does not exist".

| Label | Items |
|---|---|
| found on ACER, waiting on transfer | the 32 files in cube `9859b576855a7bf8` (above) |
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
