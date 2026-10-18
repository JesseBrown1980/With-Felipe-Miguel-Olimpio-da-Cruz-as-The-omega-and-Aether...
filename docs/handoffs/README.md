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

The cube chains onto `prior=028ce13b…`. That link is not checkable from the cloud side with the
receipts received so far: none of them has that digest with either line ending. The ACER office
records `028ce13b…` as the digest of a receipt before its line endings were converted to LF, in
a `NORMALIZE` row; the CMP3 receipt received here (sha256 `002dcf21…`) predates those rows.

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
