# 08 — GAC, GULP, HG256, crypto-capsule and the sovereignty kernel (2026-04-24 → 04-30)

Build-order step 8 of the beginning. This is the week the governance layer learns to gate the thinking
engines, the result side of the cube gets its runtime, and the system grows a sovereignty kernel of its
own. The construction window is 2026-04-24 to 04-30; the vault mechanism and the two `routes/` files are
older (2026-03-15) and are brought in here, not earlier, because the construction-gap critic's correction
reclassifies them as the vault *construction* (mechanism), not vault contents.

`vendor/Asolaria/` holds 121 files at their original paths, read from a bare mirror of all 132 refs;
`vendor/asolaria-federation-1024/` holds 1 file (the Step-27 kernel-targets spec), read from a bare clone
of that repo. Every file is byte-identical — `git hash-object --no-filters` equals the recorded blob, and
`sha256sum -c UPSTREAM.sha256` passes 122/122 (both verified). Sources are public and read-only.

## The GAC law gate and the cognitive engines (2026-04-24, commit `85cbbca`)

The GAC laws are the only files literally under a `/gac/` path. `src/gac/laws/classification-stability.js`
is `LAW-100-ga-svm-validation-and-drift`: it HALTs on GA-SVM feature-validation failure, DEFERs to the
fallback on a missing dataset hash or confidence below 0.700, calls for RETRAIN when the support-vector
ratio exceeds 0.500, and logs drift when cross-validation fitness is under 0.750. `spectral-stability.js`
/`.mjs` is the spectral-stability loop-bound law. The GAC-gated cognitive-engine adapters sit on top:
`src/cognitiveEngines/{engineRegistry,gaSvmAdapter,openmythosAdapter,runtimeBridge}.js` and the two BEHCS
contracts `src/behcs/{gaSvmGlsmFeatureManifest,openMythosSupervisionContract}.js`.

The **mythos cognitive engine** (`packages/mythos-cognitive-engine/`) is, in its own README, a "Gated
OpenMythos runtime bridge for Asolaria … a PID-bound Node wrapper around a Python glyph adapter" for the
verbs `MYTHOS_LOAD/THINK/REASON/LOOP/STATUS/DRIFT/HALT`, whose activation boundary is explicit: "Model
weights and configs are operator-provided … Runtime promotion requires a verified smoke test and GAC
approval." Weights stay operator-provided; none are here.

The **GA-SVM lane** is `packages/ga-svm-engine/` (`GASVMAdapter.mjs`, `ga.mjs`, README — "Local GA-SVM
runtime bridge … Current runtime mode: `rbf_kernel_ga_smoke_classifier`") plus the integration and smoke
tools `tools/ga-svm-behcs256-full-integration.js` and `tools/ga-svm-engine-smoke.js`. The OpenMythos
integration tools `tools/openmythos-behcs256-full-integration.js`,
`tools/openmythos-gasvm-fusion-supervisor.js` (04-24) and
`tools/asolaria-openclaw-openmythos-research-glyph-integrator.js` (04-29) complete the pair.

## GULP, HG256, the ix-fabric atlas and the deep cascade

- **GULP runtime (2026-04-24)** — `tools/behcs/behcs-gulp-runtime.js` (blob `841b916b`, the first commit
  of the runtime, 18:04), with `tools/behcs/behcs-file-cap.js`. A same-day later blob `30524de3` (23:20)
  exists and is pinned by id in PROVENANCE, not vendored. aether's later `planes/gulp-watchers` port comes
  from `packages/omni-gulp-gc`, not this 2026-04-24 runtime.
- **HG256 (2026-04-24/25)** — `src/hg256RuntimeContract.js` and the three boundary docs
  `docs/HG256_{BOUNDARY_POLICY,CYCLE_CRON_WIRING,TRANSPORT_ENVELOPE}.md`. The boundary policy is
  fail-closed and local-only and denies any glyph packet in which "secrets, tokens, keys, session ids,
  device ids, hostnames, local paths, ports, or command lines appear".
- **build-ix-fabric-atlas (2026-04-25)** — `tools/behcs/build-ix-fabric-atlas.js` with its companion
  `review-ix-fabric-atlas.js`.
- **behcs-deep-cascade-v6 and the second-cascade wave tools (2026-04-29)** —
  `tools/behcs/behcs-deep-cascade-v6.js` (82 KB), `deep-wave-all-cascades-structure-map.js`,
  `deep-wave-second-cascade-sight-pass.js`, `deep-wave-second-cascade-team-plan-summon.js`, and
  `tools/asolaria-deep-wave-v6-plus-cascade.js`, plus `docs/PUBLIC_ROLLOUT_DEEP_WAVE_SECOND_CASCADE.md`.

## crypto-capsule (2026-04-24/25)

`tools/crypto/crypto-capsule.js` (`34e05680`), `schemas/crypto/crypto-capsule.v1.schema.json`
(`777030be`), and the three PowerShell wrappers `Generate-Keypair.ps1`, `Sign-Capsule.ps1`,
`Verify-Capsule.ps1`. Code only, as the step requires: there are no key files in this set, and a scan of
`crypto-capsule.js` found no embedded key or seed material.

## The 47-byte BEHCS-256 PID minter (2026-04-29/30)

`tools/behcs/brown-hilbert-pid-cell-minter.mjs` exports "the canonical 47-byte BEHCS-256 PID encoding"
(one glyph byte per D1–D47, from sha512) and the `PID-H{hilbert}-A-W-P-N` cells; "the Hilbert ordering IS
the division of labor — no scheduler needed." `tools/behcs/big-pickle-row-schema.mjs` defines the 148-byte
BP1 binary row that carries the 47-byte PID. The forward port spec,
`vendor/asolaria-federation-1024/KERNEL_TARGETS.md` (Step 27: port to `mint_behcs1024_pid_60()`), comes
from the federation repo and dates from 2026-05-13 — the minter it specifies is 2026-04-30; the
`mint_behcs1024_pid_60` port itself does not yet exist upstream.

## Training-governance dispatches and the checkpoint reassembler (2026-04-30, commit `7991d35`)

The W9-3 / seq47 / tensor-fabric governance dispatches — ten `tools/behcs/*.mjs` scripts
(`dispatch-w9-3-*`, `fanout-w9-3-*`, `dispatch-seq47-*`, `fanout-seq47-*`,
`dispatch-fabric-consolidated-verdict-C-queue-seq47-gslgnn`,
`dispatch-liris-{corpus-manifest-and-w9-3-launch-auth,cosign-operator-approval-w9-3,leader-vote-acer-tensor-fabric-phase0}`,
`fanout-tensor-fabric-vote-shape-a`, `cosign-chain-append-acer-tensor-fabric-phase0-seq45`) — plus the
checkpoint chunk-transfer reassembler `reassemble-and-byte-verify-gslgnn-v2-checkpoint.mjs`, which pulls
six base64 chunk envelopes from the ACER inbox, concatenates them in order, checks the sha256, writes the
`.pt`, and sends a BYTE-VERIFIED ack — the record of how the trained weights crossed seats. The trainer
these govern, `services/gnn-sidecar/train_gslgnn_w9_3.py`, is already in aether. These scripts carry LAN
addresses (`192.168.100.1`) and local user paths, which the step allows.

## Liris live-GNN glue and the supervisor-registry compiler

The Liris live-GNN pipeline glue: `gnn-live-watcher.js`, `canon-to-gnn-edges.mjs` (2026-04-29),
`ingest-gnn-edges.js`, `gnn-predictions-emitter.mjs`, `gnn-score-gate.mjs`, `gnn-dispatch-bridge.mjs`,
`liris-gnn-bus-listener.mjs`, and the bilateral-roundtrip, listener-handshake and postmortem dispatches
(2026-04-30) — ten scripts. The gap item that names them says "11 mirror scripts" but enumerates ten
blobs; the ten enumerated blobs are vendored, byte-identical. `gnn-dispatch-bridge.mjs` is Liris's
skeleton bridge; ACER's completed bridge and the predictions ledger stay with the P5 handoff.
`packages/supervisor-registry/src/compile.ts` (2026-04-30, 58 KB) is "one compiler per supervisor role",
emitting BEHCS-256 sentence corpora.

## The sovereignty kernel and ix chains (2026-04-25 → 04-30)

The whole `sovereignty/` namespace — 50 files — the week the index kernel is copied into a sovereignty
boot path and given its own ix chains and runtime. It holds `sovereignty/kernel/` (the kernel:
`asoTables`, `cache`, `compile`, `inventory`, `profile`, `runtime`, `schema`, `state`, `textIds`,
`validate`, and `sovereignty-boot.js`/`sovereignty-gate.js`), `sovereignty/ix/chains/` (`fabricate`,
`link`, `mistake-learn`, `review`, `skill-extract`, `security-sweep`, `timestamp-index`, `heartbeat`,
`heartbeat-daemon`, `poll-whatsapp`, `report`) and `sovereignty/ix/grammar/`, the top-level `boot.js`,
`sovereignty-gate.js` and `runtimePaths.js`, the `sovereignty/src/` runtime (`chainbackLoop`,
`deepVoteWindow`, `gnnSiliconHeartbeat`, the `leaderStartup/` set, `projectMatrixRunner`,
`projectNeighborhoodMaterializer`, `resourceBudgetSnapshot` and more), and
`sovereignty/config/draft-promotion-policy.schema.json`. `sovereignty-boot.js` (`a038b8ba`) and
`sovereignty-gate.js` (`6b619de1`) are already in aether's `canon-archive`; they are re-vendored here,
byte-identical, so the sovereignty unit is complete at its own paths. `sovereignty/ix/chains/poll-whatsapp.js`
is a 30-second ADB screenshot-poll automation (not a conversation): it carries the owner's own device
serial, no message content and no credential.

## The vault mechanism (critic correction; 2026-03-15 blobs, commits `e8c3369`/`b49a725`)

The vault *mechanism*, as distinct from vault *contents*: `src/secureVault.js` (`17013b39`, the legacy
single vault plus the namespaced v2 vault), `src/secretHardening.js` (`4db17dcb`), `infra/vault/vault.hcl`
(`b546ff92`, a HashiCorp file-storage config on `127.0.0.1:8200`, no secret), `infra/vault/setup-connectors.ps1`,
`docs/VAULT_APPROLE_RUNBOOK.md`, `tools/Protect-AsolariaVault.ps1`, `routes/vault.js`, `routes/gatewayTokens.js`.
Each was read for secrets before vendoring; none holds a credential. The vault **contents** stay out
(held below).

## Dates, counts, held, and notes

- **Files**: 122 vendored (121 from `Asolaria`, 1 from `asolaria-federation-1024`). The GULP same-day
  variant `30524de3` is pinned by id in PROVENANCE, not vendored. **Bytes**: 1,059,902. Largest file
  82,169 B. Directory ~1.5 MB.
- **Date range (per-blob beginning)**: 2026-03-15 (vault mechanism, routes) → 2026-05-13 (the federation
  Step-27 spec); the step's own construction body is 2026-04-24 → 04-30 in the Asolaria mirror. Seven of its blobs
  (`compile.ts`, crypto-capsule and its schema, `behcs-file-cap.js`, `build-ix-fabric-atlas.js`,
  `review-ix-fabric-atlas.js`, `gnn-live-watcher.js`) were already public, byte-identical, in
  `asolaria-behcs-256` on 2026-04-20 (`5cfa3e0`, `7d1d37f`); see the last table of `PROVENANCE.md`.
- **Held** (`HELD.hbp`): none of this step's 122 vendored candidates was held — a full credential/PII scan
  found only LAN addresses and the owner's own device serial, both allowed. Recorded instead are the three
  vault **contents** that pair with the vault mechanism and stay out: `vault-secrets-map.txt`,
  `asolaria-codex-auth.json`, `trusted_vault.pb`.
- **L4 v2** is already in aether; referenced, not re-vendored.
- **Not found**: `data/behcs/laws/openmythos-gasvm-gac-laws.json`, named by the GAC-laws gap item, is
  absent from all 132 refs; the three GAC law files are self-contained and reference no external JSON.
