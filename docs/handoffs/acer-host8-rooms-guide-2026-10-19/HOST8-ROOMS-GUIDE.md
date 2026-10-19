# Host8 Rooms: memory from USB drives and storage

**A primary-class mechanism, named by the operator, Jesse Daniel Brown, on 2026-10-19: getting GPU-type memory from USBs and storage.**

This guide covers what the mechanism is, where it comes from, how to make your own rooms on any computer, what was measured on the machine where it was built (ACER), and where its limits are.

Claims are tagged three ways:
- **MEASURED:** a run produced it, and the receipt is in this package.
- **NAMED:** stated canon that no run has tested yet.
- **CONJECTURE:** reasoning not yet tested.

---

## 1. What it is

A **room** is 8 bytes on a drive. Room `n` lives at a fixed place: sector file `n / R`, at byte `(n % R) × 8`. Finding any room is **one seek**, whether you have a thousand rooms or twelve billion.

Each room holds a **stub**: an 8-byte value computed from the room's own address by an invertible mix. Because the mix can be run backwards, reading a stub back tells you exactly which room it came from. Two rooms can never hold the same stub, so there are **zero collisions by construction**.

The rooms live on the drive, and the operating system keeps the rooms in use inside physical RAM. **The drive is the memory; RAM is the cache in front of it.** A 2 TB USB stick becomes 2 TB of addressable rooms on a computer with 16 GB of RAM chips.

The rooms are **function rooms, not programs**. You send a message to a room's address, and the function for that room runs there. Thousands of rooms do not need thousands of processes: one process makes function calls by room address.

## 2. Where it comes from (the operator's own words)

From the operator's recorded voice, quoted in `COMBINED-BOOK-OF-LAWS.md` (lines 2262–2263, 3057, 3164, 3232):
- **113 sectors as rooms:** "a hundred and thirteen sectors to act as kinda stubbed rooms where you send the message to" (`voice-00.md:628`).
- **USB as RAM:** "Twenty gigabytes of GPU, sixteen gigabytes of RAM, and two terabytes of USB hard drive that I use as RAM." (`voice-00.md:628`)
- **Rooms are drive rooms:** "rooms are just hard drive stubbed rooms" (`voice-02.md:1777`).
- **The 8-byte host:** "asolaria-federation-1024 as the Rust 8-byte Host/kernel" (`voice-02.md:1251`).
- **10k rooms, keyed:** "the 10k stubbed rooms for the pid and port … and project name" (`voice-02.md:1614`).

**The first build (MEASURED, 2026-08-02, ACER):**
- **50,000,000 rooms** × 8 B = 400,000,000 B, built in **5.675 s**.
- **50,000,000 / 50,000,000 distinct**, 0 collisions, O(1) lookup.
- Lookup speed: 516,528 lookups/s from a native Linux file, but **590/s through the Windows-to-Linux bridge (`/mnt`), 874× slower**.

## 3. The law, with trit balancing

| Part | Rule |
|---|---|
| Room | 8 bytes |
| Where room `n` is | sector `n / R`, offset `(n % R) × 8` |
| Balanced address | `a = n − total/2`, so the **ground room** (`a = 0`) is the middle room |
| Address word | 27 balanced trits (K = 27 = 3³), packed by the canonical `tribit::TritWord` as `a + (3²⁷ − 1)/2` |
| Stub | `mix(word XOR seed)`, where `mix` is the SplitMix64 finalizer and is invertible |
| Read back | `unmix(stub) XOR seed = word`, which gives `a` and then `n` |
| Collisions | 0 by construction, because the mix has an inverse |

**Count is not range.** 27 balanced trits span ±3,812,798,742,493, room for 7.6 trillion rooms. 12.5 billion rooms reach 22 of the 27 trits; the top 5 trits stay 0, leaving room to grow.

**Balance.** With an even room count, addresses run from −total/2 to total/2 − 1, so the negative side leads by one room. With an odd sector count, the sectors balance too: sector 0 is the centre sector, and the ground room sits at its exact middle. In the 12.5-billion build that is balanced sector 0 (file `sector-062`), offset 400,000,000 bytes.

## 4. Make your own

You need:
- Rust 1.81 (`rustup toolchain install 1.81.0`);
- a drive with free space;
- this package.

```sh
cd host8rooms
sha256sum -c TRIBIT.sha256                 # the ternary kernel is the canonical one
cargo +1.81.0 build --release              # std only: no other crates
cargo +1.81.0 test --release               # 18 tests, including make/verify/probe on a small folder
```

Choose a size. The total room count is `sectors × rooms_per_sector`, and the drive space used is that × 8 bytes:

| Rooms | Example layout | Space |
|---|---|---|
| 50 million | 1 × 50,000,000 | 400 MB |
| 100 million | 1 × 100,000,000 | 800 MB |
| 1 billion | 125 × 8,000,000 (odd count, balanced sectors) | 8 GB |
| 12.5 billion | 125 × 100,000,000 (the ACER build) | 100 GB |

Use an **odd sector count** if you want balanced sectors. Then run:

```sh
# make the rooms (each sector is synced to the drive, so the speed you see is the drive's)
./target/release/host8rooms make /path/on/your/drive 125 100000000

# read every room back: each must decode to its own address; prints a sha256 per sector and a merkle
./target/release/host8rooms verify /path/on/your/drive 125 100000000

# speed: random one-seek lookups on a warmed sector (hot) and across all rooms (cold)
./target/release/host8rooms probe /path/on/your/drive 125 100000000 10000000 200000 300000

# seal a receipt: row-exact .hbi index, .sha256 sidecars, chained cube
./target/release/host8rooms seal ROOMS-MAKE.hbp <prior_cube>
```

**Do:**
- **Put the rooms on a real, natively mounted drive.** On Windows that's a drive letter; on Linux or macOS, a native mount.
- **Read and write rooms natively.** Do not go through a Windows-to-Linux bridge (`/mnt/c`, `/mnt/d`), which cost **874×** on ACER.
- **Keep the rooms you use together.** The OS keeps recently used rooms in RAM. Rooms that are used together, or in order, stay at RAM speed (see section 6).

**Don't:**
- **Don't put the rooms inside WSL's own disk.** That disk is one virtual file on `C:`, and filling it fills `C:`. On ACER this filled C: and broke Ubuntu's boot.
- **Don't write to a drive or partition you mean to keep read-only.** On ACER, the raw sovereignty partition of the 2 TB USB is read-only, so the rooms went on `D:`, the writable part of the same stick.
- **Don't use floating point.** Everything here is integer.

## 5. Use rooms as memory

- **Read or write a room** with one positioned read or write of 8 bytes at its offset (`read_exact_at` / `seek_read`).
- **For bulk work, map a sector file into memory.** On Windows use `CreateFileMapping`/`MapViewOfFile`; on Linux and macOS use `mmap`. The rooms then look like an array in RAM, and the OS moves pages between the drive and RAM.
- **Function rooms:** a message names a room address, and the function bound to that room runs on the room's 8 bytes. One process does it with function calls, with no process per room.

## 6. What was measured on ACER

*(Filled from the receipts `ROOMS-MAKE.hbp`, `ROOMS-VERIFY.hbp` and `ROOMS-PROBE.hbp` in this package.)*

**The build (MEASURED, 2026-10-19).** Machine: ACER, Intel 8-thread CPU, 16 GB RAM. Drive: `D:`, the writable NTFS part of the 2 TB USB.

| Step | Result |
|---|---|
| **Make** | **12,500,000,000 rooms = 100,000,000,000 bytes** in 125 sector files of 800,000,000 B. Took **1,100.9 s (18.3 min)** at **90 MB/s** mean (71–102 per sector), each sector synced to the USB. |
| **Verify** | **Every room read back from the drive and decoded to its own address: 0 bad of 12,500,000,000.** 12,501 rooms (every millionth, plus the ground room and the last room) also spelled their 27 balanced trits exactly: 0 bad. Read at 99 MB/s (81–110). Stubs spread evenly: the 16 top-nibble buckets are within **175 parts per million** of each other. |
| **Ground room** | Room 6,250,000,000 = balanced address 0 = all 27 trits Nil. It sits in balanced sector 0 (`sector-062`, sha256 `ba569629…`), offset 400,000,000. |
| **Merkle of all 125 sectors** | `5b96df7f0e96927fb41bb0ab972e01004cd407916e5623595a52ca81ec8207e0` |

**Speed (MEASURED, same machine and drive):**

| Access pattern | Rooms per second | Time per room |
|---|---|---|
| **In order (streaming a sector)** | about **12,400,000** (99 MB/s ÷ 8 B) | about 80 ns |
| **Random, rooms already in RAM** (one 800 MB sector warmed) | **299,885** | **3,334 ns**. Each lookup is a system call; mapping the sector into memory removes that cost (not measured here). |
| **Random, rooms on the USB** (anywhere in the 100 GB) | **98** | **10.16 ms**: the drive's seek time |

All 10,000,000 hot lookups and 29,696 cold lookups returned the right room (0 bad).

**What the numbers say.** Capacity is real: 100 GB of rooms on a 16 GB machine, every one addressable and proven. Speed is about **locality**: rooms used in order run at about 12 million per second, and rooms already in RAM at about 300 thousand per second through system calls. A random room that has to come off the USB costs about 10 ms, about **3,000× slower than a hot room**. Design work so the rooms in use stay together.

**Seals (each receipt has a row-exact `.hbi` and `.sha256` sidecars; cubes are chained):**
- `ROOMS-MAKE.hbp`: cube `cc391c49c90ee068`, prior `b6b64a02864356f9`
- `ROOMS-VERIFY.hbp`: cube `f06366a0e0002d2e`, prior `cc391c49c90ee068`
- `ROOMS-PROBE.hbp`: cube `cbe707ab550403ae`, prior `f06366a0e0002d2e`

**Gates (MEASURED):**
- Windows, Rust 1.81.0 GNU: clippy `-D warnings` exit 0, 18/18 tests, rustfmt clean.
- Linux x86_64, Rust 1.81.0: clippy 0.1.81 exit 0, 18/18 tests.
- 0 floats in the source.

## 7. How this relates to known computing (research)

- **Memory-mapped files and the page cache.** Every OS already lets a file act as memory. Studies find this works well while the working set fits in RAM, and slows sharply once scattered accesses miss RAM and go to the drive. Sources: the FlashMap paper (Microsoft Research, ISCA'15), and studies of mmap with working sets larger than RAM.
- **ReadyBoost (Windows).** A USB flash drive used as a cache between the disk and RAM, mainly for small random reads. It is capped at 32 GB per device on NTFS/exFAT, and Microsoft suggested a flash-to-RAM ratio of 1:1 to 2.5:1. Host8 rooms are not a cache of another disk: the rooms are the memory themselves, addressed by law.
- **GPU unified-memory oversubscription.** GPUs page memory to the host when a program touches more than the GPU holds. Research reports it works for regular access patterns but slows irregular ones badly; prefetching that understands the pattern can recover 2–3×. The same rule applies to rooms: **locality is speed.**
- **The invertible mix.** The SplitMix64 finalizer (Steele, Lea and Flood, OOPSLA 2014) is made of invertible steps: xorshift-right, and multiplication by an odd constant. This package implements and tests the inverse, which is why the room count can grow with no collision check: each stub decodes to exactly one room.

**What is new here** is the room discipline, not the OS paging underneath:
- fixed 8-byte rooms with a one-seek address law;
- invertible stubs that prove identity on read-back;
- 27-trit balanced addresses centred on a ground room;
- rooms as function addresses inside one process.

## 8. Boundaries

- **"GPU-type memory" is NAMED.** Rooms give GPU-scale capacity (100 GB+) from a USB drive. No run has yet compared rooms against a GPU on a GPU workload.
- **Speed depends on locality.** Rooms already in RAM run at RAM speed. Rooms that must come off the drive run at the drive's random-read speed. Section 6 has the measured numbers for one USB drive; yours will differ.
- **Capacity is real; extra compute is not.** More rooms give more addressable memory, not more CPU. The ceiling stays the CPU and the drive.
- **Making rooms writes the whole size.** 12.5 billion rooms wrote 100 GB to the drive. Flash has a finite write life.

## Sources

- Book of laws (operator voice quotes): `JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR/books/COMBINED-BOOK-OF-LAWS.md`
- [Unified Address Translation for Memory-Mapped SSDs with FlashMap (Microsoft Research)](https://www.microsoft.com/en-us/research/?p=168180)
- [mmap I/O with working sets larger than memory (IEEE)](https://www.infona.pl/resource/bwmeta1.element.ieee-art-000006495887?locale=en)
- [ReadyBoost (Wikipedia)](https://en.wikipedia.org/wiki/ReadyBoost) and [Windows Vista ReadyBoost requirements (Microsoft)](https://learn.microsoft.com/en-us/archive/blogs/johnbaker/windows-vista-readyboost-requirements)
- [Performance Evaluation of Advanced Features in CUDA Unified Memory](https://ar5iv.labs.arxiv.org/html/1910.09598) and [Beyond VABlock: transformer workloads under oversubscription](https://csarch.korea.ac.kr/publication/gpu_uvm_jsa25/)
- [SplitMix64 mix (Numerics.NET reference)](https://numerics.net/documentation/latest/reference/numerics.net.random.splitmix64.mix) and [invertibility of the xoshiro/splitmix mixing steps (prng group)](https://groups.google.com/g/prng/c/WPjMq-IH5HI)
