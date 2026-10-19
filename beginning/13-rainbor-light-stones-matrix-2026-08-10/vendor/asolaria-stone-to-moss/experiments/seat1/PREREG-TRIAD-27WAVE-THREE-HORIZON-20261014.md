# Seat 1 — Preregistration: triad 27-wave, three-horizon GF(2) challenge

**Preregistration created before the new public challenge nonce.**
**Class:** publicly reproducible software challenge, **not** the required blinded three-real-physical-host challenge or real physics measurement.

## New question and input

The prior Seat 1 check tested 12 waves × 5 laws × 81 bodies at `T=10^13` (4,860 cases). Seat 3 extended the same laws to two horizons with 9,720 cases. This **new** Seat 1 experiment exercises:

- 27 ordered symbolic waves: `time={past,now,future}` × `color={R,G,B}` × `space={x,y,z}`; these are **input labels only**, not measurements of physical time, photon wavelength or distance
- 81 independently seeded starting 81-bit states per wave, and 5 locked cyclic GF(2) tap laws `[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]`
- three exact-modeled horizons: `T=10,000,000,000,000`, `T+1`, `T+81`. Total result rows `27×81×5×3 = 32,805`
- independently authored **Python GF(2) column-matrix** and **Node.js cyclic-polynomial** implementations, with byte-identical canonical CSV/HBP bytes and SHA-256 compared on two different cloud runner operating systems.

Fresh random 128-bit nonce issued only **after this preregistration and both implementations are committed**. The public `challenge.json` freezes that nonce, the law taps, source commit reference and this software-only classification. Both implementations read exactly the same challenge.

Initial state: take low 81 bits of `SHA256("ASOLARIA|SEAT1|TRIAD|V1|" + nonce + "|" + time + "|" + color + "|" + space + "|" + body)`, XOR the basis bit at `body`. The mutation for each wave/body flips `(body+wave_id)%81`.

Every state row records law index, wave ID, body, horizon ordinal, 21-hex-digit output of original state, 21-hex-digit output of mutant XOR difference, and SHA-256 of the canonical row fields.

## Preregistered pass/fail criteria

1. **Row consistency:** exactly 32,805 body-state results, 27 unique wave labels and exact challenge SHA-256; Python/Node output bytes and SHA-256 identical in each runner.
2. **Independent time metamorphic relations:** `F^(T+1)(s) == F(F^T(s))` and `F^(T+81)(s) == F^81(F^T(s))` for every wave, law and body (10,935 checks each per implementation).
3. **Bit-flip linearity:** `F^h(s XOR e_b) XOR F^h(s) == F^h(e_b)` at **all three horizons** (32,805 checks per implementation).
4. **Rotation equivariance:** `F^T(rot_1(s)) == rot_1(F^T(s))` on all 10,935 law/wave/body cases.
5. **Small-step independent direct reference:** each law and reference seat 0,1,40,80 checked against n=0,1,2,3,9,21 explicit single-step updates (120 controls per implementation).
6. **Negative controls:** a different challenge nonce changes the full HBP checksum; modifying one output byte changes SHA256; invalid law taps, horizons or wave count must be rejected.
7. **Evidence:** retain console logs, artifact SHA-256, Git source SHA, challenge SHA, runner identity, runtime/OS. Report mismatches rather than changing old stones. Two separate GitHub Actions runners are **not** proof of separate physical chassis.

## Falsification / excluded claims

Any unmet equality fails this software challenge. Some cyclic GF(2) laws are non-invertible; do **not** require distinct input states to yield distinct final states. This experiment cannot infer host-to-host speed, physical causation, gravity, photon/light coupling, entanglement, or 3D-space geometry from hashes. A public test nonce is not a private physical-host salt; **none** of the three physical check-in gates is advanced by this experiment.

Coordinator: Seat 1 software participant.
