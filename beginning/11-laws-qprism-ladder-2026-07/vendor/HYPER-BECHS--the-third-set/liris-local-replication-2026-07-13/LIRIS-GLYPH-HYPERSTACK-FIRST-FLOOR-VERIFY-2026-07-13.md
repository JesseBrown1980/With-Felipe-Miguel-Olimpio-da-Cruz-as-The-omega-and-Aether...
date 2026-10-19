# LIRIS Attack-Verify Receipt — glyph-hyperstack first floor v1

```yaml
receipt_id: LIRIS-GLYPH-HYPERSTACK-FIRST-FLOOR-VERIFY-2026-07-13
recording_node: LIRIS
verified_ref: agent/glyph-hyperstack-first-floor-2026-07-13 @ cd33c4fdb7a52d70c3aee01d82cdf97d44ce97a2 (PR #28)
evidence_class: MEASURED_LIRIS_LOCAL_METAL
verdict: PASS_CROSS_HOST_DETERMINISTIC
canon_promotion: false
```

## LIRIS-measured file pins (blob-exact from origin)

```text
512eec7a460a0221dc176c99306b2750b49139bbfa49f849a32bb0d2d929509c  glyph_hyperstack_first_floor_v1.py
2b8b2410cae4d92de0d8b2007b09dc8bb128ac3c549c54f207199c25b768284c  test_glyph_hyperstack_first_floor_v1.py
57b97a3189fa803d574a4b37548b6de398a33d00b5db2c8449f384b33b721290  canonical-l3-27.hbp
bf7172b1d7287c2c9a187d0dd14974538fa7fd860b568fcf63b9ada030e6a51b  acer-old-cube-result-20260713/FIRST-FLOOR-RESULT.hbp
596116f25372bb51bf959161e1100d056396c2070845169e22bd1b0c71bbec23  acer-old-cube-result-20260713/FIRST-FLOOR-RESULT.hbi
```

## Results on LIRIS metal (WSL2 Ubuntu, Python 3.12.3)

- Unit contract: **9/9 OK** — including all four LIRIS pre-review strengthenings, verified
  present in the shipped bytes: prime-PID lineage (`EXPECTED_PRIMES30`, per-vantage PID
  derived from `WATCHER|{prime}|{role}`), registry pin via `canonical-l3-27.hbp` loaded
  in-test, gain independently recomputed (`recomputed_net = gross - catalog`, asserted equal
  to reported), and `result_sha256` recomputed from canonical JSON. Plus ACER's own additions:
  HBP/HBI-default (JSON debug-only) and the five-byte-aligned ACCEPT/HOLD corpus control.
- 27-cube selftest verdict (LIRIS):

```text
FIRSTFLOORVERDICT|cubes=27|passes=810|accepted=780|held=30|languages=27|restore=1|source_manifest_format=SELFTEST|legacy_json_intake=0|formation_27p4=HELD_UNDEFINED_AXES|result_sha256=931ddb78dcfade4e7d09453553edf9b4e69f054d04f77e1a774c270c5b778c3d|status=PASS|json=0
```

## Cross-host determinism: PROVEN

GitHub Actions CI (run 29284292820, independent Linux runner) produced the byte-identical
verdict line, including `result_sha256=931ddb78dcfade4e7d09453553edf9b4e69f054d04f77e1a774c270c5b778c3d`.
Two independent hosts, one canonical digest. The pre-review's recommendation #3 is demonstrated
working. Remaining optional third leg: an ACER-metal post-refactor selftest digest
(ACER's pre-refactor `b8de175b…` predates the corpus/HBP changes and is not comparable).

## Boundaries upheld

`formation_27p4=HELD_UNDEFINED_AXES` preserved; no live absorption; no compression-record
claim; the 27 are measured L3 seats, not levels; scorers are labeled
MEASURED_DETERMINISTIC_SCORERS_NOT_LEARNED_GNN per the spec. LIRIS promotes nothing.
