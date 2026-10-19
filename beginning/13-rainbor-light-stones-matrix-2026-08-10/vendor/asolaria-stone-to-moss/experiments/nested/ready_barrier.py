#!/usr/bin/env python3
"""Read-only GitHub artifact-backed four-seat rendezvous.
No bearer token printed, stored in receipt, or sent outside GitHub.
Exactly one ready artifact per seat on this same workflow run.
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.request

SEATS = ("seat-1", "seat-2", "seat-3", "seat-4")
MARGIN_SECONDS = 45
MAX_WAIT_SECONDS = 240
EXPECTED = {"nested-ready-" + s for s in SEATS}

def epoch_ms(iso):
    return int(dt.datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000)

def main():
    assert len(sys.argv) == 2 and sys.argv[1] in SEATS
    seat = sys.argv[1]
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    run_id = os.environ.get("GITHUB_RUN_ID", "")
    assert token and "/" in repo and run_id.isdecimal(), "read-only GitHub Actions credential and run context required"
    url = "https://api.github.com/repos/" + repo + "/actions/runs/" + run_id + "/artifacts?per_page=100"
    limit = time.monotonic() + MAX_WAIT_SECONDS
    while time.monotonic() < limit:
        req = urllib.request.Request(url, headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "asolaria-nnest-readonly-barrier-v1"
        })
        try:
            with urllib.request.urlopen(req, timeout=15) as f:
                response = json.loads(f.read())
        except Exception as ex:
            # Network failure is never treated as evidence of readiness.
            print("BARRIER_RETRY seat=%s reason=%s"%(seat,type(ex).__name__),flush=True)
            time.sleep(3)
            continue
        ready = {a["name"]: a for a in response.get("artifacts", [])
                 if a["name"] in EXPECTED and not a.get("expired", False)}
        if set(ready) == EXPECTED:
            assert all(a.get("workflow_run",{}).get("id")==int(run_id)
                       for a in ready.values()), "cross-run ready artifact forbidden"
            cutoff = max(epoch_ms(a["created_at"]) for a in ready.values()) + MARGIN_SECONDS*1000
            now = time.time_ns() // 1_000_000
            if now > cutoff + 5000:
                raise RuntimeError("late participant: release time already passed, abort all-seat claim")
            remaining = cutoff-now
            if remaining > 0:
                time.sleep(remaining / 1000)
            released = time.time_ns() // 1_000_000
            if abs(released-cutoff)>5000:
                raise RuntimeError("release exceeded 5-second start tolerance")
            print("NEST_READY_BARRIER_PASS " + json.dumps({
                "seat": seat, "run_id": run_id, "ready_artifact_count": 4,
                "ready_artifact_ids": {k:ready[k]["id"] for k in sorted(ready)},
                "release_target_epoch_ms": cutoff,
                "actual_release_epoch_ms": released,
                "release_skew_ms": released-cutoff
            },sort_keys=True),flush=True)
            return
        time.sleep(2)
    raise TimeoutError("all four ready artifacts were not present within four minutes; fail closed")

if __name__=="__main__":
    main()
