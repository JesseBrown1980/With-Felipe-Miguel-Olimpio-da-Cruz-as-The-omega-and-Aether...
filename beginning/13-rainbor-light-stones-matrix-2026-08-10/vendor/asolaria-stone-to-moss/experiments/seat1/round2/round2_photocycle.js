#!/usr/bin/env node
"use strict";
/* Round 2 independent integer C/O/R solver and open-state photocurrent PROXY.
   Distinct JS array and explicit transition table. No measured biology. */
const fs=require("node:fs"),crypto=require("node:crypto");
const S=1000000000,N=81,LENGTH=1200;
const TARGET=350000000;
const ALPHA=800,BETA=450,GAMMA=120;
const SCHEMA="ASOLARIA-SEAT1-ROUND2-3STATE-RATE-CURRENT-V1";
const PROFILES=["dark","paired_short","paired_long"];
const ARMS=["dark","open_loop_full","open_loop_half","feedback_now","feedback_delay10","feedback_stale100"];
const checkpoints=new Set([0,99,100,299,300,399,400,599,600,699,700,899,900,1199]);
function ensure(x,msg){if(!x)throw Error(msg)}
function illuminated(profile,t){
  if(profile==="dark")return false;
  if(t>=100&&t<300)return true;
  if(profile==="paired_short")return t>=400&&t<600;
  return t>=700&&t<900;
}
function scaled(rate,dt=20){
  return Math.floor(S*rate*dt/(1000000+rate*dt));
}
function forward(pop,lit,dt=20){
  const c=pop[0],o=pop[1],r=pop[2];
  const co=Math.floor(c*scaled(lit?ALPHA:0,dt)/S);
  const or=Math.floor(o*scaled(BETA,dt)/S);
  const rc=Math.floor(r*scaled(GAMMA,dt)/S);
  const out=[c-co+rc,o+co-or,r+or-rc];
  ensure(out.every(v=>v>=0)&&out[0]+out[1]+out[2]===S,"mass or positivity");
  return out;
}
function decide(name,enabled,t,observed,history){
  if(!enabled||name==="dark")return false;
  if(name==="open_loop_full")return true;
  if(name==="open_loop_half")return t%2===0;
  if(name==="feedback_now")return observed<TARGET;
  const lag=name==="feedback_delay10"?10:100;
  return (t<lag?0:history[t-lag])<TARGET;
}
function simulate(){
  const records=["MODEL|schema="+SCHEMA+"|dt_ms=20|S="+S+"|N=81|ticks=1200|checkpoints=14|digital_only=1"];
  const totals={};
  for(const profile of PROFILES){
    totals[profile]={};
    for(const arm of ARMS){
      const score={absolute_error:0,light_on_site_ticks:0,global_command_ticks:0,
        switches:0,onset_open:null,post_off_open:null,final_open:0,site_count:N};
      // Each identity advances independently; no tuple compression or cached
      // result replaces the source state in these scientific comparisons.
      for(let id=0;id<N;id++){
        let pop=[S,0,0], last=false;
        const beforeTick=[];
        for(let tick=0;tick<LENGTH;tick++){
          beforeTick.push(pop[1]);
          const isOn=illuminated(profile,tick);
          const cmd=decide(arm,isOn,tick,pop[1],beforeTick);
          pop=forward(pop,cmd);
          const desired=isOn?TARGET:0;
          score.absolute_error+=Math.abs(pop[1]-desired);
          score.light_on_site_ticks+=cmd?1:0;
          score.switches+=cmd!==last?1:0;
          if(id===0&&cmd)score.global_command_ticks++;
          if(checkpoints.has(tick)){
            const current=-Math.floor(120000*pop[1]/S);
            records.push("FRAME|profile="+profile+"|arm="+arm+"|id=site-"+String(id).padStart(3,"0")+
             "|tick="+String(tick).padStart(4,"0")+"|C="+pop[0]+"|O="+pop[1]+
             "|R="+pop[2]+"|I_millipA="+current);
            if(id===0&&tick===100)score.onset_open=pop[1];
            if(id===0&&tick===300)score.post_off_open=pop[1];
          }
          last=cmd;
        }
        score.final_open+=pop[1];
      }
      totals[profile][arm]=score;
    }
  }
  ensure(records.length===1+3*6*81*14,"frame count drift");
  records.push("END|profiles=3|arms=6|site_frames=20412|physical_observations=0");
  const data=Buffer.from(records.join("\n")+"\n","ascii");
  const hash=crypto.createHash("sha256").update(data).digest("hex");
  return {data,report:{
    schema:SCHEMA,evidence:"synthetic digital kinetic proxy",profiles:totals,
    site_frames:20412,record_sha256:hash,record_bytes:data.length,
    rates_milli_per_s:{alpha_light:ALPHA,beta:BETA,gamma:GAMMA},
    proxy:{conductance_pS:2000,voltage_mV:-60,reversal_mV:0},
    physical_observations:false
  }};
}
function main(){
  ensure(process.argv.length===4,"usage: node round2_photocycle.js out.hbp metrics.json");
  const out=simulate();
  fs.writeFileSync(process.argv[2],out.data);
  fs.writeFileSync(process.argv[3],JSON.stringify(out.report,null,2)+"\n");
  console.log(JSON.stringify({status:"PASS",implementation:"node_independent_integer_three_state",
    sha256:out.report.record_sha256,rows:out.report.site_frames,bytes:out.data.length}));
}
main();
