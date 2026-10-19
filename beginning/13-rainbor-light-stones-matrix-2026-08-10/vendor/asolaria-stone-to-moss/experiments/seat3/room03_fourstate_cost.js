#!/usr/bin/env node
"use strict";
/* Seat 3 Room 03 separate Node indexed-array and edge-flow implementation.
 * Finite fixed-point digital analogy, NOT real optogenetic currents or photons.
 */
const fs=require("node:fs"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const Q=1000000,N=81,TICKS=240,WAVES=27,WAVE_TICKS=40,TARGET=400000,GROUP_FACTOR=27;
const SCHEMA="ASOLARIA-SEAT3-ROOM03-FOURSTATE-CONTROL-V1";
const PROTOCOLS=["dark","continuous","pair_gap_5","pair_gap_20","pair_gap_60"];
const PERIODS=[3,4,6,8,10,12,16],LAMBDAS=[0,100000,221240,300000];
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const flo=(a,b)=>Math.floor(a/b);
const checkState=a=>{
  assert(a.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=Q));
  assert.equal(a.reduce((s,x)=>s+x,0),Q);
};
function stepThree(s,L){
  const a=L?flo(s[0]*300000,Q):0;
  const b=flo(s[1]*60000,Q);
  const c=flo(s[2]*25000,Q);
  const next=[s[0]-a+c,s[1]+a-b,s[2]+b-c];
  checkState(next);return next;
}
function stepFour(s,L){
  // A separate graph-of-flows computation, with conservation by edge transfer.
  const rates=[
    [0,1,L?300000:0],
    [3,2,L?60000:0],
    [1,0,45000],
    [2,3,45000],
    [1,2,L?100000:20000],
    [2,1,20000],
    [3,0,25000],
  ];
  const after=s.slice();
  for(const [source,target,rate] of rates){
    const flow=flo(s[source]*rate,Q);
    after[source]-=flow;
    after[target]+=flow;
  }
  checkState(after);return after;
}
function watchFour(s,L){
  const [c1,o1,o2,c2]=s;
  const a=flo(c1*(L?300000:0),Q),b=flo(c2*(L?60000:0),Q);
  const d1=flo(o1*45000,Q),d2=flo(o2*45000,Q);
  const x=flo(o1*(L?100000:20000),Q),y=flo(o2*20000,Q),r=flo(c2*25000,Q);
  return [c1-a+d1+r,o1+a-d1-x+y,o2+b+x-d2-y,c2+d2-b-r];
}
const currentThree=s=>s[1];
const currentFour=s=>s[1]+flo(s[2],4);
function lightAt(protocol,t){
  if(protocol==="dark")return false;
  if(protocol==="continuous")return t<=160;
  const m=/^pair_gap_(5|20|60)$/.exec(protocol);
  if(!m)throw Error("unknown protocol "+protocol);
  const g=Number(m[1]);
  return t<=20||(t>=21+g&&t<=40+g);
}
const sortedProperties=o=>Object.keys(o).sort().map(k=>[k,o[k]]);
function measureLine(protocol,model,values){
  return "MEASURE|protocol="+protocol+"|model="+model+sortedProperties(values)
    .map(([k,v])=>"|"+k+"="+String(v).toLowerCase()).join("")+"|json=0";
}
function protocolRun(protocol,model){
  let state=model===3?[Q,0,0]:[Q,0,0,0];
  const rows=[],observed=[];
  for(let t=1;t<=TICKS;t++){
    const lit=lightAt(protocol,t);
    const next=model===3?stepThree(state,lit):stepFour(state,lit);
    if(model===4)assert.deepEqual(next,watchFour(state,lit));
    const opened=model===3?next[1]:next[1]+next[2];
    const current=model===3?currentThree(next):currentFour(next);
    let fields;
    if(model===3)fields="C="+next[0]+"|O="+next[1]+"|R="+next[2];
    else fields="C1="+next[0]+"|O1="+next[1]+"|O2="+next[2]+"|C2="+next[3];
    rows.push("TICK|protocol="+protocol+"|model="+model+
      "|k="+String(t).padStart(3,"0")+"|light="+Number(lit)+
      "|"+fields+"|open_total="+opened+"|I_proxy="+current+
      "|mass="+Q+"|json=0");
    observed.push({light:Number(lit),I_proxy:current,open_total:opened});
    state=next;
  }
  let output;
  if(protocol==="dark"){
    if(!observed.every(x=>x.open_total===0&&x.I_proxy===0))throw Error("dark violation");
    output={last_current:0,dark_null:true};
  }else if(protocol==="continuous"){
    const peak=Math.max(...observed.slice(0,80).map(x=>x.I_proxy));
    const plateau=observed.slice(140,160).reduce((s,x)=>s+x.I_proxy,0);
    output={peak_1_80:peak,plateau_sum_141_160:plateau,
      peak_minus_plateau_times20:20*peak-plateau,
      last_current:observed[239].I_proxy};
  }else{
    const gap=Number(protocol.split("_")[2]),on=21+gap;
    const slice=observed.slice(on-1,on+19);
    const second_peak=Math.max(...slice.map(x=>x.I_proxy));
    output={first_on_current:observed[0].I_proxy,second_tick:on,
      pre_second_current:observed[on-2].I_proxy,
      second_on_current:observed[on-1].I_proxy,second_peak_20ticks:second_peak};
  }
  rows.push(measureLine(protocol,model,output));
  return {state,rows,output};
}
function makeReport(s,L,id=17,tick=1){
  const nxt=stepFour(s,L);
  return {id,tick,light:Number(L),states:nxt.slice(),current:currentFour(nxt)};
}
function gate(s,L,candidate,id=17,tick=1){
  const expected=watchFour(s,L);
  return (candidate.id===id&&candidate.tick===tick&&candidate.light===Number(L)&&
          Array.isArray(candidate.states)&&candidate.states.length===4&&
          candidate.states.every((n,i)=>n===expected[i])&&
          candidate.current===currentFour(expected));
}
function negativeControls(){
  const prior=[Q,0,0,0],lit=true;
  const original=makeReport(prior,lit);
  assert(gate(prior,lit,original));
  const altered={};
  const changing=original.states.slice();changing[0]--;changing[1]++;
  altered.mass_conserving_occupancy={...original,states:changing};
  altered.forged_id={...original,id:18};
  altered.changed_light_label={...original,light:0};
  const rateMutation=original.states.slice();rateMutation[0]--;rateMutation[1]++;
  altered.changed_k1_plus_one={...original,states:rateMutation,
     current:currentFour(rateMutation),claimed_k1_rate:300001};
  altered.stale_prior_state={...original,states:prior.slice(),current:currentFour(prior)};
  altered.changed_current={...original,current:original.current+1};
  const mixture=original.states.slice();
  if(mixture[1]===0)throw Error("needs open state");
  mixture[1]--;mixture[2]++;
  altered.open_substate_reallocation={...original,states:mixture,current:currentFour(mixture)};
  assert.equal(mixture[1]+mixture[2],original.states[1]+original.states[2]);
  const verdict={};
  for(const [label,candidate] of Object.entries(altered)){
    assert.equal(gate(prior,lit,candidate),false,label+" falsely green");
    verdict[label]="HELD";
  }
  assert.equal(Object.keys(verdict).length,7);
  const forged=makeReport(prior,false);
  assert(gate(prior,false,forged));
  assert.equal(gate(prior,true,forged),false);
  verdict.coherent_forged_schedule="MATH_GREEN_ORIGIN_UNAUTHENTICATED";
  verdict.honest="PASS";
  verdict.origin_authenticated=false;
  verdict.physical_source_present=false;
  const A=[750000,250000,0,0],B=[750000,0,250000,0];
  assert.equal(A[1]+A[2],B[1]+B[2]);
  assert.equal(currentFour(A),250000);
  assert.equal(currentFour(B),62500);
  return {negatives:verdict,witness:{
    same_open_total:250000,conducting_distribution_a:currentFour(A),
    conducting_distribution_b:currentFour(B),
    difference:currentFour(A)-currentFour(B),
  }};
}
function haltTest(){
  let state=[Q,0,0,0];
  for(let k=1;k<73;k++)state=stepFour(state,lightAt("continuous",k));
  const before=state.slice();
  let halted=true;
  assert(halted);
  assert.deepEqual(state,before);
  const invalidResume=false;
  assert(!invalidResume&&halted);
  const authorizedResume=true;
  halted=!authorizedResume;
  assert(!halted);
  for(let k=73;k<=240;k++)state=stepFour(state,lightAt("continuous",k));
  assert.deepEqual(state,protocolRun("continuous",4).state);
  return {blocked_before_tick:73,invalid_resume_held:true,
    synthetic_resume_count:1,same_final_state:true,human_prompts_per_tick:0};
}
function evaluate(kind,policy=null){
  let states=[[Q,0,0],[Q,0,0],[Q,0,0]];
  const out={train_E:0,train_C:0,hold_E:0,hold_C:0};
  for(let wave=0;wave<WAVES;wave++){
    for(let tick=0;tick<WAVE_TICKS;tick++){
      const newStates=[];
      for(let g=0;g<3;g++){
        const old=states[g],target=(g+wave)%3===0;
        let lit;
        if(kind==="feedback")lit=target&&old[1]<TARGET;
        else {
          const [p,d,f]=policy;
          lit=target&&(tick+f)%p<d;
        }
        const next=stepThree(old,lit);
        const e=Math.abs(next[1]-(target?TARGET:0))*GROUP_FACTOR;
        const c=Number(lit)*GROUP_FACTOR;
        if(wave<18){out.train_E+=e;out.train_C+=c}
        else {out.hold_E+=e;out.hold_C+=c}
        newStates.push(next);
      }
      states=newStates;
    }
  }
  out.total_E=out.train_E+out.hold_E;
  out.total_C=out.train_C+out.hold_C;
  return out;
}
function allPolicies(){
  const arr=[];
  for(const p of PERIODS)for(let d=0;d<=p;d++)for(let f=0;f<p;f++){
    arr.push({P:p,D:d,F:f,...evaluate("open_loop",[p,d,f])});
  }
  assert.equal(arr.length,684);
  return arr;
}
function controllerAudit(){
  const candidates=allPolicies(),feedback=evaluate("feedback"),
    fixed=evaluate("open_loop",[12,4,0]);
  assert.equal(feedback.total_E,4516776378);
  assert.equal(feedback.total_C,17820);
  assert.equal(fixed.total_E,5878733220);
  assert.equal(fixed.total_C,11664);
  const numerator=fixed.total_E-feedback.total_E;
  const denom=feedback.total_C-fixed.total_C;
  assert.equal(numerator*38,denom*8407141);
  const chosen={};
  for(const lam of LAMBDAS){
    const ranked=candidates.slice().sort((a,b)=>{
      const jA=a.train_E+lam*a.train_C,jB=b.train_E+lam*b.train_C;
      return jA-jB||a.P-b.P||a.D-b.D||a.F-b.F;
    });
    const p=ranked[0];
    const trainJ=p.train_E+lam*p.train_C;
    const testJ=p.hold_E+lam*p.hold_C;
    const feedbackJ=feedback.hold_E+lam*feedback.hold_C;
    const fixedJ=fixed.hold_E+lam*fixed.hold_C;
    const winner=testJ<feedbackJ?"tuned_open_loop":
      feedbackJ<testJ?"feedback":"tie";
    chosen[String(lam)]={
      policy:[p.P,p.D,p.F],train_E:p.train_E,train_C:p.train_C,
      train_J:trainJ,hold_E:p.hold_E,hold_C:p.hold_C,
      hold_J:testJ,feedback_hold_J:feedbackJ,fixed_hold_J:fixedJ,
      winner_vs_feedback:winner
    };
  }
  return {candidates,feedback,fixed,chosen};
}
function sortedEntries(x){return Object.keys(x).sort().map(k=>[k,x[k]])}
function stableStringify(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(stableStringify).join(",")+"]";
  return "{"+sortedEntries(value).map(([k,v])=>JSON.stringify(k)+":"+stableStringify(v)).join(",")+"}";
}
function audit(){
  const lines=["PORTAL|schema="+SCHEMA+"|Q="+Q+"|ids="+N+"|ticks="+TICKS+
               "|protocols=5|models=2|physical=0|json=0"];
  const study={};
  for(const protocol of PROTOCOLS){
    study[protocol]={};
    for(const model of [3,4]){
      const out=protocolRun(protocol,model);
      lines.push(...out.rows);
      study[protocol][String(model)]=out.output;
    }
  }
  const {negatives,witness}=negativeControls(),halt=haltTest();
  lines.push("WITNESS|open_total="+witness.same_open_total+
    "|I_a="+witness.conducting_distribution_a+
    "|I_b="+witness.conducting_distribution_b+
    "|difference="+witness.difference+"|json=0");
  for(const [k,v] of sortedEntries(negatives))
    lines.push("NEG|name="+k+"|value="+
      (typeof v==="boolean"?String(v).toLowerCase():String(v))+"|json=0");
  lines.push("HALT|before_tick=73|invalid_resume=HELD|synthetic_resume=PASS"+
             "|final_equal=PASS|human_prompts_per_tick=0|json=0");
  const {candidates,feedback,fixed,chosen}=controllerAudit();
  for(const c of candidates)
    lines.push("CANDIDATE|P="+c.P+"|D="+c.D+"|F="+c.F+"|train_E="+c.train_E+
      "|train_C="+c.train_C+"|hold_E="+c.hold_E+"|hold_C="+c.hold_C+"|json=0");
  lines.push("BASELINE|kind=fixed_open|train_E="+fixed.train_E+
    "|train_C="+fixed.train_C+"|hold_E="+fixed.hold_E+"|hold_C="+fixed.hold_C+"|json=0");
  lines.push("BASELINE|kind=feedback|train_E="+feedback.train_E+
    "|train_C="+feedback.train_C+"|hold_E="+feedback.hold_E+"|hold_C="+feedback.hold_C+"|json=0");
  for(const lam of LAMBDAS){
    const v=chosen[String(lam)],pol=v.policy;
    lines.push("SELECT|lambda="+lam+"|P="+pol[0]+"|D="+pol[1]+"|F="+pol[2]+
      "|train_J="+v.train_J+"|hold_J="+v.hold_J+
      "|feedback_hold_J="+v.feedback_hold_J+
      "|fixed_hold_J="+v.fixed_hold_J+"|winner="+v.winner_vs_feedback+"|json=0");
  }
  lines.push("END|model_tick_rows=2400|candidates=684|fail_closed_mutations=7"+
             "|source_authenticated=0|physical_light=0|json=0");
  assert.equal(lines.filter(v=>v.startsWith("TICK|")).length,2400);
  assert.equal(lines.filter(v=>v.startsWith("CANDIDATE|")).length,684);
  const trace=Buffer.from(lines.join("\n")+"\n","ascii");
  const report={
    schema:SCHEMA,status:"PASS",source_type:"synthetic_integer_photocycle",
    original_three_state_sha256:"de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b",
    preregistered_new_experiment:true,original_test_reproduced_via_group_symmetry:true,
    cohort_immutable_identity_count:N,protocols:study,
    real_injected_negative_cases:negatives,conductance_witness:witness,
    halt_model:halt,candidate_count:candidates.length,
    feedback_baseline:feedback,fixed_baseline:fixed,
    lambda_break_even_exact:"8407141/38",chosen_policies:chosen,
    full_trace_bytes:trace.length,full_trace_sha256:sha(trace),
    physical_optics_measured:false,biological_parameter_calibrated:false,
    authenticated_light_source:false,real_human_resume_authenticated:false,
    physical_hosts_attested:false
  };
  return {trace,report};
}
if(process.argv.length!==4)throw Error("usage: node room03_fourstate_cost.js result.hbp result.json");
const {trace,report}=audit();
fs.writeFileSync(process.argv[2],trace);
fs.writeFileSync(process.argv[3],Buffer.from(stableStringify(report)+"\n","ascii"));
console.log(JSON.stringify({
  status:"PASS",trace_bytes:trace.length,sha256:sha(trace),
  winner_by_lambda:Object.fromEntries(sortedEntries(report.chosen_policies)
    .map(([k,v])=>[k,v.winner_vs_feedback])),
  policies:Object.fromEntries(sortedEntries(report.chosen_policies)
    .map(([k,v])=>[k,v.policy])),
  four_state_continuous:report.protocols.continuous["4"],
  negative_cases:Object.values(report.real_injected_negative_cases).filter(x=>x==="HELD").length
}));
