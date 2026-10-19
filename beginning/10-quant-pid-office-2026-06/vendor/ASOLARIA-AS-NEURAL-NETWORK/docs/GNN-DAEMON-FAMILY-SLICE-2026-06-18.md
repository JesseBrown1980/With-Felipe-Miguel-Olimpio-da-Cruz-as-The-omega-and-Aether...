# Asolaria-as-Neural-Network — GNN Daemon Family Slice (2026-06-18)

Slice of the daemon-layer census ([reductions canon `DAEMON-LAYER-CENSUS-2026-06-18.md`]) for the neural-network vantage: the GNN inference + drain daemons that carry the thought-read / verdict pipeline. Source: multi-modal sweep `wziyrbhq9` + MEASURED netstat. Sealed HBP `ACER-DAEMON-SUPERVISOR-REGISTRATION.hbp` (commit `15848d6`). Read-only, **E=0**.

## GNN family (7 daemons, port→room bound)

| Daemon | Port | Room | Status |
|---|---|---|---|
| **gnn-dispatch-bridge** | loop (no port) | name-handle | **LIVE-MEASURED** PID1636 (feeds T3-halt + fabric-verdict) |
| gnn-sidecar L0 EdgeLevelGNN | 4792 | MK-04792 `d490179b…` | DARK (serve_forever, no PID) |
| gnn-sidecar L1 PrototypeGNN | 4795 | MK-04795 | DARK |
| gnn-sidecar L4 GSLGNN | 4793 | MK-04793 `97d290c8…` | DARK |
| research gnn inference (L0 copy) | 4792 | MK-04792 (collision) | DARK |
| hyperbehcs-gnn-drain | 4920 | MK-04920 | DARK |
| hyperbehcs-whiteroom/indexer/50d-vec drains | 4921/4922/- | MK-0492x | DARK |

Plus **`frozen-gemma-adapter` :4925** (DARK) — the frozen-Gemma inference adapter, the local model the manifold-steering / thought-read lane watches. (Per `reference_manifold_steering_paper_thought_geometry_source`, the paper→cube→GNN wiring remains an UNVERIFIED build gap; this records the daemon that would serve it.)

## Honest read

Only **gnn-dispatch-bridge is LIVE** (a watch-loop, no socket — MEASURED via CommandLine). The inference sidecars L0/L1/L4 (`:4792/:4795/:4793`) are **DARK** this scan (source verified, no listener) — the 91.87%→99.91% L0→L4 ladder is CANON architecture, not a live tick right now. Not deflated (source exists), not inflated (no live PID). Each is bound to its port-room so the Rust 8-byte host can serve it with parity before the python tenant retires. No model weights / secret VALUES read (carve-out).
