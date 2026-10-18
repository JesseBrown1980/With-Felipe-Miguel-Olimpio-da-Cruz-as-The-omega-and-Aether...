# asolaria-whiteroom-engine

The **white-room engine** is LEG-1 of the Asolaria multi-substrate fabric: a pluggable-store,
pluggable-scorer, **never-delete** room engine that emits a Brown-Hilbert address, scores a room,
keeps genius, compacts mistakes, and seals append-only HBP evidence.

Local, deterministic, dependency-free Node implementation. No credentials or cloud dependency are
required for the in-memory path.

## 2026-07-11 Path-2 and storage update

White rooms now link explicitly to the measured exact-recovery plane:

- **Path 1:** recall a retained room/cube body through an authenticated content address;
- **Path 2:** reconstruct an unretained body from jointly sufficient CRT shadows;
- **DBBH→DBWH:** re-project the candidate and require SHA/shadow/shell equality before emission;
- **storage tier:** HDD/SSD/cloud retains full genius bodies, compacted mistakes, receipts, shadows,
  cubes, and cold state;
- **neural sidecar:** trained GNN inference remains optional.

Full component record:

[`PATH2-WHITEROOM-STORAGE-VERIFICATION-2026-07-11.md`](PATH2-WHITEROOM-STORAGE-VERIFICATION-2026-07-11.md)

## Four legs

| Leg | Role | This repo |
|---|---|---|
| LEG-1 | white-room scorer/store, never-delete | yes |
| LEG-2 | prime-sector allocator `BH.SECTOR.P{prime}.R{room}.{sha16}` | replicated for convergence |
| LEG-3 | GitHub bus, commit=emit/log=read | sibling |
| LEG-4 | Google Drive cold sink | sibling adapter |

## Store interface

```text
put(pid, value)
get(pid)
scanByPID(predicate)
compact(pid)   // MOVE to compacted; never delete
```

Backends include `MemoryStore` and a gated Redis stub; GoogleDriveStore follows the same interface.

The scorer interface includes:

- `DeterministicScorer` — offline/testable placeholder;
- `L0GnnScorer` — local GNN sidecar wiring.

The placeholder is explicitly not claimed as the real domain scorer.

## Run

```bash
node --test
node liris-whiteroom-engine.mjs
node liris-sector-flywheel.mjs 0 5000 5000
node liris-flywheel-run.mjs 3000 1
```

Files cover the engine, sector allocator, sector flywheel, omniflywheel scale/HDD page persistence,
and Hilbert projection.

## Why never-delete matters

```text
GENIUS  -> keep body + address + receipt
MISTAKE -> compact body/evidence + preserve receipt
```

Compaction reduces the active representation without erasing the evidence chain. Disk/cloud can
hold durable results while RAM contains only the rooms currently being scored.

This is the correct “HDD instead of GPU-resident state” result. It does not claim disk performs GNN
matrix multiplication.

## Path 1 and Path 2

### Path 1

```text
address = sha256(X)
receiver returns X iff store[address] exists and hash matches
otherwise Held
```

### Path 2

```text
S_i = X mod p_i
exact iff product(selected p_i) >= source_range
otherwise Held::InsufficientJointCapacity
```

The DBWH white side then requires:

```text
P(R(P(X))) = P(X)
```

by comparing SHA, all selected/recorded shadows, and frequency shells.

## GNN lineage

The optional L0 scorer traces to Jesse's pre-Asolaria healthcare models. Four healthcare model files
match later Asolaria sidecar blobs exactly. BigPickle then composes L0/L4, G1/G2/G3/G4,
OmniShannon, SHA fallback, Fischer, and Hookwall. White rooms consume the semantic evidence but keep
a deterministic receipt/store boundary.

## Security

- no credentials, keys, tokens, or vault material are stored here;
- nodes mint identities locally and publish only public material;
- secret scanning remains part of CI/publish hygiene.

## Prism/comb boundary

White rooms are quarantine/search regions where candidate collisions are deliberately compared;
execution lanes remain collision-separated. The measured 256↔1024 rung is an exact representation
change. Content addresses remain coordinates against retained stores, not sub-entropy compression.

## Independent verification — 2026-07-11

- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`, operator supplied:
  Path 1 rustc 1.97 **19/19** and Path 2 rustc 1.97 **30/30**.
- `AUDITED_GPT_5_6_PRO`: complete recovery, Q-PRISM, healthcare-GNN, BigPickle, trained-GNN,
  Hookwall/Shannon, white-room, cube-mint, Dispatcher, HyperHermes, reductions, algorithms,
  HyperBEHCS, and N-Nest audit.
- `MEASURED_GPT_DIRECTED_GITHUB_ACTIONS`: successful Rust 1.97.0 runs `29134408321`,
  `29134413119`, and `29134419389`.

The Rust runs validate exact recovery/watchers; they are not a new white-room Node-suite result or a
live Hilbra benchmark.

## Part of

The broader multi-substrate system with `35-TB-google-AI-Ultra-migration`, `bigpickle-rebuild`,
`asolaria-behcs-256`, `asolaria-federation-1024`, and the two recovery crates.

## License

Operator choice; add an explicit license before wide redistribution.
