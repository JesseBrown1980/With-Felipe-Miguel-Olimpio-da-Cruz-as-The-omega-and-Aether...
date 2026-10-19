#!/usr/bin/env node
"use strict";
/* Independent Node22 BigInt implementation of preregistered Rainbow27 V2.
   Classical software addressing; NOT optical/quantum evidence. */
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const assert=require("node:assert/strict");

const SOURCE_SEED=Buffer.from("ASOLARIA-R27-V2-SOURCE-20261015","ascii");
const DOMAIN=Buffer.from("ASOLARIA-R27-V2|TICKET|","ascii");
const ORIGINAL_HEAD="5045b5b2ee1960bc469b5588a1b17601490aef6a";
const PEER_HEAD="98e62f1e7218c7fbb20e21fd5c3d734304e4ee6a";
const hash=b=>crypto.createHash("sha256").update(b).digest();
const hex=b=>hash(b).toString("hex");
function fixture(){
  const all=[];
  for(let i=0;i<8;i++){
    const index=Buffer.alloc(4);
    index.writeUInt32LE(i,0);
    all.push(hash(Buffer.concat([SOURCE_SEED,index])));
  }
  return Buffer.concat(all);
}
function gcd(a,b){while(b){[a,b]=[b,a%b];}return a;}
function rgb(id){assert(id>=0&&id<27);return [Math.floor(id/9),Math.floor(id/3)%3,id%3];}
function addr(x){return x[0]*9+x[1]*3+x[2];}
function weight(x){
  const [r,g,b]=x,s=r+g+b,q=r*r+g*g+b*b-r*g-g*b-b*r;
  assert.equal(s*s+2*q,3*(r*r+g*g+b*b));
  assert(q>=0);
  return [s*s,q,q];
}
function prim(w){const f=gcd(gcd(w[0],w[1]),w[2]);return f?w.map(x=>x/f):[0,0,0];}
function proj(x){const s=x.reduce((a,b)=>a+b,0);return {s,d:x.map(v=>3*v-s)};}
function restore({s,d}){assert.equal(d.reduce((a,b)=>a+b,0),0);return d.map(v=>{assert.equal((v+s)%3,0);return (v+s)/3;});}
function sample(w,loc,parts){
  const den=parts.reduce((a,b)=>a+b,0);
  if(den===0)return "H";
  const denominator=BigInt(den),limit=1n<<256n,ceiling=(limit/denominator)*denominator;
  for(let retry=0;retry<10000;retry++){
    const index=Buffer.alloc(8);
    index.writeUInt16LE(w,0);
    index.writeUInt16LE(loc,2);
    index.writeUInt32LE(retry,4);
    const ticket=hash(Buffer.concat([DOMAIN,index]));
    const n=BigInt("0x"+ticket.toString("hex"));
    if(n<ceiling){
      const y=n%denominator;
      return String(y<BigInt(parts[0])?0:(y<BigInt(parts[0]+parts[1])?1:2));
    }
  }
  throw Error("REJECTION_LIMIT");
}
function gate(packet,bytes,expected,id,sequence){
  return hex(bytes)===expected && packet.source_sha256===expected
      && packet.payload_sha256===hex(bytes)
      && packet.ordered_id===id && packet.sequence===sequence;
}
function negative(){
  const source=fixture(),p=hex(source);
  const pkt={source_sha256:p,payload_sha256:p,ordered_id:13,sequence:7};
  assert(gate(pkt,source,p,13,7));
  const corrupted=Buffer.from(source);corrupted[0]^=1;
  assert(!gate(pkt,corrupted,p,13,7));
  assert(!gate({...pkt,payload_sha256:"0".repeat(64)},source,p,13,7));
  assert(!gate({...pkt,ordered_id:12},source,p,13,7));
  assert(!gate({...pkt,sequence:6},source,p,13,7));
  assert(!gate({...pkt,source_sha256:"f".repeat(64)},source,p,13,7));
  const compromised=hex(corrupted),rep={...pkt,source_sha256:compromised,payload_sha256:compromised};
  assert(gate(rep,corrupted,compromised,13,7));
  assert(!gate(rep,corrupted,p,13,7));
  assert.equal(sample(0,0,[0,0,0]),"H");
  assert.deepEqual(weight([1,0,0]),weight([0,1,0]));
  assert.notEqual(addr([1,0,0]),addr([0,1,0]));
  for(let w=0;w<27;w++)for(let a=0;a<81;a++){
    assert.equal(sample(w,a,prim(weight([1,0,0]))),sample(w,a,prim(weight([2,0,0]))));
    assert.equal(sample(w,a,prim(weight([1,1,0]))),sample(w,a,prim(weight([2,2,0]))));
  }
}
function classes(){
  const raw=new Map(),norm=new Map();
  for(let id=0;id<27;id++){
    const x=rgb(id);
    assert.equal(addr(x),id);
    assert.deepEqual(restore(proj(x)),x);
    const w=weight(x),p=prim(w);
    for(const [map,key] of [[raw,w.join(",")],[norm,p.join(",")]]){
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(id);
    }
  }
  const orbit=map=>Array.from(map.values(),x=>x.length).sort((a,b)=>a-b);
  assert.deepEqual(orbit(raw),[1,1,1,3,3,3,3,3,3,6]);
  assert.deepEqual(orbit(norm),[1,2,3,3,6,6,6]);
  return [raw,norm];
}
function run(out){
  negative();classes();
  const sourceDigest=hex(fixture());
  const lines=[`R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|source_sha256=${sourceDigest}|producer_sha=${ORIGINAL_HEAD}|peer_sha=${PEER_HEAD}|json=0\n`];
  let total=0,held=0;
  const laneCounts=[0,0,0];
  for(let w=0;w<27;w++)for(let loc=0;loc<81;loc++)for(let id=0;id<27;id++){
    const [r,g,b]=rgb(id),W=weight([r,g,b]),P=prim(W),den=P.reduce((a,b)=>a+b,0);
    const lane=sample(w,loc,P);
    if(lane==="H")held++;else laneCounts[Number(lane)]++;
    lines.push(`CASE|w=${String(w).padStart(2,"0")}|loc=${String(loc).padStart(2,"0")}|id=${String(id).padStart(2,"0")}|rgb=${r}${g}${b}|raw=${W.join(",")}|prim=${P.join(",")}|den=${den}|lane=${lane}\n`);
    total++;
  }
  assert.equal(total,59049);
  assert.equal(held,2187);
  const evidence=Buffer.from(lines.join(""),"ascii");
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,evidence);
  const result={cases:total,dark:held,counts:laneCounts,trace_sha256:hex(evidence),bytes:evidence.length,
                independent_source_sha256:sourceDigest,software_only:true};
  fs.writeFileSync(out+".node.json",JSON.stringify(result)+"\n","utf8");
  console.log(JSON.stringify({status:"PASS_LOCAL_NODE",...result}));
}
if(process.argv.length!==3)throw Error("usage: node rainbow27_v2.js NODE_OUTPUT.hbp");
run(process.argv[2]);
