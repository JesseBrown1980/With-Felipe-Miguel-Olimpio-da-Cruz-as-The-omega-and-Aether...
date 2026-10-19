#!/usr/bin/env python3
"""Seal the byte-verified 81-body quantum/gravity CI outputs as new HBP/HBI stones.

Operates only on a local results.json from GitHub CI. Stdlib only, no network,
no credentials, create-only artifacts. Does not claim physical measurements.
"""
import argparse
import hashlib
import json
from pathlib import Path

DATE="2026-10-14"
RUN=38589387275
EXPECTED="f3c634d62c8ebb634aa6fbd04503f94c2bee3cc1269880a6b69b4db896234dd0"

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def create(out,name,data):
    file=out/name
    if file.exists() and file.read_bytes()!=data:
        raise RuntimeError("A sealed stone differs and must not be overwritten: "+name)
    if not file.exists():
        file.write_bytes(data)
    side=(sha(data)+"  "+name+"\n").encode("utf-8")
    sidecar=out/(name+".sha256")
    if sidecar.exists() and sidecar.read_bytes()!=side:
        raise RuntimeError("Checksum sidecar mismatch: "+name)
    if not sidecar.exists():
        sidecar.write_bytes(side)
    return sha(data)

def run(raw,out):
    assert sha(raw)==EXPECTED, "The two-run reference checksum changed"
    d=json.loads(raw)
    assert d["schema"]=="ASOLARIA-81-QUANTUM-GRAVITY-CPU-GATES-V1"
    assert d["bodies"]==81 and d["status"]=="PASS"
    assert len(d["sha_seeded_local_hidden_variable_waves"])==9
    assert len(d["ghz_81_party_compressed_measurement_waves"])==9
    assert len(d["geometry_and_gravity_controls"]["spatial_waves"])==9
    summary={
     "schema":"ASOLARIA-81-QUANTUM-GRAVITY-COMPUTATIONAL-GATES-RECEIPT-V1",
     "date":DATE,"status":"PASS","seat":"seat-3",
     "evidence_class":"deterministic CPU simulation; programmed quantum and imposed gravity are controls",
     "bodies":81,"wave_count":9,
     "Q1":{"classical_chsh_nine_waves":[v["chsh"] for v in d["sha_seeded_local_hidden_variable_waves"]],
           "events_per_setting_per_wave":4096,
           "explicit_quantum_reference_chsh":d["quantum_singlet_explicit_reference"]["chsh"],
           "quantum_reference_is_programmed":True},
     "Q2":{"GHZ_site_count":81,"wave_count":9,"shots_per_assignment":1024,
           "maximum_marginal_deviation":max(
            max(row["max_single_site_marginal_deviation"] for row in w["basis_controls"].values())
            for w in d["ghz_81_party_compressed_measurement_waves"]),
           "entanglement_certified":False},
     "G1":{"spatial_scales":[w["scale"] for w in d["geometry_and_gravity_controls"]["spatial_waves"]],
           "hash_identity_stable":True,
           "metadata_only_force":0,
           "imposed_gravity_10x_force_ratio":0.01,
           "imposed_light_gradient_10x_force_ratio":0.001,
           "gravity_emergence_observed":False},
     "source_sha":"ea1acf806cab17c25d493db307f9de79efdcf19d",
     "ci_run":RUN,"ci_python311":"PASS","ci_python313":"PASS",
     "full_results_sha256":EXPECTED,
     "limits":["no real quantum/gravity/GPU/light/brain experiment",
               "GHZ restricted basis sampler is not an entanglement witness",
               "no physical faster-than-light signal measured"]
    }
    out.mkdir(parents=True,exist_ok=True)
    raw_name="quantum-gravity-81-full-CI-result.json"
    compact_name="quantum-gravity-81-compact-receipt.json"
    raw_sha=create(out,raw_name,raw)
    compact_sha=create(out,compact_name,(json.dumps(summary,indent=2,sort_keys=True)+"\n").encode())
    hbp_name="stone-seat3-81-quantum-gravity-2026-10-14.hbp"
    hbp="\n".join([
     "STONE|schema=ASOLARIA-QG81-SEAT3-V1|date=2026-10-14|seat=seat-3|kind=CPU_CONSTRUCTED_CONTROLS|json=0",
     "PREREG|path=experiments/PREREG-81-quantum-gravity-gates-2026-10-14.md|json=0",
     "SOURCE|path=experiments/test_81_quantum_gravity_controls.py|commit=ea1acf806cab17c25d493db307f9de79efdcf19d|json=0",
     f"RECEIPT|name={compact_name}|sha256={compact_sha}|json=0",
     f"FULL_ARTIFACT|name={raw_name}|sha256={raw_sha}|json=0",
     "CI|run=38589387275|python_3.11=PASS|python_3.13=PASS|byte_identical=1|json=0",
     "BELL_LOCAL|waves=9|events_per_setting=4096|CHSH_each=2.000|json=0",
     "BELL_REFERENCE|model=EXPLICIT_QUANTUM_SINGLET|CHSH=2.82842712474619|measured_quantum=0|json=0",
     "GHZ|sites=81|waves=9|shots_per_basis_per_wave=1024|entanglement_witness=0|json=0",
     "FORCE|sites=81|spatial_waves=9|hash_only_force=0|inserted_newton_r10_ratio=0.01|inserted_light_gradient_r10_ratio=0.001|json=0",
     "LIMIT|physical_gravity=NOT_TESTED|quantum_hardware=NOT_TESTED|real_GPU=NOT_TESTED|FTL=NOT_ESTABLISHED|json=0",
     "CONCLUSION|class=SOFTWARE_CONTROL_GATES|emergent_quantum_or_gravity=NOT_DEMONSTRATED|json=0",
    ])+"\n"
    hbp_sha=create(out,hbp_name,hbp.encode())
    hbi_name="stone-seat3-81-quantum-gravity-2026-10-14.hbi"
    hbi="\n".join([
     "STONEIDX|schema=ASOLARIA-QG81-SEAT3-INDEX-V1|date=2026-10-14|json=0",
     f"ARTIFACT|name={hbp_name}|sha256={hbp_sha}|json=0",
     f"RECEIPT|name={compact_name}|sha256={compact_sha}|json=0",
     f"CI_RESULT|name={raw_name}|sha256={raw_sha}|json=0",
     "CI|run=38589387275|jobs=2|success=2|json=0"
    ])+"\n"
    create(out,hbi_name,hbi.encode())
    print(json.dumps({"status":"SEALED","hbp":hbp_name,"hbi":hbi_name,
      "full_result_sha256":raw_sha,"compact_sha256":compact_sha}))

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",type=Path,required=True)
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    run(args.input.read_bytes(),args.out)
