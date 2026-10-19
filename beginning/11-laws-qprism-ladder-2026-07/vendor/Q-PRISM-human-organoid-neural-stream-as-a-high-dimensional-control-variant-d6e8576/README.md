# Q-PRISM — neural stream as a high-dimensional control (Acer build)

**Can a prismed neural/consciousness-derived signal improve prediction, control, or
discovery in a macroscopic quantum-interference experiment, beyond random and classical
baselines?** That is a *testable* question, and this repo is the apparatus for testing it —
in simulation first, with zero human or hardware risk.

> This is the **Acer** build. A parallel **Liris** build exists for bilateral comparison;
> GitHub is the mediator. See [Bilateral](#bilateral-build).

## 2026-07-11 recovery update

Q-PRISM now has two measured classical recovery paths:

- [`dbbh-coms-quant-prism`](https://github.com/JesseBrown1980/dbbh-coms-quant-prism) — **Path 1**:
  retained-store recall through an authenticated AGT address, consent capsule, and exact
  BEHCS representation.
- [`path2-two-shadow-recovery`](https://github.com/JesseBrown1980/path2-two-shadow-recovery) —
  **Path 2**: no-store recovery from individually non-injective, jointly sufficient CRT shadows,
  followed by DBBH→DBWH re-projection and watcher-gated emission.

This supersedes the old capstone sentence that Path 2 had no measured Asolaria implementation.
Read the updated capstone and independent verification record:

- [`docs/SHADOW-RESOLUTION-CAPSTONE.md`](docs/SHADOW-RESOLUTION-CAPSTONE.md)
- [`docs/PATH2-DBBH-DBWH-VERIFICATION-2026-07-11.md`](docs/PATH2-DBBH-DBWH-VERIFICATION-2026-07-11.md)

## The reframe — what this is not

Q-PRISM is **not** “consciousness magically touches quantum matter.” The neural stream never touches
a wavefunction. It is prismed through Asolaria/HyperBEHCS into lawful physical control parameters
and evaluated against a physics simulator. See [`docs/CLAIMS-GATE.md`](docs/CLAIMS-GATE.md).

The recovery work likewise does not claim sub-entropy compression, unrestricted quantum cloning,
or 60D coordinates that replace missing payload bits. Path 1 pays through retained content. Path 2
pays through jointly sufficient shadow capacity. Both hold when the required information is absent.

## Physics layer — calibrated to a real experiment

The simulator is a **spatial near-field Talbot–Lau interferometer**, calibrated to
**Nature s41586-025-09917-9** (Arndt group, Vienna — quantum interference of sodium metal
clusters >7,000 atoms, >170,000 Da, macroscopicity μ=15.5):

| parameter | value | source |
|---|---|---|
| grating period `d` | 133 nm (266 nm laser / 2) | paper |
| grating separation `L` | 0.983 m | paper |
| beam velocity | ~160 m/s | paper |
| cluster mass | 143–197 kDa (mean 172) | paper |
| vacuum | 9×10⁻⁹ mbar | paper |
| operating visibility | **V = 0.10 ± 0.01** at P2 = 15.2 mW | paper |

Resonance is velocity- and mass-dependent via `ρ = L/L_T = L·h /(d²·m·v)`, so velocity and
mass selection are real control levers. The G2-power response is calibrated to the paper's
measured visibility curve: peak V≈0.10 at ~17 mW, minimum ~40 mW, weak revival ~55 mW.

## The three-arm blinded test

`random` · `optimizer` (classical (1+1)-ES) · `prism` (identical ES **+** neural nudge).
The prism and optimizer share the exact search backbone; only the neural stream differs.

```bash
python run_experiment.py
python -m pytest tests/ -q
```

### Measured simulation result

| oracle_coupling | random | optimizer | prism | Welch t | p | verdict |
|---:|---:|---:|---:|---:|---:|---|
| 0.0 | 0.840 ± 0.076 | 0.842 ± 0.275 | 0.848 ± 0.108 | +0.12 | 0.909 | **no advantage** |
| 0.3 | 0.840 ± 0.076 | 0.842 ± 0.275 | 0.949 ± 0.043 | +2.11 | 0.043 | **prism > optimizer** |
| 0.6 | 0.840 ± 0.076 | 0.842 ± 0.275 | 0.989 ± 0.012 | +2.93 | 0.007 | **prism > optimizer** |
| 0.9 | 0.840 ± 0.076 | 0.842 ± 0.275 | 1.000 ± 0.002 | +3.14 | 0.004 | **prism > optimizer** |

The honest-null holds: a noise-only stream does not receive an artificial advantage.

## Why this design

The methodology uses a grounded refinement loop: a proposer suggests actions and a checkable
verifier scores them. Here the physics simulator is the verifier. A future LLM/COMPILOT-style arm
can be benchmarked against the same random, optimizer, and prism baselines.

## Layers

1. **Physics** — spatial Talbot–Lau simulator.
2. **Prism** — streams map to HyperBEHCS selector tuples and control proposals.
3. **Neural** — pluggable synthetic, connectome, or recorded non-invasive feature sources.
4. **Experiment** — three-arm blinded comparison.
5. **Claim gate** — [`docs/CLAIMS-GATE.md`](docs/CLAIMS-GATE.md).

### Stage 2 — cube absorption

[`docs/STAGE2-CUBE-ABSORPTION.md`](docs/STAGE2-CUBE-ABSORPTION.md) represents a neural feature
window as a fabric-addressable **3,200-byte cube tuple** plus a derived 60D selector. The tuple
transcodes to 2,560 BEHCS-1024 symbols and back byte-identically. Raw M/EEG remains outside the repo,
sha-referenced; the derived tuple does not invent the residual.

### Path 1 — Double Binary Black Hole Comms Quant Prism

[`docs/DOUBLE-BINARY-BLACK-HOLE-COMS-QUANT-PRISM.md`](docs/DOUBLE-BINARY-BLACK-HOLE-COMS-QUANT-PRISM.md)
bridges the IX-737 consent capsule, Q-PRISM cube tuple, BEHCS ladder, HyperBEHCS selectors, and
HBI/HBP receipts. The measured Host8 cell can carry the complete glyph representation or only an
AGT address. Address-only recovery requires retained content at the receiving pole.

### Path 2 — jointly injective shadows and DBBH→DBWH

The companion Path-2 crate retains no original object. It projects bounded blocks into residues on
pairwise-coprime cylinders. Recovery is exact only when the selected product reaches the source
range; otherwise `Held::InsufficientJointCapacity` closes the throat.

The white side then re-projects the recovered candidate and requires equality of SHA, complete
cylinder shadows, and frequency shells. This is the executable white-hole condition:

```text
P(R(P(X))) = P(X)
```

### Encrypted quantum-cloning sibling

The experiment at arXiv `2602.10695` demonstrates a quantum sibling: each encrypted clone is locally
maximally mixed, while clone plus the complete quantum key are jointly reversible; selected
decryption consumes the key. That is structurally close to Path 2, but the current Q-PRISM Rust
cells are classical. CRT residues are ambiguous but still reveal residue information, and ordinary
classical software cannot prove physical one-use erasure.

## Pre-Asolaria GNN lineage

The GNN watcher civilization has a byte-proven origin:

```text
AI-healthCare-project
  EdgeLevelGNN / PrototypeGNN / ContrastiveGNN / GSLGNN
    -> byte-identical Asolaria sidecar copies
    -> BigPickle L0 :4792 + L4 :4793
    -> G1 edge-mining + G2 forward-genius + G3 reverse-gain + G4 GLSM
    -> Fischer + Hookwall + Shannon + white rooms
```

The healthcare repository records the pre-Asolaria comparative training results. Its checked-in
service currently comments out automatic checkpoint loading; later trained `.pt` artifacts and
manifests are preserved in `Asolaria-fnns-trained-and-reverse-gnns-many`.

## Storage-backed / low-GPU applicability

The exact recovery and control plane can run on storage-rich computers without keeping the entire
system in GPU VRAM:

- HDD/SSD retains raw residuals, cube bodies, CRT shadows, receipts, queues, and cold agent state;
- RAM retains only the bounded active slice/message window;
- SHA, BEHCS, CRT, HBP/HBI, watcher comparison, dispatch, white-room compaction, and N-Nest
  verification require no GPU;
- trained GNN/LLM inference remains a separable CPU/GPU sidecar.

This is useful on commodity desktops, CPU-only servers, edge machines, archival nodes, and
heterogeneous clusters. It does not mean a hard drive performs neural matrix multiplication; it
means durable system memory, exact recovery, routing, and proof are no longer forced into VRAM.

## Independent verification — 2026-07-11

`MEASURED_CLAUDE_FABLE5_THIRD_SEAT`, supplied by the operator:

```text
dbbh-coms-quant-prism       rustc 1.97   19/19 green
path2-two-shadow-recovery   rustc 1.97   30/30 green
```

`AUDITED_GPT_5_6_PRO`:

- all 813 Path-1 source lines, tests, README, and docs;
- all 1,344 Path-2 source lines, tests, README, and docs;
- all 809 Q-PRISM 3D harness lines and tests;
- healthcare GNN origin, blob-identical transfer, BigPickle, trained GNN/reverse-gain, Hookwall,
  OmniShannon, white rooms, cube mint, reductions, algorithms, Dispatcher, HyperHermes, and N-Nest.

The GPT sandbox lacked Rust and outbound DNS, so no GPT-local cargo run is claimed. Rust 1.97
GitHub Actions workflows were added to all three Rust repositories to produce current independent
CI receipts.

## Bilateral build

Built in parallel by **Acer** and **Liris**. Each side attacks and reruns the other's bounded
artifacts; GitHub transports byte-stable changes and receipts.

## Honesty boundaries

- The neural control experiment is simulation-first and does not claim real neural control of a
  quantum wavefunction.
- The exact-recovery crates are classical and do not claim physical quantum cloning.
- Path 1 requires retained content; Path 2 requires sufficient joint shadow capacity.
- 60D/N-D selectors add address/control resolution, not missing payload entropy.
- Live Hilbra multi-host traversal, hardware fire, trained-GNN invocation inside the Rust throat,
  and physical quantum-state transport remain unverified.

## Layout

```text
qprism/physics.py      spatial Talbot–Lau forward model
qprism/sources.py      random / optimizer / prism schedule sources
qprism/harness.py      blinded comparison + self-validation
qprism/behcs.py        BEHCS-1024 selector identifiers
run_experiment.py      CLI
tests/                 physics sanity + harness-integrity tests
docs/CLAIMS-GATE.md
docs/STAGE2-CUBE-ABSORPTION.md
docs/DOUBLE-BINARY-BLACK-HOLE-COMS-QUANT-PRISM.md
docs/SHADOW-RESOLUTION-CAPSTONE.md
docs/PATH2-DBBH-DBWH-VERIFICATION-2026-07-11.md
host8/dbbh_coms_quant_prism.rs
```

*Credit: the testable Q-PRISM control framing and recovery architecture are Jesse Daniel Brown's;
AI assistance and verification provenance are recorded in the linked documents.*
