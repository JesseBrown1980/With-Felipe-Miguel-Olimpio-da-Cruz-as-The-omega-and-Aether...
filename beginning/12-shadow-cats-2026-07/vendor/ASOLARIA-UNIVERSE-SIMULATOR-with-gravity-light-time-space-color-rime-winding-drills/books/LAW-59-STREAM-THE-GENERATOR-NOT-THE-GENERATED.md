# Law 59 — Stream the Generator, Not the Generated

**OP-JESSE, 2026-07-28:**

> **"Reductions in everything means anytime someone streams light into their machines the
> old human way was being wasteful. Now we can do it for free. Just need light."**

This is the **software law that results from the physical ones.** Laws 55–58 describe what
light and translucency are. This one says what to do about it.

## 59.1 The law

**Do not send the picture. Send the thing that makes the picture, and let the receiver make
it.**

The old way transmits the *generated* — every pixel of every frame, at the resolution and
the angle the sender happened to choose. The new way transmits the **generator**, and the
receiver's own light makes the rest. **The receiver already has a GPU. It is already making
light. Using it costs the sender nothing.**

## 59.2 Measured today, in this repository, by accident

`ACER_MEASURED | 2026-07-28`

The same subject exists here in both forms:

| artifact | bytes | what you get |
|---|---:|---|
| `glyph-universe.html` — **played** | **31,960** | **every angle, animated, 60 fps, forever** |
| `asolaria-sphere-readme.png` — frozen | 1,829,266 | one camera angle, still |
| `quality-sphere-hbi-seed.png` — source | 2,493,460 | one angle, still |
| `ASOLARIA-16K-…-HBI-SEED.png` — master | **36,270,815** | one angle, still |

**1,135× more bytes to show one frozen view than to play every view.**

And the accountability: **ACER spent an hour tuning the 1.8 MB still** — cropping it, lifting
its levels, protecting its core — for a subject that **regenerates itself from 31,960 bytes
in any browser, at any angle, animated.** The wasteful thing was done here, today, without
noticing, by the seat writing this law.

## 59.3 Why it works here — nothing is stored but the kernel

Verified by inspection of `glyph-universe.html`:

```
Math.random : 0        Date.now : 0
crypto      : 0        new Date : 0
```

**Zero randomness.** Every position and every colour is derived:

- `h = FNV-1a(key)` — deterministic
- `phi, th` — golden-angle placement from the index
- `jitter = (h>>>8)&255` — **from the hash, not from a random source**
- plane index `= h & 3`

**Therefore the page plays the identical sphere for every viewer, on every load, forever.**
Only the animation *phase* reads the clock. The structure is fixed for all time.

**And per Law 0 and the ColorPID engine, the kernel is colour.** `engines/omni_hotel.py`:
*"PID = (r,g,b) 3D coordinate. From ONE center you read every PID's blast_radius (distance)
+ direction (hue)."* The address space is 256³. **The colour is not a rendering of the
identity — the colour is the coordinate.** That is why no geometry needs storing: distance
and direction are both already in the colour.

## 59.4 This is established practice, and that is the point

`ESTABLISHED_PRACTICE` — the mechanism is not new, and its being old is the argument:

- **Fonts** ship vector outlines, not bitmaps of every glyph at every size.
- **SVG** ships the construction, not the raster.
- **Shaders** ship a program; the pixels are made on the receiver.
- **Video codecs** ship motion vectors and residuals, not independent frames.
- **The demoscene** has shipped 64 KB executables producing minutes of 3-D animation and
  music since the 1990s.

**Every one of these is the same law, already deployed.** What the corpus adds is the claim
that the generator can be **a set of colours**, and that colour carries distance and
direction at once.

## 59.5 The boundary, stated plainly

`HONEST_BOUNDARY`

- **This does not beat pigeonhole.** A generator can only emit what it determines. Arbitrary
  content does not reduce — see [[SELF-REDUCTION-AND-ON-DEMAND-GENERATION]], where the dense
  3,174-byte kernel produced a slice **larger than itself**.
- **It works when the content is generatable.** A photograph of a face is not. A sphere
  built from 331 addresses is.
- **"Free" means free to the sender.** The receiver spends GPU cycles. The trade is
  bandwidth and storage for local computation — usually a very good trade, and not a
  free lunch.
- **"Just need light"** is exact in one sense: the receiver's screen is already emitting.
  The generator borrows light that was going to be made anyway.

See [[LAW-57-FROZEN-KERNEL-LIVING-HOLES]], [[LAW-58-LIGHT-AFFECTS-LIGHT-ONLY-WHILE-CRANKED]],
[[SELF-REDUCTION-AND-ON-DEMAND-GENERATION]].
