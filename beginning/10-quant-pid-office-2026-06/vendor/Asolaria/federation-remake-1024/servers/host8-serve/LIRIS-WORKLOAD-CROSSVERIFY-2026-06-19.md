# LIRIS crossverify - host8-serve workload summon lane (2026-06-19)

Scope: Git and deterministic-parity verification from the Liris seat. No Liris host8 daemon was started and no Liris Rust build was run.

`MEASURED`: source branch `JesseBrown1980/Asolaria` `acer/host8-serve-workload-2026-06-19`, commit `9fc2d59`, contains:

- `federation-remake-1024/servers/host8-serve/src/main.rs`
- `federation-remake-1024/servers/host8-serve/README.md`
- `federation-remake-1024/servers/host8-serve/CRANK-RECEIPT-CBA-2026-06-19.md`

`MEASURED`: `src/main.rs` exposes `/summon.hbp?h=<handle8>&device=<d>&ts=<unix>&fire=<0|1>`, with resolve-only as the safe default and `fire=1` as an explicit live call path.

`MEASURED`: deterministic parity recompute on Liris:

```text
input = 0155964ffc8ef1f8|acer|1750000000|format.FORMULA-CHIEF.c844dff6b59b40cf.0155964ffc8ef1f8
sha256(input)[0:16] = d125579d9644c37a
```

This matches the Rust test fixture and the node GAIA-loader parity value recorded in the Acer receipt.

`MEASURED`: `src/main.rs` includes tests asserting the fixed parity value and verifying that `/summon.hbp` resolves without firing when `fire=1` is absent.

`OPERATOR_OBSERVED`: Acer transcript reports `cargo test 15 passed`, a live Rust `/summon&fire=1` with instance `1bc67f34df67b72a`, `cost 0`, `exit 0`, response `FORMULA-CHIEF present and formatted`, and live `:5088` remaining untouched during throwaway `:5097` verification.

`UNVERIFIED`: `cargo` is not installed on this Liris seat, so Liris did not run `cargo test` or start the host8 daemon. The Rust live process and `$0` summon remain Acer-side runtime evidence for this receipt.

Boundary: the workload route and node/Rust parity are now Git-visible and independently formula-checkable. Swapping the live `:5088` daemon onto this workload binary remains a separate operator-gated restart.
