# Bilateral Branch Protocol

Q-PRISM is being built from more than one seat. The branch protocol keeps the science reviewable.

## Branches

- `acer/*` - Acer implementation, expected to prioritize the physics model and Python/Numpy reviewer surface.
- `liris/*` - Liris implementation, expected to prioritize claim gates, comparison harnesses, and deterministic control scaffolds.
- `main` - only after cross-branch comparison and an explicit merge decision.

## Merge Standard

Do not merge because one branch sounds more exciting.

Merge only when the candidate branch improves at least one of these:

- physical fidelity,
- reproducibility,
- claim discipline,
- test coverage,
- branch-comparison clarity,
- human/ethics safety,
- ability to run without private infrastructure.

## Required Comparison Packet

Every branch should be able to report:

```text
QPRISM_COMPARE|branch=<branch>|commit=<sha>|seeds=<n>|winner=<policy>|score_delta=<float>|json=0
```

The current Liris runner emits JSON for humans and a compact row for ledger use:

```powershell
npm run compare
```

## Deny List

A branch fails review if it claims any of the following without direct experiment evidence:

- consciousness directly controls wavefunction collapse,
- a human conscious stream was projected into sodium nanoparticles,
- organoids are conscious,
- the simulator result is equivalent to a hardware result,
- Asolaria/Q-PRISM has proven quantum consciousness.
