# Active-glyph law — the CARET design lens (gated)

## Provenance (read first)
The "Isaac / Palo Alto CARET Laboratory Q4-86 Research Report" (archive.org PDF, sha256
`48DB54D0…09B9E1`) is a **disputed / widely-treated-as-hoax** artifact — a claimed reverse-
engineering ("extraction") of extraterrestrial antigravity + 3D-projector hardware, with glyph-
covered parts whose imagery is later attributed to human artists. Primary-source read confirms it
even hedges its own success ("a fully successful extraction has not yet been achieved").

**Tag: UNVERIFIED / disputed.** It is **not** evidence of alien tech, antigravity, or anything
physical. The "alien" claim stays outside the gate. Only one *design idea* is imported.

## The one transferable idea
**Active symbolic geometry:** a symbol whose *geometry / address / placement* **is** its behavior
descriptor — "behavior without compilation," no separate compile/interpret phase.

For Asolaria/Q-PRISM this is not a new capability — it *mirrors* what the stack already does:
```
glyph / tuple / handle8  →  graphify-60D axis position  →  (operator-gated) kernel materialization
```
The glyph's **address is its behavior descriptor**. That is exactly `handle8 → sel_* 60D envelope`.

## Why it must be inverted (the guardrail)
"Behavior without compilation" is one letter from "the glyph fires itself." Our discipline is the
**inverse**: the address **describes** behavior; it must **not execute** it without the gate. So the
CARET concept is imported only in gated form (`qprism.cube_absorb.CubeChunk.active_glyph_law`):

```
QPRISMACTIVEGLYPH|handle8=…|geometry=graphify60d|behavior=represent_address|compile=0|interpret=0|fire=0|json=0
```

- `behavior=represent_address` — the glyph is an addressable behavior *descriptor* (the useful part).
- `compile=0 | interpret=0 | fire=0` — representation-only; execution stays operator-gated on the
  Rust 8-byte Host-8 metal kernel. E=0. No AgentTerms/FEDENV.

Bilateral parity with liris (same law). Keeps the useful geometry-as-addressable-behavior idea;
imports **none** of the false provenance.
