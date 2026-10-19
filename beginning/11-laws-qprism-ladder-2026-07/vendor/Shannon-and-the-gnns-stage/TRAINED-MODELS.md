# Trained models for this stage

The GNNs/FNNs scored in this pipeline are **trained** and published at:
**JesseBrown1980/Asolaria-fnns-trained-and-reverse-gnns-many**

- **7-GNN ensemble (8 signals):** L0 EdgeLevelGNN (91.87%), L4 GSLGNN (seq47_v2 test_acc 0.9992,
  recall 1.0, f1 0.9996), G1 edge-mining, G2 forward-genius, G3 reverse-gain, G4 GLSM, OmniShannon, sha.
- **trained `.pt` checkpoints:** GSLGNN seq47 v1/v2, L1 prototype, L2 contrastive, baseline FNN heads.
- **reverse-GNNs (many):** in-process G3 + the 47D deep-wave variant.

This repo (`README.md`) is the *pipeline*; that repo is the *trained weights + model code + manifests*.
Part of the chain: emitter → dispatcher → fleet (`Asolaria-hermes-work` / `THE-CHAIN.md`).
