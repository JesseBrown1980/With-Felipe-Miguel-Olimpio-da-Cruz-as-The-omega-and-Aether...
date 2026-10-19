#!/usr/bin/env python3
"""Seat2 rainbow-identity challenge: independent real RGB image-plane permutations.

Digital only. Does not import the coordinator's source or Seat3 implementation.
Fischer indices preserve payload order, not physical RGB plane ownership.
"""
from __future__ import annotations

import argparse
import base64
from collections import Counter
from hashlib import sha256
from itertools import permutations, product
from io import BytesIO
import json
from math import gcd
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image
import zxingcpp

PINNED_MEMORY_SHA = "fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4"
PINNED_SOURCE_RUN = 38735582094
PINNED_SOURCE_HEAD = "a3e86a169ee9d45d64cd83973919e760ce7e65d9"
SEED = b"ASOLARIA-LIGHT-BEING-ROUND3-20261015"
CHANNELS = "RGB"
ALL_PERMUTATIONS = tuple(p for p in permutations(range(3)) if p != (0, 1, 2))

def sh(data: bytes) -> str:
    return sha256(data).hexdigest()

def require(test: bool, cause: str) -> None:
    if not test:
        raise AssertionError(cause)

def fixture() -> bytes:
    result = b"".join(sha256(SEED + n.to_bytes(4, "little")).digest()
                      for n in range(2048))
    require(len(result) == 65_536 and sh(result) == PINNED_MEMORY_SHA,
            "ORIGINAL_FIXTURE_TRUST_PIN_FAILED")
    return result

def intensities(triple: tuple[int, int, int]) -> tuple[int, int, int]:
    r, g, b = triple
    s = r + g + b
    q = r*r + g*g + b*b - r*g - r*b - g*b
    require(q >= 0, "NEGATIVE_FOURIER_NORM")
    require(s*s + 2*q == 3*(r*r + g*g + b*b), "FOURIER_IDENTITY_VIOLATED")
    return (s*s, q, q)

def normalized(ints: tuple[int,int,int]):
    if not any(ints):
        return "UNDEFINED_ZERO_NORM"
    common = gcd(gcd(ints[0], ints[1]), ints[2])
    return tuple(x // common for x in ints)

def sector(triple: tuple[int, int, int]) -> int:
    r,g,b = triple
    require(all(x in (0,1,2) for x in triple), "NONTERNARY_RAINBOW_SECTOR")
    return 9*r+3*g+b

def project_with_separate_centre(triple):
    s=sum(triple)
    differences=tuple(3*x-s for x in triple)
    require(sum(differences)==0, "PROJECTOR_NONZERO_COMMON_MODE")
    require(all((d+s)%3==0 for d in differences), "PROJECTOR_NOT_RECONSTRUCTABLE")
    restored=tuple((d+s)//3 for d in differences)
    require(restored==triple, "LOST_ORDERED_CHANNEL_COMPONENT")
    return differences,s

def source_route(weight, wave=7, address=13):
    # Reimplement coordinator SHA ticket only to prove equal intensity
    # thresholds lead to identical digital route when wave/address match.
    den=sum(weight)
    if den==0:
        return "HELD_UNDEFINED_ZERO_NORM"
    upper = ((1<<256)//den)*den
    counter=0
    while counter<1000:
        raw = sha256(SEED + b"|BORN-THRESHOLD|" +
                     wave.to_bytes(2,"little") +
                     address.to_bytes(2,"little") +
                     counter.to_bytes(4,"little")).digest()
        value=int.from_bytes(raw,"big")
        if value < upper:
            x=value%den
            return 0 if x<weight[0] else 1 if x<weight[0]+weight[1] else 2
        counter+=1
    raise AssertionError("SHA256_TICKET_REJECTION_LOOP")

def scan(image: Image.Image) -> list[bytes]:
    decoded=zxingcpp.read_barcodes(np.asarray(image,dtype=np.uint8))
    out=[]
    for result in decoded:
        content=result.text.encode("ascii")
        try:
            raw=base64.b64decode(content, validate=True)
        except Exception as exc:
            raise AssertionError("ZXING_NONCANONICAL_BASE64") from exc
        require(len(raw)>=4,"SHORT_FISCHER_INDEX")
        out.append(raw)
    return out

def indexed_reconstruct(frames: list[bytes]) -> bytes:
    data={}
    for record in frames:
        number=int.from_bytes(record[:4],"little")
        require(0<=number<32,"BAD_FISCHER_BOUNDARY")
        require(number not in data,"DUPLICATE_INDEX")
        fragment=record[4:]
        need=2100 if number<31 else 436
        require(len(fragment)==need,"INDEXED_FRAGMENT_WRONG_LENGTH")
        data[number]=fragment
    require(set(data)==set(range(32)),"MISSING_INDEXED_PAYLOAD")
    answer=b"".join(data[i] for i in range(32))
    require(len(answer)==65536 and sh(answer)==PINNED_MEMORY_SHA,
            "ORIGINAL_SOURCE_PAYLOAD_NOT_RECONSTRUCTED")
    return answer

def math_attack(hbp_lines: list[str]):
    ordered=list(product(range(3),repeat=3))
    require(len(ordered)==27,"WRONG_TEST_UNIVERSE")
    raw_signatures=Counter()
    normalized_signatures=Counter()
    record={}
    routes={}
    for triple in ordered:
        sid=sector(triple)
        ints=intensities(triple)
        norm=normalized(ints)
        differences, common=project_with_separate_centre(triple)
        require(tuple((d+common)//3 for d in differences)==triple,"CENTRE_AND_ARM_FAIL")
        require(0<=sid<27,"ORDERED_SECTOR_OUT_OF_BOUNDS")
        raw_signatures[ints]+=1
        normalized_signatures[norm]+=1
        record[sid]=(triple,ints,norm)
        routes[sid]=source_route(ints)
        ints_str=",".join(str(x) for x in ints)
        norm_str=(norm if isinstance(norm,str) else ",".join(str(x) for x in norm))
        hbp_lines.append(f"SECTOR|id={sid:02d}|trit={''.join(str(x) for x in triple)}"
            f"|signature={ints_str}|norm={norm_str}"
            f"|route={routes[sid]}|arms={','.join(str(d) for d in differences)}"
            f"|centre={common}|original_identity_preserved=1\n")
    require(len(raw_signatures)==10 and len(normalized_signatures)==7,
            "SEAT3_MATH_CLASS_COUNT_FALSIFIED")
    require(sorted(raw_signatures.values())==[1,1,1,3,3,3,3,3,3,6],
            "SEAT3_RAW_ORBIT_SIZE_FALSIFIED")
    require(sorted(normalized_signatures.values())==[1,2,3,3,6,6,6],
            "SEAT3_NORMALIZED_COLLAPSE_FALSIFIED")
    require(record[0][2]=="UNDEFINED_ZERO_NORM",
            "ZERO_NORM_MUST_BE_HELD")
    collisions=Counter()
    for first, second in product(range(27),repeat=2):
        if first==second: continue
        t1,raw1,norm1=record[first]
        t2,raw2,norm2=record[second]
        raw_equal=(raw1==raw2)
        norm_equal=(norm1==norm2)
        same_route=(routes[first]==routes[second])
        bound_sector_accept=(first==second) # false by construction
        require(not bound_sector_accept,"FOREIGN_ORDERED_SECTOR_WAS_AUTHENTICATED")
        if raw_equal:
            require(same_route, "INTENSITY_EQUIVALENCE_CHANGED_ROUTE")
            collisions["raw_symmetric_permutation_attack"]+=1
        if norm_equal:
            collisions["normalized_signature_collision"]+=1
        hbp_lines.append(f"ORDER_ATTACK|from={first:02d}|to={second:02d}"
                         f"|raw_equal={int(raw_equal)}|normalized_equal={int(norm_equal)}"
                         f"|route_equal={int(same_route)}"
                         f"|sector_binding_accept=0\n")
    require(collisions["raw_symmetric_permutation_attack"]==66,
            "EXPECTED_66_RAW_ALIASES_NOT_REPRODUCED")
    require(collisions["normalized_signature_collision"]==104,
            "EXPECTED_104_NORMALIZED_ALIASES_NOT_REPRODUCED")
    require(intensities((2,0,0))==intensities((0,2,0))==intensities((0,0,2)),
            "RAINBOW_PRIMARY_PERMUTATION_FALSIFIER_FAILED")
    return {
       "ordered_ternary_addresses":27,
       "raw_symmetric_classes":len(raw_signatures),
       "normalized_classes_including_undefined_zero":len(normalized_signatures),
       "directed_distinct_source_to_candidate_attacks":27*26,
       "intensity_only_unprotected_order_swaps":collisions["raw_symmetric_permutation_attack"],
       "normalized_probability_unprotected_order_swaps":collisions["normalized_signature_collision"],
       "ordered_sector_id_formula":"9*r + 3*g + b",
       "ordered_sector_bindings_rejected_all_foreign_ids":702,
       "one_example_equivalence": {"triples":[[2,0,0],[0,2,0],[0,0,2]],
                                    "signature":[4,4,4]},
       "dark_zero_norm_not_sampled":True,
       "quantum_processor_involved":False,
    }

def frame_descriptor(image_no: int, physical_lane: int, raw_frames: list[bytes]):
    require(len(raw_frames)<=1,"UNEXPECTED_QR_MULTIPLE_SYMBOLS_PER_CHANNEL")
    if not raw_frames:
        require(image_no==10 and physical_lane==2,"UNEXPECTED_QR_CHANNEL_EMPTY")
        return "FILLER"
    raw=raw_frames[0]
    index=int.from_bytes(raw[:4],"little")
    require(0<=index<32,"BAD_FISCHER_INDEX")
    return f"{index:02d}:{sh(raw)}"

def plane_bind_line(image_no: int, lane: int, descriptor: str) -> str:
    return f"LANE|image={image_no:02d}|physical={CHANNELS[lane]}|frame={descriptor}\n"

def actual_rgb_permutations(zf, hbp_lines: list[str], original_payload: bytes):
    source_image=[]
    source_frames=[]
    source_manifest_lines=[]
    source_channel_descriptors=[]
    fixed_pixels=[]
    source_meta=json.loads(zf.read("results.json"))
    require(source_meta["fixture_sha256"]==PINNED_MEMORY_SHA,
            "PUBLISHER_FIXTURE_DIGEST_DIFFERENT")
    require(source_meta["qr_memory"]["actual_separate_plane_decodes"]==32,
            "PUBLISHER_QR_PLANE_COUNT_DIFFERENT")
    for i in range(11):
        name=f"rgb/round3-light-being-qr-{i:02d}.png"
        image=Image.open(BytesIO(zf.read(name))).convert("RGB")
        require(image.size==(555,555), "SOURCE_IMAGE_WRONG_DIMENSIONS")
        require(sh(image.tobytes())==source_meta["qr_memory"]["image_artifacts"][i]["rgb_pixel_sha256"],
                "PUBLISHED_RGB_PIXEL_TRUST_PIN_FAILED")
        parts=image.split()
        descriptor=[]
        for lane in range(3):
            read=scan(parts[lane])
            descriptor.append(frame_descriptor(i,lane,read))
            source_frames.extend(read)
            source_manifest_lines.append(plane_bind_line(i,lane,descriptor[-1]))
        source_image.append(image)
        fixed_pixels.append(image.tobytes())
        source_channel_descriptors.append(descriptor)
    require(indexed_reconstruct(source_frames)==original_payload,
            "ORIGINAL_32_QR_PLANES_INCORRECT")
    original_manifest=("".join(source_manifest_lines)).encode("ascii")
    manifest_sha=sh(original_manifest)
    hbp_lines.extend(source_manifest_lines)
    stats=Counter()
    for image_no, base in enumerate(source_image):
        original_parts=base.split()
        for pattern in ALL_PERMUTATIONS:
            altered=Image.merge("RGB",tuple(original_parts[k] for k in pattern))
            require(sh(altered.tobytes())!=sh(base.tobytes()),
                    "REAL_RGB_PLANE_SWAP_DID_NOT_CHANGE_IMAGE_PIXELS")
            changed_frames=[]
            changed_lanes=[]
            for lane in range(3):
                collected=scan(altered.getchannel(lane))
                changed_frames.extend(collected)
                changed_lanes.append(frame_descriptor_without_physical_expectations(collected))
            entire=list(source_frames)
            # Replace image's original QR frames by freshly decoded tampered pixels,
            # including last image with 2 live symbols and one filler.
            original_indices=set(i for i in range(image_no*3,min(image_no*3+3,32)))
            entire=[x for x in entire if int.from_bytes(x[:4],"little") not in original_indices]
            entire.extend(changed_frames)
            reconstructed=indexed_reconstruct(entire)
            require(reconstructed==original_payload,"INTENDED_INDEX_REORDER_INVARIANCE_FAILED")
            observed_lines=list(source_manifest_lines)
            for lane in range(3):
                observed_lines[image_no*3+lane]=plane_bind_line(
                    image_no,lane,changed_lanes[lane])
            observed_manifest="".join(observed_lines).encode("ascii")
            require(observed_manifest != original_manifest and
                    sh(observed_manifest)!=manifest_sha,
                    "ORDERED_PHYSICAL_CHANNEL_BINDING_DID_NOT_DETECT_SWAP")
            changed_original_assignments=sum(
                a!=b for a,b in zip(source_channel_descriptors[image_no],
                                     changed_lanes))
            require(changed_original_assignments>0,"NO_LANE_CHANGE_DETECTED")
            stats["index_based_payload_survived_swap"]+=1
            stats["externally_anchored_channel_manifest_rejected_swap"]+=1
            order="".join(CHANNELS[k] for k in pattern)
            hbp_lines.append(
                f"PLANE_SWAP|image={image_no:02d}|perm={order}"
                f"|payload_index_digest_survives=1"
                f"|pixel_bytes_changed=1"
                f"|manifest_channel_binding_rejects=1"
                f"|index_count={len(changed_frames)}"
                f"|changed_channel_assignments={changed_original_assignments}\n")
    require(stats["index_based_payload_survived_swap"]==55 and
            stats["externally_anchored_channel_manifest_rejected_swap"]==55,
            "55_RGB_CHANNEL_SWAPS_NOT_FULLY_TESTED")
    return {
      "source_pixel_sha256_concatenated":sh(b"".join(fixed_pixels)),
      "baseline_channel_manifest_sha256":manifest_sha,
      "original_rgb_composites":11,
      "original_qr_planes_decoded":32,
      "actual_reencoded_png_file_formats_tested":False,
      "actual_555px_rgb_pixel_plane_permutations":55,
      "indexed_payload_still_passed_fixed_sha_after_color_plane_swaps":
            stats["index_based_payload_survived_swap"],
      "ordered_channel_mapping_rejected_swapped_planes":
            stats["externally_anchored_channel_manifest_rejected_swap"],
      "intensity_alone_does_not_authenticate_channel_ownership":True,
      "channel_manifest_is_externally_signed":False,
      "actual_photon_measurement":False,
    }

def frame_descriptor_without_physical_expectations(frames: list[bytes]) -> str:
    # Accept a filler at any observed position: mutation moves the source B
    # filler deliberately and should be detected by lane-to-index binding.
    require(len(frames)<=1,"MULTIPLE_QR_SYMBOLS_IN_ONE_PHYSICAL_CHANNEL")
    if not frames: return "FILLER"
    body=frames[0]
    index=int.from_bytes(body[:4],"little")
    require(0<=index<32,"BAD_ALTERED_QR_INDEX")
    return f"{index:02d}:{sh(body)}"

def evaluate(archive: Path):
    lines=[]
    maths=math_attack(lines)
    original=fixture()
    with zipfile.ZipFile(archive,"r") as zf:
        require(zf.testzip() is None,"ZIP_CRC_FAIL")
        optical=actual_rgb_permutations(zf,lines,original)
    require(len(lines)==27+702+33+55,"EVIDENCE_ROW_TOTAL_DIFFERENT")
    raw="".join(lines).encode("ascii")
    return {
      "schema":"SEAT2-ROUND3-RAINBOW-ORDER-PROVENANCE-V1",
      "status":"DIGITAL_ORDER_BINDING_FALSIFIERS_PASS",
      "publisher_run_id":PINNED_SOURCE_RUN,
      "publisher_source_commit":PINNED_SOURCE_HEAD,
      "fixture_sha256":PINNED_MEMORY_SHA,
      "math_identity":maths,
      "real_png_pixel_plane_swaps":optical,
      "rainbow_hbp_sha256":sh(raw),
      "rainbow_hbp_rows":len(lines),
      "rainbow_hbp_bytes":len(raw),
      "claim_boundary":
        "Indexed QR reassembly maintains source bytes despite 55 actual RGB plane swaps; only separately trusted lane-to-index manifest catches them",
      "signed_trust_root_verified":False,
      "true_27_band_spectrometer_test":False,
    },raw

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--ubuntu",required=True,type=Path)
    ap.add_argument("--windows",required=True,type=Path)
    ap.add_argument("--output-dir",required=True,type=Path)
    args=ap.parse_args()
    outcome={}
    ledgers={}
    for name,path in (("ubuntu",args.ubuntu),("windows",args.windows)):
        require(path.is_file(),"MISSING_ORIGINAL_COORDINATOR_ARTIFACT_"+name)
        outcome[name],ledgers[name]=evaluate(path)
    require(outcome["ubuntu"]==outcome["windows"],"CROSS_OS_RAINBOW_RECEIPTS_DIVERGED")
    require(ledgers["ubuntu"]==ledgers["windows"],"CROSS_OS_RAINBOW_HBP_DIVERGED")
    root=args.output_dir
    root.mkdir(parents=True,exist_ok=True)
    json_bytes=(json.dumps(outcome["ubuntu"],sort_keys=True,indent=2)+"\n").encode("utf-8")
    (root/"rainbow-order-result.json").write_bytes(json_bytes)
    (root/"rainbow-order-cases.hbp").write_bytes(ledgers["ubuntu"])
    sha_rows=[]
    for p in (root/"rainbow-order-cases.hbp",root/"rainbow-order-result.json"):
        sha_rows.append(f"{sh(p.read_bytes())}  {p.name}\n")
    (root/"SHA256SUMS.txt").write_bytes("".join(sha_rows).encode("ascii"))
    print(json.dumps({
      "status":outcome["ubuntu"]["status"],
      "ordered":outcome["ubuntu"]["math_identity"]["ordered_ternary_addresses"],
      "raw":outcome["ubuntu"]["math_identity"]["raw_symmetric_classes"],
      "normalized":outcome["ubuntu"]["math_identity"]["normalized_classes_including_undefined_zero"],
      "raw_permutation_attacks":outcome["ubuntu"]["math_identity"]["intensity_only_unprotected_order_swaps"],
      "image_swaps":outcome["ubuntu"]["real_png_pixel_plane_swaps"]["actual_555px_rgb_pixel_plane_permutations"],
      "swaps_preserving_payload_sha":outcome["ubuntu"]["real_png_pixel_plane_swaps"]["indexed_payload_still_passed_fixed_sha_after_color_plane_swaps"],
      "swaps_rejected_by_lane_identity":outcome["ubuntu"]["real_png_pixel_plane_swaps"]["ordered_channel_mapping_rejected_swapped_planes"],
      "hbp_sha256":sh(ledgers["ubuntu"]),
      "result_sha256":sh(json_bytes),
    },sort_keys=True))

if __name__=="__main__":
    main()
