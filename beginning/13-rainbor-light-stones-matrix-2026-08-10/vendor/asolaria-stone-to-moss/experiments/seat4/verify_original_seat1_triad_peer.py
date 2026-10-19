#!/usr/bin/env python3
"""Seat 4 peer auditor for original Seat 1 32,805-row public software trial.

Runs Seat1's original Python matrix, original Node polynomial, and separately
authored Seat4 cyclic polynomial solver. Distinguishes compact HBP metadata
from 6,392,029-byte generated HBP. No physical host attestation inferred.
"""
import hashlib,json,pathlib,subprocess,sys,tempfile

ROOT=pathlib.Path(__file__).resolve().parents[2]
SOURCE=ROOT/"experiments"/"seat1"
REPLAY=ROOT/"experiments"/"seat4"/"seat1_original_triad_replay.py"
FIXTURE=SOURCE/"TRIAD-27-CHALLENGE-20261014.json"
STONE=ROOT/"stones"/"2026-10-14-rainbow81"
RECEIPT=ROOT/"stones"/"2026-10-15-rainbow81"/"seat4-seat1-original-triad-replay.json"
BLOBS={
 "experiments/seat1/TRIAD-27-CHALLENGE-20261014.json":"b098e2ce7c9878434bea7b7bf34202ed492e4548",
 "experiments/seat1/triad_27_python.py":"64a69452ebde97cf97cc76200b96e1985b6c6521",
 "experiments/seat1/triad_27_node.js":"ee4128040f9aa4aee468e100bcad406b6ecc323a"
}
EXPECTED_CHALLENGE="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
EXPECTED_FULL="720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3"
COMPACT_SHA="1db6389ba110e8b835e504deebc177e163f8b085d5a48cb47215bb372468700e"
PREFIX="seat-1-20261014-triad27-three-horizon"
def sha(data):return hashlib.sha256(data).hexdigest()
def blobsha(data):return hashlib.sha1(f"blob {len(data)}\0".encode()+data).hexdigest()
def execute(argv,expect_json=True,pass_expected=True):
 r=subprocess.run(argv,cwd=ROOT,capture_output=True,text=True,timeout=180)
 assert (r.returncode==0)==pass_expected,(argv,r.stderr[-2000:])
 return json.loads(r.stdout) if expect_json and pass_expected else r

def main():
 for path,expected in BLOBS.items():
  raw=(ROOT/path).read_bytes()
  assert blobsha(raw)==expected,f"Frozen Git source changed: {path}"
 assert sha(FIXTURE.read_bytes())==EXPECTED_CHALLENGE
 for ext in ("hbp","hbi","json"):
  p=STONE/f"{PREFIX}.{ext}"
  suffix=p.with_name(p.name+".sha256").read_text("ascii").strip().split()
  assert suffix==[sha(p.read_bytes()),p.name],f"Seat 1 {ext} sidecar changed"
 compact=(STONE/f"{PREFIX}.hbp").read_bytes()
 assert len(compact)==1134 and sha(compact)==COMPACT_SHA
 assert f"sha256={EXPECTED_FULL}".encode() in compact
 meta=json.loads((STONE/f"{PREFIX}.json").read_bytes())
 assert meta["hbp_sha256"]==EXPECTED_FULL
 assert meta["python_node_exact_rows"]==32805
 assert meta["physical_host_independently_verified"] is False
 assert meta["fresh_three_host_challenge"] is False
 prior=json.loads(RECEIPT.read_bytes())
 assert prior["schema"]=="ASOLARIA-SEAT4-SEAT1-TRIAD-PEER-20261015-V1"
 assert prior["source_git_blobs"]==BLOBS
 assert prior["challenge_sha256"]==EXPECTED_CHALLENGE
 assert prior["full_output_sha256"]==EXPECTED_FULL
 assert prior["compact_receipt_sha256"]==COMPACT_SHA
 assert prior["verified_original_state_records"]==32805
 assert prior["physical_hosts_attested"]==0
 sidecar=RECEIPT.with_name(RECEIPT.name+".sha256")
 assert sidecar.read_text("ascii").strip().split()==[sha(RECEIPT.read_bytes()),RECEIPT.name]
 with tempfile.TemporaryDirectory(prefix="seat4-original-triad-") as d:
  tmp=pathlib.Path(d)
  args=[
   ("seat1_python",[sys.executable,str(SOURCE/"triad_27_python.py"),
                    str(FIXTURE),str(tmp/"seat1_python.hbp"),"--self-test"]),
   ("seat1_node",["node",str(SOURCE/"triad_27_node.js"),
                  str(FIXTURE),str(tmp/"seat1_node.hbp"),"--self-test"]),
   ("seat4_third",[sys.executable,str(REPLAY),
                   str(FIXTURE),str(tmp/"seat4_third.hbp")]),
  ]
  summaries=[]
  for label,command in args:
   data=execute(command)
   summaries.append(data)
   assert data["status"]=="PASS"
   assert data.get("challenge_sha256")==EXPECTED_CHALLENGE
   assert data["rows"]==data["linearity"]==32805
   assert data["successor"]==data["plus81"]==data["rotation"]==10935
   assert data["smallstep"]==120
   assert data.get("sha256",data.get("full_hbp_sha256"))==EXPECTED_FULL
  payload=[(tmp/f"{label}.hbp").read_bytes() for label,_ in args]
  assert payload[0]==payload[1]==payload[2]
  assert len(payload[0])==6392029 and sha(payload[0])==EXPECTED_FULL
  assert payload[0].count(b"WAVE|")==32805
  assert payload[0]!=compact
  assert b"physical_tested=0" in payload[0]
  assert sha(payload[0][:-1]+b"Z")!=EXPECTED_FULL
  original=execute([sys.executable,str(SOURCE/"triad_release_verify.py"),
                   str(tmp/"seat1_python.hbp"),str(tmp/"seat1_node.hbp")])
  assert original["status"]=="PASS"
  assert original["checksums_verified"]==3
  # Strictly reject mutation to the bytes of the frozen challenge on Seat 4 path.
  modified=bytearray(FIXTURE.read_bytes())
  modified[-3]^=1
  tampered=tmp/"tampered-challenge.json"
  tampered.write_bytes(modified)
  execute([sys.executable,str(REPLAY),str(tampered),str(tmp/"bad.hbp")],
          expect_json=False,pass_expected=False)
 result={
  "status":"PASS","seat":"seat-4",
  "verified_source_blob_count":len(BLOBS),
  "original_state_records":32805,
  "algorithms_compared":3,
  "bytewise_full_output_agreement":True,
  "full_hbp_bytes":6392029,
  "full_hbp_sha256":EXPECTED_FULL,
  "compact_receipt_bytes":1134,
  "compact_receipt_sha256":COMPACT_SHA,
  "separate_artifact_digest_types_verified":True,
  "linearity_controls":32805,
  "successor_controls":10935,
  "plus81_controls":10935,
  "rotation_controls":10935,
  "short_horizon_controls_each":120,
  "source_challenge_tamper_rejected":True,
  "computed_hbp_tamper_rejected":True,
  "physical_hosts_attested":0,
  "evidence":"three software algorithms; no physical host certification"
 }
 print(json.dumps(result,sort_keys=True))
if __name__=="__main__":main()
