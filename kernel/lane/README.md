# asolaria-kernel-lane

The kernel boot lane of asolaria-federation-1024 (@ `dc1da1a9`), run in process on the host. It
picks up after PCI discovery, and it gives the kernel-lane source of hookwall inputs (OWNER-RULES 7d):
`caller_pid` 0, init's `[slot, syscall_no]` table (`EXEC` gives 2/3, every other type 9/10), Micro, Public.

- `core/`: the upstream `kernel/core` modules the lane reaches, byte-identical (`syscall`, `hookwall`, `cosign_chain`, `envelope`, `tier`, `gnn`, `bus_fabric`, `sign_gate`, and what they call). It is `no_std`, and upstream's own unit tests run here.
- `init`: upstream `kernel/boot/src/init.rs`, byte-identical in `vendor/`, compiled after `build.rs` turns its 24 leading `//!` lines into `//`.
- `lane`: the kernel-lane `HookContext`, plus the 16-byte `HVD` row `sys_hookwall_post` hands to the cosign chain.
- `boot`: the `BOOTPID`, `BOOTTIME`, `BOOTPROJ` and `BOOTDRIVER` rows, built from the discovered PCI functions and the clock reading. `project_60d` comes from `../behcs1024-60d`.
- `sim::BootLane` runs two paths, and appends no cosign row of its own:
  - the console path the UEFI boot runs (`init::exchange`, which the console calls for `PING`, `VERS` and `PIDA`);
  - the headless `init::run()` loop, one turn at a time, stopping where upstream calls `sys_exit`.
- `host8kernel`: the asolaria-asi-os parse of host8's `HOST8KERNEL` row, without HTTP.

```
cargo +1.81.0 test --locked --workspace
python3 tools/referee.py --check      # stdlib referee: receipts, verbatim blocks, transcript
sha256sum -c UPSTREAM.sha256
```

`PROVENANCE.md` covers the sources, the line-by-line differences, the privacy scan and the measured behaviour.
