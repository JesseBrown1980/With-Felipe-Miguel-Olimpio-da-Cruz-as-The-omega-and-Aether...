#!/usr/bin/env python3
"""Seat 4 third implementation of Seat 1's ORIGINAL frozen 27-wave challenge.
Cyclic GF(2) polynomial exponentiation, independently of Seat 1 matrix code.
Digital software model only; no physical machines/physics measurements.
"""
import argparse,hashlib,json,pathlib,time
N=81;MASK=(1<<N)-1
CHALLENGE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
OUTPUT_SHA="720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3"
LAWS=((0,1),(0,2),(0,1,3),(0,4,7),(0,1,5,9))
HORIZONS=(10**13,10**13+1,10**13+81)
TIMES=("past","now","future");COLORS=("R","G","B");SPACES=("x","y","z")
def hashbytes(x):return hashlib.sha256(x).hexdigest()
def hashstr(x):return hashbytes(x.encode("ascii"))
def rot(x,k):
 k%=N
 return ((x<<k)|(x>>(N-k)))&MASK if k else x&MASK
def product(a,b):
 out=0
 while a:
  low=a&-a
  out^=rot(b,low.bit_length()-1)
  a^=low
 return out
def jump(taps,horizon):
 base=0
 for k in taps:base^=1<<k
 result=1
 while horizon:
  if horizon&1:result=product(result,base)
  base=product(base,base)
  horizon>>=1
 return result
def step(x,taps):
 out=0
 for k in taps:out^=rot(x,k)
 return out
def controls():
 n=0
 for law in LAWS:
  for t in (0,1,2,3,9,21):
   op=jump(law,t)
   for index in (0,1,40,80):
    x=1<<index
    for _ in range(t):x=step(x,law)
    assert x==product(op,1<<index)
    n+=1
 return n
def run(f,challenge_sha,output_path):
 assert f["schema"]=="ASOLARIA-SEAT1-TRIAD-27WAVE-3HORIZON-V1"
 assert f["classification"]=="PUBLIC_SOFTWARE_CHALLENGE_NOT_PHYSICAL_HOST"
 assert f["waves"]==27 and f["bodies"]==81
 assert f["laws"]==[list(x) for x in LAWS] and f["horizons"]==list(HORIZONS)
 assert f["time"]==list(TIMES) and f["color"]==list(COLORS) and f["space"]==list(SPACES)
 assert len(f["nonce"])==32 and len(f["source_commit"])==40
 prefix=f"PORTAL|schema={f['schema']}|challenge_sha256={challenge_sha}|nonce={f['nonce']}|waves=27|bodies=81|laws=5|horizons=3|json=0\n"
 lines=[prefix]
 counts={"rows":0,"linearity":0,"successor":0,"plus81":0,"rotation":0}
 for law_id,taps in enumerate(LAWS):
  ops=[jump(taps,t) for t in HORIZONS]
  once=jump(taps,1);next81=jump(taps,81)
  for w in range(27):
   ti=TIMES[w//9];co=COLORS[(w//3)%3];sp=SPACES[w%3]
   for body in range(81):
    source=(int(hashstr(f"ASOLARIA|SEAT1|TRIAD|V1|{f['nonce']}|{ti}|{co}|{sp}|{body}"),16)&MASK)^(1<<body)
    flip=1<<((body+w)%81)
    values=[]
    for h,operator in enumerate(ops):
     future=product(operator,source)
     delta=product(operator,flip)
     assert product(operator,source^flip)^future==delta
     values.append(future)
     fields=f"{law_id}|{w}|{ti}|{co}|{sp}|{body}|{h}|{future:021x}|{delta:021x}"
     lines.append(f"WAVE|law={law_id}|wave={w}|time={ti}|color={co}|space={sp}|body={body}|horizon={h}|state={future:021x}|delta={delta:021x}|sha={hashstr('ROW|'+fields)}|json=0\n")
     counts["rows"]+=1;counts["linearity"]+=1
    assert values[1]==product(once,values[0]);counts["successor"]+=1
    assert values[2]==product(next81,values[0]);counts["plus81"]+=1
    assert product(ops[0],rot(source,1))==rot(values[0],1);counts["rotation"]+=1
 assert counts=={"rows":32805,"linearity":32805,"successor":10935,"plus81":10935,"rotation":10935}
 lines.append("END|rows=32805|linearity=32805|successor=10935|plus81=10935|rotation=10935|physical_tested=0|json=0\n")
 raw="".join(lines).encode("ascii")
 assert len(raw)==6392029 and hashbytes(raw)==OUTPUT_SHA
 pathlib.Path(output_path).write_bytes(raw)
 return {"full_hbp_sha256":hashbytes(raw),"full_hbp_bytes":len(raw),**counts}
def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("challenge");parser.add_argument("output")
 args=parser.parse_args()
 raw=pathlib.Path(args.challenge).read_bytes()
 assert hashbytes(raw)==CHALLENGE_SHA,"Frozen Seat 1 challenge SHA256 changed"
 start=time.perf_counter()
 checks=controls()
 result=run(json.loads(raw),CHALLENGE_SHA,args.output)
 print(json.dumps({"schema":"ASOLARIA-SEAT4-ORIGINAL-SEAT1-TRIAD-REPLAY-V1",
  "status":"PASS","seat":"seat-4","classification":"PUBLIC_SOFTWARE_REPLAY_NOT_PHYSICAL_HOST",
  "challenge_sha256":CHALLENGE_SHA,"smallstep":checks,
  "physical_hosts_attested":0,"fresh_blinded_three_device_challenge":False,
  **result},sort_keys=True))
if __name__=="__main__":main()
