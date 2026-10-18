// Single-thread timing of the revolver PID emitter (PIDChainRevolver.next -> mintPID) vs a raw sha16 chain. Pure CPU, no I/O.
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const { PIDChainRevolver } = await import(pathToFileURL("D:/bigpickle-rebuild/src/pid-chain-revolver.mjs").href);
const N = 1_000_000, WARM = 100_000;
function time(label, fn) {
  for (let i = 0; i < WARM; i++) fn(i);
  const runs = [];
  for (let r = 0; r < 3; r++) {
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) fn(i);
    runs.push(Number(process.hrtime.bigint() - t0) / N);
  }
  runs.sort((a, b) => a - b);
  console.log(`EMITBENCH|unit=${label}|n=${N}|runs=3|ns_per_op_min=${runs[0].toFixed(1)}|ns_per_op_median=${runs[1].toFixed(1)}|ops_per_s_median=${Math.round(1e9 / runs[1])}|threads=1|json=0`);
}
const rev = new PIDChainRevolver({ anchor: "ACER-CLAUDE-FABLE5-8467a937cba309f7" });
let sink = "";
time("revolver.next(mintPID)", () => { sink = rev.next(); });
let prev = "8467a937cba309f7";
time("raw_sha16_chain", () => { prev = createHash("sha256").update(prev + "|x").digest("hex").slice(0, 16); });
console.log(`EMITENV|node=${process.version}|cpu=i5-8300H|last_pid_sample=${String(typeof sink === "object" ? JSON.stringify(sink) : sink).slice(0, 80).replace(/\|/g, "/")}|json=0`);
