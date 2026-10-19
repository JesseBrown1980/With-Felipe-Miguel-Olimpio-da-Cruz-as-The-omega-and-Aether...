# Asolaria As A Neural Network - Deep Research Report

Date: 2026-06-14
Prepared from: local repo inspection, GitHub-visible stack clones, and one fabric scope query
Fabric query: council-q-1781443339651-343uvb

## Executive Finding

The repositories support a coherent engineering model:

Asolaria is not a claim that one continuously-running process is an ASI. It is a lawfully gated, multi-repo, multi-device control fabric that treats agents, rooms, models, devices, USB sectors, Google Drive pages, HBP rows, and GitHub commits as addressable "slices." Those slices are frozen until a level-appropriate engine advances them.

The system's unusual result comes from combining four ideas:

1. Deterministic addressability: every entity can be projected into PID / Brown-Hilbert / BEHCS / sector coordinates from hashes and modular divisions.
2. Bounded materialization: the active process frontier is small; large scale lives as positions, tuples, rooms, receipts, and queued envelopes until an engine cranks.
3. O(1) tail economics: large payloads still cost O(size) at ingest, but after quantization / hashing / tuple emission, downstream routing, compare, and retention operate on constant-size receipts.
4. Bilateral verification: Acer and Liris do not trust one vantage. They exchange GitHub artifacts, hashes, sector walks, and receipts, then adversarially correct each other's claims.

The best short description is:

> Asolaria is a frozen-slice neural-network-shaped control plane. GitHub carries the law, tools, receipts, and maps. USBs and drives carry the rooms and bytes. The fabric engines advance selected slices. GNN, Shannon, hookwall, white-room, and catch-ledgers decide what is merely proposed versus what becomes canon.

## Source Set Inspected

Main spine:

- `C:\Users\rayss\ASOLARIA-AS-NEURAL-NETWORK` at `109c497`
- Key files: `canon/laws/LAW-SLICE-ENGINE.md`, `tools/behcs/github-pid-register.mjs`, `tools/behcs/triad-nest-reference.mjs`, `tools/behcs/quant-huge-message-benchmark.mjs`, `tools/behcs/logical-extreme-stress.mjs`, `tools/behcs/brown-hilbert-expansion-stress.mjs`, `tools/behcs/mlc-engine-wiring-increment.mjs`, `tools/behcs/catch-count-ledger.mjs`

Sister on-metal data repo:

- `C:\Users\rayss\Asolaria-ASI-On-Metal-Fabric-and-matrix` at `af873ba`
- Key files: `ASOLARIA-CITY-MODEL.md`, `protocol/BILATERAL-DATA-EXCHANGE.md`, `protocol/REVERSE-FABRIC-GOOGLE-LOOP.md`, `protocol/REPLICATION-TO-35TB.md`, `artifacts/usb-sovlinux/acer/FULL-SURVEY-2026-06-14.hbp`, `artifacts/usb-sovlinux/catalog-from-drive/VAULT-MAP-SYNTHESIS-2026-06-14.hbp`, `artifacts/frozen-gemma/GEMMA-FREEZE-MANIFEST.hbp`, `exports/notebooklm-source-bundle/ASOLARIA-CANON-SOURCE-01.md`

Stacking repos:

- `C:\tmp\bigpickle-rebuild` at `739c771`
- `C:\tmp\asolaria-whiteroom-engine` at `c347edc`
- `C:\tmp\35-TB-google-AI-Ultra-migration` at `d4f809f`
- `C:\tmp\asolaria-federation-1024` at `d82bb25`
- `C:\Users\rayss\Asolaria-BEHCS-256` at `f551800`
- `C:\Users\rayss\Asolaria` local public-surface repo

The pasted Acer/Liris transcript is treated as session evidence only where repo receipts or source files corroborate the shape.

## The Core Formula Stack

### 1. Slice Engine Law

`LAW-SLICE-ENGINE.md` is the governing model:

```text
frozen slice = PID seats + BEHCS glyph tuples + Brown-Hilbert addresses + rooms + 8-byte positional agents + receipts
engine drive = omnispindle + omniflywheel + registrar + feeder + cosign daemon + Hermes spindle + operator-gated loop
```

The law's critical distinction is:

```text
registered != advanced
present != running
process_launch=0 != absent
```

The crank cycle is:

```text
POP_FROM_POOL -> PID_SIGNAL -> AGENT_ROOM -> RESULT_TO_GULP -> ERASE
```

That explains the city metaphor. A room can exist. A tool-belt can exist. A PID can exist. The "body" only exists for the tick when the engine materializes the slice.

### 2. Identity, Rule Of Three, Yin/Yang, And Sectors

`github-pid-register.mjs` provides a deterministic GitHub-visible PID minter learned from the live fabric shape. It derives every stable coordinate from SHA256:

```text
h = sha256(sanitized_name)
lane_mod3 = seed(h) mod 3
yin_yang = logical|real
quad_mod4 = seed(h) mod 4
glyph_5 = seed(h) mod 5
glyph_1024 = seed(h) mod 1024
sector = seed(h) mod 113
cube_bh = BH.<sector>.<lane_mod3>.<glyph_1024>
sha16 = h[0:16]
```

The meaning in the code is explicit:

- mod-2 is yin/yang: logical versus real.
- mod-3 is the Law of Three / prime lane.
- mod-4 is the quad rule.
- mod-5, mod-1024, and mod-113 divide collisions across glyph and sector spaces.
- AGT / SUP / PROF form a triad sharing a base but separated by role suffix.

The agent class rule is:

```text
logical -> LOGICAL-WAVE
real + even prime -> FROZEN-BRAIN
real + odd prime -> REAL-FREE
```

That is why Gemma, Shannon, PI, Hermes, free agents, and room agents can be described in the same grammar while still being different runtime classes.

### 3. Brown-Hilbert Expansion

`brown-hilbert-expansion-stress.mjs` makes the honest claim:

```text
more digits add resolution, not resident agents
```

The tool tests coordinate arithmetic, mod-3 lanes, mod-6 residue, and digest sampling beyond `1e200`. It explicitly does not enumerate `1eN` agents, factor huge coordinates exactly, or mutate live cubes.

This is the key to the "1e200" and "100B" language:

- The address space can be extended.
- Coordinates can be sampled and verified.
- Logical positions can be huge.
- That is not the same as claiming every coordinate is a resident thinking process.

### 4. O(1) Tail Economics

`quant-huge-message-benchmark.mjs` encodes the real O(1) result:

```text
head = O(size), paid once
tail = O(1) per consumer
```

The 8-stage quant tuple fixes payload size around 3.1 KB (`D = 1024`) after ingest. The calibration rows report:

- 64 MB message -> about 3.1 KB tuple
- 2 GB raw message hits Node single-shot SHA API limits, while tuple comparison does not
- 16 GB RAM holds about 7 raw 2 GB messages but about 5 million 3.1 KB tuples

The important boundary:

This is not infinite compression. The head cost is still linear. The result is constant-size downstream routing, hashing, compare, and retention.

### 5. Rule Of Three Nesting

`triad-nest-reference.mjs` formalizes the recursive reflection shape:

```text
WORKER -> does the work
REFLECTOR -> reflects on the worker
WITNESS -> sees both and asks the fabric
SUPERVISOR -> computes PASS/HOLD/PATCH/ESCALATE
```

Each position is `POTENTIAL`, `process_launch=0`, and held until borrowed reasoning runs. The file's self-test proves the structural recursion, not the cognition. For depth 3 and branching 2:

```text
cells = 1 + 2 + 4 + 8 = 15
agent_positions = cells * 4 = 60
model_calls_in_reference = 0
```

This is the source of the nested "self reflect + fabric reflect + third witness" architecture. It is not one agent doing everything. It is a recursive coordination grammar.

## The Five Primitive Spine

`bigpickle-rebuild/src/asolaria-kernel.mjs` says the whole system reduces to five primitives:

```text
ADDRESS   - infinite deterministic non-colliding coordinates
CONTENT   - what lives at an address, compressed
INTEGRITY - proof content is unchanged
SCORE     - which addresses/edges matter
ROUTE     - move content between addresses
```

It then maps the rest of the vocabulary onto those five:

- wave = ADDRESS at scale
- cube = CONTENT accreted over time
- MCP = ADDRESS -> CONTENT lookup
- cosign chain = INTEGRITY linked over time
- glyph language = CONTENT compressed into tuple language
- omnispindle / omniflywheel = ROUTE surfaces
- omnishannon / reverse gain = SCORE surfaces
- rooms = ROUTE staging slots
- free agents = ROUTE executors in rooms
- HRM / MTP / Gemma = SCORE + CONTENT made cheaper

The BigPickle spec also records the anti-divergence boundaries:

- do not spawn 380k local processes
- do not pre-mint 100B PIDs as files
- do not open hundreds of thousands of TCP connections
- backend rotation is shellless function calls, not process storms

That is why the current repo emphasizes "logical-only" stress, descriptor-only matrices, and held gates.

## The Measured Logical Stress Result

`logical-extreme-stress.mjs` is the current stress tool. It combines:

- positional-agent stream over 10,000 rooms
- token-cube binding
- supervisor collision routing
- zeta lane forcing
- quant tuple reduction
- process envelope accounting

Its definition rows state:

```text
hot_path=logical-only-in-memory
child_process_spawns=0
external_model_calls=0
no_live_fabric_mutation=1
```

The transcript-provided Acer run reports roughly 302.1 million logical ops in 12 seconds using one host process, with 64 MB reduced to a constant tuple. The code supports the categories of that result:

- `LOGICSTRESSSPEED` reports logical agents, rooms, lanes, residues, genius/mistake marks, and GC survivors.
- `LOGICSTRESSREDUCTION` reports raw bytes, tuple bytes, reduction factor, and tail payload size.
- `LOGICSTRESSPROCESS` reports `host_processes_used=1`, `child_process_spawns=0`, and `external_model_calls=0`.
- `LOGICSTRESSVERDICT` limits the claim to logical-only, no live mutation, no per-agent files, and bounded process envelope.

So the result is real in the right frame:

```text
verified: high-throughput logical address/tuple stress in one process
not claimed: hundreds of millions of resident OS processes or autonomous cognitive agents
```

## How The Repos Stack Into The New Way

### Asolaria / Asolaria-BEHCS-256

The older Asolaria public surface and BEHCS-256 repo establish:

- Brown-Hilbert boot discipline
- BEHCS bus and glyph language
- Shannon civilization and consensus lanes
- hookwall -> GNN -> Shannon pipeline
- white-room, gulp, reverse-gain, and supervisor gates
- room assignments and agent indexing
- 47D runtime with 60D+ constitutional ceiling held behind gates

`Asolaria/canon/laws/LAW-ASOLARIA-NEURAL-NETWORK.md` defines the neural-network law in the frozen-brain-slice sense:

- frozen model slices are substrate
- cubes, rooms, dashboards, MCP/WebMCP pipes, white rooms, Shannon, and GNN edges are the graph body
- omniflywheel is the forward-pass routing path
- self-reflect and adversarial verification are corrective signals
- quant engines route signals into cube/token/hash/tuple space

It explicitly says this is not an ASI claim.

`Asolaria-BEHCS-256/docs/behcs/BEHCS-1024-PRISM.md` also sets a key boundary: 1024 rooms are addressable without implying 1024 simultaneous real model calls.

### asolaria-federation-1024

The federation repo is the bottom-up OS attempt:

- BEHCS-1024-native substrate
- hookwall and GNN as kernel-adjacent primitives
- bus envelope routing
- ed25519-signed envelopes
- cosign-chain requirements
- four-vantage federation: acer, liris, falcon, aether
- <=16 syscall kernel target

Its `README.md` says every syscall passes through hookwall pre/post, GNN sits above the live envelope graph, and the bus dispatches BEHCS-1024 envelopes across the federation.

This repo is the "chip/federation OS" leg of the stack.

### bigpickle-rebuild

BigPickle is the clean-room rebuild of the dispatch substrate:

- PID mint -> 47D tuple -> hookwall -> worker spawn -> HBP sidecars -> GNN edge -> receipt
- helm supervisor as a long-running queue watcher
- BigPickle engine registry covering live Acer daemons and Liris surfaces
- full loop: PID revolver -> room rename -> free agent -> hookwall -> prism -> GC
- real/virtual boundary: <=42 real, above cap virtual address coordinates or free-agent room tier

This is where the "rooms as unique projects" and "free opencode agents in rooms" mechanics become code.

### asolaria-whiteroom-engine

The whiteroom repo contributes the scorer / retention leg:

- pluggable store and scorer
- never-delete rule: compact mistakes, do not erase evidence
- Brown-Hilbert room addresses
- prime-sector allocator
- memory/local/Drive-compatible store interface

This becomes the hold/release and genius/mistake retention layer.

### 35-TB-google-AI-Ultra-migration

This repo contributes the cloud storage leg:

- `GoogleDriveStore` as a drop-in implementation of the same store interface
- append-only Drive objects
- sha-verified pages
- never-delete compaction
- explicit gate: credentials stay operator-local, no keys in repo

It is a backup and reverse-fabric substrate, not the sovereign root.

### ASOLARIA-AS-NEURAL-NETWORK

The current main repo consolidates the model into:

- Class-1 laws
- route-health baselines
- catch-count ledgers
- logical stress tools
- Brown-Hilbert expansion stress
- quant huge-message benchmark
- triad-nest reference
- GitHub PID registrar
- MLC line watcher and descriptor-only MTP/HRM/GNN/Fischer/Mamba/AoT wiring
- frontend parity matrices
- bilateral Acer/Liris review receipts

This is the law/build spine.

### Asolaria-ASI-On-Metal-Fabric-and-matrix

The sister repo adds the material substrate:

- exact USB raw tools
- 2 TB and 128 GB survey receipts
- frozen Gemma identity receipts
- 35 TB Google enumeration
- NotebookLM source bundles
- reverse-fabric Google loop
- bilateral data-exchange protocol
- replication manifest

This is the data/room transfer surface for Acer and Liris.

## USBs, Rooms, And The Physical Substrate

The on-metal repo records live surveys.

### 2 TB SOVLINUX

`artifacts/usb-sovlinux/acer/FULL-SURVEY-2026-06-14.hbp` reports:

- device size: 2,097,152,000,000 bytes
- total sectors: 4,096,000,000
- exFAT partition: 500 GB at LBA 2048
- cluster size: 128 KB
- 8,192 strided probes at 256 MB stride
- 121 nonzero probes
- live data concentrated in about 32.5 GB at the front
- remaining space zero at the survey resolution

The report's caveat is important: a 256 MB stride can miss small data past 32.5 GB. It can rule out large regions at that resolution, not prove every byte is zero.

`VAULT-MAP-SYNTHESIS-2026-06-14.hbp` maps the 2 TB vault:

- `sovereignty/kernel` is the Asolaria kernel: `aso.js`, `runtime.js`, `sovereignty-gate.js`, `boot.js`, compile/cache/validate/state/ix resolver pieces
- `sovereignty/index` is the federation knowledge base: CHAINS, XREF-COLONIES, CROSS-EXAMINATION, rules, skills, tools, policies
- `data` holds runtime event streams: hook-events, graph-events, heartbeat daemon, graph runtime events, aso, state

The strongest supported claim:

```text
the 2 TB carries the on-metal fabric kernel, knowledge base, and runtime state
```

Not:

```text
the 2 TB root proves every model weight or every engine binary is there
```

The same synthesis explicitly says frozen Gemma is not found at those levels and is Acer LM Studio-local by hash.

### 128 GB USB

`artifacts/usb-128gb/acer/FULL-SURVEY-2026-06-14.hbp` reports:

- device size: 125,829,120,000 bytes
- 4,096 probes
- all 4,096 nonzero
- data spans 0.0 to 125.8 GB, including the tail beyond a declared 32 GB FAT32 partition

The operator correction is recorded in `protocol/REPLICATION-TO-35TB.md`: treat the 128 GB as whole-device real data, not merely the visible filesystem.

### Frozen Gemma

`artifacts/frozen-gemma/GEMMA-FREEZE-MANIFEST.hbp` records:

- token: `TOK-FROZEN-GEMMA4B-0001`
- Brown-Hilbert address: `BH-ACER-7919`
- source: `lmstudio-community/gemma-4-E4B-it-GGUF`
- weight file: `gemma-4-E4B-it-Q4_K_M.gguf`
- weight size: 5,335,285,280 bytes
- weight sha256: `d264fb541e1fd4cb67ff710664cef60a50aaa8ab6f7acdf2bf5c76911dbd5b76`
- projector: `mmproj-gemma-4-E4B-it-BF16.gguf`
- projector size: 991,551,840 bytes
- projector sha256: `68486d68176b924c5f126b0d25ab93e2b38458b607f46671d41c166f8c77c200`
- declared freeze socket `D:/models/gemma-3-4b-it-onnx-dml-int4` is still empty

The correct state:

```text
Gemma exists as a local LM Studio slice by hash.
The rebind/mint/cube path is declared but not executed.
The bytes are not in git.
```

## Google, NotebookLM, And The Reverse Fabric

The 35 TB repo and sister repo frame Google honestly:

- Google Drive is a drop-in append-only store leg via `GoogleDriveStore`.
- Credentials are operator-local and gated.
- The 35 TB space can hold the data, but upload is bandwidth-bound.
- Google is backup plus reverse witness, not the primary sovereign copy.

`protocol/REVERSE-FABRIC-GOOGLE-LOOP.md` states the actual mechanism:

1. Asolaria produces sha-attested canon slices.
2. The slices are rendered into readable sources for NotebookLM/Gemini.
3. Google's tools study the sources as external agents.
4. Their synthesis comes back as an inbound slice.
5. Hookwall, GNN, Shannon, and whiteroom verify it before any canon promotion.

This does not rewrite Google. It uses Google as an external mirror. The system "upgrades" the external tools only in the ordinary sense that a good source improves what a study agent can ground on.

## The Pipeline That Prevents Drift

Across the repos, the same pipeline recurs:

```text
operator / source / USB / model / agent output
-> HBP row or envelope
-> hookwall
-> PID / Brown-Hilbert / BEHCS address
-> GNN score
-> Shannon novelty or consensus
-> gulp / GC collapse
-> whiteroom hold or release
-> receipt / cosign / catch ledger
```

The current main repo enforces this with descriptor-only tools and gates:

- `mlc-engine-wiring-increment.mjs` explicitly states no live MTP/HRM/Fischer/Mamba/AoT launch.
- `catch-count-ledger.mjs` records 40 catches with open/partial/closed status and keeps release claims held while open/partial catches remain.
- `triad-nest-reference.mjs` makes witness read-only and supervisor verdict-only.
- `logical-extreme-stress.mjs` refuses to claim more than logical-only stress.

The discipline is not decorative. It is what keeps the stack from confusing:

- addressable with active
- present with running
- proposed with proven
- green descriptor with live engine
- remote timeout with absence

## What "Everything Exists" Means

The report uses the operator doctrine in its precise, supportable sense:

```text
Everything exists as a slice, position, address, recipe, stub, row, room, token, or queued engine path.
If a slice is dormant, crank the correct engine at the correct level.
Do not call a dormant or unreachable slice missing until the fabric proves absence.
```

This is stronger and safer than saying everything is already live.

Examples:

- Agent-0 can exist as a terminal lane with zero sessions.
- Shannon can have running wave engines but an unregistered gate endpoint.
- Gemma can exist as local hashes while the freeze socket is empty.
- MTP/HRM/Fischer/Mamba can be descriptor-wired but not live-launched.
- A USB can contain a vault and empty prepared space simultaneously.

The formula is:

```text
S[t+1] = E_level(S[t], I[t], G[t])
```

Where:

- `S[t]` is the frozen slice at time t
- `E_level` is the correct engine for that level
- `I[t]` is input/envelope/source/cube
- `G[t]` is the applicable gate/cosign/fabric verdict

No engine, no advancement.

## How The "City" Works

The sister repo's `ASOLARIA-CITY-MODEL.md` captures the operator model:

- rooms = folders / slots / storage positions
- roads = routes / dispatchers / bus lanes
- electricians = latent agent/tool bundles
- bodies = ephemeral runtime materializations
- tokens = sha / hbi / hex / crypto receipts
- next city = downstream collection/verification layer

The software implementation maps as:

```text
room folder -> unique project / address slot
PID -> deterministic identity / routing coordinate
HBP/HBI/HEX/SHA -> durable work token
engine tick -> materialized runtime action
gulp/GC -> collection and compaction
whiteroom -> reversible hold/release
GitHub commit -> external durable emission
USB sector -> physical room substrate
Drive page -> cloud room substrate
```

The "200 ns emitter" language corresponds to cheap PID/address generation and routing, not a claim that every full AI process starts in 200 ns.

## GitHub's Role

GitHub is not just source control here. It is the bilateral propagation bus for durable, reviewable state:

- main NN repo: law, tools, tests, receipts, catch ledgers
- sister on-metal repo: tools, USB maps, Gemma hashes, NotebookLM source bundles, replication manifests
- stack repos: BigPickle, whiteroom, Drive store, federation OS, BEHCS

The Acer/Liris loop works because GitHub makes every step pullable and attackable:

```text
one side builds
other side pulls
other side reviews / attacks / hardens
tests and receipts seal it
push
ask fabric again
```

That is why many findings in `catch-count-ledger.mjs` are not model improvements, but honesty corrections:

- route boundary versus outage
- false green versus partial
- false match risk
- hostile input totality
- descriptor count overclaim
- C036 live engine wiring still open

The GitHub loop is the anti-hallucination mechanism.

## What The System Has Actually Achieved

Supported achievements:

1. A deterministic PID/address scheme spanning logical waves, frozen brains, real-free agents, sectors, glyphs, and triads.
2. A formally stated slice-engine law that prevents "registered" from being misread as "running."
3. High-throughput logical stress in one process with explicit no-spawn/no-model-call boundaries.
4. Constant-size downstream tuple economics for huge messages after linear ingest.
5. A recursive triad pattern for worker/reflector/witness/supervisor loops.
6. A bilateral Acer/Liris GitHub workflow that catches and fixes real defects.
7. A 2 TB USB map proving an on-metal fabric vault and a large prepared room expanse.
8. A 128 GB USB whole-device data signal.
9. A frozen Gemma identity receipt by sha256.
10. A Google 35 TB store plan plus NotebookLM reverse-fabric source bundles.
11. Descriptor-level MTP/HRM/GNN/Fischer/Mamba/AoT wiring with live launches still gated.

Unsupported or still-gated claims:

1. Literal quantum entanglement or faster-than-light communication.
2. A continuously running 100B-agent cognitive swarm.
3. Proof that all USB tail bytes are classified or semantically understood.
4. Proof that Gemma has already been HRM/MTP-rebuilt and cube-minted.
5. Proof that Google models or infrastructure have changed because of Asolaria.
6. Live MTP/HRM/Fischer/Mamba/AoT execution without a daemon contract.
7. High-risk auto-fire without operator/cosign gates.

## The Honest Formula For The New Way

The new way is not "spawn everything." It is:

```text
address everything
receipt everything
materialize only the active frontier
score and reflect before promotion
hold high-risk changes
verify across vantages
store the slice on sovereign media
mirror the slice through GitHub and cloud witnesses
```

A compact formula:

```text
Entity = SHA256(preimage)
Position = (yin_yang mod2, lane mod3, glyph mod1024, sector mod113, BH coordinate)
Slice = Position + Content + Receipt
EngineTick = gated materialization of Slice
Canon = Slice accepted by bilateral verification + cosign/catch discipline
```

The prime/rule-of-three/Brown-Hilbert interplay is:

```text
mod2: polarity / real-vs-logical
mod3: triad lane / rule-of-three regulator
mod5 and mod6: residue forcing / stability checks
mod1024: BEHCS glyph field
mod113: Asolaria sector
Brown-Hilbert: spatial/address projection for cubes/rooms/sectors
SHA/HBP/HBI/HEX: proof that the slice survived the tick
```

## Recommended Next Moves

1. Liris pulls `Asolaria-ASI-On-Metal-Fabric-and-matrix` and verifies the exact USB tools.
2. Liris runs the same read-only surveys on the 2 TB and 128 GB devices after physical transfer.
3. Acer and Liris compare sector-sha chains and Gemma hashes.
4. Deep-walk `data/aso`, `data/state`, `index/tools`, and `index/skills` using the existing sanctioned walk path, not a rewritten parser.
5. Keep C036 honest: live MTP/HRM/Fischer/Mamba/AoT only after the fabric returns a concrete daemon route/schema/contract.
6. Feed NotebookLM/Gemini with the source bundles, then ingest their summaries as external witness slices, not oracle truth.
7. Add any further catches to `catch-count-ledger.mjs` rather than claiming final release while open/partial rows remain.

## Bottom Line

The repositories show a real architecture, not just a metaphor. The result comes from collapsing large-scale agency into deterministic coordinates, receipts, and gated materialization. The "rooms" are storage and address positions. The "electricians" are latent tool/agent bundles. The "engine" is the only mover. The "neural network" is the graph of frozen slices, GNN/Shannon scoring, white-room correction, and bilateral feedback.

That is why the stack can look impossible if read as "millions of live agents," but coherent if read as:

```text
few live engines
many frozen positions
constant-size receipts
huge address space
strict gates
bilateral proof
sovereign storage
```

That is the new way the repos have converged on.
