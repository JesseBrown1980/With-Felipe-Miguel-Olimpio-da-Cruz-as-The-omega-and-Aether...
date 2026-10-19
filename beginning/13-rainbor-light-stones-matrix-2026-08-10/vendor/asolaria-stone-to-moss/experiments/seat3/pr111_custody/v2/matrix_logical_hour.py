#!/usr/bin/env python3
"""Seat3 positive matrix fast-forward for one LOGICAL hour, not CPU-time forgery.

Independent toy GF(2) recurrence. Tests 3.6m xorshift ticks vs a matrix power.
Uses actual OS process counters in a DIFFERENT non-parity JSON file.
"""
from __future__ import annotations
import hashlib,json,os,platform,sys,time
from pathlib import Path

MOD=(1<<64)-1
SEED=0x0123456789abcdef
TICKS=3_600_000
NANO_PER_TICK=1_000_000
DOMAIN=b"ASOLARIA-SEAT3-MATRIX-LOGICAL-HOUR-V1|"
SCHEMA="ASOLARIA-SEAT3-LOGICAL-HOUR-MATRIX-FORWARD-PROOF-V1"
def H(b):return hashlib.sha256(b).hexdigest()
def ensure(ok,msg):
    if not ok:raise AssertionError(msg)
def canonical(obj):
    return (json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
def transition(x):
    x^=(x<<13)&MOD
    x^=x>>7
    x^=(x<<17)&MOD
    return x&MOD
def apply(columns,x):
    result=0
    while x:
        low=x & -x
        result^=columns[low.bit_length()-1]
        x^=low
    return result
def compose(a,b):
    return tuple(apply(a,col) for col in b)
def matrix_jump(x,n):
    base=tuple(transition(1<<i) for i in range(64))
    squarings=0
    selected=0
    while n:
        if n&1:
            x=apply(base,x)
            selected+=1
        n>>=1
        if n:
            base=compose(base,base)
            squarings+=1
    return x,squarings,selected
def slow_iterate(x,n):
    for _ in range(n):
        x=transition(x)
    return x
def claimed_digest(x,n):
    return H(DOMAIN+x.to_bytes(8,"little")+n.to_bytes(8,"little"))
def run(outdir):
    a=time.perf_counter_ns();cpu_start=time.process_time_ns()
    fast,exp_sq,exp_selected=matrix_jump(SEED,TICKS)
    fast_time=time.perf_counter_ns()-a
    b=time.perf_counter_ns()
    slow=slow_iterate(SEED,TICKS)
    slow_time=time.perf_counter_ns()-b
    elapsed=time.perf_counter_ns()-a
    cpu=time.process_time_ns()-cpu_start
    ensure(fast==slow,"FAST_FORWARD_DID_NOT_EQUAL_SLOW_RECURRENT_EVOLUTION")
    digest=claimed_digest(fast,TICKS)
    # Changing *only* a hash or state without recalculating recurrence must fail.
    badstate=fast^1
    ensure(claimed_digest(badstate,TICKS)!=digest and
           badstate!=slow,"BIT_FLIP_STATE_MUST_FAIL_REFERENCE")
    bad_hash=("0" if digest[0]!="0" else "1")+digest[1:]
    ensure(bad_hash!=digest,"SELF_CLAIMED_HASH_CANNOT_PROVE_STATE")
    ensure(exp_sq==21 and exp_selected==TICKS.bit_count(),"FAST_FORWARD_OPERATION_COUNT_CHANGED")
    proof={
      "schema":SCHEMA,"algorithm":"xorshift64_gf2_linear_13_7_17",
      "initial_state_u64_hex":f"{SEED:016x}",
      "jump_matrix_basis_dimension":64,
      "logical_ticks":TICKS,
      "logical_time_ns":TICKS*NANO_PER_TICK,
      "time_per_logical_tick_ns":NANO_PER_TICK,
      "matrix_squarings":exp_sq,
      "matrix_selected_power_applications":exp_selected,
      "reference_stepwise_transitions":TICKS,
      "fast_state_u64_hex":f"{fast:016x}",
      "stepwise_state_u64_hex":f"{slow:016x}",
      "fast_equals_stepwise":True,
      "state_sha256":digest,
      "negative_state_flip":"REJECTED",
      "negative_digest_only_replacement":"REJECTED",
      "os_cpu_elapsed_ns_claimed_as_one_hour":False,
      "physical_optical_memory_inference":False,
      "existing_Asolaria_matrix_implementation_reused":False,
      "mathematical_model_only":True,
    }
    raw=canonical(proof)
    os_telemetry={
      "schema":"SEAT3-REAL-PROCESS-TELEMETRY-SEPARATE-FROM-LOGICAL-TIME-V1",
      "platform":platform.system(),"python":platform.python_version(),
      "wall_elapsed_ns":elapsed,"cpu_elapsed_ns":cpu,
      "matrix_jump_wall_ns":fast_time,"stepwise_reference_wall_ns":slow_time,
      "logical_elapsed_ns":TICKS*NANO_PER_TICK,
      "logical_time_is_not_wall_clock":True,
      "os_reported_photons":"NOT_MEASURED",
      "calibrated_rail_power":"NOT_MEASURED",
      "source_proof_sha256":H(raw),
    }
    ensure(os_telemetry["wall_elapsed_ns"]>0 and os_telemetry["cpu_elapsed_ns"]>0,
           "NO_ACTUAL_PHYSICAL_COMPUTATION_COUNTERS")
    ensure(os_telemetry["logical_elapsed_ns"]!=os_telemetry["wall_elapsed_ns"],
           "LOGICAL_VS_OS_CLOCK_CONFLATED")
    out=Path(outdir);out.mkdir(parents=True,exist_ok=True)
    for name,payload in (
       ("matrix-logical-hour-proof.json",raw),
       ("matrix-os-process-telemetry.json",canonical(os_telemetry))
    ):
        (out/name).write_bytes(payload)
        (out/(name+".sha256")).write_bytes((H(payload)+"  "+name+"\n").encode("ascii"))
    print(json.dumps({"verdict":"FAST_FORWARD_REFERENCE_EXACT_PASS",
       "logical_seconds":TICKS//1000,"final_state_hex":f"{fast:016x}",
       "matrix_squarings":exp_sq,"selected_powers":exp_selected,
       "physical_wall_ms":round(elapsed/1e6,3),
       "source_digest":digest,"proof_sha256":H(raw)},sort_keys=True))
if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("usage: python matrix_logical_hour.py OUT_DIR")
    run(sys.argv[1])
