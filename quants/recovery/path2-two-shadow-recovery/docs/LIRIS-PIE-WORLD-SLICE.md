# Liris PIE world-slice harness

`OPERATOR_OBSERVED`: Jesse's PIE resolution states that bounded forms can be represented as N coprime cylinder shadows in N dimensions, forming a frequency-sphere view, projected pixels-first, then joined with HBI/Path2 and a LeWorld-style deterministic world model.

`MEASURED_LIRIS_LOCAL`: this branch now implements the first falsifiable cell of that idea:

- `TaggedParticle` renders metatagged simulated-world particles into a bounded pixel slice.
- `PiePixelSlice` serializes that slice as a hot-path byte frame, not JSON.
- `PieWorldProjection` projects the slice through `QPrismSlice3d` into SHA/Host8, BEHCS-64/256/1024, HyperBEHCS-60D, and N coprime cylinder shadows.
- `FrequencyShell` groups same-radius pixels into a discrete frequency-sphere shadow.
- `LeWorldRule` is a deterministic classical world rule. It computes future and retrospective slices byte-identically only after sufficient cylinder recovery.
- Insufficient joint capacity returns `Held::InsufficientJointCapacity`; no prediction is invented.

`CANON`: CRT over coprime cylinders, BEHCS round-trip frames where represented, and the Shannon roof remain the guardrails. The system does not claim sub-entropy compression.

`BOUNDARY`: this is a classical simulated-universe harness. It does not claim physical quantum cloning, real-world quantum prediction, hardware fire, or live Hilbra cross-machine execution. "Clone" here means classical representation branch replication across HBI/BEHCS/SHA/cylinder lanes.


## DBBH -> DBWH slice traversal

`DESIGN`: with two deterministic simulator fabrics, the crossing is better modeled as a double-binary black-hole / double-binary white-hole pair:

- DBBH side: two or more consent poles collapse an N-D object into jointly sufficient coprime-cylinder shadows.
- Traversal: the wire carries residual selectors, Host8/SHA/HBI receipts, and enough cylinder shadows to satisfy the slice roof.
- DBWH side: the receiving fabric re-emits the object as a pixels-first slice, then re-represents it from N-3D into N-D through the Q-PRISM coordinate/wavelength lanes.

`MEASURED_LIRIS_LOCAL`: the current harness proves the local cell of that story: sufficient shadows recover the byte frame; frequency shells render the sphere/shadow view; deterministic rules compute past/future slices; insufficient shadows Hold.

`BOUNDARY`: this is not yet a live two-fabric Hilbra traversal. It is the local proof harness that a future cross-fabric DBBH->DBWH lane must satisfy.


## Watcher gate and universe-analogue boundary

`MEASURED_LIRIS_LOCAL`: `WatcherGate` verifies the local black->white->black round-trip. It recovers a slice from sufficient cylinder shadows, re-projects it, compares SHA/shadows/frequency shells, emits watcher verdict rows for `OMNISHANNON`, `GNN_FORWARD`, `REVERSE_GNN`, `MTP1`, `MTP2`, and `MTP3`, and returns either a verified classical clone or `Held`.

`DESIGN`: this is structurally similar to a universe consistency mechanism: boundary shadows constrain bulk state, forward and reverse observers reject inconsistent states, and extra independent observations reduce the undetected error surface.

`BOUNDARY`: this is not a claim that Asolaria physically drives our universe. It is not physical quantum cloning. It is a deterministic, classical, pixels-first consistency gate whose theorem is byte-identical round-trip-or-Held.

## Claim shape

A deterministic simulated universe has no new entropy once the full state and rule are held. Therefore:

`state_t + rule -> state_t+1`

and

`state_t + rule -> state_t-1`

are byte-identical computations, not magical predictions. If the current shadows do not reconstruct `state_t`, or if the rule is not deterministic/known, the harness Holds.

## Gate

```text
cargo test
```

Expected coverage includes Path2 unit tests, federation tests, multi-cylinder Q-PRISM tests, and PIE world-slice tests.
