#!/usr/bin/env python3
"""Third-party structural and SHA sidecar verification for V2 full HBP."""
import hashlib
import json
import sys
from pathlib import Path

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def check_sidecar(path):
    data=path.read_bytes()
    side=path.with_name(path.name+".sha256")
    expect=side.read_text("ascii").split()
    assert expect==[sha(data),path.name],str(side)
    return sha(data)

def verify(args):
    source=Path(args[0])
    peer=Path(args[1])
    summary_path=Path(args[2])
    peer_json=Path(args[3])
    out=Path(args[4])
    py=source.read_bytes()
    node=peer.read_bytes()
    assert py==node,"PYTHON_NODE_FULL_TRACE_MISMATCH"
    assert py.startswith(b"R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1")
    assert len(py)>1000000
    digest=check_sidecar(source)
    check_sidecar(summary_path)
    root=source.parent
    index=root/"rainbow27-v2.hbi"
    check_sidecar(index)
    assert ("HBP|sha256="+digest+"|bytes="+str(len(py))+"|json=0").encode() in index.read_bytes()
    data=json.loads(summary_path.read_bytes())
    assert data["trace_sha256"]==digest and data["trace_bytes"]==len(py)
    assert data["case_count"]==59049 and data["dark_held"]==2187
    assert data["normalized_signature_count_including_dark"]==7
    assert data["raw_signature_count"]==10
    assert data["raw_orbit_sizes"]==[1,1,1,3,3,3,3,3,3,6]
    assert data["normalized_orbit_sizes"]==[1,2,3,3,6,6,6]
    assert abs(data["normalized_conditional_entropy_bits"]-2.1495962969373235)<1e-10
    assert abs(data["raw_conditional_entropy_bits"]-1.6310777784188053)<1e-10
    assert abs(data["extra_conditional_entropy_bits"]-14/27)<1e-10
    assert data["ordered_id_reversible"] and data["scale_invariant"]
    assert not data["external_source_authenticated"] and not data["release_authorized"]
    assert not data["physical_optical_storage_verified"]
    assert sum(data["sampled_lane_counts"])+data["dark_held"]==59049
    assert all(data["negative_controls"].values())
    node_data=json.loads(peer_json.read_bytes())
    assert node_data["trace_sha256"]==digest and node_data["bytes"]==len(py)
    assert node_data["cases"]==59049 and node_data["dark"]==2187
    assert node_data["counts"]==data["sampled_lane_counts"]
    assert node_data["independent_source_sha256"]==data["source_fixture_sha256"]
    rows=py.decode("ascii").splitlines()
    assert len(rows)==59050,"Incorrect header/row count"
    counter=0
    counts=[0,0,0];held=0
    for w in range(27):
        for loc in range(81):
            for idx in range(27):
                counter+=1
                row=rows[counter]
                # Verify the claimed encoded identity, wave, and location are in exact order.
                fields=dict(part.split("=",1) for part in row.split("|")[1:])
                assert row.startswith("CASE|"),row[:90]
                assert fields["w"]==f"{w:02d}" and fields["loc"]==f"{loc:02d}"
                assert fields["id"]==f"{idx:02d}"
                assert fields["rgb"]==f"{idx//9}{(idx//3)%3}{idx%3}"
                prim=tuple(map(int,fields["prim"].split(",")))
                assert int(fields["den"])==sum(prim)
                if fields["lane"]=="H":
                    held+=1
                    assert idx==0 and prim==(0,0,0)
                else:
                    lane=int(fields["lane"])
                    assert 0<=lane<=2 and idx!=0
                    counts[lane]+=1
    assert counts==data["sampled_lane_counts"] and held==data["dark_held"]
    out.mkdir(parents=True,exist_ok=True)
    receipt={"verdict":"SOFTWARE_PASS","run_source_hbp_sha256":digest,
             "case_count":counter,"dark_held":held,"lane_counts":counts,
             "source_authenticated":False,"external_release_authorized":False,
             "physical_optical_memory":False}
    blob=(json.dumps(receipt,sort_keys=True,separators=(",",":"))+"\n").encode("ascii")
    target=out/"rainbow27-v2-peer-verification.json"
    target.write_bytes(blob)
    target.with_name(target.name+".sha256").write_text(
        sha(blob)+"  "+target.name+"\n","ascii")
    print(json.dumps(receipt,sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=6:
        raise SystemExit("usage: python verify_rainbow27_v2.py PY_HBP NODE_HBP PY_JSON NODE_JSON OUT")
    verify(sys.argv[1:])
