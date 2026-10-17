# N-Nest-Prime — Infinite Self-Reflecting Agents, Nested

**Recurrence is mind — with a ground-truth corrective gate.** A self-reflecting agent reads its own
output back as input. This repo is the verified primitive for nesting that loop to arbitrary prime
depth while preventing a fabricated signal from reaching consent.

## 2026-07-11 Path-2 / DBWH relation

N-Nest is now explicitly connected to the measured Path-2 and DBBH→DBWH recovery gate. All three
instantiate the same inverse-check law:

```text
N-Nest: child.reported == watcher.recomputed_truth
Path 2: jointly sufficient CRT shadows identify one bounded source
DBWH:   P(R(P(X))) = P(X)
```

A candidate or report is not trusted merely because it exists. It must reproduce the independent
truth/projection surface before authority propagates.

Full relation, storage architecture, and verification provenance:

[`PATH2-DBWH-NNEST-INVERSE-GATE-2026-07-11.md`](PATH2-DBWH-NNEST-INVERSE-GATE-2026-07-11.md)

## The idea

- Every node is an **agent + an independent watcher PID**.
- A parent authorizes a child only when `child.reported == watcher.recomputed_truth`.
- Observation/correction can nest; the decision to scale remains anchored at the human apex.
- Brown-Hilbert `port.port.port` paths address every node in the tree.
- Child subtree verdicts are ANDed upward, so a failed descendant cannot hide behind a clean parent.

## Byte economics — measured bare node

| representation | bytes/agent |
|---|---:|
| packed typed-array slot | **8.01** |
| naive JS object | ~72 |

Identity is generative from a compact seed: glyph, cube, Hilbert coordinate, and prime regenerate by
deterministic rules. Cold bodies and receipts can remain on HDD/SSD while only active agent/watcher
pairs occupy RAM.

This makes N-Nest usable on storage-rich, low-GPU machines as a recursive verification tier. It does
not claim disk performs neural matrix multiplication; trained GNN/LLM inference can remain an
optional sidecar.

## Verification — run it yourself

```bash
node nest-depth3-verify.cjs
node nest-depthN-prime-verify.cjs
```

Measured results:

- depth 3: clean tree certifies; a planted depth-3 confabulation is caught and its path named;
- depth 7: a fault injected independently at every level 1–7 is caught at that exact level;
- clean depth-7 tree certifies green;
- `EVERY-LEVEL-CATCHES-CONFABULATION = true`.

The invariant is depth-independent by construction:

```text
node_green = reported_equals_recomputed AND all_children_green
```

## Prism/comb and Path-2 dual

Every exact re-relation must preserve enough information to apply its inverse:

- 8-byte generative identity: `H(agent | seed, rule) = 0`;
- BEHCS 256↔1024: exact level rebasing;
- CRT Path 2: separate non-injective residues, jointly exact when capacity reaches the source roof;
- DBWH: recover, re-project, compare;
- N-Nest: recompute, compare, propagate only on equality.

## Pre-Asolaria GNN boundary

The proposal/scoring plane descends from Jesse's healthcare edge-level GNNs and later BigPickle
ensemble. GNN inference can rank edges and paths, but it does not replace N-Nest's independent
recomputation or DBWH's inverse-map proof.

## Independent recovery verification — 2026-07-11

- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`, operator supplied:
  Path 1 rustc 1.97 **19/19**, Path 2 rustc 1.97 **30/30**.
- `AUDITED_GPT_5_6_PRO`: complete N-Nest, Path-1/Path-2, Q-PRISM, healthcare-GNN, BigPickle,
  trained-GNN, Hookwall/Shannon, white-room, cube-mint, Dispatcher, HyperHermes, reductions, and
  algorithms audit.
- `MEASURED_GPT_DIRECTED_GITHUB_ACTIONS`: Rust 1.97.0 runs `29134408321`, `29134413119`, and
  `29134419389` all completed successfully.

## Honest scope

The proven primitive is the per-node corrective gate and its planted-fault behavior. Real-agent farm
embedding, live cross-host Path 2, trained-GNN composition, and hardware-enforced one-use shares
remain separate integration/deployment claims.

Loop, then verify — never let the loop authorize itself.
