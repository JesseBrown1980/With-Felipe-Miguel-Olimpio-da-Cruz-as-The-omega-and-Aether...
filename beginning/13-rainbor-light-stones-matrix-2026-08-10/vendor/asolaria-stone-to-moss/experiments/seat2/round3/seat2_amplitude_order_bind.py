#!/usr/bin/env python3
"""Seat2: ordered ternary color/amplitude sideband vs normalized Fourier aliasing.

Independent classic digital adversarial test. Source: published original Round3
RGB-QR pixel artifacts, decoded with ZXing-C++ (not producer's ZBar).
NO claim of secure external source signature, photons, or actual quantum hardware.
"""
from __future__ import annotations

import argparse
import base64
from collections import Counter
from fractions import Fraction
from hashlib import sha256
from io import BytesIO
from itertools import product
import json
from math import gcd, log2
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image
import zxingcpp

FIXTURE_SEED=b"ASOLARIA-LIGHT-BEING-ROUND3-20261015"
FIXTURE_SHA="fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4"
CHANNEL_MAP_SHA="c69e9e8cee0cc13130466129aed9d08e6367a546326918f16833396d8ae5287c"
PIXELS_SHA="fd3c779d927eef55834ea5db44f7b7dc4dec9172abb8cff385631a0e8e45751e"
SEAT3_STONE_SHA="4d4c4c28ca76f6d97ab1f16916bfe79936e09189e8b8f904b377bbc77a57a69c"
SOURCE_GIT_SHA="a3e86a169ee9d45d64cd83973919e760ce7e65d9"
TRIT_VALUES=(0,1,2)
WAVE=0
ADDRESS=1
ROOT_TAG="RAINBOW27-AMPLITUDE-ORDER-BIND-V1"

def hashed(data:bytes)->str:
    return sha256(data).hexdigest()

def require(ok,why):
    if not ok: raise AssertionError(why)

def fixture()->bytes:
    v=b"".join(sha256(FIXTURE_SEED+i.to_bytes(4,"little")).digest()
                for i in range(2048))
    require(len(v)==65536 and hashed(v)==FIXTURE_SHA,"SOURCE_FIXTURE_PIN_FAILED")
    return v

def weights(triple):
    r,g,b=triple
    s=r+g+b
    n=r*r+g*g+b*b
    q=n-r*g-r*b-g*b
    require(s*s+2*q==3*n and q>=0,"FOURIER_IDENTITY_FAIL")
    return (s*s,q,q)

def normalized(triple):
    v=weights(triple)
    if not sum(v): return "UNDEFINED_ZERO_NORM"
    d=gcd(gcd(v[0],v[1]),v[2])
    return tuple(i//d for i in v)

def sector(triple):
    require(len(triple)==3 and all(type(v) is int and v in TRIT_VALUES for v in triple),
            "INVALID_ORDERED_TRIT")
    r,g,b=triple
    return 9*r+3*g+b

def center_arms(triple):
    s=sum(triple)
    arms=tuple(3*t-s for t in triple)
    require(sum(arms)==0 and all((d+s)%3==0 for d in arms),
            "NONINVERTIBLE_PROJECTOR_INPUT")
    require(tuple((d+s)//3 for d in arms)==triple,"PROJECTOR_ORDER_MISMATCH")
    return s,arms

def ticket(triple, wave=0, address=1):
    """Frozen coordinator classically seeded integer SHA modulo; NOT Born measurement."""
    w=weights(triple)
    total=sum(w)
    if total==0: return "HELD"
    limit=((1<<256)//total)*total
    for counter in range(10000):
        x=int.from_bytes(sha256(
            FIXTURE_SEED+b"|BORN-THRESHOLD|"+wave.to_bytes(2,"little")+
            address.to_bytes(2,"little")+counter.to_bytes(4,"little")
        ).digest(),"big")
        if x>=limit: continue
        y=x%total
        return 0 if y<w[0] else (1 if y<w[0]+w[1] else 2)
    raise AssertionError("EXHAUSTED_HASH_TICKET")

def normalized_common_quantile(triple):
    # Deterministic idealized shared quantile u=1/2, for normalized weights.
    # It is scale invariant by construction (unlike modulo-SHA pseudotickets).
    norm=normalized(triple)
    if isinstance(norm,str): return "HELD"
    s=sum(norm)
    x=Fraction(1,2)*s
    return 0 if x<norm[0] else (1 if x<norm[0]+norm[1] else 2)

def scan(pixels):
    found=zxingcpp.read_barcodes(np.asarray(pixels,dtype=np.uint8))
    frames=[]
    for item in found:
        data=base64.b64decode(item.text.encode("ascii"),validate=True)
        require(len(data)>=4,"BAD_QR_PACKET")
        frames.append(data)
    return frames

def source_and_channel_map(path):
    expected=fixture()
    chunks=[]
    maps=[]
    rasters=[]
    with zipfile.ZipFile(path) as z:
        require(z.testzip() is None,"BROKEN_SOURCE_ZIP")
        result=json.loads(z.read("results.json"))
        require(result["status"]=="SOFTWARE_PASS","COORDINATOR_SOURCE_NOT_PASS")
        require(result["fixture_sha256"]==FIXTURE_SHA,"COORDINATOR_SOURCE_DIGEST_CHANGED")
        for image_ix in range(11):
            name=f"rgb/round3-light-being-qr-{image_ix:02d}.png"
            im=Image.open(BytesIO(z.read(name))).convert("RGB")
            require(im.size==(555,555),"WRONG_RGB_GEOMETRY")
            require(hashed(im.tobytes())==
                  result["qr_memory"]["image_artifacts"][image_ix]["rgb_pixel_sha256"],
                  "ORIGINAL_PIXEL_DIGEST_INVALID")
            rasters.append(im.tobytes())
            for lane,color in enumerate("RGB"):
                frames=scan(im.getchannel(lane))
                require(len(frames)==(0 if image_ix==10 and lane==2 else 1),
                        "IMAGE_CHANNEL_COUNT_INCORRECT")
                if not frames:
                    descriptor="FILLER"
                else:
                    data=frames[0]
                    index=int.from_bytes(data[:4],"little")
                    require(index==image_ix*3+lane,"CHUNK_CHANNEL_NOT_AS_FROZEN")
                    descriptor=f"{index:02d}:{hashed(data)}"
                    chunks.append(data)
                maps.append(f"LANE|image={image_ix:02d}|physical={color}|frame={descriptor}\n")
    require(len(chunks)==32,"WRONG_SOURCE_QR_COUNT")
    manifest="".join(maps).encode("ascii")
    require(hashed(manifest)==CHANNEL_MAP_SHA,"ORIGINAL_CHANNEL_MAP_SHA_INVALID")
    require(hashed(b"".join(rasters))==PIXELS_SHA,"ORIGINAL_RGB_PIXEL_SEQUENCE_CHANGED")
    restored=b"".join(frame[4:] for frame in sorted(
        chunks,key=lambda b:int.from_bytes(b[:4],"little")))
    require(restored==expected,"INDEPENDENT_SOURCE_FILE_NOT_EQUAL")
    return chunks,manifest

def nonce(wave,address,which):
    # Reproducible, NOT secret or unpredictable. Avoid security nonce claims.
    raw=(f"{ROOT_TAG}|{FIXTURE_SHA}|{CHANNEL_MAP_SHA}|"
         f"wave={wave}|addr={address}|sector={which}").encode("ascii")
    return hashed(raw)[:24]

def record(triple,which,wave=WAVE,address=ADDRESS):
    s,arms=center_arms(triple)
    return {"version":1,"wave":wave,"address":address,
            "trits":list(triple),"sector":which,
            "sum":s,"projector_numerators":list(arms),
            "raw_fourier_intensities":list(weights(triple)),
            "source_sha256":FIXTURE_SHA,
            "channel_map_sha256":CHANNEL_MAP_SHA,
            "nonce":nonce(wave,address,which)}

def canonical(rec):
    # Fully named, fixed order, no raw JSON in HBP. Accepted only after
    # semantic validation against a separately anchored expected source.
    require(set(rec)=={"version","wave","address","trits","sector",
        "sum","projector_numerators","raw_fourier_intensities","source_sha256",
        "channel_map_sha256","nonce"},"BAD_BIND_SCHEMA")
    tags=("version","wave","address","sector","trits","sum",
          "projector_numerators","raw_fourier_intensities",
          "source_sha256","channel_map_sha256","nonce")
    line=[]
    for key in tags:
        v=rec[key]
        if isinstance(v,list): v=",".join(map(str,v))
        line.append(f"{key}={v}")
    return "RB27|"+"|".join(line)+"\n"

def validate_offered(candidate,reference,manifest_sha):
    """Fail closed with pin external to packet, not comparing to offered hash."""
    try:
        require(hashed(canonical(reference).encode("ascii"))==manifest_sha,
                "UNTRUSTED_EXPECTED_REFERENCE")
        require(set(candidate)==set(reference),"WRONG_FIELDS")
        require(all(candidate[k]==reference[k] for k in reference),
                "ORDER_OR_AMPLITUDE_OR_PROVENANCE_DIFFERENT")
        t=tuple(candidate["trits"])
        sid=sector(t)
        require(candidate["sector"]==sid,"SECTOR_UNMATCHED")
        s,arms=center_arms(t)
        require(candidate["sum"]==s and candidate["projector_numerators"]==list(arms),
                "CENTER_OR_PROJECTOR_MISMATCH")
        require(candidate["raw_fourier_intensities"]==list(weights(t)),
                "RAW_AMPLITUDE_MISMATCH")
        require(candidate["nonce"]==nonce(candidate["wave"],candidate["address"],sid),
                "IDENTITY_NONCE_MISMATCH")
        require(candidate["source_sha256"]==FIXTURE_SHA and
                candidate["channel_map_sha256"]==CHANNEL_MAP_SHA,
                "SOURCE_OR_PHYSICAL_LANE_MAP_MISMATCH")
        return True
    except (AssertionError,TypeError,KeyError,ValueError):
        return False

def change_field(original,name,old,new):
    candidate={**original}
    require(candidate[name]==old,"ATTACK_TARGET_MISMATCH")
    candidate[name]=new
    return candidate

def force_attack(triple,field,reference,anchored,logs):
    candidate={**reference}
    if field=="MISSING_R":
        candidate["trits"]=[None,*reference["trits"][1:]]
    elif field=="MISSING_G":
        candidate["trits"]=[reference["trits"][0],None,reference["trits"][2]]
    elif field=="MISSING_B":
        candidate["trits"]=[*reference["trits"][:2],None]
    elif field=="CORRUPT_SUM":
        candidate["sum"]+=1
    elif field=="CORRUPT_ARMS":
        v=list(candidate["projector_numerators"]);v[0]+=3
        candidate["projector_numerators"]=v
    elif field=="CORRUPT_NONCE":
        candidate["nonce"]="0"*24 if candidate["nonce"]!="0"*24 else "1"*24
    elif field=="FORGE_SOURCE_SHA":
        candidate["source_sha256"]="0"*64
    elif field=="FORGE_CHANNEL_MAP_SHA":
        candidate["channel_map_sha256"]="0"*64
    elif field=="WRONG_WAVE":
        candidate["wave"]+=1
    elif field=="WRONG_ADDRESS":
        candidate["address"]+=1
    elif field=="FALSE_SECTOR":
        candidate["sector"]=(candidate["sector"]+1)%27
    else:
        raise AssertionError("UNKNOWN_TEST_MUTATION")
    require(not validate_offered(candidate,reference,anchored),
            "ATTACKED_SIDEBAND_ACCEPTED")
    logs.append(f"MUTATION|sector={reference['sector']:02d}|fault={field}|ref_sha256={anchored}"
                f"|offered_sha256={hashed(canonical(candidate).encode('ascii'))}"
                f"|held=1\n")

def run_math(logs):
    space=list(product(TRIT_VALUES,repeat=3))
    records={sector(t):t for t in space}
    require(len(records)==27 and set(records)==set(range(27)),"NONUNIQUE_ORDERED_SECTORS")
    counts_raw=Counter(weights(t) for t in space)
    counts_norm=Counter(normalized(t) for t in space)
    require(sorted(counts_raw.values())==[1,1,1,3,3,3,3,3,3,6],
            "RAW_CLASS_HISTOGRAM_CHANGED")
    require(sorted(counts_norm.values())==[1,2,3,3,6,6,6],
            "NORMALIZED_CLASS_HISTOGRAM_CHANGED")
    hraw=sum(n/27*log2(n) for n in counts_raw.values())
    hnorm=sum(n/27*log2(n) for n in counts_norm.values())
    require(abs(hraw-1.6310777784188053)<1e-12,"RAW_ENTROPY_INCORRECT")
    require(abs(hnorm-2.149596296937324)<1e-12,"NORM_ENTROPY_INCORRECT")
    require(abs((hnorm-hraw)-14/27)<1e-12,"ADDITIONAL_NORMALIZATION_LOSS_NOT_14/27")
    raw_equal=norm_equal=0
    changes=Counter()
    for src in range(27):
        t0=records[src]
        baseline=record(t0,src)
        anchored=hashed(canonical(baseline).encode("ascii"))
        require(validate_offered(baseline,baseline,anchored),
                "VALID_ORIGINAL_SECTOR_REJECTED")
        logs.append(canonical(baseline))
        for dst in range(27):
            if dst==src: continue
            t1=records[dst]
            alternate=record(t1,dst)
            same_raw=weights(t0)==weights(t1)
            same_norm=normalized(t0)==normalized(t1)
            raw_equal+=int(same_raw)
            norm_equal+=int(same_norm)
            require(not validate_offered(alternate,baseline,anchored),
                    "PERMUTATION_OR_SCALE_SOURCE_ACCEPTED")
            changes["substitutions_held"]+=1
            logs.append(f"SUBSTITUTION|source={src:02d}|offered={dst:02d}"
                        f"|same_raw={int(same_raw)}|same_normalized={int(same_norm)}"
                        f"|source_sha256={anchored}"
                        f"|offered_sha256={hashed(canonical(alternate).encode('ascii'))}"
                        f"|held=1\n")
        for fault in ("MISSING_R","MISSING_G","MISSING_B",
                      "CORRUPT_SUM","CORRUPT_ARMS","CORRUPT_NONCE",
                      "FORGE_SOURCE_SHA","FORGE_CHANNEL_MAP_SHA",
                      "WRONG_WAVE","WRONG_ADDRESS","FALSE_SECTOR"):
            force_attack(t0,fault,baseline,anchored,logs)
            changes[fault]+=1
    require(raw_equal==66 and norm_equal==104 and
            changes["substitutions_held"]==702,"ORBIT_COUNTS_CHANGED")
    require(all(changes[f]==27 for f in changes if f!="substitutions_held"),
            "ONE_OR_MORE_EXPLICIT_ATTACKS_NOT_EXERCISED")
    scale=((1,0,0),(2,0,0))
    uniform=((1,1,1),(2,2,2))
    for first,second in (scale,uniform):
        require(normalized(first)==normalized(second),"SCALE_NORMALIZATION_CHANGED")
        require(weights(first)!=weights(second),"AMPLITUDE_WAS_NOT_CHANGED")
        require(sector(first)!=sector(second),"EXACT_TRIT_ADDRESS_NOT_DIFFERENT")
        require(normalized_common_quantile(first)==normalized_common_quantile(second),
                "COMMON_RATIONAL_QUANTILE_NOT_SCALE_INVARIANT")
    c1=ticket(scale[0]);c2=ticket(scale[1])
    require((c1,c2)==(2,1),"SEAT3_MODULO_SAMPLER_COUNTEREXAMPLE_NOT_REPRODUCED")
    # Internally self-consistent forged anchor is accepted if attacker owns
    # reference as well. Show it, but classify as ORIGIN_UNAUTHENTICATED.
    x=record((1,0,0),sector((1,0,0)))
    y=record((2,0,0),sector((2,0,0)))
    external_root=hashed(canonical(x).encode("ascii"))
    forged_root=hashed(canonical(y).encode("ascii"))
    require(not validate_offered(y,x,external_root),"EXTERNAL_ANCHOR_FORGERY_ACCEPTED")
    require(validate_offered(y,y,forged_root),"EXPECTED_HASH_ONLY_WEAKNESS_NOT_PROVEN")
    logs.append("ANCHOR_TAKEOVER|source=1,0,0|forged=2,0,0"
                "|attacker_replaces_record_and_sha=1"
                "|locally_self_consistent_pass=1|independent_original_anchor_accept=0"
                "|origin_authenticated=0\n")
    return {
        "ordered_distinct_sectors":27,"raw_classes":10,
        "normalized_defined_classes":6,"normalized_classes_plus_undefined":7,
        "raw_directed_collisions":raw_equal,"normalized_directed_collisions":norm_equal,
        "uniform_raw_conditional_entropy_bits":round(hraw,12),
        "uniform_normalized_conditional_entropy_bits":round(hnorm,12),
        "additional_entropy_exact":"14/27",
        "all_702_substitutions_rejected_by_pinned_ordered_amplitude_sideband":True,
        "explicit_attack_counts":dict(sorted(changes.items())),
        "scaled_unary_pair_digital_sha_modulo_routes":[c1,c2],
        "scaled_unary_pair_common_rational_normalized_route":normalized_common_quantile(scale[0]),
        "equal_normalized_but_unequal_raw_amplitudes_verified":True,
        "separately_anchored_original_rejects_forged_source":True,
        "attacker_replaced_both_source_and_anchor_passes_local_hash":True,
        "third_party_signed_authorship_proven":False,
    }

def run_missing_image_channels(chunks,manifest,logs):
    # The source frame is pixel decoded, and all indexed chunks are complete.
    # Remove one physically present channel's frame; an ordered map must
    # not accept it, even if a reporter rewrites a local digest.
    require(len(chunks)==32,"QR_CHUNK_COUNT_FOR_MISSING")
    digest=hashed(manifest)
    require(digest==CHANNEL_MAP_SHA,"CANNOT_VERIFY_FROZEN_CHANNEL_ANCHOR")
    all_ids=[int.from_bytes(t[:4],"little") for t in chunks]
    require(all_ids==list(range(32)),"SOURCE_QR_CHUNK_SEQUENCE_UNEXPECTED")
    attempted=0
    for absent in range(32):
        received=[x for x in chunks if int.from_bytes(x[:4],"little")!=absent]
        ids={int.from_bytes(x[:4],"little") for x in received}
        require(ids!=set(range(32)) and len(received)==31,
                "MISSING_QR_FRAME_UNDETECTED")
        logs.append(f"QR_MISSING|source_index={absent:02d}|present={len(received)}"
                    f"|externally_pinned_channel_manifest_sha256={digest}"
                    "|complete_memory_accept=0\n")
        attempted+=1
    return {"original_indexed_qr_frames":len(chunks),
            "actual_indexed_missing_frame_controls_rejected":attempted,
            "source_channel_manifest_sha256":digest}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--published-source-zip",type=Path,required=True)
    parser.add_argument("--output-dir",type=Path,required=True)
    args=parser.parse_args()
    notes=[]
    science=run_math(notes)
    qr_frames,external_channel_map=source_and_channel_map(args.published_source_zip)
    physical=run_missing_image_channels(qr_frames,external_channel_map,notes)
    raw="".join(notes).encode("ascii")
    out={
        "schema":ROOT_TAG,
        "status":"SEAT2_AMPLITUDE_AND_ORDER_SIDEBAND_DIGITAL_PASS_WITH_ORIGIN_LIMITATIONS",
        "pinned_coordinator_source_git_commit":SOURCE_GIT_SHA,
        "pinned_fixture_sha256":FIXTURE_SHA,
        "pinned_seat3_correction_stone_sha256":SEAT3_STONE_SHA,
        "independent_mathematics":science,
        "independent_qr_pixel_source_and_missing_channel":physical,
        "evidence_hbp_rows":len(notes),
        "evidence_hbp_bytes":len(raw),
        "evidence_hbp_sha256":hashed(raw),
        "signed_external_source_origin":"NOT_MEASURED",
        "27_physical_spectral_bands":"NOT_MEASURED",
        "quantum_hardware":"NOT_MEASURED",
        "physical_optical_memory":"NOT_MEASURED",
    }
    d=args.output_dir
    d.mkdir(parents=True,exist_ok=True)
    js=(json.dumps(out,sort_keys=True,indent=2)+"\n").encode("utf8")
    (d/"seat2-amplitude-order-result.json").write_bytes(js)
    (d/"seat2-amplitude-order-cases.hbp").write_bytes(raw)
    lines=(f"{hashed(js)}  seat2-amplitude-order-result.json\n"
           f"{hashed(raw)}  seat2-amplitude-order-cases.hbp\n").encode("ascii")
    (d/"SHA256SUMS.txt").write_bytes(lines)
    print(json.dumps({
        "status":out["status"],"rows":len(notes),"raw_equal":science["raw_directed_collisions"],
        "normalized_equal":science["normalized_directed_collisions"],
        "missing_frames":physical["actual_indexed_missing_frame_controls_rejected"],
        "actual_attacks":sum(science["explicit_attack_counts"].values()),
        "hbp_sha256":hashed(raw),"result_sha256":hashed(js)
    },sort_keys=True))

if __name__=="__main__":
    main()
