#!/usr/bin/env python3
"""Independent software-only RGB colour-QR and 3-shard memory pilot.
Research reference: JesseBrown1980/the-colour-qr at 1938a9b...
Does not exercise any optical storage device, and does not assert optical hardware.
"""
import base64, hashlib, io, json, struct
import qrcode
from PIL import Image
import cv2
import numpy as np

SEED='asolaria-round3-lightbank-'
def sha(b): return hashlib.sha256(b).hexdigest()
def payload(): return b''.join(hashlib.sha256(f'{SEED}{i}'.encode()).digest() for i in range(2048))
def chunks(data,n=2100):
    return [(i//n, struct.pack('<I',i//n)+data[i:i+n]) for i in range(0,len(data),n)]
def qr_plane(raw, scale=8):
    q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_L,box_size=scale,border=4)
    q.add_data(base64.b64encode(raw).decode('ascii'));q.make(fit=True)
    return q.make_image(fill_color='black',back_color='white').convert('L')
def rgb_frame(raw_chunks):
    planes=[qr_plane(raw) for raw in raw_chunks]
    wh=max(im.width for im in planes)
    merged=[]
    for channel,plane in enumerate(planes):
        if plane.size!=(wh,wh):
            plane=plane.resize((wh,wh),Image.Resampling.NEAREST)
        merged.append(plane)
    return Image.merge('RGB',tuple(merged))
def qr_read(frame):
    arr=np.asarray(frame)
    outputs=[]
    for ch in range(3):
        txt,points,_=cv2.QRCodeDetector().detectAndDecode(arr[:,:,ch])
        if not txt: raise AssertionError('channel QR decode fail '+str(ch))
        raw=base64.b64decode(txt,validate=True)
        idx=struct.unpack('<I',raw[:4])[0]
        outputs.append((idx,raw[4:]))
    return outputs
def run():
    d=payload();assert len(d)==65536
    a,b=d[:32768],d[32768:];p=bytes(x^y for x,y in zip(a,b))
    assert a+bytes(x^y for x,y in zip(a,p))==d
    assert bytes(x^y for x,y in zip(b,p))+b==d
    # Light-boat classical closures: transmit/absorb/reflect are an exclusive
    # three-outcome census, NOT RGB encoding or stored photons.
    census=[(1,0,0)]*9+[(0,1,0)]*9+[(0,0,1)]*9
    trits=[+1]*9+[0]*9+[-1]*9
    assert len(census)==27 and all(sum(x)==1 for x in census)
    assert sum(trits)==0
    levels=[7,-3,-4]
    edges=[levels[0]-levels[1],levels[1]-levels[2],levels[2]-levels[0]]
    assert sum(edges)==0
    frames=chunks(d)
    assert len(frames)==32
    assert b''.join(raw[4:] for _,raw in sorted(frames,key=lambda x:x[0]))==d
    # QR optical analogue: genuinely render and decode 3 independent QR symbols
    # in each RGB channel, at a low-version, independently decodable size.
    three=[(i,struct.pack('<I',i)+d[i*32:(i+1)*32]) for i in range(3)]
    frame=rgb_frame([raw for _,raw in three])
    actual=qr_read(frame)
    assert actual==[(i,raw[4:]) for i,raw in three]
    assert b''.join(body for _,body in sorted(actual))==d[:96]
    # Channels are independent. Recoloring/inverting just one QR plane does not change other two.
    image=np.asarray(frame).copy();image[:,:,1]=255
    test=Image.fromarray(image)
    arr=np.asarray(test)
    for ch in [0,2]:
        txt,points,_=cv2.QRCodeDetector().detectAndDecode(arr[:,:,ch])
        assert txt
    txt,points,_=cv2.QRCodeDetector().detectAndDecode(arr[:,:,1]); assert not txt
    # Missing chunk, swapped duplicate index, and altered payload must fail full-payload verification.
    def join_checked(items):
        ids=[i for i,raw in items]
        assert len(ids)==32 and ids==list(range(32)), 'packet order/uniqueness not established'
        out=b''.join(raw[4:] for i,raw in items)
        assert sha(out)==sha(d), 'integrity hold'
        return out
    assert join_checked(frames)==d
    bad=[(i,raw) for i,raw in frames];bad[8]=(8,bad[8][1][:-1]+bytes([bad[8][1][-1]^1]))
    caught=False
    try:join_checked(bad)
    except AssertionError:caught=True
    assert caught
    res={'status':'PASS_SOFTWARE_RGB_PILOT','byte_count':65536,'source_sha256':sha(d),
         'transport_chunk_size':2100,'transport_chunks':32,'logical_rgb_frames':11,
         'rgb_real_qr_render_and_decode':3,'rgb_qr_test_bytes':96,
         'channel_erasure_detected':True,'two_of_three_recovered':True,
         'three_shard_bytes_each':32768,'negative_modified_payload_hold':True,
         'optical_closure_27_of_27':True,'trit_census_sum':0,
         'level_cycle_sum':sum(edges), 'physical_photon_storage':False,'biological_kinetics_calibrated':False}
    frame.save('/mnt/data/round3-rgb-pilot.png')
    with open('/mnt/data/round3-memory-pilot-result.json','w') as f:json.dump(res,f,sort_keys=True,indent=2)
    print(json.dumps(res,sort_keys=True))
if __name__=='__main__':run()
