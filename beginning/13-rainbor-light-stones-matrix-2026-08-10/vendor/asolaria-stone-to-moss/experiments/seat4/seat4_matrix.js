#!/usr/bin/env node
/* Seat 4 independent cross-check: explicit 81x81 GF(2) transfer matrix.
 * No reuse of the Python polynomial multiplication or Host A/B portal code.
 */
'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const N=81, MASK=(1n<<81n)-1n;
const LAWS=['CA150','CA90','CA60','CA102','SHIFT'];
const domain=Buffer.from('ASOLARIA-PORTAL-CHALLENGE-V1\0','utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function onestep(state,law){
  let out=0n;
  for(let i=0;i<N;i++){
    const bit=j=>Number((state>>BigInt((j+N)%N))&1n);
    let value;
    switch(law){
      case 'CA150':value=bit(i-1)^bit(i)^bit(i+1);break;
      case 'CA90': value=bit(i-1)^bit(i+1);break;
      case 'CA60': value=bit(i-1)^bit(i);break;
      case 'CA102':value=bit(i)^bit(i+1);break;
      case 'SHIFT':value=bit(i-1);break;
      default:throw Error('unexpected law');
    }
    if(value)out|=1n<<BigInt(i);
  }
  return out;
}
function apply(cols,input){
  let value=0n, x=input;
  while(x){let low=x&(-x);let i=low.toString(2).length-1;
    value^=cols[i]; x^=low;}
  return value;
}
function compose(outer,inner){return inner.map(x=>apply(outer,x));}
function matPower(law,t){
  let result=Array.from({length:N},(_,i)=>1n<<BigInt(i));
  let base=result.map(v=>onestep(v,law));
  while(t>0n){if(t&1n)result=compose(base,result);
    base=compose(base,base);t>>=1n;}
  return result;
}
function inputState(seed,wave,seat){
  const seq=wave*81+seat;
  const buf=Buffer.alloc(4);buf.writeUInt32BE(seq);
  const hash=crypto.createHash('sha256').update(domain).update(seed).update(buf).digest();
  let initial=0n;
  for(let i=0;i<11;i++)initial|=BigInt(hash[i])<<(8n*BigInt(i));
  return (initial&MASK)^(1n<<BigInt(seat));
}
function main(){
  const raw=fs.readFileSync(process.argv[2]);
  const challenge=JSON.parse(raw.toString('utf8'));
  if(challenge.waves!==9||challenge.seats!==81||challenge.t!=='10000000000000')throw Error('wrong challenge');
  const seed=Buffer.from(challenge.seed_hex,'hex');if(seed.length!==32)throw Error('bad seed');
  let start=process.hrtime.bigint();
  let jumps=Object.fromEntries(LAWS.map(law=>[law,matPower(law,BigInt(challenge.t))]));
  for(let law of LAWS){
    for(let v of [0n,1n,7n,80n,0xabcdef123456789n]){
      for(let n of [0,1,2,3,9,31]){
        let ref=v;
        for(let j=0;j<n;j++)ref=onestep(ref,law);
        if(ref!==apply(matPower(law,BigInt(n)),v))throw Error('small-step failure');
      }
    }
  }
  let lines=[];
  for(let wave=0;wave<9;wave++){
    const law=LAWS[wave%5];
    for(let seat=0;seat<81;seat++){
      let v=inputState(seed,wave,seat);
      let out=apply(jumps[law],v);
      const hex=x=>x.toString(16).padStart(21,'0');
      lines.push(wave+','+seat+','+law+','+hex(v)+','+hex(out)+'\n');
    }
  }
  const csv=Buffer.from(lines.join(''),'ascii');
  const elapsed=Number(process.hrtime.bigint()-start);
  const result={schema:'ASOLARIA-SEAT4-CYCLIC-GF2-CONTROL-V1',
    algorithm:'nodejs-explicit-81x81-transfer-matrix',
    source_challenge_sha256:sha(raw),cases:lines.length,
    horizon_modeled_steps:challenge.t,sha256_csv:sha(csv),
    law_order:LAWS,elapsed_ns:elapsed,
    evidence:'synthetic deterministic CPU computation; not Host A/B protocol or physical signal'};
  fs.writeFileSync(process.argv[3],csv);
  console.log(JSON.stringify(result));
}
main();
