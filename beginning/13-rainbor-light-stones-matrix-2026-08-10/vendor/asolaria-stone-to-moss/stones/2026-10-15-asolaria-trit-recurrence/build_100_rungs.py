#!/usr/bin/env python3
"""Asolaria tenary 3^16 -> 3^116, exact integers. No optical/biological data."""
import csv, hashlib, json, platform, time
from pathlib import Path

OUT=Path(__file__).resolve().parent
BASE_EXP=16
ADDITIONAL=100
N=81
TAPS=((0,1,3),(0,4,7))

# Polynomial representation of GF(3)[x]/(x^81-1), independent of symbolic rank formula.
def mul(a,b):
    c=[0]*N
    for i,u in enumerate(a):
        if u:
            for j,v in enumerate(b):
                if v:c[(i+j)%N]=(c[(i+j)%N]+u*v)%3
    return c

def poly_power(taps,steps):
    acc=[1]+[0]*(N-1)
    p=[0]*N
    for j in taps:p[j]=(p[j]+1)%3
    while steps:
        if steps&1:acc=mul(acc,p)
        p=mul(p,p)
        steps>>=1
    return acc

def direct_step(x,taps):return [sum(x[(i-j)%N] for j in taps)%3 for i in range(N)]

def sha256(data):return hashlib.sha256(data).hexdigest()

def check_native_math():
    init=[((i*37+11)^((i*i+17)*19))%3 for i in range(N)]
    assert sum(x!=0 for x in init)>0
    for tap in TAPS:
        state=init[:]
        for j in range(82):
            if j in (0,1,40,80,81):assert mul(poly_power(tap,j),init)==state
            if j==81:assert not any(state)
            state=direct_step(state,tap)
        for power in (3**16,3**17,3**18,3**116,10**100):
            assert poly_power(tap,power)==[0]*N
    return True

def main():
    t0=time.perf_counter_ns()
    assert check_native_math()
    source_json=OUT/'source-root.json'
    source={"previous_public_stone":"https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/969aaa3924fb7b7f4655db3e49bbe698da80603b/stones/2026-10-15-asolaria-trit-recurrence/STONE-0003-WAVE-LADDER-R2.hbp",
            "source_laws":"GF3 cyclic taps [0,1,3],[0,4,7]; not arbitrary ternary carry laws",
            "observer_contract":"at 3^e introduce period 3^(e-1), preserve all previously introduced periods 3^5..3^(e-1)",
            "first_rung":"3^16", "further_multiplications":100,"endpoint":"3^116", "e100":"10^100", "physical_source_claim":"actual CPU arithmetic, not sensor or photon measurements"}
    source_json.write_text(json.dumps(source,indent=2,sort_keys=True)+'\n',encoding='utf8')
    data=[]
    for exponent in range(BASE_EXP,BASE_EXP+ADDITIONAL+1):
        tick=pow(3,exponent)
        introduced=exponent-5
        assert introduced>=11
        # Independent direct algebraic phase check; actual counts encode inverse observation schedule.
        periods=[pow(3,e) for e in range(5,exponent)]
        assert len(periods)==introduced
        returns=sum(tick%period==0 for period in periods)
        assert returns==introduced
        assert pow(3,exponent-1)<=tick//3
        if exponent>BASE_EXP:assert tick==int(data[-1]['logical_steps'])*3
        data.append({"rung":exponent-BASE_EXP,"exponent":exponent,"logical_steps":str(tick),
          "decimal_digits":len(str(tick)),"newly_introduced_phase_period":str(pow(3,exponent-1)),
          "registered_phase_layers":introduced,"phase_zero_observers":returns,
          "gf3_taps_0_1_3_nonzero":0,"gf3_taps_0_4_7_nonzero":0,"base3_one_hot_position":exponent,
          "evaluation":"exact_integer_fast_forward","independently_instrumented_photon_measurement":False})
    n=10**100
    periods=[pow(3,e) for e in range(5,BASE_EXP+ADDITIONAL)]
    assert len(periods)==111
    a=pow(3,209);b=pow(3,210)
    assert a<n<b
    e100={"logical_steps":str(n),"decimal_digits":len(str(n)),"surrounding_rungs":[{"power":209,"steps":str(a),"absolute_gap":str(n-a)},{"power":210,"steps":str(b),"absolute_gap":str(b-n)}],
          "closer_power_by_absolute_difference":209 if n-a<b-n else 210,
          "registered_phase_layers_3pow116":len(periods),"phase_zero_observers":sum(n%p==0 for p in periods),
          "sample_phase_residues":[str(n%p) for p in periods[:7]],
          "gf3_taps_0_1_3_nonzero":0,"gf3_taps_0_4_7_nonzero":0,
          "state_evolution_evaluated_by":"exact GF3 polynomial matrix exponentiation",
          "elapsed_10pow100_transitions_physically_executed":False}
    payload={"schema":"ASOLARIA-TERNARY-RUNG-100-EXACT-V1", "date":"2026-10-15", "rung_count":len(data),
             "additional_three_multiplications":ADDITIONAL,"first_power":BASE_EXP,"last_power":BASE_EXP+ADDITIONAL,
             "original_81_gf3_laws_remain_nilpotent":True,"new_phase_register_each_rung":True,
             "warning":"Constructed phase-return observation schedule; no optical carrier, spontaneous emergent memory or physical 10^100 elapsed steps",
             "e100":e100,"rungs":data}
    # Preserve large integers as strings to avoid IEEE754 truncation in JSON/CSV.
    bjson=json.dumps(payload,indent=2,sort_keys=True,ensure_ascii=False).encode('utf8')+b'\n'
    (OUT/'RUNG-100-RESULTS.json').write_bytes(bjson)
    with (OUT/'RUNG-100-RESULTS.csv').open('w',newline='',encoding='utf8') as f:
        wr=csv.DictWriter(f,fieldnames=list(data[0]));wr.writeheader();wr.writerows(data)
    x={"local_wall_ns_compute_and_serialize":time.perf_counter_ns()-t0,"rungs":len(data),
       "source":"python3 on Linux CPU, exact big-integer operations, programmatically verified GF3 nilpotency"}
    (OUT/'local_compute_metadata.json').write_text(json.dumps(x,indent=2)+'\n')
    print('PASS: 101 exact rungs, 3^16 through 3^116, with 100 additional x3 multiplications')
    print('3^17',3**17,'3^18',3**18,'3^116',3**116,'digits',len(str(3**116)))
    print('E100 phase-zero returns:',e100['phase_zero_observers'],'of',e100['registered_phase_layers_3pow116'])
    print('RESULT_SHA256',sha256(bjson))
if __name__=='__main__':main()
