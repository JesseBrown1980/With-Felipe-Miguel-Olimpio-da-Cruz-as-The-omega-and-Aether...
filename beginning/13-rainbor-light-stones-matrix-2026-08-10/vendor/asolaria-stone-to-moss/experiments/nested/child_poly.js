#!/usr/bin/env node
"use strict";
/* Nested Rainbow81 child: GF(2) cyclic polynomial, separate Python watcher PID.
   One child per seat; all wave results must survive independent watcher gate. */
const fs = require("node:fs"), crypto = require("node:crypto"),
      path = require("node:path"), cp = require("node:child_process"),
      readline = require("node:readline");
const N = 81n, MASK = (1n<<N)-1n;
const LAWS = [[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]];
const HORIZONS = [10000000000000,10000000000001,10000000000081];
const HEX = x=>x.toString(16).padStart(21,"0");
const sha = x=>crypto.createHash("sha256").update(x).digest("hex");
const rot = (a,k)=>k===0?a&MASK:((a<<BigInt(k)) | (a>>(N-BigInt(k)))) & MASK;
function mul(a,b) {
  let result=0n, i=0;
  while(a) {if(a&1n)result ^= rot(b,i);a>>=1n;i++;}
  return result;
}
function power(taps,steps) {
  let p=taps.reduce((a,t)=>a^(1n<<BigInt(t)),0n),q=1n,n=BigInt(steps);
  while(n) {if(n&1n)q=mul(q,p);p=mul(p,p);n>>=1n;}
  return q;
}
const expectedInput="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b";
const [challengePath,seat] = process.argv.slice(2);
if(!["seat-1","seat-2","seat-3","seat-4"].includes(seat))throw Error("invalid seat");
const source=fs.readFileSync(challengePath);
if(sha(source)!==expectedInput)throw Error("challenge-source-sha-mismatch");
const challenge=JSON.parse(source.toString("utf8"));
if(JSON.stringify(challenge.laws)!==JSON.stringify(LAWS) ||
   JSON.stringify(challenge.horizons)!==JSON.stringify(HORIZONS) ||
   challenge.nonce!=="eff1eda90f40cd6fa1e9e9f22e34ecf3" ||
   challenge.waves!==27 || challenge.bodies!==81)throw Error("challenge-definition-changed");

const operators=LAWS.map(taps=>HORIZONS.map(h=>power(taps,h)));
function state(w,b) {
  const input="ASOLARIA|NESTED|V1|"+challenge.nonce+"|"+seat+"|"+w+"|"+b;
  return (BigInt("0x"+sha(Buffer.from(input,"ascii")))&MASK)^(1n<<BigInt(b));
}
async function main() {
  const start=Date.now();
  const py=process.env.PYTHON_BIN || "python";
  const watcher=cp.spawn(py,[path.join(__dirname,"watcher.py")],{stdio:["pipe","pipe","inherit"]});
  const ref=readline.createInterface({input:watcher.stdout,crlfDelay:Infinity})[Symbol.asyncIterator]();
  async function ask(payload) {
    watcher.stdin.write(JSON.stringify(payload)+"\n");
    const next=await ref.next();
    if(next.done)throw Error("watcher-terminated");
    return JSON.parse(next.value);
  }
  const hello=await ref.next();
  if(hello.done)throw Error("watcher-could-not-start");
  const watcherReady=JSON.parse(hello.value);
  if(watcherReady.kind!=="ready"||watcherReady.role!=="grandchild-watcher")throw Error("watcher-protocol");
  function send(x) {process.stdout.write(JSON.stringify(x)+"\n");}
  send({kind:"ready",role:"child-polynomial",seat,pid:process.pid,started_ms:start,watcher:watcherReady,node:process.version});
  const parent=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
  let verified=0,negativeChecks=0;
  for await (const raw of parent) {
    const msg=JSON.parse(raw);
    if(msg.kind==="tamper_test") {
      const bad=await ask({kind:"verify",cases:[{taps:[0,1],at_t:HEX(1n),at_tplus1:HEX(0n)}]});
      if(bad.status!=="REJECT")throw Error("tampered-grandchild-input-accepted");
      negativeChecks++;
      send({kind:"tamper-result",status:"TAMPER_REJECTED",watcher_pid:watcherReady.pid});
      continue;
    }
    if(msg.kind==="stop") {
      watcher.stdin.end();
      send({kind:"stopped",seat,verified_waves:verified,negative_checks:negativeChecks,ended_ms:Date.now()});
      break;
    }
    if(msg.kind!=="wave"||msg.seat!==seat||msg.wave!==verified||verified>=27)throw Error("wave-order-or-seat-mismatch");
    const w=msg.wave,begin=Date.now(),rows=[],cases=[];
    const time=["past","now","future"][Math.floor(w/9)],
          color=["R","G","B"][Math.floor(w/3)%3],space=["x","y","z"][w%3];
    for(let li=0;li<5;li++) {
      for(let body=0;body<81;body++) {
        const s=state(w,body);
        const vals=operators[li].map(p=>mul(p,s));
        cases.push({taps:LAWS[li],at_t:HEX(vals[0]),at_tplus1:HEX(vals[1])});
        for(let h=0;h<3;h++) {
          rows.push("R|seat="+seat+"|w="+String(w).padStart(2,"0")+"|t="+time+"|c="+color+"|s="+space+
                    "|law="+li+"|body="+String(body).padStart(2,"0")+"|h="+h+"|value="+HEX(vals[h])+"\n");
        }
      }
    }
    const beforeWatcher=Date.now();
    const result=await ask({kind:"verify",cases});
    const ended=Date.now();
    if(result.status!=="PASS"||result.checked!==405||result.watcher_pid!==watcherReady.pid) {
      throw Error("WATCHER_REJECTED_WAVE_"+w+":"+JSON.stringify(result));
    }
    if(rows.length!==1215)throw Error("child-bad-row-count");
    const digest=sha(Buffer.from(rows.join(""),"ascii"));
    verified++;
    send({kind:"wave",seat,wave:w,rows,rows_sha256:digest,records:rows.length,
          gate_ok:true,watcher_gate_ok:true,watcher_checked:result.checked,
          watcher_digest:result.checks_sha256,watcher_started_ms:result.started_ms,
          watcher_ended_ms:result.ended_ms,child_started_ms:begin,
          child_math_completed_ms:beforeWatcher,child_ended_ms:ended,
          child_pid:process.pid,watcher_pid:watcherReady.pid});
  }
}
main().catch(error=>{console.error("CHILD_ERROR",error.stack||String(error));process.exitCode=1;});
