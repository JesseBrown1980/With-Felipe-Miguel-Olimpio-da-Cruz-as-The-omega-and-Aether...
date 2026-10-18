# 06 — Verbs, tuples, the first cubes and the gates (2026-03-30 → 2026-04-11)

Build-order step 6 of the beginning. This is the fortnight the index language grows a body: a verb
vocabulary, a 14-field tuple, the Brown-Hilbert cube at 35, 37 and 47 dimensions, the engines that run
the cube, the BEHCS node language, the Falcon phone's BEHCS-256 codex, and the `ix/` gate pipeline that
every verb now passes through.

The verbs come first. `ix/grammar/verb-table.json` is dated 2026-03-30 and calls itself
"75 atomic capabilities — the civilization's muscle vocabulary"; `verb-factory.js` builds from it. By
2026-04-11 those verbs run behind the gates and the cube addresses them.

The cube is the spine of the step. `docs/THE_47D_CUBE.md` states the law in the owner's own words:
"The '47D' refers to 47 specific dimensions used to categorize everything in the system. Each dimension
is mathematically derived by taking a prime number and cubing it (p^3)." The 35D Liris catalog
(`tools/hilbert-omni-35D.json`, generatedAt 2026-04-09) states the growth law — "Each new prime cubed
creates a NEW dimension" — and the 47D catalog (`tools/hilbert-omni-47D.json`, 2026-04-10) adds D36-D47
and is cosigned `COSIGN_47D_001`. Acer's own earliest cube schema, the 37-dimension
"brown-hilbert-cube-v2" (created 2026-04-06), survives only under `tmp/` in the mirror, as
`tmp/liris-operator-package/hilbert-omni-35D.json`; it is vendored at that path.

BEHCS is named in `docs/BEHCS-OMNIDIRECTIONAL-MIRROR.md`: "BEHCS = Brown (Jesse) - Edens (Dan) -
Hilbert (Peter) - Chiqueto (Rayssa) - Smith (Felipe)". `tools/behcs-codex.js` builds the 14-field tuple
(D1 actor … D14 energy) and maps it to a Hilbert address under the BEHCS laws — LAW-001 "Every message is
a tuple", LAW-002 "Every tuple maps to Hilbert", LAW-000 "EVERYTHING IS CUBES".

`ix/gates/hookwall.js` is "Dan's 6 hooks as one fail-closed gate membrane": pre-tool guard, session
tracking, syntax check, risk scoring, approval tier and transcript backup, with the gnn, shannon and
sovereign gates beside it. `tools/shannon-consensus/` is the first Shannon consensus engine, which
`docs/OMNI_SHANNON_WAVES.md` describes as reaching consensus with "tons of local processor energy …
but zero cloud API tokens". `config/colony-memory/` and `ADR-0013` (implemented 2026-03-22) stop colony
memory "drifting because historical transcripts, document claims, agent outputs, and live runtime facts
were collapsing into the same layer". The `reports/cube-analysis/` tensor-collapse analysis of
2026-04-07 records the day the cube "produced a high-confidence verdict on a target whose direct attack
surface was blocked at every layer" — the owner's own `192.168.0.0/24` LAN, analysed from acer.

## What is held here

`vendor/Asolaria/` holds 75 files at their original paths. Source repo is `JesseBrown1980/Asolaria`,
read from a bare mirror of all 132 refs; every file is byte-identical (`git hash-object` equals the
recorded blob, verified). By group:

- **Verbs & tuples** — `ix/grammar/verb-table.json` (495eac71; its description reads "75 atomic capabilities", and its `verbs` list holds 73 entries) and
  `ix/grammar/verb-factory.js` (2774df04).
- **The `ix/` gate pipeline** — the whole `ix/` tree: `ix/exec.js`, `ix/index.js`,
  `ix/gates/{hookwall,gnn,shannon,sovereign}.js`, `ix/chains/{heartbeat,report}.js`,
  `ix/hooks/mqtt-hook.js`, `ix/nouns/{falcon,health,nerve,sovereignty}.js`,
  `ix/verbs/{dispatch,observe,sync}.js`. Its three runtime dependencies are brought in beside it:
  `src/connectors/hooksConnector.js` (bac98242, 2026-03-15), `src/graphRuntimeStore.js` (235be28f,
  2026-03-15) and `src/gnnConstructionWatcher.js` (85edb73b, 2026-03-16) — the latter two first appear
  in the step-4/5 window and are vendored here only because the gate pipeline imports them.
- **The cubes** — the 37D cube-v2 (`tmp/liris-operator-package/hilbert-omni-35D.json`, e5a94543), the
  35D Liris catalog (`tools/hilbert-omni-35D.json`, 43238a63), the 47D catalog
  (`tools/hilbert-omni-47D.json`, 6244eb11), the three `tmp/liris-47D-package/` files
  (expansion map, cross-pollination, divergence fix), the cube docs `docs/THE_47D_CUBE.md`,
  `docs/CUBE_VS_BLOCKCHAIN.md` and `specs/47d/README.md`, and the Brown-Hilbert canon
  (`BROWN-HILBERT.md`, `brown-hilbert/01-04` and `brown-hilbert/09-…47D-bilateral-cross-pollination.md`).
- **The 47D cube engines** — `tools/cube/hilbert-intersection-engine.js` (the "REAL 6^4 intersection
  cube", 1,296 points), `cube-full-cycle.js`, `cube-self-healer.js`, `cube-builder.js`,
  `cube-orchestrator.js`, `waves-of-waves-47D.js`, `run-deep-cascade-gated.js`, `agent-roster.json`, and
  the `routes/cube-fabric.js` route.
- **BEHCS v1** — `tools/behcs-codex.js` (the 14-field tuple), `tools/test-behcs-codex.js`, both
  `behcs-bus.js` (the top-level 1558b8fa and `tools/behcs/behcs-bus.js` d3f53e80),
  `tools/behcs/codex-bridge.js`, `docs/BEHCS-OMNIDIRECTIONAL-MIRROR.md`, and the BEHCS laws
  (`data/behcs/laws/BEHCS-LAW-000.md`, `-008.md`, `-011.md`, `-011.json`, `BEHCS-LAWS-INDEX.md`,
  `BEHCS-NODE-AETHER.md`).
- **The Falcon tarball** — `data/behcs/behcs-falcon-final.tar.gz` (9e170661, 210,723 B), vendored whole
  and byte-identical (see below).
- **Shannon origin** — `tools/shannon-consensus/{shannon-consensus.js,shannon-types.js,smoke-test-waves.ndjson}`
  and `docs/OMNI_SHANNON_WAVES.md`.
- **Colony memory** — `config/colony-memory/` (registry, schemas and examples),
  `tests/contracts/colony-memory-{store,contract}.test.js`, and
  `docs/adr/ADR-0013-colony-memory-registry-and-transport-epoch.md` (372c8a8c).
- **Tensor-collapse analysis (2026-04-07)** —
  `reports/cube-analysis/federation-self-tensor-collapse-2026-04-07.md` and
  `reports/cube-analysis/subnet-tensor-collapse-192-168-0-0-24.md`.

`PROVENANCE.md` has one row per file; `UPSTREAM.sha256` carries the full digest of each, in
`sha256sum -c` form, to be run from this directory (all 75 OK).

## The Falcon tarball

`data/behcs/behcs-falcon-final.tar.gz` is the original BEHCS-256 language codex from the Falcon phone.
It is 210,723 B compressed (under the 5 MB ceiling), so it is vendored whole and byte-identical rather
than unpacked; its blob round-trips (`git hash-object` of the vendored file equals 9e170661). It holds
186 members, unpacking to 3,559,315 B:

- `sovereignty/ix/codex/alphabet.json` — "Brown Hilbert hex-256 alphabet", spec IX-700, base 256,
  canonical width 8 (256^8 ≈ 1.8×10^19), 16 themed glyph blocks.
- `sovereignty/ix/codex/catalogs.json` — the "Brown Hilbert 47-catalog registry" (D1-D24 verbatim from
  the 24D, D25-D47 Falcon-proposed/cosigned), plus `launch.js`, `shadow.js`, `state-cube.generate.js`,
  `connectors.generate.js`, `generate-cubes-manifest.js`, `cubes-manifest.json`, `package.json` and the
  3 MB `connectors.json` (data).
- `sovereignty/ix/cubes/` — about 150 `*.cube.js` modules: the per-agent cubes, the `doctrine-*` cubes,
  the `falcon-sensor-*` / `falcon-pid-*` cubes, the `ix-gate/noun/verb/chain-*` cubes, the
  `paper-s01…s12` cubes, and the `mcp-*`, `network-*` and `translator-*` cubes.
- `sovereignty/ix/verbs/` — the 16 Falcon verbs: `antigravity.js`, `dispatch.js`, `firmware-read.js`,
  `firmware-write.js`, `inbox-read.js`, `laptop-type.js`, `mcp-linear.js`, `mcp-slack.js`,
  `me-neutralize.js`, `observe.js`, `omnispindle.js`, `phone-adb.js`, `shannon.js`, `swarmdesk.js`,
  `sync.js`, `web.js`.
- `Asolaria/hypercube.json` — the first 5-axis colony hypercube (axes A authority, L lane, H host,
  V liveness, R reach), with Jesse "outside the cube — unconstrained" and asolaria as the interior
  origin — plus `Asolaria/falcon-bridge.js` and the `asolaria/bin/` daemons.

The whole tarball was unpacked into an isolated directory and every member scanned for credentials,
tokens, private keys, phone numbers and webhook URLs before vendoring; none were found. `connectors.json`
(3 MB) and `cubes-manifest.json` hold no secret values.

## Date range

Beginning commits run 2026-03-15 (the two `src/` dependencies, carried forward from the build-day tree)
and 2026-03-16 (`gnnConstructionWatcher.js`), through the main body of the step at 2026-04-10 and
2026-04-11, to 2026-04-24 (`specs/47d/README.md`, the only file whose first commit falls just past the
fortnight). The content the files carry dates the work itself: verb-table generatedAt 2026-03-30, the
colony registry observedAt 2026-03-30, the 37D cube-v2 created 2026-04-06, the tensor-collapse analysis
2026-04-07, the 35D catalog 2026-04-09, the 47D catalog 2026-04-10.

## What is not public (held, not vendored)

One file, `gates/hookwall-v2.js` (blob 76e19530, 22,711 B), is a step-6 component — the v2 hookwall gate
— but it is **held, not vendored**, and only its blob id is recorded (`HELD.hbp`). Line 40 carries a live
Bearer token in an outbound request header (`Authorization: Bearer <uuid>`). This is the build-order's
named held blob 76e19530. Its code is the v2 hookwall; if the gate body is needed later it must be
re-vendored with the token redacted, and the token rotated first.

After the member scan of the Falcon tarball and a credential/PII scan over all 75 vendored files, no
vendored file in this step contains a private key, token, password, API key, or third-party private
data. The names that appear in the cube catalogs and in BEHCS (Jesse, Dan, Peter, Rayssa, Felipe, and
the agent/host nicknames) are the system's own actors, already public in the repository, and the only
network address present (`192.168.0.0/24`) is the owner's own RFC1918 LAN.

## Notes and what is referenced, not copied

- The Liris `gnn-patterns` zoo (04-05) is not copied here: it is already in aether via ACER
  (`model/gnn-zoo`, in progress) and is referenced only.
- `ix/grammar/brown-hilbert-opencode-pid.grammar.v1.json` (first commit 2026-04-25) and the later
  catalog versions — `tools/hilbert-omni-35D.json` 2989ab73 (04-30), `tools/hilbert-omni-47D.json`
  5315880b (04-30), and the 49D catalog family — fall outside the step-6 fortnight and belong to later
  steps; they are left to those steps.
- `packages/shannon-civ` (04-18) and the supervisor-registry / layered-PID census (04-18 onward) named
  in the same missed-list entries as this step's shannon-consensus and colony-memory belong to steps 7
  and later by date, and are not brought in here.
