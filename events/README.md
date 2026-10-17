# asolaria-events

Integer-only Rust port of the Asolaria graph-event producer. It turns an actor/target/policy/context
edge (`buildGraphEvent`) into an HBP EVENT row:

```
EVENT|actor=<id>|actor_type=<type>|target=<id>|target_type=<type>|risk=<score>|status=<status>
```

parsed downstream by `l0_edge::event` (`model/l0-edge/src/event.rs`). Empty fields are omitted; values
are percent-escaped exactly as that parser decodes them.

- `risk` — port of `edgeRiskEngine.js:scoreEdgeRisk` / `mapScoreToLevel`.
- `node`, `flat`, `text` — the `graphRuntimeStore.js` normalizers (`normalizeNodeRef`,
  `normalizePolicy`, the string branch of `normalizeFlatObject`, `clipText`, `cleanText`) that feed
  the row and the score, with JavaScript's UTF-16 and `Object.entries` rules (see `PROVENANCE.md`).
- `event` — `buildGraphEvent`, rendered as the EVENT row, and `buildActionManifest` with its score.
  Manifests have no EVENT row: `gnnDataExport.js:12` reads only `graph-runtime-events.ndjson`, and
  manifests go to `graph-runtime-manifests.ndjson` (`graphRuntimeStore.js:8,206`).

Upstream bytes are pinned under `vendor/legacy/` (`UPSTREAM.sha256`); see `PROVENANCE.md` for what is
and is not brought in, the boundary producers, and measured parity.

## Lanes

Hot lane (per request): Rust only, integers and HBP text. No Node, V8, JSON, HTTP or Python. The
NDJSON store from `graphRuntimeStore.js` is not ported — the Rust producer writes the HBP row.

Cold lane (CI only): `tools/events_referee.py`, a stdlib-only mirror of the upstream JS, writes the
expected EVENT rows (`tests/fixtures/expected-events.hbp`) and a test-only MANIFEST parity record per
manifest (`tests/fixtures/expected-manifests.hbp`), and `--check`s them.

## Build and verify

```bash
cargo +1.81.0 fmt --check
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
python3 -I tools/events_referee.py --check
sha256sum -c UPSTREAM.sha256
```
