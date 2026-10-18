"""ORT-DirectML Gemma-3-4b-it adapter — V50-C canonical Pascal GPU path.

Pivot rationale: LMStudio gemma-4-e4b OOM on Pascal GTX 1050 4GB VRAM
(exit 0xC0000409 STATUS_STACK_BUFFER_OVERRUN). ORT-DirectML int4 quant
fits Pascal via DML execution provider.

Anchor: ASOLARIA-V50-C-ORT-DIRECTML-PIVOT-PID-2026-05-24
"""
import os, sys, json
from pathlib import Path

GEMMA_ONNX_PATH = os.environ.get("GEMMA_ONNX_PATH", "D:/models/gemma-3-4b-it-onnx-dml-int4/")
INSTALL_HINT = (
  "Install: pip install onnxruntime-directml==1.24.4 onnxruntime-genai-directml==0.13.1 ; "
  "download model: huggingface-cli download onnx-community/gemma-3-4b-it-ONNX --local-dir "
  "D:/models/gemma-3-4b-it-onnx-dml-int4/ (or set GEMMA_ONNX_PATH env)"
)

def _load():
  try:
    import onnxruntime_genai as og
  except ImportError as e:
    raise RuntimeError(f"onnxruntime_genai missing: {e}. {INSTALL_HINT}")
  p = Path(GEMMA_ONNX_PATH)
  if not p.exists() or not any(p.glob("*.onnx")):
    raise RuntimeError(f"Gemma ONNX model missing at {p} (no *.onnx files). {INSTALL_HINT}")
  model = og.Model(str(p))
  tok = og.Tokenizer(model)
  return og, model, tok

_cache = None
def _get():
  global _cache
  if _cache is None: _cache = _load()
  return _cache

def infer(prompt: str, max_new_tokens: int = 64) -> str:
  og, model, tok = _get()
  input_ids = tok.encode(prompt)
  params = og.GeneratorParams(model)
  params.set_search_options(max_length=len(input_ids) + max_new_tokens)
  params.input_ids = input_ids
  gen = og.Generator(model, params)
  while not gen.is_done():
    gen.compute_logits()
    gen.generate_next_token()
  out_ids = gen.get_sequence(0)
  return tok.decode(out_ids[len(input_ids):])

def status_descriptor():
  d = {"adapter": "ort-directml-gemma", "model_path": GEMMA_ONNX_PATH,
       "anchor": "ASOLARIA-V50-C-ORT-DIRECTML-PIVOT-PID-2026-05-24"}
  try:
    import onnxruntime as ort
    d["ort_device"] = ort.get_device()
    d["ort_providers"] = ort.get_available_providers()
    d["dml_provider_present"] = "DmlExecutionProvider" in ort.get_available_providers()
  except Exception as e: d["ort_error"] = str(e)
  try:
    import onnxruntime_genai as og
    d["genai_present"] = True
    d["genai_version"] = getattr(og, "__version__", "unknown")
  except Exception as e: d["genai_present"] = False; d["genai_error"] = str(e)
  p = Path(GEMMA_ONNX_PATH)
  d["model_dir_exists"] = p.exists()
  d["model_files"] = sorted([f.name for f in p.glob("*")]) if p.exists() else []
  d["onnx_files_present"] = bool(p.exists() and any(p.glob("*.onnx")))
  d["ready_to_infer"] = d.get("dml_provider_present", False) and d.get("genai_present", False) and d["onnx_files_present"]
  return d

if __name__ == "__main__":
  print(json.dumps(status_descriptor(), indent=2))
