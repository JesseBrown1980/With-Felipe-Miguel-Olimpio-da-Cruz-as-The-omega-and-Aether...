#!/usr/bin/env node
"use strict";
/* Seat4 R5 synthetic dual-key signed mapping. Fixture keys are PUBLIC TEST SEEDS.
   Cryptographic consistency is NOT independent physical spectrum provenance. */
const crypto=require("node:crypto"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const BANDS=["red","orange","yellow","green","blue","indigo","violet"];
const PORTS=[2,5,0,6,1,4,3],EPOCH=20261015,NONCE="SEAT4-R5-REPRODUCIBLE-TEST-NONCE-NOT-UNPREDICTABLE";
const SHA={
 source:"02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22",
 bank:"52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345",
 index:"6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee",
 aliases:"2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e"
};
const PUBS={authority:"9c64cddd3be7b57eb498f3809f78a346fa3e4ce5bc80869adb867edec8b21c6f",
 witness:"eba347587f749f6a0e58e7a6be83081cf1a204e880fe527f82a38063f1da1a0d"};
const D_AUTH="ASOLARIA-SEAT4-AUTH-MAP-V1\n",D_WIT="ASOLARIA-SEAT4-OBS-V1\n";
const digest=b=>crypto.createHash("sha256").update(b).digest("hex");
function canonical(x) {
 if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";
 if(x!==null&&typeof x==="object")return "{"+Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+canonical(x[k])).join(",")+"}";
 return JSON.stringify(x);
}
const signedBytes=(domain,obj)=>Buffer.from(domain+canonical(obj)+"\n","utf8");
function keypair(which){
 const seed=crypto.createHash("sha256").update("ASOLARIA-SEAT4-R5-"+which+"-TEST-ONLY-20261015").digest();
 const der=Buffer.concat([Buffer.from("302e020100300506032b657004220420","hex"),seed]);
 const privateKey=crypto.createPrivateKey({key:der,format:"der",type:"pkcs8"});
 const publicKey=crypto.createPublicKey(privateKey);
 const raw=publicKey.export({format:"der",type:"spki"}).subarray(-32).toString("hex");
 assert.equal(raw,PUBS[which.toLowerCase()]);
 return {privateKey,publicKey};
}
function signature(k,domain,obj){return crypto.sign(null,signedBytes(domain,obj),k.privateKey).toString("base64");}
function authentic(pub,domain,obj,sig){return crypto.verify(null,signedBytes(domain,obj),pub,Buffer.from(sig,"base64"));}
function readOriginal(root){
 const files={
 source:["base-evidence/lightbank-memories.json",SHA.source],
 bank:["rainbow-evidence/rainbow7-bank.jsonl",SHA.bank],
 index:["rainbow-evidence/rainbow7-index.hbi",SHA.index],
 aliases:["ordered-evidence/ordered27-rainbow7-index.hbi",SHA.aliases]};
 const x={};
 for(const [name,[rel,sha]] of Object.entries(files)){
  const bytes=fs.readFileSync(path.join(root,rel));assert.equal(digest(bytes),sha,"SOURCE_PIN_"+name);x[name]=bytes;
 }
 assert.equal(JSON.parse(x.source.toString("utf8")).records.length,81);
 assert.equal(x.aliases.toString("ascii").trimEnd().split("\n").length,15309);
 const rows=new Map();
 for(const ln of x.index.toString("ascii").trimEnd().split("\n")){
  const [type,...fields]=ln.split("|");assert.equal(type,"MEM");
  const o=Object.fromEntries(fields.map(s=>s.split("=")));
  const id=Number(o.id.slice(-3)),off=Number(o.offset),len=Number(o.length);
  assert(BANDS.includes(o.band)&&id>=0&&id<81&&off>=0&&len>0&&off+len<=x.bank.length);
  const payload=x.bank.subarray(off,off+len);assert.equal(digest(payload),o.sha256);
  assert.deepEqual(JSON.parse(payload.toString("utf8")).record,JSON.parse(x.source.toString("utf8")).records[id]);
  rows.set(o.band+"|"+id,o.sha256);
 }
 assert.equal(rows.size,567);
 return rows;
}
function obsTag(entry,sector,site,band,port){
 return digest(Buffer.from("ASOLARIA-SEAT4-OBS-TAG-V1|"+
   [SHA.bank,sector,site,band,port,entry,EPOCH,NONCE].join("|"),"utf8"));
}
function frame(sector,site,seq,mapSha,rows){
 const observations=BANDS.map((band,i)=>{
  const entry_sha256=rows.get(band+"|"+site),port=PORTS[i];
  return {band,port,entry_sha256,tag:obsTag(entry_sha256,sector,site,band,port)};
 });
 return {schema:"ASOLARIA-SEAT4-SPECTRUM-OBS-V1",source_bank_sha256:SHA.bank,
  mapping_sha256:mapSha,nonce:NONCE,epoch:EPOCH,sequence:seq,sector,coords:[
   Math.floor(sector/9),Math.floor(sector/3)%3,sector%3],site,observations};
}
function trustedCheck(m,authPub,witPub,packet,ledger,expected){
 if(!authentic(authPub,D_AUTH,m.payload,m.signature))return "HOLD_AUTHORITY_SIGNATURE";
 if(!authentic(witPub,D_WIT,packet.payload,packet.signature))return "HOLD_WITNESS_SIGNATURE";
 const x=m.payload,p=packet.payload;
 if(x.schema!=="ASOLARIA-SEAT4-SPECTRUM-MAPPING-V1"||x.source_bank_sha256!==SHA.bank||
    x.source81_sha256!==SHA.source||x.base_index_sha256!==SHA.index||
    x.alias_index_sha256!==SHA.aliases||x.epoch!==EPOCH||x.nonce!==NONCE)
     return "HOLD_SOURCE_ROOT";
 if(JSON.stringify(x.bands)!==JSON.stringify(BANDS)||JSON.stringify(x.ports)!==JSON.stringify(PORTS))
     return "HOLD_SOURCE_MAPPING";
 if(new Set(x.ports).size!==7)return "HOLD_MAPPING_NOT_BIJECTIVE";
 if(p.schema!=="ASOLARIA-SEAT4-SPECTRUM-OBS-V1"||p.mapping_sha256!==digest(signedBytes(D_AUTH,x))||
    p.source_bank_sha256!==SHA.bank||p.epoch!==EPOCH||p.nonce!==NONCE)return "HOLD_CONTEXT";
 if(p.sector!==expected.sector||p.site!==expected.site||p.sequence!==expected.sequence)
    return "HOLD_REPLAY_OR_ID";
 if(!Number.isInteger(p.sector)||p.sector<0||p.sector>26||
    !Number.isInteger(p.site)||p.site<0||p.site>80)return "HOLD_BAD_ADDRESS";
 const c=[Math.floor(p.sector/9),Math.floor(p.sector/3)%3,p.sector%3];
 if(JSON.stringify(p.coords)!==JSON.stringify(c))return "HOLD_ORDER";
 if(!Array.isArray(p.observations)||p.observations.length!==7)return "HOLD_ERASURE";
 const seen=new Set();
 for(let i=0;i<7;i++){
  const o=p.observations[i];if(o.band!==BANDS[i]||o.port!==PORTS[i]||seen.has(o.port))return "HOLD_CHANNEL_REASSIGN";
  seen.add(o.port);
  const entry=expected.rows.get(o.band+"|"+p.site);
  if(o.entry_sha256!==entry||o.tag!==obsTag(entry,p.sector,p.site,o.band,o.port))return "HOLD_SOURCE_TAG";
 }
 const last=ledger.last??0;
 if(p.sequence<=last)return "HOLD_REPLAY";
 ledger.last=p.sequence;return "PASS_TEST_SIGNED_DIGITAL";
}
function mutations(m,ak,wk,first,rows){
 const expected={sector:0,site:0,sequence:1,rows};
 const authKey=ak.publicKey,witKey=wk.publicKey;
 const cloned=x=>JSON.parse(JSON.stringify(x));
 const resign=(p)=>({payload:p,signature:signature(wk,D_WIT,p)});
 const reference=()=>trustedCheck(m,authKey,witKey,first,{last:0},expected);
 assert.equal(reference(),"PASS_TEST_SIGNED_DIGITAL");
 const failing=(label,manifest,packet,expectedVerdict=undefined,pubA=authKey,pubW=witKey)=>{
  const got=trustedCheck(manifest,pubA,pubW,packet,{last:0},expected);
  assert.notEqual(got,"PASS_TEST_SIGNED_DIGITAL",label);
  if(expectedVerdict)assert.equal(got,expectedVerdict,label);
  return {name:label,result:got};
 };
 const failures=[];
 // Traverse all of S7, excluding identity: actual data/tag reassignment with unchanged signatures.
 let perms=0;
 function permute(a,left){
  if(!left.length){
   perms++;
   if(a.every((x,i)=>x===PORTS[i]))return;
   const changed=cloned(first);
   for(let i=0;i<7;i++){
    const o=changed.payload.observations[i];o.port=a[i];
    o.tag=obsTag(o.entry_sha256,0,0,o.band,o.port);
   }
   assert.equal(trustedCheck(m,authKey,witKey,changed,{last:0},expected),"HOLD_WITNESS_SIGNATURE");
   return;
  }
  for(let i=0;i<left.length;i++)permute([...a,left[i]],left.filter((_,j)=>j!==i));
 }
 permute([],PORTS);assert.equal(perms,5040);
 failures.push({name:"5039_out_of_5040_seven_port_permutations",result:"HELD_WITNESS_SIGNATURE",cases:5039});
 function change(label,fn,reSign=false,verdict=undefined){
  const altered=cloned(first);fn(altered.payload);
  failures.push(failing(label,m,reSign?resign(altered.payload):altered,verdict));
 }
 change("reassigned_port_with_compromised_witness_signer",p=>{p.observations[0].port=PORTS[1];
 p.observations[0].tag=obsTag(p.observations[0].entry_sha256,0,0,p.observations[0].band,p.observations[0].port);},true,"HOLD_CHANNEL_REASSIGN");
 change("single_band_erasure_with_compromised_witness_signer",p=>p.observations.pop(),true,"HOLD_ERASURE");
 change("two_band_erasure_with_compromised_witness_signer",p=>p.observations.splice(0,2),true,"HOLD_ERASURE");
 change("duplicate_port",p=>p.observations[1].port=p.observations[0].port,true,"HOLD_CHANNEL_REASSIGN");
 change("swapped_ordered_sector",p=>{p.sector=3;p.coords=[0,1,0]},true,"HOLD_REPLAY_OR_ID");
 change("permuted_trit_tuple",p=>p.coords=[1,0,0],true,"HOLD_ORDER");
 change("stale_nonce",p=>p.nonce="expired",true,"HOLD_CONTEXT");
 change("stale_epoch",p=>p.epoch=EPOCH-1,true,"HOLD_CONTEXT");
 change("stale_sequence",p=>p.sequence=0,true,"HOLD_REPLAY_OR_ID");
 change("source_bank_swap",p=>p.source_bank_sha256="f".repeat(64),true,"HOLD_CONTEXT");
 change("changed_observation_sha",p=>p.observations[3].entry_sha256="0".repeat(64),true,"HOLD_SOURCE_TAG");
 change("false_unchanged_witness_signature",p=>p.site=7,false,"HOLD_WITNESS_SIGNATURE");
 // Authentication cannot be elevated using public keys embedded in attacker packets.
 const badAuth=keypair("WITNESS");
 failures.push(failing("substituted_trusted_authority_key",m,first,"HOLD_AUTHORITY_SIGNATURE",badAuth.publicKey,witKey));
 failures.push(failing("substituted_trusted_witness_key",m,first,"HOLD_WITNESS_SIGNATURE",authKey,ak.publicKey));
 const relabeled=cloned(m);relabeled.payload.ports=[...PORTS].reverse();
 failures.push(failing("tampered_authority_signed_mapping",relabeled,first,"HOLD_AUTHORITY_SIGNATURE"));
 const resigned={payload:relabeled.payload,signature:signature(ak,D_AUTH,relabeled.payload)};
 failures.push(failing("compromised_authority_reassign_against_external_expected_mapping",resigned,first,"HOLD_SOURCE_MAPPING"));
 const sr=cloned(m);sr.payload.source_bank_sha256="f".repeat(64);
 failures.push(failing("coherently_resigned_fake_source_vs_trusted_root",
    {payload:sr.payload,signature:signature(ak,D_AUTH,sr.payload)},first,"HOLD_SOURCE_ROOT"));
 const ledger={last:0};assert.equal(trustedCheck(m,authKey,witKey,first,ledger,expected),"PASS_TEST_SIGNED_DIGITAL");
 assert.equal(trustedCheck(m,authKey,witKey,first,ledger,expected),"HOLD_REPLAY");
 failures.push({name:"same_valid_signed_frame_replayed",result:"HOLD_REPLAY"});
 // Signed challenge/epoch claims do not prove a fresh independently issued nonce.
 const trust={cryptographically_valid_under_fixture_keys:true,
  fixture_private_keys_publicly_derivable:true,independent_real_authority_authenticated:false,
  independently_witnessed_optical_signal:false,
  replay_protection_requires_externally_trusted_nonce_and_monotonic_ledger:true};
 return {failures,permutation_cases:5039,trust};
}
function run(root,out){
 fs.mkdirSync(out,{recursive:true});
 const rows=readOriginal(root),ak=keypair("AUTHORITY"),wk=keypair("WITNESS");
 const payload={schema:"ASOLARIA-SEAT4-SPECTRUM-MAPPING-V1",
  source81_sha256:SHA.source,source_bank_sha256:SHA.bank,base_index_sha256:SHA.index,
  alias_index_sha256:SHA.aliases,bands:BANDS,ports:PORTS,
  epoch:EPOCH,nonce:NONCE,site_count:81,sector_count:27};
 const manifest={payload,signature:signature(ak,D_AUTH,payload),
  authority_pubkey_hex:PUBS.authority,witness_pubkey_hex:PUBS.witness,
  signature_domain:"ASOLARIA-SEAT4-AUTH-MAP-V1",trust_scope:"TEST_ONLY_NOT_EXTERNAL"};
 assert(authentic(ak.publicKey,D_AUTH,payload,manifest.signature));
 const mapSha=digest(signedBytes(D_AUTH,payload)),outLines=[];
 const accepted={last:0};let full=0;
 for(let sector=0;sector<27;sector++)for(let site=0;site<81;site++){
  const seq=sector*81+site+1,p=frame(sector,site,seq,mapSha,rows);
  const packet={payload:p,signature:signature(wk,D_WIT,p)};
  assert.equal(trustedCheck(manifest,ak.publicKey,wk.publicKey,packet,accepted,
    {sector,site,sequence:seq,rows}),"PASS_TEST_SIGNED_DIGITAL");
  outLines.push(canonical(packet));full+=p.observations.length;
 }
 assert.equal(accepted.last,2187);assert.equal(full,15309);
 const first=JSON.parse(outLines[0]),negative=mutations(manifest,ak,wk,first,rows);
 const files={
  "seat4-map.json":Buffer.from(canonical(manifest)+"\n"),
  "seat4-signed-frames.jsonl":Buffer.from(outLines.join("\n")+"\n")};
 const summary={
  schema:"ASOLARIA-SEAT4-SIGNED-SPECTRUM-ROUND5-V1",classification:"DIGITAL_SIGNED_TEST_FIXTURE",
  upstream_roots:SHA,authority_test_public_key:PUBS.authority,witness_test_public_key:PUBS.witness,
  signed_frames:2187,signed_spectrum_channel_observations:15309,
  digital_bands:7,logical_ordered_sectors:27,source_memories:81,
  permutation_nonidentity_cases_rejected:negative.permutation_cases,
  discrete_negative_classes:negative.failures.length,
  negative_controls:negative.failures,trust:negative.trust,
  actual_calibrated_spectrum_measured:false,independent_physical_signer_custody:false,
  full_seven_band_observation_required:true,
  erasure_does_not_destroy_signed_ordered_address_but_full_read_is_held:true,
  replay_protected_only_against_independently_preserved_verifier_state:true,
  map_sha256:mapSha,frames_sha256:digest(files["seat4-signed-frames.jsonl"])
 };
 files["seat4-results.json"]=Buffer.from(canonical(summary)+"\n");
 files["seat4-results.hbp"]=Buffer.from([
 "PORTAL|seat=4|round=5|signed_test_fixture=1|physical_spectra=0|json=0",
 "SOURCE|bank_sha256="+SHA.bank+"|authority_public="+PUBS.authority+"|witness_public="+PUBS.witness+"|json=0",
 "MAP|sha256="+mapSha+"|bands=7|sectors=27|sites=81|json=0",
 "OBS|frames=2187|channels=15309|sha256="+summary.frames_sha256+"|json=0",
 "ATTACKS|permutations=5039|discrete_cases="+negative.failures.length+"|verdict=HELD|json=0",
 "END|fixture_signatures=PASS|external_custody=HOLD|physical_optics=0|release_gate=OPEN|json=0",""].join("\n"));
 for(const [name,bytes] of Object.entries(files))fs.writeFileSync(path.join(out,name),bytes);
 fs.writeFileSync(path.join(out,"SHA256SUMS"),Object.keys(files).sort().map(name=>
    digest(files[name])+"  "+name+"\n").join(""),"ascii");
 process.stdout.write(JSON.stringify({status:"NODE_TEST_PASS",frames:2187,band_observations:15309,
  attacked_permutations:negative.permutation_cases,other_checks:negative.failures.length,
  hbp_sha:digest(files["seat4-results.hbp"]),manifest_sha:digest(files["seat4-map.json"]),
  frames_sha:digest(files["seat4-signed-frames.jsonl"])})+"\n");
}
if(process.argv.length!==4)throw Error("usage: node sign_spectrum.js PR80_ARCHIVE OUTPUT");
run(process.argv[2],process.argv[3]);
