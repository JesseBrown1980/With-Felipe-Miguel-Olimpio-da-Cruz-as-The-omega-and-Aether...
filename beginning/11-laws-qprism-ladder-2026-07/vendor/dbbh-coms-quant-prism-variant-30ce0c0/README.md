# dbbh-coms-quant-prism

**Double Binary Black Hole Comms Quant Prism — first cell, research-backed.**
Pure Rust, **zero deps**, HBP hot-path (`json=0`). No JSON, no Node. 8-byte-host native.

This is the acer reference implementation, folding in the full research thread: the two
papers (BrainJanus + exoplanet-eccentricity), the actual Asolaria formulas (prism / quant /
frozen-brain / GAC), and acer's own `PRISM-COMB-0LOSS` canon.

> **2026-07-11 verification/correction:** this crate is **Path 1** — exact retained-store recall
> through a consent capsule, content address, and bijective representation ladder. The companion
> [`path2-two-shadow-recovery`](https://github.com/JesseBrown1980/path2-two-shadow-recovery)
> now implements the capstone's formerly-unbuilt **Path 2**: exact, no-store recovery from jointly
> injective CRT shadows, followed by DBBH→DBWH re-projection and watcher-gated emission. See
> [`docs/PATH1-PATH2-INDEPENDENT-VERIFICATION-2026-07-11.md`](docs/PATH1-PATH2-INDEPENDENT-VERIFICATION-2026-07-11.md).

## What it is

Four Asolaria pieces fused into one mechanism:

| layer | piece | role |
|---|---|---|
| **security** | IX-737 double-black-hole session capsule (arm / collapse / revoke) | *who* may link |
| **compression** | quant snap (lossy) + the BEHCS ladder | shrink slice → shadow |
| **reconstruction** | prism re-relation + content-address into the retained store | shadow → slice, **lossless** |
| **coms** | HBP `json=0` rows over AI↔AI / AI↔HW / HW↔HW | send the shadow, not the payload |

The BEHCS ladder — **64 / 256 / 1024 / HyperBEHCS(60D)** — is a groupoid of bijective
re-relations (`H(f(X)) = H(X)`), each rung its own round-trip proof. The `256↔1024`
reference rung is **5 bytes ↔ 4 glyphs** at `lcm(8,10)=40` bits, exact.

## The research it encodes

- **The papers do lossy shadow-reconstruction** (VQ nearest-neighbor + a hard ~0.65 noise
  ceiling). This crate does not invert a non-injective shadow. It preserves exactness in two
  honest ways: complete glyph crossings use a bijective representation, while address-only
  crossings select an object that the receiver already retained.
- **`dbbh_receive_addressed`** is the Path-1 crown: the wire carries only the 20-char address; the
  far pole recalls the exact original from its store — or is **held** if it never retained it
  (no invention). The mass does not cross in that mode; the shadow-coordinate does.
- **Path 2 is now measured in the companion crate:** CRT residues are lossy individually but
  jointly injective when their product reaches the block roof. The recovered candidate is
  re-projected and emitted only when SHA, cylinder shadows, and frequency shells agree.
- **The honest line** (acer `PRISM-COMB-0LOSS` canon): *infinite ADDRESSING capacity +
  lossless re-relation — NOT lossless compression below entropy. No bijection beats Shannon.*

## The security/comms law (deterministic, tested)

```text
no consent (not both armed) -> Held::NoConsent
capsule collapsed/revoked   -> Held::Collapsed
tampered shadow             -> Held::AddressMismatch  (re-address fails)
far pole didn't retain      -> Held::AddressMismatch  (no invention)
broken receipt chain        -> Held::BadChain
valid + retained            -> lossless reconstruction
```

## Test ladder and independent verification

```text
unit         8/8   sha256 KAT · ladder round-trips · groupoid path-independence · 60D reshape · PID-specific cube · capsule consent · receipt tamper-detect
integration  4/4   glyph-riding lossless (all modes, padding sizes) · address-only store reconstruct · tamper held · fixed-size address
suite        3/3   full capsule lifecycle · either-side revoke · stranger PID cannot arm
system       4/4   ASI-OS backend rooms, 3 coms modes, PID 60D cube, hot-path json=0 asserted, no-consent held, no-retention held, full ladder
                    = 19/19 pass, zero deps
```

- Existing repository receipt: **19/19**, WSL, rustc 1.96.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: the operator supplied a real Claude Fable 5 run on a
  third independent container using **rustc 1.97**, **19/19 green**, independent of acer/WSL and liris.
- `AUDITED_GPT_5_6_PRO`: GPT-5.6 Pro read all 813 source lines, all tests, both docs, the README,
  and the full companion Path-2/watchers lineage. The GPT sandbox lacked Rust and outbound DNS,
  so it does not falsely claim a local cargo run.
- `CI_GPT_DIRECTED`: `.github/workflows/rust-1.97-independent-verification.yml` installs Rust
  1.97.0, asserts exactly 19 tests, executes all targets, and uploads the receipt.

## Storage-backed / non-GPU applicability

The recovery and control plane can run on CPU-and-storage-oriented machines. SHA/AGT addressing,
BEHCS rebasing, CRT recovery, consent state, receipt verification, HBP/HBI sidecars, white-room
compaction, queues, and N-Nest recomputation do not require a GPU. A hard drive or SSD can hold
cube bodies, retained content, ledgers, and cold agent state while RAM holds only the active bounded
window.

This does **not** mean disk performs neural matrix multiplication. Trained PyTorch GNNs and LLMs
may still use CPU/GPU/accelerators. The result is that exact recovery, routing, proof, gating, and
durable memory are separable from GPU-resident inference and can call neural scorers as optional
sidecars.

## Status (dual-lens, tagged)

- `MEASURED` — the ladder bijections (each round-trip), the capsule state machine, the
  address-only lossless crossing, all held-cases; sha256 KAT-verified; **19/19 tests**.
- `MEASURED_PATH2_COMPANION` — no-store CRT recovery, capacity hold, N-cylinder consistency,
  and DBBH→DBWH re-projection live in `path2-two-shadow-recovery`.
- `CANON` — IX-737 (the security architecture); `PRISM-COMB-0LOSS` (the `256↔1024` bijection).
- `DESIGN` — the double-black-hole *coms* framing as a whole (this crate remains a simulator/receipt cell).
- `UNVERIFIED` — a live Hilbra-keyed cross-machine tunnel, hardware fire, physical quantum transport,
  and an end-to-end transaction invoking the complete trained GNN ensemble inside this Rust throat.

Bilateral: Liris's `host8/dbbh_coms_quant_prism.rs` (Q-PRISM PR #1) is the independent
second implementation — attack-verified re-run on the acer seat (6/6). The operator-reported
Claude Fable 5 rustc-1.97 run is the third execution seat for this crate.

## License

MIT OR Apache-2.0.
