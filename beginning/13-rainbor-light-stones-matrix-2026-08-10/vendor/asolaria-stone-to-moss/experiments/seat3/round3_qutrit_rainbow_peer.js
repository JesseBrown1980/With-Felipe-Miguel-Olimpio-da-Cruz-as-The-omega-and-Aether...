#!/usr/bin/env node
"use strict";
/*
 * Seat3 independent Round3 QFT-intensity / ordered rainbow27 / fleet referee.
 * No dependency on or import from the coordinator's Python producer.
 * Synthetic computational tests ONLY; not photons, biology or live agents.
 */
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const assert=require("node:assert/strict");

const SEED=Buffer.from("ASOLARIA-LIGHT-BEING-ROUND3-20261015","ascii");
const SCHEMA="ASOLARIA-SEAT3-ROUND3-QUTRIT-RAINBOW27-PEER-V1";
const SCALE=1000000, W=27, A=81, LIMIT=729;
const GATES=["THREE_STATE","FOUR_STATE"];
const MODES=["DARK","PULSE","CONTINUOUS"];
const FAULTS=["CLEAN","CORRUPT","STALE","FORGED"];
const TARGET_CASE_SHA="dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09";
const TARGET_SOURCE_SHA="fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4";
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const rawhash=b=>crypto.createHash("sha256").update(b).digest();
const div=(a,b)=>Math.floor(a/b);
const pad=(x,w=2)=>String(x).padStart(w,"0");

function fixture(){
  const arr=[];
  for(let i=0;i<2048;i++){
    const le=Buffer.alloc(4);le.writeUInt32LE(i);
    arr.push(rawhash(Buffer.concat([SEED,le])));
  }
  const data=Buffer.concat(arr);
  assert.equal(data.length,65536);
  assert.equal(hash(data),TARGET_SOURCE_SHA);
  return data;
}
function weights(rgb){
  const [r,g,b]=rgb;
  const s=r+g+b;
  const n=r*r+g*g+b*b;
  const q=n-r*g-g*b-b*r;
  assert.equal(s*s+2*q,3*n);
  assert(q>=0);
  assert.equal(s*s-q,3*(r*g+g*b+b*r));
  return [s*s,q,q];
}
function project(rgb){
  const s=rgb[0]+rgb[1]+rgb[2];
  const d=rgb.map(x=>3*x-s);
  assert.equal(d[0]+d[1]+d[2],0);
  assert.deepEqual(d.map(x=>{
    assert.equal((x+s)%3,0);
    return (x+s)/3;
  }),rgb);
  return {d,s};
}
function sample(rgb,w,a){
  const parts=weights(rgb);
  const den=parts[0]+parts[1]+parts[2];
  assert(den>0,"ZERO_NORM_QUTRIT_HELD");
  const M=1n<<256n;
  const denom=BigInt(den);
  const ceiling=(M/denom)*denom;
  let rejects=0;
  while(rejects<10000){
    const low=Buffer.alloc(8);
    low.writeUInt16LE(w,0);low.writeUInt16LE(a,2);low.writeUInt32LE(rejects,4);
    const digest=rawhash(Buffer.concat([
      SEED,Buffer.from("|BORN-THRESHOLD|","ascii"),low
    ]));
    const x=BigInt("0x"+digest.toString("hex"));
    if(x<ceiling){
      const u=x%denom;
      const first=BigInt(parts[0]),second=BigInt(parts[1]);
      const lane=u<first?0:(u<first+second?1:2);
      return {lane,rejects,weights:parts,denom:den};
    }
    rejects++;
  }
  throw Error("REJECTION_MAX_HELD");
}
function memoryBlock(payload,w,a){
  const start=((w*A+a)*29)%(payload.length-64);
  return Buffer.from(payload.subarray(start,start+64));
}
function pid(w,a){
  return hash(Buffer.from("LIGHT-PID|"+pad(w)+"|"+pad(a),"ascii")).slice(0,24);
}
function exposure(mode,t){
  return mode==="CONTINUOUS"||(mode==="PULSE"&&(t%12)<4);
}
function advance(initial,edges){
  const next=initial.slice();
  for(const [src,dst,rate] of edges){
    const count=div(initial[src]*rate,SCALE);
    next[src]-=count;next[dst]+=count;
  }
  assert.equal(next.reduce((s,x)=>s+x,0),SCALE);
  assert(next.every(x=>Number.isInteger(x)&&x>=0&&x<=SCALE));
  return next;
}
function gates(model,mode){
  let state=model==="THREE_STATE"?[SCALE,0,0]:[SCALE,0,0,0];
  const allowed=[];
  for(let k=0;k<A;k++){
    const lit=exposure(mode,k);
    const e=model==="THREE_STATE"?
      [[0,1,lit?300000:0],[1,2,60000],[2,0,25000]]:
      [[0,1,lit?250000:0],[1,2,95000],[2,1,30000],[2,3,45000],[3,0,25000]];
    state=advance(state,e);
    const open=model==="THREE_STATE"?state[1]:state[1]+state[2];
    allowed.push(open>=100000);
  }
  if(mode==="DARK")assert(allowed.every(x=>!x));
  return allowed;
}
function packet(content,seq,origin,id,lane){
  return {body:Buffer.from(content),seq,origin,pid:id,route:lane,claimed:hash(content)};
}
function validPacket(report,truth,seq,origin,id,lane,gate,w,a){
  const should=sample([truth[0],truth[1],truth[2]],w,a).lane;
  return gate && should===lane && report.seq===seq &&
    report.origin===origin && report.pid===id && report.route===lane &&
    report.claimed===hash(report.body) &&
    hash(report.body)===hash(truth);
}
function mutate(report,kind){
  if(kind==="CLEAN")return report;
  const p={...report};
  if(kind==="CORRUPT"){
    p.body=Buffer.from(report.body);
    p.body[0]^=1;
    p.claimed=hash(p.body); // Coherent local checksum forgery.
  }else if(kind==="STALE")p.seq--;
  else if(kind==="FORGED")p.origin=(p.origin+1)%7;
  else throw Error("UNKNOWN_FAULT");
  return p;
}
function negativity(){
  const src=Buffer.from([255,0,0,...Array(61).fill(0)]);
  const w=7,a=17,seq=w*A+a;
  const id=pid(w,a),route=sample([255,0,0],w,a).lane,origin=(w+a+route)%7;
  const honest=packet(src,seq,origin,id,route);
  const cases={};
  assert(validPacket(honest,src,seq,origin,id,route,true,w,a));
  function held(label,proposal){
    assert(!validPacket(proposal,src,seq,origin,id,route,true,w,a),
      "MUTATION ACCEPTED: "+label);
    cases[label]="HELD";
  }
  held("coherently_rehashed_body",mutate(honest,"CORRUPT"));
  held("stale_sequence",mutate(honest,"STALE"));
  held("forged_origin",mutate(honest,"FORGED"));
  held("forged_pid",{...honest,pid:"000000000000000000000000"});
  held("wrong_qutrit_lane",{...honest,route:(route+1)%3});
  held("unanchored_forged_digest",{...honest,claimed:"0".repeat(64)});
  const falseSource=mutate(honest,"CORRUPT");
  const mathGreenWithFalseAnchor=validPacket(
    falseSource,falseSource.body,seq,origin,id,
    sample([falseSource.body[0],falseSource.body[1],falseSource.body[2]],w,a).lane,
    true,w,a
  );
  // This need not be green under unchanged original route if a colour changed.
  // Derive coherent source-side change with a new independently consistent route.
  const newRoute=sample([...falseSource.body.subarray(0,3)],w,a).lane;
  const newOrigin=(w+a+newRoute)%7;
  const coherent={...falseSource,route:newRoute,origin:newOrigin};
  assert(validPacket(coherent,coherent.body,seq,newOrigin,id,newRoute,true,w,a));
  assert(!validPacket(coherent,src,seq,origin,id,route,true,w,a));
  cases["coherent_shared_source_math_green"]="ORIGIN_UNAUTHENTICATED";
  let thrown=false;
  try{sample([0,0,0],w,a)}catch(err){thrown=/ZERO_NORM/.test(String(err))}
  assert(thrown);
  cases["zero_intensity_norm"]="HELD";
  const p=project([10,20,30]),q=project([11,21,31]);
  assert.deepEqual(p.d,q.d);assert.notEqual(p.s,q.s);
  cases["missing_common_mode"]="AMBIGUOUS_HELD";
  assert.equal(Object.values(cases).filter(x=>x==="HELD").length,7);
  return cases;
}
function rainbow27(){
  const signatures=new Map(),uniqueIDs=new Set();
  let zero=0;
  for(let r=0;r<3;r++)for(let g=0;g<3;g++)for(let b=0;b<3;b++){
    const label=9*r+3*g+b;
    uniqueIDs.add(label);
    const intensity=weights([r,g,b]);
    const code=intensity.join(",");
    if(!signatures.has(code))signatures.set(code,[]);
    signatures.get(code).push(label);
    if(r===0&&g===0&&b===0)zero++;
    project([r,g,b]);
  }
  assert.equal(uniqueIDs.size,27);
  assert.equal(signatures.size,10);
  assert.equal(zero,1);
  const a=weights([255,0,0]);
  assert.deepEqual(a,weights([0,255,0]));
  assert.deepEqual(a,weights([0,0,255]));
  for(const [w,addr] of [[0,0],[7,17],[26,80]]){
    const lanes=[[255,0,0],[0,255,0],[0,0,255]]
      .map(v=>sample(v,w,addr).lane);
    assert.equal(new Set(lanes).size,1);
  }
  const collisions=[...signatures.values()].map(x=>x.length).sort((a,b)=>a-b);
  assert.deepEqual(collisions,[1,1,1,3,3,3,3,3,3,6]);
  return {ordered_trit_ids:27,permutation_invariant_intensity_classes:10,
    class_orbit_sizes:collisions,zero_norm_classes:zero,
    intensity_preserves_color_order:false,
    ordered_base3_preserves_color_order:true,
    rgb_permutation_example_weights:a,
    projector_rank:2,projector_nullity:1};
}
function fleet(){
  const state=Array.from({length:7},()=>[100000,100000,100000]);
  const levels=[0,0,0];
  const lines=[];
  for(let i=0;i<10000;i++){
    const from=i%7;
    const to=(from+1+(i%6))%7;
    assert.notEqual(from,to);
    const asset=i%3,counter=(asset+1)%3;
    const qty=1+i%7;
    assert(state[from][asset]>=qty&&state[to][counter]>=qty);
    state[from][asset]-=qty;
    state[to][asset]+=qty;
    state[to][counter]-=qty;
    state[from][counter]+=qty;
    levels[asset]+=qty;levels[counter]-=qty;
    const sums=[0,1,2].map(c=>state.reduce((s,x)=>s+x[c],0));
    assert.deepEqual(sums,[700000,700000,700000]);
    assert.equal(levels[0]+levels[1]+levels[2],0);
    const delta=[levels[0]-levels[1],levels[1]-levels[2],levels[2]-levels[0]];
    assert.equal(delta.reduce((s,x)=>s+x,0),0);
    const fleetDigest=hash(Buffer.from(state.map(x=>x.join(",")).join(";"),"ascii"));
    lines.push("TRADE|i="+pad(i,5)+"|left="+from+"|right="+to+
      "|asset="+asset+"|other="+counter+"|quantity="+qty+
      "|levels="+levels.join(",")+"|total="+sums.join(",")+
      "|boats_sha256="+fleetDigest+"|json=0");
  }
  return {trace:Buffer.from(lines.join("\n")+"\n","ascii"),
    final_holdings:state,final_levels:levels,
    trades:lines.length,conserved_asset_totals:[700000,700000,700000]};
}
function simulate(out){
  const payload=fixture(),cache=new Map(),lines=[],routeLines=[];
  const counts={0:0,1:0,2:0};
  let hits=0,misses=0,evictions=0,accepts=0,held=0,gateheld=0,rejections=0;
  const pids=new Set();
  for(let w=0;w<W;w++){
    const window={};
    for(const model of GATES)for(const mode of MODES)
      window[model+"|"+mode]=gates(model,mode);
    for(let a=0;a<A;a++){
      const seq=w*A+a,body=memoryBlock(payload,w,a),sum=hash(body),id=pid(w,a);
      assert(!pids.has(id));pids.add(id);
      if(!cache.has(seq)){
        misses++;
        if(cache.size>=LIMIT){cache.delete(cache.keys().next().value);evictions++;}
        cache.set(seq,body);
      }
      assert(Buffer.compare(cache.get(seq),body)===0);
      const orig=[...body.subarray(0,3)];
      const sampled=sample(orig,w,a);
      const {lane}=sampled;
      counts[lane]++;
      rejections+=sampled.rejects;
      const origin=(w+a+lane)%7;
      const healthy=packet(body,seq,origin,id,lane);
      routeLines.push("ROUTE|w="+pad(w)+"|addr="+pad(a)+"|pid="+id+
         "|lane="+lane+"|origin="+origin+
         "|weights="+sampled.weights.join(",")+"|born_rejections="+sampled.rejects+
         "|block_sha256="+sum+"|json=0");
      project(orig);
      for(const model of GATES)for(const mode of MODES){
        const open=window[model+"|"+mode][a];
        for(const fault of FAULTS){
          const attempt=mutate(healthy,fault);
          const accepted=validPacket(attempt,body,seq,origin,id,lane,open,w,a);
          const verdict=!open?"GATE_HELD":(fault==="CLEAN"?"PASS":"FAULT_HELD");
          if(open&&fault==="CLEAN"){assert(accepted);accepts++;hits++;}
          else{assert(!accepted);open?held++:gateheld++;}
          lines.push("LIGHTBEING|w="+pad(w)+"|addr="+pad(a)+
            "|pid="+id+"|gate="+model+"|illum="+mode+"|fault="+fault+
            "|emit="+Number(accepted)+"|verdict="+verdict+
            "|lane="+lane+"|block_sha256="+sum);
        }
      }
    }
  }
  assert.equal(pids.size,2187);
  assert.deepEqual(counts,{"0":1737,"1":241,"2":209});
  assert.equal(hits,8748);
  assert.equal(misses,2187);assert.equal(evictions,1458);
  assert.equal(accepts,8748);assert.equal(held,26244);assert.equal(gateheld,17496);
  assert.equal(lines.length,52488);assert.equal(routeLines.length,2187);
  const sourceHbp=Buffer.from(lines.join("\n")+"\n","ascii");
  assert.equal(sourceHbp.length,10773162);
  assert.equal(hash(sourceHbp),TARGET_CASE_SHA);
  const routesHbp=Buffer.from(routeLines.join("\n")+"\n","ascii");
  const flotilla=fleet();
  const rainbow=rainbow27();
  const negatives=negativity();
  const summary={
    schema:SCHEMA,status:"PASS",
    producer_commit:"5045b5b2ee1960bc469b5588a1b17601490aef6a",
    baseline_original_hbp_bytes:sourceHbp.length,
    baseline_original_hbp_sha256:hash(sourceHbp),
    fixture_bytes:payload.length,fixture_sha256:hash(payload),
    independent_pids:pids.size,total_packet_cases:lines.length,
    genuine_clean_accepted:accepts,active_faults_held:held,
    closed_gates_held:gateheld,
    cache_capacity:LIMIT,cache_hits:hits,cache_misses:misses,cache_evictions:evictions,
    qutrit_sampled_routes:routeLines.length,
    pseudo_born_lane_census:counts,pseudo_born_rejections:rejections,
    route_trace_bytes:routesHbp.length,route_trace_sha256:hash(routesHbp),
    fleet_trades:flotilla.trades,fleet_trace_bytes:flotilla.trace.length,
    fleet_trace_sha256:hash(flotilla.trace),
    fleet_final_holdings:flotilla.final_holdings,
    fleet_final_levels:flotilla.final_levels,
    fleet_asset_totals:flotilla.conserved_asset_totals,
    rainbow27:rainbow,negative_controls:negatives,
    real_optical_photons:false,quantum_computer:false,
    rainbow_physical_spectrum_measured:false,biology_fitted:false,
    source_origin_authenticated:false,independent_physical_hosts:false
  };
  fs.mkdirSync(out,{recursive:true});
  const save=(name,raw)=>{
    fs.writeFileSync(path.join(out,name),raw);
    fs.writeFileSync(path.join(out,name+".sha256"),hash(raw)+"  "+name+"\n","ascii");
  };
  save("peer-original-cases.hbp",sourceHbp);
  save("peer-routes.hbp",routesHbp);
  save("peer-fleet.hbp",flotilla.trace);
  function stable(v){
    if(v===null||typeof v!=="object")return JSON.stringify(v);
    if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";
    return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";
  }
  save("peer-results.json",Buffer.from(stable(summary)+"\n","ascii"));
  console.log(JSON.stringify({status:"PASS",case_bytes:sourceHbp.length,
    case_sha256:hash(sourceHbp),routes_sha256:hash(routesHbp),
    fleet_sha256:hash(flotilla.trace),
    lanes:counts,rainbow_classes:rainbow.permutation_invariant_intensity_classes,
    executed_controls:negatives}));
}
if(process.argv.length!==3)throw Error("usage: node round3_qutrit_rainbow_peer.js OUT_DIR");
simulate(process.argv[2]);
