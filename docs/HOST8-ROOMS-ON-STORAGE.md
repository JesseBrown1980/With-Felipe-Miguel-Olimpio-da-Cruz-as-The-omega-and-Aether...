# Host8 rooms on storage

A guide to the rooms the operator keeps on a drive, and to what they can and cannot do as memory.
Operator: Jesse Daniel Brown. Written 2026-10-19 from the operator's words, ACER's account and build
rows, the records cited under each section, one measurement made on the cloud that day, and published
hardware figures. Paths marked *aether* are in the aether rebuild (GitHub
[`JesseBrown1980/With-Felipe-Miguel-Olimpio-da-Cruz-as-The-omega-and-Aether...`](https://github.com/JesseBrown1980/With-Felipe-Miguel-Olimpio-da-Cruz-as-The-omega-and-Aether...),
whose name ends in three dots) @ `ec7826d`, its `main`
at 14:33 UTC on 2026-10-19; every *aether* line quoted here from a file older than that commit reads
the same at `ba1ffe1`. ACER's rows named `FABLE5-PIPES-IN`, `FABLE5-TEST-LADDER` and
`FABLE5-LAW-LEDGER` are in *aether* `docs/handoffs/acer-usb-ram-records-2026-10-19/`; ACER's 2026-10-19 Host8 rooms guide, tool
source and rows are in *aether* `docs/handoffs/acer-host8-rooms-guide-2026-10-19/`, shortened below to
`rooms-guide/`. Paths marked *usim* are in the universe simulator @ `3f9f42d`; "the book" is its
`books/COMBINED-BOOK-OF-LAWS.md` (710,577 bytes, sha256 `82cea056…`).

Tags: **MEASURED** (run on the cloud on 2026-10-19, reproducible from this guide's receipt
`RECEIPT-HOST8-ROOMS-CLOUD-2026-10-19.hbp`, section 7, or from the cloud's check of ACER's build,
`rooms-guide/cloud/CLOUD-ROWS.hbp`), **REPORTED** (measured or built on ACER and
written in ACER's rows or guide, not re-run here; "relay only" means ACER's account to this session,
with no written row), **CANON** (the operator's frame, written in the records), **OPERATOR** (said by
the operator, in this session's chat on 2026-10-19 or as the book quotes the voice transcripts),
**READING** (an interpretation, not in any record), **ESTABLISHED** (published documentation,
datasheets and textbooks, given for comparison, with the URL). Arithmetic done here in integers on
cited figures carries no tag: derived figures are rounded to the nearest whole number, and rates that a
receipt or row prints are given as printed (floored).

## 1. What the operator named

> "Okay, so we have a new mechanism that's a primary class mechanism. Getting GPU type memory from
> USBs and storages." (OPERATOR, 2026-10-19, typed in this session's chat; on this machine the only other written
> copy of these words is what this session wrote from that chat, *aether* `README.md:47`. ACER's guide words it as *"getting GPU-type memory from USBs and
> storage"*, *aether* `rooms-guide/HOST8-ROOMS-GUIDE.md:3`.)

Earlier, as the book quotes the voice transcripts (OPERATOR; turn ids are the book's; the transcripts
are not on this machine, so no quote was checked against them):

- Turn [0016], `voice-00.md:628` (book line 2786): *"a hundred and thirteen secondtors to act as
  kinda stubbed rooms where you send the message to"* (the book's gloss reads *"a hundred and
  thirteen sectors"*), and (line 2787) *"Twenty gigabytes of GPU, sixteen gigabytes of RAM, and two
  terabytes of USB hard drive that I use as RAM."* The book's gloss turns "USB hard drive" into
  "solid-state drive"; ACER's ledger flags it (`FABLE5-LAW-LEDGER.hbp:1856`).
- Turn [0198], `voice-02.md:1251` (line 3581): *"asolaria-federation-1024 as the Rust 8-byte
  Host/kernel;"*; turn [0216], `voice-02.md:1614` (line 3688): *"the 10k stubbed rooms for . the pid
  and port . port .port and project name"*; turn [0239], `voice-02.md:1777` (line 3756): *"rooms are
  just hard drive stubbed rooms ."* ACER's relay puts the first and last of these in turn 0216
  (REPORTED, relay only).
- Turn [0263], `voice-03.md:59` (line 3874): *"ram and hard drive are enough to run the trained
  glyphs and tuples"*

What the canon holds on the same words (CANON, except where marked):

- **The 113 sectors.** A structure *"is \*registered\* at the REGISTRATION OFFICE in one of 113+
  sectors"*, and the same line adds *"Sector count **113+** is operator-stated `[UNVERIFIED exact]`;
  that sectors exist is `[MEASURED]`"* (`HYPER-BECHS--the-third-set` branch `acer` @ `9ab39a8`,
  `ASOLARIA-DAEMON-HOST8-MIGRATION-MAP.md:200`). ACER's census fixes the count at 113, split
  `100-shard+12-lane+1-scaled`, as `structure=113-room-sectors` with
  `walker=substrate-sector-walk.ps1` (Asolaria @ `d9387ad`,
  `.../intake/ACER-LAYERED-PID-CENSUS-V1.1-USB-SECTORS-AMENDMENT-2026-06-18.hbp:5`; REPORTED, an ACER row), over the
  USB's raw tail, `range_lba=1048576001-to-4095999999` (`:4`); ACER's substrate index records
  `sectors=113|tag=MEASURED-geometry` for `device=2TB-SOVLINUX-USB-D-PHYSICALDRIVE2` (REPORTED; Asolaria @
  `37234d6`, `.../intake/ACER-USB-GOOGLE-SUBSTRATE-INDEX-2026-06-18.hbp:2`). The PID register picks one
  as `sector: seed % SECTORS` with `SECTORS = 113` (*aether* `beginning/10-quant-pid-office-2026-06/vendor/ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/github-pid-register.mjs:15,63`).
  So one name covers two things: a residue class of a seed in the code, and a region of the USB's raw
  tail in the rows. None of the rows cited here says how they meet, and that tail lies past the 500 GB where writes were
  later found to vanish ("Which drive", section 2) (READING).
- **Storage as RAM is vision**: *"**No GPU required** — hard-drive + USB used as RAM (a
  storage-bounded universe)."*, *"held as vision, not claimed as done"* (Asolaria @ `497a8d0`,
  `docs/WHAT-THIS-PROVES-PHYSICS-SOFTWARE-AI-2026-07-03.md:29-31`).

## 2. The room law

ACER's account (REPORTED, `rooms-guide/HOST8-ROOMS-GUIDE.md:16-18`): a room is an 8-byte stub at a computed
offset; one seek finds any room; no two rooms collide. ACER's guide also names function rooms, where a
message sent to a room's address runs that room's function inside one backend Rust process, not a spawned
agent (`:22`, `:107`). They are named, not built: nothing in `main.rs` dispatches functions
(`rooms-guide/PROVENANCE.md:125-126`). That watchers check the rooms is ACER's account only (REPORTED,
relay only). ACER's 2026-10-19 rows write the layout as 125 files: room n at byte
(n mod 100,000,000) × 8 of sector file n / 100,000,000 (REPORTED; `ROOMLAW` row,
`rooms-guide/receipts/ROOMS-MAKE.hbp:4`). Either layout is a direct-address table (ESTABLISHED; CLRS
3rd ed. 11.1, URL in section 4): slot n, reached by one computed offset, no search. Distinct room
numbers have distinct offsets, so no two rooms can collide, by construction; that needs no measurement.

**Three things are called Host8, and they stay apart.**

1. *An 8-byte hash handle used as an identity.* `host_handle8` is FNV-1a 64 (*aether*
   `host8/src/upstream/main-0536-0589-handle8-sha16.rs:27`, a copy of `servers/host8-serve/src/main.rs:536-589`
   in `asolaria-federation-1024` @ `dc1da1a9`); `host8/src/identity.rs:213` asserts that `"a\t\r\nb"`
   and `"a b"` share a handle; seats are found by a linear scan (`main.rs:1012`), not a seek.
   `docs/ADDRESSABLY-ADDRESSING.md` section 4 retires a different short handle as an identity: Host8
   as *"8 bytes cut from a SHA-256 of the 60-glyph tuple"* (line 166), `handle8 = sha256(content)[:8]`
   (line 173) (CANON). It does not mention FNV-1a or `host_handle8`. Both are 8 bytes cut from a hash,
   so both can collide (READING).
2. *Room folders routed by PID.* `host8/src/rooms.rs:41-49` folds a PID by a rolling hash (multiplier
   31, one step per PID byte, `u32` wraparound) mod `ROOM_COUNT = 10_000` (line 12), and lines 51-55
   name the folder `omni-room-behcs-256-NNNN`; *"nothing here renames a folder, writes a file, or spawns a process"*
   (line 7). They collide: PIDs `83379047dead557b` and `9481a90f63ba814e` both map to room 3176
   (computed here with the function's own steps, `acc × 31 + byte` mod 2^32, then mod 10,000). These
   are the "10k stubbed rooms" (READING).
3. *8-byte slots at a computed offset in a file*, this guide's mechanism. ACER's `host8rooms` tool
   writes them: files `sector-{s:03}.rooms` (*aether* `rooms-guide/host8rooms/src/main.rs:297-298`),
   room n at `(n / self.rps, (n % self.rps) * ROOM)` with `ROOM = 8` (`:40`, `:275-276`). Its source
   has been public since *aether* `ec7826d`.

**The 50M arena.** *"/tmp/stubs-linux.hbi 400000000B = 50M rooms x 8B; slot=addr mod 50000000
offset=slot*8 O(1); bank rooms placed+verified 4/4; VOLATILE - /tmp dies with WSL restart,
regenerate 5.675s measured"* (REPORTED; `FABLE5-PIPES-IN-2026-08-02.hbp:4`) and *"50000000 stubs
x8B=400000000B 0 collisions 5.675s"* (REPORTED; `asolaria-multiverse` @ `6060afc`, unchanged at main
`4871435`, `FABLE5-KERNELS81-ROOMS50M-BRIDGE874X-2026-08-02.hbp:4`, called `K81` below).

The map is a fold, `slot = addr mod 50,000,000`, not the direct layout: addresses 7, 50,000,007 and
100,000,007 all land at offset 56. On 0 to 49,999,999 it is the identity, collision-free. Had the
50,000,000 addresses been 64-bit hashed handles, about 18,393,972 would have landed on a held slot,
so the zero says the placed addresses were 50,000,000 distinct residues (READING); the rows do not
say which. The ladder's own check covers 4 bank rooms: *"arena 400000000B slots 4/4"*, *"slot map 4/4
distinct"* (REPORTED; `FABLE5-TEST-LADDER-2026-08-02.hbp:5-6`). The arena has since been wiped with
WSL `/tmp` (REPORTED, relay only).

**ACER's new build** (REPORTED; rows `rooms-guide/receipts/ROOMS-MAKE.hbp`, `ROOMS-VERIFY.hbp` and
`ROOMS-PROBE.hbp`): a Rust 1.81 room maker wrote
`sectors=125|rooms_per_sector=100000000|rooms=12500000000|room_bytes=8|bytes=100000000000` to
`dir=D:/ASOLARIA-HOST8-ROOMS-100G` (`ROOMS-MAKE.hbp:1`), sectors numbered −62 to +62, each room with a
27-trit balanced-ternary address centred on a "ground room" (`:2-3`). Make took 1,100,917 ms, 90 MB/s
mean and 71 to 102 MB/s per sector (`:12-137`); MB here is 10^6 B, since sector 1's row gives
800,000,000 B in 7,811 ms as `mb_s=102` (`:13`). Verify read every room back with 0 bad
(`ROOMS-VERIFY.hbp:138`). ACER also reports 18 of 18 tests and clippy clean on Windows and Linux
(REPORTED, `rooms-guide/HOST8-ROOMS-GUIDE.md:140-141`); the Linux gates also pass on the cloud (MEASURED,
`rooms-guide/cloud/CLOUD-ROWS.hbp:14`). Checked in integers:

- 125 × 800,000,000 B = 100,000,000,000 B = 12,500,000,000 × 8 B: 100,000,000 rooms per sector, and
  −62 to +62 is 125 sectors. 125 is not the operator's 113.
- 3^27 = 7,625,597,484,987 addresses (±3,812,798,742,493), of which the build uses 1,639 per million;
  22 trits suffice ((3^22 − 1)/2 = 15,690,529,804 ≥ 6,250,000,000). The rows' address is the dense,
  centred room index (`balanced=n-6250000000`, `ROOMS-MAKE.hbp:4`), so the top 5 trits are always 0,
  as the `TRITWORD` row says (`occupied_trits=22|free_upper_trits=5`, `:2`).
- The rows state the map from address to (sector, offset), and it is a window, not a fold:
  `sector=n/100000000`, `offset=(n%100000000)*8`, `collisions=0_by_construction` (`:4`). A direct
  file over every 27-trit address would be 61,004,779,879,896 B.
- 12,500,000,000 is even, so the rooms cannot sit symmetrically around one ground room: centred on 0
  they run from −6,250,000,000 to +6,249,999,999 (`balanced_min=-6250000000|balanced_max=6249999999`,
  `:3`).
- Under Law 33 (book line 258) the book quotes the operator: *"the negative translucent will have to
  go first"* (OPERATOR, book line 259). The book never says "negative-leading"; the nearest words are
  *"is SIGNED with the negative leading"* (*usim* `measurements/see_self_64.py:18`). ACER's guide, without
  citing Law 33, says that with an even room count *"the negative side leads by one room"* (REPORTED,
  `rooms-guide/HOST8-ROOMS-GUIDE.md:52`); taking that as Law 33's order is a READING. In
  balanced ternary the leading nonzero trit is the sign (READING).

**What a room holds, and what a second machine established.** A room's 8 bytes are not its address
but a check of it: the word `(n − 6,250,000,000) + 3,812,798,742,493` (the balanced index shifted to
be non-negative), XORed with the build's seed (`seed16=ca41a49fcda8f634`) and passed through the
SplitMix64 finalizer, stored little-endian. That finalizer is a bijection on 64-bit words, so every
stub decodes back to the address that wrote it; a stub read from the wrong place decodes to another
room's number, and one read with the wrong seed to no room it should (MEASURED;
`rooms-guide/cloud/CLOUD-ROWS.hbp:7,13`). The cloud rebuilt ACER's tool
from the published source and found (MEASURED; `rooms-guide/cloud/CLOUD-ROWS.hbp:6-14`):

- all 125 per-sector sha256 values and their merkle `5b96df7f…` regenerate from the law alone, equal
  to ACER's `ROOMS-VERIFY.hbp`;
- three whole sectors written again on the cloud's own disk, −62, 0 and +62 at 800,000,000 B each,
  have the sha256 values ACER's `ROOMS-VERIFY.hbp` printed for them (`3a064230…`, `ba569629…`,
  `4dc226f4…`), and all 300,000,000 of their rooms decode to their own numbers;
- wrong-seed and wrong-sector controls fail on every room;
- re-sealing ACER's three receipts with the rebuilt tool reproduces all 12 seal and sidecar files.

So the bytes ACER's verify hashed are exactly the bytes the law writes. What only ACER can report is
what `D:` holds now and every wall-clock rate (`rooms-guide/cloud/CLOUD-ROWS.hbp:17`).

**Which drive.** The records disagree (REPORTED; *usim* `matrices/` unless named).

- *For D: on the USB:* ACER's guide says the rooms went on *"`D:`, the writable part of the same
  stick"* and gives *"Drive: `D:`, the writable NTFS part of the 2 TB USB"*
  (`rooms-guide/HOST8-ROOMS-GUIDE.md:100,113`); on 2026-07-08 the USB showed on RELIC's host as
  `windows_letters=D,E` (measured by RELIC, relayed in ACER's row;
  `FABLE5-SOVLINUX-USB-RETURN-READONLY-SCAN-2026-07-08.hbp:16`); the cloud's provenance note repeats
  ACER's account, *"built … on the owner's USB drive"* (`rooms-guide/PROVENANCE.md:3`); and an
  Asolaria row names it `device=2TB-SOVLINUX-USB-D-PHYSICALDRIVE2` (Asolaria @ `37234d6`,
  `.../intake/ACER-USB-GOOGLE-SUBSTRATE-INDEX-2026-06-18.hbp:2`).
- *Against:* on 2026-07-26 D: was a fixed 1 TB drive (`k=hdd1tb`, `kind=fixed_scsi_D`,
  1,000,202,273,280 B, 620,553,932,800 B free) and the USB was `PhysicalDrive2`,
  `General_UDisk_USB`, `mounted=0`, `canon=SOVLINUX_USB_NEVER_MOUNT_OR_FORMAT`
  (`FABLE5-ABSORB-LOCAL-SYSTEM-2026-07-26.hbp:4,6,8`). On 2026-07-08 the USB's partitions were F:
  (exFAT, 536,870,912,000 B, holding 75,701,785,842 B in 21,037 files) and E:
  (`FABLE5-SOVLINUX-USB-RETURN-READONLY-SCAN-2026-07-08.hbp:4-6`). On 2026-07-10 it was found
  fake-capacity, `verdict=real_nand_ends_at_or_below_500GB`, probes past that `WRITES_VANISH`, with
  `caveat=late_P1_regions_unverified_for_NEW_writes`
  (`FABLE5-USB-MINIESP-DEPLOYED-FAKE-CAPACITY-FOUND-2026-07-10.hbp:3`). Its size is
  2,097,152,000,000 B in the 07-08 scan (`:3`) and 2,097,150,289,920 B in the 07-26 row, which has
  `size_via=wmic_diskdrive_descriptor_only` (`:6`).
- If the real NAND ends near 500 GB and F: fills it, a 100 GB D: on the USB has no real NAND to sit
  on; yet ACER's verify read all 12,500,000,000 rooms back with 0 bad, and its cold reads took
  at least 10,158,575 ns each, nearer the hard drive's 18,600,000 ns than the flash drive's 332,336 ns
  (section 5). Both fit the 1 TB hard drive better than the USB (READING). None of ACER's 2026-10-19
  receipts (`ROOMS-MAKE.hbp`, `ROOMS-VERIFY.hbp`, `ROOMS-PROBE.hbp`) names the physical disk behind D: at
  build time; which drive takes the rooms is the operator's call.
- On the USB itself, the real NAND holds at most 62,500,000,000 rooms if "500GB" is decimal
  (500,000,000,000 B / 8), or 67,108,864,000 at F:'s exact 536,870,912,000 B (500 GiB) / 8; the row
  states no unit and leaves late F: regions unverified, and F: already holds files. Each room written
  there would need a readback, since past real NAND the 07-10 writes vanished silently and were caught
  by an immediate same-handle readback (`FABLE5-USB-MINIESP-DEPLOYED-FAKE-CAPACITY-FOUND-2026-07-10.hbp:2`;
  one raw write was also denied after 94 of 96 blocks, `:4`) (READING). And
  `usb_raw_write=HARD-DENY-always` (CANON; Asolaria @ `37234d6`,
  `.../intake/ACER-USB-GOOGLE-SUBSTRATE-INDEX-2026-06-18.hbp:5`).

**Function calls, watchers, the root primitive.** The canon has seats as calls: *"most seats are
backend-shell-less function-call rotation"* (migration map, line 200); the seven Fischer stub rooms
on host8 `:5088` carry `process_launch=0` (*usim* `matrices/FISCHER-STUB-ROOM-CONVERTERS-2026-07-02.hbp:1`).
The public code does not do it yet: the one `host8-serve` path that runs anything starts an external
`node` process per call (`main.rs:910`); the agent-runtime fleet is *"STUB
(spawn()/retire()=Unimplemented = THE gap to make autostart real)"* (*usim*
`matrices/BOOT-AUTOSTART-MANIFEST-2026-07-03.hbp:16`); and `host8rooms` has only `make`, `verify`,
`probe` and `seal` (*aether* `rooms-guide/host8rooms/src/main.rs:636`).
ACER places `ROOT-PRIMITIVE-8BYTE-WATCHER-GATED-NESTED-AGENT.md` on the Liris side (REPORTED, relay
only); it is public in `HYPER-BECHS--the-third-set` on `main` @ `83a8a1e` and `acer` @ `9ab39a8`, not
on `liris` @ `972bf82`, and reads `Branch: Acer lane` (line 4; sha256 `4900389a…`). Its 8 bytes are
*"the 8-byte sha256/fnv1a64 generative PID"* (line 29), and its rooms are *"addressed by the atom"*
(line 73) (CANON): the first Host8 above, addressing rooms, not slots at a computed offset (READING).

## 3. What is measured

**ACER** (REPORTED):

| Quantity | ACER | Row | Device |
|---|---|---|---|
| build 50,000,000 rooms, 400,000,000 B (2026-08-02) | 5,675 ms (70 MB/s) | `PIPES-IN:4`, `K81:4` | WSL `/tmp`, backing not in either row |
| room lookups | 516,528/s (1,936 ns each); *"52792 opens/s"* | `K81:5` | same |
| through the bridge | 590/s (about 1,695,000 ns each) | `K81:6`, *"mnt/d 590/s vs tmp 516528/s same bytes same sha"* | Windows D: seen from WSL |
| build 12,500,000,000 rooms, 100,000,000,000 B (2026-10-19) | 1,100,917 ms; 90 MB/s mean, 71 to 102 MB/s per sector | `ROOMS-MAKE.hbp:12-137` | D: ("Which drive", section 2) |
| verify: every room read back | 1,006,824 ms; 99 MB/s mean, 81 to 110 MB/s per sector; 0 bad | `ROOMS-VERIFY.hbp:12-138` | D: |
| warm one sector | 800,000,000 B in 6,216 ms (129 MB/s rounded; `rooms-guide/PROVENANCE.md:71` floors it to 128) | `ROOMS-PROBE.hbp:12` | D: |
| hot: 10,000,000 random rooms in the warmed sector | 299,885/s (3,334 ns each) | `ROOMS-PROBE.hbp:13` | D:, page cache |
| cold: 29,696 random rooms across all 125 sectors | 98/s (10,158,575 ns each), an upper bound | `ROOMS-PROBE.hbp:14` | D: |

The cold probe ran single-threaded, with no cache control, right after a full verify, and stopped at
its 300 s cap after 29,696 of 200,000 lookups, so 98/s is an upper bound on off-drive random reads
(*aether* `rooms-guide/PROVENANCE.md:62-65`).

**The cloud** (MEASURED; receipt `RECEIPT-HOST8-ROOMS-CLOUD-2026-10-19.hbp`): 4 vCPUs (`Intel(R)
Xeon(R) Processor @ 2.10GHz`), `memtotal_kb=16479424`, ext4 on a virtio block device, not a USB
drive. Room n holds `splitmix64(n)` at byte 8n of one 400,000,000 B file, the size of the 2026-08-02
arena; it is the same access pattern as ACER's sectors but not their file layout or stub law. Two runs. Every check found 0
mismatches: every room in verify, every random read in the warm, cold and threads steps, 96 spot rooms
in the sequential `O_DIRECT` read, and the RAM step's sum; make checks only the file size
(`size_ok=1`).

| Step | Run 1 | Run 2 |
|---|---|---|
| make: write + `sync_all` | 4,503,824,203 ns (88 MB/s) | 724,881,441 ns (551 MB/s) |
| verify: sequential, page cache | 3,150 MB/s | 2,210 MB/s |
| RAM array: 20,000,000 random reads | 43,928,796/s (22 ns) | 48,451,964/s (20 ns) |
| file, page cache: 2,000,000 `pread` of 8 B | 1,517,566/s (658 ns) | 1,803,108/s (554 ns) |
| file, `O_DIRECT` 4,096-byte blocks: 20,000 reads | 14,776/s (67,676 ns) | 25,448/s (39,295 ns) |
| `O_DIRECT` sequential, 8 MiB chunks | 1,595 MB/s | 1,631 MB/s |
| page cache, 4 threads × 1,000,000 | 3,964,483/s | 4,196,894/s |

- RAM is 27 to 29 times the page cache and 1,904 to 2,973 times the device (independent reads overlap
  in the CPU, so the array beats one 100 ns memory reference; READING).
- The arena took 4,504 ms and 725 ms here against ACER's 5,675 ms. Run 1 spent 4,096,673,343 ns in
  `write()`, run 2 365,274,488 ns, so two runs set no write rate; run 1's 88 MB/s near ACER's 90 MB/s
  mean on D: is a coincidence of different machines, not a confirmation.
- ACER's 516,528/s is of the page-cache class, 9,607 times a laptop hard drive's cold reads at
  18,600,000 ns each (section 5), as is ACER's own 299,885/s hot probe on D:; this machine's `pread`
  is about 3 times the 516,528/s (READING; ACER's 2026-08-02 method is not in `K81:5`).
- Caveats: `O_DIRECT` skips this machine's page cache, not the host's behind virtio; other jobs ran
  (1-minute load × 100 from 281 to 363), and 4 threads gave under 3 times one.

**The bridge penalty.** 516,528 / 590 = 875 remainder 278: the printed rates give 875 times, not the
record name's 874 (516,528 / 591 rounds to 874; READING: the 590 may be cut down). Per read it is
about 1,695,000 ns against 1,936 ns, same bytes. WSL's `mount.drvfs` *"will either mount the drive as
drvfs (WSL1), or plan9, virtio-plan9 or virtiofs (WSL), depending on .wslconfig"*, and Microsoft
advises keeping files in the Linux file system, publishing no factor (ESTABLISHED;
https://wsl.dev/technical-documentation/drvfs/ , https://learn.microsoft.com/en-us/windows/wsl/filesystems).
ACER's WSL version and mount type are in neither `K81` nor `PIPES-IN`, nor in any *usim* `matrices/` row at
`3f9f42d`, so which of these paths cost the 590/s is open.
590/s beats a hard drive's cold random reads, so the cost is mostly the path, not the drive (READING).

## 4. What it is in established terms

| Mechanism | What it is | Relation to rooms at a computed offset | Source |
|---|---|---|---|
| Direct-address table (CLRS 3rd ed., 11.1-11.2) | 11.1: direct addressing *"works well when the universe U of keys is reasonably small"*; *"an array, or direct-address table"*, *"each position, or slot, corresponds to a key"*; each operation *"takes only O(1) time"*. 11.2: *"if the universe U is large, storing a table T of size \|U\| may be impractical, or even impossible, given the memory available on a typical computer"* | the room file is one, kept on a drive so a large table is affordable | https://khoury.northeastern.edu/home/vip/teach/Algorithms/7_hash_RBtree_simpleDS/CLRS_hashes.pdf |
| `mmap`, Windows file mapping | a file mapped into the address space | room n is the word at base + 8n; a fault on a cold page reads it in, and by default Linux reads the read-ahead window around it (*"mmap read-around"*), unless the mapping is marked random (`VM_RAND_READ`) or the file's faults have missed the cache more than `MMAP_LOTSAMISS` (100) times beyond its hits (Linux v6.12 `mm/filemap.c:3088,3171,3183-3199,3224-3226`) | https://man7.org/linux/man-pages/man2/mmap.2.html , https://learn.microsoft.com/en-us/windows/win32/memory/file-mapping , https://raw.githubusercontent.com/torvalds/linux/v6.12/mm/filemap.c |
| Page cache | *"Whenever a file is read, the data is put into the page cache to avoid expensive disk access on the subsequent reads."* | where the speed comes from; one `pread` per room from it still ran 27 to 29 times slower than the RAM array here (section 3); a mapping whose pages are already in was not measured | https://docs.kernel.org/admin-guide/mm/concepts.html |
| Swap, page file | the OS moves rarely used pages to disk | the OS's own "hard drive as RAM"; rooms add explicit addresses and persistence | https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/introduction-to-the-page-file |
| ReadyBoost | USB flash as a cache, needing *"2.5 MB/s throughput for random 4K reads"*; one of the technologies *"designed to improve performance on traditional HDDs, where random read performance could easily be a major bottleneck"* | Windows' own "USB as memory": a cache, not added RAM | https://learn.microsoft.com/en-us/archive/blogs/johnbaker/windows-vista-readyboost-requirements , https://learn.microsoft.com/en-us/archive/blogs/e7/support-and-qa-for-solid-state-drives |
| CUDA Unified Memory oversubscription | allocations *"larger than available GPU memory"*, evicted to system memory | the established "more GPU memory than the card has", spilling to RAM, not USB; fault-driven random access gives *"only a few hundred KB/s read bandwidth in the oversubscription domain for x86 platform"*, while zero-copy random access to pinned system memory *"yields a constant bandwidth of 3-4 GB/s"*; on Windows and WSL *"Oversubscription of GPU memory is not allowed"*, and ACER runs Windows with WSL2 (REPORTED; `wsl2=present`, *usim* `matrices/FABLE5-CONTAINER-MOVE-2026-07-26.hbp:4`) | https://developer.nvidia.com/blog/improving-gpu-memory-oversubscription-performance/ , https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/understanding-memory.html |
| GPUDirect Storage | *"GDS enables DMA between agents (NICs or NVMe drives) near storage and GPU memory"*, *"relative to existing standard Linux file IO"*; GDS mode is for *"Data Center and Quadro (desktop) cards"*, and *"All other cards are supported only in compatibility mode"*. The guide contrasts it with the path where *"mmap makes the managed memory backed by the file"* and GPU misses *"fault back to the CPU and then to storage"* | the nearest named GPU memory from storage; NVMe or NICs on Linux, not USB | https://docs.nvidia.com/gpudirect-storage/overview-guide/index.html , https://docs.nvidia.com/gpudirect-storage/release-notes/index.html |
| DirectStorage | *"batched many-at-a-time parallel IO requests which can be efficiently fed to the GPU"*; *"While you may see benefits on any kind of storage device, installing games to an NVMe SSD will maximize your IO performance"* | batching many small room reads; the Windows route on ACER's platform (READING) | https://devblogs.microsoft.com/directx/directstorage-is-coming-to-pc/ , https://devblogs.microsoft.com/directx/directstorage-api-available-on-pc/ |
| External-memory (I/O) model, Aggarwal and Vitter 1988 | cost counted in block transfers of B records | one cold room costs one block; a 4 KiB block holds 512 rooms | https://csaws.cs.technion.ac.il/~itai/Courses/Cache/Vitter-sorting.pdf |
| Optane Memory Mode, CXL Type-3 | storage-class or device memory on the memory bus or a CXL link; Optane's *"Memory Mode, which is volatile"*; Intel: *"As we wind down the Intel Optane business"* | the hardware forms of storage as memory; neither runs over USB | https://cdrdv2-public.intel.com/841964/Intel_Optane_Persistent_Memory_Start_Up_Guide.pdf , https://docs.kernel.org/driver-api/cxl/devices/device-types.html , https://www.sec.gov/Archives/edgar/data/50863/000005086322000030/intc-20220702.htm |

In these terms a Host8 room file is a direct-address table of 8-byte slots in a file, used through
the page cache, its cost counted in block reads (READING on ESTABLISHED).

## 5. "GPU type memory"

| Tier | Capacity | Sequential bandwidth | One random room | Sources (ESTABLISHED) |
|---|---|---|---|---|
| Room file on a drive, cold | ACER's build: 100,000,000,000 B on D: (REPORTED); ACER's USB: NAND flash per the 07-10 row (`verdict=real_nand_ends_at_or_below_500GB`; the operator calls it a "USB hard drive"), nominal 2,097,150,289,920 B, real NAND at or below 500 GB (REPORTED) | ACER on D: 90 MB/s mean write, 99 MB/s mean verify read, 129 MB/s one warm sector (REPORTED); at most 140 MB/s, the outer-track maximum, for a 1 TB or 2 TB 2.5-inch 5400 rpm drive; USB 3.2 Gen 1 signals at 5 Gbit/s | ACER on D: 98/s, at least 10,158,575 ns (REPORTED); one block read on that 5400 rpm drive: 54/s, 18,600,000 ns (13,000,000 ns average seek, which the datasheet gives *"less overhead"*, + 5,600,000 ns average latency); 3,009/s 4K reads on a genuine USB flash drive (no queue depth stated), 4,204/s on a USB SSD at 1 thread; whether ACER's D: figures are the operator's fake-capacity USB turns on "Which drive" (section 2) | https://www.seagate.com/files/www-content/product-content/seagate-laptop-fam/barracuda_25/en-us/docs/100807728h.pdf , https://www.usb.org/sites/default/files/usb_3_2_language_product_and_packaging_guidelines_final.pdf , https://www.storagereview.com/review/samsung-usb-3-1-bar-plus-review-256gb , https://www.storagereview.com/review/samsung-ssd-t7-review |
| same file in the page cache | up to free RAM | 2,210 to 3,150 MB/s (MEASURED) | 1,517,566 to 1,803,108/s, 554 to 658 ns (MEASURED); ACER on D: 299,885/s (REPORTED) | receipt; `ROOMS-PROBE.hbp:13` |
| RAM | 16 GB on the operator's machine (OPERATOR); `memtotal_kb=16479424` here | *"DRAM: 16GB, 100ns, 20GB/s"* for one 2009 server; the operator's RAM type and channels are in no row cited here, nor in *usim* `matrices/` at `3f9f42d` | 43,928,796 to 48,451,964/s (MEASURED); 100 ns per main-memory reference | https://www.cs.cornell.edu/projects/ladis2009/talks/dean-keynote-ladis2009.pdf |
| GPU memory | 20 GB on the operator's machine (OPERATOR); 24 GB RTX 4090, 80 GB H100 SXM | 1,008 GB/s RTX 4090, 3,350 GB/s H100 SXM | no sourced figure here | https://images.nvidia.com/aem-dam/Solutions/geforce/ada/nvidia-ada-gpu-architecture.pdf , https://www.nvidia.com/en-us/data-center/h100/ |

**What is GPU-like** (READING on the figures above): little beyond size. A flat array reached by a
computed index needs no search, but so does any array in RAM or in GPU memory. What a drive adds is
capacity: ACER's 100,000,000,000 B build is about 4 times a 24 GB card and 6 times the operator's
16 GB of RAM, and the USB's real NAND, at or below 500 GB, is at most about 21 times a 24 GB card
(500 GB / 24 GB and 500 GiB / 24 GiB both round to 21). Storage also gives more with many requests in
flight (the T7 does 17,805 random 4K reads/s at 4 threads against 4,204 at 1), but only over a USB
transport that queues commands: under Bulk-Only Transport *"The host shall not transfer a CBW to the
device until the host has received the CSW for any outstanding CBW."* (ESTABLISHED;
https://www.usb.org/sites/default/files/usbmassbulk_10.pdf). The transport of ACER's drives is in no row
cited here, nor in *usim* `matrices/` at `3f9f42d`.

**What is not:** bandwidth, where an RTX 4090 moves 10,149 times and an H100 SXM 33,729 times ACER's
mean read of the rooms on D: (100,000,000,000 B in 1,006,824 ms, printed as 99 MB/s), and 7,832 and 26,030 times
its warm pass (800,000,000 B in 6,216 ms, about 129 MB/s); and latency,
where a cold room costs one block read: at least 10,158,575 ns on ACER's D:, 18,600,000 ns on the hard
drive, and 332,336 ns on the USB flash drive if one read is in flight, which is 101,586, 186,000 and
3,323 times a 100 ns CPU main-memory reference. NVIDIA's oversubscription, which spills to RAM and not
to USB, falls to *"a few hundred KB/s"* under fault-driven random access on x86, where zero-copy access
holds 3-4 GB/s, and is not allowed on Windows or WSL (section 4). So the drive adds capacity, not
bandwidth: rooms come near RAM speed only while the rooms in use sit in the page cache, and even then
one `pread` per room ran 27 to 29 times slower than the RAM array here; that is what both 50M-arena
read rates in section 3 measure.

**What follows for vc65.** At `k=10` vc65's tables take *"10.5 GB for `vc28`/`vc65` at k=10, besides
an unbounded match map"* (*aether* `pump/cm3ti/PROVENANCE.md:128`; `docs/THE-RADIATED-SLICE.md`
section 8): 13 tables of 2^28 16-bit entries and 13 count tables of 2^28 bytes, built fresh in every
run (`pump/cm3ti/rust/variants/vc65.rs:12-13,95-100`), 10,468,982,784 B or 1,308,622,848 rooms, about
a tenth of ACER's 100 GB build. A run also holds the match map (`mpos`, one insert per symbol, line
268), the history (line 106) and the mixer weights (`w2`, 31,457,280 B at `k=10`, lines 77 and 103).
For each coded bit `predict_bit` reads 13 entries at hashed positions (lines 169-190), and
`update_bit` reads the 13 count bytes at the same positions, in separate tables (lines 222-238); at 8
bits a byte that is 104 entries and 104 count bytes per input byte (READING of the code). 10 MB of text
(10,000,000 bytes) is 1,040,000,000 entry reads, 2,080,000,000 with the counts. One cold read each
takes 345,630 to 691,260 s (4 to 8 days) at the USB flash drive's 3,009/s, at least 10,564,918 to 21,129,836 s
(122 to 245 days) at ACER's 10,158,575 ns lower bound on D:, and 19,344,000 to 38,688,000 s (224 to 448 days) at
the hard drive's 18,600,000 ns, against 21 to 47 s at this machine's RAM rates. Faulting each 4 KiB
page in once is 2,555,904 reads: 849 s on the flash drive, at least 25,964 s (7 hours) on D:, 47,540 s
(13 hours) on the hard drive. Reading the tables in sequentially takes at least 75 s at the hard
drive's 140 MB/s maximum and 106 s at ACER's 99 MB/s. So rooms can be the tables' persistent home, for
a trained state kept between runs, and a run loads them into RAM in one sequential pass and looks them
up there. The tables alone leave 5,531,017,216 B of the operator's stated 16 GB of RAM read as
16,000,000,000 B, or 6,710,886,400 B read as 16 GiB, before the match map, the history and the
operating system. Inside WSL2, whose VM gets *"50% of total memory on Windows"* by default
(ESTABLISHED; https://learn.microsoft.com/en-us/windows/wsl/wsl-config), half of 16 GB is less than
the tables' 10,468,982,784 B in either unit, so such a run needs `memory=` raised. The tables would
also fit in the stated 20 GB of GPU memory, with no storage tier at all (READING).

## 6. What to measure next

1. **Rooms off a named drive against RAM.** ACER's probe gives 299,885/s hot and at most 98/s cold on
   D: (section 3). Next, on ACER, Linux-native, the cloud probe with its run directory on the named
   drive: cold `O_DIRECT` reads at 1, 4 and 32 threads, then warm; record model, bus, USB transport
   and size.
2. **Which drive.** Name the physical disk behind D:. ACER's verify already reports every room read
   back with 0 bad (`ROOMS-VERIFY.hbp:138`); if rooms ever go on the USB, read every room back with a
   fresh handle, including the last sector.
3. **The address map.** Stated in ACER's `ROOMLAW` row, covered by its verify, and established on a
   second machine (section 2); open only for a future layout. Growing the room count is such a layout:
   the build's seed and centre both depend on the total, so a larger build moves every room already
   written (`rooms-guide/PROVENANCE.md:81-86`).
4. **The bridge.** One program on `/mnt/d` and on native ext4, rate unrounded: 874 or 875; record the
   WSL version and the mount type.
5. **vc65 tables in rooms.** A `k=10` table state stored as rooms and loaded; vc65 on the first 10 MB
   of enwik8, payload and `comp_sha` against a run from RAM; load timed on its own.
6. **"RAM as a GPU".** Batches of 1, 32 and 1,024 independent room reads per call through `pread` and
   `mmap`, rooms per second; on a GPU machine, the same batches from GPU memory, and on Linux from
   oversubscribed Unified Memory, which Windows and WSL do not allow (section 4).
7. **A room's function.** A public test: a message to a room runs its function in-process, process
   count unchanged.

## 7. Reproduce

One Rust file, std only, no `unsafe`, no floating point (`host8_rooms_probe.rs`, 18,300 bytes, sha256
`8cc27fd00b01877fa81a8d797f028df905f5aa8ee85fd6b52d50d578fb134af4`); it needs 400,000,000 bytes free.

```
rustc +1.81.0 -O --edition 2021 -o host8_rooms_probe host8_rooms_probe.rs
mkdir -p run && rm -f run/host8_rooms_50m.bin
./host8_rooms_probe "$PWD/run" "$(rustc +1.81.0 --version)"
rm -f run/host8_rooms_50m.bin
```

Each step prints one `H8PROBE|step=...` row with counts and nanoseconds, and each step that checks
rooms adds `mismatch=`; rates are count × 1,000,000,000 / ns and MB/s is bytes × 1,000 / ns, both
floored. The receipt holds both runs and the cleanup row (`exists_after=0`). Program and receipt
are in *aether* `host8/rooms-on-storage/`, committed with this guide. The checks of ACER's own build re-run
from `rooms-guide/` (its `PROVENANCE.md`, and the `host8-rooms` CI job, which runs from *aether* `5318404` on;
GitHub rejected the workflow file at `ec7826d`).
