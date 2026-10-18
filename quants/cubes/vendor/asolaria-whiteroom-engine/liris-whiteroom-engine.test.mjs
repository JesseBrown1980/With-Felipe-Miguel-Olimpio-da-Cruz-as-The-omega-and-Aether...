// liris-whiteroom-engine.test.mjs — proves impl_A's invariants. Run: node --test
import { test } from "node:test";
import assert from "node:assert";
import {
  BHPidEmitter, MemoryStore, RedisCloudStore,
  DeterministicScorer, WhiteRoomEngine, sha256hex,
} from "./liris-whiteroom-engine.mjs";

test("PID emitter: deterministic, unique, port.port.port shape", () => {
  const a = new BHPidEmitter("t"), b = new BHPidEmitter("t");
  const x = a.next(), y = b.next();
  assert.equal(x.pid, y.pid, "same seed+counter => same pid");
  assert.equal(x.coord64, y.coord64, "coord64 = sha256(pid), deterministic");
  assert.equal(x.coord64, sha256hex(x.pid));
  assert.match(x.port3, /^\d+\.\d+\.\d+$/, "port.port.port (3-level logical address)");
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(a.next().pid);
  assert.equal(seen.size, 500, "every tick a unique PID (no project-name reuse = free)");
});

test("MemoryStore: compact NEVER deletes (gc_evidence_deletion guard)", () => {
  const s = new MemoryStore();
  s.put("p1", { pid: "p1", mark: "m" });
  assert.ok(s.get("p1"), "put then get");
  s.compact("p1");
  assert.equal(s.stats().live, 0, "compacted out of live");
  assert.equal(s.stats().compacted, 1, "moved to compacted, not gone");
  assert.ok(s.get("p1"), "STILL retrievable after compact — evidence preserved");
  assert.equal(s.get("p1").compacted, true);
});

test("MemoryStore: scanByPID filters live", () => {
  const s = new MemoryStore();
  s.put("BH.WR.a.0", { pid: "BH.WR.a.0" });
  s.put("BH.WR.b.1", { pid: "BH.WR.b.1" });
  const hits = s.scanByPID((pid) => pid.includes(".a."));
  assert.equal(hits.length, 1);
});

test("DeterministicScorer: stable + bounded [0,1]", async () => {
  const sc = new DeterministicScorer();
  const v1 = await sc.score("p", "m"), v2 = await sc.score("p", "m");
  assert.equal(v1, v2, "stable");
  assert.ok(v1 >= 0 && v1 <= 1, "bounded");
  assert.notEqual(await sc.score("p", "m"), await sc.score("p", "n"), "discriminates by mark");
});

test("RedisCloudStore: honestly GATED on every op", () => {
  const r = new RedisCloudStore();
  for (const op of ["put", "get", "scanByPID", "compact"]) {
    assert.throws(() => r[op]("x", {}), /GATED.*Asolaria Profile/, `${op} gated`);
  }
});

test("engine: spin -> genius+mistake==ticks, NEVER-DELETE invariant, HBP-only seal, sha-chain", async () => {
  const engine = new WhiteRoomEngine({ store: new MemoryStore(), scorer: new DeterministicScorer(0.72) });
  const marks = Array.from({ length: 200 }, (_, i) => `room:${i}`);
  const recs = await engine.spin(marks);
  const m = engine.metrics;
  assert.equal(m.ticks, 200);
  assert.equal(m.genius + m.mistake, 200, "every room is genius or mistake");
  const st = engine.store.stats();
  assert.equal(st.live + st.compacted, 200, "NEVER-DELETE: nothing vanished (live genius + compacted mistakes)");
  assert.equal(st.compacted, m.mistake, "compacted == mistakes");
  assert.equal(st.live, m.genius, "live == genius");
  // HBP-only hot path: no JSON anywhere in sealed rows
  for (const r of recs) {
    assert.ok(r.sealed.startsWith("WHITEROOM|"), "HBP pipe row");
    assert.ok(r.sealed.includes("|json=0"), "explicit json=0 marker");
    assert.ok(!/[{}]/.test(r.sealed), "no JSON braces in the hot path");
    assert.match(r.sealed, /\|row_hash=[0-9a-f]{16}$/, "sha-chained row_hash");
  }
  // tamper-evident chain: recompute the first link
  let prev = "0".repeat(16);
  const first = recs[0].sealed.replace(/\|row_hash=[0-9a-f]{16}$/, "");
  assert.equal(sha256hex(first + prev).slice(0, 16), recs[0].sealed.match(/row_hash=([0-9a-f]{16})/)[1]);
});

test("engine: deterministic genius/mistake split for fixed seed", async () => {
  const mk = () => new WhiteRoomEngine({ store: new MemoryStore(), scorer: new DeterministicScorer(0.72) });
  const marks = Array.from({ length: 100 }, (_, i) => `x:${i}`);
  const a = mk(), b = mk();
  await a.spin(marks); await b.spin(marks);
  assert.deepEqual(a.metrics, b.metrics, "same inputs => identical metrics (reproducible)");
});
