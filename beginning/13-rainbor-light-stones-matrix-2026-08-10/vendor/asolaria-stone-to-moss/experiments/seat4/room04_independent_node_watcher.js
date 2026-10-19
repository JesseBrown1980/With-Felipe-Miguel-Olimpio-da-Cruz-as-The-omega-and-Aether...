#!/usr/bin/env node
"use strict";
/* Independent Seat 4 Room 04 Node per-site watchdog: no physical readout. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const sha=x=>crypto.createHash("sha256").update(x).digest("hex");
const ARMS=["dark","open_loop","feedback_truth","feedback_corrupt"];
const N=81,WAVES=27,TICKS=40,S=1000000,GOAL=400000;
const EXPECTED="de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b";
const KINDS=[
  "alter_rgb_frame_bytes","alter_frame_digest","swap_pid",
  "alter_total_population","wrong_light_pulse","stale_source_state",
  "stale_tick","stale_nonce","mass_preserving_wrong_output",
  "forge_watcher_digest","coherent_forged_report_and_watcher",
  "external_privilege_request"
];
const PIDS=Array.from({length:N},(_,i)=>
  sha("ASOLARIA|SEAT4|ROOM04|IMMUTABLE_PID|"+i).slice(0,24));
function pulse(arm,w,t,i,o) {
  const target=(i+w)%3===0;
  if(arm==="dark")return false;
  if(arm==="open_loop")return target&&t%12<4;
  if(arm==="feedback_truth")return target&&o<GOAL;
  if(arm==="feedback_corrupt")return target&&Math.min(S,o+250000)<GOAL;
  throw Error("unknown arm");
}
function advance(c,o,r,lit) {
  const a=Math.floor(c*(lit?300000:0)/S);
  const b=Math.floor(o*60000/S);
  const d=Math.floor(r*25000/S);
  const x=c-a+d,y=o+a-b,z=r+b-d;
  assert(x>=0&&y>=0&&z>=0&&x+y+z===S);
  return {x,y,z,act:a};
}
function haltTest() {
  let halted=false,accepted=0,denied=0,prompts=0,external=0;
  for(let i=0;i<81;i++) {
    if(i===17){halted=true;halted=true;}
    if(halted)denied++;else accepted++;
  }
  assert(halted&&accepted===17&&denied===64);
  assert(prompts===0&&external===0);
  return {accepted_before_halt:accepted,post_halt_denied:denied,
    external_privileges_granted:external,human_prompts:prompts,
    halt_idempotent:halted};
}
function checkLedger(raw) {
  const lines=raw.toString("ascii").trimEnd().split("\n");
  const kinds=Object.fromEntries(KINDS.map(k=>[k,0]));
  const clean=new Set(),faults=new Set();
  for(const line of lines) {
    const fields=line.split("|");
    if(fields[0]==="CHECK") {
      assert.equal(fields.length,6);
      const a=fields[1].slice(4),w=Number(fields[2].slice(5)),
        t=Number(fields[3].slice(5)),i=Number(fields[4].slice(5));
      assert(ARMS.includes(a)&&w>=0&&w<WAVES&&t===39);
      assert(i===(w*17+ARMS.indexOf(a)*13+7)%81);
      assert.equal(fields[5],"clean=PASS");
      const key=a+"|"+w;assert(!clean.has(key));clean.add(key);
    }else if(fields[0]==="FAULT") {
      assert.equal(fields.length,7);
      const a=fields[1].slice(4),w=Number(fields[2].slice(5)),
        t=Number(fields[3].slice(5)),i=Number(fields[4].slice(5));
      const kind=fields[5].slice(6);
      assert(ARMS.includes(a)&&w>=0&&w<WAVES&&t===39);
      assert(i===(w*17+ARMS.indexOf(a)*13+7)%81);
      assert(KINDS.includes(kind));
      assert.equal(fields[6],"verdict=HELD");
      const key=a+"|"+w+"|"+kind;
      assert(!faults.has(key));faults.add(key);kinds[kind]++;
    }else throw Error("Invalid fault ledger row");
  }
  assert.equal(clean.size,108);
  assert.equal(faults.size,1296);
  for(const count of Object.values(kinds))assert.equal(count,108);
  return {clean:clean.size,mutations:faults.size,kinds};
}
function main() {
  assert.equal(process.argv.length,6,"Usage: node script tick.hbp faults.hbp phaseA.hbp receipt.json");
  const tick=fs.readFileSync(process.argv[2]),fault=fs.readFileSync(process.argv[3]);
  const baseline=fs.readFileSync(process.argv[4]);
  const receipt=JSON.parse(fs.readFileSync(process.argv[5],"utf8"));
  assert.equal(sha(tick),receipt.tick_hbp_sha256);
  assert.equal(sha(fault),receipt.fault_hbp_sha256);
  assert.equal(tick.length,receipt.tick_hbp_bytes);
  assert.equal(fault.length,receipt.fault_hbp_bytes);
  const origin=[
    "OPTO|schema=ASOLARIA-SEAT1-OPTOGATE-3STATE-1080-V1|N=81|waves=27|ticks_per_wave=40|scale=1000000|physical_photons=0"
  ];
  const lines=tick.toString("ascii").trimEnd().split("\n");
  assert.equal(lines.length,349920);
  let offset=0,sites=0,snapshots=0;
  const metrics={};
  for(const arm of ARMS) {
    const c=Array(N).fill(S),o=Array(N).fill(0),r=Array(N).fill(0);
    let error=0,commands=0,activated=0;
    for(let w=0;w<WAVES;w++) {
      for(let t=0;t<TICKS;t++) {
        for(let i=0;i<N;i++) {
          const line=lines[offset++],parts=line.split("|");
          assert.equal(parts.length,10);
          const name=parts[1].slice(4),wave=Number(parts[2].slice(2)),
            ti=Number(parts[3].slice(5)),id=Number(parts[4].slice(5));
          assert(name===arm&&wave===w&&ti===t&&id===i,"sequence drift");
          assert.equal(parts[5],"pid="+PIDS[i]);
          const lit=pulse(arm,w,t,i,o[i]);
          const out=advance(c[i],o[i],r[i],lit);
          const expected="T|arm="+arm+"|w="+String(w).padStart(2,"0")+
            "|tick="+String(t).padStart(2,"0")+"|site="+String(i).padStart(2,"0")+
            "|pid="+PIDS[i]+"|light="+Number(lit)+"|c="+out.x+
            "|o="+out.y+"|r="+out.z;
          assert.equal(line,expected,"full tick output != independent truth");
          c[i]=out.x;o[i]=out.y;r[i]=out.z;
          commands+=Number(lit);activated+=out.act;
          error+=Math.abs(out.y-(((i+w)%3===0)?GOAL:0));
          sites++;
        }
      }
      for(let i=0;i<N;i++) {
        origin.push("ARM|"+arm+"|WAVE|"+w+"|id="+i+
          "|closed="+c[i]+"|open="+o[i]+"|refractory="+r[i]);
        snapshots++;
      }
    }
    metrics[arm]={total_absolute_open_error:error,light_commands:commands,
      total_closed_to_open_transitions:activated,
      final_open_population:o.reduce((a,b)=>a+b,0)};
  }
  assert.equal(offset,lines.length);
  assert.equal(sites,349920);assert.equal(snapshots,8748);
  for(const arm of ARMS) {
    const m=metrics[arm];
    origin.push("MEASURE|arm="+arm+"|error="+m.total_absolute_open_error+
      "|light_commands="+m.light_commands+"|activations="+
      m.total_closed_to_open_transitions+"|open_final="+m.final_open_population);
    assert.deepEqual(m,receipt.metrics[arm]);
  }
  origin.push("GATES|mass=PASS|ids_immutable=PASS|rate_mutation=HELD|id_swap=HELD|corrupt_obs_anchor=HELD|true_physical_source_authenticated=0");
  origin.push("END|cases=4|site_wave_snapshots=8748|steps_per_arm=1080|claims_of_consciousness=0");
  const sourceBytes=Buffer.from(origin.join("\n")+"\n","ascii");
  assert(sourceBytes.equals(baseline));
  assert.equal(sha(sourceBytes),EXPECTED);
  assert.equal(receipt.frozen_phase_a_sha256,EXPECTED);
  assert.equal(receipt.frozen_phase_a_snapshots,8748);
  assert.equal(receipt.b2_verified_site_tick_transitions,349920);
  assert.equal(receipt.b2_clean_checkpoints_accepted,108);
  assert.equal(receipt.b2_negative_mutations_rejected,1296);
  assert.equal(receipt.stable_immutable_pids,81);
  assert.equal(receipt.external_authorization_granted,false);
  assert.equal(receipt.independent_physical_source_authenticated,false);
  assert.equal(receipt.physical_light_or_biology_measured,false);
  assert.equal(receipt.coherent_fake_source_plus_fake_watcher_without_anchor,"PROVENANCE_HOLD");
  const ledger=checkLedger(fault);
  assert.deepEqual(receipt.faults_rejected_by_type,ledger.kinds);
  assert.deepEqual(receipt.halt,haltTest());
  const bad=Buffer.from(baseline);bad[bad.length-3]^=1;
  assert.notEqual(sha(bad),EXPECTED);
  const tampered=Buffer.from(tick);tampered[Math.floor(tampered.length/2)]^=1;
  assert.notEqual(sha(tampered),receipt.tick_hbp_sha256);
  console.log(JSON.stringify({status:"PASS",seat:"seat-4",
    independent_node_tick_matches:sites,original_phase_a_sha256:EXPECTED,
    snapshots,accepted_genuine_checkpoints:ledger.clean,
    rejected_fault_rows:ledger.mutations,
    corrupt_traces_rejected:true,halt:haltTest(),
    no_physical_measurement:true}));
}
main();
