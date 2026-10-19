# SpanishBCBL Stage 2 Integration Plan

Status: `DESIGN` / `NO_DOWNLOAD_DONE`. This plan defines how Q-PRISM should use the public SpanishBCBL data without turning the repository into a raw neural-data store.

## Objective

Use SpanishBCBL as the first real neural-language substrate for Q-PRISM Stage 2.

The goal is not to train a new Brain2Qwerty model immediately. The first useful Q-PRISM cell is smaller:

```text
SpanishBCBL behavioral + neural events -> typed-language feature stream -> schedule-prior generator -> simulator comparison
```

## Non-Goals

- Do not download the 262-280GB raw dataset into this repo.
- Do not commit `.fif`, `.eeg`, `.vhdr`, `.vmrk`, `.mat`, or derived subject-level raw neural arrays.
- Do not claim live human neural control.
- Do not claim arbitrary thought decoding.
- Do not use the CC BY-NC 4.0 data in commercial/product claims.

## Runtime Surfaces

Use `docs/asolaria-absorption-runtime-surfaces.md` as the operating map. The short version:

- WSL/Ubuntu is the preferred heavy extraction lane when Python/MNE neural tooling is needed.
- Fabric is the claim/canon route.
- Recall stores and searches HBP/HBI receipts and derived cube chunks.
- Atlas and Graphify map the absorbed cube chunks.
- AgentTerms/FEDENV is an optional dispatch envelope and remains operator-gated; Stage 2 does not fire it.

## External Data Root

If the dataset is downloaded later, it should live outside Git, for example:

```text
QPRISM_DATA_ROOT=E:\qprism-data\SpanishBCBL
```

or a local equivalent with enough storage. The repo should only keep:

- a local path receipt,
- dataset commit/revision hash where available,
- license receipt,
- event schema manifest,
- derived small feature summaries,
- schedule-prior metrics.

## Phase A — Events Only

Build only the standardized event dataframe first:

```python
import studies
from neuralset.events import Study

study = Study(name="Pinet2024Meg", path=QPRISM_DATA_ROOT)
events = study.build()
```

Repeat for `Pinet2024Eeg` when needed.

Expected event rows include:

- recording rows,
- sentence events,
- word events,
- keystroke events,
- onset `start` in seconds,
- `duration` in seconds.

Q-PRISM should export a small derived manifest such as:

```text
subject_id, session_id, modality, sentence_id, sentence_text_hash, typed_length, onset_density, key_interval_stats, word_timing_stats
```

Do not export raw sentence text into public receipts unless the dataset license and paper protocol permit it for that artifact.

## Phase B — Language Priors

Map each sentence/event record into schedule-prior features:

- sentence length,
- typing rhythm statistics,
- pause/hesitation structure,
- word timing density,
- semantic embedding id or hash,
- modality tag (`MEG` / `EEG`),
- participant/session group id after repeated-subject merge.

These features can feed Q-PRISM as a high-dimensional prior over:

- `p2Mw`,
- `velocityCenterMps`,
- `velocityHalfWidthMps`,
- `massCenterKDa`,
- `massHalfWidthKDa`,
- `analysisWindow`.

## Phase C — Quant Tuple Distillation

Before simulator comparison, feed the event/feature manifest through the Asolaria quant-tail path described in `docs/asolaria-quant-reductions-anchor.md`:

```text
events/features -> one-time quant head pass -> constant 3.1KB-ish tuple -> repeated schedule/control tail
```

The first repo-local smoke test does this only from Hugging Face card metadata, so it is intentionally weak:

```text
QPRISM_SPANISHBCBL_QUANT_PROBE|claim=metadata_prior_not_neural_decode|raw_in_repo=0|derived_only=1|evidence=MEASURED_LOCAL_DERIVED|json=0
```

That probe proves the control-tuple plumbing and receipt path. It does not claim neural decoding. The real Stage 2 upgrade is to replace the metadata payload with event-derived and then neural-feature-derived payloads.


## Phase C2 - Host8 / Graphify 60D Selector Alignment

The cube selector must not remain a parallel app id. It is aligned to the existing Graphify V3 surface as tuple text:

```text
QPRISMHOST8HDR|schema=qprism.host8.graphify_selector.v1|frame=60D_PLUS_HYPERBEHCS|graphify_schema=ASOLARIA-GRAPHIFY-V3-HYPERBEHCS-60D|json=0
QPRISMHOST8HANDLE|field=source|bytes=8|derivation=sha256_prefix_8|role=raw_or_feature_source_reference|json=0
QPRISMHOST8HANDLE|field=tuple|bytes=8|derivation=sha256_prefix_8|role=quant_tuple_reference|json=0
QPRISMHOST8HANDLE|field=node|bytes=8|derivation=fold_host8_source_tuple|role=graphify_node_handle|json=0
QPRISMGRAPHIFY60D|selector_constraint=selector_constraint:hyperbehcs-selector-router-60d|axis_count=11|status=aligned_contract|json=0
```

Implementation artifact: `host8/qprism_graphify_selector.rs`. It is standalone Rust with `[u8; 8]` handles and no Node / no JSON / no serde dependency. It preserves the 11 required graphify selector axes and keeps `agentterms_fedenv_fire=false` by default.
## Phase D — Simulator Comparison

Compare these streams under the existing harness:

1. random/noise schedule,
2. classical scan schedule,
3. synthetic prism schedule,
4. SpanishBCBL-derived language-prior schedule.

A valid first result is only:

```text
SpanishBCBL-derived schedule priors improved / did not improve the one-point-calibrated Q-PRISM simulator under the declared metric.
```

It is not a human-neural hardware result.

## Phase E — Receipts

A compact receipt should look like:

```text
QPRISM_SPANISHBCBL_STAGE2|schema=qprism.spanishbcbl.stage2.v1|dataset=bcbl190626/SpanishBCBL|license=CC-BY-NC-4.0|modality=MEG|events=N|subjects=N|raw_in_repo=0|derived_only=1|evidence=MEASURED_LOCAL_DERIVED|json=0
```

## Safety Gate

Before any raw-data processing commit or publication:

- confirm dataset license is compatible with the intended use,
- preserve subject de-identification,
- keep repeated-subject mapping explicit,
- exclude S23 from merged MEG participant claims as stated by the dataset card,
- store only derived, non-identifying artifacts in Git,
- keep raw data under local data-root access control.
