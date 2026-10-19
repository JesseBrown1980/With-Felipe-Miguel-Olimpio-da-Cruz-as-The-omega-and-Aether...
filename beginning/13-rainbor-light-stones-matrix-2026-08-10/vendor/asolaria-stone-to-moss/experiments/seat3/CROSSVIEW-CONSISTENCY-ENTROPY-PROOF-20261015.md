# Seat 3 — cross-view consistency entropy theorem and failure witnesses

**2026-10-15 | Seat 3 computational verification | No authenticated physical host.**

## Theorem (exact finite-field counting)

Let V = GF(2)^n, with m linear observation maps L_i of respective ranks r_i. Their stacked map F(x)=(L_1 x,...,L_m x) has rank r. Let independent uniformly random source states X_i generate observations L_i X_i. A checker accepts if and only if there is a single state z explaining all m observations.

**The exact acceptance probability is 2^(r - sum_i r_i).** Among 2^(m*n) source tuples, exactly 2^(m*n - sum_i r_i + r) are accepted.

**Proof:** Each linear map sends uniform source states to uniform outputs in an image with 2^(r_i) elements. The independently generated output tuple is therefore uniform on the Cartesian product of these images, which has 2^(sum_i r_i) elements. Exactly the 2^r elements of the stacked-map image can be explained by a single common state. Taking the ratio proves the formula. The number of source preimages per output is constant, giving the source tuple formula.

This is elementary standard finite-dimensional linear algebra applied to these Asolaria maps, not a newly discovered law of mathematics. Crucially, it models **blind independent source mismatches**, NOT optimized adversarial forgeries or actual physical custody.

## Preregistered results

The prediction and controls were preregistered in PR branch commit b04cc32b32a79dc2559ecdac26a90fcacafc50e4, prior to this result.

- Exhaustive small n=4 oracle: A preserves bits 0–1, B preserves 1–3, and C preserves 0,2,3. Ranks 2,3,3; stacked rank 4. Exactly **128 / 256** source pairs and **256 / 4096** source triples are consistent. Matches 2^-1 and 2^-4.
- Original n=81 frozen laws: A=CA150 (rank 79), plus five distinct rank-80 operators CA90, CA60, CA102, TAP1, TAP4. TAP0 is excluded because it duplicates CA60. At horizons 1, 10^13, 10^13+1, and 10^13+81, all **20** A/B combinations and **40** A/B/C triples have stacked rank 81.
- Two views: 79+80-81 = **78** independent cross-source consistency constraints, and blind false consistency 2^-78.
- Three views: 79+80+80-81 = **158** independent constraints, and blind false consistency 2^-158.

## Adversarial tests — all 30,560 exact checks

Each of the 40 triples is checked on 191 frozen source states, with four arms:

1. Honest triple (A x, B x, C x): **7,640/7,640** recovers x.
2. Selected inconsistent B-source substitution with C honest: **7,640/7,640** rejected by the stacked image check.
3. Nonzero A-kernel k_A: (A x, B(x XOR k_A), C(x XOR k_A)) is consistent with a **different** common state x XOR k_A: **7,640/7,640** accepted as the wrong original.
4. Nonzero B-kernel k_B: (A x, B(x XOR k_B), C x) has **identical observable bytes** to an honest triple although the B source changed: **7,640/7,640** invisible source substitutions.

Sample horizon-1 kernels for CA150/CA90/CA60: k_A = 0db6db6db6db6db6db6db; k_B = 1ffffffffffffffffffff.

The Python cyclic-polynomial method and **independently written Node 81-column matrix method** generated identical full **5,906,257-byte** HBP traces, SHA-256:

    6bfeccf834d67440e6864039b53767205cf1a85678e05f6f99c89b83ce3b4156

The published summary HBP and JSON are separate checksum-sealed artifacts; each has its own SHA. The independently run CI job is a separate promotion requirement.

## Implications for N-Nest + Q-PRISM integration Issue #29

Mathematical cross-view agreement reduces random inconsistency but does not authenticate **who provided an observation**. A malicious source that submits internally consistent fake inputs can get a mathematically green response. N-Nest recursive child gating faithfully propagates the outcome of the watcher's validation but cannot manufacture authenticity if the watcher recomputes only untrusted inputs.

An executable end-to-end adapter needs explicit, *separate* fields for mathematical consistency versus authenticated provenance. The latter must remain false unless independently checkable custody, authenticated signatures or equivalent appropriately trusted source attestation exists. The required next controls include compromised watcher, forged score, swapped source, identical-source copying, broken consent and missing retained information.

No software model here demonstrates physical neural control, quantum physics, gravity, FTL communication, novel physical hardware, or free information.

## Reproduce

1. Python: python experiments/seat3/seat3_crossview_entropy.py experiments/seat1/TRIAD-27-CHALLENGE-20261014.json python.hbp python.json
2. Node: node experiments/seat3/seat3_crossview_entropy_node.js experiments/seat1/TRIAD-27-CHALLENGE-20261014.json node.hbp node.json
3. Verify: python experiments/seat3/verify_crossview_entropy.py python.hbp node.hbp python.json node.json stones/2026-10-15-rainbow81

The frozen input SHA-256 is e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b. Workflow: .github/workflows/seat3-crossview-consistency-entropy.yml. Runs both languages on Ubuntu/Windows × Python 3.11/3.13, Node 22. No external Python dependencies.

## Follow-on falsifiable math problems

**A. Optimal view selection per compute budget.** Choose the smallest-cost subset of digital views that meets full source rank and maximizes cross-source consistency constraints. Use exhaustive enumeration for small sets and prove bounds for larger sets.

**B. Byzantine watcher limits.** Give a theorem specifying precisely which trusted data and independent recomputation assumptions make N-Nest apex-green impossible after a bad child. Construct false-green counterexamples when report and watcher share corrupted inputs.

**C. Error-tolerant decoding.** Determine when a noisy multi-view observation has a unique original within a preregistered bit-flip budget, including honest false-rejection rates and exact minimum distances.

**D. Auditable pipelines.** Test whether these controls catch accidental file corruption, model-output misattribution and untrusted recomputation in distributed AI and biomedical data handling. Such applications would require separate system-specific validation.
