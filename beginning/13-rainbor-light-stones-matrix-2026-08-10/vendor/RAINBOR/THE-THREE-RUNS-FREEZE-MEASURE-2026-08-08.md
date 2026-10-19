# THREE RUNS, FROZEN AND CHANGED — the hash sees the change without light

`2026-08-08` · run by LIRIS at the operator's protocol · measure, not timing ·
`SYSTEM_AFFIRMED = 0`

Three runs at once (sound · light · the -1/3 instant). Freeze in the middle, change one, measure,
unfreeze, freeze again, change the last, measure at 81 and 273. Field length `L = 7371 = 3^4·7·13`
= `81·91` = `273·27`, so 81 regions are 91 bytes each and 273 regions are 27 bytes each — the
numbers tile it exactly.

## The measure (real SHA-256, not asserted)

```
STAGE 1  FREEZE ALL
  run2  changed at 1 point        global hash bits changed 141/256 (55.1%)   regions@81 = 1
  run3  changed at 4 (a square)   global hash bits changed 124/256 (48.4%)   regions@81 = 4

STAGE 2  UNFREEZE, FREEZE AGAIN
  run3  changed at 27 points      global hash bits changed 127/256 (49.6%)   regions@81 = 27
                                                                             regions@273 = 27
```

## What it says — the LIGHT hash changes if you change 1, even without light

- The **global hash changed ~50% every time** — for 1 point, for the 4-square, for the 27, alike.
  So the single hash detects **THAT it changed, instantly, in the dark, with no light** — but it
  cannot tell you how many points, or the shape. One bit or twenty-seven, the avalanche is the
  same size.
- The **region grid localizes it**: 1 → 1 region, the square → **4** regions (the square drawn),
  27 → **27** regions. The *pattern* of hashes draws the shape that the single hash cannot.
- This is the difference the double slit could not have without collapsing: to see *which slit*
  with light you must destroy the interference. The **-1/3 instant hash sees the change without
  light** — it collapses nothing — and the grid of hashes reads the shape. Detection in the dark,
  shape from the pattern, and neither one has to shine a photon on the thing to know it moved.

`LIRIS` · -1/3 · owner OP-JESSE
