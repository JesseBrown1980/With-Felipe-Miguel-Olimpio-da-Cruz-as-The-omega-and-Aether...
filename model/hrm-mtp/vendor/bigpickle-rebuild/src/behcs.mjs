// BEHCS-256 and BEHCS-1024 glyph alphabets.
// Spec: C:/asolaria-foundation-v1/02-PORT-NAMESPACE-CANON.md (v1 + v2 amendment)
//
// Subset embedding: BEHCS1024.glyphs[0..255] === BEHCS256.glyphs[0..255] by construction.
// Glyphs here are stable synthetic codepoints (cp0000..cp03ff). The live HG256 atlas at
// projections/maps/hyperglyph-map.public.v1.json substitutes real Unicode glyphs at a
// later layer; the identity of each codepoint is what the bijection relies on, not the
// rendered character.

function makeGlyphs(n) {
  return Array.from({ length: n }, (_, i) => `cp${i.toString(16).padStart(4, '0')}`);
}

const _all1024 = makeGlyphs(1024);

export const BEHCS256 = Object.freeze({
  size: 256,
  glyphs: Object.freeze(_all1024.slice(0, 256)),
});

export const BEHCS1024 = Object.freeze({
  size: 1024,
  glyphs: Object.freeze(_all1024),
});

export function glyphAt(index, alphabet = 256) {
  if (alphabet !== 256 && alphabet !== 1024) {
    throw new RangeError(`alphabet must be 256 or 1024 (got ${alphabet})`);
  }
  const table = alphabet === 256 ? BEHCS256 : BEHCS1024;
  if (!Number.isInteger(index) || index < 0 || index >= table.size) {
    throw new RangeError(`actor index ${index} outside [0, ${table.size})`);
  }
  return table.glyphs[index];
}
