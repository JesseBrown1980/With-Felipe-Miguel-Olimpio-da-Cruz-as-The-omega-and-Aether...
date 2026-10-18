# agents/levels

The owner's HRM, Bobby Fischer and MTP agents at the levels where code runs all three. Two sources
name levels in code, and both are brought in here; neither file cites the other, so they are kept
side by side and not merged into one table.

| Source | Levels | What runs at each level | Here |
|---|---|---|---|
| asolaria-stone-to-moss PR #124 (open draft), head `5303c9b2`, `experiments/seat1/proxima-rust181` | depth 1..7 = 3, 9, 27, 81, 243, 729, 2187 cells (`src/lib.rs:133-149`) | `hrm_fast`, `hrm_slow`, `mtp123` at +1/+3/+9 for two periods, `independent_fischer` (which calls `mtp123` itself, `lib.rs:118`), Shannon counts, GNN ring sum, two Chariots | vendored byte for byte under `vendor/asolaria-stone-to-moss/`; its own crate, tests and referees |
| universe simulator `players/rime_agents.py` @ `3f9f42d` | 3 / 27 / rime (`rime_agents.py:6-8`) | Fischer (Law 23): level 3 = which third, level 27 = `k mod 27` as three trime digits, level rime = full `k`; MTP (Law 24): x1 / x3 / x27 roll-forward; HRM (Law 25): deep / mid / base routing; MCP (Law 26) | Rust port in `src/` (crate `asolaria-levels-agents`, library `levels_agents`); MTP and HRM from `model/hrm-mtp` |

## Layout

| Path | Lane | Contents |
|---|---|---|
| `src/` | hot (Rust, integers, no Node / JSON / HTTP / Python) | `fischer_agent`, `mcp_agent`, `rime_fischer`, `cluster`, `the27`, `rime_agents` (the four-agent run), `sphere`, `bignum`, `pyfmt` |
| `examples/` | hot | `rime_agents` (needs enwik8), `rime_fischer`, `rime_fischer_cluster`, `rime_27fischers`: each prints its upstream script's stdout |
| `tests/` | check | ports against the owner receipts and the upstream stdout fixtures |
| `tools/` | cold (stdlib Python) | `levels_referee.py` runs the vendored players unchanged; `proxima_levels_referee.py` mirrors PR #124 `lib.rs:11-170` line by line |
| `vendor/` | pinned bytes | PR #124 crate (clean files) and the universe-simulator players and receipts; `UPSTREAM.sha256` |

## Run

```
T="$(mktemp -d)"   # every output goes here, outside vendor/
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
python3 -I tools/levels_referee.py fixtures --check
cargo +1.81.0 run --release --example rime_agents -- /path/to/enwik8 > "$T/agents.txt"
cmp "$T/agents.txt" vendor/universe-simulator/receipts/operator/rime_agents.txt
python3 -I tools/levels_referee.py agents --enwik8 /path/to/enwik8 --rust "$T/agents.txt"

cd vendor/asolaria-stone-to-moss/experiments/seat1/proxima-rust181
export CARGO_TARGET_DIR="$T/proxima-target"
cargo +1.81.0 test --locked --offline
cargo +1.81.0 run --locked --offline --release -- "$T/out"
python3 -I independent_referee.py "$T/out"
python3 -I ../../../../../tools/proxima_levels_referee.py --check "$T/out"
```

The `rime_agents` example prints upstream's stdout, and on stderr one HBP row with the tie margin
of the bpc line (see `PROVENANCE.md`, "Float in upstream's MTP and HRM lines").

## Trits

Where upstream carries a balanced-ternary digit as a Python int in `{-1, 0, 1}`, the port carries
the owner's trit `Zero` (`Neg = -1`, `Nil = 0`, `Pos = +1`; `kernel/tribit`, asolaria-tribit@1292191),
through the path dependency `asolaria-ternary` (`../../ternary`). This follows the owner, 2026-10-17:
"we should be working with trinaries and ternaries", and the owner rule relayed from the ACER seat:
"reuse tribit/mod.rs, never reinvent". The places are rows A1-A4 of `ternary/MIGRATION.md`:

| Row | Rust | Upstream (USIM @ `3f9f42d`) | Written by |
|---|---|---|---|
| A1 | `fischer_agent::FischerAgent::trimes: [Zero; 3]` (`src/fischer_agent.rs:40`, filled `:78-79`; `sig` from `direction()` `:81-88`) | `players/rime_agents.py:46-52` | `ternary::balanced::low_trits` |
| A2 | `the27::dlog_mod_27 -> (u64, [Zero; 3])` (`src/the27.rs:23`, `:36-37`), `Node::bal` (`:85`) | `players/rime_27fischers.py:39-44` | `ternary::balanced::low_trits` |
| A3 | `the27::cube27() -> [Cell; 27]` (`src/the27.rs:56-58`), `Node::color: Cell` (`:87`) | `players/rime_27fischers.py:51-52` | `ternary::cube::cell` |
| A4 | `cluster::to_balanced_base3 -> Vec<Zero>` (`src/cluster.rs:52-56`), `Worker::trime_digits` (`:74`) | `players/rime_fischer_cluster.py:38-45` | `ternary::balanced::low_trits` |

Every printed line is unchanged: the printers write `Zero::direction()` (`-1`, `0`, `1`) where they
wrote the integer. `to_balanced_base3` takes `x` up to `i64::MAX`, the input type of `low_trits`
(see `PROVENANCE.md`, "Trits as the owner's `Zero`").

Sources, blob ids, the files left out and why, and every measurement are in
[`PROVENANCE.md`](PROVENANCE.md).
