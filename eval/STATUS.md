# Eval / watcher layer — vendored software gate

Layer 4 (Q-PRISM control) and Layer 5 (N-Nest depth-3/depth-7 watcher) now
have selected source files directly vendored under `eval/vendor/`, pinned to
their original public commits. `eval/UPSTREAM-LOCK.json` was copied from
`asolaria-stone-to-moss@f032bc0` without rewriting its expected blobs.

`python eval/vendor_gate.py` checks the original Git blob identities, runs
the upstream Q-PRISM controls and N-Nest programs, exercises honest and negative
watcher cases, then audits SHA-256/HBP/HBI evidence. GitHub CI runs this gate
alongside the existing kernel and throat jobs. No Rust source was modified.

The original `upstream_bridge.py`, `adversarial_watcher.py`, and
`forged_watcher.py` remain intact as reference sources. The new vendor adapter
uses checked exact file bytes rather than requiring full upstream Git checkouts.
The adapter additionally runs a deliberately forged subprocess watcher and
requires the parent recomputation gate to hold.

## Evidence classes

Execution on actual electronic hardware is real computation. These control
inputs are **synthetic software simulations**, not measurements of neural
signals, optical memory, matter waves, or biological photocycling.

`source_authenticated=false`, `physical_host_attested=false`,
`neural_training_performed=false`. Source Git SHA-1 and receipt SHA-256
establish bytes and consistency, not custody or instrument provenance.

## Test invocation

```sh
python -m pip install -r eval/vendor/qprism-control/requirements.txt
python eval/vendor_gate.py
```

Outputs are generated under `eval/artifacts/`, not published by this script.
See `eval/vendor/SOURCES.md` for pinned sources and scope.
