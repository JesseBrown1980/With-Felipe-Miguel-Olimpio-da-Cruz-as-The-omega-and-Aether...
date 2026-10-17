"""Cube absorption — represent a neural feature window as a KERNEL-NATIVE, fabric-addressable
cube node (json=0, Host-8 8-byte handles, graphify-V3 60D selector envelope).

"The fabric absorbs anything by representing it -> cube." Kernel-native form (NOT Node, NOT JSON):

  raw M/EEG (D:, referenced by sha256)
    -> derived feature window
    -> canonical 3200-byte QUANT TUPLE  (turbo 1024*int8 + signs 128 + zeta 1024 + hist 256*u32)
    -> KERNEL-NATIVE cube node: 3 Host-8 handles + glyph + graphify-V3 11-axis selector envelope
    -> json=0 HBP tuple row -> CubeSource -> prism arm

BILATERAL-CONVERGED contract (acer + liris, GitHub-mediated):
  * node handle8 = FNV1a64(node_id)      -- graphify NODE PK, byte-identical to graphify.py (verified)
  * source8      = sha256(source)[:8]     -- content/provenance handle (adopted from liris)
  * tuple8       = sha256(tuple)[:8]       -- content/provenance handle (adopted from liris)
  * selector     = graphify-V3 ASOLARIA-GRAPHIFY-V3-HYPERBEHCS-60D, 11 `selector_axis:*`
                   + selector_constraint:hyperbehcs-selector-router-60d   (canonical, from live :4790)

HONESTY: delivers the kernel-native FORMAT (binds to the Rust 8-byte Host-8 metal kernel by handle).
Executing the quant ON the metal kernel is the operator-gated migration -- not fired: runtime cold,
compile=0/interpret=0/fire=0, E=0. Representation only: fabric/recall/atlas/graphify as read surfaces;
never fires AgentTerms/FEDENV. Raw preserved by sha256 (referenced), never reconstructed, never in repo.
"""
from __future__ import annotations
from dataclasses import dataclass, field
import hashlib
import numpy as np
from .neural_sources import NeuralSource, _sigmoid

TUPLE_BYTES = 3200
LANES = 1024
_PROJ_SEED = 51966
_B62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
GRAPHIFY_SCHEMA = "ASOLARIA-GRAPHIFY-V3-HYPERBEHCS-60D"
SELECTOR_CONSTRAINT = "selector_constraint:hyperbehcs-selector-router-60d"
SELECTOR_AXES = ("d-axis-tuples", "glyph-family", "executor-program", "pipe-type",
                 "operation-class", "route-cylinder-room", "proof-tier", "runtime-mode",
                 "colony-vantage", "slice-time", "binary-hash-hex-crypto")


def glyphword(s: str) -> str:
    """Deterministic baseN glyph id — byte-identical to graphify.py."""
    v = int.from_bytes(hashlib.sha256(s.encode()).digest()[:6], "big"); o = ""
    for _ in range(4):
        o += _B62[v % 62]; v //= 62
    return "gly-" + o


def handle8(s: str) -> str:
    """FNV-1a 64-bit = the Host-8 8-byte primary key — byte-identical to graphify.py."""
    h = 0xcbf29ce484222325
    for ch in s.encode():
        h = ((h ^ ch) * 0x100000001b3) & 0xffffffffffffffff
    return format(h, "016x")


def host8_from_sha256(hex_or_str: str) -> str:
    """8-byte content handle from a sha256 hex prefix (liris `from_sha256_prefix`).
    If given a full sha256 hex, take the first 16 chars; otherwise sha256 the string first."""
    h = hex_or_str.strip().lower()
    if len(h) >= 16 and all(c in "0123456789abcdef" for c in h[:16]):
        return h[:16]
    return hashlib.sha256(hex_or_str.encode()).hexdigest()[:16]


def _sha16(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()[:16]


# ---- Brown-Hilbert digital expansion: space is expandable PER SLICE (frame). ----
# A cube's address is a 1024-ary Brown-Hilbert prefix (depth 6 = 2^60 = the 60D ceiling).
# Between any two addresses, a NEW pid-addressable point can be INJECTED at the next depth
# (the next slice) -- so space/time grows and points slot in-between (Brown & Fedotov, Digital
# Physics: frame-based discrete universe, spacetime pixels, metatag-driven evolution).
BH_RADIX = 1024
BH_DEPTH = 6            # canonical (1024^6 = 2^60); deeper = injected-between = the next slice

def bh_prefix(handle8_hex: str, depth: int = BH_DEPTH) -> list:
    """1024-ary Brown-Hilbert prefix digits (most-significant first) from a Host-8 handle."""
    n = int(handle8_hex, 16) % (BH_RADIX ** depth)
    d = []
    for _ in range(depth):
        d.append(n % BH_RADIX); n //= BH_RADIX
    return d[::-1]

def _bh_int(digits: list) -> int:
    n = 0
    for x in digits:
        n = n * BH_RADIX + x
    return n

def bh_inject_between(a: list, b: list) -> list:
    """Inject a pid-addressable point strictly BETWEEN a and b, one slice deeper (the next
    slice of growing space-time). Brown-Hilbert digital expansion: deepen by one level, take
    the midpoint -- there is always room because deepening multiplies the gap by the radix."""
    L = max(len(a), len(b)) + 1
    A = (a + [0] * (L - len(a)))
    B = (b + [0] * (L - len(b)))
    ai, bi = _bh_int(A), _bh_int(B)
    if ai > bi:
        ai, bi = bi, ai
    ci = (ai + bi) // 2
    if ci <= ai:
        ci = ai + 1
    out = []
    n = ci
    for _ in range(L):
        out.append(n % BH_RADIX); n //= BH_RADIX
    return out[::-1]

def bh_render(digits: list) -> str:
    return ".".join(str(x) for x in digits)


# ---- Lossless transcode between representation LEVELS (the comb: separate -> recombine, 0 loss). ----
# 256-level (8-bit bytes) <-> 1024-level (10-bit symbols). A bijection: no information created or lost
# (referential/coherent, NOT compression below entropy). 4 symbols pack 5 bytes; 3200 B = 2560 symbols.
def transcode_256_to_1024(data: bytes) -> list:
    """Separate a byte stream into evenly-valued 10-bit glyph 'lines' (the comb, forward)."""
    bits = nbits = 0
    out = []
    for b in data:
        bits = (bits << 8) | b; nbits += 8
        while nbits >= 10:
            nbits -= 10
            out.append((bits >> nbits) & 0x3FF)
    if nbits:
        out.append((bits << (10 - nbits)) & 0x3FF)   # pad the final partial symbol
    return out

def transcode_1024_to_256(symbols: list, nbytes: int) -> bytes:
    """Recombine the glyph lines back into the original bytes (the comb, backward)."""
    bits = nbits = 0
    out = bytearray()
    for s in symbols:
        bits = (bits << 10) | (s & 0x3FF); nbits += 10
        while nbits >= 8:
            nbits -= 8
            out.append((bits >> nbits) & 0xFF)
    return bytes(out[:nbytes])

def roundtrip_proof(tuple_bytes: bytes) -> dict:
    """Prove comb coherence on our own artifact: bytes -> 1024-level -> bytes, byte-identical."""
    down = transcode_256_to_1024(tuple_bytes)             # forward: separate
    up = transcode_1024_to_256(down, len(tuple_bytes))    # backward: recombine
    return {"orig_bytes": len(tuple_bytes), "symbols_1024": len(down),
            "orig_sha256": hashlib.sha256(tuple_bytes).hexdigest(),
            "recovered_sha256": hashlib.sha256(up).hexdigest(),
            "byte_identical": up == tuple_bytes}


def _lanes_from_window(win: np.ndarray) -> np.ndarray:
    feat = win.mean(axis=0) if win.ndim == 2 else np.asarray(win, float).ravel()
    rng = np.random.default_rng(_PROJ_SEED)
    R = rng.standard_normal((LANES, feat.shape[0])) / np.sqrt(feat.shape[0])
    lanes = R @ feat
    return lanes / (np.std(lanes) or 1.0)


def quant_tuple(win: np.ndarray) -> bytes:
    """Canonical 3200-byte quant tuple (json=0 binary) from a feature window."""
    lanes = _lanes_from_window(win)
    turbo = np.clip(np.round(lanes * 42.0), -127, 127).astype(np.int8)                 # 1024 B
    signs = np.packbits((turbo >= 0).astype(np.uint8))                                  # 128 B
    idx = np.arange(LANES)
    zeta = ((turbo.astype(np.int64) ^ (idx * 2654435761 % 256)) & 0xFF).astype(np.uint8)  # 1024 B (stand-in)
    hist = np.bincount((turbo.astype(np.int64) + 128).clip(0, 255), minlength=256).astype(np.uint32)  # 1024 B
    buf = turbo.tobytes() + signs.tobytes() + zeta.tobytes() + hist.tobytes()
    assert len(buf) == TUPLE_BYTES, f"tuple is {len(buf)}B, expected {TUPLE_BYTES}"
    return buf


@dataclass
class CubeChunk:
    node_id: str
    handle8: str                 # node PK: FNV1a64(node_id) (graphify parity)
    source8: str                 # content handle: sha256(source)[:8]
    tuple8: str                  # content handle: sha256(tuple)[:8]
    glyph: str
    dataset_id: str
    license: str
    subject: str
    session: str
    modality: str
    window_start_s: float
    window_dur_s: float
    n_samples: int
    feature_digest: str
    tuple_sha16: str
    source_sha256: str
    topid: str                   # HG1024:QPRISM glyph address (D16 to_pid 60-tuple)
    room: str                    # route-cylinder-room
    colony: str                  # colony-vantage (ACER)
    slice_time: str
    bh_prefix_str: str = ""      # Brown-Hilbert 1024-ary expandable address prefix
    frame: int = 0               # discrete-universe frame / slice index (space expands per slice)
    raw_in_repo: int = 0
    derived_only: int = 1
    tuple_bytes: int = TUPLE_BYTES
    tuple: bytes = field(default=b"", repr=False)

    def axis_values(self) -> dict:
        """graphify-V3 11-axis selector values (acer vantage)."""
        return {
            "d-axis-tuples": "D22_TRANSLATION+D48_HYPERGLYPH_ATLAS+D49_EXECUTION_PROOF_SUPERGRAPH+60D_SELECTOR_FRAME",
            "glyph-family": f"BEHCS_1024+{self.topid}+HBP_HBI_TUPLE_TEXT",
            "executor-program": "NONE_REPRESENTATION_ONLY_AGENTTERMS_FEDENV_NOT_FIRED",
            "pipe-type": "DERIVED_FEATURE_CUBE+QUANT8_3200_BYTE_TUPLE+HBP_HBI_TUPLE_TEXT",
            "operation-class": "REPRESENT_ADDRESS_DERIVE_DIGEST",
            "route-cylinder-room": self.room,
            "proof-tier": "MEASURED_LOCAL_DERIVED+RAW_IN_REPO_0+DISPATCH_OPERATOR_GATED",
            "runtime-mode": "COLD_DERIVED_READ_REPRESENTATION_MAP_FIRE_0",
            "colony-vantage": self.colony,
            "slice-time": self.slice_time,
            "binary-hash-hex-crypto": f"source8:{self.source8}+tuple8:{self.tuple8}+node8:{self.handle8}+sha256_reference",
        }

    def active_glyph_law(self) -> str:
        """CARET design-lens, gated: the glyph's address/geometry IS a behavior *descriptor*
        (active symbolic geometry) -- but representation-only. Execution stays operator-gated.
        The disputed/hoax 'alien' provenance stays outside the gate. Bilateral parity with liris."""
        return ("QPRISMACTIVEGLYPH"
                f"|handle8={self.handle8}|geometry=graphify60d|behavior=represent_address"
                f"|compile=0|interpret=0|fire=0|json=0")

    def hbp_row(self) -> str:
        """Bilateral-converged json=0 kernel-native cube row (the primary carrier). No JSON."""
        f = self
        head = ("QPRISMCUBE"
                f"|schema=qprism.host8.graphify_selector.v1|graphify_schema={GRAPHIFY_SCHEMA}"
                f"|handle8={f.handle8}|source8={f.source8}|tuple8={f.tuple8}|glyph={f.glyph}|node={f.node_id}"
                f"|dataset={f.dataset_id}|license={f.license}"
                f"|subject={f.subject}|session={f.session}|modality={f.modality}"
                f"|win_start_s={f.window_start_s}|win_dur_s={f.window_dur_s}|n_samples={f.n_samples}"
                f"|feat_sha16={f.feature_digest}|tuple_sha16={f.tuple_sha16}|tuple_bytes={f.tuple_bytes}"
                f"|source_sha256={f.source_sha256}")
        # Jesse's pixels-first: the backend cube IS the representation; the frontend is only a
        # raw projection (pixels) of it — inert, no logic. Machine hot path = HBP tuple-text; JSON = cold.
        law = ("|node_runtime=kernel_contract_not_spawned|nodejs=0|json_object=0"
               "|hot_path=HBP_HBI_TUPLE_TEXT|pixels_first=1|frontend=raw_projection_inert"
               f"|space_expandable=1|frame={f.frame}|bh_depth={BH_DEPTH}|bh_prefix={f.bh_prefix_str}"
               "|inject_between=bh_digital_expansion"
               "|agentterms_fedenv_fire=0|dispatch=0|provider_fanout=0|hardware_fire=0"
               "|compile=0|interpret=0|fire=0")
        sel = f"|{SELECTOR_CONSTRAINT}|axis_count={len(SELECTOR_AXES)}"
        axes = "".join(f"|selector_axis:{a}={v}" for a, v in f.axis_values().items())
        return head + law + sel + axes + f"|raw_in_repo={f.raw_in_repo}|derived_only={f.derived_only}|json=0"


def absorb_window(win: np.ndarray, *, dataset_id="bcbl190626/SpanishBCBL",
                  license="CC-BY-NC-4.0", subject="S?", session="?", modality="MEG",
                  window_start_s=0.0, window_dur_s=0.0, source_sha256="referenced-on-D",
                  colony="ACER+OP_JESSE_PID+FABRIC_4944", slice_time="2026_07_01_STAGE2",
                  frame=0) -> CubeChunk:
    """Represent one feature window as a bilateral-converged, graphify-V3-addressed cube node."""
    win = np.atleast_2d(win)
    tup = quant_tuple(win)
    tuple8 = host8_from_sha256(hashlib.sha256(tup).hexdigest())
    feat_digest = _sha16(win.astype(np.float32).tobytes())
    # canonical graphify node id (converged w/ liris): content-addressed by the quant tuple
    node_id = f"qprism_cube:{tuple8}"
    node8 = handle8(node_id)
    topid = "HG1024:QPRISM:" + glyphword(node_id)[4:]
    ds = dataset_id.split("/")[-1]
    return CubeChunk(
        node_id=node_id, handle8=node8,
        source8=host8_from_sha256(source_sha256), tuple8=tuple8,
        glyph=glyphword(node_id), dataset_id=dataset_id, license=license, subject=subject, session=session,
        modality=modality, window_start_s=float(window_start_s), window_dur_s=float(window_dur_s),
        n_samples=int(win.shape[0]), feature_digest=feat_digest, tuple_sha16=_sha16(tup),
        source_sha256=source_sha256, topid=topid,
        room=f"qprism/{ds}/stage2/cube-absorption/acer", colony=colony, slice_time=slice_time,
        bh_prefix_str=bh_render(bh_prefix(node8)), frame=frame, tuple=tup)


def cube_to_control(chunk: CubeChunk) -> np.ndarray:
    """Project a cube tuple's turbo lanes to a [0,1]^5 control proposal for the prism arm."""
    turbo = np.frombuffer(chunk.tuple[:LANES], dtype=np.int8).astype(float) / 127.0
    rng = np.random.default_rng(_PROJ_SEED ^ 1)
    R = rng.standard_normal((5, LANES)) / np.sqrt(LANES)
    return np.clip(_sigmoid(3.0 * R @ turbo), 0, 1)


class CubeSource(NeuralSource):
    """Neural source backed by a sequence of absorbed cube nodes (real-data path)."""
    def __init__(self, chunks: list[CubeChunk]):
        if not chunks:
            raise ValueError("CubeSource needs at least one cube chunk")
        self.chunks = chunks
        self.i = 0

    def next(self) -> np.ndarray:
        c = self.chunks[self.i % len(self.chunks)]
        self.i += 1
        return cube_to_control(c)
