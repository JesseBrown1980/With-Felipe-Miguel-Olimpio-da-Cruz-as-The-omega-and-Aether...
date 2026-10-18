# ADR-0013: Colony Memory Registry And Transport Epoch

## Status
Accepted (implemented 2026-03-22)

## Context

Colony memory has been drifting because historical transcripts, document claims, agent outputs, and live runtime facts were collapsing into the same layer.

The immediate failures are already documented:

- `18886` drifted from archaeology into edited live files
- `4799` has been repeatedly treated as usable despite current evidence saying dead or unaudited
- relay packets and runtime packets have been mixed together

The colony now needs a small machine-readable contract that separates:

1. shared canon
2. colony-local canon
3. progressive draft memory
4. transport facts with provenance

## Decision

Add a new contract slice under `config/colony-memory/`:

- `colony-registry.schema.json`
- `transport-epoch.schema.json`
- `draft-promotion-policy.schema.json`

Also add example records for each schema and a contract test that validates the examples and the core invariants.

The contracts encode three rules:

1. colonies must be registered with canon namespace, draft surface, retrieval surface, and transport references
2. transport facts must be represented as versioned epochs with provenance
3. draft facts must promote through explicit policy rather than chat momentum

## Consequences

- Positive: the reconnect plan now has a machine-readable contract instead of only prose packets
- Positive: transport facts can be tagged as live, stale, proposed, myth, or superseded without becoming lore
- Positive: both Gaia-side and Liris-side convergence can point at the same schema slice
- Negative: this does not by itself make any bridge live
- Negative: runtime code still needs a later enforcement slice if these contracts are to gate mutation automatically

## Rollback

Delete `config/colony-memory/`, remove the colony-memory contract test, and revert this ADR.

## Evidence

- `node tests/contracts/colony-memory-contract.test.js`
- `config/colony-memory/examples/*.json`
- `IX-255` and `IX-256`
