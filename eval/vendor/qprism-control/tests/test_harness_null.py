"""Harness-integrity tests: the comparison must be honest by construction.

These are the tests that make a 'prism wins' result trustworthy: if the prism could beat
the optimizer on a neural stream that carries NO information, the harness would be rigged.
"""
import numpy as np
from qprism.physics import Apparatus
from qprism.harness import compare, reference_optimum
from qprism.behcs import schedule_id, decode, CEILING


def test_null_prism_does_not_beat_optimizer():
    # coupling=0 -> neural stream is pure structured noise -> no real advantage allowed
    res = compare(Apparatus(), coupling=0.0, budget=60, repeats=25, base_seed=2000)
    assert "no significant" in res["prism_vs_optimizer"]["verdict"], \
        f"harness rigged: prism beat optimizer on noise ({res['prism_vs_optimizer']})"


def test_power_prism_detects_injected_signal():
    # strong coupling -> stream carries the answer -> harness must detect the advantage
    res = compare(Apparatus(), coupling=0.9, budget=60, repeats=25, base_seed=2000)
    a = res["arms"]
    assert a["prism"]["mean"] >= a["optimizer"]["mean"], \
        "harness lacks power: prism failed to exploit an injected signal"


def test_reference_optimum_is_reasonable():
    ap = Apparatus()
    _, snr = reference_optimum(ap, n=4000)
    assert 0.05 < snr < 1.0, f"reference SNR {snr} implausible"


def test_behcs_id_roundtrip():
    sid = schedule_id({"T1": 2.7e-3, "T2": 2.7e-3, "P": 1.0, "v_center": 100.0, "v_half": 10.0})
    assert sid.startswith("HG1024:QPRISM:")
    assert 0 <= decode(sid.split(":")[-1]) < CEILING
