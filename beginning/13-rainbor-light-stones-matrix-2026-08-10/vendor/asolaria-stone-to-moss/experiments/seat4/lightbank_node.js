#!/usr/bin/env node
"use strict";
/* Independent Node implementation of B3's binary archive, 3-bank G27 code,
 * original Colour QR 2100-byte indexed payload transport and P=I-J/3 test.
 * Ordinary QR PICTURES are not rendered; no photon/hardware evidence claimed.
 */
const fs=require("node:fs");
const crypto=require("node:crypto");
const assert=require("node:assert/strict");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const N=512,HALF=256,QRCHUNK=2100;
const MAGIC=Buffer.from("ASOLARIA-LIGHTBANK-G27-V1\n","ascii");
const QR_MAGIC=Buffer.from("ASOLARIA-COLORQR-PAYLOAD-V1\n","ascii");
const ARCHIVE_MAGIC=Buffer.from("ASOLARIA-LIGHTBANK-ARCHIVE-V1\n","ascii");
const NONCE=crypto.createHash("sha256").update("ASOLARIA|LIGHTBANK|2026-10-15|B3|PUBLIC").digest();
const SOURCE={
 "august-rainbor-design.hbp":"bb870f697af209f228f0d42c0de15ece58b550ed9e9bbb31f855956190ac7306",
 "retention-rank40.tsv":"f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78",
 "seat1-3state-photocycle.hbp":"de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b",
 "seat4-b2-fault-ledger.hbp":"ad471bc627451f65d6f26797ddf6c03546ac1f74ab8e3698d9825f1409f9bbb2",
 "seat4-b2-full-ticks.hbp":"2b9575a8d46c2d2f0842d590081641ed2b20daddccc7153107d76efa0d597277"
};
const COLORS=["A","B","P"];
const HEADERLEN=MAGIC.length+1+8+8+32+32;
const SCRATCH=Buffer.alloc(N);
const enc=Array.from({length:3},()=>new Array(256));
const inv=Array.from({length:3},()=>new Array(27));

function rotate(g,p){
 let [r,b,c]=[Math.floor(g/9),Math.floor(g/3)%3,g%3];
 if(p===1)[r,b,c]=[b,c,r];
 else if(p===2)[r,b,c]=[c,r,b];
 return r*9+b*3+c;
}
for(let phase=0;phase<3;phase++){
 for(let b=0;b<256;b++)enc[phase][b]=[rotate(Math.floor(b/27),phase),rotate(b%27,phase)];
 for(let g=0;g<27;g++)inv[phase][rotate(g,phase)]=g;
}

function validateSourceArchive(buf){
 assert(buf.subarray(0,ARCHIVE_MAGIC.length).equals(ARCHIVE_MAGIC));
 let p=ARCHIVE_MAGIC.length;
 const count=buf.readUInt16BE(p);p+=2;assert.equal(count,5);
 const expected=Object.keys(SOURCE).sort();
 for(const key of expected){
  assert(p+2<=buf.length);
  const nl=buf.readUInt16BE(p);p+=2;
  assert(nl>0&&nl<256&&p+nl+40<=buf.length);
  const name=buf.toString("ascii",p,p+nl);p+=nl;
  assert.equal(name,key);
  const size=Number(buf.readBigUInt64BE(p));p+=8;
  assert(size>=0&&size<=100000000);
  const digest=buf.subarray(p,p+32);p+=32;
  assert(p+size<=buf.length);
  const blob=buf.subarray(p,p+size);p+=size;
  assert.equal(sha(blob),SOURCE[key]);
  assert(crypto.createHash("sha256").update(blob).digest().equals(digest));
 }
 assert.equal(p,buf.length);
 return true;
}
function makeHeader(index,length,stripes,digest) {
 const h=Buffer.alloc(HEADERLEN);
 let p=0;MAGIC.copy(h,p);p+=MAGIC.length;
 h[p++]=index;h.writeBigUInt64BE(BigInt(length),p);p+=8;
 h.writeBigUInt64BE(BigInt(stripes),p);p+=8;
 digest.copy(h,p);p+=32;NONCE.copy(h,p);
 return h;
}
function buildBanks(raw){
 const stripes=Math.ceil(raw.length/N);
 const digest=crypto.createHash("sha256").update(raw).digest();
 const outs=Array.from({length:3},(_,i)=>Buffer.alloc(HEADERLEN+stripes*N));
 for(let i=0;i<3;i++)makeHeader(i,raw.length,stripes,digest).copy(outs[i],0);
 for(let stripe=0;stripe<stripes;stripe++){
  SCRATCH.fill(0);
  raw.copy(SCRATCH,0,stripe*N,Math.min(raw.length,(stripe+1)*N));
  const bankPhase=[stripe%3,(stripe+1)%3,(stripe+2)%3];
  const outpos=HEADERLEN+stripe*N;
  for(let i=0;i<HALF;i++){
   const a=SCRATCH[i],b=SCRATCH[i+HALF],p=a^b;
   const triplet=[a,b,p];
   for(let bank=0;bank<3;bank++){
    const pair=enc[bankPhase[bank]][triplet[bank]];
    outs[bank][outpos+2*i]=pair[0];
    outs[bank][outpos+2*i+1]=pair[1];
   }
  }
 }
 return outs;
}
function getData(bank,idx,raw){
 assert(bank.subarray(0,MAGIC.length).equals(MAGIC));
 const size=Number(bank.readBigUInt64BE(MAGIC.length+1));
 const stripes=Number(bank.readBigUInt64BE(MAGIC.length+9));
 assert.equal(bank[MAGIC.length],idx);
 assert.equal(size,raw.length);
 assert.equal(stripes,Math.ceil(raw.length/N));
 const digest=crypto.createHash("sha256").update(raw).digest();
 assert(bank.subarray(MAGIC.length+17,MAGIC.length+49).equals(digest));
 assert(bank.subarray(MAGIC.length+49,HEADERLEN).equals(NONCE));
 assert.equal(bank.length,HEADERLEN+stripes*N);
 return bank.subarray(HEADERLEN);
}
function decodeShard(input,phase){
 assert.equal(input.length,N);
 const out=Buffer.allocUnsafe(HALF);
 for(let i=0;i<HALF;i++){
  const a=input[2*i],b=input[2*i+1];
  if(a>=27||b>=27)throw Error("invalid G27 trit");
  const value=27*inv[phase][a]+inv[phase][b];
  if(value>=256)throw Error("invalid glyph pair canonical byte");
  out[i]=value;
 }
 return out;
}
function recover(raw,banks,i,j){
 assert(i!==j);
 const a=getData(banks[i],i,raw),b=getData(banks[j],j,raw);
 const recovered=Buffer.alloc(raw.length);
 for(let stripe=0;stripe<Math.ceil(raw.length/N);stripe++){
  const offset=stripe*N;
  const left=decodeShard(a.subarray(offset,offset+N),(stripe+i)%3);
  const right=decodeShard(b.subarray(offset,offset+N),(stripe+j)%3);
  let A,B;
  if(i===0&&j===1){A=left;B=right;}
  else if(i===0&&j===2){A=left;B=Buffer.from(left.map((byte,k)=>byte^right[k]));}
  else if(i===1&&j===2){A=Buffer.from(left.map((byte,k)=>byte^right[k]));B=left;}
  else throw Error("unexpected bank pairing");
  const available=Math.min(N,raw.length-offset);
  A.copy(recovered,offset,0,Math.min(HALF,available));
  if(available>HALF)B.copy(recovered,offset+HALF,0,available-HALF);
 }
 assert.equal(sha(recovered),sha(raw));
 assert(recovered.equals(raw));
 return recovered;
}
function qrTransport(raw){
 const n=Math.ceil(raw.length/QRCHUNK);
 const records=[QR_MAGIC];
 for(let i=0;i<n;i++){
  const chunk=raw.subarray(i*QRCHUNK,Math.min(raw.length,(i+1)*QRCHUNK));
  const withIndex=Buffer.allocUnsafe(4+chunk.length);
  withIndex.writeUInt32LE(i,0);chunk.copy(withIndex,4);
  const b64=Buffer.from(withIndex.toString("base64"),"ascii");
  const hdr=Buffer.allocUnsafe(7);
  hdr.writeUInt32BE(Math.floor(i/3),0);
  hdr[4]=i%3;hdr.writeUInt16BE(b64.length,5);
  records.push(hdr,b64);
 }
 return Buffer.concat(records);
}
function decodeQr(raw,bytes){
 assert(bytes.subarray(0,QR_MAGIC.length).equals(QR_MAGIC));
 let offset=QR_MAGIC.length;
 const n=Math.ceil(raw.length/QRCHUNK);
 const recovered=new Array(n);
 while(offset<bytes.length){
  assert(offset+7<=bytes.length);
  const frame=bytes.readUInt32BE(offset),plane=bytes[offset+4],
    plen=bytes.readUInt16BE(offset+5);offset+=7;
  assert(plen>0&&plen<=4096&&offset+plen<=bytes.length);
  const b64=bytes.toString("ascii",offset,offset+plen);offset+=plen;
  assert(/^[A-Za-z0-9+/]+={0,2}$/.test(b64));
  const packet=Buffer.from(b64,"base64");
  assert.equal(packet.toString("base64"),b64);
  assert(packet.length>=5&&packet.length<=QRCHUNK+4);
  const i=packet.readUInt32LE(0);
  assert(i<n&&frame===Math.floor(i/3)&&plane===i%3);
  assert(recovered[i]===undefined,"duplicate QR Fischer chunk index");
  recovered[i]=packet.subarray(4);
 }
 assert(recovered.every(x=>x!==undefined));
 const result=Buffer.concat(recovered);
 assert.equal(sha(result),sha(raw));
 assert(result.equals(raw));
 return n;
}
function projector(){
 let collisions=0,trips=0,restored=0;
 const xs=[-7,-3,0,1,2,7,19];
 for(const a of xs)for(const b of xs)for(const c of xs) {
  const source=[a,b,c],s=a+b+c,y=source.map(x=>3*x-s);
  assert.equal(y.reduce((a,b)=>a+b,0),0);
  for(const k of [-11,1,13]){
   const shift=source.map(x=>x+k),sum=shift.reduce((a,b)=>a+b,0);
   const result=shift.map(x=>3*x-sum);
   assert.deepEqual(y,result);collisions++;
  }
  assert.deepEqual(y.map(x=>(x+s)/3),source);restored++;trips++;
 }
 return {triples:trips,common_mode_collisions:collisions,
   restored_with_original_sum:restored,exact_rank:2,exact_nullity:1,
   physical_instantaneous_signaling_measured:false};
}
function main(){
 assert.equal(process.argv.length,4,"node lightbank_node.js ARCHIVE OUTPUT_DIRECTORY");
 const raw=fs.readFileSync(process.argv[2]);
 validateSourceArchive(raw);
 assert(raw.length>35000000);
 const expectedReport=JSON.parse(fs.readFileSync(process.argv[3]+"/lightbank-result.json","utf8"));
 const outs=buildBanks(raw);
 const checks={};
 COLORS.forEach((letter,i)=>{
  const stored=fs.readFileSync(process.argv[3]+"/lightbank-"+letter+".g27");
  assert(stored.equals(outs[i]),"Python vs Node bank bytes");
  checks[letter]=sha(stored);
  assert.equal(checks[letter],expectedReport.bank_sha256[letter]);
 });
 let pairs=0;
 for(const [i,j] of [[0,1],[0,2],[1,2]]){recover(raw,outs,i,j);pairs++;}
 const qr=qrTransport(raw);
 const existing=fs.readFileSync(process.argv[3]+"/colourqr-rgb-transport.hbp");
 assert(qr.equals(existing),"full Colour QR indexed transport mismatch");
 const chunks=decodeQr(raw,qr);
 const projection=projector();
 assert.deepEqual(projection,expectedReport.projector);
 assert.equal(pairs,expectedReport.pairwise_full_archive_exact_restore);
 assert.equal(chunks,expectedReport.colour_qr_transport.chunks);
 assert.equal(sha(qr),expectedReport.colour_qr_transport.sha256);
 assert.equal(expectedReport.archive_sha256,sha(raw));
 assert.equal(expectedReport.stripes,Math.ceil(raw.length/N));
 assert.equal(expectedReport.physical_photons_or_optical_memory_hardware_measured,false);
 assert.equal(expectedReport.source_encryption_or_secret_sharing,false);
 assert.equal(expectedReport.negative_controls.single_bank_ambiguity_witnesses,3);
 assert.equal(expectedReport.negative_controls.physical_hardware_claims,0);
 const log={
   status:"PASS",seat:"seat-4",independent_node:true,
   canonical_source_sha256:sha(raw),all_bank_bytes_identical:true,
   bank_sha256:checks,pairwise_full_archive_reconstructions:pairs,
   colour_qr_payload_chunks:chunks,qr_transport_sha256:sha(qr),
   projector:projection,all_five_source_entries_sha_pinned:true,
   physical_optical_memory_measured:false
 };
 console.log(JSON.stringify(log));
}
main();
