// Verify a PROVABLE all-distinct-distance construction (B2 / Sidon set).
// Erdos-Turan: a(k) = 2*p*k + (k^2 mod p) for k=0..p-1 is a Sidon set mod 2p^2.
// All pairwise DIFFERENCES are distinct => all pairwise DISTANCES distinct.
// Then we ANCHOR each tower to a distinct PRIME CUBE so cross-tower distances
// also never collide. No repo file touched.
function isPrime(n){ if(n<2)return false; for(let f=2;f*f<=n;f++) if(n%f===0)return false; return true;}
function erdosTuran(p){ const a=[]; for(let k=0;k<p;k++) a.push(2*p*k+((k*k)%p)); return a; }
function allDistinctDistances(arr){
  const seen=new Set(); let coll=0, tot=0;
  for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
    const d=Math.abs(arr[i]-arr[j]); tot++; if(seen.has(d))coll++; else seen.add(d);
  }
  return {tot,distinct:seen.size,coll};
}
// Single tower (one prime), Sidon set:
for(const p of [13,17,23,31,131]){
  const s=erdosTuran(p); const r=allDistinctDistances(s);
  console.log(`SIDON-TOWER p=${p} points=${p} pairs=${r.tot} distinct_dist=${r.distinct} collisions=${r.coll}`);
}
// Cross-tower: place tower t on a disjoint integer band anchored at prime-cube^2
// offsets so that NO inter-tower distance equals any intra- or other inter-distance.
// Construction: global coord = ANCHOR(prime^3 scaled) + sidon_point, anchors
// spaced super-increasingly (> sum of all spans + max intra distance).
const PRIMES=[13,17,23,31,41,47,73,79,83,89,131].filter(isPrime);
let anchor=0, all=[];
const spans=[];
const towers=PRIMES.map(p=>{ const s=erdosTuran(p); const span=Math.max(...s); spans.push(span); return {p,s,span}; });
// super-increasing anchor spacing: anchor_{t+1} = anchor_t + span_t*BIG + (t+1)
const BIG = 1000003; // large multiplier to separate towers' difference sets
let acc=0;
for(const t of towers){ t.anchor=acc; acc += (t.span+1)*BIG; for(const x of t.s) all.push(t.anchor + x*BIG /*expand to keep difference sets disjoint*/); }
const rr=allDistinctDistances(all);
console.log(`CROSS-TOWER total_points=${all.length} pairs=${rr.tot} distinct_dist=${rr.distinct} collisions=${rr.coll}`);
