# HG256 Cycle And Cron Wiring

```text
GLYPH256: {TRANCHE=Q6_Q8_CYCLES_AND_CRONS_V1}{STATE=LOCAL_ONLY}{PROMOTION=DENY_UNTIL_PROOFS}
```

## Scope

- gateway heartbeat runs
- gateway cron executions
- cycle status surface
- append-only hook summaries for route-hook events

## Runtime Routes

- gateway daemon:
  - `GET /health`
  - `GET /cycles`
  - `POST /heartbeat/run`
  - `GET /cron`
- app wrapper:
  - `GET /api/gateway/cycles`
  - `POST /api/gateway/heartbeat/run`
  - `GET /api/gateway/cron`
  - `POST /api/gateway/cron/run`
- hook query:
  - `GET /api/hooks/route-hooks`
  - `GET /api/hooks/route-hooks/summary`

## Required Labels

- `LOCAL_ONLY`
- `TRANSPORT=NO_REMOTE`
- `RELEASE=DENY_UNTIL_PROOFS`
- `PROMOTION=DENY_UNTIL_PROOFS`
- `NO_SILENT_SCHEDULES`
- `APPEND_ONLY_ONLY`

## Required Evidence

- `trancheId`
- `qId`
- `route`
- `routeStage`
- `packetSha256`
- `payloadSha256`
- `denyFlags`
- `skippedChecks`
- `scheduledTs`
- `startedTs`
- `completedTs`
- `verificationTs`
- `nextRunAt`

## Boundary Rules

- no raw token, hostname, port, local path, or command-line leak on non-loopback summaries
- skipped checks stay visible
- cache or success state never implies verified freshness by itself
