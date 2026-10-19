#!/usr/bin/env node
'use strict';
/* Independent Node.js BigInt reference for Seat4's synthetic light gate.
 * "FAST"/"SLOW" are unitless invented toy modes, not measured opsins.
 * Read only digital frames; no photons, neural data or human tick approval.
 */
const fs=require('node:fs'),crypto=require('node:crypto');
const N=81,MASK=(1n<<81n)-1n,MAX=1024;
const MODES=['DARK','FAST','SLOW'];
const PARAMS={DARK:[0,0,1025],FAST:[448,192,480],SLOW:[256,96,400]};
const HEAD=Buffer.from('P6\n9 9\n255\n','ascii');
function assert(ok,msg='assertion failed'){if(!ok)throw Error(msg)}
function sha(x){return crypto.createHash('sha256').update(x).digest('hex')}
function rot(x,n){return n?((x<<BigInt(n))|(x>>(81n-BigInt(n))))&MASK:x&MASK}
function producer(x){return x^rot(x,1)^rot(x,3)}
function watcher(x){
 let value=0n;
 for(let i=0;i<N;i++){
  const b=1n<<BigInt(i);
  if(x&b)value^=b^rot(b,1)^rot(b,3);
 }
 return value;
}
function initial(w){return BigInt('0x'+sha(Buffer.from(
 'ASOLARIA|SEAT4|RECURRENCE|SYNTHETIC|WAVE='+w,'ascii')))&MASK}
function pids(w){return Array.from({length:N},(_,i)=>sha(Buffer.from(
 'ASOLARIA|RIM|SIM|IDENTITY|'+w+'|'+i,'ascii')).slice(0,16))}
function identities(keys){return sha(Buffer.from(keys.join('|'),'ascii'))}
function positions(keys,t){return sha(Buffer.from(keys.map((p,i)=>
 p+'@'+String((i+(1+(parseInt(p.slice(-2),16)%4))*t)%N).padStart(2,'0')
 ).join('|'),'ascii'))}
function frame(state){
 const rgb=Buffer.alloc(243);
 for(let i=0;i<N;i++){
  const color=Number((state>>BigInt(i))&1n)*255;
  rgb[3*i]=rgb[3*i+1]=rgb[3*i+2]=color;
 }
 return Buffer.concat([HEAD,rgb]);
}
function schedule(w,t,mode){return Number(mode!=='DARK'&&((w*7+t*11+(w^t))%13)<4)}
function occupancy(p,pulse,mode){
 const [gain,decay]=PARAMS[mode];
 if(pulse)p+=Math.floor((gain*(MAX-p)+512)/MAX);
 else p-=Math.floor((decay*p+512)/MAX);
 return Math.min(MAX,Math.max(0,p));
}
function step(w,t,mode,state,p,mem,pulse){
 const next_p=occupancy(p,pulse,mode);
 const active=Number(next_p>=PARAMS[mode][2]);
 const injection=active?(1n<<BigInt((w+3*t)%N)):0n;
 const next_state=producer(state)^injection;
 let next_mem=Math.max(0,mem-18)+(active?Math.floor(next_p/8):0);
 const spike=Number(next_mem>=240);
 if(spike)next_mem=0;
 return [next_state,next_p,next_mem,active,spike];
}
function witness_step(w,t,mode,state,p,mem,pulse,out){
 if(pulse!==schedule(w,t,mode))return false;
 const newp=occupancy(p,pulse,mode);
 const active=Number(newp>=PARAMS[mode][2]);
 const field=watcher(state)^(active?(1n<<BigInt((w+3*t)%N)):0n);
 let nextmem=Math.max(0,mem-18)+(active?Math.floor(newp/8):0);
 const spike=Number(nextmem>=240);
 if(spike)nextmem=0;
 const expected=[field,newp,nextmem,active,spike];
 return expected.every((v,i)=>v===out[i]);
}
function verify_record(w,t,mode,state,p,mem,keys,reported){
 const output=[reported.state,reported.occ,reported.mem,
               reported.gate,reported.spike];
 return witness_step(w,t,mode,state,p,mem,reported.pulse,output)&&
        reported.pix===sha(frame(reported.state))&&
        reported.id===identities(keys)&&
        reported.pos===positions(keys,t);
}
function pad(n,size){return String(n).padStart(size,'0')}
function stable(v){
 if(Array.isArray(v))return v.map(stable);
 if(v&&typeof v==='object'){
  let out={};for(const k of Object.keys(v).sort())out[k]=stable(v[k]);
  return out;
 }
 return v;
}
function main(){
 const t=process.argv.indexOf('--trace'),r=process.argv.indexOf('--receipt');
 assert(t>=0&&r>=0&&process.argv[t+1]&&process.argv[r+1],'--trace --receipt required');
 const rows=[],allkeys=new Set();
 let checks=0,source_forgery=0;
 const open_counts={DARK:0,FAST:0,SLOW:0},spike_counts={DARK:0,FAST:0,SLOW:0};
 const faults={pulse:0,gate_occupancy:0,field:0,pixel:0,pid:0};
 for(let w=0;w<27;w++){
  const keys=pids(w),frozen=identities(keys);
  assert(new Set(keys).size===81);
  keys.forEach(v=>allkeys.add(v));
  for(const mode of MODES){
   let state=initial(w),p=0,mem=0;
   for(let tick=1;tick<=81;tick++){
    const pulse=schedule(w,tick,mode);
    const out=step(w,tick,mode,state,p,mem,pulse);
    assert(witness_step(w,tick,mode,state,p,mem,pulse,out),'independent watcher mismatch');
    const [next,newp,newmem,gate,spike]=out;
    checks++;open_counts[mode]+=gate;spike_counts[mode]+=spike;
    assert(newp>=0&&newp<=MAX&&newmem>=0&&newmem<240);
    const pic=sha(frame(next));
    assert(identities(keys)===frozen,'PID drift');
    const pos=positions(keys,tick);
    rows.push('W|wave='+pad(w,2)+'|mode='+mode+'|tick='+pad(tick,3)+
      '|pulse='+pulse+'|occ='+pad(newp,4)+'|gate='+gate+
      '|spike='+spike+'|mem='+pad(newmem,3)+
      '|field='+next.toString(16).padStart(21,'0')+
      '|frame='+pic+'|positions='+pos+'|identities='+frozen+'\n');
    if(tick===81){
      const honest={pulse,occ:newp,state:next,pix:pic,id:frozen,
                    pos,mem:newmem,gate,spike};
      assert(verify_record(w,tick,mode,state,p,mem,keys,honest),'honest record rejected');
      const spoof=keys.slice();spoof[w]='0'.repeat(16);
      const alterations={
        pulse:['pulse',1-pulse],
        gate_occupancy:['occ',(newp+1)%(MAX+1)],
        field:['state',next^1n],
        pixel:['pix',sha(frame(next^(1n<<40n)))],
        pid:['id',identities(spoof)]
      };
      for(const [kind,[key,val]] of Object.entries(alterations)){
        const fake={...honest,[key]:val};
        assert(!verify_record(w,tick,mode,state,p,mem,keys,fake),
          'independent watcher accepted planted '+kind);
        faults[kind]++;
      }
      const forgedPulse=1-pulse;
      const forgedOutput=step(w,tick,mode,state,p,mem,forgedPulse);
      const forged={
        pulse:forgedPulse,state:forgedOutput[0],occ:forgedOutput[1],
        mem:forgedOutput[2],gate:forgedOutput[3],spike:forgedOutput[4],
        pix:sha(frame(forgedOutput[0])),pos,id:frozen
      };
      assert(!verify_record(w,tick,mode,state,p,mem,keys,forged),
        'forged common pulse schedule passed anchored source');
      source_forgery++;
    }
    state=next;p=newp;mem=newmem;
   }
  }
 }
 assert(rows.length===6561&&checks===6561&&allkeys.size===2187);
 assert(Object.values(faults).every(v=>v===81)&&source_forgery===81);
 assert(open_counts.DARK===0&&spike_counts.DARK===0);
 assert(open_counts.FAST>0&&open_counts.SLOW>0);
 const trace=Buffer.from(rows.join(''),'ascii');
 fs.writeFileSync(process.argv[t+1],trace);
 const receipt={
  schema:'ASOLARIA-SEAT4-OPTOINSPIRED-DIGITAL-GATE-V1',
  seat:'seat-4',classification:'MEASURED_SOFTWARE_PASS',
  model:'synthetic unitless light-sensitive gate, NOT validated optogenetic physiology',
  source:'Nobel medicine 2026 optogenetics; Chen et al Nat Biotechnol doi:10.1038/s41587-020-0679-9',
  waves:27,modes:MODES,ticks_per_wave_mode:81,
  tick_records:6561,immutable_distinct_pids:allkeys.size,
  synthetic_position_updates:6561*81,
  automatic_independent_watcher_checks:checks,
  light_gate_open_counts:open_counts,toy_spike_counts:spike_counts,
  injected_faults_rejected:faults,
  source_forgery_anchored_rejections:source_forgery,
  zero_human_prompts_per_tick:true,
  no_real_light_or_ion_channel_data:true,
  optical_photon_readout:'NOT_MEASURED',
  physical_host_independence:'NOT_MEASURED',
  trace_sha256:sha(trace),trace_bytes:trace.length,
 };
 const canon=Buffer.from(JSON.stringify(stable(receipt),null,2)+'\n','ascii');
 fs.writeFileSync(process.argv[r+1],canon);
 console.log(JSON.stringify(stable({
  status:'PASS',rows:6561,
  trace_sha256:sha(trace),receipt_sha256:sha(canon),
  source_forgery_controls:source_forgery,
  faults:Object.values(faults).reduce((a,b)=>a+b,0),
  gate_open_counts:open_counts
 })));
}
main();
