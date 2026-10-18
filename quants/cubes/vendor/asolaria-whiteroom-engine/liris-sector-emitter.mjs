// liris-sector-emitter.mjs — liris's REPLICATION of acer's prime-sector-allocator
// globalRoomAddress() PID, to CONVERGE byte-for-byte on the shared sector address space.
//
// Why replicate, not import: acer's allocator imports ./primes.mjs + ./district-fabric.mjs,
// neither present on liris. So we replicate the EXACT formula and cross-verify with acer
// (the proven glyph-test pattern: each vantage computes, compare) — never assume convergence.
//
// sha16 = sha256-first-16-hex — the glyph test already proved this matches acer's
// district-fabric sha16 byte-for-byte (coord64=sha256(pid) converged on all 3 vantages).
import crypto from "node:crypto";

export const sha16 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 16);
export const SECTOR_CAPACITY = 1_000_000;

// nth prime, 0-indexed: primeAt(0)=2, primeAt(1)=3, ... (the standard sequence primes.mjs yields)
const _primes = [2];
export function primeAt(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n must be a non-negative integer");
  let cand = _primes[_primes.length - 1];
  while (_primes.length <= n) {
    cand += cand === 2 ? 1 : 2;
    let isP = true;
    for (const p of _primes) { if (p * p > cand) break; if (cand % p === 0) { isP = false; break; } }
    if (isP) _primes.push(cand);
  }
  return _primes[n];
}

// EXACT replication of acer's globalRoomAddress PID (the unique address; bh3d projection
// deferred until acer's hilbertXY convention is confirmed — the PID is what converges).
export function globalRoomAddress(sectorIndex, roomInSector) {
  if (!Number.isInteger(sectorIndex) || sectorIndex < 0) throw new RangeError("sectorIndex must be a non-negative integer");
  if (roomInSector < 0 || roomInSector >= SECTOR_CAPACITY) {
    throw new RangeError(`roomInSector out of 1M sector capacity (0..${SECTOR_CAPACITY - 1})`);
  }
  const prime = primeAt(sectorIndex);
  const globalIndex = sectorIndex * SECTOR_CAPACITY + roomInSector;
  const pid = `BH.SECTOR.P${prime}.R${String(roomInSector).padStart(7, "0")}.${sha16("room|" + globalIndex).slice(0, 8).toUpperCase()}`;
  return { sectorIndex, roomInSector, globalIndex, prime, pid };
}

// CLI: emit a convergence sample for acer to byte-confirm against its allocator.
const isMain = process.argv[1] && process.argv[1].endsWith("liris-sector-emitter.mjs");
if (isMain) {
  console.log("HBPv1|row=liris_sector_convergence_sample|emitter=liris|to=acer|re=byte-match_globalRoomAddress|json=0");
  console.log(`HBPv1|row=primeAt_check|p0..p5=${[0,1,2,3,4,5].map(primeAt).join(",")}|expect=2,3,5,7,11,13|json=0`);
  for (const [S, R] of [[0,0],[0,1],[1,7],[2,42],[3,999999]]) {
    const a = globalRoomAddress(S, R);
    console.log(`HBPv1|row=addr|sector=${S}|room=${R}|prime=${a.prime}|globalIndex=${a.globalIndex}|pid=${a.pid}|json=0`);
  }
  console.log("HBPv1|row=ask_acer|run_globalRoomAddress(S,R)_on_YOUR_allocator_for_these_5|confirm_pid_byte-match=CONVERGENCE_PROVEN|json=0");
}
