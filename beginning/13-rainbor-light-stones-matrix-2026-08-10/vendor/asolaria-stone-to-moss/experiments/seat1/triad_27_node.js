#!/usr/bin/env node
"use strict";
/* Independent Node cyclic-polynomial execution for public Seat 1 triad
 * 27-wave × 81-body × 5-law × 3-horizon challenge; NOT physical evidence.
 */
const crypto=require("node:crypto");
const fs=require("node:fs");
const N=81,MASK=(1n<<81n)-1n;
const T=10000000000000n;
const HORIZONS=[T,T+1n,T+81n];
const SCHEMA="ASOLARIA-SEAT1-TRIAD-27WAVE-3HORIZON-V1";
const LAWS=[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]];
const TIMES=["past","now","future"];
const COLORS=["R","G","B"],SPACES=["x","y","z"];
const sha=x=>crypto.createHash("sha256").update(x).digest("hex");
function ck(value,message){if(!value)throw Error(message);}
function parseChallenge(filename){
  const bytes=fs.readFileSync(filename);
  const c=JSON.parse(bytes.toString("utf8"));
  ck(c.schema===SCHEMA,"schema");
  ck(c.waves===27&&c.bodies===81,"dimensions");
  ck(c.base_horizon===Number(T)&&JSON.stringify(c.horizons)===JSON.stringify(HORIZONS.map(Number)),"horizons");
  ck(JSON.stringify(c.laws)===JSON.stringify(LAWS),"taps");
  ck(JSON.stringify(c.time)===JSON.stringify(TIMES),"time");
  ck(JSON.stringify(c.color)===JSON.stringify(COLORS),"color");
  ck(JSON.stringify(c.space)===JSON.stringify(SPACES),"space");
  ck(c.classification==="PUBLIC_SOFTWARE_CHALLENGE_NOT_PHYSICAL_HOST","evidence class");
  ck(typeof c.source_commit==="string"&&c.source_commit.length===40,"source sha");
  ck(/^[0-9a-f]{32}$/.test(c.nonce),"nonce");
  return {c,digest:sha(bytes)};
}
function rotate(v,by){
  const n=BigInt(by);
  if(!by)return v&MASK;
  return ((v<<n)|(v>>(81n-n)))&MASK;
}
function convolution(a,b){
  let out=0n,bit=0;
  while(a>0n){
    if(a&1n)out^=rotate(b,bit);
    a>>=1n;
    bit++;
  }
  return out&MASK;
}
function powered(taps,amount){
  let op=0n;
  for(const t of taps)op^=(1n<<BigInt(t));
  let out=1n;
  while(amount>0n){
    if(amount&1n)out=convolution(out,op);
    op=convolution(op,op);
    amount>>=1n;
  }
  return out;
}
function singleStep(taps,x){
  let result=0n;
  for(const t of taps)result^=rotate(x,t);
  return result;
}
function selfTest(){
  let checks=0;
  for(const taps of LAWS)for(const n of [0,1,2,3,9,21]){
    const op=powered(taps,BigInt(n));
    for(const bit of [0,1,40,80]){
      let direct=1n<<BigInt(bit);
      for(let k=0;k<n;k++)direct=singleStep(taps,direct);
      ck(convolution(op,1n<<BigInt(bit))===direct,"short step "+n);
      checks++;
    }
  }
  return checks;
}
function toHex(v){return v.toString(16).padStart(21,"0")}
function calculate(c,digest){
  const rows=["PORTAL|schema="+SCHEMA+"|challenge_sha256="+digest+"|nonce="+c.nonce+
        "|waves=27|bodies=81|laws=5|horizons=3|json=0"];
  let count=0,linearity=0,successor=0,plus81=0,rotation=0;
  LAWS.forEach((taps,lawId)=>{
    const ops=HORIZONS.map(h=>powered(taps,h));
    const once=powered(taps,1n),eightyone=powered(taps,81n);
    for(let wave=0;wave<27;wave++){
      const time=TIMES[Math.floor(wave/9)];
      const color=COLORS[Math.floor(wave/3)%3];
      const space=SPACES[wave%3];
      for(let body=0;body<81;body++){
        const seed="ASOLARIA|SEAT1|TRIAD|V1|"+c.nonce+"|"+time+"|"+color+"|"+space+"|"+body;
        const state=(BigInt("0x"+sha(seed))&MASK)^(1n<<BigInt(body));
        const flip=1n<<BigInt((body+wave)%81);
        const values=[];
        for(let idx=0;idx<3;idx++){
          const out=convolution(ops[idx],state);
          const delta=convolution(ops[idx],flip);
          const mutated=convolution(ops[idx],state^flip);
          ck((mutated^out)===delta,"linearity");
          linearity++;
          values.push(out);
          const fields=[lawId,wave,time,color,space,body,idx,toHex(out),toHex(delta)].join("|");
          const digest=sha("ROW|"+fields);
          rows.push("WAVE|law="+lawId+"|wave="+wave+"|time="+time+"|color="+color+
                    "|space="+space+"|body="+body+"|horizon="+idx+"|state="+toHex(out)+
                    "|delta="+toHex(delta)+"|sha="+digest+"|json=0");
          count++;
        }
        ck(values[1]===convolution(once,values[0]),"T+1 mismatch");
        successor++;
        ck(values[2]===convolution(eightyone,values[0]),"T+81 mismatch");
        plus81++;
        ck(convolution(ops[0],rotate(state,1))===rotate(values[0],1),"rotation mismatch");
        rotation++;
      }
    }
  });
  ck(count===32805&&linearity===32805,"record count");
  ck(successor===10935&&plus81===10935&&rotation===10935,"metamorphic count");
  rows.push("END|rows=32805|linearity=32805|successor=10935|plus81=10935|rotation=10935|physical_tested=0|json=0");
  return {bytes:Buffer.from(rows.join("\n")+"\n","ascii"),checks:{rows:count,linearity,successor,plus81,rotation}};
}
function main(){
  const argv=process.argv.slice(2).filter(x=>x!=="--self-test");
  ck(argv.length===2,"usage: node triad_27_node.js challenge.json result.hbp --self-test");
  const controls=process.argv.includes("--self-test")?selfTest():0;
  const {c,digest}=parseChallenge(argv[0]);
  const {bytes,checks}=calculate(c,digest);
  fs.writeFileSync(argv[1],bytes);
  console.log(JSON.stringify({status:"PASS",algorithm:"independent_Node_cyclic_polynomial",
      sha256:sha(bytes),challenge_sha256:digest,smallstep:controls,...checks}));
}
main();
