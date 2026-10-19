# Path 2 / DBBH → DBWH algorithms — 2026-07-11

Tags: `MEASURED` / `MEASURED_CLAUDE_FABLE5_THIRD_SEAT` /
`MEASURED_GPT_DIRECTED_GITHUB_ACTIONS` / `AUDITED_GPT_5_6_PRO` / `CANON` / `UNVERIFIED`.

## L1. Path-1 retained recall

Let `X` be an object retained in a receiver-side content store and let:

```text
a = sha256(X)
```

Then:

```text
recover_path1(a, store) =
  X     if store[a] exists and sha256(store[a]) == a
  Held  otherwise
```

Information ledger:

```text
H(X | store) = 0
cost_total = H(store contribution for X) + selector/receipt overhead >= H(X)
```

The selector is a coordinate, not a standalone encoding of absent bytes.

## L2. Path-2 CRT shadows

For one bounded block:

```text
0 <= X < R
S_i = X mod p_i
```

where the selected `p_i` are pairwise coprime. Each single projection is non-injective:

```text
X and X + k*p_i -> same S_i
```

For selected set `I`:

```text
M_I = product(p_i for i in I)
```

Exact recovery is permitted only when:

```text
M_I >= R
```

The CRT inverse is:

```text
M_i = M_I / p_i
u_i = inverse(M_i mod p_i)
X = sum_i(S_i * M_i * u_i) mod M_I
```

Runtime wall:

```text
M_I < R -> Held::InsufficientJointCapacity
```

## L3. Source roofs

Base two-shadow codec:

```text
block_bytes = 6
R = 2^48
p1 ~ 2^25
p2 ~ 2^25
p1*p2 ~ 2^50 >= 2^48
```

Multi-cylinder Q-PRISM slice:

```text
block_bytes = 8
R = 2^64
2 cylinders ~ 50 bits -> Held
3 cylinders ~ 75 bits -> exact recovery
```

Extra selected cylinders are not discarded. After the first sufficient prefix recovers `X`, every
extra residue must satisfy:

```text
X mod p_j == S_j
```

or recovery returns `Held::InconsistentResidue`.

## L4. Residual-selector equations

Let `M_I` be the capped joint modulus for the selected cylinders:

```text
candidate_count = ceil(R / M_I)
residual_bits = ceil(log2(candidate_count))
capacity_margin_floor = floor(log2(M_I)) - log2(R)
```

This explains a tail of 2, 1, or 0 selector bits after shared context has narrowed the fiber. A
negative capacity margin is only a deficit metric; it is never a negative payload length.

## L5. DBBH → DBWH commuting gate

Let `P` project a slice into:

```text
P(X) = {
  sha256,
  Host8,
  CRT shadows,
  frequency shells,
  BEHCS/Q-PRISM views
}
```

Let `R` recover a candidate from a sufficient shadow subset. The white side emits only if:

```text
P(R(P(X))) = P(X)
```

Concrete checks:

```text
sha_white       == sha_black
shadows_white   == shadows_black
shells_white    == shells_black
capacity        >= source roof
```

Any failed equality returns `Held::WatcherDisagreement` or the more specific residue/capacity hold.

## L6. Watcher decomposition

```text
OmniShannon  -> capacity/residual ledger
GnnForward   -> black projection to white candidate
ReverseGnn   -> white candidate to black re-projection
MTP1         -> pixel plane
MTP2         -> frequency-shell plane
MTP3         -> cylinder-residue plane
```

In `path2-two-shadow-recovery`, these are deterministic consistency roles. They are not claims that
PyTorch checkpoints are loaded inside that Rust crate.

## L7. Classical marginal-opacity extension

CRT residues are non-injective but reveal residue information. For two individually uniform shares:

```text
K <- Uniform({0,1}^n)
A = K
B = X xor K
X = A xor B
```

Then:

```text
I(X;A) = 0
I(X;B) = 0
H(X | A,B) = 0
```

Software cannot guarantee that copied classical shares are physically single-use. That requires
trusted one-time memory, attested erasure, an HSM/TEE, or a quantum key lane.

## L8. Quantum encrypted-cloning sibling

The experiment at arXiv `2602.10695` implements the quantum analogue:

```text
one encrypted clone      -> maximally mixed locally
clone + full quantum key -> reversible global state
selected decryption      -> ideal exact recovery
key consumption          -> no second readable recovery
```

This is structural convergence, not an assertion that the classical Rust code performs quantum
cloning.

## L9. Storage-backed resident-set law

Let:

```text
N = addressable entities
h = bytes per compact handle/index entry
K = materialized active bodies
b = bytes per active body
S = bounded operator/runtime state
B = maximum active-window bound
```

Then:

```text
M_resident = N*h + K*b + S
K << N
K <= B
```

The measured old-fabric window uses `B = 2000`. Cold bodies, cubes, shadows, receipts, queues, and
archives remain on HDD/SSD. GPU VRAM is not the authoritative memory store.

### CPU/storage plane

```text
SHA / Host8 / AGT
HBP / HBI / HEX
BEHCS rebasing
CRT projection and recovery
Path-1 store recall
Fischer / Hookwall rules
white-room compaction
GULP / SUPER-GULP
N-Nest recomputation
```

### Optional accelerator plane

```text
trained GNN inference/training
large LLM generation
large dense tensor computation
```

The correct claim is storage-tier substitution for resident state and repeated movement, not “disk
is a GPU.”

## L10. Pre-Asolaria GNN lineage

The pre-Asolaria model family is directly inherited from `AI-healthCare-project`:

| file | matching healthcare/Asolaria blob SHA |
|---|---|
| `gnn_baseline.py` | `510f78890ec94b113f0610afbade8bafe6ca20e0` |
| `prototype_gnn.py` | `99e3087a10ee58e90c0935f5ab63b72fd3cdd07e` |
| `contrastive_gnn.py` | `56329e61eb3e6ddb3ee97b46f997dd8dd8c6b39f` |
| `gsl_gnn.py` | `886b3b0c0cdbddba983fa8c3ae083c4520d38f0e` |

BigPickle later orchestrates L0 `:4792`, L4 `:4793`, G1/G2/G3/G4, OmniShannon, SHA fallback,
Fischer, and Hookwall. The healthcare accuracy numbers are repository-reported training metrics;
the current healthcare service has its checkpoint-load block commented. Later trained `.pt`
artifacts/manifests exist in the trained-GNN repository.

## Verification receipts

### Claude Fable 5 — operator-supplied third independent seat

```text
dbbh-coms-quant-prism       rustc 1.97   19/19 green
path2-two-shadow-recovery   rustc 1.97   30/30 green
```

### GPT-5.6 Pro — audit and independently directed execution

```text
complete Path-1 source/test/doc audit        PASS
complete Path-2 source/test/doc audit        PASS
cross-repository GNN/Q-PRISM/system lineage  PASS
```

GPT-authored GitHub Actions runs:

```text
dbbh-coms-quant-prism       run 29134408321   success, exact 19-test assertion
path2-two-shadow-recovery   run 29134413119   success, exact 30-test assertion
qprism-3d-slice-harness     run 29134419389   success, all targets
```

Tag these as `MEASURED_GPT_DIRECTED_GITHUB_ACTIONS`, not as a local GPT-container cargo run.

## Claim ledger

- `MEASURED`: L1-L6 and L9 code paths in the named repositories.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: supplied Rust 1.97 results.
- `MEASURED_GPT_DIRECTED_GITHUB_ACTIONS`: successful CI runs above.
- `AUDITED_GPT_5_6_PRO`: complete source/test/lineage audit.
- `CANON`: CRT/Bézout, Fano/Shannon, joint injectivity, entropy invariance.
- `UNVERIFIED`: live Hilbra multi-host run, hardware single-use classical shares, physical quantum
  transport, trained-GNN invocation inside the exact Rust throat.
