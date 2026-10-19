#!/usr/bin/env node
'use strict';
/* Independent Node.js/BigInt cross-implementation of the bounded Seat4
 * recurrence experiment. Digital source and 9x9 RGB PPM pixels only.
 * Do not interpret as a physical screen or consciousness measurement.
 */
const fs=require('node:fs'), crypto=require('node:crypto');
const N=81n,MASK=(1n<<N)-1n;
const WAVES=27, WATCHERS=[1,2,4,8], ARMS=['A','B','C','D'];
const FAULTS=[
 'HONEST','OUTPUT_FLIP','COMMON_SOURCE','FRAME_FLIP',
 'ONE_WATCHER_FORGED','ALL_WATCHERS_FORGED',
 'ANCHOR_DELAYED','ANCHOR_MISSING','CONSENT_MISSING'
];
const FALSE={A:648,B:216,C:243,D:0};
const HELD={A:0,B:0,C:108,D:216};
const HEADER=Buffer.from('P6\n9 9\n255\n','ascii');
function ck(test,msg){if(!test)throw Error(msg)}
function sha(data){return crypto.createHash('sha256').update(data).digest('hex')}
function rotate(x,k){
  if(k===0)return x&MASK;
  return ((x<<BigInt(k))|(x>>(N-BigInt(k))))&MASK;
}
function source(wave){
  const bytes=crypto.createHash('sha256').update(
    'ASOLARIA|SEAT4|RECURRENCE|SYNTHETIC|WAVE='+wave,'ascii'
  ).digest('hex');
  return BigInt('0x'+bytes)&MASK;
}
function evolve(x){return x^rotate(x,1)^rotate(x,3)}
function matrixIndependent(x){
  // Explicit 81-column XOR transfer matrix, different from producer shifts.
  let result=0n;
  for(let i=0;i<81;i++){
    const base=1n<<BigInt(i);
    if(x&base)result^=base^rotate(base,1)^rotate(base,3);
  }
  return result;
}
function frame(y){
  const rgb=Buffer.alloc(243,0);
  for(let bit=0;bit<81;bit++){
    const pixel=Number((y>>BigInt(bit))&1n)*255;
    rgb[bit*3]=rgb[bit*3+1]=rgb[bit*3+2]=pixel;
  }
  return Buffer.concat([HEADER,rgb]);
}
function eqbuf(a,b){return a.equals(b)}
function initial(wave,fault){
  const truth=source(wave);
  let x=fault==='COMMON_SOURCE'?
    truth^(1n<<BigInt((wave+13)%81)):truth;
  let y=evolve(x);
  if(['OUTPUT_FLIP','ONE_WATCHER_FORGED','ALL_WATCHERS_FORGED'].includes(fault))
    y^=1n<<BigInt((wave+7)%81);
  const pic=fault==='FRAME_FLIP'?frame(y^(1n<<40n)):frame(y);
  return {truth,x,y,pic,consent:fault!=='CONSENT_MISSING'};
}
function hex81(x){return x.toString(16).padStart(21,'0')}
function trial(wave,fault,arm,n){
  let {truth,x,y,pic,consent}=initial(wave,fault);
  const targetY=evolve(truth),targetPic=frame(targetY);
  let accepted=false,repairRound=0,calls=0,rounds=0;
  if(arm==='A')accepted=true;
  else for(let r=1;r<=3;r++){
    rounds=r;
    if((arm==='C'||arm==='D')&&!consent)break;
    if(arm==='B'){
      const correctY=evolve(x),correctPic=frame(correctY);
      calls++;
      if(y===correctY&&eqbuf(pic,correctPic)){accepted=true;break}
      y=correctY;pic=correctPic;
      if(repairRound===0)repairRound=r;
      continue;
    }
    if(arm==='C'){
      let expected=null;
      for(let i=0;i<n;i++){
        if(fault==='ALL_WATCHERS_FORGED'||
           (fault==='ONE_WATCHER_FORGED'&&i===0))continue;
        const yy=matrixIndependent(x),image=frame(yy);
        calls++;
        if(y!==yy||!eqbuf(pic,image)){
          if(expected!==null)ck(expected.y===yy&&eqbuf(expected.pic,image),
            'honest watchers disagree');
          expected={y:yy,pic:image};
        }
      }
      if(expected===null){accepted=true;break}
      y=expected.y;pic=expected.pic;
      if(repairRound===0)repairRound=r;
      continue;
    }
    ck(arm==='D','unrecognized arm');
    if(fault==='ANCHOR_MISSING'||(fault==='ANCHOR_DELAYED'&&r===1))
      continue;
    const xx=truth, yy=matrixIndependent(xx), image=frame(yy);
    calls++;
    if(x===xx&&y===yy&&eqbuf(pic,image)){accepted=true;break}
    x=xx;y=yy;pic=image;
    if(repairRound===0)repairRound=r;
  }
  const correct=x===truth&&y===targetY&&eqbuf(pic,targetPic);
  const falseGreen=accepted&&(!correct||!consent),held=!accepted;
  return {wave,fault,arm,n,accepted:+accepted,correct:+correct,
    false_green:+falseGreen,held:+held,repaired_at:repairRound,
    rounds,operations:calls,source_hex:hex81(x),future_hex:hex81(y),
    screen_ppm_sha256:sha(pic)};
}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value && typeof value==='object'){
    const out={};
    for(const k of Object.keys(value).sort())out[k]=stable(value[k]);
    return out;
  }
  return value;
}
function main(){
  const t=process.argv.indexOf('--trace'),r=process.argv.indexOf('--receipt');
  ck(t>=0&&r>=0&&process.argv[t+1]&&process.argv[r+1],'Need --trace and --receipt');
  const tallies={};
  for(const arm of ARMS)tallies[arm]={
    cases:0,false_green:0,holds:0,correct_final:0,
    repair_events:0,operations:0,accepted_without_anchor:0
  };
  const lines=[];
  for(let wave=0;wave<WAVES;wave++)
    for(const fault of FAULTS)
      for(const n of WATCHERS)
        for(const arm of ARMS){
          const c=trial(wave,fault,arm,n), k=tallies[arm];
          k.cases++;k.false_green+=c.false_green;k.holds+=c.held;
          k.correct_final+=c.correct;k.repair_events+=+(c.repaired_at!==0);
          k.operations+=c.operations;
          if(c.accepted&&['ANCHOR_MISSING','ANCHOR_DELAYED'].includes(fault)&&arm!=='D')
            k.accepted_without_anchor++;
          lines.push([
            c.wave,c.fault,c.arm,c.n,c.accepted,c.correct,c.false_green,
            c.held,c.repaired_at,c.rounds,c.operations,c.source_hex,
            c.future_hex,c.screen_ppm_sha256
          ].join('|')+'\n');
        }
  ck(lines.length===3888,'total cases');
  for(const arm of ARMS){
    ck(tallies[arm].cases===972,'per-arm case count');
    ck(tallies[arm].false_green===FALSE[arm],'false green '+arm);
    ck(tallies[arm].holds===HELD[arm],'held '+arm);
  }
  ck(sha(frame(0n))!==sha(frame(1n<<40n)),'screen negative control');
  ck(frame(0n).length===HEADER.length+243,'screen frame length');
  for(let wave=0;wave<WAVES;wave++)
    for(const n of WATCHERS){
      ck(trial(wave,'HONEST','D',n).accepted===1,'honest D accept');
      ck(trial(wave,'CONSENT_MISSING','D',n).held===1,'consent D hold');
      ck(trial(wave,'ANCHOR_DELAYED','D',n).rounds===2,'delayed anchor');
    }
  const trace=Buffer.from(lines.join(''),'ascii');
  fs.writeFileSync(process.argv[t+1],trace);
  const receipt={
    schema:'ASOLARIA-SEAT4-RECURRENCE-IS-MIND-81-V1',
    seat:'seat-4',
    classification:'BOUNDED_SYNTHETIC_SOFTWARE_TRIAL',
    law_source:'N-Nest LAW.md, recurrence + ground truth corrective gate',
    waves:WAVES,
    fault_modes:FAULTS,
    watcher_counts:WATCHERS,
    arms:ARMS,max_rounds:3,
    total_cases:lines.length,cases_per_arm:972,
    tallies,trace_sha256:sha(trace),
    trace_bytes:trace.length,
    visual_channel:'digital 9x9 RGB PPM, not captured photons',
    source_anchor:'deterministic precommitted local benchmark fixture, not a physical attestation',
    human_apex_consent_checked_in_arms:['C','D'],
    mathematical_warning:'independent consistency cannot authenticate common compromised source',
    physical_hosts_attested:0,
    physical_screen_or_camera_measured:false,
    consciousness_or_human_like_mind_established:false,
    zero_trust_anchor_compromise_tested:false
  };
  const pretty=Buffer.from(JSON.stringify(stable(receipt),null,2)+'\n','ascii');
  fs.writeFileSync(process.argv[r+1],pretty);
  fs.writeFileSync(process.argv[r+1]+'.sha256',
    sha(pretty)+'  '+require('node:path').basename(process.argv[r+1])+'\n','ascii');
  process.stdout.write(JSON.stringify(stable({
    status:'PASS',cases:lines.length,trace_sha256:sha(trace),
    receipt_sha256:sha(pretty),false_green:FALSE,held:HELD
  }))+'\n');
}
main();
