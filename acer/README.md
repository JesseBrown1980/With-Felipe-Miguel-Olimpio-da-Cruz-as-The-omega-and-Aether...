# acer/ — files transferred from the owner's ACER seat

Bodies of files that live on the owner's ACER machine, transferred to this repository and kept
byte-identical. Each sits under the path it has on ACER: the two home folders drop the drive and
user prefix, and every other folder keeps its drive letter as the first directory:

| Here | On ACER |
|---|---|
| `acer/Asolaria/...` | `C:/Users/acer/Asolaria/...` |
| `acer/HyperBEHCS/...` | `C:/HyperBEHCS/...` |
| `acer/C/<dir>/...` | `C:/<dir>/...` (any other folder on C:) |
| `acer/D/<dir>/...` | `D:/<dir>/...` |

`UPSTREAM.sha256` pins every file; from this directory, `sha256sum -c UPSTREAM.sha256` checks them.
Nothing here is built or run by the crates' hot lane; crates and referees read what they need from
here and say so in their own PROVENANCE.

## Cube `9859b576855a7bf8` (2026-10-18): the GNN sidecar, the vote-quorum ledgers, the quant substrate

The office cube `docs/handoffs/FABLE5-HANDOFF-GNN-SIDECAR-LEDGERS-2026-10-18.hbp` pinned 32 files on
ACER by path, size and sha256. The owner's seat sent their bodies in four zips; every body here
matches its cube pin in both size and sha256 (32/32). The zips' own manifests and checksums are in
`docs/handoffs/cube-9859b576-transfer-2026-10-18/`.

| Zip | Files | sha256 of the zip |
|---|---|---|
| `FABLE5-GNN-SIDECAR-CHECKPOINTS-cube9859b576-2026-10-18.zip` | 11 | `b14cae25…` |
| `FABLE5-GNN-SIDECAR-CODE-cube9859b576-2026-10-18.zip` | 14 | `f3173500…` |
| `FABLE5-GNN-SIDECAR-CORPUS-cube9859b576-2026-10-18.zip` | 1 | `183b58a0…` |
| `FABLE5-GNN-SIDECAR-LEDGERS-cube9859b576-2026-10-18.zip` | 6 | `dd594061…` |

What arrived:

- `Asolaria/services/gnn-sidecar/` (26): the trained checkpoints — `baseline_model.pt` (L0),
  `prototype_model.pt` with runs 2 and 3 (L1), `contrastive_model.pt` with runs 2 and 3 (L2),
  `gslgnn_w9_3_seq47.pt` and `_v2.pt` with their manifests (L4); the servers `inference_server.py`
  (:4792), `prototype_inference_server.py` (:4795), `gslgnn_inference_server.py` (:4793) and
  `start_inference.sh`; the trainers `train_baseline.py`, `train_prototype.py`,
  `train_contrastive.py`, `train_gslgnn_w9_3.py`; `models/` (the four model definitions, `schemas.py`,
  `__init__.py`); and the corpus `gslgnn_w9_3_corpus.json` (68,695,303 B; 109 nodes, 315,249 edges).
- `HyperBEHCS/data/vote-quorum/` (3): `queue.ndjson`, `votes.ndjson`, `outcomes.ndjson`.
- `HyperBEHCS/data/catalogs/verbs.hbp` (1).
- `Asolaria/src/behcs/` (2): `hyperbehcsQuantSubstrate.js` (the slot-26 receipt producer) and
  `hyperbehcsTripleQuantFastPacketConsumer.js`.

Run 3 of L1 and of L2 is byte-identical to run 1 (same sha256), so 32 files are 30 distinct bodies.
Nine of the 30 were already in this repository byte-identical, vendored by the model crates from
the owner's repositories (the served checkpoints of L0/L1/L2/L4, the L4 server, and four model
files); those copies stay where they are. ACER's `models/prototype_gnn.py` differs from the copy
`model/l1-prototype` vendors from behcs-256 @ `818cc235`: it adds one method,
`get_edge_embeddings_from_nodes` (a mini-batch variant), and drops one trailing space; the forward
that crate ports is the same in both.

Scanned before commit: no keys, tokens or passwords; no e-mail addresses or public IP addresses; the
corpus node ids are component names (`gaia-catalogs`, `identity`, `phase1::tensor-fabric…::immune`).

## P5 (2026-10-18): the gnn-dispatch-bridge

The owner's seat sent `Asolaria/tools/behcs/gnn-dispatch-bridge.mjs` (22,903 B, sha256 `21e06399…`)
with its predictions ledger in one zip (sha256 `45da19b0…`, CUBE merkle `69ccbe09…`); both bodies
match the zip's `SHA256SUMS` (2/2). The bridge is here byte-identical and pinned in `UPSTREAM.sha256`;
`host8` ports its three pure functions and reproduces the P4 golden rows from it (`host8/README.md`,
`host8/PROVENANCE.md`). The ledger, `Asolaria/data/behcs/gnn-predictions.ndjson` (3,046,232 B, sha256
`70541242…`), is here byte-identical and pinned too. It carries a personal name that is not on the
owner's operator list; asked, the owner answered "Publish as-is" (2026-10-18).

Scanned before commit: no keys, tokens or passwords; no e-mail addresses, phone numbers or personal
names; the one IP address is loopback `127.0.0.1`.

## Item 5B (2026-10-18): the host8 seat book's sources

The owner's seat sent the PID Registration Office's two folders in one zip (sha256 `a7b2f019…`, CUBE
merkle `aefb7780…`); all 3,698 bodies match the zip's `SHA256SUMS` (3,698/3,698). The delivery, as
received, is the item-5B folder under `docs/handoffs/acer-post60d-2026-10-18/`.

- `D/PID-Registration-Office/registered/` (3,692; 3,665,612 B) = `D:/PID-Registration-Office/registered`:
  764 `.hbp`, 724 `.hbi`, 722 `.hex`, 722 `.ing`, 759 `.sha256`, 1 `.txt`.
- `D/PID-Registration-Office/fabric-feed/` (6; 352,632 B) = `D:/PID-Registration-Office/fabric-feed`:
  three feeds (supervisors 2026-06-10, district-f formula 2026-06-20, cross-host comms 2026-06-21),
  each with its `.sha256`.

Held, not here: the five files of the reverse-gain seat registration (`sup-gnn-reverse-gain-04f694de*`),
under rule 7.j. They are not in the delivery either.

## Item 7 (2026-10-18): the 60D chain

One zip (sha256 `242e8996…`, CUBE merkle `4440ff74…`); 26/26 bodies match its `SHA256SUMS`. 25 are
here (393,597 B); the 26th, `ITEM7-STATUS.hbp`, is the seat's status sheet and stays with the
delivery (the item-7 folder under `docs/handoffs/acer-post60d-2026-10-18/`).

- `HyperBEHCS/store/` (19; 348,188 B) = `C:/HyperBEHCS/store`: the atlas set. `atlas-canonical-1024`,
  `atlas-canonical-1024-quant-extended` and `atlas-index-1024` (each `.hbp`, `.hbi`, `.hbp.sha256`);
  `atlas-blocks-1024` (`.hbp`, `.hbi`, `.hbp.sha256`, `.v2.hbp`, `.v2.hbp.sha256`); the v50-G
  ceremony manifest of 2026-05-24 (`.hbp`, `.hbi`, `.hbp.sha256`, `.hex`); and
  `cascade-atlas-mapping-2026-05-17.hbp`.
- `Asolaria/data/omni-processor/hilbert-omni-24D.json` (7,099 B, `c31e8405…`). ACER holds three
  identical copies (status row `FOUND`); this is one of them. The other two, not repeated here, are
  `C:/Users/acer/Asolaria/sovereignty/incoming/liris-crosspollination-20260409T1547/hilbert-omni-24D.json`
  and `C:/Users/acer/Asolaria/sovereignty/ix/grammar/hilbert-omni-24D.json`.
- `C/asolaria-foundation-v1/00-IMMUTABLE-FOUNDATION-v2.md` and `02-PORT-NAMESPACE-CANON.md`
  = `C:/asolaria-foundation-v1`. That folder on ACER holds 00, 00-v2, 01 and 02 only.
- `D/asolaria-100B-new-run-2026-06-15/extract-to-cube.mjs` = `D:/asolaria-100B-new-run-2026-06-15`.

The seat did not record where the two kernel files live. Their paths below come from evidence:

- `D/bigpickle-rebuild/src/gaia-loader.mjs` (16,547 B). Its body is git blob `703cb8e2…`, which is
  `src/gaia-loader.mjs` in the public `JesseBrown1980/bigpickle-rebuild`, added on ACER's branch
  `acer/gaia-loader-summon-2026-06-19` (commit `2a45d54c…`). It imports `./room-dispatcher.mjs`
  and `./free-agent-receipt.mjs` from that `src/`, and it defaults its summon root to
  `D:/bigpickle-rebuild/gaia-summon-rooms`. The seat book's formula rows give that checkout as
  `/d/bigpickle-rebuild/src`.
- `C/asolaria-acer/packages/dashboard/src/super-os-viz/behcs1024-language-kernel.mjs` (2,144 B). The
  public Asolaria repository gives this module's ACER path as `kernel_module_path_acer` in
  `tools/behcs/super-os/super-dashboard-server.mjs` (ref `liris/dashboard-fanin-timeout-2026-07-02`,
  commit `0a6c6da9…`). The sibling `packages/dashboard/src/super-os-viz/super-dashboard-server.mjs`
  (commit `ee641af…`) imports two of this file's four exports, `BEHCS1024_PLANES` and
  `encodeBehcs1024Digit`, from `./behcs1024-language-kernel.mjs`.

Not on ACER (status rows `TARGET`): atlas v55 and v56 by name, `growth-law.md`, `optimizer-math.md`,
and foundation 03 to 07. The names of D51 to D60 are still being searched.

## Item 8 (2026-10-18): the HyperBEHCS home and the quant family

One zip (sha256 `729a7ee3…`, CUBE merkle `732fdfbe…`); 177/177 bodies match its `SHA256SUMS`.
170 new files are here (3,026,577 B). Two more were already here, byte-identical. Four `.pyc` and
`ITEM8-STATUS.hbp` stay with the delivery (the item-8 folder under `docs/handoffs/acer-post60d-2026-10-18/`).

- `HyperBEHCS/` (153; 2,767,277 B) = `C:/HyperBEHCS`:
  - `README.md`, `AGENT.md` and `AGENT.hbp`.
  - `lib/`: 10 `.cjs`.
  - `bin/`: 135 files (54 `.py`, 30 `.mjs`, 22 `.html`, 9 `.cjs`, 6 `.ps1`, 6 `.md`, 4 `.js`, 4 `.cmd`).
  - `store/100-pid-roster-W113`: `.cold.json`, `.hbi`, `.hbp`, `.hex` and `.sha256`.

  The four `bin/__pycache__/*.cpython-313.pyc` (the cosign-chain, dual-emit-gate and
  ghost-envelope-gc daemons, and `cpu_flash_attn_shim`) are compiled caches. This repository ignores
  them, so they stay in the delivery folder only.
- The quant family (19 files) lives under `C:/Users/acer/Asolaria`:
  - Already here, byte-identical, so not copied again: `src/behcs/hyperbehcsQuantSubstrate.js` and
    `src/behcs/hyperbehcsTripleQuantFastPacketConsumer.js`. Cube `9859b576` pins both at
    `C:/Users/acer/Asolaria/src/behcs/`.
  - New (17; 259,300 B):
    - `Asolaria/src/behcs/hyperbehcsRepresentationAlgorithms.js`.
    - `Asolaria/tools/behcs/hyperbehcs-multiwidth-symbol-selector.mjs` and
      `hyperbehcs-triple-quant-acer-physical-benchmark.mjs`.
    - `Asolaria/tests/`: two `.unit.test.js`.
    - `Asolaria/reports/`: two `-latest.md`.
    - `Asolaria/data/behcs/representation/hyperbehcs-triple-quant-acer-physical-benchmark-20260515/` (5).
    - `Asolaria/data/behcs/multiwidth-symbol-selector/hyperbehcs-multiwidth-symbol-selector-20260517/` (5).

  The seat sent these as `quant/{src,tools,tests,reports,data}`, with the two data folders renamed
  `triple-quant-benchmark-20260515` and `multiwidth-20260517`. The seat did not record their ACER
  paths, so they were derived from the files themselves:
  - Both tools resolve their root two folders above themselves.
  - Both tests load them from `<root>/tools/behcs/`.
  - The tools' output constants name the two data folders and the two reports.
  - The benchmark manifest records its readback probe at
    `data/behcs/representation/hyperbehcs-triple-quant-acer-physical-benchmark-20260515/`.
  - The substrate file under that same root is pinned at `C:/Users/acer/Asolaria`.

Held, not here (status rows `HELD`, round-2 row `STILL_HELD`):

- `bin/asolaria-vote-quorum-daemon.py` and its `.pyc`, under rule 7.j.
- `C:/Users/acer/Asolaria/data/gateway-auth-tokens.json` (411 B; it holds live role tokens). The seat
  listed it and never copied it. Rotate those tokens first.

Item 8 also held four more `bin/` files; the owner has since released them (next section).

## Released four (2026-10-18): rule 7.m

One zip (sha256 `e99d500d…`, CUBE merkle `b7ca5536…`); 4/4 bodies match its `SHA256SUMS`. All four
are in `HyperBEHCS/bin/` (29,062 B):

- `asolaria-google-enterprise-citizen-daemon.py` (5,260 B)
- `google-38tb-integration-readiness.md` (5,799 B)
- `v47-g-mint-and-fire.py` (6,800 B)
- `emit-catalogs-batch-3.mjs` (11,203 B)

Item 8 held them because three carry the owner's own Gmail address and one carries a GCP
service-account id. The owner released all four under rule 7.m (round-2 row `RELEASED`; the seat
found credentials in 0 of the 4).

Scanned before commit (all 3,897 new files): no private keys, API or cloud tokens, or passwords, and
no phone numbers. E-mail addresses appear only in the released four: the owner's own address
(4 times in 3 files) and one service-account id. Most IP addresses are loopback `127.0.0.1`, private
`192.168.1.x` or `10.0.0.0`, or `0.0.0.0`. The one other is in the shared `100.64.0.0/10` range, which
is not public.
