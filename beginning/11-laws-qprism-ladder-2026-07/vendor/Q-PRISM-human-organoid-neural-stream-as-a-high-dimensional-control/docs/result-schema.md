# Result Schema

The result schema separates simulator evidence from interpretation.

## Comparison Result

```json
{
  "schema": "qprism.compare.v1",
  "seeds": ["qprism-000", "qprism-001"],
  "policies": {
    "classical": {
      "meanScore": 0.0,
      "meanVisibility": 0.0,
      "meanFringeContrast": 0.0,
      "meanPhaseStability": 0.0
    }
  },
  "winner": "classical",
  "ledgerRow": "QPRISM_COMPARE|..."
}
```

## Interpretation Rules

- Simulator scores are `MEASURED_SIM`, not laboratory physics.
- A policy win is an optimization result, not evidence of a consciousness-quantum mechanism.
- Hardware transfer requires a preregistered experiment and blinded schedule execution.
- Human or biological streams require the ethics gate before collection.
