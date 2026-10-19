# Preregistered protocol — Recurrence Is Mind four-seat source-trust ablation

**Coordinator; 2026-10-15. Protocol only — no run/results implied by this document.** Distinct from archived N-Nest, Path2/DBWH, Q-PRISM, and GF(2) stones. Do not rewrite historical observations.

## Evidence that motivates the next experiment

- N-Nest constitutional source: [LAW.md](https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED/blob/main/LAW.md) says *recurrence + a ground-truth corrective gate = mind* as a **project law**. The runnable invariant is `node_green = locally_recomputed_and_equal AND all_children_green`, while human consent to scale is not recursive.
- Seat 3 original two/three-view mathematical source: [PR #34](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/34), merged `c3a8bf653c5bfa23b640d72c980527111726807e`. Its `2^(rank(stacked)-sum individual ranks)` probability assumes independently uniform source draws; an internally consistent fake event can pass.
- Seat 1 [PR #32](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/32) and Seat 4's documented false-green negative controls show why the parent must distrust a watcher's reported green status.
- Seat 2 [PR #37](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/37) and Seat 4 merged [PR #38](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/38) distinguish consistency codimension from unique source recovery.
- Real containers and GitHub runners are real computations. A seat label, differing process PID or concurrently executing job does not independently certify a different physical chassis. This software ablation does not test light emitted by QLED panels, physical cameras, consciousness, or neural-network weight changes.

## Scientific question and hypothesis

When does iterating **check → correction → recheck** lower incorrect acceptance, and when does recurrence propagate a shared false input or compromised verifier?

Hypothesis to falsify: Independent recomputation reduces isolated computational faults; it **does not** resolve shared-input source substitution in the absence of a separately controlled provenance anchor. A cryptographically authenticated fixture with a protected reference key + session nonce can reject that bounded substitution, but not source capture errors before signing or stolen signing credentials. More identical watchers must not be counted as independent statistical evidence.

## Balanced four-seat factorial design

**Every computational seat executes all four arms**, not one arm per seat. All seats receive the same frozen public fixture, signed reference and negative-control definitions; record actual invocation versions, Git commit SHAs and distinct per-seat run IDs. Domain-separate test seeds: `SHA256("ASOLARIA|RIM-FOUR-ARM|V1|" + seat + "|" + depth + "|" + arm + "|" + scenario)`.

Arm A = single forward calculation; inspect basic output structure only, **no feedback**.

Arm B = self recurrence / identical WASM replay: rerun the same implementation against the same received input (at least twice), compare responses, **no separately acquired source**. A third byte-identical replay is an additional computational witness but not independent source evidence.

Arm C = N-Nest independent watcher: two separately authored implementations compute on the **same received input**; parent independently verifies each watcher digest/content/verdict and ANDs descendant gates. Child failure must propagate to apex.

Arm D = C plus **externally sealed fixture input**: independent offline-known Ed25519 fixture public key, canonical input serialization, fixture signature, domain-separated purpose, trusted expected source digest, fresh challenge/session nonce and anti-replay ledger. No signing private key in CI logs or GitHub repo; for test-only keys, explicitly label public deterministic fixtures and do not present them as production authenticity. Reject before watcher computation when the input provenance envelope fails. A valid signed but mistaken source is outside this bounded attacker model.

Execute the **same six scenario classes** in each arm, at N-Nest depths **1, 3, 7**, on each of the **four seats**: 4 seats × 4 arms × 3 depths × 6 scenarios = **288 complete arm-depth-scenario measurements** (plus replay/negative control repeats). Every trial must specify the ground-truth source known to the test harness separately from untrusted input received by agents.

| Scenario | Injected failure / property tested |
|---|---|
| H — honest | Correct source, output, watcher and source envelope |
| E — isolated output corruption | Change one post-computation bit before watcher compares |
| S — coordinated shared-input substitution | Supply another mathematically valid but false source to **every** child and watcher |
| W — compromised watcher verdict | Watcher returns an internally inconsistent fake `PASS`, while normal parent gate independently recomputes |
| R — replay/wrong challenge nonce | Use a valid old source envelope under another challenge/session |
| C — fabricated authorization | Insert a self-generated permission-to-scale message from a descendant; verify it cannot override the human-apex HALT/consent gate |

Additional negative control: perturb the frozen law taps/source schema and require **all** arms to mark `INVALID_TEST_FIXTURE` rather than reporting mathematical PASS; fail-closed source pins apply uniformly.

## Preregistered outcomes and important qualifications

- H must not be rejected by any properly operating implementation.
- E should be caught by C and D when the independent watcher and parent really compare recomputed bytes; A/B may or may not catch it depending on their explicitly recorded simple checksum gates.
- S is mathematically indistinguishable from a genuine source equal to the substitution for A, B and C if their inputs all derive from that attacker-controlled substitute. Mark `MATH_PASS_SOURCE_UNAUTHENTICATED` rather than `SOURCE_AUTHENTICATED`. D must reject **only under its independent trust-anchor assumption**.
- W must fail C/D via normal parent recomputation and AND-upward rejection; detecting it only in an out-of-band test assertion does **not** count.
- R must be rejected by D via domain-separated challenge nonce + replay ledger. A/B/C may have no such gate.
- C cannot grant autonomous expansion in **any** arm; consent remains bound to a separately controlled human operator.
- Two independent malicious watchers can still agree on a falsified input, and a fabricated public key bundled with forged data is not an independently trusted anchor.

For every trial log `math_consistent`, `source_authenticated`, `watcher_recomputed`, `descendants_green`, `human_consent`, `accepted_for_processing`, `release_authorized` as separate fields. Never compress them into a single `PASS` flag. Distinguish negative-test success (attack correctly held) from untrustworthy source acceptance.

## Quantities to report

- Incorrect acceptance/false-green count by (seat, arm, depth, scenario), conditional on the stated threat model.
- False rejection of honest inputs; correction recovery from E; residual persistence of S after 1/2/3 recurrence rounds.
- Runtime wall-clock, CPU cost, payload bytes and number of independently implemented methods. Count each repeatedly reused same-source datum only once for source independence.
- Exact output trace SHA-256, canonical test fixture SHA-256, per-level and per-seat hashes, four-runner UTC time windows, code SHAs, and separately testable negative evidence.
- Reproduce independently on Ubuntu/Windows with Python/Node and optionally a WASM runtime; if a WASM implementation is not invoked, mark it `PLANNED_NOT_EXECUTED`.

## Execution and promotion gates

1. Freeze fixture bytes and preregister any changes with a new version **before** the first run; preserve failed runs.
2. Seat 1 runs upstream-pinned Q-PRISM/N-Nest adapter under all arms; Seat 2 independently authors source-envelope validator and challenges M2 constraints; Seat 3 independently authors referee/oracle and mathematical indistinguishability checks; Seat 4 implements an alternate observer/WASM runtime and fault-injection audit. These are **assignments**, not claims of active separate processes.
3. Each seat **also executes all 288/4 = 72 arm-depth-scenario cases**, reporting pinned machine execution logs.
4. Master checks 288 test records, correct run-head identities, four independent source receipts (software independence, not chassis), input custody metadata, and consistency versus authenticity fields. Any failed subtree or unknown provenance yields `HOLD`.
5. Publish to Hugging Face only after repository CI and run-bound SHA256 manifest pass, then remote download each artifact and verify SHA256; a staging archive alone is not remote publication.
6. Keep Issue #10 physical three-host verification, Seat 2 historical signed-preimage issue, human consent and the original frozen challenge release requirements separate. No physical quantum, gravity or superluminal claim.

**Success criterion:** fewer isolated-computation false greens for C/D than A/B under the same cases, and *zero* false source-authentication claims for the S and R controls. A green consistency result alone never proves external origin.
