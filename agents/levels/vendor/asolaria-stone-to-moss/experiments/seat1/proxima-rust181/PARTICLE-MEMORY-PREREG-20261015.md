# Seat 1 R2 prereg — each simulated particle owns its own memory

**Recorded before implementation and hosted CI.** Append only to draft PR #124; preserve its completed 5/5 first-run receipt, earlier failure history, and public stones.

## Correction to the model

**Original owner source:** [AsolariaMetatag::catalog and learn_from_slice](https://github.com/JesseBrown1980/Metatagging-data-for-a-Quantum-universe/blob/99f9c52ac1706b395dcc1910006fc2a29bd6d9be/metatag_v2_behcs.py) defines particle PID, per-particle mistakes/skills/genius and state-scoped catalog reference code. [Big Loop](https://github.com/JesseBrown1980/Metatagging-data-for-a-Quantum-universe/blob/99f9c52ac1706b395dcc1910006fc2a29bd6d9be/docs/THE-BIG-LOOP-recompile-from-experience-2026-07-03.md) distinguishes preserving compiled learnings from losing raw trace during recompilation. Do **not** replace each individual particle's evolving memory with one shared global summary.

## Exact test protocol

- Arbitrary-length balanced-ternary address `[-,0,+]^d` as stable particle identity. Show `3^180` valid **possible** identities (decimal exact), > approximate 10^80 observable-universe atom count, **without claiming all identities physically instantiated**.
- Every address has a unique *logical* memory location. A deterministic per-address baseline law provides its current state and exact temporal recurrence at any `u64` logical tick, even before materialization; note this baseline is algorithmically generated and contains no unmeasured independent histories.
- Any particle acquiring an input/observation stores an **own per-ID append-only ordered event**: tick, input trit, previous state, resulting state. Later state must depend on these events, not only address; never overwrite/delete other particles' notes. Verify interleaved events, distinct histories, negative inputs, monotonic timestamps.
- Serialize **all actual materialized event histories**, reload from bytes in a new Ledger, replay all records, and reject (a) altered resulting state, (b) wrong source/address, (c) non-monotone time, (d) malformed input. Compare same-state retrieval after reload.
- Independently recompute a benchmark in Python: 81 physical computed particle IDs × 27 iterations or sampled events, and 180-trit unmaterialized address; compare memory lengths per address, later recalled states and write-count. Source event stream **synthetic until calibrated source pixels or instrument samples imported**.
- For each of the seven scales, include a per-level materialized memory count and independent Fischer replay gate. Include saved exact-byte ledger in CI artifact.
- Separate `address_capacity` from `physically_instantiated_particles`, from `independent_memory_information` and from `simulation_accuracy`. For K *independent* random 3-state memories the worst-case lower bound is K trits; virtual addresses alone cannot eliminate this information cost.
- If interactions couple particles, prove a shortcut or account for their actual graph work. Do **not** claim that a single unobserved 2D pixel determines the whole physical system.
- Rust 1.81.0, std-only, integer trits, Clippy `-D warnings`, Linux/Windows debug/release CI, independent tamper controls, checksum and source pins. No paid GPU, no auto merge, no optical measurement invented.

**Falsifier:** any one particle's distinct input/history changes another particle's recalled state, an event does not survive serialization/restart, a tampered state is accepted, or falsely credited unmaterialized histories are observed in actual external data.
