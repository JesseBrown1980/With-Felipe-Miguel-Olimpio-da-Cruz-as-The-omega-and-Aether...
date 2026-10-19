# qprism-3d-slice-harness

**The living 3D Q-PRISM slice harness.** Pure Rust, zero deps, HBI/HBP `json=0`, 8-byte host. No JSON, no Node.

Every frozen slice carries **multiple watched, addressable, lossless representation wavelengths** — the 7-step rung:

1. **Input** a frozen slice.
2. **Split** into representation wavelengths: `binary` / `hex` / `sha` / `HBI-HBP` / `BEHCS-64` / `BEHCS-256` / `BEHCS-1024` / `HyperBEHCS(60D)`. Seven are bijective and byte-recoverable; `sha` is a declared shadow/address.
3. **Project** into a PID-specific 60D/N-D Brown-Hilbert selector plus coprime-cylinder shadows.
4. **MTP-1/2/3** visual PID supervisors each observe one pole of the geospatial shadow.
5. **OmniShannon** verifies every declared lossless lane byte-identically (`H(f(X))=H(X)`, code rate 1.0) or labels it a declared shadow. The GNN/reverse-GNN fields remain explicitly tagged integration scaffolds in this crate.
6. **Recombine** through the DBBH / Path-2 consent lanes: recover from a jointly sufficient cylinder subset with **no object store**.
7. **Prove byte-identical recovery or HOLD.**

## 2026-07-11 integration status

The dedicated recovery crates now make the two paths explicit:

- [`dbbh-coms-quant-prism`](https://github.com/JesseBrown1980/dbbh-coms-quant-prism) — **Path 1**, retained-store recall through a small authenticated address.
- [`path2-two-shadow-recovery`](https://github.com/JesseBrown1980/path2-two-shadow-recovery) — **Path 2**, exact no-store CRT recovery plus DBBH→DBWH re-projection of SHA, cylinder shadows, and frequency shells before emission.

See [`docs/WATCHER-AND-PATH2-STATUS-2026-07-11.md`](docs/WATCHER-AND-PATH2-STATUS-2026-07-11.md) for the complete status and provenance ledger.

## Verification

- `AUDITED_GPT_5_6_PRO`: GPT-5.6 Pro read all 809 current source lines, the complete test surface, and the Path-1/Path-2/GNN/white-room/dispatcher/N-Nest lineage.
- The GPT sandbox had no Rust toolchain and no outbound DNS, so it does not falsely claim a local cargo execution.
- `CI_GPT_DIRECTED`: `.github/workflows/rust-1.97-independent-verification.yml` installs Rust 1.97.0, enumerates the test surface, runs every target, and uploads the receipt.
- The operator-supplied Claude Fable 5 third-seat results apply to the two dedicated recovery crates: Path 1 **19/19** and Path 2 **30/30** under rustc 1.97. They are not misattributed as this crate's run.

## Storage-backed / non-GPU applicability

The representation and recovery plane runs on CPU-and-storage-oriented machines. SHA/Host8,
BEHCS rebasing, CRT, OmniShannon byte checks, MTP records, and HBP/HBI receipts require no GPU.
HDD/SSD can retain cube bodies, shadows, receipts, queues, and cold state while RAM holds only the
active slice/window.

This does not claim that disk replaces an accelerator for trained neural inference. The separate
GNN/LLM sidecars may still use CPU/GPU hardware; the exact representation, recovery, routing, and
proof substrate remains independently useful without one.

## Honest boundary

- `MEASURED`: the seven lossless wavelength round-trips, declared SHA shadow, OmniShannon edge-watch, multi-cylinder no-store recombine, 60D/N-D selectors, and byte-identical proof-or-Held behavior.
- `DESIGN`: trained GNN + reverse-GNN inference inside this crate. The fields record intended edge roles; no checkpoint is loaded here.
- `BOUNDARY`: no JSON, no Node. **“Clone” means classical representation/wavelength branch copies**, not physical quantum cloning. Shannon holds at every edge.
- `UNVERIFIED`: live Hilbra cross-machine traversal, physical quantum transport, and hardware-enforced one-use classical shares.

## The arc

The living form of the shadow-resolution capstone: the papers proved the single-shadow wall; Path 1
recalls a retained object; Path 2 reconstructs an unretained object from jointly sufficient shadows;
this harness represents each slice as a watched 3D/N-D field of exact wavelengths and cylinder
shadows before recombination.

## License

MIT OR Apache-2.0.
