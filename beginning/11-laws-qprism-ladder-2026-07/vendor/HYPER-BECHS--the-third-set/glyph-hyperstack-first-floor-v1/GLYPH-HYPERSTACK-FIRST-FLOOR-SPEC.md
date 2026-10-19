# Glyph Hyperstack First Floor v1

## Purpose

This module is a shadow-only, reversible first-floor experiment for training
new glyph languages over verified local cube bytes. It turns each input body
into an exact BEHCS-1024 frame, measures a cold state, performs the operator's
ten-pass rule three times, and proves the reverse path after every pass.

The executable does not contact or change a live Asolaria service. It does not
promote a cube, rewrite a catalog, restart a daemon, or place objects on the
physical cube floor.

## Measured topology: 27 L3 seats, not 27 levels

`canonical-l3-27.hbp` is the local mirror of the measured L3 registry used by
this experiment. It contains exactly 27 canonical seats:

- 1 `level3_chief`;
- 9 `level3_council` seats; and
- 17 `level3_supervisor` seats.

The number 27 describes seats in one L3 registry. It is not evidence of 27
stack levels. A run with exactly 27 input cubes maps one deterministically
ordered cube to each of those 27 seats and may report
`MEASURED_27_SEAT_FIRST_FLOOR`. A smaller run is a `TEST_SUBSET`.

The source and mirror registry hashes are embedded in the executable and
carried into the result. The active canonical seat digest is the
`HBP_TLV_V1` digest of the 27 normalized seat records. The older compact,
sorted-JSON digest is retained only under the explicit
`LEGACY_SORTED_JSON` label. The byte SHA-256 of `canonical-l3-27.hbp` is a
separate physical-file anchor. These freeze the topology used by the
experiment; they do not claim that the registry can never change.

## Thirty deterministic PID viewpoints

Every proposed language merge is evaluated by 30 deterministic viewpoints,
which exceeds the minimum eight-node experiment requested by the operator.
The viewpoints are ten ordered rule-of-three triads:

1. generator: forward relation score;
2. reflector: reverse-gain score; and
3. reviewer: Hookwall eligibility and agreement score.

Each viewpoint uses the canonical N-VANTAGE watcher identity
`pid8("WATCHER|{prime}|{role}")`; its index and triad are separately carried
in every receipt. The same input and parameters therefore produce the same 30 PID receipts. These
are deterministic experimental viewpoints, not claims of 30 operating-system
processes or 30 independently hosted machines.

The 30 viewpoints and the 27 seats are separate dimensions. A cube is assigned
to one measured L3 seat; all 30 viewpoints inspect each proposal for that cube.

## Cold plus 10 x 3 training law

For each cube the default schedule is:

```text
1 cold measurement
+ 10 measured passes in cycle 1
+ 10 measured passes in cycle 2
+ 10 measured passes in cycle 3
= 1 cold state and 30 post-cold passes
```

With 27 cubes this yields 27 cold states and 810 post-cold pass measurements.
The default permits one candidate merge per pass. Every accepted merge creates
a new glyph ID at or above 1024 and is stored with its exact inverse rule.
Non-positive net gain is held instead of admitted.

This v1 trains each first-floor cube. Training of supercubes, training between
levels, and retraining after a hypersupercube is formed remain future gates.

## Exact glyph rung and reverse gate

The base language is `BEHCS1024_EXACT_5BYTE_4GLYPH`, not an English token
vocabulary. Each five-byte group is represented as four base-1024 glyph IDs;
the original byte length is retained to remove final padding. This rung is an
exact representation bijection, not compression.

After every measured pass the implementation:

1. expands every learned glyph through its merge DAG;
2. reconstructs the base BEHCS-1024 glyph stream;
3. decodes that stream to the original byte length; and
4. requires byte equality with the source body.

The final source and restored SHA-256 values must also agree. A failed reverse
gate aborts the run; it cannot emit a successful receipt.

## Local scoring lanes and their claim boundary

The experiment gives the named lanes executable shadow roles:

- forward GNN: deterministic relation score over adjacent glyphs;
- reverse-gain GNN: deterministic reverse/economic score;
- Shannon/OmniShannon: vote distribution and consensus entropy;
- Bobby Fischer: selection of the best legal positive-gain candidate; and
- Hookwall: admission only when the catalog-charged net gain is positive.

These are local deterministic scoring functions. The precise evidence label is
`MEASURED_DETERMINISTIC_SCORERS_NOT_LEARNED_GNN`. The run does not establish
that a live GNN, reverse-gain daemon, OmniShannon service, Fischer service, or
Hookwall service participated. It also does not claim that every operator in
the quant atlas has been executed.

The learned object is a reversible per-cube glyph merge language. Compression
economics remain ledgered separately from the exact representation claim.

## Input boundary

`selftest` uses deterministic synthetic bodies and is suitable for CI. The
`run` command consumes only a local frozen shadow snapshot plus its native HBP
allowlist. The runner accepts `OLDCUBEREF` rows whose `file` is `LX-*.md`,
parses their axis, byte count, SHA-256, and relative snapshot location, rejects
path traversal and duplicates, then selects a balanced deterministic cohort.
The allowlist SHA-256 and `source_manifest_format=HBP` are sealed into the
result and HBP header; raw source paths are not emitted.

Example real-shadow invocation:

```bash
python glyph-hyperstack-first-floor-v1/glyph_hyperstack_first_floor_v1.py run \
  --snapshot-root /path/to/frozen-shadow \
  --source-hbp-manifest /path/to/OLD-CUBE-SHADOW-PILOT-ALLOWLIST.hbp \
  --count 27 \
  --passes-per-cycle 10 \
  --three-rule-cycles 3 \
  --merges-per-pass 1 \
  --output-dir /path/to/receipts
```

No live fabric endpoint is an input to this command.

An older JSON cohort can be used only through the explicitly named
`--legacy-json-manifest` option. Such a run is permanently tagged
`legacy_json_intake=1`; JSON is not the canonical intake lane.

## Receipts

A default receipted run emits:

- `FIRST-FLOOR-RESULT.hbp`, the compact source-of-record rows, including 27
  `SEAT` rows, 30 `VANTAGE` rows, every accepted `MERGE`, and the full measured
  `PASS` ledger;
- `FIRST-FLOOR-RESULT.hbi`, a per-row SHA-256 and hexadecimal mirror;
- one SHA-256 sidecar for each primary artifact;
- `SHA256SUMS`; and
- `SHA256SUMS.sha256`.

Every HBP and HBI row ends in `json=0`. The HBP is written before its HBI and
aggregate manifest, so the final manifest covers the completed primary
artifacts and their sidecars. `--debug-json` may additionally emit
`first-floor-result.json`, but JSON is off by default and is never the source
of record.

Result and learned-language digests use deterministic `HBP_TLV_V1` canonical
bytes: a one-byte type tag, decimal byte length, colon, and payload; mappings
are ordered by their encoded keys, sequences retain order, and finite floats
use their exact hexadecimal representation. Shannon entropy is rounded to 12
decimal places before sealing. The result digest is verified again before any
receipt is written.

## Held formation boundary

The arithmetic count `27^4 = 531441` is recorded, but the four-dimensional
formation is `HELD_UNDEFINED_AXES`. V1 has no authority to infer the missing
facts:

- semantics for axes 1 through 4;
- the positioning law;
- the inter-level training and recovery law; and
- a receipt proving the formed object can be reversed and retrained.

Accordingly, this first-floor run is not a 27 x 27 x 27 x 27 hypercube and does
not place one on disk.

## Explicit non-claims

- No live action or live absorption occurred.
- No learned production GNN was trained or invoked.
- No complete 27-level hierarchy was measured.
- No four-axis hypercube was formed.
- No Hutter Prize record, record-class compression ratio, or prize readiness is
  claimed.
- No result is promoted beyond `SHADOW_MEASURED_NO_LIVE_PROMOTION` without a
  separate authorized gate and independent receipt.
