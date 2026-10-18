# Mythos Cognitive Engine

Gated OpenMythos runtime bridge for Asolaria.

## What This Is

- A PID-bound Node wrapper around a Python glyph adapter.
- A local bridge for `MYTHOS_LOAD`, `MYTHOS_THINK`, `MYTHOS_REASON`, `MYTHOS_LOOP`, `MYTHOS_STATUS`, `MYTHOS_DRIFT`, and `MYTHOS_HALT`.
- A runtime surface that reports honest `blocked` states when `open-mythos`, config, weights, tokenizer/input IDs, or smoke tests are missing.

## Activation Boundary

- Model weights and configs are operator-provided.
- Package installs and downloads are explicit operator actions.
- Runtime promotion requires a verified smoke test and GAC approval.

## Smoke Commands

```powershell
python packages\mythos-cognitive-engine\src\glyph_adapter.py --once "{\"verb\":\"MYTHOS_STATUS\"}"
node --input-type=module -e "import('./packages/mythos-cognitive-engine/src/engine.mjs').then(async ({MythosCognitiveEngine}) => { const e = new MythosCognitiveEngine({device:'cpu'}); console.log(await e.status()); await e.halt(); })"
```

Runtime model loading requires a verified OpenMythos config and optional weights:

```powershell
python packages\mythos-cognitive-engine\src\glyph_adapter.py --config path\to\mythos-config.json
```
