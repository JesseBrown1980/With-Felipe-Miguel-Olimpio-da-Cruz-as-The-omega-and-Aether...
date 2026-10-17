"""Physics sanity tests -- the calibrated spatial Talbot-Lau sim must match the paper's
regime and reproduce its reported operating point."""
import numpy as np
from qprism.physics import Apparatus, Schedule, observe, grating_factor, DALTON


def test_operating_point_matches_paper():
    ap = Apparatus()
    op = Schedule(P2_mW=15.2, v_center=160.0, v_half=5.0, mass_center=172.0, mass_half=5.0)
    V = observe(op, ap)["visibility"]
    assert abs(V - 0.10) < 0.03, f"operating-point V={V} should be ~0.10 (paper)"


def test_rho_resonance_regime():
    ap = Apparatus()
    assert 0.5 < ap.rho_res() < 1.2, "operating rho should be order-unity (near first Talbot order)"


def test_resonance_ridge_velocity_mass_coupled():
    # rho = L h /(d^2 m v): a heavier cluster stays on resonance at proportionally lower v
    ap = Apparatus()
    r0 = ap.rho(172e3 * DALTON, 160.0)
    v_retuned = 160.0 * (172.0 / 344.0)          # double mass -> half velocity
    r1 = ap.rho(344e3 * DALTON, v_retuned)
    assert abs(r0 - r1) / r0 < 1e-6, "resonance must lie on the (m*v)=const ridge"


def test_g2_power_is_nonmonotonic():
    ap = Apparatus()
    assert grating_factor(15.2, ap) > 0.95            # optimum at paper's P2
    assert grating_factor(40.0, ap) < grating_factor(15.2, ap)  # over-driven G2 loses contrast


def test_decoherence_lowers_visibility():
    ap = Apparatus(); ap2 = Apparatus(Gamma_bb=200.0)
    op = Schedule(15.2, 160.0, 5.0, 172.0, 5.0)
    assert observe(op, ap2)["visibility"] < observe(op, ap)["visibility"]


def test_flux_contrast_tradeoff():
    ap = Apparatus()
    wide = observe(Schedule(15.2, 160.0, 30.0, 172.0, 18.0), ap)
    narrow = observe(Schedule(15.2, 160.0, 4.0, 172.0, 3.0), ap)
    assert wide["flux"] > narrow["flux"]
    assert 0.0 <= wide["visibility"] <= 1.0 and 0.0 <= wide["snr"] <= 1.0
