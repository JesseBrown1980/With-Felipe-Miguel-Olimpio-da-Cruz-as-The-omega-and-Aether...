#!/usr/bin/env python3
"""Seat4 independent original 81-bit GF2 recurrence referee.
Polynomial cyclic algebra (NOT Seat3's original column implementation).
Real physically powered CPU executes software; no optical sensor present.
"""
from __future__ import annotations
import hashlib,json,sys
from pathlib import Path
N=81;MASK=(1<<N)-1
TAPS=((0,1),(0,2),(0,1,3),(0,4,7),(0,1,5,9))
PAIRS=((0,0),(1,10**13),(10**13,1),(10**13,10**13+1),(1234567,9876543))
SHORT=(0,1,2,17,81)
BITS=(0,40,80)
SOURCE_BLOB="2b0ed7e52776cd8a9b48086d83ba31c8486629fb"
DOMAIN="ASOLARIA-SEAT4-R10-81BIT-MATRIX-STATE-V1"
def sha(b):return hashlib.sha256(b).hexdigest()
def canonical(x):return (json.dumps(x,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
def check(cond,msg):
 if not cond:raise AssertionError(msg)
def rot(x,n):
 n=n%N
 return (((x<<n)|(x>>(N-n)))&MASK) if n else x
def pmul(a,b):
 # Independent GF(2)[x]/(x^81 - 1) cyclic polynomial product.
 result=0
 while b:
  pos=(b&-b).bit_length()-1
  result^=rot(a,pos)
  b&=b-1
 return result
def power(base,n):
 result=1
 while n:
  if n&1:result=pmul(result,base)
  base=pmul(base,base);n>>=1
 return result
def direct(x,taps):
 result=0
 for t in taps:result^=rot(x,t)
 return result&MASK
def startseed(law,trial):
 b=hashlib.sha256(f"ASOLARIA-SEAT4-R10-FROZEN-SEED|{law}|{trial}".encode("ascii")).digest()
 return int.from_bytes(b,"big")&MASK
def hx(x):return f"{x:021x}"
def signature(law,taps,seed,n,state):
 return sha(f"{DOMAIN}|law={law}|taps={','.join(map(str,taps))}|n={n}|source_blob={SOURCE_BLOB}|seed={hx(seed)}|state={hx(state)}".encode("ascii"))
def actual_record(law,trial,kind,a,b,bit=None):
 taps=TAPS[law]; seed=startseed(law,trial);basis=sum(1<<t for t in taps)
 if kind=="split":
  p1=power(basis,a);p2=power(basis,b)
  lhs=pmul(power(basis,a+b),seed)
  rhs=pmul(p2,pmul(p1,seed))
  check(lhs==rhs,"SEMIGROUP_MISMATCH")
  state=lhs;step=a+b
 elif kind=="short":
  step=a;state=pmul(power(basis,step),seed)
  slow=seed
  for _ in range(step):slow=direct(slow,taps)
  check(state==slow,"DIRECT_SHORT_MISMATCH")
  rhs=slow
 elif kind=="bitflip":
  step=a; check(bit in BITS,"BAD_BIT")
  p=power(basis,step);state=pmul(p,seed)
  rhs=pmul(p,seed^(1<<bit))^state
  check(rhs==pmul(p,1<<bit),"GF2_PERTURBATION_MISMATCH")
 else:raise ValueError("UNKNOWN_CASE")
 record={"schema":"ASOLARIA-SEAT4-R10-81BIT-POLYNOMIAL-REPLAY-V1",
  "law_index":law,"taps":list(taps),"trial":trial,"kind":kind,"a":a,"b":b,
  "seed_81_hex":hx(seed),"final_state_hex":hx(state),
  "witness_hex":hx(rhs),"source_original_git_blob":SOURCE_BLOB,
  "state_sha256":signature(law,taps,seed,step,state),
  "simulated_logical_steps":step,"real_optical_photon_measurement":False}
 if bit is not None:record["bit"]=bit
 return record
def frozen_cases():
 out=[]
 for law in range(len(TAPS)):
  for trial in range(3):
   for a,b in PAIRS:out.append(actual_record(law,trial,"split",a,b))
   for n in SHORT:out.append(actual_record(law,trial,"short",n,0))
   for bit in BITS:out.append(actual_record(law,trial,"bitflip",10**13,0,bit))
 return out
def falsifiers():
 taps=TAPS[0];a,b=1,2
 # Nonlinear binary-product term invalidates GF2 superposition.
 def nonlinear(x):return direct(x,taps)^(((x&1)&((x>>1)&1))<<40)
 def with_carry(x):return (direct(x,taps)+x)&MASK
 nonlin=nonlinear(a^b)^nonlinear(a)^nonlinear(b)
 carry=with_carry(a^b)^with_carry(a)^with_carry(b)
 check(nonlin!=0 and carry!=0,"NONLINEAR_FALSIFIER_NOT_CONSTRUCTED")
 s=startseed(0,0)
 true=s
 for _ in range(17):true=direct(true,TAPS[0])
 for _ in range(23):true=direct(true,TAPS[1])
 wrong=pmul(power(sum(1<<p for p in TAPS[0]),40),s)
 proper=pmul(power(sum(1<<p for p in TAPS[1]),23),
             pmul(power(sum(1<<p for p in TAPS[0]),17),s))
 check(proper==true and wrong!=true,"LAW_SWITCH_FAIL_OPEN")
 # A public SHA256 iteration is computed step by step; nonlinearity alone
 # does not imply that *no other* fast algorithm could ever exist.
 chain=hashlib.sha256(b"ASOLARIA-SEAT4-R10-HASH-CHAIN-SEED").digest()
 first=chain
 for _ in range(128):chain=hashlib.sha256(chain).digest()
 x=b"\x01"+b"\x00"*31;y=b"\x02"+b"\x00"*31
 z=bytes(i^j for i,j in zip(x,y))
 sample=[hashlib.sha256(t).digest() for t in (x,y,z)]
 check(sample[2]!=bytes(i^j for i,j in zip(sample[0],sample[1])),"SHA256_LINEARITY_UNEXPECTED")
 return {"nonlinear_AND_superposition_delta_hex":hx(nonlin),
 "nonlinear_carry_superposition_delta_hex":hx(carry),
 "switched_law_final_state_hex":hx(true),
 "invalid_frozen_law_state_hex":hx(wrong),
 "correct_composed_switched_state_hex":hx(proper),
 "switched_law_steps":[17,23],
 "sha256_chain_steps_executed":128,
 "sha256_chain_first_hex":first.hex(),"sha256_chain_final_hex":chain.hex(),
 "sha256_step_is_GF2_linear":False,
 "arbitrary_hash_chain_matrix_jump_demonstrated":False}
def mutations(ref):
 # Actual active changed serialized evidence, checked against regenerated truth.
 edits=(("wrong_final_state",{"final_state_hex":"0"*21}),
        ("forged_final_sha",{"state_sha256":"f"*64}),
        ("false_step_count",{"simulated_logical_steps":17}),
        ("wrong_source_blob",{"source_original_git_blob":"0"*40}),
        ("wrong_taps",{"taps":[0,3]}),
        ("wrong_seed",{"seed_81_hex":"0"*21}),
        ("fake_physical_measurement",{"real_optical_photon_measurement":True}))
 rejected=[]
 for name,fields in edits:
  suspect={**ref,**fields}
  if suspect==ref:raise AssertionError("INEFFECTIVE_MUTATION:"+name)
  try:
   check(suspect==actual_record(ref["law_index"],ref["trial"],ref["kind"],ref["a"],ref["b"],ref.get("bit")),"MUTATED_CASE_MISMATCH")
  except AssertionError as err:
   check(str(err)=="MUTATED_CASE_MISMATCH",name+"_WRONG_REASON")
   rejected.append(name)
  else:raise AssertionError("FORGED_ROW_ACCEPTED:"+name)
 return rejected
def run(out):
 out.mkdir(parents=True,exist_ok=True)
 cases=frozen_cases();expect=5*3*(len(PAIRS)+len(SHORT)+len(BITS))
 check(len(cases)==expect,"ROW_COUNT_BAD")
 adverse=falsifiers()
 bad=mutations(cases[1])
 trace=b"".join(canonical(c) for c in cases)
 (out/"r10-81bit-cases.jsonl").write_bytes(trace)
 receipt={
 "schema":"ASOLARIA-SEAT4-R10-INDEPENDENT-POLYNOMIAL-REVIEW-V1",
 "source_blob":SOURCE_BLOB,"model_dimension_bits":N,"law_count":len(TAPS),
 "law_taps":[list(x) for x in TAPS],"trials_per_law":3,
 "pair_count_per_seed":len(PAIRS),"direct_controls_per_seed":len(SHORT),
 "bitflip_controls_per_seed":len(BITS),
 "total_independently_computed_cases":len(cases),
 "ten_trillion_step_horizon_exercised":True,
 "split_and_continuity_verified":True,
 "nonlinear_law_switch_and_hash_chain":adverse,
 "forged_evidence_mutations_rejected":bad,
 "final_trace_sha256":sha(trace),
 "original_64bit_logical_hour_is_a_distinct_model":True,
 "physical_time_elapsed_for_logical_horizons":False,
 "physical_optical_retention_claim":False,
 "result":"81BIT_MATH_PASS_NONLINEAR_LAW_SWITCH_FALSIFIED_HASHCHAIN_SEPARATE"}
 raw=canonical(receipt)
 (out/"r10-results.json").write_bytes(raw)
 for name in ("r10-81bit-cases.jsonl","r10-results.json"):
  blob=(out/name).read_bytes()
  (out/(name+".sha256")).write_bytes((sha(blob)+"  "+name+"\n").encode("ascii"))
 print(json.dumps({"result":receipt["result"],"rows":len(cases),
  "law_switch_invalid_frozen_state":adverse["invalid_frozen_law_state_hex"],
  "valid_switched_state":adverse["switched_law_final_state_hex"],
  "trace_sha256":sha(trace),"report_sha256":sha(raw)},sort_keys=True))
if __name__=="__main__":
 if len(sys.argv)!=2:raise SystemExit("usage: python polynomial_referee.py OUTPUT")
 run(Path(sys.argv[1]))
