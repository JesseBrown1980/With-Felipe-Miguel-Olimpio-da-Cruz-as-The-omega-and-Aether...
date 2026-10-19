#!/usr/bin/env python3
"""Seat 2 independent read-only verification of Seat 3 PR #19's full recovery HBP.

Separate 81-bit cyclic-polynomial evolution and Gauss-Jordan reconstruction.
Checks every published record, its public fixture-derived source pair, output,
certificate, rank, inverse reconstruction, expected record order and SHA-256.
Not a challenge reveal, physical-host check, or claim of information preservation.
"""
import argparse
import hashlib
import json
from pathlib import Path

N = 81
MASK = (1 << N) - 1
LOW = (1 << 80) - 1
TAPS = [[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]
HORIZONS = [10**13, 10**13+1, 10**13+81]
EXPECTED_HASH = "08fc44cd8e5c2e41ce2dadf55ab96edacbbe11435ce4b21d436ae5e602d23c9d"
EXPECTED_ROWS = 131220
EXPECTED_SIZE = 25063020

def rotate(v,k):
    k %= N
    return ((v << k) | (v >> (N-k))) & MASK if k else v

def mul(a,b):
    out = 0
    while b:
        v = b & -b
        out ^= rotate(a,v.bit_length()-1)
        b ^= v
    return out

def fast_forward(taps,steps):
    p = sum(1 << i for i in taps)
    out = 1
    while steps:
        if steps & 1:
            out = mul(out,p)
        p = mul(p,p)
        steps >>= 1
    return out

def inverse_from_columns(columns):
    """Return inverse rows of 81x81 GF(2) map, using a distinct row-reduction."""
    rows = []
    for output_index in range(N):
        bits = 0
        for source_index, column in enumerate(columns):
            bits |= ((column >> output_index) & 1) << source_index
        rows.append(bits | (1 << (N+output_index)))
    for col in range(N):
        pivot = next((r for r in range(col,N) if rows[r] & (1 << col)),None)
        if pivot is None:
            raise AssertionError("augmented inverse is singular")
        rows[col],rows[pivot] = rows[pivot],rows[col]
        for r in range(N):
            if r != col and rows[r] & (1<<col):
                rows[r] ^= rows[col]
    assert [r & MASK for r in rows] == [1<<i for i in range(N)]
    return [r >> N for r in rows]

def recover(invrows,certificate):
    value = 0
    for source_bit,row in enumerate(invrows):
        value |= ((row & certificate).bit_count() & 1) << source_bit
    return value

def expected_source(f,seat,ti,color,space,body):
    fields = [f["domain"],f["public_challenge_nonce"],f["public_challenge_blob"],
              seat[0],seat[1],seat[2],ti,color,space,str(body)]
    digest = hashlib.sha256("|".join(fields).encode("ascii")).digest()
    return (int.from_bytes(digest,"big") & MASK) ^ (1<<body)

def parse(line):
    parts=line.rstrip("\n").split("|")
    assert parts[0]=="W" and len(parts)==13, ("invalid record shape",parts[:3])
    data=dict(x.split("=",1) for x in parts[1:])
    assert len(data)==12, "duplicate field"
    return data

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--fixture",required=True)
    parser.add_argument("--stone",required=True)
    parser.add_argument("--python",dest="python_result",required=True)
    parser.add_argument("--node",dest="node_result",required=True)
    parser.add_argument("--report",required=True)
    args=parser.parse_args()
    f=json.loads(Path(args.fixture).read_text(encoding="utf8"))
    stone=json.loads(Path(args.stone).read_text(encoding="utf8"))
    assert f["schema"] == "ASOLARIA-SEAT3-ONE-BIT-RECOVERY-FIXTURE-V2"
    assert f["laws"]==TAPS and f["horizons"]==HORIZONS
    assert len(f["seats"])==4 and f["wave_count"]==27 and f["bodies"]==81
    assert f["public_seed_only"] is True and f["fresh_physical_challenge"] is False and f["physical_hosts_verified"]==0
    assert stone["new_result_hbp_sha256"]==EXPECTED_HASH
    assert stone["new_result_hbp_bytes"]==EXPECTED_SIZE
    assert stone["fresh_shared_challenge_issued"] is False and stone["physical_host_attested"] is False
    pydata=Path(args.python_result).read_bytes()
    nddata=Path(args.node_result).read_bytes()
    assert len(pydata)==len(nddata)==EXPECTED_SIZE
    assert pydata==nddata, "Independent Python/Node full HBP byte mismatch"
    assert hashlib.sha256(pydata).hexdigest()==EXPECTED_HASH, "Pinned full HBP digest mismatch"
    assert pydata.endswith(b"\n") and b"\r" not in pydata

    engine={}
    ranks=[]
    for li,taps in enumerate(TAPS):
        rank=80 if len(taps)%2==0 else 81
        ranks.append(rank)
        for h in HORIZONS:
            op=fast_forward(taps,h)
            assert mul(op,MASK)==(0 if rank==80 else MASK)
            columns=[rotate(op,j) for j in range(N)]
            if rank==80:
                augmented=[(v&LOW)|((j==0)<<80) for j,v in enumerate(columns)]
            else:
                augmented=columns
            inverses=inverse_from_columns(augmented)
            for j in range(N):
                assert recover(inverses,augmented[j])==(1<<j)
            engine[li,h]=(op,rank,inverses)

    count=loss=full=0
    # Verify every line, input state, both source preimages, certificate and inverse.
    lines=iter(pydata.decode("ascii").splitlines(keepends=True))
    for w in range(27):
        ti=f["time"][w//9]
        co=f["color"][(w//3)%3]
        sp=f["space"][w%3]
        for seat in f["seats"]:
            for body in range(81):
                x=expected_source(f,seat,ti,co,sp,body)
                y=x^MASK
                assert x!=y
                for li in range(5):
                    for h in HORIZONS:
                        ln=next(lines)
                        got=parse(ln)
                        op,rank,inverses=engine[li,h]
                        a=mul(op,x)
                        b=mul(op,y)
                        if rank==80:
                            assert a==b and a.bit_count()%2==0
                            ca=(a&LOW)|((x&1)<<80)
                            cb=(b&LOW)|((y&1)<<80)
                            assert ca!=cb
                            loss+=2
                        else:
                            assert a!=b
                            ca,cb=a,b
                            full+=2
                        assert recover(inverses,ca)==x
                        assert recover(inverses,cb)==y
                        expected = {
                            "seat":seat[0], "w":f"{w:02d}","body":f"{body:02d}",
                            "law":str(li),"h":str(h),"rank":str(rank),
                            "fa":f"{a:021x}","fb":f"{b:021x}",
                            "cert_a":f"{ca:021x}","cert_b":f"{cb:021x}",
                            "recovered":"2","extra_bits":str(81-rank),
                        }
                        assert got==expected, ("record mismatch",count,got,expected)
                        count+=1
    assert next(lines,None) is None
    assert count==EXPECTED_ROWS and loss==157464 and full==104976
    assert count*2==262440
    # A one-byte flip must be rejected by the full-content checksum.
    changed=bytearray(pydata)
    changed[0]^=1
    assert hashlib.sha256(changed).hexdigest()!=EXPECTED_HASH
    # A wrong retained source bit must select a different valid preimage.
    op,rank,inv=engine[0,HORIZONS[0]]
    x=expected_source(f,f["seats"][0],f["time"][0],f["color"][0],f["space"][0],0)
    v=mul(op,x)
    certificate=(v&LOW)|((x&1)<<80)
    assert recover(inv,certificate)==x
    assert recover(inv,certificate^(1<<80))!=x
    result = {
        "schema":"ASOLARIA-SEAT2-INDEPENDENT-PR19-REPLAY-V1",
        "status":"PASS",
        "seat":"seat-2 computational cross-check, not the original Seat 2 signer",
        "source_pr":19,
        "source_head_sha":"3fd5b0a0d6c3cb57bd00366b1ef9a72f6dc300d7",
        "modeled_horizons":HORIZONS,
        "original_pair_rows":count,
        "reconstructed_original_states":count*2,
        "sidebit_one":loss,
        "sidebit_zero":full,
        "independent_python_node_byte_match":True,
        "independent_polynomial_and_augmented_inverse_full_row_check":True,
        "output_hbp_sha256":EXPECTED_HASH,
        "output_hbp_bytes":EXPECTED_SIZE,
        "negative_one_byte_and_wrong_sidebit_checks_pass":True,
        "physical_host_independently_verified":False,
        "fresh_blinded_cross_machine_challenge":False,
        "brown_hilbert_free_centre_not_one_of_81_addresses":True,
        "original_seat2_signed_bytes_ambiguity_unresolved":True,
    }
    Path(args.report).write_text(json.dumps(result,indent=2,sort_keys=True)+"\n",encoding="utf8")
    print("PASS_SEAT2_INDEPENDENT_PR19_131220_262440_SHA256")

if __name__=="__main__":
    main()
