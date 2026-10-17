#!/usr/bin/env node
"use strict";
/* Preflight challenge only. Its commitments are NOT from physical hosts. */
const crypto=require("node:crypto"),fs=require("node:fs");
const sha=x=>crypto.createHash("sha256").update(x).digest("hex");
const output={
 schema:"ASOLARIA-81-3PHYSICAL-GF2-V1",
 nonce:"0123456789abcdef0123456789abcdef",
 steps:10000000000000,
 waves:12,
 bodies:81,
 laws:[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]],
 seat_commitments:{
  "seat-1":sha("SYNTHETIC-PREFLIGHT-ONLY|1"),
  "seat-2":sha("SYNTHETIC-PREFLIGHT-ONLY|2"),
  "seat-3":sha("SYNTHETIC-PREFLIGHT-ONLY|3")
 },
 physical_host_attestation:"NONE_SYNTHETIC_TEST_FIXTURE"
};
fs.writeFileSync(process.argv[2]||"preflight-challenge.json",JSON.stringify(output,null,2)+"\n");
console.log("GENERATED SYNTHETIC PREFLIGHT CHALLENGE; NOT A PHYSICAL 3-SEAT RECEIPT");
