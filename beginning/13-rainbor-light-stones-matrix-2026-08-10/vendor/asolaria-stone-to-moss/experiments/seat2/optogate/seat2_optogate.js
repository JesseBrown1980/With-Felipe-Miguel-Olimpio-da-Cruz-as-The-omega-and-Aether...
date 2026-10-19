#!/usr/bin/env node
'use strict';
/* Independent Node integer / byte implementation of symbolic 81-site light gates.
   No actual neurons, photon sensing, calibrated kinetics, or consciousness. */
const fs=require('node:fs'),crypto=require('node:crypto');
const SITES=81,WAVES=27,MAX=1024;
const PROFILES=[['fast',900,550],['persistent',700,120]];
const SCENARIOS=['H','E','S','F','W','R'];
const SCHEMA='ASOLARIA-SEAT2-OPTOGATE-DIGITAL-V1';
function sha(b){return crypto.createHash('sha256').update(b).digest('hex')}
function light(w){
 return Buffer.from(Array.from({length:SITES},(_,i)=>
   crypto.createHash('sha256').update('ASOLARIA|SEAT2|OPTOGATE|V1|'+w+'|'+i,'ascii').digest()[0]));
}
function nonce(w,p){return sha(Buffer.from('ASOLARIA|OPTOGATE|V1|'+w+'|'+p,'ascii')).slice(0,32)}
function evolve(gs,xs,L,S,D){
 if(gs.length!==SITES||xs.length!==SITES||L.length!==SITES)throw Error('bad input');
 const G=new Array(SITES),X=new Array(SITES);
 for(let i=0;i<SITES;i++){
   const old=gs[i],op=Math.floor(((MAX-old)*L[i]*S)/(255*MAX)),
      cl=Math.floor((old*D)/MAX);
   const newer=Math.max(0,Math.min(MAX,old+op-cl));
   const signal=Math.floor((3*xs[i]+2*newer+xs[(i+1)%SITES])/6);
   if(newer<0||newer>MAX||signal<0||signal>MAX)throw Error('gate range');
   G[i]=newer;X[i]=signal;
 }
 return [G,X];
}
function pixels(G,X,L){
 const b=Buffer.alloc(SITES*3);
 for(let i=0;i<SITES;i++){
   b[3*i]=Math.min(255,Math.floor(G[i]/4));
   b[3*i+1]=Math.min(255,Math.floor(X[i]/4));
   b[3*i+2]=L[i];
 }
 return b;
}
function stateDigest(G,X){
 const b=Buffer.alloc(SITES*4);
 for(let i=0;i<SITES;i++){
   b.writeUInt16BE(G[i],4*i);
   b.writeUInt16BE(X[i],4*i+2);
 }
 return sha(b);
}
function eq(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i])}
function check(gs,xs,w,name,scenario,S,D){
 const trusted=light(w);
 let recv=Buffer.from(trusted),n=nonce(w,name);
 if(scenario==='S')recv[(w*11)%SITES]^=255;
 else if(scenario==='R'){recv=light(w-1);n=nonce(w-1,name)}
 const [cG,cX]=evolve(gs,xs,recv,S,D),reportG=cG.slice(),reportX=cX.slice(),j=(w*7)%SITES;
 if(scenario==='E'||scenario==='W')reportX[j]=(reportX[j]+1)%MAX;
 const frame=Buffer.from(pixels(reportG,reportX,recv));
 if(scenario==='F')frame[(3*j+1)%frame.length]^=1;
 const [rG,rX]=evolve(gs,xs,recv,S,D),refFrame=pixels(rG,rX,recv);
 const math=eq(reportG,rG)&&eq(reportX,rX)&&frame.equals(refFrame);
 const source=recv.equals(trusted)&&n===nonce(w,name),accepted=math&&source;
 if(accepted!==(scenario==='H')||
    math!==['H','S','R'].includes(scenario)||
    source!==!['S','R'].includes(scenario))throw Error('gate mismatch '+w+' '+name+' '+scenario);
 if(scenario==='W'&&math)throw Error('forged watcher accepted');
 const row=[
   'W='+String(w).padStart(2,'0'),'identity_count='+SITES,
   'profile='+name,'scenario='+scenario,
   'received_sha256='+sha(recv),'trusted_sha256='+sha(trusted),
   'nonce='+n,'math='+Number(math),'source='+Number(source),
   'accepted='+Number(accepted),'forged_watcher_claim='+Number(scenario==='W'),
   'report_state_sha256='+stateDigest(reportG,reportX),
   'reference_state_sha256='+stateDigest(rG,rX),
   'frame_sha256='+sha(frame),'reference_frame_sha256='+sha(refFrame)
 ].join('|');
 return {math,source,accepted,row};
}
function deepSort(v){
 if(Array.isArray(v))return v.map(deepSort);
 if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,deepSort(v[k])]));
 return v;
}
function run(){
 const ids=Array.from({length:SITES},(_,i)=>
   'E:'+Math.floor(i/27)+':'+(Math.floor(i/9)%3)+':'+(Math.floor(i/3)%3)+':'+(i%3));
 if(new Set(ids).size!==SITES)throw Error('duplicate id');
 const snap=Object.fromEntries(PROFILES.map(([n])=>[n,[Array(SITES).fill(0),Array(SITES).fill(0)]]));
 const rows=[],tot={math_green:0,source_green:0,accepted:0,held:0,watcher_forgery_rejected:0};
 for(let w=1;w<=WAVES;w++){
   const trusted=light(w);
   for(const [name,S,D] of PROFILES){
     const [oldG,oldX]=snap[name];
     for(const sc of SCENARIOS){
       const z=check(oldG,oldX,w,name,sc,S,D);
       rows.push(z.row);
       tot.math_green+=Number(z.math);
       tot.source_green+=Number(z.source);
       tot.accepted+=Number(z.accepted);
       tot.held+=Number(!z.accepted);
       if(sc==='W'&&!z.math)tot.watcher_forgery_rejected++;
     }
     snap[name]=evolve(oldG,oldX,trusted,S,D);
   }
 }
 if(rows.length!==324||JSON.stringify(tot)!==JSON.stringify({
   math_green:162,source_green:216,accepted:54,held:270,watcher_forgery_rejected:54
 }))throw Error('wrong counts '+JSON.stringify(tot));
 const final={};for(const [name,[g,x]] of Object.entries(snap))final[name]=stateDigest(g,x);
 const trace=Buffer.from(rows.join('\n')+'\n','ascii');
 const prof={};for(const [n,S,D] of PROFILES)prof[n]={sensitivity:S,closing:D,physical_calibration:false};
 const outcome={
    schema:SCHEMA,preregistered_wave_count:WAVES,sites:SITES,
    immutable_id_scheme:'E:t:c:s:l; 3^4=81',
    profiles:prof,scenarios:SCENARIOS,cases:rows.length,
    trace_bytes:trace.length,trace_sha256:sha(trace),final_states:final,tallies:tot,
    correctness_interpretation:'H mathematical and source bound; S/R self-consistent on untrusted/replayed light but held; E/F/W independently rechecked held',
    real_opsins_used:false,biological_timescale_inferred:false,
    screen_pixels_from_physical_camera:false,
    physical_hosts_attested:0,http_or_wasm_executed:false,
    actual_neural_signal_observed:false,
    human_operator_permissions_delegated:false,
    release_authorized:false,
    status:'PASS_SYNTHETIC_COMPUTATIONAL_ONLY'
 };
 return {trace,receipt:Buffer.from(JSON.stringify(deepSort(outcome),null,2)+'\n','ascii')};
}
if(process.argv.length!==4)throw Error('usage: node seat2_optogate.js trace.hbp receipt.json');
const {trace,receipt}=run();
fs.writeFileSync(process.argv[2],trace);fs.writeFileSync(process.argv[3],receipt);
console.log(JSON.stringify({status:'PASS',rows:trace.toString('ascii').split('\n').length-1,
 trace_sha256:sha(trace),receipt_sha256:sha(receipt)}));
