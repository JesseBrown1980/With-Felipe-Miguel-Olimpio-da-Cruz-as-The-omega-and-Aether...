#!/usr/bin/env python3
"""Safe loaders for the sudoku/easy NCM checkpoints and datasets.

This is the loading layer the reproduction WOULD use. It is HELD: nothing here
runs on its own. The static scanner (`scan`) executes no pickle opcodes and is
safe on untrusted files; the actual object loaders (`load_pt`, `load_pickle`)
refuse to run unless the operator sets NCM_OPERATOR_GO=1 (E != 0 gate).

Why this exists: the vendored upstream code loads these files with
`torch.load(..., weights_only=False)` and `pickle.load(...)` (see
vendor/ncm/scripts/eval_shard.py:52,87,88 and
vendor/ncm/tokenization/vqvae_tokenizer.py:18). Both run arbitrary code on an
untrusted file. This module replaces that with: (1) a static pickletools scan of
every GLOBAL the file references, (2) torch.load(weights_only=True) with an
explicit, inspected allowlist for the .pt files, and (3) a restricted unpickler
for the raw .pickle datasets.

Run with: python3 -I safe_load.py <subcommand> ...
"""
import argparse
import io
import os
import pickle
import pickletools
import sys
import zipfile

BANNER = (
    "HELD - E != 0: object loading has NOT been run. "
    "Set NCM_OPERATOR_GO=1 to enable, only on the operator's explicit go."
)

# ---------------------------------------------------------------------------
# Expected globals, derived from the vendored source alone (nothing loaded).
# ---------------------------------------------------------------------------
# .pt state-dict checkpoints: eval_shard.py does net.load_state_dict(sd["model"])
# and vqvae_tokenizer.py does vqvae.load_state_dict(torch.load(...)["model"]).
# A state_dict is an OrderedDict of tensors, so the only globals a tensors-only
# payload needs are these, and all are on torch's default weights_only allowlist:
EXPECTED_PT_SAFE = {
    ("collections", "OrderedDict"),
    ("torch._utils", "_rebuild_tensor_v2"),
    ("torch._utils", "_rebuild_parameter"),
    ("torch", "FloatStorage"),
    ("torch", "HalfStorage"),
    ("torch", "LongStorage"),
    ("torch", "BFloat16Storage"),
    ("torch.storage", "UntypedStorage"),
}
# The upstream code uses weights_only=False, which strongly implies the top-level
# checkpoint dict carries more than tensors (training config and/or args). These
# are the pure-data globals that weights_only=True would REFUSE but that are safe
# to allowlist with torch.serialization.add_safe_globals IF -- and only if -- the
# static scan shows exactly them and nothing executable:
MAYBE_PT_EXTRA = {
    ("omegaconf.dictconfig", "DictConfig"),
    ("omegaconf.listconfig", "ListConfig"),
    ("omegaconf.base", "ContainerMetadata"),
    ("omegaconf.base", "Metadata"),
    ("omegaconf.nodes", "AnyNode"),
    ("argparse", "Namespace"),
    ("numpy.core.multiarray", "scalar"),
    ("numpy._core.multiarray", "scalar"),
    ("numpy", "dtype"),
}

# Raw dataset .pickle files (sudoku/easy/puzzles.pickle, solutions.pickle) are
# loaded by plain pickle.load and consumed as integer sequences (eval_shard.py
# does list(item); the sudoku branch never treats items as str). So the payload
# is a list of int-rows or of numpy arrays. This is the ONLY allowlist the
# restricted unpickler permits; anything else raises.
ALLOWED_PICKLE_GLOBALS = {
    ("numpy.core.multiarray", "_reconstruct"),
    ("numpy._core.multiarray", "_reconstruct"),
    ("numpy.core.multiarray", "scalar"),
    ("numpy._core.multiarray", "scalar"),
    ("numpy", "ndarray"),
    ("numpy", "dtype"),
    ("builtins", "list"),
    ("builtins", "tuple"),
    ("builtins", "dict"),
    ("builtins", "int"),
    ("builtins", "float"),
    ("builtins", "bool"),
    ("builtins", "bytes"),
    ("builtins", "str"),
    ("builtins", "complex"),
}


def _open_pickle_stream(path):
    """Return a readable stream of the pickle, handling torch zip .pt files.

    torch.save writes a zip archive containing <archive>/data.pkl. For a plain
    pickle the file itself is the stream. Neither path executes any opcode.
    """
    if zipfile.is_zipfile(path):
        z = zipfile.ZipFile(path)
        members = [n for n in z.namelist() if n.endswith("data.pkl")]
        if not members:
            raise ValueError(f"{path}: zip has no data.pkl member")
        return io.BytesIO(z.read(members[0])), members[0]
    return open(path, "rb"), path


def scan_globals(path):
    """Statically list every (module, name) GLOBAL the pickle references.

    Uses pickletools.genops, which disassembles opcodes without executing them,
    so it is safe on untrusted files.
    """
    stream, member = _open_pickle_stream(path)
    found = set()
    try:
        for op, arg, _pos in pickletools.genops(stream):
            if op.name in ("GLOBAL", "STACK_GLOBAL") and isinstance(arg, str):
                mod, _, name = arg.partition(" ")
                found.add((mod, name))
    finally:
        stream.close()
    return member, found


def _classify_pt(found):
    unknown = found - EXPECTED_PT_SAFE - MAYBE_PT_EXTRA
    needs_allowlist = found & MAYBE_PT_EXTRA
    return needs_allowlist, unknown


def load_pt(path, require_model_key=True):
    """Load a .pt checkpoint with torch.load(weights_only=True, cpu).

    First scans; refuses if any global outside the inspected safe/extra sets
    appears. Allowlists only the exact pure-data extras the scan reveals.
    """
    _require_go()
    import torch

    _member, found = scan_globals(path)
    needs_allowlist, unknown = _classify_pt(found)
    if unknown:
        raise RuntimeError(
            f"{path}: refusing to load; unexpected globals {sorted(unknown)}"
        )
    if needs_allowlist:
        from torch.serialization import add_safe_globals
        import importlib

        allow = []
        for mod, name in sorted(needs_allowlist):
            try:
                allow.append(getattr(importlib.import_module(mod), name))
            except Exception as e:  # noqa: BLE001
                raise RuntimeError(f"cannot resolve allowlisted global {mod}.{name}: {e}")
        add_safe_globals(allow)
    obj = torch.load(path, map_location="cpu", weights_only=True)
    if require_model_key:
        if not (isinstance(obj, dict) and "model" in obj):
            raise RuntimeError(f"{path}: expected a dict with a 'model' key")
        return obj["model"]
    return obj


class RestrictedUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if (module, name) in ALLOWED_PICKLE_GLOBALS:
            return super().find_class(module, name)
        raise pickle.UnpicklingError(
            f"blocked global {module}.{name}; not in the sudoku dataset allowlist"
        )


def load_pickle(path):
    """Load a raw dataset .pickle through the restricted unpickler only."""
    _require_go()
    _member, found = scan_globals(path)
    blocked = found - ALLOWED_PICKLE_GLOBALS
    if blocked:
        raise RuntimeError(
            f"{path}: refusing to load; blocked globals {sorted(blocked)}"
        )
    with open(path, "rb") as f:
        return RestrictedUnpickler(f).load()


def _require_go():
    if os.environ.get("NCM_OPERATOR_GO") != "1":
        sys.exit(BANNER)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("scan", help="static pickletools global scan (safe, no execution)")
    s.add_argument("path")
    lp = sub.add_parser("load-pt", help="load a .pt checkpoint (needs NCM_OPERATOR_GO=1)")
    lp.add_argument("path")
    lk = sub.add_parser("load-pickle", help="load a dataset .pickle (needs NCM_OPERATOR_GO=1)")
    lk.add_argument("path")
    a = ap.parse_args()

    if a.cmd == "scan":
        member, found = scan_globals(a.path)
        print(f"# pickle stream: {member}")
        print(f"# globals referenced ({len(found)}):")
        for mod, name in sorted(found):
            tag = "SAFE" if (mod, name) in EXPECTED_PT_SAFE | ALLOWED_PICKLE_GLOBALS else (
                "ALLOWLISTABLE" if (mod, name) in MAYBE_PT_EXTRA else "UNKNOWN->STOP")
            print(f"  {mod}.{name}  [{tag}]")
    elif a.cmd == "load-pt":
        obj = load_pt(a.path)
        print(f"loaded state_dict with {len(obj)} tensors from {a.path}")
    elif a.cmd == "load-pickle":
        obj = load_pickle(a.path)
        print(f"loaded {type(obj).__name__} (len={len(obj)}) from {a.path}")


if __name__ == "__main__":
    main()
