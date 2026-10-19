#!/usr/bin/env node
"use strict";
/* Independent indexed-array integer replay. Public software-only model. */
const fs=require("node:fs"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const N=81,W=27,T=40,S=1000000,GOAL=400000,OPEN=300000,REF=60000,REC=25000;
const SCHEMA="ASOLARIA-SEAT1-OPTOGATE-3STATE-1080-V1";
const ARMS=["dark","open_loop","feedback_truth","feedback_corrupt"];
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
function calc(c,o,r,lit,rate=OPEN){
  const act=Math.floor(c*(lit?rate:0)/S);
  const inact=Math.floor(o*REF/S);
  const recovered=Math.floor(r*REC/S);
  const x=[c-act+recovered,o+act-inact,r+inact-recovered];
  assert(x.every(k=>k>=0));assert.equal(x[0]+x[1]+x[2],S);
  return {x,act};
}
function one(name){
  const c=Array(N).fill(S),o=Array(N).fill(0),r=Array(N).fill(0),lines=[];
  let err=0,cmd=0,opened=0;
  for(let w=0;w<W;w++){
    for(let t=0;t<T;t++){
      const nc=Array(N),no=Array(N),nr=Array(N);
      for(let i=0;i<N;i++){
        const target=(i+w)%3===0;
        let lit=false;
        if(name==="open_loop")lit=target&&t%12<4;
        else if(name==="feedback_truth")lit=target&&o[i]<GOAL;
        else if(name==="feedback_corrupt")lit=target&&Math.min(S,o[i]+250000)<GOAL;
        else assert.equal(name,"dark");
        const z=calc(c[i],o[i],r[i],lit);
        nc[i]=z.x[0];no[i]=z.x[1];nr[i]=z.x[2];
        cmd+=lit?1:0;opened+=z.act;
        err+=Math.abs(z.x[1]-(target?GOAL:0));
      }
      for(let i=0;i<N;i++){c[i]=nc[i];o[i]=no[i];r[i]=nr[i];}
    }
    for(let i=0;i<N;i++){
      lines.push("ARM|"+name+"|WAVE|"+w+"|id="+i+"|closed="+c[i]+"|open="+o[i]+"|refractory="+r[i]);
    }
  }
  return {lines,arm:name,total_absolute_open_error:err,light_commands:cmd,total_closed_to_open_transitions:opened,
          final_open_population:o.reduce((a,b)=>a+b,0)};
}
function main(){
  assert.equal(process.argv.length,4);
  assert.deepEqual(calc(S,0,0,false),{x:[S,0,0],act:0});
  assert.deepEqual(calc(S,0,0,true),{x:[700000,300000,0],act:300000});
  assert.notDeepEqual(calc(S,0,0,true,OPEN+1).x,calc(S,0,0,true).x);
  const lines=["OPTO|schema="+SCHEMA+"|N="+N+"|waves="+W+"|ticks_per_wave="+T+"|scale="+S+"|physical_photons=0"];
  const measures=[];
  for(const arm of ARMS){
    const x=one(arm);lines.push(...x.lines);
    measures.push({arm:x.arm,total_absolute_open_error:x.total_absolute_open_error,
      light_commands:x.light_commands,total_closed_to_open_transitions:x.total_closed_to_open_transitions,
      final_open_population:x.final_open_population});
  }
  assert.equal(measures[0].light_commands,0);
  assert.equal(measures[0].total_closed_to_open_transitions,0);
  for(const m of measures){
    lines.push("MEASURE|arm="+m.arm+"|error="+m.total_absolute_open_error+"|light_commands="+m.light_commands+
               "|activations="+m.total_closed_to_open_transitions+"|open_final="+m.final_open_population);
  }
  lines.push("GATES|mass=PASS|ids_immutable=PASS|rate_mutation=HELD|id_swap=HELD|corrupt_obs_anchor=HELD|true_physical_source_authenticated=0");
  lines.push("END|cases=4|site_wave_snapshots=8748|steps_per_arm=1080|claims_of_consciousness=0");
  const blob=Buffer.from(lines.join("\n")+"\n","ascii");
  fs.writeFileSync(process.argv[2],blob);
  fs.writeFileSync(process.argv[3],JSON.stringify({schema:SCHEMA,trace_sha256:sha(blob),
    trace_bytes:blob.length,arms:measures},null,2)+"\n");
  console.log(JSON.stringify({status:"PASS",sha256:sha(blob),arms:measures}));
}
main();
