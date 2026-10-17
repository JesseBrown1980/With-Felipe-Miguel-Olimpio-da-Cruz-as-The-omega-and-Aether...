"""Three schedule sources for the blinded three-arm comparison.

DESIGN INVARIANT (the thing that keeps the test honest):
  the Optimizer and the Prism share the EXACT SAME search backbone (a (1+1) evolution
  strategy). The ONLY difference is that the Prism nudges each candidate toward a point
  derived from a (synthetic) neural stream. So any performance gap isolates the neural
  contribution -- nothing else. If the neural stream carries no physics information, the
  Prism MUST NOT beat the Optimizer. `oracle_coupling` lets us inject known information
  to prove the harness can detect a real signal when one exists.

All work happens in a normalised [0,1]^5 cube; `denormalize` maps back to a Schedule.
"""
from __future__ import annotations
import numpy as np
from .physics import Apparatus, Schedule

PARAM_NAMES = ("P2_mW", "v_center", "v_half", "mass_center", "mass_half")


def bounds(ap: Apparatus):
    return {
        "P2_mW":       (1.0, 60.0),             # wide enough to see the Bessel revival
        "v_center":    (ap.mu_v - 3 * ap.sigma_v, ap.mu_v + 3 * ap.sigma_v),
        "v_half":      (3.0, 3 * ap.sigma_v),
        "mass_center": (ap.mu_m_kDa - 3 * ap.sigma_m_kDa, ap.mu_m_kDa + 3 * ap.sigma_m_kDa),
        "mass_half":   (2.0, 3 * ap.sigma_m_kDa),
    }


def denormalize(x: np.ndarray, ap: Apparatus) -> Schedule:
    b = bounds(ap)
    v = {n: b[n][0] + float(np.clip(x[i], 0, 1)) * (b[n][1] - b[n][0])
         for i, n in enumerate(PARAM_NAMES)}
    return Schedule(**v)


def normalize(s: Schedule, ap: Apparatus) -> np.ndarray:
    b = bounds(ap)
    return np.array([(getattr(s, n) - b[n][0]) / (b[n][1] - b[n][0]) for n in PARAM_NAMES])


class RandomSource:
    """Uniform random search. No adaptation. The floor baseline."""
    name = "random"

    def __init__(self, seed: int):
        self.rng = np.random.default_rng(seed)

    def ask(self) -> np.ndarray:
        return self.rng.random(5)

    def tell(self, x, snr):  # ignores feedback
        pass


class OptimizerSource:
    """(1+1)-ES: classical black-box optimiser. No neural input. The control arm the
    prism must beat to matter."""
    name = "optimizer"

    def __init__(self, seed: int, sigma0: float = 0.25):
        self.rng = np.random.default_rng(seed)
        self.sigma = sigma0
        self.best_x = None
        self.best_snr = -np.inf
        self._pending = None

    def ask(self) -> np.ndarray:
        if self.best_x is None:
            self._pending = self.rng.random(5)
        else:
            self._pending = np.clip(self.best_x + self.rng.normal(0, self.sigma, 5), 0, 1)
        return self._pending

    def tell(self, x, snr):
        if snr > self.best_snr:
            self.best_snr, self.best_x = snr, np.array(x)
            self.sigma = min(0.4, self.sigma * 1.15)   # 1/5-rule-ish: expand on success
        else:
            self.sigma = max(0.02, self.sigma * 0.92)  # contract on failure


class NeuralStream:
    """Synthetic stand-in for a neural/consciousness-derived control stream.

    Produces a point in [0,1]^5 per step. With oracle_coupling=0 it is structured
    pseudo-noise (NO physics information). With coupling>0 it is blended toward a known
    target (`toward`, normally the reference optimum) -- i.e. the stream 'secretly knows'
    a fraction of the answer, simulating a real informative coupling we would be testing
    for with EEG/organoid data later.
    """
    def __init__(self, seed: int, coupling: float = 0.0, toward: np.ndarray | None = None):
        self.rng = np.random.default_rng(seed ^ 0xBE1C50)  # "BEHCS" -> valid hex
        self.coupling = float(np.clip(coupling, 0, 1))
        self.toward = np.array([0.5] * 5) if toward is None else np.clip(toward, 0, 1)
        self.phase = self.rng.random(5) * 2 * np.pi

    def next(self) -> np.ndarray:
        # smooth structured noise (a plausible neural-like low-frequency signal)
        self.phase += self.rng.normal(0.15, 0.05, 5)
        base = 0.5 + 0.4 * np.sin(self.phase)
        return np.clip((1 - self.coupling) * base + self.coupling * self.toward, 0, 1)


class PrismSource:
    """Optimizer backbone + neural nudging. Identical ES to OptimizerSource; each
    candidate is pulled a fraction `influence` toward the current neural point."""
    name = "prism"

    def __init__(self, seed: int, stream: NeuralStream, influence: float = 0.5,
                 sigma0: float = 0.25):
        self.rng = np.random.default_rng(seed)
        self.stream = stream
        self.influence = float(np.clip(influence, 0, 1))
        self.sigma = sigma0
        self.best_x = None
        self.best_snr = -np.inf
        self._pending = None

    def ask(self) -> np.ndarray:
        cand = (self.rng.random(5) if self.best_x is None
                else np.clip(self.best_x + self.rng.normal(0, self.sigma, 5), 0, 1))
        neural = self.stream.next()
        self._pending = np.clip((1 - self.influence) * cand + self.influence * neural, 0, 1)
        return self._pending

    def tell(self, x, snr):
        if snr > self.best_snr:
            self.best_snr, self.best_x = snr, np.array(x)
            self.sigma = min(0.4, self.sigma * 1.15)
        else:
            self.sigma = max(0.02, self.sigma * 0.92)
