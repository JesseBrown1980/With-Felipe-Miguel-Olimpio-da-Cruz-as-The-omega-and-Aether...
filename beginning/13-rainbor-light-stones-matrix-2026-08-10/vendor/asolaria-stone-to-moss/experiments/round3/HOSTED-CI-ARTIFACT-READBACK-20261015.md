# Round 3 hosted CI and independent artifact readback — 2026-10-15

**Coordinator status:** `EXECUTED_COMPUTATIONAL / FIVE_OF_FIVE_CI_PASS / INDEPENDENT_SEAT_REVIEW_PENDING`. Do NOT merge PR #70 or claim this is four independent agent/physical host seats.
Run: https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38733855818
Exact run-head when jobs were triggered: `7e393447a166629e229e88c1bdfeefdee1cd43ff`

## Job conclusions fetched from GitHub Actions
- frozen-digital-parity Windows Python3.11: `success`
- frozen-digital-parity Windows Python3.13: `success`
- frozen-digital-parity Ubuntu Python3.11: `success`
- frozen-digital-parity Ubuntu Python3.13: `success`
- rgb-qr-software-pilot Ubuntu Python3.11: `success`

## Actual raw artifact readback (downloaded from GitHub, compared outside GitHub CI)
- Windows artifact ID `11971349418`, zip `round3-full-windows-latest-py3.11`: Python and Node HBP each **2,715,718 bytes**, SHA256 `b4672f15a1003ef1714073eb0664942921f15b6ea8588a39701a42fc9485f8a9`, each byte-identical to the separately executed local reference.
- Ubuntu artifact ID `11971169592`, zip `round3-full-ubuntu-latest-py3.11`: Python and Node HBP each **2,715,718 bytes**, same SHA and byte-identical to Windows and local.
- Other matrix artifacts `11970549269` Windows3.13 and `11970374205` Ubuntu3.13 uploaded; all four jobs green, but these last two were **not separately downloaded in this readback**. Label distinction matters.
- QR artifact `11970669843`, zip `round3-rgb-qr-software-pilot`: `round3-memory-pilot-result.json` 612 bytes SHA256 `9568593a99494243da9afdf0646aecd94ef464e9ac6afeced932d8e719d4f422`, `round3-rgb-pilot.png` 2,196 bytes SHA256 `008a8b04aa72fd9d2f7e5686422653d1d76f0a2d97d6f960669131e4035e47fe`, byte-for-byte identical to local outputs.

## Mathematical/coding checks
- 81 synthetic site IDs; 27 waves × 4 digital illumination arms × 240 ticks × 2 independently coded models => **4,199,040 real executed integer site-state updates**.
- 7 snapshots per wave/arm/model => **1,512** full 81-site state snapshots, **122,472 site snapshots**, including all state populations in each site.
- All conserved integer mass = 1,000,000, nonnegative states, all-dark response null.
- Independent Python/Node bit-exact canonical HBP, SHA and re-reading verifier (all 1,512 lines, all 81 site states per line, recomputed synthetic current, deliberately altered byte detected).
- Separate software RGB QR: 65,536-byte deterministic *payload*, 32 logical 2,100-byte chunks => 11 **intended** colour frames. Only first 96 bytes actually encoded/read as 3 independently decoded standard QR in a single composite RGB image. Logical chunk/ordering, 2-of-3 new XOR shards and tamper SHA tests passed. **Full 11-frame visual roundtrip NOT tested.**
- Classical light-boat closure `T+A+R=1` checked for 27 one-hot synthetic outcomes, 9/9/9 trit sum 0, classical integer potential differences sum 0. This is NOT a transmitter, faster-than-light channel or a light-storing device.

## Known execution/custody boundaries
- Several local pilot failures retained in `LOCAL-PILOT-RESULTS-AND-CORRECTIONS-20261015.md` (descending packet sort, nonexistent Pillow API, unbounded OpenCV decoding for 128-byte pilot). Reduced **QR visual pilot only** to 32 bytes/channel; numerical test retains full sizes/counts.
- No physical optical bank memory read/write/retention; no camera photometric calibration, no measured channelrhodopsin kinetics or electrical current; no physical host independence attested; no human release consent signed; no Hugging Face remote upload/readback; no completed four-seat acceptance.
- Future: Seat2 independently review origin trust, QR erasure and full 11-frame readback; Seat3 mathematical and cost peer; Seat4 watcher tamper; Seat1 biological model assumptions and feedback. Older PR #50 old SHA must remain unchanged. Do not pool old #64/#62 despite different scales/rates.
