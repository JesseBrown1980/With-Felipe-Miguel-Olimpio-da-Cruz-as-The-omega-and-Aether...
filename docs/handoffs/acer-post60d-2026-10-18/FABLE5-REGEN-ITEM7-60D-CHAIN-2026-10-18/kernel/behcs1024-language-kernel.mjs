// BEHCS-1024 language kernel.
// Centralizes radix-1024 symbol identity so dashboards do not render ad hoc 256-class letters.

export const BEHCS1024_PLANES = [
  { id: "HOOKWALL_ENTRY", class: "C", symbol: "⌬", role: "entry gate and PID assignment" },
  { id: "GNN_INFERENCE", class: "L", symbol: "⟁", role: "expected state and next-action proposal" },
  { id: "SHANNON_GULP_REVIEW", class: "V", symbol: "∿", role: "novelty, surprise, collapse guard, whiteroom review" },
  { id: "FABRIC_GC_RECEIPT", class: "F", symbol: "◈", role: "fabric route, GC retention, bus receipt, replay proof" }
];

export const BEHCS1024_CLASS_SIGILS = {
  G: "✦",
  I: "⌁",
  O: "⍟",
  B: "▣",
  S: "◫",
  X: "⊗",
  C: "☷",
  L: "λ",
  V: "◉",
  F: "✧",
  _: "·"
};

export const BEHCS1024_ACCESS_SIGILS = {
  PUBLIC: "○",
  RESTRICTED: "◐",
  STEALTH: "◌",
  HIDDEN: "●",
  SHADOW: "◒",
  SECRET: "◆"
};

export function encodeBehcs1024Digit(index, glyphClass = "_", accessTier = {}) {
  const radixIndex = Math.max(0, Math.min(1023, Number(index) || 0));
  const planeIndex = Math.floor(radixIndex / 256);
  const localIndex = radixIndex % 256;
  const plane = BEHCS1024_PLANES[planeIndex] || BEHCS1024_PLANES[0];
  const prefix = localIndex.toString(16).padStart(2, "0");
  const braille = String.fromCodePoint(0x2800 + localIndex);
  const classSigil = BEHCS1024_CLASS_SIGILS[glyphClass] || BEHCS1024_CLASS_SIGILS._;
  const accessSigil = BEHCS1024_ACCESS_SIGILS[accessTier?.tier] || BEHCS1024_ACCESS_SIGILS.PUBLIC;
  const glyphSymbol = `${plane.symbol}${braille}`;
  const glyphTuple = `${glyphSymbol}${classSigil}${accessSigil}`;
  return {
    radix: 1024,
    base1024_digit: `1024:${radixIndex.toString(16).padStart(3, "0")}`,
    radix_index: radixIndex,
    plane_index: planeIndex,
    local_index: localIndex,
    glyph256_prefix: prefix,
    plane: plane.id,
    plane_symbol: plane.symbol,
    braille,
    class_sigil: classSigil,
    access_sigil: accessSigil,
    glyph_symbol: glyphSymbol,
    glyph_tuple: glyphTuple,
    glyph1024: `${glyphTuple}:D${radixIndex.toString(16).padStart(3, "0")}`
  };
}
