#!/usr/bin/env node
"use strict";
/*
 * Seat 3 independently authored Seat 1 photocycle fixture audit.
 * Uses double-buffered Uint32Array populations, not producer imports.
 * Finite DIGITAL three-state model; no physical photons / opsin kinetics.
 */
const fs=require("node:fs");
const crypto=require("node:crypto");
const assert=require("node:assert/strict");
const N=81,W=27,T=40,M=1000000,GOAL=400000;
const RATE={open:300000,inactivate:60000,recover:25000};
const EXPECT_SHA="de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b";
const SCHEMA="ASOLARIA-SEAT1-OPTOGATE-3STATE-1080-V1";
const ARMS=["dark","open_loop","feedback_truth","feedback_corrupt"];
const sha=raw=>crypto.createHash("sha256").update(raw).digest("hex");
const floorDiv=(a,b)=>Math.floor(a/b);

// Independent rate-flow accounting in fixed-point integer populations.
function evolve(old,light,openRate=RATE.open){
  const [closed,opened,refractory]=old;
  const intoOpen=light?floorDiv(closed*openRate,M):0;
  const outOpen=floorDiv(opened*RATE.inactivate,M);
  const intoClosed=floorDiv(refractory*RATE.recover,M);
  const after=[
    closed-intoOpen+intoClosed,
    opened+intoOpen-outOpen,
    refractory+outOpen-intoClosed
  ];
  assert(after.every(x=>Number.isInteger(x)&&x>=0&&x<=M));
  assert.equal(after[0]+after[1]+after[2],M);
  return {after,intoOpen};
}

// Separate validation boundary recomputes from the frozen prior observation;
// raw reports are NOT automatically trusted as external-origin evidence.
function gate(previous,context,reported){
  const proposed=evolve(previous,context.authorizedLight).after;
  return !!(reported &&
    reported.id===context.id && reported.wave===context.wave &&
    reported.tick===context.tick &&
    reported.light===context.authorizedLight &&
    reported.closed===proposed[0] &&
    reported.open===proposed[1] &&
    reported.refractory===proposed[2]);
}
function signedReport(id,w,t,light,after){
  return {id,wave:w,tick:t,light,closed:after[0],open:after[1],refractory:after[2]};
}
function negativeControls(){
  const prev=[M,0,0],context={id:7,wave:2,tick:3,authorizedLight:true};
  const truth=evolve(prev,true).after,clean=signedReport(7,2,3,true,truth);
  assert(gate(prev,context,clean));
  const result={};
  function held(label,report){
    assert(!gate(prev,context,report),label+" incorrectly green");
    result[label]="HELD";
  }
  // Arithmetic checksum alone would accept mass-conserving C/O perturbation.
  held("mass_conserving_state_swap",{...clean,closed:clean.closed-1,open:clean.open+1});
  held("forged_id",{...clean,id:8});
  held("rate_mutation",signedReport(7,2,3,true,evolve(prev,true,RATE.open+1).after));
  held("stale_prior_state",signedReport(7,2,3,true,prev));
  held("swapped_light_input",signedReport(7,2,3,false,evolve(prev,false).after));
  held("changed_wave",{...clean,wave:3});
  held("changed_tick",{...clean,tick:2});
  result.honest="PASS";
  // Deliberately substitute both watcher's input and reporter's source.
  // Every local arithmetic gate remains green, but the published frozen
  // external stimulus schedule requires light=true, hence source trust HELD.
  const compromisedContext={...context,authorizedLight:false};
  const compromised=signedReport(7,2,3,false,evolve(prev,false).after);
  assert(gate(prev,compromisedContext,compromised));
  assert(!gate(prev,context,compromised));
  result.coherent_forged_source="MATH_GREEN_ORIGIN_UNAUTHENTICATED";
  result.authenticated_source=false;
  result.independent_optical_sensor_present=false;
  return result;
}
function simulate(arm){
  let state=new Uint32Array(N*3),buffer=new Uint32Array(N*3);
  for(let i=0;i<N;i++)state[i*3]=M;
  let error=0,commands=0,activations=0;
  const snapshots=[];
  for(let wave=0;wave<W;wave++){
    for(let tick=0;tick<T;tick++){
      for(let i=0;i<N;i++){
        const j=i*3;
        const prior=[state[j],state[j+1],state[j+2]];
        const targeted=(i+wave)%3===0;
        let light=false;
        if(arm==="open_loop")light=targeted && (tick%12<4);
        else if(arm==="feedback_truth")light=targeted && (prior[1]<GOAL);
        else if(arm==="feedback_corrupt")light=targeted && (Math.min(M,prior[1]+250000)<GOAL);
        else assert.equal(arm,"dark");
        const {after,intoOpen}=evolve(prior,light);
        buffer[j]=after[0];buffer[j+1]=after[1];buffer[j+2]=after[2];
        commands+=light?1:0;
        activations+=intoOpen;
        error+=Math.abs(after[1]-(targeted?GOAL:0));
        // The index is canonical, immutable; state changes do not rewrite it.
        assert.equal(after[0]+after[1]+after[2],M);
      }
      const priorBuffer=state;
      state=buffer;
      buffer=priorBuffer;
    }
    for(let i=0;i<N;i++){
      const j=3*i;
      snapshots.push("ARM|"+arm+"|WAVE|"+wave+"|id="+i+
                     "|closed="+state[j]+"|open="+state[j+1]+"|refractory="+state[j+2]);
    }
  }
  return {snapshots,metrics:{
    arm,total_absolute_open_error:error,light_commands:commands,
    total_closed_to_open_transitions:activations,
    final_open_population:Array.from({length:N},(_,i)=>state[i*3+1]).reduce((a,b)=>a+b,0)
  }};
}
function costAnalysis(metrics){
  const ol=metrics.find(x=>x.arm==="open_loop");
  const fb=metrics.find(x=>x.arm==="feedback_truth");
  const dE=ol.total_absolute_open_error-fb.total_absolute_open_error;
  const dC=fb.light_commands-ol.light_commands;
  assert.equal(dE,1361956842);
  assert.equal(dC,6156);
  // Exact simplified rational breakpoint, not a statistical or energy result.
  assert.equal(dE*38,dC*8407141);
  const bounds={};
  for(let lambda of [0,221240,221241]){
    const J_open=BigInt(ol.total_absolute_open_error)+BigInt(lambda)*BigInt(ol.light_commands);
    const J_feedback=BigInt(fb.total_absolute_open_error)+BigInt(lambda)*BigInt(fb.light_commands);
    bounds[String(lambda)]={winner:J_feedback<J_open?"feedback_truth":J_open<J_feedback?"open_loop":"tie",
                            margin_abs:String(J_feedback>J_open?J_feedback-J_open:J_open-J_feedback)};
  }
  assert.equal(bounds["0"].winner,"feedback_truth");
  assert.equal(bounds["221240"].winner,"feedback_truth");
  assert.equal(bounds["221241"].winner,"open_loop");
  return {error_reduction:dE,extra_light_commands:dC,crossover_exact:"8407141/38",
          crossover_in_aggregate_error_units_per_command:true,lambda_checks:bounds};
}
function main(){
  assert.equal(process.argv.length,4,
    "usage: node seat3_peer_seat1_photocycle.js full.hbp metrics.json");
  const negatives=negativeControls();
  const lines=["OPTO|schema="+SCHEMA+"|N="+N+"|waves="+W+
               "|ticks_per_wave="+T+"|scale="+M+"|physical_photons=0"];
  const measures=[];
  for(let arm of ARMS){
    const result=simulate(arm);
    lines.push(...result.snapshots);
    measures.push(result.metrics);
  }
  assert.equal(lines.length-1,8748);
  assert.equal(measures[0].light_commands,0);
  assert.equal(measures[0].total_closed_to_open_transitions,0);
  for(let m of measures){
    lines.push("MEASURE|arm="+m.arm+"|error="+m.total_absolute_open_error+
               "|light_commands="+m.light_commands+
               "|activations="+m.total_closed_to_open_transitions+
               "|open_final="+m.final_open_population);
  }
  // Producer canonical lines; these labels alone do not prove actual negative cases.
  lines.push("GATES|mass=PASS|ids_immutable=PASS|rate_mutation=HELD|id_swap=HELD"+
             "|corrupt_obs_anchor=HELD|true_physical_source_authenticated=0");
  lines.push("END|cases=4|site_wave_snapshots=8748|steps_per_arm=1080|claims_of_consciousness=0");
  const trace=Buffer.from(lines.join("\n")+"\n","ascii");
  const traceSHA=sha(trace);
  assert.equal(traceSHA,EXPECT_SHA,
    "Seat 3 independently authored full trace differs from frozen Seat 1 result");
  const expected=[
    [11664000000,0],
    [5878733220,11664],
    [4516776378,17820],
    [8221918824,2835]
  ];
  measures.forEach((m,i)=>{
    assert.equal(m.total_absolute_open_error,expected[i][0],"error drift "+m.arm);
    assert.equal(m.light_commands,expected[i][1],"light commands drift "+m.arm);
  });
  const cost=costAnalysis(measures);
  const audit={
    schema:"ASOLARIA-SEAT3-PEER-SEAT1-PHOTOCYCLE-V1",
    status:"PASS",producer_ref:"PR50@19f21a880d16e84902d157a6d3bc4bcd908dc888",
    producer_trace_sha256:EXPECT_SHA,producer_rows:8748,
    source_authentication:false,physical_light_measured:false,
    peer_implementation:"independent Node22 Uint32Array double-buffered integer dynamics",
    rows:8748,trace_sha256:traceSHA,trace_bytes:trace.length,
    arms:measures,additional_real_tamper_controls:negatives,
    cost_frontier:cost,claims_no_physical_hardware:true
  };
  fs.writeFileSync(process.argv[2],trace);
  fs.writeFileSync(process.argv[3],JSON.stringify(audit,null,2)+"\n");
  console.log(JSON.stringify({status:"PASS",trace_bytes:trace.length,
    sha256:traceSHA,rows:8748,cost,negative_controls:negatives}));
}
main();
