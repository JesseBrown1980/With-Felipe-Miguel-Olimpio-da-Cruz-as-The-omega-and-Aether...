#!/usr/bin/env node
"use strict";
/*
 * Independent Node22 Buffer + BigInt factorized Rainbow27 x Rainbow7 lookup.
 * No Seat1 or Seat3 producer code imports, and no 15,309-entry alias table.
 * Digital computation only; no physical photon measurements.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");

const SCHEMA="ASOLARIA-SEAT3-FACTORIZED-R27-RAINBOW7-V1";
const BANDS=["red","orange","yellow","green","blue","indigo","violet"];
const SOURCE_SHA="02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22";
const BANK_SHA="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345";
const BASE_SHA="6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee";
const EXPANDED_SHA="2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e";
const V2_SHA="8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672";
const V2_SOURCE_SHA="351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1";
const DOMAIN=Buffer.from("ASOLARIA-R27-V2|TICKET|","ascii");
const MEMRX=/^MEM\|band=(red|orange|yellow|green|blue|indigo|violet)\|id=site-(\d{3})\|offset=(\d+)\|length=(\d+)\|sha256=([a-f0-9]{64})$/;
const CASERX=/^CASE\|w=(\d{2})\|loc=(\d{2})\|id=(\d{2})\|rgb=([0-2]{3})\|raw=(\d+),(\d+),(\d+)\|prim=(\d+),(\d+),(\d+)\|den=(\d+)\|lane=([012H])$/;

const hash=(buf)=>crypto.createHash("sha256").update(buf).digest("hex");
const stream=()=>crypto.createHash("sha256");
const pad3=i=>String(i).padStart(3,"0");
const pad2=i=>String(i).padStart(2,"0");
function held(ok,reason){if(!ok)throw Error(reason);}
function pinned(file,expected,size){
  const b=fs.readFileSync(file);
  held(b.length===size&&hash(b)===expected,"UNTRUSTED_PINNED_"+path.basename(file));
  return b;
}

class FactorizedRainbowResolver{
  constructor(source,bank,base,availableBands=BANDS){
    held(source.length===16689&&hash(source)===SOURCE_SHA,"SOURCE_ANCHOR_HELD");
    held(bank.length===184815&&hash(bank)===BANK_SHA,"BANK_ANCHOR_HELD");
    held(base.length===70043&&hash(base)===BASE_SHA,"BASE_INDEX_ANCHOR_HELD");
    this.source=source;this.bank=bank;this.base=base;
    this.records=JSON.parse(source.toString("utf8")).records;
    held(this.records.length===81,"SITE_COUNT");
    this.entries=new Map();
    held(base[base.length-1]===10,"BASE_INDEX_FINAL_LF");
    const lines=base.toString("ascii").trimEnd().split("\n");
    held(lines.length===567,"BASE_INDEX_COUNT");
    let previous=0;
    for(let i=0;i<lines.length;i++){
      const m=lines[i].match(MEMRX);
      held(m!==null,"BAD_REF_ROW");
      const [,band,siteText,offText,lenText,leaf]=m;
      const site=Number(siteText),off=Number(offText),size=Number(lenText);
      held(band===BANDS[Math.floor(i/81)]&&site===i%81,"OUT_OF_ORDER_BASE");
      held(off===previous&&size>0&&off+size<=bank.length,"BAD_SOURCE_OFFSET");
      previous=off+size;
      const buf=bank.subarray(off,previous);
      held(hash(buf)===leaf,"BASE_LEAF_HASH_HELD");
      const obj=JSON.parse(buf.toString("utf8"));
      const siteId="site-"+pad3(site);
      held(obj.schema==="ASOLARIA-RAINBOW7-BANK-ENTRY-V1","BANK_SCHEMA");
      held(obj.id===siteId&&obj.band===band,"BANK_ID_MISMATCH");
      held(obj.address==="rainbow7/"+band+"/"+siteId,"BANK_ADDRESS_MISMATCH");
      assert.deepEqual(obj.record,this.records[site],"ORIGINAL_SOURCE_RECORD_MISMATCH");
      held(this.records[site].id===siteId,"SOURCE_ID_MISMATCH");
      this.entries.set(band+"|"+site,{off,size,leaf});
    }
    held(previous===bank.length&&this.entries.size===567,"BANK_MISSING_BYTES_OR_ROWS");
    this.available=new Set(availableBands);
    for(const b of this.available)held(BANDS.includes(b),"BAD_BAND_SET");
    this.sourceOriginAuthenticated=false;
  }
  static rgb(sector){
    held(Number.isInteger(sector)&&sector>=0&&sector<27,"INVALID_ORDERED_SECTOR");
    return [Math.floor(sector/9),Math.floor(sector/3)%3,sector%3];
  }
  resolve(sector,band,site,claimedRgb){
    const [r,g,b]=FactorizedRainbowResolver.rgb(sector);
    held(Number.isInteger(site)&&site>=0&&site<81,"INVALID_SITE");
    held(typeof band==="string"&&BANDS.includes(band),"UNKNOWN_BAND");
    if(claimedRgb!==undefined)
      assert.deepEqual(claimedRgb,[r,g,b],"ORDERED_RGB_SIDEBAND_HELD");
    held(this.available.has(band),"BAND_ERASED_HELD");
    const {off,size,leaf}=this.entries.get(band+"|"+site);
    const payload=this.bank.subarray(off,off+size);
    held(hash(payload)===leaf,"CHANGED_SOURCE_BYTES_HELD");
    const row="ADDR|sector="+sector+"|r="+r+"|g="+g+"|b="+b+
      "|band="+band+"|id=site-"+pad3(site)+
      "|offset="+off+"|length="+size+"|source_sha256="+leaf;
    return {row,payload,leaf};
  }
  requireExternalAuthentication(){throw Error("PHYSICAL_ORIGIN_NOT_AUTHENTICATED");}
}
function gcd(a,b){while(b!==0){const t=a%b;a=b;b=t;}return a;}
function weights(sector){
  const [r,g,b]=FactorizedRainbowResolver.rgb(sector);
  const s=r+g+b;
  const q=r*r+g*g+b*b-r*g-r*b-g*b;
  const raw=[s*s,q,q];
  held(raw.reduce((x,y)=>x+y,0)===3*(r*r+g*g+b*b),"FOURIER_CONSERVATION");
  let scale=0;
  for(const v of raw)scale=gcd(scale,v);
  const primitive=scale===0?[0,0,0]:raw.map(v=>v/scale);
  return {raw,primitive};
}
function expectedLane(wave,loc,prim){
  const total=prim.reduce((x,y)=>x+y,0);
  if(total===0)return "H";
  const upper=(1n<<256n);
  const den=BigInt(total);
  const cutoff=upper/den*den;
  for(let i=0;i<10000;i++){
    const numbers=Buffer.allocUnsafe(8);
    numbers.writeUInt16LE(wave,0);
    numbers.writeUInt16LE(loc,2);
    numbers.writeUInt32LE(i,4);
    const h=crypto.createHash("sha256").update(DOMAIN).update(numbers).digest();
    const ticket=BigInt("0x"+h.toString("hex"));
    if(ticket<cutoff){
      const value=Number(ticket%den);
      return value<prim[0]?"0":(value<prim[0]+prim[1]?"1":"2");
    }
  }
  throw Error("SAMPLER_REJECTION_LIMIT");
}
function validateCase(line,seq){
  const m=line.match(CASERX);
  held(m!==null,"CASE_FORMAT_HELD");
  const w=Number(m[1]),loc=Number(m[2]),sector=Number(m[3]);
  held(seq===(w*81+loc)*27+sector,"STALE_SEQUENCE_OR_REPLAY_HELD");
  const [r,g,b]=FactorizedRainbowResolver.rgb(sector);
  held(m[4]===""+r+g+b,"WRONG_ORDERED_COLOR_HELD");
  const {raw,primitive}=weights(sector);
  const presentRaw=m.slice(5,8).map(Number);
  const presentPrim=m.slice(8,11).map(Number);
  assert.deepEqual(presentRaw,raw,"UNTRUSTED_INTENSITIES_HELD");
  assert.deepEqual(presentPrim,primitive,"UNTRUSTED_NORMALIZED_RATIO_HELD");
  held(Number(m[11])===primitive.reduce((a,b)=>a+b,0),"UNTRUSTED_DENOMINATOR_HELD");
  const lane=expectedLane(w,loc,primitive);
  held(m[12]===lane,"FORGED_PSEUDO_LANE_HELD");
  return {w,loc,sector,lane};
}
function expandedIndexDigest(resolver){
  const sha=stream();
  let bytes=0,count=0;
  for(let sector=0;sector<27;sector++)for(const band of BANDS)
    for(let site=0;site<81;site++){
      const line=Buffer.from(resolver.resolve(sector,band,site).row+"\n","ascii");
      sha.update(line);bytes+=line.length;count++;
    }
  const digest=sha.digest("hex");
  held(bytes===2344761&&count===15309&&digest===EXPANDED_SHA,"CANONICAL_ALIAS_SHA_MISMATCH");
  return {bytes,count,digest};
}
function verifyRoutes(resolver,v2){
  held(v2.length===3886535&&hash(v2)===V2_SHA,"V2_GOLD_DIGEST_HELD");
  held(v2[v2.length-1]===10,"V2_FINAL_LF_HELD");
  const lines=v2.toString("ascii").trimEnd().split("\n");
  held(lines.length===59050,"V2_FULL_ROWS_HELD");
  held(lines[0].startsWith("R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|")&&
       lines[0].includes("source_sha256="+V2_SOURCE_SHA),"V2_SOURCE_HEADER_HELD");
  let reads=0;
  const counts={"0":0,"1":0,"2":0,"H":0};
  const sha=stream();
  for(let seq=0;seq<59049;seq++){
    const {w,loc,sector,lane}=validateCase(lines[seq+1],seq);
    counts[lane]++;
    for(const band of BANDS){
      const {payload,leaf}=resolver.resolve(sector,band,loc);
      sha.update(Buffer.from("READ|w="+pad2(w)+"|loc="+pad2(loc)+
        "|sector="+pad2(sector)+"|band="+band+"|lane="+lane+"|leaf="+leaf+"\n","ascii"));
      held(payload.length>0,"EMPTY_MEMORY_READ");
      reads++;
    }
  }
  assert.deepEqual(counts,{"0":36906,"1":10179,"2":9777,"H":2187});
  held(reads===413343,"WRONG_TOTAL_READ_OR_ROUTE");
  return {reads,digest:sha.digest("hex"),counts,lines};
}
function erasure(resolver){
  const partial=new FactorizedRainbowResolver(resolver.source,resolver.bank,resolver.base,BANDS.slice(0,6));
  let heldCount=0,good=0;
  for(let sector=0;sector<27;sector++)for(let site=0;site<81;site++)
    for(const band of BANDS){
      try{
        partial.resolve(sector,band,site);
        held(band!=="violet","ERASED_VIOLET_STILL_AVAILABLE");
        good++;
      }catch(e){
        if(e.message==="BAND_ERASED_HELD"&&band==="violet")heldCount++;
        else throw e;
      }
    }
  held(heldCount===2187&&good===13122,"ERASURE_ALIAS_COUNT");
  return {heldCount,good};
}
function attacks(resolver,lines){
  const verdict={};
  function mustHold(name,fn){
    let error=null;
    try{fn();}catch(e){error=e;}
    held(error!==null,"ATTACK_ACCEPTED:"+name);
    verdict[name]="HELD";
  }
  mustHold("wrong_rgb_permutation_same_intensity",
           ()=>resolver.resolve(18,"red",0,[0,2,0]));
  mustHold("amplitude_scaled_to_different_ordered_sector",
           ()=>resolver.resolve(9,"blue",0,[2,0,0]));
  mustHold("out_of_range_sector",()=>resolver.resolve(27,"red",0));
  mustHold("wrong_band",()=>resolver.resolve(0,"ultraviolet",0));
  mustHold("wrong_site",()=>resolver.resolve(0,"red",81));
  const changed=Buffer.from(resolver.bank);changed[0]^=1;
  mustHold("tampered_bank",()=>new FactorizedRainbowResolver(resolver.source,changed,resolver.base));
  const wrongIndex=Buffer.from(resolver.base);wrongIndex[0]^=1;
  mustHold("tampered_base_index",()=>new FactorizedRainbowResolver(resolver.source,resolver.bank,wrongIndex));
  const wrongSource=Buffer.from(resolver.source);wrongSource[0]^=1;
  mustHold("tampered_original_source",()=>new FactorizedRainbowResolver(wrongSource,resolver.bank,resolver.base));
  mustHold("missing_source_manifest",()=>new FactorizedRainbowResolver(Buffer.alloc(0),resolver.bank,resolver.base));
  mustHold("unattested_origin",()=>resolver.requireExternalAuthentication());
  const original=lines[1]; // sector1, wave0 location0
  mustHold("forged_lane",()=>{
    const falseLane=original.endsWith("2")?"1":"2";
    validateCase(original.slice(0,-1)+falseLane,1);
  });
  mustHold("stale_replayed_sequence",()=>validateCase(original,2));
  mustHold("forged_rgb_source_metadata",
    ()=>validateCase(lines[19].replace(/\|rgb=\d{3}/,"|rgb=222"),19));
  const partial=new FactorizedRainbowResolver(resolver.source,resolver.bank,resolver.base,BANDS.slice(0,6));
  mustHold("erased_violet_payload",()=>partial.resolve(0,"violet",0));
  held(Object.keys(verdict).length===14,"FAULT_COVERAGE_LOST");
  const fake=Buffer.from(resolver.source);fake[0]^=1;
  const attackOwnedSha=hash(fake);
  held(attackOwnedSha===hash(fake)&&attackOwnedSha!==SOURCE_SHA,"LOCAL_FORGERY");
  verdict.self_consistent_local_hash_not_authentication="ORIGIN_UNAUTHENTICATED";
  return verdict;
}
function canonical(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
}
function save(out,name,blob){
  fs.writeFileSync(path.join(out,name),blob);
  fs.writeFileSync(path.join(out,name+".sha256"),hash(blob)+"  "+name+"\n","ascii");
}
function run(baseDir,v2Dir,outDir){
  const source=pinned(path.join(baseDir,"base-evidence/lightbank-memories.json"),SOURCE_SHA,16689);
  const bank=pinned(path.join(baseDir,"rainbow-evidence/rainbow7-bank.jsonl"),BANK_SHA,184815);
  const base=pinned(path.join(baseDir,"rainbow-evidence/rainbow7-index.hbi"),BASE_SHA,70043);
  const routes=pinned(path.join(v2Dir,"rainbow27/rainbow27-v2.hbp"),V2_SHA,3886535);
  const resolver=new FactorizedRainbowResolver(source,bank,base);
  const expanded=expandedIndexDigest(resolver);
  const replay=verifyRoutes(resolver,routes);
  const er=erasure(resolver);
  const controls=attacks(resolver,replay.lines.slice(1));
  const report={
    schema:SCHEMA,verdict:"PASS",
    source_origin_authenticated:false,
    source_root_sha256:SOURCE_SHA,bank_root_sha256:BANK_SHA,
    base_index_root_sha256:BASE_SHA,original_v2_root_sha256:V2_SHA,
    golden_expanded_index_sha256:expanded.digest,
    expanded_logical_addresses:expanded.count,
    unique_original_records:81,stored_band_site_entries:resolver.entries.size,
    in_memory_alias_map_entries:0,
    expanded_index_bytes_not_persisted:expanded.bytes,base_index_bytes:base.length,
    repeated_index_metadata_bytes_avoided:expanded.bytes-base.length,
    bank_payload_bytes_unchanged:bank.length,
    runtime_memory_source_payloads:resolver.entries.size,
    crosswalk_rows:59049,verified_real_byte_reads:replay.reads,
    streamed_full_read_transcript_sha256:replay.digest,
    route_census:replay.counts,
    violet_erasure_held_addresses_one_wave:er.heldCount,
    other_bands_available_one_wave:er.good,
    adversarial_cases:controls,
    quantum_hardware_verified:false,physical_optical_memory_verified:false,
    seven_wavelengths_measured:false,external_host_attestation_verified:false
  };
  const hbp=Buffer.from(
    "PORTAL|schema="+SCHEMA+"|simulation=1|source_origin_authenticated=0|json=0\n"+
    "ANCHORS|source="+SOURCE_SHA+"|bank="+BANK_SHA+"|base="+BASE_SHA+"|json=0\n"+
    "ADDRESSES|logical="+expanded.count+"|stored_references=567|unique_sources=81|in_memory_alias_map=0|json=0\n"+
    "INDEX|old_expanded_bytes="+expanded.bytes+"|base_bytes="+base.length+"|avoided_repeated_metadata="+
      (expanded.bytes-base.length)+"|old_sha256="+expanded.digest+"|json=0\n"+
    "READS|route_rows=59049|full_byte_reads="+replay.reads+"|stream_sha256="+replay.digest+"|json=0\n"+
    "ERASURE|violet_held="+er.heldCount+"|others_available="+er.good+"|json=0\n"+
    "ATTACKS|held="+Object.values(controls).filter(x=>x==="HELD").length+
       "|locally_coherent_origin=NOT_AUTHENTICATED|json=0\n"+
    "END|physical_photon_memory=0|optical_spectrum=0|external_source_signing=0|release_issue10=OPEN|json=0\n",
    "ascii");
  fs.mkdirSync(outDir,{recursive:true});
  save(outDir,"factorized-r27-results.hbp",hbp);
  save(outDir,"factorized-r27-results.json",Buffer.from(canonical(report)+"\n","ascii"));
  console.log(JSON.stringify({verdict:"PASS",addresses:expanded.count,verified_reads:replay.reads,
    held:Object.values(controls).filter(x=>x==="HELD").length,
    factorized_bytes_avoided:expanded.bytes-base.length,
    hbp_sha256:hash(hbp),json_sha256:hash(Buffer.from(canonical(report)+"\n","ascii"))}));
}
if(process.argv.length!==5){
  throw Error("usage: node factorized_resolver.js PR80_ARTIFACT PR81_ARTIFACT OUTPUT_DIR");
}
run(process.argv[2],process.argv[3],process.argv[4]);
