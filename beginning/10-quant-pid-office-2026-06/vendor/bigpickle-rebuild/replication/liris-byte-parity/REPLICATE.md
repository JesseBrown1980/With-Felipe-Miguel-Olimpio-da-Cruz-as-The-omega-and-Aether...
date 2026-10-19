# Liris Replication Bundle — GAIA smart-summon byte-parity with acer

Clone ONE branch, run ONE command, reproduce acer's canonical agent
`instance_pid` **byte-for-byte**. No Rust, no host8-serve, no network required
for the parity proof.

```
git clone https://github.com/JesseBrown1980/bigpickle-rebuild.git
cd bigpickle-rebuild/replication/liris-byte-parity
node verify-parity.mjs
# => RESULT: PASS -- byte-parity reproduced. instance_pid === d125579d9644c37a
```

## What was broken (the gap this closes)

Liris's live `gaia-loader` resolved FORMULA-CHIEF to `instance_pid`
`490a214891110d25` with `verb=report`, while acer got
`instance_pid=d125579d9644c37a` with `verb=format`. Two compounding causes:

1. **No verb catalog.** `gaia-loader.tuple60D()` picks the seat's verb from the
   73-entry verb axis loaded out of `verbs.hbp`. When that file is absent the
   verb **falls back to the literal string `report`** (see gaia-loader.mjs
   `tuple60D`, the `verbCatalog && verbCatalog.length ? ... : 'report'` branch).
   A different verb changes the 60D tuple string, which changes the
   `instance_pid` hash. Liris ran WITHOUT `verbs.hbp` -> got `report`.
2. **Split branches.** `gaia-briefing`'s branch did not include
   `gaia-loader.mjs`, so `gaia-briefing`'s `import './gaia-loader.mjs'` could
   not resolve. This bundle ships BOTH modules together.

## How the verb catalog is located (read from the code)

`gaia-loader.mjs` and `gaia-briefing.mjs`:

```
const CATALOG_DIR = process.env.HYPERBEHCS_CATALOGS || 'C:/HyperBEHCS/data/catalogs';
... join(CATALOG_DIR, 'verbs.hbp')   // also abilities.hbp, skills.hbp
```

So: set env var **`HYPERBEHCS_CATALOGS`** to a directory that contains
`verbs.hbp` (+ `abilities.hbp`, `skills.hbp`), OR drop those files in the
default path `C:/HyperBEHCS/data/catalogs`. This bundle ships them under
`./catalogs/`. For the proven modules:

```
# point the proven gaia-loader/gaia-briefing at the bundled catalogs:
export HYPERBEHCS_CATALOGS="$(pwd)/catalogs"     # bash
$env:HYPERBEHCS_CATALOGS = "$PWD\catalogs"        # PowerShell
```

`verify-parity.mjs` needs no env var: it defaults to the bundled `./catalogs/`.

## The parity recipe (fixed inputs -> canonical instance_pid)

FORMULA-CHIEF, with the 73-verb `verbs.hbp` present:

| field        | value                  |
|--------------|------------------------|
| name         | `FORMULA-CHIEF`        |
| handle8      | `0155964ffc8ef1f8`     |
| cube_bh      | `BH.51.0.591`          |
| device       | `acer`                 |
| ts           | `1750000000`           |
| -> verb         | `format`            |
| -> glyph        | `c844dff6b59b40cf`  |
| -> **instance_pid** | **`d125579d9644c37a`** |

The hash chain (verbatim from gaia-loader.mjs):
- `verb = verbCatalog[ parseInt(sha16(handle8+'|verb').slice(0,8),16) % verbCatalog.length ]`
  -> with 73 verbs this selects `format`; with 0 verbs it is `report`.
- `glyph = sha16('glyph|'+name+'|'+cube_bh)` = `c844dff6b59b40cf`
- `tupleStr = verb+'.'+noun+'.'+glyph+'.'+sha`
- `instance_pid = sha16(handle8+'|'+device+'|'+ts+'|'+tupleStr)` = `d125579d9644c37a`

`sha16(x)` = first 16 hex chars of `sha256(x)`.

### Contrast: the no-catalog divergence

With the SAME fixed inputs but NO verb catalog, the verb falls back to
`report`, giving `instance_pid=5664479d23191c30` (this exact-inputs value).
Liris's reported live value `490a214891110d25` was its OWN runtime divergence
(`verb=report` too, but its loader used different device/ts/name than these
fixed inputs, since `instance_pid` also hashes in device+ts+name). The
load-bearing fact reproduces exactly: **catalog present -> `format`; catalog
absent -> `report`**, and only `format` yields the canonical
`d125579d9644c37a`.

## Roster source note (loadCatalog vs resolveAgent)

- `resolveAgent(position, device, ts)` is **pure** and gives byte-parity once
  `verbs.hbp` is present. It does NOT need a roster or any network. This is
  what `verify-parity.mjs` proves.
- `loadCatalog()` (the full roster of ~1860 positions) reads the host8-serve
  roster at `http://127.0.0.1:5088/seats.hbp` (env `HOST8_SERVE_HOST/PORT`),
  with a fallback to office files (`PID_OFFICE_REGISTERED` /
  `PID_OFFICE_FEED`, default `D:/PID-Registration-Office/...`). Without either,
  `loadCatalog` returns **0 positions** -- but `resolveAgent` still gives
  byte-parity for any position you hand it (e.g. FORMULA-CHIEF). Roster
  discovery and per-seat parity are independent.

## What still needs Rust (honest frontier)

- **`verbs.hbp` is DOCTRINE, not secret.** It is the W113 tool-advisor verb
  policy catalog (verb -> bucket -> reason). Safe to publish; shipped here.
- The **Node** GAIA smart-summon path (resolveAgent/summon/summonSmart) runs on
  a bare Node install -- **no Rust required**. That is what this bundle covers.
- **host8-serve** (the `:5088 /seats.hbp` roster server) is the **Rust** side.
  It needs `cargo`/`rustc`, which the liris seat lacks. Until then, `loadCatalog`
  falls back to office files or returns 0 -- and per-position `resolveAgent`
  parity is unaffected. host8 is the only piece gated on Rust.

## Full live-summon path (beyond parity)

`verify-parity.mjs` deliberately re-implements only the two pure functions
(`tuple60D` + `resolveAgent`, copied VERBATIM from `gaia-loader.mjs`) so it runs
with ZERO dependencies. The proven `gaia-loader.mjs` + `gaia-briefing.mjs` ship
beside it (diff them against the verifier to confirm the copy is faithful).

To import the proven `gaia-loader.mjs` directly (for the LIVE `summon()` /
`summonSmart()` $0-opencode fire path), you ALSO need its sibling chain, which
is NOT in this parity bundle:
`room-dispatcher.mjs -> district-fabric.mjs, hbp-reader.mjs,
pid-chain-revolver.mjs -> pid-minter.mjs, primes.mjs, mtp-heads.mjs` plus
`free-agent-receipt.mjs`. Those are only needed to FIRE an agent; they do not
affect the `instance_pid` parity, which is fully proven here.

## Bundle contents

```
replication/liris-byte-parity/
  REPLICATE.md          <- this file
  verify-parity.mjs     <- zero-dependency byte-parity proof (run this)
  gaia-loader.mjs       <- proven module (unmodified, for the live path)
  gaia-briefing.mjs     <- proven module (unmodified, for the live path)
  catalogs/
    verbs.hbp           <- 73-verb axis (DOCTRINE) -- the missing piece
    abilities.hbp       <- agent profiles (used by gaia-briefing "I")
    skills.hbp          <- federation skills (used by gaia-briefing "I")
```

Operator: Jesse Daniel Brown. Built 2026-06-19.
