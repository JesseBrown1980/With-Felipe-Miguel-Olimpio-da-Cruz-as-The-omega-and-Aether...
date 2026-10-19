#!/usr/bin/env node
"use strict";
/* Seat 1: explicit GF(2) 81-column transfer-matrix powers.
   Independent of Python cyclic-polynomial algorithm. Software only. */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,"../..");
const CHALLENGE=path.join(ROOT,"experiments/seat1/TRIAD-27-CHALLENGE-20261014.json");
const CHALLENGE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b";
const DOMAIN="ASOLARIA-SEAT1-MULTIVIEW-81-V1";
const N=81,BN=81n,MASK=(1n<<BN)-1n;
const T=10000000000000n,HORIZONS=[1n,T,T+1n,T+81n];
const LAWS=[
 ["CA150",[0,1,80]],["CA90",[1,80]],["CA60",[0,1]],
 ["CA102",[0,80]],["TAP0",[0,1]],["TAP1",[0,2]],["TAP4",[0,1,5,9]]
];
const sha=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const assert=(flag,message)=>{if(!flag)throw Error(message)};
const hex81=x=>x.toString(16).padStart(21,"0");
const bitlen=x=>x===0n?0:x.toString(2).length;
function rotate(x,t){
  let n=BigInt(t)%BN;
  return n===0n?x&MASK:((x<<n)|(x>>(BN-n)))&MASK;
}
function apply(cols,input){
  let out=0n,bits=input;
  while(bits){
    const low=bits&(-bits);
    out^=cols[bitlen(low)-1];
    bits^=low;
  }
  return out;
}
function identity(){return Array.from({length:N},(_,i)=>1n<<BigInt(i))}
function compose(left,right){return right.map(v=>apply(left,v))}
function transferPower(taps,exponent){
  let base=identity().map(input=>{
    let out=0n;
    for(const tap of taps)out^=rotate(input,tap);
    return out;
  });
  let result=identity();
  while(exponent>0n){
    if(exponent&1n)result=compose(base,result);
    base=compose(base,base);
    exponent>>=1n;
  }
  return result;
}
function independentBasis(columns){
  const pivots=new Map(),free=[];
  for(let j=0;j<N;j++){
    let residue=columns[j],original=1n<<BigInt(j);
    while(residue){
      const index=bitlen(residue)-1;
      if(!pivots.has(index)){
        pivots.set(index,[residue,original]);
        break;
      }
      const old=pivots.get(index);
      residue^=old[0];original^=old[1];
    }
    if(residue===0n)free.push(j);
  }
  return {pivots,free};
}
function solve(pivots,output){
  let original=0n,remainder=output;
  while(remainder){
    const index=bitlen(remainder)-1;
    assert(pivots.has(index),"Unreachable output");
    const basis=pivots.get(index);
    remainder^=basis[0];original^=basis[1];
  }
  return original;
}
function tagOf(source,free){
  let tag=0n;
  free.forEach((bit,i)=>{tag|=((source>>BigInt(bit))&1n)<<BigInt(i)});
  return tag;
}
function inputFromTag(tag,free){
  assert(tag>=0n && tag<(1n<<BigInt(free.length)),"bad side tag");
  let source=0n;
  free.forEach((bit,i)=>{source|=((tag>>BigInt(i))&1n)<<BigInt(bit)});
  return source;
}
function decode(columns,pivots,free,output,tag){
  const fromTag=inputFromTag(tag,free);
  const restored=solve(pivots,output^apply(columns,fromTag))^fromTag;
  assert(apply(columns,restored)===output && tagOf(restored,free)===tag,"roundtrip");
  return restored;
}
function* sampleSources(c){
  yield 0n;
  yield MASK;
  for(let bit=0;bit<N;bit++)yield 1n<<BigInt(bit);
  for(const time of c.time)for(const color of c.color)for(const space of c.space){
    for(const bit of [0,17,40,80]){
      const label="ASOLARIA|SEAT1|TRIAD|V1|"+c.nonce+"|"+time+"|"+color+"|"+space+"|"+bit;
      yield (BigInt("0x"+sha(Buffer.from(label,"ascii")))&MASK)^(1n<<BigInt(bit));
    }
  }
}
function main(){
  assert(process.argv.length===3,"Usage: node multiview_81_node.js output.hbp");
  const challengeBytes=fs.readFileSync(CHALLENGE);
  assert(sha(challengeBytes)===CHALLENGE_SHA,"Challenge digest mismatch");
  const c=JSON.parse(challengeBytes.toString("utf8"));
  assert(c.waves===27 && c.bodies===81,"81-body 27-wave preregistration mismatch");
  assert(JSON.stringify(c.time)===JSON.stringify(["past","now","future"]),"time axes");
  assert(JSON.stringify(c.color)===JSON.stringify(["R","G","B"]),"color axes");
  assert(JSON.stringify(c.space)===JSON.stringify(["x","y","z"]),"space axes");
  assert(JSON.stringify(c.horizons)===JSON.stringify(HORIZONS.slice(1).map(Number)),"horizons");
  assert(JSON.stringify(c.laws)===JSON.stringify([[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]),"taps");
  const configurations=LAWS.map(x=>[x[0]]);
  for(let i=0;i<LAWS.length;i++)for(let j=i+1;j<LAWS.length;j++)
    configurations.push([LAWS[i][0],LAWS[j][0]]);
  assert(configurations.length===28,"config count");
  const inputs=Array.from(sampleSources(c));
  assert(inputs.length===191,"input count");
  const lines=["PORTAL|schema="+DOMAIN+"|challenge_sha256="+CHALLENGE_SHA+"|configs=112|sources_per_config=191|physical_host_attested=0|json=0"];
  let rows=0,zero=0,one=0,two=0,kernelCount=0,wrongTagCount=0,futureNoGain=0;
  for(const horizon of HORIZONS){
    const matrices=new Map(LAWS.map(([name,taps])=>[name,transferPower(taps,horizon)]));
    if(horizon===T)for(const [name,taps] of LAWS){
      const early=matrices.get(name);
      for(const later of [T+1n,T+81n]){
        const after=transferPower(taps,later);
        const merged=early.map((col,j)=>col|(after[j]<<BN));
        assert(independentBasis(merged).pivots.size===independentBasis(early).pivots.size,"same-map future must not gain rank");
        futureNoGain++;
      }
    }
    for(const combo of configurations){
      const cols0=matrices.get(combo[0]);
      const cols=combo.length===1?cols0:cols0.map((col,j)=>col|(matrices.get(combo[1])[j]<<BN));
      const {pivots,free}=independentBasis(cols);
      const rank=pivots.size;
      const expected=combo.length===1?(combo[0]==="CA150"?79:80):
                           combo.includes("CA150")?81:80;
      assert(rank===expected,"Bad rank "+combo.join("+")+": "+rank);
      const kernel=[];
      for(const index of free){
        const witness=(1n<<BigInt(index))^solve(pivots,cols[index]);
        assert(witness!==0n && apply(cols,witness)===0n,"kernel witness");
        kernel.push(witness);
      }
      assert(kernel.length===N-rank,"nullity");
      for(let mask=1;mask<(1<<free.length);mask++){
        let witness=0n;
        kernel.forEach((w,i)=>{if(mask&(1<<i))witness^=w});
        assert(witness!==0n && apply(cols,witness)===0n,"collision");
        assert(decode(cols,pivots,free,0n,tagOf(witness,free))===witness,"kernel roundtrip");
        assert(sha(hex81(witness))!==sha(hex81(0n)),"source distinctness");
        kernelCount++;
      }
      if(free.length){
        const example=1n<<17n;
        const observation=apply(cols,example);
        const other=decode(cols,pivots,free,observation,tagOf(example,free)^1n);
        assert(other!==example && apply(cols,other)===observation,"wrong tag selects another source");
        wrongTagCount++;
      }
      for(let i=0;i<inputs.length;i++){
        const original=inputs[i],observation=apply(cols,original),tag=tagOf(original,free);
        const restored=decode(cols,pivots,free,observation,tag);
        assert(restored===original,"exact reconstruction");
        if(!free.length)zero++;else if(free.length===1)one++;else two++;
        const first=hex81(observation&MASK);
        const second=combo.length===2?hex81(observation>>BN):"-";
        const label=combo.join("+");
        const fields=[String(horizon),label,i,rank,hex81(original),first,second,tag.toString(16),hex81(restored)].join("|");
        lines.push("RECORD|"+fields+"|sha="+sha("ROW|"+fields)+"|json=0");
        rows++;
      }
    }
  }
  assert(rows===21392 && zero===4584 && one===16044 && two===764,"acceptance count");
  assert(kernelCount===96 && wrongTagCount===88 && futureNoGain===14,"negative control count");
  lines.push("END|rows=21392|zero_bits=4584|one_bit=16044|two_bits=764|kernel_witnesses=96|wrong_tags=88|future_rank_no_gain=14|physical_tested=0|json=0");
  const bytes=Buffer.from(lines.join("\n")+"\n","ascii");
  fs.writeFileSync(process.argv[2],bytes);
  console.log(JSON.stringify({
    status:"PASS",seat:"seat-1",implementation:"independent_node_matrix",
    sha256:sha(bytes),challenge_sha256:CHALLENGE_SHA,
    records:rows,recovered_without_side_bits:zero,
    recovered_with_one_side_bit:one,recovered_with_two_side_bits:two,
    kernel_collision_witnesses:kernelCount,wrong_tag_controls:wrongTagCount,
    same_law_future_rank_no_gain:futureNoGain,rank_cases:112,
    physical_host_verified:false
  }));
}
if (require.main === module) main();
module.exports={sha,assert,hex81,rotate,apply,transferPower,independentBasis,solve,sampleSources,LAWS,T,HORIZONS,N,BN,MASK,CHALLENGE,CHALLENGE_SHA};
