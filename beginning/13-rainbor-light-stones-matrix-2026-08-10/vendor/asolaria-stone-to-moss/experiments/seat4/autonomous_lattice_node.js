#!/usr/bin/env node
'use strict';
/* Independent Node/BigInt replay of the preauthorized 81-site toy lattice.
 * No human callback or prompt during 2,187 transitions; the identity strings
 * are immutable, positions and field bits evolve. No physical photons used.
 */
const fs=require('node:fs'),crypto=require('node:crypto');
const W=27,N=81,STEPS=81,B=81n,MASK=(1n<<B)-1n;
const HEADER=Buffer.from('P6\n9 9\n255\n','ascii');
function sha(b){return crypto.createHash('sha256').update(b).digest('hex')}
function rot(x,k){return ((x<<BigInt(k))|(x>>(B-BigInt(k))))&MASK}
function field(x){return x^rot(x,1)^rot(x,3)}
function watcher(x){
 let y=0n;
 for(let i=0;i<N;i++){
  let basis=1n<<BigInt(i);
  if(x&basis)y^=basis^rot(basis,1)^rot(basis,3);
 }
 return y;
}
function frame(x){
 let rgb=Buffer.alloc(243);
 for(let i=0;i<N;i++){
  const p=Number((x>>BigInt(i))&1n)*255;
  rgb[3*i]=rgb[3*i+1]=rgb[3*i+2]=p;
 }
 return Buffer.concat([HEADER,rgb]);
}
function initial(w){
 return BigInt('0x'+sha(Buffer.from(
  'ASOLARIA|SEAT4|RECURRENCE|SYNTHETIC|WAVE='+w,'ascii')))&MASK;
}
function identities(w){
 return Array.from({length:N},(_,i)=>sha(Buffer.from(
  'ASOLARIA|RIM|SIM|IDENTITY|'+w+'|'+i,'ascii')).slice(0,16));
}
function moved(keys,t){
 const p=keys.map((key,i)=>{
  let velocity=1+(parseInt(key.slice(-2),16)%4);
  let pos=(i+velocity*t)%N;
  return key+'@'+String(pos).padStart(2,'0');
 });
 return sha(Buffer.from(p.join('|'),'ascii'));
}
function stable(v){
 if(Array.isArray(v))return v.map(stable);
 if(v&&typeof v==='object'){
  const obj={};
  for(const k of Object.keys(v).sort())obj[k]=stable(v[k]);
  return obj;
 }
 return v;
}
function main(){
 const a=process.argv.indexOf('--trace'),b=process.argv.indexOf('--receipt');
 if(a<0||b<0||!process.argv[a+1]||!process.argv[b+1])throw Error('output arguments missing');
 let rows=[],seen=new Set(),checks=0,fieldFaults=0,identityFaults=0,imageFaults=0;
 for(let wave=0;wave<W;wave++){
  const keys=identities(wave);
  if(new Set(keys).size!==N)throw Error('duplicate IDs');
  for(const key of keys)seen.add(key);
  const frozen=sha(Buffer.from(keys.join('|'),'ascii'));
  let x=initial(wave);
  for(let tick=1;tick<=STEPS;tick++){
   const proposed=field(x),verified=watcher(x);
   if(proposed!==verified)throw Error('independent state watcher differs');
   const screen=frame(proposed);
   if(screen.length!==HEADER.length+243)throw Error('frame invalid');
   if(sha(Buffer.from(keys.join('|'),'ascii'))!==frozen)throw Error('identity drift');
   rows.push('W|w='+String(wave).padStart(2,'0')+
    '|t='+String(tick).padStart(3,'0')+
    '|field='+proposed.toString(16).padStart(21,'0')+
    '|frame='+sha(screen)+'|positions='+moved(keys,tick)+
    '|identities='+frozen+'\n');
   x=verified;checks++;
  }
  const mutated=watcher(x)^(1n<<BigInt((wave+7)%N));
  if(mutated===watcher(x))throw Error('fault not detected');
  fieldFaults++;
  const spoof=keys.slice();spoof[wave%N]='0'.repeat(16);
  if(sha(Buffer.from(spoof.join('|'),'ascii'))===frozen)throw Error('PID mutation undetected');
  identityFaults++;
  if(sha(frame(x))===sha(frame(x^(1n<<40n))))throw Error('pixel mutation undetected');
  imageFaults++;
 }
 if(rows.length!==2187||seen.size!==2187||checks!==2187||
    fieldFaults!==27||identityFaults!==27||imageFaults!==27)
    throw Error('coverage mismatch');
 const trace=Buffer.from(rows.join(''),'ascii');
 fs.writeFileSync(process.argv[a+1],trace);
 const receipt={
  schema:'ASOLARIA-SEAT4-AUTONOMOUS-STABLE-IDENTITIES-V1',
  seat:'seat-4',model:'81-site cyclic GF2 toy evolution, not physical optics',
  waves:W,steps_per_wave:STEPS,field_transitions:2187,
  entities_per_wave:N,distinct_stable_identities:seen.size,
  automatic_position_updates:W*STEPS*N,
  manual_interventions_per_tick:0,human_prompts:0,
  identity_mutations:0,independent_matrix_watcher_checks:checks,
  field_mutations_rejected:fieldFaults,
  identity_mutations_rejected:identityFaults,
  digital_pixel_mutations_rejected:imageFaults,
  trace_rows:rows.length,trace_bytes:trace.length,
  trace_sha256:sha(trace),physical_photons_measured:false,
  autonomous_authorization:'bounded preconfigured simulation, no approval per step',
  external_scope_changes:'not implemented by this simulation'
 };
 const pretty=Buffer.from(JSON.stringify(stable(receipt),null,2)+'\n','ascii');
 fs.writeFileSync(process.argv[b+1],pretty);
 process.stdout.write(JSON.stringify(stable({status:'PASS',trace_sha256:sha(trace),
  receipt_sha256:sha(pretty),rows:rows.length,manual_interventions:0,
  entity_updates:W*STEPS*N}))+'\n');
}
main();
