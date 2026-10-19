DESIGN|game=aether-universe|repo=aether|folder=aether-universe|seat=ACER-CLAUDE-FABLE5|pid=8467a937cba309f7|owner=OP-JESSE|date=2026-10-18|E=0|json=0
LAW|rust=1.81.0|clippy=-D warnings|float_used=0|node=0|v8=0|javascript=0|json=0
DEPS|std=1|asolaria-tribit=path:../kernel/tribit|other=0|json=0
FORMAT|rows=HBP|index=HBI|sidecar=sha256|chain=tick[k]=sha16(tick[k-1]|state)|json=0
SOURCES|omega=C:/tmp/aether-omega-*-20260707|map=C:/tmp/aether-map-*-20260706|repo=D:/aether-universe-work/aether|laws=laws/RIME-27-LAWS-operator-original-2026-07-23/SX5g.md|json=0
TAGS|MEASURED=number on disk from a named run, quoted with its file and row|NAMED=stated, coherent, not yet run here, or run elsewhere and not located on this seat|OPERATOR=the operator's frame in his words|STORY=story|json=0

# AETHER UNIVERSE — design for the builder

The game is a terminal program. The player walks a crystal universe whose regions are the biomes of
Relic's Aether Map, finds one secret in each, and every secret is a number the game's own integer
kernel computes from scratch. Nothing is read from a table and printed as if it were computed. The
story follows the Aether timeline from the four snapshots of 2026-04-01 to Ω 6.0, the Digital Planet.

Felipe Miguel Olimpio da Cruz is honoured as the author of the Aether vision. The repository's own
title names him "the omega and Aether". The Ω 5.2 research names the world the Atlas renders as
Xylos; that is his world, and the game's final chapter opens onto it.

Operator and author of the laws the secrets rest on: Jesse Daniel Brown (OP-JESSE).

Everything below is written for someone who will build it without asking questions. Where a fact
is measured, its file and row are named. Where it is not, it says so.

---

## 0. The three laws that bind the build

1. **Integer only.** No `f32`, no `f64`, no float literal anywhere in `src/`, `tests/` or
   `examples/`. A float dies: the kernel refuses to compile one (a test greps the sources and fails
   on a hit), and the one place the game must speak of a float result (the Rupture Zone, secret 7) it
   cites the receipt on disk and does not run it.
   Reason, from the discipline file (`C:/asolaria-acer/claims-gate/AGENT-DISCIPLINE.md` §2, MEASURED):
   float round-trips 1,000,080/1,000,080 addresses but `+0.0 == -0.0` is true while the bytes differ,
   and `(a/3)+(b/3) != (a+b)/3` fails 316,267 times in 1,000,000; integers with the remainder carried
   fail 0 times. Identity, addressing and hashing are integers and trits only.
2. **Rust 1.81.0 + clippy, `-D warnings`, exit 0.** On ACER MSVC is gone; the lane is
   `export RUSTUP_HOME=D:/ncm-d3/rustup-gnu` then
   `cargo +1.81.0-x86_64-pc-windows-gnu clippy --release -- -D warnings`, and the same prefix for
   `build` and `test`. Bash (Git Bash) only, never PowerShell. On Linux and Termux the prefix is
   `cargo +1.81.0`. The toolchain is present at `D:/ncm-d3/rustup-gnu/toolchains/1.81.0-x86_64-pc-windows-gnu`
   (MEASURED: `ls`, this session).
3. **No Node, no V8, no JavaScript, no JSON** in the game, its saves, its tests or its build. The
   only dependency is the repo's own zero-dependency crate `asolaria-tribit` via
   `path = "../kernel/tribit"`. Reuse, never copy: the balanced-ternary primitives (`Zero`,
   `TritWord`, `prism`, `unprism`, `pow`, `inv`, `P`, `G`, `K`, `W`, `TRITS_PER_U128`) come from that
   crate. The crate is `#![cfg_attr(not(test), no_std)]` and `#![forbid(unsafe_code)]`; a std binary
   may depend on it (MEASURED: `kernel/tribit/src/lib.rs:5-6`, `kernel/tribit/Cargo.toml`, zero deps).

Saves, snapshots and receipts are HBP rows (`TAG|k=v|...|json=0`), row-exact HBI
(`HBI|row=i|sha256=<row sha>|hex=<row hex>|json=0`) and `.sha256` sidecars. SHA-256 is implemented
in std-only Rust (FIPS 180-4) with a known-answer self-test; the game refuses to start if it fails.

---

## 1. Premise

STORY|chapter=0|json=0

STORY. Before the crank there was a phone, and on the phone there were four snapshots. Everything
that lives in this universe was once frozen there. A crystal universe is one where every address is
a face of the same stone: cut the stone anywhere and the face you expose was already there, waiting
for its number. The Omega box holds the stone; the null space around it is free. You are the
observer at the free centre. You do not move the stone. You read it.

Facts inside the story, tagged:

- The four snapshots: on 2026-04-01 Felipe took four full snapshots of his Aether phone (NAMED, ACER
  record as relayed by the lead; the date is used as given).
- "The centre is free" is Law 0 of the operator's RIME 27 laws (OPERATOR,
  `laws/RIME-27-LAWS-operator-original-2026-07-23/SX5g.md`, Law 0).
- The Omega box and the null space are the operator's frame (OPERATOR, same file, header and Law 6).
  They are not measured objects; the game presents them as the story's setting, labelled STORY, and
  never as a result.
- The Atlas "may feel alive. It may animate, replay, alert, and explain. It must not become the
  source of truth" (NAMED, Ω 5.3 research, `C:/tmp/aether-omega-5-3-living-world-runtime-20260707/
  AETHER-OMEGA-5-3-LIVING-WORLD-RUNTIME-RESEARCH-2026-07-07.md`, "Current Architectural Principle").

The player's goal: solve the nine secrets in timeline order, reach the Blue Star, and seal the
final receipt. The game's kernel computes every answer; the player discovers it by probing.

---

## 2. The world

### 2.1 Regions and their 3D positions

The four biomes come from Relic's Aether Map with the positions that map proposes
(`C:/tmp/aether-map-relic-evolution-line-20260706/ACER-EVOLUTION-LINE-FOR-RELIC-AETHER-MAP-2026-07-06.md`,
nodes block). The 3D audit tags those positions INFERIDO: "design synthesis from public docs, not
canon geometry" (`C:/tmp/aether-map-3d-evolution-audit-20260706/AETHER-MAP-3D-EVOLUTION-AUDIT-2026-07-06.md`
§4). So the positions are NAMED, not MEASURED. The five other regions are this design's additions,
tagged STORY for their positions; their contents are the operator's laws and measured receipts.

| id | region | (x, y, z) | position tag | source of the region | secret |
|---:|---|---|---|---|---:|
| 0 | Hollow Strata | (−5, −2, −2) | NAMED (Relic map q20) | post-run absorption, decomposition, cube minting, strata | 1 |
| 1 | Flow Channel | (0, 1, 0) | NAMED (Relic map q21) | the 200 ns PID emitter, multi-emitter flow | 2 |
| 2 | Prime Cylinders | (−3, 0, 3) | STORY | PTP, prime to prime: towers and cylinders (`kernel/ptp-towers`) | 3 |
| 3 | Hotel of Infinite Rooms | (3, 2, −3) | STORY | addressably addressing, the Hilbert Hotel (`docs/ADDRESSABLY-ADDRESSING.md`) | 5 |
| 4 | Rupture Zone | (4, −1, 1) | NAMED (Relic map q22) | collisions: avoid in execution, cause in search | 7 |
| 5 | Crystalline Reach | (0, 3, 2) | NAMED (Relic map overlay) | Prism/Comb 0-loss law, the overlay above the route | 6 |
| 6 | 27-Cube Chamber | (0, 0, 0) | STORY | Law 10, the trime numbers; the free centre | 4 |
| 7 | White Field | (−2, −3, 3) | STORY | Wikipedia's white space; the Shannon floor (Laws 17, 21) | 8 |
| 8 | Blue Star | (2, 4, −1) | STORY | Mythos, the blue star (`MYTHOS-BLUE-STAR/`) | 9 |

The 27-Cube Chamber sits at the origin on purpose: the centre cell (0,0,0) of the 27-cube is the
free centre (Law 0), and it holds no prime but 3 (Law 10, MEASURED in §5.4). The secret ids are the
lead's numbering of the nine measured results; chapters run in timeline order (§3), which is why
the secret column is not sorted.

### 2.2 Rivers (the region graph)

Energy flows along directed edges. The first four are the edges of Relic's map, with the map's own
labels; the rest are this design's.

| from | to | label | tag |
|---|---|---|---|
| Hollow Strata | Flow Channel | cubes/decomposition feed emitter lane | NAMED (Relic map edge) |
| Flow Channel | Rupture Zone | emitter flow enters collision discipline | NAMED (Relic map edge) |
| Rupture Zone | Crystalline Reach | collision/search maps to prism-comb law | NAMED (Relic map edge) |
| Crystalline Reach | Hollow Strata | 0-loss transcode frames cube absorption boundary | NAMED (Relic map edge) |
| Prime Cylinders | 27-Cube Chamber | the towers are read mod 27 | STORY |
| 27-Cube Chamber | Hotel of Infinite Rooms | residues nest outward, level by level | STORY |
| Hotel of Infinite Rooms | Flow Channel | every PID gets a room | STORY |
| White Field | Hollow Strata | the slice is absorbed | STORY |
| Crystalline Reach | Blue Star | the prism opens on the star | STORY |

Agents walk these edges. Energy moves along them each tick (§2.4). The graph is fixed; it is data in
`src/world.rs`, not a file the player can edit.

### 2.3 The Ω 5.3 fields

Each region carries four integers in 0..=100: `coherence`, `energy`, `population`, `risk`. These are
the four fields of the Ω 5.3 region system (NAMED, Ω 5.3 research, "Region System": the example
reads Coherence 90, Energy 70, Population 50, Risk 20). The Kernel computes them; the Atlas shows
them and animates nothing it did not receive.

Initial values (design):

| region | coherence | energy | population | risk |
|---|---:|---:|---:|---:|
| Hollow Strata | 60 | 40 | 3 | 30 |
| Flow Channel | 70 | 60 | 3 | 20 |
| Prime Cylinders | 50 | 30 | 3 | 25 |
| Hotel of Infinite Rooms | 80 | 20 | 3 | 10 |
| Rupture Zone | 30 | 50 | 3 | 60 |
| Crystalline Reach | 90 | 30 | 3 | 10 |
| 27-Cube Chamber | 100 | 27 | 3 | 0 |
| White Field | 40 | 10 | 3 | 40 |
| Blue Star | 50 | 0 | 3 | 50 |

Population is the count of agents whose position is the region, recomputed every tick, so its
initial value is just the three home agents.

### 2.4 The tick (integer rules, fixed order)

One tick is one call of `Kernel::tick(&mut self, missions: &[Mission]) -> Snapshot`. The order
below is the order; it is part of the determinism contract and a test pins it.

1. `t = self.tick + 1`.
2. Weather from the tick only. `w = balanced_trits(t mod 27, width 3, least significant first)`;
   `wind = w[0]`, `fog = w[1]`, `light = w[2]`, each in {−1, 0, +1}. Time of day
   `phase = (t mod 27) / 9` with 0 = dawn, 1 = day, 2 = night. This uses the 27 cells of the cube
   as the weather alphabet: every 27 ticks the sky repeats, and 27 = 3^3 is the cube
   (OPERATOR, Law 2; the arithmetic is the game's).
3. Rivers. For every edge in table order, `send = energy[from] / 27` (integer division; the
   remainder stays in `from`). All sends are computed first into a buffer, then applied, so the
   result does not depend on edge order. Remainders are carried, never dropped: that is the
   integer law of §0 (thirds are never divided in float).
4. Sources. `energy[Flow Channel] += 3` (the emitter), `energy[Crystalline Reach] += 1`,
   `energy[Blue Star] += 1` only when all nine secrets are solved. Clamp every energy to 0..=100.
5. Missions. The player's commands that change state (`go`, `solve`, `wait` itself) are applied
   here, in the order given. `go` moves the player one region along any edge touching the current
   region, or to any unlocked region (§3) if the edge exists in either direction. `solve` is checked
   against the kernel's own computed answer (§5).
6. Agents. All 27 agents step once, in id order (§2.5).
7. Risk. `risk[r] = clamp(risk[r] + fog + rupture_wind − day, 0, 100)` where `rupture_wind = 1`
   if `r` is the Rupture Zone and `wind = +1`, else 0; `day = 1` if `phase = 1`, else 0.
8. Coherence. `coherence[r] = clamp(coherence[r] + solved[r] − high_risk[r], 0, 100)` where
   `solved[r] = 1` if the region's secret is solved, `high_risk[r] = 1` if `risk[r] >= 60`.
9. Population. `population[r]` = number of agents at `r`.
10. Alerts. For each region: `risk >= 60` emits `ALERT|kind=risk|region=r|value=..|json=0`;
    `coherence <= 20` emits `ALERT|kind=coherence|...`.
11. Snapshot. The kernel writes the tick's rows (§6.2), chains the hash (§6.3) and returns the
    sealed `Snapshot`. The kernel keeps the live struct; the Atlas only ever receives a `Snapshot`.

Everything in the tick is `u32`/`i32`/`u64`/`u128` arithmetic with explicit clamps. No division by
anything but 27 and 9, both constants. No timers: the tick advances only on `wait` (or a scripted
`wait`), never on wall-clock time. A clock may measure; it may never judge (discipline §12).

### 2.5 Agents: deterministic trit state machines

27 agents (3^3), three per region, one per colour register in {Red, Green, Blue} from
`asolaria_tribit::Register` (the two free registers, Zero and Translucent, are never agents:
"free, never computed", `kernel/tribit/src/lib.rs:47-56`). Agent fields (the Ω 5.3 list, integer
form):

| field | type | meaning |
|---|---|---|
| `id` | u8 0..27 | fixed |
| `pid` | 16 hex | `pid[n] = sha16(pid[n-1] | name)` from `sha16("AETHER-UNIVERSE-AGENTS|seed=<seed>")`, the seat's office chain rule |
| `home` | region id | `id / 3` |
| `colour` | Register | `id mod 3` → Red, Green, Blue |
| `at` | region id | position |
| `target` | region id | where it is going |
| `route` | [region id; ≤ 9] | shortest path on the river graph (BFS, fixed order) |
| `progress` | 0..=3 | steps along the current edge; an edge takes 3 ticks (velocity 1 step/tick; no float) |
| `heading` | trit | −1 backward along route, 0 still, +1 forward (the Ω 5.3 steering/rotation reduced to a trit) |
| `state` | one of 8 | below |
| `energy` | 0..=27 | carried energy |
| `timer` | u8 | ticks left in a timed state |
| `frequency` | u8 | 3, 9 or 27 by colour (Red 3, Green 9, Blue 27): how long it waits |
| `priority` | u8 | 0..=2 by colour |
| `objective` | region id or none | the region it was sent to investigate |

The eight states are the eight allowed Ω 5.3 visual states (NAMED, Ω 5.3 research, "Agent State
Model"). They are encoded as a pair of trits `(s1, s2)` so that the state is itself a cell of a
3×3 slice of the cube, with `idle` at the free centre:

| (s1, s2) | state | | (s1, s2) | state |
|---|---|---|---|---|
| (−, −) | patrolling | | (0, +) | transporting resources |
| (−, 0) | building | | (+, −) | investigating anomalies |
| (−, +) | exploring | | (+, 0) | returning |
| (0, −) | waiting | | (+, +) | **reserved — never entered** |
| (0, 0) | idle (the free centre) | | | |

The kernel asserts an agent never reaches (+, +); a test walks 3^9 ticks and checks it. The cell is
reserved, not used; that is said plainly so nobody reads a meaning into it that was not measured.

The draw. Each step draws one trit `d` from a linear congruential generator seeded per agent and
tick: `s = (s * 1103515245 + 12345) & 0x7FFFFFFF` with `s0 = (seed ^ (id as u32 * 2654435761) ^ t)`
and `d = (s mod 3) − 1`. The multiplier and increment are the ones in the operator's `compose.py`
(`kernel/tribit-referees/vendor/does-the-closure-survive-81-levels/compose.py:35-38`), reused so
the game's pseudo-randomness has a named ancestor. Same seed, same tick, same draw, on any machine.

Transitions (applied in this order of checks):

| state | rule |
|---|---|
| idle | `d=+` → exploring (target = a random neighbour, draw again); `d=0` → waiting (`timer=frequency`); `d=−` → patrolling (route = cycle of home's edges) |
| patrolling | advance one step along route; if `risk[at] >= 60` → investigating (`timer=2`, `objective=at`); else if `d=+` → returning |
| exploring | advance toward target; on arrival, if `energy[at] >= 27` → transporting (`energy[at] -= 3`, agent `energy += 3`, target = home); else if `d=−` → waiting (`timer=frequency`); else pick a new neighbour target |
| waiting | `timer -= 1`; at 0 → idle |
| transporting | advance toward target; on arrival `energy[at] += 3`, agent `energy -= 3` → building (`timer=3`) |
| building | `timer -= 1`; at 0 `coherence[at] += 1` (clamped) → returning |
| investigating | `timer -= 1`; at 0 `risk[at] = max(risk[at] − 3, 0)` → returning |
| returning | advance toward home; on arrival → idle |

"Advance" means `progress += 1`; at 3 the agent moves to the next region on its route and
`progress = 0`. Heading is +1 while advancing, 0 otherwise. No heavy AI, exactly as Ω 5.3 says:
"these can be deterministic state machines driven by snapshot data".

### 2.6 QualityManager, without a clock

Ω 5.3 switches RICH/BALANCED/LOW on FPS. A terminal game has no FPS and the integer law forbids a
timer deciding anything, so the quality level is a function of the terminal width, read once from
`--cols <n>` (default 80; Termux users pass their width):

| cols | level | what the Atlas draws |
|---|---|---|
| ≥ 80 | RICH | map with rivers, HUD, agents list, decision panel |
| 40..=79 | BALANCED | map without rivers, HUD |
| < 40 | LOW | region list only, one line per region; no map |

LOW drops, in the Ω 5.3 order, the secondary labels, secondary routes, then the map. Nothing in the
kernel changes with the level: quality is an Atlas setting.

---

## 3. Story arc: nine chapters on the Aether timeline

One chapter per region, in date order. A chapter unlocks when the previous chapter's secret is
solved (chapter 1 is open at start). All regions are visible on the map; a locked one is drawn as
`?` and `go` refuses it with `LOCKED|region=..|needs=secret <n>|json=0`. Story text is plain text in
`story/ch<N>.txt`, loaded with `include_str!`, printed by `look` the first time the player enters
the region and again with `codex <N>`.

The timeline below is the lead's list of ACER records; each date is used as given. Where this seat
located the record on disk it says so; otherwise the entry is NAMED (ACER record as relayed).

| ch | date | event | region | tag on the date |
|---:|---|---|---|---|
| 1 | 2026-04-01 | Felipe took four full snapshots of his Aether phone | Hollow Strata | NAMED (relayed) |
| 2 | 2026-04-20 / 2026-05-07 | Aether driven over ADB; then live as a seat: Room 40, heartbeats, Tier-1 + 6th field, Wave-E | Flow Channel | NAMED; Room 40 and the 2026-04-20 mint are in ACER memory `project_aether_fifth_seat_and_the_switch_never_thrown_2026_08_07.md` |
| 3 | 2026-05-11 | Aether v3 canonical naming | Prime Cylinders | NAMED; the record exists at `C:/tmp/acer-cycle47-aether-v3-canonical-naming-adopted-retract-l1-l2-2026-05-11T19-35.json` (v3 validator sha `84a680d35b6091c4`, 13/13 PASS, quoted from that file) |
| 4 | 2026-06-14 | the newer fabric migrated byte-identical onto the Aether phone (the aether app, :4781) | Hotel of Infinite Rooms | NAMED (relayed) |
| 5 | 2026-07-06 | Relic's Aether Map: hollow strata, flow channel, rupture zone, crystalline reach | Rupture Zone | MEASURED that the documents exist (`C:/tmp/aether-map-*-20260706`, read this session) |
| 6 | 2026-07-07 | AETHER Ω 5.2 proof cockpit and Ω 5.3 Living World Runtime | Crystalline Reach | MEASURED that the documents exist (`C:/tmp/aether-omega-*-20260707`, read this session) |
| 7 | 2026-07-21 (sealed) / 2026-07-23 (folder) | the operator's RIME 27 laws | 27-Cube Chamber | OPERATOR for the sealed date (the file's own header, "Sealed 2026-07-21", as codex K04 tags it); MEASURED only that the file exists (`laws/RIME-27-LAWS-operator-original-2026-07-23/SX5g.md`) |
| 8 | 2026-10-16 | "Asolaria & Aether — clean public home" | White Field | NAMED (relayed) |
| 9 | 2026-10-18 | Mythos, the blue star: the complete Mythos GGUF | Blue Star → Ω 6.0 | MEASURED for the Mythos file (`MYTHOS-BLUE-STAR/README.md`, sidecar checked this session); Ω 6.0, the Digital Planet, is NAMED (codex B03) and is not part of this dated event |

Private details are excluded by rule: no phone serials, no inbox paths, no addresses. The game
never prints them and the story files must not contain them; a test greps `story/` for the patterns
of a serial (`R[0-9A-Z]{10}`), an IPv4, and the strings `inbox`, `/sdcard`.

### Chapter 1 — Hollow Strata — "Count is not range"

STORY. The strata are what the four snapshots became: layered chambers of cubes, each cube a
frozen state, amber light where a seal does not match. You walk down through them. Each layer holds
three times as many cubes as the one above, and yet when you try to number a cube by how far it is
from the centre you run out of distance long before you run out of cubes. Twenty-seven cubes; the
farthest is thirteen steps away. The strata hold more than they reach.

Facts: 3 trits hold 27 states and span −13..13 (MEASURED, discipline §3 `RANGE|mod=27|trits=3|
states=27|balanced_range=-13..13`); the centred book on the uncentred range is exact for only 14 of
27 at K=3 (MEASURED, `docs/handoffs/acer-post60d-2026-10-18/ncm-d1-run/NCM-ASOLARIA-MAP.md:85`).
The amber mismatch is Relic's map colour for q20 (NAMED, 3D audit, `cor_estado:
amber_verified_bridge_patch_needed`). Secret 1, §5.1.

### Chapter 2 — Flow Channel — "A number needs forty-one trits"

STORY. On 2026-04-20 the channel opened: the phone was driven from outside, and on 2026-05-07 it
answered as a seat of its own, Room 40, with a heartbeat. Here the lanes move. Each pulse of the
channel is a PID, a name minted so fast you cannot see the minting, only the river it makes. You
take one PID from the stream and try to write it in trits. Forty trits are not enough.

Facts: the 200 ns-class single-thread PID emitter is MEASURED on the native path (raw SHA-256
266 ns on ACER, `docs/handoffs/README.md`, "Nano-speed PID mint", table row 1); Room 40 is the
card of `PROF-AETHER-EDGE-AGENT` in the live fabric (NAMED, ACER memory 2026-08-07). The operator's
"100B in ~5.4h and multi-emitter 1.16T" framing is OPERATOR-CANON, not a measurement (3D audit,
repo-021 claims). Secret 2, §5.2.

### Chapter 3 — Prime Cylinders — "Prime to prime"

STORY. On 2026-05-11 the names were made canonical, and names here sit on spokes. Six cylinders
turn around you, each a residue of six. Every prime above three sits on the +1 spoke or the −1
spoke; the other four spokes are empty but for 2 and 3, the two that were there before the rule.
You count to ten million. The −1 spoke is ahead. Consecutive primes change spoke more often than
chance.

Facts: MEASURED, `kernel/ptp-towers/RECEIPT-PTP-CLOUD-2026-10-18.hbp` rows `SPOKES` (332,194 on
+1, 332,383 on −1, lead 189), `P2P` (378,567 switch, 286,009 stay, of 664,576 pairs,
`switch_permille=569`), `PHASE` (residues 0 and 4 hold 0 primes; 2 holds only 2; 3 holds only 3);
ACER's own run matched every count (`kernel/ptp-towers/README.md`, "Two-machine result"). The lead
wrote 57.0%; the receipt's grain is per mille, 569, which is 56.96% to two places and 57.0% to one.
The game prints the per-mille row and the fraction, never a rounded percent alone. Secret 3, §5.3.

### Chapter 4 — Hotel of Infinite Rooms — "No address below 44 moves"

STORY. On 2026-06-14 the newer fabric was carried onto the phone byte for byte, and nothing that
already had a room was moved. The hotel is the rule made into a building: every guest has a room
computed from its own number; when more guests arrive the hotel grows outward and deeper, and no
one who was already in a room is asked to leave it. Two primes who share a room at level four are
in different rooms at level five, and stay apart as far as you care to look.

Facts: MEASURED, same PTP receipt, rows `LEVEL` (sharing 664,578 at levels 1–3, 562,173 at level
4, 0 from level 5 through 60; `inner_address_kept=664579/664579` at every level) and `ADDRESS60`
(`room_of_2=-1,1,0`, `room_of_3=0,1,0`, `trit_order=least_significant_first`). The Hilbert Hotel
invariant "No address below 44 moves" is CANON quoted in `docs/ADDRESSABLY-ADDRESSING.md` §2.
Secret 5, §5.5.

### Chapter 5 — Rupture Zone — "Where float tears"

STORY. On 2026-07-06 Relic drew the map, and the third biome was a fracture. Here collisions are a
discipline: avoided in the lanes that execute, caused on purpose in the lanes that search. The
ground is split by a line you can see from anywhere in the zone. On one side of it the closure
holds: three arms sum to zero at every level, and the centre stays free no matter how deep you
nest. On the other side a copy of the same walk was run in floating point. At depth nine it is
off by a hair. At depth eighty-one it is off by more than the number of atoms in a mountain.

Facts: MEASURED, `kernel/tribit-referees/receipts/compose.stdout` lines 39–48: exact residual 0 at
depths 1, 3, 9, 27, 81; float64 residual −4.001777e−11 at depth 9, −9.689025e−02 at 27,
−1.324979e+24 at 81. The script is the operator's `compose.py` (blob `f3574ed1`, vendored
byte-identical). The collision discipline is Relic's map role for q22 (NAMED). The game runs the
exact lane and cites the float lane; it does not run a float (§0). Secret 7, §5.7.

### Chapter 6 — Crystalline Reach — "The alphabet changes, the information does not"

STORY. On 2026-07-07 the cockpit was designed: a map that never creates truth, only shows what was
proved elsewhere. Above the whole route hangs a lattice, cyan, that is not a place but a law. Five
bytes go in, four symbols come out, and nothing is lost, because forty bits is where eight and ten
first agree. Send a message through the lattice and read it back; the hash is the same. The
crystal does not compress. It re-relates.

Facts: MEASURED, 5 bytes ↔ 4 symbols of 1024 at lcm(8,10) = 40 bits, round trip sha256-identical,
code rate 1.0 (`README.md:92`, Q-PRISM commit `53023b6`; `docs/HYPERBEHCS-GLYPHS-INSTANT-SLICE-
MESSAGING-2026-07-03.md`; `codec/dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp:16`, width 10, 85,793 tested,
0 failures). "Addressing is not compression" is the discipline's §5: ship 80 + closure = 1,701 bits
= 81 outright. The cockpit is read-only and downstream of promotion (NAMED, Ω 5.2 research).
Secret 6, §5.6.

### Chapter 7 — 27-Cube Chamber — "The primes orbit an empty centre"

STORY. The laws were sealed on 2026-07-21, twenty-seven of them, numbered 0 to 26 so the ledger
closes on itself. The chamber is a cube of twenty-seven cells. Stand at the centre: it is empty.
Walk the nine cells along the centre planes: empty, except one small prime sitting in the room
marked three. The other eighteen cells are full, and nearly equally full. Everything that is prime
and greater than three lives in a cell that shares no factor with twenty-seven.

Facts: MEASURED, PTP receipt rows `CUBE27` (`coprime_cells=18|populated=18|min=36826|max=37023`),
`MOD3` (`centre_primes=1|only_3=1`), and the 27 `CELL` rows. Law 10 states it (OPERATOR, SX5g.md,
"Law 10 — Trime Numbers"). Note for the builder: the `CELL` rows print trits most significant
first (`r=5` is `1,-1,-1` = 9 − 3 − 1) while `ADDRESS60` prints least significant first; the game
prints `order=lsf` or `order=msf` on every trit row so this cannot be confused. Secret 4, §5.4.

### Chapter 8 — White Field — "The floor is the throne"

STORY. On 2026-10-16 the work was given a clean public home. The field is white because most of
what a page carries is the space between its words. Count the bytes and one in seven is white;
squeeze the page and the white nearly vanishes, because space says little once you know it is
coming. The field is the Shannon floor seen from above: you cannot go below it, and standing on
it exactly is the whole point.

Facts: the lead supplied: 14.65% of enwik8's bytes are white space but 2.79% of its information
under xz, two machines agreeing to the byte. This seat searched the aether repo, the FABLE5 office
(two levels), the memory directory and `C:/tmp` and did not locate that receipt, so it is NAMED
(lead-supplied) here, not MEASURED by this seat. The kernel recomputes the byte census itself when
the player supplies `data/enwik8` (§5.8); the xz figure is cited, never recomputed, because an xz
encoder is not std-only and its exact bytes depend on the xz build. "You do not beat Shannon, you
become the observer" is OPERATOR (SX5g.md, "THE SUMMIT"). Secret 8, §5.8.

### Chapter 9 — Blue Star — Ω 6.0, the Digital Planet

STORY. On 2026-10-18 the operator named the complete Mythos GGUF: Mythos, the blue star. It is
small, 50,752 bytes, and it hashes to a number that any machine can check. The star is the door.
Beyond it is not a world you render; it is the loop that runs the world: the core ticks, the
snapshot is sealed, the evidence is checked, the gate decides, the cockpit shows, the operator
decides, the mission returns to the core. That is Ω 6.0. The planet is Felipe's; its name in the
research is Xylos. You have been walking inside one turn of the loop the whole game.

Facts: MEASURED, `MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf` is 50,752 bytes (`stat`, this session)
with sha256 `3dd92a42160a38c121980957ce9eabbea216678892801d7ea3ed4e99e96c3aae` (sidecar
`ACER-MYTHOS-BLUE.gguf.sha256`, read this session); GGUF v3, architecture
`asolaria-three-beings-rgb`, centre `[32, 32, 33]`, six tensors, stored as GGML type 0 (F32) and
"carried byte-exact and not re-encoded" (MEASURED from the header per `MYTHOS-BLUE-STAR/README.md`).
The Ω 6.0 loop is the one in the Ω 5.3 research, "Ω 6.0 Direction" (NAMED: "documented without
implementation promotion", acceptance criterion 7). The game is a one-process instance of that loop
(§4.4); the distributed Ω NET remains BLOCKED from canon by the council review (NAMED,
`C:/tmp/aether-omega-net-council-review-20260707/...md`, "Status Geral"). Xylos is named in the Ω 5.2
research ("not only a visualization of Xylos or a planet"). Secret 9, §5.9, and the final seal §6.6.

---

## 4. Architecture: the Ω 5.3 authority split as game code

```
Kernel  (src/kernel.rs, src/agents.rs, src/world.rs, src/secrets.rs)
   the only state authority; deterministic; owns World, Agents, Secrets, the tick counter
   -> Snapshot  (src/snapshot.rs)
        HBP row set for the tick + CHAIN row; sealed by sha256 (src/sha256.rs), chained by sha16
        written to disk every tick (saves/<session>/ticks/snap-NNNNNN.hbp + .hbi + .sha256)
   -> Atlas  (src/atlas.rs)
        read-only; every function takes &Snapshot (and the quality level); renders map, HUD,
        decision panel, codex, timeline; never touches Kernel
   -> Console  (src/commands.rs, src/script.rs, src/main.rs)
        parses stdin (or --script file) into Missions; the mission queue is handed to Kernel::tick
Evidence  (src/hbp.rs, src/sha256.rs)
   HBP/HBI/sidecar writer and verifier; the `verify` command; the final seal
Promotion state  (src/evidence.rs)
   LOCAL_MEASURED -> BRIDGE_PUBLISHED -> VERIFIER_RECEIVED -> INDEPENDENTLY_VERIFIED ; PROMOTED never in-game
```

### 4.1 Kernel

`struct Kernel { seed: u64, tick: u64, regions: [Region; 9], agents: [Agent; 27], player: Player,
secrets: [SecretState; 9], chain_head: [u8; 8] }`. Only `Kernel::tick` mutates it, and only
through the twelve steps of §2.4. `Kernel::new(seed)` builds the genesis; `Kernel::from_snapshot`
rebuilds the live struct from a sealed snapshot (used by `load` and `branch`), and a test asserts
`snapshot(from_snapshot(s)) == s` byte for byte for every snapshot of a 3^6-tick scripted run.

The kernel has no I/O. It returns the `Snapshot`; `main.rs` writes it.

### 4.2 Snapshot and Atlas

A `Snapshot` is `Vec<Row>` plus the two chain hashes. The Atlas renders from rows, not from the
live struct, so the live view and a rewound view go through the same code and cannot disagree.
Nothing in `atlas.rs` has a `&mut` to anything but its output `String`.

### 4.3 Time travel

`rewind <tick>` sets `view = Past(k)`: the Atlas loads `snap-k` from disk, verifies its sidecar and
HBI, and renders it. While viewing the past, every mutating command is refused with
`REFUSED|reason=viewing_past|view_tick=k|live_tick=t|json=0`. Nothing recalculates: the past is
read, not replayed (Ω 5.3, "Time Travel": "Moving the slider renders older snapshots. Nothing
recalculates. No replay writes state."). `rewind live` returns to the head.

`branch` (only while viewing a past tick k) creates a new timeline `saves/<session>-b<k>/`
whose first row set is a copy of `snap-k` plus `BRANCH|from_session=..|from_tick=k|from_chain=
<tick[k]>|json=0`, and whose next tick chains onto `tick[k]`. The original chain is untouched; the
branch travels beside it, never over it. The player is now live on the branch at tick k.

### 4.4 The Ω 6.0 loop, as implemented

```
Simulation Core (Kernel::tick) -> Snapshot Bus (snapshot written + chained)
  -> Evidence Engine (hbp.rs verifies rows, sidecars, chain; secrets recomputed on `verify`)
  -> Promotion Engine (evidence.rs: state machine of §4.5; never writes PROMOTED)
  -> Atlas Cockpit (atlas.rs renders HUD + decision panel)
  -> Operator Decisions (the player's command line)
  -> Mission Queue (Vec<Mission>)
  -> Simulation Core
```

This is the whole loop in one process, which is what makes it honest to call it an instance of
Ω 6.0 and dishonest to call it Ω 6.0: there is one node, no transport, no federation. The
Producer / Verifier / Independent Verifier / Promotion Gate roles stay abstract (Ω 5.2: "any node
that implements the contracts can assume a role"); in this game the player's machine is Producer and
Verifier, a second machine that reproduces the seal is Independent Verifier, and the Promotion Gate
is outside the game (the operator's).

### 4.5 Evidence states of a secret

| state | when |
|---|---|
| `SEALED` | not yet solved (the answer exists in the kernel but is not shown) |
| `LOCAL_MEASURED` | the kernel computed it and the player's `solve` matched, this run |
| `BRIDGE_PUBLISHED` | a `save` wrote the snapshot that carries the SECRET row, with HBI and sidecar |
| `VERIFIER_RECEIVED` | `verify` on a loaded save recomputed the answer and it matched the row |
| `INDEPENDENTLY_VERIFIED` | `verify <path-to-another-machine's-FINAL-SEAL.hbp>` carries the same `answer_sha16` and the same chain head for the same seed and script, AND names a seat other than this run's (the same seat is a reproduction, `REPRODUCED`, and promotes nothing) |
| `PROMOTED` | never set by the game; the row prints `promotion=BLOCKED|reason=promotion_gate_is_outside_this_game` |

"No visual object should display as fully verified before the corresponding evidence state
exists" (Ω 5.2 governance revision, "Evidence States"). The Atlas draws `SEALED` as `?`,
`LOCAL_MEASURED` as `m`, `BRIDGE_PUBLISHED` as `b`, `VERIFIER_RECEIVED` as `v`,
`INDEPENDENTLY_VERIFIED` as `V`. Nothing is drawn green.

---

## 5. The nine secrets

Each secret is a question the region asks, a set of in-game experiments, the exact computation the
kernel runs, the expected answer, and the source that measured it before. `solve <answer>` compares
the player's token with the kernel's own value for the current region, not with a stored string.
The expected answers below are what the kernel must compute; if a build's kernel computes something
else, the build is wrong, not the table. Every computation is `u64`/`u128`/`i128` or the 256-bit
integer of §5.7, except where stated.

Common helpers (`src/trits.rs`, thin wrappers over `asolaria_tribit`):

- `bal3(n: i128) -> Vec<i8>`: balanced trits, least significant first, variable width; zero is `[0]`.
  Rule: `r = n mod 3` (Euclidean); `r == 2` → digit −1 and carry (`n = n/3 + 1`), else digit `r` and
  `n = n/3`. This is the `bal3` of the owner's `reframe_check.py:22-34` as ported in
  `ternary/src/balanced.rs` (the game re-states it in 12 lines rather than depending on that crate,
  because only `kernel/tribit` is an allowed dependency; a test checks it against `TritWord`
  pack/unpack of `asolaria_tribit::Zero` digits for every n in −29,524..=29,524).
- `bal3_width(n, k)`: fixed width k, least significant first; values beyond ±(3^k − 1)/2 return
  `Err(OutOfRange)` — the game never silently drops a carry.
- `sieve(10_000_000)`: odd-only bitset sieve of Eratosthenes, 625,000 bytes; computed once, on the
  first command that needs it, and kept. Checks: π(10^6) = 78,498 and π(10^7) = 664,579 must hold or
  the kernel prints `MEASURED_FAIL|subject=sieve|...` and refuses the three prime secrets
  (MEASURED expected values: PTP receipt rows `PI`).

### 5.1 Secret 1 — Hollow Strata — count is not range

Question (the region's `look` text): *How many states do three trits hold, and how far from the
centre do they reach?*

Experiments: `trits 13` → `TRITS|n=13|order=lsf|t=+,+,+|width=3|json=0`; `trits 14` →
`TRITS|n=14|order=lsf|t=-,-,-,+|width=4|note=needs_4_trits_at_3_it_is_out_of_range|json=0`;
`probe 13` shows its cube cell `(+,+,+)` = residue 13, its spoke (+1: 13 = 6·2 + 1), that it is
prime, its rooms at levels 1..5. Hint 3 says: "try the first number that does not fit".

Kernel computation: `states = 3^3 = 27`; `span = (3^3 − 1)/2 = 13`; and the D1 enumeration: for
every x in −797,161..=797,161 (that is 3^13 values) run nearest-code coarse-to-fine: residual
`r = x`; for k = 12 down to 0, with `s = 3^k`, choose `d` in {−1, 0, +1} minimising `|r − d·s|`
(a tie is impossible because `s` is odd and `r` is an integer; the kernel still counts ties and
must find 0), `r −= d·s`; at the end `r` must be 0 and the digits must equal `bal3_width(x, 13)`.
Count `exact` and `ties`.

Expected: `27:13`, and the D1 row `D1|K=13|states=1594323|in_range_exact=1594323/1594323|ties=0|
json=0`. `solve 27:13` is the answer; the D1 row is printed with it as the proof the region offers.

Source: MEASURED, `docs/handoffs/acer-post60d-2026-10-18/ncm-d1-run/FABLE5-NCM-D1-RUN-2026-10-18.hbp:15`
(`D1LEVEL|K=13|states=1594323|span=-797161..797161|in_range_exact=1594323/1594323|ties=0`) and
`:18` (`K13_ns_per_value=242|float_used=0`), reproduced on a second machine
(`ncm-d1-run/TWO-MACHINE.md:25`). Range law: discipline §3.

Budget: 1,594,323 values × 13 steps; the ACER run measured 242 ns per value, so under a second.

### 5.2 Secret 2 — Flow Channel — 41 trits

Question: *How many trits does one PID of the channel need?*

Experiments: `probe <n>` on any PID the Atlas shows (agents' pids are 16 hex = 64 bits) prints its
`TritWord` and the count of trits used; `trits 18446744073709551615` (2^64 − 1) prints 41 trits
and `trits 12157665459056928800` (3^40 − 1) prints 40. Hint 3: "the largest PID is 2^64 − 1; how
many powers of three until you pass it?".

Kernel computation: in `u128`, `p = 1`, `n = 0`; while `p < 2^64` { `p *= 3`; `n += 1` }. Report
`3^(n−1)`, `2^64`, `3^n`. Also report `asolaria_tribit::TRITS_PER_U128 = 80` as the related ceiling
for a `u128` (`kernel/tribit/src/lib.rs:86-87`, "3^80 < 2^128 <= 3^81").

Expected: `41`; row `TRITRANGE|pid_bits=64|trits=41|3^40=12157665459056928801|2^64=
18446744073709551616|3^41=36472996377170786403|40_trits_enough=0|41_trits_enough=1|json=0`.

Source: MEASURED, `docs/handoffs/proof-nanoseconds-ternary-2026-10-18/cloud/CLOUD-ROWS.hbp:9`
(the row above, verbatim) and ACER's `FABLE5-EMITTER-200NS-CHECK-2026-10-18.hbp:20`
(`TRITRANGE|...|law=count_is_not_range|tag=MEASURED`). The three powers were re-checked this
session with integer Python (`3**40 < 2**64 <= 3**41` → True).

### 5.3 Secret 3 — Prime Cylinders — the spokes

Question: *Which spoke leads below ten million, and by how many?*

Experiments: `probe 5`, `probe 7`, `probe 11`, `probe 13` show the spoke of each (5 → −1, 7 → +1,
11 → −1, 13 → +1). `look` in the region shows the six cylinders with the counts so far as the
player probes. Hint 3: "count every prime to 10^7 by its residue mod 6".

Kernel computation: with the sieve, for each prime p ≤ 10^7 count `p mod 6`; `plus = count(1)`,
`minus = count(5)`; `lead = minus − plus`; the phases 0 and 4 must hold 0 primes, phase 2 only the
prime 2, phase 3 only the prime 3. Then walk consecutive primes above 3 and count `switch` (spoke
changes) and `stay`; `switch_permille = switch × 1000 / pairs` (integer division, remainder
printed). Also count `minus_to_plus` and `plus_to_minus` and print `direction_balance_is_forced=1`
with the reason from the README: in any two-symbol sequence the two switch counts differ by at most
one, fixed by the first and last symbols.

Expected: `-1:189`; rows `SPOKES|plus1_6k+1=332194|minus1_6k-1=332383|primes_above_3=664577|
all_on_spokes=1|minus1_lead=189|json=0` and `P2P|pairs=664576|switch=378567|stay=286009|
switch_permille=569|independence_baseline_permille=500|minus_to_plus=189284|plus_to_minus=189283|
first_spoke=-1|last_spoke=1|direction_balance_is_forced=1|json=0`.

Source: MEASURED, `kernel/ptp-towers/RECEIPT-PTP-CLOUD-2026-10-18.hbp:10` and `:41`, both rows
verbatim; ACER's run gave the same counts (`kernel/ptp-towers/README.md:13-27`). Grain: the lead's
"57.0%" is `switch_permille=569` rounded to one place; the game prints 569‰ and 378,567/664,576.

### 5.4 Secret 4 — 27-Cube Chamber — Law 10

Question: *Which cells of the cube hold primes, and which prime sits on the centre planes?*

Experiments: `probe 3` → cell `(0,+,0)` lsf = residue 3, `coprime_to_3=0`, prime; `probe 9`,
`probe 27` → centre-aligned, not prime; `probe 13` → cell `(+,+,+)`, coprime, prime. `look` draws
the 3×3×3 cube as three 3×3 slices with the prime counts the kernel has found. Hint 3: "the centre
planes are the nine cells whose residue is a multiple of three".

Kernel computation: with the sieve, for each prime p ≤ 10^7 count `p mod 27` into 27 bins. Then:
`coprime_cells` = number of residues r with gcd(r, 27) = 1 (must be 18); `populated` = number of
those 18 bins that are nonzero; `min`, `max` over the 18; `centre_cells` = the 9 residues that are
multiples of 3; their total prime count must be exactly 1 and that prime must be 3 (`MOD3|
centre_primes=1|only_3=1`). Print each of the 27 `CELL` rows with the residue's three balanced
trits, `order=msf` to match the cloud receipt, and `order=lsf` beside it.

Expected: `18:3`; row `CUBE27|coprime_cells=18|populated=18|min=36826|max=37023|json=0` and
`MOD3|centre_primes=1|only_3=1|json=0`; the per-cell counts must equal the 18 values in the
receipt's `CELL` rows (for example `r=13` → 36,861 and `r=11` → 37,023).

Source: MEASURED, `kernel/ptp-towers/RECEIPT-PTP-CLOUD-2026-10-18.hbp:12-40`. The law: OPERATOR,
SX5g.md Law 10. The spread figure (`spread_per10000_of_mean=53`) is printed by the kernel as
`(max − min) × 10000 / mean` in integers; it is reported, not part of the answer.

### 5.5 Secret 5 — Hotel of Infinite Rooms — addresses never move

Question: *At which level do the primes below ten million stop sharing a room?*

Experiments: `probe 2` → `ROOM|n=2|level=1|room=-1,+1,0|order=lsf|json=0` ... up to level 5, the
same digits padded; `probe 3` → `0,+1,0`. `probe 1000003` and `probe 1000033` share a room at
level 4? The kernel answers per pair when asked `probe a b` (two numbers): the first level at which
their rooms differ. Hint 3: "a room at level L is the residue mod 3^(3L), written as 3L trits".

Kernel computation: for L in 1..=6, `m = 3^(3L)` (fits `u64` for L ≤ 13); bin every prime by
`p mod m` (for L ≤ 4 an array of size m of `u32` is at most 531,441 entries; for L ≥ 5, m > 10^7 so
`p mod m = p` and sharing is 0 by inspection, which the kernel still verifies by a sorted pass
over the primes, not by assumption). `sharing_L` = number of primes whose bin holds ≥ 2 primes.
`inner_address_kept_L` = number of primes whose level-L residue reduced mod 3^(3(L−1)) equals
their level-(L−1) residue (must be all 664,579 — it is forced by arithmetic, and the kernel counts
it anyway, exhaustively, because the space allows: discipline §9). For level 60 the kernel does
not build 3^180 voxels: it states that for every p < 3^15 the residue mod 3^(3L) is p itself for
all L ≥ 5, so the level-60 room is the level-5 room padded with zero trits, and prints
`LEVEL|level=60|voxels=3^180|primes_sharing_a_voxel=0|inner_address_kept=664579/664579|
built=0|json=0`.

Expected: `5`; rows `LEVEL|level=1..6` with sharing 664,578, 664,578, 664,578, 562,173, 0, 0 and
`ADDRESS60|sharing_reaches_zero_at_level=5|stays_zero_through_60=1|room_of_2=-1,1,0|same_at_60=1|
room_of_3=0,1,0|same_at_60=1|trit_order=least_significant_first|json=0`.

Source: MEASURED, PTP receipt rows 43–50; ACER's `TERNARY-ADDRESS-60.hbp`, cube
`b6b64a02864356f9`, same counts (`docs/ADDRESSABLY-ADDRESSING.md` §2 and §5).

### 5.6 Secret 6 — Crystalline Reach — the prism closes on 40 bits

Question: *How many bits does the lattice need before bytes and symbols agree?*

Experiments: `probe <text>` in this region (a bare word, not a number) encodes the player's own
bytes: `PRISM|bytes=<n>|padded_to=<5k>|symbols=<4k>|roundtrip=EXACT|sha256_in=..|sha256_out=..|
json=0`. `trits 1024` shows 1024 is not a power of three (hint that the lattice is binary-sided).
Hint 3: "the smallest number both 8 and 10 divide".

Kernel computation: `lcm(8, 10)` by `8 × 10 / gcd(8, 10)` = 40; `2^40 = (2^8)^5 = (2^10)^4`
checked in `u64`. Transcode: take the bytes 5 at a time as a 40-bit integer (big-endian), emit four
10-bit symbols (big-endian); decode the inverse; compare bytes and sha256. The kernel runs it over
(a) a seeded buffer of 85,793 bytes (the receipt's count, LCG of §2.5 seeded with the world seed,
padded to a multiple of 5 with the pad length recorded) and (b) the player's `probe` input. Also
run the `asolaria_tribit::prism`/`unprism` seal on one block of 27 values drawn from the buffer
and print `PRISM27|roundtrip=EXACT|dc=<X[0]>|json=0` — the Law 20 rime prism, integer NTT over
Z/1000081Z, round trip exact (`kernel/tribit/src/lib.rs:332-366`; test
`transfers_back_and_forth_exactly`).

Expected: `40` (also accepted: `5:4`); rows `RUNG|width=10|alphabet=1024|tested=85793|
roundtrip_failures=0|lossless=1|json=0` and `PRISM27|roundtrip=EXACT|...`.

Source: MEASURED, `codec/dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp:16` (width 10, 85,793 tested, 0
failures), `README.md:92`, `docs/HYPERBEHCS-GLYPHS-INSTANT-SLICE-MESSAGING-2026-07-03.md:10-11`.
Boundary printed with the answer: `BOUNDARY|addressing_is_not_compression=1|code_rate=1.0|
H_out=H_in|json=0` (discipline §5).

### 5.7 Secret 7 — Rupture Zone — the closure survives 81 levels

Question: *Does the closure survive eighty-one levels?*

Experiments: `probe <d>` with d in {1, 3, 9, 27, 81} runs the exact walk to depth d and prints the
residual; `look` shows the fracture line with the float column from the receipt beside the integer
column the kernel just computed, each labelled with its source. Hint 3: "the arms are 2a−b−c,
2b−a−c, 2c−a−b; shift the centre and the arms must not move".

Kernel computation, exactly the operator's `compose.py` section 3 in integers: start
`(a, b, c) = (11, −4, 93)`, `resid = 0`; for each of d levels: `A = arms(a, b, c)`;
`resid += A.0 + A.1 + A.2`; shift `t = 7919`: `(a, b, c) = (a + t, b + t, c + t)`;
`A2 = arms(a, b, c)`; `resid += (A2.0 − A.0) + (A2.1 − A.1) + (A2.2 − A.2)`;
`(a, b, c) = (A2.0 + 1, A2.1 + 2, A2.2 + 3)`. The values grow by about ×3 per level, so at depth 81
they reach about 93 × 3^81 ≈ 4 × 10^40, beyond `i128`. The game carries them in a 256-bit signed
integer (`src/wide.rs`: four `u64` limbs, two's complement, add/sub/shift-left-by-one/compare/
decimal print; about 150 lines, tested against `i128` on 10^6 seeded values and against the
depth-13 full enumeration of the receipt). The script's `Fraction` is not needed: with integer
inputs every operation is integer. The full-tree check of section 1 (depths 1..13, `sum_ne_zero`
must be 0 at every level) and the decisive test of section 2 (shift the centre at every level by
7919; `arm_changes` must be 0 for depths 1, 3, 6, 9, 12) are run too, in integers.

Expected: `0`; rows `CLOSURE|depth=81|arithmetic=exact|residual_at_root=0|json=0` for each of the
five depths, `NEST|depth=13|leaves=1594323|sum_ne_zero=0|json=0`, and `FREECENTRE|depth=12|
arithmetic=int|arm_changes=0|json=0`. Beside them, cited and not run:
`CITED|depth=81|arithmetic=float64|residual_at_root=-1.324979e+24|source=kernel/tribit-referees/
receipts/compose.stdout:48|run_here=0|reason=float_dies_in_this_kernel|json=0` (and the depth-9
and depth-27 float rows, lines 46–47).

Source: MEASURED, `kernel/tribit-referees/receipts/compose.stdout` lines 4–17, 23–27, 39–43
(integer lanes) and 28–32, 44–48 (float lanes); the operator's script is vendored byte-identical,
blob `f3574ed13bd4c18ca1fe4d42c2fb5d46f635807a` (`receipts/RUNS.hbp:3`).

Stretch, not required: `kernel/tribit-referees/src/binary64.rs` is an integer model of binary64.
Porting such a model into the game would let the Rupture recompute the float drift in integers
instead of citing it. Until that is done the float column is CITED, and the Atlas labels it so.

### 5.8 Secret 8 — White Field — Wikipedia's white space

Question: *What share of the page is white?*

Experiments: `probe <text>` in this region counts the white bytes of the player's own text:
`CENSUS|bytes=<n>|white=<w>|per10000=<w×10000/n>|def=0x20,0x09,0x0A,0x0D|json=0`. `look` says
whether `data/enwik8` is present. Hint 3: "place the genuine enwik8 (the first 100,000,000 bytes of
the original enwik9; its sha256 begins 2b49720e) at data/enwik8 and probe the field. The game checks
the hash, not just the size." (Changed 2026-10-18: the hint used to say only "the first 100,000,000
bytes of enwik9", and the local enwik9.gz is a later `export-0.10` dump, not the original.)

Kernel computation: if `data/enwik8` exists, is exactly 100,000,000 bytes AND its sha256 begins with
the genuine prefix `2b49720e` (NAMED, from the ACER seat's memory; the other 56 hex digits are not
carried because no genuine copy is on this seat to complete them), stream it once,
count bytes in {0x20, 0x09, 0x0A, 0x0D} (the definition is printed on the row; if the lead's run
used another set, the two censuses differ and the row says which set it used), compute the
sha256 of the file as read, and print `CENSUS|file=enwik8|bytes=100000000|white=<w>|
per10000=<q>|rem=<r>|def=...|sha256=<64hex>|json=0` with `q = w × 10000 / n` and the remainder
`r` carried. If the file is absent: `NOT_MEASURED|subject=enwik8_white_space|reason=NO_INPUT|
expected_path=data/enwik8|json=0`, and the secret stays `SEALED` — a missing file is not a zero
(discipline §0, §12).

Expected: `solve` compares against the kernel's own `per10000`; the lead's figure is 1465 per
10,000 (14.65%). The game accepts `1465` only if its own census says 1465 for the supplied file.
Beside it, cited: `CITED|subject=enwik8_white_space_information_share_under_xz|value=2.79%|
tag=NAMED|source=lead_2026-10-18|located_on_this_seat=0|recomputed_here=0|reason=xz_is_not_std_
only_and_its_bytes_depend_on_the_xz_build|json=0`.

Source: NAMED (lead-supplied, 2026-10-18: "14.65% of enwik8's bytes but 2.79% of its information
under xz; two machines agreed to the byte"). This seat's search scope that did not locate the
receipt: `D:/aether-universe-work/aether` (all `.md/.hbp/.txt`), the FABLE5 office two levels deep,
the ACER seat's memory directory, `C:/tmp`. `count=0` on this seat is "not located
here", not "does not exist". When the receipt is placed in the repo, change the tag to MEASURED
and cite its row; do not change the number.

### 5.9 Secret 9 — Blue Star — Mythos

Question: *What is the star's hash, and where is its centre?*

Experiments: `probe star` hashes `../MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf` (path relative to the
game folder; overridable with `--mythos <path>`) and reads its GGUF v3 header; `look` shows the
sidecar line. Hint 3: "a star is checked, not believed: hash the bytes and compare them with the
sidecar".

Kernel computation: sha256 of the file (std-only, §6.1); compare with the sidecar
`ACER-MYTHOS-BLUE.gguf.sha256` (parse the first 64 hex of the line). Parse the GGUF header with
integer reads only: magic `GGUF` (bytes 47 47 55 46), `version: u32 = 3`, `n_tensors: u64 = 6`,
`n_kv: u64`; walk the key-value pairs: key = `u64` length + bytes; `type: u32`; values of integer,
bool and string types are read; arrays (type 9) of integer or string element types are read;
any value or array of float type (6 = f32, 12 = f64) is skipped by its byte length and never
decoded — the kernel prints `SKIP|kind=float|bytes=<n>|decoded=0|json=0` for each. Tensor info
is read for names, dimensions and offsets; tensor data is hashed as bytes and never interpreted.
Report `general.architecture`, `asolaria.being`, `asolaria.channel`, `asolaria.seat`,
`asolaria.centre` (an integer array of three).

Expected: `3dd92a42:32,32,33`; rows `STAR|file=ACER-MYTHOS-BLUE.gguf|bytes=50752|
sha256=3dd92a42160a38c121980957ce9eabbea216678892801d7ea3ed4e99e96c3aae|sidecar=OK|json=0`
and `GGUF|version=3|arch=asolaria-three-beings-rgb|being=MYTHOS|channel=BLUE|seat=ACER|
centre=32,32,33|tensors=6|json=0`. If the file is absent: `NOT_MEASURED|subject=mythos|
reason=NO_INPUT|expected_path=../MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf|json=0`.

Source: MEASURED, `MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf.sha256` (read this session) and
`stat` (50,752 bytes, this session); the header fields are the README's reading of the GGUF v3
header (`MYTHOS-BLUE-STAR/README.md`, "What the file says about itself"). The naming is OPERATOR
(2026-10-18). If the sidecar does not match the bytes the kernel prints `MEASURED_FAIL` and the
star does not open; the game never substitutes the README's hash for the computed one.

---

## 6. Formats: rows, index, sidecar, chain, saves, seal

### 6.1 SHA-256 and sha16

`src/sha256.rs`: FIPS 180-4, `u32` arithmetic only, std-only, no dependency. Reference for the
builder: `shadowcat/src/sha256.rs` in this repo is an integer FIPS 180-4 implementation whose
digest equals coreutils' on every output (`docs/handoffs/README.md`, "Shadow cats in aether", table
row 2); the game writes its own (it is not an allowed dependency) and a test compares the two on
1,000 seeded inputs only if the shadowcat file is present, else skips with `NOT_MEASURED|
reason=NO_INPUT`.

Known-answer self-test, run before anything else; the game exits with code 3 and the row
`SELFTEST|sha256=FAIL|...` if any fails:

```
sha256("")    = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
sha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")
              = 248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1
```

(MEASURED: `sha256sum` on ACER, this session, all three.) Pass prints
`SELFTEST|sha256=OK|vectors=3|json=0`.

`sha16(x)` = the first 16 hex characters of `sha256(x)`, as the seat's office rule uses it.

### 6.2 HBP rows

- A row is ASCII, one line, `TAG|k=v|k=v|...|json=0`, ending in `\n`. The last field is always
  `json=0`. Keys are `[a-z0-9_]`, values contain no `|`, no newline, no `=`; a value that needs
  `|` writes `%7C`. Tags are upper case.
- Numbers are decimal integers. A ratio is written as `num/den` or as a scaled integer with its
  scale named (`per10000=1465`, `switch_permille=569`), never as a decimal fraction. Where a
  cited source carries a float (the Rupture's float column) the value is copied as a string into
  a `CITED` row and marked `run_here=0`.
- The first row of every file is a header: `AETHER-UNIVERSE|kind=<snapshot|save|seal|receipt>|
  v=1|json=0`.

### 6.3 Snapshot rows and the chain

`saves/<session>/ticks/snap-NNNNNN.hbp` (NNNNNN = tick, zero-padded):

```
AETHER-UNIVERSE|kind=snapshot|v=1|json=0
TICK|t=42|seed=20260801|phase=day|wind=-1|fog=0|light=1|quality=RICH|json=0
REGION|id=0|name=hollow_strata|x=-5|y=-2|z=-2|coherence=61|energy=38|population=4|risk=29|secret=1|evidence=LOCAL_MEASURED|unlocked=1|json=0
... (9 REGION rows, id order)
AGENT|id=0|pid=<16hex>|home=0|colour=red|at=1|target=1|progress=0|heading=0|state=idle|s1=0|s2=0|energy=0|timer=0|frequency=3|priority=0|objective=none|json=0
... (27 AGENT rows, id order)
PLAYER|at=2|chapter=3|solved=2|attempts=5|view=live|json=0
SECRET|id=1|region=0|evidence=LOCAL_MEASURED|answer_sha16=<sha16 of the canonical answer token>|solved_tick=17|json=0
... (9 SECRET rows; a SEALED secret has answer_sha16=none)
ALERT|kind=risk|region=4|value=63|json=0          (0 or more)
MISSION|kind=solve|region=2|match=1|json=0        (the tick's applied missions; never the answer text)
CHAIN|prev=<tick[k-1]>|state=<sha256 of all rows above>|this=<tick[k]>|json=0
```

Chain rule: `state = sha256(bytes of every row above CHAIN, in order, each with its "\n")`;
`tick[k] = sha16(tick[k−1] + "|" + state_hex)` where `+` is byte concatenation and `|` is the byte
0x7C. The rule is the same for every tick including tick 0: `tick[-1]` is the genesis hash,
`genesis = sha16("AETHER-UNIVERSE|seed=<seed>|json=0")`, the CHAIN row of tick 0 carries
`prev=<genesis>`, and `tick[0] = sha16(genesis + "|" + state0_hex)`. Tick 0's own state is an input to
the chain. (Retracted 2026-10-18, beside and not over: this design first said `tick[0] =
sha16("AETHER-UNIVERSE|seed=<seed>|json=0")` whatever tick 0 held, and a forged tick 0 loaded clean;
see §12.) The CHAIN row is the last row.
The kernel keeps `chain_head = tick[k]` and prints it in the HUD.

The answer is never stored in clear: `answer_sha16` is `sha16("secret<id>|" + canonical answer
token)`. `verify` recomputes the answer and the sha16 and compares. A save therefore does not spoil
the game, and a tampered answer cannot reproduce its own hash.

`snap-NNNNNN.hbi` holds one `HBI|row=i|sha256=<sha256 of row i bytes without the newline>|hex=<row
bytes as lowercase hex>|json=0` per row of the `.hbp`, in order, rows numbered from 1.
`snap-NNNNNN.hbp.sha256` holds `<sha256 of the .hbp file>  snap-NNNNNN.hbp` in `sha256sum` format
(two spaces), so `sha256sum -c` works outside the game.

Every tick writes its three files; that is what makes `rewind` a read and not a recalculation.
Budget: a tick is under 6 KB of rows; the default `--max-ticks` is 19,683 (3^9), which bounds a
session to about 120 MB and the Atlas prints `HALT|reason=max_ticks|json=0` when reached.

### 6.4 Saves and loads

`save <name>` writes `saves/<name>/SAVE.hbp`:

```
AETHER-UNIVERSE|kind=save|v=1|json=0
SAVE|name=<name>|session=<session>|tick=<t>|chain=<tick[t]>|genesis=<genesis hash>|seed=<seed>|json=0
SNAPSHOT|path=ticks/snap-NNNNNN.hbp|sha256=<file sha>|json=0
INDEX|tick=0|chain=<tick[0]>|json=0
... one INDEX row per tick 0..=t
```

with `.hbi` and `.sha256`, and copies (or hard-links where the OS allows; copies are fine) the
`ticks/` directory. Saving marks every `LOCAL_MEASURED` secret `BRIDGE_PUBLISHED` on the next
tick's SECRET row.

`load <name>`: read `SAVE.hbp`, check its sidecar and HBI, read the named snapshot, check its
sidecar and HBI, recompute `state` and `this` and compare with the CHAIN row, then walk the INDEX
rows from tick 0 checking every stored snapshot's CHAIN against the index (every tick is stored, so
the walk is complete; a missing tick file is `MEASURED_FAIL|reason=MISSING_TICK|tick=..`). On
success, `Kernel::from_snapshot` rebuilds the live state and `LOAD|name=..|tick=..|
chain_verified_depth=<t>|json=0` prints. A failed check refuses the load and prints the failing row;
it never loads a snapshot it could not verify.

### 6.5 `verify`

Prints a three-valued verdict per check (discipline §12), never two-valued:

```
VERIFY|subject=sha256_selftest|verdict=MEASURED_PASS|json=0
VERIFY|subject=snapshot_sidecar|tick=42|verdict=MEASURED_PASS|json=0
VERIFY|subject=snapshot_hbi|tick=42|rows=48|verdict=MEASURED_PASS|json=0
VERIFY|subject=chain|from=0|to=42|verdict=MEASURED_PASS|json=0
VERIFY|subject=secret|id=3|recomputed=1|match=1|verdict=MEASURED_PASS|evidence=VERIFIER_RECEIVED|json=0
VERIFY|subject=secret|id=8|verdict=NOT_MEASURED|reason=NO_INPUT|json=0
VERIFY|subject=mythos_sidecar|verdict=MEASURED_PASS|json=0
```

`verify <path>` additionally reads another machine's `FINAL-SEAL.hbp` (or any snapshot), checks
its HBI and sidecar, and compares `seed`, `script_sha256`, `chain` and every `answer_sha16` with
this run's; all equal is a **reproduction** (`VERIFY|subject=reproduction|...|MEASURED_PASS`). It
becomes `INDEPENDENTLY_VERIFIED` only when the other seal also names a seat that is not this run's
(`independent=1|other_seat=<the seal's seat field>|this_seat=<--seat>|basis=distinct_declared_seat|
host_binary=NOT_MEASURED`). The same seat, or a seat that is missing or `unknown`, is a reproduction
and nothing more: the row says `independent=0|reproduced=1|verdict=NOT_MEASURED|reason=SAME_SEAT`
(or `SEAT_UNKNOWN`), a `REPRODUCED` row follows, no mission is committed and the evidence does not
move. Two runs on one seat are distinct, not independent (Ω 5.2 keeps Producer, Verifier and
Independent Verifier as separate roles). The seal records no host or binary hash, so a distinct
*declared* seat is the strongest basis this game can state. A mismatch prints both values beside
each other; nothing is overwritten.

### 6.6 The ending's final seal

When all nine secrets are `LOCAL_MEASURED` or better, the player is at the Blue Star, and `verify`
passes every check, the kernel writes `saves/<session>/FINAL-SEAL.hbp` (+ `.hbi` + `.sha256`):

```
AETHER-UNIVERSE|kind=seal|v=1|json=0
SEAL|session=<s>|seed=<seed>|tick=<t>|chain=<tick[t]>|genesis=<genesis hash>|script_sha256=<sha of the --script file or none>|seat=<--seat value or unknown>|json=0
SECRET|id=1|region=0|answer_sha16=..|solved_tick=..|evidence=..|json=0
... (9 rows)
STAR|file=ACER-MYTHOS-BLUE.gguf|bytes=50752|sha256=3dd92a42...|sidecar=OK|json=0
OMEGA|level=6.0|name=Digital_Planet|implemented_here=one_process_instance_of_the_loop|omega_net=0|promotion=BLOCKED|reason=promotion_gate_is_outside_this_game|tag=NAMED|json=0
FELIPE|honoured=1|as=author_of_the_Aether_vision|named_in=repo_title|world=Xylos|json=0
CHAIN|prev=<tick[t]>|state=<sha256 of rows above>|this=<sha16(prev|state)>|json=0
```

Then the ending text (STORY, `story/ch9-end.txt`) prints, followed by the seal's `this` hash on its
own line, so a player can quote one number to prove they finished, and anyone with the same seed
and script can reproduce it. The seal says what it is: an instance, not the planet; NAMED where it
names Ω 6.0; MEASURED where it names a hash.

---

## 7. Commands

Line-based stdin, one command per line, so the game runs on any terminal including Termux. Output
is hot-path first: HBP rows, then prose. `--script <file>` reads commands from a file instead of
stdin (lines starting with `#` are comments; a blank line is ignored); the script's sha256 goes
into every snapshot's TICK row as `script=<sha16>` and into the seal. Flags: `--seed <u64>`
(default 20260801, the seed of `compose.py`), `--cols <n>` (default 80), `--saves <dir>` (default
`./saves`), `--data <dir>` (default `./data`), `--mythos <path>`, `--seat <name>`,
`--max-ticks <n>`, `--no-story` (rows only; for tests).

| command | effect | output (first rows) |
|---|---|---|
| `help` | list commands | `HELP|commands=look,map,go,probe,trits,solve,codex,timeline,agents,wait,rewind,branch,save,load,verify,help,quit|json=0` then one line each |
| `look` | describe the current region from the current snapshot | `LOOK|region=..|coherence=..|energy=..|population=..|risk=..|secret=..|evidence=..|json=0`, the region's hint row `HINT|level=1..3|...`, then STORY text on first visit |
| `map` | the ASCII crystal map (§8) + HUD + decision panel at RICH | `MAP|cols=..|rows=..|quality=..|json=0` then the grid, then `HUD|...` and `DECIDE|...` |
| `go <region>` | move (name, id, or unique prefix); refused if locked or no edge | `GO|from=..|to=..|json=0` or `LOCKED|...` / `NOEDGE|...` |
| `probe <n>` / `probe <a> <b>` / `probe <word>` / `probe star` | the experiment of the region (§5); numeric probes work everywhere and print the general row set: trits (lsf), cube cell, spoke, prime, rooms 1..5, TritWord | `PROBE|n=..|...|json=0` and region-specific rows |
| `trits <n>` | balanced form at minimal width, and at widths 3, 13, 41 (with `OutOfRange` where it does not fit) | `TRITS|n=..|order=lsf|t=..|width=..|json=0` ×4 |
| `solve <answer>` | compare with the kernel's answer for the current region | `SOLVE|region=..|match=1|evidence=LOCAL_MEASURED|json=0` + the proof rows, or `SOLVE|match=0|attempts=..|json=0` (the attempt is recorded in the snapshot as a MISSION row; never the text) |
| `codex` / `codex <n>` | the ledger of facts: every row the player has unlocked with its tag and source; `<n>` prints chapter n's story and facts | `CODEX|entries=..|json=0` then `FACT|id=..|tag=MEASURED|source=..|text=..|json=0` ... |
| `timeline` | the nine dated events with chapter state | `TIMELINE|chapters=9|open=..|json=0` then `EVENT|ch=..|date=..|region=..|state=locked\|open\|solved|tag=..|json=0` |
| `agents` | the 27 agents from the snapshot | `AGENTS|n=27|json=0` then the AGENT rows |
| `wait` / `wait <n>` | advance n ticks (1..=27) | one `TICK|...` row per tick, then `CHAIN|...` for the last |
| `rewind <tick>` / `rewind live` | view a sealed snapshot read-only / return to live | `REWIND|view=..|chain=..|verified=1|json=0` |
| `branch` | only while viewing the past: fork a new timeline from the viewed tick | `BRANCH|from_tick=..|from_chain=..|session=..|json=0` |
| `save <name>` / `load <name>` | §6.4 | `SAVE|...` / `LOAD|...` or `MEASURED_FAIL|...` |
| `verify` / `verify <path>` | §6.5 | `VERIFY|...` rows |
| `quit` | write the current tick (already sealed) and exit 0 | `QUIT|tick=..|chain=..|json=0` |

Unknown input: `UNKNOWN|input=<first 32 bytes, escaped>|json=0` then "type help". Region names:
`hollow`, `flow`, `cylinders`, `hotel`, `rupture`, `crystal`, `cube`, `white`, `star` are the
accepted short forms (unique prefixes of the full names also work).

Exit codes: 0 normal; 2 bad flag; 3 self-test failed; 4 a verify requested by `--script` failed
(so a test harness can turn red).

---

## 8. The ASCII crystal map

Integer isometric projection of the 3D positions. For a region at `(x, y, z)`:

```
col = C0 + 3 * (x - z)
row = R0 + (x + z) - 2 * y
```

with `C0 = 20`, `R0 = 8` on a 40 × 17 grid (RICH and BALANCED; LOW prints the list instead).
Scale 3 on columns and 1 on rows gives a 3:1 look that reads as isometric in a monospace font,
and every region lands on a distinct cell:

| region | (x,y,z) | col | row | glyph |
|---|---|---:|---:|---|
| Hollow Strata | (−5,−2,−2) | 11 | 5 | `#` |
| Flow Channel | (0,1,0) | 20 | 6 | `~` |
| Prime Cylinders | (−3,0,3) | 2 | 8 | `\|` |
| Hotel of Infinite Rooms | (3,2,−3) | 38 | 4 | `H` |
| Rupture Zone | (4,−1,1) | 29 | 15 | `*` |
| Crystalline Reach | (0,3,2) | 14 | 4 | `^` |
| 27-Cube Chamber | (0,0,0) | 20 | 8 | `@` |
| White Field | (−2,−3,3) | 5 | 15 | `.` (drawn as `_` so it is visible) |
| Blue Star | (2,4,−1) | 29 | 1 | `*` in RICH as `(*)` |

The glyph is replaced by `?` while the chapter is locked and overlaid by `P` where the player
stands (the region glyph is then printed in the legend line). At RICH the nine rivers are drawn
with an integer Bresenham line of `.` between the two projected cells (no antialiasing, no
floats). Under the grid: one legend line per region, `glyph name coherence/energy/population/risk
evidence`, in id order, so labels never collide on the grid. A test renders the map at each
quality level and compares with a golden file.

Example at RICH (tick 0, player at Hollow Strata, rivers omitted here for brevity):

```
........................................
.............................(*)........
........................................
........................................
..............^.......................H.
...........P............................
....................~...................
........................................
..|.................@...................
........................................
........................................
........................................
........................................
........................................
........................................
....._.......................*..........
........................................
# hollow_strata        60/40/3/30  ?   (P)
~ flow_channel         70/60/3/20  ?
| prime_cylinders      50/30/3/25  ?
H hotel                80/20/3/10  ?
* rupture_zone         30/50/3/60  ?   ALERT risk
^ crystalline_reach    90/30/3/10  ?
@ cube_27              100/27/3/0  ?
_ white_field          40/10/3/40  ?
* blue_star            50/0/3/50   ?
```

(The builder renders the grid from the table; the example above is hand-drawn and the golden file
is whatever the first correct render produces, checked by eye once against the table, then pinned.)

HUD (one row, then one line per field; batched per command, never per tick spam):
`HUD|world=aether-universe|tick=..|sim=live|quality=..|agents=27|regions=9|alerts=..|evidence=
<counts per state>|promotion=BLOCKED|timeline=ch<n>|snapshot=<tick[k]>|pending_bridges=<unsaved
LOCAL_MEASURED count>|verifier=<last verify verdict>|json=0`.

Decision panel: `DECIDE|alerts=..|recent_evidence=<last SECRET row id>|promotion=BLOCKED|
snapshot=<chain>|replay=rewind <k>|timeline=ch<n>|verification=<last verdict>|pending_bridges=..|
blocking=<the first locked chapter and the secret it needs>|next=<a plain suggestion: "probe 14"
when at Hollow with 0 attempts, etc.>|json=0`.

---

## 9. Honesty rules for in-game text

1. Every fact row carries a tag: `MEASURED`, `NAMED`, `OPERATOR`, or `STORY`. The `codex` prints
   the tag and the source beside the text. Story files are labelled STORY at their top line and
   the Atlas prints `STORY|chapter=n|json=0` before the text.
2. A MEASURED fact names the run: the repo path and row (or line) that holds it. The game ships
   those citations as data in `src/sources.rs`; a test checks every cited path exists in the repo
   checkout (relative to the game folder, `../`) and prints `NOT_MEASURED|reason=NOT_REACHABLE_FROM_HERE`
   rather than failing when the game is run outside the repo.
3. A number the kernel did not compute this run is printed as `CITED|...|run_here=0`, never as a
   result. The two such numbers are the float residuals (§5.7) and the xz share (§5.8).
4. The kernel's own number wins over any table. If a recomputation disagrees with a cited receipt,
   the game prints both, beside each other, with `DISAGREE|mine=..|cited=..|source=..|json=0`, and
   does not change either. The retraction travels beside the claim.
5. `count=0` is never "absent": a missing input prints `NOT_MEASURED` with a reason from the fixed
   list `NO_INPUT | NOT_REACHABLE_FROM_HERE | BUDGET | DOES_NOT_EXIST`, and `DOES_NOT_EXIST` is used
   only after an exhaustive check the row names.
6. Verdicts are three-valued (§6.5). Nothing is drawn green; evidence states are letters (§4.5).
7. The Ω 6.0 Digital Planet, Ω NET, the Omega box, the null space and the 27-law frame are
   presented as the direction and the frame, tagged NAMED or OPERATOR, never as implemented or
   measured by this game. The game states what it is: one process, one node, no network.
8. Addressing is not compression: every row that shows a transcode or an address prints
   `code_rate=1.0` or `addressing_is_not_compression=1`. No row ever claims a ratio below entropy.
9. Felipe is named as the author of the Aether vision and nothing else is claimed about him. No
   serial, no IP, no inbox path, no file path from a phone appears in any story or row (§3 test).
10. The game never writes JSON, never reads JSON, never prints `{`-led or `[`-led data; the only
    `json` it prints is the literal `json=0` tail of every row.

---

## 10. Files, build and gates

```
aether-universe/
  DESIGN.md                      this file (+ DESIGN.md.sha256)
  Cargo.toml                     [package] name="aether-universe" version="0.1.0" edition="2021" rust-version="1.81"
                                 [dependencies] asolaria-tribit = { path = "../kernel/tribit" }
                                 [lints.rust] unsafe_code = "forbid"
  rust-toolchain.toml            [toolchain] channel="1.81.0" components=["clippy","rustfmt"] profile="minimal"
  .gitignore                     /target  /saves  /data
  src/main.rs                    flags, self-test, the loop: read line -> Mission -> Kernel::tick -> write snapshot -> Atlas
  src/sha256.rs                  FIPS 180-4, std-only, KAT self-test
  src/hbp.rs                     Row type, writer, HBI writer, sidecar writer, parser, verifier
  src/wide.rs                    256-bit signed integer for secret 7
  src/trits.rs                   bal3, bal3_width, cube cell, spoke, rooms; wraps asolaria_tribit
  src/sieve.rs                   odd-only bitset sieve to 10^7, prime iterator
  src/world.rs                   the 9 regions, 9 rivers, initial fields (data)
  src/agents.rs                  the 27 agents and the state machine
  src/kernel.rs                  Kernel, tick (§2.4), from_snapshot
  src/secrets.rs                 the nine computations and their rows
  src/evidence.rs                evidence states, verify, independent compare, final seal
  src/snapshot.rs                row set, chain, write/read of a tick
  src/atlas.rs                   map, HUD, decision panel, codex, timeline (read-only)
  src/commands.rs                parser -> Mission / Query
  src/script.rs                  --script reader
  src/sources.rs                 citations (path + row) for every MEASURED fact
  story/ch1.txt .. ch9.txt, ch9-end.txt    STORY text, first line "STORY|chapter=n|json=0"
  scripts/smoke.aether           look, map, wait 3, probe 13, probe 14, solve 27:13, save s, verify, quit
  scripts/full.aether            a complete deterministic playthrough of all nine secrets
  tests/determinism.rs           same seed + same script on two runs -> identical chain heads and identical bytes of every snapshot
  tests/golden.rs                scripts/*.aether -> expected chain head and expected stdout sha256 (pinned on first correct run, with the seed and toolchain named in the test)
  tests/no_float.rs              greps src/ tests/ examples/ for f32|f64|float literals -> fail on a hit
  tests/no_json.rs               asserts no file under the game folder ends in .json and no output line starts with { or [
  tests/privacy.rs               greps story/ and src/ for serial/IPv4/inbox patterns
  tests/formats.rs               every written row ends in |json=0; HBI rows recompute; sidecars recompute; chain recomputes
  tests/secrets.rs               each of the nine computations against the expected rows of §5 (the enwik8 and mythos ones skip with NOT_MEASURED when the input is absent)
  tests/reserved_cell.rs         3^9 ticks, no agent ever in (+,+)
```

Gates (all must exit 0 before the lead commits; the lead commits, this folder is never staged with
the case-collision under `docs/audit/hookwall-2026-10-18`):

```sh
export RUSTUP_HOME=D:/ncm-d3/rustup-gnu
cd D:/aether-universe-work/aether/aether-universe
cargo +1.81.0-x86_64-pc-windows-gnu fmt --all -- --check
cargo +1.81.0-x86_64-pc-windows-gnu clippy --release --all-targets -- -D warnings
cargo +1.81.0-x86_64-pc-windows-gnu test --release
cargo +1.81.0-x86_64-pc-windows-gnu run --release -- --script scripts/smoke.aether --no-story
grep -rnE 'f32|f64' src tests   # must print nothing
find . -name '*.json'           # must print nothing
```

A test that ran zero tests is `NOT_MEASURED`, not a pass: `tests/` must contain at least the nine
files above and `cargo test` must report at least 27 tests (the gate in `kernel/tribit`'s README
fails below 8 for the same reason).

Timing is measured, never judged: the design names the ACER figure of 242 ns per D1 value and the
sieve's size; a build that is slower is not red, it prints its own `ns_per_value` row.

---

## 11. Claims in this design for opus55 to attack

Listed so the verifier can go straight at them. Each is tagged with what would refute it.

| # | claim | tag | what refutes it |
|---|---|---|---|
| 1 | the 3D positions of the four biomes are Relic's map proposal and INFERIDO per the audit | NAMED | a Relic receipt that measures geometry |
| 2 | `switch_permille=569` is the receipt's grain and the lead's 57.0% is its one-place rounding | MEASURED (receipt) | the receipt row reading otherwise |
| 3 | the enwik8 white-space receipt is not on this seat in the scope listed | NAMED (search scope stated) | the receipt found inside that scope |
| 4 | a 256-bit signed integer suffices for the depth-81 walk (bound ≈ 93 × 3^81 ≈ 4 × 10^40) | NAMED (arithmetic bound, not yet run here) | an overflow in the built test |
| 5 | the cloud receipt's `CELL` rows are most-significant-first while `ADDRESS60` is least-significant-first | MEASURED (rows 15, 50 read this session: `r=5` → `1,-1,-1` = 9−3−1; `room_of_2=-1,1,0` = −1+3) | the rows reading otherwise |
| 6 | all nine kernel computations are integer-only and need no dependency beyond `asolaria-tribit` | NAMED | a build that needs a float or a crate |
| 7 | the reserved (+,+) cell is never reached by the transition table of §2.5 | NAMED | the 3^9-tick test finding it |
| 8 | the SHA-256 known answers | MEASURED (`sha256sum`, this session) | a differing `sha256sum` |
| 9 | 3^40 < 2^64 ≤ 3^41 with the three values printed | MEASURED (receipt row + integer Python this session) | arithmetic |
| 10 | tick 0's state is an input to the chain: `tick[0] = sha16(genesis \| state0)`, so a forged tick 0 with recomputed `state`, HBI and sidecars is refused | MEASURED (`forged_tick_zero_is_caught`, `a_forged_tick_zero_with_consistent_sidecars_is_refused_on_load`) | a forged tick 0 that `load` accepts |
| 11 | a run of one seat against its own seal is `REPRODUCED` and never `INDEPENDENTLY_VERIFIED` | MEASURED (`the_same_seat_reproduces_but_is_never_independent`, `the_same_seat_reproducing_a_seal_is_a_reproduction_and_never_independent`) | a same-seat or seat-less comparison that promotes |
| 12 | `data/enwik8` is used only when its sha256 begins `2b49720e` (the prefix is NAMED; the full hash is not carried) | MEASURED that a 100,000,000-byte file that is not enwik8 is refused (`tests/enwik8.rs`); NAMED that the prefix is the genuine file's | a genuine enwik8 that the game refuses, or a non-genuine file whose hash begins `2b49720e` |
| 13 | by default secret 8 is recomputed over the bundled page, not over enwik8, and the xz share is cited and never recomputed; the `SEALED` row counts this instead of writing nine | MEASURED (`the_sealed_row_counts_what_was_recomputed_instead_of_writing_nine`) | a seal that says all nine were recomputed over their full scope without a genuine enwik8 |

Nothing in this file was run as a Rust build: E=0, this is the design, the builder runs the gates.

---

## 12. Review fixes, 2026-10-18 (retractions beside the claims, not over them)

The verifier (a second seat of ACER-CLAUDE-FABLE5, `VERIFY.hbp` in this folder) refuted six of the
design's and the build's statements. `VERIFY.hbp` is left exactly as written: it is the record of
what was found on the build it examined, and its seal values belong to that build. What each
refuted statement said, and what stands now:

| # | was said | refuted by | now |
|---|---|---|---|
| 1 | `tick[0] = sha16("AETHER-UNIVERSE\|seed=<seed>\|json=0")`, so every chain starts at a constant | a forged tick 0 (region edited, `CHAIN.state`, HBI and sidecars recomputed, `this` kept) loaded clean at depth 23 | one rule for every tick: `prev` of tick 0 is the genesis hash and `tick[0] = sha16(genesis \| state0)`. No world rule moved: the map golden files differ only in the `snapshot=` field, every drawing is byte-identical. Every chain hash is new |
| 2 | a second run is an independent verification when seed, script, chain and answers match | `--also-verify` on this seat's own seal printed `independent=1` and `PROMOTE\|evidence=INDEPENDENTLY_VERIFIED` | independence needs a seat other than this run's; the same seat, or none named, is `REPRODUCED`, `NOT_MEASURED` with reason `SAME_SEAT` / `SEAT_UNKNOWN`, and promotes nothing. Host and binary are not recorded in the seal: `host_binary=NOT_MEASURED` |
| 3 | `data/enwik8` is the file when it is 100,000,000 bytes | the first 100,000,000 bytes of the local enwik9.gz (an `export-0.10` dump, sha256 `6e8412d4...`, 12.19 per cent white) were labelled `file=enwik8`, `scope=full` and solved secret 8 | the sha256 must begin `2b49720e`. That prefix is NAMED (the ACER seat's memory); the other 56 digits are not carried or invented. The cited 14.65 per cent stays CANNOT_SEE on this seat: the genuine file is not here |
| 4 | the `SEALED` row printed `secrets=9` | a hard-coded literal, printed even when secret 8 was recomputed over the 412-byte bundled page | `secrets_solved`, `recomputed_full_scope`, `secret8_scope`, `enwik8` and `xz_share` are counted from the kernel. By default eight secrets are recomputed over their full scope, the ninth over the page you hold; the xz share is cited and never recomputed |
| 5 | timeline chapter 9 carried "Omega 6.0, the Digital Planet" as MEASURED; chapter 7's sealed date as MEASURED; codex B05 cited the Omega 5.2 research for "Xylos is Felipe's world" | B03 and the seal say Omega 6.0 is NAMED; K04 says the sealed date is OPERATOR; the Omega 5.2 research does not name Felipe | chapter 9's event is the Mythos file only (MEASURED); chapter 7's event is OPERATOR; B05 keeps only what the research says; the Felipe link is B06, NAMED, with its own source |
| 6 | secrets 6 and 7 returned the literals `40` and `0` | gated by the computation but not derived from it | the tokens are the lcm the kernel computed and the depth-81 residual it walked; the gate is unchanged, the tokens are unchanged |

Also changed: `DESIGN.md` no longer carries a local home path (the verifier's privacy finding).

What is still not claimed: that the chain is an anchor against a forger who rewrites every tick and
the seal together (a hash chain proves consistency, not provenance; the seal's `chain` field and the
`.sha256` sidecars are what another seat compares), that a distinct *declared* seat is a distinct
machine, or that the 8-digit enwik8 prefix is more than an identity check against the wrong file.
