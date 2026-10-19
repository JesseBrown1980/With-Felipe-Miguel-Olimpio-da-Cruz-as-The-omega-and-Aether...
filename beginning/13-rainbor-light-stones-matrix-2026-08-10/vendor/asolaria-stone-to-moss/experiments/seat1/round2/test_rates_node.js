#!/usr/bin/env node
'use strict';
/* Negative mutations before Node actuation. */
const assert=require('node:assert/strict');
const p=require('./photocycle_rates_node.js');
function halts(name,fn,expected){
 let matched=false;
 try{fn()}catch(e){matched=e.message==='HALT:'+expected; if(!matched)throw e}
 assert(matched,'MISSING_HALT:'+name);
 return name;
}
function run(){
 let state=[p.S,0n,0n];
 for(let tick=0;tick<p.STEPS;tick++){
   state=p.transition(state,p.pulse('paired_short',tick)?1000:0);
   assert.equal(state.reduce((a,b)=>a+b,0n),p.S);
   assert(state.every(v=>v>=0n));
 }
 const site='site-042',tick=250,open=100000000n;
 const f=p.canonFrame(site,tick,open);
 const act=(frame)=>{
   const obs=p.verifyFrame(frame,site,tick);
   return p.transition([p.S,0n,0n],obs<p.TARGET?1000:0);
 };
 let events=[];
 events.push(halts('wrong_source',()=>act({...f,source:'forged-source'}),'UNTRUSTED_SOURCE_ID'));
 events.push(halts('stale',()=>act({...f,tick:tick-1}),'STALE_OR_FUTURE_TICK'));
 events.push(halts('corrupt_occupancy',()=>act({...f,open:open+1n}),'SENSOR_FRAME_HASH_MISMATCH'));
 events.push(halts('wrong_identity',()=>act({...f,site:'site-043'}),'IDENTITY_MISMATCH'));
 events.push(halts('mass_fault',()=>p.transition([p.S+1n,0n,0n],1000),'INVALID_STATE_MASS_OR_SIGN'));
 const ids=Array.from({length:81},(_,i)=>'site-'+String(i).padStart(3,'0'));
 ids[42]='site-041';events.push(halts('duplicate_identity',()=>p.checkIds(ids),'ID_SET_CHANGED'));
 events.push(halts('privilege',()=>p.requestPrivilege('HUGGINGFACE_PUBLISH',false),
    'EXTERNAL_AUTHORIZATION_REQUIRED:HUGGINGFACE_PUBLISH'));
 events.push(halts('invalid_light',()=>p.transition([p.S,0n,0n],500),'INVALID_LIGHT_COMMAND'));
 const coherent=p.canonFrame(site,tick,900000000n);
 assert.equal(p.verifyFrame(coherent,site,tick),900000000n);
 process.stdout.write(JSON.stringify({status:'PASS',executed_negative_controls:events.length,
  events,coherent_source_and_watcher_forgery:'HELD_UNAUTHENTICATED',
  independent_external_source_authentication:false,physical_biological_data:false})+'\n');
}
run();
