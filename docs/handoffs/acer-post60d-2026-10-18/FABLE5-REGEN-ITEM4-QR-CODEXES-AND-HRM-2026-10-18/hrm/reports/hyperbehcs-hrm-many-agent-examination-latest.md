# HyperBEHCS HRM Many-Agent Examination

Date: 2026-05-16

Scope: read-only multi-agent examination of `D:/Asolaria-HRM` and the current Asolaria HRM/HyperBEHCS integration. No HRM Python imports, model execution, package installs, dataset downloads, CUDA probes, W&B calls, or checkpoint loads were performed.

## Agents

- Mencius: HRM model architecture, tensor shapes, recurrent H/L mechanics, ACT halting, parameter drivers.
- Halley: HRM dataset, training, evaluation, dependency/runtime behavior.
- Tesla: HyperBEHCS fit and how HRM can be absorbed without reducing Quant.
- Newton: safety/security and runtime gate risks.
- Kant: structural/symbolic overlap and non-overlap between Asolaria and upstream HRM.

## What HRM Actually Is

HRM is not an autoregressive chat LLM and not a general policy agent.

It is a fixed-length, non-causal, structured token/grid reasoner. It uses LM-like token embeddings and per-position logits, but its source path is puzzle/state-transition solving, not free-form text generation.

Core files:

- [hrm_act_v1.py](</D:/Asolaria-HRM/models/hrm/hrm_act_v1.py>)
- [layers.py](</D:/Asolaria-HRM/models/layers.py>)
- [losses.py](</D:/Asolaria-HRM/models/losses.py>)
- [puzzle_dataset.py](</D:/Asolaria-HRM/puzzle_dataset.py>)
- [pretrain.py](</D:/Asolaria-HRM/pretrain.py>)
- [evaluate.py](</D:/Asolaria-HRM/evaluate.py>)

## Model Mechanics

HRM has two recurrent transformer-like modules:

- `H_level`: high-level recurrent reasoning module.
- `L_level`: low-level recurrent computation module.

Default config:

- `H_cycles: 2`
- `L_cycles: 2`
- `H_layers: 4`
- `L_layers: 4`
- `hidden_size: 512`
- `num_heads: 8`
- `halt_max_steps: 16`
- `pos_encodings: rope`

For batch `B`, sequence length `S`, hidden size `D`, vocab `V`, and puzzle prefix length `P`, HRM uses:

- `inputs`: `[B, S]`
- `puzzle_identifiers`: `[B]`
- internal sequence length: `T = S + P`
- `z_H`: `[B, T, D]`
- `z_L`: `[B, T, D]`
- logits: `[B, S, V]`
- `q_halt_logits`: `[B]`
- `q_continue_logits`: `[B]`

The recurrent loop performs most H/L updates under `torch.no_grad()`, then performs one gradient-tracked `L -> H` update. New carry is detached after each outer step. This is truncated recurrent training, not full BPTT through every inner cycle.

## Halt/Continue

The Q head reads `z_H[:, 0]` and emits two logits:

- `q_halt_logits`
- `q_continue_logits`

Training may halt early when `q_halt > q_continue`, subject to exploration and `halt_max_steps`. Evaluation runs to `halt_max_steps`. The Q head is a learned halt/continue controller, not authority to execute actions.

For HyperBEHCS, these should map only to hookwall candidate signals.

## Dataset And Runtime

Expected dataset layout:

- `data_path/train/dataset.json`
- `data_path/test/dataset.json`
- `<set>__inputs.npy`
- `<set>__labels.npy`
- `<set>__puzzle_identifiers.npy`
- `<set>__puzzle_indices.npy`
- `<set>__group_indices.npy`

The loader memory-maps inputs/labels, keeps indices in memory, converts ignored labels to `-100`, and yields fixed-shape puzzle batches.

Current local state:

- HRM source installed at `D:/Asolaria-HRM`
- Commit: `ac15626f8db096a63c775b84c9dc868776a6feda`
- Isolated venv exists: `D:/Asolaria-HRM/.venv`
- No datasets present.
- No checkpoints present.
- Git submodules are not initialized.
- Python dependencies are not installed.
- HRM runtime gate is blocked: `7/14` pass, `7/14` blocked.

## Runtime Risks

HRM is not Windows-safe or CPU-safe as cloned.

Observed risks:

- `models/layers.py` imports `flash_attn_interface` or `flash_attn` at import time; no PyTorch SDPA fallback.
- `pretrain.py` hard-codes CUDA paths via `torch.device("cuda")`, `.cuda()`, NCCL, and `torch.cuda.set_device`.
- `evaluate.py` uses `torch.load()` on checkpoints and loads to CUDA.
- Requirements are unpinned.
- FlashAttention is not in `requirements.txt`.
- README expects separate CUDA/PyTorch/FlashAttention setup.
- Dataset builders use Hugging Face downloads and Git submodules.
- W&B is used by training and can log code/config.

Before model execution, required hookwall gates include source seal, dependency pinning, CUDA/device or CPU-fallback policy, checkpoint hash allowlist, dataset provenance, telemetry policy, timeout/rollback, and runtime promotion.

## HyperBEHCS Fit

HRM should fit after Quant, not inside or before Quant.

Do not call HRM from HYP-255/HYP-256 quant encode/evaluate paths. Do not replace fast packet parsing. Do not reduce quant receipts.

Correct fit:

```text
accepted Triple Quant packet
  -> HRM descriptor encoder
  -> optional HRM advisory output
  -> Carry-Z / offline policy / hookwall candidate
  -> Quant receipt
  -> GNN / Gulp / GC
```

Specific insertion points:

- After HYP-256 accepted packet projection.
- Reflex lesson/query candidate flow.
- Rotor `hrm` plane as address/scheduling descriptor.
- HRM runtime only after readiness gate plus hookwall promotion.

## Encoder/Decoder Needed

An actual integration needs a descriptor adapter before runtime:

- Encoder: deterministic HyperBEHCS descriptor to HRM-style `inputs` plus `puzzle_identifiers`.
- Dataset writer: produce HRM dataset folders for synthetic and real replay tasks.
- Decoder: HRM logits back to candidate descriptor tokens.
- Halt decoder: `q_halt/q_continue` to hookwall candidates only.
- Receipt wrapper: quantize/hash every HRM input/output.

The safest next implementation is a pure descriptor adapter:

`hyperbehcs-hrm-descriptor-adapter`

It should read HYP-256 accepted rows, Carry-Z status/replay/gate, HRM absorption, HRM readiness, and the room rotor report. It should emit a vocab/encoder/decoder contract, GNN edges, Shannon symbols, and dashboard feed. It must import no Torch, execute no Python, install no dependencies, download no data, and assert HYP-256 counts/fingerprints remain unchanged.

## Similarity / Provenance Findings

Conceptual matches:

- HRM has `H_level` / `L_level`; Asolaria maps them to `think.high_level_plan` / `think.low_level_compute`.
- HRM has `z_H` / `z_L`; Asolaria maps them to Carry-Z descriptors.
- HRM has `q_halt/q_continue`; Asolaria maps them to hookwall candidates.
- Both systems care about recurrent state, carry, halting, and structured state transition.

Non-matches:

- No exact HRM PyTorch implementation symbols were found in Asolaria source: `HierarchicalReasoningModel_ACTV1`, `CastedSparseEmbedding`, `RotaryEmbedding`, `SwiGLU`, `rms_norm`, `target_q_continue`, `halt_exploration_prob`.
- No exact HRM puzzle implementation symbols were found in Asolaria source: `PuzzleDataset`, `puzzle_identifiers`, `puzzle_indices`, `group_indices`, `build_sudoku_dataset`, `build_maze_dataset`, `build_arc_dataset`.
- No Brown-Hilbert / HyperBEHCS terms were found in the upstream HRM base source areas.
- HRM source does not include `turbo_quant`, `polar_quant`, `triple_quant`, `carry_z`, or GNN terms outside the Asolaria-generated `asolaria-integration` artifacts.

Conclusion: HRM is architecturally aligned with HyperBEHCS ideas, but the local evidence does not show a direct code copy or proven lineage.

## Bottom Line

HRM is a small recurrent structured-reasoning model that can behave like a much larger model on narrow, fixed-format reasoning tasks because it spends compute through repeated internal H/L cycles instead of free-form chain-of-thought text.

For Asolaria, the correct move is to absorb it as a structured reasoning kernel behind Quant, Carry-Z, GNN/Gulp/GC, and hookwall. The next safe work is descriptor/dataset adapter construction, not model execution.
