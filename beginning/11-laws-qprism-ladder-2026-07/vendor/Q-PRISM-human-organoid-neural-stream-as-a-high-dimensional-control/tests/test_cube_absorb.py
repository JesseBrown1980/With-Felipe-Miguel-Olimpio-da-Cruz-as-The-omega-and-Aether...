"""Cube-absorption tests: the 3200-byte canonical tuple, derived-only records, and the
CubeSource plugging into the prism arm."""
import numpy as np
from qprism.physics import Apparatus, observe
from qprism.sources import PrismSource, denormalize
from qprism.cube_absorb import (absorb_window, quant_tuple, cube_to_control,
                                 CubeSource, TUPLE_BYTES)
from qprism.neural_sources import RecordedFeatureSource


def _fixture_window(seed=1, T=25, F=64):
    rng = np.random.default_rng(seed)
    return np.sin(np.linspace(0, 8 * np.pi, T)[:, None] * rng.uniform(0.5, 3, (1, F))) \
        + 0.3 * rng.standard_normal((T, F))


def test_tuple_is_canonical_3200_bytes():
    assert len(quant_tuple(_fixture_window())) == TUPLE_BYTES == 3200


def test_absorb_is_derived_only_and_addressed():
    ch = absorb_window(_fixture_window(), subject="S5", session="1", window_start_s=12.5)
    rec = ch.record()
    assert rec["raw_in_repo"] == 0 and rec["derived_only"] == 1
    assert rec["selector"].startswith("HG1024:QPRISM:")     # 60D BEHCS address
    assert len(rec["feature_digest"]) == 16 and len(rec["tuple_sha16"]) == 16
    assert "tuple" not in rec                                # raw bytes never serialized into the record


def test_deterministic():
    w = _fixture_window(3)
    assert quant_tuple(w) == quant_tuple(w)                  # same window -> same tuple


def test_cube_source_drives_prism_arm():
    chunks = [absorb_window(_fixture_window(s), subject=f"S{s}", window_start_s=s) for s in range(6)]
    src = CubeSource(chunks)
    ap = Apparatus()
    arm = PrismSource(seed=7, stream=src, influence=0.5)
    best = -np.inf
    for _ in range(40):
        x = arm.ask()
        snr = observe(denormalize(x, ap), ap)["snr"]
        arm.tell(x, snr)
        best = max(best, snr)
    assert 0.0 <= best <= 1.0


def test_control_vector_valid():
    ch = absorb_window(_fixture_window())
    v = cube_to_control(ch)
    assert v.shape == (5,) and np.all((v >= 0) & (v <= 1))
