#!/usr/bin/env node
"use strict";
/* Seat 4 B3 independent ordinary-QR PAYLOAD and virtual RGB memory-bank reader.
 * A QR image is NOT rendered or decoded in this test. No physical optical claim.
 */
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const assert=require("node:assert/strict");
const SHAS={
 "original-phaseA.hbp":[611999,"de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b"],
 "ticks.hbp":[34876953,"2b9575a8d46c2d2f0842d590081641ed2b20daddccc7153107d76efa0d597277"],
 "faults.hbp":[115829,"ad471bc627451f65d6f26797ddf6c03546ac1f74ab8e3698d9825f1409f9bbb2"],
 "receipt.json":[2751,"e63baf8accdfbca43bd23e02b8849fcf312ee904ea3a29e02ab9c11bd8b0dafd"]
};
const ORDER=["original-phaseA.hbp","ticks.hbp","faults.hbp","receipt.json"];
const SCHEMA="ASOLARIA-SEAT4-COLOURQR-LIGHTBANK-B3-V1";
const PINNED_MANIFEST_SHA="a87d27bce1924f3fc4340a337706bf1365cb38919feee71e759f594c3549ced7";
const WIDTH=2100,INDEX=2104,PLANE=2106,RECORD=8424,BANKS=27;
const hash=raw=>crypto.createHash("sha256").update(raw).digest("hex");
const read=(root,name)=>fs.readFileSync(path.join(root,name));
function sorted(value){
 if(Array.isArray(value))return value.map(sorted);
 if(value!==null&&typeof value==="object")
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])]));
 return value;
}
function canonical(value){return Buffer.from(JSON.stringify(sorted(value))+"\n","ascii");}
function xorBytes(...parts){
 const out=Buffer.alloc(parts[0].length);
 for(const src of parts){
  assert(src.length===out.length);
  for(let j=0;j<src.length;j++)out[j]^=src[j];
 }
 return out;
}
function parseSourceArchive(raw,sourceRoot){
 assert(raw.length>4);
 const len=raw.readUInt32LE(0);
 assert(len>0&&len<16384);
 const head=raw.subarray(4,4+len),doc=JSON.parse(head.toString("ascii"));
 assert(canonical(doc).equals(head));
 assert.equal(doc.schema,"ASOLARIA-SEAT4-B3-TYPED-ARCHIVE-V1");
 assert.equal(doc.sources.length,4);
 let consumed=0;
 for(let j=0;j<ORDER.length;j++){
  const name=ORDER[j],spec=doc.sources[j];
  assert.equal(spec.name,name);
  assert.equal(spec.offset,consumed);
  const [length,expected]=SHAS[name];
  assert.equal(spec.bytes,length);
  assert.equal(spec.sha256,expected);
  const body=raw.subarray(4+len+consumed,4+len+consumed+length);
  assert.equal(body.length,length);
  assert.equal(hash(body),expected);
  assert(body.equals(read(sourceRoot,name)));
  consumed+=length;
 }
 assert.equal(4+len+consumed,raw.length);
 return doc;
}
function planePayload(raw,global,chunkCount){
 assert.equal(raw.length,PLANE);
 const length=raw.readUInt16LE(0);
 if(global>=chunkCount){
  assert(raw.equals(Buffer.alloc(PLANE)),"nonzero filler");
  return null;
 }
 assert(length>=5&&length<=INDEX,"bad length");
 const payload=raw.subarray(2,2+length);
 assert.equal(payload.readUInt32LE(0),global,"index mismatch / duplicate");
 assert(raw.subarray(2+length).equals(Buffer.alloc(INDEX-length)));
 const b64=payload.toString("base64");
 assert(Buffer.byteLength(b64,"ascii")<=2953);
 assert(Buffer.from(b64,"base64").equals(payload));
 return payload.subarray(4);
}
function recoverRGBPlane(planes,shadow,missing){
 assert.equal(planes.length,3);
 assert.equal(missing.length,1,"INSUFFICIENT_RGB_PARITY");
 const lane=missing[0];assert(lane>=0&&lane<3);
 const have=planes.filter((_,i)=>i!==lane);
 assert(have.every(x=>x!==null));
 return xorBytes(shadow,...have);
}
function parseFrames(banks,meta,sourceRoot,order){
 const count=meta.rgb_frame_count,total=meta.chunk_count;
 assert.equal(banks.length,BANKS);
 const chunks=new Array(total);
 for(const f of order){
  const bank=banks[f%BANKS];
  assert(bank!==null);
  const row=bank.subarray(Math.floor(f/BANKS)*RECORD,Math.floor(f/BANKS+1)*RECORD);
  assert.equal(row.length,RECORD);
  const rgb=[0,1,2].map(c=>row.subarray(c*PLANE,(c+1)*PLANE));
  const p=row.subarray(3*PLANE,4*PLANE);
  assert(p.equals(xorBytes(...rgb)),"RGB parity mismatch");
  for(let c=0;c<3;c++){
   const i=f*3+c,data=planePayload(rgb[c],i,total);
   if(data!==null){
    assert(chunks[i]===undefined,"duplicate index");
    chunks[i]=data;
   }
  }
 }
 assert(chunks.every(x=>x!==undefined));
 const archive=Buffer.concat(chunks);
 assert.equal(archive.length,meta.archive_bytes);
 assert.equal(hash(archive),meta.archive_sha256);
 parseSourceArchive(archive,sourceRoot);
 return archive;
}
function recoverWholeBank(banks,parity,missing,meta){
 assert(missing.length===1,"INSUFFICIENT_ERASURE_CAPACITY");
 const absent=missing[0],out=Buffer.alloc(meta.stripes_per_bank*RECORD);
 for(let stripe=0;stripe<meta.stripes_per_bank;stripe++){
  const offset=stripe*RECORD, parts=[parity.subarray(offset,offset+RECORD)];
  for(let b=0;b<BANKS;b++){
   if(b===absent)continue;
   assert(banks[b]!==null);
   parts.push(banks[b].subarray(offset,offset+RECORD));
  }
  xorBytes(...parts).copy(out,offset);
 }
 assert.equal(hash(out),meta.data_bank_sha256[absent]);
 return out;
}
function projectorTest(ticks){
 const n=81*81;let examples=0,distinct=new Set();
 function proj(r,g,b){
  const s=r+g+b;return [3*r-s,3*g-s,3*b-s];
 }
 assert.deepEqual(proj(0,0,0),proj(1,1,1));
 assert.deepEqual(proj(253,253,253),proj(0,0,0));
 for(let j=0;j<n;j++){
  let pos=(j*8119)%(ticks.length-3);pos-=pos%3;
  distinct.add(pos);
  const r=ticks[pos],g=ticks[pos+1],b=ticks[pos+2];
  const [nr,ng,nb]=proj(r,g,b);
  assert.equal(nr+ng+nb,0);
  // A mathematically zero remainder may be -0 in JavaScript; strictEqual
  // distinguishes -0 from +0, whereas modular divisibility does not.
  assert((nr-ng)%3===0);assert((nr-nb)%3===0);
  const recover=[r,r-(nr-ng)/3,r-(nr-nb)/3];
  assert.deepEqual(recover,[r,g,b]);
  examples++;
 }
 return {exact_projector_lifts:examples,unique_source_positions:distinct.size,
  shadow_only_equal_mode_collision:true,
  minimal_worst_case_ground_bits_per_triple:8,physical_instantaneity_claimed:false};
}
function run(sourceRoot,root){
 const json=read(root,"bank_manifest.json");
 assert.equal(hash(json),PINNED_MANIFEST_SHA,"STALE_OR_TAMPERED_BANK_MANIFEST");
 const changed=Buffer.from(json);changed[Math.floor(changed.length/2)]^=1;
 assert.notEqual(hash(changed),PINNED_MANIFEST_SHA);
 const meta=JSON.parse(json.toString("ascii"));
 assert(json.equals(canonical(meta)));
 assert.equal(meta.schema,SCHEMA);
 assert.equal(meta.classification,"SYNTHETIC_DIGITAL_MEMORY_ONLY");
 assert.equal(meta.data_bank_count,BANKS);
 assert.equal(meta.chunk_body_bytes,WIDTH);
 assert.equal(meta.rgb_lanes,3);
 assert.equal(meta.lane_record_bytes,PLANE);
 assert.equal(meta.frame_record_bytes,RECORD);
 assert.equal(meta.nonstandard_local_xor_shadow_lanes,1);
 assert.equal(meta.additional_full_bank_xor_parity,1);
 assert.equal(meta.rgb_frame_count,Math.ceil(meta.chunk_count/3));
 assert.equal(meta.stripes_per_bank,Math.ceil(meta.rgb_frame_count/BANKS));
 assert.equal(meta.data_bank_sha256.length,BANKS);
 for(let j=0;j<ORDER.length;j++){
  assert.equal(meta.sources[j].name,ORDER[j]);
  assert.equal(meta.sources[j].bytes,SHAS[ORDER[j]][0]);
  assert.equal(meta.sources[j].sha256,SHAS[ORDER[j]][1]);
 }
 const archive=read(root,"source.archive");
 assert.equal(hash(archive),meta.archive_sha256);
 assert.equal(archive.length,meta.archive_bytes);
 parseSourceArchive(archive,sourceRoot);
 const banks=[];
 for(let b=0;b<BANKS;b++){
  const row=read(root,"bank-"+String(b).padStart(2,"0")+".hbp");
  assert.equal(hash(row),meta.data_bank_sha256[b]);
  assert.equal(row.length,meta.stripes_per_bank*RECORD);
  banks.push(row);
 }
 const parity=read(root,"bank-parity.hbp");
 assert.equal(hash(parity),meta.parity_bank_sha256);
 assert.equal(parity.length,meta.stripes_per_bank*RECORD);
 const ordered=Array.from({length:meta.rgb_frame_count},(_,i)=>i);
 assert(parseFrames(banks,meta,sourceRoot,ordered).equals(archive));
 assert(parseFrames(banks,meta,sourceRoot,ordered.toReversed()).equals(archive));
 let onePlane=0;
 for(let f=0;f<meta.rgb_frame_count;f++){
  const row=banks[f%BANKS].subarray(
    Math.floor(f/BANKS)*RECORD,(Math.floor(f/BANKS)+1)*RECORD);
  const rgb=[0,1,2].map(i=>row.subarray(i*PLANE,(i+1)*PLANE));
  const lane=f%3;
  const erased=rgb.map((value,index)=>index===lane?null:value);
  const recovered=recoverRGBPlane(erased,row.subarray(3*PLANE,4*PLANE),[lane]);
  assert(recovered.equals(rgb[lane]));
  onePlane++;
 }
 const lost=7,erased=[...banks];erased[lost]=null;
 const recovered=recoverWholeBank(erased,parity,[lost],meta);
 erased[lost]=recovered;
 assert(parseFrames(erased,meta,sourceRoot,ordered).equals(archive));
 const corrupt=Buffer.from(banks[12]);corrupt[PLANE+10]^=1;
 assert.notEqual(hash(corrupt),meta.data_bank_sha256[12]);
 const damaged=[...banks];damaged[12]=null;
 damaged[12]=recoverWholeBank(damaged,parity,[12],meta);
 assert(parseFrames(damaged,meta,sourceRoot,ordered).equals(archive));
 assert.throws(()=>recoverWholeBank(banks,parity,[7,12],meta),
  /INSUFFICIENT_ERASURE_CAPACITY/);
 assert.throws(()=>recoverRGBPlane([null,null,Buffer.alloc(PLANE)],Buffer.alloc(PLANE),[0,1]),
   /INSUFFICIENT_RGB_PARITY/);
 const a=Buffer.alloc(PLANE),b=Buffer.alloc(PLANE);b[0]=1;
 assert(xorBytes(a,a).equals(xorBytes(b,b))&&!a.equals(b));
 const forged=Buffer.from(banks[0]);forged[2]^=1;
 // The attacker also recomputes the local XOR parity so index verification,
 // rather than a mere inconsistent parity bit, MUST reject the false address.
 xorBytes(forged.subarray(0,PLANE),forged.subarray(PLANE,2*PLANE),
   forged.subarray(2*PLANE,3*PLANE)).copy(forged,3*PLANE);
 const altered=[...banks];altered[0]=forged;
 assert.throws(()=>parseFrames(altered,meta,sourceRoot,ordered),
   /index mismatch/);
 const ticks=read(sourceRoot,"ticks.hbp");
 const projection=projectorTest(ticks);
 const receipt=JSON.parse(read(root,"B3-RESULT.json").toString("ascii"));
 assert.equal(receipt.status,"PASS");
 assert.equal(receipt.source_payload_bytes,Object.values(SHAS).reduce((a,x)=>a+x[0],0));
 assert.equal(receipt.qr_indexed_base64_chunks,meta.chunk_count);
 assert.equal(receipt.rgb_frames_recovered_shuffled,meta.rgb_frame_count);
 assert.equal(receipt.colour_plane_erasure_recoveries,onePlane);
 assert.equal(receipt.archive_sha256,meta.archive_sha256);
 assert.deepEqual(receipt.exact_projector,projection);
 assert.equal(receipt.gf2_on_real_trace_memory.source_81bit_reconstructions,648);
 assert.equal(receipt.two_whole_bank_erasures,"HELD_INSUFFICIENT_EQUATIONS");
 assert.equal(receipt.two_same_frame_colour_erasures,"HELD_INSUFFICIENT_EQUATIONS");
 assert.equal(receipt.qr_raster_or_camera_decoding,false);
 assert.equal(receipt.physical_optical_storage_measured,false);
 assert.equal(receipt.physical_propagation_or_neural_measurement,false);
 assert.equal(receipt.halt_external_privileges_granted,0);
 const sums=read(root,"SHA256SUMS");
 const seen=new Set();
 for(const line of sums.toString("ascii").trimEnd().split("\n")){
  const m=line.match(/^([0-9a-f]{64})  ([A-Za-z0-9_.-]+)$/);
  assert(m,"bad SHA256SUMS format");
  assert(!seen.has(m[2]));seen.add(m[2]);
  assert.equal(hash(read(root,m[2])),m[1]);
 }
 assert.equal(seen.size,31); // 27 bank files + parity + archive + manifest + result
 console.log(JSON.stringify({status:"PASS",seat:"seat-4",source_archive_bytes:archive.length,
  indexed_base64_chunks:meta.chunk_count,rgb_frames:meta.rgb_frame_count,
  bank_sticks:BANKS,parity_sticks:1,
  exact_whole_bank_recovery:true,exact_corrupted_bank_recovery:true,
  plane_erasure_roundtrips:onePlane,unrecoverable_two_bank_erasure:"HELD",
  independently_verified_projector_samples:projection.exact_projector_lifts,
  camera_or_photon_readout:false,trace_sha256:SHAS["ticks.hbp"][1],
  archive_sha256:hash(archive),all_manifest_sidecars_verified:seen.size}));
}
if(process.argv.length!==4)throw Error("Usage: node script source-dir bank-output-dir");
run(process.argv[2],process.argv[3]);
