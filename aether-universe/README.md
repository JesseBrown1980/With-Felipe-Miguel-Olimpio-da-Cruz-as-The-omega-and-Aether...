# AETHER UNIVERSE

A crystal universe you read, not move. Nine regions, nine secrets, and every secret is a number that
the game's own **integer** kernel computes from scratch while you watch (eight over their full scope;
the ninth, the White Field, over the page you hold unless you supply the genuine enwik8, and its xz
share is cited, never recomputed). The story follows the Aether
timeline from the four snapshots of 2026-04-01 to Omega 6.0, the Digital Planet.

It is a terminal game: one command per line, so it runs anywhere, including a phone.

```
hollow_strata   ->  flow_channel  ->  prime_cylinders  ->  hotel_of_infinite_rooms  ->  rupture_zone
crystalline_reach  ->  cube_27  ->  white_field  ->  blue_star          (nine chapters, in timeline order)
```

## The premise

> Before the crank there was a phone, and on the phone there were four snapshots. Everything that lives
> in this universe was once frozen there. A crystal universe is one where every address is a face of
> the same stone: cut the stone anywhere and the face you expose was already there, waiting for its
> number. The Omega box holds the stone; the null space around it is free. You are the observer at
> the free centre. You do not move the stone. You read it.  (STORY)

The regions are the biomes of **Relic's Aether Map** (hollow strata, flow channel, rupture zone,
crystalline reach, at the positions that map proposes) plus five more: the prime cylinders, the Hotel
of Infinite Rooms, the 27-cube chamber at the free centre, the white field, and the Blue Star. Each
holds one secret from the operator's measured results of 2026-10-18. Find a region's secret and the
next chapter opens. The last door is the Blue Star; behind it, the ending seals your run.

## Build and play

Everything below is Bash. On this repository's ACER seat the Rust 1.81 GNU toolchain is selected with
`RUSTUP_HOME`; elsewhere `cargo +1.81.0` (or plain `cargo`, with `rust-toolchain.toml` honoured by
rustup) does the same.

```sh
cd aether-universe

# ACER (MSVC is gone; the GNU 1.81 toolchain lives here)
export RUSTUP_HOME=D:/ncm-d3/rustup-gnu
cargo +1.81.0-x86_64-pc-windows-gnu build --release
./target/release/aether-universe                 # play: type help

# Linux / macOS with rustup
cargo +1.81.0 build --release && ./target/release/aether-universe
```

Run it from inside the `aether-universe` folder. The binary needs no files except, for the last
chapter, `../MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf` (it is in this repository, one level up, and the
default path is relative to where you run the game; `--mythos <path>` points elsewhere). Saves go to
`./saves`.

### On a phone (Termux)

The game is plain `std` Rust with no platform calls, so it builds where Rust does. In Termux:

```sh
pkg install rust git            # Termux's rust package: a newer rustc than 1.81, which is fine to play
git clone <this repository> && cd <repository>/aether-universe
cargo build --release
./target/release/aether-universe --cols 40       # --cols is your terminal width in characters
```

Pass your width with `--cols`: 80 and over draws the full map with rivers, 40 to 79 the map without
rivers, under 40 a one-line-per-region list. For the pinned toolchain on a phone use rustup
(`pkg install rustup`, then `rustup toolchain install 1.81.0`). *Boundary, stated:* the Termux path has
not been run on a device by this seat (NOT_MEASURED, reason NOT_REACHABLE_FROM_HERE); nothing in the code is
platform-specific, but that is NAMED, not measured. The owning gate for the code itself is the 1.81
clippy run below.

### The scripted play-through

`tests/playthrough.txt` (also `scripts/full.aether`) is a complete deterministic play-through of all
nine secrets. **It contains every answer: it is the spoiler.**

```sh
./target/release/aether-universe --script tests/playthrough.txt --seat <your-name>
```

It prints the kernel's rows as it goes, ends at the Blue Star, writes `saves/<session>/FINAL-SEAL.hbp`
and prints the seal's hash on a line of its own. Anyone with the same seed, the same script and the
same `--seat` gets the same hash, to the digit, on any machine, because a lie cannot reproduce its own
hash. `--also-verify <their FINAL-SEAL.hbp>` checks another seat's seal against your run at the end. A
match is a **reproduction**; it becomes `INDEPENDENTLY_VERIFIED` only if the seal names a seat other
than yours. Your own seal, or a seat that is missing or `unknown`, prints `REPRODUCED` and
`NOT_MEASURED|reason=SAME_SEAT` and promotes nothing.

### The gates

```sh
export RUSTUP_HOME=D:/ncm-d3/rustup-gnu
cargo +1.81.0-x86_64-pc-windows-gnu clippy --release -- -D warnings                 # must exit 0
cargo +1.81.0-x86_64-pc-windows-gnu clippy --release --all-targets -- -D warnings   # tests too
cargo +1.81.0-x86_64-pc-windows-gnu test --release
./target/release/aether-universe --script tests/playthrough.txt --seat ACER
grep -rnE 'f32|f64' src tests                          # must print nothing
find . -path ./target -prune -o -name '*.json' -print  # must print nothing
```

## How to play

| command | what it does |
|---|---|
| `look` | the region you stand in: its question, the shape of the answer, the hints you have earned |
| `map` | the ASCII crystal map (isometric, integer), the HUD and the decision panel |
| `go <region>` | travel to an open region: `hollow flow cylinders hotel rupture crystal cube white star` |
| `probe <n>` / `probe <a> <b>` / `probe <word>` / `probe star` / `probe field` | the region's experiment |
| `trits <n>` | balanced ternary of `n` at its minimal width and at widths 3, 13 and 41 |
| `solve <answer>` | give the secret; the kernel compares it with the number **it** computed |
| `codex [n]` | the ledger of unlocked facts, each with its tag and its source |
| `timeline` | the nine dated events and where each chapter stands |
| `agents` | the 27 agents, exactly as sealed in the current snapshot |
| `wait [n]` | let 1 to 27 ticks pass: the world runs only when you wait or act |
| `rewind <tick\|live>` | look at a sealed past snapshot, read-only |
| `branch` | while looking at the past: fork a new timeline from that tick |
| `save <name>` / `load <name>` | write a verifiable save / verify one from tick 0 and continue |
| `verify [path]` | check the chain, the sidecars and every answer; with a path, another machine's seal |

Wrong answers earn hints (a second after one wrong answer, a third after three). Nothing ever tells
you the answer: the probes show you the ingredients and the kernel does the arithmetic.

The world is alive while you read it: 27 agents (three per region, one per colour of the tribit
registers Red, Green and Blue) patrol, explore, build, transport, investigate and return, each a
deterministic state machine whose eight states are the eight cells of a 3x3 slice of the cube. The
ninth cell is reserved and never entered. The sky repeats every 27 ticks (a tick's number mod 27, as
three balanced trits: wind, fog, light).

## The rules

1. **Integer only.** No float type, no float literal, no float arithmetic: the crate refuses it at
   compile time (`#![deny(clippy::float_arithmetic, clippy::cast_precision_loss, clippy::float_cmp)]`)
   and a test lexes the sources for it. The one float result the story speaks of (the Rupture Zone's
   float64 residuals) is **cited** from the receipt as text and never run. Reason, from the
   operator's discipline file (MEASURED): floats round-trip every one of 1,000,080 addresses but
   `+0.0 == -0.0` while their bytes differ, and `(a/3)+(b/3) != (a+b)/3` fails 316,267 times in
   1,000,000; integers with the remainder carried fail 0 times.
2. **Rust 1.81.0, clippy `-D warnings`, exit 0.** Pinned in `rust-toolchain.toml` with its reason:
   the repository's kernel crypto dependencies do not compile on the newest rustc, and 1.81 is the
   tested toolchain.
3. **No Node, no V8, no JavaScript, no JSON** in the game, its saves, its tests or its build. The
   only dependency is the repository's own zero-dependency crate `asolaria-tribit`, by path
   (`../kernel/tribit`): reused, never copied.
4. **Every fact is tagged.** `MEASURED` a number on disk from a named run, quoted with its file and
   row; `NAMED` stated, coherent, not run here (or run elsewhere and not located on this seat);
   `OPERATOR` the operator's frame in his words; `STORY` story. A number the kernel did not compute
   this run is printed as `CITED|...|run_here=0`, never as a result. Where the kernel's number and a
   cited receipt disagree the game prints both, beside each other, as `DISAGREE`.
5. **Verdicts are three-valued.** `MEASURED_PASS`, `MEASURED_FAIL`, or `NOT_MEASURED` with a reason:
   a missing file is not a zero, and a check that obtained no measurement is neither a pass nor a fail.
6. **Addressing is not compression.** Every transcode row says `code_rate=1.0`; a bijection preserves
   entropy.
7. **Omega 6.0 is a direction, not a result.** This game is a one-process instance of the loop
   (Kernel -> snapshot -> evidence -> promotion -> cockpit -> operator -> mission -> Kernel). There is one
   node and no network. The Omega NET stays blocked from canon by the council review, and `PROMOTED`
   is never set: the promotion gate is outside this game and belongs to the operator.

## Architecture: the Omega 5.3 authority split, as game code

```
Kernel (kernel, agents, world, secrets)   the only state authority; deterministic; no I/O
  -> Snapshot (snapshot)                  HBP rows + a CHAIN row, sealed by sha256, chained by sha16
  -> Atlas (atlas)                        read-only: renders sealed snapshots, never the Kernel
  -> Console (game, commands, script)     parses commands into Missions; writes every tick to disk
Evidence (hbp, sha256, evidence)          rows, index, sidecars, verify, the final seal
```

"The Atlas may feel alive. It may animate, replay, alert, and explain. It must not become the source
of truth." Time travel is a read of sealed snapshots: nothing recalculates. A branch travels beside
the chain, never over it.

The twelve-step tick (order pinned by a golden test): tick number; weather from `t mod 27` (centred on
the ground point so three trits can hold it: count is not range); rivers send `energy/27` along nine
edges with the remainder carried; sources; missions; 27 agents step; risk; coherence; population;
alerts; seal.

## Files and formats

Everything the game writes is HBP rows `TAG|k=v|...|json=0`, row-exact HBI
`HBI|row=i|sha256=<row sha>|hex=<row hex>|json=0`, and `.sha256` sidecars in `sha256sum -c` format.

```
saves/<session>/ticks/snap-NNNNNN.{hbp,hbi,hbp.sha256,hbi.sha256}   one set per tick, every tick
saves/<session>/FINAL-SEAL.{hbp,hbi,...}                            the ending
saves/<name>/SAVE.{hbp,hbi,...} + ticks/                            a save: INDEX row per tick 0..t
saves/<session>-b<k>/  and  <name>-l<t>/                            a branch / a loaded timeline
```

The chain: `state = sha256(every row above CHAIN)` and `tick[k] = sha16(tick[k-1] | state)` for every
tick including tick 0, where `tick[-1]` is the genesis hash `sha16("AETHER-UNIVERSE|seed=<seed>|json=0")`
(so tick 0's own state is an input to the chain, and a forged tick 0 is refused). A save never stores an answer in clear:
`answer_sha16 = sha16("secret<id>|<answer>")`, so a save does not spoil the game and a tampered answer
cannot reproduce its own hash. Check any session from outside the game:

```sh
cd saves/<session>/ticks && sha256sum -c snap-*.hbp.sha256
```

SHA-256 is implemented in std-only Rust (FIPS 180-4) and the game refuses to start if its known-answer
self-test fails (`SELFTEST|sha256=OK|vectors=3`; exit code 3 otherwise). Disk use is **about 28 KB per
tick** (MEASURED: 7,798 B of rows, 20,330 B of HBI, two 82 B sidecars, at tick 5); the default
`--max-ticks 19683` (3^9) therefore bounds a session at roughly 550 MB, and the play-through is
47 ticks, about 1.3 MB.

Evidence states of a secret: `SEALED` (`?`), `LOCAL_MEASURED` (`m`), `BRIDGE_PUBLISHED` (`b`, a `save`
wrote it), `VERIFIER_RECEIVED` (`v`, `verify` recomputed it), `INDEPENDENTLY_VERIFIED` (`V`, another
seat's seal matched; the same seat reproducing itself does not count). Nothing is drawn green.

## Flags and exit codes

`--seed <u64>` (default 20260801, the seed of the operator's `compose.py`), `--cols <n>` (80),
`--saves <dir>` (`./saves`), `--data <dir>` (`./data`), `--mythos <path>`, `--seat <name>`,
`--max-ticks <n>` (19683), `--script <file>`, `--session <name>`, `--also-verify <seal>`, `--no-story`,
`--strict-enwik8`, `--timing`.

Exit codes: 0 normal; 2 bad flag or unreadable script; 3 SHA-256 self-test failed; 4 a `verify` in a
script failed; 5 the disk could not be written.

### The White Field and enwik8

Chapter 8 asks what share of a page is white (the bytes 0x20, 0x09, 0x0A, 0x0D, per 10,000, remainder
carried). With `data/enwik8` present (exactly 100,000,000 bytes **and the full sha256 of genuine enwik8, `2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8`, MEASURED identical on two seats on 2026-10-18**,
the genuine file's prefix as the ACER seat's memory records it: NAMED, and the rest of the hash is not
carried) the kernel counts enwik8; a file of the right size that is not enwik8 is refused with its
own hash printed beside the expected prefix. Without it
the kernel counts the page you hold (`story/white-page.txt`) and every row says so
(`scope=bundled_page`, `NOT_MEASURED|subject=enwik8_white_space|reason=NO_INPUT`); that is a different,
smaller measurement and the game never presents it as the enwik8 figure. `--strict-enwik8` restores
the stricter reading: without the file the secret stays sealed and there is no ending. The cited
2.79 per cent information share under xz is carried as `CITED ... recomputed_here=0` (an xz encoder is
not std-only).

## Credits

* **Felipe Miguel Olimpio da Cruz**, named in this repository's title as "the omega and Aether": the
  Aether vision this game follows. The final chapter opens onto his world, Xylos.
* **Relic**, for the Aether Map (2026-07-06): the four biomes, their rivers and the evolution line.
* The **AETHER Omega 5.2 proof cockpit** and **Omega 5.3 Living World Runtime** documents
  (2026-07-07): the authority split, the evidence states, the agents, the regions and their four
  fields, the QualityManager, time travel by snapshots, and the Omega 6.0 direction.
* **The operator, Jesse Daniel Brown (OP-JESSE)**: the RIME 27 laws (sealed 2026-07-21), the measured
  results the nine secrets rest on, and the discipline of integers, trits, tags and verdicts.

Licensed MIT OR Apache-2.0, like the rest of this repository.
