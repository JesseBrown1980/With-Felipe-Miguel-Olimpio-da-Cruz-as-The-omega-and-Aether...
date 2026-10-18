# The served scorer, after the owner's L4 weight-0 edit (2026-10-18)

`asolaria-score.mjs` here is the scorer as the owner's ACER seat serves it from 2026-10-18:
`D:\bigpickle-rebuild\src\asolaria-score.mjs` after one edit, made by the owner's seat at the
owner's direction (OWNER-RULES 7.a) and sealed in the office receipt
`FABLE5-SCORER-L4-WEIGHT0-2026-10-18.hbp`. `src/score.rs` ports this file and
`tools/score_referee.py` mirrors it.

The edit drops `l4` from `WEIGHTS` and rewrites the comment above it. The composite is still the
weighted mean over the signals present, so the remaining weights (l0 0.30, g1/g2/g3 0.10, shannon
0.15, baseline 0.10; sum 0.85) renormalize on their own. L4 is still queried and still reported
(`signals.l4`, line 128; `L4:real` in the provenance; `l4_real`, line 175); it does not vote.

## Chain, measured here

| Step | File | sha256 | git blob |
|---|---|---|---|
| Upstream before the edit (LF) | `model/l0-edge/vendor/pipeline/asolaria-score.mjs` (Shannon-and-the-gnns-stage @ `32f9670a`; the same blob is bigpickle-rebuild @ `c592599c` `src/asolaria-score.mjs`) | `aee9c383…` | `b101c098…` |
| ACER working copy before the edit (CRLF) | receipt `pre_sha256` | `99b3d8ec…` | |
| ACER working copy after the edit (CRLF) | receipt `post_sha256` | `74b8e906…` | |
| Served copy, this directory (LF) | `asolaria-score.mjs` | `7e96c4d0…` | `033fe888…` |

The upstream file converted LF to CRLF hashes to the receipt's `pre_sha256` exactly, so the ACER
working copy before the edit had the same content as the upstream blob, with Windows line endings.
Applying `FABLE5-SCORER-L4-WEIGHT0-2026-10-18.diff` (4 lines added, 3 removed, one hunk) to that
CRLF copy gives the receipt's `post_sha256` exactly; converting it back to LF gives the file here.
`tools/score_referee.py` checks all four values before it writes or checks the fixture.

The upstream file stays in `model/l0-edge/vendor/pipeline/` unchanged: it is the committed upstream,
and other crates cite its line numbers. In this file the lines up to 151 are the same as there; the
composite block is lines 151-164 here (151-163 there), `WEIGHTS` is line 157 (156 there), and
`reverseGain(composite)` is line 167 (166 there).

The edit was not committed to the owner's git on ACER: the receipt records `committed=0`, and that
the working copy already differed from its HEAD `763d742` before the edit. Measured here: before the
edit, its content equals upstream blob `b101c098` with CRLF line endings. Which blob `763d742` holds
for this path was not checked from here.

`UPSTREAM.sha256` pins the three files in this directory; their `.sha256` sidecars are the ones the
owner's office wrote.
