#!/usr/bin/env python3
"""Asolaria Seat 1 — actual RGB QR memory-bank write/read plus synthetic 3-state light gate.
Standard 2100-byte Fischer-indexed Color QR. This stores digital bytes in image
pixels; it does not demonstrate a physical light-storage medium or biological
photocurrent. Prereg: PREREG-RGB-LIGHTBANK-81-20261015.md.
"""
import argparse
import base64
import hashlib
import json
import math
from pathlib import Path
import qrcode
from qrcode.constants import ERROR_CORRECT_L
from PIL import Image
from pyzbar.pyzbar import decode, ZBarSymbol

S=1_000_000_000
CHUNK=2100
N=81
LANG=(("house","casa","בית"),("door","porta","דלת"),("light","luz","אור"))
TIMES=("-","0","+")
COLORS=("R","G","B")
SPACES=("x","y","z")
PROFILES=("paired_short","paired_long")
ARMS=("dark","open_loop_full","open_loop_half","feedback_now","feedback_delay10","feedback_stale100")
CHECKPOINTS=(0,99,100,299,300,399,400,599,600,699,700,899,900,1199)
TARGET=350_000_000
GATE=50_000_000
STEPS=1200
BETA=450
GAMMA=120
SCHEMA="ASOLARIA-SEAT1-81-RGB-LIGHTBANK-V1"

def sha_bytes(b):
    return hashlib.sha256(b).hexdigest()
def canonical(obj):
    return (json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=False)+"\n").encode("utf8")
def make_memories():
    records=[]
    for i in range(N):
        cell=i//3
        t=TIMES[cell//9]
        color=COLORS[(cell//3)%3]
        space=SPACES[cell%3]
        words=LANG[i%3]
        identifier=f"site-{i:03d}"
        digest=sha_bytes(f"ASOLARIA|LIGHTBANK|ROUND2C|{identifier}|{t}|{color}|{space}".encode("ascii"))
        records.append({"id":identifier,"room":44,"time":t,"color":color,"space":space,
                        "language_views":{"en":words[0],"pt":words[1],"he":words[2]},
                        "witness_sha256":digest})
    return canonical({"schema":SCHEMA,"kind":"software_encoded_RGB_QR_NOT_PHOTON_MEMORY","records":records})

def chunk_bytes(payload):
    chunks=[]
    for index,offset in enumerate(range(0,len(payload),CHUNK)):
        packet=index.to_bytes(4,"little")+payload[offset:offset+CHUNK]
        chunks.append({"index":index,"qr_base64":base64.b64encode(packet).decode("ascii"),
                       "body_sha256":sha_bytes(payload[offset:offset+CHUNK])})
    return chunks

def png_write(chunks,folder):
    folder.mkdir(parents=True,exist_ok=True)
    paths=[]
    for k in range(0,len(chunks),3):
        channels=[]
        for rgb in range(3):
            pos=k+rgb
            if pos>=len(chunks):
                channels.append(Image.new("L",(740,740),255))
                continue
            qr=qrcode.QRCode(version=40,error_correction=ERROR_CORRECT_L,box_size=4,border=4)
            qr.add_data(chunks[pos]["qr_base64"],optimize=0)
            qr.make(fit=False)
            channel=qr.make_image(fill_color="black",back_color="white").convert("L")
            if channel.size!=(740,740):
                raise AssertionError(("Unexpected fixed QR raster",channel.size))
            channels.append(channel)
        image=Image.merge("RGB",tuple(channels))
        path=folder/f"bank-{k//3:03d}.png"
        image.save(path,optimize=True)
        paths.append(path)
    return paths

def decode_images(paths):
    reads=[]
    for path in paths:
        with Image.open(path) as image:
            image.load()
            for lane in ("R","G","B"):
                plane=image.getchannel(lane)
                symbols=decode(plane,symbols=[ZBarSymbol.QRCODE])
                if len(symbols)>1:
                    raise AssertionError(f"MULTIPLE_QR_SYMBOLS_{path}_{lane}")
                if not symbols:
                    continue
                raw=symbols[0].data
                try:
                    b64=raw.decode("ascii")
                    packet=base64.b64decode(b64,validate=True)
                except (UnicodeError,ValueError) as ex:
                    raise AssertionError("INVALID_QR_BASE64") from ex
                if len(packet)<5 or len(packet)>2104:
                    raise AssertionError("INVALID_QR_PACKET_LENGTH")
                index=int.from_bytes(packet[:4],"little")
                reads.append({"index":index,"qr_base64":b64,"image":path.name,"channel":lane})
    return reads

def reassemble(reads,expected_count,expected_sha):
    parts={}
    for read in reads:
        packet=base64.b64decode(read["qr_base64"],validate=True)
        if len(packet)<5 or len(packet)>2104:
            raise AssertionError("BAD_CHUNK_LENGTH")
        index=int.from_bytes(packet[:4],"little")
        if index!=read["index"] or index>=expected_count:
            raise AssertionError("BAD_CHUNK_INDEX")
        body=packet[4:]
        if index in parts:
            raise AssertionError("DUPLICATE_INDEX")
        parts[index]=body
    if sorted(parts)!=list(range(expected_count)):
        raise AssertionError("MISSING_CHUNK")
    for i in range(expected_count-1):
        if len(parts[i])!=CHUNK:
            raise AssertionError("SHORT_NONFINAL_CHUNK")
    raw=b"".join(parts[i] for i in range(expected_count))
    if sha_bytes(raw)!=expected_sha:
        raise AssertionError("SHA256_MISMATCH")
    return raw

def projector_tests(records):
    count=0
    for record in records:
        views=record["language_views"]
        values=[hashlib.sha256(views[k].encode("utf8")).digest()[0] for k in ("en","pt","he")]
        total=sum(values)
        residue=[3*v-total for v in values]
        assert sum(residue)==0
        assert all((r+total)%3==0 for r in residue)
        recovered=[(r+total)//3 for r in residue]
        assert recovered==values
        assert [3*(v+1)-sum(x+1 for x in values) for v in values]==residue, "Common-mode ambiguity"
        bad=residue.copy()
        bad[0]+=1
        assert sum(bad)!=0,"Forged residual evaded conservation"
        count+=1
    return count

def lit(profile,tick):
    if profile=="paired_short":
        return 100<=tick<300 or 400<=tick<600
    if profile=="paired_long":
        return 100<=tick<300 or 700<=tick<900
    raise AssertionError("UNKNOWN_PROFILE")

def prob(rate):
    return (S*rate*20)//(1_000_000+rate*20)

P_LIT=prob(800)
P_BETA=prob(BETA)
P_GAMMA=prob(GAMMA)

def advance(c,o,r,command):
    fco=(c*P_LIT)//S if command else 0
    forr=(o*P_BETA)//S
    frc=(r*P_GAMMA)//S
    c,o,r=c-fco+frc,o+fco-forr,r+forr-frc
    if min(c,o,r)<0 or c+o+r!=S:
        raise AssertionError("MASS_NEGATIVE_OR_NOT_CONSERVED")
    return c,o,r,fco

def simulate():
    rows=[]
    metrics=[]
    all_mass_checks=0
    for profile in PROFILES:
        for arm in ARMS:
            total_error=total_commands=authorized=transitions=0
            current_sum=0
            record_sha=hashlib.sha256()
            for identity in range(N):
                c,o,r=S,0,0
                past=[]
                prev_cmd=0
                for tick in range(STEPS):
                    enabled=lit(profile,tick)
                    target=TARGET if enabled else 0
                    if arm=="dark":
                        cmd=0
                    elif arm=="open_loop_full":
                        cmd=int(enabled)
                    elif arm=="open_loop_half":
                        cmd=int(enabled and tick%2==0)
                    else:
                        delay={"feedback_now":0,"feedback_delay10":10,"feedback_stale100":100}[arm]
                        observation=(past[tick-delay] if tick>=delay and delay else (o if not delay else 0))
                        cmd=int(enabled and observation<TARGET)
                    c,o,r,opening=advance(c,o,r,cmd)
                    past.append(o)
                    all_mass_checks+=1
                    error=abs(o-target)
                    total_error+=error
                    total_commands+=cmd
                    authorized+=int(bool(cmd and o>=GATE))
                    transitions+=int(cmd!=prev_cmd)
                    prev_cmd=cmd
                    current=-((120000*o)//S)
                    current_sum+=current
                    if tick in CHECKPOINTS:
                        line=f"FRAME|profile={profile}|arm={arm}|id=site-{identity:03d}|tick={tick:04d}|C={c}|O={o}|R={r}|I_millipA={current}\n"
                        record_sha.update(line.encode("ascii"))
                        rows.append(line)
                if arm=="dark":
                    assert total_commands==0 and o==0 and r==0
            metrics.append({"profile":profile,"arm":arm,
                            "light_on_site_ticks":total_commands,
                            "authorized_reads":authorized,
                            "target_error":total_error,
                            "light_switches":transitions,
                            "current_proxy_sum_millipA":current_sum,
                            "checkpoint_sha256":record_sha.hexdigest(),
                            "site_ids":N})
    return rows,metrics,all_mass_checks

def expect_failure(run,label):
    try: run()
    except (AssertionError,ValueError):return label
    raise AssertionError("INJECTED_FAULT_NOT_REJECTED_"+label)

def negative_controls(paths,reads,original,manifest,records,out):
    controls={}
    # Plane erasure is a genuine edit to an emitted colour-coded PNG.
    with Image.open(paths[0]) as im:
        missing=im.copy()
        blank=Image.new("L",im.size,255)
        _,g,b=missing.split()
        missing=Image.merge("RGB",(blank,g,b))
        erase=out/"negative-erased-R.png"
        missing.save(erase)
    altered_paths=[erase]+paths[1:]
    controls["erased_physical_pixel_plane"]=expect_failure(
        lambda:reassemble(decode_images(altered_paths),len(manifest["chunks"]),manifest["source_sha256"]),"MISSING_CHUNK")
    b=bytearray(base64.b64decode(reads[0]["qr_base64"],validate=True))
    b[-1]^=1
    corrupted=[dict(x) for x in reads]
    corrupted[0]["qr_base64"]=base64.b64encode(b).decode("ascii")
    controls["changed_decoded_data_byte"]=expect_failure(
        lambda:reassemble(corrupted,len(manifest["chunks"]),manifest["source_sha256"]),"SHA256")
    duplicate=reads+[dict(corrupted[0])]
    controls["duplicate_conflicting_index"]=expect_failure(
        lambda:reassemble(duplicate,len(manifest["chunks"]),manifest["source_sha256"]),"DUPLICATE")
    controls["manifest_hash_swap"]=expect_failure(
        lambda:reassemble(reads,len(manifest["chunks"]),"0"*64),"MANIFEST_SWAP")
    shuffled=decode_images(list(reversed(paths)))
    assert reassemble(shuffled,len(manifest["chunks"]),manifest["source_sha256"])==original
    controls["reordered_images"]=True
    controls["projector_three_view_exact"]=projector_tests(records)
    controls["synchronized_source_and_manifest_spoof"]="HELD_EXTERNAL_SOURCE_TRUST_NOT_TESTED"
    return controls

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("out")
    opts=parser.parse_args()
    root=Path(opts.out)
    root.mkdir(parents=True,exist_ok=True)
    original=make_memories()
    records=json.loads(original)["records"]
    chunks=chunk_bytes(original)
    paths=png_write(chunks,root/"png")
    read=decode_images(paths)
    recovered=reassemble(read,len(chunks),sha_bytes(original))
    assert recovered==original
    (root/"lightbank-memories.json").write_bytes(original)
    (root/"qr-extracted-reads.json").write_bytes(canonical({"schema":SCHEMA,"reads":read}))
    manifest={
        "schema":SCHEMA,"source_sha256":sha_bytes(original),
        "source_bytes":len(original),"memories":N,"logical_addresses":27,
        "chunk_size":CHUNK,"chunks":[{"index":x["index"],"body_sha256":x["body_sha256"]} for x in chunks],
        "colour_codes":len(paths),"qr_version":40,"qr_error_correction":"L",
        "module_pixels":4,"pixels_per_code":740,"software_only":True,
        "three_view_projector_retained_sum":True,
        "source_provenance":"GitHub projects pinned separately in prereg"
    }
    (root/"manifest.json").write_bytes(canonical(manifest))
    controls=negative_controls(paths,read,original,manifest,records,root)
    frames,metrics,checks=simulate()
    full=("MODEL|schema="+SCHEMA+"|n=81|dt_ms=20|ticks=1200|physical_observations=0\n"+
          "".join(frames)+
          f"END|checkpoints={len(frames)}|mass_checks={checks}|physical_light_storage=0\n").encode("ascii")
    (root/"photocycle-frame.hbp").write_bytes(full)
    results={
        "schema":SCHEMA,"class":"synthetic_digital_QR_memory_and_photocycle",
        "memory_sha256":sha_bytes(original),"hbp_sha256":sha_bytes(full),
        "site_profiles":len(PROFILES),"arms":len(ARMS),
        "frame_rows":len(frames),"mass_checks":checks,
        "metrics":metrics,"controls":controls,
        "physical_optical_storage_verified":False,
        "biological_kinetics_fitted":False,
        "independently_authenticated_source":False,
        "human_prompts_per_tick":0,
    }
    assert len(frames)==N*len(PROFILES)*len(ARMS)*len(CHECKPOINTS)
    assert checks==N*len(PROFILES)*len(ARMS)*STEPS
    assert all(m["authorized_reads"]==0 for m in metrics if m["arm"]=="dark")
    assert any(m["authorized_reads"]>0 for m in metrics if m["arm"]!="dark")
    (root/"results.json").write_bytes(canonical(results))
    for name in ("lightbank-memories.json","qr-extracted-reads.json","manifest.json",
                 "photocycle-frame.hbp","results.json"):
        f=root/name
        (root/(name+".sha256")).write_text(sha_bytes(f.read_bytes())+"  "+name+"\n",encoding="ascii")
    print(json.dumps({"status":"PASS","records":N,"chunks":len(chunks),
        "colour_codes":len(paths),"readback_sha256":sha_bytes(recovered),
        "photocycle_hbp_sha256":sha_bytes(full),
        "frames":len(frames),"mass_checks":checks,"negative_controls":controls},sort_keys=True,ensure_ascii=False))

if __name__=="__main__":
    main()
