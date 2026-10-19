# Liris PIE world-slice harness

`OPERATOR_OBSERVED`: Jesse's PIE resolution states that bounded forms can be represented as N-prime cylinder shadows in N dimensions, forming a frequency-sphere view, projected pixels-first, then joined with HBI/Path2 and a LeWorld-style deterministic world model.

`MEASURED_LIRIS_LOCAL`: this branch now implements the first falsifiable cell of that idea:

- `TaggedParticle` renders metatagged simulated-world particles into a bounded pixel slice.
- `PiePixelSlice` serializes that slice as a hot-path byte frame, not JSON.
- `PieWorldProjection` projects the slice through `QPrismSlice3d` into SHA/Host8, BEHCS-64/256/1024, HyperBEHCS-60D, and N-prime cylinder shadows.
- `FrequencyShell` groups same-radius pixels into a discrete frequency-sphere shadow.
- `LeWorldRule` is a deterministic classical world rule. It computes future and retrospective slices byte-identically only after sufficient cylinder recovery.
- Insufficient joint capacity returns `Held::InsufficientJointCapacity`; no prediction is invented.

`CANON`: CRT over coprime cylinders, BEHCS round-trip frames where represented, and the Shannon roof remain the guardrails. The system does not claim sub-entropy compression.

`BOUNDARY`: this is a classical simulated-universe harness. It does not claim physical quantum cloning, real-world quantum prediction, hardware fire, or live Hilbra cross-machine execution. "Clone" here means classical representation branch replication across HBI/BEHCS/SHA/cylinder lanes.

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
