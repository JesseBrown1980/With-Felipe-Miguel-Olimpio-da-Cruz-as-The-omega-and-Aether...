#!/usr/bin/env node
'use strict';
// Independently written Node.js synthetic 81-site frozen four-arm photocycle.
const fs=require('fs');
const crypto=require('crypto');
const Q=1000000;
const arms=['dark','short','long','continuous_then_dark'];
const ticks=new Set([0,7,31,63,127,191,239]);
const light=(t,site,wave,arm)=>{
  const k=t+(site%5)+(wave%7);
  if(arm==='short')return k%32<4;
  if(arm==='long')return k%64<24;
  if(arm==='continuous_then_dark')return t<120;
  return false;
};
function next3(v,L){
  const [c,o,r]=v;
  const a=L?Math.floor(c*300000/Q):0;
  const b=Math.floor(o*170000/Q);
  const d=Math.floor(r*60000/Q);
  return [c-a+d,o+a-b,r+b-d];
}
function next4(v,L){
  const [c1,o1,o2,c2]=v;
  const a=L?Math.floor(c1*300000/Q):0;
  const b=Math.floor(o1*110000/Q);
  const c=Math.floor(o1*80000/Q);
  const d=Math.floor(o2*40000/Q);
  const e=Math.floor(c2*55000/Q);
  const f=L?Math.floor(c1*20000/Q):0;
  const g=Math.floor(o2*25000/Q);
  return [c1-a-f+c+e,o1+a-b-c+g,o2+b-d-g,c2+d+f-e];
}
function run(path){
  const fh=fs.openSync(path,'w');let checks=0,updates=0,darkNull=true;
  const h=crypto.createHash('sha256');
  for(const model of ['3','4'])for(const arm of arms)for(let wave=0;wave<27;wave++){
    const state=Array.from({length:81},()=>model==='3'?[Q,0,0]:[Q,0,0,0]);
    for(let t=0;t<240;t++){
      const frame=ticks.has(t)?Buffer.alloc(81*16):null;
      let current=0;
      for(let site=0;site<81;site++){
        const n=model==='3'?next3(state[site],light(t,site,wave,arm)):next4(state[site],light(t,site,wave,arm));
        if(n.some(x=>x<0)||n.reduce((a,b)=>a+b,0)!==Q)throw Error('mass');
        state[site]=n;updates++;
        current+=2000*n[1]+(model==='4'?500*n[2]:0);
        if(frame){const z=model==='3'?[...n,0]:n;for(let k=0;k<4;k++)frame.writeUInt32LE(z[k],site*16+k*4);}
      }
      if(arm==='dark'&&current!==0)darkNull=false;
      if(frame){
        const line=`wave=${String(wave).padStart(2,'0')}|arm=${arm}|model=${model}|tick=${String(t).padStart(3,'0')}|sites=${frame.toString('base64')}|total_current=${current}\n`;
        const b=Buffer.from(line,'ascii');fs.writeSync(fh,b);h.update(b);checks++;
      }
    }
  }
  fs.closeSync(fh);
  if(updates!==4199040||checks!==1512||!darkNull)throw Error('counts or dark');
  return {status:'PASS_SOFTWARE_UNIFIED',site_tick_updates:updates,whole_site_snapshots:checks,
   trace_sha256:h.digest('hex'),dark_null:darkNull,physical_sensor:false,
   calibrated_photocycle:false,model_units:'synthetic integer'};
}
if(require.main===module){if(process.argv.length!==3)throw Error('usage: node round3_unified_node.js output.hbp');console.log(JSON.stringify(run(process.argv[2])));}
module.exports={run};
