#!/usr/bin/env python3
"""Executed RGB QR *image* spot check of the August original protocol.

Needs qrcode[PIL] + pyzbar with libzbar; separate from full-archive payload
packetization and digital three-stick 2-of-3 coding. Offline after installation.
No phone camera or photon storage is measured.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import struct
import qrcode
from PIL import Image
from pyzbar.pyzbar import decode, ZBarSymbol

SIZE=2100
VERSION=40
BOX=6
BORDER=4

def payload(index,number):
    return hashlib.shake_256(
        f"ASOLARIA|SEAT4|B3|ORIGINAL-COLOURQR|{index}".encode("ascii")
    ).digest(number)

def plane(index,number):
    raw=payload(index,number)
    packet=struct.pack("<I",index)+raw
    text=base64.b64encode(packet).decode("ascii")
    code=qrcode.QRCode(version=VERSION,
         error_correction=qrcode.constants.ERROR_CORRECT_L,
         box_size=BOX,border=BORDER)
    code.add_data(text,optimize=0)
    code.make(fit=False)
    return code.make_image(fill_color="black",back_color="white").convert("L")

def test_image(indices,lengths,filename):
    planes=[plane(idx,size) for idx,size in zip(indices,lengths)]
    assert len(planes) in (2,3)
    while len(planes)<3:
        planes.append(Image.new("L",planes[0].size,255))
    composite=Image.merge("RGB",planes)
    composite.save(filename,format="PNG",optimize=False)
    reread=Image.open(filename).convert("RGB")
    received={}
    for channel,plane_image in enumerate(reread.split()):
        result=decode(plane_image,symbols=[ZBarSymbol.QRCODE])
        if channel>=len(indices):
            assert result==[],"expected QR filler absent"
            continue
        assert len(result)==1,(channel,len(result))
        decoded=base64.b64decode(result[0].data,validate=True)
        assert decoded[:4]==struct.pack("<I",indices[channel])
        assert decoded[4:]==payload(indices[channel],lengths[channel])
        received[indices[channel]]=decoded[4:]
    assert len(received)==len(indices)
    return {"planes":len(indices),"filler":3-len(indices),
            "indices":list(indices),"sizes":list(lengths),
            "png_sha256":hashlib.sha256(filename.read_bytes()).hexdigest(),
            "image_dimensions":list(composite.size),
            "round_trip_source_sha256":hashlib.sha256(
                b"".join(received[i] for i in sorted(received))
            ).hexdigest()}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    full=test_image((0,1,2),(SIZE,SIZE,SIZE),args.out/"colourqr-three-planes.png")
    final=test_image((30,31),(SIZE,436),args.out/"colourqr-final-two-planes-filler.png")
    assert final["indices"]==[30,31] and final["filler"]==1
    assert final["sizes"]==[2100,436]
    out={"status":"PASS","category":"QR_IMAGE_PIXEL_DECODE_ON_CI",
         "full_frame":full,"last_frame":final,
         "qr_library":"ordinary QR v40 error correction L, RGB planes read using pyzbar",
         "source_scan_phone_camera":False,
         "physical_light_bank_memory_storage_measured":False}
    (args.out/"colourqr-pixels-summary.json").write_text(
        json.dumps(out,indent=2,sort_keys=True)+"\n",encoding="utf-8",newline="\n")
    print(json.dumps(out,sort_keys=True))

if __name__=="__main__":
    main()
