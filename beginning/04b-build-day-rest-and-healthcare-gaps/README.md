# 04b — The rest of the build day, and the healthcare gaps

This step closes two gaps that the wave-1 verifier found in the first four steps of the beginning. It adds files only; `01-` and `04-` are unchanged. Each part below names the wave-1 directory it completes.

Every file here is byte-identical to its source blob. Both sources are public and read-only: `JesseBrown1980/Asolaria` (read from the bare mirror of all 132 refs) and `JesseBrown1980/AI-healthCare-project` (a full clone of its 40 commits). Nothing in either repository was edited or pushed. `PROVENANCE.md` gives, for each file, the source commit and path, blob id, size, sha256, the commit that first introduced the blob, and any other aether directory that already holds the same bytes. `UPSTREAM.sha256` checks every file with `sha256sum -c` from this directory.

70 files, 719,535 bytes.

## Part (a): the rest of `e8c3369` (completes `04-build-day-2026-03-15/`)

Step 04 vendored the first commit `b49a725` and the guardian and hook lane. It recorded the full `routes/ src/ lib/ middleware/ tests/ services/` tree of the next commit, `e8c3369`, in `04-build-day-2026-03-15/pins/e8c3369-routes-src-lib-middleware-tests-services.pin.tsv`. Of that tree's 139 blobs, 74 were vendored (flag `V`) and 65 were recorded by blob only. This part vendors those 65 at their original paths under `vendor/Asolaria/`, so all 139 files of that tree are now vendored across `04-` and `04b-`.

The commit is `e8c3369dca59a2316837d438041c5067d9612c7f`, 2026-03-15 15:20:53 -03:00, the direct child of the first commit (14:41:02 the same day). Its message, in the owner's words:

> Phase 2 security hardening: RBAC enforcement, DPAPI, auth middleware, log rotation

All 65 blobs first appear in this commit; none exists on any ref before it. The 65 files, 718,245 bytes:

- **Vault mechanism (2 files):** `src/secretHardening.js` (`4db17dcb`, 6,073 B) and `src/secureVault.js` (`17013b39`, 13,003 B). The header of `secretHardening.js` reads: "Wraps sensitive data using Windows DPAPI (Data Protection API) so vault master keys are not stored as plaintext on disk." `secureVault.js` keeps a legacy single-vault layout (`vault.secrets.json` + `vault.master.key`) and a namespaced v2 layout (`owner`, `asolaria`) with AES-256-GCM. It takes its key at runtime from the environment, from DPAPI or from a file it generates. Both were read in full before vendoring. Neither holds a key or a secret value (see `HELD.hbp`). These are the mechanism files only; no vault contents are here.
- **Log rotation (1 file):** `lib/logRotation.js` (`15be3eaa`). In its own words: "Rotates append-only NDJSON files when they exceed maxLines. Keeps the most recent lines and archives the rest."
- **The 10 routes hardened in this commit:** `routes/autoContinue.js`, `captures.js`, `federation.js`, `mistakes.js`, `omnispindle.js`, `personas.js`, `projects.js`, `security.js`, `uploads.js` and `workerRouter.js`. The diff from `b49a725` adds `requirePermission("admin")` or `requirePermission("write")` from `middleware/auth.js` to their write endpoints. `routes/security.js` also gains `/logs/rotate`. The 11th module hardened in this commit is `middleware/auth.js` itself (`f1c32b7`), already vendored in step 04 at `vendor/Asolaria-variant-58b51eb/middleware/auth.js`. The commit hardened 10 route files, not the 11 named in the task.
- **The test of the hardening (1 file):** `tests/contract-phase2-security.test.js` (`88f4a8eb`). It runs against `127.0.0.1:4781`.
- **The decomposed `src/` modules, first committed here (38 more files):** among them `brainOrchestrator.js` (`e06041da`, 23,787 B), `brainPolicy.js`, `jobQueue.js` (`10078d72`, the job-queue WAL and dead-letter file of ADR-0002), `intentRouter.js`, `skillRunner.js`, `skillRegistry.js`, `skillsToolsIndexStore.js`, `memoryStore.js`, `semanticKnowledgeStore.js`, `notebookStore.js`, `taskLedgerStore.js`, `projectStore.js`, `personaStore.js`, `omnispindle.js`, `civilizationWorld.js`, `riskEngine.js`, `edgeRiskEngine.js`, `graphRuntimeStore.js`, `graphRuntimeQuery.js`, `mistakeLedgerStore.js`, `mistakePatternStore.js`, `mobileInbox.js`, `mobilePushStore.js`, `moltbookAccountStore.js`, `companyPrimarySigninStore.js`, `connectionPolicy.js`, `connectorManifest.js`, `remoteNodeRegistry.js`, `runtimePaths.js` and the rest of the 40 `src/*.js` rows in `PROVENANCE.md`.
- **The gateway (6 files):** `src/gateway/server.js`, `authorityMode.js` (modes `operator_primary`, `shared_control`, `asolaria_primary`), `toolAuthority.js`, `auditLog.js`, `package.json` and `package-lock.json`.
- **The local services (7 files):** `services/memory-indexer/` (`server.js` and `asolaria.memory.json`, bound to `127.0.0.1:5444`), `services/sandbox-manager/` (`server.js`, `asolaria.sandbox.json` bound to `127.0.0.1:5443` with no network by default, `package.json` and `package-lock.json`) and `services/mqtt-broker/server.mjs`.

**Overlap with other steps.** git stores identical bytes once, so none of this adds weight twice. At the time of writing, 51 of the 65 blobs are also in other `beginning/` directories:

- 45 are in `02-release-snapshots-2026-02/`, in the release trees that were first committed in this same commit.
- 4 of those 45 are also in `03-gnn-design-seed-2026-03/`: `riskEngine.js`, `edgeRiskEngine.js`, `graphRuntimeStore.js` and `graphRuntimeQuery.js`.
- 38 are in `05-index-language-2026-03/vendor/gaia-full-src-20260324/`, including `secureVault.js` (`17013b39`), `secretHardening.js` (`4db17dcb`), `brainOrchestrator.js` and `jobQueue.js`.
- 1 is in `06-verbs-cubes-behcs-2026-04/`.

These 14 are in no other directory: `lib/logRotation.js`, all 10 hardened routes, `src/agentSessionStore.js`, `src/omnispindle.js` and `tests/contract-phase2-security.test.js`. Step 08 (`08-gac-gulp-hg256-2026-04/`, still being written when this was checked) also vendors `src/secureVault.js` (`17013b39`) and `src/secretHardening.js` (`4db17dcb`) at `vendor/Asolaria/src/`. Those are the same blobs, and git stores the bytes once.

## Part (b): the healthcare gaps (completes `01-healthcare-origin-2025-12/`)

The step-01 files import modules that step 01 did not vendor. `main.py`, `service.py` and `api.py` import from `.exceptions`. The tests import through `backend.anomaly_detector...`, and `tests/test_main.py` imports `from ..main`, so `backend`, `backend/anomaly_detector`, `backend/anomaly_detector/models` and `backend/anomaly_detector/tests` must be packages. This part vendors those five files from `AI-healthCare-project @ e0048c0` (still the remote `HEAD` on 2026-10-18), under `vendor/AI-healthCare-project/` at the same paths step 01 uses:

- `backend/anomaly_detector/exceptions.py` (`ffcb3b2a`, 827 B). Its docstring reads "Custom Domain Exceptions for the Anomaly Detection Service". It defines `AnomalyDetectionError` and `ModelInitializationError`, `GraphBuildingError`, `ModelInferenceError` and `ConfigurationError`.
- `backend/__init__.py` (`e49a7335`, 369 B): "Backend package marker for AI-healthCare-project. This file makes the `backend` directory a Python package so tests and other modules can import backend.* modules."
- `backend/anomaly_detector/__init__.py` (`6fa543fe`, 30 B): "# AI Anomaly Detector Package".
- `backend/anomaly_detector/models/__init__.py` (`0ef9b432`, 35 B): "# GNN Models for Anomaly Detection". The same blob is already in aether at `model/l4-gslgnn/vendor/gnn-sidecar/models/__init__.py`, `model/gnn-zoo/vendor/gnn-patterns/models/__init__.py` and `acer/Asolaria/services/gnn-sidecar/models/__init__.py`. It is vendored here as well so that the step-01 tree has its own package marker.
- `backend/anomaly_detector/tests/__init__.py` (`db0327fc`, 29 B): "# Tests for Anomaly Detector".

All five blobs first appear in the repository's first commit `40436ea`, 2025-12-03 09:00:00 -03:00, and each is unchanged on every ref since.

Check: with step 01's files, these five, and the four model classes and `schemas.py` already in aether placed side by side, `import backend.anomaly_detector.exceptions` runs. Python's import system also finds every module the step-01 files import (`config`, `service`, `api`, `main`, `models.graph_builder`, `models.schemas`, `models.clinical_graph_builder`, `tests.test_main`). Running them also needs the third-party libraries they import (`torch`, `fastapi`), which were not installed for this check.

**Pinned, not vendored:** `backend/ocr/__init__.py` (`fa3d44b8`, 382 B). No step-01 file imports the `backend.ocr` package. That file imports `text_extractor`, `tesseract_processor` and `easyocr_processor`, which are not vendored anywhere. Without it, step 01's `fhir_mapper.py` and `medical_parser.py` still import (tested) as `backend.ocr.*`, with `backend/ocr` working as a namespace subpackage. With it, those imports would fail. Its row is in `PROVENANCE.md`.

## Date range

Beginning dates run from 2025-12-03 09:00 -03:00 (`40436ea`, the healthcare package markers and `exceptions.py`) to 2026-03-15 15:20:53 -03:00 (`e8c3369`, all 65 Asolaria files).

## What is held, and what is not public

Nothing in this step is held (`HELD.hbp` has no `HELD` rows). All 70 files were read or scanned before vendoring:

- **Credential patterns** (GitHub and other token prefixes, cloud API key prefixes, Bearer values, private-key headers, `password=`, `"token":`): no hit is a secret value. The matches are redaction regexes, the `Authorization: Bearer` header check in `src/gateway/server.js`, and the runtime password generator in `moltbookAccountStore.js`.
- **Phone numbers:** none.
- **E-mail:** one address, the owner's own, in `src/skillRunner.js` line 684, as a browser-profile default.
- **Lockfiles:** the two `package-lock.json` files resolve only to `registry.npmjs.org`.
- **Third-party material:** none. Every file is the owner's source, config or lockfile.
- **`HELD.hbp`:** carries `REVIEWED` rows for the four files that handle secrets or addresses.

The vault contents the build order names (`vault-secrets-map.txt` 59d8e0f0, the `tmp/docs/phone-downloads` auth JSON d886e0b0, `trusted_vault.pb` 5f831786) and the committed keys (22615393, 3913dcc6, and the Bearer token in `gates/hookwall-v2.js` 76e19530) are not part of this step and are not here. No `data/vault` file is committed at `e8c3369`.

## Verification

From this directory:

```
sha256sum -c UPSTREAM.sha256      # all 70 OK
```

For each vendored file, `git hash-object --no-filters <file>` equals the blob id in `PROVENANCE.md`. The root `.gitattributes` of aether is `* -text`, so the bytes survive checkout unchanged.
