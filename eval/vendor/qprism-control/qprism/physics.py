"""Spatial near-field Talbot-Lau matter-wave interferometer forward model,
calibrated to Nature s41586-025-09917-9 (Arndt group, Vienna).

Real apparatus parameters taken from the paper:
  * three photo-ionizing optical gratings from a 266 nm laser -> grating period d = 133 nm
  * grating separation  L = 0.983 m  (near the Talbot distance L_T = d^2 / lambda_dB)
  * sodium clusters, mass 143-197 kDa (mean ~172 kDa), diameter ~8 nm
  * beam velocity ~160 m/s
  * ultrahigh vacuum ~9e-9 mbar
  * measured fringe visibility V = 0.10 +/- 0.01 at G-powers P1=62, P2=15.2, P3=68 mW
  * visibility RISES for heavier clusters (400 kDa - 1 MDa)  [Fig. 3]

Because it is a SPATIAL (continuous-beam) interferometer, the Talbot resonance is
VELOCITY- AND MASS-DEPENDENT via  rho = L / L_T = L * lambda_dB / d^2 = L*h / (d^2 * m * v).
So velocity-window and mass-filter selection are the primary control levers, alongside
the middle-grating (G2) laser power, whose phase depth gives a Bessel-type contrast curve
with an optimum near P2 ~ 15 mW (matching the paper's scan).

CALIBRATION: the overall scale V0 is fixed so the model reproduces the paper's single
reported operating point (V = 0.10 at v=160 m/s, m=172 kDa, P2=15.2 mW). Relative
predictions across the levers are physically motivated; full-curve calibration against
Fig. 2/3 data is future work.  ==>  TAG: calibrated-to-1-point, else UNVERIFIED-vs-apparatus.
"""
from __future__ import annotations
from dataclasses import dataclass
import numpy as np
from scipy.special import jv  # Bessel J_n

H_PLANCK = 6.62607015e-34
DALTON   = 1.66053907e-27
K_B      = 1.380649e-23


@dataclass
class Apparatus:
    d_nm:    float = 133.0     # grating period (266 nm / 2)            [paper]
    L:       float = 0.983     # grating separation, m                  [paper]
    lam_uv_nm: float = 266.0   # grating laser wavelength, nm           [paper]
    mu_v:    float = 160.0     # beam mean velocity, m/s                [paper]
    sigma_v: float = 30.0      # beam velocity spread, m/s              ASSUMPTION
    mu_m_kDa:  float = 172.0   # mean cluster mass, kDa                 [paper]
    sigma_m_kDa: float = 18.0  # source mass spread, kDa (143-197 kDa)  [paper range]
    P2_opt_mW: float = 15.2    # G2 power at contrast optimum           [paper]
    Gamma_bb: float = 8.0      # blackbody decoherence rate, 1/s        ASSUMPTION (mild)
    V0:      float = 0.110     # scale, calibrated so operating pt V~0.10

    def talbot_len(self, m_kg: float, v: float) -> float:
        lam = H_PLANCK / (m_kg * v)          # de Broglie wavelength
        d = self.d_nm * 1e-9
        return d * d / lam                    # Talbot length

    def rho(self, m_kg: float, v: float) -> float:
        return self.L / self.talbot_len(m_kg, v)

    def rho_res(self) -> float:
        """Resonance centre = rho at the reported operating point (v=160, m=172 kDa)."""
        return self.rho(self.mu_m_kDa * 1e3 * DALTON, self.mu_v)


@dataclass
class Schedule:
    """Experimental control vector (the selector tuple)."""
    P2_mW: float      # middle-grating (G2) laser power, mW
    v_center: float   # centre of selected velocity window, m/s
    v_half: float     # half-width of velocity window, m/s
    mass_center: float  # mass-filter centre, kDa
    mass_half: float    # mass-filter half-width, kDa


@dataclass
class Anomaly:
    rho_c: float; P2_c: float; amp: float; w_rho: float; w_P: float


# G2-power response CALIBRATED to the paper's measured QUANTUM visibility curve (Fig. 2b of
# Nature s41586-025-09917-9), digitized by eye: rises to ~0.10 at ~17 mW, minimum ~40 mW, weak
# revival ~55 mW. REPLACES the earlier ad-hoc single-Bessel |2 J2| (which oscillated too fast to
# match the real, broader curve — the true G2 is an absorptive ionization grating, not a thin phase
# grating). TAG: figure-digitized (~16 eye-read points); a rigorous fit needs the published source data.
_FIG2B_P2 = [0.0, 5, 8, 12, 15, 17, 20, 24, 28, 32, 36, 40, 46, 52, 60, 70, 80]
_FIG2B_V = [0.0, 0.02, 0.05, 0.08, 0.095, 0.10, 0.093, 0.078, 0.058, 0.040, 0.026, 0.018,
            0.024, 0.034, 0.035, 0.030, 0.028]
_FIG2B_PEAK = max(_FIG2B_V)


def grating_factor(P2_mW: float, ap: Apparatus) -> float:
    """G2 contrast vs laser power, normalized to peak=1, interpolated from the paper's measured
    quantum-visibility curve (Fig. 2b): peak ~17 mW, dip ~40 mW, weak revival ~55 mW."""
    return float(np.interp(max(P2_mW, 0.0), _FIG2B_P2, _FIG2B_V) / _FIG2B_PEAK)


def _visibility_vm(v: float, m_kDa: float, P2_mW: float, ap: Apparatus,
                   anomaly: Anomaly | None) -> float:
    m_kg = m_kDa * 1e3 * DALTON
    rho = ap.rho(m_kg, v)
    rho0 = ap.rho_res()
    # spatial Talbot-Lau resonance in rho (velocity & mass dependent)
    R = np.exp(-((rho - rho0) / (0.35 * rho0)) ** 2)
    gF = grating_factor(P2_mW, ap)
    # decoherence over flight time (spatial: t = 2L/v -> slower = more decoherence)
    decF = np.exp(-ap.Gamma_bb * (2 * ap.L / v))
    # NB: the paper's higher visibility for heavier clusters is reached ALONG the
    # (m,v) resonance ridge (rho held ~constant by retuning velocity), captured by R --
    # not an independent mass gain, so no ad-hoc mass factor is added here.
    V = ap.V0 * R * gF * decF
    if anomaly is not None:
        V += anomaly.amp * np.exp(-((rho - anomaly.rho_c) / anomaly.w_rho) ** 2) \
                         * np.exp(-((P2_mW - anomaly.P2_c) / anomaly.w_P) ** 2)
    return float(max(0.0, min(1.0, V)))


def observe(s: Schedule, ap: Apparatus, anomaly: Anomaly | None = None,
            n_v: int = 11, n_m: int = 11) -> dict:
    """Flux-weighted observed visibility, relative flux, SNR proxy and rho for a schedule,
    integrating over the selected velocity window and mass band."""
    v_lo, v_hi = max(1.0, s.v_center - s.v_half), s.v_center + s.v_half
    m_lo, m_hi = max(1.0, s.mass_center - s.mass_half), s.mass_center + s.mass_half
    vs = np.linspace(v_lo, max(v_lo + 1e-6, v_hi), n_v)
    ms = np.linspace(m_lo, max(m_lo + 1e-6, m_hi), n_m)
    wv = np.exp(-0.5 * ((vs - ap.mu_v) / ap.sigma_v) ** 2)
    wm = np.exp(-0.5 * ((ms - ap.mu_m_kDa) / ap.sigma_m_kDa) ** 2)

    num = 0.0; den = 0.0
    for i, v in enumerate(vs):
        for j, m in enumerate(ms):
            wgt = wv[i] * wm[j]
            num += wgt * _visibility_vm(v, m, s.P2_mW, ap, anomaly)
            den += wgt
    Vbar = num / den if den > 0 else 0.0

    # relative flux = fraction of the beam captured by both windows
    def frac(centers, sigma, lo, hi):
        g = np.linspace(centers - 4 * sigma, centers + 4 * sigma, 400)
        wg = np.exp(-0.5 * ((g - centers) / sigma) ** 2)
        sel = wg[(g >= lo) & (g <= hi)]
        return float(sel.sum() / wg.sum()) if wg.sum() > 0 else 0.0
    flux = frac(ap.mu_v, ap.sigma_v, v_lo, v_hi) * frac(ap.mu_m_kDa, ap.sigma_m_kDa, m_lo, m_hi)

    snr = Vbar * np.sqrt(max(flux, 0.0))
    return {"visibility": float(Vbar), "flux": float(flux), "snr": float(snr),
            "rho": float(ap.rho(s.mass_center * 1e3 * DALTON, s.v_center)),
            "rho_res": float(ap.rho_res())}
