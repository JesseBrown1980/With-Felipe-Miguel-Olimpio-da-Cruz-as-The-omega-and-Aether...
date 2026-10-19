#!/usr/bin/env node
"use strict";
/* Seat 1 Round4 independently replays full V2+rainbow7 bank crosswalk in Node.
 * Classical source hashes and deterministic probabilities, NOT physical photons.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const BANDS=["red","orange","yellow","green","blue","indigo","violet"];
const PIN={
source:"02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22",
bank:"52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345",
bank_index:"6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee",
ordered:"2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e",
peer:"8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672"
};
const sha=x=>crypto.createHash("sha256").update(x).digest("hex");
const ck=(x,msg)=>{if(!x)throw Error(msg)};
const read=(dir,file)=>fs.readFileSync(path.join(dir,file));
function asciiCanon(obj){
  function sorted(v){
    if(Array.isArray(v))return v.map(sorted);
    if(v!==null&&typeof v==="object"){
      const out={};
      for(const key of Object.keys(v).sort())out[key]=sorted(v[key]);
      return out;
    }
    return v;
  }
  return Buffer.from(JSON.stringify(sorted(obj)).replace(/[\u007f-\uffff]/g,c=>"\\u"+c.charCodeAt(0).toString(16).padStart(4,"0"))+"\n","ascii");
}
function gcd(a,b){while(b){[a,b]=[b,a%b]}return a}
function tuple(id){return [Math.floor(id/9),Math.floor(id/3)%3,id%3]}
function primitive(rgb){
  const [r,g,b]=rgb,s=r+g+b,q=r*r+g*g+b*b-r*g-r*b-g*b;
  const arr=[s*s,q,q],k=gcd(gcd(arr[0],arr[1]),arr[2]);
  return {raw:arr,prim:k?arr.map(x=>x/k):[0,0,0]};
}
function lane(w,l,p){
  const sum=p[0]+p[1]+p[2];
  if(sum===0)return "H";
  const den=BigInt(sum),bound=1n<<256n,ceiling=bound/den*den;
  for(let retry=0;retry<10000;retry++){
    const ticket=Buffer.alloc(8);
    ticket.writeUInt16LE(w,0);ticket.writeUInt16LE(l,2);ticket.writeUInt32LE(retry,4);
    const digest=crypto.createHash("sha256").update("ASOLARIA-R27-V2|TICKET|","ascii").update(ticket).digest("hex");
    const n=BigInt("0x"+digest);
    if(n<ceiling){
      const y=n%den;
      return String(y<BigInt(p[0])?0:y<BigInt(p[0]+p[1])?1:2);
    }
  }
  throw Error("REJECTION_LIMIT");
}
function bankRows(bank,index,source){
  ck(sha(bank)===PIN.bank,"PIN_BANK_SHA");
  ck(sha(index)===PIN.bank_index,"PIN_BANK_INDEX_SHA");
  const lines=index.toString("ascii").trimEnd().split("\n");
  ck(lines.length===567,"PIN_BANK_ROWS");
  const lookup=new Map();
  for(const line of lines){
    const tokens=line.split("|");ck(tokens.length===6&&tokens[0]==="MEM","BANK_INDEX_FORMAT");
    const d={};
    for(const part of tokens.slice(1)){const ix=part.indexOf("=");d[part.slice(0,ix)]=part.slice(ix+1)}
    const k=d.band+"|"+d.id;
    ck(!lookup.has(k)&&BANDS.includes(d.band),"DUPLICATE_BANK_ROW");
    const offset=Number(d.offset),length=Number(d.length);
    ck(offset>=0&&length>0&&offset+length<=bank.length,"INDEX_BOUNDS");
    const bytes=bank.subarray(offset,offset+length);
    ck(sha(bytes)===d.sha256,"INDEX_ENTRY_HASH");
    const o=JSON.parse(bytes.toString("utf8"));
    const id=Number(d.id.slice(5));
    ck(o.id===d.id&&o.band===d.band&&o.address==="rainbow7/"+d.band+"/"+d.id &&
       o.schema==="ASOLARIA-RAINBOW7-BANK-ENTRY-V1" && JSON.stringify(o.record)===JSON.stringify(source[id]),"BANK_PAYLOAD_SOURCE");
    lookup.set(k,{offset,length,hash:d.sha256});
  }
  ck(lookup.size===567,"LOOKUP_COUNT");
  return lookup;
}
function getSourceRow(bank,lookup,source,band,loc){
  const name="site-"+String(loc).padStart(3,"0"),key=band+"|"+name;
  ck(lookup.has(key),"MISSING_CHANNEL");
  const row=lookup.get(key),chunk=bank.subarray(row.offset,row.offset+row.length);
  ck(sha(chunk)===row.hash,"BANK_TAMPER");
  const value=JSON.parse(chunk.toString("utf8"));
  ck(value.band===band&&value.id===name&&value.address==="rainbow7/"+band+"/"+name,"WRONG_BAND");
  ck(JSON.stringify(value.record)===JSON.stringify(source[loc]),"WRONG_ORIGINAL_MEMORY");
  return row;
}
function parsePeer(line,w,loc,id){
  const re=/^CASE\|w=(\d{2})\|loc=(\d{2})\|id=(\d{2})\|rgb=([012]{3})\|raw=(\d+),(\d+),(\d+)\|prim=(\d+),(\d+),(\d+)\|den=(\d+)\|lane=([012H])$/;
  const m=re.exec(line);ck(m,"PEER_FORMAT");
  ck(+m[1]===w&&+m[2]===loc&&+m[3]===id,"PEER_SEQUENCE");
  const rgb=tuple(id);
  ck(m[4]===rgb.join(""),"PERMUTED_ORDERED_RGB");
  const {raw,prim}=primitive(rgb);
  ck(m.slice(5,8).map(Number).join(",")===raw.join(","),"PEER_INTENSITY");
  ck(m.slice(8,11).map(Number).join(",")===prim.join(","),"PEER_PRIMITIVE");
  ck(+m[11]===prim.reduce((a,b)=>a+b,0),"PEER_DENOMINATOR");
  const expected=lane(w,loc,prim);
  ck(m[12]===expected,"PEER_LANE");
  return expected;
}
function fault(fn,reason){
  let actual="";
  try{fn()}catch(e){actual=e.message}
  ck(actual===reason,"FAULT_EXPECTED_"+reason+"_GOT_"+actual);
  return {reason,exercised:true,verdict:"REJECT"};
}
function verify(a,b,c,peer,out){
  const mem=read(a,"lightbank-memories.json");
  ck(sha(mem)===PIN.source,"PIN_QR_SOURCE");
  const source=JSON.parse(mem.toString("utf8")).records;
  ck(source.length===81,"SOURCE_COUNT");
  const bank=read(b,"rainbow7-bank.jsonl");
  const entries=bankRows(bank,read(b,"rainbow7-index.hbi"),source);
  const origIndex=read(c,"ordered27-rainbow7-index.hbi");
  ck(sha(origIndex)===PIN.ordered,"PIN_ORDERED27_INDEX");
  const originalIndex=origIndex.toString("ascii").trimEnd().split("\n");
  ck(originalIndex.length===15309,"ORDERED_INDEX_ROWS");
  let k=0;
  for(let id=0;id<27;id++){
    const rgb=tuple(id);
    for(const band of BANDS)for(let loc=0;loc<81;loc++){
      const row=entries.get(band+"|site-"+String(loc).padStart(3,"0"));
      const expected="ADDR|sector="+id+"|r="+rgb[0]+"|g="+rgb[1]+"|b="+rgb[2]+"|band="+band+
                     "|id=site-"+String(loc).padStart(3,"0")+"|offset="+row.offset+"|length="+row.length+
                     "|source_sha256="+row.hash;
      ck(originalIndex[k]===expected,"PREVIOUS_ORDERED27_DRIFT");k++;
    }
  }
  const peerData=read(peer,"rainbow27-v2.hbp");
  ck(sha(peerData)===PIN.peer,"PIN_SEAT3_PEER_V2_SHA");
  const peerLines=peerData.toString("ascii").trimEnd().split("\n");
  ck(peerLines.length===59050&&peerLines[0].includes("source_sha256=351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1"),
      "PEER_V2_FIXTURE_OR_ROWS");
  const generated=read(out,"seat1-crosslane.hbp");
  const lines=generated.toString("ascii").trimEnd().split("\n");
  ck(lines.length===59051,"CROSSLANE_ROW_COUNT");
  ck(lines[0]==="R27BANK|schema=ASOLARIA-SEAT1-R27V2-CROSSLANE-V1|peer_sha256="+PIN.peer+"|bank_sha256="+PIN.bank+
      "|ordered_sha256="+PIN.ordered+"|digital_only=1","CROSSLANE_HEADER");
  let count=0,lookups=0;
  const counts={"0":0,"1":0,"2":0,"H":0};
  const siteHashes=source.map(s=>sha(asciiCanon(s)));
  for(let w=0;w<27;w++)for(let loc=0;loc<81;loc++)for(let id=0;id<27;id++){
    const sampled=parsePeer(peerLines[count+1],w,loc,id);
    for(const band of BANDS){getSourceRow(bank,entries,source,band,loc);lookups++}
    const expect="ROUTE|w="+String(w).padStart(2,"0")+"|loc="+String(loc).padStart(2,"0")+
       "|id="+String(id).padStart(2,"0")+"|rgb="+tuple(id).join("")+"|lane="+sampled+
       "|lookups=7|site_sha256="+siteHashes[loc];
    ck(lines[count+1]===expect,"CROSSLANE_FULL_TRACE_DIVERGENCE_AT_"+count);
    counts[sampled]++;count++;
  }
  ck(lines.at(-1)==="END|routes=59049|reads=413343|dark=2187|source_auth=HELD|physical_optical_storage=0","END_MARKER");
  ck(count===59049&&lookups===413343,"CROSSLANE_COUNTS");
  ck(JSON.stringify(counts)===JSON.stringify({"0":36906,"1":10179,"2":9777,"H":2187}),"V2_ROUTE_CENSUS");
  const summary=JSON.parse(read(out,"seat1-crosslane.json").toString("utf8"));
  ck(summary.hbp_sha256===sha(generated)&&summary.indexed_logical_lookups===lookups&&summary.faults.length===7,
     "PRODUCER_SUMMARY_OR_FAULT_COUNT");
  ck(summary.actual_physical_optical_storage_verified===false&&summary.measured_wavelength_bands===0,"INVALID_PHYSICAL_CLAIM");
  for(const file of ["seat1-crosslane.hbp","seat1-crosslane.json"]){
    const side=read(out,file+".sha256").toString("ascii").trim().split(/\s+/);
    ck(side.length===2&&side[1]===file&&side[0]===sha(read(out,file)),"SIDE_SHA_"+file);
  }
  const negative=[
    fault(()=>parsePeer(peerLines[19].replace("rgb=200","rgb=020"),0,0,18),"PERMUTED_ORDERED_RGB"),
    fault(()=>parsePeer(peerLines[10].replace("rgb=100","rgb=200"),0,0,9),"PERMUTED_ORDERED_RGB"),
    fault(()=>parsePeer(peerLines[28].replace("loc=01","loc=00"),0,1,0),"PEER_SEQUENCE"),
    fault(()=>{const mut=Buffer.from(bank);mut[entries.get("violet|site-000").offset+10]^=1;
                 getSourceRow(mut,entries,source,"violet",0)},"BANK_TAMPER"),
    fault(()=>{const other=new Map(entries);other.set("violet|site-000",entries.get("red|site-000"));
                 getSourceRow(bank,other,source,"violet",0)},"WRONG_BAND"),
    fault(()=>{const missing=new Map(entries);for(const key of [...missing.keys()])if(key.startsWith("violet|"))missing.delete(key);
                 getSourceRow(bank,missing,source,"violet",0)},"MISSING_CHANNEL"),
    fault(()=>{const fake=Buffer.from(bank);fake[entries.get("violet|site-000").offset+10]^=1;
                 ck(sha(fake)===PIN.bank,"PINNED_EXTERNAL_ANCHOR_REJECTS_FORGERY")},"PINNED_EXTERNAL_ANCHOR_REJECTS_FORGERY")
  ];
  const doc={schema:"ASOLARIA-SEAT1-R27V2-CROSSLANE-NODE-VERIFY-V1",status:"PASS",
     routes:count,lookups,full_trace_sha256:sha(generated),lane_counts:counts,
     faults:negative,external_source_authenticated:false,physical_optical_storage_verified:false};
  const dir=path.join(out,"seat1-crosslane-node-verification.json");
  fs.writeFileSync(dir,JSON.stringify(doc,null,2)+"\n");
  const side=dir+".sha256";
  fs.writeFileSync(side,sha(fs.readFileSync(dir))+"  "+path.basename(dir)+"\n");
  console.log(JSON.stringify({status:"PASS",routes:count,lookups,sha256:sha(generated),negatives:negative.length,
    normalized_class_identity_retained:true,physical_optical_storage:false}));
}
if(process.argv.length!==7)throw Error("usage: node verify_crosslane_v2.js original base ordered peer output");
verify(...process.argv.slice(2));
