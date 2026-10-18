import { test } from "node:test";
import assert from "node:assert";
import { primeAt, globalRoomAddress, sha16, SECTOR_CAPACITY } from "./liris-sector-emitter.mjs";

test("primeAt: standard 0-indexed nth prime (matches primes.mjs sequence)", () => {
  assert.deepEqual([0,1,2,3,4,5,6,7].map(primeAt), [2,3,5,7,11,13,17,19]);
  assert.throws(() => primeAt(-1), /non-negative/);
});

test("SECTOR_CAPACITY = 1,000,000 (1M rooms = 1M workers per sector)", () => {
  assert.equal(SECTOR_CAPACITY, 1_000_000);
});

test("globalRoomAddress: deterministic, prime-indexed, 1M-stride, capacity-bounded, unique", () => {
  const a = globalRoomAddress(0, 0);
  assert.equal(a.prime, 2);
  assert.equal(a.globalIndex, 0);
  assert.match(a.pid, /^BH\.SECTOR\.P2\.R0000000\.[0-9A-F]{8}$/, "acer PID shape");
  assert.deepEqual(globalRoomAddress(1, 7), globalRoomAddress(1, 7), "deterministic");
  assert.equal(globalRoomAddress(1, 0).globalIndex, 1_000_000, "1M stride between sectors");
  assert.equal(globalRoomAddress(3, 0).prime, 7, "sector 3 carries prime 7");
  assert.notEqual(globalRoomAddress(0, 1).pid, globalRoomAddress(1, 1).pid, "unique across sectors");
  assert.throws(() => globalRoomAddress(0, 1_000_000), /capacity/, "bounded at 1M");
});

test("PID derivation matches acer's globalRoomAddress formula exactly (independent re-derivation)", () => {
  const S = 2, R = 42, prime = 5, gi = 2 * 1_000_000 + 42;
  const expect = `BH.SECTOR.P${prime}.R${String(R).padStart(7, "0")}.${sha16("room|" + gi).slice(0, 8).toUpperCase()}`;
  assert.equal(globalRoomAddress(S, R).pid, expect, "formula-exact (cross-vantage byte-match confirmed separately with acer)");
});
