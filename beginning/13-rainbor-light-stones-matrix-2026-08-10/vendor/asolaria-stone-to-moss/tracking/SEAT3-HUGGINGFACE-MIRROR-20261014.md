# Seat 3 — Hugging Face mirror: staging complete, remote publishing pending

**Date:** 2026-10-14 UTC  
**Evidence class:** reproducible GF(2) software evolution, not a physical-host or signal-speed measurement.

## GitHub result: done and independently replayed

- Source and sealed original experiment: [merged PR #11](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/11), merge commit `bf956c8e92ff7b6efed07b97c1e8df25b10e6d20`.
- Python 81-column matrix and Node cyclic GF(2) polynomial: **9,720/9,720** identical full-state rows for 12 waves × five laws × 81 bodies × two modeled horizons, `10^13` and `10^13 + 1`.
- Full raw HBP SHA-256: `245ab02b30cbdd9215d161c6561adc6a6c3bf72dd3fa2cb62979b2fb74031cef`.
- [Independent Python 3.11/3.13 GitHub CI](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38647138816): both PASS.
- [Source stone on main](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/main/stones/2026-10-14-rainbow81/seat-3-two-horizon-9720-control.json).

## Hugging Face mirror: staged, NOT yet uploaded to Hugging Face

- [HF mirror staging run 38649141774](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38649141774): **SUCCESS** in `stage-and-verify`; `publish-and-readback` **SKIPPED** because no manual publish was requested.
- [Download staged artifact `seat3-two-horizon-hf-ready`](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38649141774/artifacts/11933726366) — 8 files, zipped, reported 322,514 bytes.
- Staged artifact ZIP digest from GitHub Actions log: `915647efec5445445efc6708ffcf79d400ea5fb6358f4713861ad4ffed74eb6d`.
- Files include the regenerated 9,720-row HBP, independent Python + Node source, scope-limited JSON result stone, README, summary, SHA256SUMS and a manifest with pinned Git HEAD.
- Publisher script: [`tools/publish_seat3_two_horizon_to_hf.py`](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/main/tools/publish_seat3_two_horizon_to_hf.py).
- Workflow: [`.github/workflows/publish-seat3-two-horizon-huggingface.yml`](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/main/.github/workflows/publish-seat3-two-horizon-huggingface.yml).
- Reserved HF destination: `Jessedbrown/asolaria-wasm81-rainbow-audit` (model repository), `experiments/2026-10-14/seat3-two-horizon-9720/`. **Not confirmed published**.
- Direct HF connector is OAuth `read-repos` with no write action; this container has no outbound DNS to `huggingface.co`. GitHub can run the publisher remotely only after protected write credentials are configured.

## Owner-required credential action

A GitHub administrator should **rotate any Hugging Face access token exposed in chat** and create a new least-privilege write token authorized to the target model repo. Set the new token as a GitHub Actions repository secret:

1. [GitHub repository Actions secrets](https://github.com/JesseBrown1980/asolaria-stone-to-moss/settings/secrets/actions) → **New repository secret**, name exactly `HF_TOKEN`. Paste the token **only** in the secret field, never in a source file, workflow input, comment, or build log.
2. [GitHub Actions workflow](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/workflows/publish-seat3-two-horizon-huggingface.yml) → **Run workflow**, select `main`, set `publish` to **true**.
3. Require `publish-and-readback` to PASS. Only then report the files as uploaded to Hugging Face; the script independently downloads **every** file and verifies SHA-256 plus manifest.
4. Rotate or revoke the temporary token after publishing; update/remove the `HF_TOKEN` repository secret accordingly.

**No Hugging Face credential is in the GitHub code or staging artifact.**

This release remains separate from the pending *three physically attested host* challenge. A GitHub-hosted runner is real computing infrastructure but does not certify independent host separation, gravity dynamics, photon propagation, or FTL communication.
