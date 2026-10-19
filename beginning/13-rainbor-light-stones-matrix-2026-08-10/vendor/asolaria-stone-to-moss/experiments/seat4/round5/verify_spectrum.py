#!/usr/bin/env python3
"""Independent Python Ed25519 readback, not signer-code import or optical proof."""
from __future__ import annotations
import hashlib, json, math, sys
from collections import Counter
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature

BANDS=("red","orange","yellow","green","blue","indigo","violet")
PORTS=(2,5,0,6,1,4,3)
EPOCH=20261015
NONCE="SEAT4-R5-REPRODUCIBLE-TEST-NONCE-NOT-UNPREDICTABLE"
ROOTS={
 "source":"02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22",
 "bank":"52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345",
 "index":"6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee",
 "aliases":"2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e"}
AUTH="9c64cddd3be7b57eb498f3809f78a346fa3e4ce5bc80869adb867edec8b21c6f"
WIT="eba347587f749f6a0e58e7a6be83081cf1a204e880fe527f82a38063f1da1a0d"
D_AUTH="ASOLARIA-SEAT4-AUTH-MAP-V1\n"
D_WIT="ASOLARIA-SEAT4-OBS-V1\n"

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def require(condition:bool,reason:str):
 if not condition:raise ValueError(reason)
def canon(o)->str:
 return json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def signable(domain,obj)->bytes:
 return (domain+canon(obj)+"\n").encode("utf-8")
def verify(pub,domain,obj,signature):
 import base64
 try:
  Ed25519PublicKey.from_public_bytes(bytes.fromhex(pub)).verify(base64.b64decode(signature,validate=True),signable(domain,obj))
 except (InvalidSignature,ValueError,TypeError):
  raise ValueError("UNTRUSTED_ED25519_SIGNATURE")
def source_rows(root):
 names={"source":("base-evidence/lightbank-memories.json",16689),
        "bank":("rainbow-evidence/rainbow7-bank.jsonl",184815),
        "index":("rainbow-evidence/rainbow7-index.hbi",70043),
        "aliases":("ordered-evidence/ordered27-rainbow7-index.hbi",2344761)}
 sources={}
 for key,(relative,length) in names.items():
  data=(root/relative).read_bytes()
  require(len(data)==length and sha(data)==ROOTS[key],"FROZEN_SOURCE_MISMATCH_"+key)
  sources[key]=data
 original=json.loads(sources["source"])["records"]
 require(len(original)==81,"SOURCE_MEMORY_COUNT")
 rows={}
 for line in sources["index"].decode("ascii").splitlines():
  parts=line.split("|")
  require(parts[0]=="MEM" and len(parts)==6,"INDEX_FORMAT")
  d=dict(pair.split("=",1) for pair in parts[1:])
  band=d["band"];site=int(d["id"].split("-")[-1])
  require(band in BANDS and 0<=site<81,"BANK_ROW_ADDRESS")
  start=int(d["offset"]);n=int(d["length"])
  require(start>=0 and n>0 and start+n<=len(sources["bank"]),"BANK_INDEX_BOUNDS")
  item=sources["bank"][start:start+n]
  require(sha(item)==d["sha256"],"BANK_ROW_DIGEST")
  require(json.loads(item)["record"]==original[site],"ORIGINAL_SOURCE_CONTENT")
  require((band,site) not in rows,"DUPLICATE_BANK_ROW")
  rows[(band,site)]=d["sha256"]
 require(len(rows)==567,"BANK_ENTRIES_NOT_567")
 return rows
def tag(entry,sector,site,band,port):
 elements=[ROOTS["bank"],str(sector),str(site),band,str(port),entry,str(EPOCH),NONCE]
 return sha(("ASOLARIA-SEAT4-OBS-TAG-V1|"+"|".join(elements)).encode("utf-8"))
def validate(manifest,frames,rows):
 require(manifest["authority_pubkey_hex"]==AUTH and manifest["witness_pubkey_hex"]==WIT,"TRUSTED_PUBKEY_PIN")
 m=manifest["payload"]
 require(set(m)=={"schema","source81_sha256","source_bank_sha256","base_index_sha256",
       "alias_index_sha256","bands","ports","epoch","nonce","site_count","sector_count"},"MAPPING_FIELDS")
 verify(AUTH,D_AUTH,m,manifest["signature"])
 require(m["schema"]=="ASOLARIA-SEAT4-SPECTRUM-MAPPING-V1" and
  m["source81_sha256"]==ROOTS["source"] and m["source_bank_sha256"]==ROOTS["bank"] and
  m["base_index_sha256"]==ROOTS["index"] and m["alias_index_sha256"]==ROOTS["aliases"],"SOURCE_ROOT_MISMATCH")
 require(tuple(m["bands"])==BANDS and tuple(m["ports"])==PORTS and len(set(PORTS))==7,"SOURCE_PORT_MAPPING")
 require(m["nonce"]==NONCE and m["epoch"]==EPOCH and m["site_count"]==81 and m["sector_count"]==27,"AUTH_MAPPING_CONTEXT")
 map_hash=sha(signable(D_AUTH,m))
 seen=set();last=0;num=0;channel_total=0;first=None
 for line in frames.splitlines():
  packet=json.loads(line);p=packet["payload"]
  require(set(packet)=={"payload","signature"},"WITNESS_RECORD_FIELDS")
  verify(WIT,D_WIT,p,packet["signature"])
  require(set(p)=={"schema","source_bank_sha256","mapping_sha256","nonce",
         "epoch","sequence","sector","coords","site","observations"},"WITNESS_PAYLOAD_FIELDS")
  sector=num//81;site=num%81
  require(p["schema"]=="ASOLARIA-SEAT4-SPECTRUM-OBS-V1" and
    p["source_bank_sha256"]==ROOTS["bank"] and p["mapping_sha256"]==map_hash,"WITNESS_SOURCE_BINDING")
  require(p["epoch"]==EPOCH and p["nonce"]==NONCE,"EXPIRED_CAPTURE_CONTEXT")
  require(p["sector"]==sector and p["site"]==site and p["sequence"]==num+1,"WRONG_SIGNED_SECTOR_SITE_SEQUENCE")
  expected_coords=(sector//9,(sector//3)%3,sector%3)
  require(tuple(p["coords"])==expected_coords,"UNORDERED_TERNARY_ID")
  require(p["sequence"]>last and (p["epoch"],p["nonce"],p["sequence"]) not in seen,"SIGNED_FRAME_REPLAY")
  require(len(p["observations"])==7,"FULL_SEVEN_OBSERVATIONS_REQUIRED")
  ports=set()
  for band_i,item in enumerate(p["observations"]):
   require(set(item)=={"band","port","entry_sha256","tag"},"OBSERVATION_FIELDS")
   band=BANDS[band_i];port=PORTS[band_i]
   require(item["band"]==band and item["port"]==port and port not in ports,"UNTRUSTED_CHANNEL_OWNER")
   ports.add(port)
   entry=rows[(band,site)]
   require(item["entry_sha256"]==entry and item["tag"]==tag(entry,sector,site,band,port),
          "UNAUTHENTICATED_OBSERVATION_TAG")
   channel_total+=1
  seen.add((p["epoch"],p["nonce"],p["sequence"]));last=p["sequence"];num+=1
  if first is None:first=packet
 require(num==2187 and channel_total==15309,"INCOMPLETE_SIGNED_SOURCE_FRAMES")
 return map_hash,first

def adversarial(manifest,first,rows):
 # The Python independent verifier must reject un-re-signed actual byte mutations.
 import copy
 labels=[
   ("change_port",lambda p:p["observations"][0].update(port=5)),
   ("erase_violet",lambda p:p["observations"].pop()),
   ("erase_two",lambda p:p["observations"].pop(0)),
   ("replay_sector",lambda p:p.update(sector=1)),
   ("swapped_ordered_coordinates",lambda p:p.update(coords=[1,0,0])),
   ("replay_epoch",lambda p:p.update(epoch=EPOCH-1)),
   ("replay_nonce",lambda p:p.update(nonce="stale")),
   ("change_observation_sha",lambda p:p["observations"][2].update(entry_sha256="a"*64))
 ]
 failed=0
 for label,change in labels:
  fake=copy.deepcopy(first);change(fake["payload"])
  try:verify(WIT,D_WIT,fake["payload"],fake["signature"])
  except ValueError:failed+=1
  else:raise AssertionError("UNEXPECTED_ACCEPT_"+label)
 return failed

def run(source,out):
 rows=source_rows(source)
 map_bytes=(out/"seat4-map.json").read_bytes()
 frames=(out/"seat4-signed-frames.jsonl").read_bytes()
 require(map_bytes.endswith(b"\n") and frames.endswith(b"\n"),"CANONICAL_LF")
 manifest=json.loads(map_bytes)
 require(map_bytes==(canon(manifest)+"\n").encode("utf-8"),"MAP_NOT_CANONICAL")
 for line in frames.splitlines():
  packet=json.loads(line)
  require(line==(canon(packet)).encode("utf-8"),"FRAME_NOT_CANONICAL")
 map_hash,first=validate(manifest,frames,rows)
 negatives=adversarial(manifest,first,rows)
 receipt=json.loads((out/"seat4-results.json").read_bytes())
 require(receipt["signed_frames"]==2187 and receipt["signed_spectrum_channel_observations"]==15309,"RECEIPT_COUNTS")
 require(receipt["map_sha256"]==map_hash and receipt["frames_sha256"]==sha(frames),"RECEIPT_FROZEN_ARTIFACTS")
 require(receipt["permutation_nonidentity_cases_rejected"]==5039,"PERMUTATION_CLAIM")
 require(not receipt["actual_calibrated_spectrum_measured"] and
   not receipt["independent_physical_signer_custody"],"FORBIDDEN_PHYSICAL_PROMOTION")
 sums=(out/"SHA256SUMS").read_text("ascii").splitlines()
 for line in sums:
  expected,name=line.split("  ",1)
  require(sha((out/name).read_bytes())==expected,"CHECKSUM_FAIL_"+name)
 summary={
  "schema":"ASOLARIA-SEAT4-ROUND5-INDEPENDENT-PYTHON-ED25519-V1",
  "classification":"CRYPTOGRAPHIC_FIXTURE_PASS_REAL_ORIGIN_UNVERIFIED",
  "manifest_sha256":sha(map_bytes),"frames_sha256":sha(frames),
  "signed_frame_count":2187,"logical_channels_checked":15309,"distinct_test_keys":2,
  "independent_verified_signature_count":2188,
  "python_independent_mutations_held":negatives,
  "real_external_key_custody_attested":False,
  "real_physical_spectral_provenance_attested":False}
 bytes_=(canon(summary)+"\n").encode("utf-8")
 (out/"seat4-independent-python.json").write_bytes(bytes_)
 with (out/"SHA256SUMS").open("ab") as f:
  f.write((sha(bytes_)+"  seat4-independent-python.json\n").encode("ascii"))
 print(json.dumps({"status":"INDEPENDENT_PYTHON_PASS","frames":2187,"channels":15309,
  "signatures_verified":2188,"python_attacks":negatives,"frames_sha256":sha(frames)},sort_keys=True))

if __name__=="__main__":
 if len(sys.argv)!=3:raise SystemExit("usage: python verify_spectrum.py UPSTREAM_PR80_ARTIFACT OUTPUT")
 run(Path(sys.argv[1]),Path(sys.argv[2]))
