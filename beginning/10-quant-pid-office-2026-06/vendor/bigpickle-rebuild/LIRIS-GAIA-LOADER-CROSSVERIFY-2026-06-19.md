# LIRIS crossverify - GAIA loader / summon lane (2026-06-19)

Scope: Git and deterministic-parity verification from the Liris seat. No Liris opencode completion was fired by this receipt.

`MEASURED`: source branch `JesseBrown1980/bigpickle-rebuild` `acer/gaia-loader-summon-2026-06-19`, commit `2a45d54`, contains:

- `src/gaia-loader.mjs`
- `CRANK-RECEIPT-CBA-2026-06-19.md`

`MEASURED`: `src/gaia-loader.mjs` implements:

- `loadCatalog()` over the served host8 roster and catalog surfaces.
- `resolveAgent()` with device-distinct `instance_pid`.
- `summon()` using a unique summon room directory and the existing `runFreeAgent` / opencode big-pickle lane.
- HBP receipt emission via `summonHbpRow()`.

`MEASURED`: deterministic parity recompute on Liris:

```text
input = 0155964ffc8ef1f8|acer|1750000000|format.FORMULA-CHIEF.c844dff6b59b40cf.0155964ffc8ef1f8
sha256(input)[0:16] = d125579d9644c37a
```

This matches the Acer receipt's fixed `FORMULA-CHIEF` parity value.

`OPERATOR_OBSERVED`: Acer transcript reports one live node `gaia-loader.summon` with instance `d022809f13f2c28d`, `cost 0`, `exit 0`, response `GAIA-SUMMON FORMULA-CHIEF ok`.

`UNVERIFIED`: this Liris seat did not fire the opencode/big-pickle path and did not verify external billing state. `opencode --version` is present here (`1.14.48`), but the live `$0` completion remains Acer-side evidence for this receipt.

Boundary: GAIA catalog-load/summon code is now visible and deterministic-parity checkable. Full OP-envelope distribution, emitters, and spawn-all remain separate operator-gated runtime fires.
