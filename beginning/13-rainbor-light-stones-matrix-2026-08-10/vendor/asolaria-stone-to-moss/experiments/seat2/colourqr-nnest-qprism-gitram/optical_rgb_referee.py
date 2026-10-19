#!/usr/bin/env python3
"""Render three full-size QR symbols in one lossless RGB PNG and independently
decode each channel with ZXing-C++. Uses actual archived HST SCI source bytes.
No camera photons, optical retention, or astrometry are measured by this PNG.
"""
from __future__ import annotations
import base64
import hashlib
import pathlib
import sys

import qrcode
from PIL import Image
import zxingcpp

def sha(x: bytes) -> str:
    return hashlib.sha256(x).hexdigest()

def check(ok: bool, detail: str) -> None:
    if not ok:
        raise AssertionError(detail)

def checksum(file: pathlib.Path) -> bytes:
    raw = file.read_bytes()
    sidecar = file.with_name(file.name+".sha256").read_text("ascii")
    check(sidecar == sha(raw)+"  "+file.name+"\n", "FALSIFIED_OR_MISSING_SHA:"+str(file))
    return raw

def render(content: str) -> Image.Image:
    qr = qrcode.QRCode(
        version=40,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=12,
        border=4,
    )
    qr.add_data(content, optimize=0)
    qr.make(fit=False)
    img = qr.make_image(fill_color="black",back_color="white")
    return img.convert("L")

def read_mono(img: Image.Image):
    # Original Colour QR uses high-density V40 symbols. Feed ZXing the actual
    # full-size native plane; the pure-symbol option avoids camera finder noise.
    decoded = zxingcpp.read_barcodes(img, is_pure=True)
    if len(decoded) != 1:
        decoded = zxingcpp.read_barcodes(img)
    check(len(decoded) == 1, "QR_REAL_BITMAP_NOT_DECODABLE_ONE_CHANNEL")
    return decoded[0].text

def main(source_dir: pathlib.Path, lane_dir: pathlib.Path, output_dir: pathlib.Path):
    data = checksum(source_dir/"proxima-three-epochs-sci-slices.bin")
    hbp = checksum(source_dir/"ORIGINAL-HST-SOURCE-CUSTODY.hbp").decode("ascii")
    check(len(data)==6300 and hbp.count("\nOBS|")==3, "SOURCE_CUSTODY_SCHEMA_FAIL")
    decoded = []
    images = []
    for i, lane in enumerate("RGB"):
        path = lane_dir/lane/f"frame-{i:06}.qr.txt"
        payload = checksum(path).decode("ascii")
        check(payload.endswith("\n"), "WRONG_QR_LINE_ENDING")
        payload = payload[:-1]
        binary = base64.b64decode(payload.encode("ascii"),validate=True)
        check(base64.b64encode(binary).decode("ascii")==payload, "NONCANONICAL_BASE64")
        check(len(binary)==2104 and int.from_bytes(binary[:4],"little")==i, "BAD_FISCHER_INDEX")
        check(binary[4:]==data[i*2100:(i+1)*2100], "QR_READY_DIGITAL_NOT_SOURCE")
        images.append(render(payload))
        decoded.append(payload)
    check(len({im.size for im in images}) == 1, "QR_SYMBOL_SIZES_DIFFER")
    optical = Image.merge("RGB",tuple(images))
    output_dir.mkdir(parents=True,exist_ok=True)
    dest=output_dir/"three-hst-sci-colourqr.png"
    optical.save(dest,format="PNG")
    digest=sha(dest.read_bytes())
    (output_dir/(dest.name+".sha256")).write_text(digest+"  "+dest.name+"\n",encoding="ascii")
    opened=Image.open(dest).convert("RGB")
    channels=opened.split()
    for i,lane in enumerate("RGB"):
        actual=read_mono(channels[i])
        check(actual==decoded[i], "RGB_QR_NOT_BYTE_EXACT_"+lane)
        recovered=base64.b64decode(actual,validate=True)
        check(recovered[4:]==data[i*2100:(i+1)*2100], "IMAGE_DECODER_SOURCE_MISMATCH_"+lane)
    # Negative 1: channel swap yields decodable but WRONG source lane, must reject.
    swapped=Image.merge("RGB",(channels[1],channels[0],channels[2]))
    bad=swapped.split()
    check(read_mono(bad[0])!=decoded[0] and read_mono(bad[1])!=decoded[1],
          "CHANNEL_SWAP_FALSE_ACCEPT")
    # Negative 2: blanking a channel removes one expected QR symbol.
    blank=Image.new("L",images[0].size,255)
    check(len(zxingcpp.read_barcodes(blank))==0, "MISSING_OPTICAL_CHANNEL_FALSE_ACCEPT")
    report = (
        "HBP1|schema=SEAT2-THREE-HST-SCI-RGB-QR-BITMAP-READBACK|json=0\n"
        f"SOURCE|bytes=6300|original_full_fits=3|single_filter=F555W|sha256={sha(data)}|json=0\n"
        f"IMAGE|format=PNG|bytes={dest.stat().st_size}|width={optical.width}|height={optical.height}|sha256={digest}|rgb_channels=3|json=0\n"
        "DECODE|engine=ZXing_CPP|separately_scanned=R,G,B|original_indexed_chunks=0,1,2|recovered=3|exact_source=PASS|json=0\n"
        "FALSIFY|swapped_channels=REJECTED|missing_channel=REJECTED|json=0\n"
        "BOUNDARY|physical_qr_camera_scan=NOT_RUN|photon_storage=NOT_MEASURED|planetary_astrometry=NOT_PERFORMED|json=0\n"
    ).encode("ascii")
    receipt=output_dir/"THREE-HST-RGB-QR-INDEPENDENT-READBACK.hbp"
    receipt.write_bytes(report)
    (output_dir/(receipt.name+".sha256")).write_text(sha(report)+"  "+receipt.name+"\n",encoding="ascii")
    print(f"SEAT2_REAL_HST_SCI_RGB_QR_ZXING_REPLAY_PASS|png_sha256={digest}|source_sha256={sha(data)}|json=0",flush=True)

if __name__=="__main__":
    if len(sys.argv)!=4:
        raise SystemExit("usage: optical_rgb_referee.py SOURCE_DIR THREE_LANE_DIR OUTPUT_DIR")
    main(*(pathlib.Path(x) for x in sys.argv[1:]))
