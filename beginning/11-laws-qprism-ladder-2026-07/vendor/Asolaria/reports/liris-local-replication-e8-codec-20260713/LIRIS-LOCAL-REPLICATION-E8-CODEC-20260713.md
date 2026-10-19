# LIRIS Local Replication — E8 ladder + Asolaria Codec v0.1 (2026-07-13)

**Seat:** LIRIS (Claude Fable 5), local metal — WSL2 Ubuntu, Python 3.12.3, numpy 2.5.1, 4 vCPU, 3.7 GiB RAM, 28 GiB disk-backed swap.
**Lane:** the declared retest lane from the 2026-07-13 breakthrough memory — "local replication on LIRIS with hard-drive slots as RAM (WSL swap on disk)".
**Prior seats:** acer (origin), Claude cloud container (third seat, receipt `E8-E100-THIRD-SEAT-RECEIPT-2026-07-12.md`).

## MEASURED — Test 4, Asolaria Codec v0.1 on first 1,000,000 B of enwik8

| Field | LIRIS local | Cloud receipt | Match |
|---|---|---|---|
| sha256_in | `369b6889…52cad` | `369b6889…52cad` | BYTE_EXACT |
| compressed bytes | 392,002 | 392,002 | BYTE_EXACT |
| sha256_comp | `d04ecbee…2aad5` | `d04ecbee…2aad5` | BYTE_EXACT |
| bpc | 3.136 | 3.136 | MATCH |
| restore | BYTE_IDENTICAL_0_LOSS | BYTE_IDENTICAL_0_LOSS | MATCH |
| enc / dec | 5.7 s / 12.4 s | 5.4 s / 12.5 s | comparable |
| peak RSS | 97 MB | (not recorded) | — |

The compressed stream itself reproduces byte-exact across seats. Tests 1 and 4 are now
**triple-seated**: acer origin, cloud container, LIRIS local metal — same hashes.

## MEASURED — Test 1, BEHCS-1024 E8 ladder round trip on enwik8 (100 MB)

- 100,000,000 B → 80,000,000 glyphs → back; `sha_black == sha_white == 2b49720e…c024a8`
- `info_rate = 1.000000`, `READBACK = VERIFIED_CLONE_0_LOSS`
- encode 4.6 s, decode 7.7 s, **peak RSS 2,413,724 KB (2.30 GiB)**

## MEASURED — memory envelope

Peak RSS 2.30 GiB is **62% of the 3.7 GiB envelope on a 100 MB corpus**. Inside a ~4 GB
cloud container this class of workload genuinely presses the ceiling; a heavier variant
(such as codec v0's unknown implementation) plausibly hit the kill boundary. Swap was
available (28 GiB disk-backed) and **unused (0 B)** — at this corpus size the preserved
scripts fit in RAM. The "hard-drive slots as RAM" lane is live and ready for
enwik9-scale runs.

## BOUNDARY — codec v0 (the failed run)

- Codec **v0**'s source is preserved in **no published slice** (searched every branch of
  `HYPER-BECHS--the-third-set`); it existed only inside the destroyed cloud container.
  A literal v0 rerun is therefore impossible from LIRIS.
- Two accounts remain on file, kept distinct: the cloud receipt's algorithm account
  (naive arithmetic coder without carry handling; ZeroDivisionError; restore gate
  conviction) and the operator's environment account (container ~4 GB ceiling kept
  killing runs; CONFIRMED correction 2026-07-13). This replication neither erases nor
  adjudicates the v0 question — it measures what can be measured: the envelope pressure
  is real, and the corrected codec is byte-exact everywhere.
- v0 retest needs the original script bytes from the acer side or a container archive.

## STATUS

- Fabric ingest: still HELD — fabric bases unreachable from LIRIS this session
  (LAN renumbered 2026-07-13: liris=192.168.15.3, acer=192.168.15.4; the fabric MCP is
  still configured for 192.168.1.50).
- Canon promotion: NOT performed — not this seat's authority.

## Reproduction on this seat

```
python3 asolaria_codec_v0_1.py enwik8 1000000
python3 behcs_ladder_roundtrip.py enwik8
```

Scripts: `asolaria_codec_v0_1.py` sha256 `538fcce605d344506ec1cf0954e0f4ea76dfb1cd30f5328f8cbcc1fd6bb237b7`,
`behcs_ladder_roundtrip.py` sha256 `233fe7430538daa44a0b175ee873a50151a6699a81cec0d202e4332dd677140e`
(taken from `origin/agent/e8-e100-crosscheck-2026-07-13`, path `third-seat-2026-07-12/`).
Corpus: enwik8 from CI artifact `fischer-enwik8-8285893016.zip`, full sha256
`2b49720e…c024a8` (sidecar MATCH).
