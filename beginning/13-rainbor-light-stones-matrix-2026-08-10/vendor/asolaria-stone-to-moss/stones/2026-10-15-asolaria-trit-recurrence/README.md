# Asolaria — Public Ternary Recurrence and Three-Loop Memory Stones

**Published 2026-10-15.** This directory is a standalone, public, source-pinned research packet, published only after the first stone was placed and independently fetched by immutable commit. It is part of the **public** `JesseBrown1980/asolaria-stone-to-moss` repository; it is **not** currently a separately created GitHub or Hugging Face repository.

## Published stones

- [STONE-0001-PUBLIC-GENESIS.hbp](STONE-0001-PUBLIC-GENESIS.hbp) — first public research stone; GitHub immutable commit `7f90d9a8cb850decb419266d9345f2c2005f8328`, original blob SHA `8f0db0f610b74872c6dcfb9f8b729557a6fc440a`.
- [STONE-0002-REANALYSIS-R1.hbp](STONE-0002-REANALYSIS-R1.hbp) — independently tested mathematical/agent-memory consequences, plus a record of negative controls and evidence boundaries.
- [REANALYSIS-R1.md](REANALYSIS-R1.md) — results, algebra, experimental procedures, critical limitations and next three-loop objective.
- [RESULTS.json](RESULTS.json), [NODE-REVIEW.json](NODE-REVIEW.json) — machine-readable computational receipts.

## Reproduce

Requires Python 3.11+ and Node 22; uses only their built-in libraries.

```bash
python test_stone.py
node verify_independent.js
sha256sum -c CHECKSUMS.sha256
```

Both programs execute real software tests on the machine running them. They **do not** operate optical sensors or record biological neurons. Python regenerates `RESULTS.json`; Node independently constructs the GF(3) 81-basis rank checks and regenerates `NODE-REVIEW.json`.

**Important research boundaries:**

1. In the tested 81-trit GF(3) linear models, three-tap laws `[0,1,3]` and `[0,4,7]` lose initial-state information by logical step 81. This does *not* imply all balanced-ternary recurrences forget or that any other historical Asolaria transition used those exact laws.
2. Repeated-squaring matrix/polynomial skip gives the correct final logical state for declared valid transitions. A newly computed SHA256 of modified time metadata is **not** equivalent to iterating a hash chain or physically jumping time.
3. The three-loop agent learns an engineered 9-entry delayed mapping and passes 16,200 held-out trials. The result is a reproducible software learning task, **not** evidence of biological neural tissue, general intelligence or consciousness.
4. The previous historical physical photon-memory run is preserved as **operator-reported completed**, without independently linked raw capture data in this packet. No statement about the original experiment being nonexistent is made.
5. A checksum proves byte integrity relative to its pinned source; it is not an independently trusted original-source signature or instrument attestation.

Public publication is an explicit user-requested action; it is not an automatic merge or physical scientific release. Original Asolaria research stones were not modified.

**Separate repo migration:** these files are laid out so they can be copied unchanged into a dedicated *new public* repository once repository-creation permission or an authenticated publishing connection is available. No live token, private sensor input, or credential is included. Licensing for the new standalone repository remains an owner decision.
