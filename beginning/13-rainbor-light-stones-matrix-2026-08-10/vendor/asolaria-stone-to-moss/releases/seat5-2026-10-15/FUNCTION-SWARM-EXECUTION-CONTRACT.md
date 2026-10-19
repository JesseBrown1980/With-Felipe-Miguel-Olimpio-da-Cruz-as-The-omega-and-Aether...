# Seat 5 — Function swarm runtime contract (2026-10-15)

## Execution model
Functions, not language-model instances, are the primitive execution unit. A logical function record contains `function_id`, `law_id`, `input_content_sha256`, `state_address`, `logical_epoch`, `parent_ids`, `output_sha256`, `verifier_id`, `status`. Deduplicate by content address; only materialize a result when requested. Store compact DAG edges, not a process or memory allocation for every logical function.

## Determinism and time
For fixed law, seed and inputs, replay must reproduce byte-exact results. Matrix/polynomial fast-forward is permitted only for laws with proven composition. Record **logical transitions** separately from **wall time** and **CPU time**. A quintillion addressable logical operations does not mean a quintillion simultaneous workers or physical executions.

## Wave / rainbow data
Retain source wavelength or spectral-bin definitions and instrument calibration; do not collapse spectra to RGB when full spectral bins exist. Distinguish observed time-series, inferred trajectories, and forecast extrapolation. Record units, coordinate frames, sampling cadence, noise model and gravitational model assumptions. Verify reprojections against held-out observations, including negative controls.

## Integration gates (exact heads inspected)
- [#121](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/121) head `996a1ce6fe7ee2f9bd3c2167a13dcca2bff634e4`, [workflow 38798779650](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38798779650) completed SUCCESS.
- [#123](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/123) head `069d89107d3cc42e2666bdc10a66f1b8e7a26621`, [workflow 38809902634](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38809902634) and [stress 38809902499](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38809902499) completed SUCCESS.
- [#124](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/124) head `35284e29e5dbe352dfc0458b801b2a914d33bbeb`, [workflow 38825755502](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38825755502) and [triad 38825755324](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38825755324) completed SUCCESS.
All three PRs were draft and mergeable at inspection; hosted success is not independent reviewer approval. Review the exact changed source and provenance before merging; verify main after merge. Never erase historical results.

## Gate outputs
1. Exact head and source fixture hashes.
2. Independent review verdict, failure injections and hosted CI URL.
3. Merge SHA or HELD reason, followed by main regression.
4. Release archive and SHA256 manifest; remote Hugging Face upload and independent readback are separately required.

Coordinator: [#117](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/117), swarm work orders [#125](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/125) through [#129](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/129).
