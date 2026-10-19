#!/usr/bin/env node
'use strict';
/* Explicit 81x81 GF(2) transfer matrix exponentiation and independent
 * Gaussian rank/nullspace check; does not use the Python polynomial GCD.
 * Digital information recovery only, never physical transmission.
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const N = 81, FULL = (1n << 81n) - 1n;
const CHALLENGE_SHA = 'e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b';
const LEGACY = [
  ['CA150',[0,1,80]], ['CA90',[1,80]], ['CA60',[0,1]],
  ['CA102',[0,80]], ['SHIFT',[1]]
];
const STRESS = [[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]];
const TIMES = [1n,10000000000000n,10000000000001n,10000000000081n];
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');

function rotate(value,offset) {
  offset %= N;
  return offset === 0 ? (value & FULL) :
    (((value << BigInt(offset)) | (value >> (81n - BigInt(offset)))) & FULL);
}
function oneStep(value,taps) {
  let out=0n; for (const k of taps) out ^= rotate(value,k); return out;
}
function apply(columns,input) {
  let out=0n,x=input;
  while(x) {
    const bit=x&-x, position=bit.toString(2).length-1;
    out ^= columns[position]; x ^= bit;
  }
  return out;
}
function identity() {
  return Array.from({length:N},(_,i)=>1n<<BigInt(i));
}
function compose(outer,inner) {
  return inner.map(v=>apply(outer,v));
}
function matrixPower(base,steps) {
  let result=identity();
  while(steps) {
    if(steps&1n) result=compose(base,result);
    base=compose(base,base);steps >>= 1n;
  }
  return result;
}
function rankAndNullspace(columns) {
  const pivots=Array(N).fill(null),kernel=[];
  for(let i=0;i<N;i++) {
    let vector=columns[i],combination=1n<<BigInt(i),inserted=false;
    while(vector) {
      const pivot=vector.toString(2).length-1;
      if(pivots[pivot]) {
        vector ^= pivots[pivot].vector;
        combination ^= pivots[pivot].combination;
      } else {
        pivots[pivot]={vector,combination};
        inserted=true;
        break;
      }
    }
    if(!inserted) {
      if(combination===0n || apply(columns,combination)!==0n)
        throw Error('kernel witness invalid');
      kernel.push(combination);
    }
  }
  const rank=pivots.filter(Boolean).length;
  if(rank+kernel.length!==N) throw Error('rank-nullity violated');
  return {rank,kernel};
}
function main() {
  const raw=fs.readFileSync(process.argv[2]);
  if(sha(raw)!==CHALLENGE_SHA) throw Error('triad challenge digest mismatch');
  const challenge=JSON.parse(raw.toString('utf8'));
  if(challenge.bodies!==N || JSON.stringify(challenge.laws)!==JSON.stringify(STRESS))
    throw Error('triad stress taps mismatch');
  if(JSON.stringify(challenge.horizons)!==JSON.stringify(TIMES.slice(1).map(Number)))
    throw Error('triad time horizons mismatch');
  const families=[['legacy',LEGACY],
    ['triad-stress',STRESS.map((t,i)=>['TAP'+i,t])]];
  const rows=[],summary=[];
  for(const [family,laws] of families) {
    for(const [name,taps] of laws) {
      const base=identity().map(v=>oneStep(v,taps));
      let baseRank=null,baseNullity=null;
      for(const t of TIMES) {
        const jump=matrixPower(base,t);
        const {rank,kernel}=rankAndNullspace(jump);
        if(baseRank===null) {baseRank=rank;baseNullity=N-rank;}
        if(rank!==baseRank) throw Error('loss changed after positive modeled time');
        for(const witness of kernel) {
          const a=1n<<17n,b=a^witness;
          const aa=apply(jump,a),bb=apply(jump,b);
          if(a===b || aa!==bb) throw Error('rank kernel collision invalid');
          const hex=v=>v.toString(16).padStart(21,'0');
          if(sha(hex(a))===sha(hex(b))) throw Error('unexpected input SHA collision');
          if(sha(hex(aa))!==sha(hex(bb))) throw Error('post-hash collision not preserved');
        }
        const lost=N-rank;
        rows.push(family+'|'+name+'|'+t+'|'+rank+'|'+lost+'|'+(1<<lost)+'\n');
      }
      summary.push({family,law:name,taps,rank:baseRank,
        kernel_dimension_bits:baseNullity,
        preimages_per_reachable_output:1<<baseNullity});
    }
  }
  const csv=Buffer.from(rows.join(''),'ascii');
  fs.writeFileSync(process.argv[3],csv);
  console.log(JSON.stringify({
    schema:'ASOLARIA-GF2-81-RETENTION-AUDIT-V1',
    algorithm:'explicit-matrix-exponentiation-and-GF2-nullspace',
    challenge_sha256:CHALLENGE_SHA,horizon_count:TIMES.length,
    laws:summary.length,rows:rows.length,csv_sha256:sha(csv),
    law_results:summary,physical_host_verified:false,
    meaning:'information retention of digital linear maps; not physical entropy or signaling'
  }));
}
main();
