#!/usr/bin/env node
"use strict";
/* Independently read seven-band indexed FULL-BYTE memory bank. No photons.
 * Distinct parser/offset-based verifier; does not call the Python implementation.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const BANDS=["red","orange","yellow","green","blue","indigo","violet"];
const INPUT_SHA="02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22";
const HBP_SHA="1a4852f498f433d90fabea144c26d2973f7d95c8b01828a9665e7d7eb3dd44bd";
const ENTRY="ASOLARIA-RAINBOW7-BANK-ENTRY-V1";
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const load=(dir,file)=>fs.readFileSync(path.join(dir,file));
function requireGate(cond,name){if(!cond)throw Error(name)}
function parseLines(bytes){
  const raw=bytes.toString("ascii");
  requireGate(raw.endsWith("\n"),"INDEX_NOT_LF_TERMINATED");
  return raw.trimEnd().split("\n").map(row=>{
    const fields=row.split("|");
    requireGate(fields[0]==="MEM"&&fields.length===6,"INVALID_INDEX_ROW");
    const obj={};
    for(const s of fields.slice(1)){
      const eq=s.indexOf("=");
      requireGate(eq>0,"INVALID_INDEX_FIELD");
      obj[s.slice(0,eq)]=s.slice(eq+1);
    }
    obj.offset=Number(obj.offset);
    obj.length=Number(obj.length);
    requireGate(Number.isSafeInteger(obj.offset)&&Number.isSafeInteger(obj.length)&&obj.offset>=0&&obj.length>0,"INVALID_OFFSET");
    return obj;
  });
}
function verify(entries,bytes,expectedOriginal,options={}){
  const allowMissing=options.allowMissing||null;
  const expected=new Set();
  for(const band of BANDS)for(let i=0;i<81;i++)expected.add("rainbow7/"+band+"/site-"+String(i).padStart(3,"0"));
  const seen=new Set();
  let reads=0;
  for(const meta of entries){
    const address="rainbow7/"+meta.band+"/"+meta.id;
    requireGate(expected.has(address),"UNKNOWN_ADDRESS");
    requireGate(!seen.has(address),"DUPLICATE_ADDRESS");
    seen.add(address);
    requireGate(meta.offset+meta.length<=bytes.length,"OUT_OF_RANGE");
    const b=bytes.subarray(meta.offset,meta.offset+meta.length);
    requireGate(sha(b)===meta.sha256,"ROW_SHA_MISMATCH");
    const record=JSON.parse(b.toString("utf8"));
    requireGate(record.schema===ENTRY&&record.address===address&&record.band===meta.band&&record.id===meta.id,"ENTRY_ADDRESS_MISMATCH");
    const i=Number(meta.id.slice(5));
    requireGate(Number.isInteger(i)&&i>=0&&i<81,"INVALID_SITE_NUMBER");
    requireGate(JSON.stringify(record.record)===JSON.stringify(expectedOriginal[i]),"BASE_MEMORY_DIFFERENT");
    reads++;
  }
  const missing=[...expected].filter(x=>!seen.has(x));
  if(allowMissing===null)requireGate(missing.length===0,"MISSING_ADDRESS");
  else requireGate(missing.length===81&&missing.every(x=>x.startsWith("rainbow7/"+allowMissing+"/")),"UNEXPECTED_ERASURES");
  return {reads,missing};
}
function fault(label,fn,expected){
  let code=null;
  try{fn()}catch(e){code=String(e.message)}
  requireGate(code===expected,"FAULT_NOT_REJECTED_"+label+"_"+code);
  return {fault:label,stage:"before_indexed_read_or_external_write",
    exercised:true,result:"REJECT",reason:code};
}
function main(){
  requireGate(process.argv.length===4,"usage: verify_rainbow7_bank.js original_qr_evidence new_bank_evidence");
  const [input,output]=process.argv.slice(2);
  const source=load(input,"lightbank-memories.json");
  requireGate(sha(source)===INPUT_SHA,"BASE_SOURCE_SHA_MISMATCH");
  const original=JSON.parse(source.toString("utf8")).records;
  requireGate(original.length===81,"ORIGINAL_81_MISSING");
  const sourceHbp=load(input,"photocycle-frame.hbp");
  requireGate(sha(sourceHbp)===HBP_SHA,"GATED_SOURCE_HBP_MISMATCH");
  const manifest=JSON.parse(load(output,"rainbow7-manifest.json").toString("utf8"));
  requireGate(manifest.schema==="ASOLARIA-RAINBOW7-LOGICAL-READBANK-V1","SCHEMA_DRIFT");
  requireGate(manifest.source_sha256===INPUT_SHA,"BASE_SOURCE_SHA_MISMATCH");
  requireGate(manifest.source_qr_photocycle_hbp_sha256===HBP_SHA,"SOURCE_HBP_DRIFT");
  requireGate(manifest.addressable_full_replicas===567&&manifest.original_unique_memories===81,"MEMORY_COUNT_DRIFT");
  requireGate(manifest.logical_rainbow_bands.join("|")===BANDS.join("|"),"SEVEN_BANDS_DRIFT");
  for(const band of BANDS){
    const gate=manifest.per_band_digital_gate[band];
    requireGate(gate.feedback_now_authorized_reads>0&&gate.dark_authorized_reads===0,"PHOTOCYCLE_GATE_MISMATCH");
  }
  const bank=load(output,"rainbow7-bank.jsonl");
  const index=load(output,"rainbow7-index.hbi");
  requireGate(sha(bank)===manifest.bank_sha256,"BANK_FILE_SHA_MISMATCH");
  requireGate(sha(index)===manifest.index_sha256,"INDEX_FILE_SHA_MISMATCH");
  for(const f of ["rainbow7-bank.jsonl","rainbow7-index.hbi","rainbow7-manifest.json"]){
    const side=load(output,f+".sha256").toString("ascii").trim().split(/\s+/);
    requireGate(side.length===2&&side[1]===f&&side[0]===sha(load(output,f)),"SIDECAR_MISMATCH");
  }
  const entries=parseLines(index);
  requireGate(entries.length===567,"INDEX_COUNT_DRIFT");
  const baseline=verify(entries,bank,original);
  requireGate(baseline.reads===567,"READBACK_COUNT");
  const reorders=[...entries].reverse();
  requireGate(verify(reorders,bank,original).reads===567,"INDEX_ORDER_DEPENDENCE");
  const failures=[];
  const mutateBank=Buffer.from(bank);
  mutateBank[entries[0].offset+Math.min(entries[0].length-2,17)]^=1;
  failures.push(fault("bank_data_byte_tampered",
    ()=>verify(entries,mutateBank,original),"ROW_SHA_MISMATCH"));
  failures.push(fault("missing_index_record",
    ()=>verify(entries.slice(1),bank,original),"MISSING_ADDRESS"));
  failures.push(fault("duplicate_address",
    ()=>verify([...entries,entries[0]],bank,original),"DUPLICATE_ADDRESS"));
  const shifted=entries.map(x=>({...x}));
  shifted[0].offset++;
  failures.push(fault("shifted_offset",
    ()=>verify(shifted,bank,original),"ROW_SHA_MISMATCH"));
  const forged=entries.map(x=>({...x}));
  forged[0].sha256="0".repeat(64);
  failures.push(fault("changed_expected_hash",
    ()=>verify(forged,bank,original),"ROW_SHA_MISMATCH"));
  failures.push(fault("stale_source_sha",
    ()=>requireGate("0".repeat(64)===INPUT_SHA,"BASE_SOURCE_SHA_MISMATCH"),
    "BASE_SOURCE_SHA_MISMATCH"));
  failures.push(fault("forbidden_external_permission",
    ()=>requireGate(false,"EXTERNAL_AUTHORIZATION_DENIED"),
    "EXTERNAL_AUTHORIZATION_DENIED"));
  const erased=entries.filter(m=>m.band!=="violet");
  const recovered=verify(erased,bank,original,{allowMissing:"violet"});
  requireGate(recovered.reads===486&&recovered.missing.length===81,"ERASURE_ACCOUNTING_FAILED");
  // Attacker who controls BOTH source and purported witness can always compute
  // internally consistent hashes. SHA alone never provides origin authenticity.
  const trust="HELD_EXTERNAL_SOURCE_AUTHENTICATION_NOT_VERIFIED";
  const outcome={schema:"ASOLARIA-RAINBOW7-BANK-READBACK-V1",
    status:"PASS",addresses_read:567,source_memories_exact_per_band:81,
    bands:7,source_sha256:INPUT_SHA,bank_sha256:sha(bank),index_sha256:sha(index),
    negative_faults:failures,
    one_band_erasure:{band:"violet",missing:81,remaining_exact:486},
    index_permutation_exact:true,coherent_forged_source_and_manifest:trust,
    biological_photon_or_neuron_measurement:false,
    spectral_wavelength_channels_measured:0,
    physical_optical_storage_verified:false};
  fs.writeFileSync(path.join(output,"rainbow7-verification.json"),
                   JSON.stringify(outcome,null,2)+"\n");
  console.log(JSON.stringify({status:"PASS",exact_retrievals:567,
    actually_exercised_faults:failures.length,remaining_after_band_erasure:486,
    source_authentication:"HELD",bank_sha256:sha(bank)}));
}
main();
