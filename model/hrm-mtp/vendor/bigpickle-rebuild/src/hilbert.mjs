// n-dimensional Hilbert curve encode / decode.
//
// 2D uses the standard iterative algorithm (Wikipedia, public domain) which is
// the canonical 2D Hilbert curve — consecutive 1D indices always map to k-D
// coords at Manhattan distance exactly 1.
//
// n>=3 uses Skilling 2004 (Programming the Hilbert curve, AIP Conf. Proc. 707,
// 381). Bijective + locality-preserving with bounded Hilbert distortion.
//
// Spec: C:/asolaria-foundation-v1/03-CUBE-OF-CUBES.md
// Clean-room re-implementation; no quarantined-source DNA.

function validateOpts(opts) {
  if (!opts || typeof opts !== 'object') {
    throw new TypeError('hilbert: opts must be { dimensions, bits }');
  }
  const { dimensions, bits } = opts;
  if (!Number.isInteger(dimensions) || dimensions < 2) {
    throw new RangeError('hilbert: dimensions must be integer >= 2');
  }
  if (!Number.isInteger(bits) || bits < 1) {
    throw new RangeError('hilbert: bits must be integer >= 1');
  }
  return { dimensions, bits };
}

// === 2D — Wikipedia iterative ============================================

function rotate2D(n, x, y, rx, ry) {
  if (ry === 0) {
    if (rx === 1) {
      x = n - 1 - x;
      y = n - 1 - y;
    }
    return [y, x];
  }
  return [x, y];
}

function encode2D(x, y, sideLen) {
  let d = 0;
  for (let s = sideLen >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0;
    const ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    [x, y] = rotate2D(s, x, y, rx, ry);
  }
  return d;
}

function decode2D(d, sideLen) {
  let x = 0;
  let y = 0;
  let t = d;
  for (let s = 1; s < sideLen; s <<= 1) {
    const rx = 1 & (t >> 1);
    const ry = 1 & (t ^ rx);
    [x, y] = rotate2D(s, x, y, rx, ry);
    x += s * rx;
    y += s * ry;
    t >>= 2;
  }
  return [x, y];
}

// === n-D for n>=3 — Skilling 2004 ========================================

function indexToTransposeND(h, n, b) {
  const X = new Array(n).fill(0);
  const H = BigInt(h);
  const totalBits = b * n;
  for (let d = 0; d < b; d++) {
    for (let j = 0; j < n; j++) {
      const fromLSB = totalBits - 1 - (d * n + j);
      const bit = Number((H >> BigInt(fromLSB)) & 1n);
      X[j] |= bit << (b - 1 - d);
    }
  }
  return X;
}

function transposeToIndexND(X, n, b) {
  let h = 0;
  for (let d = 0; d < b; d++) {
    for (let j = 0; j < n; j++) {
      const bit = (X[j] >> (b - 1 - d)) & 1;
      h = (h << 1) | bit;
    }
  }
  return h;
}

function transposeToAxesND(X, n, b) {
  for (let i = n - 1; i > 0; i--) X[i] ^= X[i - 1];
  const N = 2 << (b - 1);
  let Q = 2;
  while (Q !== N) {
    const P = Q - 1;
    for (let i = n - 1; i >= 0; i--) {
      if (X[i] & Q) {
        X[0] ^= P;
      } else {
        const t = (X[0] ^ X[i]) & P;
        X[0] ^= t;
        X[i] ^= t;
      }
    }
    Q <<= 1;
  }
}

function axesToTransposeND(X, n, b) {
  const M = 1 << (b - 1);
  for (let Q = M; Q > 1; Q >>= 1) {
    const P = Q - 1;
    for (let i = 0; i < n; i++) {
      if (X[i] & Q) {
        X[0] ^= P;
      } else {
        const t = (X[0] ^ X[i]) & P;
        X[0] ^= t;
        X[i] ^= t;
      }
    }
  }
  for (let i = 1; i < n; i++) X[i] ^= X[i - 1];
}

// === Public API ==========================================================

export function hilbertDecode(index, opts) {
  const { dimensions, bits } = validateOpts(opts);
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`hilbert: index must be non-negative integer (got ${index})`);
  }
  if (dimensions === 2) {
    return decode2D(index, 1 << bits);
  }
  const X = indexToTransposeND(index, dimensions, bits);
  transposeToAxesND(X, dimensions, bits);
  return X;
}

export function hilbertEncode(coord, opts) {
  const { dimensions, bits } = validateOpts(opts);
  if (!Array.isArray(coord) || coord.length !== dimensions) {
    throw new TypeError(`hilbert: coord must be array of length ${dimensions}`);
  }
  if (dimensions === 2) {
    return encode2D(coord[0], coord[1], 1 << bits);
  }
  const X = coord.slice();
  axesToTransposeND(X, dimensions, bits);
  return transposeToIndexND(X, dimensions, bits);
}
