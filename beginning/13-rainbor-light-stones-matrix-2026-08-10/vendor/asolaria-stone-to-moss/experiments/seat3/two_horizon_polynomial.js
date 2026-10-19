#!/usr/bin/env node
'use strict';
// Seat 3 independent cyclic GF(2) algorithm. Synthetic, NOT physical-host experiment.
const crypto=require('node:crypto'),fs=require('node:fs');
const N=81n,MASK=(1n<<N)-1n, LAWS=[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]],HORIZONS=[10000000000000n,10000000000001n];
const h=x=>crypto.createHash('sha256').update(x,'ascii').digest('hex');
const SEED=h('ASOLARIA-SEAT3-TWO-HORIZON-LOCAL-CONTROL-20261014-V1');
function rot(v,k){return k===0?v&MASK:((v<<BigInt(k)) | (v>>(N-BigInt(k)))) &MASK}
function mul(a,b){let out=0n,idx=0;while(a){if(a&1n)out^=rot(b,idx);idx++;a>>=1n;}return out&MASK}
function power(taps,n){let base=taps.reduce((a,t)=>a^(1n<<BigInt(t)),0n),out=1n;while(n){if(n&1n)out=mul(out,base);base=mul(base,base);n>>=1n;}return out;}
function direct(taps,v){return taps.reduce((s,t)=>s^rot(v,t),0n)}
function state(li,w,b){return (BigInt('0x'+h(SEED+'|'+li+'|'+w+'|'+b))&MASK)^(1n<<BigInt(b))}
function pc(v){let count=0;while(v){count++;v&=v-1n;}return count}
let counts={},records=[],tests=0,morph=0;
for(let li=0;li<LAWS.length;li++){
  const taps=LAWS[li];const p0=power(taps,HORIZONS[0]),p1=power(taps,HORIZONS[1]);
  for(const n of [0,1,2,3,9,21])for(const b of [0,1,40,80]){
    let v=1n<<BigInt(b);for(let k=0;k<n;k++)v=direct(taps,v);
    if(mul(power(taps,BigInt(n)),1n<<BigInt(b))!==v)throw Error('direct step check failed');tests++;
  }
  for(let w=0;w<12;w++)for(let b=0;b<81;b++){
    const initial=state(li,w,b), flipped=initial^(1n<<BigInt(b));
    for(const [t,op] of [[HORIZONS[0],p0],[HORIZONS[1],p1]]){
      const a=mul(op,initial),c=mul(op,flipped),delta=a^c;
      if(delta!==mul(op,1n<<BigInt(b)))throw Error('linearity failed');
      if(t===HORIZONS[0]){
        if(direct(taps,a)!==mul(p1,initial)||direct(taps,c)!==mul(p1,flipped))throw Error('t+1 mismatch');
        morph+=2;
      }
      const key=li+'-'+t;(counts[key]??=[]).push(pc(delta));
      const hex=x=>x.toString(16).padStart(21,'0');
      records.push('H|t='+t+'|law='+li+'|wave='+w+'|body='+b+'|a='+hex(a)+'|b='+hex(c)+'|delta='+hex(delta)+'|json=0\n');
    }
  }
}
const raw=Buffer.from(records.join(''),'ascii');if(process.argv[2])fs.writeFileSync(process.argv[2],raw);
const delta=Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,Math.min(...v)]));
const out={schema:'ASOLARIA-SEAT3-TWO-HORIZON-STRESS-V1',records:records.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),seed_sha256:SEED,direct_step_controls:tests,t_to_tplus1_controls:morph,horizons:HORIZONS.map(Number),delta_bit_counts:delta,delta_uniform_per_law_horizon:Object.values(counts).every(a=>new Set(a).size===1),physical_host_independent:false,evidence:'synthetic local computation; physical FTL and gravity not measured'};
console.log(JSON.stringify(out));
