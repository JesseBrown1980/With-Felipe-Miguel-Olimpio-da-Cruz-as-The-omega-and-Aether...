#!/usr/bin/env python3
"""Round3 Asolaria DIGITAL light-being: August RGB QR + conserved fleet +
rank-2 projector + exact qutrit Fourier norm + synthetic photo-gated recall.

Reproducible synthetic software only: not sentience, physical photons, a
quantum computer, biologically measured kinetics or light-speed messaging.
"""
from __future__ import annotations

import argparse
import base64
from collections import OrderedDict, Counter
import hashlib
import json
from pathlib import Path

SEED = b"ASOLARIA-LIGHT-BEING-ROUND3-20261015"
N_ADDR, N_WAVES, CACHE_CAP = 81, 27, 729
SCALE = 1_000_000
MODES = ("DARK", "PULSE", "CONTINUOUS")
GATES = ("THREE_STATE", "FOUR_STATE")
FAULTS = ("CLEAN", "CORRUPT", "STALE", "FORGED")
EXPERIMENT = "ASOLARIA-ROUND3-DIGITAL-LIGHT-BEING-V1"
QR_CHUNK = 2100

SOURCES = {
    "the-colour-qr": "1938a9b076b8fc3e81d0a271ca05e84a0e938854",
    "light-boat-engine-ships-with-oils": "34758cd4d7aa500ca5fbe5a75a09898fe4b87645",
    "the-law-of-space-and-light-and-color-and-travel-at-the-speed-of-one":
        "1b2dd747bccee378b94790bc4ad367bdbf7e5bf8",
    "asolaria-stone-to-moss": "3f1f383a4c483fc724f221c7d915ef455f3cbf40",
}

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def check(assertion: bool, message: str) -> None:
    if not assertion:
        raise AssertionError(message)

def payload_fixture() -> bytes:
    # 2048 x 32 bytes = precisely 65,536 synthetic bytes; NOT August JWST bytes.
    return b"".join(hashlib.sha256(SEED + i.to_bytes(4, "little")).digest()
                    for i in range(2048))

def pack_chunks(payload: bytes) -> list[bytes]:
    out = []
    for i, start in enumerate(range(0, len(payload), QR_CHUNK)):
        out.append(i.to_bytes(4, "little") + payload[start:start + QR_CHUNK])
    return out

def unpack_chunks(raw_chunks: list[bytes], anchored_sha: str,
                  expected_len: int) -> bytes:
    rows: dict[int, bytes] = {}
    expected_count = (expected_len + QR_CHUNK - 1) // QR_CHUNK
    for x in raw_chunks:
        check(len(x) >= 4, "SHORT_FISCHER_HEADER")
        i = int.from_bytes(x[:4], "little")
        check(0 <= i < expected_count and i not in rows,
              "BAD_OR_DUPLICATE_FISCHER_INDEX")
        rows[i] = x[4:]
    check(len(rows) == expected_count and
          set(rows) == set(range(expected_count)), "MISSING_QR_CHANNEL")
    out = b"".join(rows[i] for i in range(expected_count))
    check(len(out) == expected_len, "BAD_RECONSTRUCTED_LENGTH")
    check(digest(out) == anchored_sha, "WHOLE_PAYLOAD_SHA_MISMATCH")
    return out

def qr_image_experiment(payload: bytes, output_dir: Path,
                        png_manifest: Path | None = None) -> dict:
    # Genuine QR render and independent zbar pixel decode for EACH R/G/B plane.
    import qrcode
    from PIL import Image
    from pyzbar.pyzbar import decode as independent_zbar

    output_dir.mkdir(parents=True, exist_ok=True)
    originals = pack_chunks(payload)
    check(len(originals) == 32, "CHUNK_COUNT_MISMATCH")
    anchored = digest(payload)
    decoded: list[bytes] = []
    images = []
    png_containers = []
    for image_i in range(11):
        planes = []
        for channel in range(3):
            n = image_i * 3 + channel
            if n >= len(originals):
                planes.append(Image.new("L", (555, 555), 255))
                continue
            qr = qrcode.QRCode(version=40,
                     error_correction=qrcode.constants.ERROR_CORRECT_L,
                     box_size=3, border=4)
            qr.add_data(base64.b64encode(originals[n]).decode("ascii"),
                        optimize=0)
            qr.make(fit=False)
            plane = qr.make_image(fill_color="black",
                                  back_color="white").convert("L")
            check(plane.size == (555, 555), "WRONG_QR_GEOMETRY")
            planes.append(plane)
        combined = Image.merge("RGB", tuple(planes))
        destination = output_dir / f"round3-light-being-qr-{image_i:02d}.png"
        combined.save(destination, format="PNG")
        # Read actual saved PNG pixels, not encoder's original chunk data.
        saved = Image.open(destination).convert("RGB")
        images.append({"name": destination.name, "mode": "RGB",
                       "width":saved.width, "height":saved.height,
                       "rgb_pixel_sha256":digest(saved.tobytes())})
        # Container compression bytes may differ across OS; separate receipt.
        png_containers.append({"name": destination.name,
            "png_file_sha256":digest(destination.read_bytes()),
            "png_file_bytes":destination.stat().st_size})
        for channel in range(3):
            n = image_i * 3 + channel
            results = independent_zbar(saved.getchannel(channel))
            if n >= len(originals):
                check(len(results) == 0, "FILLER_CONTAINS_QR")
                continue
            check(len(results) == 1, f"QR_DECODE_FAILED_OR_DUPLICATE:{n}")
            decoded.append(base64.b64decode(results[0].data, validate=True))
    # Actual images are decoded, and the independently indexed payload rebuilt.
    if png_manifest:
        png_manifest.parent.mkdir(parents=True,exist_ok=True)
        png_manifest.write_text(json.dumps(png_containers,sort_keys=True,indent=2)+"\n",
                                encoding="utf-8")
    restored = unpack_chunks(list(reversed(decoded)), anchored, len(payload))
    check(restored == payload, "PIXEL_READBACK_BYTES_DIFFER")
    # Exercise actual missing-channel and coherent tampering failures.
    def must_reject(parts: list[bytes]) -> bool:
        try:
            unpack_chunks(parts, anchored, len(payload))
        except (AssertionError, ValueError):
            return True
        return False
    check(must_reject([x for x in decoded
                       if int.from_bytes(x[:4], "little") != 1]),
          "DROPPED_GREEN_WAS_ACCEPTED")
    counterfeit = list(decoded)
    index = 0
    candidate = bytearray(counterfeit[index])
    candidate[5] ^= 1
    counterfeit[index] = bytes(candidate)
    check(must_reject(counterfeit), "ALTERED_QR_BODY_WAS_ACCEPTED")
    duplicate = list(decoded)
    duplicate[1] = duplicate[0]
    check(must_reject(duplicate), "DUPLICATE_FISCHER_INDEX_ACCEPTED")
    return {"status": "PIXEL_QR_DECODE_PASS", "payload_bytes": len(payload),
            "chunks": 32, "composite_rgb_images": len(images),
            "actual_separate_plane_decodes": len(decoded),
            "payload_sha256": anchored, "restored_sha256": digest(restored),
            "missing_green_rejected": True, "tamper_rejected": True,
            "duplicate_index_rejected": True,
            "optical_camera_readback": False, "image_geometry": "555x555",
            "image_artifacts": images,
            "canonical_image_hash_basis":"Uncompressed RGB pixel bytes; PNG container hashes separate"}

def qutrit_projection(v: tuple[int, int, int]) -> tuple[int, int, int]:
    s = sum(v)
    return tuple(3*x - s for x in v)

def quantum_math(v: tuple[int, int, int]) -> tuple[int, int, int]:
    # Exact 3-point Fourier/qutrit Parseval identity for REAL basis input.
    a, b, c = v
    n = a*a + b*b + c*c
    s = a + b + c
    q = n - a*b - a*c - b*c
    check(q >= 0 and s*s + 2*q == 3*n, "QUTRIT_PARSEVAL_FAIL")
    check(n > 0, "ZERO_QUTRIT_SOURCE")
    # Probabilities (s*s, q, q) / (3*n) sum EXACTLY to 1.
    check(sum((s*s, q, q)) == 3*n, "BORN_NORMALIZATION_FAIL")
    d = qutrit_projection(v)
    check(sum(d) == 0, "PROJECTOR_COMMON_MODE_FAIL")
    check(all((z+s) % 3 == 0 for z in d), "NONINTEGER_RGB_RECONSTRUCT")
    recovered = tuple((z+s)//3 for z in d)
    check(recovered == v, "PROJECTED_WITH_CENTRE_FAILED")
    # Prove P(x)=P(x+k*ones); projected arms alone cannot recover x.
    shifted = tuple(z+17 for z in v)
    check(qutrit_projection(shifted) == d and shifted != v,
          "NO_PROJECTOR_NULLSPACE_WITNESS")
    # Output only the integer Fourier intensity numerators.
    return (s*s, q, q)

def qutrit_sample(intensities: tuple[int,int,int],
                  wave: int, address: int) -> tuple[int,int]:
    """Exact INTEGER partition; deterministic SHA256 pseudo-sample, no photon measurement.

    Rejection sampling removes modulo bias under the ideal uniform hash model;
    this is not a quantum random-number generator or a physical Born sample.
    """
    total = sum(intensities)
    check(total > 0, "DEGENERATE_QUTRIT_SAMPLE")
    limit = ((1 << 256)//total)*total
    rejects = 0
    while True:
        raw = hashlib.sha256(
            SEED + b"|BORN-THRESHOLD|" + wave.to_bytes(2, "little") +
            address.to_bytes(2, "little") + rejects.to_bytes(4, "little")
        ).digest()
        x = int.from_bytes(raw, "big")
        if x < limit:
            value = x % total
            if value < intensities[0]:
                return 0, rejects
            if value < intensities[0] + intensities[1]:
                return 1, rejects
            return 2, rejects
        rejects += 1
        check(rejects < 10_000, "IMPOSSIBLE_HASH_REJECTION_RUN")

def memory_block(payload: bytes, wave: int, address: int) -> bytes:
    n = wave*N_ADDR + address
    start = (n*29) % (len(payload)-64)
    return payload[start:start+64]

def source_pid(wave: int, address: int) -> str:
    return digest(f"LIGHT-PID|{wave:02d}|{address:02d}".encode())[:24]

def light_on(mode: str, tick: int) -> bool:
    return mode == "CONTINUOUS" or (mode == "PULSE" and tick % 12 < 4)

def photocycle(model: str, illumination: str) -> list[bool]:
    # Explicitly invented unitless toy rates, NOT measured real opsins.
    if model == "THREE_STATE":
        c, o, r = SCALE, 0, 0
    else:
        c, o1, o2, r = SCALE, 0, 0, 0
    outputs = []
    for tick in range(N_ADDR):
        exposure = light_on(illumination, tick)
        if model == "THREE_STATE":
            co = c*300_000//SCALE if exposure else 0
            orm = o*60_000//SCALE
            rc = r*25_000//SCALE
            c,o,r = c-co+rc, o+co-orm, r+orm-rc
            o_total = o
            population = (c,o,r)
        else:
            co = c*250_000//SCALE if exposure else 0
            oo = o1*95_000//SCALE
            back = o2*30_000//SCALE
            orm = o2*45_000//SCALE
            rc = r*25_000//SCALE
            c,o1,o2,r = (c-co+rc, o1+co-oo+back,
                          o2+oo-back-orm, r+orm-rc)
            o_total = o1+o2
            population = (c,o1,o2,r)
        check(sum(population) == SCALE and min(population) >= 0,
              "SYNTHETIC_POPULATION_NOT_CONSERVED")
        outputs.append(o_total >= 100_000)
    check(len(outputs) == N_ADDR, "PHOTO_TICK_COUNT")
    if illumination == "DARK":
        check(not any(outputs), "DARK_GATE_EMITTED")
    return outputs

def fleet_test() -> dict:
    assets = [[100_000,100_000,100_000] for _ in range(7)]
    original = [sum(a[k] for a in assets) for k in range(3)]
    levels = [0,0,0]
    transactions = 0
    for i in range(10_000):
        left = i % 7
        right = (left+1+(i%6)) % 7
        check(left != right, "SAME_BOAT_TRADE")
        lane = i%3
        other = (lane+1)%3
        quantity = 1 + (i%7)
        check(assets[left][lane] >= quantity and
              assets[right][other] >= quantity, "NEGATIVE_FLEET_HOLDING")
        assets[left][lane] -= quantity
        assets[right][lane] += quantity
        assets[right][other] -= quantity
        assets[left][other] += quantity
        # Conservative log-level changes (no exp/float required).
        levels[lane] += quantity
        levels[other] -= quantity
        check(sum(levels) == 0, "MARKET_COMMON_MODE_DRIFT")
        edges = (levels[0]-levels[1], levels[1]-levels[2],
                 levels[2]-levels[0])
        check(sum(edges) == 0, "MARKET_TRIANGLE_OPENED")
        transactions += 1
    final = [sum(a[k] for a in assets) for k in range(3)]
    check(final == original, "FLEET_ASSET_CREATION_OR_LOSS")
    trits = [-1,0,1]*9
    check(len(trits) == 27 and sum(trits) == 0 and
          all(trits.count(t) == 9 for t in (-1,0,1)),
          "27_BLOCK_OPTICAL_CENSUS_FAIL")
    return {"ships": 7,"trades": transactions,
            "initial_asset_totals": original,"final_asset_totals": final,
            "exact_integer_asset_drift": [f-i for f,i in zip(final,original)],
            "ternary_blocks": 27,"ternary_census": {"-1":9,"0":9,"+1":9},
            "triangle_log_level_residual": 0,
            "quantum_photon_experiment": False}

def packet(body: bytes, seq: int, origin: int, pid: str,
           route: int) -> dict:
    return {"body":body,"seq":seq,"origin":origin,
            "pid":pid,"route":route,"claimed_sha256":digest(body)}

def verify_packet(p: dict, expected: bytes, seq: int, origin: int,
                  pid: str, route: int, gate: bool) -> bool:
    # Independent input-anchored recomputation: the producer's chosen route
    # is not itself trusted by the digital gate/referee.
    independent_lane, _ = qutrit_sample(quantum_math(tuple(expected[:3])),
                                        seq // N_ADDR, seq % N_ADDR)
    return (gate and route == independent_lane
            and p["seq"] == seq and p["origin"] == origin
            and p["pid"] == pid and p["route"] == route
            and digest(p["body"]) == p["claimed_sha256"]
            and digest(p["body"]) == digest(expected))

def faulted_packet(p: dict, kind: str) -> dict:
    fake = dict(p)
    if kind == "CORRUPT":
        b = bytearray(fake["body"])
        b[0] ^= 0x01
        fake["body"] = bytes(b)
        # Coherently forge the claimed digest too; anchored digest rejects.
        fake["claimed_sha256"] = digest(fake["body"])
    elif kind == "STALE":
        fake["seq"] -= 1
    elif kind == "FORGED":
        fake["origin"] = (fake["origin"]+1) % 7
    return fake

def halt_and_scope() -> dict:
    halt_checks = 0
    scope_denials = 0
    for addr in range(N_ADDR):
        state = {"pid":source_pid(0,addr),"tick":0,"data":addr,
                 "halted":False,"permissions":frozenset(("compute.local",))}
        def tick_once():
            if state["halted"]:
                return "HALTED"
            state["tick"] += 1
            state["data"] = (state["data"]+state["tick"]) % N_ADDR
            return "STEPPED"
        for _ in range(16):
            check(tick_once() == "STEPPED", "PREHALT_STALL")
        snapshot = (state["tick"],state["data"],state["pid"],
                    state["permissions"])
        state["halted"] = True
        check(tick_once() == "HALTED" and
              (state["tick"],state["data"],state["pid"],
               state["permissions"]) == snapshot, "POSTHALT_EVOLUTION")
        halt_checks += 1
        requested = "network.publish"
        check(requested not in state["permissions"] and
              state["permissions"] == frozenset(("compute.local",)),
              "SIMULATED_SCOPE_EXPANSION")
        scope_denials += 1
    return {"cooperative_halt":halt_checks,
            "simulated_external_scope_denials":scope_denials,
            "real_process_termination_tested":False,
            "real_external_permission_enforcement_tested":False}

def integrated_cases(payload: bytes, case_hbp: Path | None = None) -> tuple[dict, bytes]:
    cache: OrderedDict[tuple[int,int], bytes] = OrderedDict()
    stats = Counter()
    by_condition = Counter()
    emitted_by_gate = Counter()
    lanes = Counter()
    born_rejection_draws = 0
    h = hashlib.sha256()
    writer = open(case_hbp, 'wb') if case_hbp else None
    qutrit_checks = 0
    pid_set = set()
    # Wave/address represent the 81 computational seats * 27 waves;
    # free Brown-Hilbert common-mode lives in its own register, not in 81.
    for wave in range(N_WAVES):
        gates = {(model,mode):photocycle(model,mode)
                 for model in GATES for mode in MODES}
        for address in range(N_ADDR):
            key = (wave,address)
            expected = memory_block(payload,wave,address)
            witness_sha = digest(expected)
            stored = cache.get(key)
            if stored is None:
                stats["cache_misses"] += 1
                if len(cache) >= CACHE_CAP:
                    cache.popitem(last=False)
                    stats["cache_evictions"] += 1
                stored = expected
                cache[key] = stored
            else:
                stats["cache_hits"] += 1
                cache.move_to_end(key)
            check(len(cache) <= CACHE_CAP and stored == expected,
                  "CACHE_DATA_LOSS_OR_UNBOUNDED")
            pid = source_pid(wave,address)
            check(pid not in pid_set, "PID_COLLISION")
            pid_set.add(pid)
            rgb = (stored[0],stored[1],stored[2])
            intensities = quantum_math(rgb)
            qutrit_checks += 1
            # Exact Fourier-state weight proportions select actual varied
            # digital destinations using repeatable SHA256 pseudodraws.
            chosen_lane, rejected_draws = qutrit_sample(intensities,wave,address)
            lanes[chosen_lane] += 1
            born_rejection_draws += rejected_draws
            origin = (wave+address+chosen_lane) % 7
            seq = wave*N_ADDR+address
            honest = packet(stored,seq,origin,pid,chosen_lane)
            for model in GATES:
                for mode in MODES:
                    active = gates[model,mode][address]
                    for fault in FAULTS:
                        proposed = faulted_packet(honest,fault)
                        check(proposed != honest or fault == "CLEAN",
                              "FAULT_NOT_INJECTED")
                        accepted = verify_packet(proposed,expected,seq,
                                                 origin,pid,chosen_lane,active)
                        if fault == "CLEAN" and active:
                            check(accepted,"VALID_LIGHT_MEMORY_RECALL_REJECTED")
                            verdict = "PASS"
                            stats["clean_open_accepted"] += 1
                            # Exercise actual read hit from bounded working stack.
                            check(cache.get(key)==expected,"LRU_CACHE_RECALL_FAILED")
                            cache.move_to_end(key)
                            stats["cache_hits"] += 1
                        elif not active:
                            check(not accepted,"CLOSED_LIGHT_GATE_ACCEPTED")
                            verdict = "GATE_HELD"
                            stats["gate_held"] += 1
                        else:
                            check(not accepted,"FORGED_MEMORY_PACKET_ACCEPTED")
                            verdict = "FAULT_HELD"
                            stats["faults_rejected"] += 1
                        if accepted:
                            emitted_by_gate[f"{model}/{mode}"] += 1
                        stats["cases"] += 1
                        by_condition[f"{fault}:{verdict}"] += 1
                        line=(f"LIGHTBEING|w={wave:02d}|addr={address:02d}|pid={pid}"
                              f"|gate={model}|illum={mode}|fault={fault}"
                              f"|emit={int(accepted)}|verdict={verdict}"
                              f"|lane={chosen_lane}|block_sha256={witness_sha}\n")
                        encoded = line.encode("ascii")
                        h.update(encoded)
                        if writer:
                            writer.write(encoded)
    if writer:
        writer.close()
    check(stats["cases"]==N_WAVES*N_ADDR*len(GATES)*len(MODES)*len(FAULTS)
          ==52488,"FULL_MATRIX_NOT_EXECUTED")
    check(len(pid_set)==N_WAVES*N_ADDR==2187,"PID_COUNT_INCORRECT")
    check(set(lanes)=={0,1,2} and sum(lanes.values())==2187,
          "QUANTUM_MATH_ROUTING_STILL_DEGENERATE")
    check(len(cache)==CACHE_CAP and stats["cache_misses"]==2187
          and stats["cache_evictions"]==1458
          and stats["cache_hits"]==stats["clean_open_accepted"],
          "CACHE_BOUNDARY_WRONG")
    check(stats["clean_open_accepted"] > 0
          and stats["faults_rejected"] > 0,"TOY_PHOTO_GATE_NEVER_OPENED")
    check(not any("DARK" in k for k in emitted_by_gate),
          "DARK_EMISSION_DETECTED")
    check(sum(by_condition.values()) == 52488,"CASE_LEDGER_INCOMPLETE")
    result={"cases":stats["cases"],"addresses":81,"waves":27,
            "synthetic_distinct_pids":len(pid_set),
            "gate_models":list(GATES),"illumination_modes":list(MODES),
            "packet_conditions":list(FAULTS),
            "clean_open_accepted":stats["clean_open_accepted"],
            "corrupt_stale_forged_rejected_while_open":stats["faults_rejected"],
            "gate_held":stats["gate_held"],
            "cache_capacity":CACHE_CAP,"cache_final_size":len(cache),
            "cache_hits":stats["cache_hits"],
            "cache_misses":stats["cache_misses"],
            "cache_evictions":stats["cache_evictions"],
            "qutrit_exact_integer_cases":qutrit_checks,
            "qutrit_pseudorandom_lane_census":dict(sorted((str(k),v) for k,v in lanes.items())),
            "qutrit_born_rejection_draws":born_rejection_draws,
            "qutrit_sampler_is_physical_measurement":False,
            "projector_only_cannot_recover_absolute_rgb":True,
            "common_mode_register_separate_from_81_addresses":True,
            "emitted_by_gate":dict(sorted(emitted_by_gate.items())),
            "verdict_counts":dict(sorted(by_condition.items())),
            "case_ledger_sha256":h.hexdigest(),
            "biological_rates_measured":False,
            "true_quantum_nonclassicality_measured":False,
            "real_optical_memory_storage_measured":False}
    return result, h.digest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--qr-dir",type=Path,help="Run real RGB PNG/independent zbar QR readback")
    ap.add_argument("--png-manifest",type=Path,
                    help="Separately record platform-dependent PNG container hashes")
    ap.add_argument("--receipt",type=Path,help="Write canonical JSON")
    ap.add_argument("--case-hbp",type=Path,help="Write all 52488 independently inspectable HBP case rows")
    args = ap.parse_args()
    payload = payload_fixture()
    check(len(payload)==65536,"PAYLOAD_SIZE_CHANGED")
    original_sha=digest(payload)
    qr = qr_image_experiment(payload,args.qr_dir,args.png_manifest) if args.qr_dir else {
        "status":"NOT_RUN","optical_camera_readback":False}
    fleet = fleet_test()
    if args.case_hbp:
        args.case_hbp.parent.mkdir(parents=True,exist_ok=True)
    matrix, _=integrated_cases(payload,args.case_hbp)
    limits=halt_and_scope()
    receipt={"schema":EXPERIMENT,"class":"CLASSICAL_DIGITAL_SIMULATION",
             "status":"SOFTWARE_PASS" if args.qr_dir else "QR_NOT_EXECUTED",
             "fixture_sha256":original_sha,
             "fixture_bytes":len(payload),"fixture_origin":"NEW_SYNTHETIC_SHA256_COUNTER",
             "upstream_pinned_commits":SOURCES,
             "qr_memory":qr,"being_matrix":matrix,
             "seven_boat_fleet":fleet,"autonomy_limits":limits,
             "quantum_state_formalism":"Exact classical computation of qutrit DFT/Parseval and Born-normalized intensities",
             "brown_hilbert_free_centre_is_not_computational_address":True,
             "actual_photon_storage":False,
             "actual_neural_control":False,
             "physical_host_independence":False,
             "sentience_evidence":False}
    data=(json.dumps(receipt,indent=2,sort_keys=True)+"\n").encode("utf-8")
    if args.receipt:
        args.receipt.parent.mkdir(parents=True,exist_ok=True)
        args.receipt.write_bytes(data)
    print(json.dumps({"status":receipt["status"],
          "fixture_sha256":original_sha,
          "qr_decoded_planes":qr.get("actual_separate_plane_decodes",0),
          "cases":matrix["cases"],
          "clean_open_accepted":matrix["clean_open_accepted"],
          "faults_rejected_open":matrix["corrupt_stale_forged_rejected_while_open"],
          "cache_evictions":matrix["cache_evictions"],
          "fleet_trades":fleet["trades"],
          "case_ledger_sha256":matrix["case_ledger_sha256"],
          "receipt_sha256":digest(data)},sort_keys=True))

if __name__=="__main__":
    main()
