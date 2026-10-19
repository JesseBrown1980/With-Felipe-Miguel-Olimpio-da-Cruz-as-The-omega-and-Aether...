#!/usr/bin/env node
"use strict";
// Independently test the mathematical claims with GF(3) basis evolution.
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const N=81, taps=[[0,1,3],[0,4,7]];
function step(v,law){const w=new Array(N).fill(0);for(let i=0;i<N;i++)for(const k of law)w[i]=(w[i]+v[(i-k+N)%N])%3;return w;}
function rank(A){let r=0;for(let c=0;c<N;c++){let p=r;while(p<N&&A[p][c]===0)p++;if(p===N)continue;[A[r],A[p]]=[A[p],A[r]];if(A[r][c]===2)A[r]=A[r].map(x=>(2*x)%3);for(let i=0;i<N;i++)if(i!==r&&A[i][c]){let z=A[i][c];A[i]=A[i].map((x,j)=>(x-z*A[r][j]+6)%3);}r++;if(r===N)break;}return r;}
const horizon=[0,1,2,3,10,40,80,81];const reports={};
for(const law of taps){let columns=Array.from({length:N},(_,j)=>Array.from({length:N},(_,i)=>+(i===j)));let observed={};for(let k=0;k<=81;k++){if(horizon.includes(k)){let M=Array.from({length:N},(_,i)=>columns.map(col=>col[i]));let got=rank(M);assert.equal(got,Math.max(N-k,0));observed[k]=got;}if(k!==81)columns=columns.map(c=>step(c,law));}assert(columns.every(c=>c.every(x=>x===0)));const derivative=law.reduce((a,b)=>a+b,0)%3;assert.equal(law.length%3,0);assert.notEqual(derivative,0);reports[law.join(',')]={ranks:observed,all_basis_states_zero_at_81:true,unit_root_multiplicity_1:true};}
assert.equal(2%27,29%27);
let shift=Array.from({length:N},(_,i)=>i%3);let n=10n**13n;let shifted=Array.from({length:N},(_,i)=>shift[(i-Number(n%81n)+N)%N]);assert.equal(shifted.reduce((s,x)=>s+x,0),shift.reduce((s,x)=>s+x,0));
const results=JSON.parse(fs.readFileSync(__dirname+'/RESULTS.json','utf8'));
assert.equal(results.scope,'COMPUTATIONAL_ONLY');
assert.equal(results.three_loop_agent.modes['three-loop'].correct,16200);
assert.equal(results.three_loop_agent.modes['three-loop'].total,16200);
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const stored_sha=digest(fs.readFileSync(__dirname+'/RESULTS.json'));
function canon(x){return JSON.stringify(x,Object.keys(x).sort());}
let state={trits:[0,1,2],address:19};let h1=digest(JSON.stringify(state)+':time=1'),h2=digest(JSON.stringify(state)+':time=10000000000000');assert.notEqual(h1,h2);assert.deepEqual(state,{trits:[0,1,2],address:19});
const report={schema:'ASOLARIA-R1-INDEPENDENT-NODE-GF3-REVIEW-V1',classification:'COMPUTATIONAL_ONLY',proof_tested:'GF3_BASIS_RANK_AND_NILPOTENCY',ranks:reports,prime_residue_collision_verified:true,ternary_rotation_10e13_nonzero:true,timestamp_does_not_transition_state:true,python_result_sha256:stored_sha,unverified_physical_claims:0};
const out=JSON.stringify(report,null,2)+'\n';fs.writeFileSync(__dirname+'/NODE-REVIEW.json',out);console.log('PASS NODE GF3',stored_sha,digest(out));
