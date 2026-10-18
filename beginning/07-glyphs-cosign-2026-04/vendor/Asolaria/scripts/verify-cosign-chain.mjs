import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const raw = readFileSync("C:/tmp/cosign-chain-binary.ndjson", "utf-8");
const lines = raw.split("\n").filter(Boolean);
const entries = lines.map((l) => JSON.parse(l));

function rollingSha(lines, upToExclusive) {
  // sha256 of lines[0..upToExclusive-1] joined with \n plus trailing \n
  const joined = lines.slice(0, upToExclusive).join("\n") + "\n";
  return createHash("sha256").update(joined, "utf-8").digest("hex");
}

let breaks = 0, ok = 0;
for (let i = 0; i < entries.length; i++) {
  const e = entries[i];
  if (i === 0) {
    if (e.prev_sha === null) { ok++; console.log(`seq=${e.seq} GENESIS prev_sha=null ✓`); }
    else { breaks++; console.log(`seq=${e.seq} GENESIS expected null got ${e.prev_sha}`); }
    continue;
  }
  const expected = rollingSha(lines, i);  // chain up to but excluding this entry
  const match = e.prev_sha === expected;
  if (match) { ok++; console.log(`seq=${e.seq}  prev_sha=${e.prev_sha.slice(0,12)}...  rolling_match=✓`); }
  else {
    breaks++;
    console.log(`seq=${e.seq}  MISMATCH`);
    console.log(`  claimed: ${e.prev_sha}`);
    console.log(`  rolling: ${expected}`);
  }
}

console.log("\n=== ROLLING-CHAIN VERDICT ===");
console.log(`entries: ${entries.length}`);
console.log(`prev_sha matches (rolling): ${ok}`);
console.log(`prev_sha breaks: ${breaks}`);
console.log(`chain_intact: ${breaks === 0}`);
