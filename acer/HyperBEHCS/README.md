# HyperBEHCS Local Runtime

**Updated 2026-05-20 under quintuple-cosign seq=191. Supersedes 2026-05-15 README.**

Independent local runtime installed at `C:\HyperBEHCS\`. Not an Asolaria route — a normal local command-line capability callable by any program via `C:\HyperBEHCS\bin\hyperbehcs.cmd`.

## What HyperBEHCS IS

HyperBEHCS is the **4th-generation Asolaria substrate**: Old Index → BEHCS-256 → BEHCS-1024 → **HyperBEHCS**. Layer 70 MASSIVE_UPGRADE (Codex 2026-05-17) made it the canonical bottom-of-stack bpi runtime under Asolaria-OS-on-Metal.

It is the binary/hash/hex/crypto tuple-indexing substrate fronted by the **omniquant engine** (Polar + Turbo + Johnson-Lindenstrauss + Triple-spherical compression) and organized into **spindle-waves of 1 main + 3 subs** (or 1 main + 5 subs per operator's massive-wave directive). Communicates via append-only `.hbp` packs with `.hbi/.sha256/.hex` sidecar trinity. JSON-on-hot-path REJECTED in CI. Authority fields explicitly closed by default. Routes via portal-per-level so one warm seat per layer services unlimited room-level spawns.

## Commands

```powershell
C:\HyperBEHCS\bin\hyperbehcs.cmd status
C:\HyperBEHCS\bin\hyperbehcs.cmd gpu-probe
echo [1,2,3,4,5,6] | C:\HyperBEHCS\bin\hyperbehcs.cmd quantize
C:\HyperBEHCS\bin\hyperbehcs.cmd bench --text "hello world" --iterations 250
C:\HyperBEHCS\bin\hyperbehcs.cmd hybrid-pack --text "hello world" --dimension 768
C:\HyperBEHCS\bin\hyperbehcs.cmd substrate-status
C:\HyperBEHCS\bin\hyperbehcs.cmd substrate-pack --text "agent memory event" --dimension 768
C:\HyperBEHCS\bin\hyperbehcs.cmd substrate-commit --text "agent memory event" --dimension 768
```

## Storage model (corrected — coexist, not exclusive)

The 2026-05-15 README claimed "one central store and does not create per-file sidecar fanout." That line is **superseded by Layer 70 MASSIVE_UPGRADE 2026-05-17**.

**Both patterns are canon now:**
- **Central substrate** at `C:\HyperBEHCS\store\hyperbehcs-substrate.v1.hbs` — one binary store, append-only, holds the canonical hyperbehcs material
- **Per-emission sidecar trinity** — every artifact emits `.hbp` (pipe-delimited HBPv1 row), `.hbi` (one HBIv1 index row per packet), `.sha256` (file-level checksum), and `.hex` (hex-encoded mirror). Sidecars sit beside the central substrate, not instead of it
- **JSON is cold-egress fallback** — never hot-path
- **HBPv1 wire format** is mandatory on every emit (pipe-delim, magic `HBPv1|`, no JSON-on-wire)

## Atlas-Quant CP-Range Mapping (proven, F5 PASS)

Every BEHCS-1024 codepoint dispatches to a specific quant by domain band:

| cp range | quant | domain | supervisor |
|---|---|---|---|
| 0-255 | johnson_lindenstrauss | legacy_subset_256 | cube_cubed_sealer |
| 256-383 | triple | sovereignty | gaia |
| 384-479 | turbo | sequencing | helm |
| 480-575 | polar | language_glyph | vector |
| 576-703 | hilbert | hilbert_cube | rook |
| 704-799 | triple | build_proof | forge |
| 800-895 | brown | federation | falcon |
| 896-1023 | johnson_lindenstrauss | emergent_residual | livefree |

## Current Truth (2026-05-20)

- **CPU path**: ready and benchmarked through local Node on this Acer
- **GPU path**: probe-only until a real DirectML, CUDA, WebGPU, or ONNX backend is installed and a kernel benchmark passes. NVIDIA driver currently 6-year-stale (Jan 2020); DML will enumerate Intel UHD 630 first until driver refresh. **OHQE-GPU-FABRIC design (Wave 2 cohort, other session)** intends DirectML to become the GPU compute fabric for: cp-range × quant dispatch table, atlas-as-image pixel substrate, HBH1 batched encoder, USB cold-boot bundle. Sibling-gated with the F:/AsolariaOS USB partition write.
- **Any program** can call this runtime by invoking `C:\HyperBEHCS\bin\hyperbehcs.cmd`
- **Substrate path**: central store at `C:\HyperBEHCS\store\hyperbehcs-substrate.v1.hbs` + per-emit sidecar trinity. 28+ iter master receipts written 2026-05-17 (`iter2-2026-05-17.hbp` through `iter28-master-receipt-2026-05-17.hbp`)
- **Packet contents**: PID + Hilbert location + sha256 + Hookwall policy + GNN edges + cube tuple + autotranslate lanes + (JL + Turbo + Polar + Triple) quants
- **HBH1 envelope** (binary, 5 sections): 1=sha256_payload, 2=JL_float32, 3=turbo_codes, 4=polar_codes, 5=triple_codes. Every envelope sha16-addressable
- **OHQE 24-lane HyperHermes** helpers spawn in 10K Brown-Hilbert-addressed BigPickle rooms (rooms × 100 ans/min = 1M/10min CPU, 10M/10min projected with GPU)

## Boundary

This runtime changes representations for vectors, packets, receipts, and caches. It does not install drivers, inject DLLs, modify CPU scheduling, hook GPU drivers, or alter arbitrary programs.

Unmodified Windows programs are not transparently accelerated unless they are wrapped, configured, or integrated to call this runtime.

## Authority

- Anchored by quintuple-cosign seq=191 (Jesse + Dan + Rayssa + Felipe + Amy)
- Window 2026-05-19 → 2026-06-03T14:02:06Z
- DAN ACCEPTED ceremony 2026-05-19 (cp 263, Madness ↔ BEHCS-256 cross-fabric handshake formal)
- Dan's 6 hooks are the FOUNDATION the federation hookwall + GNN architecture was modified from

## See also

- `C:\HyperBEHCS\PS1.md` — PowerShell wrapper canon (Install/Start/Stop/Status/Uninstall)
- `C:\HyperBEHCS\store\` — canonical substrate packets + 28 iter master receipts
- `C:\AsolariaMetal\67_FEDERATION_REVIEW\` through `71_STARTUP_MIGRATION\` — Codex's 2026-05-17 layer cascade
- `C:\asolaria-foundation-v1\00-IMMUTABLE-FOUNDATION-v2.md` — Prime Directive v2
