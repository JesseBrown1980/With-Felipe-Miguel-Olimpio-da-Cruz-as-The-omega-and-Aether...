#!/usr/bin/env python3
"""OMNIEVENT47 v1.1 launcher.

v1 used importlib.module_from_spec without registering dynamically loaded modules
in sys.modules. Python dataclasses consult sys.modules while decorating classes,
so the first CI run failed before emitting any event. This launcher preserves that
mistake and fixes the loader without changing the v1 event or accounting logic.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def load_registered(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ImportError(path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main() -> None:
    here = Path(__file__).resolve().parent
    core = load_registered("omnievent47_core_v1", here / "omnievent47_instrumented_quant_v1.py")

    def fixed_loader(path: Path):
        return load_registered("multilevel_bpe", Path(path))

    core.load_module = fixed_loader
    core.main()


if __name__ == "__main__":
    main()
