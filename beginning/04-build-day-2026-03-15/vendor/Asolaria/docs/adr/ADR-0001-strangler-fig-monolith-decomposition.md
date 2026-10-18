# ADR-0001: Strangler Fig Monolith Decomposition

## Status
Accepted

## Context
server.js is 35,949 lines containing all routes, business logic, connectors, and utilities in a single file. Any change risks breaking unrelated features. Testing in isolation is impossible. The 383 /api/* routes must remain backward compatible throughout decomposition.

## Decision
Decompose server.js using the strangler fig pattern: extract one seam at a time into bounded modules under core/, middleware/, routes/, brain/, connectors/, skills/, civilization/, services/. Each extraction introduces a compatibility shim so the old path still works until the new module is verified. No big-bang rewrite.

## Extraction Order
1. core/config.js — runtime settings, env vars, paths (leaf, no deps)
2. middleware/auth.js — gateway auth, attribution, rate limiting
3. core/approval.js — approval engine, guardian logic
4. core/queue.js — already extracted to src/jobQueue.js, upgraded with WAL
5. connectors/interface.js — IConnector contract, manifest per connector
6. skills/ — already partially extracted to src/skill*.js
7. civilization/ — already partially extracted to src/civilizationWorld.js
8. routes/ — gradual route extraction behind compatibility facades

## Consequences
- Positive: testable modules, safer changes, clear ownership boundaries
- Negative: temporary duplication during shim period, extra require() indirection
- Risk: shim bugs could silently break route behavior

## Rollback
Each seam extraction is a single commit. Revert commit to restore inline behavior.

## Evidence
- Server boots and /api/health/fast returns ok after each extraction
- Contract test harness validates all frozen schemas
- Route smoke tests confirm backward compatibility
