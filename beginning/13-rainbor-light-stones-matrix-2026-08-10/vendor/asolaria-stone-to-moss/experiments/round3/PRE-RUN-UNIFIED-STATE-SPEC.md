# Additive pre-run numerical fixture lock — Round3 unified digital source

Written after broader prereg at commit `99fe20e3188faf60d391ec9b076eb4bf6aedd4e7`, before first execution of new full-state reference. No output SHA, qualitative preference or outcome inserted in this file.

## Fixed coordinate axes
- 81 independent immutable site indices 0..80 and 27 independent wave labels 0..26.
- Four source schedules: dark; short `(t+(site%5)+(wave%7))%32 < 4`; long `(t+(site%5)+(wave%7))%64 < 24`; continuous_then_dark `t<120`. Boolean light values only.
- 240 ticks, t=0..239. Snapshot AFTER tick t for fixed ticks `0,7,31,63,127,191,239` (7 snapshots). Models separate lanes; initial state C=Q=1e6, O=R=0 or C1=Q=1e6, O1=O2=C2=0.
- Discrete time nominal dt 20ms (a label, not measured continuous biology). Every per-tick model transition synchronous from the full previous state. All integer rates are arbitrary **per-tick fractions in millionths**, so numbers are not physical rates/s, and are not imported directly from Seat 1/Seat 3 prior incompatible models.

## Three state
- C->O = floor(C*300000/Q) if light else 0
- O->R = floor(O*170000/Q)
- R->C = floor(R*60000/Q)
- Updated C/O/R by signed conservation; I3 = 2000*O (integer synthetic units).

## Four state
- C1->O1 = floor(C1*300000/Q) if light else 0
- O1->O2 = floor(O1*110000/Q)
- O1->C1 = floor(O1*80000/Q)
- O2->C2 = floor(O2*40000/Q)
- C2->C1 = floor(C2*55000/Q)
- C1->C2 = floor(C1*20000/Q) if light else 0
- O2->O1 = floor(O2*25000/Q)
- Update via edge-flow conservation; I4 = 2000*O1 + 500*O2 (synthetic proxy units).

## Canonical HBP
Models in order `3` then `4`; arms in order `dark,short,long,continuous_then_dark`; waves 0..26; ticks ascend. **For every snapshot**, exactly one UTF-8 LF row:
`wave=WW|arm=AAAA|model=M|tick=TTT|sites=BASE64|total_current=D\n`.
`BASE64` is native 16-byte (four 32-bit little endian unsigned integers) per each of 81 sites concatenated, site ascending. Three-state pads fourth number with 0; four-state has C1,O1,O2,C2. `D` is sum over 81 *new* site states' symbolic currents. Canonical input/output ordering must be exact across separately written Python and Node implementations. Expected 1,512 full whole-81-site snapshots and 4,199,040 site-tick updates. Must test nonnegative and exact mass every update and ZERO open fraction/current in all dark arms. No future score predictions registered.

## Reproducibility
Output SHA256 HBP, full file bytes, source git/blob SHA, Python/Node versions, OS, execution command and failing cases. Comparison must use **actual raw bytes**, not only equal reported result text. Correlated producers cannot attest physical source. This is new Round3 model, not an independent reenactment of original PR #50 trace.
