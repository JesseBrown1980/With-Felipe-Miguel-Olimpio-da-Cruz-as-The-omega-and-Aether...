#!/usr/bin/env node
"use strict";
/* Independent Node.js rebuild of Seat1 factorized logical memory addressing.
 * No import of Python producer. 567 indexed bank rows and 27 computed sectors.
 * Synthetic digital QR/Rainbow7 data; not physically stored photon states.
 */
const fs=require("node:fs"), path=require("node:path"),crypto=require("node:crypto");
const SOURCE_SHA="02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22";
const BANK_SHA="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345";
const BASE_SHA="6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee";
const EXPANDED_SHA="2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e";
const SCHEMA="ASOLARIA-RAINBOW27-FACTORIZED-RESOLVER-V1";
const BANDS=["red","orange","yellow","green","blue","indigo","violet"];
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
function ck(p,r){if(!p)throw new Error(r);}
function pin(b,hash,label){ck(sha(b)===hash,"PIN_"+label+"_MISMATCH");}
function site(n){return "site-"+String(n).padStart(3,"0");}
class Resolver{
  constructor(src,bank,index){
    pin(src,SOURCE_SHA,"SOURCE");
    pin(bank,BANK_SHA,"BANK");
    pin(index,BASE_SHA,"BASE_INDEX");
    const srcObj=JSON.parse(src.toString("utf8"));
    ck(srcObj.schema==="ASOLARIA-SEAT1-81-RGB-LIGHTBANK-V1" &&
       Array.isArray(srcObj.records)&&srcObj.records.length===81,"INVALID_81_SOURCE");
    this.records=srcObj.records;
    this.bank=bank;
    this.indexBytes=index.length;
    ck(index.at(-1)===10,"BASE_INDEX_COUNT");
    const lines=index.toString("ascii").trimEnd().split("\n");
    ck(lines.length===567,"BASE_INDEX_COUNT");
    this.lookup=new Map(); // only 567 rows allocated
    for(const line of lines){
      const fields=line.split("|");
      ck(fields.length===6 && fields[0]==="MEM","BASE_INDEX_FORMAT");
      const d={};
      for(const f of fields.slice(1)){
        const i=f.indexOf("=");
        ck(i>0 && !Object.hasOwn(d,f.slice(0,i)),"BASE_INDEX_FIELD");
        d[f.slice(0,i)]=f.slice(i+1);
      }
      ck(Object.keys(d).sort().join(",")==="band,id,length,offset,sha256","BASE_INDEX_FIELDS");
      ck(BANDS.includes(d.band)&&/^site-\d{3}$/.test(d.id)&&Number(d.id.slice(5))<81,
        "BASE_INDEX_IDENTITY");
      const key=d.band+"|"+d.id;
      ck(!this.lookup.has(key),"DUPLICATE_BASE_REFERENCE");
      ck(/^\d+$/.test(d.offset)&&/^\d+$/.test(d.length),"BASE_INDEX_BOUNDS");
      const offset=Number(d.offset),length=Number(d.length);
      ck(Number.isSafeInteger(offset)&&Number.isSafeInteger(length)&&length>0&&
         offset+length<=bank.length,"BASE_INDEX_BOUNDS");
      const bytes=bank.subarray(offset,offset+length);
      ck(sha(bytes)===d.sha256,"BASE_ROW_HASH_MISMATCH");
      const row=JSON.parse(bytes.toString("utf8"));
      ck(row.schema==="ASOLARIA-RAINBOW7-BANK-ENTRY-V1" &&
         row.id===d.id&&row.band===d.band &&
         row.address==="rainbow7/"+d.band+"/"+d.id,"BANK_ENTRY_IDENTITY");
      // Equality by value, ignoring JSON object property insertion order.
      function normalized(v){
        if(Array.isArray(v))return v.map(normalized);
        if(v && typeof v==="object"){
          const obj={};for(const k of Object.keys(v).sort())obj[k]=normalized(v[k]);
          return obj;
        }
        return v;
      }
      ck(JSON.stringify(normalized(row.record))===
         JSON.stringify(normalized(this.records[Number(d.id.slice(5))])),"ORIGINAL_81_ANCESTRY");
      this.lookup.set(key,{offset,length,digest:d.sha256});
    }
    ck(this.lookup.size===567,"INCOMPLETE_BASE_INDEX");
    for(const band of BANDS)for(let n=0;n<81;n++){
      ck(this.lookup.has(band+"|"+site(n)),"INCOMPLETE_BASE_INDEX");
    }
  }
  resolve(sector,band,id,coords){
    ck(Number.isInteger(sector)&&sector>=0&&sector<27,"INVALID_SECTOR");
    ck(typeof band==="string"&&BANDS.includes(band),"INVALID_BAND");
    ck(typeof id==="string"&&/^site-\d{3}$/.test(id)&&Number(id.slice(5))<81,"INVALID_SITE");
    const rgb=[Math.floor(sector/9),Math.floor(sector/3)%3,sector%3];
    if(coords!==undefined){
      ck(Array.isArray(coords)&&coords.length===3&&coords.every(x=>Number.isInteger(x)&&x>=0&&x<=2)
        &&coords.every((x,i)=>x===rgb[i]),"ORDERED_COORDINATE_MISMATCH");
    }
    const ref=this.lookup.get(band+"|"+id);
    ck(!!ref,"MISSING_BASE_ROW");
    ck(sha(this.bank.subarray(ref.offset,ref.offset+ref.length))===ref.digest,
       "RESOLVED_ROW_HASH_MISMATCH");
    return {sector,rgb,band,id,...ref};
  }
  virtualLegacy(){
    const h=crypto.createHash("sha256");
    let bytes=0,count=0;
    for(let s=0;s<27;s++){
      for(const band of BANDS)for(let n=0;n<81;n++){
        const x=this.resolve(s,band,site(n));
        const l="ADDR|sector="+s+"|r="+x.rgb[0]+"|g="+x.rgb[1]+"|b="+x.rgb[2]+
          "|band="+band+"|id="+x.id+"|offset="+x.offset+"|length="+x.length+
          "|source_sha256="+x.digest+"\n";
        const chunk=Buffer.from(l,"ascii");
        h.update(chunk);bytes+=chunk.length;count++;
      }
    }
    return {digest:h.digest("hex"),bytes,count};
  }
}
function expectedFailure(label,fn,expected){
  let got=null;
  try{fn()}catch(e){got=e.message;}
  ck(got===expected,"FAILURE_TEST_NOT_REJECTED_"+label+"_"+got);
  return true;
}
function canonical(o){
  return Buffer.from(JSON.stringify(Object.fromEntries(
     Object.entries(o).sort(([a],[b])=>a<b?-1:a>b?1:0)))+"\n","ascii");
}
function main(){
  const args=process.argv.slice(2);
  ck(args.length===3,"usage: node factorized27_node.js original-qr-evidence rainbow7-evidence output-evidence");
  const [original,rainbow,out]=args;
  const source=fs.readFileSync(path.join(original,"lightbank-memories.json"));
  const bank=fs.readFileSync(path.join(rainbow,"rainbow7-bank.jsonl"));
  const index=fs.readFileSync(path.join(rainbow,"rainbow7-index.hbi"));
  const resolver=new Resolver(source,bank,index);
  const {digest,bytes,count}=resolver.virtualLegacy();
  ck(digest===EXPANDED_SHA,"LEGACY_EXPANDED_INDEX_DIFFERENT");
  ck(bytes===2344761&&count===15309&&index.length===70043,"LEGACY_SIZE_DRIFT");
  ck(bank.length===184815,"LEGACY_BANK_SIZE_DRIFT");
  for(let s=0;s<27;s++){
    const rgb=[Math.floor(s/9),Math.floor(s/3)%3,s%3];
    ck(9*rgb[0]+3*rgb[1]+rgb[2]===s,"ORDERED_INVERSE_FAIL");
  }
  const red=resolver.resolve(18,"red","site-000"),
        green=resolver.resolve(6,"red","site-000");
  const intensity=v=>{
    const [r,g,b]=v,q=r*r+g*g+b*b-r*g-r*b-g*b;
    return [(r+g+b)**2,q,q];
  };
  ck(red.rgb.join(",")!==green.rgb.join(",") && red.offset===green.offset
     &&red.length===green.length&&red.digest===green.digest,"ORDERED_IDENTITY_COLLISION");
  ck(intensity(red.rgb).join(",")===intensity(green.rgb).join(","),
     "EXPECTED_INTENSITY_SYMMETRY_ABSENT");
  ck(resolver.resolve(0,"red","site-000").rgb.join(",")==="0,0,0",
     "DARK_SECTOR_DROPPED");
  function flip(b){const v=Buffer.from(b);v[Math.min(20,v.length-1)]^=1;return v;}
  const tests=[
    expectedFailure("source_byte",()=>new Resolver(flip(source),bank,index),"PIN_SOURCE_MISMATCH"),
    expectedFailure("bank_byte",()=>new Resolver(source,flip(bank),index),"PIN_BANK_MISMATCH"),
    expectedFailure("index_byte",()=>new Resolver(source,bank,flip(index)),"PIN_BASE_INDEX_MISMATCH"),
    expectedFailure("base_index_missing_row",()=>new Resolver(source,bank,
       Buffer.from(index.toString("ascii").trimEnd().split("\n").slice(0,-1).join("\n")+"\n","ascii")),
       "PIN_BASE_INDEX_MISMATCH"),
    expectedFailure("sector_negative",()=>resolver.resolve(-1,"red","site-000"),"INVALID_SECTOR"),
    expectedFailure("sector_27",()=>resolver.resolve(27,"red","site-000"),"INVALID_SECTOR"),
    expectedFailure("sector_fraction",()=>resolver.resolve(0.5,"red","site-000"),"INVALID_SECTOR"),
    expectedFailure("sector_string",()=>resolver.resolve("0","red","site-000"),"INVALID_SECTOR"),
    expectedFailure("band_missing",()=>resolver.resolve(0,"infrared","site-000"),"INVALID_BAND"),
    expectedFailure("site_missing",()=>resolver.resolve(0,"red","site-081"),"INVALID_SITE"),
    expectedFailure("ordered_coordinate_swap",()=>resolver.resolve(18,"red","site-000",[0,2,0]),
      "ORDERED_COORDINATE_MISMATCH"),
    expectedFailure("wrong_external_anchor",()=>pin(bank,"0".repeat(64),"BANK"),"PIN_BANK_MISMATCH")
  ];
  ck(tests.length===12&&tests.every(Boolean),"NEGATIVE_CONTROL_MISSING");
  // Actually remove entries and probe all 15,309 symbolic addresses; restore source.
  function erasure(removed,expected){
    const saved=new Map();
    for(const key of removed){
      ck(resolver.lookup.has(key),"ERASURE_SETUP_MISSING_BASE_ROW");
      saved.set(key,resolver.lookup.get(key));
      resolver.lookup.delete(key);
    }
    let rejected=0,accepted=0;
    try{
      for(let sector=0;sector<27;sector++)for(const band of BANDS)for(let n=0;n<81;n++){
        const id=site(n),key=band+"|"+id;
        try{
          resolver.resolve(sector,band,id);
          ck(!saved.has(key),"ERASURE_NOT_DETECTED");
          accepted++;
        }catch(e){
          ck(e.message==="MISSING_BASE_ROW"&&saved.has(key),
             "ERASURE_FAILED_FOR_WRONG_REASON_"+e.message);
          rejected++;
        }
      }
      ck(rejected===expected&&accepted===15309-expected,"ERASURE_COUNT_MISMATCH");
      return rejected;
    }finally{
      for(const [k,v] of saved)resolver.lookup.set(k,v);
    }
  }
  const missingViolet=erasure(Array.from({length:81},(_,n)=>"violet|"+site(n)),2187);
  const missingOne=erasure(["red|site-000"],27);
  const summary={
    schema:SCHEMA,
    source_sha256:SOURCE_SHA,bank_sha256:BANK_SHA,base_index_sha256:BASE_SHA,
    legacy_expanded_index_sha256:digest,
    logical_addresses:count,stored_bank_rows:resolver.lookup.size,original_memories:81,
    sector_count:27,symbolic_bands:7,
    expanded_index_bytes:bytes,factorized_base_index_bytes:resolver.indexBytes,
    retained_bank_bytes:bank.length,avoided_repeated_index_bytes:bytes-resolver.indexBytes,
    payload_compression_bytes:0,
    missing_violet_logical_aliases:missingViolet,missing_one_row_logical_aliases:missingOne,
    ordered_color_identity_preserved:true,symmetric_intensity_permutation_collision:true,
    dark_address_retained:true,negative_faults_rejected:tests.length,
    external_origin_authenticated:false,coherent_anchor_substitution:"HELD",
    physical_optical_memory_verified:false,quantum_effect_verified:false,release_authorized:false
  };
  const hbp=Buffer.from(
    "FACTOR27|schema="+SCHEMA+"|source_sha256="+SOURCE_SHA+"|bank_sha256="+BANK_SHA+
        "|base_index_sha256="+BASE_SHA+"\n"+
    "COUNTS|logical=15309|unique_bank=567|original=81|expanded_bytes=2344761|base_index_bytes=70043|metadata_avoided_bytes=2274718|payload_saved_bytes=0\n"+
    "PROOF|expanded_index_sha256="+digest+
       "|ordered_permutation_distinct=1|faults_rejected=12|source_trust=HELD|physical_optics=0\n","ascii");
  fs.mkdirSync(out,{recursive:true});
  for(const [name,blob] of [["factorized27.json",canonical(summary)],["factorized27.hbp",hbp]]){
    fs.writeFileSync(path.join(out,name),blob);
    fs.writeFileSync(path.join(out,name+".sha256"),sha(blob)+"  "+name+"\n","ascii");
  }
  console.log(JSON.stringify({status:"PASS",logical_addresses:count,
    expanded_sha256:digest,factorized_base_bytes:resolver.indexBytes,
    metadata_avoided:bytes-resolver.indexBytes,receipt_sha256:sha(hbp),
    actual_failures:tests.length,optical_physical_verified:false}));
}
main();
