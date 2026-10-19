#!/usr/bin/env node
"use strict";
/* Independently authored Seat 3 Node integer-gate simulator.
   No physiological calibration and no physical light/opsin expression. */
const fs=require("fs");
const crypto=require("crypto");
const Q=1024;
const SCHEMA="ASOLARIA-SEAT3-OPTOGATE-TOY-V1";
const ARMS=["dark","blue","red","mixed"];
const PROFILES={
 "ChR2-like": {blue:896,red:32,close:256},
 "ChRmine-like": {blue:192,red:896,close:64},
 "absent": {blue:0,red:0,close:256}
};
const FAULTS=new Map([[77,"gate"],[161,"pulse"],[181,"id"]]);
const FAULT_ID="E:0:0:0:0";
const sha=buf=>crypto.createHash("sha256").update(buf).digest("hex");

function start(){
 const e=[];
 for(let t=0;t<3;t++)for(let c=0;c<3;c++)for(let s=0;s<3;s++)for(let l=0;l<3;l++)
   e.push({id:["E",t,c,s,l].join(":"),color:c,kind:["ChR2-like","ChRmine-like","absent"][c],
           gate:0,voltage:0,refractory:0,spikes:0});
 if(e.length!==81||new Set(e.map(x=>x.id)).size!==81)throw Error("IDs");
 return e;
}
function stimulus(t,arm){
 const phase=t%80;
 const blue=(phase>=1&&phase<=8&&(arm==="blue"||arm==="mixed"))?Q:0;
 const red=(phase>=25&&phase<=32&&(arm==="red"||arm==="mixed"))?Q:0;
 return {blue,red,label:blue?"blue":(red?"red":"dark")};
}
function proposer(old,pulse){
 const profile=PROFILES[old.kind];
 const activation=Math.floor((pulse.blue*profile.blue+pulse.red*profile.red)/Q);
 const addition=Math.floor((Q-old.gate)*activation/Q);
 const removal=Math.ceil(old.gate*profile.close/Q);
 const gate=Math.max(0,Math.min(Q,old.gate+addition-removal));
 const potential=Math.floor(old.voltage*7/8)+Math.floor(gate/16);
 if(old.refractory>0)return {id:old.id,pulse:pulse.label,gate,voltage:potential,
                              refractory:old.refractory-1,spikes:old.spikes};
 if(potential>=192)return {id:old.id,pulse:pulse.label,gate,voltage:0,refractory:3,
                            spikes:old.spikes+1};
 return {id:old.id,pulse:pulse.label,gate,voltage:potential,refractory:0,spikes:old.spikes};
}
function watcher(prev,input){
 // Separate expression and computation path: derive expected directly from immutable prior state.
 const ps=PROFILES[prev.kind];
 let gate=prev.gate;
 const photonGain=Math.floor((ps.blue*input.blue+ps.red*input.red)/1024);
 gate+=Math.floor((1024-gate)*photonGain/1024);
 gate-=Math.floor((prev.gate*ps.close+1023)/1024);
 gate=Math.max(0,Math.min(1024,gate));
 const voltage=prev.voltage-Math.ceil(prev.voltage/8)+Math.floor(gate/16);
 if(prev.refractory!==0){
   return {id:prev.id,pulse:input.label,gate,voltage,
           refractory:prev.refractory-1,spikes:prev.spikes};
 }
 if(voltage>=192){
   return {id:prev.id,pulse:input.label,gate,voltage:0,refractory:3,spikes:prev.spikes+1};
 }
 return {id:prev.id,pulse:input.label,gate,voltage,refractory:0,spikes:prev.spikes};
}
function digest(nodes,arm,tick){
 const parts=["SNAPSHOT|arm="+arm+"|tick="+tick];
 for(const p of [...nodes].sort((a,b)=>a.id<b.id?-1:(a.id>b.id?1:0)))
   parts.push([p.id,p.color,p.kind,p.gate,p.voltage,p.refractory,p.spikes].join("|"));
 return sha(Buffer.from(parts.join("\n")+"\n","ascii"));
}
function checkEqual(a,b){
 const fields=["id","pulse","gate","voltage","refractory","spikes"];
 return fields.every(k=>a[k]===b[k]);
}
function oneArm(arm,withFaults=false,emit=true){
 const entities=start();
 const originals=new Map(entities.map(x=>[x.id,[x.id,x.color,x.kind].join("|")]));
 const lines=[],events=[],probe={};
 let positiveTicks=0;
 for(let tick=1;tick<=240;tick++){
   const pulse=stimulus(tick,arm);
   const past=entities.map(x=>({...x}));
   for(let i=0;i<past.length;i++){
     const old=past[i],real=entities[i];
     const truth=watcher(old,pulse),report=proposer(old,pulse);
     if(!checkEqual(truth,report))throw Error("unexpected honest discrepancy "+arm+"/"+tick);
     if(withFaults&&arm==="mixed"&&FAULTS.has(tick)&&old.id===FAULT_ID){
       const fault=FAULTS.get(tick);
       if(fault==="gate")report.gate++;
       else if(fault==="pulse")report.pulse="red";
       else report.id+="-FORGED";
     }
     if(!checkEqual(truth,report)){
       if(old.id!==FAULT_ID||!FAULTS.has(tick)||arm!=="mixed")throw Error("unknown fault");
       const fault=FAULTS.get(tick);
       events.push([tick,old.id,fault]);
       if(emit)lines.push("CORRECTED|arm=mixed|tick="+String(tick).padStart(3,"0")+
           "|id="+old.id+"|field="+fault+
           "|watcher=REJECT_RECOMPUTE|identity_changed=0|json=0");
     }
     real.gate=truth.gate;real.voltage=truth.voltage;
     real.refractory=truth.refractory;real.spikes=truth.spikes;
     if(real.gate<0||real.gate>1024||real.voltage<0||real.voltage>1024)throw Error("bounds");
     if((real.kind==="absent"||arm==="dark")&&
       (real.gate!==0||real.voltage!==0||real.spikes!==0))throw Error("no-input control");
     if([real.id,real.color,real.kind].join("|")!==originals.get(old.id))
       throw Error("identity drift");
   }
   if(entities.some(x=>x.gate>0))positiveTicks++;
   if(arm==="blue"&&tick===1){
      probe.blue_chR2_t1=entities.find(e=>e.id==="E:0:0:0:0").gate;
      probe.blue_chRmine_t1=entities.find(e=>e.id==="E:0:1:0:0").gate;
   }
   if(arm==="red"&&tick===25){
      probe.red_chR2_t25=entities.find(e=>e.id==="E:0:0:0:0").gate;
      probe.red_chRmine_t25=entities.find(e=>e.id==="E:0:1:0:0").gate;
   }
   if(emit)lines.push("TICK|arm="+arm+"|k="+String(tick).padStart(3,"0")+
                      "|state_sha256="+digest(entities,arm,tick)+
                      "|sum_gate="+entities.reduce((s,e)=>s+e.gate,0)+
                      "|sum_spikes="+entities.reduce((s,e)=>s+e.spikes,0)+"|json=0");
 }
 const final=digest(entities,arm,240);
 const totalSpikes=entities.reduce((s,e)=>s+e.spikes,0);
 const totalGate=entities.reduce((s,e)=>s+e.gate,0);
 const result={arm,final_sha256:final,corrections:events.length,
               total_gate:totalGate,total_spikes:totalSpikes,
               positive_ticks:positiveTicks,probe,
               immutable_identities:81,per_tick_operator_prompts:0};
 if(emit)lines.push("SUMMARY|arm="+arm+"|final_sha256="+final+
                    "|spikes="+totalSpikes+"|positive_ticks="+positiveTicks+
                    "|corrections="+events.length+"|json=0");
 return {result,lines,events};
}
function relaxation(close){
 let g=1024;
 for(let j=0;j<8;j++)g-=Math.floor((g*close+1023)/1024);
 return g;
}
function audit(){
 const lines=["PORTAL|schema="+SCHEMA+"|identities=81|ticks_per_arm=240"+
              "|physical_light=0|neural_cells=0|operator_prompts_per_tick=0|json=0"];
 const summaries={};
 for(const arm of ARMS){
   const {result,lines:items,events}=oneArm(arm,arm==="mixed");
   summaries[arm]=result; lines.push(...items);
   if(arm==="mixed"&&JSON.stringify(events)!==
       JSON.stringify([[77,FAULT_ID,"gate"],[161,FAULT_ID,"pulse"],[181,FAULT_ID,"id"]]))
       throw Error("missing fault controls");
 }
 const clean=oneArm("mixed",false,false).result;
 if(clean.final_sha256!==summaries.mixed.final_sha256)throw Error("corrected mismatch");
 if(summaries.dark.total_spikes!==0||summaries.dark.total_gate!==0||
    summaries.dark.positive_ticks!==0)throw Error("dark null");
 if(!(summaries.blue.probe.blue_chR2_t1>summaries.blue.probe.blue_chRmine_t1))
    throw Error("blue selectivity");
 if(!(summaries.red.probe.red_chRmine_t25>summaries.red.probe.red_chR2_t25))
    throw Error("red selectivity");
 if(summaries.blue.positive_ticks===0||summaries.red.positive_ticks===0||
    summaries.mixed.total_spikes<=0)throw Error("activation missing");
 const bd=relaxation(256),rd=relaxation(64);
 if(!(rd>bd))throw Error("slow closure");
 lines.push("CONTROL|name=matched_gate_dark_relaxation|ticks=8|chR2_like="+bd+
            "|chRmine_like="+rd+"|slower_chRmine_like=1|json=0");
 lines.push("CONTROL|name=source_provenance|math_replay=PASS"+
            "|authenticated_physical_optical_origin=0|json=0");
 lines.push("END|arms=4|full_ticks=960|initial_ids=81|stable_ids=1"+
            "|corrections=3|missing_receptor_never_activates=1"+
            "|dark_null=PASS|independent_watcher=TOY_RECOMPUTATION"+
            "|physical_light_claim=0|json=0");
 if(lines.filter(s=>s.startsWith("TICK|")).length!==960||
    lines.filter(s=>s.startsWith("CORRECTED|")).length!==3||
    lines.filter(s=>s.startsWith("SUMMARY|")).length!==4)throw Error("trace totals");
 const hbp=Buffer.from(lines.join("\n")+"\n","ascii");
 const metrics={schema:SCHEMA,status:"PASS",source_references:[
   "https://www.nature.com/articles/nn1525",
   "https://www.nature.com/articles/s41467-022-32441-7"],
   identities:81,ticks_per_arm:240,total_ticks:960,arms:summaries,
   corrected_faults:[77,161,181],blue_dark_remaining:bd,red_dark_remaining:rd,
   mixed_corrected_equals_clean:true,trace_bytes:hbp.length,trace_sha256:sha(hbp),
   physical_hosts_attested:false,physical_light_tested:false,biological_validation:false,
   qprism_software_connected:false};
 return {hbp,metrics};
}
if(process.argv.length!==4){
 console.error("usage: node seat3_opto_toy.js output.hbp metrics.json");process.exit(2);
}
const {hbp,metrics}=audit();
fs.writeFileSync(process.argv[2],hbp);
fs.writeFileSync(process.argv[3],JSON.stringify(metrics,null,2)+"\n");
console.log(JSON.stringify({status:"PASS",bytes:hbp.length,sha256:sha(hbp),
  totals:Object.fromEntries(ARMS.map(x=>[x,metrics.arms[x].total_spikes])),
  faults:metrics.corrected_faults,dark_recovery:[metrics.blue_dark_remaining,metrics.red_dark_remaining]}));
