#!/usr/bin/env node
"use strict";
// Verify public, canonical JSON Ed25519 receipts with NO private key or secret.
const fs=require("node:fs"),crypto=require("node:crypto");
function sort(x){if(Array.isArray(x))return x.map(sort);if(x&&typeof x==="object")return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])]));return x;}
function canonical(x){return Buffer.from(JSON.stringify(sort(x)),"utf8");}
const base="tracking/checkins/seat-3/20261014T163350Z/";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const checkin=read(base+"checkin.json");
const commit=read(base+"commit.json");
const stone=read("stones/2026-10-14-rainbow81/seat-3-20261014-local-preflight.json");
const pk=crypto.createPublicKey({key:Buffer.from(checkin.public_spki_der_b64,"base64"),type:"spki",format:"der"});
const fp=crypto.createHash("sha256").update(Buffer.from(checkin.public_spki_der_b64,"base64")).digest("hex");
if(fp!==checkin.public_fingerprint_sha256)throw Error("public key fingerprint mismatch");
function verify(doc,label){const {signature_b64,...rest}=doc;if(!crypto.verify(null,canonical(rest),pk,Buffer.from(signature_b64,"base64")))throw Error(label+" signature FAILED");}
verify(checkin,"checkin");verify(commit,"commit");verify(stone,"stone");
const changed={...stone,agreements:4859};let tamperRejected=false;
try{verify(changed,"tampered stone");}catch{tamperRejected=true;}
if(!tamperRejected)throw Error("tampered record was accepted");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
for(const [file,digest] of [
[base+"checkin.json",stone.ed25519_checkin_sha256],
[base+"commit.json",stone.ed25519_commit_sha256],
["stones/2026-10-14-rainbow81/seat-3-20261014-local-preflight.hbp", "f64dd8e1a00b7721f9c4d50b46393ce2c0c484ddc603d29cb9811bd01e23aa39"]
])if(sha(fs.readFileSync(file))!==digest)throw Error("SHA mismatch for "+file);
if(checkin.physical_host_independently_verified!==false || stone.independent_physical_host!==false)throw Error("host caveat modified");
if(stone.agreements!==4860 || stone.python_node_byte_agreement!==true)throw Error("unexpected result");
console.log("PASS Seat-3 three Ed25519 signatures, negative tamper and byte digests; physical-host UNVERIFIED");
