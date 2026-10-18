#!/usr/bin/env python
"""OpenMythos glyph adapter for Asolaria.

This is a gated runtime bridge. It can host an OpenMythos model if the
`open-mythos` package, config, optional weights, and a valid input path are
present. Without those, it still answers STATUS/DRIFT and returns honest
BLOCKED responses instead of pretending a model ran.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional


MAX_DEFAULT_LOOPS = 16


def _clean_text(value: Any, max_len: int = 4000) -> str:
    text = str(value or "").replace("\r", "").strip()
    return text[:max_len]


def _clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except Exception:
        return default
    return max(minimum, min(maximum, parsed))


def _safe_json_load(path: Optional[str]) -> Dict[str, Any]:
    if not path:
        return {}
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _import_open_mythos():
    try:
        from open_mythos.main import MythosConfig, OpenMythos  # type: ignore

        return OpenMythos, MythosConfig, None
    except Exception as error:
        try:
            from open_mythos import MythosConfig, OpenMythos  # type: ignore

            return OpenMythos, MythosConfig, None
        except Exception:
            return None, None, error


def _import_torch():
    try:
        import torch  # type: ignore

        return torch, None
    except Exception as error:
        return None, error


@dataclass
class MythosGlyphEngine:
    pid: str
    device: str = "cpu"
    max_loops: int = MAX_DEFAULT_LOOPS
    model: Any = None
    config: Dict[str, Any] = field(default_factory=dict)
    spectral_radius: Optional[float] = None
    drift_signal: str = "SOFT"
    loop_count: int = 0
    model_loaded: bool = False
    last_error: str = ""
    weights_path: str = ""

    def load_model(self, config_path: str, weights_path: str = "") -> Dict[str, Any]:
        config_path = _clean_text(config_path, 1000)
        weights_path = _clean_text(weights_path, 1000)
        if not config_path:
            return self._blocked("config_path_missing")
        if not Path(config_path).exists():
            return self._blocked(f"config_path_not_found:{config_path}")

        OpenMythos, MythosConfig, import_error = _import_open_mythos()
        if import_error is not None:
            return self._blocked(f"open_mythos_import_failed:{import_error}")

        torch, torch_error = _import_torch()
        if torch_error is not None:
            return self._blocked(f"torch_import_failed:{torch_error}")

        try:
            cfg_dict = _safe_json_load(config_path)
            cfg = MythosConfig(**cfg_dict)
            model = OpenMythos(cfg)
            if weights_path:
                if not Path(weights_path).exists():
                    return self._blocked(f"weights_path_not_found:{weights_path}")
                state = torch.load(weights_path, map_location=self.device)
                model.load_state_dict(state)
                self.weights_path = weights_path
            model = model.to(self.device)
            model.eval()
            self.model = model
            self.config = cfg_dict
            self.model_loaded = True
            self.last_error = ""
            self._update_spectral_radius()
            return {
                "status": "loaded",
                "pid": self.pid,
                "device": self.device,
                "config_path": config_path,
                "weights_loaded": bool(weights_path),
                "spectral_radius": self.spectral_radius,
                "drift_signal": self.drift_signal,
            }
        except Exception as error:
            self.model = None
            self.model_loaded = False
            self.last_error = f"{type(error).__name__}: {error}"
            return self._error("load_failed", error)

    def handle(self, command: Dict[str, Any]) -> Dict[str, Any]:
        verb = _clean_text(command.get("verb") or command.get("glyphVerb") or "", 80).upper()
        if not verb and "glyph" in command:
            parts = _clean_text(command.get("glyph"), 8000).split(" ", 2)
            verb = parts[0].upper() if parts else ""
            if len(parts) > 1 and not command.get("pid"):
                command["pid"] = parts[1]
            if len(parts) > 2 and not command.get("prompt"):
                command["prompt"] = parts[2]

        if verb in ("LOAD", "MYTHOS_LOAD"):
            return self.load_model(command.get("config_path") or command.get("configPath") or "", command.get("weights_path") or command.get("weightsPath") or "")
        if verb in ("THINK", "MYTHOS_THINK"):
            return self.think(command)
        if verb in ("REASON", "MYTHOS_REASON"):
            return self.reason(command)
        if verb in ("LOOP", "MYTHOS_LOOP"):
            return self.set_loop_count(command)
        if verb in ("STATUS", "MYTHOS_STATUS"):
            return self.status()
        if verb in ("DRIFT", "MYTHOS_DRIFT"):
            return self.check_drift()
        if verb in ("HALT", "MYTHOS_HALT"):
            return self.halt()
        return self._blocked(f"unknown_verb:{verb or 'missing'}")

    def think(self, command: Dict[str, Any]) -> Dict[str, Any]:
        loops = _clamp_int(command.get("loops") or command.get("n_loops"), self.loop_count or 8, 1, self.max_loops)
        self.loop_count = loops
        if not self.model_loaded or self.model is None:
            return self._blocked("model_not_loaded")

        torch, torch_error = _import_torch()
        if torch_error is not None:
            return self._blocked(f"torch_import_failed:{torch_error}")

        input_ids = command.get("input_ids") or command.get("inputIds")
        if input_ids is None:
            return self._blocked("input_ids_required_no_tokenizer_in_adapter")

        try:
            tensor = torch.tensor(input_ids, dtype=torch.long, device=self.device)
            if tensor.dim() == 1:
                tensor = tensor.unsqueeze(0)
            max_new_tokens = _clamp_int(command.get("max_new_tokens") or command.get("maxTokens"), 64, 1, 2048)
            with torch.no_grad():
                if hasattr(self.model, "generate"):
                    output = self.model.generate(tensor, max_new_tokens=max_new_tokens, n_loops=loops)
                    payload = output.detach().cpu().tolist() if hasattr(output, "detach") else output
                else:
                    output = self.model(tensor, n_loops=loops)
                    payload = output.detach().cpu().tolist() if hasattr(output, "detach") else str(output)
            self._update_spectral_radius()
            return {
                "status": "success",
                "pid": self.pid,
                "device": self.device,
                "loops_used": loops,
                "output_ids": payload,
                "spectral_radius": self.spectral_radius,
                "drift_signal": self.drift_signal,
            }
        except Exception as error:
            self.last_error = f"{type(error).__name__}: {error}"
            return self._error("think_failed", error)

    def reason(self, command: Dict[str, Any]) -> Dict[str, Any]:
        loops = _clamp_int(command.get("loops") or command.get("n_loops"), self.loop_count or 8, 1, self.max_loops)
        self.loop_count = loops
        if not self.model_loaded:
            return self._blocked("model_not_loaded")
        self._update_spectral_radius()
        return {
            "status": "reason_ready",
            "pid": self.pid,
            "loops_used": loops,
            "spectral_radius": self.spectral_radius,
            "drift_signal": self.drift_signal,
            "note": "Latent-state extraction is model-internal and remains disabled until an explicit OpenMythos API is verified.",
        }

    def set_loop_count(self, command: Dict[str, Any]) -> Dict[str, Any]:
        value = command.get("loops")
        if value is None and "glyph" in command:
            parts = _clean_text(command.get("glyph"), 1000).split()
            if len(parts) >= 3:
                value = parts[2]
            elif len(parts) >= 2:
                value = parts[1]
        self.loop_count = _clamp_int(value, self.loop_count or 8, 1, self.max_loops)
        return {"status": "loop_count_set", "pid": self.pid, "value": self.loop_count}

    def status(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "pid": self.pid,
            "device": self.device,
            "model_loaded": self.model_loaded,
            "spectral_radius": self.spectral_radius,
            "last_loop_count": self.loop_count,
            "drift_signal": self.drift_signal,
            "last_error": self.last_error,
        }

    def check_drift(self) -> Dict[str, Any]:
        self._update_spectral_radius()
        recommendation = "FREEZE" if self.drift_signal == "CRITICAL" else "CONTINUE"
        return {
            "status": "drift_checked",
            "pid": self.pid,
            "spectral_radius": self.spectral_radius,
            "drift_signal": self.drift_signal,
            "recommendation": recommendation,
            "law": "LAW-099-openmythos-recurrence-stability",
        }

    def halt(self) -> Dict[str, Any]:
        self.model = None
        self.model_loaded = False
        return {"status": "halted", "pid": self.pid}

    def _update_spectral_radius(self) -> None:
        self.spectral_radius = self._estimate_spectral_radius()
        radius = self.spectral_radius
        if radius is None:
            self.drift_signal = "SOFT"
        elif radius >= 1.0:
            self.drift_signal = "CRITICAL"
        elif radius >= 0.95:
            self.drift_signal = "HARD"
        else:
            self.drift_signal = "SOFT"

    def _estimate_spectral_radius(self) -> Optional[float]:
        if self.model is None:
            return None
        torch, _ = _import_torch()
        if torch is None:
            return None

        candidates = []

        # OpenMythos 0.5.0 exposes the LTI stability matrix at
        # model.recurrent.injection.get_A().
        try:
            injection = getattr(getattr(self.model, "recurrent", None), "injection", None)
            if injection is not None and hasattr(injection, "get_A"):
                candidates.append(injection.get_A())
        except Exception:
            pass

        for name in ("A", "a", "recurrent_A", "injection_A"):
            if hasattr(self.model, name):
                candidates.append(getattr(self.model, name))
        for attr in ("recurrent", "recurrent_block", "injection"):
            obj = getattr(self.model, attr, None)
            if obj is None:
                continue
            for name in ("A", "a", "recurrent_A", "injection_A"):
                if hasattr(obj, name):
                    candidates.append(getattr(obj, name))
            if hasattr(obj, "get_A"):
                try:
                    candidates.append(obj.get_A())
                except Exception:
                    pass

        for candidate in candidates:
            try:
                matrix = candidate
                if hasattr(matrix, "weight"):
                    matrix = matrix.weight
                if not hasattr(matrix, "detach"):
                    continue
                matrix = matrix.detach()
                if matrix.dim() < 2:
                    continue
                if matrix.dim() > 2:
                    matrix = matrix.reshape(matrix.shape[-2], matrix.shape[-1])
                if matrix.shape[-1] != matrix.shape[-2]:
                    continue
                eig = torch.linalg.eigvals(matrix.float()).abs().max().item()
                if math.isfinite(float(eig)):
                    return float(eig)
            except Exception:
                continue
        return None

    def _blocked(self, reason: str) -> Dict[str, Any]:
        self.last_error = reason
        return {
            "status": "blocked",
            "pid": self.pid,
            "reason": reason,
            "model_loaded": self.model_loaded,
            "spectral_radius": self.spectral_radius,
            "drift_signal": self.drift_signal,
        }

    def _error(self, code: str, error: Exception) -> Dict[str, Any]:
        return {
            "status": "error",
            "pid": self.pid,
            "code": code,
            "error": f"{type(error).__name__}: {error}",
            "trace": traceback.format_exc(limit=5),
        }


def run_server(engine: MythosGlyphEngine) -> int:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            command = json.loads(line)
            result = engine.handle(command)
        except Exception as error:
            result = engine._error("command_failed", error)
        sys.stdout.write(json.dumps(result, separators=(",", ":")) + "\n")
        sys.stdout.flush()
    return 0


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Asolaria OpenMythos glyph adapter")
    parser.add_argument("--pid", default="BH.COGNITIVE.OPENMYTHOS.PID.0000000001")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--max-loops", type=int, default=MAX_DEFAULT_LOOPS)
    parser.add_argument("--config", default="")
    parser.add_argument("--weights", default="")
    parser.add_argument("--once", default="", help="Run one JSON command and exit")
    args = parser.parse_args(argv)

    engine = MythosGlyphEngine(pid=args.pid, device=args.device, max_loops=max(1, args.max_loops))
    if args.config:
        load_result = engine.load_model(args.config, args.weights)
        if args.once:
            command = json.loads(args.once)
            result = {"load": load_result, "result": engine.handle(command)}
            print(json.dumps(result, separators=(",", ":")))
            return 0
        print(json.dumps(load_result, separators=(",", ":")), flush=True)

    if args.once:
        command = json.loads(args.once)
        print(json.dumps(engine.handle(command), separators=(",", ":")))
        return 0

    return run_server(engine)


if __name__ == "__main__":
    raise SystemExit(main())
