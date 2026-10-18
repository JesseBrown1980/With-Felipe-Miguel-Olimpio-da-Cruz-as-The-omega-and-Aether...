# Provenance: shadowcat

## Delivery

ACER sent `D:/asolaria-absorb/shadowcat` on 2026-10-18 as
`FABLE5-SHADOWCAT-ACER-10-FILES-NOT-IN-AETHER-2026-10-18.zip` (sha256
`785e42d782780ddb3b8e7af79400da14d698a0562a937ae0152e73bb9cfc8b9a`). The folder is flat and holds 10
files. The zip also carries `CUBE.hbp` (pid `8467a937cba309f7`, `files=10`, merkle
`3c2ba202bb11c68c8f328f2274eb93c28eb1002f126f29dd70e259194c122b37`) and `SHA256SUMS`.
`sha256sum -c SHA256SUMS` passed 10/10 here, and every byte count and sha256 below equals the
`FILE` rows of `CUBE.hbp`.

## Owner files

Every file is stored unchanged. `git hash-object --no-filters` of each equals the git blob below,
and `UPSTREAM.sha256` holds the full sha256 of each.

| Path here | Delivered as | Git blob | Bytes | sha256 (16) |
|---|---|---|---|---|
| `src/main.rs` | `shadowcat/main.rs` | `552ec3fef325` | 24,374 | `c3105169b65cdea4` |
| `src/sha256.rs` | `shadowcat/sha256.rs` | `c03dd42edfc2` | 4,900 | `6a6a9c83860b383f` |
| `src/bin/callingchain.rs` | `shadowcat/callingchain.rs` | `bf9577cbb3a1` | 16,604 | `50be643c09977a35` |
| `src/bin/threegap.rs` | `shadowcat/threegap.rs` | `e6c2d55b7e8a` | 5,831 | `4c5526b3e8ad1593` |
| `src/bin/verify.rs` | `shadowcat/verify.rs` | `b3541fb48166` | 6,792 | `20f6a8d7831867d3` |
| `records/LAW-34-BROWN-SCHRODINGER.md` | `shadowcat/LAW-34-BROWN-SCHRODINGER.md` | `7f697fdd69f9` | 11,886 | `c513c9c5c13dfbe5` |
| `records/RUN-2026-07-26.txt` | `shadowcat/RUN-2026-07-26.txt` | `8d01353562c5` | 6,740 | `8f1fed06c9174802` |
| `records/SHADOWCAT-TEST-RESULTS.md` | `shadowcat/SHADOWCAT-TEST-RESULTS.md` | `dd8698916c08` | 17,105 | `2ae5dab4c9d68692` |
| `records/THREEGAP-2026-07-26.txt` | `shadowcat/THREEGAP-2026-07-26.txt` | `b079d11dadc6` | 1,769 | `5ba8ef3493798997` |
| `records/VERIFY-2026-07-26.txt` | `shadowcat/VERIFY-2026-07-26.txt` | `ebd9613b39f4` | 975 | `468ad7f9bf88a7c2` |

Three of these were already in aether from an earlier ACER delivery
(`shadowcat-sha256-2026-10-18.zip`, sha256 `2d882c6fd2ae…`): `sha256.rs`, `verify.rs` and
`VERIFY-2026-07-26.txt` are in `docs/handoffs/acer-shadowcat-sha256-2026-10-18/` with the same blob
ids. That folder is left as it is. In aether HEAD `d203721` (`git ls-tree -r HEAD`, and every object
in the repository) those three blob ids are the only matches for the 10 files, LF or CRLF.

### Layout

`SHADOWCAT-TEST-RESULTS.md:14` names the program's source: "`/root/_horizon/shadowcat/` — `Cargo.toml`,
`src/sha256.rs`, `src/main.rs`, `src/bin/verify.rs`". The files fit that layout without changes:

- `main.rs:38` is `mod sha256;`, so it is `src/main.rs` beside `src/sha256.rs`.
- `verify.rs:22-23` and `callingchain.rs:39-40` are `#[path = "../sha256.rs"] mod sha256;`, so both are
  in `src/bin/`.
- `threegap.rs` has its own `fn main` and uses no module. USIM `books/CHAIN-TOPOLOGY.md:437` calls it
  "Program `threegap`", as `:435` calls "Program `callingchain`", so it is `src/bin/threegap.rs`,
  binary `threegap`.

The record's source list (`:14`) has no `callingchain.rs` or `threegap.rs`. Those two start by
answering SHADOWCAT (`callingchain.rs:17-25`, `threegap.rs:8-18`), so they were written after it.

The run records are in `records/`, apart from the source, as the owner kept them:
`SHADOWCAT-TEST-RESULTS.md:357-360` lists the hbp, the hbi, `RUN-2026-07-26.txt` and
`VERIFY-2026-07-26.txt` under `/root/_horizon/ARCHIVE/shadowcat/`, not under the source folder.
`LAW-34-BROWN-SCHRODINGER.md` and `SHADOWCAT-TEST-RESULTS.md` go with them.

`Cargo.toml` was not delivered. The one here is written for this crate: package `shadowcat`, no
dependencies, edition 2021 (the files compile unchanged with it), the named lint allows and the
dev-profile opt-level explained in `README.md`.

## Public copies

USIM is `JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills`
@ `3f9f42dab6247c40b30921b253e3f73c9e942ca5`, the commit `qr/colour-qr` pins. Blob ids are from
`git ls-tree -r HEAD` there.

| USIM path | Git blob | Bytes | Against the record here |
|---|---|---|---|
| `books/lineage/SHADOWCAT-17105.md` | `dd8698916c08` | 17,105 | identical to `records/SHADOWCAT-TEST-RESULTS.md` |
| `books/SHADOWCAT-TEST-RESULTS.md` | `1c0dbaf1e1d1` | 17,496 | same text with CRLF line endings |
| `books/lineage/LAW-34-11886.md` | `7f697fdd69f9` | 11,886 | identical to `records/LAW-34-BROWN-SCHRODINGER.md` |
| `books/LAW-34-BROWN-SCHRODINGER.md` | `6185502a520c` | 12,130 | same text with CRLF line endings |

The two CRLF blobs end every line with CR LF: 391 of 391 lines (17,496 − 17,105 = 391) and 244 of
244 lines (12,130 − 11,886 = 244). Removing the CRs gives the delivered bytes exactly, so the text
did not change. USIM `.gitattributes` says `*.md text eol=lf`, but these two blobs were committed
with CRLF. `git hash-object` with filters on a USIM checkout normalizes them back to LF and prints
the LF blob id, so the ids here use `--no-filters` or `ls-tree`. USIM `receipts/FABLE5-LAW-BOOKS.hbp`
lines 23 and 27 record the two LF copies with the sha256 in `UPSTREAM.sha256`, and lines 34 and 38
record the CRLF copies. Law 34 is also named in `books/COMBINED-BOOK-OF-LAWS.md`,
`books/COMBINED-BOOK-OF-LAWS-622823.md` and the two lineage versions, and in
`crates/asolaria-tribit/src/tribit.rs:53` ("Law 34's build directive"). Laws 62, 63 and 68 use the
name Brown-Schrödinger without the number. Only `books/LAW-34-BROWN-SCHRODINGER.md` and
`books/lineage/LAW-34-11886.md` carry its text, under "# LAW 34 — THE BROWN–SCHRÖDINGER LAW".

USIM has no copy of `RUN-2026-07-26.txt`, `THREEGAP-2026-07-26.txt`, `VERIFY-2026-07-26.txt` or any of
the five `.rs` files. Its `books/CHAIN-TOPOLOGY.md` (blob `1cb6c1c3b57c`; LF copy
`books/lineage/CHAIN-TOPOLOGY-44009.md`) reports the same runs in prose: `:431` says they used
"Rust 1.81, release profile", `:435` gives callingchain's hbp SHA-256, and `:437-446` gives the
threegap table that `THREEGAP-2026-07-26.txt` prints. USIM `constellation/pump_wave.py:67` and
`measurements/pump_wave.py:67` read `D:/asolaria-absorb/shadowcat/LAW-34-BROWN-SCHRODINGER.md`, the
ACER folder this delivery came from.

None of the 10 files, as LF or CRLF blobs, is in any other clone under `/home/user`. Every object of
the 31 other repositories there was searched. Files that only mention "LAW 34" or "SHADOWCAT" by name were
found, but none is a copy.

## Privacy scan

There were no email addresses, IPv4 addresses or phone-number patterns in the 10 files. The records
name the owner and give the assistant and session that ran them. They also give paths on the run
host (`/root/_horizon/...`, `/root/compressor-run/...`). All of this is kept as delivered.

## License

The owner's grant: "Everything is from me, so everything is free and public to use." This crate:
`MIT OR Apache-2.0`.
