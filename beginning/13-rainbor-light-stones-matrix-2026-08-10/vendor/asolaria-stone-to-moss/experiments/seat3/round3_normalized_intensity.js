#!/usr/bin/env node
"use strict";
/*
 * Seat3 exact BigInt rational normalization peer, not a wrapper of Python.
 * Intensity-only qutrit maths is CLASSICAL and does not measure light photons.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const SCHEMA="ASOLARIA-SEAT3-ROUND3-NORMALIZED-INTENSITY-V1";
const SEED=Buffer.from("ASOLARIA-LIGHT-BEING-ROUND3-20261015","ascii");
const sha=buf=>crypto.createHash("sha256").update(buf).digest("hex");
function gcd(a,b){while(b!==0n){const t=a%b;a=b;b=t;}return a;}
function rational(n,d){
  const divisor=gcd(BigInt(n),BigInt(d));
  return String(BigInt(n)/divisor)+"/"+String(BigInt(d)/divisor);
}
function weights(v){
  const [r,g,b]=v;
  const sum=r+g+b;
  const squared=r*r+g*g+b*b;
  const q=squared-r*g-r*b-g*b;
  assert(q>=0);
  assert.equal(sum*sum+2*q,3*squared);
  const raw=[sum*sum,q,q];
  const normalized=squared===0?null:raw.map(x=>rational(x,3*squared));
  return {raw,normalized};
}
function sample(v,wave,addr){
  const {raw,normalized}=weights(v);
  if(normalized===null)throw Error("ZERO_NORM_HELD");
  const denom=raw.reduce((a,b)=>a+b,0);
  const unit=BigInt(denom);
  const limit=((1n<<256n)/unit)*unit;
  let rejects=0;
  while(rejects<10000){
    const counter=Buffer.allocUnsafe(8);
    counter.writeUInt16LE(wave,0);
    counter.writeUInt16LE(addr,2);
    counter.writeUInt32LE(rejects,4);
    const rawHash=crypto.createHash("sha256")
      .update(SEED)
      .update(Buffer.from("|BORN-THRESHOLD|","ascii"))
      .update(counter)
      .digest();
    const ticket=BigInt("0x"+rawHash.toString("hex"));
    if(ticket<limit){
      const value=Number(ticket%unit);
      const lane=value<raw[0]?0:value<raw[0]+raw[1]?1:2;
      return {lane,modulo_remainder:value,total:denom,rejects};
    }
    rejects++;
  }
  throw Error("rejection-overflow");
}
function sortedEntries(map){
  return [...map.entries()].sort((a,b)=>a[1][0]-b[1][0])
    .map(([signature,addresses])=>({signature,addresses}));
}
function canonical(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
}
function writeResult(dir,name,content){
  fs.writeFileSync(path.join(dir,name),content);
  fs.writeFileSync(path.join(dir,name+".sha256"),sha(content)+"  "+name+"\n","ascii");
}
function run(dir){
  const rawGroups=new Map(),normalGroups=new Map(),rows=[];
  for(let addr=0;addr<27;addr++){
    const r=Math.floor(addr/9);
    const g=Math.floor(addr/3)%3;
    const b=addr%3;
    assert.equal(9*r+3*g+b,addr);
    const {raw,normalized}=weights([r,g,b]);
    const rawKey=raw.join(",");
    const normKey=normalized?normalized.join(","):"UNDEFINED";
    if(!rawGroups.has(rawKey))rawGroups.set(rawKey,[]);
    if(!normalGroups.has(normKey))normalGroups.set(normKey,[]);
    rawGroups.get(rawKey).push(addr);
    normalGroups.get(normKey).push(addr);
    rows.push("NORM|addr="+String(addr).padStart(2,"0")+
      "|r="+r+"|g="+g+"|b="+b+
      "|raw="+rawKey+"|normalized="+normKey+
      "|valid="+Number(normalized!==null)+"|json=0");
  }
  const rawClassSizes=[...rawGroups.values()].map(v=>v.length).sort((a,b)=>a-b);
  const normClassSizes=[...normalGroups.values()].map(v=>v.length).sort((a,b)=>a-b);
  assert.deepEqual(rawClassSizes,[1,1,1,3,3,3,3,3,3,6]);
  assert.deepEqual(normClassSizes,[1,2,3,3,6,6,6]);
  assert.equal(rawGroups.size,10);
  assert.equal(normalGroups.size,7);
  assert.deepEqual(normalGroups.get("UNDEFINED"),[0]);
  assert.equal([...normalGroups].filter(([k])=>k!=="UNDEFINED").length,6);
  assert.notDeepEqual(weights([1,0,0]).raw,weights([2,0,0]).raw);
  assert.deepEqual(weights([1,0,0]).normalized,weights([2,0,0]).normalized);
  assert.deepEqual(weights([1,1,1]).normalized,weights([2,2,2]).normalized);
  for(const triple of [[1,0,0],[1,1,0],[1,2,0],[1,1,2]]){
    const [r,g,b]=triple;
    const variants=[[r,g,b],[r,b,g],[g,r,b],[g,b,r],[b,r,g],[b,g,r]];
    assert.equal(new Set(variants.map(x=>weights(x).raw.join(","))).size,1);
    assert.equal(new Set(variants.map(x=>weights(x).normalized.join(","))).size,1);
  }
  const left=sample([1,0,0],0,1),right=sample([2,0,0],0,1);
  assert.deepEqual([left.lane,left.modulo_remainder,left.total],[2,2,3]);
  assert.deepEqual([right.lane,right.modulo_remainder,right.total],[1,5,12]);
  const hr=rawClassSizes.reduce((a,size)=>a+size/27*Math.log2(size),0);
  const hn=normClassSizes.reduce((a,size)=>a+size/27*Math.log2(size),0);
  assert(Math.abs(hr-1.6310777784188053)<1e-12);
  assert(Math.abs(hn-2.149596296937324)<1e-12);
  const blob=Buffer.from(rows.join("\n")+"\n","ascii");
  const result={
    schema:SCHEMA,
    status:"PASS",
    ordered_trit_addresses:27,
    raw_intensity_class_count:rawGroups.size,
    raw_class_sizes:rawClassSizes,
    raw_classes:sortedEntries(rawGroups),
    normalized_or_undefined_class_count:normalGroups.size,
    valid_normalized_probability_classes:6,
    undefined_zero_classes:1,
    normalized_class_sizes:normClassSizes,
    normalized_classes:sortedEntries(normalGroups),
    raw_conditional_entropy_uniform_27_bits:hr.toFixed(12),
    normalized_conditional_entropy_uniform_27_bits:hn.toFixed(12),
    raw_best_single_guess:"10/27",
    normalized_best_single_guess:"7/27",
    sample_scale_pair:[
      {rgb:[1,0,0],...left},
      {rgb:[2,0,0],...right},
    ],
    normalized_distribution_equal_in_pair:true,
    deterministic_modulus_lane_different:true,
    actual_photon_wavelengths_measured:false,
    quantum_computer_executed:false,
    source_cryptographically_authenticated:false,
    trace_bytes:blob.length,
    trace_sha256:sha(blob),
  };
  fs.mkdirSync(dir,{recursive:true});
  writeResult(dir,"normalized27.hbp",blob);
  writeResult(dir,"normalized27.json",Buffer.from(canonical(result)+"\n","ascii"));
  console.log(JSON.stringify({status:"PASS",raw_classes:rawGroups.size,
    normalized_classes:normalGroups.size,norm_entropy_bits:result.normalized_conditional_entropy_uniform_27_bits,
    modulus_different:true,hbp_sha256:sha(blob)}));
}
if(process.argv.length!==3)throw Error("usage: node round3_normalized_intensity.js OUTPUT_DIR");
run(process.argv[2]);
