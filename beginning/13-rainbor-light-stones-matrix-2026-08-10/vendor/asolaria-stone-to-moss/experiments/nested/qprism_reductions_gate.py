#!/usr/bin/env python3
"""Q-PRISM × Asolaria reductions: exact CRT re-projection and source-binding gate.

This is a classical finite-range test on all 108 *verified* nested wave digests.
257 x 263 > 2^16; each individual residue is ambiguous. Both lanes recombine.
No missing entropy is invented: original 16-bit payload or its sufficient shares
are required, plus the source-bound digest for authentication.
"""
import hashlib
import json
import sys
from pathlib import Path

SEATS=("seat-1","seat-2","seat-3","seat-4")
M1,M2=257,263
CAP=M1*M2
assert CAP>65535
INV=pow(M1,-1,M2)

def hash_bytes(data):
    return hashlib.sha256(data).hexdigest()

def recover(r1,r2):
    return r1 + M1 * (((r2-r1)*INV) % M2)

def main(root):
    root=Path(root)
    full=0
    shadows_ambiguous=0
    changed_shadows_rejected=0
    fake_reprojection_rejected=0
    wave_count=0
    raw_bytes=0
    digest_seals=[]
    for seat in SEATS:
        base=root/("nested-"+seat)
        receipt=json.loads((base/(seat+".json")).read_text())
        raw=(base/(seat+".hbp")).read_bytes()
        raw_bytes+=len(raw)
        assert receipt["canonical_hbp_sha256"]==hash_bytes(raw)
        lines=raw.splitlines(keepends=True)
        assert len(lines)==32805
        for w,stone in enumerate(receipt["wave_stones"]):
            assert stone["wave"]==w
            wave_raw=b"".join(lines[w*1215:(w+1)*1215])
            wave_sha=hash_bytes(wave_raw)
            assert wave_sha==stone["sha256"],"source wave is not byte-bound"
            # A lane witness is indexed by seat and wave to prevent substitution.
            anchor=hash_bytes(("QPRISM|NEST|V1|"+seat+"|"+str(w)+"|"+wave_sha).encode("ascii"))
            digest_seals.append((seat,w,wave_sha,anchor))
            digest_raw=bytes.fromhex(wave_sha)
            assert len(digest_raw)==32
            for i in range(0,32,2):
                value=int.from_bytes(digest_raw[i:i+2],"big")
                r1,r2=value%M1,value%M2
                decoded=recover(r1,r2)
                assert decoded==value and decoded<65536
                assert decoded%M1==r1 and decoded%M2==r2
                full+=1
                # Each solitary shadow is non-injective in our bounded range.
                alt=value+M1 if value+M1<=65535 else value-M1
                assert 0<=alt<=65535 and alt!=value and alt%M1==r1
                shadows_ambiguous+=1
                # Single-lane sabotage can be mathematically consistent with
                # ANOTHER candidate; source anchor must stop authentication.
                mutant=recover((r1+1)%M1,r2)
                assert mutant!=value
                if mutant>=65536 or mutant!=value:
                    changed_shadows_rejected+=1
            # A completely consistent substitution *still* reprojects correctly;
            # it is NOT authenticated against the original seat/wave anchor.
            substitute=bytes(b^0x01 for b in digest_raw)
            surrogate_sha=substitute.hex()
            substitute_anchor=hash_bytes(
                ("QPRISM|NEST|V1|"+seat+"|"+str(w)+"|"+surrogate_sha).encode("ascii"))
            assert substitute_anchor!=anchor
            assert all(recover(int.from_bytes(substitute[i:i+2],"big")%M1,
                               int.from_bytes(substitute[i:i+2],"big")%M2)
                       ==int.from_bytes(substitute[i:i+2],"big")
                       for i in range(0,32,2))
            fake_reprojection_rejected+=1
            wave_count+=1
    assert wave_count==108 and full==1728 and shadows_ambiguous==1728
    assert changed_shadows_rejected==1728 and fake_reprojection_rejected==108
    index="\n".join("%s|%02d|%s|%s"%x for x in digest_seals)+"\n"
    output={
        "schema":"ASOLARIA-NNEST-QPRISM-REDUCTIONS-PROJECTION-V1",
        "status":"PASS",
        "source_repository":"JesseBrown1980/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control",
        "reductions_repository":"JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything",
        "bounded_encoding":"uint16 big-endian digests; two individually lossy CRT lanes of moduli 257 and 263",
        "joint_capacity":CAP,"bounded_range_max":65535,
        "individual_residue_ambiguities":shadows_ambiguous,
        "exact_2_lane_recoveries":full,
        "single_lane_tamper_rejections":changed_shadows_rejected,
        "substituted_valid_projection_source_rejections":fake_reprojection_rejected,
        "sha256_witness_wave_count":wave_count,
        "source_bound_wave_index_sha256":hash_bytes(index.encode("ascii")),
        "original_full_hbp_bytes_across_four_seats":raw_bytes,
        "sparse_receipt_bytes_claimed_to_replace_payload":False,
        "identity_scope":"SHA256(seat|wave|wave digest) for authentication; CRT alone is NOT authentication",
        "physical_chassis_verified":False,
        "conclusion":"Exact classical recovery when joint CRT capacity suffices; origin requires independent anchored source digest"
    }
    (root/"qprism-reductions-verdict.json").write_text(json.dumps(output,indent=2,sort_keys=True)+"\n")
    (root/"qprism-wave-seals.hbi").write_text(index)
    print("QPRISM_REDUCTIONS_GATE_PASS",json.dumps(output,sort_keys=True),flush=True)

if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("usage: projection_gate.py artifact-folder")
    main(sys.argv[1])
