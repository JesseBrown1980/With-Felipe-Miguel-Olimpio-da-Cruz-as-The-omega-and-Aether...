#!/usr/bin/env node
"use strict";
/* Separately written Node22 independent reviewer:
 * original source/workload, four host packets' proper classification, new
 * independent replay challenge boundaries. No hardware instrument inferred. */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const HBP="stones/2026-10-15-rainbow81/seat4-round5-signed-spectrum-mapping-20261015.hbp";
const ROOT="077bf98dc7c10e3125ce1147270cc927ce978ab63a19ec30e4655267f1770400";
const BANK="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345";
const EXPECT="ae3474a94a03e024ad41bd6d0c508a18cbb3ed43c551da0ed3c6ec701e5b61cf";
const NAMES=["seat2-r9-ubuntu-latest-py3.11","seat2-r9-ubuntu-latest-py3.13",
             "seat2-r9-windows-latest-py3.11","seat2-r9-windows-latest-py3.13"];
const hash=x=>crypto.createHash("sha256").update(x).digest("hex");
function normalized(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(normalized).join(",")+"]";
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+normalized(value[k])).join(",")+"}";
}
function main(frozen,archived,out){
  const source=fs.readFileSync(path.join(frozen,HBP));
  assert.equal(source.length,701);
  assert.equal(hash(source),ROOT);
  assert(source.includes(Buffer.from(BANK,"ascii")));
  const payload=Buffer.alloc(2*1024*1024);
  for(let offset=0;offset<payload.length;offset+=source.length)
    source.copy(payload,offset,0,Math.min(source.length,payload.length-offset));
  const sha=crypto.createHash("sha256"),le=Buffer.alloc(4);
  for(let n=0;n<256;n++){le.writeUInt32LE(n,0);sha.update(payload);sha.update(le);}
  assert.equal(sha.digest("hex"),EXPECT);
  const summary=JSON.parse(fs.readFileSync(path.join(out,"seat3-pr111-crosshost-verdict.json")));
  assert.equal(summary.published_run_id,"38777263894");
  assert.equal(summary.pinned_hbp_sha256,ROOT);
  assert.equal(summary.pinned_repeated_2mib_workload_sha256,EXPECT);
  assert.equal(summary.referenced_but_not_directly_read_retained_bank_sha256,BANK);
  assert.equal(summary.directly_read_retained_bank_this_workload,false);
  assert.equal(summary.original_hardware_cpu_ram_execution_observed,true);
  assert.equal(summary.os_process_report_not_unforgeable_independent_hardware_attestation,true);
  assert.equal(summary.independent_mains_power_or_photon_detector,false);
  assert.equal(summary.real_photon_memory_storage_demonstrated_by_PR111,false);
  assert.equal(summary.changed_any_historical_artifact,false);
  assert.equal(summary.photon_memory_prior_experiment_status,"OPERATOR_REPORTED_COMPLETED_INDEPENDENT_INSTRUMENT_AUDIT_PENDING");
  assert.deepEqual(summary.legitimate_four_reported_host_records.map(x=>x.artifact),NAMES);
  assert.equal(summary.copied_packet_upstream_accepts_nonsensor_forgery,4);
  for(const name of NAMES){
    const folder=path.join(archived,name);
    const hostRaw=fs.readFileSync(path.join(folder,"host-activity.json"));
    const shaSide=fs.readFileSync(path.join(folder,"host-activity.json.sha256"),"ascii");
    assert.equal(shaSide,hash(hostRaw)+"  host-activity.json\n");
    const peer=summary.legitimate_four_reported_host_records.find(x=>x.artifact===name);
    assert.equal(peer.host_evidence_sha256,hash(hostRaw));
    const host=JSON.parse(hostRaw);
    assert.equal(peer.monotonic_elapsed_ns,host.wall_elapsed_ns);
    assert.equal(peer.process_cpu_ns,host.cpu_elapsed_ns);
    assert.equal(peer.rss_delta_bytes,host.rss_during_bytes-host.rss_before_bytes);
    assert.equal(host.github_run_id,summary.published_run_id);
    assert.equal(host.producing_git_sha,summary.reported_github_pull_merge_sha);
    assert.equal(peer.instrument_watts_or_photons_collected,false);
  }
  for(const key of ["forged_run_and_git","forged_platform",
                    "impossible_monotonic_wall","replay_cross_host_packet"]){
    const caseCheck=summary.copied_packet_falsifications[key];
    assert.equal(caseCheck.original_seat2_node_review_accepts,true);
    assert.equal(caseCheck.seat3_independent_join_rejects,true);
  }
  assert.equal(summary.copied_packet_falsifications.invented_photon_meter.original_seat2_node_review_accepts,false);
  assert.equal(summary.copied_packet_falsifications.invented_photon_meter.seat3_independent_join_rejects,true);
  const independent={
    schema:"ASOLARIA-SEAT3-R9-INDEPENDENT-NODE-REPLAY-RECHECK-V1",
    verdict:"NODE22_SECOND_SOURCE_REPLICA_PASS",
    independent_source_sha256:ROOT,referenced_bank_sha256:BANK,
    independently_recomputed_workload_sha256:EXPECT,
    four_original_archived_host_packets_match_independent_binding:true,
    self_consistent_metadata_attacks_original_parser_accepted:4,
    new_referee_rejected_forged_metadata:4,
    original_parser_rejected_false_optical_readings:true,
    physical_os_process_reports_still_genuine_reported_observations:true,
    original_operator_photon_memory_experiment_report_preserved:true,
    physical_optical_sensor_measurements_in_pr111:false
  };
  const data=Buffer.from(normalized(independent)+"\n","ascii");
  const file="seat3-independent-node-review.json";
  fs.writeFileSync(path.join(out,file),data);
  fs.writeFileSync(path.join(out,file+".sha256"),hash(data)+"  "+file+"\n","ascii");
  console.log(JSON.stringify({verdict:"PASS",original_peer_review_replay_accepts:4,
    trusted_detector_measurements:0,source_digest:EXPECT,review_sha256:hash(data)}));
}
if(process.argv.length!==5)throw Error("usage: node independent_digest.js FROZEN_MAIN ARCHIVED_SEAT2_ARTIFACTS AUDIT_OUTPUT");
main(process.argv[2],process.argv[3],process.argv[4]);
