# Provenance: asolaria-colour

This crate brings the owner's rainbow and gradiated colour formulas into the aether stack. This
file records where every vendored byte came from, which lane each piece runs in, and what is
pinned without being copied.

## Upstream repositories

| Short name | Repository | Commit |
|---|---|---|
| universe simulator | `JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills` | `3f9f42dab6247c40b30921b253e3f73c9e942ca5` |
| stone-to-moss | `JesseBrown1980/asolaria-stone-to-moss` | `f032bc062a15cfbc0ccdd22ffb8f1c0fd3caf7fc` |
| FOLLOW | `JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS` | `8712368c851abe347ddf97a25bfbd96275d4316c` |

## Lanes

| Lane | What runs there | Here |
|---|---|---|
| Hot (per request, in process) | Rust 1.81 only, integers only: the ports and the binary64 emulation. No Python, numpy, Node, JSON or HTTP. | `src/` |
| Vendored Rust | The owner's `rainbow27-check` crate, built and run unchanged. | `vendor/rainbow27-check/` |
| Cold (verification, CI only) | Stdlib Python referee (`referee/colour_referee.py`), and numpy for the cold-lane generator runs and parity (`tools/cold_lane.py`). | `referee/`, `tools/` |

The vendored Python files are never imported by Rust. The referee loads the standard-library ones
(`omni_hotel.py`, `double_rainbow_to_gguf.py`, `rainbow27_v2.py`, `rainbow7_bank.py`) and calls
them; `tools/cold_lane.py` runs the numpy ones unmodified (`stars_shells.py`, `divide_kimi_k3.py`,
`pump_glyphs_mythos.py`) and executes the flashlight function lines of `pump_glyphs_mythos.py:74-104`
and `asolaria_herself.py:56-83` verbatim. Both scripts set `sys.dont_write_bytecode` so loading a
vendored module leaves `vendor/` byte-identical.

## Vendored files

Every file under `vendor/` is byte-identical to its upstream: it was written with
`git show <commit>:<path>`, `git hash-object <file>` equals the blob id below and
`git rev-parse <commit>:<path>` (36 of 36), and CI runs `sha256sum -c UPSTREAM.sha256` (the
same sha256 digests).

| Vendored path (under `vendor/`) | Upstream @ commit | Upstream path | Git blob | sha256 |
|---|---|---|---|---|
| `follow/codes/double_rainbow_to_gguf.py` | FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS @ `8712368` | `codes/double_rainbow_to_gguf.py` | `d9942c14d26d075761686e1e302bc596266e235b` | `2ac2289f228ef88ff58e49d137da34d79714cb787e3f406152eb161657687270` |
| `follow/colors/DOUBLE-RAINBOW-COLOR-SLICES.hbp` | FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS @ `8712368` | `colors/DOUBLE-RAINBOW-COLOR-SLICES.hbp` | `9a81e06620fc5b2fbdb702df344bc5df9822cbb1` | `085fc3ecf804fb3f47bd0152bb21b8550ec0f67277aec5444336b4eea2cde709` |
| `follow/colors/DOUBLE-RAINBOW-COLOR-SLICES.hbp.sha256` | FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS @ `8712368` | `colors/DOUBLE-RAINBOW-COLOR-SLICES.hbp.sha256` | `e0cedae936a56ae346f79722b57038de33909c5e` | `0d7c89d4e964321d874c56b824daf837248669bad918276ed15c4394a64e0b41` |
| `follow/colors/DOUBLE-RAINBOW-OIL-3174.gguf` | FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS @ `8712368` | `colors/DOUBLE-RAINBOW-OIL-3174.gguf` | `bb146181ab54fd69464522709447434fd404895e` | `1b7f4097aef8ddbe603beb7cdf8f07c304147cefc99cb7d03ced925a550ea4ed` |
| `follow/colors/DOUBLE-RAINBOW-OIL-3174.gguf.sha256` | FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS @ `8712368` | `colors/DOUBLE-RAINBOW-OIL-3174.gguf.sha256` | `adf17f6f3d4d734e7ac0d99183227fce2a78da9f` | `97f8791424bf367a8c2928bbd4808d15d693db21008d92c271977c776b79bef9` |
| `rainbow27-check/Cargo.lock` | asolaria-stone-to-moss @ `f032bc0` | `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/Cargo.lock` | `09dabcccd7372fa16e8b78fe1198dd0cd157b171` | `e6b1f0f3b38ba39ee6e16d25e432301af685e8d614150fdc3128ac3e4bc9a8f3` |
| `rainbow27-check/Cargo.lock.sha256` | asolaria-stone-to-moss @ `f032bc0` | `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/Cargo.lock.sha256` | `288f155c9c82607e95b91456329ba95c793392df` | `ec17474ee9ff4ddd3f353832b47fb511e8c2525abe447cbebff3511f9a9b19b7` |
| `rainbow27-check/Cargo.toml` | asolaria-stone-to-moss @ `f032bc0` | `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/Cargo.toml` | `22f4551f58e08872f93367e95859a8045548f52a` | `b2cffc271cb02bbb42901527479936515f9e90efc318a0bf9e6bfc46a9b4739f` |
| `rainbow27-check/Cargo.toml.sha256` | asolaria-stone-to-moss @ `f032bc0` | `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/Cargo.toml.sha256` | `a57f2f5e9e0006442779168d6f62cd5f03167325` | `dbbc92f96bb5842962914cc31c02193eebe386a870476b5cd254a7ad02e30042` |
| `rainbow27-check/EXPECTED-OUTPUT.hbp` | asolaria-stone-to-moss @ `f032bc0` | `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/EXPECTED-OUTPUT.hbp` | `8b8999239f17ea7da12e628f43343ff6b48df40c` | `5596f5cd58f8ced1de8c89ea569f4b1eb852782cb6ca7e5b45b1e82dedbef0af` |
| `rainbow27-check/EXPECTED-OUTPUT.hbp.sha256` | asolaria-stone-to-moss @ `f032bc0` | `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/EXPECTED-OUTPUT.hbp.sha256` | `13b5604ae1132313ab9a8e0a39cbd72329bfa45a` | `cfb2ca724efa7d5564b786c2a5b86d74500f22cd23804e5ca77c527dee542f4f` |
| `rainbow27-check/rust-toolchain.toml` | asolaria-stone-to-moss @ `f032bc0` | `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/rust-toolchain.toml` | `17116ad8d716256044cfb1dff1d9c1afc76b4457` | `d4e80db263330f0849c5cdd876a7b86bacc863eaf33c017e66bdca78ce4cce73` |
| `rainbow27-check/rust-toolchain.toml.sha256` | asolaria-stone-to-moss @ `f032bc0` | `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/rust-toolchain.toml.sha256` | `bee39dac0eae9e0012a36b816d62226a0d369432` | `0c9cbc3b29a0f3383b2368f163608ab37a3e5b1c1552566639ff858df50d8c4d` |
| `rainbow27-check/src/main.rs` | asolaria-stone-to-moss @ `f032bc0` | `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/src/main.rs` | `2200401022ccc2cf8988b3c6238e0f1c26f54175` | `43fbc6712018e4bb0953474e28791076559f10f56c4df6d52cdedc0149f881b7` |
| `rainbow27-check/src/main.rs.sha256` | asolaria-stone-to-moss @ `f032bc0` | `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/src/main.rs.sha256` | `16c63387053ae14896c766ba885efe09c186b396` | `5a1e893f71290514be5080b9a2766b0a53efbdf0fd96cd4933cff876392a1014` |
| `stone-to-moss/experiments/seat1/rainbow7/rainbow7_bank.py` | asolaria-stone-to-moss @ `f032bc0` | `experiments/seat1/rainbow7/rainbow7_bank.py` | `7dfe91eddf70caa64b8e088c9a894d0bd66963a0` | `1ad4667df1f398ee4d2d5118ea06c0e5619cb4300755c9747e60fdbd5e8d1db8` |
| `stone-to-moss/experiments/seat3/rainbow27_v2/rainbow27_v2.py` | asolaria-stone-to-moss @ `f032bc0` | `experiments/seat3/rainbow27_v2/rainbow27_v2.py` | `097c2d93cc6cfeb6f03a2df75d9529b267dadc44` | `92e7ffa50a9258b86fc15891609a73e90b45e7c3632b2a2f465c2f31f72254d0` |
| `stone-to-moss/stones/2026-10-15-rainbow81/seat3-rainbow27-normalized-v2-20261015.hbp` | asolaria-stone-to-moss @ `f032bc0` | `stones/2026-10-15-rainbow81/seat3-rainbow27-normalized-v2-20261015.hbp` | `ec715f4262774a83fe1b8e717b1d94243e002707` | `56431c449b4e89f9dcca527ce44d239b6bc23e1f36fd3107c6ff722cb8489e2c` |
| `stone-to-moss/stones/2026-10-15-rainbow81/seat3-rainbow27-normalized-v2-20261015.hbp.sha256` | asolaria-stone-to-moss @ `f032bc0` | `stones/2026-10-15-rainbow81/seat3-rainbow27-normalized-v2-20261015.hbp.sha256` | `652b3006715f4273f677d618c259cd6416494a0d` | `ee25a0774441597588f7e75ef11c17b2b5a5caa731d091becb82549a18913da3` |
| `universe-simulator/constellation/read_key_gradiated.py` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `constellation/read_key_gradiated.py` | `55b5b5a11034c7a6f8972f366b9a7cf299845d3f` | `cd18a08db3805e9f28461ac2e5a99a4a06d40d6fb4d15bdc20f25029472f78cf` |
| `universe-simulator/engines/omni_hotel.py` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `engines/omni_hotel.py` | `0ec3ba2d6ce0e16bef0182e5a158d19e64bc1d40` | `4d39662e06f53316291b8530bd05666e034f7b01af55b79faec6eb962048070d` |
| `universe-simulator/gguf/stars/COLOUR-CODE.md` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `gguf/stars/COLOUR-CODE.md` | `433948ab46962b7494804cd695af689e09ec3363` | `6157964d2b87dc28476aeb8721f3fd27fae83ab42aa68eb940e04a63eb3a7bf2` |
| `universe-simulator/gguf/stars/MYTHOS-SELF-EMISSION.txt` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `gguf/stars/MYTHOS-SELF-EMISSION.txt` | `1f7aebccfcea548d128039afb3ca254d38d8d0b4` | `d6e2153402a32eb9c4d2210e4513a906a1506b8f8e7a2d9a501cd83bcb9073ff` |
| `universe-simulator/measurements/KIMI-K3-STAR.txt` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `measurements/KIMI-K3-STAR.txt` | `f0cce3657748e17902a9302366537a5e139779bd` | `b9a2b2b11cd54b2f61d1731d8420677738651571f050736da897353af2fb3ef8` |
| `universe-simulator/measurements/asolaria_herself.py` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `measurements/asolaria_herself.py` | `94c3d8b16a6e45adfcd86a95634839323169f780` | `01db3e7c008f147d8ae6dcb520721a6ee0f1be5f0d78e89a63a9906a8e73305b` |
| `universe-simulator/measurements/divide_kimi_k3.py` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `measurements/divide_kimi_k3.py` | `9262dbf4d4dc8fb29ae95b3a552112c6f215b5fa` | `33209dfb113fd4cfbebfe59be461da565e601ef2dbfac693003f27830212cbec` |
| `universe-simulator/measurements/pump_glyphs_mythos.py` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `measurements/pump_glyphs_mythos.py` | `a45ce32d2c03bac5125641b1f766bbb56c1a48aa` | `58c27385d2d4d29e13b0efac62e3bb9a670a852255a7c80fdbd44cfd0d0004a0` |
| `universe-simulator/measurements/stars_shells.py` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `measurements/stars_shells.py` | `1ac35b5432e275bc8b94fa279f1d69abaf065233` | `1b2aec3dc0065a7f00ae2a77ef2e4147e5de3b6c2da3a6b7f2b23148fd4eaa6c` |
| `universe-simulator/receipts/FABLE5-DELETE-AND-REGENERATE.hbp` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `receipts/FABLE5-DELETE-AND-REGENERATE.hbp` | `0dcc447c6244e43179d8d15a4c3f707132992d50` | `2c5ab07b7c25f722d22d3231a1b421e8e3b4888ef4258f8c792a49606161c848` |
| `universe-simulator/receipts/FABLE5-DELETE-AND-REGENERATE.hbp.sha256` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `receipts/FABLE5-DELETE-AND-REGENERATE.hbp.sha256` | `5613cd399e63b556a7e267403836175f5c74e64b` | `73aba93e6da3a2f3daa9f017f7df79eb5313873a7e32b3a5807dba414e5c8839` |
| `universe-simulator/receipts/FABLE5-KIMI-K3-STAR.hbp` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `receipts/FABLE5-KIMI-K3-STAR.hbp` | `f8bded93497f4914891f1cc2ef755d0ae6168a91` | `b48e43acfbba4e2d5fea5337811a0f441463e93e4b1c1a5a8b21be0dbb4cf924` |
| `universe-simulator/receipts/FABLE5-KIMI-K3-STAR.hbp.sha256` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `receipts/FABLE5-KIMI-K3-STAR.hbp.sha256` | `b7b06f38aecbde02da5913abc741b50c8ec07148` | `07324f494b55ffdb99770617ba0a21c11b1d838783fdad81c62e4f3d4ce0aa40` |
| `universe-simulator/receipts/FABLE5-PREREGISTER-COLOUR.hbp` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `receipts/FABLE5-PREREGISTER-COLOUR.hbp` | `f7b2be33a99e42905962dd3e124e1d3c4b189c95` | `b96404b5b8d4cb52a5348388aa633d435074846820e118495917c6b2675131e1` |
| `universe-simulator/receipts/FABLE5-PREREGISTER-COLOUR.hbp.sha256` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `receipts/FABLE5-PREREGISTER-COLOUR.hbp.sha256` | `065c6884cc882c190b6e5dca84af52901b512c51` | `5bf02f1a8942f0f1d84e8e75de6f74395085c8c783f5270d117d19cbb342384c` |
| `universe-simulator/receipts/FABLE5-STARS-SHELLS.hbp` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `receipts/FABLE5-STARS-SHELLS.hbp` | `93fc36fba4be88a1ff0fe8bd9e149e17b486f31a` | `6ab331657d7b41599c50e17cca10f5be24f93682336335d0f660e6648f07bf2c` |
| `universe-simulator/receipts/FABLE5-STARS-SHELLS.hbp.sha256` | ASOLARIA-UNIVERSE-SIMULATOR-… @ `3f9f42d` | `receipts/FABLE5-STARS-SHELLS.hbp.sha256` | `cfc1774885e8b9dd6fb82ed8357460bc21a4a79e` | `7ff1e06e0297c9444c436d697e68678c535ac52dfbbee763fc80423af46bc13f` |

The `rainbow27-check` sidecars (`*.sha256`) are upstream's own; `sha256sum -c` passes on them in
`vendor/rainbow27-check` and `vendor/rainbow27-check/src`.

## Privacy scan before copying

Every vendored file was scanned for e-mail addresses, phone numbers, private-range IP addresses,
keys and personal names before it was copied.

- `asolaria_herself.py` names the owner (`asolaria.operator`, `:195,305`); no other person.
- `KIMI-K3-STAR.txt` is a public model description; the one person it names is the founder of the
  company that published the model, a public figure, as published upstream.
- `double_rainbow_to_gguf.py` and `DOUBLE-RAINBOW-COLOR-SLICES.hbp` carry the URL and title of a
  public YouTube video (`:39-41`); no frames, audio or video bytes (the GGUF says
  `reconstructs_source_video=0`).
- The receipts carry seat ids and the owner's handle; the code files carry local `D:/` and `C:/`
  paths. No third-party personal data was found, so nothing was withheld.
- The private mirror `scratchpad/asolaria-mirror.git` was not used.

## Pinned, not vendored

| What | Where | sha256 | Why pinned |
|---|---|---|---|
| `ASOLARIA-STARS-SHELLS.gguf` (4,596,880 B) | universe simulator `gguf/stars/`; aether `gguf/universe-simulator/gguf/stars/` | `ae23392ad473718e2196e525a4355af20cdbd57bbb5dc3e85a8719b62552784d` | The Rust port regenerates it from the vendored 3,796-byte seed; tests compare the digest. |
| `KIMI-K3-STAR-256.gguf` (202,115,456 B) | universe simulator `gguf/stars/` (Git LFS) | `56d08746a77efd9ea30345ada15bab3fc2c36e09647d1e77156a96b9a4b83a18` | Regenerated by the vendored `divide_kimi_k3.py` in the cold lane, digest checked, deleted. |
| `ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf` (269,604,512 B) | `receipts/FABLE5-DELETE-AND-REGENERATE.hbp:5` | `f29d4b9427252b17cc6151cd5f5627d080b5a021f009e46125cef5479db0d299` | Regenerated by the vendored `pump_glyphs_mythos.py` in the cold lane, digest checked, 81 tensors compared with the Rust port, deleted. |
| `rainbow27-v2.hbp` trace (3,886,535 B) | stone `seat3-rainbow27-normalized-v2-20261015.hbp:5` | `8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672` | The Rust port and the referee regenerate it. |
| numpy 2.5.4 (`numpy/lib/_function_base_impl.py`) | `scratchpad/torchvenv` | n/a | `percentile` follows its `linear` method (`:133-136`), `_get_indexes` (`:4692-4724`), `_get_gamma` (`:4571-4592`) and `_lerp` (`:4595-4615`); `tools/cold_lane.py parity` checks the bits against that numpy. |
