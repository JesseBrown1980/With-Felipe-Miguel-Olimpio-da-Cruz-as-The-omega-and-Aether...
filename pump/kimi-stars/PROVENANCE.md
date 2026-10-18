# Provenance: asolaria-pump-kimi-stars

## Upstream

| Short name | Repository | Commit |
|---|---|---|
| USIM | `JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills` | `3f9f42dab6247c40b30921b253e3f73c9e942ca5` |

Read from the local clone `scratchpad/codec/src/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills`
(HEAD `3f9f42d`, clean).

## Vendored files

Each file was written with `git show 3f9f42d:<path>`; `git hash-object` of the vendored file
equals the upstream blob id below. `UPSTREAM.sha256` pins the full SHA-256 of every file and CI
runs `sha256sum -c UPSTREAM.sha256`.

| Vendored path | Upstream path @ `3f9f42d` | Git blob | Bytes | SHA-256 |
|---|---|---|---:|---|
| `vendor/universe-simulator/measurements/divide_kimi_k3.py` | `measurements/divide_kimi_k3.py` | `9262dbf4d4dc8fb29ae95b3a552112c6f215b5fa` | 11001 | `33209dfb113fd4cfbebfe59be461da565e601ef2dbfac693003f27830212cbec` |
| `vendor/universe-simulator/measurements/stars_shells.py` | `measurements/stars_shells.py` | `1ac35b5432e275bc8b94fa279f1d69abaf065233` | 11185 | `1b2aec3dc0065a7f00ae2a77ef2e4147e5de3b6c2da3a6b7f2b23148fd4eaa6c` |
| `vendor/universe-simulator/key/KIMI-K3-STAR.txt` | `key/KIMI-K3-STAR.txt` (same bytes as `measurements/KIMI-K3-STAR.txt`) | `f0cce3657748e17902a9302366537a5e139779bd` | 3110 | `b9a2b2b11cd54b2f61d1731d8420677738651571f050736da897353af2fb3ef8` |
| `vendor/universe-simulator/key/MYTHOS-SELF-EMISSION.txt` | `key/MYTHOS-SELF-EMISSION.txt` (same bytes as `gguf/stars/MYTHOS-SELF-EMISSION.txt`) | `1f7aebccfcea548d128039afb3ca254d38d8d0b4` | 3796 | `d6e2153402a32eb9c4d2210e4513a906a1506b8f8e7a2d9a501cd83bcb9073ff` |
| `vendor/universe-simulator/receipts/FABLE5-KIMI-K3-STAR.hbp` | `receipts/FABLE5-KIMI-K3-STAR.hbp` | `f8bded93497f4914891f1cc2ef755d0ae6168a91` | 1062 | `b48e43acfbba4e2d5fea5337811a0f441463e93e4b1c1a5a8b21be0dbb4cf924` |
| `vendor/universe-simulator/receipts/FABLE5-KIMI-K3-STAR.hbp.sha256` | `receipts/FABLE5-KIMI-K3-STAR.hbp.sha256` | `b7b06f38aecbde02da5913abc741b50c8ec07148` | 90 | `07324f494b55ffdb99770617ba0a21c11b1d838783fdad81c62e4f3d4ce0aa40` |
| `vendor/universe-simulator/receipts/FABLE5-STARS-SHELLS.hbp` | `receipts/FABLE5-STARS-SHELLS.hbp` | `93fc36fba4be88a1ff0fe8bd9e149e17b486f31a` | 766 | `6ab331657d7b41599c50e17cca10f5be24f93682336335d0f660e6648f07bf2c` |
| `vendor/universe-simulator/receipts/FABLE5-STARS-SHELLS.hbp.sha256` | `receipts/FABLE5-STARS-SHELLS.hbp.sha256` | `cfc1774885e8b9dd6fb82ed8357460bc21a4a79e` | 90 | `7ff1e06e0297c9444c436d697e68678c535ac52dfbbee763fc80423af46bc13f` |
| `vendor/universe-simulator/receipts/FABLE5-DELETE-AND-REGENERATE.hbp` | `receipts/FABLE5-DELETE-AND-REGENERATE.hbp` | `0dcc447c6244e43179d8d15a4c3f707132992d50` | 1217 | `2c5ab07b7c25f722d22d3231a1b421e8e3b4888ef4258f8c792a49606161c848` |
| `vendor/universe-simulator/receipts/FABLE5-DELETE-AND-REGENERATE.hbp.sha256` | `receipts/FABLE5-DELETE-AND-REGENERATE.hbp.sha256` | `5613cd399e63b556a7e267403836175f5c74e64b` | 99 | `73aba93e6da3a2f3daa9f017f7df79eb5313873a7e32b3a5807dba414e5c8839` |
| `vendor/universe-simulator/gguf/stars/KIMI-K3-STAR-256.gguf` (Git LFS pointer) | `gguf/stars/KIMI-K3-STAR-256.gguf` | `2dfafa430e5ddec4e0472798fd5f8be35229df5f` | 134 | `47a6c938eba9a07f01880db15b27663fa0aea9fb3edb2be30917cd2d75602313` |
| `vendor/universe-simulator/gguf/stars/KIMI-K3-STAR-256.gguf.sha256` | `gguf/stars/KIMI-K3-STAR-256.gguf.sha256` | `e7193272f2bf1c1094cd8096022bfa0f2092ec6e` | 88 | `be55895f344e002e732560c5a99ea2c50a7057612c5501695907fc54c831ed1f` |
| `vendor/universe-simulator/gguf/stars/ASOLARIA-STARS-SHELLS.gguf.sha256` | `gguf/stars/ASOLARIA-STARS-SHELLS.gguf.sha256` | `5ad688642b8b9b7135c3516f75a7c0ab241ebb9a` | 93 | `3f86608136e7bb080066d993ad8c976eb1c40ce82600518ec41f3727d36010da` |

The KIMI GGUF itself (202,115,456 B) is not vendored: upstream stores it with Git LFS, and the
vendored pointer carries its `oid sha256:56d08746…3a18` and `size 202115456`, which the tests and
CI compare against. The STARS-SHELLS GGUF (4,596,880 B) is already in this repository at
`gguf/universe-simulator/gguf/stars/ASOLARIA-STARS-SHELLS.gguf`; a test compares against it when
present.

## Privacy scan

All 13 files were read in full before copying and searched for e-mail addresses, phone numbers
and private (LAN) addresses: none found (the only URL is the Git LFS spec URL in the pointer file). Names in them: the owner's own handles
(`OP-JESSE`, seat `ACER-CLAUDE-FABLE5`, pid `8467a937cba309f7`); companies and products
(Moonshot AI, Kimi K3, Anthropic Claude Fable 5, OpenAI GPT 5.6 Sol); and, in
`KIMI-K3-STAR.txt` line 7, the publicly named founder of Moonshot AI in a description of the
company's public release. No private person's data, chat, key or credential is in these files.

## Code reused from this repository (path dependencies, not copied)

| Crate | Used for |
|---|---|
| `colour` (`asolaria-colour` 0.1.0, `../../colour`) | `binary64::B64` (binary64 in integers), `verdict::{ownership, colour, colour_row, being_row, BEINGS}` (`divide_kimi_k3.py:67-118,229-233`), `stars::{regenerate, shell_of}` (all of `stars_shells.py`), `gguf::{kv, tensor_info, header_prefix, pad_to_align, binary32_bits, read_layout}` |

## Crates.io dependencies

`blake2` 0.10.6 (`default-features = false`), for `hashlib.blake2b(..., digest_size=8)`;
`sha2` 0.10.9 (`default-features = false`). `Cargo.lock` (v3) pins the shared transitive
versions to the ones `colour/Cargo.lock` uses (cfg-if 1.0.4, typenum 1.20.0, libc 0.2.186,
digest 0.10.7, block-buffer 0.10.4, crypto-common 0.1.7, generic-array 0.14.7, cpufeatures
0.2.17, version_check 0.9.5); `blake2` adds `subtle` 2.6.1. All build with Rust 1.81.0.
