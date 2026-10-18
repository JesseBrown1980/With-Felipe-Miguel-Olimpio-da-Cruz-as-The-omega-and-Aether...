You are resuming a research-to-architecture pass for Asolaria on `C:\Users\acer\Asolaria`.

Source-of-truth order:

1. `C:\Users\acer\Asolaria\AGENTS.md`
2. `C:\Users\acer\Asolaria\reports\graph-runtime-research-review-20260307.md`
3. local repo state in `C:\Users\acer\Asolaria`
4. local repo state in `C:\Users\acer\ai_healthcare_project`

Mission:

Turn Asolaria into a graph-native control plane the right way, without letting a learned model become the root of trust.

Hard constraints:

- Asolaria remains the control plane.
- Policy/approval/audit remain primary.
- qdd stays Slack-only.
- csi and emergencetek stay removed.
- Do not scrape passwords, browser secrets, or Windows credential stores.
- Do not close user Chrome windows unless explicitly told.
- Do not revert unrelated user changes.
- Personal and company domains must remain explicitly separated.
- Numeric MCP/tool IDs must be treated as versioned contracts, not ad hoc shortcuts.
- "Stealth" must be treated as silent/headless telemetry mode, not covert unrestricted actuation.

Your job:

1. Inspect current code and identify the exact minimum-change path to emit canonical graph events from:
   - `src/taskLedgerStore.js`
   - `src/brainOrchestrator.js`
   - gateway approval/audit surfaces
   - phone/voice/meeting routes in `server.js`

2. Design the first safe implementation slice:
   - canonical event schema
   - canonical action manifest schema
   - deterministic edge-risk scoring
   - no GNN inference in the critical path yet

3. Reuse only the useful parts of `C:\Users\acer\ai_healthcare_project`:
   - anomaly detector service/api/config/schema patterns
   - not patient/FHIR-specific orchestration

4. Produce:
   - findings first
   - a staged implementation plan
   - exact files to edit
   - tests to add
   - explicit rollback strategy

Required behavior:

- Validate local code before claiming anything.
- Prefer small, reversible changes.
- Do not start with model training.
- Do not make a learned model the policy decider.
- If you edit files, preserve existing runtime behavior and keep the first slice additive.

Desired output structure:

1. Findings
2. Recommended first slice
3. Files to change
4. Tests
5. Risks / rollback
