# Eval / watcher layer — staged, not yet wired

This is the Layer-4/5 trust layer: the driver that runs control proposals and the
independent watcher that re-derives the expected trace and compares digests. The
sources here are copied clean from
`JesseBrown1980/asolaria-stone-to-moss@f032bc0`
(`experiments/integration/seat1/` and `seat4/`) and scan free of third-party
private data.

## Why it is not in the CI gate

It cannot run in isolation. It depends on repositories that are **not** part of
this stack and must be vendored from their clean upstreams first:

- `JesseBrown1980/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control`
  @ `b4a21a25381d6920b7aab92c94c3c3e1420fc9e4` — the actual Layer-4 control source
  (`NeuralStream` / `PrismSource` / `OptimizerSource` / `RandomSource`).
- `JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED` — the watcher's
  independent-verification peer.

Until those are vendored, these files are reference source, not a runnable layer,
so the gate does not include them. The runnable, gated layers are the three
Rust crates under [`../qprism/`](../qprism/) and the time harness under
[`../time/`](../time/).

## Honesty label (carried from the source, do not remove)

Every result this layer produces is **simulated / software-only** and self-labels
it: `source_authenticated=false`, `physical_host_attested=false`,
`neural_training_performed=false`, "not actual neural signals". The included
`upstream_bridge.py` M1 falsifier deliberately shows that a *self-consistent*
attacker-chosen input yields a mathematically GREEN watcher result while
`source_authenticated=false` — i.e. internal math-consistency is **not** origin
authentication, and is **not** a physical or neural measurement. Do not stack
this layer with any physical/neural-measurement claim.

## Files

- `upstream_bridge.py` — seat-1 eval/integration bridge (control arms + budgeted
  ask/tell loop + separate-process watcher gate + negative controls).
- `adversarial_watcher.py` — seat-4 adversarial peer test of the watcher
  (compromised self-consistent watcher accepted by an unanchored parent, rejected
  by an external pinned-commit anchor).
- `forged_watcher.py` — the deliberately compromised watcher substituted in that
  adversarial test.
