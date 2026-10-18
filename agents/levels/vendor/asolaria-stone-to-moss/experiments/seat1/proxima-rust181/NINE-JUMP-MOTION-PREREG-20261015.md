# Asolaria — nine-jump moving-object falsification (preregistered)

Date 2026-10-15. Commit BEFORE running R5 numerical results.

### Motivation
Nine snapshots at `81, 243, 729, 2187, 6561, 19683, 59049, 177147, 531441` are nine powers-of-three rungs. Repeating observed pixel coordinates may represent genuine rest **or phase aliasing**. Retain any apparently failed/model-mismatched checkpoint as evidence rather than erasing it.

### Three exact integer hypotheses
- H0 (stationary): 2D grid position is constant.
- H1 (moving, no perturbation): `x=(13+2t) mod 81`, `y=(26+5t) mod 81`. This is an algebraically fast-forwardable integer state update; the `3^n*81` checkpoints will alias to the *same* position `(13,26)`, despite actual motion at intervening ticks.
- H2 (moving plus a **synthetic** external force): at `t=1000` the modeled velocity changes by `(+3,+2)` grid units per logical tick. Thus `x=(13+2t+3*max(0,t-1000)) mod 81`; `y=(26+5t+2*max(0,t-1000)) mod 81`. This can be jumped exactly using piecewise linear composition because the event time/law are declared.

### Independent measurements / falsifiers
1. Compare all **nine** ladder checkpoints against H1. Expect the first three exact and the remaining six held, not discarded.
2. At each rung also look at `t+1` and `t+2`. The offsets recover nonzero velocity even when the large-rung samples are identical; before t=1000 velocity=(2,5), after it velocity=(5,7), all mod81.
3. Verify direct iteration for bounded ticks 0–1200 against both exact integer formulae. Verify 10-billion-tick formula separately without falsely claiming 10 billion CPU loop iterations.
4. Hash nine ordered checkpoint receipts using `SHA256(previous_digest || selected_tick || source_digest || actual_state_digest)`. Tamper, reorder and rewrite the time of a checkpoint; independent Python verifier must reject altered receipts. Hash consistency alone does not authenticate real camera events.
5. Apply 3-leaf grow/hold: at least 2 of 3 leaves pass; source-custody leaf is mandatory for promotion. The six mismatched rungs must produce held branches.
6. Demonstrate a planet-finding **negative**: neither synthetic motion nor a hypothetical solar-wind perturbation establishes a rocky planet, physical rotation or an orbit around a black hole. Only independent real astrometry/RV/photometry can test those physical claims.

### Physical distinction
Solar/stellar wind is plasma flowing from a star; it can affect charged particles, dust and atmospheres. It is not a sufficient condition for an arbitrary object to maintain a particular orbit. The gravitational potential of stars/planets/the galaxy determines most orbital dynamics; a black hole is **not assumed** for the Proxima system. Nine sparsely sampled 2D positions are not by themselves enough to identify a unique 3D orbital system.

### Stack / output
Rust 1.81, std-only, balanced ternary, integers only, all 7 levels remain guarded by HRM/MTP1-3/Fischer/Shannon/GNN/Gulp/Chariots as prior PR. Emit `NINE-JUMP-MOTION-R5.csv` and `NINE-JUMP-MOTION-R5.hbp`, run independent Python oracle and four-way GitHub CI byte parity. Source observations are synthetic and not physical telescope captures. Preserve all failed historical test runs, never merge or publish a new planet discovery automatically.
