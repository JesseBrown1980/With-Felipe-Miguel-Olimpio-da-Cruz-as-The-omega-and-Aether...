# acer/ — files transferred from the owner's ACER seat

Bodies of files that live on the owner's ACER machine, transferred to this repository and kept
byte-identical. Each sits under the path it has on ACER, with the drive and user prefix dropped:

| Here | On ACER |
|---|---|
| `acer/Asolaria/...` | `C:/Users/acer/Asolaria/...` |
| `acer/HyperBEHCS/...` | `C:/HyperBEHCS/...` |

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
