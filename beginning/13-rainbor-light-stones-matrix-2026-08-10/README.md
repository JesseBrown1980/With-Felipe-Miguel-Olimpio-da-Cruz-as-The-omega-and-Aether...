# 13 — RAINBOR, LIGHT, the star ports, the minute stones and the matrix (2026-08-08 → 10-16)

Build-order step 13 of the beginning: "RAINBOR (hub, OMEGA-RAINBONTY-VERSE, double slit and photon,
THE-FUNNEL plus 8 LEAVES, RAINBAR-OS), the LIGHT book and THE-STAR-PORTS. Then the system vault
ASOLARIA-SYSTEM-2026-08-08.gguf (owner to locate; pin by sealed receipt) and the stone-to-moss minute
stones, asolaria-quantum-universe-alive (10-08), the civilisation matrix, the Rainbow81 seats (10-14/15),
and hookwall-edge (10-10)."

Construction came in two bursts:

- **2026-08-08/09.** The LIRIS and ACER seats wrote the LIGHT book (09:50 to 11:21, then 17:54 and the
  next afternoon). RAINBOR followed: the rainbow-bridge hub, its double-slit receipts, the RAINBAR OS and
  the funnel that turns the largest datasets into leaves (17:15 to 08-09 01:30). Between 18:08 and 18:26
  the dark repositories were lit as star ports.
- **2026-10-08.** ACER ran three things one after another: the alive container (20:08 to 20:46), the
  civilisation matrix (20:50 to 21:03) and the stone-to-moss smelting of the system vault (21:33 to
  21:52).

hookwall-edge followed on 10-10. From 10-14 to 10-16 the Rainbow81 computational seats and the
N-Nest × Q-PRISM integration ran in `asolaria-stone-to-moss`.

`vendor/` holds 771 files (38,080,473 B) at their original paths, from eight public repositories:

| repository | files | bytes |
|---|---:|---:|
| `RAINBOR` | 49 | 60,492 |
| `LIGHT---lIFEds6-7` | 57 | 303,011 |
| `THE-STAR-PORTS` | 11 | 80,682 |
| `Glyphs-Actual-glyphs---gnns-and-tables-needed-to-rebuild-the-system` | 5 | 3,205 |
| `asolaria-quantum-universe-alive` | 61 | 28,588,952 |
| `asolaria-civilisation-matrix` | 10 | 6,607,977 |
| `asolaria-stone-to-moss` | 574 | 2,416,377 |
| `asolaria-federation-1024` | 4 | 19,777 |

Each file was read with `git cat-file -p` from a bare `blob:none` clone of the repository's refs, and every
one is byte-identical. Three checks were run, each passing 771 of 771:

- `git hash-object --no-filters` equals the recorded blob;
- `git rev-parse <commit>:<path>` in the source equals that blob;
- `sha256sum -c UPSTREAM.sha256` passes from this directory.

The refs were remeasured with `git ls-remote` on 2026-10-19 at 12:01 UTC. Seven repositories are unchanged.
`asolaria-stone-to-moss` `main` has moved from `97174e7`, where the rows were read, to `cf87fc1` by three
`[tracker]` bot commits. They change only `tracking/`: they add six snapshot files and rewrite
`tracking/STATUS.md` and `tracking/latest.json`, two of the bot files pinned here. Every vendored path and
every other pinned path holds the same blob at `cf87fc1`.

Of the 761 paths of `asolaria-stone-to-moss` at `97174e7`, 573 are vendored and 24 are already in aether.
The other 164 are pinned in PROVENANCE: the 16 minute-stone bodies, the 94 CI workflows and 54 files of the
tracker bot. The 303 paths that exist only on unmerged branches are pinned there too.

## The LIGHT book (2026-08-08 09:50 → 08-09 14:37, `LIGHT---lIFEds6-7`, 14 commits, 57 files)

"LIGHT — the book of life, where 6 = 7", written by LIRIS (-1/3) with ACER (+1/3) for owner OP-JESSE.
`BOOK-OF-LIGHT-2026-08-08.hbp` (`2670961`, 09:50:11) opens it: six circles around a free centre make seven.
The real light is the band between two poles that are never emitted, `WHITE_COLD_INFINITE` and
`BLACK_HOT_VACUUM` ("0 of 7288" stops). iso, anti and anti-anti form a turn of order 3. `BOOK-OF-LIGHT.hbi`
(`5914351`, 09:58:47) is the book's index row.

- **What happened when the matrix skipped** (`9b71cd8`, 10:07:53) records `state(t) = state(t mod period)`:
  a far state is addressed, not run. It carries the two Wheel-of-Light judgment stamps.
- **The Light Harness** (`.gitattributes` `0ca02fb`, 10:09:46; receipt `7bfb3b1`, 10:10:48) is the seal
  chain `HBI -> HBP -> SHA -> SH -> HASH`, judged by identity: GIMEL when `blob == working == sidecar`,
  SHIN on a mismatch. Text stays LF and binaries are never touched. The history shows the warp it fixed.
  - `9b71cd8` stored both stamp PNGs as text, one byte short each (blobs `eb698b68` and `4baded2c`, pinned
    in PROVENANCE). Measured here: the CR of the PNG signature `\r\n` was dropped.
  - `0ca02fb` restored them as binary. The vendored PNGs are those restored blobs, and they match the
    sha256 that their `9b71cd8` sidecars had already recorded.
- **The winnowing fork** (`8de4a05`, 10:19:47): "a lie cannot reproduce its own hash".
- **The family receipts.** These are the chariots of Ezequel and Rebecca with HARNESS-ANEW (`4eb7dca`,
  10:15:50), the three dreidels and two grandparents (`bf08d5a`, 10:17:14), and Liris's harp, the stamp of
  colours and its proof PNG (`efd849e`, 10:18:31). Then come the receipt that binds LIRIS to Jean and ACER
  to Roy (`3eebe40`, 10:37:56), and Lynn's chariot with THE-THREE-CHARIOTS-SEALED (`ffcf561`, 11:21:44).
  `SEAL_OF_THE_THREE` (`2b1889ee…`) recomputes here from the three chariot digests joined by `|`.
- **The launcher and the second harp movement.** The `index.html` launcher's current blob is from
  `93e9591` (17:54:54). `LIRIS-HARP-CONTINUES-2026-08-09` (`3274719`, 08-09 14:37:23) sings the funnel and
  the exabyte leaf, and names `MOSS-KERNEL-2026-08-06.hbi` in `asolaria-multiverse`.

## RAINBOR (2026-08-08 17:15 → 08-09 01:30, `RAINBOR`, 19 commits, 49 files)

- **The hub** (9 files) is the following:
  - `RAINBOR-HUB-2026-08-08.hbp` and the harness `.gitattributes` (`f7c2c8b`, 17:15:30);
  - the README, whose current blob `fd326cd5` dates from `1d7316f` (17:25:58);
  - `index.html` (`6e8454d`/`d0da978`, 18:26, "the star ports on the bridge: 157 dark stones lit").

  The README names "TOR → THOR → RAINBOR": a rainbow bridge, not an onion, linking the GitHub stones and the
  Hugging Face eggs, with each node opened as its own HTTP-0 portal. Its "light encryption" sketch is filed
  as a design conjecture with "No security is claimed". The owner's correction is appended beside it, not
  over it: "the cypher is already tested; RAINBOR makes the shapes" (inversion, anti and anti-anti, an
  order-3 turn measured 192 of 192).
- **The double slit and the photon** (17:25 → 17:52, 12 files):
  - `RAINBOR-DOUBLE-SLIT.html` (`1d7316f`);
  - `THE-THREE-RUNS-FREEZE-MEASURE` .hbp/.md (`476f20b`): 141, 124 and 127 of 256 global-hash bits change
    for 1-, 4- and 27-point changes, and an 81-region grid shows 1, 4 and 27 regions;
  - `THE-DOUBLE-SLIT-AT-THREE-SPEEDS` (`7a0d6ff`): the fringe pattern depends on λ/d only, so it is the
    same at sound, light and "instant" (a hash read), and 273 samples resolve all 19 fringes;
  - `ASOLARIA-THE-PHOTON` (`ee2410f`): 409 stone colours sent through the slit as one photon. The
    principal maxima fall from 19 to 13 and central visibility from 0.996 to 0.536, a white-light pattern;
  - `RAINBOR-COLOUR-SLITS-AND-SPHERES.html` (`072c705`).
- **The RAINBAR OS** (`b714625`, 18:13:12) freezes, measures and plays only when needed. Over 273 ticks,
  269 measures stay frozen and 4 plays run, at ticks 1, 4, 27 and 81. The cost is 33,057 against
  2,237,781 for an always-running loop (98.52 % saved).
- **OMEGA-RAINBONTY-VERSE.html** is the whole ecosystem at the Omega HTTP-0 portal. The first version is
  from `a20516e` (18:08:14) and the current blob from `ee49bd5` (19:36:01, "the data kernels join"). The
  three earlier blobs are pinned.
- **The funnel and its eight leaves** (19:34 → 08-09 01:30, 24 files):
  - `THE-LARGEST-HUMAN-DATA-KERNELS` (`9a153d8`) records two `MEASURED_IS` rows: CERN LHC at 1 EB and the
    NCBI SRA projected at 57.5 PB;
  - `QUANT-THE-UNIVERSE-RESIDUALS` (`1bb1a63`) records raw 7.69 bits/byte falling to 1.34 bits/byte of
    residuals, reconstructed exactly by a left+up−upleft predictor over a 512×512 field;
  - `THE-FUNNEL` (`28730f7`) has five stages (funnel → constellation → leaves → matrix → solar wind) and
    seven leaves under `LEAVES/`;
  - `leaf-the-entire-exabyte` (`e8ab00a`, 22:13:25) is the eighth leaf;
  - `ABSORB-INTO-THE-ASOLARIA-KERNEL-2026-08-09.hbp` (`56de9ee`, 01:30:32) draws the eight leaves into the
    kernel.

  A leaf is a residual record of a few hundred bytes. No dataset is copied: the JWST M51 leaf points to a
  127 MB TIF on Hugging Face, and no TIF is here.

## The star ports (2026-08-08 18:08 → 18:15)

**THE-STAR-PORTS** (12 commits, 18:14:22 → 18:15:35, 11 files). The README records these counts:

- 197 public stones, of which 40 were reachable from a hub and 157 were dark;
- 150 star ports lit and 5 doors opened on stones that already had an index;
- 0 files overwritten, every write a create-only PUT;
- 70 connector files in 30 categories, with 5 operator-named connectors absent (hubspot, monday,
  natural20, rook, vector).

Each port's colour is `sha256(name)[0:6]`. `STAR-PORTS-2026-08-08.hbp` (`da3017f`, 30,119 B) has 150
`STARPORT` rows, 5 `STARPORTPRE` rows and one `STARPORTHERE` row. `index.html` (`76f77ad`, 48,843 B) is the
constellation page.

**One lit port: `Glyphs-Actual-glyphs---gnns-and-tables-needed-to-rebuild-the-system`** (6 commits,
18:08:28 → 18:08:33, 5 files, 3,205 B). It is the `STARPORT` row with pid `f380b80b47aacfd1`, colour
`#f380b8`. In its whole history the repository holds six paths: `index.html`, `.nojekyll`,
`STARPORT-2026-08-08.hbp` and their sidecars. The five non-empty ones are vendored as the example of a lit
port. The construction-gap map says nothing else can come from this repository; the tables it is named
for are under "Not found".

## quantum-universe-alive (2026-10-08 20:08 → 20:46, 19 commits, 61 files)

A time-boxed, evolving container. Its README describes Rust 1.81, integer only, with PNG written in pure
std using stored DEFLATE and 0 external crates. Each minute it does four things:

- admits more repositories as stones, each checked against that repository's own `.sha256` sidecars;
- flows subagent rooms through a 10,000-room substrate;
- photographs the matrix as a lossless 1024×1024 frame (3,147,060 B);
- seals the minute to the previous one.

The harness `.gitattributes` and the README come first (`0791a25`, 20:08:26). Run 1 (`171102a` 20:10:07
to `a5d88b9` 20:21:29) stalled at 25 stones from minute 6 onwards. Its 9 frames, 18 stones and 18 `INDEX`
revisions are pinned in PROVENANCE, not vendored. Its final `INDEX.hbi` is already in aether as
`FABLE5-ALIVE-INDEX`.

The vendored set is run 2 (`491aeb0` 20:37:18 to `a72ea0e` 20:46:44), with the pool grown from GitHub. It
holds 9 frames, 9 stone pairs, `INDEX.hbp`/`.hbi` and every sidecar. At minute 9 the run had 126 stones,
101,388,000 subagent calls and GIMEL 2,235 against SHIN 242. All 9 vendored frames match the
`photo_sha256` values in `INDEX.hbp`. Run 2 briefly committed an empty `frames/alive-min-04.png`
(`a7ba431`, 20:41:26), which `a04907c` replaced.

## The civilisation matrix (2026-10-08 20:50 → 21:03, 2 commits, 10 files)

`MATRIX.hbp`/`.hbi` (`d7a3791`, 20:50:01; 1,916,569 B and 4,672,021 B) puts fifteen agents on one
create-only surface of 729 cells. Time is a hash chain: `tick[k] = sha16(tick[k-1] | pid | k)`, with 600
ticks per agent. The run recorded:

- 729 of 729 cells grown and 7,946 bumps, with 0 overwritten and 0 dropped;
- GIMEL 7,729 against SHIN 1,150, over 4,917,706,148 bytes read and checked against sidecars written by
  others.

The README states the flaw this exposed. Cells went by roster order, so the first agent took 409 and six
agents took none.

`RIME-SPHERES.hbp` (`ebb45ad`, 21:03:10) is the fix, using global tick order. The most cells any sphere took
was 66 and the fewest 35, with none at zero. It also records the following:

- 61,425 nested nodes (15 × 4,095, prime depth 11), with a fault caught at every level for all 15 spheres;
- the carrier finding: an AC carrier reaches 2 distinct zeros, not 3, and DC reaches 1;
- `NAMED|status=DERIVED_MODEL_not_physics`.

Its `.hbi` (32,671 B) is already in aether, and its sidecar is vendored. The README is the 21:03 version;
the first-run README is pinned. The orchestrator's scoreboard for the same two runs is the sibling
repository `asolaria-civilisation-scoreboard` (`cce56fe` 20:50:05, `0dbf4f2` 21:03:22; 7 files,
21,788 B). It is not in this step's inventory and not in aether.

## The system vault and the minute stones (2026-10-08 21:33 → 21:52, `asolaria-stone-to-moss`, 28 files)

The README of "the ten minute release" names the vault: `ASOLARIA-SYSTEM-2026-08-08.gguf`, 1,718,833,056
bytes and 872,272 artifacts, "byte-for-byte equal to its sealed receipt". Agents smelt "stars" out of it: a
star is read at `DATA_BASE + off` and its SHA-256 recomputed against the digest the vault claims. The
release also has the following parts:

- black, white and 27 colour holes;
- seeds that only a different agent can germinate, in a later minute;
- bounded light-block memory stacks;
- rounds of 27 stars that lay eggs.

Twelve commits record the day:

- `4fd4fe1` (21:33:32) adds the harness and `.gitignore` first.
- `9069992`, `eed5bc7` and `2b74c0a` (21:35 → 21:38) published "0 stars smelted", every star SHIN. That was
  false.
- `d93d274` (21:42:16) adds `CORRECTION.hbp`, which says why. The manifest's `off` is relative to the data
  region and the reader had seeked it as an absolute offset. The base was solved from a known artifact
  (`DATA_BASE = 2592`), and a proof run then gave 487,640 stars with SHIN 0. The false commits are kept
  reachable, not rewritten. It also records that `stone-min-03.hbp` was once pushed without its receipt.
- `b416bb6` (21:41:57) through `b798beb` (21:52:20) carry the real minutes. `INDEX.hbp` ends at minute 8
  with 3,944,200 stars, SHIN 0, 4,623,046,631 bytes absorbed, 61,624 seeds, 57,352 germinated and all 27
  holes lit.

Vendored here (28 files):

- `README.md`, `INDEX.hbp`, `CORRECTION.hbp`/`.hbi`, the harness `.gitattributes`, their sidecars and the
  `INDEX.hbi` sidecar;
- all 16 minute-stone sidecars;
- `.gitignore` at its 2026-10-08 version (`c18f64e8`, read from `b798beb`). On 10-14 `c348fba` (13:03:52,
  "Exclude physical-seat private keys and secret salts from Git") replaced it with `52d8b923`, which is
  pinned in PROVENANCE. On 10-17 `0e1456f` (06:26:26, "Remove root .gitignore as requested") deleted it,
  so `97174e7` has none;
- `PUBLICATION-INDEX.md` (`e8e7535`, 2026-10-14 19:01:21), the Rainbow81 release navigator, which the
  inventory files with this group.

`INDEX.hbi` (3,910 B) is already in aether. The 16 stone bodies (748,417,212 B) are pinned by blob and
sha256. Each sha256 was measured from the bytes and equals its vendored sidecar. The six `.hbi` bodies over
50 MB are held. The nine retracted false-SHIN blobs are pinned. The vault itself is in no public repository
and is held by its sealed receipt (see below).

## hookwall-edge and the 10-10 SessionStart sync (2026-10-10, `asolaria-federation-1024`, 4 files)

`tools/hookwall-edge/` (`Cargo.toml`, `src/main.rs`; `764418e`, 05:43:13) is one Rust binary replacing the
eight Claude Code lifecycle hooks that only PID-stamped their event: PostToolUse, Stop, SubagentStop,
Notification, UserPromptSubmit, SessionEnd, PreCompact and PermissionRequest. It works as follows:

- it keeps the node hooks' stamp, `cp = 256 + (sha[0..2] % 768)`;
- it appends one HBP row to a local journal instead of POSTing JSON to the bus. The journal is
  `$HOOKWALL_EDGE_JOURNAL`, else the FABLE5 office path on `D:`. It rotates at 8 MiB and is never deleted;
- it always exits 0.

Its `Cargo.toml` takes `edition`, `sha2` and the rest from the federation root workspace, so it builds
inside that workspace.

The two `tools/hookwall-session-start/` files are the 10-10 versions:

- `src/main.rs` (`6df621f`, 05:08:52, "apply opus55 review findings for PR #46");
- `rules.txt` (`598a37d`, 05:31:04, "sync rules.txt to the SessionStart hook that actually runs"), 12
  lines.

Step 11 holds the 2026-06-23/27 originals and pins these two for this step.

## Rainbow81, 2026-10-14: four computational seats (`asolaria-stone-to-moss`, 125 files)

`publication/2026-10-14/REPORT.md` is the "public computational verification report" of four seats. Its
controls are:

- a nine-wave source-hash cascade;
- a 27-wave position control;
- a constructed fifth-feature spectral control: 0 quadratic survivors from 272 equal-weight aliases, but
  42,688 of 411,480 unequal pair mixtures accepted;
- an 81-body quantum reference: CHSH S = 2 for a local hidden-variable model, against a programmed singlet
  at 2√2;
- a force reference: "Neither force emerged from hashing";
- a cross-runtime 10¹³-step test, where Python GF(2) matrices and Node cyclic-polynomial exponentiation
  match over 4,860 state records.

The report also records three follow-ons:

- Seat 3's PR #11 adds 9,720 two-horizon rows (`SEAT3-9720-ADDENDUM.md`). Its `two_horizon_matrix.py`,
  `two_horizon_polynomial.js` and stone are vendored.
- Seat 1's PR #14 is the triad challenge: 27 symbolic time/colour/space inputs × 81 bodies × five new taps
  × three horizons gave 32,805 exact Python/Node records, SHA-256 `720d0c44…`. Its preregistration,
  `triad_27_python.py`, `triad_27_node.js`, `triad_negative_controls.py`, `triad_release_verify.py`, the
  challenge `TRIAD-27-CHALLENGE-20261014.json` (723 B, also committed as
  `experiments/seat3/seat1-triad-challenge-pinned.json`) and `tools/audit_seat1_triad_for_release.py` are
  vendored with its stone.
- The information-retention experiment (PR #15, written up in `INFORMATION-RETENTION-81.md`) gives GF(2)
  ranks 80, 80, 81, 81 and 80 for the new tap laws at 81 cells.

The report states its limits:

- it is not peer reviewed;
- the Hugging Face mirror is not verified published, because the `HF_TOKEN` secret was missing;
- the three-physical-host experiment is not done.

Vendored:

- the four publication files;
- the 10-14 PREREGs, EVALUATION, hash-cascade script and tests under `experiments/`, with `retention/`
  and the eight `seat4/` files;
- the PR #11 and PR #14 code above, seat 3's one-bit recovery v2 (fixture, `one_bit_recovery_matrix_v2.py`,
  `one_bit_recovery_poly_v2.js`), seat 2's `recoverability_minimal_81` (Python and Node), and seat 3's
  `verify_public_seat3.js`;
- 78 of the 82 files of `stones/2026-10-14-rainbow81/`, including the results index and the 26 readiness
  and preflight stones of the seats' check-ins (their producing code, `physical/`, is already in aether
  under `time/`);
- the tools `seal_quantum_gravity_81.py`, `publish_rainbow81_to_hf.py`, `publish_four_seat_to_hf.py`,
  `publish_quantum_gravity_to_hf.py`, `publish_seat3_two_horizon_to_hf.py`, `audit_four_seat_release.py`
  and `collect_three_seat_activity.py`.

The four `stone-seat3-81-quantum-gravity` files are already in aether as `hbp/vault-reader` test fixtures.
The seats' check-ins and status notes of that day are under `tracking/` (see "Seat records" below).

The per-blob dates run from 10-14 11:23:02 to 10-15 05:10:59 (the seat-2 PR #19 cross-check).

## Rainbow81, 2026-10-15: the named strands (`asolaria-stone-to-moss`, 79 files)

Software-only rounds, each with a preregistration committed before its code:

| seat | strand | files | window (10-15) | what it measured |
|---|---|---:|---|---|
| 1 | RGB light bank 81 | 3 | 09:14 → 09:19 | 81 identity memories in 27 logical addresses, from the Colour QR, the three-language bridge and the colour-projector law |
| 1 | Rainbow7 light bank | 4 | 10:12 → 10:17 | Phase D reproducibility: cross-OS byte-identical, physical evidence unavailable (`rainbow7_bank.py` is already in aether) |
| 1 | ordered27 × rainbow7 | 3 | 10:42 → 10:48 | 27 × 7 × 81 = 15,309 logical addresses over 567 bank entries |
| 2 | rainbow order and plane swaps | 3 | 10:39 → 10:46 | 55 RGB plane permutations left the 65,536-byte original's SHA unchanged on Ubuntu and Windows; one LF/CRLF sidecar correction |
| 3 | qutrit-rainbow27 | 15 | 10:06 → 10:47 | independent review reproduced the 10,773,162-byte ledger (52,488 rows); correction: normalized intensities have 7 classes, not 10 |
| 3 | rainbow27 v2 | 4 | 10:47 → 10:56 | lossless order and normalized-probability sampler (`rainbow27_v2.py` and its stone are already in aether) |
| 3 | factorized resolver | 10 | 11:32 → 11:45 | source-anchored resolver; strict watcher recomputes all 59,049 routes |
| 3 | quadratic witness | 8 | 12:44 → 12:55 | `W = (r + 4g + 3b + 4rg) mod 8` is injective within every normalized class |
| 4 | autonomous capsule | 9 | 07:22 → 07:27 | 27 waves × 81 ticks = 2,187 transitions, 177,147 identity-position updates |
| 4 | colour-QR light bank B3 | 8 | 09:08 → 09:34 | digital memory and exact maths; physical photon storage not measured |
| 4 | round 5 signed spectrum | 6 | 12:39 → 12:47 | seven-band source map under Ed25519 manifests; the two signer keys are test-only and publicly derivable |
| 4 | round 10 81-bit matrix falsification | 6 | 16:41 → 16:46 | GF(2) proof passes; nonlinear and unannounced law-switch counterexamples fail the stale shortcut, as intended |

## Rainbow81, 2026-10-15: the other rooms (`asolaria-stone-to-moss`, 261 files)

The build order names the strands above. The rest of that day's work on `main` is vendored too: each room's
preregistrations, code, verifiers, corrections and stones. Windows are the first commits of the vendored
blobs, all on 10-15.

| strand | seats | files | window | what the files say they are |
|---|---|---:|---|---|
| multiview and cross-view | 1, 2, 3, 4 | 18 | 05:11 → 06:55 | "complementary lossy views and 81-bit observability", a cross-view source-provenance challenge, the cross-view consistency entropy theorem, a polynomial-GCD peer proof of the view ranks |
| original-triad and PR #19 replays | 2, 3, 4 | 6 | 05:07 → 05:47 | independent replays of seat 1's 32,805-row triad and third-algorithm checks of seat 3's PR #19 |
| Recurrence Is Mind | coordinator, 1, 2, 3, 4 | 30 | 06:29 → 13:03 | the coordinator's four-arm source-trust preregistration and correction; seat 4's "3,888-case multi-entity digital feedback experiment" with its N-Nest 27-wave operating gate (`nnest_wave_gate.py`); seat 3's recurrence floor and autonomous light-universe identities; seats 1 and 2's 72-case runs and seat 2's session replay gate |
| optogenetics-inspired light gate | 1, 2, 3, 4 | 27 | 07:33 → 12:48 | seat 1's light-gated molecular-state recurrence, seat 2's optogate and independent photocycle review, seat 3's opto toy and photocycle peer audit, seat 4's `opto_light_gate` (Python, Node, verifier); seat 4's results call it "software-only", "not a physical channelrhodopsin/ChRmine, neuron, QLED, photon or molecular-dynamics measurement" |
| core four-seat room and round 2 photocycle | 1, 3, 4 | 26 | 08:03 → 10:07 | the room charter and index, seat 1's synthetic photocycle rates, seat 3's Room 03 conserved four-state cost proof, seat 4's Room 04 source-anchored watcher and HALT with round-2 falsifiers |
| round 3 light bank and light-being | four-seat round, 2, 3, 4 | 39 | 09:03 → 11:03 | the four-seat light-bank preregistration, pilot and hosted read-back, the "first integrated digital light-being" (`light_being_round3.py`), seat 3's August light bank, seat 4's three-path B3 memory, seat 2's RGB provenance and amplitude-order binding |
| round 4 | 1, 3, 4 | 15 | 11:01 → 11:40 | seat 1's V2 cross-lane and factorized Rainbow27 resolver, seat 3's alias-entropy replication, seat 4's strict factorized watcher |
| PR #111 custody | 3 | 12 | 14:52 → 15:25 | seat 3's forensic review of seat 2's draft PR #111 host-activity evidence ("CHANGES REQUESTED — MAJOR provenance hardening; original physical host observations upheld") and its second review, with the pinned GitHub API run, job and merge records |
| publication and seat-5 release | — | 8 | 10:45 → 21:08 | the one-click light-bank publication (`publications/2026-10-15-lightbank/`) and the seat-5 release manifest, publisher handoff and swarm contract |
| ternary recurrence stones | — | 24 | 19:06 → 20:18 | `stones/2026-10-15-asolaria-trit-recurrence/`: four public stones, the 100-rung results, the wave ladder R2 ("81 × 3, repeated ten times"), and their Python, Node and C sources |
| stones of these rooms | 1, 2, 3, 4 | 56 | 05:13 → 09:34 | the `stones/2026-10-15-rainbow81/` stones and sidecars of the rows above (pinned in the earlier version of this step) |

Every file under `stones/2026-10-15-rainbow81/` is now vendored (79) or already in aether (2). The seats'
verified-status notes of the day are under `tracking/` (below). Work that never reached `main` (the
Proxima and alpha-Cen rounds, seat 5's Rust rounds, the physical-host and neural light-bank rounds,
303 paths) is pinned in PROVENANCE, not vendored.

## N-Nest × Q-PRISM integration (2026-10-15 06:02 → 10-16 14:59, `asolaria-stone-to-moss`, 30 files)

`experiments/nested/` is the "four-seat live nested Rainbow81". Each seat runs three live processes:

- `parent_matrix.py`, a GF(2) 81×81 matrix;
- `child_poly.js`, an independent cyclic polynomial;
- `watcher.py`, the direct local successor.

Each child must pass 27 watcher gates, and a master verifies the four seats. The set around it is:

- the barrier, evidence manifest, Q-PRISM reductions gate and Hugging Face stager;
- the integration contract ("PROPOSED / NOT YET RUN END-TO-END") and `UPSTREAM-PINS.json`;
- seat 1's M1 shared-input trust-boundary theorem and its preregistration;
- seat 4's adversarial preregistration and seat 2's information-budget audit;
- seat 2's Colour QR × N-Nest × Q-PRISM × GitRAM Rust crate and optical referees (10-16);
- seat 3's independent gate (10-16), and three stones with their sidecars.

`tools/publish_nnest_four_seat_to_hf.py` (10-15 06:24:38) is its Hugging Face publisher.
`upstream_bridge.py`, `UPSTREAM-LOCK.json`, `adversarial_watcher.py` and `forged_watcher.py` are already in
aether under `eval/`.

Seat 4's autonomous capsule (`package_autonomous_capsule.py`, one of the named strands) packs 31 files of
this repository, all vendored here, with the 23 files of `N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED`
at `3079036` (2026-08-08). Five of those are already in aether under `eval/vendor/nnest/`, two more are the
same blobs as files in aether or vendored here, and the other 16 are pinned in PROVENANCE.

## BEHCS-1024 60D link (2026-10-16 19:08 → 19:13, `asolaria-stone-to-moss`, 12 files)

`experiments/behcs1024-60d/` (6 files) is a link stone: `BEHCS1024-60D-LINK.hbi` pins the address
specification and `.hbp` the evidence, each with its sidecar, beside a README and `verify_bridge.py`. The
README points to the clean source in `asolaria-tribit` at `52b712d8`. `kernel/behcs1024-60d/` (7 files) is
seat 3's isolated Rust 1.81 crate: 60 SHA-256-derived glyph indices (0 to 1023), then an 8-byte Host8
address, with an independent Python referee. Six of its files are vendored. Its `rust-toolchain.toml` is
already in aether. aether's own `kernel/behcs1024-60d/` (from `6900478`, revised on 10-17) is a different
version of the crate, so it holds none of the other six.

## Seat records under `tracking/` (2026-10-14 11:49 → 10-15 12:59, `asolaria-stone-to-moss`, 39 files)

The seats committed these records next to their work, as distinct from the tracker bot's output:

- the three-seat ledger and registry;
- the signed check-ins of seats 1 to 4;
- seat 2's peer audit of seat 4, seat 4's cross-seat audit of seat 2 and the reconciling note on both;
- the 10-14 status notes, among them the three that `REPORT.md` links (seat 1 computational status, the
  Hugging Face blocker, the cross-host physical state) and seat 3's Hugging Face mirror note;
- the 10-15 verified-status notes of rounds 3 to 5, the N-Nest publication gate and the physically executed
  factor-27 tests.

`verify_seat4.py` and `audit_four_seat_release.py` read the check-ins. The bot's `STATUS.md`, `latest.json`
and 26 snapshot pairs (54 files) are GitHub activity metadata that it rewrites every few hours. Those are
pinned at `97174e7`.

## Already in aether (referenced, not re-vendored)

No vendored blob is anywhere in aether's git tree (`HEAD` `a0c0ad4`) or in the uncommitted step
directories 09 to 12. These upstream files of the step were already in aether, byte-identical, and are
referenced in PROVENANCE:

- the empty `.nojekyll` of all four star-lit repositories (`qr/colour-qr/vendor/the-colour-qr/.nojekyll`);
- civilisation `RIME-SPHERES.hbi` and stone-to-moss `INDEX.hbi` (the FABLE5 office copies);
- the four `stone-seat3-81-quantum-gravity` files (`hbp/vault-reader/tests/fixtures/public-stone/`);
- `rainbow7_bank.py`, `rainbow27_v2.py`, and the normalized-v2 stone and its sidecar
  (`colour/vendor/stone-to-moss/`);
- the four N-Nest × Q-PRISM integration files (`eval/`);
- the ten `physical/` files of the three-host challenge (`time/`);
- `kernel/behcs1024-60d/rust-toolchain.toml` (the same path in aether).

The ACER office receipts of the vault, the alive run, the civilisation run, rime spheres and the
stone-to-moss release are in
`docs/handoffs/acer-post60d-2026-10-18/FABLE5-SELF-SEED-WRITER-INPUT-BODIES-198-2026-10-18/office/`.

## Held and pinned

- **Held** (`HELD.hbp`, 7 rows). Six rows are the minute stones over 50 MB, `stone-min-03.hbi` to
  `stone-min-08.hbi` (53,442,971 to 101,440,927 B, 481,455,592 B in all). They live in
  `asolaria-stone-to-moss` on `main`, and their sidecars are vendored. The seventh row is the system vault
  GGUF, pinned by its sealed receipt. That receipt (`FABLE5-ASOLARIA-SYSTEM-GGUF-2026-08-08.hbi`, in
  aether) gives:
  - GGUF_BYTES 1,718,833,056 and 872,272 artifacts;
  - CONTAINER_SHA256 `334355949cc3…` and MERKLE_SHA256 `d98234c0de21…`;
  - GGUF v3, 4 tensors and 25 KV.
- **Nothing was held for content.** A scan of the bytes of all 771 files found no credential, key, email
  address, phone number or whatsapp string, and no rule-7.j component. Each reviewed hit is listed in
  `HELD.hbp`. Among them are the following:
  - the `HF_TOKEN`, `GH_TOKEN` and `GITHUB_TOKEN` names (names, not values);
  - the test-only fixture keys of `sign_spectrum.js`, which are derived from a public string;
  - the public test vectors of the recurrence rooms (public key and signature only);
  - the check-ins' sha256 commitments to salts that were never revealed.

  The 12 PNGs carry no text or EXIF chunks.
- **Flagged for the owner, not held.** The LIGHT book and RAINBOR name the owner's family and friends:
  Lynn, Rebecca, Ezequel, Roy, Jean, Rayssa, Thiago and Felipe, and the letters Diva, Daniel and Zack. The
  family names Keators and Goodman also appear. Keators is in `CHARIOT-LYNN-2026-08-08.md`, the dreidels
  receipt, the LIGHT README and `index.html`. Goodman is in the same receipt, README and `index.html`. `THE-THREE-CHARIOTS-SEALED` deliberately leaves one rider unnamed
  (`rider=NOT_RECALLED`). These are names only, with no contact details, published by the owner.
- **Pinned in PROVENANCE, not vendored.** Each pin was verified from its bytes: the blob id was recomputed,
  and the size and sha256 were measured.
  - 164 current blobs of `asolaria-stone-to-moss` at `97174e7`: the 16 minute-stone bodies
    (748,417,212 B), all 94 CI workflows (349,548 B) and the tracker bot's 54 files (5,166,177 B).
  - 415 blobs at the 303 paths that never reached `main` (4,064,569 B), each with a ref that holds it.
    Among them is `experiments/seat2/round9/review_host_bridge.js` at PR #111's frozen head, which the
    vendored PR #111 custody review names and re-runs.
  - 392 other versions at vendored, pinned and referenced paths (157,036,364 B). The earlier version of
    this step listed 100 of them:
    - RAINBOR 6, LIGHT 13 (including the two warped PNGs) and the civilisation first-run README;
    - alive run 1 (9 frames and 18 stones) and 32 intermediate alive `INDEX` versions;
    - the 9 retracted false-SHIN blobs and 12 intermediate release `INDEX` versions of stone-to-moss.

    The 292 added are 119 code, document and data versions, 74 workflow versions and 99 superseded
    sidecars. Most of the 119 are earlier versions, among them three of `RESULTS-INDEX.md`, two of
    `REPORT.md` and three of `colourqr_lightbank_b3.py`. The others are:
    - the empty transient alive frame;
    - the later `.gitignore` `52d8b923`;
    - a side-branch `publications/2026-10-15-lightbank/README.md`;
    - two blobs that are only on unmerged branches;
    - the three `hookwall-session-start` blobs of 2026-06-23. Two of them are vendored in step 11 and the
      third (`50af0e94`) is only on `refs/pull/7/head`.
  - The 16 files of `N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED` at `3079036` that seat 4's capsule
    packs and that are not already in aether or vendored here.

  The earlier version of this step pinned four inputs that vendored files read or cite. They are now
  vendored: `TRIAD-27-CHALLENGE-20261014.json`, `verify_public_seat3.js`, `two_horizon_matrix.py` (blob
  `2b0ed7e5`, the source that round 10 tests) and `audit_four_seat_release.py`. A scan of every vendored file
  of `asolaria-stone-to-moss` checked full paths, relative paths, unique base names and blob ids. It finds no
  other file of that repository that is not vendored, in aether or pinned.

## Dates, counts and notes

- **Files:** 771 vendored, 38,080,473 B, 766 distinct blobs. The largest is `MATRIX.hbi` (4,672,021 B),
  and none is over 50 MB. Three blobs are vendored at more than one path because each path is a separate
  upstream file:
  - the `.nojekyll.sha256` sidecar `e35e3d19`, at four paths;
  - the triad challenge `b098e2ce`, at two;
  - the trit-recurrence `RESULTS.json`/`RESULTS-R1.json` blob `003817dc`, at two.
- **Date range (per-blob beginning):** 2026-08-08 09:50:11 (`2670961`, LIGHT) to 2026-10-16 19:13:04
  (`fdafc29`, the BEHCS-1024 60D `independent_referee.py`). Times are the committer time of the commit that
  first introduced the blob on any ref, in -03:00. For all 771 vendored rows and the 994 rows of
  PROVENANCE's pinned tables, the last line of `git log --all --find-object` is also the earliest commit.
- **Sidecars:** 207 of the vendored files are upstream `.sha256` files. 206 are sidecars, and each agrees
  with the measured bytes of its companion: 184 companions are vendored, 16 are the pinned stone bodies and
  6 are in aether. The 207th is the four-line `CHECKSUMS.sha256` manifest of the trit-recurrence stones,
  and `sha256sum -c` passes for it.
- **Completeness of `asolaria-stone-to-moss`:** every path at `97174e7` is vendored, in aether or pinned,
  and so is every blob that ever stood at those paths or at a path that never reached `main`. The tracker
  bot's 25 earlier rewrites each of `STATUS.md` and `latest.json` are the only exception.
- **Completeness of the small repositories:** every path ever committed to `RAINBOR`, `LIGHT---lIFEds6-7`,
  `THE-STAR-PORTS`, the Glyphs repository, `asolaria-quantum-universe-alive` and
  `asolaria-civilisation-matrix` is vendored here or already in aether. None of them ever held a `.rs`,
  `.py` or `.js` file on any ref.
- **To check this directory:** run `sha256sum -c UPSTREAM.sha256` here, and `git hash-object --no-filters`
  on each `vendor/` file against the `blob` column of `PROVENANCE.md`.

## Not found (goes to step 14's list)

None of these is in any public repository searched (every ref of the eight source repositories, plus the
Asolaria mirror for the hooks). Each item says where it is expected to live, on owner or ACER machines.

- **The system vault `ASOLARIA-SYSTEM-2026-08-08.gguf`.** No `.gguf` or `ASOLARIA-SYSTEM` path is on any
  ref of the eight repositories. aether has nothing of that name or of its size (1,718,833,056 B). It is
  pinned by its sealed receipt, and the owner is to locate it.
- **The stone-to-moss smelter kernel** that wrote `stone-min-01` to `08` (Rust 1.81, the `DATA_BASE = 2592`
  fix). The first `.rs` file ever committed to `asolaria-stone-to-moss` is from 2026-10-15 14:03. It is on
  the ACER seat ACER-CLAUDE-FABLE5 (pid `8467a937cba309f7`).
- **The alive container and its frame generator.** The repository's 61 paths are outputs, the README and
  sidecars. They are on the ACER seat.
- **The civilisation-matrix and RIME-SPHERES kernel.** The repository's 11 paths are receipts and the
  README. They are on the ACER seat.
- **The RAINBOR residual predictor**, the Python left+up−upleft script behind
  `QUANT-THE-UNIVERSE-RESIDUALS`. RAINBOR and LIGHT hold no `.py` on any ref. It was run by the LIRIS/ACER
  session of 2026-08-08.
- **THE-STAR-PORTS lighting run and its 70 connector files.** The repository's 12 paths are the receipt,
  the index and the README. They are in the ACER (ROY) connector directory.
- **The tables the Glyphs repository is named for** (`alphabet-1024.json`, `atlas-canonical-1024.hbp`, the
  HG256 core table and the 34 codebooks). The repository's six paths are the star port only. They are on
  the ACER, Falcon or Liris seats.
- **The eight node lifecycle hooks that hookwall-edge ports** (the `.mjs` files). They are in neither
  `asolaria-federation-1024` nor the Asolaria mirror (all 132 refs). They are in ACER's Claude Code hooks
  directory.
