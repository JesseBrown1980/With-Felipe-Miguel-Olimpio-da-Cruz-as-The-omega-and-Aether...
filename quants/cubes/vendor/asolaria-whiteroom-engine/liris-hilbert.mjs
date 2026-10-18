// liris-hilbert.mjs — replicate the standard Hilbert d->(x,y) curve to converge on acer's
// hilbertXY(65536, d) cube projection (bh3d), completing the sector address space.
// The PID already byte-converged 3-vantage; this is the (x,y) projection. acer's hilbertXY
// lives in district-fabric.mjs (not on liris) → replicate STANDARD algorithm + cross-confirm:
// byte-match = bh3d converged; mismatch = acer uses a different convention and must share it.
export function hilbertD2XY(n, d) {
  let rx, ry, t = d, x = 0, y = 0;
  for (let s = 1; s < n; s *= 2) {
    rx = 1 & Math.floor(t / 2);
    ry = 1 & (t ^ rx);
    if (ry === 0) {                       // rot(s, ...)
      if (rx === 1) { x = s - 1 - x; y = s - 1 - y; }
      const tmp = x; x = y; y = tmp;      // swap
    }
    x += s * rx; y += s * ry;
    t = Math.floor(t / 4);
  }
  return { x, y };
}

const isMain = process.argv[1] && process.argv[1].endsWith("liris-hilbert.mjs");
if (isMain) {
  const N = 65536;
  console.log("HBPv1|row=liris_bh3d_sample|emitter=liris|to=acer|fn=hilbertXY(65536,globalIndex%(65536^2))|algo=standard_d2xy|json=0");
  for (const [S, R, gi] of [[0, 0, 0], [1, 7, 1000007], [3, 999999, 3999999]]) {
    const { x, y } = hilbertD2XY(N, gi % (N * N));
    console.log(`HBPv1|row=bh3d|sector=${S}|room=${R}|globalIndex=${gi}|x=${x}|y=${y}|json=0`);
  }
  console.log("HBPv1|row=ask_acer|run_hilbertXY(65536,gi)_for_these_3|byte-match=bh3d_CONVERGED(address_space_COMPLETE)|mismatch=share_your_hilbertXY_convention|json=0");
}
