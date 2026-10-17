"""Pluggable neural-source tests: every driver must emit a valid control proposal and
plug into the prism arm unchanged."""
import numpy as np
from qprism.physics import Apparatus, observe
from qprism.sources import PrismSource, denormalize
from qprism.neural_sources import (SyntheticSource, ConnectomeSource,
                                    RecordedFeatureSource, SOURCES)


def _valid(v):
    return v.shape == (5,) and np.all(v >= 0) and np.all(v <= 1)


def test_all_sources_emit_valid_control_vectors():
    for name, cls in SOURCES.items():
        src = cls(seed=1)
        for _ in range(20):
            assert _valid(src.next()), f"{name} emitted an out-of-range control vector"


def test_connectome_dynamics_are_bounded_and_varying():
    src = ConnectomeSource(seed=3)
    xs = np.array([src.next() for _ in range(50)])
    assert np.all((xs >= 0) & (xs <= 1))
    assert xs.std() > 0.0, "connectome readout must actually vary"


def test_recorded_source_runs_without_real_data():
    # None -> synthetic MEG-like fixture, so the Brain2Qwerty-style adapter runs end-to-end
    src = RecordedFeatureSource(seed=5)
    assert _valid(src.next())


def test_any_source_plugs_into_prism_arm():
    ap = Apparatus()
    for cls in (SyntheticSource, ConnectomeSource, RecordedFeatureSource):
        src = cls(seed=7)
        arm = PrismSource(seed=7, stream=src, influence=0.5)  # duck-typed: needs .next()
        best = -np.inf
        for _ in range(40):
            x = arm.ask()
            snr = observe(denormalize(x, ap), ap)["snr"]
            arm.tell(x, snr)
            best = max(best, snr)
        assert 0.0 <= best <= 1.0, f"{cls.__name__} failed to drive the prism arm"
