#!/usr/bin/env node
"use strict";
/* Independently written GF(2) cyclic-polynomial exact 10^13-step solver.
   This does NOT share the Python matrix implementation.
   Software test only; no physical quantum or gravity observation.
*/
const fs=require("node:fs"),crypto=require("node:crypto");
const N=81, MASK=(1n<<81n)-1n, STEPS=10000000000000n;
const TAG="ASOLARIA-81-3PHYSICAL-GF2-V1";
const LAWS=[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]];
const SEATS=["seat-1","seat-2","seat-3"];
const sha=s=>crypto.createHash("sha256").update(s,"ascii").digest("hex");
function chk(b,reason){if(!b)throw Error(reason);}
function challenge(p){
  const c=JSON.parse(fs.readFileSync(p,"utf8"));
  chk(c.schema===TAG,"wrong schema");
  chk(c.steps===Number(STEPS)&&c.waves===12&&c.bodies===81,"wrong horizon");
  chk(JSON.stringify(c.laws)===JSON.stringify(LAWS),"law drift");
  chk(JSON.stringify(Object.keys(c.seat_commitments).sort())===JSON.stringify(SEATS),"needs 3 seats");
  chk(/^[0-9a-f]{32}$/.test(c.nonce),"bad challenge");
  for(const s of SEATS)chk(/^[0-9a-f]{64}$/.test(c.seat_commitments[s]),"bad commitment");
  return c;
}
function rotate(v,k){
  if(k===0)return v&MASK;
  return ((v<<BigInt(k)) | (v>>BigInt(N-k)))&MASK;
}
function convolution(a,b){
  let out=0n,bit=0;
  while(a>0n){
    if(a&1n)out ^= rotate(b,bit);
    a >>= 1n; bit++;
  }
  return out&MASK;
}
function powered(taps,horizon){
  let operator=0n;
  for(const t of taps)operator^=1n<<BigInt(t);
  let out=1n;
  while(horizon>0n){
    if(horizon&1n)out=convolution(out,operator);
    operator=convolution(operator,operator);
    horizon >>= 1n;
  }
  return out;
}
function direct(taps,state){
  let out=0n;
  for(const t of taps)out ^= rotate(state,t);
  return out;
}
function selfTest(){
  for(const taps of LAWS)for(const n of [0,1,2,3,9,21]){
    const poly=powered(taps,BigInt(n));
    for(const body of [0,1,40,80]){
      let slow=1n<<BigInt(body);
      for(let i=0;i<n;i++)slow=direct(taps,slow);
      chk(convolution(poly,1n<<BigInt(body))===slow,"small-step mismatch");
    }
  }
}
function build(c){
  const master=sha(TAG+"|"+c.nonce+"|"+SEATS.map(s=>c.seat_commitments[s]).join("|"));
  const lines=["PORTAL|schema="+TAG+"|nonce="+c.nonce+"|master="+master+
      "|steps="+STEPS+"|laws=5|waves=12|bodies=81|json=0"];
  for(let index=0;index<LAWS.length;index++){
    const op=powered(LAWS[index],STEPS);
    for(let wave=0;wave<12;wave++){
      for(let body=0;body<N;body++){
        const digest=sha(master+"|"+index+"|"+wave+"|"+body);
        const state=(BigInt("0x"+digest)&MASK)^(1n<<BigInt(body));
        const out=convolution(op,state);
        const hex=out.toString(16).padStart(21,"0");
        const check=sha("ASOLARIA|STATE|"+index+"|"+wave+"|"+body+"|"+hex);
        lines.push("WAVE|law="+index+"|wave="+wave+"|body="+body+
          "|state="+hex+"|sha="+check+"|json=0");
      }
    }
  }
  chk(lines.length===4861,"row count mismatch");
  lines.push("END|records=4860|class=EXACT_GF2_DIGITAL_CALCULATION|json=0");
  return Buffer.from(lines.join("\n")+"\n","ascii");
}
function main(){
  const argv=process.argv.slice(2).filter(s=>s!=="--self-test");
  chk(argv.length===2,"usage: node evolve_gf2_node.js challenge.json result.hbp [--self-test]");
  if(process.argv.includes("--self-test"))selfTest();
  const data=build(challenge(argv[0]));
  fs.writeFileSync(argv[1],data);
  console.log(JSON.stringify({status:"PASS",records:4860,
    sha256:crypto.createHash("sha256").update(data).digest("hex"),
    algorithm:"GF2-cyclic-polynomial",steps:Number(STEPS)}));
}
main();
