#!/usr/bin/env node
"use strict";
/* Independent Node implementation of August RGB memory-bank wire format.
 * 2100-byte indexed Colour-QR framing + exact integer projector/nullspace.
 * Digital storage ONLY; no real light photons, optical camera, QR raster.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const MAGIC="LBK1",EPOCH=20261015,CHUNK=2100,CAPACITY=729,HEADER_SIZE=116,PACKET_SIZE=37;
const LENGTHS=[611999,365671];
const DIGESTS=[
  "de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b",
  "435eccff256d119e608926ba3f3ec46a961d9f0d18801c440de2c3552200101d"];
const SCHEMA="ASOLARIA-SEAT3-AUGUST-LIGHTBANK-RGB-PROJECTOR-V1";
const LANE=["R","G","B"];
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const shaBytes=b=>crypto.createHash("sha256").update(b).digest();
function fail(message){throw Error(message)}
function checkSource(a,b){
  if(a.length!==LENGTHS[0]||b.length!==LENGTHS[1])fail("pinned lengths");
  if(sha(a)!==DIGESTS[0]||sha(b)!==DIGESTS[1])fail("frozen historical source digests");
}
function exactTriple(r,g,b){const s=r+g+b;return [3*r-s,3*g-s,s]}
function encodeTriples(indexed){
  const triples=Math.ceil(indexed.length/3);
  const output=Buffer.alloc(triples*6);
  for(let i=0;i<triples;i++){
    const a=i*3;
    const r=a<indexed.length?indexed[a]:0;
    const g=a+1<indexed.length?indexed[a+1]:0;
    const b=a+2<indexed.length?indexed[a+2]:0;
    const [dr,dg,s]=exactTriple(r,g,b);
    output.writeInt16LE(dr,i*6);output.writeInt16LE(dg,i*6+2);
    output.writeUInt16LE(s,i*6+4);
  }
  return output;
}
function decodeTriples(block,originalLen){
  if(block.length!==Math.ceil(originalLen/3)*6)fail("projected triple length");
  const out=Buffer.alloc(Math.ceil(originalLen/3)*3);
  for(let i=0;i<block.length/6;i++){
    const p=i*6,dr=block.readInt16LE(p),dg=block.readInt16LE(p+2),s=block.readUInt16LE(p+4);
    const numerators=[dr+s,dg+s,s-dr-dg];
    if(numerators.some(x=>x%3!==0))fail("noninteger RGB");
    const vals=numerators.map(x=>x/3);
    if(vals.some(x=>x<0||x>255))fail("out-of-range RGB");
    const inverse=exactTriple(...vals);
    if(inverse[0]!==dr||inverse[1]!==dg||inverse[2]!==s)fail("projector inconsistency");
    out[i*3]=vals[0];out[i*3+1]=vals[1];out[i*3+2]=vals[2];
  }
  if(out.subarray(originalLen).some(x=>x!==0))fail("padding changed");
  return Buffer.from(out.subarray(0,originalLen));
}
function packet(index,body){
  const indexed=Buffer.alloc(body.length+4);
  indexed.writeUInt32LE(index,0);body.copy(indexed,4);
  const header=Buffer.alloc(PACKET_SIZE);
  header.writeUInt8(index%3,0);header.writeUInt16LE(Math.floor(index/3),1);
  header.writeUInt16LE(indexed.length,3);shaBytes(indexed).copy(header,5);
  const wire=Buffer.concat([header,encodeTriples(indexed)]);
  return {wire,indexed_sha256:sha(indexed)};
}
function assemble(a,b){
  const combined=Buffer.concat([a,b]);
  const num=Math.ceil(combined.length/CHUNK);
  const header=Buffer.alloc(HEADER_SIZE);
  header.write(MAGIC,0,"ascii");
  header.writeUInt32LE(EPOCH,4);header.writeUInt32LE(a.length,8);
  header.writeUInt32LE(b.length,12);header.writeUInt32LE(num,16);
  shaBytes(a).copy(header,20);shaBytes(b).copy(header,52);shaBytes(combined).copy(header,84);
  // Store in three actual finite RGB lane banks before cold-stick
  // serialization; the index (not a shared mutable channel) defines identity.
  const laneBanks=[new Map(),new Map(),new Map()],rows=[];
  for(let i=0;i<num;i++){
    const body=combined.subarray(i*CHUNK,Math.min((i+1)*CHUNK,combined.length));
    const {wire,indexed_sha256}=packet(i,body);
    const bank=laneBanks[i%3];
    if(bank.has(i)||bank.size>=CAPACITY)fail("duplicate or out-of-quota memory block");
    bank.set(i,wire);
    rows.push("PACKET|index="+String(i).padStart(4,"0")+
      "|frame="+String(Math.floor(i/3)).padStart(3,"0")+
      "|lane="+LANE[i%3]+"|body_bytes="+body.length+
      "|indexed_sha256="+indexed_sha256+"|json=0");
  }
  assert.deepEqual(laneBanks.map(x=>x.size),[156,155,155]);
  const ordered=[header];
  for(let i=0;i<num;i++)ordered.push(laneBanks[i%3].get(i));
  return {stick:Buffer.concat(ordered),rows};
}
function decodeStick(stick,anchored=true){
  if(stick.length<HEADER_SIZE)fail("missing manifest");
  if(stick.toString("ascii",0,4)!==MAGIC||stick.readUInt32LE(4)!==EPOCH)fail("version or epoch");
  const aLen=stick.readUInt32LE(8),bLen=stick.readUInt32LE(12),num=stick.readUInt32LE(16);
  const digestA=stick.subarray(20,52),digestB=stick.subarray(52,84),digestAll=stick.subarray(84,116);
  if(num!==Math.ceil((aLen+bLen)/CHUNK))fail("header packet count");
  let cursor=HEADER_SIZE;
  const restored=[];
  const counts=[0,0,0];
  for(let i=0;i<num;i++){
    if(stick.length-cursor<PACKET_SIZE)fail("truncated packet header");
    const lane=stick.readUInt8(cursor),frame=stick.readUInt16LE(cursor+1),
      indexedLen=stick.readUInt16LE(cursor+3),digest=stick.subarray(cursor+5,cursor+37);
    cursor+=PACKET_SIZE;
    if(lane!==i%3||frame!==Math.floor(i/3))fail("lane/frame permutation");
    const expected=4+Math.min(CHUNK,aLen+bLen-i*CHUNK);
    if(indexedLen!==expected)fail("indexed packet size/order");
    const blockLen=Math.ceil(indexedLen/3)*6;
    if(stick.length-cursor<blockLen)fail("truncated projected packet");
    const indexed=decodeTriples(stick.subarray(cursor,cursor+blockLen),indexedLen);
    cursor+=blockLen;
    if(!shaBytes(indexed).equals(digest))fail("indexed SHA mismatch");
    if(indexed.readUInt32LE(0)!==i)fail("Fischer header index changed");
    restored.push(indexed.subarray(4));
    counts[lane]++;
  }
  if(cursor!==stick.length)fail("unaccounted trailer");
  const joined=Buffer.concat(restored);
  if(joined.length!==aLen+bLen)fail("composite length");
  const a=joined.subarray(0,aLen),b=joined.subarray(aLen);
  if(!shaBytes(a).equals(digestA)||!shaBytes(b).equals(digestB))fail("source manifest hash");
  if(!shaBytes(joined).equals(digestAll))fail("composite manifest hash");
  if(anchored)checkSource(a,b);
  return {a,b,counts};
}
function mustHold(label,operation,out){
  let held=false;
  try{operation()}catch(e){held=true}
  if(!held)fail("negative unexpectedly green: "+label);
  out[label]="HELD";
}
function cacheTest(){
  const memory=new Map(),evicted=[];
  for(let i=0;i<CAPACITY+27;i++){
    if(memory.has(i))continue;
    if(memory.size===CAPACITY){
      const oldest=memory.keys().next().value;
      evicted.push(oldest);memory.delete(oldest);
    }
    memory.set(i,Buffer.from([i&255]));
  }
  assert.equal(memory.size,CAPACITY);
  assert.deepEqual(evicted,Array.from({length:27},(_,i)=>i));
  assert(!memory.has(0)&&!memory.has(26)&&memory.has(27));
  const hits=[27,728,755].filter(x=>memory.has(x)).length;
  assert.equal(hits,3);
  return {capacity:CAPACITY,writes:CAPACITY+27,evictions:27,evicted_recall:"HELD",hits};
}
function negatives(a,b,stick){
  const out={};
  const x=exactTriple(10,20,30),y=exactTriple(11,21,31);
  assert.equal(x[0],y[0]);assert.equal(x[1],y[1]);assert.notEqual(x[2],y[2]);
  out.projection_without_common_mode="AMBIGUOUS_HELD";
  let changed=Buffer.from(stick);
  changed[HEADER_SIZE+PACKET_SIZE+2]^=1;
  mustHold("flipped_encoded_byte",()=>decodeStick(changed),out);
  mustHold("truncated_packet",()=>decodeStick(stick.subarray(0,stick.length-6)),out);
  changed=Buffer.from(stick);changed[HEADER_SIZE]=1;
  mustHold("swapped_first_rgb_lane",()=>decodeStick(changed),out);
  changed=Buffer.from(stick);changed.writeUInt32LE(EPOCH-1,4);
  mustHold("stale_epoch",()=>decodeStick(changed),out);
  mustHold("missing_manifest",()=>decodeStick(stick.subarray(HEADER_SIZE)),out);
  changed=Buffer.from(stick);
  const sOff=HEADER_SIZE+PACKET_SIZE+4;
  changed.writeUInt16LE(changed.readUInt16LE(sOff)+3,sOff);
  mustHold("forged_common_component",()=>decodeStick(changed),out);
  const wrong=packet(1,a.subarray(0,CHUNK)).wire;
  const firstLen=PACKET_SIZE+Math.ceil((CHUNK+4)/3)*6;
  assert.equal(wrong.length,firstLen);
  changed=Buffer.concat([stick.subarray(0,HEADER_SIZE),wrong,stick.subarray(HEADER_SIZE+firstLen)]);
  mustHold("duplicate_or_swapped_fischer_index",()=>decodeStick(changed),out);
  const fake=Buffer.from(a);fake[0]^=1;
  const falseStick=assemble(fake,b).stick;
  decodeStick(falseStick,false);
  mustHold("coherent_fake_source_anchored",()=>decodeStick(falseStick),out);
  out.coherent_fake_source_without_external_anchor="MATH_GREEN_ORIGIN_UNAUTHENTICATED";
  out.cache_eviction_without_archive=cacheTest().evicted_recall;
  assert.equal(Object.values(out).filter(v=>v==="HELD").length,9);
  return out;
}
function stableJSON(v){
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(stableJSON).join(",")+"]";
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stableJSON(v[k])).join(",")+"}";
}
function writeFileWithSidecar(dir,name,buf){
  fs.writeFileSync(path.join(dir,name),buf);
  fs.writeFileSync(path.join(dir,name+".sha256"),sha(buf)+"  "+name+"\n","ascii");
}
function encode(a,b,dir){
  checkSource(a,b);
  const {stick,rows}=assemble(a,b);
  fs.mkdirSync(dir,{recursive:true});
  writeFileWithSidecar(dir,"lightbank.lbk",stick);
  const result=decodeStick(fs.readFileSync(path.join(dir,"lightbank.lbk")));
  assert(result.a.equals(a)&&result.b.equals(b));
  assert.deepEqual(result.counts,[156,155,155]);
  const controls=negatives(a,b,stick),stress=cacheTest();
  const joined=Buffer.concat([a,b]);
  const m={
    schema:SCHEMA,status:"PASS",source_lengths:LENGTHS.slice(),
    source_sha256:DIGESTS.slice(),
    combined_bytes:joined.length,combined_sha256:sha(joined),
    indexed_packets:rows.length,rgb_frames:Math.ceil(rows.length/3),
    rgb_lanes:result.counts.slice(),
    original_rgb_triples:Math.ceil((joined.length+4*rows.length)/3),
    memory_banks:3,capacity_per_bank:CAPACITY,stress,
    negative_controls:controls,
    lightstick_bytes:stick.length,lightstick_sha256:sha(stick),
    physical_photon_memory:false,actual_qr_images:false,
    independent_physical_hosts:false,source_authenticated:false,
    compression_claim:false
  };
  const entries=[
    "PORTAL|schema="+SCHEMA+"|epoch="+EPOCH+"|source_bytes="+joined.length+
       "|capacity_per_lane="+CAPACITY+"|physical_light=0|json=0",
    ...rows
  ];
  for(const k of Object.keys(controls).sort())
    entries.push("NEG|name="+k+"|verdict="+controls[k]+"|json=0");
  entries.push("MEMORY|packets="+rows.length+"|frames="+m.rgb_frames+
    "|lanes="+result.counts.join(",")+"|stick_bytes="+stick.length+
    "|stick_sha256="+sha(stick)+"|json=0");
  entries.push("SOURCES|b1_sha256="+sha(a)+"|b2_sha256="+sha(b)+
    "|combined_sha256="+sha(joined)+"|json=0");
  entries.push("END|cold_read=PASS|projection_only=HELD|external_origin_authenticated=0"+
    "|real_QR_photon_capture=0|zero_human_per_tick=1|json=0");
  const hbp=Buffer.from(entries.join("\n")+"\n","ascii");
  writeFileWithSidecar(dir,"lightbank.hbp",hbp);
  m.receipt_bytes=hbp.length;m.receipt_sha256=sha(hbp);
  writeFileWithSidecar(dir,"lightbank.json",Buffer.from(stableJSON(m)+"\n","ascii"));
  return m;
}
function main(){
  const args=process.argv.slice(2);
  if(args.length===4&&args[0]==="encode"){
    const m=encode(fs.readFileSync(args[1]),fs.readFileSync(args[2]),args[3]);
    console.log(JSON.stringify({status:m.status,lightstick_bytes:m.lightstick_bytes,
      lightstick_sha256:m.lightstick_sha256,receipt_sha256:m.receipt_sha256,
      rgb_frames:m.rgb_frames,packets:m.indexed_packets,
      held_cases:Object.values(m.negative_controls).filter(x=>x==="HELD").length}));
  }else if(args.length===4&&args[0]==="decode"){
    const {a,b,counts}=decodeStick(fs.readFileSync(args[1]));
    fs.writeFileSync(args[2],a);fs.writeFileSync(args[3],b);
    console.log(JSON.stringify({cold_read:"PASS",bytes:[a.length,b.length],
      lanes:counts,sha256:[sha(a),sha(b)]}));
  }else fail("usage: node lightbank_memory.js encode b1.hbp b2.hbp outdir | decode lightbank.lbk out_b1 out_b2");
}
main();
