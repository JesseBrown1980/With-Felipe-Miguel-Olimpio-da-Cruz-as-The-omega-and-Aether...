#!/usr/bin/env node
"use strict";
/* Separately authored Node22 digital lightbank / RGB QR framing / rank-2 projector.
 * NO rendered QR symbols, physical light sensing or cryptographic origin claim.
 */
const fs=require("node:fs"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const CAPACITY=729,CHUNK=2100,N=65536,PLANES="RGB";
const SCHEMA="ASOLARIA-SEAT3-AUGUST-LIGHTBANK-PROJECTOR-RGB-V1";
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");

function makeSource(){
  const result=Buffer.alloc(N);
  for(let i=0;i<N;i++){
    const term=(73*i)^(i>>>3)^Math.floor((i*i)/512)^165;
    result[i]=term&255;
  }
  return result;
}
function project(bytes){
  const padded=Buffer.alloc(Math.ceil(bytes.length/3)*3);
  bytes.copy(padded);
  const out=Buffer.alloc((padded.length/3)*6);
  for(let i=0;i<padded.length;i+=3){
    const r=padded[i],g=padded[i+1],b=padded[i+2];
    const sum=r+g+b;
    const dR=3*r-sum,dG=3*g-sum;
    const p=(i/3)*6;
    out.writeUInt16LE(sum,p);
    out.writeInt16LE(dR,p+2);
    out.writeInt16LE(dG,p+4);
  }
  return out;
}
function unproject(encoded,originalSize){
  if(encoded.length%6!==0)throw Error("incomplete common-mode and differences");
  const decoded=Buffer.alloc((encoded.length/6)*3);
  for(let i=0;i<encoded.length;i+=6){
    const sum=encoded.readUInt16LE(i),dr=encoded.readInt16LE(i+2),
      dg=encoded.readInt16LE(i+4);
    const nums=[sum+dr,sum+dg,sum-dr-dg];
    for(const n of nums){
      if(n%3!==0||n/3<0||n/3>255)throw Error("projector inverse failed");
    }
    const offset=(i/6)*3;
    for(let j=0;j<3;j++)decoded[offset+j]=nums[j]/3;
  }
  if(decoded.length!==originalSize+((3-originalSize%3)%3))throw Error("padded length");
  for(let k=originalSize;k<decoded.length;k++)if(decoded[k]!==0)throw Error("nonzero pad");
  return decoded.subarray(0,originalSize);
}
function diffs(x){
  const sum=x[0]+x[1]+x[2],a=3*x[0]-sum,b=3*x[1]-sum;
  return [a,b,-a-b];
}
function projectorProofs(){
  const A=[[2,-1,-1],[-1,2,-1],[-1,-1,2]];
  for(let row=0;row<3;row++){
    for(let col=0;col<3;col++){
      let s=0;for(let k=0;k<3;k++)s+=A[row][k]*A[k][col];
      assert.equal(s,3*A[row][col]);
    }
    assert.equal(A[row].reduce((x,y)=>x+y,0),0);
  }
  assert.equal(A[0][0]+A[1][1]+A[2][2],6);
  assert.equal(A[0][0]*A[1][1]-A[0][1]*A[1][0],3);
  let count=0;
  for(let r=0;r<9;r++)for(let g=0;g<9;g++)for(let b=0;b<9;b++){
    const src=Buffer.from([r,g,b]);
    assert(unproject(project(src),3).equals(src));
    count++;
  }
  assert.deepEqual(diffs([10,20,30]),diffs([15,25,35]));
  assert.notEqual(10+20+30,15+25+35);
  assert.throws(()=>unproject(Buffer.alloc(4),3));
  return count;
}
function packetize(data){
  const list=[];
  for(let i=0;i<Math.ceil(data.length/CHUNK);i++){
    const body=data.subarray(i*CHUNK,Math.min((i+1)*CHUNK,data.length));
    const wire=Buffer.alloc(4+body.length);
    wire.writeUInt32LE(i,0);
    body.copy(wire,4);
    list.push({index:i,plane:PLANES[i%3],b64:wire.toString("base64"),
      body_len:body.length,body_sha:sha(body),raw_sha:sha(wire)});
  }
  return list;
}
function toFrames(items){
  const frames=Array.from({length:Math.ceil(items.length/3)},
    ()=>[null,null,null]);
  for(const item of items){
    assert.equal(frames[Math.floor(item.index/3)][item.index%3],null);
    frames[Math.floor(item.index/3)][item.index%3]=item;
  }
  return frames;
}
function unpack(item,expectedCount,hashes,totalBytes){
  const [plane,text]=item;
  if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)){
    throw Error("bad base64 characters");
  }
  const raw=Buffer.from(text,"base64");
  if(raw.toString("base64")!==text)throw Error("noncanonical base64");
  if(raw.length<4)throw Error("missing Fischer LE header");
  const i=raw.readUInt32LE(0);
  if(i>=expectedCount)throw Error("index outside manifest");
  if(PLANES[i%3]!==plane)throw Error("misrouted RGB plane");
  const body=raw.subarray(4);
  if(body.length!==Math.min(CHUNK,totalBytes-i*CHUNK))throw Error("wrong body size");
  if(sha(body)!==hashes[i])throw Error("pinned per-index hash mismatch");
  return [i,body];
}
function restore(wires,count,hashes,root,totalBytes){
  const map=new Map();
  for(const item of wires){
    const [index,body]=unpack(item,count,hashes,totalBytes);
    if(map.has(index))throw Error("duplicate Fischer index");
    map.set(index,body);
  }
  if(map.size!==count)throw Error("missing chunk");
  const buffers=[];
  for(let i=0;i<count;i++){
    if(!map.has(i))throw Error("missing original chunk");
    buffers.push(map.get(i));
  }
  const decoded=Buffer.concat(buffers);
  if(decoded.length!==totalBytes||sha(decoded)!==root)throw Error("root digest/size mismatch");
  return decoded;
}
class Bank{
  constructor(){
    this.slots=Array.from({length:CAPACITY},(_,i)=>({
      slot_id:"BLOCK:"+String(i).padStart(3,"0"),generation:0,key:null,wire:null
    }));
    this.originalIds=this.slots.map(s=>s.slot_id).join("|");
    this.where=new Map();this.next=0;this.evictions=0;this.hits=0;
  }
  put(key,wire){
    if(this.where.has(key))throw Error("duplicate bank write");
    const slot=this.slots[this.next];
    if(slot.key!==null){this.where.delete(slot.key);this.evictions++}
    slot.generation++;slot.key=key;slot.wire=wire;
    this.where.set(key,this.next);
    this.next=(this.next+1)%CAPACITY;
  }
  get(key){
    const slotIndex=this.where.get(key);
    if(slotIndex===undefined||this.slots[slotIndex].key!==key){
      throw Error("stale/evicted memory index");
    }
    this.hits++;
    return this.slots[slotIndex].wire;
  }
  count(){return this.where.size}
  stable(){return this.slots.map(s=>s.slot_id).join("|")===this.originalIds}
}
function held(name,fn){
  assert.throws(fn,"negative unexpectedly passed: "+name);
  return {name,verdict:"HELD"};
}
function audit(){
  const source=makeSource(),encoded=project(source);
  const rawPackets=packetize(source),projectedPackets=packetize(encoded);
  assert.equal(rawPackets.length,32);assert.equal(projectedPackets.length,63);
  assert.equal(toFrames(rawPackets).length,11);
  assert.equal(toFrames(projectedPackets).length,21);
  assert.equal(toFrames(rawPackets).at(-1).at(-1),null);
  assert(toFrames(projectedPackets).every(f=>f.every(x=>x!==null)));
  assert.equal(encoded.length,131076);
  assert.equal(encoded.length/6,21846);
  assert(unproject(encoded,N).equals(source));
  const tested=projectorProofs();
  const rows=[
    "PORTAL|schema="+SCHEMA+"|source_kind=deterministic_synthetic_bytes|physical_optics=0|json=0",
    "SOURCE|bytes="+source.length+"|sha256="+sha(source)+"|json=0",
    "PROJECTOR|original_bytes="+source.length+"|pad=2|transformed_bytes="+encoded.length+
      "|triples=21846|sha256="+sha(encoded)+"|extra_multiplier_vs_padded=2|json=0",
    "LAW|p2_equals_p=1|kernel_common=1|rank=2|trace=2|exact_triplet_tests="+tested+"|json=0"
  ];
  const banks={},stats={};
  for(const [mode,list,payload] of [["raw",rawPackets,source],["projected",projectedPackets,encoded]]){
    const bank=new Bank();
    for(const item of list){
      bank.put(item.index,[item.plane,item.b64]);
      rows.push("PACKET|mode="+mode+"|index="+String(item.index).padStart(4,"0")+
        "|plane="+item.plane+"|body_bytes="+item.body_len+
        "|body_sha256="+item.body_sha+"|packet_sha256="+item.raw_sha+
        "|base64_chars="+item.b64.length+"|json=0");
    }
    assert.equal(bank.count(),list.length);
    assert.equal(bank.evictions,0);
    const bodyHashes=list.map(x=>x.body_sha),reverse=[];
    for(let i=list.length-1;i>=0;i--)reverse.push(bank.get(i));
    const recovered=restore(reverse,list.length,bodyHashes,sha(payload),payload.length);
    assert(recovered.equals(payload));
    if(mode==="projected")assert(unproject(recovered,N).equals(source));
    rows.push("RECALL|mode="+mode+"|chunks="+list.length+
      "|frames="+toFrames(list).length+"|hits="+bank.hits+
      "|evictions="+bank.evictions+"|reconstructed_sha256="+sha(recovered)+
      "|exact=1|json=0");
    banks[mode]=bank;
    stats[mode]={chunks:list.length,frames:toFrames(list).length,
      hits:bank.hits,evictions_initial:bank.evictions,
      bytes:payload.length,sha256:sha(payload)};
  }
  const rawHashes=rawPackets.map(x=>x.body_sha);
  const normal=rawPackets.map(x=>[x.plane,x.b64]);
  const mutation=Buffer.from(rawPackets[0].b64,"base64");
  mutation[4]^=1;
  const negatives=[
    held("flipped_body_byte",()=>restore([[normal[0][0],mutation.toString("base64")],...normal.slice(1)],
      rawPackets.length,rawHashes,sha(source),source.length))
  ];
  const badPlane=normal.map(x=>x.slice());
  badPlane[0][0]="G";
  negatives.push(held("swapped_R_to_G_plane",()=>restore(
    badPlane,rawPackets.length,rawHashes,sha(source),source.length)));
  negatives.push(held("duplicate_index",()=>restore(
    [...normal,normal[0]],rawPackets.length,rawHashes,sha(source),source.length)));
  negatives.push(held("missing_chunk_fake_filler",()=>restore(
    normal.slice(0,-1),rawPackets.length,rawHashes,sha(source),source.length)));
  const forged=Buffer.from(rawPackets[1].b64,"base64");
  forged.writeUInt32LE(65535,0);
  const badIndex=normal.map(x=>x.slice());
  badIndex[1]=[rawPackets[1].plane,forged.toString("base64")];
  negatives.push(held("forged_LE32_index",()=>restore(
    badIndex,rawPackets.length,rawHashes,sha(source),source.length)));
  const commonChanged=Buffer.from(encoded);
  const s=commonChanged.readUInt16LE(0);
  assert(s<=762);
  commonChanged.writeUInt16LE(s+3,0);
  const badProj=packetize(commonChanged);
  negatives.push(held("corrupt_common_sum_root_anchored",()=>restore(
    badProj.map(x=>[x.plane,x.b64]),badProj.length,badProj.map(x=>x.body_sha),
    sha(encoded),encoded.length)));
  assert.deepEqual(diffs([10,20,30]),diffs([15,25,35]));
  rows.push("KERNEL|a=10,20,30|b=15,25,35|same_differences=1"+
            "|sum_a=60|sum_b=75|lossless_without_common=0|json=0");
  const bank=banks.projected,prevIds=bank.originalIds;
  for(let i=0;i<CAPACITY;i++)bank.put(1000+i,["R","QkFOSy1GSUxMRVI="]);
  assert.equal(bank.count(),CAPACITY);
  assert.equal(bank.evictions,63);
  assert.equal(bank.originalIds,prevIds);
  assert(bank.stable());
  for(let i=0;i<63;i++)assert(!bank.where.has(i));
  negatives.push(held("evicted_stale_memory",()=>bank.get(0)));
  rows.push("BANK|capacity="+CAPACITY+"|occupancy="+bank.count()+
    "|evictions="+bank.evictions+"|initial_hits="+stats.projected.hits+
    "|slot_ids_stable=1|stale_original_chunks=63|json=0");
  const optical=Array.from({length:27},(_,i)=>["T","A","R"][i%3]);
  const census={T:0,A:0,R:0};
  for(const entry of optical)census[entry]++;
  const trit=optical.map(x=>({T:1,A:0,R:-1})[x]).reduce((a,b)=>a+b,0);
  assert.deepEqual([census.T,census.A,census.R],[9,9,9]);assert.equal(trit,0);
  rows.push("LIGHT|synthetic_events=27|T=9|A=9|R=9|trit_sum=0"+
            "|per_event_one_outcome=1|physical_photons_measured=0|json=0");
  assert.equal(negatives.length,7);
  for(const v of negatives)rows.push("NEG|name="+v.name+"|verdict="+v.verdict+"|json=0");
  rows.push("TRUST|coherent_packet_and_local_hash_forgery_can_be_self_consistent=1"+
    "|external_source_authenticated=0|actual_QR_pixels_rendered=0"+
    "|real_camera_or_optical_storage_used=0|json=0");
  rows.push("END|raw_chunks=32|raw_frames=11|projected_chunks=63|projected_frames=21"+
    "|lossless_both_modes=1|negative_held=7|bounded_slot_ids=729"+
    "|historical_stones_unchanged=1|json=0");
  const full=Buffer.from(rows.join("\n")+"\n","ascii");
  const report={
    schema:SCHEMA,status:"PASS",source_bytes:source.length,source_sha256:sha(source),
    projected_bytes:encoded.length,projected_sha256:sha(encoded),
    projected_triples:21846,padding_bytes:2,
    matrix_rank:2,matrix_trace:2,matrix_projector_identity:true,
    test_triples:tested,raw_mode:stats.raw,projected_mode:stats.projected,
    initial_total_stored_packets:95,
    bank_capacity:729,post_fill_occupancy:729,post_fill_evictions:63,
    immutable_slot_identities:true,
    optical_events:27,optical_census:census,trit_sum:trit,
    executed_negative_controls:negatives,negative_held_count:7,
    common_mode_required_for_lossless:true,
    full_trace_bytes:full.length,full_trace_sha256:sha(full),
    origin_authenticated:false,qr_pixels_generated:false,camera_used:false,
    optical_device_used:false,physical_hosts_attested:false
  };
  return {full,report};
}
if(process.argv.length!==4){
  console.error("usage: node seat3_lightbank.js trace.hbp metrics.json");process.exit(2);
}
const {full,report}=audit();
fs.writeFileSync(process.argv[2],full);
fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({
  status:"PASS",source_sha256:report.source_sha256,
  encoded_sha256:report.projected_sha256,
  trace_bytes:full.length,trace_sha256:report.full_trace_sha256,
  raw_chunks:report.raw_mode.chunks,projected_chunks:report.projected_mode.chunks,
  evictions:report.post_fill_evictions,held:report.negative_held_count
}));
