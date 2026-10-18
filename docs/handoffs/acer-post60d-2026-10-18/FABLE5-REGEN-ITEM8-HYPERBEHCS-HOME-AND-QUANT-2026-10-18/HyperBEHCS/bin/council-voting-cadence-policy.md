# Council Voting Cadence Policy

PID: AGT-helm-claude-orch-F-H02E5-V43-WAVE306-P00-NORCHF001 (spec 18)
Anchor: ASOLARIA-V43-WAVE-306-PIPELINE-TRACE-PID-2026-05-23
Law anchor: ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23
Daemon: asolaria-vote-quorum-daemon on :4952
Operator authority: OP-JESSE apex (Foundation v3 LAW window through 2026-09-23)

## 1. Problem statement

V42-A2 stress wave fired 21 stress-votes into the vote-quorum queue. Probe of
`GET /api/vote-quorum/pending` at 2026-05-24T00:54Z showed:

- `queue.ndjson` rows: 24 total
- `outcomes.ndjson` resolved: 49 (multiple decision passes per stress entry due to
  retry/duplicate emissions; outcomes are append-only)
- Currently still PENDING (live API): 3 votes, all from the V42-A2 stress run, all
  aged ~0.86 hours at probe time

Pending-vote breakdown (live API):

| vote_id (short)    | decision_class | rule             | tally (Y/N/A) | age_h |
|--------------------|----------------|------------------|---------------|-------|
| VOTE-b646d0d6b78ee | CP_MINT        | unanimous-5      | 4/0/0         | 0.86  |
| VOTE-08cc2391f388c | DAEMON_OP      | simple-majority  | 0/0/5         | 0.86  |
| VOTE-6a1b7c51e08ae | MEMORY_WRITE   | simple-majority  | 2/0/2         | 0.86  |

Each pending vote has a distinct stall-class:

1. **CP_MINT unanimous-5 stall**: 4 YES from quintuple but 1 voter never cast.
   Rule requires ALL 5 quintuple voters to YES (Jesse, Rayssa, Amy, Dan, Felipe).
   Currently structurally PENDING forever until 5th vote arrives.
2. **DAEMON_OP all-abstain stall**: 5 abstains, 0 decisive votes. Rule requires
   `total_decisive >= 3 AND yes > total/2`. With total=0 always-pending.
3. **MEMORY_WRITE tied-abstain stall**: 2 YES + 2 abstain = total_decisive=2 (below
   threshold of 3). Always-pending until a 3rd decisive vote arrives.

## 2. Cadence policy (proposed)

The current daemon (`asolaria-vote-quorum-daemon.py`) is purely reactive: it only
evaluates quorum when `/api/vote-quorum/cast` is hit. There is no time-based
sweep, so PENDING votes accumulate indefinitely. Proposed policy adds a
**T+24h auto-pass sweep** for simple-majority decisions ONLY.

### 2.1 Decision-class TTL matrix

| decision_class  | rule              | TTL    | T+TTL action                                | rationale |
|-----------------|-------------------|--------|---------------------------------------------|-----------|
| LAW_CHANGE      | unanimous-5       | 7d     | escalate to OP-JESSE apex (no auto-pass)    | constitutional, never auto |
| CP_MINT         | unanimous-5       | 7d     | escalate to OP-JESSE apex (no auto-pass)    | apex mint, never auto |
| USB_WRITE       | supermajority-2/3 | 72h    | auto-REJECT if no operator-witness          | substrate, conservative |
| DAEMON_OP       | simple-majority   | 24h    | auto-PASS if yes>=1 AND no==0; else auto-REJECT | low-risk, common |
| MEMORY_WRITE    | simple-majority   | 24h    | auto-PASS if yes>=1 AND no==0; else auto-REJECT | low-risk, frequent |
| COSIGN_APPEND   | simple-majority   | 24h    | auto-PASS if yes>=1 AND no==0; else auto-REJECT | append-only, reversible by next row |
| GHOST_GC        | simple-majority   | 24h    | auto-PASS if yes>=1 AND no==0; else auto-REJECT | reclaim, idempotent |
| HEARTBEAT_ACK   | auto-pass         | n/a    | (already auto)                              | low-risk |
| DEFAULT         | simple-majority   | 24h    | auto-PASS if yes>=1 AND no==0; else auto-REJECT | catch-all |

Key invariants:

- **NEVER** auto-pass `LAW_CHANGE` or `CP_MINT`. These remain structurally
  pending until quintuple completes OR OP-JESSE explicitly escalates.
- Auto-PASS requires `yes >= 1 AND no == 0`. All-abstain stalls auto-REJECT
  at TTL (refused due to "no decisive support" — distinct from "rejected on merit").
- Tie-abstain pattern (yes=N, no=0, abstain=N) at TTL: auto-PASS, since at
  least 1 decisive YES exists.

### 2.2 Sweep daemon design

Two implementation options:

**Option A (preferred)**: extend `asolaria-vote-quorum-daemon.py` with a
background thread that scans the queue every 5 min, evaluates each PENDING
vote, and if age > TTL, appends a synthetic cosign-cast row from
`"AGT-cadence-sweeper"` with `vote=NO_DECISION_TIMEOUT` plus an outcome row to
`outcomes.ndjson`. Endpoint `POST /api/vote-quorum/sweep` triggers manual sweep.

**Option B**: separate `asolaria-vote-cadence-sweeper.py` daemon on :4954 that
polls `/api/vote-quorum/pending` and posts auto-cast / auto-outcome rows back
through the canonical daemon. Keeps single-writer discipline.

Recommend **Option A** for code simplicity (in-process, no IPC race), with the
guard that the sweep code path is ONLY invoked by the sweeper thread or by the
explicit sweep endpoint — never inside the normal cast path.

### 2.3 Cadence cycle

- Sweep interval: **5 min** (300 s)
- TTL grace period: votes within the last 30 s are skipped (eventual-consistency window)
- Sweep emits a `sweep-batch` cosign row summarizing total scanned, count
  auto-resolved, count remaining

### 2.4 Action on the 3 currently-pending V42-A2 stress votes

Applied to current state (probed 2026-05-24T00:54Z, all age 0.86h):

| vote                | TTL  | T+TTL action when reached | currently |
|---------------------|------|---------------------------|-----------|
| VOTE-b646d0d6b78ee (CP_MINT)      | 7d   | escalate to OP-JESSE   | wait (only ~21h elapsed of 7d window) |
| VOTE-08cc2391f388c (DAEMON_OP)    | 24h  | auto-REJECT (5 abstain, 0 decisive) | will auto-reject at ~2026-05-25T00:03Z |
| VOTE-6a1b7c51e08ae (MEMORY_WRITE) | 24h  | auto-PASS (2 YES, 0 NO, decisive support) | will auto-pass at ~2026-05-25T00:03Z |

Recommendation: implement the sweeper before T+24h (i.e. before 2026-05-25T00:03Z)
to resolve the latter two automatically and reduce manual triage load. The
CP_MINT vote should NOT be auto-resolved — request 5th quintuple cast from
OP-RAYSSA / OP-AMY / OP-DAN / OP-FELIPE (whichever did not cast) directly.

## 3. Anti-patterns this policy prevents

- **Stress-test ghosts**: bench-firing decisions accumulating in queue and
  blocking real council ops by drowning the pending UI in noise
- **All-abstain perma-stall**: votes where every voter chose ABSTAIN never
  reaching outcome because `total_decisive` never crosses threshold
- **Single-laggard veto-by-omission**: one quintuple member never casting on a
  simple-majority decision shouldn't block work indefinitely
- **Silent-fail outcome**: per `feedback_fabric_silent_emit_failure_class_1_2026_05_23`
  this policy ensures every queued vote eventually produces an `outcomes.ndjson`
  row even when no humans interact

## 4. Implementation checklist (for follow-on agent)

- [ ] Add `SWEEP_INTERVAL_S = 300`, `TTL_MATRIX` constant to vote-quorum daemon
- [ ] Add `def cadence_sweep()` function (scan queue, eval TTL, emit auto-rows)
- [ ] Spawn `threading.Thread(target=sweep_loop, daemon=True)` in `main()`
- [ ] Add endpoint `POST /api/vote-quorum/sweep` (manual trigger, idempotent)
- [ ] Add endpoint `GET /api/vote-quorum/cadence-status` (last sweep ts, counts)
- [ ] Submit a single MEMORY_WRITE vote to the daemon describing this very
  policy change before deploying (eat-own-dog-food)
- [ ] Cosign-append the policy adoption row at row_hash >= current head

## 5. Cosign anchor for this policy doc

- spec: 18 (council-voting-cadence-tuner)
- tool: wave-306 orchestrator F
- emitted to: cosign-chain daemon :4953 via final summary append
- policy_status: PROPOSED (requires MEMORY_WRITE vote before activation)
