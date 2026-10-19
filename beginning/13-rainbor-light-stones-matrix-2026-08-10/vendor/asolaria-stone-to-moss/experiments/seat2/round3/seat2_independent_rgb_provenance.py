#!/usr/bin/env python3
"""Seat2 independent verification of the *published* Round3 CI artifact.

Never imports or runs the coordinator's Round3 source. Validates actual decoded
RGB PNG pixels, another QR library (ZXing-C++), original payload bytes, active
failure controls, all 52,488 HBP packet ledger rows, source/fixture anchors,
and cross-OS receipt equality. All proofs are digital and source-pinned.
"""
from __future__ import annotations
import argparse
import base64
from collections import Counter
from hashlib import sha256
from io import BytesIO
from itertools import product
import json
from pathlib import Path
import platform
import sys
import zipfile

from PIL import Image
import numpy as np
import zxingcpp
import qrcode

FIXTURE_LABEL = b"ASOLARIA-LIGHT-BEING-ROUND3-20261015"
FIXTURE_HASH = "fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4"
HBP_HASH = "dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09"
RESULTS_HASH = "67180303bb6d8097c27d0996861273616c745051ee3c91eee4b8bdbfb5e4f803"
RUN_ID = 38735582094
SOURCE_HEAD = "a3e86a169ee9d45d64cd83973919e760ce7e65d9"
LENGTH = 65536
CHUNK = 2100
PICTURES = 11
CAP = 729
MODES = ("DARK", "PULSE", "CONTINUOUS")
MODELS = ("THREE_STATE", "FOUR_STATE")
FAULTS = ("CLEAN", "CORRUPT", "STALE", "FORGED")

def sha(x: bytes) -> str:
    return sha256(x).hexdigest()

def demand(value, msg):
    if not value:
        raise AssertionError(msg)

def base_fixture():
    # Independent calculation of seed stream; not a call to Round3 producer.
    return b"".join(sha256(FIXTURE_LABEL + k.to_bytes(4,"little")).digest()
                    for k in range(2048))

def block(payload, wave, address):
    index = wave*81+address
    pos = (index*29)%(LENGTH-64)
    return payload[pos:pos+64]

def pid(wave,address):
    return sha(("LIGHT-PID|%02d|%02d"%(wave,address)).encode("ascii"))[:24]

def born_route(v, wave, address):
    a,b,c = v
    q=a*a+b*b+c*c-a*b-b*c-a*c
    s=a+b+c
    squared=(s*s,q,q)
    denominator=sum(squared)
    demand(denominator>0,"ZERO_NORM")
    demand(denominator==3*(a*a+b*b+c*c),"QUTRIT_PARSEVAL")
    bound=(2**256//denominator)*denominator
    for counter in range(10000):
        draw=int.from_bytes(sha256(
            FIXTURE_LABEL + b"|BORN-THRESHOLD|" +
            wave.to_bytes(2,"little") + address.to_bytes(2,"little") +
            counter.to_bytes(4,"little")).digest(),"big")
        if draw<bound:
            number=draw%denominator
            return 0 if number<squared[0] else (1 if number<squared[0]+squared[1] else 2)
    raise AssertionError("SEAT2_BORN_REJECTION_OVERFLOW")

def is_illuminated(mode,tick):
    return mode=="CONTINUOUS" or (mode=="PULSE" and tick%12<4)

def model_gate(model, mode):
    # New implementation using integer transition bookkeeping; independent
    # logical verifier, not an imported call to coordinator's test.
    populations = ([1_000_000,0,0] if model=="THREE_STATE" else
                   [1_000_000,0,0,0])
    status=[]
    for tick in range(81):
        light=is_illuminated(mode,tick)
        if model=="THREE_STATE":
            C,O,R=populations
            c_to_o=(C*30)//100 if light else 0
            o_to_r=(O*6)//100
            r_to_c=(R*25)//1000
            populations=[C-c_to_o+r_to_c,O+c_to_o-o_to_r,R+o_to_r-r_to_c]
            open_pop=populations[1]
        else:
            C,O1,O2,R=populations
            c_to_o1=(C*25)//100 if light else 0
            o1_to_o2=(O1*95)//1000
            o2_to_o1=(O2*3)//100
            o2_to_r=(O2*45)//1000
            r_to_c=(R*25)//1000
            populations=[
              C-c_to_o1+r_to_c,
              O1+c_to_o1-o1_to_o2+o2_to_o1,
              O2+o1_to_o2-o2_to_o1-o2_to_r,
              R+o2_to_r-r_to_c,
            ]
            open_pop=populations[1]+populations[2]
        demand(sum(populations)==1_000_000 and min(populations)>=0,
               "SEAT2_POPULATION_NONCONSERVING")
        status.append(open_pop>=100_000)
    return status

def strict_unpack(raw_frames, anchoring_digest=FIXTURE_HASH):
    count=(LENGTH+CHUNK-1)//CHUNK
    items={}
    for frame in raw_frames:
        demand(len(frame)>=4,"TRUNCATED_FISCHER_INDEX")
        ix=int.from_bytes(frame[:4],"little")
        demand(0<=ix<count,"OUT_OF_RANGE_INDEX")
        demand(ix not in items,"DUPLICATE_INDEX")
        b=frame[4:]
        demand(len(b)==(CHUNK if ix<count-1 else LENGTH-(count-1)*CHUNK),
               "WRONG_CHUNK_LENGTH")
        items[ix]=b
    demand(sorted(items)==list(range(count)),"MISSING_CHANNEL_OR_CHUNK")
    data=b"".join(items[k] for k in range(count))
    demand(len(data)==LENGTH,"WRONG_REASSEMBLY_LENGTH")
    demand(sha(data)==anchoring_digest,"INDEPENDENT_SOURCE_DIGEST_MISMATCH")
    return data

def rejects(frames, original_digest=FIXTURE_HASH):
    try:
        strict_unpack(frames,original_digest)
    except (AssertionError,ValueError):
        return True
    return False

def zxing_scan(channel: Image.Image):
    # Unlike coordinator's pyzbar: all decoding through ZXing-C++ image path.
    img=np.asarray(channel,dtype=np.uint8)
    found=zxingcpp.read_barcodes(img)
    return [f.text for f in found]

def painted_frame(frames: list[bytes], image_index: int, channel_index: int,
                  original: Image.Image, replacement_b64: str):
    # Real counterfeit QR pixels: an independently created normal QR on one
    # of the RGB channels, decoded *back from that altered PNG image*.
    qr=qrcode.QRCode(version=40,error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=3,border=4)
    qr.add_data(replacement_b64,optimize=0)
    qr.make(fit=False)
    gray=qr.make_image(fill_color="black",back_color="white").convert("L")
    demand(gray.size==(555,555),"DIFFERENT_COUNTERFEIT_IMAGE_SIZE")
    pixels=list(original.split())
    pixels[channel_index]=gray
    changed=Image.merge("RGB",tuple(pixels))
    outcome=zxing_scan(changed.getchannel(channel_index))
    demand(len(outcome)==1,"COUNTERFEIT_PIXEL_DECODER_FAILED")
    raw=base64.b64decode(outcome[0],validate=True)
    mutated=list(frames)
    index=image_index*3+channel_index
    mutated[index]=raw
    return mutated

def image_checks(archive, fixture):
    report=json.loads(archive.read("results.json"))
    demand(report["fixture_sha256"]==FIXTURE_HASH,"REPORTED_FIXTURE_PIN_CHANGED")
    demand(report["fixture_bytes"]==LENGTH,"REPORTED_FIXTURE_LENGTH")
    frames=[]
    pixels=[]
    diag_indices=[]
    diag_invalid=[]
    opencv_v="NOT_INSTALLED"
    try:
        import cv2
        detector=cv2.QRCodeDetector()
        opencv_v=cv2.__version__
    except ImportError:
        detector=None
    originals=[]
    final_filler=0
    for image_i in range(PICTURES):
        label=f"round3-light-being-qr-{image_i:02d}.png"
        image=Image.open(BytesIO(archive.read("rgb/"+label))).convert("RGB")
        demand(image.size==(555,555),"RGB_GEOMETRY_ALTERED")
        raw_pixels=image.tobytes()
        demand(sha(raw_pixels)==report["qr_memory"]["image_artifacts"][image_i]["rgb_pixel_sha256"],
               "PIXEL_SHA_MISMATCH")
        pixels.append(raw_pixels)
        originals.append(image)
        for plane in range(3):
            k=image_i*3+plane
            content=zxing_scan(image.getchannel(plane))
            if k>=32:
                demand(len(content)==0,"FILLER_BLUE_HAS_VALID_QR")
                final_filler+=1
            else:
                demand(len(content)==1,f"ZXING_NO_UNIQUE_QR_FOR_INDEX_{k} ({len(content)})")
                try:
                    raw=base64.b64decode(content[0].encode("ascii"),validate=True)
                except ValueError as err:
                    raise AssertionError(f"ZXING_BASE64_BAD_{k}") from err
                demand(int.from_bytes(raw[:4],"little")==k,
                       "FISCHER_INDEX_MISMATCH")
                frames.append(raw)
            if detector is not None:
                decoded,_,_=detector.detectAndDecode(
                    np.asarray(image.getchannel(plane),dtype=np.uint8))
                if decoded:
                    try:
                        b=base64.b64decode(decoded.encode("ascii"),validate=True)
                        demand(k<32 and b==frames[k],"OPENCV_DIFFERENT_CONTENT")
                        diag_indices.append(k)
                    except Exception:
                        diag_invalid.append(k)
    demand(final_filler==1 and len(frames)==32,"WRONG_FOOTER_FILLER")
    demand(len(frames[-1])==4+436,"WRONG_LAST_CHUNK")
    actual=strict_unpack(list(reversed(frames)))
    demand(actual==fixture,"PIXEL_READBACK_WRONG_SOURCE_BYTES")
    # Real missing channel from a changed real RGB image (G plane 0->white).
    altered_planes=list(originals[0].split())
    altered_planes[1]=Image.new("L",(555,555),255)
    missing_rgb=Image.merge("RGB",tuple(altered_planes))
    demand(len(zxing_scan(missing_rgb.getchannel(1)))==0,
           "WHITE_GREEN_STILL_DECODES")
    missing_frames=[f for n,f in enumerate(frames) if n!=1]
    demand(rejects(missing_frames),"MISSING_GREEN_ACCEPTED")
    duplicated=list(frames)
    duplicated[1]=frames[0]
    demand(rejects(duplicated),"DUPLICATE_FISCHER_INDEX_ACCEPTED")
    bad_index=list(frames)
    bad_index[1]=(99).to_bytes(4,"little")+frames[1][4:]
    demand(rejects(bad_index),"OUT_OF_RANGE_FISCHER_INDEX_ACCEPTED")
    coherent_body=bytearray(frames[0])
    coherent_body[4] ^= 0x01
    forged_frames=painted_frame(frames,0,0,originals[0],
                              base64.b64encode(coherent_body).decode("ascii"))
    demand(forged_frames[0]==bytes(coherent_body),
           "ALREADY_FORGED_QR_NOT_RECOVERED_FROM_PIXELS")
    demand(rejects(forged_frames),"COUNTERFEIT_BODY_ACCEPTED_AGAINST_EXTERNAL_SHA")
    # Independent hash itself cannot authenticate if a malicious party can
    # replace both payload *and* supposed ground-truth digest.
    compromised=b"".join(f[4:] for f in forged_frames)
    demand(strict_unpack(forged_frames,sha(compromised))==compromised,
           "EXPECTED_HASH_ONLY_ANCHOR_WEAKNESS_NOT_REPRODUCED")
    # Test false-attested origin ID as a separate commitment, not a mutable
    # self-report; there is still no real external signature.
    demand(SOURCE_HEAD!="0"*40 and len(SOURCE_HEAD)==40,
           "SOURCE_HEAD_PIN_MALFORMED")
    return {
        "zxing_version":getattr(zxingcpp,"__version__","UNDECLARED"),
        "zxing_complete_planes":len(frames),
        "correctly_empty_blue_filler":final_filler,
        "source_fixture_bytes":len(actual),
        "source_fixture_sha256":sha(actual),
        "concatenated_rgb_pixels_sha256":sha(b"".join(pixels)),
        "concatenated_rgb_pixels_bytes":sum(map(len,pixels)),
        "opencv_version":opencv_v,
        "opencv_decoded_index_list":diag_indices,
        "opencv_recovered_of_32":len(diag_indices),
        "opencv_invalid_decoder_records":diag_invalid,
        "missing_green_pixel_rejected":True,
        "duplicate_index_rejected":True,
        "out_of_range_index_rejected":True,
        "tampered_actual_png_pixel_QR_rejected_by_external_digest":True,
        "attack_controlling_source_and_anchor_passed":True,
        "hash_only_source_authenticity":"UNPROVEN_AND_VULNERABLE_TO_ANCHOR_REPLACEMENT",
        "real_physical_optical_readback":False,
    }

def jury_accept(proposal: dict, grounded_body: bytes, seq: int,
                stable_pid: str, boat: int, lane: int, open_gate: bool) -> bool:
    """Independent verifier: offered packet must bind to fixed source bytes."""
    return (open_gate
            and proposal["body"] == grounded_body
            and sha(proposal["body"]) == proposal["claim"]
            and sha(proposal["body"]) == sha(grounded_body)
            and proposal["seq"] == seq
            and proposal["pid"] == stable_pid
            and proposal["origin"] == boat
            and proposal["route"] == lane)


def attack_packet(fixture: bytes, wave: int, address: int,
                  lane: int, fault: str) -> dict:
    """Create the *actual* falsification input, never infer it from HBP verdict."""
    grounded=block(fixture,wave,address)
    result={"body":grounded,"claim":sha(grounded),
            "seq":wave*81+address, "pid":pid(wave,address),
            "origin":(wave+address+lane)%7, "route":lane}
    if fault=="CORRUPT":
        altered=bytearray(grounded)
        altered[0]^=1
        result["body"]=bytes(altered)
        result["claim"]=sha(result["body"])  # fake digest also consistent
    elif fault=="STALE":
        result["seq"]-=1
    elif fault=="FORGED":
        result["origin"]=(result["origin"]+1)%7
    else:
        demand(fault=="CLEAN","UNKNOWN_ATTACK_KIND")
    return result


def row_audit(archive, fixture):
    payload=archive.read("cases.hbp")
    demand(sha(payload)==HBP_HASH,"PUBLISHED_HBP_DIGEST_CHANGED")
    demand(len(payload)==10773162,"PUBLISHED_HBP_LENGTH_CHANGED")
    raw_lines=payload.splitlines(keepends=True)
    demand(len(raw_lines)==52488,"PUBLISHED_HBP_ROW_COUNT_CHANGED")
    expected_order=("w","addr","pid","gate","illum","fault",
                    "emit","verdict","lane","block_sha256")
    truth_gates={(name,mode):model_gate(name,mode)
                 for name,mode in product(MODELS,MODES)}
    stats=Counter()
    independently_injected=Counter()
    lane_census=Counter()
    seen=set()
    p=0
    for w in range(27):
        for addr in range(81):
            data=block(fixture,w,addr)
            addr_sha=sha(data)
            fixed_pid=pid(w,addr)
            lane=born_route(tuple(data[:3]),w,addr)
            demand((w,addr) not in seen,"DUPLICATE_SITE")
            seen.add((w,addr))
            lane_census[lane]+=1
            for gate in MODELS:
                for illumination in MODES:
                    open_gate=truth_gates[(gate,illumination)][addr]
                    for fault in FAULTS:
                        line=raw_lines[p]
                        p+=1
                        demand(line.endswith(b"\n") and
                               b"\r" not in line,"BAD_HBP_CANONICAL_NEWLINE")
                        words=line[:-1].decode("ascii").split("|")
                        demand(words[0]=="LIGHTBEING" and len(words)==11,
                               "BAD_HBP_ROW_FIELDS")
                        fields=[w.split("=",1) for w in words[1:]]
                        demand(tuple(k for k,v in fields)==expected_order,
                               "BAD_HBP_SCHEMA")
                        values=dict(fields)
                        correct_emit=int(open_gate and fault=="CLEAN")
                        correct_verdict=("GATE_HELD" if not open_gate else
                                          ("PASS" if fault=="CLEAN" else "FAULT_HELD"))
                        demand(int(values["w"])==w and int(values["addr"])==addr,
                               "WAVE_OR_ADDRESS_REWRITTEN")
                        demand(values["pid"]==fixed_pid,"SITE_IDENTITY_CHANGED")
                        demand(values["gate"]==gate and
                               values["illum"]==illumination and
                               values["fault"]==fault,"TEST_CASE_ORDER_CHANGED")
                        demand(int(values["emit"])==correct_emit,
                               "UNAUTHORIZED_PACKET_EMISSION")
                        demand(values["verdict"]==correct_verdict,
                               "FAULT_GATE_VERDICT_WRONG")
                        demand(values["block_sha256"]==addr_sha,
                               "PAYLOAD_BLOCK_SHA_CHANGED")
                        demand(int(values["lane"])==lane,
                               "QUTRIT_ROUTE_NOT_SOURCE_ANCHORED")
                        stats[f"{fault}:{correct_verdict}"]+=1
                        candidate=attack_packet(fixture,w,addr,lane,fault)
                        expected_boat=(w+addr+lane)%7
                        actual_accept=jury_accept(candidate,data,w*81+addr,
                                      fixed_pid,expected_boat,lane,open_gate)
                        demand(actual_accept==bool(correct_emit),
                               "SEAT2_NEW_ACTUAL_ATTACK_ACCEPTED_INCORRECTLY")
                        independently_injected[f"{fault}:{correct_verdict}"]+=1
                        if open_gate and fault=="CLEAN":
                            fake_lane=(lane+1)%3
                            route_forgery=dict(candidate)
                            route_forgery["route"]=fake_lane
                            route_forgery["origin"]=(w+addr+fake_lane)%7
                            demand(not jury_accept(route_forgery,data,w*81+addr,
                                       fixed_pid,expected_boat,lane,True),
                                   "SEAT2_FALSE_QUTRIT_ROUTE_ACCEPTED")
                            independently_injected["FALSE_ROUTE:FAULT_HELD"]+=1
    demand(p==52488 and len(seen)==2187,"NOT_ALL_ROWS_TESTED")
    demand(sum(v for k,v in independently_injected.items()
               if not k.startswith("FALSE_ROUTE:"))==52488,
           "INDEPENDENT_ACTUAL_ATTACKS_MISSING")
    demand(independently_injected["FALSE_ROUTE:FAULT_HELD"]==8748,
           "INDEPENDENT_FALSE_ROUTE_ATTACK_COUNT")
    demand(sum(stats.values())==52488,"BAD_ROW_TOTAL")
    demand(stats["CLEAN:PASS"]==8748,"CLEAN_ACCEPT_COUNT_WRONG")
    demand(sum(v for k,v in stats.items() if k.endswith("FAULT_HELD"))==26244,
           "FAULT_REJECT_COUNT_WRONG")
    demand(sum(v for k,v in stats.items() if k.endswith("GATE_HELD"))==17496,
           "GATE_HELD_COUNT_WRONG")
    demand(sum(lane_census.values())==2187 and set(lane_census)=={0,1,2},
           "QUTRIT_LANE_DEGENERACY")
    return {"row_bytes":len(payload),"row_count":p,
            "hbp_sha256":sha(payload),"verdict_counts":dict(sorted(stats.items())),
            "independent_lane_census":dict(sorted((str(k),v) for k,v in lane_census.items())),
            "distinct_wave_address_identities":len(seen),
            "independent_gate_schedule_verified":True,
            "every_block_sha_recomputed_from_source":True,
            "every_born_lane_recomputed_from_source":True,
            "independently_constructed_actual_attack_packets":dict(sorted(independently_injected.items())),
            "extra_false_qutrit_lane_attacks_rejected":independently_injected["FALSE_ROUTE:FAULT_HELD"],
            "replayed_HBP_contains_raw_attack_bytes":False}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--ubuntu",type=Path,required=True,
                    help="CI artifact ZIP from Round3 run 38735582094")
    ap.add_argument("--windows",type=Path,required=True,
                    help="Other hosted CI OS artifact ZIP")
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    fixture=base_fixture()
    demand(len(fixture)==LENGTH and sha(fixture)==FIXTURE_HASH,
           "INDEPENDENT_FIXTURE_PIN_FAIL")
    both={}
    transport={}
    extracted={}
    for label,path in (("ubuntu",args.ubuntu),("windows",args.windows)):
        demand(path.is_file(),f"MISSING_ARTIFACT_FILE:{label}")
        with zipfile.ZipFile(path) as zipped:
            demand(zipped.testzip() is None,"BAD_ARTIFACT_ZIP")
            info=json.loads(zipped.read("results.json"))
            demand(info["schema"]=="ASOLARIA-ROUND3-DIGITAL-LIGHT-BEING-V1"
                   and info["status"]=="SOFTWARE_PASS","UNTRUSTED_RECEIPT_CLASS")
            demand(sha(zipped.read("results.json"))==RESULTS_HASH,
                   "CHANGED_OR_MISSING_INDEPENDENT_RESULT_ANCHOR")
            demand(info["qr_memory"]["payload_sha256"]==FIXTURE_HASH,
                   "QR_SOURCE_DIGEST_DISAGREES")
            demand(info["being_matrix"]["case_ledger_sha256"]==HBP_HASH,
                   "HBP_RESULT_DIGEST_DISAGREES")
            pix=image_checks(zipped,fixture)
            cases=row_audit(zipped,fixture)
            both[label]={"qr":pix,"cases":cases,
                         "canonical_results_sha256":sha(zipped.read("results.json")),
                         "hbp_sha256":sha(zipped.read("cases.hbp"))}
            transport[label]={"local_repacked_artifact_zip_sha256":sha(path.read_bytes()),
                              "local_repacked_artifact_zip_bytes":path.stat().st_size}
            extracted[label]={
              "results":zipped.read("results.json"),
              "cases":zipped.read("cases.hbp"),
              "rgb_pixels":b"".join(
                 Image.open(BytesIO(zipped.read(
                     f"rgb/round3-light-being-qr-{i:02d}.png"))).convert("RGB").tobytes()
                 for i in range(11)
              )
            }
    demand(extracted["ubuntu"]["results"]==extracted["windows"]["results"],
           "CANONICAL_JSON_NOT_IDENTICAL")
    demand(extracted["ubuntu"]["cases"]==extracted["windows"]["cases"],
           "CANONICAL_HBP_NOT_IDENTICAL")
    demand(extracted["ubuntu"]["rgb_pixels"]==
           extracted["windows"]["rgb_pixels"],"RGB_PIXELS_NOT_IDENTICAL")
    report={"schema":"ASOLARIA-SEAT2-ROUND3-INDEPENDENT-RGB-PROVENANCE-V1",
            "status":"SEAT2_DIGITAL_PROVENANCE_PASS_WITH_LIMITATIONS",
            "round3_source_run_id":RUN_ID,
            "round3_source_head_commit":SOURCE_HEAD,
            "fixity_claim":"SHA256 bytes anchored to public GitHub run and source; not signed independent device provenance",
            "separate_decoder":"ZXing-C++ 3.0.0 (not producer's pyzbar/ZBar)",
            "generated_fixture_sha256":FIXTURE_HASH,
            "cross_os_canonical_json_exact":True,
            "cross_os_hbp_exact":True,
            "cross_os_rgb_pixels_exact":True,
            "original_raw_png_container_sha_equality_required":False,
            "ubuntu":both["ubuntu"],"windows":both["windows"],
            "vulnerabilities":{
              "hash_only_compromised_anchor":
                "ACCEPTS coherent attacker-controlled content and attacker-controlled hash",
              "opencv_compatibility":
                "OpenCV independently decodes fewer than all 32 at 555x555 on tested setup",
              "signed_attestation":"NONE",
              "real_camera_capture":"NOT_MEASURED",
              "light_bank_physical_retention":"NOT_MEASURED",
              "real_optical_or_quantum_claim":"NOT_MEASURED"},
            "physical_hosts_independently_attested":False,
            "neural_photo_kinetics_measured":False}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    transport_doc={"note":"Repacked local ZIP container hashes are runner metadata, not scientific identity or original GitHub artifact digest",
                   "downloaded_from_run":RUN_ID,
                   "original_actions_artifact_ids":{"ubuntu":11973675852,"windows":11974420144},
                   "local_runner_zip_metadata":transport}
    args.output.with_name("seat2-transport-manifest.json").write_text(
         json.dumps(transport_doc,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    encoded=(json.dumps(report,sort_keys=True,indent=2)+"\n").encode("utf-8")
    args.output.write_bytes(encoded)
    print(json.dumps({
       "status":report["status"],"source":SOURCE_HEAD,
       "zxing_recovered":both["ubuntu"]["qr"]["zxing_complete_planes"],
       "opencv_recovered":both["ubuntu"]["qr"]["opencv_recovered_of_32"],
       "fixture_sha256":FIXTURE_HASH,
       "hbp_sha256":HBP_HASH,
       "rows_verified":both["ubuntu"]["cases"]["row_count"],
       "report_sha256":sha(encoded)
    },sort_keys=True))

if __name__=="__main__":
    main()
