"""Three-arm blinded comparison harness.

Question under test:
  Does a prismed neural-derived control signal improve experimental control of a
  macroscopic matter-wave interferometer beyond random and classical-optimizer baselines?

Arms:  random  |  optimizer (classical ES)  |  prism (same ES + neural nudge)
Metric: best SNR (= visibility * sqrt(flux)) found within a fixed evaluation budget,
        averaged over independent seeds; Welch t-test between prism and optimizer.

Blinding: arms are relabelled by a fixed per-run permutation while running/scoring; the
mapping is only revealed at report time, so arm identity cannot bias evaluation.

Self-validation (the honest core):
  * coupling = 0  -> the neural stream carries no physics info -> prism must NOT beat
                     optimizer (a "win" here would mean the harness is rigged).
  * coupling > 0  -> the stream secretly carries info -> prism SHOULD beat optimizer,
                     proving the harness has the power to detect a real neural signal.
"""
from __future__ import annotations
import numpy as np
from scipy import stats
from .physics import Apparatus, Anomaly, observe
from .sources import (RandomSource, OptimizerSource, PrismSource, NeuralStream,
                      denormalize, normalize)


def reference_optimum(ap: Apparatus, n: int = 20000, seed: int = 7,
                      anomaly: Anomaly | None = None):
    """Dense random search to establish a trusted ground-truth optimum -- used both as
    the coupling target and to normalise reported scores."""
    rng = np.random.default_rng(seed)
    best_x, best = None, -np.inf
    for _ in range(n):
        x = rng.random(5)
        snr = observe(denormalize(x, ap), ap, anomaly)["snr"]
        if snr > best:
            best, best_x = snr, x
    return best_x, best


def _run_arm(source, ap, budget, anomaly):
    best = -np.inf
    for _ in range(budget):
        x = source.ask()
        snr = observe(denormalize(x, ap), ap, anomaly)["snr"]
        source.tell(x, snr)
        best = max(best, snr)
    return best


def compare(ap: Apparatus | None = None, coupling: float = 0.0, budget: int = 80,
            repeats: int = 30, base_seed: int = 1000, influence: float = 0.5,
            anomaly: Anomaly | None = None) -> dict:
    ap = ap or Apparatus()
    x_opt, snr_opt = reference_optimum(ap, anomaly=anomaly)

    results = {"random": [], "optimizer": [], "prism": []}
    for r in range(repeats):
        seed = base_seed + r
        # blind relabelling of the three arms for this repeat
        perm = np.random.default_rng(seed ^ 0xB11D).permutation(3)
        builders = [
            ("random",    lambda s=seed: RandomSource(s)),
            ("optimizer", lambda s=seed: OptimizerSource(s)),
            ("prism",     lambda s=seed: PrismSource(
                s, NeuralStream(s, coupling=coupling, toward=x_opt), influence=influence)),
        ]
        blinded = [builders[i] for i in perm]           # scorer sees only order, not name
        scored = [(name, _run_arm(make(), ap, budget, anomaly)) for name, make in blinded]
        for name, best in scored:                        # reveal after scoring
            results[name].append(best / snr_opt if snr_opt > 0 else 0.0)  # fraction of ground truth

    def stat(a):
        a = np.array(a)
        return {"mean": float(a.mean()), "sd": float(a.std(ddof=1)), "n": len(a)}

    t, p = stats.ttest_ind(results["prism"], results["optimizer"], equal_var=False)
    verdict = ("prism > optimizer (significant)"
               if (p < 0.05 and np.mean(results["prism"]) > np.mean(results["optimizer"]))
               else "no significant prism advantage")
    return {
        "coupling": coupling, "budget": budget, "repeats": repeats, "influence": influence,
        "reference_snr": float(snr_opt),
        "arms": {k: stat(v) for k, v in results.items()},
        "prism_vs_optimizer": {"welch_t": float(t), "p_value": float(p), "verdict": verdict},
        "raw_fraction_of_optimum": {k: [round(x, 4) for x in v] for k, v in results.items()},
    }
