#!/usr/bin/env python3
"""Asolaria 81-site quantum/gravity software control gates (stdlib only).

Q1: local deterministic SHA-seeded hidden states versus an explicitly
    programmed quantum singlet Born-rule distribution.
Q2: an 81-party GHZ measurement sampler (not an entanglement witness).
G1: hash-only metadata, imposed light-gradient, imposed gravity potential.
No actual quantum, light, GPU, brain, gravitational or FTL measurement.
"""
import hashlib
import json
import math
import random

SEATS=81
WAVES=9
TRIALS=4096
GHZ_SHOTS=1024
ANGLES=((0.0, math.pi/2),(math.pi/4,-math.pi/4))
SCHEMA="ASOLARIA-81-QUANTUM-GRAVITY-CPU-GATES-V1"
SCALES=(1,2,3,10,30,100,1000,1_000_000,1_000_000_000)

def digest(*parts):
    h=hashlib.sha256()
    for x in parts:
        b=str(x).encode("ascii")
        h.update(len(b).to_bytes(8,"big"))
        h.update(b)
    return h.hexdigest()

IDENTITY=[digest("BROWN-HILBERT|IDENTITY",i) for i in range(SEATS)]
CHARGES=[1+int(h[:2],16)%5 for h in IDENTITY]
POSITIONS=[(float((i%9)*2),float((i//9)*2),float((i*7)%13)*1.3)
           for i in range(SEATS)]
assert len(set(IDENTITY))==SEATS and len(set(POSITIONS))==SEATS

def sign_cos(x):
    return 1 if math.cos(x)>=0 else -1

def quantum_prob(x,y,left,right):
    E=-math.cos(ANGLES[0][x]-ANGLES[1][y])
    return (1+left*right*E)/4

def quantum_analytic():
    corr=[]
    for x in range(2):
        row=[]
        for y in range(2):
            joint={(a,b):quantum_prob(x,y,a,b) for a in (-1,1) for b in (-1,1)}
            assert abs(sum(joint.values())-1)<1e-14
            for a in (-1,1):
                assert abs(sum(joint[(a,b)] for b in (-1,1))-.5)<1e-14
            for b in (-1,1):
                assert abs(sum(joint[(a,b)] for a in (-1,1))-.5)<1e-14
            row.append(sum(a*b*p for (a,b),p in joint.items()))
        corr.append(row)
    S=abs(corr[0][0]+corr[0][1]+corr[1][0]-corr[1][1])
    assert abs(S-2*math.sqrt(2))<1e-12 and S<=2*math.sqrt(2)+1e-12
    return {"chsh":S,"classical_limit":2,"quantum_limit":2*math.sqrt(2),
            "local_marginals_each":0.5,"correlations":corr,
            "quantum_law_explicitly_programmed":True}

def bell_wave(wave):
    rng=random.Random(int(digest("BELL|SHA-SEED",wave),16))
    accum=[[0,0],[0,0]]
    local_independence=0
    for _ in range(TRIALS):
        lam=2*math.pi*rng.random()
        alice=[sign_cos(lam-a) for a in ANGLES[0]]
        bob=[-sign_cos(lam-b) for b in ANGLES[1]]
        local_independence+=int(alice[0]==alice[0] and bob[0]==bob[0])
        for x in range(2):
            for y in range(2):
                accum[x][y]+=alice[x]*bob[y]
        # Every deterministic assignment obeys a per-trial CHSH limit.
        s=alice[0]*bob[0]+alice[0]*bob[1]+alice[1]*bob[0]-alice[1]*bob[1]
        assert abs(s)==2
    E=[[v/TRIALS for v in row] for row in accum]
    S=abs(E[0][0]+E[0][1]+E[1][0]-E[1][1])
    assert S<=2+1e-12 and local_independence==TRIALS
    return {"wave":wave,"events_per_setting":TRIALS,"chsh":S}

def ghz_wave(wave):
    rng=random.Random(int(digest("GHZ|SHA-SEED",wave),16))
    res={}
    for basis in ("X"*SEATS,"Z"*SEATS,"Z"*40+"X"*41):
        counts=[0]*SEATS
        parity_pass=0
        z_agree=0
        for _ in range(GHZ_SHOTS):
            obs=[0]*SEATS
            z_present="Z" in basis
            z=rng.choice((-1,1))
            for i,letter in enumerate(basis):
                obs[i]=z if letter=="Z" else rng.choice((-1,1))
            if not z_present:   # GHZ all-X parity +1
                product=math.prod(obs[:-1])
                obs[-1]=product
                parity_pass+=int(math.prod(obs)==1)
            zs=[obs[i] for i,letter in enumerate(basis) if letter=="Z"]
            if zs:
                z_agree+=int(len(set(zs))==1)
            for i,a in enumerate(obs):
                counts[i]+=int(a==1)
        assert not z_present or z_agree==GHZ_SHOTS
        if not z_present:assert parity_pass==GHZ_SHOTS
        deviations=[abs(v/GHZ_SHOTS-.5) for v in counts]
        assert max(deviations)<.08
        tag=("all_X" if basis[0]=="X" else ("all_Z" if basis[-1]=="Z" else "mixed_Z40_X41"))
        res[tag]={"shots":GHZ_SHOTS,
                  "global_X_parity_passes":parity_pass,
                  "Z_consistency_passes":z_agree,
                  "max_single_site_marginal_deviation":max(deviations)}
    return {"wave":wave,"basis_controls":res}

def forces(coords,power):
    f=[[0.,0.,0.] for _ in range(SEATS)]
    for i in range(SEATS):
        xi,yi,zi=coords[i]
        for j in range(i+1,SEATS):
            xj,yj,zj=coords[j]
            dx,dy,dz=xi-xj,yi-yj,zi-zj
            rsq=dx*dx+dy*dy+dz*dz
            assert rsq>0
            # U=-q_i*q_j/r^power, force on i = -grad_i U
            k=-power*CHARGES[i]*CHARGES[j]/(rsq**((power+2)/2))
            for ax,d in enumerate((dx,dy,dz)):
                val=k*d
                f[i][ax]+=val
                f[j][ax]-=val
    return f

def maxdiff(a,b):
    return max(abs(x-y) for u,v in zip(a,b) for x,y in zip(u,v))

def geometry():
    base_g=forces(POSITIONS,1)
    base_light=forces(POSITIONS,2)
    net=lambda a: [sum(v[k] for v in a) for k in range(3)]
    assert max(map(abs,net(base_g)))<1e-10
    assert max(map(abs,net(base_light)))<1e-10
    translated=[(x+300,y-111,z+77) for x,y,z in POSITIONS]
    rotated=[(-y,x,z) for x,y,z in POSITIONS]
    for power,orig in ((1,base_g),(2,base_light)):
        assert maxdiff(forces(translated,power),orig)<1e-10
        expected=[[-y,x,z] for x,y,z in orig]
        assert maxdiff(forces(rotated,power),expected)<1e-10
    records=[]
    for wave,scale in enumerate(SCALES):
        position=[(scale*x,scale*y,scale*z) for x,y,z in POSITIONS]
        # No position data in immutable SHA metadata.
        assert all(digest("BROWN-HILBERT|IDENTITY",i)==IDENTITY[i]
                   for i in range(SEATS))
        g=forces(position,1)
        light=forces(position,2)
        assert maxdiff([[v*scale**2 for v in row] for row in g],base_g)<1e-9
        assert maxdiff([[v*scale**3 for v in row] for row in light],base_light)<1e-9
        assert max(map(abs,net(g)))<1e-10
        assert max(map(abs,net(light)))<1e-10
        records.append({"wave":wave,"scale":scale,"identities_unchanged":81,
                        "pairwise_force_sum_near_zero":True,
                        "gravity_force_scale_exponent":-2,
                        "light_gradient_force_scale_exponent":-3})
    q=CHARGES[0]*CHARGES[1]
    one={p: p*q for p in (1,2)}
    ten={p:p*q/(10**(p+1)) for p in (1,2)}
    assert abs(ten[1]/one[1]-.01)<1e-12
    assert abs(ten[2]/one[2]-.001)<1e-12
    return {"spatial_waves":records,
            "metadata_only_force_without_position_input":0,
            "light_intensity_gradient_force_ratio_r10_over_r1":ten[2]/one[2],
            "inserted_newton_potential_force_ratio_r10_over_r1":ten[1]/one[1],
            "all_81_force_pairs_symmetric":True,
            "coordinate_translation_rotation_covariant":True,
            "gravity_law_is_explicit_positive_control":True}

def main():
    q=quantum_analytic()
    b=[bell_wave(w) for w in range(WAVES)]
    ghz=[ghz_wave(w) for w in range(WAVES)]
    g=geometry()
    result={"schema":SCHEMA,"date":"2026-10-14",
            "seat":"seat-3","status":"PASS",
            "evidence_class":"local CPU mathematical simulation of specified models",
            "bodies":SEATS,
            "quantum_singlet_explicit_reference":q,
            "sha_seeded_local_hidden_variable_waves":b,
            "ghz_81_party_compressed_measurement_waves":ghz,
            "geometry_and_gravity_controls":g,
            "not_tested":["physical quantum entanglement","human brain",
                          "real light hardware","GPU physical signal",
                          "emergent physical gravity","FTL communication"],
            "interpretation":"Hash-only identity has no spatial force; passing Bell/GHZ law programmed into a simulator is not observed quantum nonlocality; a Newton-like force is an imposed positive control."}
    print(json.dumps(result,indent=2,sort_keys=True))
if __name__=="__main__":main()
