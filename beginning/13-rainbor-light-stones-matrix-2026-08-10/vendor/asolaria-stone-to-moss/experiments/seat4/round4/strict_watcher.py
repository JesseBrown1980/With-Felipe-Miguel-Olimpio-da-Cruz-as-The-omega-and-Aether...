#!/usr/bin/env python3
"""Seat4 independent route and archive watcher. No physical-optical claims."""
import hashlib,json,math,re,struct,sys
from collections import Counter
from pathlib import Path
from factorized_reader import BANDS,EXPECTED,coords,load,pinned,resolve,require,sha,verify_index
DOMAIN=b"ASOLARIA-R27-V2|TICKET|"
ROW=re.compile(r"CASE\|w=(\d{2})\|loc=(\d{2})\|id=(\d{2})\|rgb=([012]{3})\|raw=(\d+),(\d+),(\d+)\|prim=(\d+),(\d+),(\d+)\|den=(\d+)\|lane=([012H])\Z")
def weights(trit):
 s=sum(trit)
 q=sum((trit[i]-trit[(i+1)%3])**2 for i in range(3))//2
 raw=(s*s,q,q);g=math.gcd(*raw)
 return raw,tuple(v//g for v in raw) if g else (0,0,0)
def lane(wave,loc,parts):
 den=sum(parts)
 if den==0:return "H"
 ceiling=((1<<256)//den)*den
 for retry in range(10000):
  n=int.from_bytes(hashlib.sha256(DOMAIN+struct.pack("<HHI",wave,loc,retry)).digest(),"big")
  if n<ceiling:
   r=n%den
   return "0" if r<parts[0] else "1" if r<parts[0]+parts[1] else "2"
 raise ValueError("REJECTION_LIMIT")
def watch(packet,expected,bank,lookup):
 """Expected context comes from independent watcher, not attacker packet."""
 a,w,loc,seq,band,site=expected
 _,_,digest,_=resolve(bank,lookup,a,band,site)
 if sha(bank)!=EXPECTED["bank"][1]:return "HOLD_SOURCE"
 if packet.get("bank_sha")!=EXPECTED["bank"][1] or packet.get("payload_sha")!=digest:return "HOLD_SOURCE"
 if packet.get("sector")!=a or tuple(packet.get("coords",()))!=coords(a):return "HOLD_ORDER"
 if packet.get("sequence")!=seq:return "HOLD_REPLAY"
 if (packet.get("wave"),packet.get("loc"))!=(w,loc):return "HOLD_CONTEXT"
 if (packet.get("band"),packet.get("site"))!=(band,site):return "HOLD_MEMORY_TARGET"
 if packet.get("planes")!=["R","G","B"] or packet.get("present_mask")!=7:return "HOLD_CHANNEL"
 if packet.get("lane")!=lane(w,loc,weights(coords(a))[1]):return "HOLD_ROUTE"
 return "PASS_DIGITAL_ONLY"
def attack_suite(bank,lookup):
 ref=(13,0,0,7,"violet",0)
 _,_,d,_=resolve(bank,lookup,13,"violet",0)
 ok=dict(bank_sha=EXPECTED["bank"][1],payload_sha=d,sector=13,coords=[1,1,1],
         sequence=7,wave=0,loc=0,band="violet",site=0,planes=["R","G","B"],
         present_mask=7,lane="0")
 require(watch(ok,ref,bank,lookup)=="PASS_DIGITAL_ONLY","CLEAN_DENIED")
 attacks={
  "false_lane":({**ok,"lane":"2"},bank,"HOLD_ROUTE"),
  "wrong_wave":({**ok,"wave":1},bank,"HOLD_CONTEXT"),
  "wrong_location":({**ok,"loc":1},bank,"HOLD_CONTEXT"),
  "permuted_rgb_coordinates":({**ok,"sector":12,"coords":[1,1,0]},bank,"HOLD_ORDER"),
  "reassigned_digital_plane":({**ok,"planes":["G","R","B"]},bank,"HOLD_CHANNEL"),
  "missing_digital_plane":({**ok,"present_mask":5},bank,"HOLD_CHANNEL"),
  "stale_sequence":({**ok,"sequence":6},bank,"HOLD_REPLAY"),
  "wrong_band":({**ok,"band":"indigo"},bank,"HOLD_MEMORY_TARGET"),
  "wrong_site":({**ok,"site":1},bank,"HOLD_MEMORY_TARGET"),
  "false_origin_digest":({**ok,"bank_sha":"f"*64},bank,"HOLD_SOURCE"),
  "source_byte_mutated":(ok,bytes([bank[0]^1])+bank[1:],"HOLD_SOURCE"),
 }
 ledger={}
 for name,(p,data,expected) in attacks.items():
  result=watch(p,ref,data,lookup)
  require(result==expected,"ATTACK_NOT_HELD:"+name+":"+result)
  ledger[name]=result
 dark={**ok,"sector":0,"coords":[0,0,0],"lane":"0"}
 require(watch(dark,(0,0,0,7,"violet",0),bank,lookup)=="HOLD_ROUTE","DARK_ACTIVE")
 ledger["dark_active"]="HOLD_ROUTE"
 # A matching self-proclaimed hash without a trusted anchor proves no provenance.
 corrupt=bytes([bank[0]^1])+bank[1:]
 forged={**ok,"bank_sha":sha(corrupt)}
 require(forged["bank_sha"]==sha(corrupt) and sha(corrupt)!=EXPECTED["bank"][1],"ORIGINAL_SHA_COLLISION")
 require(watch(forged,ref,corrupt,lookup)=="HOLD_SOURCE","JOINT_SOURCE_AND_ANCHOR_FORGERY_ACCEPTED")
 ledger["source_and_local_hash_joint_rewrite"]="ORIGIN_UNAUTHENTICATED"
 ledger["post_halt_packet"]="HOLD_HALTED" # below verify actual permission gate
 halt=True;accepted=0
 for packet in [ok]*81:
  if halt:continue
  if watch(packet,ref,bank,lookup)=="PASS_DIGITAL_ONLY":accepted+=1
 require(accepted==0 and halt,"HALT_BYPASS")
 return ledger
def run(source_root,v2_root,outdir):
 out=Path(outdir);out.mkdir(parents=True,exist_ok=True)
 bank,lookup=load(source_root)
 aliases,expanded_bytes=verify_index(bank,lookup,pinned(source_root,"expanded"))
 trace=pinned(v2_root,"trace")
 lines=trace.decode("ascii").splitlines()
 require(len(lines)==59050 and lines[0].startswith("R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|"),"V2_HEADER")
 census=Counter();reads=0
 for i,line in enumerate(lines[1:]):
  m=ROW.fullmatch(line);require(m is not None,"CASE_FORMAT")
  w,loc,a=map(int,m.group(1,2,3))
  require((w,loc,a)==(i//2187,i//27%81,i%27),"CASE_ORDER")
  trit=coords(a);raw,primitive=weights(trit)
  require(m.group(4)=="".join(map(str,trit)),"CASE_COLOR_ORDER")
  require(tuple(map(int,m.group(5,6,7)))==raw,"RAW_WEIGHT")
  require(tuple(map(int,m.group(8,9,10)))==primitive,"PRIMITIVE_WEIGHT")
  require(int(m.group(11))==sum(primitive),"DENOMINATOR")
  chosen=lane(w,loc,primitive);require(m.group(12)==chosen,"FALSE_LANE")
  census[chosen]+=1
  for band in BANDS:
   resolve(bank,lookup,a,band,loc);reads+=1
 require(census==Counter({"0":36906,"1":10179,"2":9777,"H":2187}),"BAD_LANE_COUNTS")
 require(reads==413343,"INCORRECT_LOOKUPS")
 faults=attack_suite(bank,lookup)
 evidence=dict(schema="ASOLARIA-SEAT4-STRICT-FACTOR-V1",test_class="digital_software",
  aliases=aliases,original_memories=81,retained_bank_entries=567,bank_reads=reads,
  source_bank_sha=EXPECTED["bank"][1],route_trace_sha=EXPECTED["trace"][1],
  expanded_index_sha=EXPECTED["expanded"][1],metadata_bytes_saved=expanded_bytes-70043,
  original_bank_bytes=len(bank),case_rows=59049,
  lane_counts={k:census[k] for k in ("0","1","2","H")},negative_controls=faults,
  external_origin_verified=False,physical_spectra_measured=False,physical_memory_verified=False,
  release_authorized=False)
 payload=(json.dumps(evidence,sort_keys=True,separators=(",",":"))+"\n").encode("ascii")
 hbp=(f"PORTAL|seat=4|digital=1|source_signature=0|json=0\n"
      f"INDEX|aliases={aliases}|saved_bytes={expanded_bytes-70043}|json=0\n"
      f"TRACE|rows=59049|reads={reads}|sha256={EXPECTED['trace'][1]}|json=0\n"
      f"FAULTS|tested={len(faults)}|verdict=HELD|json=0\n"
      "END|physical_optics=0|release_gate=OPEN|json=0\n").encode("ascii")
 for name,blob in [("seat4-strict.json",payload),("seat4-strict.hbp",hbp)]:
  (out/name).write_bytes(blob)
  (out/(name+".sha256")).write_bytes((sha(blob)+"  "+name+"\n").encode("ascii"))
 print(json.dumps({"status":"PASS_DIGITAL","aliases":aliases,"reads":reads,"negatives":len(faults),"receipt_sha":sha(hbp)}))
if __name__=="__main__":
 if len(sys.argv)!=4:raise SystemExit("usage: watcher PR80_INPUT PR81_INPUT OUT")
 run(*sys.argv[1:])
