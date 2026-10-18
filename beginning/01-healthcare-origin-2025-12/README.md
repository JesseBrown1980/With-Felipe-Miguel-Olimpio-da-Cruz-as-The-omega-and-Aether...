# 01 — Healthcare-era origin (2025-12-03)

This is build-order step 1 of the "beginning": the earliest public code the whole edge-level
graph-neural-network family grew out of. aether already holds the end of that lineage (the trained
nets and their ports); this directory pins the start.

Every file here is vendored byte-identical from the public, read-only repository
`JesseBrown1980/AI-healthCare-project`. Nothing in that repository was edited, pushed to, or
modified. Per-file source (full commit, original path, blob id, size, sha256, and the date the blob
first appeared) is in `PROVENANCE.md`; `UPSTREAM.sha256` carries the full digests and verifies with
`sha256sum -c` run from this directory.

## What this step is, in the owner's words

From the vendored `backend/anomaly_detector/README.md` ("Edge-level GNN anomaly detector —
pre-Asolaria lineage"):

> This directory is the public pre-Asolaria origin of the edge-level graph-neural-network family
> that was later absorbed into the Asolaria GNN sidecar, BigPickle scorer, Hookwall, forward/reverse
> GNN planes, and white-room pipeline.

> The important abstraction appeared here first:
>
> ```text
> classify and explain the RELATIONSHIP between two nodes
> rather than classify an isolated row or node
> ```

> The domain changed, but the learned object stayed the same: an edge whose meaning, importance,
> anomaly status, and structural context can be scored.

The machine-readable receipt `GNN-LINEAGE-2026-07-11.hbp` records the same lineage as a byte-level
claim: the four model-class files were transferred into the Asolaria sidecar with identical git blob
SHAs (`byte_identical=1`), tagged `REPOSITORY_REPORTED_TRAINING`, with reported accuracies 91.87 /
94.24 / 94.71 / 96.66 % for EdgeLevelGNN / PrototypeGNN / ContrastiveGNN / GSLGNN.

## Date range

Beginning dates span **2025-12-03** (the original commit, `40436ea`) to **2026-08-06** (the
lineage-receipt `.sha256` sidecar). Most of the code dates to 2025-12-03; the
`clinical_graph_builder.py` revision first appeared 2026-02-01; the lineage receipt and the
anomaly_detector `README.md` first appeared 2026-07-10/11. The repository snapshot used for the main
tree is `e0048c0` (HEAD, 2026-08-08 "star port sidecar"), which still carries all the 2025-12-03
blobs unchanged.

## What each part is

- `vendor/AI-healthCare-project/backend/anomaly_detector/` — the service that wrapped the four GNN
  models in the healthcare app:
  - `service.py` — the scorer (holds the reported-accuracy table; the block that loads
    `weights/{model_type}_model.pt` is commented out, so the checked-in service does not auto-load a
    checkpoint).
  - `api.py`, `main.py` — the FastAPI router and app entry (`/security/anomaly`, port 8001).
  - `config.py` — defaults; `MODEL_TYPE` defaults to `gsl`. No secrets.
  - `models/graph_builder.py`, `models/clinical_graph_builder.py` — build the input graphs.
  - `tests/test_gnn_model.py`, `tests/test_api_integration.py`, `tests/manual_check.py`,
    `tests/test_main.py` — forward-shape, probability-range, API and app checks.
  - `requirements.txt`, `Dockerfile`, `integration_instructions.md` — how it was built and mounted.
  - `GNN-LINEAGE-2026-07-11.hbp` (+ `.sha256`), `README.md` — the owner's receipt of the
    byte-identical transfer and the lineage write-up.
- `vendor/AI-healthCare-project/tests/test_clinical_gnn.py` — the clinical-GNN test from the repo
  root `tests/` tree (checks the contrastive and GSL branches).
- `vendor/AI-healthCare-project/backend/ocr/fhir_mapper.py`, `medical_parser.py` — the OCR mappers
  the owner's goal names as part of this origin (see "What is held" below for the zip relationship).
- `vendor/AI-healthCare-project@40436ea/backend/anomaly_detector/models/clinical_graph_builder.py` —
  the **2025-12-03 original** of the clinical graph builder (blob b102b993), kept alongside the
  later 2026-02-01 revision (blob f93a87f0) so both versions are pinned.

## Already in aether — referenced, not duplicated

The four GNN model-class files are already present in aether and are deliberately **not** copied
here:

- `model/l0-edge/vendor/gnn-sidecar/models/gnn_baseline.py` (EdgeLevelGNN, blob 510f7889)
- `model/l1-prototype/vendor/gnn-sidecar/models/prototype_gnn.py` (PrototypeGNN, blob 99e3087a)
- `model/l2-contrastive/vendor/gnn-sidecar/models/contrastive_gnn.py` (ContrastiveGNN, blob 56329e61)
- `model/l4-gslgnn/vendor/gnn-sidecar/models/gsl_gnn.py` (GSLGNN, blob 886b3b0c) and `__init__.py`
  (blob 0ef9b432)
- `schemas.py` (blob 58cda2ee) is carried at `acer/Asolaria/services/gnn-sidecar/models/schemas.py`.

These are the byte-identical healthcare-era source of aether's L0/L1/L2/L4 nets; this step pins the
harness and docs around them.

## What is held

`gaia-full-src.zip` (Asolaria mirror blob `3d891f44…`, 1,892,187 B, at
`tmp/docs/whatsapp-rayssa/gaia-full-src.zip`, introduced 2026-04-11) is **held, not vendored**: it
lives under a `tmp/docs/whatsapp-*` path, which the owner HOLD rule excludes. The two OCR files this
step needs are carried inside that zip only as Windows CRLF working copies
(`ocr\fhir_mapper.py` 21,448 B, `ocr\medical_parser.py` 14,626 B). They are byte-identical in content
to the public git-tracked LF blobs `backend/ocr/fhir_mapper.py` (20,879 B) and
`backend/ocr/medical_parser.py` (14,226 B) — same source, only the line endings differ — so those
two files were vendored from the public repo instead, and only the zip's blob id is recorded (in
`HELD.hbp`). Every vendored file was scanned for credential patterns and private data; none was
found.

## What is not public

- **No healthcare-era trained weights exist in any repo.** The construction-gap map records that
  none of the 40 commits on any ref of `AI-healthCare-project` holds a `.pt` file. The checked-in
  `service.py` runs the model in eval mode with checkpoint loading commented out. The reported
  accuracies above are the repository-reported study numbers, not a checkpoint shipped here. The
  first trained checkpoint in this lineage (`baseline_model.pt`) was produced later, inside
  Asolaria, and is held elsewhere in aether; the later trained `.pt` artifacts live in the
  `Asolaria-fnns-trained-and-reverse-gnns-many` repo (already in aether).
- The actual training dataset for the healthcare-era models is not in this repo either.

## Verification

From this directory:

```
sha256sum -c UPSTREAM.sha256      # all 20 files OK
```

and for each vendored file, `git hash-object --no-filters <file>` equals the blob id in
`PROVENANCE.md`. The root `.gitattributes` of aether is `* -text`, so the stored bytes (LF, and the
two early/late builder versions) survive checkout unchanged.
