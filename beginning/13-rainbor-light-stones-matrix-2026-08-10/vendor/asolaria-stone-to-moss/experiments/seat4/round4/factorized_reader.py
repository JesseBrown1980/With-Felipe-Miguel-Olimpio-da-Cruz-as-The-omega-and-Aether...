#!/usr/bin/env python3
"""Seat4 compact ordered-address resolver. All memory data remain digital."""
import hashlib,json
from pathlib import Path
BANDS=("red","orange","yellow","green","blue","indigo","violet")
EXPECTED={
"source":("base-evidence/lightbank-memories.json","02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22",16689),
"bank":("rainbow-evidence/rainbow7-bank.jsonl","52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345",184815),
"base":("rainbow-evidence/rainbow7-index.hbi","6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee",70043),
"expanded":("ordered-evidence/ordered27-rainbow7-index.hbi","2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e",2344761),
"trace":("rainbow27/rainbow27-v2.hbp","8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672",3886535)}
def sha(b):return hashlib.sha256(b).hexdigest()
def require(flag,msg):
 if not flag:raise ValueError(msg)
def pinned(root,name):
 path,digest,n=EXPECTED[name]; data=(Path(root)/path).read_bytes()
 require(sha(data)==digest and len(data)==n,"PINNED_BYTES_"+name); return data
def coords(sector):
 require(type(sector)==int and 0<=sector<27,"SECTOR_RANGE")
 return (sector//9,(sector//3)%3,sector%3)
def load(root):
 source=pinned(root,"source"); bank=pinned(root,"bank");idx=pinned(root,"base")
 records=json.loads(source)["records"];require(len(records)==81,"SOURCE_COUNT")
 lookup={}
 for ln in idx.decode("ascii").splitlines():
  cells=ln.split("|");require(len(cells)==6 and cells[0]=="MEM","INDEX_FORMAT")
  d=dict(x.split("=",1) for x in cells[1:]);band=d["band"];sid=d["id"]
  require(band in BANDS and sid.startswith("site-"),"INDEX_LABEL")
  site=int(sid[5:]);require(0<=site<81 and sid==f"site-{site:03d}","SITE_RANGE")
  off=int(d["offset"]);size=int(d["length"])
  require(off>=0 and size>0 and off+size<=len(bank),"INDEX_OFFSET")
  payload=bank[off:off+size]
  require(sha(payload)==d["sha256"],"BANK_ROW_DIGEST")
  obj=json.loads(payload)
  require(obj["band"]==band and obj["id"]==sid and obj["record"]==records[site],"SOURCE_ROW")
  key=(band,site);require(key not in lookup,"DUPLICATE_KEY")
  lookup[key]=(off,size,d["sha256"])
 require(len(lookup)==567,"LOOKUP_COUNT")
 return bank,lookup
def resolve(bank,lookup,sector,band,site):
 r,g,b=coords(sector)
 require(band in BANDS and type(site)==int and 0<=site<81,"BAD_BAND_SITE")
 off,size,digest=lookup[(band,site)];payload=bank[off:off+size]
 require(sha(payload)==digest,"READ_CORRUPTION")
 return (off,size,digest,payload)
def verify_index(bank,lookup,full):
 witness=hashlib.sha256();num=0;total=0
 for sector in range(27):
  r,g,b=coords(sector)
  for band in BANDS:
   for site in range(81):
    off,n,digest,_=resolve(bank,lookup,sector,band,site)
    line=(f"ADDR|sector={sector}|r={r}|g={g}|b={b}|band={band}|id=site-{site:03d}"
          f"|offset={off}|length={n}|source_sha256={digest}\n").encode("ascii")
    witness.update(line);num+=1;total+=len(line)
 require(num==15309 and total==2344761 and witness.hexdigest()==EXPECTED["expanded"][1],"FACTORIZATION_MISMATCH")
 require(full==b"".join(
   (f"ADDR|sector={sector}|r={coords(sector)[0]}|g={coords(sector)[1]}|b={coords(sector)[2]}"
    f"|band={band}|id=site-{site:03d}|offset={lookup[(band,site)][0]}"
    f"|length={lookup[(band,site)][1]}|source_sha256={lookup[(band,site)][2]}\n").encode("ascii")
   for sector in range(27) for band in BANDS for site in range(81)),"INDEX_NOT_BYTE_EXACT")
 return num,total
