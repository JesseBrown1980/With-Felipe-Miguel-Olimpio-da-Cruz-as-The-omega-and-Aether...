#!/usr/bin/env python3
"""Seat 4 independent PR19 source replay (software only; no physical hosts).
Validate pinned Git blob SHAs; rerun published Python and Node; independently
regenerate ALL 131,220 public output records with a third GF(2) algorithm.
"""
import hashlib,json,subprocess,sys,tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
S3=ROOT/"experiments"/"seat3"
BLOBS={
 "one-bit-recovery-fixture-v2.json":"f86e6b6a0bf6eb134ab3fd56d544799f604219fc",
 "one_bit_recovery_matrix_v2.py":"51aeae3365f98c045b531505c7e25ba123ebb653",
 "one_bit_recovery_poly_v2.js":"9b8b36d7ad4ee30ddc76fcdd1b81c055302ab14b",
}
EXPECTED="08fc44cd8e5c2e41ce2dadf55ab96edacbbe11435ce4b21d436ae5e602d23c9d"
N=81; MASK=(1<<N)-1

def sha(data):return hashlib.sha256(data).hexdigest()
def gitsha(data):return hashlib.sha1(f"blob {len(data)}\0".encode()+data).hexdigest()
def rotate(x,k):
 k%=N
 return ((x<<k)|(x>>(N-k)))&MASK if k else x&MASK
def multiply(a,b):
 out=0
 while b:
  low=b&-b
  out^=rotate(a,low.bit_length()-1)
  b^=low
 return out
def power(taps,exp):
 k=0
 for tap in taps:k^=1<<tap
 out=1
 for c in bin(exp)[2:]:
  out=multiply(out,out)
  if c=="1":out=multiply(out,k)
 return out
def initial(f,seat,t,c,sp,body):
 name,digest,blob=seat
 fields=(f["domain"],f["public_challenge_nonce"],f["public_challenge_blob"],
         name,digest,blob,t,c,sp,str(body))
 h=hashlib.sha256("|".join(fields).encode("ascii")).digest()
 return (int.from_bytes(h,"big")&MASK)^(1<<body)
def check_rows(f,p):
 assert f["schema"]=="ASOLARIA-SEAT3-ONE-BIT-RECOVERY-FIXTURE-V2"
 assert f["seats"] and len(f["seats"])==4
 assert f["laws"]==[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]
 assert f["horizons"]==[10**13,10**13+1,10**13+81]
 assert f["public_seed_only"] and f["fresh_physical_challenge"] is False
 assert f["physical_hosts_verified"]==0
 ops={(i,h):power(taps,h) for i,taps in enumerate(f["laws"])
      for h in f["horizons"]}
 for i,taps in enumerate(f["laws"]):
  for h in f["horizons"]:
   assert multiply(ops[i,h],MASK)==(0 if len(taps)%2==0 else MASK)
 digest=hashlib.sha256()
 rows=onebit=nobit=0
 with p.open("rb") as stream:
  for wave in range(27):
   t=f["time"][wave//9]
   color=f["color"][(wave//3)%3]
   sp=f["space"][wave%3]
   for seat in f["seats"]:
    for body in range(81):
     x=initial(f,seat,t,color,sp,body)
     y=x^MASK
     for i,taps in enumerate(f["laws"]):
      lossy=(len(taps)%2==0)
      for h in f["horizons"]:
       op=ops[i,h]
       a=multiply(op,x);b=multiply(op,y)
       if lossy:
        assert a==b and a.bit_count()%2==0
        cx=(a&((1<<80)-1))|((x&1)<<80)
        cy=(b&((1<<80)-1))|((y&1)<<80)
        assert cx!=cy
        onebit+=2
       else:
        assert a!=b
        cx,cy=a,b
        nobit+=2
       expected=(f"W|seat={seat[0]}|w={wave:02d}|body={body:02d}|law={i}"
                 f"|h={h}|rank={80 if lossy else 81}|fa={a:021x}|fb={b:021x}"
                 f"|cert_a={cx:021x}|cert_b={cy:021x}|recovered=2"
                 f"|extra_bits={int(lossy)}\n").encode("ascii")
       row=stream.readline()
       assert row==expected,f"Independent Seat4 row mismatch at {rows}"
       digest.update(row)
       rows+=1
  assert not stream.read(),"extra HBP content"
 assert rows==131220 and onebit==157464 and nobit==104976
 assert digest.hexdigest()==EXPECTED
 return rows,onebit,nobit

def main():
 for name,blob in BLOBS.items():
  assert gitsha((S3/name).read_bytes())==blob,f"Source changed: {name}"
 fixture=S3/"one-bit-recovery-fixture-v2.json"
 f=json.loads(fixture.read_bytes())
 with tempfile.TemporaryDirectory(prefix="seat4-peer-pr19-") as d:
  p=Path(d)/"p.hbp";n=Path(d)/"n.hbp"
  cmds=[
    [sys.executable,str(S3/"one_bit_recovery_matrix_v2.py"),str(fixture),str(p)],
    ["node",str(S3/"one_bit_recovery_poly_v2.js"),str(fixture),str(n)],
  ]
  for cmd in cmds:
   r=subprocess.run(cmd,check=True,capture_output=True,text=True,timeout=180)
   o=json.loads(r.stdout)
   assert o["status"]=="PASS" and o["sha256"]==EXPECTED
   assert o["records"]==131220 and o["recovered"]==262440
  data=p.read_bytes()
  assert data==n.read_bytes() and len(data)==25063020
  assert sha(data)==EXPECTED
  rows,onebit,nobit=check_rows(f,p)
  corrupted=bytearray(data);corrupted[len(data)//2]^=1
  assert sha(corrupted)!=EXPECTED
 receipt={
  "schema":"ASOLARIA-SEAT4-SEAT3-PR19-INDEPENDENT-PEER-V1",
  "seat":"seat-4",
  "source_pr":19,
  "source_commit":"9296f863be50619355cb7677298ca78b959ec9ed",
  "source_blobs_git_sha1":BLOBS,
  "evidence_class":"PUBLIC_SOFTWARE_REPLAY_ONLY",
  "rows":rows,
  "original_states_recovered_by_source_implementations":2*rows,
  "source_bit_recoveries":onebit,"zero_bit_recoveries":nobit,
  "independent_third_algorithm_rows_compared":rows,
  "mismatches":0,"canonical_hbp_sha256":EXPECTED,"canonical_hbp_bytes":25063020,
  "negative_single_byte_tamper_rejected":True,
  "physical_hosts_attested":0,"fresh_three_host_blinded_challenge":False,
  "separate_archive_zip_manifest_signature_independently_verified":False,
  "no_sha256_cryptographic_collision_claim":True,
 }
 print(json.dumps(receipt,sort_keys=True,indent=2))

if __name__=="__main__":main()
