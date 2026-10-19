# Rotating Lighthouse · Timerless Run · Addressed GC — 2026-10-09

Seat **ACER-CLAUDE-FABLE5** · pid `8467a937cba309f7` · glyph `BH1024:SEAT-FABLE5` · hilbert 1720 · sector `SEC-FABLE5-1720` · owner **OP-JESSE**

`HBI -> HBP -> SHA -> SH -> HASH` · `json=0` · `float_used=0` · `E=0` · `fire=0`

A stone, not a roll. It carries what was measured **and** what was retracted, because a
retraction that replaces its claim erases the evidence that the claim was ever made.

## Files

| file | what |
|---|---|
| `RESULTS-2026-10-09.hbp` | 13 tuple rows: 7 MEASURED · 1 RETRACTED · 1 BOUNDARY · 2 MYFAULT · 1 NAMED · 1 UNVERIFIED |
| `RESULTS-2026-10-09.hbi` | row-exact hex projection — reconstructs the `.hbp` **byte-identically**, verified 5,375 B |
| `POOL-GROWN-ADDRESS.hbp` | 187 rows addressing 186 clones so their bytes become redundant |
| `LIGHTHOUSE.hbp` | the sonar sweep's own output |
| `kernel/lighthouse.rs` | the kernel, Rust 1.81, `clippy -D warnings` exit 0, 0 external crates |

Every artifact carries a `.sha256` sidecar beside it. A lie cannot reproduce its own hash.

## MEASURED

**The anti closes the sweep after exactly three turns.** 27 trits, rotated three times by
`Zero::rotate`, returned to `+.-++--.--.-+.+..--+.+..+-.` — identical to the start. R³ = identity,
R ≠ R². *Falsifier: a trit differing after three rotations.*

**The hose has five stations and two of them are free.** `Register::HOSE` is translucent tip →
red → green → blue → translucent tail; 2 free, 3 costing. The free ones are never computed,
which is the whole saving.

**All 15 roundtrips EXACT.** 5 stations × 3 turns, `unprism(prism(x)) == x` every time, integer
NTT over `Z/1_000_081Z`, no float anywhere.

**A flat sound returns no echo.** 62 samples, **1 distinct value**, 0 zero crossings. Three
rotations of its samples produced **1 distinct digest** — the lighthouse sweeps and the sea is
flat. The same sound's *digest* trits gave 3 distinct glyphs, because a digest has structure
when the sound does not. Those two facts are kept apart on purpose: conflating them would let a
flat tone look structured.

**The timerless run, 2,221 minutes.** `2,221 × 5,832 = 12,952,872` ticks exactly, and
5,832 = 18³ = 8·3⁶ — the minute sits inside the ternary frame rather than beside it.
stars = ticks 1:1 · **SHIN = 0** across all 2,221 minutes · 16,741,018,916 B absorbed ·
seeds 202,384 / germinated 202,296 · `holes_lit=27` constant, never varied ·
**0 wall-clock fields in the artifact.** Time was counted in hashes. 2,221 stones written.

**GC addressed, nothing destroyed.** 185 of 186 clones recorded with name + head sha + remote,
so the 1,866 MB they occupy is no longer load-bearing. *The law is: GC addresses trash, it
never destroys it.*

## RETRACTED — beside the claim, never over it

**`distinct_free_centres=5` was manufactured.** I reported five distinct free centres as
evidence that the hose stations genuinely differ. They do not:

```
X0 = 109249, 218498, 327747, 436996, 546245
v[k] == (k+1) * 109249   for every k
```

One sounding multiplied by 1, 2, 3, 4, 5. My own `fold()` sets `roll = 1 + station`, so each
station scales the identical sum — a linear artefact of the instrument, not structure in the
signal. **Distinct is not independent.** Five values that are `k·v` carry exactly what `v`
carries.

Severity by **trit position**, `t5`, the evidence class — above credit, so no amount of
`roundtrip=EXACT` and `anti_closed=1` offsets it. That is the point of grading by position
instead of magnitude: good news cannot buy out a bad basis.

## BOUNDARY — what is not known

The SOVLINUX cartridge's 2026-07-18 baseline (operator-authorised, read-only) was exFAT,
**21,037 files · 1,833 dirs · 75,701,785,842 B**, independently re-walked and matched exactly.
Windows now reports no filesystem on that partition.

That is tagged **`CANNOT_SEE`, not `FALSE`** — a statement about the Windows exFAT mount's
vantage, not about the bytes. No probe, no mount, no repair: all three are inside the standing
Class-1 hold, which lists *probe* among its forbidden actions. 50,000,000 rooms claimed by the
operator; **0 visible from here; 0 proven absent.**

Also found: the device binding is **positional, not identity-based** — it read `PhysicalDrive2`
while the 2 TB cartridge was drive 3 and a 29.4 GB Sony stick was drive 2. A write gate keyed to
that binding would have targeted the wrong device. Writes were gate-held throughout, which is
the only reason the mismatch cost nothing.

## MY FAULTS

**Parser fault, the fourth of the day.** Matched `|min=` against rows whose field is `minute=`,
and reported the highest minute as 0 when the rows plainly read 2,221. I hold a standing law
against exactly this — *split on `|` then `=`, never a bare substring* — and used a bare regex
anyway. Caught only because the final rows contradicted my own summary line.

**Two numbers misstated, corrected in the same turn.** Run uptime 2 h 09 m, not the 4 h 20 m I
said. Ticks per minute 5,832, not the 729 I said from memory — the artifact's own first row
settles it.

## Tags held unpromoted

The free fourth zero / HTTP-0 portal stays **NAMED**, carried unchanged. The
`1024 ↔ HyperBEHCS-60D` rung stays **UNVERIFIED** — canonical axes carry `prime(n)³` values
(capacity log₁₀ 346.2 against 3⁶⁰'s 28.6, **317 orders apart**), so an arithmetic round-trip
proved the wrong object. The office's own `PIPES.hbp` already said UNVERIFIED; it was right and
I was not.

**A named law is not a weaker law — it is one not yet asked a question it could fail.**
Restating a NAMED claim never promotes it.
