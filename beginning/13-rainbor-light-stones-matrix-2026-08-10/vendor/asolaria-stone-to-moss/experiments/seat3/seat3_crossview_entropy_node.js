#!/usr/bin/env node
"use strict";
/* Seat 3: independent Node matrix action implementation; does not import Python or Seat 1 code.
   Independently generates the canonical HBP trace for byte-identical comparison. */
const fs=require('fs');
const crypto=require('crypto');
const N=81, NN=81n, MASK=(1n<<NN)-1n, T=10000000000000;
const HORIZONS=[1,T,T+1,T+81];
const A=['CA150',[0,1,80]];
const BS=[['CA90',[1,80]],['CA60',[0,1]],['CA102',[0,80]],['TAP1',[0,2]],['TAP4',[0,1,5,9]]];
const CHALLENGE_SHA='e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b';
const DOMAIN='ASOLARIA-SEAT3-CROSSVIEW-CONSISTENCY-ENTROPY-V1';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const hex=x=>x.toString(16).padStart(21,'0');
function rotate(x,k){k%=N;return k ? ((x<<BigInt(k))|(x>>BigInt(N-k)))&MASK : x&MASK}
const apply=(cols,x)=>{let y=0n,j=0;while(x){if(x&1n)y^=cols[j];x>>=1n;j++}return y};
// This is COLUMN-MATRIX exponentiation, whereas Python uses cyclic polynomial products.
const compose=(outer,inner)=>inner.map(x=>apply(outer,x));
function power(taps,h){
  let current=Array.from({length:N},(_,j)=>taps.reduce((s,t)=>s^rotate(1n<<BigInt(j),t),0n));
  let result=Array.from({length:N},(_,j)=>1n<<BigInt(j));
  while(h>0){if(h%2===1)result=compose(current,result);current=compose(current,current);h=Math.floor(h/2)}
  return result;
}
const bitlen=x=>x.toString(2).length-1;
function basis(cols){let piv=new Map(),free=[];
  for(let j=0;j<cols.length;j++){
    let residue=cols[j],src=1n<<BigInt(j);
    while(residue!==0n){let bit=bitlen(residue),p=piv.get(bit);
      if(!p){piv.set(bit,[residue,src]);break}
      residue^=p[0];src^=p[1];
    }
    if(residue===0n)free.push(j);
  }
  return [piv,free];
}
function decode(p,y){let x=0n;while(y!==0n){let v=p.get(bitlen(y));if(!v)return null;y^=v[0];x^=v[1]}return x}
function kernel(p,free,cols){if(!free.length)throw Error('no kernel');let v=(1n<<BigInt(free[0]))^decode(p,cols[free[0]]);if(v===0n||apply(cols,v)!==0n)throw Error('bad kernel');return v}
function samples(c){let s=[0n,MASK];for(let j=0;j<N;j++)s.push(1n<<BigInt(j));
 for(let t of c.time)for(let color of c.color)for(let space of c.space)for(let bit of [0,17,40,80]){
   let label=['ASOLARIA','SEAT1','TRIAD','V1',c.nonce,t,color,space,bit].join('|');
   s.push((BigInt('0x'+sha(Buffer.from(label,'ascii')))&MASK)^(1n<<BigInt(bit)));
 } if(s.length!==191)throw Error('samples');return s;
}
function toy(){const aa=x=>x&3,bb=x=>x&14,cc=x=>x&13;
 const pairs=new Set(),triples=new Set();for(let z=0;z<16;z++){pairs.add([aa(z),bb(z)].join('|'));triples.add([aa(z),bb(z),cc(z)].join('|'))}
 let np=0,nt=0;for(let x=0;x<16;x++)for(let y=0;y<16;y++){
   if(pairs.has([aa(x),bb(y)].join('|')))np++;
   for(let z=0;z<16;z++)if(triples.has([aa(x),bb(y),cc(z)].join('|')))nt++;
 }if(np!==128||nt!==256)throw Error('toy');return [np,nt];
}
function audit(challenge){const raw=fs.readFileSync(challenge);if(sha(raw)!==CHALLENGE_SHA)throw Error('drift');
 const c=JSON.parse(raw.toString());if(c.bodies!==81||c.waves!==27||c.horizons.join(',')!==[T,T+1,T+81].join(','))throw Error('fixture');
 const sources=samples(c),[tp,tt]=toy();
 const rows=['PORTAL|schema='+DOMAIN+'|challenge_sha256='+CHALLENGE_SHA+'|sources=191|physical_hosts_attested=0|json=0'];
 const counts={honest:0,rejected:0,alternate_accepted:0,invisible_B_change:0};let pairs=0,triples=0;
 for(const h of HORIZONS){
   const a=power(A[1],h),[pa,fa]=basis(a);if(pa.size!==79||fa.length!==2)throw Error('A rank');const ka=kernel(pa,fa,a);
   const ops=BS.map(([name,taps])=>[name,power(taps,h)]),binfo=new Map();
   for(const [name,b] of ops){const [pb,fb]=basis(b);if(pb.size!==80||fb.length!==1)throw Error('B rank');
     const kb=kernel(pb,fb,b),ab=a.map((v,j)=>v|(b[j]<<NN)),[pab,fab]=basis(ab);
     if(pab.size!==81||fab.length!==0)throw Error('pair');
     binfo.set(name,kb);pairs++;
     rows.push(['PAIR',h,'CA150',name,'rA=79','rB=80','joint=81','constraints=78','blind=2^-78'].join('|'));
   }
   for(let ib=0;ib<ops.length;ib++)for(let ic=ib+1;ic<ops.length;ic++){
     const [nameB,b]=ops[ib],[nameC,cc]=ops[ic];
     const cols=a.map((v,j)=>v|(b[j]<<NN)|(cc[j]<<(2n*NN))),[p,free]=basis(cols);
     if(p.size!==81||free.length!==0)throw Error('triple');triples++;
     let rejectBit=-1;for(let j=0;j<N;j++)if(decode(p,b[j]<<NN)===null){rejectBit=j;break}
     if(rejectBit<0)throw Error('missing reject basis');const delta=1n<<BigInt(rejectBit),kb=binfo.get(nameB);
     if(apply(a,ka)!==0n||apply(b,kb)!==0n)throw Error('kernel invalid');
     for(let trial=0;trial<sources.length;trial++){
       const x=sources[trial],ax=apply(a,x),bx0=apply(b,x),cx0=apply(cc,x);
       const cfg=[['honest',x,x,x],['rejected',x^delta,x,null],['alternate_accepted',x^ka,x^ka,x^ka],['invisible_B_change',x^kb,x,x]];
       for(const [arm,sourceB,sourceC,expected] of cfg){
         const bx=apply(b,sourceB),cx=apply(cc,sourceC),got=decode(p,ax|(bx<<NN)|(cx<<(2n*NN)));
         if(got!==expected)throw Error('case mismatch: '+[h,nameB,nameC,trial,arm].join('/'));
         if(got!==null&&(apply(a,got)!==ax||apply(b,got)!==bx||apply(cc,got)!==cx))throw Error('not inverse');
         if(arm==='rejected'&&bx===bx0)throw Error('rejection fake');
         if(arm==='alternate_accepted'&&(expected===x||sourceB===x||sourceC===x))throw Error('alternate fake');
         if(arm==='invisible_B_change'&&(sourceB===x||bx!==bx0||cx!==cx0))throw Error('invisible fake');
         counts[arm]++;
         const fields=[''+h,nameB,nameC,''+trial,arm,hex(x),hex(sourceB),hex(sourceC),hex(ax),hex(bx),hex(cx),got===null?'-':hex(got)];
         rows.push('CASE|'+fields.join('|'));
       }
     }
     rows.push(['TRIPLE',h,'CA150',nameB,nameC,'ranks=79,80,80','joint=81','constraints=158','blind=2^-158','reject_bit='+rejectBit].join('|'));
   }
 }
 if(pairs!==20||triples!==40||Object.values(counts).some(x=>x!==7640))throw Error('counts');
 rows.push('END|pairs=20|triples=40|controls=30560|honest=7640|rejected=7640|alternate_accepted=7640|invisible_B_change=7640|toy_pair=128|toy_triple=256|physical=0|json=0');
 const output=Buffer.from(rows.join('\n')+'\n','ascii');return {output,metrics:{trace_bytes:output.length,trace_sha256:sha(output),pair_cases:pairs,triple_cases:triples,controlled_cases:30560,toy_pair_accept:tp,toy_triple_accept:tt,controls:counts}};
}
if(process.argv.length!==5){console.error('usage: node seat3_crossview_entropy_node.js challenge.json out.hbp metrics.json');process.exit(2)}
const {output,metrics}=audit(process.argv[2]);fs.writeFileSync(process.argv[3],output);fs.writeFileSync(process.argv[4],JSON.stringify(metrics,null,2)+'\n');console.log(JSON.stringify(metrics));
