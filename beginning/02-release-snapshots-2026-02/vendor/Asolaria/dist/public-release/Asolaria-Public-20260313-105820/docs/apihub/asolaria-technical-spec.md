# Asolaria API Technical Specification

## 1. Architecture
- Runtime: Node.js service.
- Pattern: REST endpoints with queued async job execution.
- Connectors: pluggable modules for external services and browser automation.

## 2. Protocol and Data Format
- Protocol: HTTPS/HTTP (deployment-dependent).
- Format: JSON request/response payloads.
- Job model: immediate queue acknowledgment followed by job polling.

## 3. Security Design
- Policy-based access controls and authority gates.
- Optional token requirements for selected remote surfaces.
- Guardian risk evaluation for sensitive actions.

## 4. Error Handling
- Validation errors return 4xx with actionable messages.
- Policy/guardian blocks return explicit denial reasons.
- Upstream failures are captured and surfaced via job error payloads.

## 5. Performance and Reliability
- Bounded queue concurrency.
- Structured retries at workflow level where safe.
- Clear job state transitions: queued, running, completed, failed, canceled.

## 6. Core Operational Endpoints (Representative)
- Health/status endpoints.
- Integration request endpoints.
- Browser task submission endpoints.
- Job list and job detail endpoints.

## 7. Versioning and Evolution
- Backward-compatible additions preferred.
- New connectors/tools introduced behind policy controls.
- API Hub metadata updated as capabilities expand.

## 8. Deployment Notes
- Runs in local and controlled remote-assisted modes.
- Depends on configured credentials for optional integrations.
- Should be fronted by verified domain for external publication use cases.