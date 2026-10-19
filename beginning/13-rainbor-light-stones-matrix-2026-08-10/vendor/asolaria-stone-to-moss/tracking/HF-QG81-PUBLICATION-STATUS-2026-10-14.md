# Hugging Face publication status — QG81 computational stones

**Status as of 2026-10-14:** `BLOCKED_CREDENTIAL_NOT_CONFIGURED`. This is **not** a completed Hugging Face upload.

## Confirmed completed

- Full 81-body 9-wave computational gates: [CI 38589387275](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38589387275) — Python 3.11 / 3.13 PASS; full JSON byte-identical.
- [Seal job 38590501127](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38590501127) — HBI, HBP, raw/full JSON and SHA-256 sidecars committed and verified.
- [PR #3](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/3) — source, evaluation, stones, manifest-safe publication script, and workflow merged to `main`.
- [Publication workflow 38591770211](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38591770211) — staging checksum validation PASS; required protected `HF_TOKEN` check FAILED; upload step SKIPPED.

## Prepared target destinations

- Existing model repo: `Jessedbrown/asolaria-wasm81-rainbow-audit`
- New model repo to create: `Jessedbrown/tests`
- Subdirectory for each: `experiments/2026-10-14/quantum-gravity-81`

The publication script `tools/publish_quantum_gravity_to_hf.py` refuses to publish with an absent or mismatched credential, verifies each source checksum against its HBI/HBP sidecar, and on successful upload checks remote file hashes by downloading them again. Credential is read **only** from the GitHub Actions `HF_TOKEN` secret and never published.

## Required authorized step

An administrator of this GitHub repo must configure a write-scoped Hugging Face token in **Settings > Secrets and variables > Actions > New repository secret** with name `HF_TOKEN`. Then re-run the *Publish verified QG81 stones to Hugging Face* workflow via **Actions > Run workflow** on `main`. Wait for **Publish and download-verify both destinations** to pass and check repository contents. Rotate the supplied credential after successful verification.

These computational controls are **not** observations of gravity, quantum entanglement or faster-than-light signaling.
