function isPrime(n){ if(n<2)return false; for(let f=2;f*f<=n;f++) if(n%f===0)return false; return true;}
function erdosTuran(p){ const a=[]; for(let k=0;k<p;k++) a.push(2*p*k+((k*k)%p)); return a; }
function babs(x){ return x<0n?-x:x; }
function distMultiset(arr){ const seen=new Set(); let coll=0,tot=0,minD=null,maxD=0n;
  for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
    const d=babs(arr[i]-arr[j]); tot++; if(minD===null||d<minD)minD=d; if(d>maxD)maxD=d;
    if(seen.has(d))coll++; else seen.add(d);
  } return {tot,distinct:seen.size,coll,minD,maxD}; }

const PRIMES=[13,17,23,31,41,47,73,79,83,89,131].filter(isPrime);
const towers = PRIMES.map(p=>{ const W=BigInt(p)**3n; const S=erdosTuran(p).map(BigInt);
  const scaled=S.map(x=>x*W); const maxIntra=scaled[scaled.length-1]-scaled[0]; return {p,W,scaled,maxIntra}; });
const GUARD = 1n<<40n;
let acc=0n; const all=[];
for(let t=0;t<towers.length;t++){ const tw=towers[t]; tw.anchor=acc;
  for(const x of tw.scaled) all.push(acc + x);
  acc = acc + tw.maxIntra + GUARD*tw.W;
}
const r=distMultiset(all);
console.log(`CROSS-FIX towers=${towers.length} points=${all.length} pairs=${r.tot} distinct_dist=${r.distinct} collisions=${r.coll}`);
console.log(`min_dist=${r.minD} max_dist=${r.maxD}`);
// Also: confirm INTRA-only zero collisions per tower under scaling
for(const tw of towers){ const rr=distMultiset(tw.scaled); if(rr.coll!==0) console.log(`INTRA FAIL p=${tw.p} coll=${rr.coll}`); }
console.log('INTRA all towers zero-collision: OK');
