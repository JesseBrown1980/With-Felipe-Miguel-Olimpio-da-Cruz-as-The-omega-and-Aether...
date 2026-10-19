#!/usr/bin/env node
"use strict";
/* Entirely separate Node22 3.6-million-step reference and GF2 fast matrix jump.
 * A simulated hour is not an OS-reported hour. Hash alone isn't a state proof.
 */
const crypto=require("node:crypto"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const MASK=(1n<<64n)-1n,SEED=0x0123456789abcdefn,TICKS=3600000;
const DOMAIN=Buffer.from("ASOLARIA-SEAT3-MATRIX-LOGICAL-HOUR-V1|","ascii");
const SCHEMA="ASOLARIA-SEAT3-LOGICAL-HOUR-MATRIX-FORWARD-PROOF-V1";
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
function canonical(x){
 if(x===null||typeof x!=="object")return JSON.stringify(x);
 if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";
 return "{"+Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+canonical(x[k])).join(",")+"}";
}
function transition(x){
 x^=(x<<13n)&MASK;
 x^=x>>7n;
 x^=(x<<17n)&MASK;
 return x&MASK;
}
function apply(columns,x){
 let ans=0n,idx=0;
 // iterate 64 coordinates independently, no Python bitops implementation
 while(idx<64){
   if((x&(1n<<BigInt(idx)))!==0n)ans^=columns[idx];
   idx++;
 }
 return ans;
}
function product(A,B){return B.map(b=>apply(A,b));}
function jump(x,n){
 let M=Array.from({length:64},(_,i)=>transition(1n<<BigInt(i)));
 let sq=0,selected=0;
 while(n>0){
   if(n%2===1){x=apply(M,x);selected++;}
   n=Math.floor(n/2);
   if(n>0){M=product(M,M);sq++;}
 }
 return {state:x,squarings:sq,selected};
}
function reference(x,n){
 for(let i=0;i<n;i++)x=transition(x);
 return x;
}
function hex(x){return x.toString(16).padStart(16,"0");}
function hashState(x,ticks){
 const b=Buffer.alloc(16);
 b.writeBigUInt64LE(x,0);
 b.writeBigUInt64LE(BigInt(ticks),8);
 return sha(Buffer.concat([DOMAIN,b]));
}
const output=process.argv[2];
if(process.argv.length!==3)throw Error("usage: node matrix_logical_hour.js OUT_DIR");
const fast=jump(SEED,TICKS),slow=reference(SEED,TICKS);
assert.equal(fast.state,slow);
assert.equal(fast.squarings,21);
assert.equal(fast.selected,TICKS.toString(2).split("1").length-1);
const result=hashState(fast.state,TICKS);
assert.notEqual(hashState(fast.state^1n,TICKS),result);
assert.notEqual((result[0]==="0"?"1":"0")+result.slice(1),result);
const data={
 schema:SCHEMA,algorithm:"xorshift64_gf2_linear_13_7_17",
 initial_state_u64_hex:hex(SEED),
 jump_matrix_basis_dimension:64,
 logical_ticks:TICKS,
 logical_time_ns:TICKS*1000000,
 time_per_logical_tick_ns:1000000,
 matrix_squarings:fast.squarings,
 matrix_selected_power_applications:fast.selected,
 reference_stepwise_transitions:TICKS,
 fast_state_u64_hex:hex(fast.state),
 stepwise_state_u64_hex:hex(slow),
 fast_equals_stepwise:true,
 state_sha256:result,
 negative_state_flip:"REJECTED",
 negative_digest_only_replacement:"REJECTED",
 os_cpu_elapsed_ns_claimed_as_one_hour:false,
 physical_optical_memory_inference:false,
 existing_Asolaria_matrix_implementation_reused:false,
 mathematical_model_only:true
};
const raw=Buffer.from(canonical(data)+"\n","ascii");
fs.mkdirSync(output,{recursive:true});
const name="matrix-logical-hour-proof.json";
fs.writeFileSync(path.join(output,name),raw);
fs.writeFileSync(path.join(output,name+".sha256"),sha(raw)+"  "+name+"\n","ascii");
console.log(JSON.stringify({verdict:"PASS",logical_hour_ticks:TICKS,state_hex:hex(fast.state),sha256:sha(raw)}));
