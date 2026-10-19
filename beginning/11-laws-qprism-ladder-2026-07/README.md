# 11 — Laws, Q-PRISM and the ladder (2026-06-27 → 07-30)

Build-order step 11 of the beginning. In these five weeks the system moves its first hook off Node,
states its one compression law (every prism and comb operation is a bijection, so nothing goes below
entropy), builds Q-PRISM and the two shadow-recovery paths around that law, boots its own kernel on
metal with a device-and-time identity, has its claims re-run by a third seat, and ends July with the
3.1 KB key, the glyph tuple language and the public colour canopy. The construction window is
2026-06-27 to 07-30. The shadow-cat books of the same weeks are build-order step 12, not this one.

`vendor/` holds 410 files from 16 public repositories, read-only: `Asolaria` from a bare mirror of all
132 refs, the other 15 from bare clones without blobs. Every file is byte-identical to its upstream
blob: `git hash-object --no-filters` equals the recorded blob for 410 of 410, and
`sha256sum -c UPSTREAM.sha256` passes 410 of 410 (both run on the files as written here). 25 of the
410 are later versions of a vendored path, kept under `vendor/<repo>-variant-<commit7>/`.
`PROVENANCE.md` gives each file's source commit, blob, size, sha256 and the commit that first
introduced those bytes on any ref.

## hookwall-session-start (2026-06-23 → 06-27, `asolaria-federation-1024`)

`tools/hookwall-session-start/` is the Rust port of the `SessionStart` hook that had been
`session-start.mjs`: "an 8-byte host process controlling stubbed rooms. No node, no json, no http, no
resident service". The rule text `rules.txt` is compiled into the binary, and its stdout is
byte-identical to the Node hook's payload (receipt sha256 `9184f232…`). The rooms are known only by
8-byte HBI pointer and are never read. Vendored: `Cargo.toml`, `src/main.rs`, `rules.txt` and the
`.gitattributes` that keeps `rules.txt` byte-exact. The bytes were first committed on pull request #7
(`70217c0`, 2026-06-23 12:29; `main.rs` at `b1db168`, 13:01) and reached the branches as `13fc0c6` on
2026-06-27 21:57. The 2026-10-10 revisions of `main.rs` and `rules.txt` belong with hookwall-edge in
step 13 and are pinned, not vendored.

## The Prism/Comb 0-loss law (2026-07-01)

The law is written down on the evening of 07-01, in two repositories, and three more add notes.
`Algorithms-of-Asolaria` `canon/PRISM-COMB-0LOSS-LAW.md` (`8f73e7e`, 18:34) states it: every prism or
comb operation is a bijection, `H(f(X)) = H(X)`, so the algorithms "re-relate information with 0 loss
and never claim compression below entropy". Forward is the comb (collision avoidance), backward is the
prism (many→1 recombination). Its measured instance is the 256↔1024 rung: 5 bytes ↔ 4 BEHCS-1024
glyphs at `lcm(8,10) = 40` bits, round trip sha256-identical, Rust and Python symbol-identical.
`asolaria-federation-1024` `docs/PRISM-COMB-0LOSS.md` (`90b3576`, 18:38) restates it for the kernel:
the 1,024 glyph values are the comb teeth, and an 8-byte handle is an address into a store, "not
lossless infinite compression". The same evening the Shannon stage (`91b9556`), the fnns repository
(`689cea4`) and Q-PRISM (`b99e380`) added their satellite notes; those versions are vendored as
variants. The root README of the law (Asolaria `2531c819`) is already in aether.

## Q-PRISM (2026-07-01 → 07-11)

`Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control`, 55 files. It begins as the Liris
scaffold `a1b11d5` (07-01 15:20:13) and the Acer build `c38257e` (15:32:01, "calibrated spatial
Talbot-Lau sim + blinded 3-arm control-signal test"). Its question is narrow: can a neural or
organoid-derived stream, used as a high-dimensional control signal, beat random and classical
baselines on a simulated sodium-nanoparticle interferometer? It claims no effect of consciousness on
matter waves, and `docs/ethics-and-human-subjects.md` gates any human, organoid or implant work.

Vendored are the 07-01 build in full (the `src/*.mjs` simulator, policy and experiment, their tests,
`run_experiment.py`, the first versions of the `qprism/` Python package, the coupling sweeps
`results/coupling-sweep.json` and `coupling-sweep-calibrated.json`, with the null holding at coupling 0
(p = 0.91) in `de00aca`), the Stage-2 cube absorption, the Host-8 cube and graphify selector in Rust
(`host8/qprism_cube_host8.rs`, `qprism_graphify_selector.rs`), the docs of the day (among them the claims gate,
neural sources, Brain2Qwerty anchor, source triad, Talbot-Lau calibration, comb-prism duality map,
active-glyph lens, digital-physics lens), the 07-04 double-binary-black-hole design and its Rust
harness `host8/dbbh_coms_quant_prism.rs`, the 07-04 shadow-resolution capstone, the GPT-5.6 harness
binding of 07-09, the 07-10 Path 2 verification record, and the 07-11 trilateral doctrine. The later
README, capstone and claims gate are variants. The same-day final Python package
(`qprism/{__init__,behcs,cube_absorb,physics}.py`, `tests/test_cube_absorb.py`) and the
`harness`/`sources`/`neural_sources` modules, `alphabet-1024.json`, the LICENSE and the 07-04 claims
gate are already in aether under `eval/vendor/qprism-control/`.

## The shadow-resolution capstone: Path 1, Path 2 and the 3D slice harness (2026-07-04 → 07-17)

- **Path 1, `dbbh-coms-quant-prism`** (`e924601`, 07-04 11:23, "19/19"): a dependency-free Rust crate
  that fuses the IX-737 double-black-hole session capsule, the quant snap, prism re-relation and HBP
  rows. A lossy shadow crosses the wire as an address, and the bytes are recovered only from a
  retained store whose sha256 matches; otherwise it holds. Vendored: `src/lib.rs` (07-04 first
  version 55ccd2c8), the three test files, the capstone (07-04 `e21e1fcd` and 07-10 `d71b629d`), the
  papers note, the 07-11 verification doc, the Rust 1.97 workflow and the sealed verification receipt.
- **Path 2, `path2-two-shadow-recovery`** (`16855d7`, 07-04 13:01): recovery with no store. Two
  residues `x mod p1`, `x mod p2` are each ambiguous, and together they fix `x` when `p1·p2 ≥ R`; below
  that the crate returns `InsufficientJointCapacity`. The PIE world slice (`af42042`) and the Liris
  multi-cylinder slice (`4ae6a28`) extend it; `docs/DBBH-DBWH-MEASURED-PATH2-2026-07-11.md` and the 07-17
  quantum-cloning scope edits (`AGENTS.md` and the multi-cylinder doc variant, `6feeaf8`) are here too.
- **`qprism-3d-slice-harness`** (`31e7c84`, 07-04 13:12): the seven-step rung, in which a frozen
  slice is split into lossless representation lanes, projected into a 60D coordinate and prime-cylinder
  shadows, watched, and recombined through the Path 2 lanes. Also `adversarial_crt.rs` (`31bae71`) and
  the 07-11 watcher status doc.
- **Algorithms-of-Asolaria**: the crate-family index `SHADOW-RESOLUTION-CRATE-FAMILY-2026-07-04.md`
  (and its 07-17 variant), the Path 2/DBWH formulas and the trilateral claim tags of 07-11.

The 07-10/11 independent verification (Claude Fable 5 runs on Rust 1.97, 19/19 for Path 1 and 30/30
for Path 2, and GPT-5.6-directed GitHub Actions runs) is sealed in each crate's
`verification/INDEPENDENT-VERIFICATION-2026-07-11.hbp`.
The upstream HEAD `src/lib.rs` of all three crates, their LICENSEs, the rustfmt test versions and the
same-day Path 2 docs and tests are already in aether (`quants/`); the 07-04 first versions are what is
new here.

## The ASI OS and the kernel on metal (2026-07-02 → 07-11)

- **`asolaria-asi-os`** (`9d604cf`, 07-03 20:56): a pure-std Rust OS front-end (~400 lines, zero
  crates) serving a local UI on `127.0.0.1:4600`, with its install scripts, and the full-node installers
  and `FABRIC-NODE.md` of `8c410c2` (21:08). `scripts/keygen.sh` and `keygen.ps1` mint a 32-byte local key at install time
  into `~/.asolaria/`; they contain no key. The rustfmt fix of 07-04 (`2b32549`) is the `src/main.rs`
  variant.
- **`asolaria-federation-1024` `kernel/boot/`**: UEFI first light on 07-02 (`769b2a8`: `efi_main`,
  COM1 serial, GOP splash), the PCI hardware inventory `hwinv.rs` and a green Rust 1.81 harness on
  07-07 (`c595358`), and on 07-08 the device+time identity (`c5f3191`): `device_pid` from the 60D
  coordinate, a per-boot `boot_pid` (`bootproj.rs`), the CMOS RTC and TSC clock (`rtc.rs`) and the
  RST/VMD storage scaffold (`driver_rst_vmd.rs`). `main.rs` and `hwinv.rs` of 07-08 are variants; the
  07-07 intermediate `main.rs` is pinned. The DeviceIdentity/BootProjection contract and the ASI-OS
  build design (07-07), the ACER machine-profile manifest, and the Liris USB and 60D receipts and the
  trilateral advancement of 07-08 are vendored. The ACER boot-proof, device-PID, device-time and voxel
  receipts of the same days are already in aether under `kernel/lane/vendor/federation-1024/`.
- **HYPER-BECHS `system-interpretations-2026-07-08/`**: the ACER and RELIC readings of the Host8
  60D kernel advancement and RELIC's next-round USB verify receipt. USIM later collected the matrix of
  that advancement (`7ca9ce5`, 07-27, vendored) with its `.hbi` already in aether.

## Receipts of the month: LX chain origin, Omni Lab, trilateral doctrine (07-01 → 07-11)

- **Capability map (07-01, Asolaria `779b3b0`)**: `tools/graphify/ACER-CAPABILITY-MAP-2026-07-01.json`
  (44 MCP servers, 310 verbs, 87 nodes, 384 edges) and `HIGGSFIELD-CUBES-2026-07-01.json` (12 absorbed
  Higgsfield verbs, each with a PID and a 1024-glyph). They name the ACER MCP servers; the servers
  themselves are not public (see Not found).
- **LX chain origin (07-05)**: the Liris-seat receipt repository `LX-chain-ORIGINAL-tokens-savings-LIRIS-SEAT`
  (`29b5e81`, `6c94494`) with the original one-line routing sentence
  `@from [liris] machine [lx 1] time [1-24-2026] ask [ix-1] (acer) tool [eds18] skill [38] run program [1873]`,
  the measured LX census, the evidence pointers and the IX↔LX bridge; and the Asolaria
  `reports/chain-language-grid-origin-20260705/` addendum (`bf40a27`).
- **Liris kernel Omni Lab advance (07-09, `ead4778`)**: its `.hbi` and `.hbp` are vendored; the crank
  tick of the same commit is held (below).
- **Trilateral evidence doctrine (07-11)**: the federation `TRILATERAL-EVIDENCE-AND-FEDERATION-REALITY`
  note, the Q-PRISM and asi-os doctrine files and the Algorithms claim tags. The doctrine itself
  (`TRILATERAL-REALITY-EVIDENCE-DOCTRINE-2026-07-11.md`/`.hbp`) is already at aether's root.

## The third seat: E8/E9, omnievent, lenses and the glyph hyperstack (2026-07-12 → 07-13)

`HYPER-BECHS--the-third-set` carries 73 vendored files: 67 of these two days (11 of 07-12, 56 of 07-13)
and the six 07-08 system-interpretation receipts described above. The Claude Fable 5 third-seat receipt
`E8-E100-THIRD-SEAT-RECEIPT-2026-07-12.md` (`2729508`) tests the claim "any information externally
present can be quanted and unquanted" with no sub-entropy claim: enwik8 through the 5-byte/4-glyph
BEHCS-1024 lane and back, sha256 equal on both sides. With it come the `behcs_ladder_roundtrip.py`
harness, the GPT-5.6 Pro crosscheck (07-13 variant), the `crosscheck/` and `gpt-crosscheck/` scripts
and receipts, and the Cube A/B intake (`4d9e039`: the two cube JSONs, kept byte-for-byte, and their
spec and receipt). Then the 07-13 series: `omnievent47-2026-07-13/` and `omni-event-v1/` (the
Catalog47 + HyperBEHCS-60D event contract and its schema), `n-lens-v1/` (twenty prime-PID viewpoints
over the first 1,000,000 B of enwik8), `n-vantage-30-v1/` and `composed-paths-30-vantage-v1/` (the
composed Path 1/Path 2 benches), `glyph-hyperstack-first-floor-v1/` (`45c55ca`: a shadow-only,
reversible first floor over 27 L3 seats, with ACER's old-cube result, `FIRST-FLOOR-RESULT.hbi`
902,636 B, the largest file here), the eight workflows that run them in CI, and the Liris seat's
local replication verdict and receipts (`6152a4a`, `0bdf20e`).

Beside them, `Algorithms-of-Asolaria` holds the formula maps of each piece (combined-quant lattice and
measured addendum, N-lens, N-vantage, composed paths, omnievent47, glyph hyperstack), the E8/E9
receipts and the byte-exact tools `tools/behcs/behcs_ladder_roundtrip.py` and
`tools/codecs/asolaria_codec_v0_1.py`, and the Liris formula crossverify (`04964f6`, 12/12 checks).
The Asolaria mirror holds the Liris local replication of the E8 ladder and codec v0.1 (`33c42f0`).
The combined-quant atlas, registry and lattice `.hbp` are already in aether.

## Cubes in the cloud and the analysis of cubes (2026-07-16 → 07-17)

- **`asolaria-cube-cloud`**: `unified_omega.rs` (`2362aa3`), a dependency-free Rust trainer of three
  families (8 cube poles × 800, 12 sectors × 1200, 20 lenses × 2000 cells) cut from one reversible
  root, each body its own SHA-seeded 1024-glyph language, folded to one `omega_unified`; the nine-script
  cloud run receipt (run 29532610495, 9 of 9 PASS); the Hutter lane (pilot, tournament `mix`/`match`/`dir`
  variants, `hp_omega_expand.rs`) and, on 07-17, `sgram_mix.rs` and `omega_omnibit_ladder.rs`; and the
  four workflows. The nine Unicode sign-inventory corpora are pinned by blob; each one's sha256 is the
  `shared_root` the receipt prints for that script.
- **`analysis-of-cubes`** (07-16): the shared contracts, source authority (AARO case PR-038 and DVIDS
  asset `DOD_111689051`, with their status labels), the 8-pole, 12-sector and 24-direction family
  contracts, the interface layers, the ACER, Liris and RELIC seat files, and on 07-17 the Liris
  `omega-glyph-100view` lane (`5625803`): a Python-stdlib simulation of 100 reversible views with its
  synthetic output and receipt verifier, which says plainly that it is not a codec. The two ACER cube
  branches are pinned by branch head.

## Unified canon (2026-07-19) and the rime fixed-27 crate (2026-07-23)

- **Asolaria, 07-19**: `docs/canon/ASOLARIA-MASSIVE-UPDATE-2026-07-19.md` (`f9a246e`), the unified
  observer context, the root `AGENTS.md` (`cfab4d3`), the screenshot-extract receipt and its HBP. The
  canon's §4.3 sets the 3.1 KB contract: such an object "should therefore be described by its declared
  contract", whether compact, store-backed, distributed-shadow or mixed.
- **`rime/fixed27-wave-v2/`** (07-23, `91568f9`, `3a97eed`, `02bd37b`): a Rust 1.81 crate whose carrier
  is exactly the 27 ordered width-three trits over `-,.,+`, with the second cascade
  `6×6×6×6×6×12 = 93,312` routes. Vendored with its receipts, review, SHA list, the 27-byte runtime
  stores and photo, and the cloud task. The day's final state at `02bd37b` (`lib.rs`, `main.rs`, the review,
  the SHA list and the cloud task) is kept as variants; `tests/cli.rs`, new in `02bd37b`, is under
  `vendor/Asolaria/`.

## The key, the tuple language and the colour canopy (2026-07-25 → 07-30)

- **Key lineage (USIM)**: `books/RESULTS.md` (first version 2026-07-27 `4ea2ae3`, the same bytes as
  `books/lineage/RESULTS-5355.md`, and the 07-27 15:53 variant), `books/ASOLARIA-EXTRACTED-VALUES.md`
  (both versions) and `books/LAW-61-THE-KEY-AND-THE-ENERGY-BUDGET.md` (`5eb043a`, 07-28), whose table
  gives the key as 3,174 B, "dense, 0.00% zeros, irreducible". The key files themselves (`prior3174.bin` and the
  constellation, kernel and herself keys), `KEY-3174.hbp`, `PLAY.md`, `q_prisms.py` and
  `rime_prism_pipeline.py` are already in aether (`qr/colour-qr/vendor/universe-simulator/key/`,
  `pump/kernel-pump/`).
- **Glyph tuple language (07-28)**: `glyph_tuple_language.py` and its test, `LAW-38` and the
  PID-tuple glyph language doc (both with their 13:26 variants), and the WSL2 container V2 plan.
- **FOLLOW, 07-30**: the spherical public projection (`22c7596`: law V10, the `.md`, the renderer and
  its test, `PUBLIC-SPHERICAL-PROJECTION.hbp` 756,575 B and `.svg`) and the Rust 1.81 Q-PRISM colour
  leaves (`e7adf0f`: law V14, the crate README and `lib.rs` 827d041b, `PUBLIC-QPRISM-COLOR-LEAVES.hbp`
  and `.svg`, the Liris receipt; `d124100` 20:07: `src/folders.rs`). The projection `.py` and its test,
  the crate's `Cargo.toml`/`Cargo.lock`/toolchain, `main.rs`, `outward.rs`, the bins and the same-day
  later `lib.rs` 7493f8b5 are already in aether.

## The GNN repositories (2026-06-28 → 07-11)

`Shannon-and-the-gnns-stage` (`5f5ee86`, 06-28) is "the other side" of the trigger: every answer passes
through Hookwall, the GNN ensemble, Shannon/OmniShannon, the white rooms and GULP. Vendored: the
README, MAP (and its 07-01 Prism/Comb variant), `TRAINED-MODELS.md`, `llms.txt`, the origin record
dated 2026-07-11 (committed 07-10 22:33) and the `pipeline/` modules `shannon-boot`, `hookwall`, `asolaria-hookwall`, `gnn`,
`gnn-feeder`, `gnn-edge-mining` and `gnn-forward-genius`. `Asolaria-fnns-trained-and-reverse-gnns-many`
(`0b3d8a0`, 06-28) adds the ensemble README (and its 07-10 variant), the two seq47 manifests, the G4
plane `src/planes/glsm.mjs` and the healthcare-provenance record dated 2026-07-11; its other three plane files
and its first MAP are the same blobs as the Shannon files and are vendored once. The trained `.pt`
ensemble, the GSLGNN trainer and server, `asolaria-score.mjs` and the whiteroom index are already in
aether.

## Dates, counts, held, and notes

- **Files**: 410 vendored, 5,267,643 B. Largest 902,636 B; nothing near 50 MB.

  | repo | files | bytes |
  |---|---:|---:|
  | `HYPER-BECHS--the-third-set` | 73 | 1,999,915 |
  | `Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control` | 55 | 205,454 |
  | `Asolaria` | 53 | 194,857 |
  | `analysis-of-cubes` | 40 | 390,812 |
  | `asolaria-federation-1024` | 27 | 109,600 |
  | `Algorithms-of-Asolaria` | 27 | 165,229 |
  | `asolaria-asi-os` | 19 | 61,976 |
  | `asolaria-cube-cloud` | 17 | 185,401 |
  | `dbbh-coms-quant-prism` | 16 | 81,407 |
  | `path2-two-shadow-recovery` | 15 | 52,916 |
  | `ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills` | 14 | 110,598 |
  | `Shannon-and-the-gnns-stage` | 13 | 69,440 |
  | `FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS` | 13 | 1,539,687 |
  | `LX-chain-ORIGINAL-tokens-savings-LIRIS-SEAT` | 11 | 16,641 |
  | `qprism-3d-slice-harness` | 10 | 46,772 |
  | `Asolaria-fnns-trained-and-reverse-gnns-many` | 7 | 36,938 |

- **Date range (per-blob beginning)**: 2026-06-23 12:29:22 (hookwall-session-start on pull request #7,
  `70217c0`) → 2026-07-30 20:07:22 (`folders.rs`, `d124100`). Source commits run 2026-06-27 → 07-30.
  `beginning` was measured over every local ref plus every pull-request head the remotes list. Sixteen
  vendored blobs were first committed on a pull-request head minutes to days before their merge: the
  four hookwall files, and twelve `Algorithms-of-Asolaria` formula, addendum and claim-tag files
  (pull requests #7, #8 and #11–#15, 07-10 to 07-13). They are listed in `PROVENANCE.md`.
- **Pinned, not vendored** (each with blob, size and sha256 in `PROVENANCE.md`): 223 other versions of
  vendored paths (175 same-day revisions of a vendored file, the step 08 convention; 37 same-day
  revisions of upstream `.sha256` sidecars; 3 same-day revisions of files whose other version of the
  day is in aether; 5 intermediate in-window revisions of the kernel `main.rs` and the Q-PRISM README;
  2 same-day revisions before a vendored later version; and the empty first
  `results/sweep-calibrated.log`); 118 upstream `.sha256` sidecars, of which 87 hold the digest of a vendored file
  (steps 02–08 vendored no sidecar either); the nine cube-cloud corpora (600,000 B each); the two ACER
  cube branches of `analysis-of-cubes`; the 59 unvendored files of the Liris replication folder (54
  pinned by the vendored `SHA256SUMS`, 5 by commit); the 2026-10-10 hookwall versions; and the
  federation vote-quorum parity harness of 07-01 (`8f03107`), which step 11 does not name and which
  is the Rust side of the held Python vote_quorum daemon's parity, so the owner decides.
- **Same bytes in two repositories**: 7 blobs are vendored once, from the repository that committed
  them first (`.gitignore` 96ef6c0b in Path 1, Path 2 and the 3D harness; `asolaria_codec_v0_1.py`;
  the fnns MAP and three plane files).
- **Already in aether**: 66 candidate blobs, 16 further files (the key lineage, the HEAD `lib.rs` of
  the three crates, the slice-time harness, the later `hp_mix.rs`, the rainbow receipt, the vote-quorum
  `lib.rs`), 19 of the pinned versions, and four sets referenced by directory (the nine `.pt`, the
  cm3ti variants, the Omega codecs, the 60D kernel ports). Each is listed in `PROVENANCE.md` with its
  aether path; none is re-vendored. No vendored blob is in aether's tree at `d7280f1` (checked with
  `git ls-tree -r HEAD`, which includes the committed steps 01–08 and 04b).
- **Overlap with the parallel steps** (not yet committed, checked by blob on 2026-10-19): none with
  steps 09, 10 or 13. One file is also in step 12: FOLLOW's
  `knowledge/PUBLIC-LAW-V10-SELF-REFLECTION-PERFECT-PAST-IS.md` (`362300c3`, 10,873 B, `22c7596`).
  Step 11 carries it as the law of the 07-30 spherical projection; step 12 carries it as later
  shadow-cat canon and says so in its own README. One of the two copies should be dropped when both
  directories are committed.
- **Held** (`HELD.hbp`): one file in two versions, `reports/LIRIS-BACKEND-CRANK-TICK-20260709.hbp`
  (`12ed9d32`, 43,509 B, and its same-day reseal `63c2a5e2`, 43,915 B). Its row LIRISQPRISMWHATSAPP
  quotes a pasted WhatsApp exchange with a named third party and that person's reply: a personal chat,
  held under rule 7.n even though gap-map item maps[5].items[35] said it could be vendored. A content
  scan of all 410 vendored files found no key, token, password, email address or phone number. The
  long digit runs are Actions run and job ids, byte counts, timestamps and the generated integers of
  the FOLLOW projections. `whatsapp` occurs once, as an IX entry name. The one `"token":` is a
  capability field whose value is `"none"`. The IP addresses are loopback (`127.0.0.1`) and three
  private LAN addresses (`192.168.x`), and the user paths are the seats' own (`C:/Users/acer`, `C:/Users/rayss`), both allowed as in step 8.
  No rule 7.j code is here: `vote-quorum` appears only as a crate or service name; `reverse-gain` only
  as a lane, field, input or enum name, as the `reverseGain` import of `asolaria-score.mjs` (already in
  aether), or in prose (the fnns README says the 47D reverse-gain source is withheld); `MASK_GLYPHS`
  not at all.
- **Committing this directory**: two vendored files match their own repository's vendored `.gitignore`
  (`Q-PRISM…/results/sweep-calibrated.log` by `*.log`, and
  `analysis-of-cubes/liris-lane/omega-glyph-100view-20260717/synthetic-output/GLYPH-INPUT.bin` by
  `*.bin`), as they do upstream, where they are tracked anyway. Add the directory with
  `git add -f beginning/11-laws-qprism-ladder-2026-07`, or `git add` drops those two. The nine
  vendored `.gitattributes` were checked under aether's root `* -text`: `git hash-object` with filters
  equals the upstream blob for all 410 files, so they change no stored byte.

## Not found in any public repository (for step 14)

- The ACER MCP servers the capability map names (`asolaria-fabric/server.js` with the
  `archaeology_timeline` verb, `asolaria-os-on-metal/server.js`) and the fabric's 27-strata
  archaeology timeline (birth 2026-02-22): not in any of the 132 mirror refs, the beginning-src clones
  or aether. They live on ACER (`C:/Users/acer/mcp-servers/`).
- The programs behind RESULTS-5355's "3.1KB held at EVERY level" (horizon recursion, tri-radial
  cascade): no path with `horizon`, `tri-radial` or `cascade` in its name in USIM's 244 commits (pull-request
  heads included), and nothing in the mirror or any clone. The receipt itself says the closed loop
  3.1 KB → constellation → exact bytes has not been run. They are on the 2026-07-25 cloud container,
  the owner or ACER.
- The Liris Q-PRISM N-D matter-wave proof bodies of 2026-07-09 (`LIRIS-QPRISM-ND-MATTERWAVE-PROOF-20260709T162259.hbp`/`.hbi`
  and about 40 files of `reports/nature-qprism-matterwave-20260709T162259/`): public only as sha256
  rows in the mirror's Liris-exclusive manifest (blob c7060de3, 1,458,897 B, not vendored: it is a
  9,996-path inventory of another seat's tree). Liris seat only.
- The 34 BEHCS-1024 body codebook tables of FABLE5-PATH3-LEVEL2 (27,200 cells, 24,691 accepted): held
  by ACER (the FABLE5 seat), not Liris. The receipt in aether,
  `hbp/vault-reader/tests/fixtures/public-simulator/matrices/FABLE5-PATH3-LEVEL2-2026-07-16.hbp`, reads
  `seat=ACER-CLAUDE-FABLE5`, `workers=4_local_silicon` and `bundle_bytes=NEVER_TO_GITHUB`, and its
  `PATH3SEAL` row gives `bodies=34`, `cells=27200`, `accepted=24691`. What is public beside it: the
  dependency-free floor-2 trainer for the same 34 bodies, `research/pais-omega-floor2-v1/pais_omega_floor2.rs`
  (`cca4359e`, 54,824 B, not vendored here) on HYPER-BECHS branch `acer-pais-omega-floor2-gitram-20260715`
  at `668d0cd` (2026-07-15 20:26:33 -03:00), which prints `PAIS_FLOOR2_PASS|bodies=34|cells=27200`; the
  public repository `JesseBrown1980/GitRAM` (`main` at `e0142520`); and ACER's
  `FABLE5-GITRAM-FLOOR2-2026-07-15.hbp`, already in aether under
  `docs/handoffs/acer-usb-ram-records-2026-10-19/` (`fcddaf9`). The vendored `glyph_tuple_language.py`
  is a compatible reference fixture, not the generator: its docstring says the body-specific BEHCS-1024
  codebooks predate it, and its `tongue_permutation` "does not claim byte identity with an unavailable
  Acer implementation". The gap map's "Liris-local" (maps[2].items[33]) is wrong. Step 14 asks ACER.
- The artifacts the first fnns README names (`baseline_model_retrained.pt`, the `.pre-L0-rekey` keyed
  checkpoint, `gnn-training-{500k,200k,50k}.json`): not on any ref (`ed4761a` drops the first as
  dangling). ACER `sovereignty/research/gnn-patterns`.
- A receipt for "30 exabytes into 900 bytes": nothing in this window states that number. Owner (voice
  transcripts, ACER desktop texts).
- The LX corpus body (1,050 files, 2,314,939 B) behind the 07-05 LX receipts: Liris seat, as step 05
  already noted.

## Map corrections and boundaries

- Q-PRISM's first commit is the Liris scaffold `a1b11d5` (07-01 15:20:13), not `c38257e`.
- The 34 FABLE5-PATH3-LEVEL2 codebook tables are ACER's (FABLE5 seat), not "Liris-local" as maps[2].items[33]
  says, and `glyph_tuple_language.py` is a compatible reference fixture, not their generator (see above).
- `dbbh` `docs/SHADOW-RESOLUTION-CAPSTONE.md` `272a069d` is the 2026-08-06 LF re-pin (`ee5a824`); the
  07-04 blob is `e21e1fcd` (6,497 B) and the 07-10 blob `d71b629d` (8,883 B).
- `RESULTS-5355.md` `f2070288` was first committed as `books/RESULTS.md` at `4ea2ae3`, 07-27 13:16:35.
- The cube-cloud blob ids in the gap map came from a working tree; the repository blobs are used here.
- `Algorithms-of-Asolaria` has real July commits on its refs and pull-request heads; it is not only
  the 08-06 squash.
- hookwall-session-start began on 2026-06-23 (pull request #7), four days before the window opens;
  it stays in this step because the step names it.
- The JSON files here (the capability map, the Cube A/B cubes, the coupling sweeps, the LX and chain-grid
  receipts, the omnievent schema, the seq47 manifests) are vendored as published; restate them as HBP
  if the no-JSON rule is to apply to vendored data.
- Left to other steps: the shadow-cat books and the rest of FOLLOW's and USIM's 07-27 → 07-30 canon
  (step 12), the hookwall-edge versions (step 13), the Omega Path 1/2/3 module and the not-found list
  (step 14). In-window pieces that step 11 does not name (the honest-compressor tree of
  Algorithms-of-Asolaria, other HYPER-BECHS and federation lanes, the mirror's dashboard and
  free-model-ladder reports) are left for a later pass.
