# Cube Container Local Replication — Verdict (LIRIS seat, 2026-07-13)

```yaml
receipt_id: LIRIS-CUBE-CONTAINER-LOCAL-REPLICATION-2026-07-13
recording_node: LIRIS
evidence_class: MEASURED_LIRIS_LOCAL_METAL
source_artifacts:
  - fischer-bidirectional-10-runner id 8286095865 sha256 369bf1d057a4a382ba883d63bdcebb695466c9c98a86beab72f585fa63ff11db
  - e8-e100-independent-crosscheck id 8286842242 sha256 f4f37143ca1d92c1cf0e03b3a5642d8fa40ba06c03e4038b1b261431f3e3fdf0
  - fischer-enwik8 id 8285893016 sha256 3bf82cb210989654228a2633583aa9dc6f7bb7a3edecf146f9ddc3823960c415
corpus:
  enwik8: 2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8 (VERIFIED)
  slice_150k: 3803c167dfeb4a91936ac52011be24639822204896b8d0a4658e0480f0f5dc1f (VERIFIED)
  slice_1m: 369b688978f649681136198fb96db14c1616756260c55fb4b65e9bc049552cad (VERIFIED)
environment: WSL2 Ubuntu, Python 3.12.3, numpy 2.5.1, zstandard 0.25.0, zstd CLI 1.5.5, 7z 23.01
memory_envelope: 3.7 GiB RAM + 16 GiB drive-backed swapfile (/swapfile-cube, fstab-persisted, added to RUNNING instance — mosquitto and asolaria-host8-room-host never interrupted)
scripts: byte-identical from quarantine, never modified (fischer codec sha pin 485e716bc6fc5173286aadf10ab22b3088f9f384c942e8a41df820b56d0aa632 VERIFIED)
```

## Results

| Run | Content | Verdict |
|---|---|---|
| R1 | BEHCS framed property, 276 cases to 8,138 B | PASS exact (`status=PASS`) |
| R2 | Fischer codec sha pin + property, 348 cases | PASS exact |
| R3 | 4 selftests (catalog/multilevel/quant8/prior) | PASS (exit 0 all) |
| R4 | BEHCS roundtrip slices 150k + 1m | PASS exact (sha_in==sha_out, match=1) |
| R5 | Cube A/B vantage verify | BLOCKED — cube-ab-vantage-comint-v1 inputs absent from artifact set |
| R6 | Catalog zstd holdout (7 train depths, holdout chunk 20) | MATCH byte-exact |
| R7 | quant8 head/tail law on FULL enwik8 | MATCH byte-exact (q4/q8v2 tuple shas identical) |
| R8 | Multilevel BPE 3 levels ×512 merges @1MB | MATCH byte-exact |
| R9 | Persistent order-2 prior curve, 20 reads | MATCH byte-exact (read-20 = 2.979336 bpc) |
| R10 | BEHCS roundtrip FULL enwik8 (100 MB) | PASS exact (sha in==out, match=1) |
| R11 | Fischer 10 expert audits @150k | SCIENCE-EXACT 10/10 — only CI wrapper metadata differs (github_*/runner_*/matrix_*/python/label absent locally); zero scientific fields differ |
| R12 | Fischer 4-config bench @150k tb=17 | MATCH 5/5 incl. zstd-pinned bytes; white_gain_vs_black_pct = 2.008389772913688 regenerated |
| R13 | Fischer 4-config bench @1M tb=18 | MATCH 5/5 incl. zstd-pinned bytes; white_gain_vs_black_pct = 2.9751488192466424 regenerated |

## Meaning

Every receipt-pinned number in the runnable cloud-container evidence base was REGENERATED on
local metal — not merely hash-re-verified. Combined with the acer origin lane and the cloud
container lane, the evidence is now fully trilateral. The zstd tier-2 bytes matching bit-exact
also pins the compression backend: local zstandard 0.25.0 reproduces the cloud container's
zstd-19 stream byte-for-byte.

The operator's account of mid-run cloud failures is consistent with what the environment
comparison shows: cloud container ≈ 4 GB ceiling; local default WSL was 3.7 GiB + 1 GiB swap
(nearly identical envelope) until the drive-backed swap raised it to ~20+ GiB virtual. R10
(the ~1.3 GiB-peak run that class of container kept dying on) completed cleanly here.

## Open items
- R5 needs `cube-ab-vantage-comint-v1/ASOLARIA-CUBE-A.json` + `ASOLARIA-CUBE-B.json` (+ sidecars) restored binary-safe from the verified artifact, then re-run.
- enwik9-scale replication deferred: no receipt in this artifact set pins enwik9 values for these scripts; the receipt's enwik9 test used the chunked `behcs_ladder_roundtrip.py` (present in `scripts/`).
- Swap cleanup when batteries are fully done: `swapoff /swapfile-cube && rm /swapfile-cube` (and the parallel lane's `/swap-asolaria-retest`), plus fstab lines.
```text
STATUS: REPLICATION COMPLETE — 12 of 13 lanes PASS/MATCH, 1 BLOCKED on missing inputs, 0 FAILURES
```
