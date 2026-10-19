"""Cube absorption — represent a neural feature window as a fabric-addressable cube chunk.

This is the "the fabric absorbs it by representing anything -> cube" step, made concrete and
honest for Q-PRISM Stage 2:

  raw M/EEG (stays on D:, referenced by sha256)
      -> derived feature window
      -> canonical 3200-byte QUANT TUPLE  (turbo 1024*int8 + signs 128 + zeta 1024 + hist 256*u32)
      -> derived-only CubeChunk record (metadata + 60D selector + digests; raw_in_repo=0)
      -> CubeSource -> prism arm

Byte layout is aligned to the shipped engine's load-bearing invariant
(`D:/asolaria-combined-quant-2026-06-15/combined-quant-engine.mjs` -> TUPLE_BYTES = 3200).
turbo/signs/hist are computed faithfully; the per-lane `zeta` classification here is a
LAYOUT-COMPATIBLE stand-in pending byte-parity with the canonical `zetaClassify`
(that parity is a bilateral verify step vs the .mjs / vs Liris's qprism-quant-chunk).

HONESTY: this is representation + addressing + a derived digest. It does NOT reconstruct the
raw from the tuple; the raw is preserved once, by sha256, on D:. No raw neural data is stored
in the repo. Real data does not bypass the harness's honest-null.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
import hashlib
import numpy as np
from .behcs import schedule_id
from .neural_sources import NeuralSource, _sigmoid

TUPLE_BYTES = 3200            # turbo 1024 + signs 128 + zeta 1024 + hist 1024
LANES = 1024
_PROJ_SEED = 51966   # 0xCAFE-ish fixed projection seed (deterministic lanes)


def _sha16(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()[:16]


def _lanes_from_window(win: np.ndarray) -> np.ndarray:
    """Deterministically expand an (T,F) feature window's mean to 1024 lanes."""
    feat = win.mean(axis=0) if win.ndim == 2 else np.asarray(win, float).ravel()
    rng = np.random.default_rng(_PROJ_SEED)
    R = rng.standard_normal((LANES, feat.shape[0])) / np.sqrt(feat.shape[0])
    lanes = R @ feat
    s = np.std(lanes) or 1.0
    return lanes / s


def quant_tuple(win: np.ndarray) -> bytes:
    """Canonical 3200-byte quant tuple from a feature window."""
    lanes = _lanes_from_window(win)
    turbo = np.clip(np.round(lanes * 42.0), -127, 127).astype(np.int8)      # 1024 B
    bits = (turbo >= 0).astype(np.uint8)
    signs = np.packbits(bits)                                               # 128 B
    idx = np.arange(LANES)
    zeta = ((turbo.astype(np.int64) ^ (idx * 2654435761 % 256)) & 0xFF).astype(np.uint8)  # 1024 B (stand-in)
    hist = np.bincount((turbo.astype(np.int64) + 128).clip(0, 255),
                       minlength=256).astype(np.uint32)                     # 256*4 = 1024 B
    buf = turbo.tobytes() + signs.tobytes() + zeta.tobytes() + hist.tobytes()
    assert len(buf) == TUPLE_BYTES, f"tuple is {len(buf)}B, expected {TUPLE_BYTES}"
    return buf


@dataclass
class CubeChunk:
    dataset_id: str
    license: str
    subject: str
    session: str
    modality: str
    window_start_s: float
    window_dur_s: float
    n_samples: int
    feature_digest: str          # sha16 of the feature window
    selector: str                # 60D BEHCS-1024 address (HG1024:QPRISM:...)
    tuple_sha16: str             # sha16 of the 3200-byte quant tuple
    source_sha256: str           # sha of the RAW recording -> referenced, not stored
    raw_in_repo: int = 0
    derived_only: int = 1
    tuple_bytes: int = TUPLE_BYTES
    tuple: bytes = field(default=b"", repr=False)

    def record(self) -> dict:
        d = asdict(self); d.pop("tuple", None); return d


def absorb_window(win: np.ndarray, *, dataset_id="bcbl190626/SpanishBCBL",
                  license="CC-BY-NC-4.0", subject="S?", session="?", modality="MEG",
                  window_start_s=0.0, window_dur_s=0.0, source_sha256="referenced-on-D") -> CubeChunk:
    """Represent one feature window as a fabric-addressable cube chunk (derived-only)."""
    win = np.atleast_2d(win)
    tup = quant_tuple(win)
    feat_digest = _sha16(win.astype(np.float32).tobytes())
    sel = schedule_id({"digest": feat_digest, "subject": subject, "session": session,
                       "start": round(float(window_start_s), 6)})
    return CubeChunk(dataset_id=dataset_id, license=license, subject=subject, session=session,
                     modality=modality, window_start_s=float(window_start_s),
                     window_dur_s=float(window_dur_s), n_samples=int(win.shape[0]),
                     feature_digest=feat_digest, selector=sel, tuple_sha16=_sha16(tup),
                     source_sha256=source_sha256, tuple=tup)


def cube_to_control(chunk: CubeChunk) -> np.ndarray:
    """Project a cube tuple's turbo lanes to a [0,1]^5 control proposal for the prism arm."""
    turbo = np.frombuffer(chunk.tuple[:LANES], dtype=np.int8).astype(float) / 127.0
    rng = np.random.default_rng(_PROJ_SEED ^ 1)
    R = rng.standard_normal((5, LANES)) / np.sqrt(LANES)
    return np.clip(_sigmoid(3.0 * R @ turbo), 0, 1)


class CubeSource(NeuralSource):
    """Neural source backed by a sequence of absorbed cube chunks (real-data path)."""
    def __init__(self, chunks: list[CubeChunk]):
        if not chunks:
            raise ValueError("CubeSource needs at least one cube chunk")
        self.chunks = chunks
        self.i = 0

    def next(self) -> np.ndarray:
        c = self.chunks[self.i % len(self.chunks)]
        self.i += 1
        return cube_to_control(c)
