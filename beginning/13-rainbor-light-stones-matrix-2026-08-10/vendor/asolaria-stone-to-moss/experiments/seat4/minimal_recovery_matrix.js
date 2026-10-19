#!/usr/bin/env node
'use strict';
/* Seat 4: 81x81 transfer-matrix recovery with minimal extra source bits.
 * Independent of the Python cyclic-polynomial implementation.
 * Software source reconstructability only; NOT compression/physical signaling.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const SOURCE=path.join(ROOT,'experiments/seat1/TRIAD-27-CHALLENGE-20261014.json');
const STONE=path.join(ROOT,'stones/2026-10-14-rainbow81/retention-81-rank40.json');
const SOURCE_SHA='e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b';
const DOMAIN='ASOLARIA-SEAT4-MINIMAL-RECOVERY-V1';
const N=81, MASK=(1n<<81n)-1n, TIMES=[1n,10000000000000n,10000000000001n,10000000000081n];
const LEGACY=[
 ['CA150',[0,1,80]],['CA90',[1,80]],['CA60',[0,1]],['CA102',[0,80]],['SHIFT',[1]]
];
const STRESS=[['TAP0',[0,1]],['TAP1',[0,2]],['TAP2',[0,1,3]],['TAP3',[0,4,7]],['TAP4',[0,1,5,9]]];
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const ck=(truth,msg)=>{if(!truth)throw Error(msg)};
const hex81=v=>v.toString(16).padStart(21,'0');
const leading=v=>v.toString(2).length-1;

function rotate(x,steps) {
  const k=steps%N;
  return k===0 ? x&MASK : ((x<<BigInt(k))|(x>>(81n-BigInt(k))))&MASK;
}
function step(state,taps) {
  let out=0n;
  for(const tap of taps)out^=rotate(state,tap);
  return out;
}
function apply(columns,input) {
  let output=0n,v=input;
  while(v){
    const lsb=v&-v;
    output^=columns[leading(lsb)];
    v^=lsb;
  }
  return output;
}
function identity() {
  return Array.from({length:N},(_,i)=>1n<<BigInt(i));
}
function compose(a,b) {return b.map(col=>apply(a,col))}
function matrixPower(taps,steps) {
  let base=identity().map(v=>step(v,taps));
  let result=identity();
  while(steps){
    if(steps&1n)result=compose(base,result);
    base=compose(base,base);
    steps>>=1n;
  }
  return result;
}
function basis(columns) {
  const pivots=new Map(),free=[];
  for(let i=0;i<columns.length;i++) {
    let vector=columns[i],source=1n<<BigInt(i);
    while(vector!==0n){
      const bit=leading(vector);
      const existing=pivots.get(bit);
      if(existing===undefined) {
        pivots.set(bit,{vector,source});
        break;
      }
      vector^=existing.vector;
      source^=existing.source;
    }
    if(vector===0n)free.push(i);
  }
  return {pivots,free};
}
function solve(pivots,output) {
  let source=0n,remaining=output;
  while(remaining){
    const existing=pivots.get(leading(remaining));
    if(!existing)throw Error('output not in pivot span');
    remaining^=existing.vector;
    source^=existing.source;
  }
  return source;
}
function extractTag(source,free) {
  let tag=0n;
  for(let i=0;i<free.length;i++)
    tag|=((source>>BigInt(free[i]))&1n)<<BigInt(i);
  return tag;
}
function tagSource(tag,free) {
  ck(tag>=0n && tag<(1n<<BigInt(free.length)),'invalid side tag');
  let source=0n;
  for(let i=0;i<free.length;i++)
    source|=((tag>>BigInt(i))&1n)<<BigInt(free[i]);
  return source;
}
function decode(columns,pivots,free,output,tag) {
  const sf=tagSource(tag,free);
  const source=sf^solve(pivots,output^apply(columns,sf));
  ck(apply(columns,source)===output,'source reconstruction fails output');
  ck(extractTag(source,free)===tag,'source reconstruction fails tag');
  return source;
}
function* samples(family,law,horizon) {
  yield 0n;
  yield MASK;
  for(let i=0;i<N;i++)yield 1n<<BigInt(i);
  for(let index=0;index<128;index++){
    const label=DOMAIN+'|'+family+'|'+law+'|'+horizon+'|'+index;
    const bytes=crypto.createHash('sha256').update(label,'ascii').digest();
    let result=0n;
    for(let i=0;i<11;i++)result|=BigInt(bytes[i])<<(8n*BigInt(i));
    yield result&MASK;
  }
}
function main() {
  const input=fs.readFileSync(SOURCE);
  ck(sha(input)===SOURCE_SHA,'challenge SHA mismatch');
  const challenge=JSON.parse(input.toString('utf8'));
  ck(challenge.bodies===N,'challenge size');
  ck(JSON.stringify(challenge.laws)===JSON.stringify(STRESS.map(x=>x[1])),'challenge law taps');
  ck(JSON.stringify(challenge.horizons)===JSON.stringify(TIMES.slice(1).map(Number)),'challenge horizons');
  const receipt=JSON.parse(fs.readFileSync(STONE,'utf8'));
  ck(receipt.system_size_bits===81 && receipt.cross_language.exact_parity_rows===40,'rank receipt');
  const ranks=new Map(receipt.results.map(x=>[x.family+'|'+x.law,x.rank]));
  ck(ranks.size===10,'expected 10 ranked laws');
  const digest=crypto.createHash('sha256');
  let rows=0,collisions=0,wrongTags=0,noTags=0,tagged=0;
  const lawSummary=[],lines=[];
  for(const [family,laws] of [['legacy',LEGACY],['triad-stress',STRESS]]){
    for(const [law,taps] of laws){
      const rankExpected=ranks.get(family+'|'+law);
      ck(Number.isInteger(rankExpected),'law absent in rank receipt');
      lawSummary.push({family,law,rank:rankExpected,
        minimal_extra_bits:N-rankExpected,
        reversible_without_extra_bits:rankExpected===N});
      for(const horizon of TIMES){
        const columns=matrixPower(taps,horizon);
        const {pivots,free}=basis(columns);
        ck(pivots.size===rankExpected && free.length===N-rankExpected,
          'matrix rank / sidebits mismatch');
        const kernel=[];
        for(const col of free){
          const witness=(1n<<BigInt(col))^solve(pivots,columns[col]);
          ck(witness!==0n && apply(columns,witness)===0n,'kernel witness invalid');
          kernel.push(witness);
        }
        const seen=new Set();
        for(let combo=0;combo<(1<<kernel.length);combo++){
          let witness=0n;
          for(let b=0;b<kernel.length;b++)
            if(combo&(1<<b))witness^=kernel[b];
          ck(apply(columns,witness)===0n,'kernel collision output');
          const tag=extractTag(witness,free);
          ck(!seen.has(tag.toString()),'tag fails to distinguish kernel');
          seen.add(tag.toString());
          ck(decode(columns,pivots,free,0n,tag)===witness,'kernel preimage recovery');
          if(combo!==0){
            collisions++;
            ck(sha(hex81(witness))!==sha(hex81(0n)),'source hashes should differ');
            ck(sha(hex81(apply(columns,witness)))===sha(hex81(0n)),
              'post-evolution hashes of identical data must match');
          }
        }
        ck(seen.size===(1<<free.length),'missing preimage tags');
        if(free.length){
          const example=1n<<17n;
          const incorrectTag=extractTag(example,free)^1n;
          const other=decode(columns,pivots,free,apply(columns,example),incorrectTag);
          ck(other!==example && apply(columns,other)===apply(columns,example),
            'wrong tag should select other valid preimage');
          wrongTags++;
        }
        let trial=0;
        for(const source of samples(family,law,horizon)){
          const output=apply(columns,source),tag=extractTag(source,free);
          const restored=decode(columns,pivots,free,output,tag);
          ck(restored===source,'failed to reconstruct original input');
          if(free.length)tagged++;else noTags++;
          const line=family+'|'+law+'|'+horizon+'|'+trial+'|'+
            hex81(source)+'|'+hex81(output)+'|'+tag.toString(16).padStart(2,'0')+
            '|'+hex81(restored)+'\n';
          lines.push(line);
          digest.update(line,'ascii');
          trial++;rows++;
        }
      }
    }
  }
  ck(rows===8440 && noTags===2532 && tagged===5908,'case totals');
  ck(collisions===36 && wrongTags===28,'negative control totals');
  fs.writeFileSync(process.argv[2],lines.join(''),'ascii');
  console.log(JSON.stringify({
    schema:'ASOLARIA-SEAT4-MINIMAL-RECOVERY-V1',
    seat:'seat-4',
    algorithm:'independent-explicit-81x81-matrix-and-source-pivot-reconstruction',
    source_challenge_sha256:SOURCE_SHA,
    rows,law_horizon_cases:40,no_tag_roundtrips:noTags,
    side_tag_roundtrips:tagged,nonzero_kernel_collisions:collisions,
    wrong_tag_misdecodes:wrongTags,canonical_trace_sha256:digest.digest('hex'),
    law_summary:lawSummary,physical_host_independently_attested:false,
    claim:'software invertibility and minimal loss-recovery sidebits only'
  }));
}
main();
