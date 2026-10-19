#!/usr/bin/env python3
"""Seat 2: independently hash original full HST FITS, then extract real SCI pixel
bytes as a bounded Colour QR interoperability input. No invented epochs.
This is detector DIGITAL pixel storage, not physical photon-memory retention.
"""
from __future__ import annotations
import hashlib
import pathlib
import sys

SOURCES = (
    ("ic3j01a8q_flc.fits", "2012-10-01", 42526080, "cc8d0afe69943b5aec7e678a75ac84341138d6343e092a7ab99b276006ab541c"),
    ("icdc03lzq_flc.fits", "2014-04-01", 42341760, "fd8563aaabf0530f3dc5a1ee837c1759493f3015335f85cc36a11d4005217ad0"),
    ("icpc01xwq_flc.fits", "2015-04-16", 42393600, "68a2633f54141cb0d55f1d8a35bbcca20654163a97c75ad408a3169e8e50fc67"),
)
SLICE_BYTES = 2100  # 525 original SCI detector float32 words per date, raw bytes unchanged

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def check(cond: bool, desc: str) -> None:
    if not cond:
        raise ValueError(desc)

def parse_hdu(raw: bytes, offset: int):
    check(offset >= 0 and offset % 2880 == 0 and offset < len(raw), "FITS_HDU_OFFSET")
    entries = {}
    end = False
    cards = 0
    while not end:
        p = raw[offset + cards*80 : offset + (cards+1)*80]
        check(len(p) == 80 and p.isascii(), "FITS_BAD_HEADER_CARD")
        cards += 1
        check(cards <= 8000, "FITS_HEADER_UNBOUNDED")
        key = p[:8].decode("ascii").strip()
        if key == "END":
            end = True
        elif p[8:10] == b"= ":
            value = p[10:].decode("ascii").strip()
            if value.startswith("'"):
                value = value[1:].split("'")[0].strip()
            else:
                value = value.split("/")[0].strip()
            if key and key not in entries:
                entries[key] = value
    data_start = offset + ((cards*80 + 2879)//2880)*2880
    ndim = int(entries.get("NAXIS", 0))
    check(0 <= ndim <= 6, "FITS_INVALID_AXES")
    body = 0 if ndim == 0 else abs(int(entries["BITPIX"]))//8
    for axis in range(1,ndim+1):
        body *= int(entries[f"NAXIS{axis}"])
    if ndim:
        body = (body + int(entries.get("PCOUNT", 0))) * int(entries.get("GCOUNT", 1))
    next_hdu = data_start + ((body+2879)//2880)*2880
    check(next_hdu <= len(raw), "TRUNCATED_FITS")
    return entries, data_start, next_hdu

def science_sample(raw: bytes):
    first = None
    pos = 0
    for _ in range(16):
        header, data_start, next_hdu = parse_hdu(raw, pos)
        if first is None:
            first = header
        if header.get("EXTNAME") == "SCI" and header.get("EXTVER", "1") == "1":
            check(header.get("NAXIS") == "2" and header.get("BITPIX") == "-32", "SCI_NOT_CALIBRATED_32BIT")
            check(int(header.get("NAXIS1","0")) * int(header.get("NAXIS2","0")) * 4 >= SLICE_BYTES, "SCI_TOO_SHORT")
            check(data_start+SLICE_BYTES <= next_hdu, "SCI_TRUNCATED")
            return first, header, raw[data_start:data_start+SLICE_BYTES]
        pos = next_hdu
    raise ValueError("SCI_NOT_FOUND")

def write_checksum(path: pathlib.Path, data: bytes) -> None:
    path.write_bytes(data)
    (path.parent / (path.name + ".sha256")).write_text(f"{sha(data)}  {path.name}\n", encoding="ascii")

def main(archive_dir: pathlib.Path, output_dir: pathlib.Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    chunks = []
    rows = ["HBP1|schema=SEAT2-THREE-REAL-HST-F555W-SCI-QR-FRAMES|scope=RAW_PIXEL_BYTES|json=0"]
    for i, (name, date, size, expected_sha) in enumerate(SOURCES):
        data = (archive_dir/name).read_bytes()
        check(len(data) == size, f"WRONG_FULL_FITS_LENGTH:{name}")
        check(sha(data) == expected_sha, f"WRONG_FULL_FITS_SHA:{name}")
        sidecar = (archive_dir/(name+".sha256")).read_text(encoding="ascii")
        check(sidecar == f"{expected_sha}  {name}\n", f"ORIGINAL_SHA_SIDECAR_CHANGED:{name}")
        check(data.startswith(b"SIMPLE  ="), f"NOT_FITS:{name}")
        primary, sci, slice_bytes = science_sample(data)
        check(primary.get("DATE-OBS") == date, f"FALSIFIED_OBS_DATE:{name}")
        check(primary.get("ROOTNAME","").lower() == name[:9], f"BAD_ROOT:{name}")
        check(primary.get("INSTRUME") == "WFC3" and primary.get("DETECTOR") == "UVIS", f"BAD_SENSOR:{name}")
        check(primary.get("FILTER") == "F555W", f"BAD_BAND:{name}")
        check(primary.get("TARGNAME","").startswith("PROXIMA"), f"BAD_TARGET:{name}")
        check(sci.get("BITPIX") == "-32", "BAD_SCI_WORD_TYPE")
        chunks.append(slice_bytes)
        rows.append(f"OBS|index={i}|original_fits={name}|observation_date={date}|full_source_bytes={size}|full_source_sha256={expected_sha}|sci_sample_bytes={len(slice_bytes)}|sci_words=525|sci_sample_sha256={sha(slice_bytes)}|measured_filters=1|astrometry=NOT_PERFORMED|photonic_retention=NOT_MEASURED|json=0")
        print(f"HST_ORIGINAL_FULL_FITS_AND_SCI_PIXELS_PASS|index={i}|date={date}|full_sha256={expected_sha}|sample_sha256={sha(slice_bytes)}|json=0", flush=True)
    check(len({sha(a) for a in chunks}) == 3, "THREE_DIFFERENT_EPOCHS_NOT_DISTINCT_PIXELS")
    combined = b"".join(chunks)
    check(len(combined) == 6300, "SOURCE_NOT_THREE_2100_BYTE_CHUNKS")
    source = output_dir/"proxima-three-epochs-sci-slices.bin"
    write_checksum(source, combined)
    rows.append(f"JOIN|epochs=3|bytes=6300|fischer_indices=0,1,2|lanes=R,G,B|combined_source_sha256={sha(combined)}|actual_qr_image=NOT_YET|json=0")
    rows.append("BOUNDARY|single_passband=F555W|registered_motion=NOT_TESTED|independent_camera_capture_signature=NOT_OBTAINED|photon_storage=NOT_MEASURED|json=0")
    write_checksum(output_dir/"ORIGINAL-HST-SOURCE-CUSTODY.hbp", ("\n".join(rows)+"\n").encode("ascii"))
    print("SEAT2_THREE_HST_REAL_DETECTOR_EPOCHS_SOURCE_PASS|combined_sha256="+sha(combined)+"|json=0",flush=True)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: optical_hst_source.py ORIGINAL_FITS_DIR OUTPUT_DIR")
    main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
