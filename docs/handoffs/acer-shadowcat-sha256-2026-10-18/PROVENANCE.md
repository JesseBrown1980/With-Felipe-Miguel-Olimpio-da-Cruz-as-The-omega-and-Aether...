# Provenance: shadowcat

The owner's shadowcat SHA-256, delivered from ACER (seat ACER-CLAUDE-FABLE5) on 2026-10-18 as
`shadowcat-sha256-2026-10-18.zip` (sha256 `2d882c6fd2aedf6abc0cd744930284a7cb386401b3a77d636a56fd8591cf86ff`,
two entries dated 2026-07-27 07:16:02), source folder `D:\asolaria-absorb\shadowcat\`, with the run record
`VERIFY-2026-07-26.txt`. The three files are stored here unchanged.

Owner, 2026-10-18: "The Shadow Cat is already in the Aether program that we made. ... It's the process we were
using to run the QR codes."

| File | Bytes | SHA-256 |
|---|---|---|
| `src/sha256.rs` | 4,900 | `6a6a9c83860b383fa7110c6f438c797c968dccd20007d2572b65c65db60c4fe9` |
| `src/bin/verify.rs` | 6,792 | `20f6a8d7831867d3ff1ac8fae64786ee1f5463fec2c1f21033d16d6dfead6a59` |
| `VERIFY-2026-07-26.txt` | 975 | `468ad7f9bf88a7c2e0a3b964cda04bd9ee2cb1256f9fffa50d0477ceb46be0ea` |

The program these come from is listed in the universe simulator
(`JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills@3f9f42d`,
`books/SHADOWCAT-TEST-RESULTS.md`): source `/root/_horizon/shadowcat/` with `Cargo.toml`, `src/sha256.rs`,
`src/main.rs` and `src/bin/verify.rs`, rustc 1.81.0, no dependencies. ACER sent `sha256.rs` and `verify.rs`;
`main.rs` and `Cargo.toml` were not in the delivery. The layout here is that program's, which is also what
`verify.rs`'s `#[path = "../sha256.rs"]` needs.

`sha256.rs` is integer-only (`u32` words, FIPS 180-4). `verify.rs` checks it against the NIST vectors and then
checks a Kerr black-hole shadow in `f64`; it is kept as written. Neither file is part of a workspace crate, and no
float gate covers this folder. Licence: the owner's grant, "Everything is from me, so everything is free and public
to use."

## Measured here (`cloud/CLOUD-ROWS.hbp`)

- `rustc +1.81.0 --edition 2021 -C opt-level=3 src/bin/verify.rs` prints 21 lines, byte-identical to
  `VERIFY-2026-07-26.txt`.
- `cloud/shadowcat_sum.rs` hashes files with `src/sha256.rs` unchanged. Its digest of `src/sha256.rs` is
  `6a6a9c83…`, the same as coreutils.
- `cloud/qr_roundtrip.sh` carries 9 payloads through `qr/colour-qr` (generate, then ungenerate with the default
  integer reader) and checks each with shadowcat: the 4 laws codexes (3,200 B each), the 4 keys of 3,174 B, and the
  whole `ASOLARIA-CONSTELLATION.gguf` (145,120 B, 24 codes, 954,119 B of PNG). All 9 come back byte-exact, and
  shadowcat's digest equals coreutils' on every output. `colour-qr`'s own reassembly check uses the `sha2` crate.

## Next

Owner decision, 2026-10-18: shadowcat's `sha256.rs` is the one SHA-256 that aether's own code reuses. The SHA-256
code written for aether (`gguf/verify/src/sha256.rs`, `hbp/vault-reader/src/sha.rs`,
`pump/glyphs-herself/tests/common/mod.rs`, `qr/qr-read-int/tests/corpus/sha256.rs`,
`ternary/tests/common/sha256.rs`) switches to `src/sha256.rs` once the digests are shown identical on every
fixture and GGUF. The owner's other vendored SHA-256 code stays byte-identical where it is.

Done 2026-10-19. Parity was shown over 23,486 inputs with 0 mismatches
(`shadowcat/parity/SHA256-PARITY-2026-10-19.hbp`), and the switch followed. `shadowcat/Cargo.toml` makes `src/sha256.rs` the
crate's library, and seven aether-written copies are now adapters over it (`shadowcat/parity/README.md`).
