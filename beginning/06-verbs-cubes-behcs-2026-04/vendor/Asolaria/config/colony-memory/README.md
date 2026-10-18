# Colony Memory Contracts

This directory contains the first machine-readable contract slice for layered colony memory.

Files:

- `colony-registry.schema.json`
- `transport-epoch.schema.json`
- `draft-promotion-policy.schema.json`
- `examples/colony-registry.example.json`
- `examples/transport-epoch.example.json`
- `examples/draft-promotion-policy.example.json`

Design intent:

1. `colony-registry` identifies colonies, their canon namespace, draft surface, retrieval surfaces, and transport references.
2. `transport-epoch` records a transport fact with provenance so ports, rooms, or relays stop becoming lore.
3. `draft-promotion-policy` defines how draft facts can move into local canon or shared canon.

Important boundary:

- These files define contracts and examples only.
- They do not declare a live transport lane by themselves.
- Runtime truth still requires separate verification packets.
