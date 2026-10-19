#!/usr/bin/env node
"use strict";
/* Seat 1 source provenance negative controls, independently using Node
 * 81x81 matrix powers, NOT importing the Python polynomial logic.
 */
const fs=require("node:fs"),crypto=require("node:crypto");
const {
  sha,assert,hex81,apply,transferPower,independentBasis,solve,
  sampleSources,LAWS,T,HORIZONS,N,BN,CHALLENGE,CHALLENGE_SHA
}=require("./multiview_81_node.js");
const DOMAIN="ASOLARIA-SEAT1-CROSSVIEW-PROVENANCE-V1";

function decodeStrict(columns,pivots,output){
  try {
    const value=solve(pivots,output);
    return apply(columns,value)===output?value:null;
  } catch(err) {
    if(err.message==="Unreachable output")return null;
    throw err;
  }
}
function check(){
  const blob=fs.readFileSync(CHALLENGE);
  assert(sha(blob)===CHALLENGE_SHA,"source challenge digest");
  const c=JSON.parse(blob);
  assert(JSON.stringify(c.laws)===JSON.stringify([[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]),"frozen laws");
  assert(JSON.stringify(c.horizons)===JSON.stringify(HORIZONS.slice(1).map(Number)),"horizons");
  assert(c.waves===27&&c.bodies===N,"shape");
  const sources=Array.from(sampleSources(c));
  assert(sources.length===191,"191 sources");

  const rows=["PORTAL|schema="+DOMAIN+"|challenge_sha256="+CHALLENGE_SHA+"|full_rank_pairs=24|cases_per_arm=4584|arms=4|physical_attested=0|json=0"];
  let truth=0,rejects=0,substitutions=0,invisibles=0;
  const controls=[];
  const laws=new Map(LAWS);
  for(const horizon of HORIZONS){
    const aCols=transferPower(laws.get("CA150"),horizon);
    const aBasis=independentBasis(aCols);
    assert(aBasis.pivots.size===79 && aBasis.free.length===2,"A rank");
    const aFree=aBasis.free[0];
    const ka=(1n<<BigInt(aFree))^solve(aBasis.pivots,aCols[aFree]);
    assert(ka!==0n && apply(aCols,ka)===0n,"A kernel");

    for(const [name,taps] of LAWS.slice(1)){
      const bCols=transferPower(taps,horizon);
      const bBasis=independentBasis(bCols);
      assert(bBasis.pivots.size===80 && bBasis.free.length===1,"B rank");
      const bFree=bBasis.free[0];
      const kb=(1n<<BigInt(bFree))^solve(bBasis.pivots,bCols[bFree]);
      assert(kb!==0n && apply(bCols,kb)===0n,"B kernel");
      const stacked=aCols.map((v,i)=>v|(bCols[i]<<BN));
      const abBasis=independentBasis(stacked);
      assert(abBasis.pivots.size===81 && abBasis.free.length===0,"joint rank 81");
      assert(apply(bCols,ka)!==0n && apply(aCols,kb)!==0n,"kernel intersection zero");
      let rejectedIndex=null;
      for(let j=0;j<N;j++){
        if(decodeStrict(stacked,abBasis.pivots,bCols[j]<<BN)===null){
          rejectedIndex=j;break;
        }
      }
      assert(rejectedIndex!==null,"must find rejected basis mutation");
      const delta=1n<<BigInt(rejectedIndex);
      controls.push({horizon:Number(horizon),B:name,A_rank:79,B_rank:80,
        joint_rank:81,first_rejected_basis_bit:rejectedIndex,
        A_kernel_hex:hex81(ka),B_kernel_hex:hex81(kb)});
      for(let trial=0;trial<sources.length;trial++){
        const x=sources[trial];
        const outA=apply(aCols,x),outB=apply(bCols,x);
        const configurations=[
          ["valid",x,outB,x],
          ["rejected_mismatch",x^delta,apply(bCols,x^delta),null],
          ["accepted_source_swap",x^ka,apply(bCols,x^ka),x^ka],
          ["invisible_B_source_swap",x^kb,apply(bCols,x^kb),x]
        ];
        for(const [kind,inputB,outputB,expected] of configurations){
          const pair=outA|(outputB<<BN);
          const received=decodeStrict(stacked,abBasis.pivots,pair);
          assert(received===expected,"Unexpected decode "+name+" "+horizon+" "+trial+" "+kind);
          assert(kind==="valid"?inputB===x:inputB!==x,"source type");
          if(kind==="valid"){assert(received===x,"truth");truth++}
          else if(kind==="rejected_mismatch"){rejects++}
          else if(kind==="accepted_source_swap"){
            assert(received!==x && outputB!==outB,"source substitution");
            substitutions++;
          }else{
            assert(outputB===outB && received===x,"invisible disagreement");
            invisibles++;
          }
          const fields=[
            String(horizon),"CA150+"+name,trial,kind,hex81(x),
            hex81(inputB),hex81(outA),hex81(outputB),
            received===null?"-":hex81(received)
          ].join("|");
          rows.push("PROVENANCE|"+fields+"|sha="+sha("ROW|"+fields)+"|json=0");
        }
      }
    }
  }
  assert(controls.length===24,"24 configs");
  assert(truth===4584 && rejects===4584 && substitutions===4584 && invisibles===4584,"all four arms");
  rows.push("END|cases=18336|valid=4584|rejected=4584|source_swap=4584|invisible=4584|full_rank_pairs=24|physical_attested=0|json=0");
  const buf=Buffer.from(rows.join("\n")+"\n","ascii");
  return {bytes:buf,metrics:{
    schema:DOMAIN,status:"PASS",implementation:"Node GF2 transfer matrix",
    cases:18336,rank81_pairs:24,valid_roundtrips:truth,
    detected_mismatches:rejects,accepted_wrong_source:substitutions,
    invisible_provenance_mismatches:invisibles,
    trace_sha256:sha(buf),trace_bytes:buf.length,
    per_pair_controls:controls,physical_host_attested:false
  }};
}
const [outPath,metricPath]=process.argv.slice(2);
assert(outPath&&metricPath&&process.argv.length===4,"usage: node crossview_provenance_node.js out.hbp metrics.json");
const {bytes,metrics}=check();
fs.writeFileSync(outPath,bytes);
fs.writeFileSync(metricPath,JSON.stringify(metrics,null,2)+"\n");
const short={...metrics};delete short.per_pair_controls;
console.log(JSON.stringify(short));
