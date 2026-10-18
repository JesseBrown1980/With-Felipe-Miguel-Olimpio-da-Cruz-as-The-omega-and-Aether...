# Provenance: asolaria-colour-qr

## Upstream repositories

| Short name | Repository | Commit |
|---|---|---|
| the-colour-qr | `JesseBrown1980/the-colour-qr` (public) | `1938a9b076b8fc3e81d0a271ca05e84a0e938854` |
| USIM | `JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills` (public) | `3f9f42dab6247c40b30921b253e3f73c9e942ca5` |

## Vendored files

Every file under `vendor/` was written with `git show <commit>:<path>`. `git hash-object` of each
equals the upstream blob id below, and `UPSTREAM.sha256` holds the full sha256 of each.

| Vendored path | Upstream @ commit | Git blob | Bytes | sha256 (16) |
|---|---|---|---|---|
| `vendor/the-colour-qr/.gitattributes` | the-colour-qr @ 1938a9b | `d5db2e49d342` | 206 | `f73a857afbdf7c10` |
| `vendor/the-colour-qr/.github/workflows/pages.yml` | the-colour-qr @ 1938a9b | `3fdda93b5316` | 6,895 | `ebc0dc40c560edf5` |
| `vendor/the-colour-qr/.github/workflows/pages.yml.sha256` | the-colour-qr @ 1938a9b | `bd35b3500053` | 76 | `bf2ea552a174d470` |
| `vendor/the-colour-qr/.nojekyll` | the-colour-qr @ 1938a9b | `e69de29bb2d1` | 0 | `e3b0c44298fc1c14` |
| `vendor/the-colour-qr/.nojekyll.sha256` | the-colour-qr @ 1938a9b | `3efcbea418cc` | 76 | `530889fd7549f94a` |
| `vendor/the-colour-qr/COLOUR-QR-RECEIPT-2026-08-06.hbp` | the-colour-qr @ 1938a9b | `fc058db61d6d` | 417 | `74ae33506b8bce0a` |
| `vendor/the-colour-qr/COLOUR-QR-RECEIPT-2026-08-06.hbp.sha256` | the-colour-qr @ 1938a9b | `1beeba54c801` | 99 | `18f9fc08cfd2e4d8` |
| `vendor/the-colour-qr/CREATE-THIS-REPO.md` | the-colour-qr @ 1938a9b | `0c37bc99b140` | 2,756 | `1f5dd745ed5f57b6` |
| `vendor/the-colour-qr/CREATE-THIS-REPO.md.sha256` | the-colour-qr @ 1938a9b | `d8f97cf20cce` | 86 | `0bed0dfb29d64a69` |
| `vendor/the-colour-qr/HANDOFF-TO-LOCAL-CLAUDE.md` | the-colour-qr @ 1938a9b | `8f268533f5c4` | 5,984 | `9568e827ef0f3036` |
| `vendor/the-colour-qr/HANDOFF-TO-LOCAL-CLAUDE.md.sha256` | the-colour-qr @ 1938a9b | `c5aa1dcd47d2` | 93 | `d0fa42d10e7cc924` |
| `vendor/the-colour-qr/README.md` | the-colour-qr @ 1938a9b | `dec43dd370de` | 4,209 | `70c79289b67ffaa3` |
| `vendor/the-colour-qr/README.md.sha256` | the-colour-qr @ 1938a9b | `658624a7163d` | 76 | `4701f7aa2a545031` |
| `vendor/the-colour-qr/index.html` | the-colour-qr @ 1938a9b | `8e25c7ebdbe3` | 272,097 | `7b9a0830aa01efe7` |
| `vendor/the-colour-qr/index.html.sha256` | the-colour-qr @ 1938a9b | `2f8a27f22d7a` | 77 | `c0a78c2904dc9721` |
| `vendor/universe-simulator/key/ASOLARIA-CONSTELLATION-KEY-3174.bin` | USIM @ 3f9f42d `key/` | `a81331b8b961` | 3,174 | `cce4f1e8ae407f10` |
| `vendor/universe-simulator/key/ASOLARIA-CONSTELLATION-KEY-3174.bin.sha256` | USIM @ 3f9f42d `key/` | `f613d060fcb6` | 102 | `10e2bf80ec521add` |
| `vendor/universe-simulator/key/ASOLARIA-HERSELF-KEY-3174.bin` | USIM @ 3f9f42d `key/` | `84c0725fe5b2` | 3,174 | `925c818d4c84aa23` |
| `vendor/universe-simulator/key/ASOLARIA-HERSELF-KEY-3174.bin.sha256` | USIM @ 3f9f42d `key/` | `f2bc1fa82caf` | 96 | `7a5d28c16997c26d` |
| `vendor/universe-simulator/key/ASOLARIA-KERNEL-3174.bin` | USIM @ 3f9f42d `key/` | `c96eb49346c9` | 3,174 | `f075f5c64d656ae3` |
| `vendor/universe-simulator/key/ASOLARIA-KERNEL-3174.bin.sha256` | USIM @ 3f9f42d `key/` | `af44f8ec388a` | 91 | `7048720b33a6a6ba` |
| `vendor/universe-simulator/key/prior3174.bin` | USIM @ 3f9f42d `key/` | `837babb14845` | 3,174 | `1be91cb748b2b364` |
| `vendor/universe-simulator/key/prior3174.bin.sha256` | USIM @ 3f9f42d `key/` | `5b993af675ca` | 80 | `5f9ba664a87b610d` |

This is every file the-colour-qr has at 1938a9b (15 files). Its `.gitattributes` comes along,
so the vendored text files keep the LF bytes their sidecars name. The USIM `key/` files have no
attributes file beside them; the crate's own `.gitattributes` (not vendored) carries lines 9,
11, 15 and 18 of USIM @ 3f9f42d `.gitattributes`, so `*.bin` stays binary and `*.sha256` and
`*.hbp` stay LF on a `core.autocrlf=true` checkout. The nested
`.github/workflows/pages.yml` does not run in this repository, because GitHub runs workflows
only from the root `.github/workflows/`.

`index.html` (index.html:125-10226) inlines a webpack UMD build of jsQR. The file names no
jsQR version and carries no licence header. jsQR's own repository (`cozmo/jsQR`) is licensed
Apache-2.0. The crate's default QR read, `qr/qr-read-int`, is an integer port of that build,
with its tables generated from these lines of the vendored page (`qr/qr-read-int/PROVENANCE.md`).

## Payload fixtures that are not repository files

| Fixture | Bytes | sha256 (16) | Public source |
|---|---|---|---|
| `tests/fixtures/payloads/asolaria-corpus_txt_qr.bin` | 3,200 | `2b4ba9df637796ee` | tensor `asolaria-corpus_txt_qr` of USIM `gguf/ASOLARIA-CONSTELLATION.gguf`, file offset 118,624 |
| `tests/fixtures/payloads/code-corpus_txt_qr.bin` | 3,200 | `c20c783922639c53` | tensor `code-corpus_txt_qr`, offset 132,320 |
| `tests/fixtures/payloads/fotoC_bin_qr.bin` | 3,200 | `d5e3d34b7e47c97b` | tensor `fotoC_bin_qr`, offset 135,520 |
| `tests/fixtures/payloads/wiki_qr.bin` | 3,200 | `3e2570928edf8648` | tensor `wiki_qr`, offset 141,920 |

These four files are `D:/asolaria-absorb/laws/{asolaria-corpus.txt,code-corpus.txt,fotoC.bin,wiki}.qr`
on the ACER seat. The USIM program `project_gguf.py` copies each input file unchanged into one
GGML I8 tensor. USIM `constellation/project_gguf.py:53` globs `laws/*.qr`, and lines 163-170
build one tensor per file. Line 11 says "Tensors are GGML type 24 (I8), so the bytes survive
unchanged." The public bytes are therefore those tensors.

The GGUF itself is in this repository at `gguf/universe-simulator/gguf/ASOLARIA-CONSTELLATION.gguf`
(145,120 B, sha256 `3d7b3bdfb9e8…`, git blob `d57c404ff441`, equal to USIM @ 3f9f42d). The test
`laws_codexes_are_the_constellation_gguf_tensors` compares every fixture with the GGUF bytes at
its recorded offset. That includes `prior3174.bin`, which is tensor `prior3174_bin` at 138,720.

The task's `prior3174_bin.bin` and USIM `key/prior3174.bin` are the same 3,174 bytes
(sha256 `1be91cb748b2…`), so they are one fixture.

## Generated here (this crate's own output, not upstream)

`tests/fixtures/png/*.png` (8 files, 29,094–29,428 B each) are written by
`colour-qr generate` from the payloads above. Their sizes and sha256 are in
`tests/fixtures/FIXTURES.hbp`. The test `generate_writes_the_fixture_pngs_byte_for_byte`
regenerates them byte for byte.

## Privacy scan before vendoring

Every vendored file was searched for email addresses, IPv4 addresses and phone-number patterns.
There were no hits; the only numeric matches were dates.

- The-colour-qr names the owner (pages.yml:3 "Jesse Daniel Brown"), his GitHub account, his
  machines ("acer") and his public repositories.
- The 4 USIM `key/*.bin` files are the owner's public files of 3,174 B each. They contain no email address.
  `prior3174.bin` is the enwik8 slice `[90,000,000, 90,003,174)`, which is Wikipedia text
  (USIM `key/KEY-3174.hbp`).
- The laws codexes are binary data: 256 distinct byte values each, order-0 entropy `h_x10000`
  79322–79528 (bits per byte times 10^4, `examples/order0_entropy.rs`).

No private mirror files were used.
