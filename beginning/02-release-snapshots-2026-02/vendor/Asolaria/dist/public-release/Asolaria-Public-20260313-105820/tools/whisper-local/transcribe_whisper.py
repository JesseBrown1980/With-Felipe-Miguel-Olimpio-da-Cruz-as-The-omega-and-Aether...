#!/usr/bin/env python3
"""
Local Whisper adapter for Asolaria.

Expected argv from Asolaria voice connector:
  transcribe_whisper.py <input_path> [--language <code>] [--model <name>]
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("input_path")
    parser.add_argument("--language", default="en")
    parser.add_argument("--model", default="")
    parser.add_argument("--help", action="help")
    return parser.parse_args()


def resolve_model(requested_model: str) -> str:
    model = (requested_model or "").strip()
    if model:
        return model
    env_model = os.environ.get("ASOLARIA_WHISPER_MODEL", "").strip()
    if env_model:
        return env_model
    return "small.en"


def resolve_cache_dir() -> str:
    env_cache = os.environ.get("ASOLARIA_WHISPER_CACHE_DIR", "").strip()
    if env_cache:
        return env_cache
    default_path = Path(__file__).resolve().parents[2] / "data" / "models" / "faster-whisper"
    return str(default_path)


def main() -> int:
    args = parse_args()
    input_path = Path(args.input_path).resolve()
    if not input_path.exists():
        print(f"Audio file not found: {input_path}", file=sys.stderr)
        return 2

    try:
        from faster_whisper import WhisperModel
    except Exception as exc:  # pragma: no cover
        print(f"faster-whisper import failed: {exc}", file=sys.stderr)
        return 3

    model_name = resolve_model(args.model)
    cache_dir = resolve_cache_dir()
    language = (args.language or "").strip().lower()
    if not language or language == "auto":
        language = None

    try:
        model = WhisperModel(
            model_name,
            device="cpu",
            compute_type="int8",
            download_root=cache_dir,
            local_files_only=False,
        )
        segments, _info = model.transcribe(
            str(input_path),
            language=language,
            vad_filter=True,
            beam_size=1,
            best_of=1,
            temperature=0.0,
            condition_on_previous_text=False,
        )
        text = " ".join((seg.text or "").strip() for seg in segments).strip()
        print(text)
        return 0
    except Exception as exc:  # pragma: no cover
        print(f"whisper transcribe failed: {exc}", file=sys.stderr)
        return 4


if __name__ == "__main__":
    raise SystemExit(main())

