#!/usr/bin/env node
"use strict";
/* Seat 3 independent Node array/indexed model for the frozen synthetic universe.
   This does not run a real photon/QLED system, HTTP/WASM, or physical N-Nest agents. */
const fs=require("fs");
const crypto=require("crypto");
const SCHEMA="ASOLARIA-SEAT3-AUTONOMOUS-IDENTITY-V1";
const LAW_BLOB="f84710d3018882b7282b9fda227638c57568ffe4";
const TICKS=1080;
const faults=new Map([[31,"light"],[401,"phase"],[799,"position"],[1000,"id"]]);
const meta=["id","parent","root","color","depth"];
const fields=["id","parent","root","color","depth","light","phase","position"];
function sha(buffer){return crypto.createHash("sha256").update(buffer).digest("hex")}
function initial(){
 const arr=[];
 for(let t=0;t<3;t++)for(let c=0;c<3;c++)for(let s=0;s<3;s++)for(let l=0;l<3;l++){
   const id=["E",t,c,s,l].join(":");
   arr.push({id,parent:null,root:id,color:c,depth:0,
     light:(17*t+31*c+43*s+13*l)%256,
     phase:(9*t+3*c+s+l)%81,position:(t+c+s+l)%27});
 }
 return arr;
}
function stateSha(nodes,tick){
 const arr=[...nodes].sort((a,b)=>a.id<b.id?-1:(a.id>b.id?1:0));
 const lines=["tick="+tick];
 for(const node of arr)lines.push(fields.map(f=>node[f]===null?"-":String(node[f])).join("|"));
 return sha(Buffer.from(lines.join("\n")+"\n","ascii"));
}
function propose(v,neighbor,parentLight,k){
 const light=(5*v.light+3*neighbor.light+parentLight+k+v.color)%256;
 return {id:v.id,light,phase:(v.phase+light+(k%81))%81,
   position:(v.position+(light%3)+1)%27};
}
function verifyFromPrevious(v,adjacentLight,parentLight,k){
 // Watcher computes directly from the frozen prior state, never trusting proposed bytes.
 const light=(k+v.color+parentLight+3*adjacentLight+5*v.light)&255;
 return {id:v.id,light,
   phase:((k%81)+light+v.phase)%81,
   position:(1+(light%3)+v.position)%27};
}
class Halted extends Error {}
class Universe {
 constructor(faulted,log=false){
   this.entities=initial();
   this.baseIds=this.entities.map(e=>e.id).sort();
   this.birth=new Map(this.entities.map(e=>[e.id,meta.map(k=>e[k]).join("|")]));
   this.tick=0;this.spawns=0;this.lastSpawn=null;
   this.faulted=faulted;this.log=log;this.records=[];this.corrections=[];
   this.moved=0;this.maxDepth=0;this.operatorPrompts=0;this.grants=1;
   this.halted=false;this.haltCount=0;this.resumeGrants=0;
   this.invalidResumes=0;this.deniedHardware=0;this.deniedBudget=0;
 }
 byId(){return new Map(this.entities.map(e=>[e.id,e]))}
 lineage(id){
   const lookup=this.byId(),reversed=[];
   while(id!==null){reversed.push(id);id=lookup.get(id).parent}
   return reversed.reverse().join(">");
 }
 spawn(k){
   if(this.entities.length>=108){this.deniedBudget++;return false}
   const lookup=this.byId();
   const parentId=this.lastSpawn!==null && lookup.get(this.lastSpawn).depth<7
     ? this.lastSpawn:this.baseIds[(this.spawns*7)%81];
   const parent=lookup.get(parentId),id="V:"+String(k).padStart(4,"0"),depth=parent.depth+1;
   if(lookup.has(id)||depth<1||depth>7)throw Error("bad child");
   const child={id,parent:parentId,root:parent.root,color:parent.color,depth,
     light:(parent.light+k)%256,phase:(parent.phase+k)%81,position:parent.position};
   this.entities.push(child);this.birth.set(id,meta.map(k=>child[k]).join("|"));
   this.spawns++;this.lastSpawn=id;this.maxDepth=Math.max(depth,this.maxDepth);
   if(this.log)this.records.push("SPAWN|tick="+String(k).padStart(4,"0")+
     "|id="+id+"|parent="+parentId+"|depth="+depth+"|policy=PREAUTHORIZED|json=0");
   return true;
 }
 requestExternalHardware(){this.deniedHardware++;return false}
 halt(){this.halted=true;this.haltCount++}
 resume(grant){if(!grant){this.invalidResumes++;return false}
   if(!this.halted)throw Error("unexpected resume");
   this.halted=false;this.resumeGrants++;return true}
 step(k){
   if(this.halted)throw new Halted("HALT");
   if(k!==this.tick+1||k<1||k>TICKS)throw Error("bad tick");
   const old=[...this.entities].sort((a,b)=>a.id<b.id?-1:(a.id>b.id?1:0)).map(x=>({...x}));
   const lookup=new Map(old.map(e=>[e.id,e]));
   let target=null;
   if(this.faulted&&faults.has(k)){
     if(k===1000)target=[...old].sort((a,b)=>b.depth-a.depth||(a.id<b.id?-1:(a.id>b.id?1:0)))[0].id;
     else target=old[k%old.length].id;
   }
   const actual=new Map(this.entities.map(e=>[e.id,e]));
   for(let j=0;j<old.length;j++){
     const e=old[j],neighbor=old[(j+1)%old.length];
     const parentLight=e.parent===null?0:lookup.get(e.parent).light;
     const reported=propose(e,neighbor,parentLight,k);
     const expected=verifyFromPrevious(e,neighbor.light,parentLight,k);
     if(JSON.stringify(reported)!==JSON.stringify(expected))throw Error("predictor-watcher disagreement");
     if(e.id===target){
       const type=faults.get(k);
       if(type==="id")reported.id+="-FORGED";
       else reported[type]+=1;
     }
     if(JSON.stringify(reported)!==JSON.stringify(expected)){
       if(e.id!==target)throw Error("unexpected correction");
       const type=faults.get(k),path=this.lineage(e.id);
       if(!path.endsWith(e.id))throw Error("correction path");
       this.corrections.push({tick:k,id:e.id,field:type,path});
       if(this.log)this.records.push("CORRECTED|tick="+String(k).padStart(4,"0")+
         "|id="+e.id+"|field="+type+"|path="+path+
         "|raw_report_rejected=1|source_authenticated=0|json=0");
     }
     const real=actual.get(e.id);
     if(real.light!==expected.light||real.phase!==expected.phase||real.position!==expected.position)this.moved++;
     real.light=expected.light;real.phase=expected.phase;real.position=expected.position;
   }
   this.tick=k;
   if(k%40===0&&!this.spawn(k))throw Error("unexpected budget denial");
   if(this.entities.length!==this.birth.size)throw Error("identity count");
   for(const e of this.entities)if(this.birth.get(e.id)!==meta.map(key=>e[key]).join("|"))
     throw Error("immutable identity drift");
   if(this.log)this.records.push("TICK|k="+String(k).padStart(4,"0")+
     "|entities="+this.entities.length+"|state_sha256="+stateSha(this.entities,k)+"|json=0");
 }
 run(end){for(let tick=this.tick+1;tick<=end;tick++)this.step(tick)}
}
function same(a,b){
 return JSON.stringify([...a].sort((x,y)=>x.id<y.id?-1:(x.id>y.id?1:0)))===
        JSON.stringify([...b].sort((x,y)=>x.id<y.id?-1:(x.id>y.id?1:0)));
}
function audit(){
 const baseline=new Universe(false),faulted=new Universe(true,true),paused=new Universe(true);
 baseline.run(TICKS);faulted.run(TICKS);
 paused.run(776);const before=stateSha(paused.entities,paused.tick);
 paused.halt();let held=false;
 try{paused.step(777)}catch(e){if(e instanceof Halted)held=true;else throw e}
 if(!held||paused.tick!==776||stateSha(paused.entities,paused.tick)!==before)throw Error("HALT broken");
 if(paused.resume(false)!==false||!paused.halted||paused.tick!==776)throw Error("invalid resume accepted");
 if(paused.resume(true)!==true)throw Error("resume failure");
 paused.run(TICKS);
 const finalHash=stateSha(baseline.entities,TICKS);
 if(finalHash!==stateSha(faulted.entities,TICKS)||finalHash!==stateSha(paused.entities,TICKS)||
   !same(baseline.entities,faulted.entities)||!same(faulted.entities,paused.entities))throw Error("not restored");
 if(faulted.corrections.length!==4||paused.corrections.length!==4||
   JSON.stringify(faulted.corrections)!==JSON.stringify(paused.corrections)||
   faulted.corrections.map(v=>v.tick).join(",")!=="31,401,799,1000")throw Error("fault controls");
 if(baseline.maxDepth!==7||faulted.maxDepth!==7||[baseline,faulted,paused].some(u=>u.tick!==TICKS||u.entities.length!==108||u.spawns!==27||u.moved<=1080))throw Error("transition counts");
 if(new Set(faulted.entities.map(e=>e.id)).size!==108||
   !faulted.corrections[3].path.includes(">")||
   faulted.operatorPrompts!==0||paused.operatorPrompts!==0)throw Error("identity/delegation");
 if(faulted.requestExternalHardware()!==false||faulted.spawn(1081)!==false||
   faulted.deniedHardware!==1||faulted.deniedBudget!==1)throw Error("scope failed");
 if(paused.haltCount!==1||paused.resumeGrants!==1||paused.invalidResumes!==1)throw Error("halt counters");
 const header="PORTAL|schema="+SCHEMA+"|base=81|ticks=1080|law_blob="+LAW_BLOB+
   "|physical=0|operator_grants=1|json=0";
 const end="END|ticks=1080|initial=81|children=27|final_entities=108|max_depth=7"+
   "|corrections=4|baseline_sha256="+finalHash+
   "|restored_equals_baseline=1|operator_prompts_per_tick=0|real_hardware=0|physical_hosts=0|json=0";
 const rows=[header,...faulted.records,
   "HALT|before_tick=777|blocked_tick=777|no_advance=1|resume_grants=1|cooperative_boundary_only=1|json=0",
   "POLICY|denied_external_hardware=1|denied_109th_child=1|operator_prompts_per_tick=0|json=0",end];
 if(rows.filter(x=>x.startsWith("TICK|")).length!==1080||
    rows.filter(x=>x.startsWith("SPAWN|")).length!==27||
    rows.filter(x=>x.startsWith("CORRECTED|")).length!==4)throw Error("event rows");
 const raw=Buffer.from(rows.join("\n")+"\n","ascii");
 const metrics={schema:SCHEMA,scope:"finite synthetic light-state simulation, NOT physical light",
   law_blob_sha1:LAW_BLOB,status:"PASS",initial_entities:81,final_entities:108,
   virtual_spawns:27,max_depth:7,ticks:1080,corrections:faulted.corrections,
   baseline_final_sha256:finalHash,faulted_final_sha256:finalHash,
   paused_resumed_final_sha256:finalHash,operator_prompts_per_tick:0,
   standing_policy_grants:1,halt_blocked_tick:777,invalid_resume_denials:1,
   authorized_resume_grants:1,denied_hardware:1,denied_budget:1,
   movement_events:faulted.moved,trace_bytes:raw.length,trace_sha256:sha(raw),
   physical_host_attested:false,source_authenticated:false};
 return {raw,metrics};
}
if(process.argv.length!==4){console.error("usage: node seat3_autonomous_universe.js out.hbp metrics.json");process.exit(2)}
const {raw,metrics}=audit();
fs.writeFileSync(process.argv[2],raw);fs.writeFileSync(process.argv[3],JSON.stringify(metrics,null,2)+"\n");
const compact=Object.fromEntries(Object.entries(metrics).filter(([k])=>k!=="corrections"));
console.log(JSON.stringify(compact));
