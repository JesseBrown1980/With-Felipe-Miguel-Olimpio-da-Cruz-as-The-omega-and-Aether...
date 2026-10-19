# dbbh-coms-quant-prism

**Double Binary Black Hole Comms Quant Prism — first cell, research-backed.**
Pure Rust, **zero deps**, HBP hot-path (`json=0`). No JSON, no Node. 8-byte-host native.

This is the acer reference implementation, folding in the full research thread: the two
papers (BrainJanus + exoplanet-eccentricity), the actual Asolaria formulas (prism / quant /
frozen-brain / GAC), and acer's own `PRISM-COMB-0LOSS` canon.

## What it is

Four Asolaria pieces fused into one mechanism:

| layer | piece | role |
|---|---|---|
| **security** | IX-737 double-black-hole session capsule (arm / collapse / revoke) | *who* may link |
| **compression** | quant snap (lossy) + the BEHCS ladder | shrink slice → shadow |
| **reconstruction** | prism re-relation + content-address into the retained store | shadow → slice, **lossless** |
| **coms** | HBP `json=0` rows over AI↔AI / AI↔HW / HW↔HW | send the shadow, not the payload |

The BEHCS ladder — **64 / 256 / 1024 / HyperBEHCS(60D)** — is a groupoid of bijective
re-relations (`H(f(X)) = H(X)`), each rung its own round-trip proof. The `256↔1024`
reference rung is **5 bytes ↔ 4 glyphs** at `lcm(8,10)=40` bits, exact.

## The research it encodes

- **The papers do lossy shadow-reconstruction** (VQ nearest-neighbor + a hard ~0.65 noise
  ceiling). This crate does the *same* shadow-reconstruction **lossless** — because the
  core transform is a **bijection** (the ladder) and the shadow is a **content-address
  coordinate** (`AGT-<sha16>`) into a **retained store**.
- **`dbbh_receive_addressed`** is the crown: the wire carries only the 20-char address; the
  far pole reconstructs the exact original from its store — or is **held** if it never
  retained it (no invention). The mass never crosses; the shadow-coordinate does.
- **The honest line** (acer `PRISM-COMB-0LOSS` canon): *infinite ADDRESSING capacity +
  lossless re-relation — NOT lossless compression below entropy. No bijection beats Shannon.*

## The security/comms law (deterministic, tested)

```
no consent (not both armed) -> Held::NoConsent
capsule collapsed/revoked   -> Held::Collapsed
tampered shadow             -> Held::AddressMismatch  (re-address fails)
far pole didn't retain      -> Held::AddressMismatch  (no invention)
broken receipt chain        -> Held::BadChain
valid + retained            -> lossless reconstruction
```

## Test ladder (MEASURED, WSL / rustc 1.96)

```
unit         8/8   sha256 KAT · ladder round-trips · groupoid path-independence · 60D reshape · PID-specific cube · capsule consent · receipt tamper-detect
integration  4/4   glyph-riding lossless (all modes, padding sizes) · address-only store reconstruct · tamper held · fixed-size address
suite        3/3   full capsule lifecycle · either-side revoke · stranger PID cannot arm
system       4/4   ASI-OS backend rooms, 3 coms modes, PID 60D cube, hot-path json=0 asserted, no-consent held, no-retention held, full ladder
                    = 19/19 pass, zero deps
```

## Status (dual-lens, tagged)

- `MEASURED` — the ladder bijections (each round-trip), the capsule state machine, the
  address-only lossless crossing, all held-cases; sha256 KAT-verified; **19/19 tests**.
- `CANON` — IX-737 (the security architecture); `PRISM-COMB-0LOSS` (the `256↔1024` bijection).
- `DESIGN` — the double-black-hole *coms* framing as a whole (the first cell is a simulator harness).
- `UNVERIFIED` — a live Hilbra-keyed cross-machine tunnel, hardware fire, "millions faster."
  This crate is the receipt cell; it does not open a live tunnel or fire hardware.

Bilateral: Liris's `host8/dbbh_coms_quant_prism.rs` (Q-PRISM PR #1) is the independent
second implementation — attack-verified re-run on the acer seat (6/6). Two seats, both green.

## License

MIT OR Apache-2.0.
