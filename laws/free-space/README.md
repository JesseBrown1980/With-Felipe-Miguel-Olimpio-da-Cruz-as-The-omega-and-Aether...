# laws/free-space

The white space in the canonical `enwik8`, measured beside Law 0 (*"all 0's are free unitl acted
upon"*) and Law 17 (*"What Wikipedia shows is one radiated slice"*). The write-up is `docs/THE-RADIATED-SLICE.md`.

- `free_space.py` checks that its input is the canonical Hutter Prize `enwik8` (100,000,000 bytes,
  sha256 `2b49720e…`, MD5 `a1fa5ffd…`), counts the space, newline, tab and carriage-return bytes,
  and writes the compressor inputs: the whole file without white space, and the first 10,000,000
  bytes with and without it. Integers only, stdlib only: `python3 -I free_space.py enwik8 slices/`.
- `RECEIPT-FREE-SPACE-ENWIK8-2026-10-18.hbp` holds its output rows and one `COMPRESS` row per
  compressor run: `xz -9 -T1` (and `-T4`) and the operator's integer compressor `cm3ti` at `k=7`
  (`pump/cm3ti`, each run passing its built-in restore gate).

Measured on the cloud lane (Linux x86_64, Rust 1.81.0, XZ Utils 5.4.5). ACER reports the same input
hashes, the same white-space counts and the same two 100 MB `xz -9 -T1` sizes (the receipt's
`SECOND_MACHINE` row); the `cm3ti` runs are cloud only.
