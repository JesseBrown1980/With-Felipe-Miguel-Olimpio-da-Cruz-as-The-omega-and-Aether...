# Asolaria — after the 100-billion run: absorption, decomposition, cubes

What happens to data farmed from the real free-agent runs once it has been scored: absorb bounded
message windows, decompose surviving signal into cube addresses, mint and seal cubes, preserve
mistakes, and gate any promotion into supervisors/PIDs.

## 2026-07-11 exact-recovery and storage update

The back end now links explicitly to two measured exact-recovery paths:

- **Path 1:** recall a retained cube/body through an authenticated address;
- **Path 2:** reconstruct an unretained block from jointly sufficient CRT shadows;
- **DBBH→DBWH:** re-project the recovered candidate and require SHA/shadow/shell equality before emit;
- **storage tier:** HDD/SSD/cloud holds cubes, shadows, receipts, archives, and cold state;
- **active tier:** RAM holds only the bounded GULP window;
- **neural tier:** trained GNN/LLM inference remains an optional CPU/GPU sidecar.

Full component-specific proof and verification record:

[`PATH2-STORAGE-CUBE-MINT-VERIFICATION-2026-07-11.md`](PATH2-STORAGE-CUBE-MINT-VERIFICATION-2026-07-11.md)

```text
100B-and-under free-agent runs -> Hookwall/GNN/Shannon score
   │
   ▼ ABSORPTION — flow, never pile
GULP 2000 -> SUPER-GULP 50000
   │
   ▼ STORAGE
cubes · white rooms · HDD/SSD archives · cloud sink · calendar/receipt ledger
   │
   ▼ DECOMPOSITION + MINT
AoT best path -> ~3.1 KB semantic cube -> BEHCS-1024 overlay -> cube-cubed seal
   │
   ▼ GATED PROCESSING
GENIUS -> promotion request -> white-room/operator review -> possible supervisor/PID
MISTAKE -> compacted, preserved, never auto-promoted
   │
   ▼ LATER EXACT RECOVERY
Path 1 retained recall OR Path 2 no-store CRT reconstruction -> DBWH inverse check
```

## 1. Absorption — the GC end

`gc-runtime.mjs` gulps every 2,000 messages with a warning near 1,800. The decision point is
“mint or discard happens here.” `planes/super_gulp.mjs` groups 25 gulps into a 50,000-message
horizon. The stream is drained continuously rather than accumulated as one resident pile.

## 2. Storage sinks

- cube directories with manifests/findings;
- deterministic 3×6×6 white-room addresses;
- local HDD/SSD archives;
- 35 TB Google Drive cold sink;
- append-only omnidirectional calendar;
- Path-1 retained content stores;
- Path-2 CRT shadow lanes.

This is the concrete storage substitution: durable learned state leaves RAM/VRAM and survives on
storage, while only the active window spins through the system.

## 3. Decomposition and cube minting

- The farmed AoT best path is distilled into a roughly 3.1 KB cube. This step is deliberately
  **lossy**: noise/hallucination is discarded and signal retained.
- `cube-builder.js` mints the cube and actor entry.
- the BEHCS-1024 prism overlay adds an exact alternate representation;
- per-sector L5 cube-cubed sealers name/seal it into the cube-of-cubes;
- lazy minting gives a PID only when needed.

## 4. Gated promotion

- `cubes-indexer.mjs` indexes genius/mistake evidence;
- `tier-classifier.mjs` labels required authority and defaults unknowns to deny/SHADOW;
- `promotion-bridge.mjs` defaults to describe-only and requires quintuple authorization for live
  promotion;
- genius cubes may accumulate freely but do not self-promote;
- mistakes are compacted and preserved.

## 5. Loss boundary

### Deliberately lossy

```text
raw/AoT result -> ~3.1 KB semantic cube
```

### Exact after mint

```text
3200 bytes <-> 2560 BEHCS-1024 symbols
SHA/content-address readback
CRT Path-2 split/recombine when used
receipt and seal verification
```

The 256↔1024 transcode is exact at 40-bit boundaries:

```text
5 bytes = 4 ten-bit symbols
3200 bytes = 2560 symbols
code rate = 1.0
```

## 6. Path 1 and Path 2

Path 1 succeeds because a receiver already stores the object; the wire address selects it.

Path 2 uses:

```text
S_i = X mod p_i
```

and permits exact recovery only when:

```text
product(p_i) >= source_range
```

Insufficient capacity returns `Held::InsufficientJointCapacity`. Extra residues must agree.

The DBWH white side then requires:

```text
P(R(P(X))) = P(X)
```

through SHA, complete-shadow, and frequency-shell equality.

## 7. Hardware scope

### No GPU required

- GULP/SUPER-GULP flow control;
- SHA/Host8/BEHCS/CRT operations;
- content-addressed recall;
- cube/receipt/index persistence;
- Hookwall/Fischer/Shannon deterministic gates;
- white-room compaction;
- N-Nest recomputation.

### Accelerator optional

- trained GNN inference/training;
- LLM generation;
- dense tensor work.

A hard drive is not a GPU. The measured result is that durable state, exact recovery, routing, and
proof do not need to remain in GPU VRAM.

## 8. Pre-Asolaria GNN lineage

The GNN sidecars descend from Jesse's AI healthcare assistant. Four model files match byte-for-byte
between healthcare and Asolaria. BigPickle later composes L0/L4 with G1/G2/G3/G4, OmniShannon,
SHA fallback, Fischer, and Hookwall. Later `.pt` artifacts/manifests live in the trained-GNN repo.

## 9. Independent verification — 2026-07-11

- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`, operator supplied:
  Path 1 rustc 1.97 **19/19** and Path 2 rustc 1.97 **30/30**.
- `AUDITED_GPT_5_6_PRO`: complete recovery, GNN, scoring, white-room, this backend, Dispatcher,
  HyperHermes, reductions, algorithms, and N-Nest audit.
- `MEASURED_GPT_DIRECTED_GITHUB_ACTIONS`: successful Rust 1.97.0 runs `29134408321`,
  `29134413119`, and `29134419389`.

The Rust runs validate the recovery substrate; they do not claim a live 50,000-message cross-host
Hilbra deployment.

## Registered back-end fleet

`GULP` · `SUPER_GULP` · `MINTING` lanes; gulp and mint supervisors; lazy mint canon; per-sector
cube-cubed sealers; cube absorption systems; farm archive PIDs; free-agent PID mint descriptors.

---

Part of the chain after `Shannon-and-the-gnns-stage`: emitter → dispatcher → fleet → scoring →
absorption/mint. Source/docs only; no private corpus, keys, PID-office bytes, or live promotion.
