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

Held, never vendored (blob ids in each `HELD.hbp`): third-party binaries and the third-party paper,
release zips (pinned by sha256), anything under `tmp/docs/whatsapp-*`, and personal chat timelines
(the first `TASKS.md` and `ANTIGRAVITY-BRAIN-SESSIONS.md` were held for the owner's phone numbers and restored on his word that they are public). The keys committed in the public repository's
history (an ed25519 supervisor key, an SSH key, a Bearer token, the vault files) are not here; the owner
was told to rotate them.

Next steps of the build order (5 to 13): the index language as data (2026-03-16 to 03-27), verbs, tuples,
the first cubes and gates (03-30 to 04-11), glyphs and the cosign origin (04-12 to 04-20), GAC and GULP
(04-24 to 04-30), the federation kernel genesis (05-11 to 05-22), June's quant and PID office pieces,
July's laws and Q-PRISM, the shadow-cat books, and RAINBOR and the matrix (08-08 to 10-16). Two gaps of
this wave go with them: 65 files of the `e8c3369` tree that step 4 pinned but did not vendor (among them
`src/secureVault.js` and `src/secretHardening.js`), and the healthcare `exceptions.py` and package
`__init__.py` files.
