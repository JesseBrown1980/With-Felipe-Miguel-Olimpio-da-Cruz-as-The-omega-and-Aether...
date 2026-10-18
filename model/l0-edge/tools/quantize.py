#!/usr/bin/env python3
"""Writes src/weights.rs: the vendored baseline_model.pt as Q24 integers, read WITHOUT torch.

The checkpoint is a torch zip; data.pkl is unpickled with a restricted Unpickler that resolves only
collections.OrderedDict, torch._utils._rebuild_tensor_v2 and torch.FloatStorage, and each tensor's bytes are
read from <archive>/data/<key> as little-endian float32 bit patterns (u32). Each weight becomes
floor(w * 2^24 + 1/2), computed from those bits with integer arithmetic only (no float).
inference_server.py:11 renames conv1.lin.bias -> conv1.bias and conv2.lin.bias -> conv2.bias before
load_state_dict; the Rust names follow the server's modules. --check regenerates in memory and diffs.
"""
import collections
import hashlib
import io
import math
import pathlib
import pickle
import struct
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHECKPOINT = ROOT / "vendor" / "gnn-sidecar" / "baseline_model.pt"
CHECKPOINT_SHA256 = "a09993369d31ca73345914812e5226b513f5fb9092f43e487a2eafc8c3b621f5"
WEIGHTS_RS = ROOT / "src" / "weights.rs"
FRAC_BITS = 24
# Every finite float32 is an integer multiple of 2^-149 (the smallest subnormal).
FLOAT32_UNIT_BITS = 149
VALUES_PER_LINE = 16

# (checkpoint key, key after the inference_server.py:11 rename, Rust name, shape)
TENSORS = [
    ("conv1.lin.weight", "conv1.lin.weight", "CONV1_W", (64, 6)),
    ("conv1.lin.bias", "conv1.bias", "CONV1_B", (64,)),
    ("conv2.lin.weight", "conv2.lin.weight", "CONV2_W", (64, 64)),
    ("conv2.lin.bias", "conv2.bias", "CONV2_B", (64,)),
    ("edge_classifier.0.weight", "edge_classifier.0.weight", "EDGE1_W", (64, 128)),
    ("edge_classifier.0.bias", "edge_classifier.0.bias", "EDGE1_B", (64,)),
    ("edge_classifier.2.weight", "edge_classifier.2.weight", "EDGE2_W", (1, 64)),
    ("edge_classifier.2.bias", "edge_classifier.2.bias", "EDGE2_B", (1,)),
]


class FloatStorageClass:
    """Stands in for the torch.FloatStorage global; never instantiated."""


def refuse_state(self, state):
    # A BUILD opcode would replace the values read from the archive.
    raise pickle.UnpicklingError(f"BUILD on {type(self).__name__} is not allowed")


class Storage:
    __setstate__ = refuse_state

    def __init__(self, values):
        self.values = values


class Tensor:
    __setstate__ = refuse_state

    def __init__(self, shape, values):
        self.shape = shape
        self.values = values


def row_major_strides(shape):
    strides = []
    step = 1
    for dim in reversed(shape):
        strides.append(step)
        step *= dim
    return tuple(reversed(strides))


def rebuild_tensor_v2(storage, storage_offset, size, stride, requires_grad, backward_hooks, metadata=None):
    # The subset of torch._utils._rebuild_tensor_v2 this checkpoint uses: a whole, contiguous float32 storage.
    if not isinstance(storage, Storage):
        raise pickle.UnpicklingError("tensor storage is not a float32 storage")
    size, stride = tuple(size), tuple(stride)
    if not all(isinstance(d, int) and d > 0 for d in size):
        raise pickle.UnpicklingError(f"tensor size {size} is not positive integers")
    if stride != row_major_strides(size):
        raise pickle.UnpicklingError(f"tensor stride {stride} is not row-major for size {size}")
    if storage_offset != 0 or math.prod(size) != len(storage.values):
        raise pickle.UnpicklingError("tensor does not cover its whole storage")
    if requires_grad is not False or backward_hooks or metadata is not None:
        raise pickle.UnpicklingError("tensor carries grad, hooks or metadata")
    return Tensor(size, storage.values)


class CheckpointUnpickler(pickle.Unpickler):
    ALLOWED = {
        ("collections", "OrderedDict"): collections.OrderedDict,
        ("torch._utils", "_rebuild_tensor_v2"): rebuild_tensor_v2,
        ("torch", "FloatStorage"): FloatStorageClass,
    }

    def __init__(self, data, archive, prefix):
        super().__init__(io.BytesIO(data))
        self.archive = archive
        self.prefix = prefix

    def find_class(self, module, name):
        try:
            return self.ALLOWED[(module, name)]
        except KeyError:
            raise pickle.UnpicklingError(f"global {module}.{name} is not allowed") from None

    def persistent_load(self, pid):
        if not (isinstance(pid, tuple) and len(pid) == 5 and pid[0] == "storage"):
            raise pickle.UnpicklingError(f"persistent id {pid!r} is not a storage")
        _, storage_type, key, location, numel = pid
        if storage_type is not FloatStorageClass or location != "cpu":
            raise pickle.UnpicklingError(f"storage {key!r} is not a cpu FloatStorage")
        if not (isinstance(key, str) and key.isascii() and key.isdigit() and isinstance(numel, int) and numel > 0):
            raise pickle.UnpicklingError(f"storage id {pid!r} is malformed")
        raw = self.archive.read(f"{self.prefix}/data/{key}")
        if len(raw) != 4 * numel:
            raise pickle.UnpicklingError(f"storage {key} holds {len(raw)} bytes, expected {4 * numel}")
        return Storage(struct.unpack(f"<{numel}I", raw))


def load_state_dict(path):
    blob = path.read_bytes()
    digest = hashlib.sha256(blob).hexdigest()
    if digest != CHECKPOINT_SHA256:
        raise SystemExit(f"QUANTIZE|refused=sha256|got={digest}|want={CHECKPOINT_SHA256}|json=0")
    with zipfile.ZipFile(io.BytesIO(blob)) as archive:
        pickles = [n for n in archive.namelist() if n.endswith("/data.pkl")]
        if len(pickles) != 1:
            raise SystemExit("QUANTIZE|refused=archive|reason=expected one data.pkl|json=0")
        prefix = pickles[0][: -len("/data.pkl")]
        if archive.read(f"{prefix}/byteorder") != b"little":
            raise SystemExit("QUANTIZE|refused=byteorder|json=0")
        state = CheckpointUnpickler(archive.read(pickles[0]), archive, prefix).load()
    if not isinstance(state, collections.OrderedDict):
        raise SystemExit("QUANTIZE|refused=root|reason=not an OrderedDict|json=0")
    return state


def float32_units(bits):
    """The finite float32 with these bits times 2^149, an exact integer; ValueError for an infinity or a NaN."""
    exponent = (bits >> 23) & 0xFF
    if exponent == 0xFF:
        raise ValueError(f"float32 {bits:08x} is not finite")
    fraction = bits & 0x7FFFFF
    magnitude = fraction if exponent == 0 else (fraction | 1 << 23) << (exponent - 1)
    return -magnitude if bits >> 31 else magnitude


def q24_of_float32_bits(bits):
    """floor(w * 2^24 + 1/2) of the float32 w with these bits."""
    shift = FLOAT32_UNIT_BITS - FRAC_BITS
    return (float32_units(bits) + (1 << (shift - 1))) >> shift


def render_row(values, indent):
    lines = []
    for start in range(0, len(values), VALUES_PER_LINE):
        lines.append(indent + ", ".join(str(v) for v in values[start:start + VALUES_PER_LINE]) + ",")
    return lines


def render(state):
    if [key for key, _, _, _ in TENSORS] != list(state.keys()):
        raise SystemExit(f"QUANTIZE|refused=keys|got={','.join(state.keys())}|json=0")
    out = [
        f"//! Q24 weights, floor(w * 2^24 + 1/2), of vendor/gnn-sidecar/baseline_model.pt (sha256 {CHECKPOINT_SHA256});",
        "//! generated by tools/quantize.py, do not edit. conv*.lin.bias loads as conv*.bias (inference_server.py:11).",
    ]
    for key, server_key, name, shape in TENSORS:
        tensor = state[key]
        if tensor.shape != shape:
            raise SystemExit(f"QUANTIZE|refused=shape|key={key}|got={tensor.shape}|json=0")
        try:
            values = [q24_of_float32_bits(bits) for bits in tensor.values]
        except ValueError:
            raise SystemExit(f"QUANTIZE|refused=not_finite|key={key}|json=0") from None
        if not all(-(1 << 31) <= v < (1 << 31) for v in values):
            raise SystemExit(f"QUANTIZE|refused=range|key={key}|json=0")
        label = f"`{key}`" if key == server_key else f"`{key}`, loaded as `{server_key}`"
        out.append("")
        if name == "EDGE2_B":
            out.append(f"/// {label} (1), Q24.")
            out.append(f"pub const {name}: i32 = {values[0]};")
        elif name == "EDGE2_W":
            out.append(f"/// {label} (1 x 64), Q24.")
            out.append("#[rustfmt::skip]")
            out.append(f"pub const {name}: [i32; 64] = [")
            out.extend(render_row(values, "    "))
            out.append("];")
        elif len(shape) == 1:
            out.append(f"/// {label} ({shape[0]}), Q24.")
            out.append("#[rustfmt::skip]")
            out.append(f"pub const {name}: [i32; {shape[0]}] = [")
            out.extend(render_row(values, "    "))
            out.append("];")
        else:
            rows, cols = shape
            out.append(f"/// {label} ({rows} x {cols}, row = output), Q24.")
            out.append("#[rustfmt::skip]")
            out.append(f"pub const {name}: [[i32; {cols}]; {rows}] = [")
            for r in range(rows):
                row = values[r * cols:(r + 1) * cols]
                if cols <= VALUES_PER_LINE:
                    out.append("    [" + ", ".join(str(v) for v in row) + "],")
                else:
                    out.append("    [")
                    out.extend(render_row(row, "        "))
                    out.append("    ],")
            out.append("];")
    return "\n".join(out) + "\n"


def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print("usage: quantize.py [--check]", file=sys.stderr)
        return 2
    text = render(load_state_dict(CHECKPOINT))
    values = sum(math.prod(shape) for _, _, _, shape in TENSORS)
    if args == ["--check"]:
        if WEIGHTS_RS.read_text(encoding="utf-8") != text:
            print(f"QUANTIZE|check=FAIL|file={WEIGHTS_RS.name}|json=0")
            return 1
        print(f"QUANTIZE|check=PASS|values={values}|sha256={CHECKPOINT_SHA256}|json=0")
        return 0
    WEIGHTS_RS.write_text(text, encoding="utf-8")
    print(f"QUANTIZE|written={WEIGHTS_RS.name}|values={values}|sha256={CHECKPOINT_SHA256}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
