#!/usr/bin/env python3
"""Reads a torch state-dict checkpoint WITHOUT torch, and float32 bit-pattern arithmetic in integers.

A checkpoint is a torch zip; its data.pkl is unpickled with a restricted Unpickler that resolves only
collections.OrderedDict, torch._utils._rebuild_tensor_v2 and torch.FloatStorage (the globals of every
checkpoint in vendor/gnn-patterns/), and each tensor's bytes are read from <archive>/data/<key> as
little-endian float32 bit patterns (u32). Same approach as model/l0-edge/tools/quantize.py, without its
sha256 pin, and accepting a plain dict root (baseline_model_retrained.pt has one). Imported by the other
tools of this directory; it has no command line.
"""
import collections
import hashlib
import io
import math
import pickle
import struct
import zipfile

FRAC_BITS = 24
# Every finite float32 is an integer multiple of 2^-149 (the smallest subnormal).
FLOAT32_UNIT_BITS = 149


class FloatStorageClass:
    """Stands in for the torch.FloatStorage global; never instantiated."""


def refuse_state(self, state):
    # A BUILD opcode would replace the values read from the archive.
    raise pickle.UnpicklingError(f"BUILD on {type(self).__name__} is not allowed")


class Storage:
    __setstate__ = refuse_state

    def __init__(self, bits):
        self.bits = bits


class Tensor:
    __setstate__ = refuse_state

    def __init__(self, shape, bits):
        self.shape = shape
        self.bits = bits


def row_major_strides(shape):
    strides = []
    step = 1
    for dim in reversed(shape):
        strides.append(step)
        step *= dim
    return tuple(reversed(strides))


def rebuild_tensor_v2(storage, storage_offset, size, stride, requires_grad, backward_hooks, metadata=None):
    # The subset of torch._utils._rebuild_tensor_v2 these checkpoints use: a whole, contiguous float32 storage.
    if not isinstance(storage, Storage):
        raise pickle.UnpicklingError("tensor storage is not a float32 storage")
    size, stride = tuple(size), tuple(stride)
    if not all(isinstance(d, int) and d > 0 for d in size):
        raise pickle.UnpicklingError(f"tensor size {size} is not positive integers")
    if stride != row_major_strides(size):
        raise pickle.UnpicklingError(f"tensor stride {stride} is not row-major for size {size}")
    if storage_offset != 0 or math.prod(size) != len(storage.bits):
        raise pickle.UnpicklingError("tensor does not cover its whole storage")
    if requires_grad is not False or backward_hooks or metadata is not None:
        raise pickle.UnpicklingError("tensor carries grad, hooks or metadata")
    return Tensor(size, storage.bits)


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


class Checkpoint:
    """root: 'OrderedDict' or 'dict'; tensors: key -> Tensor in file order; modules: _metadata keys or None."""

    def __init__(self, path):
        blob = path.read_bytes()
        self.path = path
        self.size = len(blob)
        self.sha256 = hashlib.sha256(blob).hexdigest()
        with zipfile.ZipFile(io.BytesIO(blob)) as archive:
            pickles = [n for n in archive.namelist() if n.endswith("/data.pkl")]
            if len(pickles) != 1:
                raise SystemExit(f"CKPT|refused=archive|file={path.name}|reason=expected one data.pkl|json=0")
            prefix = pickles[0][: -len("/data.pkl")]
            if archive.read(f"{prefix}/byteorder") != b"little":
                raise SystemExit(f"CKPT|refused=byteorder|file={path.name}|json=0")
            state = CheckpointUnpickler(archive.read(pickles[0]), archive, prefix).load()
        if type(state) is collections.OrderedDict:
            self.root = "OrderedDict"
        elif type(state) is dict:
            self.root = "dict"
        else:
            raise SystemExit(f"CKPT|refused=root|file={path.name}|json=0")
        if not all(isinstance(k, str) and isinstance(v, Tensor) for k, v in state.items()):
            raise SystemExit(f"CKPT|refused=entries|file={path.name}|json=0")
        self.tensors = collections.OrderedDict(state.items())
        metadata = getattr(state, "_metadata", None)
        self.modules = None if metadata is None else list(metadata.keys())

    def values(self):
        return sum(math.prod(t.shape) for t in self.tensors.values())


def canonical_key(key):
    """The key with conv*.lin.bias written as conv*.bias, the torch_geometric GCNConv name.

    rekey_checkpoints.py renames convX.bias -> convX.lin.bias where convX.lin.weight exists; the servers
    (inference_server.py of model/l0-edge, gslgnn_inference_server.py) rename the other way. Both are
    renames only; this maps either spelling to one name so tensors can be compared across them.
    """
    if key.endswith(".lin.bias"):
        return key[: -len(".lin.bias")] + ".bias"
    return key


def float32_units(bits):
    """The finite float32 with these bits times 2^149, an exact integer; ValueError for an infinity or a NaN."""
    exponent = (bits >> 23) & 0xFF
    if exponent == 0xFF:
        raise ValueError(f"float32 {bits:08x} is not finite")
    fraction = bits & 0x7FFFFF
    magnitude = fraction if exponent == 0 else (fraction | 1 << 23) << (exponent - 1)
    return -magnitude if bits >> 31 else magnitude


def ordered(bits):
    """An integer that orders float32 values as the reals do and steps by 1 per float32 (ulp distance)."""
    return -(bits & 0x7FFFFFFF) if bits >> 31 else bits


def round_shift(value, shift):
    """floor(value / 2^shift + 1/2)."""
    return (value + (1 << (shift - 1))) >> shift


def q24_of_float32_bits(bits):
    """floor(w * 2^24 + 1/2) of the float32 w with these bits."""
    return round_shift(float32_units(bits), FLOAT32_UNIT_BITS - FRAC_BITS)


def float32_bits_of_q24(q):
    """The bits of the float32 equal to q / 2^24; ValueError when that value is not a normal float32."""
    if q == 0:
        return 0
    sign = 1 << 31 if q < 0 else 0
    m = abs(q)
    length = m.bit_length()
    if length > 24 and m & ((1 << (length - 24)) - 1):
        raise ValueError(f"q24 {q} has more than 24 significant bits")
    biased = length - 1 - FRAC_BITS + 127
    if not 0 < biased < 0xFF:
        raise ValueError(f"q24 {q} is outside the float32 normal range")
    significand = m << (24 - length) if length <= 24 else m >> (length - 24)
    return sign | biased << 23 | (significand & 0x7FFFFF)


def units_text(units):
    """An exact rational multiple of 2^-149 as reduced text 'p/2^k' (or an integer)."""
    if units == 0:
        return "0"
    k = FLOAT32_UNIT_BITS
    while k > 0 and units % 2 == 0:
        units //= 2
        k -= 1
    return str(units) if k == 0 else f"{units}/2^{k}"
