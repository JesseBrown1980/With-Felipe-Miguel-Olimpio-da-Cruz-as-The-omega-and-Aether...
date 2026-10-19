# LIRIS Cube Container Local Replication Receipt - 2026-07-13

```yaml
receipt_id: LIRIS-CUBE-CONTAINER-LOCAL-REPLICATION-2026-07-13
recording_node: LIRIS
project: HYPER-BECHS third set / Cube containers
language_policy: English
status: REPLICATION_COMPLETE
evidence_class: MEASURED_LIRIS_LOCAL_METAL
canon_promotion: false
fabric_ingest: false
```

## Claim

The runnable evidence base from the Claude cloud container runs (GitHub Actions artifacts
8286095865, 8286842242, 8285893016 of repo `JesseBrown1980/HYPER-BECHS--the-third-set`) was
regenerated on LIRIS local metal, receipt-gated per field.

## Result

```text
R1-R4   PASS exact   (properties 276+348 cases, codec sha pin 485e716b..., slice roundtrips)
R5      BLOCKED      (cube-ab-vantage-comint-v1 inputs absent from artifact set)
R6-R9   MATCH        (catalog holdout, quant8 law on full enwik8, multilevel BPE, prior curve)
R10     PASS exact   (full-enwik8 BEHCS roundtrip, sha in==out 2b49720e...)
R11     SCIENCE-EXACT 10/10 (only CI wrapper metadata absent locally; zero scientific diffs)
R12-R13 MATCH 5/5 each, incl. zstd-pinned bytes (white_gain 2.008389772913688% / 2.9751488192466424% regenerated bit-exact)
FAILURES: 0
```

Full verdict + logs: `C:\tmp\cube-local-replication-20260713\REPLICATION-VERDICT-2026-07-13.md`

## Environment boundary

Cloud container ceiling ~4 GB; LIRIS default WSL envelope was 3.7 GiB + 1 GiB swap (nearly
identical). Replication ran with a 16 GiB drive-backed swapfile added to the RUNNING Ubuntu
instance (mosquitto and asolaria-host8-room-host never interrupted). This is consistent with
the operator's account that cloud mid-run failures were memory-ceiling casualties.

## Boundary

This receipt records LIRIS-local regeneration of container-pinned values. It does not promote
Canon, does not ingest into fabric, and does not assert anything about seats or runs LIRIS did
not execute. Trilateral standing (acer origin + cloud container + LIRIS metal) applies to the
values listed above only.
