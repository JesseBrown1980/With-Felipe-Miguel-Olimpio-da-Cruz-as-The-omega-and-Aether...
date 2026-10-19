#!/usr/bin/env node
"use strict";
/* Independent Seat4 81-column GF(2) matrix implementation; not Python polynomial. */
const fs=require("node:fs"),crypto=require("node:crypto"),path=require("node:path"),assert=require("node:assert/strict");
const N=81,MASK=(1n<<81n)-1n;
const TAPS=[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]];
const PAIRS=[[0,0],[1,10**13],[10**13,1],[10**13,10**13+1],[1234567,9876543]];
const SHORT=[0,1,2,17,81],BITS=[0,40,80];
const SOURCE="2b0ed7e52776cd8a9b48086d83ba31c8486629fb";
const DOMAIN="ASOLARIA-SEAT4-R10-81BIT-MATRIX-STATE-V1";
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
function canon(x){
 if(Array.isArray(x))return "["+x.map(canon).join(",")+"]";
 if(x!==null&&typeof x==="object")return "{"+Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+canon(x[k])).join(",")+"}";
 return JSON.stringify(x);
}
function rot(x,n){const y=BigInt(n%N);return y?((x<<y)|(x>>(81n-y)))&MASK:x;}
function step(x,taps){let s=0n;for(const t of taps)s^=rot(x,t);return s&MASK;}
function apply(cols,x){let y=0n;for(let i=0;i<N;i++)if(x&(1n<<BigInt(i)))y^=cols[i];return y;}
function compose(a,b){return b.map(c=>apply(a,c));}
function ladder(taps){
 const powers=[Array.from({length:N},(_,i)=>step(1n<<BigInt(i),taps))];
 for(let n=1;n<=45;n++)powers.push(compose(powers[n-1],powers[n-1]));
 return powers;
}
function jump(s,n,powers){let e=BigInt(n),idx=0;while(e){if(e&1n)s=apply(powers[idx],s);e>>=1n;idx++;}return s;}
function hx(x){return x.toString(16).padStart(21,"0");}
function seed(law,trial){
 const bits=crypto.createHash("sha256").update("ASOLARIA-SEAT4-R10-FROZEN-SEED|"+law+"|"+trial).digest("hex");
 return BigInt("0x"+bits)&MASK;
}
function signature(law,taps,initial,n,final){
 return sha(DOMAIN+"|law="+law+"|taps="+taps.join(",")+"|n="+n+
 "|source_blob="+SOURCE+"|seed="+hx(initial)+"|state="+hx(final));
}
function record(law,trial,kind,a,b,bit,powers){
 const taps=TAPS[law],s=seed(law,trial);let final,witness,n;
 if(kind==="split"){
  n=a+b;final=jump(s,n,powers);
  witness=jump(jump(s,a,powers),b,powers);
  assert.equal(witness,final,"SPLIT_DIVERGENCE");
 }else if(kind==="short"){
  n=a;final=jump(s,n,powers);
  witness=s;
  for(let i=0;i<n;i++)witness=step(witness,taps);
  assert.equal(witness,final,"DIRECT_SHORT_DIVERGENCE");
 }else if(kind==="bitflip"){
  n=a;final=jump(s,n,powers);
  witness=jump(s^(1n<<BigInt(bit)),n,powers)^final;
  assert.equal(witness,jump(1n<<BigInt(bit),n,powers),"LINEAR_PERTURB_DIVERGENCE");
 }else throw Error("UNKNOWN_KIND");
 const out={schema:"ASOLARIA-SEAT4-R10-81BIT-POLYNOMIAL-REPLAY-V1",
 law_index:law,taps,trial,kind,a,b,seed_81_hex:hx(s),
 final_state_hex:hx(final),witness_hex:hx(witness),
 source_original_git_blob:SOURCE,state_sha256:signature(law,taps,s,n,final),
 simulated_logical_steps:n,real_optical_photon_measurement:false};
 if(bit!==null)out.bit=bit;
 return out;
}
function negativeModels(){
 const f=x=>step(x,TAPS[0])^(((x&1n)&((x>>1n)&1n))<<40n);
 const g=x=>(step(x,TAPS[0])+x)&MASK;
 const a=1n,b=2n;
 const d1=f(a^b)^f(a)^f(b),d2=g(a^b)^g(a)^g(b);
 assert.notEqual(d1,0n);assert.notEqual(d2,0n);
 const s=seed(0,0),aa=ladder(TAPS[0]),bb=ladder(TAPS[1]);
 let slow=s;for(let i=0;i<17;i++)slow=step(slow,TAPS[0]);
 for(let i=0;i<23;i++)slow=step(slow,TAPS[1]);
 const invalid=jump(s,40,aa),proper=jump(jump(s,17,aa),23,bb);
 assert.equal(proper,slow);assert.notEqual(invalid,proper);
 let x=crypto.createHash("sha256").update("ASOLARIA-SEAT4-R10-HASH-CHAIN-SEED").digest();
 const first=x.toString("hex");for(let n=0;n<128;n++)x=crypto.createHash("sha256").update(x).digest();
 const a0=Buffer.alloc(32),b0=Buffer.alloc(32),z=Buffer.alloc(32);
 a0[0]=1;b0[0]=2;z[0]=3;
 const A=crypto.createHash("sha256").update(a0).digest();
 const B=crypto.createHash("sha256").update(b0).digest();
 const C=crypto.createHash("sha256").update(z).digest();
 assert(!C.every((v,i)=>v===(A[i]^B[i])));
 return {
 nonlinear_AND_superposition_delta_hex:hx(d1),nonlinear_carry_superposition_delta_hex:hx(d2),
 switched_law_final_state_hex:hx(slow),invalid_frozen_law_state_hex:hx(invalid),
 correct_composed_switched_state_hex:hx(proper),switched_law_steps:[17,23],
 sha256_chain_steps_executed:128,sha256_chain_first_hex:first,
 sha256_chain_final_hex:x.toString("hex"),sha256_step_is_GF2_linear:false,
 arbitrary_hash_chain_matrix_jump_demonstrated:false};
}
function main(out){
 const receipt=JSON.parse(fs.readFileSync(path.join(out,"r10-results.json"),"ascii"));
 assert.equal(receipt.schema,"ASOLARIA-SEAT4-R10-INDEPENDENT-POLYNOMIAL-REVIEW-V1");
 assert.equal(receipt.source_blob,SOURCE);
 assert.deepEqual(receipt.law_taps,TAPS);
 assert.deepEqual(receipt.nonlinear_law_switch_and_hash_chain,negativeModels());
 let i=0;const observed=fs.readFileSync(path.join(out,"r10-81bit-cases.jsonl"));
 const lines=observed.toString("ascii").trimEnd().split("\n");
 const powers=TAPS.map(ladder);
 for(let law=0;law<5;law++)for(let trial=0;trial<3;trial++){
  const cases=[];
  for(const [a,b]of PAIRS)cases.push(record(law,trial,"split",a,b,null,powers[law]));
  for(const a of SHORT)cases.push(record(law,trial,"short",a,0,null,powers[law]));
  for(const bit of BITS)cases.push(record(law,trial,"bitflip",10**13,0,bit,powers[law]));
  for(const wanted of cases){
   const line=lines[i],actual=JSON.parse(line);
   assert.equal(line,canon(actual),"NONCANONICAL_CASE:"+i);
   assert.deepEqual(actual,wanted,"PYTHON_POLYNOMIAL_DIFFERS_FROM_INDEPENDENT_NODE_MATRIX:"+i);
   i++;
  }
 }
 assert.equal(i,195);assert.equal(receipt.total_independently_computed_cases,i);
 assert.equal(receipt.final_trace_sha256,sha(observed));
 assert.equal(receipt.forged_evidence_mutations_rejected.length,7);
 assert.equal(receipt.physical_time_elapsed_for_logical_horizons,false);
 assert.equal(receipt.physical_optical_retention_claim,false);
 for(const name of ["r10-results.json","r10-81bit-cases.jsonl"]){
  const blob=fs.readFileSync(path.join(out,name));
  assert.equal(fs.readFileSync(path.join(out,name+".sha256"),"ascii"),
    sha(blob)+"  "+name+"\n");
 }
 const data={
 schema:"ASOLARIA-SEAT4-R10-NODE-INDEPENDENT-MATRIX-REVIEW-V1",
 source_original_git_blob:SOURCE,
 verified_81bit_cases:i,
 polynomial_vs_matrix_exact:true,
 independent_nonlin_hashchain_falsifiers:true,
 source_trace_sha256:sha(observed),
 actual_spectral_photons_measured:0};
 const name="r10-independent-node.json",raw=Buffer.from(canon(data)+"\n");
 fs.writeFileSync(path.join(out,name),raw);
 fs.writeFileSync(path.join(out,name+".sha256"),sha(raw)+"  "+name+"\n");
 console.log(JSON.stringify({status:"NODE_81BIT_MATRIX_INDEPENDENT_PASS",cases:i,
  raw_sha256:sha(observed),review_sha256:sha(raw)}));
}
if(process.argv.length!==3)throw Error("usage: node matrix_referee.js OUT");
main(process.argv[2]);
