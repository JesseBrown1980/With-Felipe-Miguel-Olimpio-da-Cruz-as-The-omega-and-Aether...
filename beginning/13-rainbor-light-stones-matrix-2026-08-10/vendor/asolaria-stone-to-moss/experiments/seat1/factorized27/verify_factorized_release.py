#!/usr/bin/env python3
"""Reject any cross-language/cross-OS drift and verify fixed input roots."""
import hashlib
import json
from pathlib import Path
import sys

REFERENCE={
    "original-evidence/lightbank-memories.json":"02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22",
    "rainbow-evidence/rainbow7-bank.jsonl":"52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345",
    "rainbow-evidence/rainbow7-index.hbi":"6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee",
    "expanded-evidence/ordered27-rainbow7-index.hbi":"2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e"
}
RESULTS=["factorized27.json","factorized27.hbp","factorized27.json.sha256","factorized27.hbp.sha256"]
def digest(blob):
    return hashlib.sha256(blob).hexdigest()
def inspect(root):
    root=Path(root)
    for name,expected in REFERENCE.items():
        b=(root/name).read_bytes()
        assert digest(b)==expected,(name,"PINNED_SOURCE_DRIFT",digest(b))
    for name in RESULTS:
        assert (root/"python-evidence"/name).read_bytes()==(root/"node-evidence"/name).read_bytes(),("PY_NODE_DRIFT",name)
    for origin in ("python-evidence","node-evidence"):
        where=root/origin
        for name in ("factorized27.json","factorized27.hbp"):
            b=(where/name).read_bytes()
            parts=(where/(name+".sha256")).read_text("ascii").split()
            assert len(parts)==2 and parts[0]==digest(b) and parts[1]==name,("BAD_SIDECAR",origin,name)
        obj=json.loads((where/"factorized27.json").read_text("ascii"))
        for key,val in {
            "logical_addresses":15309,"stored_bank_rows":567,"original_memories":81,
            "expanded_index_bytes":2344761,"factorized_base_index_bytes":70043,
            "avoided_repeated_index_bytes":2274718,"retained_bank_bytes":184815,
            "negative_faults_rejected":12,"payload_compression_bytes":0,
            "external_origin_authenticated":False,"physical_optical_memory_verified":False,
            "release_authorized":False,"quantum_effect_verified":False
        }.items():
            assert obj[key]==val,(origin,key,obj.get(key))
        assert obj["legacy_expanded_index_sha256"]==REFERENCE["expanded-evidence/ordered27-rainbow7-index.hbi"]
    return digest((root/"python-evidence/factorized27.hbp").read_bytes())
def main():
    if len(sys.argv) not in (2,3):
        raise SystemExit("usage: verify_factorized_release.py os-artifact-directory [other-os-directory]")
    left=Path(sys.argv[1])
    h1=inspect(left)
    if len(sys.argv)==3:
        right=Path(sys.argv[2])
        h2=inspect(right)
        assert h1==h2,"CROSS_OS_RECEIPT_DRIFT"
        for name in RESULTS:
            assert (left/"python-evidence"/name).read_bytes()==(right/"python-evidence"/name).read_bytes(),("CROSS_OS_DRIFT",name)
        assert (left/"original-evidence/lightbank-memories.json").read_bytes()==(right/"original-evidence/lightbank-memories.json").read_bytes()
        assert (left/"rainbow-evidence/rainbow7-bank.jsonl").read_bytes()==(right/"rainbow-evidence/rainbow7-bank.jsonl").read_bytes()
        assert (left/"rainbow-evidence/rainbow7-index.hbi").read_bytes()==(right/"rainbow-evidence/rainbow7-index.hbi").read_bytes()
    print(json.dumps({"status":"PASS","reconstructed_addresses":15309,
                      "receipt_sha256":h1,"cross_os_checked":len(sys.argv)==3,
                      "physical_light_measured":False},sort_keys=True))
if __name__=="__main__":main()
