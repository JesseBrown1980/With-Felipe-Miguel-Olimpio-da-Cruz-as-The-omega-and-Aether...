#!/usr/bin/env python3
"""Seat 2 independent *row-action* GF(2) replay of Seat 1 frozen 32805 challenge.

Unlike the published Seat 1 column matrix and Seat 3 cyclic polynomial,
this implementation directly powers 81 output-bit parity masks (row
operators). Inputs and output serialization remain byte-pinned to the
original PUBLIC Seat 1 triad challenge. Computational software only.
"""
import argparse
import hashlib
import json
from pathlib import Path

N = 81
MASK = (1 << N) - 1
T = 10**13
HORIZONS = (T, T+1, T+81)
LAWS = ((0,1),(0,2),(0,1,3),(0,4,7),(0,1,5,9))
TIMES = ("past","now","future")
COLORS = ("R","G","B")
SPACES = ("x","y","z")
SCHEMA = "ASOLARIA-SEAT1-TRIAD-27WAVE-3HORIZON-V1"
CHALLENGE_SHA256 = "e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
FULL_SHA256 = "720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3"
SUMMARY_SHA256 = "1db6389ba110e8b835e504deebc177e163f8b085d5a48cb47215bb372468700e"
FULL_BYTES = 6392029

def sha(data):
    return hashlib.sha256(data).hexdigest()

def identity():
    return tuple(1 << i for i in range(N))

def direct_rows(taps):
    # A rule with left cyclic rotations by t transforms output bit i
    # using input bit (i-t)%81; rows are input dependency masks.
    return tuple(sum(1 << ((i-t) % N) for t in taps) for i in range(N))

def action(rows, state):
    # Output i is the GF(2) parity of input bits selected by row i.
    return sum(((dependency & state).bit_count() & 1) << i
               for i,dependency in enumerate(rows))

def chain(after, before):
    # Row-action composition AFTER(BEFORE(x)).
    output=[]
    for row in after:
        row_value=0
        while row:
            bit=row&-row
            row_value ^= before[bit.bit_length()-1]
            row ^= bit
        output.append(row_value)
    return tuple(output)

def leap(taps, count):
    powered=direct_rows(taps)
    current=identity()
    while count:
        if count & 1:
            current=chain(powered,current)
        powered=chain(powered,powered)
        count >>= 1
    return current

def rotate(x,k=1):
    k%=N
    return (((x << k) | (x >> (N-k))) & MASK) if k else x

def challenge(path):
    source=Path(path).read_bytes()
    assert sha(source)==CHALLENGE_SHA256, "challenge file drift"
    c=json.loads(source)
    assert c["schema"]==SCHEMA and c["classification"]=="PUBLIC_SOFTWARE_CHALLENGE_NOT_PHYSICAL_HOST"
    assert c["nonce"]=="eff1eda90f40cd6fa1e9e9f22e34ecf3"
    assert c["source_commit"]=="d092bcc06908a5f5864eada406d5b3ddf4933a5d"
    assert c["waves"]==27 and c["bodies"]==N
    assert c["base_horizon"]==T and c["horizons"]==list(HORIZONS)
    assert c["laws"]==[list(x) for x in LAWS]
    assert c["time"]==list(TIMES) and c["color"]==list(COLORS) and c["space"]==list(SPACES)
    return c

def verify_summary(receipt_path,sidecar_path):
    receipt=Path(receipt_path).read_bytes()
    actual=sha(receipt)
    sidecar=Path(sidecar_path).read_text(encoding="ascii").strip().split()
    assert len(receipt)==1134 and actual==SUMMARY_SHA256
    assert sidecar[0]==actual, "summary sidecar mismatch"
    assert sidecar[-1]=="seat-1-20261014-triad27-three-horizon.hbp"
    assert ("sha256="+FULL_SHA256).encode() in receipt
    assert b"hbp_full_bytes=6392029" in receipt
    return actual

def small_step_controls():
    observed=0
    for taps in LAWS:
        for horizon in (0,1,2,3,9,21):
            precomputed=leap(taps,horizon)
            direct=direct_rows(taps)
            for bit in (0,1,40,80):
                slow=1<<bit
                for _ in range(horizon):
                    slow=action(direct,slow)
                assert action(precomputed,1<<bit)==slow
                observed+=1
    assert observed==120
    return observed

def replay(c,output):
    counter=linearity=successor=plus81=rotation=0
    writer=hashlib.sha256()
    written=0
    with open(output,"wb") as target:
        def emit(s):
            nonlocal written
            line=(s+"\n").encode("ascii")
            target.write(line)
            writer.update(line)
            written+=len(line)
        emit(f"PORTAL|schema={SCHEMA}|challenge_sha256={CHALLENGE_SHA256}|nonce={c['nonce']}|waves=27|bodies=81|laws=5|horizons=3|json=0")
        for li,taps in enumerate(LAWS):
            future=[leap(taps,h) for h in HORIZONS]
            next_step=direct_rows(taps)
            step81=leap(taps,81)
            for w in range(27):
                ti=TIMES[w//9]
                color=COLORS[(w//3)%3]
                space=SPACES[w%3]
                for body in range(N):
                    data=f"ASOLARIA|SEAT1|TRIAD|V1|{c['nonce']}|{ti}|{color}|{space}|{body}".encode("ascii")
                    original=(int.from_bytes(hashlib.sha256(data).digest(),"big")&MASK)^(1<<body)
                    flip=1<<((body+w)%N)
                    values=[]
                    for horizon,rows in enumerate(future):
                        state=action(rows,original)
                        delta=action(rows,flip)
                        assert action(rows,original^flip)==state^delta
                        values.append(state)
                        fields=f"{li}|{w}|{ti}|{color}|{space}|{body}|{horizon}|{state:021x}|{delta:021x}"
                        tag=sha(("ROW|"+fields).encode("ascii"))
                        emit(f"WAVE|law={li}|wave={w}|time={ti}|color={color}|space={space}|body={body}|horizon={horizon}|state={state:021x}|delta={delta:021x}|sha={tag}|json=0")
                        counter+=1
                        linearity+=1
                    assert action(next_step,values[0])==values[1]
                    successor+=1
                    assert action(step81,values[0])==values[2]
                    plus81+=1
                    assert action(future[0],rotate(original))==rotate(values[0])
                    rotation+=1
        emit("END|rows=32805|linearity=32805|successor=10935|plus81=10935|rotation=10935|physical_tested=0|json=0")
    result=writer.hexdigest()
    assert (counter,linearity,successor,plus81,rotation)==(32805,32805,10935,10935,10935)
    assert written==FULL_BYTES, f"output byte count drift {written}"
    assert result==FULL_SHA256, f"full output SHA drift {result}"
    return counter,linearity,successor,plus81,rotation,written,result

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("challenge")
    parser.add_argument("compact_receipt")
    parser.add_argument("compact_receipt_sidecar")
    parser.add_argument("output_hbp")
    parser.add_argument("output_json")
    args=parser.parse_args()
    c=challenge(args.challenge)
    summary_sha=verify_summary(args.compact_receipt,args.compact_receipt_sidecar)
    smallsteps=small_step_controls()
    rows,linearity,successor,plus81,rotation,length,digest=replay(c,args.output_hbp)
    receipt={
        "schema":"ASOLARIA-SEAT2-ORIGINAL-SEAT1-32805-ROW-ACTION-REPLAY-V1",
        "seat":"seat-2 computational; distinct from original Seat 2 signer",
        "evidence":"independent 81-bit row-mask GF2 power and parity checks, software only",
        "original_challenge_sha256":CHALLENGE_SHA256,
        "original_challenge_git_blob_sha1":"b098e2ce7c9878434bea7b7bf34202ed492e4548",
        "original_challenge_source_commit":"d092bcc06908a5f5864eada406d5b3ddf4933a5d",
        "replayed_hbp_bytes":length,
        "replayed_hbp_sha256":digest,
        "compact_original_receipt_bytes":1134,
        "compact_original_receipt_sha256":summary_sha,
        "record_count":rows,
        "linearity_controls":linearity,
        "successor_controls":successor,
        "plus81_controls":plus81,
        "rotation_controls":rotation,
        "small_step_controls":smallsteps,
        "physical_host_independence_verified":False,
        "fresh_physical_three_host_challenge_issued":False,
        "brown_hilbert_uncoloured_free_centre_distinct_from_computational_81":True,
        "result":"PASS_FROZEN_SEAT1_SOFTWARE_REPLAY",
    }
    Path(args.output_json).write_text(json.dumps(receipt,sort_keys=True,indent=2)+"\n",encoding="utf8")
    print(json.dumps(receipt,sort_keys=True))

if __name__=="__main__":
    main()
