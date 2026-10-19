#!/usr/bin/env node
'use strict';
/* Seat-2 independent Node.js rank/probe sufficiency reference, 81-bit GF(2). */
const N=81n, MASK=(1n<<N)-1n, T=10000000000000n;
const laws=[
  ['stress-01',[0,1]],['stress-02',[0,2]],['stress-013',[0,1,3]],
  ['stress-047',[0,4,7]],['stress-0159',[0,1,5,9]],
  ['CA150',[-1,0,1]],['CA90',[-1,1]],['CA60',[-1,0]],
  ['CA102',[0,1]],['SHIFT',[1]]
];
function rol(x,shift){let k=BigInt((shift%81+81)%81);return k===0n?x:((x<<k)|(x>>(N-k)))&MASK;}
function mul(a,b){let result=0n, k=0;while(b){if(b&1n)result^=rol(a,k);b>>=1n;k++;}return result;}
function exp(op,t){let acc=1n;while(t){if(t&1n)acc=mul(acc,op);op=mul(op,op);t>>=1n;}return acc;}
function degree(v){let c=0;while(v){v>>=1n;c++;}return c-1;}
function rank(rows){const pivots=new Map();for(let value of rows){while(value){let p=degree(value);if(pivots.has(p))value^=pivots.get(p);else{pivots.set(p,value);break;}}}return pivots.size;}
function checked(cond,msg){if(!cond)throw Error(msg);}
function witness(taps,t){
 let op=0n;for(const offset of taps)op^=1n<<BigInt((offset%81+81)%81);
 const fn=exp(op,t),cols=Array.from({length:81},(_,i)=>rol(fn,i));
 const rows=Array.from({length:81},(_,i)=>cols.reduce((a,c,j)=>a|(((c>>BigInt(i))&1n)<<BigInt(j)),0n));
 const r=rank(rows),k=81-r;
 let chosen=[],probes=[];
 for(let i=0;i<81;i++){const candidate=1n<<BigInt(i);if(rank([...rows,...chosen,candidate])>r+chosen.length){chosen.push(candidate);probes.push(i);}if(chosen.length===k)break;}
 checked(chosen.length===k,'minimal rank repair failed');
 checked(rank([...rows,...chosen])===81,'full state not reconstructable');
 for(let p=0;p<chosen.length;p++)checked(rank([...rows,...chosen.filter((_,j)=>j!==p)])===80,'probe not necessary');
 return {rank:r,lost_bits:k,minimal_probe_bit_indices:probes,operator_hex:fn.toString(16).padStart(21,'0')};
}
const output={schema:'ASOLARIA-SEAT2-NODE-RANK-REPAIR-81-V1',rows:[]};
for(const [law,taps] of laws)for(const horizon of [T,T+1n]){
 output.rows.push({law,horizon:String(horizon),...witness(taps,horizon)});
}
checked(output.rows.length===20,'missing law/horizon pairs');
process.stdout.write(JSON.stringify(output,null,2)+'\n');
