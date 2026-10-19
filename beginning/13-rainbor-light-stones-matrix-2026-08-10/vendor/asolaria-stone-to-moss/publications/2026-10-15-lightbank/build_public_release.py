#!/usr/bin/env python3
"""Build a public computational Asolaria evidence preprint from pinned CI downloads.
Run only AFTER original public run archives have been checked; this script never
changes the original research PRs, experimental logs, or human release gates.
"""
from __future__ import annotations
import argparse,hashlib,json,os
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED,ZipInfo

FIXED={
  "producer/cases.hbp":"dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09",
  "seat2/seat2-independent-result.json":"eeefd8e355788e762f18744604ac2635464cf80a1f197bee92261071d2c38c46",
  "seat3/peer-original-cases.hbp":"dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09",
  "unified/round3-python.hbp":"b4672f15a1003ef1714073eb0664942921f15b6ea8588a39701a42fc9485f8a9",
  "unified/round3-node.hbp":"b4672f15a1003ef1714073eb0664942921f15b6ea8588a39701a42fc9485f8a9",
  "unified/round3-resume.hbp":"f6599677f934509604bcbf0f3a1913ce3f473223cbb08504ef7271e078c55d5f",
  "seat4/banks/source.archive":"2f3a0b27a50a562205a500dd7e38e4318f658cdd05202a4b88312c812ae7ba30",
}
BASE="ASOLARIA-ROUND3-COMPUTATIONAL-PREPRINT-2026-10-15"
RUNS={
 "producer":38735582094,"seat2":38741832217,"seat3":38741669991,
 "unified":38734762647,"seat4":38734811934
}
EXPECTED_SOURCE="fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4"

def sha(b):return hashlib.sha256(b).hexdigest()
def release_bytes(root:Path,notes:bytes):
    paths={p.relative_to(root).as_posix():p for p in root.rglob("*") if p.is_file()}
    for rel,expected in FIXED.items():
      assert rel in paths, f"MISSING_PINNED_ARTIFACT: {rel}"
      assert sha(paths[rel].read_bytes())==expected, f"PINNED_ARTIFACT_MISMATCH: {rel}"
    expected_pngs=[p for x,p in paths.items() if x.startswith("producer/rgb/") and x.endswith(".png")]
    assert len(expected_pngs)==11, ("EXPECTED_11_ORIGINAL_QR_PNGS",len(expected_pngs))
    receipt=json.loads(paths["producer/results.json"].read_text())
    assert receipt["fixture_sha256"]==EXPECTED_SOURCE
    assert receipt["qr_memory"]["actual_separate_plane_decodes"]==32
    seat2=json.loads(paths["seat2/seat2-independent-result.json"].read_text())
    assert seat2["status"]=="SEAT2_DIGITAL_PROVENANCE_PASS_WITH_LIMITATIONS"
    peer=json.loads(paths["seat3/peer-results.json"].read_text())
    assert peer["status"]=="PASS" and peer["total_packet_cases"]==52488
    fileinfo={}
    for rel,path in sorted(paths.items()):
      fileinfo[rel]={"size_bytes":path.stat().st_size,"sha256":sha(path.read_bytes())}
    manifest={"schema":"asolaria-computational-preprint-v1",
     "publication_date":"2026-10-15","classification":"COMPUTATIONAL_ONLY",
     "public_demo":"https://jessebrown1980.github.io/light-boat-engine-ships-with-oils/asolaria-lightbank-demo/",
     "recorded_sources":RUNS,"files":fileinfo,
     "no_physical_optical_storage":True,"no_calibrated_biology":True,
     "no_external_source_authentication":True,"four_seat_accepted":False,
     "source_QR_sha256":EXPECTED_SOURCE,"source_QR_image_count":11}
    manifest_bytes=(json.dumps(manifest,indent=2,sort_keys=True)+"\n").encode()
    sidecars="".join(f"{x['sha256']}  data/{rel}\n" for rel,x in sorted(fileinfo.items())).encode()
    source=(b"Asolaria Public Digital Computational Preprint - October 15 2026\n"
        b"This archive contains historical verified GitHub Actions artifacts, not physical photon storage.\n"
        b"Original research pull requests remain unmerged and physical validation gates remain open.\n"
        b"Read RELEASE-NOTES.md, manifest.json and SHA256SUMS before interpreting the evidence.\n")
    return paths,manifest_bytes,sidecars,source,notes,manifest

def build(stage:Path, out:Path,notes:Path):
    paths,manifest,checksums,readme,notes_bytes,meta=release_bytes(stage,notes.read_bytes())
    out.mkdir(parents=True,exist_ok=True)
    name=BASE+".zip"
    target=out/name
    with ZipFile(target,"w",compression=ZIP_DEFLATED,compresslevel=6,allowZip64=True) as archive:
      allfiles={f"data/{n}":p.read_bytes() for n,p in paths.items()}
      allfiles.update({"README.txt":readme,"RELEASE-NOTES.md":notes_bytes,
                       "manifest.json":manifest,"SHA256SUMS":checksums})
      for n,data in sorted(allfiles.items()):
        info=ZipInfo(n,date_time=(2026,10,15,12,0,0))
        info.compress_type=ZIP_DEFLATED
        info.external_attr=(0o100644<<16)
        archive.writestr(info,data,compress_type=ZIP_DEFLATED,compresslevel=6)
    whole=sha(target.read_bytes())
    sidecar=out/(name+".sha256")
    sidecar.write_text(whole+"  "+name+"\n")
    for extra in ("manifest.json","SHA256SUMS","RELEASE-NOTES.md"):
        (out/extra).write_bytes({"manifest.json":manifest,
           "SHA256SUMS":checksums,"RELEASE-NOTES.md":notes_bytes}[extra])
    print(json.dumps({"status":"PASS_RELEASE_REPRODUCTION","file_count":len(paths),
      "release_asset":target.name,"release_bytes":target.stat().st_size,
      "release_sha256":whole,"manifest_sha256":sha(manifest),
      "source_fixture_sha256":EXPECTED_SOURCE},sort_keys=True))

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--stage",type=Path,required=True)
    ap.add_argument("--out",type=Path,required=True)
    ap.add_argument("--notes",type=Path,required=True)
    a=ap.parse_args()
    build(a.stage,a.out,a.notes)
