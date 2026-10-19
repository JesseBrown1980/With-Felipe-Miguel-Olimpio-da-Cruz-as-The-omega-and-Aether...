#!/usr/bin/env node
'use strict';
/* Independently indexed BigInt transfer recurrence. Synthetic numerical light drive only.
   Fixed source prereg 6cb3139; not a real ChR2 fit or sensor measurement. */
const fs=require('node:fs');
const crypto=require('node:crypto');
const SCHEMA='ASOLARIA-SEAT1-PHOTOCYCLE-RATES-V1';
const S=1000000000n, DT=20n, BETA=450n, GAMMA=120n, TARGET=350000000n;
const N=81, STEPS=1200;
const CHECKPOINTS=new Set([0,99,100,299,300,399,400,599,600,699,700,899,900,1199]);
const PROFILES=['dark','paired_short','paired_long'];
const ARMS=['dark','open_loop_full','open_loop_half','feedback_now','feedback_delay10','feedback_stale100'];
const SOURCE='synthetic-source-pinned-v1';
function fail(reason){throw new Error('HALT:'+reason)}
function shaBytes(b){return crypto.createHash('sha256').update(b).digest('hex')}
function sha(x){return shaBytes(Buffer.from(x,'ascii'))}
function pulse(profile,t){
  if(profile==='dark')return false;
  if(profile==='paired_short')return (t>=100&&t<300)||(t>=400&&t<600);
  if(profile==='paired_long')return (t>=100&&t<300)||(t>=700&&t<900);
  return fail('UNKNOWN_PROFILE');
}
function alpha(light){
  if(light!==0&&light!==1000)fail('INVALID_LIGHT_COMMAND');
  return light===0?0n:1200n*BigInt(light)/(500n+BigInt(light));
}
function prob(rate,dt=DT){
  if(rate<0n||dt<=0n)fail('BAD_RATE_OR_DT');
  return S*rate*dt/(1000000n+rate*dt);
}
function transition(state,light,dt=DT){
  let [c,o,r]=state;
  if(c<0n||o<0n||r<0n||c+o+r!==S)fail('INVALID_STATE_MASS_OR_SIGN');
  const flowCO=c*prob(alpha(light),dt)/S;
  const flowOR=o*prob(BETA,dt)/S;
  const flowRC=r*prob(GAMMA,dt)/S;
  const updated=[c-flowCO+flowRC,o+flowCO-flowOR,r+flowOR-flowRC];
  if(updated.some(v=>v<0n)||updated.reduce((a,b)=>a+b,0n)!==S)fail('STATE_CONSERVATION_FAILURE');
  return updated;
}
function currentProxy(open){return -(120000n*open/S)}
function canonFrame(site,tick,open,source=SOURCE){
  const text=source+'|'+site+'|'+tick+'|'+open.toString();
  return {source,site,tick,open,digest:sha(text)};
}
function verifyFrame(frame,site,expected){
  if(frame.source!==SOURCE)fail('UNTRUSTED_SOURCE_ID');
  if(frame.site!==site)fail('IDENTITY_MISMATCH');
  if(frame.tick!==expected)fail('STALE_OR_FUTURE_TICK');
  const value=frame.open;
  if(typeof value!=='bigint'||value<0n||value>S)fail('INVALID_SENSOR_FRACTION');
  if(frame.digest!==sha(SOURCE+'|'+site+'|'+expected+'|'+value.toString()))fail('SENSOR_FRAME_HASH_MISMATCH');
  return value;
}
function checkIds(ids){
  const target=Array.from({length:N},(_,i)=>'site-'+String(i).padStart(3,'0'));
  if(ids.length!==N||new Set(ids).size!==N||ids.some((v,i)=>v!==target[i]))fail('ID_SET_CHANGED');
}
function requestPrivilege(action,authorized){
  if(!authorized)fail('EXTERNAL_AUTHORIZATION_REQUIRED:'+action);
  return true;
}
function chooseLight(arm,profile,t,history,site){
  if(arm==='dark'||!pulse(profile,t))return 0;
  if(arm==='open_loop_full')return 1000;
  if(arm==='open_loop_half')return t%2===0?1000:0;
  const delays={feedback_now:0,feedback_delay10:10,feedback_stale100:100};
  if(!Object.prototype.hasOwnProperty.call(delays,arm))fail('UNKNOWN_ARM');
  const idx=t-delays[arm];
  const observed=idx>=0?history[idx]:0n;
  const frame=canonFrame(site,idx,observed);
  return verifyFrame(frame,site,idx)<TARGET?1000:0;
}
function simulateOne(profile,arm,site){
  let state=[S,0n,0n],history=[0n],snapshots=[];
  let error=0n,squared=0n,lit=0,switches=0,previous=0;
  let beforeSecond=0n, firstSecond=null,peak=0n;
  for(let tick=0;tick<STEPS;tick++){
    const command=chooseLight(arm,profile,tick,history,site);
    if(command)lit++;
    if(command!==previous)switches++;
    previous=command;
    state=transition(state,command);
    const [c,o,r]=state;
    history.push(o);
    const target=pulse(profile,tick)?TARGET:0n;
    const diff=o>=target?o-target:target-o;
    error+=diff;squared+=diff*diff;
    if(profile!=='dark'&&tick>=100&&tick<300&&o>peak)peak=o;
    const secondTick=profile==='paired_short'?400:700;
    if(profile!=='dark'&&tick===secondTick-1)beforeSecond=o;
    if(profile!=='dark'&&tick===secondTick)firstSecond=o;
    if(CHECKPOINTS.has(tick)){
      snapshots.push('FRAME|profile='+profile+'|arm='+arm+'|id='+site+
      '|tick='+String(tick).padStart(4,'0')+'|C='+c+'|O='+o+'|R='+r+
      '|I_millipA='+currentProxy(o));
    }
  }
  return {snapshots,metric:{error,squared_error:squared,lit,switches,peak_first:peak,
    pre_second_open:beforeSecond,second_first_open:firstSecond}};
}
function build(){
  const lines=['MODEL|schema='+SCHEMA+'|fraction_scale='+S+'|dt_ms='+DT+'|sites='+N+
    '|ticks='+STEPS+'|digital_only=1|human_approval_per_tick=0'];
  const ids=Array.from({length:N},(_,i)=>'site-'+String(i).padStart(3,'0'));
  checkIds(ids);
  const metrics=[];
  for(const profile of PROFILES)for(const arm of ARMS){
    const rows=[];
    let totalError=0n,totalSquared=0n,totalLit=0;
    let first=null;
    for(const site of ids){
      const {snapshots,metric:m}=simulateOne(profile,arm,site);
      rows.push(...snapshots);
      totalError+=m.error;totalSquared+=m.squared_error;totalLit+=m.lit;
      if(first===null)first=m;
      if(m.lit!==first.lit)fail('GLOBAL_COMMAND_INCONSISTENT');
    }
    if(rows.length!==N*CHECKPOINTS.size)fail('FRAME_COUNT_MISMATCH');
    lines.push(...rows);
    metrics.push({profile,arm,error_sum_abs_scaled:totalError.toString(),
      error_sum_squared_scaled:totalSquared.toString(),
      light_on_site_ticks:totalLit,light_on_global_ticks:first.lit,
      global_command_switches:first.switches,
      first_pulse_peak_open_scaled:Number(first.peak_first),
      pre_second_open_scaled:Number(first.pre_second_open),
      first_second_pulse_open_scaled:first.second_first_open===null?null:Number(first.second_first_open)});
  }
  const expected=PROFILES.length*ARMS.length*N*CHECKPOINTS.size;
  if(lines.length!==expected+1)fail('BAD_TOTAL_FRAME_COUNT');
  lines.push('END|snapshots='+expected+'|site_ticks='+PROFILES.length*ARMS.length*N*STEPS+
             '|external_authorization=0|physical_observations=0');
  const blob=Buffer.from(lines.join('\n')+'\n','ascii');
  const meta={schema:SCHEMA,class:'SYNTHETIC_ONLY',snapshot_count:expected,
    site_tick_count:PROFILES.length*ARMS.length*N*STEPS,sha256:shaBytes(blob),bytes:blob.length,
    dt_millis:Number(DT),feedback_trust:'TEST_ONLY_UNAUTHENTICATED',
    g_bar_pS_assumed:2000,voltage_mV_assumed:-60,E_rev_mV_assumed:0,
    alpha_milli_per_s_at_1000:Number(alpha(1000)),beta_milli_per_s_assumed:Number(BETA),
    gamma_milli_per_s_assumed:Number(GAMMA),per_tick_human_prompts:0,
    external_permission_grants:0,metrics};
  return {blob,meta};
}
function main(){
  if(process.argv.length!==4)fail('USAGE: node photocycle_rates_node.js out.hbp out.json');
  const {blob,meta}=build();
  fs.writeFileSync(process.argv[2],blob);
  fs.writeFileSync(process.argv[3],JSON.stringify(meta,null,2)+'\n','utf8');
  process.stdout.write(JSON.stringify({status:'PASS',sha256:meta.sha256,
      snapshots:meta.snapshot_count,site_ticks:meta.site_tick_count})+'\n');
}
if(require.main===module)main();
module.exports={build,transition,alpha,prob,canonFrame,verifyFrame,checkIds,requestPrivilege,
  chooseLight,pulse,SCHEMA,S,N,STEPS,TARGET};
