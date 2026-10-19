#!/usr/bin/env node
"use strict";
/* Independent Seat1 ordered Rainbow27+Rainbow7 physical-bank indexed verifier.
   Original bytes are pinned to upstream independent pixel-QR experiment.
   No claim of wavelengths, actual optical storage, or Ed25519 source provenance.
*/
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const BANDS=["red","orange","yellow","green","blue","indigo","violet"];
const PIN_SRC="02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22";
const PIN_BANK="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345";
const PIN_INDEX="6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee";
const SCHEMA="ASOLARIA-ORDERED27-RAINBOW7-LOGICAL-V1";
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const ck=(v,reason)=>{if(!v)throw Error(reason);};
const read=(dir,name)=>fs.readFileSync(path.join(dir,name));
function sectorTuple(sector){return [Math.floor(sector/9),Math.floor(sector/3)%3,sector%3]}
function signature(r,g,b){let s=r+g+b,q=r*r+g*g+b*b-r*g-r*b-g*b;return [s*s,q,q]}
function gcd(a,b){while(b){let t=a%b;a=b;b=t}return a}
function normalize(v){
  const den=v.reduce((x,y)=>x+y,0);
  if(den===0)return "UNDEFINED";
  return v.map(x=>{let d=gcd(x,den);return x/d+"/"+den/d}).join("|");
}
function projection(r,g,b){
  const s=r+g+b,dr=3*r-s,dg=3*g-s;
  ck((dr+s)%3===0&&(dg+s)%3===0&&(s-dr-dg)%3===0,"PROJECTION_NONDIVISIBLE");
  return [(dr+s)/3,(dg+s)/3,(s-dr-dg)/3];
}
function classes(){
  const raw=new Map(),norm=new Map();
  for(let sector=0;sector<27;sector++){
    const rgb=sectorTuple(sector);
    ck(projection(...rgb).join(",")===rgb.join(","),"INVERSE_PROJECTION_NOT_EXACT");
    const v=signature(...rgb),rawKey=v.join(","),normKey=normalize(v);
    raw.set(rawKey,(raw.get(rawKey)||0)+1);
    norm.set(normKey,(norm.get(normKey)||0)+1);
  }
  ck(raw.size===10 && norm.size===7,"SIGNATURE_CARDINALITY");
  ck(signature(2,0,0).join(",")===signature(0,2,0).join(",")
     &&signature(2,0,0).join(",")===signature(0,0,2).join(","),"ONEHOT_PERMUTATION_COLLISION");
  const uncertainty=m=>Math.log2(27)+[...m.values()].reduce((s,x)=>s+(x/27)*Math.log2(x/27),0);
  ck(Math.abs(uncertainty(raw)-1.6310777784188053)<1e-12,"RAW_ENTROPY");
  ck(Math.abs(uncertainty(norm)-2.1495962969373235)<1e-12,"NORMALIZED_ENTROPY");
  ck(normalize([0,0,0])==="UNDEFINED","ZERO_NORMALIZATION_NOT_UNDEFINED");
  return {raw:raw.size,normalized:norm.size,
    raw_uncertainty:Number(uncertainty(raw).toFixed(12)),
    normalized_uncertainty:Number(uncertainty(norm).toFixed(12))};
}
function parseBase(bytes){
  ck(sha(bytes)===PIN_INDEX,"EXTERNAL_PINNED_INDEX_MISMATCH");
  let lines=bytes.toString("ascii").trimEnd().split("\n");
  ck(lines.length===567,"BASE_ROW_COUNT");
  const rows=new Map();
  for(const line of lines){
    const ss=line.split("|");
    ck(ss.length===6&&ss[0]==="MEM","BASE_INDEX_FORMAT");
    const o={};
    for(let s of ss.slice(1)){let [key,...parts]=s.split("=");o[key]=parts.join("=")}
    const key=o.band+"|"+o.id;
    ck(!rows.has(key),"DUPLICATE_SOURCE_ADDRESS");
    o.offset=Number(o.offset);o.length=Number(o.length);
    ck(Number.isSafeInteger(o.offset)&&Number.isSafeInteger(o.length),"INVALID_SOURCE_OFFSET");
    rows.set(key,o);
  }
  return rows;
}
function parseRow(line){
  const re=/^ADDR\|sector=(\d+)\|r=(\d+)\|g=(\d+)\|b=(\d+)\|band=([a-z]+)\|id=(site-\d{3})\|offset=(\d+)\|length=(\d+)\|source_sha256=([0-9a-f]{64})$/;
  const m=re.exec(line);
  ck(!!m,"INVALID_ADDRESS_LINE");
  const o={sector:Number(m[1]),r:Number(m[2]),g:Number(m[3]),b:Number(m[4]),
    band:m[5],id:m[6],offset:Number(m[7]),length:Number(m[8]),sha:m[9]};
  ck(o.sector>=0&&o.sector<27&&o.r>=0&&o.r<=2&&o.g>=0&&o.g<=2&&o.b>=0&&o.b<=2,
    "ORDERED_SECTOR_OUT_OF_RANGE");
  ck(o.sector===9*o.r+3*o.g+o.b,"ORDERED_SECTOR_MISMATCH");
  ck(BANDS.includes(o.band),"UNKNOWN_BAND");
  ck(Number(o.id.slice(5))<81,"UNKNOWN_ID");
  return o;
}
function verify(lines,bank,source,options={}){
  const seen=new Set();
  const missingFilter=options.allowMissing||null;
  let reads=0;
  for(const line of lines){
    let o=typeof line==="string"?parseRow(line):parseRow(line);
    let k=o.sector+"|"+o.band+"|"+o.id;
    ck(!seen.has(k),"DUPLICATE_ADDRESS");
    seen.add(k);
    ck(o.offset>=0&&o.length>0&&o.offset+o.length<=bank.length,"SOURCE_INDEX_BOUNDS");
    const body=bank.subarray(o.offset,o.offset+o.length);
    ck(sha(body)===o.sha,"SOURCE_ROW_SHA_MISMATCH");
    const entry=JSON.parse(body.toString("utf8"));
    ck(entry.schema==="ASOLARIA-RAINBOW7-BANK-ENTRY-V1" &&
       entry.band===o.band && entry.id===o.id &&
       entry.address==="rainbow7/"+o.band+"/"+o.id,"SOURCE_ENTRY_ADDRESS_MISMATCH");
    const n=Number(o.id.slice(5));
    ck(JSON.stringify(entry.record)===JSON.stringify(source[n]),"PINNED_SOURCE_RECORD_DIFFERENT");
    reads++;
  }
  let missing=0;
  for(let s=0;s<27;s++)for(const band of BANDS)for(let site=0;site<81;site++){
    const id="site-"+String(site).padStart(3,"0");
    const k=s+"|"+band+"|"+id;
    if(!seen.has(k)){
      missing++;
      ck(missingFilter!==null&&missingFilter(s,band,id),"MISSING_ADDRESS");
    }
  }
  if(missingFilter===null)ck(missing===0,"MISSING_ADDRESS");
  return {reads,missing};
}
function negative(label,act,expected){
  let caught=null;
  try{act()}catch(e){caught=String(e.message)}
  ck(caught===expected,"UNREJECTED_OR_WRONG_FAULT_"+label+"_"+caught);
  return {label,stage:"address_or_index_lookup_before_logical_read",exercised:true,verdict:"REJECT",reason:caught};
}
function main(){
  ck(process.argv.length===5,
     "usage: node verify_ordered27.js original-qr-evidence existing-rainbow7-evidence new-index-evidence");
  const [origin,base,dest]=process.argv.slice(2);
  const raw=read(origin,"lightbank-memories.json");
  ck(sha(raw)===PIN_SRC,"EXTERNAL_PINNED_ORIGINAL_SOURCE_MISMATCH");
  const source=JSON.parse(raw).records;
  ck(source.length===81,"ORIGINAL_IDENTITY_COUNT");
  const bank=read(base,"rainbow7-bank.jsonl");
  ck(sha(bank)===PIN_BANK,"EXTERNAL_PINNED_BANK_MISMATCH");
  const oldIndex=read(base,"rainbow7-index.hbi");
  const lookup=parseBase(oldIndex);
  const newIndex=read(dest,"ordered27-rainbow7-index.hbi");
  const manifestRaw=read(dest,"ordered27-rainbow7-manifest.json");
  const manifest=JSON.parse(manifestRaw);
  ck(manifest.schema===SCHEMA && manifest.pinned_existing_bank_sha256===PIN_BANK &&
    manifest.pinned_existing_index_sha256===PIN_INDEX &&
    manifest.source_81_sha256===PIN_SRC &&
    manifest.new_index_sha256===sha(newIndex) &&
    manifest.new_logical_address_probes===15309 &&
    manifest.external_provenance==="HELD_HASH_ONLY" &&
    manifest.physical_optical_storage_verified===false,"MANIFEST_MISMATCH");
  for(let name of ["ordered27-rainbow7-index.hbi","ordered27-rainbow7-manifest.json"]){
    const b=read(dest,name),parts=read(dest,name+".sha256").toString("ascii").trim().split(/\s+/);
    ck(parts.length===2&&parts[0]===sha(b)&&parts[1]===name,"SIDECAR_MISMATCH");
  }
  const lines=newIndex.toString("ascii").trimEnd().split("\n");
  ck(newIndex.at(-1)===10&&lines.length===15309,"ADDRESS_COUNT");
  // Independent construction from source 567 physical entries, not from producer's rows.
  const independentlyComputed=[];
  for(let sector=0;sector<27;sector++){
    const [r,g,b]=sectorTuple(sector);
    for(const band of BANDS)for(let n=0;n<81;n++){
      const id="site-"+String(n).padStart(3,"0"),ref=lookup.get(band+"|"+id);
      ck(!!ref,"SOURCE_BANK_ADDRESS_ABSENT");
      independentlyComputed.push("ADDR|sector="+sector+"|r="+r+"|g="+g+"|b="+b+
        "|band="+band+"|id="+id+"|offset="+ref.offset+"|length="+ref.length+
        "|source_sha256="+ref.sha256);
    }
  }
  const independentlyEncoded=Buffer.from(independentlyComputed.join("\n")+"\n","ascii");
  ck(independentlyEncoded.equals(newIndex),"PRODUCER_VERIFIER_INDEX_BYTE_DRIFT");
  const baseline=verify(lines,bank,source);
  ck(baseline.reads===15309&&baseline.missing===0,"INCOMPLETE_BASELINE");
  const stats=classes();
  ck(stats.raw===manifest.raw_intensity_equivalence_classes &&
     stats.normalized===manifest.normalized_intensity_equivalence_classes_including_zero &&
     stats.raw_uncertainty===manifest.conditional_address_uncertainty_bits_raw &&
     stats.normalized_uncertainty===manifest.conditional_address_uncertainty_bits_normalized,
    "MATHEMATICS_MANIFEST_MISMATCH");
  const failures=[];
  const sector18Index=18*567;
  let permuted=[...lines];
  permuted[sector18Index]=permuted[sector18Index].replace("|r=2|g=0|b=0|","|r=0|g=2|b=0|");
  ck(signature(2,0,0).join(",")===signature(0,2,0).join(","),"EXPECTED_INTENSITY_COLLISION");
  failures.push(negative("permutation_intensity_collides_but_ordered_address_rejects",()=>verify(permuted,bank,source),"ORDERED_SECTOR_MISMATCH"));
  failures.push(negative("duplicated_address",()=>verify([...lines,lines[0]],bank,source),"DUPLICATE_ADDRESS"));
  failures.push(negative("missing_address",()=>verify(lines.slice(1),bank,source),"MISSING_ADDRESS"));
  const damaged=Buffer.from(bank);
  const first=parseRow(lines[0]);damaged[first.offset+first.length-2]^=1;
  failures.push(negative("source_byte_corruption",()=>verify(lines,damaged,source),"SOURCE_ROW_SHA_MISMATCH"));
  const shift=[...lines];shift[0]=shift[0].replace("|offset="+first.offset+"|","|offset="+(first.offset+1)+"|");
  failures.push(negative("shift_source_offset",()=>verify(shift,bank,source),"SOURCE_ROW_SHA_MISMATCH"));
  const falsesha=[...lines];falsesha[0]=falsesha[0].replace("|source_sha256="+first.sha,"|source_sha256="+"0".repeat(64));
  failures.push(negative("forged_source_row_digest",()=>verify(falsesha,bank,source),"SOURCE_ROW_SHA_MISMATCH"));
  const violet=lines.filter(x=>!x.includes("|band=violet|"));
  const oneband=verify(violet,bank,source,{allowMissing:(s,b,id)=>b==="violet"});
  ck(oneband.reads===13122&&oneband.missing===2187,"BAND_ERASURE_ACCOUNTING");
  const erasure=lines.filter(x=>!x.includes("|band=red|id=site-000|"));
  const onesource=verify(erasure,bank,source,{allowMissing:(s,b,id)=>b==="red"&&id==="site-000"});
  ck(onesource.reads===15282&&onesource.missing===27,"SOURCE_ALIAS_ERASURE_ACCOUNTING");
  // Real coherent-source attack: change an original memory record, then rewrite
  // the affected stored JSONL row and all 27 logical alias digests to agree.
  // Independent original source pins must reject this even though self-checks pass.
  function sortRecursive(value){
    if(Array.isArray(value))return value.map(sortRecursive);
    if(value!==null&&typeof value==="object"){
      const out={};for(const key of Object.keys(value).sort())out[key]=sortRecursive(value[key]);
      return out;
    }
    return value;
  }
  const forgedSource=JSON.parse(JSON.stringify(source));
  ck(forgedSource[0].id==="site-000","ASSUMED_SOURCE_ID_DIFFERENT");
  forgedSource[0].id="site-001";
  const outside=Buffer.from(bank);
  const forgedHashes=new Map();
  // Seven full-data copies share the original site-000 payload; compromise
  // must modify all seven and all 27 sector references per copy (189 aliases).
  for(const band of BANDS){
    const ref=lookup.get(band+"|site-000");
    ck(!!ref,"MISSING_FORGERY_BASE_REFERENCE");
    const body=JSON.parse(bank.subarray(ref.offset,ref.offset+ref.length).toString("utf8"));
    ck(body.record.id==="site-000","ASSUMED_BANK_SOURCE_ID_DIFFERENT");
    body.record.id="site-001";
    const rewritten=Buffer.from(JSON.stringify(sortRecursive(body))+"\n","utf8");
    ck(rewritten.length===ref.length,"CHANGED_RECORD_SIZE_UNEXPECTED");
    rewritten.copy(outside,ref.offset);
    forgedHashes.set(band,sha(rewritten));
  }
  const forgedLines=lines.map(x=>{
    if(!x.includes("|id=site-000|"))return x;
    const band=x.split("|band=")[1].split("|")[0];
    const oldHash=lookup.get(band+"|site-000").sha256;
    return x.replace("|source_sha256="+oldHash,
                     "|source_sha256="+forgedHashes.get(band));
  });
  ck(forgedLines.filter((x,i)=>x!==lines[i]).length===189,
     "NOT_ALL_SEVEN_COPIES_AND_189_ALIASES_FORGED");
  ck(verify(forgedLines,outside,forgedSource).reads===15309,
     "COHERENT_FORGED_LOCAL_RECOMPUTATION_SHOULD_PASS");
  ck(sha(outside)!==PIN_BANK,"FORGED_BANK_EQUALS_EXTERNAL_PIN");
  ck(sha(Buffer.from(JSON.stringify(forgedSource)))!==sha(Buffer.from(JSON.stringify(source))),
     "FORGED_SOURCE_EQUALS_ORIGINAL");
  failures.push(negative("coherently_rehashed_source_against_external_pin",()=>{
    ck(sha(outside)===PIN_BANK,"EXTERNAL_PINNED_BANK_MISMATCH")
  },"EXTERNAL_PINNED_BANK_MISMATCH"));
  failures.push(negative("sector_27_out_of_range",()=>parseRow(lines[0].replace("|sector=0|","|sector=27|")),"ORDERED_SECTOR_OUT_OF_RANGE"));
  failures.push(negative("non_numeric_coordinate",()=>parseRow(lines[0].replace("|r=0|","|r=z|")),"INVALID_ADDRESS_LINE"));
  ck(normalize(signature(0,0,0))==="UNDEFINED","UNDEFINED_ZERO_NORM_NOT_HANDLED");
  const report={schema:"ASOLARIA-SEAT1-ORDERED27-VERIFICATION-V1",
    status:"PASS",exact_logical_reads:15309,independent_stored_payloads:567,
    unique_original_memories:81,ordered_sectors:27,logical_rainbow_labels:7,
    producer_index_sha256:sha(newIndex),bank_sha256:sha(bank),external_source_sha256:PIN_SRC,
    mathematical_classes:stats,negative_faults:failures,
    lost_violet:{missing:oneband.missing,remaining:oneband.reads},
    lost_single_bank_entry:{missing:onesource.missing,remaining:onesource.reads},
    normalized_all_zero_case:"UNDEFINED",
    coherent_forgery_locally_passes_without_external_pin:true,
    coherent_compromised_external_anchor:"HELD_CANNOT_AUTHENTICATE_USING_SHA256_ALONE",
    physical_optical_storage_verified:false,independent_wavelengths_measured:0,
    photon_or_biological_neuron_measurements:0};
  fs.writeFileSync(path.join(dest,"ordered27-verification.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({status:"PASS",reads:15309,raw_classes:stats.raw,normalized_classes:stats.normalized,
      fail_closed_faults:failures.length,missing_band:oneband.missing,missing_source_aliases:onesource.missing,
      index_sha256:sha(newIndex),external_origin:"HELD"},null,2));
}
main();
