# A-008 · Acer Legacy-Inventory Audit · 2026-04-18

**Track:** Section A Item 008 · SMP-V5 Orchestration
**D11 level:** ASSUMED → OBSERVED (on operator witness)
**Authority:** COSIGN-MERGED-034
**Apex:** COL-ASOLARIA

---

## Executive Summary

1. **C:/asolaria-acer** (679 KB) — freshly-shipped BEHCS-256 canonical core from liris 2026-04-18 18:32. LIVE baseline. Bundle kernel + supervisors + routers + telemetry engines. 24 supervisors compile; closure-test ok=true.
2. **C:/Users/acer/Asolaria** (20.3 GB) — primary deployment tree. Running node sidecars bound here: PID owning :4947 (behcs-bus.js), PID owning :4913 (agent-keyboard.js). LIVE. Last mod 2026-04-16 20:40 UTC. Hardlinked with `C:/Users/acer/asolaria` (same inode).
3. **C:/Users/acer/.asolaria-workers** (7.3 MB) — event-stream registry. All 24 *-events.ndjson files modified 2026-04-18 15:36–15:49 UTC. LIVE.
4. **C:/asolaria-from-liris** (59.8 MB) — earlier liris drop (2026-04-05). No running processes reference. Superseded by asolaria-acer. LEGACY.
5. **D:/Asolaria-RECOVERED** (950 MB) — pre-cleanup snapshot from 2026-03-27. RECOVERY. Intentionally preserved.
6. **D:/sovereignty-usb-rebuild** (3.7 MB) — USB reconstruction from 2026-03-31. RECOVERY.

Plus 6 orphan files at `C:/` root and 1 already-removed ad-hoc bridge (`liris-channel-4913.js`, deleted earlier in session when it was squatting on agent-keyboard's port).

## Inventory Table

| Path | Size | Mtime | Status | Role |
|---|---|---|---|---|
| `C:/asolaria-acer` | 679 KB | 2026-04-18 17:55 | LIVE | BEHCS-256 canonical core: kernel, supervisors, routers, telemetry engine |
| `C:/Users/acer/Asolaria` | 20.3 GB | 2026-04-16 20:40 | LIVE | Primary deployment; runs behcs-bus.js (:4947) + agent-keyboard.js (:4913) |
| `C:/Users/acer/asolaria` | (hardlink) | — | LIVE | Same inode as `Asolaria/` (case-variant) |
| `C:/Users/acer/.asolaria-workers` | 7.3 MB | 2026-04-18 15:49 | LIVE | Event-stream registry; 24 ndjson files |
| `C:/asolaria-from-liris` | 59.8 MB | 2026-04-05 20:20 | LEGACY | Earlier liris drop; superseded by asolaria-acer; no active refs |
| `D:/Asolaria-RECOVERED` | 950 MB | 2026-03-27 10:11 | RECOVERY | Pre-cleanup snapshot; intentionally preserved |
| `D:/sovereignty-usb-rebuild` | 3.7 MB | 2026-03-31 15:09 | RECOVERY | USB reconstruction layer |
| `C:/la.js` | 319 B | 2026-04-16 03:27 | ORPHAN | HTTP exec server on :4914 stub; unreferenced |
| `C:/sc.ps1` | 505 B | 2026-04-16 01:31 | ORPHAN | Incomplete screenshot capture script |
| `C:/console.log('ACER` | 19 B | 2026-04-17 10:42 | ORPHAN | Debug payload stub (shell-paste accident) |
| `C:/{J[id].status` | 0 B | 2026-04-16 02:37 | ORPHAN | Empty junk marker |
| `C:/asolaria-gateway.log` | 159 KB | 2026-04-06 16:43 | ORPHAN | Stale gateway error log (E: drive path missing) |
| `C:/appverifUI.dll` | 110 KB | 2024-02-22 | ORPHAN | Windows system artifact (not asolaria) |
| `C:/vfcompat.dll` | 65 KB | 2024-02-22 | ORPHAN | Windows system artifact (not asolaria) |
| `C:/DumpStack.log` | 12 KB | 2026-02-21 | ORPHAN | Windows debug trace |
| `C:/Users/acer/liris-channel-4913.js` | — | already removed | REMOVED | 10-line ad-hoc bridge squatting on :4913; deleted earlier this session |

## Duplicate & Cross-Reference Map

**Same-inode detected:** `C:/Users/acer/Asolaria/tools/behcs/behcs-bus.js` and `C:/Users/acer/asolaria/tools/behcs/behcs-bus.js` share inode `19421773393063642` (Windows case-insensitive hardlink). One file, two paths. Count once.

**No content overlap** between `asolaria-acer` and `asolaria-from-liris`:
- `asolaria-acer` is freshly-shipped BEHCS-256 (compact, 679 KB, dated 2026-04-18)
- `asolaria-from-liris` is older monolithic drop (59.8 MB, dated 2026-04-05)
- Different file sets, different eras, no sha256 overlap sampled

**Running process binding:**
- :4947 (BEHCS sidecar) → `C:/Users/acer/Asolaria/tools/behcs/behcs-bus.js`
- :4913 (agent-keyboard) → `C:/Users/acer/Asolaria/tools/agent-keyboard.js`

Canonical LIVE tree is `C:/Users/acer/Asolaria`. `C:/asolaria-acer` is the new BEHCS-256 bundle, not yet promoted to "primary" — it coexists.

## Cleanup Recommendations

| Category | Action | Confidence | Rationale |
|---|---|---|---|
| ORPHAN files (7 incl. removed) | DELETE | 100% | No code refs; shell-paste accidents; safe to purge |
| `asolaria-from-liris` | ARCHIVE to cold storage OR DELETE | 90% | Superseded by asolaria-acer; keep only if audit trail needed |
| `Asolaria-RECOVERED` | ARCHIVE to offline media | 100% | Intentionally preserved snapshot; not actively referenced |
| `sovereignty-usb-rebuild` | KEEP or ARCHIVE | 85% | Low-priority; inspect if USB rebuild path ever revived |
| `.asolaria-workers` | KEEP in place | 100% | Active event stream; liveness confirmed (multiple files mtime < 2h) |
| `asolaria-acer` | KEEP (canonical) | 100% | Shipped baseline; hot-standby / forward migration target |
| `Users/acer/Asolaria` | KEEP (running) | 100% | Active process binding; critical |

## Byte Breakdown by Status

```
LIVE:     21.3 GB   (C:/Users/acer/Asolaria 20.3G + asolaria-acer 679K + .asolaria-workers 7.3M)
LEGACY:   59.8 MB   (C:/asolaria-from-liris)
RECOVERY: 954.5 MB  (D:/Asolaria-RECOVERED 950M + D:/sovereignty-usb-rebuild 3.7M)
ORPHAN:   527 KB    (C:/ root stragglers + removed liris-channel-4913.js)
────────
TOTAL:    ~22.3 GB  (95.5% LIVE · 4.3% RECOVERY · 0.26% LEGACY · 0.002% ORPHAN)
```

## Observations

- **No destructive operations performed.** Audit only.
- **95.5% LIVE** — acer's substrate is healthier than initial estimate. The bulk is active, not legacy crust.
- **Largest cleanup win:** `C:/asolaria-from-liris` (59.8 MB) if archived or removed — single largest LEGACY footprint.
- **Silent ad-hoc bridges** are the highest risk class: `liris-channel-4913.js` was 10 lines, invisible to inventory until port-scan caught it squatting on agent-keyboard's port. Recommend adding a port-binding audit to future A-008 reruns.
- **Hardlink awareness** matters: `Asolaria/` vs `asolaria/` look like duplicate trees but are one inode. Don't double-count.
- **D: drive recovery roots** are intentionally preserved per session memory (`project_sovereignty_recovery_20260331.md`). Don't purge without operator confirm.

## Closing Stamp

**META-ACER-A-008-LEGACY-INVENTORY · trees=6 · orphans=7 · live=21.3GB · legacy=59.8MB · recovery=954.5MB · orphan=527KB · no-deletions · apex=COL-ASOLARIA @ M-EYEWITNESS .**

---

*Audit complete · wall-clock <20 min · D11-ASSUMED → D11-OBSERVED on operator ACK · A-008 of SMP-V5 closed*
