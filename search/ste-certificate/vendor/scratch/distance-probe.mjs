// READ-ONLY numeric probe (writes only under my allowed dir). Tests whether
// (a) the EXISTING linear bhIndex gives all-distinct pairwise distances, and
// (b) a Sidon/Golomb prime-cube embedding does. No repo file touched.
import { createHash } from 'node:crypto';
const sha256 = (t) => createHash('sha256').update(String(t),'utf8').digest('hex');
const u32 = (h)=>parseInt(h.slice(0,8),16);
const SECTORS=113, WIDTH=1024;
function reg(name){ const h=sha256(String(name).toUpperCase()); const s=u32(h);
  return { sector:s%SECTORS, lane:s%3, glyph:s%WIDTH }; }
function bhIndexLinear(r){ return r.sector*(WIDTH*3)+r.lane*WIDTH+r.glyph; }
// NEW: Sidon-style embedding on a 1-D line using prime-cube weights (Golomb idea)
const PRIMES=[13,17,23,31,41,47,73,79,83,89,131];
const CUBES=PRIMES.map(p=>p**3);
function bhIndexSidon(r){
  // weight each modulus channel by a DISTINCT prime cube so the channel
  // contributions are linearly independent over the integers in the working range
  const c = CUBES; // 11 anchors
  return r.sector*c[0] + r.lane*c[3] + r.glyph*c[6];
}
function probe(fn,label,N){
  const idx=[]; for(let i=0;i<N;i++) idx.push(fn(reg(`POS-${i}`)));
  const dists=new Set(); let collide=0, total=0;
  for(let i=0;i<idx.length;i++) for(let j=i+1;j<idx.length;j++){
    const d=Math.abs(idx[i]-idx[j]); total++;
    if(dists.has(d)) collide++; else dists.add(d);
  }
  // also count exact INDEX collisions (two nodes same point)
  const uniqIdx=new Set(idx).size;
  console.log(`${label} N=${N} uniq_index=${uniqIdx}/${N} pairwise_distances total=${total} distinct=${dists.size} collisions=${collide}`);
}
for(const N of [64,128,256]){ probe(bhIndexLinear,'LINEAR ',N); probe(bhIndexSidon,'SIDON  ',N); }
