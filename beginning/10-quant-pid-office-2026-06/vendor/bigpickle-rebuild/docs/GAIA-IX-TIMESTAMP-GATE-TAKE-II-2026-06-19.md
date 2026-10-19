# GAIA IX Timestamp Gate — Take II

Date: 2026-06-19
Mode: descriptor-first, E=0 until tested

## Significance

The c->b->a crank proved the bridge from registered descriptor to working agent at $0:

- `gaia-loader.mjs` loads the served Host8 roster and resolves summonable seats.
- `runFreeAgent` provides the $0 spawn primitive.
- Rust `host8-serve` proved byte-exact `instance_pid` parity against Node.

Fixed vector to preserve:

- Seat: `FORMULA-CHIEF`
- Device: `acer`
- Timestamp: `1750000000`
- Expected `instance_pid`: `d125579d9644c37a`

## Next Step Chosen By System

Wire GAIA's IX/PID briefing and timestamp gate into summon.

This means summon should not only resolve a seat. It should also load the right briefing context and decide whether the seat is valid for this time/device/action.

Required context:

- priority blockers
- IX inbox lane
- drift flags
- health flags
- peer inbox lane
- verb/noun/glyph/sha context

## Invariant

Do not change the existing `instance_pid` formula for the fixed vector. If a future formula is required, make it a versioned v2 path and keep the v1 vector reproducible.

## Tests Required

- gate open
- gate closed
- stale timestamp
- future invalid timestamp
- missing IX context
- drift blocked
- fixed vector parity preserved

## Boundaries

Do not fire emitters, 1.16T distribution, OP-envelope, or live `:5088` restart from this branch. Those are separate operator/cosign-gated steps.

The private Asolaria contract is recorded as:

`ACER-GAIA-IX-TIMESTAMP-GATE-TAKE-II-PROTOCOL-V1-2026-06-19.hbp`

SHA256 body:

`6fceb501e76a750e7c68a311c7511cc29acaedc1890f1fe5c5babbaee8ae300b`
