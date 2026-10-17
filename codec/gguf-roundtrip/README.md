# asolaria-gguf-roundtrip

Runs the owner's DBBH -> DBWH codec (`holographic-wormhole-codec` @ `4901280`, vendored unchanged in
[`../dbbh-dbwh/`](../dbbh-dbwh/)) over every GGUF listed in [`../../gguf/MANIFEST.hbp`](../../gguf/MANIFEST.hbp)
and prints HBP rows (`json=0`). Rust 1.81, std only, integer arithmetic only, no codec code changed.

```sh
cargo +1.81.0 run --locked --release                    # the 27 GGUF files in the repository
cargo +1.81.0 run --locked --release -- --lfs-dir DIR   # also the 4 Git LFS GGUFs, read from DIR/<local path>
cargo +1.81.0 run --locked --release -- --manifest PATH # another manifest; paths resolve next to it
```

`DIR` has the same layout as for `gguf/check.sh --lfs-dir DIR`
(`DIR/universe-simulator/gguf/pumped/…`, `DIR/universe-simulator/gguf/stars/KIMI-K3-STAR-256.gguf`).

Per object it calls, in order: `black_hole_compress(object, b"acer", b"liris", b"salt")`, then
`pkt.capsule.arm_receiver()` (consent given), `white_hole_emit(&pkt, &[0, 1])`,
`receipt_hbp(&pkt, &verdict, &[])`, and `wormhole_traverse(object, &[0, 1], &[2, 3])`. The subsets
`[0, 1]` and `[2, 3]` and the sender, receiver and salt are the ones the codec's own tests and
`wormhole_traverse` (codec `src/lib.rs` line 303) use.

Exit status: 0 when every measured row matches the manifest (bytes and SHA-256) and both the emit and
the traverse return the input byte for byte; 1 otherwise; 2 on a usage error or when the manifest
cannot be read or parsed. A GGUF that cannot be read is printed as `status=NOT_READ` and exits 1. An
LFS row with no `--lfs-dir` is printed as `status=NOT_MEASURED` and does not change the exit status.
When no row is measured, `SUMMARY` ends in `status=NOT_MEASURED|reason=no_gguf_measured` and the exit
status is 0, as the codec's own workflow gate reports a run that measured nothing.

The committed run over all 31 GGUFs is [`RECEIPT-GGUF-ROUNDTRIP.hbp`](RECEIPT-GGUF-ROUNDTRIP.hbp).
Row fields and the measured results are in [`../README.md`](../README.md).

License: MIT.
