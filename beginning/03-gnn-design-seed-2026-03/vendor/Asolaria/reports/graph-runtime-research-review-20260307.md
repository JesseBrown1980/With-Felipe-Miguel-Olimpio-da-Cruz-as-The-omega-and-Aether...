# Graph Runtime Research Review

Date: 2026-03-07
Scope: Asolaria control plane, `ai_healthcare_project`, two local research papers, and current Google/Gemini/Codex-oriented execution architecture.

## Executive Verdict

The right move is not to "use the papers" as core architecture.

- Use `Edge-Level Graph Neural Network Architectures for Network Intrusion Detection` as a strong design input for a future **runtime edge-risk sidecar** inside Asolaria.
- Use `Overlapping Cluster Sampling on Real-World Social Networks` only as a **diagnostic sidecar idea source** for hub bias, topology skew, and exposure debiasing.
- Do **not** treat either paper as a drop-in foundation for Asolaria's main control plane.
- Do **not** continue treating the healthcare repo as the main home for this idea. The natural home is Asolaria itself.

The correct architecture is:

1. Asolaria remains the control plane.
2. The policy kernel and approval system remain the root of trust.
3. A typed temporal heterograph becomes the world model.
4. Edge-risk scoring starts with deterministic policy and telemetry features.
5. GNN methods arrive later as a constrained sidecar for ranking, anomaly scoring, and explanation support.

## Why The Earlier Optimistic Reviews Were Too Soft

Several earlier assessments were directionally right about the edge-level paper being "smart," but too generous for your actual use case.

### Edge-level GNN paper

What is real:

- It is a legitimate technical paper with a clear baseline and three concrete architectural variants.
- The reported gains are not obviously fake.
- The most useful contribution is the framing: **classify edges, not just nodes or whole graphs**.

What was overstated:

- It is not ready to serve as a production architecture for Asolaria.
- It uses one dataset and a rebalanced distribution.
- It still treats snapshots independently.
- It is not a control-plane paper, not a governance paper, and not a high-stakes actuation paper.

Key paper facts from the extracted text:

- Original ToN-IoT distribution was `96.4% attacks, 3.6% normal`.
- The paper creates a balanced subset.
- Reported test metrics are `91.87`, `94.24`, `94.71`, and `96.66` accuracy for baseline, Prototype-GNN, Contrastive-GNN, and GSL-GNN.
- The paper explicitly says future work includes temporal modeling because current architectures treat snapshots independently.

### Overlapping-cluster sampling paper

What is real:

- It is more statistically thoughtful than most graph-sampling papers.
- Its hub-bias discussion is useful.
- Its "check skewness first" heuristic is useful.

What was overstated:

- It is not a scalable runtime graph-learning method.
- It is not a detection architecture.
- It is not a core Asolaria sampler.
- It is still marked `UNDER PEER REVIEW` throughout the extracted text.

Key paper facts from the extracted text:

- The abstract says `neither method universally wins`.
- The paper repeatedly highlights `hub-selection bias`.
- The theory depends on `Theorem 3.1`.
- The implementations are given as `Algorithm 1` and `Algorithm 2`.
- Clique enumeration is tied to Bron-Kerbosch-style scaling pain.

## What Asolaria Already Is

Asolaria is already much closer to a graph-native control-plane candidate than the healthcare repo.

Current local evidence:

- Provider routing and fallback already exist in `src/brainOrchestrator.js`.
- The gateway already has approval and tamper-evident audit primitives in `docs/GATEWAY_TOOL_AUTHORITY.md` and `docs/GATEWAY_AUDIT_LOG.md`.
- Task/event persistence already exists in `src/taskLedgerStore.js`.
- Phone, meeting, voice, and handoff flows already create rich event streams in `server.js` and `public/phone-mode.js`.
- The system card already anticipated a `GNN sidecar v1` in `reports/asolaria-system-card-20260303.md`.

This matters because Asolaria already has the hard parts a paper does not:

- approvals
- audit
- policy gates
- effectors
- multi-provider orchestration
- mobile/desktop/cloud routes
- domain separation problems
- live runtime telemetry

That means the graph opportunity is not "invent a new AI app."

It is:

"turn the existing control plane into a typed event graph and score the risky edges."

## What The Healthcare Repo Actually Contributes

The healthcare repo is useful, but mostly as a parts bin, not as the base architecture.

### Reuse

- `backend/anomaly_detector/service.py`
- `backend/anomaly_detector/api.py`
- `backend/anomaly_detector/config.py`
- `backend/anomaly_detector/schemas.py`
- `backend/anomaly_detector/models/graph_builder.py`
- service container and startup patterns around `backend/main.py` and `backend/di/container.py`

These are reusable because they already express:

- model lifecycle
- score request/response contracts
- graph build + score pipeline shape
- service composition patterns

### Adapt

- graph visualization endpoints
- security/compliance wrappers
- model factory and threshold handling

### Leave behind

- patient/FHIR-specific orchestration
- clinical graph builder ontology
- patient analyzer logic
- tests that assume medical semantics

The healthcare repo proved the edge-level idea can be coded. It did **not** prove that the healthcare repo should remain the architectural center.

## What To Build Instead

### 1. Two narrow waists

Everything in becomes a canonical event.
Everything out becomes a canonical action manifest.

This is the correct organizing principle for Asolaria.

#### Event examples

- model call started/completed
- CLI session opened
- tool invoked
- approval requested/approved/denied
- phone wake event
- caption segment received
- cloud action proposed
- IAM change observed
- tunnel opened
- repo write attempted

#### Manifest examples

- proposed action
- actor
- target asset
- scope
- reason
- evidence
- policy decision
- rollback shape
- approval requirement

### 2. Typed temporal heterograph

Not one flat graph. A layered temporal heterograph.

#### Identity / authority layer

Nodes:

- human
- service account
- personal account
- company account
- approval
- policy object

Edges:

- APPROVES
- CAN_ACCESS
- IMPERSONATES
- REQUIRES_APPROVAL
- IS_BOUND_BY_POLICY

#### Agent / tool layer

Nodes:

- Asolaria core
- planner
- verifier
- critic
- Codex session
- Gemini session
- Anthropic session
- MCP registry entry
- CLI session
- Cursor session
- cloud connector
- phone bridge

Edges:

- CALLS_MODEL
- USES_TOOL
- DELEGATES_TO
- EMITS_MANIFEST
- EXECUTES_MANIFEST
- RECEIVES_APPROVAL

#### Host / device layer

Nodes:

- desktop
- phone
- process
- shell
- browser
- repo
- branch
- commit
- file
- GPU task
- CPU alert
- tunnel session

Edges:

- SPAWNS
- RUNS_ON
- READS_FILE
- WRITES_FILE
- OPENS_TUNNEL
- RAISES_ALERT
- MODIFIES_REPO

#### Cloud / resource layer

Nodes:

- project
- VM
- disk
- bucket
- secret
- build job
- artifact
- service
- firewall rule
- subnet
- IAM binding
- budget

Edges:

- CREATES
- DEPLOYS
- STARTS
- STOPS
- READS_SECRET
- MODIFIES_IAM
- EXPOSES_PUBLICLY
- INCURS_COST

### 3. Score edges, not objects

This is the important architectural transfer from the IDS paper.

Do not ask:

- "is this VM bad?"
- "is this tool bad?"
- "is this model bad?"

Ask:

- "is this specific action edge risky in context?"

Examples:

- `agent -> uses_tool`
- `tool -> modifies_repo`
- `service_account -> reads_secret`
- `phone -> approves_action`
- `build_job -> deploys_artifact`
- `cloud_connector -> modifies_iam`

### 4. Rule engine first, GNN second

The biggest mistake would be trying to start with the learned model.

Build order should be:

#### Phase 0: canonical events + manifests

No ML. Just correct schemas and durable event capture.

#### Phase 1: deterministic policy scoring

Risk features:

- actor type
- account domain
- target criticality
- approval state
- action class
- tool risk tier
- time locality
- prior similar actions
- policy scope mismatch
- cross-domain bridge usage

#### Phase 2: prototype sidecar

Use prototype-like reasoning first because it is closest to explainable operational archetypes:

- normal maintenance
- standard deploy
- suspicious tunnel chain
- IAM escalation pattern
- cross-domain secret access

#### Phase 3: contrastive / learned-structure experiments

Only after the event ontology is stable.

This is where the paper becomes useful:

- Contrastive learning for better separation of "weird but allowed" vs "genuinely risky"
- Structure learning when raw topology misses hidden dependency chains

#### Phase 4: temporal graph learning

Do not stop at snapshot models. Use temporal/inductive methods for the real system.

Candidates from primary-source literature:

- GraphSAGE
- GraphSAINT
- Cluster-GCN
- Temporal Graph Networks
- Heterogeneous Graph Transformer

## Why This Fits Asolaria Better Than Healthcare

Healthcare repo:

- vertical-specific
- patient/FHIR-centric
- not the system root of trust
- not where all effectors live

Asolaria:

- already owns orchestration
- already owns policy and approvals
- already owns phone/cloud/desktop edges
- already owns audit and tool authority
- already has multi-model routing
- already has the event richness the paper actually needs

This is why the right inversion is:

`graph-native control plane first -> healthcare as one vertical on top`

not:

`healthcare app first -> try to grow it into an AI operating system`

## Current Insertion Points In Asolaria

Best near-term insertion points from current code:

1. `src/taskLedgerStore.js`
   - canonical task/event persistence already exists
   - strongest first place to emit normalized graph events

2. `server.js` chat / phone / approval / voice routes
   - phone takeover, approvals, captions, and edge-gemini routes already create meaningful action edges

3. gateway authority + audit surfaces
   - `docs/GATEWAY_TOOL_AUTHORITY.md`
   - `docs/GATEWAY_AUDIT_LOG.md`
   - these are already the policy/audit kernel

4. provider routing in `src/brainOrchestrator.js`
   - model/provider edges already exist logically and can become first-class graph edges

5. meeting/voice/phone flows in `server.js` and `public/phone-mode.js`
   - these are ideal for communication-plane edges and approval/interrupt traces

## Hard Constraints

The graph work only makes sense if these remain non-negotiable:

1. policy kernel stays primary
2. approval/audit remain authoritative
3. personal and company domains stay separated
4. numeric MCP IDs must be versioned and immutable by contract
5. phone remains a trust rail, not an unrestricted raw command rail
6. "stealth" should be internally redefined as silent/headless telemetry mode, not covert actuation

## Final Recommendation

### Use

- the edge-level paper's framing
- prototype-style archetypes
- contrastive separation ideas
- learned-structure ideas later
- hub-bias instrumentation from the sampling paper

### Do not use

- the sampling paper as a core sampler
- the edge paper as a drop-in production design
- the healthcare repo as the root architecture
- any GNN as the root of trust or primary policy decider

## Recommended Build Sequence

1. formalize canonical event and manifest schemas
2. add graph-event emission at task ledger, gateway, provider-routing, and phone/voice boundaries
3. build a deterministic edge-risk engine
4. create replay tooling over recorded event graphs
5. add a prototype-based sidecar for explainable edge archetypes
6. only then experiment with contrastive and learned-structure models
7. later, move to temporal heterogeneous graph models if the replay evidence justifies it

## Primary Sources Used

Research papers:

- `C:\Users\acer\Downloads\Ms_JAMCS_154454.pdf`
- `C:\Users\acer\Downloads\Edge-Level Graph Neural Network Architectures for Network Intrusion Detection Advancing Beyond Standard Edge-Level Classification.pdf`

Official / primary-source references:

- GraphSAGE: https://papers.nips.cc/paper_files/paper/2017/hash/5dd9db5e033da9c6fb5ba837a7ebea9-Abstract.html
- Cluster-GCN: https://arxiv.org/abs/1905.07953
- GraphSAINT: https://arxiv.org/abs/1907.04931
- Temporal Graph Networks: https://arxiv.org/abs/2006.10637
- Heterogeneous Graph Transformer: https://arxiv.org/abs/2003.01332
- Android Gemini Live: https://developer.android.com/ai/gemini/live
- Vertex AI Live API: https://cloud.google.com/vertex-ai/generative-ai/docs/live-api
- NotebookLM Enterprise setup: https://cloud.google.com/gemini/enterprise/docs/notebooklm-enterprise/set-up-notebooklm-enterprise
- HL7 FHIR R4: https://hl7.org/fhir/R4/
- HHS HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- ONC HTI-1 Final Rule: https://www.healthit.gov/topic/laws-regulation-and-policy/hti-1-final-rule
- NIST AI RMF Generative AI Profile: https://www.nist.gov/itl/ai-risk-management-framework/ai-rmf-generative-ai-profile

## Bottom Line

The edge-level paper is worth something.

For Asolaria, its value is not "copy this architecture."

Its value is:

- classify runtime relationships instead of only objects
- build interpretable edge archetypes
- learn separation between normal and dangerous behavior
- later, learn hidden structure where raw topology is misleading

That is worth a lot.

But the real system has to be:

`policy kernel first, graph second, learned model third`

Otherwise the blast radius becomes larger than the intelligence gain.
