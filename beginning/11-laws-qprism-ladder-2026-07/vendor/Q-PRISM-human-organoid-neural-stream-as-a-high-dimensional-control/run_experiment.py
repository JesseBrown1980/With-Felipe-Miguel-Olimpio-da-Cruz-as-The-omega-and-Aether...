#!/usr/bin/env python3
"""QPRISM-MUSCLE-SIM experiment runner (Acer build).

Runs the three-arm blinded comparison and prints the honest verdict. Also runs the
built-in self-validation: prism must NOT beat optimizer at coupling=0, and SHOULD beat
it at coupling>0.

Examples
--------
  python run_experiment.py                       # default: coupling sweep + summary
  python run_experiment.py --coupling 0.0        # single run, honest null
  python run_experiment.py --coupling 0.8        # single run, injected signal
  python run_experiment.py --budget 120 --repeats 40 --out results/run.json
"""
from __future__ import annotations
import argparse, json, os
from qprism.physics import Apparatus
from qprism.harness import compare


def _print(res):
    a = res["arms"]
    print(f"\n  coupling={res['coupling']:.2f}  budget={res['budget']}  repeats={res['repeats']}"
          f"  (score = fraction of ground-truth SNR)")
    for name in ("random", "optimizer", "prism"):
        s = a[name]
        print(f"    {name:10s} {s['mean']:.3f} +/- {s['sd']:.3f}")
    pv = res["prism_vs_optimizer"]
    print(f"    -> {pv['verdict']}   (Welch t={pv['welch_t']:+.2f}, p={pv['p_value']:.4f})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--coupling", type=float, default=None)
    ap.add_argument("--budget", type=int, default=80)
    ap.add_argument("--repeats", type=int, default=30)
    ap.add_argument("--influence", type=float, default=0.5)
    ap.add_argument("--out", type=str, default=None)
    args = ap.parse_args()

    app = Apparatus()
    print("=" * 68)
    print("QPRISM-MUSCLE-SIM  (Acer build) -- spatial Talbot-Lau, calibrated to Nature s41586-025-09917-9")
    print(f"  d={app.d_nm:.0f} nm  L={app.L:.3f} m  v={app.mu_v:.0f} m/s  "
          f"m={app.mu_m_kDa:.0f} kDa  rho_res={app.rho_res():.3f}")
    print("=" * 68)

    if args.coupling is not None:
        res = compare(app, coupling=args.coupling, budget=args.budget,
                      repeats=args.repeats, influence=args.influence)
        _print(res)
        out = res
    else:
        # coupling sweep = the self-validation the claim gate depends on
        out = {"sweep": []}
        for c in (0.0, 0.3, 0.6, 0.9):
            res = compare(app, coupling=c, budget=args.budget,
                          repeats=args.repeats, influence=args.influence)
            _print(res)
            out["sweep"].append(res)
        null = out["sweep"][0]["prism_vs_optimizer"]
        strong = out["sweep"][-1]["prism_vs_optimizer"]
        print("\n  SELF-VALIDATION (claim-gate precondition):")
        print(f"    coupling=0.0 -> {null['verdict']}   "
              f"[expected: no significant prism advantage]")
        print(f"    coupling=0.9 -> {strong['verdict']}   "
              f"[expected: prism > optimizer (significant)]")
        ok = ("no significant" in null["verdict"]) and ("significant" in strong["verdict"]
                                                        and ">" in strong["verdict"])
        print(f"    harness power check: {'PASS' if ok else 'REVIEW'}")

    if args.out:
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        with open(args.out, "w") as f:
            json.dump(out, f, indent=2)
        print(f"\n  wrote {args.out}")


if __name__ == "__main__":
    main()
