# Symphony Helper Surfaces

This file tells Symphony issue workspaces how to use Asolaria helper surfaces without confusing them with the main coding lane.

## Working Rule

Use helper surfaces to support the issue. Do not let them replace local verification, local edits, or Asolaria's policy boundary.

## Helper Map

### Abacus

Use `Abacus` for:

- sanitized external research
- bounded browser tasks
- bounded orchestration or workflow-studio style exploration
- constrained side quests that should come back through Asolaria as packets

Do not use `Abacus` for:

- owner-plane secrets
- broad repo authority
- direct ground-truth claims without importing results back into Asolaria

Fast checks:

- `GET http://127.0.0.1:4781/api/integrations/abacus/status`
- `GET http://127.0.0.1:4781/api/integrations/abacus/strategy`
- `GET http://127.0.0.1:4781/api/integrations/abacus/packets?limit=20`

### Augment / Auggie

Use `Augment/Auggie` only as a read-only codebase retrieval sidecar.

It is for:

- finding code quickly
- retrieval over large trees
- context lookups that help local reasoning

It is not for:

- writes
- approval bypass
- becoming a second controller

Fast checks:

- `GET http://127.0.0.1:4781/api/integrations/augment-context/status`
- reference doc: `docs/AUGMENT_CONTEXT_SIDECAR.md`

### Gemini

Use `Gemini` as a sidecar when a local text or audio support lane is helpful.

It is good for:

- side summaries
- alternate phrasing
- voice/audio support
- quick multimodal or live-text assistance when configured locally

It does not replace:

- local repo validation
- source-of-truth implementation decisions

Fast checks:

- `GET http://127.0.0.1:4781/api/integrations/gemini_api/status`
- `GET http://127.0.0.1:4781/api/integrations/gemini_live/status`

### Phone

Use the phone lane only for:

- mobile verification
- approval/control checks
- route validation
- confirming whether the user-facing phone path is actually healthy

Treat the phone as degraded if:

- latest smoke is red
- local control routes are failing
- reverse state is unstable

Fast checks:

- `GET http://127.0.0.1:4781/api/health/fast`
- `reports/phone-tunnel-smoke-latest.md`
- `PHONE-URLS.md`

## Recommended Order

1. Do the local repo work first.
2. Check `docs/SYMPHONY_HELPERS_LIVE.md` for the current helper health snapshot.
3. Use `Abacus` only when the task is sanitized and actually benefits from an external surface.
4. Use `Augment/Auggie` only for retrieval.
5. Use `Gemini` only as a sidecar.
6. Use the phone lane only when the current live note says it is healthy enough for evidence.

## Required Handoff Note

If you use or skip a helper surface, say so explicitly in the issue workpad or handoff:

- helper used
- reason
- evidence produced
- blocker if unavailable
