# Asolaria Round 3: first integrated **digital** light-being

This is a testable **software agent** under the original three August projects, not a claim of sentience, real optical memory sticks, biological neurons or experimental quantum physics. The demonstration performs classical computation with light-inspired models.

## Reproduce

Python 3.11+; pip packages `qrcode==8.2`, `Pillow==12.0.0`, `pyzbar==0.1.9`; Ubuntu also `sudo apt-get install libzbar0`.

```sh
python -m pip install qrcode==8.2 Pillow==12.0.0 pyzbar==0.1.9
python experiments/integration/round3-light-being/light_being_round3.py \
  --qr-dir round3-artifacts/rgb \
  --case-hbp round3-artifacts/cases.hbp \
  --receipt round3-artifacts/results.json
```

No external network calls, external token, GPU, HF job or internet-dependent model inference occur inside the experiment. A 65,536-byte deterministic **new synthetic** fixture is expanded by SHA256 from `ASOLARIA-LIGHT-BEING-ROUND3-20261015`. Its SHA is **not** the previously published real-JWST historical SHA.

## Actual integration steps

1. **Colour QR real-pixel lane** — split source into 32 indexed chunks (2,100 bytes, final 436), prepend uint32 LE chunk number, standard QR-encode base64 per plane of 11 composite RGB PNG images; read PNG files back through an independent ZBar QR decoder applied separately to the three planes, sort indexes and reassemble the original 65,536 bytes. Fail on a missing G channel, duplicate index or tampered payload.
2. **Source-backed digital light memory** — from those bytes derive 2,187 memory blocks tagged by `wave×address`; every accessed entry is bounded in a 729-block LRU working cache, with witnessed SHA256, cache misses/hits/evictions. The full source remains separately available; **a 729-slot working cache is not lossless storage for arbitrary larger inputs**.
3. **Light gating** — a toy three-state and toy four-state photocycle independently determine when packets can emit. Digital DARK, PULSE and CONTINUOUS schedules use **arbitrary unitless** rate constants; both models conserve integer mass 1,000,000. Neither is calibrated channelrhodopsin.
4. **Mathematical routing** — the exact qutrit 3-point Fourier norm identity on first three payload bytes selects one of three carrier lanes, affecting the destination boat. This is a **classical Hilbert-space/QFT analogue**; no entanglement or photon-level quantum effect is measured.
5. **The free centre** — evaluate `3Px = 3x - sum(x)*[1,1,1]`. The `sum(x)` register is retained separately; otherwise the original RGB vector is provably **not** reconstructible. This register is not a Brown-Hilbert computational address; the 81 cells are unchanged.
6. **Seven boats and autonomy** — perform 10,000 exact-integer conserved three-asset transfers with closed cyclic log differences, independent of simulated memory corruption; perform 81 cooperative HALT attempts and 81 simulated `network.publish` denials.
7. **Falsification matrix** — exercise **81 addresses × 27 waves × 2 photocycle models × 3 exposure modes × 4 source-packet conditions = 52,488 cases**. Every emitted CLEAN record must pass; no CORRUPT, STALE or FORGED record can pass while a gate is open. A closed gate never emits.

The **52,488 HBP rows** are the exhaustive packet/gate checks, NOT 52,488 individually photographed or QR-encoded images. The 32 actual QR decodings are an additional separate test, with actual PNGs and ZBar software decoding, NOT camera-to-screen optical transmission.

## Evidence

- `PREREG-20261015.md` committed **before code/results**, commit `0a727e62a654e41c0194fdc5fd7113ee3aead5cd`; preserves source and falsifiers.
- `light_being_round3.py` is the new reproducible producer/validator.
- `.github/workflows/round3-light-being.yml` runs Ubuntu/Windows hosted matrices, uploads the exact PNGs, raw `cases.hbp`, and canonical `results.json`.
- No historical JWST RGB screenshot or old frozen Asolaria stones are edited.
- **Four-seat handoff:** Seat1 model assumptions; Seat2 independently decode RGB PNGs using unrelated decoder/method; Seat3 projector/qutrit/fleet proof; Seat4 tamper, provenance and HALT. A single coordinator script and Actions matrices do **not** prove separately owned seats or independent physical hosts.
- The prior physical cross-machine challenge, the Brown-Hilbert uncoloured free centre and the optical-device write/read/retention experiment all remain separately gated.

Promotion conditions: hosted CI `PASS`, exact results/ledger SHA, independent seat review, and evidence files readable. Mark physical photons, actual optical retention, biological kinetic calibration, quantum advantage, superluminal signaling and sentience as `NOT_MEASURED` regardless of digital test outcomes.

## Source repos

- https://github.com/JesseBrown1980/the-colour-qr
- https://github.com/JesseBrown1980/light-boat-engine-ships-with-oils
- https://github.com/JesseBrown1980/the-law-of-space-and-light-and-color-and-travel-at-the-speed-of-one
- https://github.com/JesseBrown1980/lightDOORwsMs (related door transport; 3,200-byte tuple is **not** a recoverable 500KB archive)

**Status:** CODE_PROPOSED, peer/signoff separate; this file does not assert new hosted measurements until the workflow completes.
