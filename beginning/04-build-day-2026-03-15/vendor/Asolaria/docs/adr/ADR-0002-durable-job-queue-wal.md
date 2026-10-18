# ADR-0002: Durable Job Queue with WAL

## Status
Accepted (implemented 2026-03-15)

## Context
src/jobQueue.js was 3KB of pure in-memory queue with no persistence. On crash or restart, all queued and running jobs were silently lost. No retry logic existed. No evidence trail for job execution.

## Decision
Upgrade jobQueue.js to append job lifecycle events to an NDJSON write-ahead log at data/job-queue-wal.ndjson. Add:
- Crash recovery: replay WAL on boot, mark orphaned in-flight jobs
- Retry with exponential backoff (default 3 retries, 2s base, 60s max)
- Dead-letter lane at data/job-queue-dead-letter.ndjson for permanently failed jobs
- Graph runtime event emission on all job state transitions
- Graceful drain function for shutdown

Preserve the existing enqueue/getJob/listJobs/stats API contract. The `enqueue` function now accepts an optional 4th `options` parameter for `maxRetries`, `backoffMs`, and `owner`.

## Consequences
- Positive: jobs survive crash, retry automatically, dead letters are inspectable, graph sees job events
- Negative: WAL file grows over time (needs periodic compaction), runner functions are not serializable so recovered jobs need re-registration
- Risk: WAL corruption could prevent recovery (mitigated by line-by-line NDJSON parsing)

## Rollback
Replace src/jobQueue.js with the previous 141-line in-memory version. Delete data/job-queue-wal.ndjson.

## Evidence
- Kill -9 the server, restart, verify recovered job count > 0
- Enqueue a job that throws, verify retry count increments
- After max retries, verify dead-letter entry exists
- Verify graph-runtime-events.ndjson contains job.* events
