#!/usr/bin/env node
"use strict";
/* Local-only three-seat Ed25519 identity and commit/reveal receipt generator.
   Never commit private.pem or salt.hex. Node >=18, no dependencies. */
const fs=require("node:fs"),crypto=require("node:crypto"),path=require("node:path");
const TAG="ASOLARIA-3-PHYSICAL-SEAT-ATTEST-V1";
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const canonical=x=>JSON.stringify(sort(x));
function sort(o){
 if(Array.isArray(o))return o.map(sort);
 if(o&&typeof o==="object")return Object.fromEntries(Object.keys(o).sort().map(k=>[k,sort(o[k])]));
 return o;
}
function signDoc(payload,key){
 const bytes=Buffer.from(canonical(payload),"utf8");
 return {...payload,signature_b64:crypto.sign(null,bytes,key).toString("base64")};
}
function write(file,data){
 if(fs.existsSync(file))throw Error("append-only output already exists "+file);
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n",{flag:"wx"});
}
function load(p){return JSON.parse(fs.readFileSync(p,"utf8"))}
function pk(dir){return crypto.createPrivateKey(fs.readFileSync(path.join(dir,"private.pem")))}
function signed(payload,dir){return signDoc(payload,pk(dir))}
function checkin(dir){return load(path.join(dir,"checkin.json"))}
function assertSeat(seat){if(!/^seat-[123]$/.test(seat))throw Error("seat must be seat-1 / seat-2 / seat-3")}
function commitment(seat,salt){return sha("ASOLARIA|SEAT-COMMIT|"+seat+"|"+salt)}
const [,,cmd,...args]=process.argv;
if(cmd==="init"){
 const [seat,dir,operatorAttestation]=args;
 assertSeat(seat);
 if(!dir||!operatorAttestation)throw Error("init seat-N private_directory operator_attestation_string");
 fs.mkdirSync(dir,{recursive:true});
 const privPath=path.join(dir,"private.pem");
 if(fs.existsSync(privPath))throw Error("Private identity exists; do not replace it");
 const {privateKey,publicKey}=crypto.generateKeyPairSync("ed25519");
 fs.writeFileSync(privPath,privateKey.export({type:"pkcs8",format:"pem"}),{mode:0o600,flag:"wx"});
 const publicDer=publicKey.export({format:"der",type:"spki"});
 const payload={
  schema:TAG,seat,public_spki_der_b64:publicDer.toString("base64"),
  public_fingerprint_sha256:sha(publicDer),
  operator_physical_attestation:operatorAttestation,
  physical_host_independently_verified:false,
  disclaimer:"Self-signed key and operator assertion do not prove separate physical computer.",
  created_utc:new Date().toISOString()};
 write(path.join(dir,"checkin.json"),signed(payload,dir));
 console.log("CHECKIN_CREATED "+seat+" fingerprint="+payload.public_fingerprint_sha256);
}else if(cmd==="commit"){
 const [dir]=args;const id=checkin(dir);assertSeat(id.seat);
 const salt=crypto.randomBytes(32).toString("hex");
 const saltPath=path.join(dir,"salt.hex");
 fs.writeFileSync(saltPath,salt+"\n",{mode:0o600,flag:"wx"});
 const payload={schema:TAG,seat:id.seat,
  public_fingerprint_sha256:id.public_fingerprint_sha256,
  salt_commitment_sha256:commitment(id.seat,salt),
  created_utc:new Date().toISOString(),
  stage:"PRE_CHALLENGE_COMMITMENT"};
 write(path.join(dir,"commit.json"),signed(payload,dir));
 console.log("COMMIT_CREATED "+id.seat+" digest="+payload.salt_commitment_sha256);
}else if(cmd==="seal"){
 const [dir,challengePath,resultPath,implementation]=args;
 const id=checkin(dir),ch=load(challengePath),com=load(path.join(dir,"commit.json"));
 if(ch.seat_commitments[id.seat]!==com.salt_commitment_sha256)throw Error("Challenge must bind prior commitment");
 const payload={schema:TAG,seat:id.seat,stage:"RESULT_COMMITMENT_BEFORE_REVEAL",
  challenge_sha256:sha(fs.readFileSync(challengePath)),
  output_sha256:sha(fs.readFileSync(resultPath)),
  implementation,created_utc:new Date().toISOString()};
 write(path.join(dir,"result-commit.json"),signed(payload,dir));
 console.log("RESULT_COMMITTED "+id.seat+" sha256="+payload.output_sha256);
}else if(cmd==="reveal"){
 const [dir]=args;const id=checkin(dir);
 const salt=fs.readFileSync(path.join(dir,"salt.hex"),"ascii").trim();
 const com=load(path.join(dir,"commit.json"));
 if(commitment(id.seat,salt)!==com.salt_commitment_sha256)throw Error("Salt commitment mismatch");
 if(!fs.existsSync(path.join(dir,"result-commit.json")))throw Error("Result must be committed before reveal");
 const payload={schema:TAG,seat:id.seat,stage:"REVEAL_AFTER_THREE_RESULT_COMMITS",
  salt_hex:salt,created_utc:new Date().toISOString()};
 write(path.join(dir,"reveal.json"),signed(payload,dir));
 console.log("REVEAL_CREATED "+id.seat);
}else{
 throw Error("Usage: node seat_receipts.js init seat-N .asolaria-private/seat-N attestation | commit DIR | seal DIR challenge.json result.hbp implementation | reveal DIR");
}
