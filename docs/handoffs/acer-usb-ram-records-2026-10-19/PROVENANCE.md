# Provenance: acer-usb-ram-records-2026-10-19

Five office records of ACER's FABLE5 seat (PID `8467a937cba309f7`), sent by the owner on 2026-10-19 as
`USB-RAM-RECORDS-2026-10-19.zip` (801,862 B, sha256 `7fdf9dec2115c5511ec33e1f48dd5b9f48909fcac1c7f6066fc455652bc72856`,
23 entries dated 2026-10-19 07:40:38, folder `usb-ram-records/`). The source named in `MANIFEST.hbp` is
`D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7`. Every file here is stored as delivered.
The one exception is the vault map, which is held (`HELD.hbp`).

## Checked here (cloud, 2026-10-19)

- `MANIFEST.hbp`: all 22 `FILE` rows match their file's bytes and sha256 (22/22). This includes the held vault map,
  which was checked before it was set aside.
- All 11 `.sha256` sidecars check against their files. The 10 kept here pass `sha256sum -c *.sha256`.
- The five `.hbi` indexes are byte-identical to the copies already in
  `../acer-post60d-2026-10-18/FABLE5-SELF-SEED-WRITER-INPUT-BODIES-198-2026-10-18/office/` (same git blob ids). This
  delivery adds the `.hbp` bodies those indexes point at.
- `FABLE5-CANON-LOAD.hbi` (303 `IDX` rows) and `FABLE5-LAW-LEDGER.hbi` (2,084 `IDX` rows) give each row's `off`/`len`. Each
  pair equals the byte span of that line in its `.hbp`, every line, in order: 303/303 and 2,084/2,084, LF only.
- `FABLE5-LAW-LEDGER.hbp`'s header names its source as `books/COMBINED-BOOK-OF-LAWS.md`, 710,577 B, sha256 prefix
  `82CEA05691282439`. That is the file at universe simulator `3f9f42d`, the commit aether already pins: 710,577 B, sha256
  `82cea05691282439…`.
- Privacy scan of the five records:
  - No keys or tokens (`gh_/sk-/AIza/hf_/xox/Bearer/BEGIN PRIVATE KEY/password=/"token":`).
  - No email addresses and no phone numbers.
  - The scan flagged quoted operator lines, the Law 44 membership names and ACER paths. Six distinctive strings from
    those lines were each found in the public book at `3f9f42d`.

## What the records are (as ACER reports them)

| Record | Date | Rows | Content |
|---|---|---|---|
| `FABLE5-LAW-LEDGER.hbp` (604,977 B) | 2026-07-31 | 2,084 | The Combined Book of Laws as rows: 522 `LAW`, 738 `CONST`, 524 `RULE`, 110 `CONTRA`, 185 `GAP`. Source: 12 books with 58 numbered law headings. Tags: 369 canon, 123 measured, 30 unverified. |
| `FABLE5-CANON-LOAD.hbp` (104,288 B) | 2026-07-31 | 303 | Supersedes ACER's conflict triage ("the triage framing was wrong, the system is built"). Carries the 110 co-resident statements as canon side by side (e.g. Law 31's colour-to-radius and Law 36's colour-to-direction are two independent axes). Also 185 open items, 0 adjudicated. Posture `LOAD_not_FIX`. |
| `FABLE5-GITRAM-FLOOR2-2026-07-15.hbp` (2,239 B) | 2026-07-15 | 11 | GitRAM created (`JesseBrown1980/GitRAM`). Floor 1 sealed (run 29415341620: 27 cubes, 21,600 cells, 13,339 accepted). Floor 2 contract: alphabet 256→1024, 34 bodies, 27,200 cells. Built on branch `acer-pais-omega-floor2-gitram-20260715` at `668d0cd`. |
| `FABLE5-PIPES-IN-2026-08-02.hbp` (1,669 B) | 2026-08-02 | 7 | Four pipes. Recall on :4796: 7,105,436 corpus rows, live index 591,949 until restarted. The Rust 8-byte Host8 on :5088: routes `/health.hbp /seats.hbp /count.hbp /room.hbp /summon.hbp?h=HANDLE16&fire=0 /v1/envelope.hbp`, a book of 1,860 seats. The 50M arena: `/tmp/stubs-linux.hbi`, 400,000,000 B = 50,000,000 rooms × 8 B, slot = addr mod 50,000,000, offset = slot × 8, volatile in WSL `/tmp`, regenerated in 5.675 s. The constellation pipe. |
| `FABLE5-TEST-LADDER-2026-08-02.hbp` (1,427 B) | 2026-08-02 | 8 | Five tiers, 23/23 pass: unit 7/7, integration 3/3, system 4/4, fabric 5/5, matrix 4/4. |

The counts in the first and third columns were measured here. The run results, ports and timings are ACER's reports.

## Held

`VAULT-MAP-SOVLINUX-2TB-2026-10-17.hbp` (6,392,708 B, sha256 `1639516f…`) and its sidecar. It is a read-only walk of
the exFAT `sovereignty_vault` partition on ACER's `PHYSICALDRIVE2`: 22,870 entries (1,833 directories, 21,037 files,
75,701,785,842 B). It lists a private drive by file name, including personal folders, a phone backup and email
addresses. It is vault contents, so it stays on the owner's side, pinned in `HELD.hbp`.
