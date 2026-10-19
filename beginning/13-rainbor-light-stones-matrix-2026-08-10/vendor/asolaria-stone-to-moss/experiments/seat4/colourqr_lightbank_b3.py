#!/usr/bin/env python3
"""Seat4 B3: 27 simulated memory sticks, August RGB QR payload protocol, dual parity.

Code executes a SOFTWARE memory/erasure experiment, not physical optical storage.
See PREREG-B3-COLOURQR-LIGHTBANK-20261015.md. No network, encryption or QR
raster/camera operations occur here. Source artifacts are frozen Room04 B2 bytes.
"""
import argparse
import base64
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

N_BANKS = 27
BODY = 2100
INDEXED = BODY + 4
PLANE = 2 + INDEXED
RECORD = 4 * PLANE  # R G B plus new, NON-standard fourth XOR parity plane
SAMPLES = 81 * 81
ORDER = ("original-phaseA.hbp", "ticks.hbp", "faults.hbp", "receipt.json")
EXPECTED = {
    "original-phaseA.hbp": (611999, "de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b"),
    "ticks.hbp": (34876953, "2b9575a8d46c2d2f0842d590081641ed2b20daddccc7153107d76efa0d597277"),
    "faults.hbp": (115829, "ad471bc627451f65d6f26797ddf6c03546ac1f74ab8e3698d9825f1409f9bbb2"),
    "receipt.json": (2751, "e63baf8accdfbca43bd23e02b8849fcf312ee904ea3a29e02ab9c11bd8b0dafd"),
}
SCHEMA = "ASOLARIA-SEAT4-COLOURQR-LIGHTBANK-B3-V1"
# Measured after first successful full 35MB Python build, pinned as a
# separate source-trust reference rather than trusting an accompanying hash.
PINNED_MANIFEST_SHA = "a87d27bce1924f3fc4340a337706bf1365cb38919feee71e759f594c3549ced7"


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("ascii")


def xor(*buffers):
    """XOR equal-length fixed-size byte buffers using integer arithmetic."""
    result = 0
    length = len(buffers[0])
    for source in buffers:
        assert len(source) == length
        result ^= int.from_bytes(source, "little")
    return result.to_bytes(length, "little")


def source_archive(source_dir):
    sources = []
    bodies = []
    offset = 0
    for name in ORDER:
        body = (source_dir / name).read_bytes()
        length, expected = EXPECTED[name]
        assert len(body) == length and sha(body) == expected, ("PINNED_SOURCE_CHANGED", name)
        sources.append({"name": name, "offset": offset, "bytes": length, "sha256": expected})
        bodies.append(body)
        offset += length
    header = {"schema": "ASOLARIA-SEAT4-B3-TYPED-ARCHIVE-V1", "sources": sources,
              "scope": "four sealed digital Room04 B2 outputs, not photons",
              "authentication": "sha256 integrity against externally pinned expected values, not signatures"}
    encoded = canonical(header)
    assert len(encoded) < (1 << 32)
    archive = struct.pack("<I", len(encoded)) + encoded + b"".join(bodies)
    return archive, header


def parse_archive(archive):
    assert len(archive) >= 4
    head_len = struct.unpack_from("<I", archive, 0)[0]
    assert 0 < head_len < 16384 and 4 + head_len < len(archive)
    head_bytes = archive[4:4 + head_len]
    head = json.loads(head_bytes)
    assert canonical(head) == head_bytes
    assert head["schema"] == "ASOLARIA-SEAT4-B3-TYPED-ARCHIVE-V1"
    assert len(head["sources"]) == 4
    data = archive[4 + head_len:]
    offset = 0
    for name, item in zip(ORDER, head["sources"], strict=True):
        assert item["name"] == name
        assert item["offset"] == offset
        length, expected = EXPECTED[name]
        assert item["bytes"] == length and item["sha256"] == expected
        body = data[offset:offset + length]
        assert len(body) == length and sha(body) == expected
        offset += length
    assert offset == len(data)
    return head


def serial_plane(index, chunk):
    assert 0 <= index < 2 ** 32 and 0 < len(chunk) <= BODY
    payload = struct.pack("<I", index) + chunk
    # This is the *ordinary-QR payload contract*, NOT a rendered QR pixel or
    # a read of a camera/photodiode; standard Base64 roundtrip is checked.
    encoded = base64.b64encode(payload)
    assert len(encoded) <= 2953  # normal QR version 40, low ECC byte capacity
    assert base64.b64decode(encoded, validate=True) == payload
    return struct.pack("<H", len(payload)) + payload + bytes(INDEXED - len(payload))


def plane_decode(plane, expected_index, total_chunks):
    assert len(plane) == PLANE
    length = struct.unpack_from("<H", plane, 0)[0]
    if expected_index >= total_chunks:
        assert plane == bytes(PLANE), "FILLER_PLANE_FORGED"
        return None
    assert 5 <= length <= INDEXED, "INVALID_INDEXED_CHUNK_LENGTH"
    assert plane[2 + length:] == bytes(INDEXED - length), "NONZERO_PADDING"
    packet = plane[2:2 + length]
    assert struct.unpack_from("<I", packet, 0)[0] == expected_index, "CHUNK_INDEX_INVALID_OR_DUPLICATED"
    encoded = base64.b64encode(packet)
    assert len(encoded) <= 2953 and base64.b64decode(encoded, validate=True) == packet
    return packet[4:]


def projector(sample):
    r, g, b = sample
    total = r + g + b
    projected = (3 * r - total, 3 * g - total, 3 * b - total)
    assert sum(projected) == 0
    # P = I - J/3; exact integer numerators, no floating error.
    # The separately saved 8-bit R anchor is the null/common-mode ledger.
    assert (projected[0] - projected[1]) % 3 == 0
    assert (projected[0] - projected[2]) % 3 == 0
    decoded = (r, r - (projected[0] - projected[1]) // 3,
               r - (projected[0] - projected[2]) // 3)
    assert decoded == sample
    return projected, decoded


def projector_trial(source):
    assert projector((0, 0, 0))[0] == projector((1, 1, 1))[0]
    assert projector((253, 253, 253))[0] == projector((0, 0, 0))[0]
    total = 0
    check = set()
    for j in range(SAMPLES):
        offset = (j * 8119) % (len(source) - 3)
        offset -= offset % 3
        triple = tuple(source[offset:offset + 3])
        shadow, recover = projector(triple)
        assert recover == triple
        assert shadow[0] + shadow[1] + shadow[2] == 0
        total += 1
        check.add(offset)
    assert total == SAMPLES
    return {"exact_projector_lifts": total, "unique_source_positions": len(check),
            "shadow_only_equal_mode_collision": True,
            "minimal_worst_case_ground_bits_per_triple": 8,
            "physical_instantaneity_claimed": False}


def gf2_source_recovery(source):
    # Reuse the previously *independently verified* 81-bit algebra, but test
    # its inverse/side-bits on 648 original source memory states, not fabricated
    # algebra-only basis vectors.
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "retention"))
    from retention_poly import LEGACY, STRESS, power, cyclic_product, N
    from minimal_recovery_python import (basis_with_free_columns, tag_of, decode)
    targets = [("legacy", LEGACY[0]), ("legacy", LEGACY[4]),
               ("triad-stress", STRESS[2]), ("triad-stress", STRESS[4])]
    counts = {}
    total = 0
    for family, (name, taps) in targets:
        law = sum(1 << bit for bit in taps)
        for horizon in (1, 10 ** 13):
            jump = power(law, horizon)
            columns = [cyclic_product(jump, 1 << i) for i in range(N)]
            pivots, free = basis_with_free_columns(columns)
            key = family + "/" + name
            counts[key] = len(free)
            assert len(free) in (0, 1, 2)
            for j in range(N):
                pos = (j * 27313 + horizon % 613) % (len(source) - 11)
                inp = int.from_bytes(source[pos:pos + 11], "little") & ((1 << 81) - 1)
                out = cyclic_product(jump, inp)
                tag = tag_of(inp, free)
                assert decode(columns, pivots, free, out, tag) == inp
                total += 1
    assert total == 648
    assert counts == {"legacy/CA150": 2, "legacy/SHIFT": 0,
                      "triad-stress/TAP2": 0, "triad-stress/TAP4": 1}
    return {"source_81bit_reconstructions": total,
            "minimal_missing_input_bits": counts,
            "incorrect_or_omitted_sidebits_not_authenticated": True}


def build(source_dir, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    archive, header = source_archive(source_dir)
    (out_dir / "source.archive").write_bytes(archive)
    chunks = math.ceil(len(archive) / BODY)
    frames = math.ceil(chunks / 3)
    stripes = math.ceil(frames / N_BANKS)
    banks = [bytearray(stripes * RECORD) for _ in range(N_BANKS)]
    encoded = 0
    for i in range(chunks):
        frame = i // 3
        lane = i % 3
        bank = frame % N_BANKS
        stripe = frame // N_BANKS
        body = archive[i * BODY:(i + 1) * BODY]
        encoded_plane = serial_plane(i, body)
        offset = stripe * RECORD + lane * PLANE
        banks[bank][offset:offset + PLANE] = encoded_plane
        encoded += 1
    for bank in banks:
        for stripe in range(stripes):
            offset = stripe * RECORD
            region = bank[offset:offset + 3 * PLANE]
            bank[offset + 3 * PLANE:offset + RECORD] = xor(
                region[0:PLANE], region[PLANE:2 * PLANE],
                region[2 * PLANE:3 * PLANE])
    shadows = bytearray(stripes * RECORD)
    for stripe in range(stripes):
        offset = stripe * RECORD
        shadows[offset:offset + RECORD] = xor(
            *(bank[offset:offset + RECORD] for bank in banks))
    bank_shas = []
    for i, bank in enumerate(banks):
        (out_dir / f"bank-{i:02d}.hbp").write_bytes(bank)
        bank_shas.append(sha(bank))
    (out_dir / "bank-parity.hbp").write_bytes(shadows)
    receipt = {
        "schema": SCHEMA, "classification": "SYNTHETIC_DIGITAL_MEMORY_ONLY",
        "sources": header["sources"],
        "archive_sha256": sha(archive), "archive_bytes": len(archive),
        "chunk_body_bytes": BODY, "chunk_count": chunks,
        "rgb_frame_count": frames, "stripes_per_bank": stripes,
        "data_bank_count": N_BANKS, "rgb_lanes": 3,
        "nonstandard_local_xor_shadow_lanes": 1,
        "additional_full_bank_xor_parity": 1,
        "lane_record_bytes": PLANE, "frame_record_bytes": RECORD,
        "data_bank_sha256": bank_shas, "parity_bank_sha256": sha(shadows),
        "provenance": {
            "colour_qr": "JesseBrown1980/the-colour-qr @ 1938a9b076b8fc3e81d0a271ca05e84a0e938854",
            "projector_law": "JesseBrown1980/the-law-of-space-and-light-and-color-and-travel-at-the-speed-of-one @ 1b2dd747bccee378b94790bc4ad367bdbf7e5bf8",
            "memory_cells": "JesseBrown1980/GitRAM @ e01425204b58dc680d1f3106410ff9ce71260b0d",
        },
        "limits": {"actual_qr_images_rendered_or_camera_decoded": False,
                   "physical_light_stored": False,
                   "physical_neural_activity_measured": False,
                   "measured_light_propagation_or_ftl": False,
                   "independently_authenticated_physical_hosts": False},
    }
    (out_dir / "bank_manifest.json").write_bytes(canonical(receipt))
    result = verify(out_dir, source_dir, internal=True)
    (out_dir / "B3-RESULT.json").write_bytes(canonical(result))
    checksums = []
    for p in sorted(out_dir.iterdir()):
        if p.is_file() and p.name != "SHA256SUMS":
            checksums.append(f"{sha(p.read_bytes())}  {p.name}\n")
    (out_dir / "SHA256SUMS").write_bytes("".join(checksums).encode("ascii"))
    return result


def trusted_bank_manifest(raw):
    """Reject a stale or rewritten bank catalog against the pinned IS digest."""
    assert sha(raw) == PINNED_MANIFEST_SHA, "STALE_OR_TAMPERED_BANK_MANIFEST"
    parsed = json.loads(raw)
    assert canonical(parsed) == raw
    return parsed


def all_bank_files(outdir, manifest):
    banks = []
    for i in range(N_BANKS):
        bank = (outdir / f"bank-{i:02d}.hbp").read_bytes()
        assert sha(bank) == manifest["data_bank_sha256"][i], ("CORRUPT_BANK_HELD", i)
        assert len(bank) == manifest["stripes_per_bank"] * RECORD
        banks.append(bank)
    parity = (outdir / "bank-parity.hbp").read_bytes()
    assert sha(parity) == manifest["parity_bank_sha256"]
    return banks, parity


def recover_colour_plane(planes, parity, missing):
    """Actively refuse two missing RGB planes: one XOR equation is insufficient."""
    assert len(planes) == 3 and len(missing) == 1, "INSUFFICIENT_RGB_PARITY"
    lane = next(iter(missing))
    assert lane in (0, 1, 2)
    assert all(planes[j] is not None for j in range(3) if j != lane)
    assert len(parity) == PLANE
    return xor(parity, *(planes[j] for j in range(3) if j != lane))


def reconstruct_bank(banks, parity, missing, stripes):
    assert len(missing) == 1, "INSUFFICIENT_ERASURE_CAPACITY"
    erased = next(iter(missing))
    recovered = bytearray(stripes * RECORD)
    for s in range(stripes):
        pos = s * RECORD
        recovered[pos:pos + RECORD] = xor(
            parity[pos:pos + RECORD],
            *(bank[pos:pos + RECORD] for i, bank in enumerate(banks) if i != erased))
    return recovered


def restore_archive(banks, manifest, order=None):
    chunks = manifest["chunk_count"]
    frames = manifest["rgb_frame_count"]
    stripes = manifest["stripes_per_bank"]
    assert all(len(b) == stripes * RECORD for b in banks)
    read_order = list(range(frames)) if order is None else order
    assert sorted(read_order) == list(range(frames))
    pieces = [None] * chunks
    for f in read_order:
        bank = banks[f % N_BANKS]
        offset = (f // N_BANKS) * RECORD
        record = bank[offset:offset + RECORD]
        planes = [record[j * PLANE:(j + 1) * PLANE] for j in range(3)]
        assert record[3 * PLANE:4 * PLANE] == xor(*planes), "RGB_SHADOW_PARITY_FAILURE"
        for c, pl in enumerate(planes):
            i = 3 * f + c
            data = plane_decode(pl, i, chunks)
            if data is not None:
                assert pieces[i] is None
                pieces[i] = data
    assert all(p is not None for p in pieces)
    raw = b"".join(pieces)
    assert len(raw) == manifest["archive_bytes"]
    assert sha(raw) == manifest["archive_sha256"]
    parse_archive(raw)
    return raw


def verify(out_dir, source_dir, internal=False):
    manifest_raw = (out_dir / "bank_manifest.json").read_bytes()
    manifest = trusted_bank_manifest(manifest_raw)
    mutated = bytearray(manifest_raw)
    mutated[len(mutated) // 2] ^= 1
    try:
        trusted_bank_manifest(bytes(mutated))
        raise AssertionError("Stale manifest illegally accepted")
    except AssertionError as exc:
        assert str(exc) == "STALE_OR_TAMPERED_BANK_MANIFEST"
    assert manifest["schema"] == SCHEMA
    assert manifest["classification"] == "SYNTHETIC_DIGITAL_MEMORY_ONLY"
    assert manifest["sources"] == source_archive(source_dir)[1]["sources"]
    archive = (out_dir / "source.archive").read_bytes()
    assert len(archive) == manifest["archive_bytes"]
    assert sha(archive) == manifest["archive_sha256"]
    assert manifest["chunk_body_bytes"] == BODY
    assert manifest["data_bank_count"] == N_BANKS
    assert manifest["lane_record_bytes"] == PLANE
    assert manifest["frame_record_bytes"] == RECORD
    assert manifest["rgb_frame_count"] == math.ceil(manifest["chunk_count"] / 3)
    assert manifest["stripes_per_bank"] == math.ceil(manifest["rgb_frame_count"] / N_BANKS)
    banks, parity = all_bank_files(out_dir, manifest)
    assert restore_archive(banks, manifest) == archive
    assert restore_archive(banks, manifest, list(reversed(range(manifest["rgb_frame_count"])))) == archive
    first = banks[0]
    # One missing RGB plane is uniquely determined by 4th channel XOR.
    one_lost = 0
    for f in range(manifest["rgb_frame_count"]):
        bank = banks[f % N_BANKS]
        pos = f // N_BANKS * RECORD
        record = bank[pos:pos + RECORD]
        lane = f % 3
        sources = [record[i * PLANE:(i + 1) * PLANE] for i in range(3)]
        shadow = record[3 * PLANE:4 * PLANE]
        submitted = [value if i != lane else None for i, value in enumerate(sources)]
        assert recover_colour_plane(submitted, shadow, {lane}) == sources[lane], "SINGLE_PLANE_ERASURE_NOT_RECOVERED"
        one_lost += 1
    # TWO missing lanes plus one XOR relation have at least one free value.
    a, b = bytes(PLANE), bytes([1]) + bytes(PLANE - 1)
    assert xor(a, a) == xor(b, b) and a != b
    try:
        recover_colour_plane([None, None, bytes(PLANE)], bytes(PLANE), {0, 1})
        raise AssertionError("Two erased RGB planes illegally recovered")
    except AssertionError as exc:
        assert str(exc) == "INSUFFICIENT_RGB_PARITY"
    two_lane_status = "HELD_INSUFFICIENT_EQUATIONS"
    # Single entire bank gone; parity cell must reconstruct exact full bytes.
    recovered = reconstruct_bank(banks, parity, {7}, manifest["stripes_per_bank"])
    assert sha(recovered) == manifest["data_bank_sha256"][7]
    one_missing = list(banks)
    one_missing[7] = recovered
    assert restore_archive(one_missing, manifest) == archive
    # Corrupt the other bank at the byte level; checksum MUST reject it.
    damaged = bytearray(banks[12])
    damaged[PLANE + 10] ^= 0x01
    assert sha(damaged) != manifest["data_bank_sha256"][12]
    another_missing = list(banks)
    another_missing[12] = None
    recovered_corruption = reconstruct_bank(
        another_missing, parity, {12}, manifest["stripes_per_bank"])
    assert sha(recovered_corruption) == manifest["data_bank_sha256"][12]
    another_missing[12] = recovered_corruption
    assert restore_archive(another_missing, manifest) == archive
    try:
        reconstruct_bank(banks, parity, {7, 12}, manifest["stripes_per_bank"])
        raise AssertionError("Two erased banks illegally declared recovered")
    except AssertionError as exc:
        assert str(exc) == "INSUFFICIENT_ERASURE_CAPACITY"
    # An index mismatch and duplicate read are never silently merged.
    tampered_bank = bytearray(first)
    tampered_bank[2] ^= 0x01  # forge LE uint32 index of first R plane
    # Also forge matching local XOR shadow: the address gate must reject even
    # when the local fourth parity plane is internally self-consistent.
    tampered_bank[3 * PLANE:4 * PLANE] = xor(
        tampered_bank[0:PLANE], tampered_bank[PLANE:2 * PLANE],
        tampered_bank[2 * PLANE:3 * PLANE])
    forged_banks = list(banks)
    forged_banks[0] = tampered_bank
    try:
        restore_archive(forged_banks, manifest)
        raise AssertionError("Forged index accepted")
    except AssertionError as exc:
        assert str(exc) == "CHUNK_INDEX_INVALID_OR_DUPLICATED"
    # Test projector on actual source trace memory.
    old = (source_dir / "ticks.hbp").read_bytes()
    projection = projector_trial(old)
    gf2 = gf2_source_recovery(old)
    assert not manifest["limits"]["physical_light_stored"]
    return {
        "schema": SCHEMA + "-EXECUTION-RECEIPT",
        "status": "PASS", "classification": "MEASURED_SOFTWARE_ONLY",
        "source_payload_bytes": sum(x[0] for x in EXPECTED.values()),
        "archive_bytes": len(archive), "archive_sha256": sha(archive),
        "source_objects_restored": len(ORDER),
        "qr_indexed_base64_chunks": manifest["chunk_count"],
        "rgb_frames_recovered_shuffled": manifest["rgb_frame_count"],
        "data_banks": N_BANKS, "additional_parity_banks": 1,
        "colour_plane_erasure_recoveries": one_lost,
        "one_whole_bank_erasure_recovered": True,
        "one_whole_bank_corruption_detected_and_recovered": True,
        "two_whole_bank_erasures": "HELD_INSUFFICIENT_EQUATIONS",
        "two_same_frame_colour_erasures": two_lane_status,
        "forged_address_rejected": True,
        "exact_projector": projection,
        "gf2_on_real_trace_memory": gf2,
        "halt_external_privileges_granted": 0,
        "qr_raster_or_camera_decoding": False,
        "physical_optical_storage_measured": False,
        "physical_propagation_or_neural_measurement": False,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--source-dir", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--verify-only", action="store_true")
    a = p.parse_args()
    result = verify(a.out, a.source_dir) if a.verify_only else build(a.source_dir, a.out)
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
