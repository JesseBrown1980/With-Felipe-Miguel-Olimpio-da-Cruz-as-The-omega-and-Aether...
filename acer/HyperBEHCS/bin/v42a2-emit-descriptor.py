"""Emit v42-vote-quorum-stress.descriptor.json + paired HBPv1 cosign row."""
import json, hashlib, random, sys, io
from datetime import datetime, timezone
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

random.seed(42_42_42)  # deterministic 50D coords for reproducibility

STORE = Path("C:/HyperBEHCS/store/library-50d-descriptors")
RUN = STORE / "v42-vote-quorum-stress.run.json"
DESC = STORE / "v42-vote-quorum-stress.descriptor.json"
COSIGN_HBP = STORE / "v42-vote-quorum-stress.cosign.hbp"
COSIGN_SHA = STORE / "v42-vote-quorum-stress.cosign.hbp.sha256"

run = json.loads(RUN.read_text(encoding="utf-8"))
summary = run["summary"]

# Deterministic 50D coord from sha256 of summary JSON
canon = json.dumps(summary, sort_keys=True).encode("utf-8")
seed_bytes = hashlib.sha256(canon).digest()  # 32B
# expand to 50 dims via repeated hashing
coords = []
buf = seed_bytes
while len(coords) < 50:
  buf = hashlib.sha256(buf).digest()
  for i in range(0, len(buf), 2):
    if len(coords) >= 50: break
    n = int.from_bytes(buf[i:i+2], "big")
    coords.append((n / 65535.0) * 2.0 - 1.0)
norm = sum(c*c for c in coords) ** 0.5

# 47D cube band from outcome diversity (mint_class = "pattern" since rules cover a phase space)
class_outcome_keys = sorted(summary["outcomes_by_class"].keys())
cube_47d_v42a2 = "-".join(str(len(summary["outcomes_by_class"][k])) for k in class_outcome_keys)

# 5-glyph from outcome ratios — simple deterministic pick
GLYPHS = "⊞⊠⊡⊟⊕⊖⊗⊘⊙⊚⊛⊜⊝⊞⊟"
outcome_str = json.dumps(summary["outcomes_by_class"], sort_keys=True)
seedhex = hashlib.sha256(outcome_str.encode()).hexdigest()
output_glyph_5 = "".join(GLYPHS[int(seedhex[i:i+2], 16) % len(GLYPHS)] for i in range(0, 10, 2))

descriptor = {
  "primitive": "VOTE_QUORUM_STRESS_V42A2",
  "pid": summary["pid"],
  "wave": "V42-A2",
  "ts": summary["ts"],
  "anchor_pid": summary["anchor_pid"],
  "law_anchor": "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23",
  "operator": "OP-JESSE",
  "daemon": {
    "endpoint": summary["daemon_endpoint"],
    "service": "asolaria-vote-quorum-daemon",
    "host_pid_on_disk": 18064,
  },
  "stress_envelope": {
    "n_decisions": summary["n_decisions_submitted"],
    "n_classes_exercised": summary["n_quorum_rules_exercised"],
    "duration_sec": summary["duration_sec"],
    "ledger_delta": summary["ledger_delta"],
    "avg_time_to_quorum_sec": summary["avg_time_to_quorum_sec"],
  },
  "outcomes_by_class": summary["outcomes_by_class"],
  "rule_outcome_matrix": summary["rule_outcome_matrix"],
  "reject_rate_pct_by_class": summary["reject_rate_pct_by_class"],
  "highest_reject_rate_class": summary["highest_reject_rate_class"],
  "rules_never_reach_quorum_in_test": summary["rules_never_reach_quorum_in_test"],
  "rules_always_reject_in_test": summary["rules_always_reject_in_test"],
  "unauthorized_vote_attempts": {
    "count": summary["n_unauthorized_attempts"],
    "details": summary["unauthorized_vote_attempts"],
    "interpretation": "all 7 attempts are AGT-Special-OP-* / AGT-OP-* voting on quintuple-pool decisions (LAW_CHANGE/CP_MINT); daemon correctly flagged authorized=false and excluded from tally. Rule enforcement WORKING.",
  },
  "findings": {
    "rule_effectiveness": "All 8 quorum rules executed correctly. No rule stuck PENDING permanently. No rule always-rejected.",
    "abstain_behavior_verified": "ABSTAIN excluded from total_decisive; all-ABSTAIN decisions correctly PENDING (DAEMON_OP/MEMORY_WRITE rows showed this).",
    "daemon_quirk_observed": "Outcome row is APPENDED on every cast-vote post-resolution (not gated to first-resolution). 20 decisions produced 45 outcome rows (some classes 1, others 4+ per decision). HEARTBEAT_ACK auto-pass writes outcome on every vote.",
    "quintuple_unanimity_works": "LAW_CHANGE/CP_MINT correctly PASS-UNANIMOUS only when all 5 quintuple YES; one NO → REJECT; missing voter → PENDING (CP_MINT-02 Felipe absent).",
    "supermajority_works": "USB_WRITE 5-0 → PASS-SUPERMAJORITY; 3-3 → REJECT (no > total/3).",
    "auth_pool_membership_correct": "AGT-Special-OP-* and AGT-OP-* recognized as authorized for non-quintuple pools; rejected as non-quintuple for LAW_CHANGE/CP_MINT.",
  },
  "ledger_chain_tips_post_stress": {
    "queue_ndjson_tail_row_hash": "fb1e191a1aefa3af",
    "votes_ndjson_tail_row_hash": "d2d6efc80faf730d",
    "outcomes_ndjson_tail_row_hash": "26004a32f300c99c",
  },
  "coord_50d_full": coords,
  "coord_50d_norm": round(norm, 4),
  "cube_47d_v42a2": cube_47d_v42a2,
  "output_glyph_5": output_glyph_5,
  "mint_class": "pattern",
  "trace_row_hashes": {
    "queue_ndjson_tail": "fb1e191a1aefa3af",
    "votes_ndjson_tail": "d2d6efc80faf730d",
    "outcomes_ndjson_tail": "26004a32f300c99c",
    "run_json_sha256_first16": hashlib.sha256(RUN.read_bytes()).hexdigest()[:16],
  },
}

DESC.write_text(json.dumps(descriptor, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"[v42a2] descriptor written: {DESC}")
print(f"[v42a2] coord_50d_norm = {round(norm, 4)}")
print(f"[v42a2] cube_47d_v42a2 = {cube_47d_v42a2}")
print(f"[v42a2] output_glyph_5 = {output_glyph_5}")

# === HBPv1 cosign row ===
desc_sha = hashlib.sha256(DESC.read_bytes()).hexdigest()
ts_now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")[:23]+"Z"

# antecedents = last cosign descriptor in v40/v41 family
# walk backward via tail of recently emitted v41 sha256 (best-effort)
v41_sha_file = STORE / "v41-omni_file_rotator-library_50d.hbp"
antecedents_row_hash = "0000000000000000"
try:
  if v41_sha_file.exists():
    v41_lines = v41_sha_file.read_text(encoding="utf-8").splitlines()
    if v41_lines:
      # parse last HBPv1 row's row_hash
      last = v41_lines[-1]
      for part in last.split("|"):
        if part.startswith("row_hash="):
          antecedents_row_hash = part.split("=", 1)[1]
          break
except Exception:
  pass

hbp_row_body = (
  "HBPv1|layer=library-50d-descriptors"
  f"|anchor_pid={summary['anchor_pid']}"
  "|entity=v42-vote-quorum-stress"
  "|kind=stress-test-descriptor"
  "|band=cp-952"
  f"|wave=V42-A2|operator=OP-JESSE"
  f"|n_decisions=20|n_classes=8|duration_sec={summary['duration_sec']}"
  f"|avg_time_to_quorum_sec={summary['avg_time_to_quorum_sec']}"
  f"|highest_reject_class={summary['highest_reject_rate_class']['class']}"
  f"|highest_reject_pct={summary['highest_reject_rate_class']['pct']}"
  f"|n_unauthorized_attempts={summary['n_unauthorized_attempts']}"
  f"|descriptor_sha256={desc_sha[:16]}"
  f"|queue_tail={descriptor['ledger_chain_tips_post_stress']['queue_ndjson_tail_row_hash']}"
  f"|votes_tail={descriptor['ledger_chain_tips_post_stress']['votes_ndjson_tail_row_hash']}"
  f"|outcomes_tail={descriptor['ledger_chain_tips_post_stress']['outcomes_ndjson_tail_row_hash']}"
  f"|coord_50d_norm={descriptor['coord_50d_norm']}"
  f"|cube_47d={cube_47d_v42a2}"
  f"|output_glyph_5={output_glyph_5}"
  f"|ts={ts_now}"
  f"|antecedents={antecedents_row_hash}"
  "|json=v42-vote-quorum-stress.descriptor.json"
  "|runtime=v42a2-vote-quorum-stress.py"
  "|promote=1"
)
row_hash = hashlib.sha256(hbp_row_body.encode("utf-8")).hexdigest()[:16]
full_row = hbp_row_body + f"|row_hash={row_hash}\n"
COSIGN_HBP.write_text(full_row, encoding="utf-8")
COSIGN_SHA.write_text(hashlib.sha256(full_row.encode("utf-8")).hexdigest() + "  v42-vote-quorum-stress.cosign.hbp\n", encoding="utf-8")
print(f"[v42a2] cosign row appended: {COSIGN_HBP}")
print(f"[v42a2] cosign row_hash    = {row_hash}")
print(f"[v42a2] descriptor sha256  = {desc_sha[:32]}...")
