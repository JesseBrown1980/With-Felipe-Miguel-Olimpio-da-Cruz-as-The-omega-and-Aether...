# Stage 2 — cube absorption (SpanishBCBL → prism arm)

**Frame:** the fabric absorbs any data by *representing* it across the 43+ addressable layers ×
the 60D BEHCS-1024 tuple space — and the addressed representation **is** the cube. Reduction is
represent + address + derived-digest, with the raw preserved once by sha256 (referenced, not
reconstructed). This is not lossless magic and not a Shannon violation; it is addressing.

```
raw M/EEG (D:, referenced by sha256)
   → derived feature window            (MNE / Brain2Qwerty `studies`, in WSL/Ubuntu on D:)
   → canonical 3200-byte QUANT TUPLE   (turbo 1024·int8 + signs 128 + zeta 1024 + hist 256·u32)
   → derived-only CubeChunk record     (metadata + 60D selector + digests; raw_in_repo=0)
   → CubeSource → prism arm → blinded harness
```

## Canonical format (aligned to the shipped engine)
`TUPLE_BYTES = 3200`, matching `D:/asolaria-combined-quant-2026-06-15/combined-quant-engine.mjs`
(`turbo 1024 + signs 128 + zeta 1024 + hist 1024`) and Liris's `qprism-quant-chunk` (3200 B, D=1024).
`turbo`/`signs`/`hist` are computed faithfully; the per-lane `zeta` is a **layout-compatible
stand-in** pending byte-parity with the canonical `zetaClassify` — a **bilateral verify** step.

Example derived chunk (from `qprism.cube_absorb.absorb_window`, synthetic fixture):
```json
{ "dataset_id": "bcbl190626/SpanishBCBL", "license": "CC-BY-NC-4.0",
  "subject": "S5", "session": "1", "modality": "MEG",
  "window_start_s": 12.5, "window_dur_s": 0.5, "n_samples": 25,
  "feature_digest": "5d8b102753b7fcfb", "selector": "HG1024:QPRISM:…60D-glyphs…",
  "tuple_sha16": "969d2b5e47e97e3e", "source_sha256": "…referenced-on-D",
  "raw_in_repo": 0, "derived_only": 1, "tuple_bytes": 3200 }
```

## Phases

- **Phase 1 — cube-absorb adapter (DONE, this branch):** `qprism/cube_absorb.py` +
  `CubeSource` → prism arm; 5 tests. Runs on the synthetic MEG fixture today; identical path for real data.
- **Phase 2 — events-first ingestion (doc, no download):** in **WSL/Ubuntu on D:**
  `pip install mne neuralset neuralfetch` + clone `brain2qwerty` so `import studies` resolves, then
  ```python
  import studies                                   # registers Pinet2024Meg/Eeg
  from neuralset.events import Study
  study = Study(name="Pinet2024Meg", path="D:/qprism-data/SpanishBCBL")
  study.download(); events = study.build()         # sentence/word/keystroke timings
  ```
  Epoch MEG around keystroke/word events → feature windows → `absorb_window(...)` → cube chunks.
- **Phase 3 — real slice (gated):** ONE participant end-to-end; **the 280 GB download is deferred
  to explicit operator go.** Only derived cube chunks + receipts leave D:.
- **Phase 4 — bilateral converge:** acer 3200-byte cube ↔ Liris `qprism-quant-chunk` byte-parity;
  merge the stronger `zeta`/schema. GitHub is the mediator.

## Gates
- **No raw M/EEG in git.** `raw_in_repo=0`, `derived_only=1` on every chunk; raw stays on D:, sha-referenced.
- **License:** CC-BY-NC-4.0 — research/non-commercial only.
- **Claims gate:** real data does **not** bypass the honest-null. A cube-driven `CubeSource` wins in the
  harness only if the neural signal genuinely correlates with better control (see `docs/CLAIMS-GATE.md`).
- **No third-party personal data** (no subject identities beyond de-identified IDs; no collaborator contacts).
