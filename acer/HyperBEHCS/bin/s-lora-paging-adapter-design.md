# S-LoRA Paging Adapter — Design (NO-FIRE)

**Wave**: V43-WAVE-306 Orchestrator-C / Spec 8
**PID**: AGT-helm-claude-orch-C-H02E2-V43-WAVE306-P00-NORCHC001
**Anchor**: ASOLARIA-V43-WAVE-306-PIPELINE-TRACE-PID-2026-05-23
**LAW**: ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23
**Founding canon**: BIML Multi-stacking paper (Jesse Daniel Brown PhD, Sept 2023) —
`project_biml_multistacking_founding_architecture_paper_2023_09_2026_05_23.md`
**Operator**: OP-JESSE apex
**Status**: DESIGN ONLY — implementation gated by LAW_CHANGE consult (substrate-level)

---

## Problem (founding-paper gap)

The BIML paper (Sept 2023, Section II / S-LoRA) prescribes:

1. **MM ↔ GPUM paging** — adapter weights live in Main Memory, paged to GPU Memory
   on demand
2. **Unified Memory Pool** — KV caches + adapter weights in same pool with sized
   pages, minimal fragmentation
3. **Heterogeneous batching** — different adapter sizes batched via specialized kernels
4. **Tensor parallelism** — split tensors across multiple GPUs (we have NVIDIA 1050
   + Intel UHD 630)

Current federation state: **none of (1)-(4) are implemented.** The llama-cpp-python
adapter at port 4925 (cited in Wave-306 spec but currently a planning target, not
yet running per `find` results) is designed to expose only the **final-layer
embedding**. Mid-layer hidden-state extraction (the actual prosthetic-cortex hook for
HRM-inside-Gemma per `project_jesse_full_architecture_recursive_self_improvement_2026_05_23.md`)
is TODO.

Today's failure mode (per `L2-07-GEMMA-4B-KV-CACHE.md`): llama-cpp-python's
SWA+shared-KV allocator pre-reserves ~2 GB against Gemma 4's `context_length=131072`
metadata regardless of runtime `n_ctx=4096`, killing model load on a Pascal GPU.

This design specifies the path to close that gap **without** writing the S-LoRA C++
kernels ourselves (Pascal sm_61 lacks FlashAttention; weeks of work; wrong path).
Instead, we route to modern successors and expose mid-layer state via documented
APIs.

---

## (a) vLLM PagedAttention as modern successor

**vLLM** (Kwon et al. 2023, SOSP) is the production-grade implementation of the
S-LoRA pattern's KV-cache paging idea. PagedAttention shatters KV cache into
fixed-size blocks (typically 16 tokens), eliminating internal fragmentation;
throughput gains 2-4× on continuous-batching workloads vs naive HuggingFace
generation.

**Mapping S-LoRA paper → vLLM today:**

| BIML Paper (S-LoRA) | vLLM 2024-2026 | Federation Substrate |
|---|---|---|
| MM↔GPUM paging | `BlockManager` + CPU offload | TODO via vLLM HTTP wrapper |
| Unified memory pool | `KVCache` block table | TODO |
| Heterogeneous batching | Continuous batching scheduler | TODO |
| Tensor parallelism | `TP=N` worker pool | N/A on single-machine Pascal |
| LoRA serving | `lora_modules` API | DECLINED per EX-12 canon (prefix instead) |

**Hardware reality blocker:** vLLM CUDA kernels require sm_70+ (Volta / Turing).
**Pascal sm_61 is NOT supported.** Three actionable responses:

1. **Run vLLM on a future GPU** (RTX 30/40-series upgrade) — the architecture
   guidance carries over directly. Federation today documents the contract; future
   hardware lights it up.
2. **Use the vLLM *architectural pattern* via a Python emulator over ORT-DML** —
   build `paged_kv_cache.py` as ORT-DML pre/post hooks that emulate PagedAttention's
   block table at the host level. Gets 80% of the algorithmic benefit on current
   hardware. (M1 modernization proposal in L2-07.)
3. **Wrap LM Studio (which runs Vulkan llama.cpp internally with its own paging)**
   as the production substrate, expose its `/v1/chat/completions` and
   `/v1/embeddings` via a thin proxy at :4925. This is the **TODAY-path** per L2-07
   ranking. Embeddings already round-trip green (`text-embedding-nomic-embed-text-v1.5`
   verified working 2026-05-23).

**Federation recommendation:** stand up path 3 NOW (LM Studio proxy at :4925),
document path 2 as the medium-term ORT-DML port, queue path 1 for post-hardware-
upgrade. This design covers (b) and (c) below for path 3, with hooks for path 2.

---

## (b) llama-cpp-python adapter at :4925 — final-layer-embedding limitation

**Current intended adapter:** `C:/asolaria-acer/federation-remake-1024/tools/frozen-gemma-adapter/frozen-gemma-adapter.py`
(failed load per L2-07; SWA-shared-KV trip).

**What the adapter, when working, exposes:**

- `Llama(embedding=True)` → `llm.embed(text)` returns the **final-layer pooled
  embedding** (mean-pooled or CLS-style depending on model). One vector per input,
  width = model's `hidden_size` (Gemma 4 E4B: 2560 dim).
- `llm(prompt, logits_all=True)` → returns per-token logits over vocab. NOT hidden
  states — logits are the post-LM-head projection.

**What it does NOT expose (the gap):**

- Per-layer hidden states (the residual stream at each of Gemma 4's 42 layers).
- Per-token, per-layer activations (the actual prosthetic-cortex signal).
- KV cache state mid-generation (would be needed for HRM-paging style hand-off).
- Attention weights (for any attribution / introspection use case).

llama.cpp's C API supports per-layer state extraction via `llama_get_logits_ith` and
`llama_get_embeddings_ith` but the Python bindings only surface the final layer.
Mid-layer requires either:

- C-side patch + rebuild llama-cpp-python (~2-4 days work),
- OR a Cython/ctypes shim that calls `llama_get_embeddings` per-layer via FFI,
- OR a different backend (LM Studio API hides layers entirely; ORT-DML can expose
  intermediate ONNX-graph outputs via `ort.InferenceSession.run([layer_N_name], ...)`
  if the export includes intermediate-layer outputs as named outputs).

**For the LM Studio :4925 proxy path (today):** mid-layer extraction is NOT
available through the OpenAI-compat API. The proxy exposes only what LM Studio
exposes: chat completions + final embeddings. Mid-layer is a Phase-2 deliverable
that requires backend swap to ORT-DML (path 2).

---

## (c) Mid-layer extraction TODO — architectural specification

**Target:** at any generation step, return the hidden-state vector at layer N for
token T, where N ∈ [0..42] for Gemma 4 E4B.

**Three backend paths and their mid-layer support:**

| Backend | Mid-layer hidden state? | How |
|---|---|---|
| LM Studio Vulkan (today) | NO | OpenAI API hides; would require LM Studio plugin / fork |
| llama-cpp-python | Partial (final only by default) | C-side patch + Python binding rebuild |
| ORT-DirectML genai (path d in L2-07) | YES (if ONNX export tags layers as outputs) | `InferenceSession.run([f"layer_{n}_output"], inputs)` |
| transformers / HuggingFace (Python pure) | YES (full hooks) | `output_hidden_states=True` + `model.register_forward_hook` |
| vLLM (future hardware) | YES (via custom hook) | `LLM.generate(..., output_hidden_states=True)` |

**Canonical federation path (medium-term):** ONNX export of Gemma 4 E4B INT4 with
ALL intermediate layer outputs tagged as named ONNX outputs. ORT-DML runs the model;
the proxy at :4925 exposes a `/v1/hidden_states/{layer_n}` endpoint alongside the
OpenAI-compat routes. Layer-N extraction is a single named-output read per layer.

**Short-term workaround:** stand up a SEPARATE Python service that loads Gemma 4 via
HuggingFace `transformers` (CPU-only with 8-bit if VRAM is contested) and exposes
mid-layer via a `/hidden/{layer}` endpoint. Slow (no GPU), but unblocks HRM-inside-
Gemma architectural work today. ~50-100 tokens/sec on i5-8300H = acceptable for
development.

---

## (d) Hidden-state extraction API contract (proposed)

**Endpoint base:** `http://127.0.0.1:4925` (intended port, currently unbound).

**Routes:**

```
POST /v1/chat/completions
  Body: OpenAI-compatible chat-completion request (drop-in).
  Returns: OpenAI-compatible response.
  Backend: routes to LM Studio :1234 (today) or ORT-DML (medium-term).

POST /v1/embeddings
  Body: OpenAI-compatible embeddings request.
  Returns: OpenAI-compatible response. Default model = nomic-embed-text-v1.5 (round-tripping today).

POST /v1/hidden_states
  Body: {
    "input": "...",
    "model": "google/gemma-4-e4b",
    "layers": [0, 5, 21, 41],    // OR "layers": "all" OR "layers": "last_k:5"
    "pool": "mean" | "last" | "none",  // "none" returns per-token-per-layer matrix
    "max_tokens": 0                  // 0 = forward-only, no generation; >0 = generate then extract
  }
  Returns: {
    "model": "google/gemma-4-e4b",
    "hidden_size": 2560,
    "n_layers_returned": 4,
    "layers": [0, 5, 21, 41],
    "tokens": ["<bos>", "...", ...],   // tokenized input
    "hidden_states": [
      // shape: [n_layers, n_tokens, hidden_size] if pool=none
      // OR     [n_layers, hidden_size] if pool=mean|last
      [[...2560 floats...], ...],
      ...
    ],
    "backend": "ort-dml" | "transformers-cpu" | "llama-cpp-patched",
    "ts": "2026-05-24T00:00:00.000Z"
  }
  Cosign class: DAEMON_OP (read-only against frozen weights).

POST /v1/residual_stream_slice
  Body: {
    "input": "...",
    "model": "google/gemma-4-e4b",
    "layer": 21,                  // single layer (frozen-slice canonical handle)
    "pid_prefix": "ASOLARIA-AGT-...",   // injected as Brown-Hilbert geometric token
    "extract": "post_attn" | "post_mlp" | "post_norm"
  }
  Returns: hidden_state vector + provenance.
  Cosign class: DAEMON_OP. THIS is the prosthetic-cortex extractor per
  `project_jesse_full_architecture_recursive_self_improvement_2026_05_23.md` — the
  "HRM-INSIDE-Gemma-4 via MTP+frozen-slice+LeWorld pre-pixel hex-read" tier.

GET /v1/models
  Returns: list of available models + supported routes per model.

GET /health
  Returns: {backend, model_loaded, vram_used_mb, ts, anchor_pid}.
```

**Schema contract pins** (per `feedback_paired_agent_schema_contract_required_2026_05_22.md`):

- All hidden_state floats: float32 native (NOT bf16 wire-encoded — Pascal lacks bf16;
  receiver can downcast if desired).
- Token IDs: int32.
- Layer indices: 0-indexed (layer 0 = embedding output; layer 42 = final pre-LM-head).
- Cosign envelope for every extraction request that produces a `pattern`-class
  artifact gets logged as `MEMORY_WRITE` if results are persisted, or `DAEMON_OP` if
  transient.

**Out of scope:**

- KV cache hand-off between requests (a TRUE S-LoRA feature) — Phase 3, gated on
  ORT-DML + custom block-table implementation (M1 in L2-07).
- LoRA adapter loading — DECLINED per EX-12 canon (prefix-based per-agent identity,
  not LoRA).
- Tensor parallelism across NVIDIA 1050 + Intel UHD 630 — ORT-DML treats DX12
  compute providers uniformly, so this comes "for free" in the medium-term path
  without explicit federation work.

---

## Cosign class for substrate-level changes

| Action | Class | Justification |
|---|---|---|
| Stand up :4925 LM Studio proxy (today path) | `DAEMON_OP` | New service binding, no canon mutation |
| Switch backend from LM Studio → ORT-DML | `LAW_CHANGE` consult | Substrate-level swap; quintuple should ratify |
| First mid-layer extraction emit | `COSIGN_APPEND` | New descriptor class |
| Persist a hidden-state slice as canon | `MEMORY_WRITE` | Federation memory mutation |
| Add S-LoRA-style paging (path 2, ORT-DML port) | `LAW_CHANGE` | New substrate primitive |

---

## File-touch plan (for implementation phases)

**Phase 1 (today path — LM Studio proxy at :4925):**

1. `C:/HyperBEHCS/bin/lmstudio-proxy-4925.py` (NEW) — FastAPI/stdlib HTTP server
   that reverse-proxies `/v1/chat/completions` + `/v1/embeddings` to `127.0.0.1:1234`.
2. `C:/HyperBEHCS/bin/Start-LMStudio-Proxy.ps1` (NEW) — start/stop wrapper, PID
   file, log to `data/lmstudio-proxy/`.
3. Cosign descriptor `C:/HyperBEHCS/store/library-50d-descriptors/v43-lmstudio-proxy-4925.hbp`.

**Phase 2 (medium-term — ORT-DML backend swap):**

1. Acquire ONNX-INT4 Gemma 4 weights (`onnxruntime_genai.models.builder` per L2-07 path d).
2. `C:/HyperBEHCS/bin/ort-dml-gemma-4925.py` (NEW) — replaces lmstudio-proxy.
3. Backend-swap cosign as `LAW_CHANGE` (quintuple consult).
4. `C:/HyperBEHCS/runtime/gemma-4-e4b-it-int4/` — populate weights dir.

**Phase 3 (long-term — paging emulator):**

1. `C:/HyperBEHCS/bin/paged_kv_cache.py` (NEW) — block-table pre/post hooks for ORT-DML.
2. Cited M1 (vLLM PagedAttention port) modernization proposal as design source.

---

## Cosign provenance (DESIGN-ONLY DOC, not the substrate change itself)

This document does NOT alter the substrate. Emitting it requires `COSIGN_APPEND`
(simple-majority, authorized pool). Any `LAW_CHANGE` referenced above is a future
ratification step, not part of this emission.
