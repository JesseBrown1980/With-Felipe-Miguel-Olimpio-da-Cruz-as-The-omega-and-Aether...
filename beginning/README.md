# beginning: the start of Asolaria, in the order it was built

Owner, 2026-10-18: "Everything was trained in the beginning. That's why I told you everything that was
beginning needs to be in the beginning. You can't have the end without the beginning."

aether carried the late, ported end of the system; almost none of the files it grew from were here
(0 of the 89 files in the Asolaria repository's first commit). This directory brings the beginning in,
byte-identical, from the public repositories, one directory per step of the construction-gap map's
build order (`docs/audit/construction-gap-2026-10-18/`). Each step directory has `vendor/<repo>/<original path>`, `PROVENANCE.md` (repo @ commit :
path, git blob, bytes, sha256 and the date of the commit that first introduced the blob),
`UPSTREAM.sha256` (`sha256sum -c` from the directory), `HELD.hbp` and a README.

| Step | Directory | Files | Bytes | Held | Date range |
|---|---|---|---|---|---|
| 1 | `01-healthcare-origin-2025-12/` | 20 | 178,442 | 1 | 2025-12-03 → 2026-08-06 |
| 2 | `02-release-snapshots-2026-02/` | 1,745 | 18,852,197 | 49 | builds of 2026-02-18 → 2026-03-13 |
| 3 | `03-gnn-design-seed-2026-03/` | 14 | 250,543 | 3 | 2026-02-19 → 2026-03-15 |
| 4 | `04-build-day-2026-03-15/` | 114 | 3,485,927 | 3 | 2026-03-15 14:41 → 2026-03-16 |
| 4b | `04b-build-day-rest-and-healthcare-gaps/` | 70 | 719,535 | 0 | gaps of steps 1 and 4 |
| 5 | `05-index-language-2026-03/` | 563 | 2,966,101 | 6 | window 2026-03-16 → 03-27 |
| 6 | `06-verbs-cubes-behcs-2026-04/` | 75 | 597,183 | 1 | window 2026-03-30 → 04-11 |
| 7 | `07-glyphs-cosign-2026-04/` | 102 | 884,342 | 7 | window 2026-04-12 → 04-20 |
| 8 | `08-gac-gulp-hg256-2026-04/` | 122 | 1,059,902 | 3 | 2026-03-15 → 2026-05-13 |
| 9 | `09-federation-kernel-2026-05/` | 176 | 1,433,104 | 12 | 2026-05-11 → 2026-07-07 |
| 10 | `10-quant-pid-office-2026-06/` | 214 | 1,968,786 | 7 | 2026-05-13 → 2026-07-10 |
| 11 | `11-laws-qprism-ladder-2026-07/` | 410 | 5,267,643 | 2 | 2026-06-23 → 2026-07-30 |
| 12 | `12-shadow-cats-2026-07/` | 203 | 12,401,483 | 2 | 2026-07-27 → 2026-10-09 |
| 13 | `13-rainbor-light-stones-matrix-2026-08-10/` | 771 | 38,080,473 | 7 | 2026-08-08 → 2026-10-16 |
| 14 | `14-regeneration-closers-2026-10/` | 2 | 3,326 | 0 | 2026-07-27 |

Files and bytes are measured over each `vendor/`; Held counts the `HELD` rows of each `HELD.hbp`. From
step 8 on, the date range runs from the earliest to the latest first-introducing commit in the
`PROVENANCE.md` `beginning` column. Steps 5 to 7 record that column in another form, so their row gives
the build-order window instead.

- **Step 1**, the healthcare-era origin: the anomaly-detector service, API, config, graph builders, tests,
  OCR mappers and the GNN lineage receipt of `JesseBrown1980/AI-healthCare-project`. The four model
  classes it trained were already in aether (`model/l0-edge`, `l1-prototype`, `l2-contrastive`,
  `l4-gslgnn`). No healthcare-era weights exist in any of its 40 commits.
- **Step 2**, the release snapshots: the ten public and phone release trees built 2026-02-18 to
  2026-03-13, and the 2026-02-19 MCP token benchmark (row C, "5,340 tokens (99.22%)") with the index
  store it credits.
- **Step 3**, the GNN design seed: the 2026-03-03 system card, the 2026-03-07 graph-runtime research
  review, the risk engines (`riskEngine.js` 2026-02-19 and 03-05, `edgeRiskEngine.js` 03-07), the graph
  runtime store and query, the first dataset (2026-03-07T23:04Z) and ADR-0010.
- **Step 4**, the build day: all 89 files of the first commit `b49a725` (`server.js`, 1,197,968 B, and
  the first 25 routes), the guardian, approval and first-hook code, ADR-0000 to ADR-0012, the Anti-Drift
  Constitution v2, the creation history, and the last `server.js` of 2026-03-16.

- **Step 4b** completes steps 1 and 4: the 65 files of the `e8c3369` tree that step 4 pinned but did not
  vendor (among them `src/secureVault.js` and `src/secretHardening.js`, the vault *mechanism*), and the
  healthcare `exceptions.py` and package `__init__.py` files.
- **Step 5**, the index language as data (03-16 to 03-27): the ASO index-kernel and its compiled tables,
  the IX/LX chains, the GAIA snapshot the watcher and tool index came from.
- **Step 6**, verbs, tuples, the first cubes and gates (03-30 to 04-11): the verb table and factory, the
  14-field tuple, the Brown-Hilbert cube at 35, 37 and 47 dimensions, the BEHCS node language, and the
  `ix/` gate pipeline.
- **Step 7**, glyphs and the cosign origin (04-12 to 04-20): the D0 runtime and 256-glyph session,
  GLYPH-GENESIS, the ed25519 key registry and the first cosign chain, the first `asolaria-behcs-256` trees.
- **Step 8**, GAC, GULP, HG256, the crypto capsule and the sovereignty kernel (04-24 to 04-30).
- **Step 9**, the federation kernel genesis (05-11 to 05-22): the first Rust hookwall and the
  `asolaria-federation-1024` genesis, with its follow-ups.
- **Step 10**, quant engines, the PID office and the first $0 crank (06-01 to 06-24).
- **Step 11**, laws, Q-PRISM and the ladder (06-27 to 07-30).
- **Step 12**, shadow cats in their own order (07-26 to 07-29), with the rotating lighthouse of 10-09.
- **Step 13**, RAINBOR, LIGHT, the star ports, the minute stones and the matrix (08-08 to 10-16).
- **Step 14**, the regeneration closers. Its README lists what ACER and the owner must still deliver, each
  with the test that proves it.

Each step's README names what was not found in any public repository; those items join step 14's list.

Held, never vendored (blob ids in each `HELD.hbp`): third-party binaries and the third-party paper,
release zips (pinned by sha256), anything under `tmp/docs/whatsapp-*`, and personal chat timelines
(the first `TASKS.md` and `ANTIGRAVITY-BRAIN-SESSIONS.md` were held for the owner's phone numbers and restored on his word that they are public). The keys committed in the public repository's
history (an ed25519 supervisor key, an SSH key, a Bearer token, the vault files) are not here; the owner
was told to rotate them.

Held from steps 9 to 13 for the owner to act on:
- Step 9 holds three files that carry a live token (a 36-character credential in a federation wave
  synthesis, and the date-shaped `usb_raw_io` token). Only their blob ids are recorded.
- Step 10 records a Redis bearer token that is still public on `bigpickle-rebuild` `main`. Its value is
  not copied here; rotating it belongs with step 0.
- The vote-quorum daemon (rule 7.j) is held by every step. Its blob `bcb542ed` is nonetheless already
  in aether at `ledger/hyperbehcs-daemons/vendor/acer-hyperbehcs-bin/`, from an earlier delivery. Whether
  it stays there is the owner's decision.

Step 15 (aether's own SHA-256 through shadowcat, the benched GNNs through the hookwall, the vault-reader
over every vendored repository) is recorded in `docs/audit/construction-gap-2026-10-18/README.md`.