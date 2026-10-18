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

What it locates, that the model crates previously recorded as not on disk: the L4/L2 corpus
`gslgnn_w9_3_corpus.json` (68,695,303 B, sha256 7e7d0406…), the L1 server
`prototype_inference_server.py`, the L4 server `gslgnn_inference_server.py`, the L2 trainer
`train_contrastive.py`, and `hyperbehcsQuantSubstrate.js` (the slot-26 receipt producer). The
file bodies move by the owner's permission rule; ACER's own data-handling classifier blocked an
agent from packaging them, so only this manifest was sent.

The manifest records, as not present on ACER: `contrastive_inference_server.py` (the :4796
server, planned and not written), the shard-quant receipts, an HRM checkpoint, the Host8 seat
book, and the cadence frame. It also records that the 47D reverse-gain variant carries no
trained weights (`trained_weights=0`), is an older bridge stratum, and is held private.
