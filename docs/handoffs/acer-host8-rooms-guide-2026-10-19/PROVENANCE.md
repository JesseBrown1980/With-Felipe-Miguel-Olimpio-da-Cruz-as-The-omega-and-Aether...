# Provenance: acer-host8-rooms-guide-2026-10-19

ACER (seat ACER-CLAUDE-FABLE5, pid `8467a937cba309f7`) built 12,500,000,000 eight-byte Host8 rooms on the
owner's USB drive. The build sits at `D:\ASOLARIA-HOST8-ROOMS-100G\`: 125 sectors of 100,000,000 rooms, 800,000,000 B
each. ACER sent the guide, the tool's source and the sealed receipts on 2026-10-19 as
`HOST8-ROOMS-GUIDE-2026-10-19.zip` (537,942 B, sha256
`99ae1ee8e9a401a4e22bb4ede432819838f4b8b47616e5d8d4db6bbcaa8a1a65`). The owner said: "Now we add the photo and the
guide, and integrate it into aether and asolaria so it is not lost again."

Every delivered file is here byte-identical, at its path under the zip's top folder, so `MANIFEST.hbp` resolves from
this folder. The Windows binary and its sidecar are held (`HELD.hbp`). `SCREEN-HOST8-ROOMS-2026-10-19.jpg` is the
owner's phone screenshot of ACER's report with its EXIF segment removed; the original's hash is in `HELD.hbp`.
`cloud/CLOUD-ROWS.hbp` holds this machine's checks. `sha256sum -c SHA256SUMS` checks every file in this folder.

## Established on two machines

The cloud (Linux, rustc 1.81.0 `eeb90cda`) re-did everything that can be checked without the drive. Each item agrees
with ACER's receipts (`cloud/CLOUD-ROWS.hbp`):

- **The package.** The zip hash matches. All 24 `MANIFEST.hbp` rows and all 8 sidecars match.
- **The seals.** The three `.hbi` row indexes regenerate byte-identical. Re-sealing the three receipts with the
  rebuilt tool reproduces all 12 seal and sidecar files. The seal chain is
  `b6b64a02864356f9 → cc391c49c90ee068 → f06366a0e0002d2e → cbe707ab550403ae`.
- **The room law.** Room n is in `sector-{n/R:03}.rooms` at offset `(n % R) × 8`. Its 8 bytes are the SplitMix64
  finalizer of `((n − total/2) + 3,812,798,742,493) XOR seed`, with `seed16 = ca41a49fcda8f634`. The function inverts
  exactly, so each stub decodes to the address that wrote it.
- **The sector hashes.** All 125 per-sector sha256 values and the merkle
  `5b96df7f0e96927fb41bb0ab972e01004cd407916e5623595a52ca81ec8207e0` regenerate from the law.
- **Three whole sectors rebuilt on disk.** The cloud wrote sectors −62, 0 and +62 at 800,000,000 B each, one at a
  time, and hashed each one. They equal ACER's `3a064230…`, `ba569629…` and `4dc226f4…`.
  - All 300,000,000 of their rooms decode to their own addresses.
  - Wrong-seed and wrong-sector controls fail on every room.
- **The tool.** `fmt --check`, `clippy -D warnings` and 18 of 18 tests pass. There is no float, no unsafe, no network
  and no process spawn.
- **The tribit module.** `host8rooms/src/tribit/mod.rs` is byte-identical to aether's
  `docs/handoffs/acer-tribit-mod-rs-fb7e786-2026-10-18/kernel/core/src/tribit/mod.rs`, which is `asolaria-os@fb7e786`
  blob `5d3e834e`. It is also identical to `kernel/tribit/src/lib.rs` after that file's 7-line header.

## Reported by ACER only

No other machine can check these:

- what `D:` holds now;
- the read-back of all 12,500,000,000 rooms with 0 bad;
- every wall-clock time and rate: make 18.3 min, verify 99 MB/s, hot 299,885 rooms/s, cold 98 rooms/s;
- the machine and drive description;
- the Windows gates.

What the cloud did show is narrower: the hashes ACER's verify printed are exactly the bytes the law writes.

## Notes beside the guide

The guide is kept byte-identical. These notes correct or qualify it. Each cites `HOST8-ROOMS-GUIDE.md:line`
(abbreviated `:line`) or the source file.

1. **Ground room.** The guide (`:44`, `:52`) and ACER's chat say it is "exactly in the middle".
   - 12,500,000,000 rooms is an even count, so there is no single middle room. The ground room (6,250,000,000) is the
     upper of the two middle rooms: 6,250,000,000 rooms lie below it and 6,249,999,999 above.
   - It sits in `sector-062.rooms`, which is balanced sector 0, at offset 400,000,000. Within that sector, 50,000,000
     rooms come before it and 49,999,999 after.
   - The sectors themselves balance exactly, from −62 to +62.
2. **Cold probe.** The guide (`:128`, `:130`) calls 98 rooms/s and 10.16 ms "the drive's seek time".
   - The probe ran single-threaded, with no cache control, right after a full verify. It stopped at its 300 s cap after
     29,696 of the 200,000 requested lookups.
   - So 98/s is an upper bound on true off-drive random reads, and 10.16 ms a lower bound on their cost.
   - Each read includes a system call, a page-in, USB overhead, seek and rotation, so 10.16 ms is more than seek time.
   - The hot/cold gap is at least 3,046× (10,158,575 / 3,334 ns).
3. **Sequential rate.** "About 12,400,000 rooms/s" (`:126`) is derived, not measured.
   - It comes from verify's single-threaded read, SHA-256 and decode pipeline: 12.5e9 rooms in 1,006,824 ms is
     12,415,279 rooms/s.
   - The WARM row read one sector at 800,000,000 B in 6,216 ms, which is 128 MB/s.
4. **Hot probe** (`:127`).
   - It ran from the OS page cache, one system call per lookup. The warmed sector was `sector-000` (balanced −62).
   - "Mapping the sector into memory removes that cost" is not measured. The crate forbids `unsafe` and is std only, so
     it cannot mmap as shipped.
5. **Rounding.**
   - "90 MB/s" is 90.83. "175 ppm" is 175.65.
   - 12,501 trit spellings means every millionth room, which includes the ground room, plus the last room.
6. **"Written straight to the USB."** Writes go through the OS cache, with `sync_all` once per sector (`main.rs:411-423`).
   - 100 GB here is decimal, 10^11 B, which Windows shows as 93.13 GiB.
7. **Growth.** The guide (`:50`, `:149`) says the scheme can grow to 7.6 trillion rooms "with no collision check".
   - The seed and the centre both depend on the total room count, so changing the total moves every room's address and
     stub. Growth is a full rewrite, which aether's rule "never move an address that is already held" forbids
     (`docs/ADDRESSABLY-ADDRESSING.md`).
   - The stubs are collision-free only up to 3^27 rooms, and the tool does not refuse beyond that.
   - 7.6 trillion rooms would be about 61 TB.
8. **Drive type.** The guide says "USB stick" and "flash".
   - The owner's own words are "two terabytes of USB hard drive" (universe simulator `3f9f42d`, `COMBINED-BOOK-OF-LAWS.md:2787`).
   - A 10 ms random read is hard-disk class. No receipt records the device type.
   - Only 100 GB was built.
9. **"GPU-type memory"** (`:3`, untagged; `:159`, NAMED).
   - It is the operator's name for the mechanism, reported to ACER on 2026-10-19 and said in this repository's
     sessions the same day.
   - What is measured is CPU-side file I/O: GPU-scale capacity at drive speed. It is not GPU memory bandwidth or
     latency. Treat it as a goal until it is measured against a GPU.
10. **Owner quotes** (`:26-31`, `:166`).
    - **Line numbers.** The cited lines are exact at universe simulator `2933674` (branch
      `agent/law-37-room-glyph-prime`). At `3f9f42d`, the commit aether pins, they are 2786, 2787, 3581, 3688 and 3756.
    - **`:27`.** The source reads "a hundred and thirteen secondtors to act as kinda stubbed rooms where you send the
      message to".
    - **`:31`.** The source reads "the 10k stubbed rooms for . the pid and port . port .port and project name".
    - **Repository name.** The repository is `JesseBrown1980/asolaria-universe-simulator-with-gravity-light-time-space-color-rime-winding-drills`.
11. **The 2026-08-02 first build** (`:33-36`, tagged MEASURED). Its receipt is not in this package.
    - It is `FABLE5-KERNELS81-ROOMS50M-BRIDGE874X-2026-08-02.hbp` in `JesseBrown1980/asolaria-multiverse` at `6060afc`.
    - 516,528 / 590 is 875, not 874.
    - That arena used `slot = addr mod 50,000,000`, which is a different law (`../acer-usb-ram-records-2026-10-19/FABLE5-PIPES-IN-2026-08-02.hbp`).
12. **Untagged machine claims.** The machine specification, NTFS and the Windows gates are REPORTED.
13. **Seat identity.** The seat is hard-coded (`main.rs:42-43`). Every receipt the tool writes, on any machine, says
    `seat=ACER-CLAUDE-FABLE5`, and its seed and cubes are salted with it.
14. **The binary.** It is held (`HELD.hbp`).
    - Its import table includes `WS2_32.dll` and `CreateProcessW`. These most likely come from Rust's standard library
      on windows-gnu, but that cannot be shown from the source.
    - The Linux rebuild imports neither.
15. **Tribit provenance.** `TRIBIT.sha256` only matches a hash stored in the same package. The file's origin is
    established above.
16. **Tool behaviour the guide does not state.**
    - `make` overwrites existing sector files and does not create the folder.
    - `verify` does not check file length.
    - Zero sectors or zero rooms panics.
    - None of these affects ACER's run: all 125 sectors are `file_bytes=800000000`.
17. **Rooms are not the retired Host8 handle.** A room is positional: its address is n, and its place on the drive is
    computed. The stub is a full 64-bit bijection of a word below 2^43, a self-check of position, and never an identity.
    The 8-byte Host8 *handle* is a different thing: it is cut from a hash, can collide, and was retired as an identity
    on 2026-10-18 (`docs/ADDRESSABLY-ADDRESSING.md` §4).
18. **"Function rooms."** These (`:22`, `:107`, `:155`) are NAMED. `main.rs` has only make, verify, probe and seal;
    nothing dispatches functions.
19. **Research section** (`:146-149`, `:167-171`). The cloud's web checks found three things:
    - The ReadyBoost page says 1:1 up to 3:1.
    - arXiv 1910.09598 does not support the 2–3× claim.
    - CUDA Unified Memory has no oversubscription on Windows.

    Close prior art the guide omits: direct-access files, T10 PI (an 8-byte tuple whose reference tag is the LBA), BaM
    (ASPLOS '23) and GPUDirect Storage.
20. **Licence.** `Cargo.toml` says MIT, as `asolaria-os@fb7e786` does. aether's own crates are MIT OR Apache-2.0.
