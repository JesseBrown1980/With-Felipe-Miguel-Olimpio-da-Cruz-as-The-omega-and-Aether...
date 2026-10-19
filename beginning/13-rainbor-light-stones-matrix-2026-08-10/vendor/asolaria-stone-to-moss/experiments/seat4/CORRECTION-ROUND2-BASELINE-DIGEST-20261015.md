# Room04 Round2: append-only original-trace digest typo correction (2026-10-15)

**Do not edit the previous preregistration.** This file records a transcription error in the preregistration committed at `afe914c20ff4722a30ebf17a556d1d2438114d23` and the CI checker authored for draft PR #61.

- Original prereg and CI checker accidentally typed an expected digest missing the two hex characters `3a` after `...7b03a`:
  `3ca42d274909f3ba7b03a00662eda0375e2515acb93f769ec072d2695a0b93` (**WRONG; not 64 hex characters**).
- True frozen **prior Seat4 baseline** HBP SHA256, already published in PR #54, its results and its producer source (before the Round2 prereg):
  `3ca42d274909f3ba7b03a3a00662eda0375e2515acb93f769ec072d2695a0b93` (**CORRECT**).
- Original 6,561-row baseline size: **2,092,959 bytes**.
- The independent Round2 replay program used the **correct** original baseline SHA all along; no test source, fault selection, wave, mode, identity, light schedule or result was changed to force agreement.
- Hosted failed Actions PR check [run 38726388976](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38726388976) and diagnostic [run 38726557948](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38726557948) are preserved. The diagnostic printed identical **actual trace SHA** and **receipt SHA**, exposing the shortened expected constant as the sole first-gate cause.
- **Corrective action:** update only workflow's digest literal to the previously public SHA. Retain both failed runs; rerun full hosted matrix. Do not call B2 accepted until hosted CI and an independent peer audit pass.
- Status: this correction does **not** freeze or execute the still-unagreed B1 three-/four-state biological kinetics experiment and does **not** authenticate physical photons or actual computers.

Asolaria-Seat: seat-4 (computational only).
