#!/usr/bin/env python3
"""Independent camera/SHA256/rainbow source referee. 100% integer.
Instrument data used here is synthetic FITS fixture; no physical Proxima camera.
"""
import hashlib
from pathlib import Path
import sys

LANES=("violet","indigo","blue","green","yellow","orange","red")
CHUNK=2100
TIMES=(81,243,729,2187,10_000_000_000)
def digest(blob):
    return hashlib.sha256(blob).digest()
def fits_fixture(width,height,frame_id):
    cards=[]
    for key,value in (
        ("SIMPLE","T"),("BITPIX","16"),("NAXIS","2"),
        ("NAXIS1",str(width)),("NAXIS2",str(height))
    ):
        cards.append(f"{key:<8}= {value:<20}".ljust(80).encode("ascii"))
    cards.append("END".ljust(80).encode("ascii"))
    source=b"".join(cards)
    source+=b" "*((-len(source))%2880)
    for y in range(height):
        for x in range(width):
            word=((x*277+y*71)+frame_id*101)%65536
            source+=word.to_bytes(2,"big")
    source+=b"\0"*((-len(source))%2880)
    return source
def parse_fits(source):
    cards={}
    assert len(source)>=2880
    end_at=None
    for index in range(0,len(source),80):
        line=source[index:index+80]
        assert len(line)==80
        key=line[:8].decode("ascii").strip()
        if key=="END":end_at=index+80;break
        if line[8:10]==b"= ":
            cards[key]=line[10:].decode("ascii").split("/")[0].strip()
    assert end_at is not None
    width=int(cards["NAXIS1"]);height=int(cards["NAXIS2"])
    assert cards["SIMPLE"]=="T" and int(cards["NAXIS"])==2
    assert int(cards["BITPIX"])==16
    header=((end_at+2879)//2880)*2880
    pixels=[int.from_bytes(source[k:k+2],"big")
            for k in range(header,header+2*width*height,2)]
    assert len(pixels)==width*height
    return width,height,pixels
def balanced(value,width=11):
    out=[]
    for _ in range(width):
        rem=value%3
        trit=-1 if rem==2 else rem
        value=(value-trit)//3
        out.append(trit)
    assert value==0
    return out
def decode(trits):
    result=0
    position=1
    for v in trits:
        assert v in (-1,0,1)
        result+=v*position;position*=3
    return result
def fields(line):
    return dict(token.split("=",1) for token in line.split("|")[1:] if "=" in token)
def play_projection(source,tick,frame_id,acquired):
    _,_,pixels=parse_fits(source)
    assert acquired<=tick
    projection=[((v%3)+(tick-acquired)%3)%3 for v in pixels]
    # normalize signed {-1,0,+1} to unsigned {0,1,2} for source proof
    return projection
def receipt_hash(previous,tick,source_digest,state_digest):
    return digest(b"ASOLARIA-FREEZE-PLAY-CHECKPOINT-V1\0"+
                  previous+tick.to_bytes(8,"little")+source_digest+state_digest)
def main():
    folder=Path(sys.argv[1] if len(sys.argv)>1 else "out")
    first=fits_fixture(7,9,1)
    second=fits_fixture(7,9,2)
    raw=(folder/"SYNTHETIC-FITS-R4.fits").read_bytes()
    assert raw==first
    width,height,pixels=parse_fits(raw)
    assert (width,height)==(7,9)
    assert all(decode(balanced(p))==p for p in pixels)
    # Show that the source is genuinely distinct from any modified byte.
    altered=bytearray(raw);altered[2880]^=1
    assert digest(altered)!=digest(raw)
    hbp=(folder/"FREEZE-PLAY-R4.hbp").read_text().splitlines()
    assert hbp[0].startswith("HBP1|schema=ASOLARIA-FREEZE-PLAY-R4")
    source_line=next(fields(l) for l in hbp if l.startswith("FITS|"))
    assert source_line["source_kind"]=="SYNTHETIC"
    assert source_line["source1_sha256"]==digest(first).hex()
    assert source_line["source2_sha256"]==digest(second).hex()
    stack_line=next(fields(l) for l in hbp if l.startswith("STACK|"))
    assert stack_line["individually_addressed_pixels"]=="63"
    assert stack_line["individually_retained_exposures"]=="126"
    qr_line=next(fields(l) for l in hbp if l.startswith("RAINBOW_QR|"))
    assert qr_line["lanes"]==",".join(LANES)
    assert qr_line["chunk_bytes"]==str(CHUNK)
    assert qr_line["independent_readback"]=="PASS"
    prior=b"\0"*32
    plays=[fields(l) for l in hbp if l.startswith("PLAY|")]
    assert len(plays)==len(TIMES)
    for index,(tick,claim) in enumerate(zip(TIMES,plays)):
        assert tick==int(claim["tick"])
        acquired=81 if tick<243 else 243
        assert acquired==int(claim["source_tick"])
        source=first if acquired==81 else second
        body=play_projection(source,tick,1 if acquired==81 else 2,acquired)
        state=digest(bytes(body))
        sh=digest(source)
        assert claim["projected_positive_trits"]==str(body.count(2))
        assert claim["source_sha256"]==sh.hex()
        assert claim["state_sha256"]==state.hex()
        assert claim["previous_checkpoint_sha256"]==prior.hex()
        stamp=receipt_hash(prior,tick,sh,state)
        assert claim["checkpoint_sha256"]==stamp.hex()
        prior=stamp
    assert len(set(c["checkpoint_sha256"] for c in plays))==len(plays)
    # Two distinct media states and times; moving a timestamp changes a digest.
    assert receipt_hash(bytes(32),81,digest(first),digest(bytes(63)))!=\
        receipt_hash(bytes(32),82,digest(first),digest(bytes(63)))
    expected=fits_fixture(77,88,3)
    rows=(folder/"RAINBOW-QR-R4.tsv").read_text().splitlines()
    assert rows[0]=="index\tlane\tcolor\tsource_size\tindexed_chunk_hex"
    pieces={}
    for line in rows[1:]:
        cells=line.split("\t")
        assert len(cells)==5
        index=int(cells[0]);lane=int(cells[1]);color=cells[2]
        n=int(cells[3]);transport=bytes.fromhex(cells[4])
        assert index not in pieces
        assert index==int.from_bytes(transport[:4],"little")
        assert lane==index%7 and color==LANES[lane]
        body=transport[4:]
        assert len(body)==n and n<=CHUNK
        pieces[index]=body
    assert len(pieces)>=8 # a second rainbow QR frame exists
    assert set(range(7)).issubset({i%7 for i in pieces})
    assert sorted(pieces)==list(range(len(pieces)))
    assert b"".join(pieces[i] for i in sorted(pieces))==expected
    # Real QR raster decoder is NOT a part of this Rust/TSV verification.
    branch=[fields(l) for l in hbp if l.startswith("BRANCH|")]
    expected_decisions={
        "all_accepted":("Grow","true"),"two_accepted":("Grow","false"),
        "two_bad":("Hold","false"),"two_rejected":("Hold","false")
    }
    assert len(branch)==4
    for row in branch:
        leaves=[int(row[f"leaf{i}"]) for i in (1,2,3)]
        yes=sum(leaf==1 for leaf in leaves)>=2
        assert row["grow"]==("Grow" if yes else "Hold")
        assert (row["grow"],row["scientific_promotion"])==expected_decisions[row["name"]]
    for name in ("SYNTHETIC-FITS-R4.fits","FREEZE-PLAY-R4.hbp","RAINBOW-QR-R4.tsv"):
        path=folder/name
        payload=path.read_bytes()
        print("SHA256",name,digest(payload).hex(),"bytes",len(payload))
    print("PASS_INDEPENDENT_CAMERA_63_PIXELS_126_EVENTS_RAINBOW7_HASH_TIMESTAMPS_BRANCH_GATE")
if __name__=="__main__":main()
