"""V42-A2 Vote-Quorum Stress Test
PID: AGT-vector-vote-quorum-stress-H02D1-V42A2-P00-NVQSTRSS01
Anchor: ASOLARIA-V42A2-VOTE-QUORUM-STRESS-PID-2026-05-23

Submits 20 decisions across all 8 decision classes + casts 5-8 votes/decision
with varied YES/NO/ABSTAIN from authorized + edge-case pool, observes outcomes,
computes stats, emits a 50D descriptor + cosign row.
"""
import json, time, urllib.request, hashlib, random
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict, Counter

BASE = "http://127.0.0.1:4952"
ANCHOR = "ASOLARIA-V42A2-VOTE-QUORUM-STRESS-PID-2026-05-23"
STRESS_PID = "AGT-vector-vote-quorum-stress-H02D1-V42A2-P00-NVQSTRSS01"

QUINT = ["OP-JESSE", "OP-RAYSSA", "OP-AMY", "OP-DAN", "OP-FELIPE"]
SPECIALS = ["AGT-Special-OP-stress-001", "AGT-Special-OP-stress-002", "AGT-OP-stress-003"]
ALL_VOTERS = QUINT + SPECIALS

random.seed(42)  # deterministic

def post(path, body):
  data = json.dumps(body).encode("utf-8")
  req = urllib.request.Request(f"{BASE}{path}", data=data,
                               headers={"Content-Type": "application/json"})
  with urllib.request.urlopen(req, timeout=10) as r:
    return json.loads(r.read())

def get(path):
  with urllib.request.urlopen(f"{BASE}{path}", timeout=10) as r:
    return json.loads(r.read())

# 20 decisions per class breakdown
DECISIONS = (
  [("LAW_CHANGE", f"V42A2-LAW-CHANGE-{i:02d}") for i in range(1, 3)] +
  [("CP_MINT", f"V42A2-CP-MINT-{i:02d}") for i in range(1, 3)] +
  [("USB_WRITE", f"V42A2-USB-WRITE-{i:02d}") for i in range(1, 3)] +
  [("DAEMON_OP", f"V42A2-DAEMON-OP-{i:02d}") for i in range(1, 5)] +
  [("MEMORY_WRITE", f"V42A2-MEMORY-WRITE-{i:02d}") for i in range(1, 5)] +
  [("COSIGN_APPEND", f"V42A2-COSIGN-APPEND-{i:02d}") for i in range(1, 3)] +
  [("GHOST_GC", f"V42A2-GHOST-GC-{i:02d}") for i in range(1, 3)] +
  [("HEARTBEAT_ACK", f"V42A2-HEARTBEAT-ACK-{i:02d}") for i in range(1, 3)]
)
assert len(DECISIONS) == 20, f"want 20 got {len(DECISIONS)}"

def voting_profile(dclass, idx):
  """Return (voters, votes) list of (voter_pid, vote) — varied YES/NO/ABSTAIN."""
  # 5-8 voters
  n = random.randint(5, 8)
  pool = ALL_VOTERS.copy(); random.shuffle(pool)
  voters = pool[:n]
  votes = []
  # Decision-class-specific voting patterns to exercise rules:
  if dclass == "LAW_CHANGE":
    # idx=1: all 5 quintuple YES + extras YES (should PASS-UNANIMOUS if all 5 present)
    # idx=2: 4 quintuple YES + 1 NO (should REJECT)
    if idx == 1:
      # force all 5 quintuple in
      voters = QUINT + SPECIALS[:2]
      votes = [(v, "YES") for v in voters]
    else:
      voters = QUINT + SPECIALS[:1]
      votes = [(v, "YES") for v in voters[:4]] + [(voters[4], "NO")] + [(voters[5], "YES")]
  elif dclass == "CP_MINT":
    if idx == 1:
      voters = QUINT + [SPECIALS[0]]
      votes = [(v, "YES") for v in voters]
    else:
      # only 4 quintuple voted (Felipe absent) → PENDING (incomplete)
      voters = QUINT[:4] + SPECIALS
      votes = [(v, "YES") for v in voters]
  elif dclass == "USB_WRITE":
    if idx == 1:
      # 5 YES 0 NO → PASS-SUPERMAJORITY
      votes = [(v, "YES") for v in voters[:5]]
      voters = voters[:5]
    else:
      # 3 YES 3 NO → REJECT (no > total/3)
      voters = voters[:6]
      votes = [(v, "YES") for v in voters[:3]] + [(v, "NO") for v in voters[3:6]]
  elif dclass == "DAEMON_OP":
    patterns = [
      lambda vs: [(v, "YES") for v in vs],                                      # all-YES
      lambda vs: [(vs[0], "YES"), (vs[1], "NO"), (vs[2], "YES"), (vs[3], "ABSTAIN"), (vs[4], "YES")],  # mixed pass
      lambda vs: [(v, "NO") for v in vs],                                       # all-NO → REJECT
      lambda vs: [(v, "ABSTAIN") for v in vs],                                  # all-ABSTAIN → PENDING
    ]
    voters = voters[:5]
    votes = patterns[idx-1](voters)
  elif dclass == "MEMORY_WRITE":
    patterns = [
      lambda vs: [(v, "YES") for v in vs],
      lambda vs: [(vs[0], "YES"), (vs[1], "YES"), (vs[2], "NO"), (vs[3], "ABSTAIN")],   # 2-1-1 PASS
      lambda vs: [(vs[0], "NO"), (vs[1], "NO"), (vs[2], "YES"), (vs[3], "YES")],         # 2-2 REJECT (no >= total/2)
      lambda vs: [(vs[0], "ABSTAIN"), (vs[1], "ABSTAIN"), (vs[2], "YES"), (vs[3], "YES")], # PENDING (total<3)
    ]
    voters = voters[:4]
    votes = patterns[idx-1](voters)
  elif dclass == "COSIGN_APPEND":
    if idx == 1:
      votes = [(v, "YES") for v in voters[:5]]
      voters = voters[:5]
    else:
      voters = voters[:5]
      votes = [(voters[0], "NO"), (voters[1], "NO"), (voters[2], "NO"),
               (voters[3], "YES"), (voters[4], "YES")]
  elif dclass == "GHOST_GC":
    if idx == 1:
      votes = [(v, "YES") for v in voters[:4]]
      voters = voters[:4]
    else:
      voters = voters[:5]
      votes = [(voters[0], "YES"), (voters[1], "YES"), (voters[2], "YES"),
               (voters[3], "ABSTAIN"), (voters[4], "ABSTAIN")]
  elif dclass == "HEARTBEAT_ACK":
    # auto-pass after first vote
    voters = voters[:3]
    votes = [(v, "YES") for v in voters]
  return votes

def main():
  print(f"[v42a2] starting stress — daemon={BASE} anchor={ANCHOR}")
  t0 = time.time()

  # snapshot pre-state for fresh-row accounting
  data_dir = Path("C:/HyperBEHCS/data/vote-quorum")
  pre_outcomes = len(data_dir.joinpath("outcomes.ndjson").read_text(encoding="utf-8").splitlines()) if data_dir.joinpath("outcomes.ndjson").exists() else 0
  pre_votes    = len(data_dir.joinpath("votes.ndjson").read_text(encoding="utf-8").splitlines())    if data_dir.joinpath("votes.ndjson").exists() else 0
  pre_queue    = len(data_dir.joinpath("queue.ndjson").read_text(encoding="utf-8").splitlines())    if data_dir.joinpath("queue.ndjson").exists() else 0

  results = []  # one per decision: { dclass, vote_id, rule, final_status, t_submit, t_quorum, n_votes, votes:[…] }

  for idx_in_class, (dclass, dpid_base) in enumerate(DECISIONS):
    # idx within class is 1-based
    # compute idx-within-class robustly
    pass

  # rebuild idx-within-class via Counter
  idx_in_class_map = {}
  ctr = Counter()
  for dclass, dpid in DECISIONS:
    ctr[dclass] += 1
    idx_in_class_map[dpid] = ctr[dclass]

  for dclass, dpid in DECISIONS:
    idx = idx_in_class_map[dpid]
    t_sub = time.time()
    sub = post("/api/vote-quorum/submit", {
      "decision_class": dclass,
      "decision_pid": dpid,
      "payload": {"stress": True, "wave": "V42-A2", "idx": idx,
                  "anchor_pid": ANCHOR},
      "requester_pid": STRESS_PID,
    })
    vote_id = sub["vote_id"]
    rule = sub.get("rule", {})
    votes = voting_profile(dclass, idx)

    cast_results = []
    final_status = {"outcome": "PENDING"}
    t_quorum = None
    for voter, vote in votes:
      try:
        r = post("/api/vote-quorum/cast", {
          "vote_id": vote_id, "voter_pid": voter, "vote": vote,
          "reason": f"v42a2-stress-{dclass}-{idx}"})
        cast_results.append({"voter": voter, "vote": vote,
                             "authorized": r.get("cast", {}).get("authorized"),
                             "outcome_after": r.get("status", {}).get("outcome")})
        final_status = r.get("status", final_status)
        if final_status.get("outcome") not in ("PENDING",) and t_quorum is None:
          t_quorum = time.time() - t_sub
      except Exception as e:
        cast_results.append({"voter": voter, "vote": vote, "error": str(e)})

    results.append({
      "decision_class": dclass,
      "decision_pid": dpid,
      "vote_id": vote_id,
      "rule": rule.get("rule"),
      "pool": rule.get("pool"),
      "final_outcome": final_status.get("outcome"),
      "tally": {k: final_status.get(k) for k in ("yes","no","abstain","total_decisive")},
      "n_voters": len(votes),
      "t_submit_to_resolution_sec": round(t_quorum, 4) if t_quorum is not None else None,
      "cast_results": cast_results,
    })

  t_total = time.time() - t0
  print(f"[v42a2] all 20 decisions cast in {t_total:.2f}s")

  # post-snapshot
  post_outcomes = len(data_dir.joinpath("outcomes.ndjson").read_text(encoding="utf-8").splitlines())
  post_votes    = len(data_dir.joinpath("votes.ndjson").read_text(encoding="utf-8").splitlines())
  post_queue    = len(data_dir.joinpath("queue.ndjson").read_text(encoding="utf-8").splitlines())

  # === STATS ===
  by_class = defaultdict(lambda: Counter())
  rule_outcome_class = defaultdict(lambda: Counter())
  reject_rate = defaultdict(lambda: [0, 0])  # [reject, total]
  times = []
  unauthorized_attempts = []
  for r in results:
    by_class[r["decision_class"]][r["final_outcome"]] += 1
    rule_outcome_class[(r["decision_class"], r["rule"])][r["final_outcome"]] += 1
    reject_rate[r["decision_class"]][1] += 1
    if r["final_outcome"] == "REJECT":
      reject_rate[r["decision_class"]][0] += 1
    if r["t_submit_to_resolution_sec"] is not None:
      times.append(r["t_submit_to_resolution_sec"])
    for c in r["cast_results"]:
      if c.get("authorized") is False:
        unauthorized_attempts.append({"vote_id": r["vote_id"], "voter": c["voter"]})

  avg_time = round(sum(times) / max(1, len(times)), 4)
  reject_rate_pct = {k: round(v[0] / max(1, v[1]) * 100, 1) for k, v in reject_rate.items()}
  highest_reject_class = max(reject_rate_pct.items(), key=lambda kv: kv[1], default=("NONE", 0))

  # Rules that NEVER reach quorum (PENDING) or always reject across our stress:
  never_quorum = []
  always_reject = []
  for (cls, rule), outs in rule_outcome_class.items():
    total = sum(outs.values())
    pending = outs.get("PENDING", 0)
    rejects = outs.get("REJECT", 0)
    if pending == total and total > 0:
      never_quorum.append(f"{cls}/{rule}")
    if rejects == total and total > 0:
      always_reject.append(f"{cls}/{rule}")

  summary = {
    "wave": "V42-A2",
    "pid": STRESS_PID,
    "anchor_pid": ANCHOR,
    "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")[:23]+"Z",
    "daemon_endpoint": BASE,
    "n_decisions_submitted": 20,
    "n_quorum_rules_exercised": 8,
    "duration_sec": round(t_total, 2),
    "ledger_delta": {
      "queue_rows": post_queue - pre_queue,
      "votes_rows": post_votes - pre_votes,
      "outcomes_rows": post_outcomes - pre_outcomes,
    },
    "outcomes_by_class": {k: dict(v) for k, v in by_class.items()},
    "rule_outcome_matrix": {f"{k[0]}/{k[1]}": dict(v) for k, v in rule_outcome_class.items()},
    "reject_rate_pct_by_class": reject_rate_pct,
    "highest_reject_rate_class": {"class": highest_reject_class[0], "pct": highest_reject_class[1]},
    "avg_time_to_quorum_sec": avg_time,
    "rules_never_reach_quorum_in_test": never_quorum,
    "rules_always_reject_in_test": always_reject,
    "unauthorized_vote_attempts": unauthorized_attempts,
    "n_unauthorized_attempts": len(unauthorized_attempts),
  }

  return summary, results

if __name__ == "__main__":
  summary, results = main()
  out = Path("C:/HyperBEHCS/store/library-50d-descriptors/v42-vote-quorum-stress.run.json")
  out.write_text(json.dumps({"summary": summary, "results": results}, indent=2), encoding="utf-8")
  print(json.dumps(summary, indent=2))
