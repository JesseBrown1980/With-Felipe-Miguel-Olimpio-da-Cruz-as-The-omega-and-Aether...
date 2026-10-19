#!/usr/bin/env node
"use strict";
/*
 * Independent Node22 witness proof & full original PR81 replay.
 * Does NOT import Python or source producer. No physics claimed.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const V2_SHA="8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672";
const SOURCE_SHA="351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1";
const SCHEMA="ASOLARIA-SEAT3-QUADRATIC-3BIT-WITNESS-V1";
const DOMAIN=Buffer.from("ASOLARIA-R27-V2|TICKET|","ascii");
const MONOMIALS=["r2","g2","b2","rg","rb","gb"];
const CASERX=/^CASE\|w=(\d{2})\|loc=(\d{2})\|id=(\d{2})\|rgb=([0-2]{3})\|raw=(\d+),(\d+),(\d+)\|prim=(\d+),(\d+),(\d+)\|den=(\d+)\|lane=([012H])$/;
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const pad=i=>String(i).padStart(2,"0");
function guard(ok,reason){if(!ok)throw Error(reason);}
function rgb(id){
  guard(Number.isInteger(id)&&id>=0&&id<27,"INVALID_SECTOR");
  return [Math.floor(id/9),Math.floor(id/3)%3,id%3];
}
function gcd(a,b){while(b!==0){const c=a%b;a=b;b=c;}return a;}
function qutrit(id){
  const [r,g,b]=rgb(id);
  const s=r+g+b,q=r*r+g*g+b*b-r*g-r*b-g*b;
  const raw=[s*s,q,q];
  guard(raw.reduce((a,b)=>a+b,0)===3*(r*r+g*g+b*b),"FOURIER_IDENTITY");
  let k=0;
  for(const n of raw)k=gcd(k,n);
  const primitive=k===0?[0,0,0]:raw.map(x=>x/k);
  return {raw,primitive};
}
function key(primitive){
  return primitive.every(x=>x===0)?"DARK":primitive.join(",");
}
function witness(id){
  const [r,g,b]=rgb(id);
  return (r+4*g+3*b+4*r*g)%8;
}
function affine(id,a,b,c,m){
  const [r,g,blue]=rgb(id);
  return (a*r+b*g+c*blue)%m;
}
function quadratic(id,a,b,c,d,monomial){
  const [r,g,blue]=rgb(id);
  const terms=[r*r,g*g,blue*blue,r*g,r*blue,g*blue];
  return (a*r+b*g+c*blue+d*terms[MONOMIALS.indexOf(monomial)])%8;
}
function lane(w,loc,prim){
  const total=prim.reduce((a,b)=>a+b,0);
  if(total===0)return "H";
  const denominator=BigInt(total);
  const ceiling=((1n<<256n)/denominator)*denominator;
  for(let attempt=0;attempt<10000;attempt++){
    const bits=Buffer.allocUnsafe(8);
    bits.writeUInt16LE(w,0);bits.writeUInt16LE(loc,2);bits.writeUInt32LE(attempt,4);
    const bytes=crypto.createHash("sha256").update(DOMAIN).update(bits).digest();
    const ticket=BigInt("0x"+bytes.toString("hex"));
    if(ticket<ceiling){
      const rem=Number(ticket%denominator);
      return rem<prim[0]?"0":rem<prim[0]+prim[1]?"1":"2";
    }
  }
  throw Error("TICKET_REJECTION_OVERFLOW");
}
function groupSources(){
  const classes=new Map(),rawClasses=new Map();
  for(let id=0;id<27;id++){
    const {raw,primitive}=qutrit(id);
    const cls=key(primitive),rawKey=raw.join(",");
    if(!classes.has(cls))classes.set(cls,[]);
    if(!rawClasses.has(rawKey))rawClasses.set(rawKey,[]);
    classes.get(cls).push(id);
    rawClasses.get(rawKey).push(id);
  }
  assert.equal(classes.size,7);
  assert.equal(rawClasses.size,10);
  assert.deepEqual([...classes.values()].map(x=>x.length).sort((a,b)=>a-b),[1,2,3,3,6,6,6]);
  assert.deepEqual([...rawClasses.values()].map(x=>x.length).sort((a,b)=>a-b),
                   [1,1,1,3,3,3,3,3,3,6]);
  return {classes,rawClasses};
}
function decodeMap(classes){
  const reverse=new Map();
  for(const [klass,members] of classes)for(const id of members){
    const idKey=klass+"|"+witness(id);
    guard(!reverse.has(idKey),"THREE_BIT_WITNESS_COLLISION");
    reverse.set(idKey,id);
  }
  guard(reverse.size===27,"LOST_IDENTITIES");
  for(let id=0;id<27;id++)
    guard(reverse.get(key(qutrit(id).primitive)+"|"+witness(id))===id,
          "NOT_BIJECTIVE");
  guard(Math.max(...[...classes.values()].map(v=>v.length))===6,"MAX_CLASS_CHANGED");
  return reverse;
}
function scanAffine(classes){
  const stats=[];
  for(let modulus=2;modulus<=11;modulus++){
    let count=0,first=null;
    for(let a=0;a<modulus;a++)for(let b=0;b<modulus;b++)
      for(let c=0;c<modulus;c++){
        if([...classes.values()].every(members=>
           new Set(members.map(id=>affine(id,a,b,c,modulus))).size===members.length)){
          count++;
          if(first===null)first=[a,b,c];
        }
      }
    stats.push({modulus,valid_coefficient_triples:count,first});
  }
  assert.deepEqual(stats.map(v=>v.valid_coefficient_triples),
    [0,0,0,0,0,0,0,0,0,60]);
  assert.deepEqual(stats.at(-1).first,[1,3,4]);
  return stats;
}
function scanQuadratic(classes){
  const data=[];
  for(const monomial of MONOMIALS){
    let count=0,first=null;
    for(let a=0;a<8;a++)for(let b=0;b<8;b++)
      for(let c=0;c<8;c++)for(let d=0;d<8;d++){
        if([...classes.values()].every(members=>
           new Set(members.map(id=>quadratic(id,a,b,c,d,monomial))).size===members.length)){
          count++;
          if(first===null)first=[a,b,c,d];
        }
      }
    data.push({monomial,valid_coefficient_quads:count,first});
  }
  assert.deepEqual(data.map(v=>v.valid_coefficient_quads),[0,0,0,8,8,8]);
  assert.deepEqual(data[3].first,[1,4,3,4]);
  return data;
}
function caseReplay(source,reverse){
  guard(source.length===3886535&&sha(source)===V2_SHA,"ORIGINAL_V2_SHA_HELD");
  guard(source[source.length-1]===10,"ORIGINAL_V2_FINAL_LF");
  const rows=source.toString("ascii").trimEnd().split("\n");
  guard(rows.length===59050,"ORIGINAL_V2_ROWS_HELD");
  guard(rows[0].startsWith("R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|")&&
        rows[0].includes("source_sha256="+SOURCE_SHA),"WRONG_ORIGINAL_ANCHOR");
  const census={"0":0,"1":0,"2":0,"H":0};
  const output=[];
  for(let i=0;i<59049;i++){
    const m=rows[i+1].match(CASERX);
    guard(m!==null,"MALFORMED_PUBLISHED_CASE");
    const w=Number(m[1]),loc=Number(m[2]),id=Number(m[3]);
    guard(w===Math.floor(i/2187)&&loc===Math.floor(i/27)%81&&id===i%27,
          "SOURCE_SEQUENCE_REPLAY_HELD");
    const [r,g,b]=rgb(id);
    guard(m[4]===""+r+g+b,"SOURCE_RGB_MISMATCH");
    const {raw,primitive}=qutrit(id);
    assert.deepEqual(m.slice(5,8).map(Number),raw);
    assert.deepEqual(m.slice(8,11).map(Number),primitive);
    guard(Number(m[11])===primitive.reduce((a,b)=>a+b,0),"SOURCE_TOTAL_MISMATCH");
    const actual=lane(w,loc,primitive);
    guard(actual===m[12],"FORGED_LANE_HELD");
    const klass=key(primitive),side=witness(id);
    guard(reverse.get(klass+"|"+side)===id,"LOSSLESS_ORDER_GUARD");
    census[actual]++;
    output.push("MAP|w="+pad(w)+"|loc="+pad(loc)+"|id="+pad(id)+
                "|p="+klass+"|side="+side+"|lane="+actual+"|restore="+pad(id));
  }
  assert.deepEqual(census,{"0":36906,"1":10179,"2":9777,"H":2187});
  return {output,census};
}
function packet(knownId,receivedClass,side,reportedLane,w,loc,requiredW,requiredLoc,anchored){
  guard(anchored,"ORIGIN_UNAUTHENTICATED");
  guard(w===requiredW&&loc===requiredLoc,"STALE_CONTEXT_HELD");
  const klass=key(qutrit(knownId).primitive);
  guard(klass===receivedClass,"SOURCE_CLASS_MISMATCH");
  guard(witness(knownId)===side,"SOURCE_ORDER_WITNESS_MISMATCH");
  guard(reportedLane===lane(w,loc,qutrit(knownId).primitive),"SOURCE_LANE_MISMATCH");
  return true;
}
function attacks(classes,reverse,source){
  const set=[...classes].find(([,ids])=>ids.length>1);
  const [klass,members]=set;
  const [left,right]=members;
  guard(reverse.get(klass+"|"+witness(right))===right&&left!==right,
        "EXPLICIT_STRUCTURAL_SPOOF_MISSING");
  const negatives={};
  function isHeld(name,fn){
    let fail=false;
    try{fn();}catch(e){fail=true;}
    guard(fail,"FORGED_PACKET_ACCEPTED:"+name);
    negatives[name]="HELD";
  }
  const id=1, name=key(qutrit(id).primitive),side=witness(id);
  const route=lane(0,0,qutrit(id).primitive);
  isHeld("wrong_witness_with_valid_other_identity",()=>packet(
    left,klass,witness(right),lane(0,0,qutrit(left).primitive),0,0,0,0,true));
  isHeld("wrong_normalized_probability_class",()=>packet(id,"1,0,0",side,route,0,0,0,0,true));
  isHeld("witness_erased",()=>packet(id,name,null,route,0,0,0,0,true));
  isHeld("stale_wave_sequence",()=>packet(id,name,side,route,1,0,0,0,true));
  isHeld("wrong_location",()=>packet(id,name,side,route,0,1,0,0,true));
  isHeld("wrong_route",()=>packet(id,name,side,route==="2"?"1":"2",0,0,0,0,true));
  isHeld("no_trusted_source_anchor",()=>packet(id,name,side,route,0,0,0,0,false));
  isHeld("invalid_out_of_range_id",()=>qutrit(27));
  isHeld("dark_is_not_valid_probability",()=>packet(0,"1,0,0",0,"0",0,0,0,0,true));
  isHeld("tampered_original_trace_byte",()=>guard(
    sha(Buffer.concat([source.subarray(0,-1),Buffer.from("x")]))===V2_SHA,
    "ORIGINAL_ROOT_TAMPERED"));
  guard(Object.keys(negatives).length===10,"NEGATIVE_TEST_COVERAGE");
  negatives.self_consistent_attacker_owned_manifest="ORIGIN_UNAUTHENTICATED";
  negatives.wrong_valid_in_class_witness_is_decodable_as_another_id="NEEDS_TRUSTED_SOURCE_BINDING";
  return negatives;
}
function canonical(v){
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function store(dir,name,data){
  fs.writeFileSync(path.join(dir,name),data);
  fs.writeFileSync(path.join(dir,name+".sha256"),sha(data)+"  "+name+"\n","ascii");
}
function main(input,output){
  const source=fs.readFileSync(path.join(input,"rainbow27","rainbow27-v2.hbp"));
  const {classes,rawClasses}=groupSources();
  const reverse=decodeMap(classes);
  const affineResults=scanAffine(classes);
  const quadraticResults=scanQuadratic(classes);
  const {output:cases,census}=caseReplay(source,reverse);
  const negatives=attacks(classes,reverse,source);
  const identity=[];
  for(let id=0;id<27;id++){
    const [r,g,b]=rgb(id);
    const name=key(qutrit(id).primitive);
    identity.push("IDENTITY|id="+pad(id)+"|rgb="+r+g+b+
                  "|p="+name+"|side="+witness(id)+
                  "|class_rank="+classes.get(name).indexOf(id)+
                  "|aff11="+affine(id,1,3,4,11));
  }
  const trace=Buffer.from(
    ["PORTAL|schema="+SCHEMA+"|ordered=27|normalized_classes=7|external_origin_authenticated=0",
     ...identity,...cases].join("\n")+"\n","ascii");
  const hraw=(18*Math.log2(3)+6*Math.log2(6))/27;
  const hnorm=(18*Math.log2(6)+6*Math.log2(3)+2*Math.log2(2))/27;
  guard(Math.abs((hnorm-hraw)-14/27)<1e-12,"ENTROPY_DIFF_MISMATCH");
  const report={
    schema:SCHEMA,verdict:"PASS",ordered_id_count:27,
    normalized_classes_including_dark:7,valid_normalized_probabilities:6,
    raw_intensity_classes:10,
    normalized_class_sizes:[...classes.values()].map(v=>v.length).sort((a,b)=>a-b),
    max_normalized_equivalence_class:6,
    minimum_fixed_class_conditioned_side_bits:3,
    extra_class_label_fixed_bits:3,
    fixed_class_plus_witness_total_bits:6,
    standalone_direct_ordered_id_fixed_bits:5,
    quadratic_formula:"(r+4g+3b+4rg)%8",
    quadratic_witness_modulus:8,
    mathematical_inverse_total:27,
    normalized_class_members:[...classes].map(([signature,ids])=>({signature,ids})),
    affine_search:affineResults,degree2_monomial_search:quadraticResults,
    raw_conditional_entropy_uniform_bits:hraw.toFixed(12),
    norm_conditional_entropy_uniform_bits:hnorm.toFixed(12),
    additional_normalized_loss_bits_exact:"14/27",
    verified_original_v2_trace_sha256:V2_SHA,
    verified_original_v2_rows:59049,
    reconstructed_route_census:census,
    full_trace_bytes:trace.length,full_trace_sha256:sha(trace),
    negative_controls:negatives,mathematical_recovery:true,
    digital_integrity_against_pinned_source:true,
    externally_authenticated_origin:false,physical_spectrum_measured:false
  };
  const json=Buffer.from(canonical(report)+"\n","ascii");
  fs.mkdirSync(output,{recursive:true});
  store(output,"witness59049.hbp",trace);
  store(output,"witness-result.json",json);
  console.log(JSON.stringify({verdict:"PASS",witness:"quadratic_mod8",source_cases:59049,
    affine11_count:affineResults.at(-1).valid_coefficient_triples,
    quadratic_rg_count:quadraticResults[3].valid_coefficient_quads,
    hbp_sha256:sha(trace),json_sha256:sha(json)}));
}
if(process.argv.length!==4)throw Error("usage: node quadratic_witness.js ORIGINAL_PR81_ARTIFACT OUTPUT_DIR");
main(process.argv[2],process.argv[3]);
