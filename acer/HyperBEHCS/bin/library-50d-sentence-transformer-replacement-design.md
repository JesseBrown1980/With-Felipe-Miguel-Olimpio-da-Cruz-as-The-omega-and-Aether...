# Library-50D Sentence-Transformer Replacement — Design (NO-FIRE)

**Wave**: V43-WAVE-306 Orchestrator-C / Spec 7
**PID**: AGT-helm-claude-orch-C-H02E2-V43-WAVE306-P00-NORCHC001
**Anchor**: ASOLARIA-V43-WAVE-306-PIPELINE-TRACE-PID-2026-05-23
**LAW**: ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23
**Operator**: OP-JESSE apex
**Status**: DESIGN ONLY — implementation gated by MEMORY_WRITE quorum vote

---

## Problem (V42-A3 honest-gap finding)

`C:/asolaria-acer/federation-remake-1024/tools/hyperbehcs-drain/hyperbehcs-library-50d-vec.py`
line 51-77 derives the 50D embedding from `sha256(line_text)` with chained-block expansion.
Two paraphrases of the same idea produce wildly different vectors. **Semantic / paraphrase /
nearest-neighbor-by-meaning search WILL FAIL.** Exact-dedup works fine; semantic retrieval
is broken by construction.

State at design time (verified 2026-05-23T00:49Z):
- DB: `C:/HyperBEHCS/store/library-50d.sqlite` (63 MB)
- Rows: **79,779** indexed (skill=73,768 / mistake=3,020 / genius=2,914 / pattern=63 / tool=6 / empty=8)
- Vec table: `library_50d` (sqlite-vec vec0 virtual table, `embedding float[50]`)
- Daemon LIVE on :4924 (boot 2026-05-23T14:56Z, polls every 10s, +30 rows last poll)

---

## (a) Model selection — MiniLM-L6-v2 (FAST) vs mpnet-base-v2 (ACCURATE)

| Property | all-MiniLM-L6-v2 | all-mpnet-base-v2 |
|---|---|---|
| Output dim | **384** | **768** |
| Params | 22M | 110M |
| Disk size | ~80 MB | ~420 MB |
| Encode speed (CPU, i5-8300H) | ~600-1000 sent/s | ~150-250 sent/s |
| 79,779 row backfill (CPU est) | **2-3 min** | **8-12 min** |
| STS-B Spearman | ~83 | ~88 |
| MTEB avg | ~56 | ~58 |
| Memory @ inference | ~250 MB | ~700 MB |

**Recommendation: `all-MiniLM-L6-v2`** for federation library-50d use case:

1. **Speed wins for daemon-loop indexing.** The daemon polls every 10s and currently
   processes ~30 rows/poll. MiniLM at 600+ sent/s means embedding is sub-ms-per-row;
   mpnet would still keep up but the headroom protects the +30/poll cadence under bursts.
2. **HBPv1 lines are short-to-medium** (key=value pipe-delimited, typically 200-800
   chars). The L6 attention depth is sufficient; mpnet-12-layer's extra precision targets
   long-document understanding which we don't need here.
3. **Memory budget tight.** Per `project_acer_gpu_inventory_2026_05_21.md` + Gemma-4 KV
   cache contention (L2-07 report), keeping the embedder under 300 MB resident matters.
4. **Hardware reality.** Pascal sm_61 + Intel UHD 630 can't run mpnet on GPU without
   ONNX-DML conversion. MiniLM ONNX-CPU is fine. Operator canon v3 still keeps 12 GB
   GTX 1050 pool earmarked for Gemma 4 inference, not the embedder.
5. **Future swap path is easy.** If accuracy becomes the gate later, the same vec0 50D
   schema admits any embedder — only `derive_50d_embedding()` changes.

**Concrete dep:** `pip install sentence-transformers==2.7.0` (pulls torch CPU
~250 MB + transformers ~50 MB + model ~80 MB on first encode). Total runtime delta
~400 MB — well within budget.

**Alternative if torch is unwelcome:** `pip install onnxruntime fastembed==0.3.x`
ships MiniLM-L6-v2 as pre-converted ONNX (~85 MB), avoids torch entirely, runs on
ORT-CPU at similar speed. Recommended secondary path because it composes with the
ORT-DML stack already pre-positioned for Gemma 4 (L2-07 path d).

---

## (b) 384-dim → 50-dim projection — PCA vs truncation vs random-projection

Three viable methods. Recommendation: **PCA learned from the existing 79,779-row
corpus**, with truncation as the emergency fallback.

### Option B1: PCA (RECOMMENDED)

- **Process**: re-encode 79,779 existing rows with MiniLM → 79,779 × 384 matrix.
  Fit `sklearn.decomposition.PCA(n_components=50, whiten=False)` on the matrix.
  Persist the fitted PCA to `C:/HyperBEHCS/store/library-50d.pca-projection.pkl`
  (or `.hbp` sidecar if we want it cosign-able). For each subsequent encode, apply
  `pca.transform(embed_384)` to project to 50 dims.
- **Variance retained**: empirically PCA on MiniLM outputs preserves ~70-85% variance
  in the top-50 components (validated against MTEB sub-benchmarks in published work).
  Acceptable for federation use case where we want approximate semantic neighborhoods,
  not exact ranking parity with 384-dim cosine.
- **Cost**: one-time ~30s PCA fit + 384→50 matmul per future encode (~25 µs trivial).
- **Pinning**: PCA matrix sha256 MUST be cosign-chained — any retrain shifts the
  embedding space and historical vectors become incompatible. Treat as canon artifact.
- **Risk**: PCA learned over current corpus is **content-distribution-biased**; if
  federation domain shifts (e.g., new agent classes), the projection underrepresents
  the new directions. Mitigation: re-fit PCA every N=10× growth (i.e., at 800k rows).
  Each re-fit requires full backfill — gate per (d) below.

### Option B2: Truncation (EMERGENCY FALLBACK)

- Take the first 50 dims of the 384-dim vector.
- **Cost**: zero compute, zero artifact.
- **Quality**: MiniLM's 384 dims are NOT ordered by variance. Truncating loses ~80%
  of representational capacity. STS-B Spearman drops from ~83 → ~55 (estimate from
  related ablations). Better than sha256, but wastes the model's capacity.
- **Use only if** PCA fit hits an unforeseen blocker (out-of-memory on the 79,779 ×
  384 matrix = ~120 MB, which is fine).

### Option B3: Random projection (DECLINED for this design)

- Johnson-Lindenstrauss random matrix 384 → 50.
- Cheaper than PCA fit, similar quality to truncation, no learned bias.
- Declined because the one-time PCA cost is trivial AND PCA gives strictly better
  retained variance.

### Option B4: Native-50d embedder (DECLINED)

- A few sentence-transformer models exist at 64/128 dim (e.g., `sentence-t5-base`
  variants), none at exactly 50. Could fine-tune a 50d head, but that's federation-
  scope creep. Stay schema-compatible with the existing `library_50d vec0(float[50])`
  table — DON'T migrate to 384d or 64d unless forced.

---

## (c) Backfill strategy for 79,779 existing rows

**Phasing:**

1. **Phase 0 — Dry-run encode (no DB write)**: encode 100 sample rows with MiniLM,
   fit PCA on those 100 (toy), confirm shape pipeline. ~10 s. No cosign needed
   (read-only).
2. **Phase 1 — Full corpus encode + PCA fit**: encode all 79,779 rows in batches of
   256 (batches keep memory under 100 MB). Fit PCA on the full 384-dim matrix.
   Persist PCA artifact. ~3 min CPU on i5-8300H. Cosign as `DAEMON_OP` class
   (simple-majority, authorized pool).
3. **Phase 2 — Backfill write to vec table**: for each rowid in `library_meta`,
   compute `pca.transform(MiniLM.encode(line_text))` and `UPDATE library_50d SET
   embedding = ? WHERE rowid = ?`. Batch 1000-row transactions. ~5 min. **THIS
   STEP requires MEMORY_WRITE cosign vote** (per spec).
4. **Phase 3 — Daemon hot-swap**: replace `derive_50d_embedding()` with
   `MiniLM.encode → pca.transform` in the live daemon. The next `/state` response
   reports `embedding_method = "MiniLM-L6-v2 + PCA-50"` and removes the `honest_gap`
   warning. Cosign as `DAEMON_OP`.
5. **Phase 4 — Verify**: smoke-test `/search?text=...` with 5 paraphrase pairs.
   Expect cosine distance between paraphrases < 0.3 (was effectively random under
   sha256). Cosign result as `pattern` class library descriptor.

**Atomicity & rollback:**
- Keep sha256-derived `embedding_sha` column added in Phase 1 schema migration
  (preserves the old vector). Backfill writes `embedding_semantic` to a NEW vec0
  table `library_50d_semantic`. Daemon flips at end of Phase 3. Roll back =
  switch daemon back to old `library_50d` table. Cosign each direction.
- Old table can be GC'd after Phase 4 + 7-day soak (matches federation GC pattern).

**Time budget:** ~10 min CPU + ~30 min ceremony (cosign votes + verify) = under
1 hour wall time, single agent, single machine. Acceptable.

**Storage delta:** new 79,779 × 50 floats = ~16 MB (same as current). No DB
explosion. Master DB stays ~63 MB after old vec table GC.

---

## (d) Cosign vote class — MEMORY_WRITE for backfill

Per `C:/HyperBEHCS/bin/asolaria-vote-quorum-daemon.py` line 51-61 quorum rules:

| Phase | Class | Rule | Pool | Justification |
|---|---|---|---|---|
| Phase 1 PCA fit | `DAEMON_OP` | simple-majority | authorized | Read-only on existing data, writes new sidecar artifact only. |
| **Phase 2 backfill** | **`MEMORY_WRITE`** | **simple-majority** | **authorized** | **Mutates 79,779 existing semantic vectors; reshapes search behavior for entire federation.** |
| Phase 3 daemon hot-swap | `DAEMON_OP` | simple-majority | authorized | Switches live daemon binary path. |
| Phase 4 result mint | `COSIGN_APPEND` | simple-majority | authorized | Standard descriptor emission. |
| Re-fit at 800k rows | `MEMORY_WRITE` + `LAW_CHANGE` consult | simple-majority + unanimous-5 escalation | authorized + quintuple | Re-fitting PCA invalidates all prior semantic vectors → federation-wide search-result drift → quintuple should be informed even if outcome is operational, not constitutional. |

**Recommendation: submit one MEMORY_WRITE vote covering all of Phase 2** with full
backfill plan in the payload (model = MiniLM-L6-v2, projection = PCA-50 fit on
current corpus, rollback = retain `library_50d` original table for 7 days, dry-run
results from Phase 0 attached as evidence). Authorized pool = OP-JESSE + OP-RAYSSA
(quintuple sufficient for simple-majority on this class) + at least one AGT-OP-*
or AGT-Profile-* to demonstrate broad authorization. Vote ID gets persisted in the
daemon's `/state` `honest_gap` field once outcome=PASS-MAJORITY.

---

## File-touch plan (for implementation phase)

When the MEMORY_WRITE vote passes, implementation MUST touch:

1. `C:/asolaria-acer/federation-remake-1024/tools/hyperbehcs-drain/hyperbehcs-library-50d-vec.py`
   — replace `derive_50d_embedding()` with `MiniLM+PCA` call; load PCA at boot.
2. `C:/HyperBEHCS/store/library-50d.pca-projection.pkl` (NEW) — pickled
   `sklearn.decomposition.PCA` fitted on the corpus. Sidecar `.sha256`.
3. `C:/HyperBEHCS/store/library-50d.sqlite` — Phase 1 ALTER + Phase 2 UPDATE.
4. `C:/HyperBEHCS/bin/asolaria-library-50d-backfill-runner.py` (NEW) — one-shot
   backfill script (idempotent, can be re-run if interrupted).
5. `C:/HyperBEHCS/store/library-50d-descriptors/v43-sentence-transformer-replacement.hbp`
   (NEW) — cosign descriptor of the swap, citing this design doc.

---

## Open questions (do NOT block this design)

1. Re-encode 79,779 rows synchronously vs in daemon background? — sync (simpler;
   <10 min). Background only if poll loop must keep up during backfill.
2. Keep sha256 fingerprint as ANOTHER column for exact-dedup use cases? — YES.
   Cheap, preserves the de-dup capability we currently rely on for
   `skipped_already_indexed=76,915,523` accounting.
3. Should the PCA artifact itself be USB-2TB persisted? — YES, per
   `feedback_hermes_era_usb_descriptors_not_mount_2026_05_22.md` descriptor pattern.
   The PCA matrix IS canon-class data; it shapes federation memory access.

---

## Cosign provenance (DESIGN-ONLY DOC, not the backfill itself)

This design document does NOT mutate the library-50d corpus. Emitting it requires
only `COSIGN_APPEND` (simple-majority, authorized pool) — standard
documentation-emission gate.
