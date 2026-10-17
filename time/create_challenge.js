#!/usr/bin/env node
"use strict";
/* Generate a real common challenge ONLY from three pre-existing signed
   check-in/commit pairs. Git commit ordering must be audited independently.
   No machine-secret salts are needed to create the challenge.
*/
const crypto=require("node:crypto"),fs=require("node:fs");
const sha=x=>crypto.createHash("sha256").update(x).digest("hex");
const sort=x=>Array.isArray(x)?x.map(sort):
  x&&typeof x==="object"?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
const TAG="ASOLARIA-81-3PHYSICAL-GF2-V1";
const SIGN="ASOLARIA-3-PHYSICAL-SEAT-ATTEST-V1";
function signed(doc,key) {
 const {signature_b64,...body}=doc;
 if(doc.schema!==SIGN || !signature_b64 || !crypto.verify(null,Buffer.from(JSON.stringify(sort(body))),key,Buffer.from(signature_b64,"base64")))
   throw Error("Invalid signed precommit");
}
if(process.argv.length!==9)throw Error("Usage: node create_challenge.js seat1-checkin.json seat1-commit.json seat2-checkin.json seat2-commit.json seat3-checkin.json seat3-commit.json challenge.json");
const commitments={}, fingerprints=[];
for(let i=0;i<3;i++){
 const seat="seat-"+(i+1),id=JSON.parse(fs.readFileSync(process.argv[2+i*2],"utf8"));
 const commit=JSON.parse(fs.readFileSync(process.argv[3+i*2],"utf8"));
 if(id.seat!==seat || commit.seat!==seat || commit.stage!=="PRE_CHALLENGE_COMMITMENT")throw Error("Wrong seat/order");
 const pubBytes=Buffer.from(id.public_spki_der_b64,"base64");
 const pub=crypto.createPublicKey({key:pubBytes,format:"der",type:"spki"});
 if(id.public_fingerprint_sha256!==sha(pubBytes))throw Error("Invalid fingerprint");
 signed(id,pub); signed(commit,pub);
 if(commit.public_fingerprint_sha256!==id.public_fingerprint_sha256)throw Error("Commit key changed");
 if(!/^[0-9a-f]{64}$/.test(commit.salt_commitment_sha256))throw Error("Commit malformed");
 commitments[seat]=commit.salt_commitment_sha256;
 fingerprints.push(id.public_fingerprint_sha256);
}
if(new Set(fingerprints).size!==3)throw Error("Same seat public key used more than once");
const c={
  schema:TAG,
  nonce:crypto.randomBytes(16).toString("hex"),
  steps:10000000000000,waves:12,bodies:81,
  laws:[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]],
  seat_commitments:commitments,
  issued_utc:new Date().toISOString(),
  classification:"NEW_LOCKED_FIVE_GF2_LAWS_NOT_CERTIFIED_MATCH_TO_OLD_LAWS",
  physical_separation_external_attestation_required:true
};
fs.writeFileSync(process.argv[8],JSON.stringify(c,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({status:"CHALLENGE_ISSUED",nonce:c.nonce,
  commitment_count:3,sha256:sha(fs.readFileSync(process.argv[8]))}));
