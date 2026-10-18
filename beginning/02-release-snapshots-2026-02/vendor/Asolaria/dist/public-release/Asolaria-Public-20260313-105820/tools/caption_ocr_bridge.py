#!/usr/bin/env python3
"""
Local OCR -> Asolaria caption bridge.

Uses ai_healthcare_project OCR module to read on-screen text and push lines to:
  /api/voice/bridge-caption/push
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import requests
from PIL import ImageGrab


NOISE_RE = re.compile(
    r"(live transcript|ask tactiq|this meeting|meeting's ready|language of the meeting|"
    r"you are the only one here|call will end|interview feedback|"
    r"http://|https://|set-location|invoke-restmethod|python -u|bridge-caption|"
    r"run /review|gpt-|codex|progress:|% complete|administrador:|powershell|pesquisar)",
    re.IGNORECASE,
)


def resolve_tesseract_cmd() -> str:
    env_cmd = str(os.getenv("TESSERACT_CMD") or "").strip()
    if env_cmd and Path(env_cmd).exists():
        return env_cmd
    which_cmd = shutil.which("tesseract")
    if which_cmd:
        return str(which_cmd)
    default_cmd = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    if default_cmd.exists():
        return str(default_cmd)
    return ""


def normalize_ocr_language(language: str, preferred_engine: str) -> str:
    raw = str(language or "").strip().lower() or "en"
    if preferred_engine != "tesseract":
        return raw
    tesseract_map = {
        "en": "eng",
        "pt": "por",
        "es": "spa",
        "fr": "fra",
        "de": "deu",
        "it": "ita",
        "ja": "jpn",
        "zh": "chi_sim",
    }
    return tesseract_map.get(raw, raw)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def parse_bbox(raw: str) -> Optional[Tuple[int, int, int, int]]:
    if not raw:
        return None
    parts = [item.strip() for item in raw.split(",")]
    if len(parts) != 4:
        raise ValueError("--bbox must be x1,y1,x2,y2")
    x1, y1, x2, y2 = [int(item) for item in parts]
    if x2 <= x1 or y2 <= y1:
        raise ValueError("--bbox coordinates are invalid")
    return (x1, y1, x2, y2)


def capture_image(
    path: Path,
    bbox: Optional[Tuple[int, int, int, int]],
    all_screens: bool,
    screen_index: int,
    capture_script: Optional[Path],
) -> None:
    if screen_index >= 0 and capture_script and capture_script.exists():
        cmd = [
            "powershell",
            "-NoProfile",
            "-File",
            str(capture_script),
            "-OutputPath",
            str(path),
            "-ScreenIndex",
            str(screen_index),
        ]
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return
    try:
        image = ImageGrab.grab(bbox=bbox, all_screens=all_screens)
    except TypeError:
        image = ImageGrab.grab(bbox=bbox)
    image.save(path)


def split_lines(candidate: str, max_chars: int) -> List[str]:
    value = str(candidate or "").strip()
    if not value:
        return []
    chunks = []
    for part in re.split(r"[\n\r]+|(?<=[.!?])\s+", value):
        text = normalize_space(part)
        if not text:
            continue
        while len(text) > max_chars:
            window = text[: max_chars + 1]
            cut = window.rfind(" ")
            if cut < 40:
                cut = max_chars
            chunks.append(text[:cut].strip())
            text = text[cut:].strip()
        if text:
            chunks.append(text)
    return chunks


def should_emit(line: str, min_chars: int, max_chars: int) -> bool:
    text = normalize_space(line)
    if not text:
        return False
    if len(text) < min_chars or len(text) > max_chars:
        return False
    if NOISE_RE.search(text):
        return False
    if len(re.findall(r"[A-Za-zÀ-ÿ0-9]", text)) < 4:
        return False
    return True


def fetch_active_session(api_base: str, timeout_seconds: float) -> str:
    url = f"{api_base.rstrip('/')}/api/voice/bridge-caption/pull"
    try:
        resp = requests.get(
            url,
            params={"afterId": 0, "limit": 1},
            timeout=timeout_seconds,
        )
        if resp.ok:
            data = resp.json()
            return str(data.get("sessionId") or "").strip()
    except Exception:
        return ""
    return ""


def push_line(
    api_base: str,
    session_id: str,
    source: str,
    text: str,
    timeout_seconds: float,
) -> bool:
    url = f"{api_base.rstrip('/')}/api/voice/bridge-caption/push"
    params = {
        "text": text,
        "source": source,
        "sessionId": session_id,
        "at": now_iso(),
    }
    try:
        resp = requests.get(url, params=params, timeout=timeout_seconds)
        return bool(resp.ok)
    except Exception:
        return False


def init_extractor(ai_healthcare_root: Path, preferred_engine: str):
    if not ai_healthcare_root.exists():
        raise FileNotFoundError(f"ai_healthcare_project root not found: {ai_healthcare_root}")
    sys.path.insert(0, str(ai_healthcare_root))
    from backend.ocr.text_extractor import TextExtractor  # pylint: disable=import-error

    enable_tesseract = bool(resolve_tesseract_cmd())
    enable_easyocr = preferred_engine != "tesseract"

    if preferred_engine == "tesseract" and not enable_tesseract:
        raise RuntimeError(
            "Tesseract engine requested but tesseract executable was not found. "
            "Install tesseract or use --engine easyocr."
        )

    return TextExtractor(
        tesseract_enabled=enable_tesseract,
        easyocr_enabled=enable_easyocr,
        preferred_engine=preferred_engine,
    )


def delta_text(previous: str, current: str) -> str:
    if not current:
        return ""
    if not previous:
        return current
    if current == previous:
        return ""
    if current.startswith(previous):
        return normalize_space(current[len(previous) :])
    if previous in current:
        idx = current.find(previous)
        return normalize_space(current[idx + len(previous) :])
    return current


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Asolaria local OCR caption bridge")
    parser.add_argument("--api-base", default="http://127.0.0.1:4781")
    parser.add_argument("--source", default="google_meet_caption")
    parser.add_argument("--session-id", default="")
    parser.add_argument("--ai-healthcare-root", default=r"C:\Users\acer\ai_healthcare_project")
    parser.add_argument("--engine", default="auto", choices=["auto", "tesseract", "easyocr"])
    parser.add_argument("--language", default="en")
    parser.add_argument("--interval-ms", type=int, default=900)
    parser.add_argument("--session-refresh-sec", type=float, default=2.0)
    parser.add_argument("--timeout-sec", type=float, default=4.0)
    parser.add_argument("--min-confidence", type=float, default=0.15)
    parser.add_argument("--min-chars", type=int, default=8)
    parser.add_argument("--max-chars", type=int, default=320)
    parser.add_argument("--bbox", default="")
    parser.add_argument("--all-screens", action="store_true")
    parser.add_argument("--screen-index", type=int, default=-1)
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--max-seconds", type=float, default=0.0)
    return parser.parse_args(argv)


def main(argv: Sequence[str]) -> int:
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")

    args = parse_args(argv)
    bbox = parse_bbox(args.bbox)
    ai_healthcare_root = Path(args.ai_healthcare_root).resolve()
    capture_script = Path(__file__).resolve().parent / "Capture-PrimaryScreen.ps1"
    tesseract_cmd = resolve_tesseract_cmd()
    if tesseract_cmd:
        os.environ["TESSERACT_CMD"] = tesseract_cmd
        tessdata_dir = Path(tesseract_cmd).resolve().parent / "tessdata"
        if tessdata_dir.exists():
            os.environ.setdefault("TESSDATA_PREFIX", str(tessdata_dir))
    if args.engine == "auto":
        preferred_engine = "tesseract" if tesseract_cmd else "easyocr"
    else:
        preferred_engine = args.engine
    ocr_language = normalize_ocr_language(args.language, preferred_engine)

    print(f"[ocr-bridge] boot {now_iso()} source={args.source} api={args.api_base}")
    extractor = init_extractor(ai_healthcare_root, preferred_engine=preferred_engine)
    print("[ocr-bridge] OCR extractor ready")

    session_id = str(args.session_id or "").strip()
    last_session_refresh = 0.0
    seen_recent: Dict[str, float] = {}
    previous_ocr_text = ""
    started = time.time()
    tick = max(0.2, float(args.interval_ms) / 1000.0)
    session_refresh = max(0.5, float(args.session_refresh_sec))

    while True:
        if args.max_seconds > 0 and (time.time() - started) > args.max_seconds:
            print("[ocr-bridge] max-seconds reached; stopping")
            break

        now = time.time()
        if not args.session_id and (not session_id or (now - last_session_refresh) >= session_refresh):
            active = fetch_active_session(args.api_base, args.timeout_sec)
            last_session_refresh = now
            if active and active != session_id:
                session_id = active
                seen_recent.clear()
                previous_ocr_text = ""
                print(f"[ocr-bridge] attached session={session_id}")

        if not session_id:
            time.sleep(tick)
            continue

        with tempfile.TemporaryDirectory(prefix="asolaria_ocr_") as temp_dir:
            image_path = Path(temp_dir) / "frame.png"
            capture_image(
                image_path,
                bbox=bbox,
                all_screens=bool(args.all_screens),
                screen_index=int(args.screen_index),
                capture_script=capture_script,
            )
            try:
                result = asyncio.run(
                    extractor.extract_text(
                        image_path=str(image_path),
                        language=ocr_language or None,
                        engine=None if args.engine == "auto" else args.engine,
                    )
                )
            except Exception as exc:  # noqa: BLE001
                print(f"[ocr-bridge] OCR error: {exc}")
                time.sleep(tick)
                continue

        confidence = float(getattr(result, "confidence", 0.0) or 0.0)
        if confidence < float(args.min_confidence):
            if args.once:
                print(f"[ocr-bridge] low confidence={confidence:.3f}, exiting once-mode")
                break
            time.sleep(tick)
            continue

        text = normalize_space(getattr(result, "text", ""))
        delta = delta_text(previous_ocr_text, text)
        previous_ocr_text = text
        if not delta:
            if args.once:
                print("[ocr-bridge] no OCR delta, exiting once-mode")
                break
            time.sleep(tick)
            continue

        emitted = 0
        now_epoch = time.time()
        stale_before = now_epoch - 45.0
        stale_keys = [key for key, ts in seen_recent.items() if ts < stale_before]
        for key in stale_keys:
            seen_recent.pop(key, None)

        for line in split_lines(delta, max_chars=args.max_chars):
            if not should_emit(line, min_chars=args.min_chars, max_chars=args.max_chars):
                continue
            key = normalize_space(line).lower()
            if key in seen_recent:
                continue
            ok = push_line(
                api_base=args.api_base,
                session_id=session_id,
                source=args.source,
                text=line,
                timeout_seconds=args.timeout_sec,
            )
            if ok:
                seen_recent[key] = now_epoch
                emitted += 1
                print(f"[ocr-bridge] push ok: {line[:110]}")
            else:
                print(f"[ocr-bridge] push failed: {line[:110]}")

        if args.once:
            print(f"[ocr-bridge] once-mode done, emitted={emitted}")
            break

        time.sleep(tick)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
