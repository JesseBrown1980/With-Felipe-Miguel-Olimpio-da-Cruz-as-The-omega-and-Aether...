# Provenance — aether-loop (ADDRESS / ROUTE / LOOP front half)

Rust 1.81 hot-lane ports of the owner's Node request-path modules. Each `src/` module cites its upstream
file and lines in its header; a stdlib Python referee (`referee/referee_hbp.py`) mirrors those lines and
checks the `emit_rows` example for byte-identical HBP rows (111 rows, 0 mismatches).

Upstream (ported, not vendored byte-for-byte — Node → Rust, same output):

- repo `https://github.com/JesseBrown1980/bigpickle-rebuild` @ `c592599c8f3d000b07cd5f4218b7d6b24d49d7d5`

| module (`src/…`) | upstream path | git blob id | upstream lines |
|---|---|---|---|
| `pid_minter.rs` | `src/pid-minter.mjs` | `b953e1013b327cc7e5cd90b82e41f818092fb2f1` | 15-84 |
| `glyph.rs` | `src/behcs.mjs` | `c7aead370a2ab4acbc767cd96dbce885ada8209e` | 11,26-35 |
| `primes.rs` | `src/primes.mjs` | `12d767bd80d91f64fe89ee930fc3820434bd22e2` | 5-29 |
| `revolver.rs` | `src/pid-chain-revolver.mjs` | `33511654a76966e6631cac94945cc1ed167a5cdf` | 18,32-47 |
| `district_fabric.rs` | `src/district-fabric.mjs` | `b40d206330b3b9b69ff207d1df6fa44e1d9ac421` | 28-186 |
| `room_router.rs` | `src/project-room-router.mjs` | `de682a65f46dd15da457ca55543143ebd84b2c49` | 20-117 |
| `dispatcher.rs` | `src/room-dispatcher.mjs` | `bbf49a247bd0b5a27c882d76b42a11e5e6c9f75d` | 29-121,136-141,210-217 |
| `loop_cycle.rs` | `src/asolaria-loop.mjs` | `22bda75b2a7457f2bb58ae24f9b51a306ae65398` | 26-103 |
| `gc_runtime.rs` | `src/gc-runtime.mjs` | `696dbdcb1d4f38ac6b6e3bd4139e46c8fa9c0fb2` | 10-59 |
| `hookwall.rs` | `src/asolaria-hookwall.mjs` | `f51d86384e2559ccd36180a9b59990c4f51f0cdf` | 27-132 |
| `kernel.rs` | `src/asolaria-kernel.mjs` | `428e3de1fa8fe98956630fe5c197f2c8196cc028` | 91-104 (with room-dispatcher.mjs:162-190) |
| `hbp.rs` (`parse_pipe_row`) | `src/hbp-reader.mjs` | `27bf471ae6576f91d407baca0fff6d8d56661610` | 30-39 |

- repo `https://github.com/JesseBrown1980/ASOLARIA-AS-NEURAL-NETWORK` @ `4cc7624fb51ff8a64051ace7a1ff62edaa51d422`

| module (`src/…`) | upstream path | git blob id | upstream lines |
|---|---|---|---|
| `omni_engine_loop.rs` | `tools/behcs/omni-engine-loop.mjs` | `b0a78eb0d5770752087f166d54de5271f8bcba49` | 17-78 |
| `github_pid_register.rs` | `tools/behcs/github-pid-register.mjs` | `a2beaf697c3c89565feb49b17c3b74ac46a62507` | 14-68 |

`js.rs` has no upstream file: it reproduces the ECMAScript string operations the upstream lines above
call (`String.prototype.slice`/`charCodeAt` over UTF-16 code units, `String.prototype.trim`,
`JSON.stringify` of a string, and Node's UTF-8 encoding of an unpaired surrogate as U+FFFD).

The byte-identical vendored reductions kernel is the separate crate `vendor-pid-mod/` (see its
`PROVENANCE.md` and `UPSTREAM.sha256`).

## Lane boundaries (ported as injected parameters, not invented here)

- SCORE lane (`asolaria-score.mjs`) and Fischer lane (`fischer-kernel.mjs`): called through
  `hookwall::GateLanes` (`ScoreFields`, `FischerOutcome`) at asolaria-hookwall.mjs:71,74, and through a
  closure in `run_primitive_loop` (asolaria-kernel.mjs:97). `reverseGain` / `shannonParts`
  (`Math.log2`/`toFixed`, room-dispatcher.mjs:143-159) and the `room_answer` row that needs them
  (:162-207) are not in this crate; no directory of the tree emits that row yet (open integration item,
  see README).
- Live free-agent mode (opencode spawn, room-dispatcher.mjs:67-91) and the GNN HTTP infer (:124-134):
  the lane boundary, not ported.
- Filesystem district build and row appends (`mkdirSync`/`appendFileSync`): the integrator's lane; the
  row builders are pure and take the timestamp as a parameter.
- `revolver.preWarm` (pid-chain-revolver.mjs:53-87, MTP lane): not brought in here (`model/hrm-mtp`
  ports it). `omniEngineLoopCycle` takes string rows; the object-row key (`row.key || row.name ||
  JSON.stringify(row)`, omni-engine-loop.mjs:62) has no hot-lane input. The rest of
  github-pid-register.mjs (`mintTriad`, `registerAgent`, the registration rows, :70-121) is outside the
  ported range.

## Privacy

No third-party personal data was copied into these ports (comments cite `file:line` only; the owner's
own name is not reproduced in code). The byte-identical `vendor-pid-mod/src/pid-mod.rs` carries personal
data of someone other than the owner; its `PROVENANCE.md` cites the lines without quoting them, and the
crate awaits the owner's decision before publishing.

## Build

Rust `cargo +1.81.0`, edition 2021, `#![forbid(unsafe_code)]`, no floating-point in `src/`/`tests/`/
`examples/`, `sha2 0.10.9`. `CARGO_TARGET_DIR=scratchpad/targets/loop` keeps the target tree out of the repo.
Not committed or pushed.
