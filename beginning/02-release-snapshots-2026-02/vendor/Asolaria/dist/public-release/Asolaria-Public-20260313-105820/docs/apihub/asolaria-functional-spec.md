# Asolaria API Functional Specification

## 1. Overview
Asolaria exposes endpoints for orchestration, queue-based execution, and integration operations.

## 2. Primary Functional Areas
- System health and runtime status retrieval.
- Queued execution model for long-running tasks.
- Integration request routing (for example, GCP API requests).
- Browser task automation (goto/click/type/press/wait/extract).
- Job status polling and result retrieval.

## 3. Representative User Flows

### Flow A: Submit and track a GCP request
1. Client sends a request to the integration endpoint.
2. API returns queued job metadata.
3. Client polls job endpoint until completed.
4. Client consumes structured response or error.

### Flow B: Run browser automation task
1. Client submits URL plus structured steps.
2. API validates policy and guardian checks.
3. Task executes in queue.
4. Client receives extracted page text/links and step-by-step outcome.

## 4. Input/Output Behavior
- Inputs: JSON payloads with constrained schemas.
- Outputs: JSON with `ok`, queue/job metadata, and result or error.
- Errors: validation failures, policy blocks, integration/API upstream errors.

## 5. Security and Authorization Behavior
- Mutating or sensitive actions are policy-guarded.
- Approval/guardian layers may block high-risk actions.
- Authority allowlists determine who can perform privileged operations.

## 6. Functional Constraints
- External API requests restricted to allowed hosts/services.
- Browser tasks require explicit action schema per step.
- Queue concurrency and payload limits enforced server-side.