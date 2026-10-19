# Asolaria three-seat coordination ledger

**Current operator statement:** three agents are working concurrently. This repository presently does **not** authenticate which GitHub commit came from which current agent. Older commits by author `acer` establish a historical label, not present-day seat ownership. Recent writes under `JesseBrown1980` may represent multiple assistants or sessions.

## Seat roster

| Seat | Active alias | Current ownership proof | Next check-in |
|---|---|---|---|
| seat-1 | Not assigned | Pending | `tracking/checkins/seat-1/<timestamp>.hbp` |
| seat-2 | Not assigned | Pending | `tracking/checkins/seat-2/<timestamp>.hbp` |
| seat-3 | Not assigned | Pending | `tracking/checkins/seat-3/<timestamp>.hbp` |

Historical Asolaria names `acer`, `liris`, and `third-seat` are **possible reference labels only**. Do not claim that any named agent is presently executing without a current signed/checkable receipt.

## Rules for parallel operation

1. **Identify:** use a distinct branch `agent/seat-1/<topic>`, `agent/seat-2/<topic>`, or `agent/seat-3/<topic>`; add the trailer `Asolaria-Seat: seat-X` to commits or write a uniquely named check-in.
2. **Measure:** every run records immutable source commit SHA, source content SHA-256, input parameters, host/runtime and clock type, test count, exact pass/fail assertion, output SHA-256, and limitations.
3. **Deposit first:** create-only HBP and HBI stones with sidecar checksums. A negative or inconsistent result is also published as a new correction, not silently revised.
4. **Reproduce:** independently execute tests on a different runner where possible, and attach CI run URL and conclusion. A successful workflow where upload steps were skipped is **not** a successful upload.
5. **Coordinate:** add a check-in for what changed, branch/commit URL, blockers, proposed next step, and the last seen parent stone. Do not modify another agent's recorded stone.
6. **Conflict rule:** distinguish simultaneous edits to a shared logical root from propagation by SHA dependency. Neither hash avalanche nor a GitHub fanout proves physical transport or distance.

## Activity collector

`tools/collect_three_seat_activity.py` reads only public GitHub repository metadata. `.github/workflows/three-seat-activity.yml` schedules hourly snapshots and accepts manual dispatch.

- Public sources: explicit repositories in [seat-registry.json](seat-registry.json).
- Capture recent commits, branch heads, PRs and workflow runs; compare to last snapshot.
- Attribute to seat only on an **explicit** `Asolaria-Seat: seat-N` commit trailer or `agent/seat-N/` branch. Otherwise label `unassigned`.
- Snapshot and checksum live in `tracking/snapshots/`; latest snapshot in `tracking/latest.json`, with UTC capture and source URLs.
- A watch job and a manual three-seat check-in serve different functions: a GitHub activity snapshot does not establish that three processes are currently running.

## Current verified baseline

- [Stone 1: nine mutation waves](../stones/2026-10-14-rainbow81/stone-hash-81-2026-10-14-baseline.hbp)
- [Stone 2: 27 spatial / hash waves](../stones/2026-10-14-rainbow81/stone-81-spatial-hash-27-waves-2026-10-14.hbp)
- [Stone 3: independent 27-wave CI](../stones/2026-10-14-rainbow81/stone-81-spatial-hash-27-waves-CI-2026-10-14.hbp)
- [Consolidated results and limitations](../stones/2026-10-14-rainbow81/RESULTS-INDEX.md)

All activity here is software provenance, not measurement of long-distance physical forces.
