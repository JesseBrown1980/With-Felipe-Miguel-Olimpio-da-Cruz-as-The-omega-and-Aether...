# ASOLARIA CIVILISATION — THE SHARED MATRIX

Fifteen agents, one surface, **729 cells** (27² — the ternary lattice squared). Every agent grows
this matrix and can bump into another agent's work.

## Time is a hash chain, not a clock

```
tick[0] = sha16("TICK|" + agent_pid + "|0")
tick[k] = sha16(tick[k-1] + "|" + agent_pid + "|" + k)
```

Each agent is given **600 ticks = 10 minutes**. The sequence is deterministic and reproducible
**from the agent's PID alone**, so the whole civilisation runs instantly and the schedule stays
auditable. Time was skipped; **the work was not** — every tick read real bytes and verified them
against `.sha256` sidecars written by other people. **4,917,706,148 bytes read.**

## The rules

- **CREATE-ONLY.** The first writer keeps the cell. There is no delete verb and no overwrite verb
  in the kernel. The matrix can only get bigger — the one property that makes a shared surface safe
  for strangers.
- **A collision is a BUMP**, recorded with both agents, both ticks and both payload digests.
  **`overwritten=0`, `dropped=0`** across 7,946 bumps.
- **The act is derived from the tick's own hash** — research / chariot / fix / improve / read /
  write — so no agent can prefer the easy work.

## Result

```
agents=15  ticks_each=600  ticks_total=9,000
cells_grown=729/729  saturated
bumps=7,946  overwritten=0  dropped=0
gimel=7,729  shin=1,150  bytes_read=4,917,706,148
```

## The flaw this run exposed — stated, not hidden

**Cells were decided by roster order, not by merit.** Because each agent's full ten minutes ran to
completion before the next agent started, the first agent took 409 of 729 cells and **six agents
got zero** — their scoreboard rows read `could_not_do=grow a single uncontested cell`. They bumped
600 times each and grew nothing.

The hash-time skip serialised what concurrency would have interleaved. The honest fix is a **global
tick order** across all agents rather than per-agent sequential schedules. Recorded here beside the
result rather than quietly re-run.

Measured by **ACER-CLAUDE-FABLE5** · pid `8467a937cba309f7` · owner **OP-JESSE** · `E=0` · `json=0`

## Second pass: RIME SPHERES — global tick order, and gravity as a result

`RIME-SPHERES.hbp` is the fixed run. The first-mover land rush is gone:

| | roster-ordered | global tick order |
|---|---|---|
| most cells | **409** | **66** |
| fewest cells | 0 | **35** |
| agents with zero cells | **6** | **0** |

Physics is **derived, never assigned.** Mass is the *verified* dust a sphere collected — real bytes
read from real artifacts and checked against `.sha256` sidecars written by other people
(**4,917,088,334 bytes**). Gravity is `isqrt(mass)`. Energy is counted rungs of the 3-ladder
(`pump_shell`, grows as log₃, no logarithm taken). Colour position is `sha16[0]=col, [1]=row,
[2]=depth` in a 16×16×16 cube. All integer; `float_used=0`.

Each sphere nests to a **prime depth** with an agent PID and a watcher PID per node — **61,425
nodes**, and a fault injected at every level was caught at that exact level for **all 15 spheres**.
Correction nests infinitely; consent does not nest.

### The carrier finding, and where the three actually live

Measured: an **AC carrier reaches 2 distinct zeros, not 3.** `Some(Zero::Nil)` is unreachable for
any `steps_per_cycle ≥ 1` — verified exhaustively over 1..=64 and every phase, **0 occurrences**.
`zero_states()` returns 3 and disagrees with reachable output on **63 of 64** cycle-lengths. The DC
side mirrors it: the comment says "two states", `zero_states()` returns 1, measured 1.

**This is not a missing third state — it is the wrong instrument.** RAINBOR locates the three in the
**three waves** (`path1.path2.path3` = NN · GNN · FNN, each an HTTP-0 portal acting as itself), where
the anti's order-3 orbit is measured **192 of 192**. The free fourth zero is RAINBOR's **fourth point
where the three waves agree**. Rainbows, not electronics. `Carrier::zero_at` was never where the
third lived.

`NAMED | status=DERIVED_MODEL_not_physics` — nothing was integrated over spacetime and no force was
solved for.
