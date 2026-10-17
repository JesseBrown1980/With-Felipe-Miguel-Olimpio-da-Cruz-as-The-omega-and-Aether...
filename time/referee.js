#!/usr/bin/env node
"use strict";
/* Validate three independently signed seat receipts and byte-identical HBP.
   Does not infer three physical computers from three keys.
   Publish only after independent observer verifies physical hardware and Git times.
*/
const fs=require("node:fs"),crypto=require("node:crypto"),path=require("node:path");
const TAG="ASOLARIA-3-PHYSICAL-SEAT-ATTEST-V1";
const P="ASOLARIA-81-3PHYSICAL-GF2-V1";
const sha=x=>crypto.createHash("sha256").update(x).digest("hex");
const sort=x=>Array.isArray(x)?x.map(sort):
  x&&typeof x==="object"?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
const canonical=x=>JSON.stringify(sort(x));
const load=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const fail=s=>{throw Error(s)};
function verifySigned(doc,pub){
  const {signature_b64,...payload}=doc;
  if(!signature_b64 || doc.schema!==TAG)fail("Missing signature/schema");
  const valid=crypto.verify(null,Buffer.from(canonical(payload)),pub,Buffer.from(signature_b64,"base64"));
  if(!valid)fail("Signature mismatch");
}
function examine(root,seat,challenge,challhash){
  const d=path.join(root,seat);
  const id=load(path.join(d,"checkin.json"));
  if(id.seat!==seat || !/^seat-[123]$/.test(seat))fail("Seat mismatch");
  const raw=Buffer.from(id.public_spki_der_b64,"base64");
  const fingerprint=sha(raw);
  if(id.public_fingerprint_sha256!==fingerprint)fail("Key fingerprint mismatch");
  const pub=crypto.createPublicKey({key:raw,format:"der",type:"spki"});
  for(const docName of ["checkin","commit","result-commit","reveal"]){
    const doc=load(path.join(d,docName+".json"));
    verifySigned(doc,pub);
    if(doc.seat!==seat)fail("Cross-seat signature");
  }
  const commit=load(path.join(d,"commit.json"));
  const result=load(path.join(d,"result-commit.json"));
  const reveal=load(path.join(d,"reveal.json"));
  if(commit.stage!=="PRE_CHALLENGE_COMMITMENT"||result.stage!=="RESULT_COMMITMENT_BEFORE_REVEAL"||reveal.stage!=="REVEAL_AFTER_THREE_RESULT_COMMITS")fail("Stage mismatch");
  if(challenge.seat_commitments[seat]!==commit.salt_commitment_sha256)fail("Challenge commitment mismatch");
  if(!/^[0-9a-f]{64}$/.test(reveal.salt_hex))fail("Invalid salt");
  if(sha("ASOLARIA|SEAT-COMMIT|"+seat+"|"+reveal.salt_hex)!==commit.salt_commitment_sha256)fail("Blinded commitment invalid");
  if(result.challenge_sha256!==challhash)fail("Wrong shared challenge");
  const data=fs.readFileSync(path.join(d,"result.hbp"));
  if(sha(data)!==result.output_sha256)fail("Result checksum mismatch");
  const text=data.toString("ascii");
  if(text.split("\n").filter(x=>x.startsWith("WAVE|")).length!==4860)fail("Missing waves");
  if(!text.includes("END|records=4860|class=EXACT_GF2_DIGITAL_CALCULATION|json=0"))fail("No terminal receipt");
  return {seat,public_key_fingerprint:fingerprint,output_sha256:sha(data),
    implementation:result.implementation,bytes:data.length,
    signed_commitment_verified:true,operator_attestation:id.operator_physical_attestation,
    physical_host_independently_verified:false};
}
function main(){
  if(process.argv.length!==4)fail("Usage: node physical/referee.js challenge.json folder_containing_seat-1_seat-2_seat-3");
  const challengePath=process.argv[2], root=process.argv[3];
  const challengeBytes=fs.readFileSync(challengePath);
  const challenge=JSON.parse(challengeBytes.toString("utf8"));
  if(challenge.schema!==P)fail("Bad shared challenge protocol");
  const seats=["seat-1","seat-2","seat-3"].map(seat=>examine(root,seat,challenge,sha(challengeBytes)));
  if(new Set(seats.map(s=>s.public_key_fingerprint)).size!==3)fail("Duplicate public keys");
  if(new Set(seats.map(s=>s.output_sha256)).size!==1)fail("MISMATCH: outputs differ across seats");
  console.log(JSON.stringify({
    schema:"ASOLARIA-3-PHYSICAL-REFEREE-REPORT-V1",
    verdict:"THREE_SIGNED_SOFTWARE_RECEIPTS_MATCH",
    level:"physical_device_separation_unverified",
    issue:"Git history must establish commitment before challenge, all result commitments before reveal; independent human must attest physical hardware and communication isolation.",
    challenge_sha256:sha(challengeBytes),
    output_sha256:seats[0].output_sha256,
    total_records:4860,
    horizon:10000000000000,
    physical_effect_measured:false,
    seats
  },null,2));
}
main();
