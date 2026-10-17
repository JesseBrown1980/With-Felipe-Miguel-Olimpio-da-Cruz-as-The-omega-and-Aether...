"""Pluggable neural-stream sources for the prism arm.

The prism arm needs a source exposing `.next() -> ndarray[5]` in [0,1] (a control-parameter
proposal in normalised space). This module makes that source PLUGGABLE, so the SAME blinded
harness can be driven by any of:

  * SyntheticSource       -- structured pseudo-noise (baseline; carries no physics info).
  * ConnectomeSource      -- activity of a neural GRAPH (e.g. the C. elegans connectome,
                             Wasiolek-style: ~300 neurons / ~2200 synapses) run as a bounded
                             rate model and projected to control dims. Real nervous-system
                             dynamics, no wet lab. Load a real edge list in place of the toy graph.
  * RecordedFeatureSource -- a pre-extracted feature time-series from REAL non-invasive
                             recordings (e.g. MEG features in the spirit of Meta's public
                             Brain2Qwerty v1 dataset), windowed and projected to control dims.

CLAIMS GATE (critical): plugging in real/biological data does NOT bypass the honest null.
A source only "wins" in the harness if its signal genuinely correlates with good control --
which is exactly the hypothesis under test. None of these adapters inject physics knowledge;
each is a lawful *proposer*, and the simulator remains the sole judge. See docs/CLAIMS-GATE.md.
"""
from __future__ import annotations
import numpy as np


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


class NeuralSource:
    """Interface: return a control-parameter proposal in [0,1]^5 each step."""
    dim = 5
    def next(self) -> np.ndarray:  # pragma: no cover - interface
        raise NotImplementedError


class SyntheticSource(NeuralSource):
    """Smooth structured noise. Carries no physics information (baseline / honest-null driver)."""
    def __init__(self, seed: int):
        self.rng = np.random.default_rng(seed)
        self.phase = self.rng.random(self.dim) * 2 * np.pi

    def next(self) -> np.ndarray:
        self.phase += self.rng.normal(0.15, 0.05, self.dim)
        return np.clip(0.5 + 0.4 * np.sin(self.phase), 0, 1)


class ConnectomeSource(NeuralSource):
    """Bounded rate model over a neural graph, read out to control dims.

    Pass a real adjacency matrix W (n x n) -- e.g. built from a C. elegans connectome edge
    list -- or leave it None to use a reproducible toy graph. The dynamics are
    x <- tanh(gain * W @ x + drive), then a fixed random readout R (5 x n) -> sigmoid -> [0,1]^5.
    Biologically-motivated structure; NO physics information injected.
    """
    def __init__(self, seed: int, W: np.ndarray | None = None, n: int = 32,
                 gain: float = 0.9, density: float = 0.12):
        self.rng = np.random.default_rng(seed)
        if W is None:
            W = self.rng.normal(0, 1, (n, n)) * (self.rng.random((n, n)) < density)
            np.fill_diagonal(W, 0.0)
            # spectral-radius normalise for stable, non-trivial dynamics
            r = np.max(np.abs(np.linalg.eigvals(W)))
            if r > 0:
                W = W / r
        self.W = W
        self.n = W.shape[0]
        self.gain = gain
        self.x = self.rng.normal(0, 0.3, self.n)
        self.R = self.rng.normal(0, 1, (self.dim, self.n)) / np.sqrt(self.n)

    def next(self) -> np.ndarray:
        drive = self.rng.normal(0, 0.1, self.n)
        self.x = np.tanh(self.gain * self.W @ self.x + drive)
        return np.clip(_sigmoid(3.0 * self.R @ self.x), 0, 1)


class RecordedFeatureSource(NeuralSource):
    """Drive the prism from a pre-extracted neural feature time-series (T x F).

    Intended for REAL non-invasive recordings -- e.g. MEG features derived in the spirit of
    Meta's public Brain2Qwerty v1 dataset. Provide `features` (T, F); each step advances a
    window and projects its mean through a fixed random readout R (5 x F) -> sigmoid -> [0,1]^5.
    If `features` is None, a reproducible synthetic MEG-like fixture is generated so the adapter
    runs end-to-end without the real data present (replace with real features to test for real).
    """
    def __init__(self, seed: int, features: np.ndarray | None = None,
                 window: int = 25, n_feat: int = 64, length: int = 2000):
        self.rng = np.random.default_rng(seed)
        if features is None:
            t = np.linspace(0, 40 * np.pi, length)[:, None]
            freqs = self.rng.uniform(0.5, 3.0, (1, n_feat))
            phase = self.rng.uniform(0, 2 * np.pi, (1, n_feat))
            features = np.sin(t * freqs + phase) + 0.3 * self.rng.normal(0, 1, (length, n_feat))
        self.features = features
        self.T, self.F = features.shape
        self.window = min(window, self.T)
        self.pos = 0
        self.R = self.rng.normal(0, 1, (self.dim, self.F)) / np.sqrt(self.F)

    def next(self) -> np.ndarray:
        w = self.features[self.pos:self.pos + self.window]
        self.pos = (self.pos + max(1, self.window // 2)) % max(1, self.T - self.window)
        z = self.R @ w.mean(axis=0)
        return np.clip(_sigmoid(z), 0, 1)


SOURCES = {"synthetic": SyntheticSource,
           "connectome": ConnectomeSource,
           "recorded": RecordedFeatureSource}
