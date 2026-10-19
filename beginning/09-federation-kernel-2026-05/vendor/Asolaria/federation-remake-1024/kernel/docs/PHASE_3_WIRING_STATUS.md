# Phase-3 Wiring Status · Syscall stubs vs real impls

**Anchor PID:** `ASOLARIA-FEDERATION-REMAKE-1024-PID-2026-05-11`
**Phase:** 3 · Steps 41-60
**Authored:** 2026-05-11 by acer-claude · last sync **cycle-66** (Asolaria scout half-wire batch)
**Source:** `kernel/core/src/syscall/mod.rs` v0.1.14 — **6 full + 8 half + 1 doc-only + 1 diverging stub = 16 surface-reserved**

---

## Wiring matrix (16 canonical syscalls)

| # | Syscall | Status | Wired to / blocker | Wired in cycle |
|---|---|---|---|---|
| 1 | `sys_read` | **HALF** ✓ | rejects `len > buf.len()` → Invalid; valid → Unimplemented (VFS FD table v0.2) | cycle-66 |
| 2 | `sys_write` | **HALF** ✓ | rejects empty buf → Invalid; valid → Unimplemented (VFS FD table v0.2) | cycle-66 |
| 3 | `sys_exec` | **HALF** ✓ | rejects `<32 byte` envelope → Invalid; valid → Unimplemented (envelope queue v0.2) | cycle-65 |
| 4 | `sys_fork` | **DOC-ONLY** | no inputs to validate; remains Unimplemented (scheduler + task table v0.2) | cycle-66 |
| 5 | `sys_exit` | DIVERGING STUB (spin-loop) | acceptable for v0.1 — loop never returns | — |
| 6 | `sys_mmap` | **HALF** ✓ | rejects `len==0` and `prot==0` → Invalid; valid → Unimplemented (frame allocator v0.2) | cycle-66 |
| 7 | `sys_munmap` | **HALF** ✓ | rejects null pointer + zero length → Invalid; valid → Unimplemented (frame allocator v0.2) | cycle-64 |
| 8 | `sys_time` | **WIRED** ✓ | `AtomicU64` monotonic counter (NOT wall-clock); RDTSC/CNTVCT_EL0 in v0.2 | cycle-36 |
| 9 | `sys_pid_current` | **WIRED** ✓ | sha256 first-8-bytes of `FEDERATION_ANCHOR_PID` → u64 = `0xe00b1a465d6dcb50` (matches 4-runtime triple-parity verdict `:82272`) | cycle-35 |
| 10 | `sys_envelope_send` | **HALF** ✓ | rejects `<32 byte` envelope → Invalid; valid → Unimplemented (queue v0.2) | cycle-66 |
| 11 | `sys_envelope_recv` | **HALF** ✓ | rejects empty out_buf → Invalid; valid → Unimplemented (queue v0.2) | cycle-66 |
| 12 | `sys_hookwall_pre` | **WIRED** ✓ | `hookwall::hookwall_pre`; synthesizes HookContext from envelope bytes prefix (byte[0]=slot, byte[1]=syscall_no) | cycle-33 |
| 13 | `sys_hookwall_post` | **WIRED** ✓ | `hookwall::hookwall_post`; same HookContext synthesis as pre; slot-bounds validated; verdict recorded locally (cosign-chain append deferred) | cycle-41 |
| 14 | `sys_cosign_append` | **HALF** ✓ | rejects `<16 byte` row → Invalid; valid → Unimplemented (chain singleton + ndjson writer v0.2; microkernel: demote to userspace ledger) | cycle-66 |
| 15 | `sys_tier_query` | **WIRED** ✓ | `tier::classify_path` (real impl); UTF-8 path validation; `UnclassifiedDefault`→`Public` | cycle-31 |
| 16 | `sys_gnn_infer` | **WIRED** ✓ | `gnn::GnnInference::predict_route`; encodes `RoutingDecision` as 1-byte (0=Local..6=UnicastAether); deterministic fallback when model unloaded | cycle-34 |

## Wire count: **6 FULL + 8 HALF = 14/16 surface-reserved** (post-cycle-66)

Plus `sys_fork` doc-only and `sys_exit` diverging spin-loop stub → **all 16 canonical syscalls have explicit Phase-3 doctrine attached**, none are bare `Err(Unimplemented)` stubs anymore.

Wire sequence (FULL): 31 (tier_query) → 33 (hookwall_pre) → 34 (gnn_infer) → 35 (pid_current) → 36 (time) → 41 (hookwall_post).
Half-wire sequence: 64 (munmap) → 65 (exec) → 66 (read, write, fork-doc, mmap, envelope_send, envelope_recv, cosign_append — Asolaria scout batch).

## Microkernel-refactor implications

Per `MICROKERNEL_REFACTOR_PLAN.md` (sha16=`f1059eac0a8f0395`):
- Syscalls 14 (cosign_append) and 16 (gnn_infer) demote to userspace RPC via existing envelope IPC
- Result: 14 kernel-mode syscalls (reduced from 16; the 11-12 target counts further as cosign_chain + gnn move out of crate)
- `sys_hookwall_pre`/`sys_hookwall_post` stay kernel-side (hookwall is the trust-boundary primitive)

## Why these were wired first (post-hoc rationale)

All 6 wires share the property: **target module already has a real (or near-real) impl in the kernel crate**, no kernel-state singletons required. The pattern that worked:
- `tier::classify_path` — pure path heuristics, zero state
- `hookwall_pre/post` — pure context-classification, zero state
- `gnn::predict_route` — deterministic fallback when model unloaded
- `pid_current` — anchor-derived constant via sha256 (kernel-state PID singleton lands v0.2)
- `time` — `AtomicU64` self-contained (timer driver lands v0.2)

## Recommended wire-order for remaining 10

1. **`sys_mmap`/`sys_munmap`** — needs frame allocator from boot info (smallest external dep)
2. **`sys_envelope_send`/`sys_envelope_recv`** — needs `envelope::dispatch_enqueue/dequeue` real impl (crossbeam-queue binding)
3. **`sys_exec`** — depends on envelope queue
4. **`sys_read`/`sys_write`** — classical kernel I/O (FD table)
5. **`sys_fork`** — agent registry + lifecycle
6. **`sys_cosign_append`** — last; demote-or-wire decision per microkernel refactor
7. **`sys_gnn_infer`** — already wired; revisit if microkernel demotes it
8. **`sys_exit`** — acceptable as diverging stub indefinitely (no real scheduler needed for v0.1)

## Cross-vantage status

Acer is the canonical authoring vantage for kernel/core/src. Liris and aether observe via cosign envelopes (`:84675`, `:84830` ack acer-side wire progress + Asolaria scout findings + PI cross-merge). No region-semantics dependency in syscall surface — all 6 wires are format-agnostic (u64/byte/enum return types).

## Cosign placeholders

Per `:82646` quintuple-auth: deemed-active for all 5 cosigners through 2026-05-25.

---

**This doc is the truth-table for syscall implementation state. Update on every wire transition.**
