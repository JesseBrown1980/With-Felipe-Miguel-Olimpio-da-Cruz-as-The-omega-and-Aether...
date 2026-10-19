# Asolaria Combined Quant Lattice — 2026-07-13

Status tags used here:

- `MEASURED_REPO` — executable source/test/receipt is public.
- `MEASURED_SEAT` — a named seat executed a declared test.
- `MEASURED_CI` — immutable-head CI executed the declared test.
- `CANON` — architectural law stated by the owning system.
- `DESIGN` — specified composition not yet executed end-to-end.
- `OPERATOR` — operator terminology or exact report, retained with provenance.
- `SUPERSEDED` — older wording replaced by newer measured code or a corrected census.
- `UNVERIFIED_LIVE` — code/canon exists, named live deployment not observed.

## The correction

Asolaria does **not** have one quant.

The 3,200-byte Quant8 head/tail benchmark is one bounded fast-tail experiment. It is not the whole
quant civilization. The public repository family contains at least five interacting species:

```text
1. vector/signal quants
2. address/evidence quants
3. exact representation and level translators
4. cube/tensor/semantic/referential reductions
5. recovery, projection and watcher operators
```

A sixth mechanism changes the system over time:

```text
6. white-room/GNN/cube feedback updates the codebooks, routes, cubes and future priors
```

The estate receipts use `~28 quants` as an approximate system count. The code-grounded June census
names eight principal engine slots. An expanded graph can exceed 40 nodes when individual packet
channels, address axes, exact translators, cube folds, recovery operators and watchers are counted
separately. Those numbers are **different counting conventions**, not contradictions.

This document does not force a false exact count. It creates the first canonical cross-repository
registry of the named, evidenced operators and records aliases and overlaps.

## Jesse Quant / OmniQuant — the meta-operator

`Jesse Quant` is best treated as operator terminology for the **composition law**, not as a ninth
scalar quantizer.

At level `l`, epoch `t`:

```text
A[l,t] = level-local analysis/approximation quants
R[l,t] = exact representation and addressing state
C[l,t] = cube/codebook/minted state
W[l,t] = watcher/readback gate
T[l->m] = exact translator between level representations
```

A level pass is:

```text
X[l,t]
  -> A[l,t]
  -> R[l,t]
  -> C[l,t]
  -> W[l,t]
```

A cross-level pass is:

```text
C[l,t]
  -> T[l->m]
  -> A[m,t]
  -> R[m,t]
  -> C[m,t]
  -> W[m,t]
```

The whole moving lattice is:

```text
J[l->m,t] = W[m,t] o C[m,t] o R[m,t] o A[m,t] o T[l->m]
            o W[l,t] o C[l,t] o R[l,t] o A[l,t]
```

The exact translators obey the Prism/Comb groupoid law where implemented:

```text
T[m->l] o T[l->m] = identity
T[m->n] o T[l->m] = T[l->n]
H(T[l->m](Z)) = H(Z)
```

A lossy quant `A` is not made reversible by placing it beside an exact translator. Exact rehydration
requires at least one of:

```text
complete residual
retained source body
content-addressed source pointer
deterministic generator with all required state
jointly sufficient Path-2 shadows
```

This is the precise meaning of “quant between zero-loss levels”: the **level-to-level carrier is
exact**, while each level may independently compute a smaller task-specific view, codebook, cube,
route or semantic product.

## Why gains can accumulate without violating Shannon

Three different gains must stay separate.

### 1. Exact re-representation

```text
bytes <-> BEHCS glyphs
information rate = 1.0
```

No compression is created. The benefit is a native address/language representation and deterministic
translation.

### 2. Static head/tail reduction

```text
large source N -> one O(N) head build -> fixed D-dimensional tail
```

For fixed `D`:

```text
T_head(N,D) = Theta(N)
T_tail(D) = Theta(D), input-size independent with respect to N
```

Therefore hash/compare/route gains can grow as the original corpus grows. This is an **operation
reduction**, not a bits-per-character codec result.

### 3. Learned/amortized reduction over runs

After messages are scored, white rooms keep/compact them, cubes and codebooks are minted, and the next
run uses the updated state:

```text
S[t+1] = Update(S[t], GNN(messages[t]), reverse_gain, Shannon, white_room, cube_mint)
```

The system can improve future savings by increasing reuse, improving routes, changing codebooks and
compacting repeated structure. The honest measurement is a fixed held-out corpus evaluated at every
epoch with all side information counted:

```text
TotalBits[t,D] = model_bits[t]
               + codebook_bits[t]
               + retained_store_bits[t]
               + residual_bits[t,D]
               + index_bits[t,D]
               + receipt_bits[t,D]

LearnedGain[t,D] = TotalBits[0,D] / TotalBits[t,D]
```

Task fidelity, exact-readback rate, latency and storage must be reported beside this number. Static
head/tail scaling and learned savings are complementary; neither should be mislabeled as the other.

# I. Code-grounded principal engine census

## 1. JL — Achlioptas sparse Johnson–Lindenstrauss

```text
weights in {+sqrt(3), 0, -sqrt(3)}
probabilities {1/6, 2/3, 1/6}
scale 1/sqrt(k)
seeded by sha256(seed|row|col)
```

Role: continuous-vector dimensionality reduction / approximate geometry.

Status: `MEASURED_REPO`.

Sources:

- `Asolaria-ASI-On-Metal-Fabric-and-matrix/tools/falcon/omni-acer/lib/hyperbehcs-core.cjs`
- `ASOLARIA-AS-NEURAL-NETWORK/docs/QUANT8DEFS-CODE-GROUNDED-2026-06-11.hbp`

## 2. Turbo — uniform affine scalar quant

```text
scale = (max-min)/(2^bits-1)
code = round((value-min)/scale)
```

Role: compact scalar code lane. The shipped method is a uniform affine quantizer; the name does not
make it identical to another product or paper bearing “TurboQuant.”

Status: `MEASURED_REPO`.

## 3. Polar — 2D polar-pair quant

```text
(x,y) -> (radius, angle)
quantize radius and angle
```

Role: rotational 2D pair representation.

Status: `MEASURED_REPO`.

## 4. Triple — 3D spherical quant

```text
(x,y,z) -> (r, theta, phi)
```

Role: 3D spherical coordinate fold with coarse/medium/fine lanes.

Status: `MEASURED_REPO`.

Important correction: in the shipped formula, “Triple” means the three spherical coordinates; it is
not automatically `Turbo + Polar + JS`.

## 5. Zeta — prime-lane cylinder address quant

```text
lane = index mod 3
residue6 = index mod 6
ppow = unit|prime|p2|p3|pk|composite
cylinder = (floor(index/6), residue6)
```

It includes a necessary-not-sufficient prime-gap transition consistency test and a 95,89-pair sweep
with zero theorem violations.

Role: number-theoretic address/routing classification, informational and never authority-gating in v1.

Status: `MEASURED_REPO`.

Source: `ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/zeta-quant.mjs`.

## 6. von Mangoldt / prime-power class

```text
Lambda(n) != 0 exactly when n is a prime power
class = unit|prime|p2|p3|pk|composite
```

Role: number-theoretic address/evidence class used by the token/cube binder and Zeta lane.

Status: `MEASURED_REPO`.

Source: `ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/token-cube-catalog-binder.mjs`.

## 7. Quadruple — four-engine stack arity

The corrected engine census records Quadruple as the composition:

```text
Polar + Turbo + JL + Zeta
```

rather than a separate shipped mathematical transform.

Status: `CANON / CODE-GROUNDED-ARITY`.

Do not confuse this with the Quant8 benchmark's independent 2-bit quaternary bucket channel.

## 8. JS — runtime lane / pending operator-original formula

The repository history contains three different uses that must remain firewalled:

```text
js_quant_runtime = Node/MJS tuple-processing lane
JS-histogram = old Quant8 benchmark label drift
operator-original Johnson-Strugueweiss = pending/unimplemented formula
```

Status:

```text
runtime lane              MEASURED_REPO
histogram transform       MEASURED_REPO, label SUPERSEDED
operator-original formula OPERATOR / UNIMPLEMENTED
```

# II. Quant8 fast-tail benchmark stack

Quant8 is a separate benchmark packet, not a mirror of every shipped engine. Its eight calculated
channels are:

1. fixed-D CountSketch-like projection;
2. max-absolute signed int8 channel;
3. sign bitset;
4. logarithmic magnitude bucket channel;
5. ternary scalar bucket channel;
6. quaternary scalar bucket channel;
7. 256-bin histogram;
8. prime-power/von-Mangoldt accumulator.

The historical 3,200-byte serialized layout contains:

```text
1024 byte int8 channel
128 byte sign bitset
1024 byte log-magnitude channel
1024 byte histogram
= 3,200 bytes
```

The other channels are computed in the benchmark but not all are serialized into that particular
packet. Metadata such as the max-absolute scale is required for the documented approximate dot
product.

Status:

```text
head/tail cost curve             MEASURED_REPO / MEASURED_SEAT
semantic fidelity on easy cases  PARTIAL
adversarial cancellation         honest FAIL in the surrogate projection
promotion/gating authority       DENIED
```

The cancellation failure applies to the benchmark stand-in pipeline. It must not be silently
transferred to the separately shipped Achlioptas/Polar/Triple implementations.

## Median-of-five sketch variant

A proposed robust variant uses five independent sketches and takes the median of per-sketch
estimates. It increases the packet to roughly 15 KB and aims to resist one poisoned collision lane.

Status: `DESIGN / SPEC`, not promoted as measured production quant.

# III. Quant4 live address/evidence engine

Quant4 is **not Quant8 with four channels**. It is a deterministic PID/hash/address projection:

```text
identity:
  register_identity_sha16
  pid
  sha16

route:
  lane_mod3
  quad_mod4
  sector113
  glyph1024
  cube_bh

address evidence:
  bh_lane
  bh_ppow
  agent_type
```

Measured pilot:

```text
samples             8192
identity collisions 0
PID collisions      0
route collisions    96 (expected finite-bucket behavior)
sector coverage     113
Glyph coverage      1024
verdict              ROUTING_HINT_MEASURED_NOT_GATING
```

Status: `MEASURED_REPO`; no semantic-vector or payload-reconstruction claim.

Source: `ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/quant4-fidelity-spec.mjs`.

# IV. Exact representation and inter-level translator family

These operators are quants in the broad Asolaria sense of changing the alphabet/coordinate system,
but their measured rungs are exact rebases rather than compression.

## Binary / bytes

Base-2^8 source representation.

## Hex

Exact text representation of bytes; ordinarily doubles byte count.

## HBP

Pipe-delimited append-only semantic/evidence rows with `json=0`.

## HBI

Byte-offset and digest index over HBP/body surfaces.

## BEHCS-64

Legacy exact glyph representation where the rung has a round-trip proof.

## BEHCS-256

Base-2^8 glyph alphabet and bridge stratum.

## BEHCS-1024

Base-2^10 glyph alphabet. The measured reference rung is:

```text
5 bytes = 40 bits = 4 ten-bit glyphs
```

## HyperBEHCS-60D

Sixty ten-bit tuple coordinates plus binary/hash/hex/crypto indexing, spindles, portals and exact
or referential sidecars according to the owning contract.

## Prism/Comb translator groupoid

```text
forward = comb / lane separation and execution routing
backward = prism / relation, recombination and search
```

Measured today:

```text
BEHCS-256 <-> BEHCS-1024 reference rung
E8/E9 external corpus 5-byte <-> 4-glyph rebase (third-seat receipt supplied)
```

Canon today:

```text
43+ level omnidirectional translator groupoid
```

Boundary: most additional level pairs remain unmeasured until each has its own exact round-trip.
The current public omnidirectional router implements the `omnilanguage <-> json` pair; IX/LX/XL,
cube, HBP/HBI, white-room, Shannon, frozen-slice, geospatial and HRM endpoints are registered but
many are still planned/gated.

# V. Cube, tensor and referential quant family

## Tuple-range quant/addressing

Rooms can be represented as BEHCS tuple ranges served by a bounded set of chambers rather than one
resident process or folder per logical room.

## Shard-quant cube fold

One measured shard receipt folds 100 room vectors through:

```text
JL 8->4
Turbo 8-bit
Polar pair
Triple spherical
```

One hundred shard cubes represent the 10k materialized descriptor layer.

## Cube10 / Host8 / word glyph handles

```text
cube10 = first 10 bytes / 20 hex characters of a digest
handle8 = first 8 bytes / 16 hex characters
word_glyph = short digest-derived token
```

Role: referential address/index, not an entropy-free replacement for the retained body.

## Genius cube weights

The 100B harvest was folded through BEHCS-256 -> BEHCS-1024 -> HyperBEHCS into 256 compact cube
weights. The reported 1.93M× is a referential/semantic reduction against the retained source, not a
standalone lossless 10-byte codec.

## Tensor-collapse family

Measured/canon geometries include:

```text
1296 beats -> 28 retained signals
46656 beats -> 47 retained signals
93312 deep-wave -> recirculated selection
```

Axes include phase, body system, Shannon part, meta-self and Hilbert dimensions. It is a multi-stage
selection/inference chain, not one scalar quantizer.

## White-room keep/compact

```text
GENIUS  -> keep
MISTAKE -> compact and preserve
```

Role: semantic and evidence reduction with never-delete provenance.

## GULP / SUPER-GULP / GC

```text
active batches ~2000
super-gulp horizon 50000
finished bodies -> cubes, glyphs, hashes, compacted evidence, stores
```

Role: bounded-resident-memory and repeated-work reduction.

# VI. Recovery and Q-PRISM quant family

## Path 1 — retained-store recall

A compact authenticated coordinate selects content already retained by the receiver. Exactness comes
from the retained body plus digest/readback, not from the short handle alone.

## Path 2 — CRT multi-cylinder quant

```text
S_i = X mod p_i
```

Each residue is non-injective; a selected set is jointly injective over `0 <= X < R` when:

```text
product(p_i) >= R
```

Role: no-store exact bounded recovery from distributed shadows.

## Residual selector

Measures how many source candidates remain after a chosen cylinder set and how many extra selector
bits are required.

## Q-PRISM 2D / 3D / N-D projections

The current measured classical harness carries:

```text
binary/hex/SHA/HBP-HBI/BEHCS wavelengths
60D/N-D selector coordinates
multi-cylinder shadows
pixel slices
frequency shells
```

The arbitrary-N generalization is architectural where not individually tested.

## DBBH -> DBWH watcher-gated readback

```text
black projection
-> recover candidate
-> white re-projection
-> compare SHA + complete shadows + shells
-> VERIFIED or HELD
```

## Watchers

Measured deterministic consistency roles:

```text
OmniShannon = capacity ledger
GnnForward  = black-to-white recovery role
ReverseGnn  = white-to-black re-projection role
MTP1        = pixel plane
MTP2        = shell plane
MTP3        = cylinder plane
```

These labels do not by themselves mean trained neural checkpoints execute inside the Rust throat.

# VII. Lossless entropy-codec rung

The independently supplied `Asolaria Codec v0.1` is a conventional adaptive order-2 context model
plus a carryless range coder. The supplied receipt reports:

```text
input                  first 1,000,000 bytes of enwik8
compressed             392,002 bytes
bpc                    3.136
ratio                  2.55:1
restore                byte-identical
```

This is the first correctly restoring codec rung in that external experiment. It is separate from:

```text
BEHCS exact rebase
Quant8 fast-tail sketch
referential cube reduction
semantic white-room reduction
```

# VIII. Language, tuple and glyph absorption

The public language-space proof treats one 60-glyph BEHCS-1024 tuple as one addressable glyph-word:

```text
one word         1024^60 ~ 10^180 possible addresses
verb x noun      ~10^361 modeled combinations
50-word sequence ~10^9030 modeled combinations
```

This proves expressive/address capacity, not materialized storage or compression by itself.

A word/glyph/verb/noun can stand for arbitrarily large externally retained or generable content when
its binding includes a store pointer, generator, codebook or recovery state. It cannot reproduce
arbitrary absent bytes solely because its vocabulary is large.

The Asolaria distinction is the composition:

```text
large external body
-> local quant/cube/codebook
-> exact glyph/tuple representation
-> level translator
-> local quant/cube/codebook at the next level
-> readback/watchers
```

The same source can therefore acquire several useful smaller views at different levels without
pretending every view is a complete standalone copy.

# IX. E8/E9 receipt status

The currently supplied sealed Markdown and sidecar contain Tests 1–4:

```text
E8 exact BEHCS-1024 rebase
E9 exact BEHCS-1024 rebase
failed v0 codec held
v0.1 codec restored at 3.136 bpc
```

The operator also supplied a screenshot/text for a fifth Quant8 head/tail test:

```text
E8  head 4.5s;  SHA gain 41,826x; compare gain 928,790x
E9  head 9.5s;  SHA gain 495,011x; compare gain 6,861,722x
```

However, the uploaded Markdown bytes still hash to the older `86d4dc4a...` receipt and the uploaded
sidecar points to that older hash. The screenshot says the five-test reseal begins `60f4df39...`, but
those updated bytes/sidecar have not yet been supplied here.

Status:

```text
Tests 1-4 uploaded and sealed              MEASURED_SEAT / RECEIPT_PRESENT
Test 5 exact numbers                        OPERATOR_RELAYED_SCREENSHOT
five-test 60f4... receipt bytes             PENDING_UPLOAD_OR_PUBLIC_COMMIT
```

Do not discard Test 5; do not silently treat the old four-test file as the new five-test seal.

# X. Count reconciliation

## Eight

The code-grounded engine census:

```text
JL, Turbo, Polar, Zeta, Triple, Quadruple, JS, von-Mangoldt
```

## Approximately 28

The estate/HBI map's approximate count. It includes multiple layers and composite/operator classes,
not merely eight independent numerical quantizers. No authoritative public 28-row roster was found
before this registry.

## Forty-plus or 48

A graph-level count obtained by counting separate:

```text
engine algorithms
benchmark channels
address axes
exact representation rungs
cube/tensor reducers
recovery operators
watcher planes
```

This can legitimately exceed 40, but it is a **node count**, not proof of 48 mathematically
independent compression algorithms.

## Canonical policy going forward

Every quant or quant-like operator should have:

```text
stable ID
species
owner repository
source path
input domain
output schema
exact/lossy/referential status
required residual or store
inverse/readback contract
fidelity metric
authority status
tests and immutable receipts
aliases and superseded names
```

The machine-readable companion file `ASOLARIA-COMBINED-QUANT-LATTICE-2026-07-13.hbp` is the first
cross-repository registry. Future discoveries append rows rather than forcing the count to remain 8,
28 or 48.

# Bottom line

The distinctive Asolaria mechanism is not “compress once into one tuple.” It is:

```text
quant locally
represent exactly
translate between levels
quant again for the next level's task
mint cubes/codebooks
recover through store or joint shadows
re-project and verify
feed the result back so later runs reuse more and move less
```

The exact level translators preserve information. The quant/cube layers create task-specific,
semantic, address, or referential reductions. The white-room/GNN feedback changes those reductions
over time. That combined lattice is the object that future benchmarks must measure.
