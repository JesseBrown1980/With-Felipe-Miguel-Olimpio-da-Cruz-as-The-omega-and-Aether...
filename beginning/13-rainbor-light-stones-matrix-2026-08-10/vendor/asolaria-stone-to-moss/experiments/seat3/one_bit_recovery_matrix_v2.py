#!/usr/bin/env python3
"""One-bit exact recovery: public GF(2) fixture, no hidden salts or host evidence."""
import hashlib,json,sys
from pathlib import Path
N=81;MASK=(1<<N)-1;LOW=(1<<80)-1
EXPECTED="08fc44cd8e5c2e41ce2dadf55ab96edacbbe11435ce4b21d436ae5e602d23c9d"
sha=lambda x:hashlib.sha256(x.encode("ascii")).hexdigest()
def apply(cols,x):
 v=0
 while x:
  b=x&-x;v^=cols[b.bit_length()-1];x-=b
 return v
def compose(a,b):return [apply(a,v) for v in b]
def power(taps,k):
 a=[sum(1<<((i+t)%N) for t in taps) for i in range(N)];z=[1<<i for i in range(N)]
 while k:
  if k&1:z=compose(a,z)
  a=compose(a,a);k>>=1
 return z
def inv(cols):
 rows=[]
 for i in range(N):rows.append(sum(((cols[j]>>i)&1)<<j for j in range(N))|(1<<(N+i)))
 for i in range(N):
  j=next((j for j in range(i,N) if ((rows[j]>>i)&1)),None)
  if j is None:raise ValueError("noninvertible augmented map")
  rows[i],rows[j]=rows[j],rows[i]
  for j in range(N):
   if j!=i and ((rows[j]>>i)&1):rows[j]^=rows[i]
 return [sum(((rows[i]>>(N+j))&1)<<i for i in range(N)) for j in range(N)]
def state(f,s,ti,c,sp,b):
 seat,digest,blob=s
 fields=(f["domain"],f["public_challenge_nonce"],f["public_challenge_blob"],seat,digest,blob,ti,c,sp,str(b))
 return (int(sha("|".join(fields)),16)&MASK)^(1<<b)
def main(fi,out):
 f=json.loads(Path(fi).read_text());laws=f["laws"];hs=f["horizons"]
 assert f["schema"]=="ASOLARIA-SEAT3-ONE-BIT-RECOVERY-FIXTURE-V2"
 assert f["public_seed_only"] is True and f["fresh_physical_challenge"] is False and f["physical_hosts_verified"]==0
 assert laws==[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]
 assert hs==[10**13,10**13+1,10**13+81] and len(f["seats"])==4
 ops={};invs={};ranks={}
 for li,taps in enumerate(laws):
  for h in hs:
   op=power(taps,h);r=80 if len(taps)%2==0 else 81
   assert apply(op,MASK)==(0 if r==80 else MASK)
   aug=[(u&LOW)|((b==0)<<80) for b,u in enumerate(op)] if r==80 else op
   rev=inv(aug)
   assert all(apply(rev,aug[b])==(1<<b) for b in range(N))
   ops[li,h]=op;invs[li,h]=rev;ranks[li,h]=r
 records=[];loss=full=0
 for w in range(27):
  ti=f["time"][w//9];c=f["color"][(w//3)%3];sp=f["space"][w%3]
  for s in f["seats"]:
   seat=s[0]
   for b in range(81):
    x=state(f,s,ti,c,sp,b);y=x^MASK
    for li in range(5):
     for h in hs:
      op=ops[li,h];rev=invs[li,h];r=ranks[li,h];a=apply(op,x);z=apply(op,y)
      if r==80:
       assert a==z and a.bit_count()%2==0
       cx=(a&LOW)|((x&1)<<80);cy=(z&LOW)|((y&1)<<80)
       assert cx!=cy;loss+=2
      else:
       assert a!=z
       cx,cy=a,z;full+=2
      assert apply(rev,cx)==x and apply(rev,cy)==y
      records.append(f"W|seat={seat}|w={w:02d}|body={b:02d}|law={li}|h={h}|rank={r}|fa={a:021x}|fb={z:021x}|cert_a={cx:021x}|cert_b={cy:021x}|recovered=2|extra_bits={81-r}\n")
 data="".join(records).encode("ascii");Path(out).write_bytes(data)
 digest=hashlib.sha256(data).hexdigest()
 assert len(records)==131220 and loss==157464 and full==104976 and digest==EXPECTED,(len(records),loss,full,digest)
 print(json.dumps({"status":"PASS","sha256":digest,"records":len(records),"recovered":2*len(records),
                   "one_bit_recoveries":loss,"zero_bit_recoveries":full,
                   "evidence_class":"PUBLIC_SOFTWARE_NOT_PHYSICAL_HOST"},sort_keys=True))
if __name__=="__main__":main(sys.argv[1],sys.argv[2])
