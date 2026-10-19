# qprism-3d-slice-harness

**The living 3D Q-PRISM slice harness.** Pure Rust, zero deps, HBI/HBP `json=0`, 8-byte host. No JSON, no Node.

Every frozen slice carries **multiple watched, addressable, lossless representation wavelengths** — the 7-step rung:

1. **Input** a frozen slice.
2. **Split** into representation wavelengths: `binary` / `hex` / `sha` / `HBI-HBP` / `BEHCS-64` / `BEHCS-256` / `BEHCS-1024` / `HyperBEHCS(60D)`. Seven are bijective (byte-recoverable); `sha` is a shadow/address (Path-1 territory).
3. **Project** into a PID-specific 60D Brown-Hilbert coordinate + N prime-cylinder shadows.
4. **MTP-1/2/3** visual PID supervisors each observe one pole of the geospatial shadow.
5. **Omnishannon + GNN + reverse-GNN** watch every edge: the Shannon watcher verifies each lossless lane is byte-identical (`H(f(X))=H(X)`, code-rate 1.0) or a declared shadow — **no lane may silently lose bits**. (GNN / reverse-GNN = DESIGN scaffold.)
6. **Recombine** through the DBBH / Path-2 consent lanes: recover from the cloned cylinder shadows, any sufficient subset, **no store**.
7. **Prove byte-identical recovery or HOLD.**

## Honest boundary
- `MEASURED`: the 7 lossless wavelength round-trips, the Shannon edge-watch, the multi-cylinder no-store recombine, the byte-identical proof (`cargo test`, 5/5).
- `DESIGN`: the GNN + reverse-GNN edge watchers (scaffold, tagged).
- `BOUNDARY`: no JSON, no Node. **"clone" = representation / wavelength branch copies** (classical, freely + losslessly copyable), **NOT physical quantum cloning** — nothing violates the no-cloning theorem; no claim of physical quantum state copying. Shannon holds at every edge.

## The arc
The living form of the shadow-resolution capstone: the papers proved the shadow wall; the capstone found recovery (not inversion); **Path 1** (`dbbh-coms-quant-prism`) = recall from a store; **Path 2** (`path2-two-shadow-recovery`) = two shadows, no store; **this harness** = every slice as a 3D field of watched, addressable, lossless wavelengths + cloned cylinder shadows, recombined by consent.

## License
MIT OR Apache-2.0.
