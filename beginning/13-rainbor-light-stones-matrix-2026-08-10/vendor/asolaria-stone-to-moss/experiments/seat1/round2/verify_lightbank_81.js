#!/usr/bin/env node
"use strict";
/** Independently verify actual QR-extracted records and repeat the complete
 * integer 3-state software gate in JS BigInt. Does NOT decode pixels itself.
 * Pixel-plane decoding and destructive PNG injections are exercised in Python.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const S=1000000000n,CHUNK=2100,N=81,TICKS=1200,TARGET=350000000n,GATE=50000000n;
const SCHEMA="ASOLARIA-SEAT1-81-RGB-LIGHTBANK-V1";
const TIMES=["-","0","+"],COLORS=["R","G","B"],SPACES=["x","y","z"];
const WORDS=[["house","casa","בית"],["door","porta","דלת"],["light","luz","אור"]];
const PROFILES=["paired_short","paired_long"];
const ARMS=["dark","open_loop_full","open_loop_half","feedback_now","feedback_delay10","feedback_stale100"];
const CHECKPOINTS=new Set([0,99,100,299,300,399,400,599,600,699,700,899,900,1199]);
function ck(v,label){if(!v)throw Error(label)}
function sha(b){return crypto.createHash("sha256").update(b).digest("hex")}
function get(root,name){return fs.readFileSync(path.join(root,name))}
function parse(root,name){return JSON.parse(get(root,name).toString("utf8"))}
function decodeReassemble(reads,count,expected){
  const parts=new Map();
  for(const read of reads){
    ck(typeof read.qr_base64==="string"&&/^[A-Za-z0-9+/]+={0,2}$/.test(read.qr_base64),"INVALID_BASE64");
    const packet=Buffer.from(read.qr_base64,"base64");
    ck(packet.length>=5&&packet.length<=2104,"BAD_PACKET_LENGTH");
    ck(packet.toString("base64")===read.qr_base64,"NONCANONICAL_BASE64");
    const index=packet.readUInt32LE(0);
    ck(index===read.index && index<count,"WRONG_INDEX");
    ck(!parts.has(index),"DUPLICATE_INDEX");
    parts.set(index,packet.subarray(4));
  }
  ck(parts.size===count,"MISSING_INDEX");
  const blocks=[];
  for(let i=0;i<count;i++){
    ck(parts.has(i),"MISSING_INDEX");
    ck(i===count-1 || parts.get(i).length===CHUNK,"SHORT_NONFINAL_CHUNK");
    blocks.push(parts.get(i));
  }
  const data=Buffer.concat(blocks);
  ck(sha(data)===expected,"SOURCE_SHA_MISMATCH");
  return data;
}
function checkMemories(data){
  const top=JSON.parse(data.toString("utf8"));
  ck(top.schema===SCHEMA&&top.records.length===N,"MEMORY_SCHEMA_OR_COUNT");
  const cells=new Set();
  top.records.forEach((record,i)=>{
    const cell=Math.floor(i/3);
    const t=TIMES[Math.floor(cell/9)], c=COLORS[Math.floor(cell/3)%3],s=SPACES[cell%3];
    cells.add([t,c,s].join("|"));
    ck(record.id==="site-"+String(i).padStart(3,"0"),"IDENTITY_CHANGED");
    ck(record.room===44&&record.time===t&&record.color===c&&record.space===s,"ADDRESS_CHANGED");
    const words=WORDS[i%3];
    ck(record.language_views.en===words[0] && record.language_views.pt===words[1] &&
      record.language_views.he===words[2],"LANGUAGE_LABEL_CHANGED");
    const witness=sha(Buffer.from("ASOLARIA|LIGHTBANK|ROUND2C|"+record.id+"|"+t+"|"+c+"|"+s,"ascii"));
    ck(record.witness_sha256===witness,"WITNESS_MISMATCH");
    const triple=["en","pt","he"].map(lang=>sha(Buffer.from(record.language_views[lang],"utf8")).slice(0,2))
      .map(hex=>parseInt(hex,16));
    const sum=triple.reduce((a,b)=>a+b,0);
    const residue=triple.map(n=>3*n-sum);
    ck(residue.reduce((a,b)=>a+b,0)===0,"PROJECTOR_NOT_CONSERVING");
    ck(residue.every((r,k)=>(r+sum)%3===0&&(r+sum)/3===triple[k]),"FAILED_PROJECTOR_RECOVERY");
    ck(triple.every((v,k)=>3*(v+1)-triple.reduce((a,b)=>a+b+1,0)===residue[k]),"COMMON_MODE_SHOULD_DISAPPEAR");
  });
  ck(cells.size===27,"ADDRESS_CARDINALITY");
  return top.records;
}
function prob(rate){return S*BigInt(rate)*20n/(1000000n+BigInt(rate)*20n)}
const PA=prob(800),PB=prob(450),PG=prob(120);
function light(profile,tick){
  if(profile==="paired_short")return tick>=100&&tick<300||tick>=400&&tick<600;
  if(profile==="paired_long")return tick>=100&&tick<300||tick>=700&&tick<900;
  throw Error("bad profile");
}
function simulate(){
  const metrics=[],frames=[];
  let checks=0;
  for(const profile of PROFILES){
    for(const arm of ARMS){
      let totalError=0n,totalCommands=0n,authorized=0n,switches=0n,totalCurrent=0n;
      const stream=crypto.createHash("sha256");
      for(let identity=0;identity<N;identity++){
        let c=S,o=0n,r=0n,previous=0;
        const history=[];
        for(let tick=0;tick<TICKS;tick++){
          const enabled=light(profile,tick),target=enabled?TARGET:0n;
          let command=0;
          if(arm==="dark")command=0;
          else if(arm==="open_loop_full")command=Number(enabled);
          else if(arm==="open_loop_half")command=Number(enabled&&tick%2===0);
          else{
            const lag=arm==="feedback_now"?0:arm==="feedback_delay10"?10:100;
            const obs=lag===0?o:(tick>=lag?history[tick-lag]:0n);
            command=Number(enabled&&obs<TARGET);
          }
          const co=command?c*PA/S:0n,or=o*PB/S,rc=r*PG/S;
          c=c-co+rc; o=o+co-or; r=r+or-rc;
          ck(c>=0n&&o>=0n&&r>=0n&&c+o+r===S,"MASS_GATE_FAILURE");
          history.push(o);checks++;
          totalError+=o>target?o-target:target-o;
          totalCommands+=BigInt(command);
          authorized+=BigInt(command&&o>=GATE?1:0);
          switches+=BigInt(command!==previous?1:0);
          previous=command;
          const current=-(120000n*o/S);
          totalCurrent+=current;
          if(CHECKPOINTS.has(tick)){
            const line="FRAME|profile="+profile+"|arm="+arm+"|id=site-"+String(identity).padStart(3,"0")+
                "|tick="+String(tick).padStart(4,"0")+"|C="+c+"|O="+o+"|R="+r+
                "|I_millipA="+current+"\n";
            frames.push(line);stream.update(line,"ascii");
          }
        }
        if(arm==="dark")ck(o===0n&&r===0n,"DARK_STATE_NOT_CLOSED");
      }
      metrics.push({profile,arm,light_on_site_ticks:Number(totalCommands),authorized_reads:Number(authorized),
        target_error:Number(totalError),light_switches:Number(switches),
        current_proxy_sum_millipA:Number(totalCurrent),
        checkpoint_sha256:stream.digest("hex"),site_ids:N});
    }
  }
  const text="MODEL|schema="+SCHEMA+"|n=81|dt_ms=20|ticks=1200|physical_observations=0\n"+
     frames.join("")+"END|checkpoints="+frames.length+"|mass_checks="+checks+"|physical_light_storage=0\n";
  return {metrics,hbp:Buffer.from(text,"ascii"),checks,frames:frames.length};
}
function main(){
  const root=process.argv[2];
  ck(root,"usage: node verify_lightbank_81.js /path/to/evidence");
  const manifest=parse(root,"manifest.json");
  const reads=parse(root,"qr-extracted-reads.json");
  const results=parse(root,"results.json");
  ck(manifest.schema===SCHEMA&&reads.schema===SCHEMA&&results.schema===SCHEMA,"FORMAT");
  ck(manifest.memories===N&&manifest.logical_addresses===27&&manifest.chunk_size===CHUNK,"MANIFEST");
  const source=decodeReassemble(reads.reads,manifest.chunks.length,manifest.source_sha256);
  ck(source.equals(get(root,"lightbank-memories.json")),"QR_READS_DIFFER_FROM_SOURCE_BYTES");
  ck(source.length===manifest.source_bytes,"LENGTH_DIFF");
  ck(sha(source)===results.memory_sha256,"SHA_DIFFER");
  const records=checkMemories(source);
  ck(records.length===81,"WRONG_MEMORY_COUNT");
  const replay=simulate();
  ck(replay.frames===results.frame_rows&&replay.checks===results.mass_checks,"COUNTS_DRIFT");
  ck(sha(replay.hbp)===results.hbp_sha256,"INDEPENDENT_HBP_SHA_DRIFT");
  ck(replay.hbp.equals(get(root,"photocycle-frame.hbp")),"FULL_TRACE_DRIFT");
  ck(replay.metrics.length===results.metrics.length,"METRIC_COUNT_DRIFT");
  for(let i=0;i<replay.metrics.length;i++){
    for(const [field,value] of Object.entries(replay.metrics[i]))
      ck(results.metrics[i][field]===value,"METRIC_DRIFT_"+i+"_"+field);
  }
  ck(results.controls.reordered_images===true,"IMAGE_REORDER_NOT_TESTED");
  ck(results.controls.projector_three_view_exact===81,"PROJECTOR_NOT_TESTED");
  ck(results.controls.erased_physical_pixel_plane==="MISSING_CHUNK","ERASURE_FAULT_NOT_TESTED");
  ck(results.controls.changed_decoded_data_byte==="SHA256","BYTES_FAULT_NOT_TESTED");
  ck(results.controls.duplicate_conflicting_index==="DUPLICATE","DUPLICATE_FAULT_NOT_TESTED");
  ck(results.controls.manifest_hash_swap==="MANIFEST_SWAP","MANIFEST_FAULT_NOT_TESTED");
  ck(results.controls.synchronized_source_and_manifest_spoof==="HELD_EXTERNAL_SOURCE_TRUST_NOT_TESTED","UNJUSTIFIED_SOURCE_AUTH");
  ck(results.physical_optical_storage_verified===false&&results.biological_kinetics_fitted===false,"PHYSICAL_CLAIM");
  ck(results.human_prompts_per_tick===0,"PROMPT_PER_TICK");
  for(const name of ["lightbank-memories.json","qr-extracted-reads.json","manifest.json","photocycle-frame.hbp","results.json"]){
    const row=get(root,name+".sha256").toString("ascii").trim().split(/\s+/);
    ck(row[0]===sha(get(root,name))&&row[1]===name,"SHA_SIDECAR_ERROR_"+name);
  }
  console.log(JSON.stringify({status:"PASS",method:"independent_JS_integer_reassembly_and_kinetics",
    memories:81,logical_addresses:27,chunks:manifest.chunks.length,images:manifest.colour_codes,
    qr_bytes_sha256:sha(source),hbp_sha256:sha(replay.hbp),frame_rows:replay.frames,
    exact_mass_checks:replay.checks,real_png_plane_fault_exercised:true,
    physically_optical:false}));
}
main();
