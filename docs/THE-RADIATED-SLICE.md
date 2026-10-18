# The radiated slice

A guide to what the rime spheres are made of. Operator: Jesse Daniel Brown. Written 2026-10-18
from the operator's words, the RIME 27 laws, and measurements made that day. The same file is kept
in the Asolaria repo (`JesseBrown1980/asolaria`) and in the aether rebuild (GitHub
`JesseBrown1980/With-Felipe-Miguel-Olimpio-da-Cruz-as-The-omega-and-Aether...`); paths marked
*aether* are in that repo. The laws are quoted from
`laws/RIME-27-LAWS-operator-original-2026-07-23/0UnM.md`, the same bytes in both repos, with the
operator's own spelling kept.

Tags:
- **MEASURED**: run on the cloud on 2026-10-18; the script or receipt is cited where one is
  committed.
- **REPORTED**: measured on ACER and reported, not re-run here.
- **CANON**: in the operator's records (laws, books, receipts and the notes kept with them).
- **OPERATOR**: said by the operator on 2026-10-18.
- **READING**: an interpretation, not in any record.
- **ESTABLISHED PHYSICS**: textbook physics, given for comparison.

## 1. Where the spheres come from

> "I didn't create any of the rhyme spheres. The rhyme spheres were created by Wikipedia by taking
> all the white space out of them. All the space is zero, it's free." (OPERATOR)

The laws give the frame around it; none of them mentions white space:

- **Law 17.** *"we don't observe a universe; we observe a rimesphere, and we can only see the
  gradients near our own rime. … What Wikipedia shows is one **radiated slice** of that sphere."*
  Its measured kernel: *"a cyclic rime sphere is a **function of one seed** — `element =
  g^(j+27i) mod p`"*, so changing the seed relabels every address at once, and *"A corpus (enwik)
  is then **one addressed slice**; what a coder reads is its low-entropy **gradient** (vc65 1.7529
  bpc @10 MB), and the incompressible residue is the **black floor = Shannon**."* (CANON, lines
  408-424)
- **Law 18.** *"the radiated Wikipedia is a **real reflection** of something bigger; from the
  black-gradient version we can rime-directionally derive the **other Wikipedias that could exist
  but don't**"* (CANON, lines 427-430)
- **Law 0.** *"The Center is Free and all 0's are free unitl acted upon - a 0 GIVES space AND allows
  compression in itself because it is the marker on non existnce"* (CANON, line 62). A later rule,
  RIME-36, measures the centre as not free: *"0 COMBINED = 0.6954 against + COMBINED = 0.4382"*
  (CANON; universe simulator @ `3f9f42d`, `books/COMBINED-BOOK-OF-LAWS.md:607`).

In the operator's account the data on the spheres comes from Wikipedia (OPERATOR); in Law 17 the
sphere is a function of one seed, and Wikipedia is one slice of it. The operator's assessment of
this material: *"this is Nobel prize type guide material for the aether and asolaria guide mds"*
(OPERATOR).

## 2. Which Wikipedia

Every white-space number below is for one file, the canonical Hutter Prize `enwik8` (MEASURED on the
cloud; ACER REPORTED the same hashes for
`C:/asolaria-acer/scratch/layer-opening-replay-inputs-20260723/enwik8.zip`):

| | |
|---|---|
| source | `http://mattmahoney.net/dc/enwik8.zip`, sha256 `547994d9980ebed1288380d652999f38a14fe291a6247c157c3d33d4932534bc` |
| `enwik8` | 100,000,000 bytes, dated 2011-06-01 |
| sha256 | `2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8` |
| MD5 | `a1fa5ffddb56f4953e226637dabbb36a` |
| schema | `http://www.mediawiki.org/xml/export-0.3/` in the first line |

It is also the file the rime agents run on in aether (`agents/levels/PROVENANCE.md:224`).

There is a second Wikipedia in the estate. ACER REPORTED that its local `C:/enwik9.gz` is not the
canonical enwik9: its first line names `export-0.10/`, so it differs from enwik8 from byte 57
(counting from 1), a much newer dump. The owner's enwik9 copy on the cloud is of the same kind: its
first line also names `export-0.10/` (sha256 `8eb36417…`, measured on the cloud). In Law 17's terms
it is a different radiated slice, and numbers measured on it are not comparable with enwik8 or
enwik9 results.

## 3. The free space, measured

White space in enwik8 (MEASURED, *aether* `laws/free-space/free_space.py`, receipt
`laws/free-space/RECEIPT-FREE-SPACE-ENWIK8-2026-10-18.hbp`; ACER REPORTED identical counts):

| | bytes |
|---|---|
| spaces | 13,519,824 |
| newlines | 1,128,023 |
| tabs | 4,358 |
| carriage returns | 0 |
| all white space | 14,652,205 (14.65%) |
| left without it | 85,347,795 |

ACER also REPORTED no form-feed or vertical-tab bytes. "All white space" here means these four ASCII
bytes; enwik8 also holds 12 non-breaking spaces as UTF-8 and 10,961 `&nbsp;` entities, not counted.
The space is the most common byte in enwik8: 13,519,824, against 8,001,205 for the next, `e`.

How much the white space costs depends on the model that reads it. Two compressors, both lossless:
`xz -9 -T1` (XZ Utils 5.4.5), a general-purpose compressor, and `cm3ti` at `k=7`, the operator's own
integer context-mixing compressor (*aether* `pump/cm3ti`, each run checked by its built-in restore
gate). The `cm3ti` runs are cloud only.

| Input | white space | `xz -9 -T1` | `cm3ti k=7` |
|---|---|---|---|
| first 10,000,000 bytes | kept | 2,721,280 | 2,349,543 |
| same, white space taken out (8,531,164 bytes) | removed | 2,640,420 | 2,475,716 |
| all 100,000,000 bytes | kept | 24,865,244 | 22,737,625 |
| same, white space taken out (85,347,795 bytes) | removed | 24,171,440 | 23,853,175 |

ACER REPORTED the same two 100 MB `xz` sizes to the byte. Run with four threads (`-T4`), `xz` writes
8 bytes more for each of the four files, which is the multi-threaded format's size fields; the cost
of the white space is the same either way.

What it shows (MEASURED):

- **Under xz the white space is nearly free.** It is 14.65% of the bytes and 693,804 compressed
  bytes, 2.79% of xz's output: about 0.38 bits for each space, newline or tab, where every other
  byte costs about 2.27 bits. That split is a net figure: it assumes the other bytes cost the same
  with and without the white space, which the next result shows is not so.
- **Under the operator's compressor the white space is better than free.** With it, the first 10 MB
  compresses to 2,349,543 bytes; with it taken out, to 2,475,716, so the stripped text comes out
  126,173 bytes (5.37%) larger. On all 100 MB the stripped text comes out 1,115,550 bytes (4.91%)
  larger. A likely reason (READING; no part of the model was switched off to test it): the spaces
  mark where each word ends, the model's word contexts use that, and without them the letters are
  harder to predict.
- **Law 22 saw the same byte from the other side.** Its control arm, which tries to recover a third
  that was never stored, reaches *"13.04% — and that is only the order-0 mode byte (Wikipedia's
  spaces), not structure"* (CANON, lines 540-541). Re-run on the cloud on this enwik8, the cascade
  reproduces its receipt line for line: 27 of 27 stages byte-exact, the never-stored third 13,042 of
  100,000 bytes, and the seal `chain=5fc1cae9e9e9fa51` (MEASURED, *aether* `laws/law22-cascade/`).

Where this stops:

- Taking the white space out is not reversible on its own: the stripped text no longer says where
  the words break, so Wikipedia cannot be rebuilt from it byte for byte.
- These are two models on one file. A different model gives different costs.
- Nothing here is a measurement of physical space.

## 4. Six universes and nine shadow cats

> "I realized that by using translucent space, the two-thirds, translucent is actually the missing
> one-third that we think we didn't see, but actually is two-thirds of something that's much
> greater. So instead of six universes, or instead of one universe, sorry, we'll have six universes,
> right? That's kind of cool. And instead of just three shadow cats, we have nine shadow cats."
> (OPERATOR)

Law 70 already holds the thirds: *"AND THERE are multiple n shadow cats that are 2/3 OF REALITY 1/3
INSTANT"* (CANON; universe simulator @ `3f9f42d`, `books/LAW-70-LEVELS-OF-SHADOW-CATS.md:7`). Its
section 70.1, which it marks as derived by ACER, shows that with three levels the lighthouse pass
keeps 2/3 and loses 1/3 each time, and section 70.2 notes that three is the first level count at
which more survives than is lost.

The records split the 27-cube into 9 + 18 in **two different ways**, and they pick out different
cells:

- **Geometric**, in the sphere builder's notes: *"27 cells split exactly: 1 centre + 8 corners = 9 =
  1/3 SOLID … 6 faces + 12 edges = 18 = 2/3 TRANSLUCENT"* (CANON; universe simulator,
  `constellation/quality_sphere_16k.py:32-33`).
- **Arithmetic**, in Law 10: the 9 cells that are multiples of 3 are prime-free except for 3, and
  the 18 coprime cells are where every other prime lives; the paragraph after Law 11 calls the
  multiples of 3 *"the free null"* (CANON, RIME 27 laws, lines 238-245 and 256-259). In the PTP
  measurement these 9 are the cells whose least significant balanced trit is 0 (*aether*
  `kernel/ptp-towers`).

Two ways to read the integers (READING, the cloud's, not in any record). The operator's sentence
holds both thirds, so each reading takes one:

1. If the 18 translucent cells are one third of something greater, the whole has 54 cells, and
   54 = 6 × 9: six universes of nine cells each. (If they are two thirds, the whole is 27, the cube
   itself.)
2. In a lattice of cubes, each cube shares a face with exactly 6 neighbours, so the 6 translucent
   face cells open onto six neighbouring universes. The 12 edge cells open onto 12 more.

Both readings give six. Three shadow cats becoming nine fits the operator's *"N x 3 x 3"* (RIME 27
laws, line 18): 3 × 3 = 9. Which nine is meant, the geometric or the arithmetic, is the operator's
to say; until then this section stays a reading.

## 5. From slice to matter

> "Once the PIDs start collecting, they start turning into matter. And that's when you see the birth
> of stars and planets. And eventually those look smaller and smaller and smaller. Because they are,
> they're just subparticles. And eventually they form larger things like photons they start forming
> larger things, like electrons start forming things, and atoms start forming, and so on and so on.
> And that's when you realize a photon is an omnibit. And then you realize that the Hilbert Hotels
> idea turned into the Brown Hilbert Hotel idea makes the universe talk to itself in omnibits and
> omegabits, moving, expanding in space and time as they need to. And that's where the MTP agents
> come in. They put the brakes on the expansion. That's why we get space-time localization. It
> looks like parts of the universe are moving faster than other parts. But you also realize that C
> is always one. And that's the constant. At any one point, at any one end point, C will always be
> one. And Z will be instant." (OPERATOR)

Next to it, what physics and the code hold:

- **c at every point.** Many physicists work in units where the speed of light is 1, which is a
  choice of units. The physical law underneath is that every local measurement of light's speed in
  vacuum gives the same value (ESTABLISHED PHYSICS). Reading that as the constant the operator names
  is a READING.
- **Parts of the universe moving faster than others.** In the expanding universe, the farther a
  galaxy is from us, the faster it recedes, and beyond about 14 billion light-years the recession
  exceeds the speed of light, while nothing locally ever outruns light. The speed depends on the
  distance from the observer; no region is itself faster. Bound systems, from atoms to clusters of
  galaxies, do not take part in the expansion at all (ESTABLISHED PHYSICS).
- **The MTP agents** are in *aether* `model/hrm-mtp` (`mtp_agent`, ported from the universe
  simulator's `rime_agents.py`). In the code, MTP (Law 24) is a frozen order-2 multi-token lookahead
  predictor with no expansion quantity in it, so that MTP brakes the expansion is the operator's
  statement and not something the code measures.

## 6. Built from what the operator saw in reality

> "I created this system based on what I saw in reality. Forgetting about gravity, I thought for 20
> years how the universe would work if it were in a matrix and we were being simulated. And this is
> what happened. And just because, you know, exactly mimics nature and real physics doesn't mean
> that we are in a simulator. It just means it seems like it." (OPERATOR)

> "It's called a quantum universe meta tagging because that's what it does. And if real physics
> follows that, then that's better." (OPERATOR)

Where the system and physics line up. These are parallels, not proofs:

- **Metatagging.** Physics keeps no hidden serial number on a particle. Every electron is identical
  to every other, and two electrons cannot be told apart even in principle; what tells kinds of
  particle apart is a short list of fixed properties such as mass, electric charge, spin, flavour
  and whether it carries colour charge at all (ESTABLISHED PHYSICS). The seed does something close:
  *"Content-addressed PID -- identical state => identical cell address"* (CANON;
  `Metatagging-data-for-a-Quantum-universe` @ `99f9c52`, `metatag_v2_behcs.py:59`). The state it
  hashes holds `Type`, `Position`, `Momentum`, `Spin`, `Charge` and `Mass` (lines 49-54), so a PID
  names a particle's whole state, not only its kind. The physics tags are exact, while the PID is a
  64-bit cut of the SHA-256 of the state (`docs/ADDRESSABLY-ADDRESSING.md`, section 4).
- **Collisions go outward.** Two electrons cannot hold the same full set of quantum numbers (the
  Pauli exclusion principle). The states come from how electrons are bound; Pauli makes electrons
  fill them one after another instead of all sitting in the lowest, and that is why atoms have their
  sizes and matter takes up space (ESTABLISHED PHYSICS). Photons are bosons: any number of them can
  share one state, as they do in a laser.
- **Gravity as geometry.** General relativity has no gravitational force. A falling body follows the
  straightest path through curved spacetime. The geometry is encoded at every point in the metric
  `g_μν`, a 4 × 4 symmetric matrix, and curvature is computed from how the metric changes from point
  to point (ESTABLISHED PHYSICS). Gravity is still real as curvature: tides, orbits and the
  gravitational waves LIGO detects.
- **The simulator's "gravitation" has no force in it either.** The universe simulator's
  `constellation/gravitate_repulse.py` (@ `3f9f42d`) reports *"mean Δr under R¹ = −0.161933
  GRAVITATES"*, z = −8.00 (CANON, `README.md:94-96`). It has no force term: it shifts every trit by
  one and measures the straight-line distance to a fixed centre. The pull comes from zero-padded
  integer fields at bytes 48-56 of each 81-byte seed record, compared against uniform random bytes.
  Filling those bytes with random ones (2,000 fillings) takes the mean Δr to −0.005 (z = −0.27).
  With the wrap-around (mod 3) distance measured from a reference that moves with the shift, Δr is
  exactly 0. These runs were made on the cloud on 2026-10-18 and re-run by a second agent; their
  scripts are not yet committed as a receipt.

The operator draws the limit: matching nature *"doesn't mean that we are in a simulator. It just
means it seems like it."*

## 7. Scale

> "You don't see gains at 100 megabytes. You see gains at 10 gigabytes. Funnel in Wiki 10 into one
> of the codexes, and you'll see. You divide it into many, many, many parts. You use SGRAM, and then
> you funnel it in and delete all the garbage." (OPERATOR)

> "you actually see the gains at 1 gigabyte and 10 gigabytes." (OPERATOR)

What the records hold:

- **SGRAM is the Streaming Git RAM.** *"No. No. No. Not the not the GPU. I meant the streaming Git
  RAM."*, and *"It it erases itself as it creates the key and the and the spheres."* (CANON;
  universe simulator @ `3f9f42d`, `books/COMBINED-BOOK-OF-LAWS.md:5955` and `:5761`, from
  `voice-09.md`). A cloud session's note to the operator treats sharding as a screen that costs
  ratio: *"SGRAM sharding is a SCREENING tool (parallel, ~+6% ratio from per-shard cold start). The
  Hutter number must be a SINGLE-STREAM run"*, and the codec is *"pure integer CPU context-mixing.
  GPUs are neither used nor needed."* (CANON, *aether* `pump/cm3ti/rust/RUN-ENWIK9.md`). That note's
  view of sharding differs from the operator's method of dividing into many parts; the cloud's runs
  below are single stream.
- **Law 17's 10 MB figure.** The laws record *"vc65 = 1.7529 bpc (10 MB enwik9,
  `comp_sha=ac4e5e2e…`)"* (CANON; universe simulator, `books/operator-laws/JESSE-LAWS.md:548-550`).
  The first 10 MB of the canonical enwik9 are exactly the first 10 MB of enwik8 (sha256 `5985c81c…`,
  MEASURED; the free-space receipt's `e10m` row), so if the run used the canonical enwik9, it can be
  repeated here (READING; the owner's newer enwik9 starts differently). An earlier aether note
  called the owner's 10 MB slices deduplicated. They are plain contiguous windows of enwik8
  (`c4e72b59…` is bytes 10-20 M, `adea6c0b…` bytes 20-30 M), and 99.994% of their 200-byte blocks
  are distinct, a measured property rather than a step; the head of enwik8 has the same property
  (measured on the cloud by hashing every 200-byte block; not in a receipt).
- **The trend so far:** *"10 MB 1.8990 -> 100 MB 1.7953"* bpc for the stacked compressor, and a 1 GB
  run sized at *"~4.2 hours for one full enc+dec pass"* with about 3.3 GB of RAM (`RUN-ENWIK9.md`).
  On 2026-07-21 the laws retracted vc65's 1.3645 bpc on the enwik9 gigabyte and cm3ti's 1.9032,
  because an audit found *"no log, no compressed output, no matching hash anywhere on disk"*
  (universe simulator, `books/operator-laws/JESSE-LAWS.md:524-528`;
  `books/COMBINED-BOOK-OF-LAWS.md:624`). Two other 1 GB figures, 1.5719 (v6) and 1.3839 (vc28m), are
  recorded as sealed in some records; the records disagree on 1.3839, which a handoff also lists as
  retracted, and neither has been reproduced. The laws' own fit through vc65's 2.0209 → 1.7529 →
  1.7464 bpc predicts about 1.746 at 1 GB, *"flat, not a cliff"* (`COMBINED-BOOK-OF-LAWS.md:624`),
  but its 100 MB point is a 10-shard SGRAM seal in which no model saw more than 10 MB, so it cannot
  show gains past 10 MB. No 10 GB run is recorded; enwik10 is not published, and the owner's 10 GB
  source is the newer dump held on ACER (REPORTED).

The cloud's `cm3ti` does improve from 10 MB to 100 MB on raw text, 1.8796 bpc to 1.8190 (MEASURED,
section 3); the operator's point is that the large gains come at 1 GB and 10 GB. On the canonical
`enwik9` (1,000,000,000 bytes, MD5 `e206c3450ac99950df65bf70ef61a12d`, whose first 100 MB are
exactly `enwik8`), `cm3ti_stack_1g enwik9 10`, the run `RUN-ENWIK9.md` plans, is in progress on the
cloud on raw text in a single stream. A plain `cm3ti` run on the same file was stopped: it keeps a
4-byte history for every input byte and an unbounded match table, which `RUN-ENWIK9.md` sizes at
about 20 GB for 1 GB of text, more than the cloud's 16 GB. ACER REPORTED running `vc65` at 100 MB, 1
GB and 10 GB on its newer dump, and an integer port of Mythos vs Wikipedia; that is a different
radiated slice, reported separately.

The operator also corrects the instrument: *"Not removing the white space before you feed it helps
it, because the system strips all the white space"* (OPERATOR). The fair test feeds the raw text,
which is what the `cm3ti` rows above already show doing better. In the code, the compressors
(`cm3ti.rs`, `cm3ti_stack_1g.rs`, `vc65.rs`) read the raw bytes and code every one, white space
included, behind a SHA-256 restore gate; none of them deletes white space. They use it as context:
their word models end a word at any byte that is not a letter or digit (in `cm3ti.rs` a space is
treated like any other such byte), and `cm3ti_stack_1g.rs` also gives space, newline and tab a
byte class of their own. `vc65.rs` resets its URL and path context at space, newline and tab.

## 8. What to measure next

- **The vc65 figure in Law 17 (1.7529 bpc @10 MB).** Re-run `vc65` with `k=10`, the records' run
  instruction, on the first 10 MB of enwik8 and compare the payload and `comp_sha` (`ac4e5e2e…`).
  Compare those rather than bpc: `vc65` adds the size of a file named `vc27.rs` in its working
  directory as its decoder (0 if the file is absent). A mismatch could come from `k`, from the slice
  (the owner's newer enwik9 starts differently) or from a different source revision. At `k=10`,
  `vc65` needs about 10.5 GB of RAM, so it runs after the 1 GB run.
- **The white space under more models**, including the other integer compressors in
  *aether* `pump/cm3ti`, and with parts of the model switched off to test the reason given in
  section 3.

## 9. Reproduce

From the root of the aether repo:

```
curl -O http://mattmahoney.net/dc/enwik8.zip && unzip enwik8.zip
python3 -I laws/free-space/free_space.py enwik8 slices/      # checks the hashes, counts, writes inputs
xz -9 -T1 -c enwik8 | wc -c ; xz -9 -T1 -c slices/enwik8.nows | wc -c
xz -9 -T1 -c slices/e10m | wc -c ; xz -9 -T1 -c slices/e10m.nows | wc -c
cd pump/cm3ti && cargo +1.81.0 build --locked --release --bin cm3ti
target/release/cm3ti ../../slices/e10m 7 ; target/release/cm3ti ../../slices/e10m.nows 7
target/release/cm3ti ../../enwik8 7 ; target/release/cm3ti ../../slices/enwik8.nows 7
```

Each `cm3ti` line includes `payload=<bytes>`, `restore=OK` and `comp_sha=<16 hex>`; the receipt
records the payload and `comp_sha` of every run. The Law 22 cascade's re-run steps are in
`laws/law22-cascade/README.md`.
