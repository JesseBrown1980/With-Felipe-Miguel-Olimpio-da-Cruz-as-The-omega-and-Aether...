# asolaria

A command-line tool for the Asolaria Aether stack. It lets you generate Ed25519 keys, sign and
verify files, run the tighten-only gate verdict from `gate/verdict` over an envelope file, and
(`observe`) compute the gate scores from observed graph events with the trained L0 EdgeLevelGNN,
without writing Rust. Results are pipe-delimited HBP rows ending in `json=0`.

## Install from source

Requires Rust 1.81 or newer. Clone the repository, then from its root:

```
cargo install --locked --path cli
```

`--locked` builds with the reviewed `Cargo.lock`. Without it, `cargo install` re-resolves
dependencies to their newest versions, some of which no longer build on Rust 1.81. The binary is
installed to `~/.cargo/bin`, which must be on your `PATH`.

## Walk-through

The seed file is a secret, so keep it outside the checkout (here, in your home directory):

```
asolaria keygen --out ~/asolaria-me.seed          # KEYGEN|public=<hex>|seed_file=...|json=0
asolaria sign --key ~/asolaria-me.seed cli/examples/envelope.hbp   # SIGN|sig=<hex>|public=<hex>|bytes=<n>|json=0
asolaria verify --pub <public> --sig <sig> cli/examples/envelope.hbp   # VERIFY|ok=1|json=0
asolaria gate cli/examples/envelope.hbp           # GATE|verdict=PROCEED|...|signature=unchecked|...
asolaria gate cli/examples/envelope.hbp --pub <public> --sig <sig>     # ...|signature=verified|...
asolaria pubkey --key ~/asolaria-me.seed          # PUBKEY|public=<hex>|json=0
asolaria observe --events model/l0-edge/tests/fixtures/events.hbp cli/examples/observe-envelope.hbp
```

The last line prints one `GATE` row; see [`observe`](#observe) below.

To capture fields from a row in a shell script, split on `|`:

```
ROW=$(asolaria sign --key ~/asolaria-me.seed cli/examples/envelope.hbp)
SIG=$(echo "$ROW" | cut -d'|' -f2 | cut -d= -f2); PUB=$(echo "$ROW" | cut -d'|' -f3 | cut -d= -f2)
```

`-` in place of a file reads stdin. Signatures cover the exact bytes of the file, so any edit,
including whitespace or a comment line, invalidates them. Options also accept `--opt=value`, and
`--` ends option parsing. `asolaria <command> --help` (or `help <command>`) prints that command's
usage; no arguments, `help`, `-h` or `--help` print the overview (exit 0); `-V` and `version`
are aliases for `--version`.

`-h` or `--help` anywhere before `--` prints help with exit 0 and no `GATE` row, including where a
file path goes. A wrapper that runs `gate` or `observe` therefore passes `--` before file paths
(`asolaria observe --events "$E" -- "$F"`) and requires the `GATE` row, not only exit 0.

## Commands

| Command | Output |
|---|---|
| `keygen --out <seed-file>` | 32 bytes of OS randomness written as 64 lowercase hex characters and a newline. Refuses to overwrite an existing file; on Unix the file is created with mode 0600. Prints the public key only, never the seed. |
| `pubkey --key <seed-file>` | The public key of a seed file (exactly 64 hex characters, optional trailing newline). |
| `sign --key <seed-file> <file\|->` | Ed25519 signature (128 hex) over the exact input bytes. |
| `verify --pub <64 hex> --sig <128 hex> <file\|->` | `VERIFY\|ok=1` or `VERIFY\|ok=0\|reason=signature_invalid` / `reason=key_malformed`. |
| `gate <envelope\|-> [--pub <hex> --sig <hex>]` | `GATE\|verdict=…\|hookwall=…\|spawn_gate=…\|tier_gate=…\|fischer=…\|input_guard=…\|signature=…\|reason=…\|json=0` |
| `observe --events <events\|-> <envelope\|-> [--pub <hex> --sig <hex>]` | The `GATE\|…` row of `gate` with `score`, `l0_real`, `mark` and `reverse_risk` after the verdict (see [`observe`](#observe)) |
| `help`, `--version` | Usage summary; `VERSION\|name=asolaria\|version=…\|json=0`. |

`gate` with `--pub`/`--sig` first verifies the signature over the exact envelope bytes. A signature
that does not verify, or a public key that is not a curve point, makes the verdict BLOCK
(`signature=invalid`, exit 4) for any envelope that parses. It can only tighten the result, never
loosen it. If the signature is invalid *and* the envelope does not parse, the row is still BLOCK
(exit 4) with every gate reported as `UNEVALUATED`. A valid or absent signature over an envelope
that does not parse is a usage error (exit 2, no GATE row). Without `--pub`/`--sig` the row says
`signature=unchecked`, and the verdict is only as trustworthy as wherever the envelope came from.

`signature=verified` means only that the exact bytes were signed by the private key matching the
`--pub` you passed. Take `--pub` from a trusted, pinned source, never from the same channel as the
envelope: anyone can sign an envelope (with any `caller_tier`) using their own key.

In `reason` and `seed_file`, `%`, `|` and control characters are percent-encoded (`%25`, `%7C`,
`%0A`, …), so a row is always one line with a fixed set of fields. Errors go to stderr as
`ERROR|kind=<usage|io>|reason=<escaped>|json=0`.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success; `gate` or `observe` verdict PROCEED |
| 1 | `verify` failed, an I/O error, or the result row could not be written (closed pipe, full disk) |
| 2 | Usage error: bad arguments, malformed hex or seed file, `keygen` target already exists, envelope or events parse error, envelope over 1 MiB, or an `observe` envelope with a score key or without `payload` |
| 3 | `gate` or `observe` verdict HOLD |
| 4 | `gate` or `observe` verdict BLOCK |

Only exit 0 means PROCEED. Treat every other exit code (including 1, 2 and any crash) as
do-not-proceed. If the GATE row cannot be written, a HOLD or BLOCK keeps exit 3 or 4 and a PROCEED
becomes exit 1. If the KEYGEN row cannot be written, the new seed file is removed.

## Envelope format

One `key=value` per line, at most 1 MiB in total. Lines that are blank or whose first non-space
character is `#` are ignored. The key must match exactly (no surrounding spaces); the value is
everything after the first `=`, taken verbatim (a trailing `\r` is dropped). Unknown keys,
duplicate keys, a missing required key, a line without `=`, non-UTF-8 input and malformed values
are all usage errors (exit 2): nothing is guessed. Control characters (tab, CR inside a line, ESC,
NUL, …), Unicode bidi controls and a leading byte order mark are rejected on every line,
comments included, so an envelope cannot display differently from how it parses; save files as
UTF-8 without a BOM. Integers are plain decimal digits; flags are `0`, `1`, `false` or
`true`. Defaults are the strict values, not `FischerEnvelope::default()` (which pre-fills proof
paths). See [`examples/envelope.hbp`](examples/envelope.hbp) for a clean envelope that composes to
PROCEED.

| Key | Field | Type | Default |
|---|---|---|---|
| `slot` | `VerifiedEnvelope::slot` | integer 0..=255 (64 and above makes hookwall BLOCK) | required |
| `syscall_no` | `syscall_no` | integer 0..=255 | required |
| `caller_pid` | `caller_pid` | integer, u64 | required |
| `hook_tier` | `hook_tier` | `micro`, `cosign`, `firmware` | required |
| `caller_tier` | `caller_tier` | `public`, `restricted`, `stealth`, `hidden`, `shadow`, `secret`, `sovereignty` | required |
| `target_tier` | `target_tier` | same as `caller_tier` | required |
| `event_tags` | `event_tags` | comma-separated, no empty items | empty list |
| `forward_score_q` | `forward_score_q` | integer 0..=1000 | required |
| `reverse_risk_q` | `reverse_risk_q` | integer 0..=1000 | required |
| `pid` | `fischer_envelope.pid` | text | unset (Fischer BLOCKs `missing_pid`) |
| `actor` | `fischer_envelope.actor` | text | empty |
| `verb` | `fischer_envelope.verb` | text | empty (Fischer BLOCKs `missing_verb`) |
| `target` | `fischer_envelope.target` | text | empty |
| `payload` | `fischer_envelope.payload` | text | empty |
| `payload_json_true` | `fischer_envelope.payload_json_true` | flag | `0` |
| `hbp_path` | `fischer_envelope.hbp_path` | text | unset |
| `sidecar_plan` | `fischer_envelope.sidecar_plan` | text | unset |
| `ledger_path` | `fischer_envelope.ledger_path` | text | unset |
| `tuple` | `fischer_envelope.tuple` | text | unset |
| `cube_47d` | `fischer_envelope.cube_47d` | text | unset |
| `cosign` | `fischer_envelope.cosign` | text | unset |
| `halt_path` | `fischer_envelope.halt_path` | text | unset |
| `authority_jump` | `fischer_envelope.authority_jump` | flag | `0` |
| `recursive_consent` | `fischer_envelope.recursive_consent` | flag | `0` |
| `operator_witness_required` | `fischer_envelope.operator_witness_required` | flag | `0` |
| `operator_witness` | `fischer_envelope.operator_witness` | flag | `0` |
| `composite` | `fischer_score.composite` | text; accepted for completeness, ignored by every gate and not shown in output | `0` |
| `l0_real` | `fischer_score.l0_real` | flag | `0` |
| `shannon_q` | `fischer_score.shannon_q` | integer 0..=1000 (per-mille) | `0` |
| `shannon_above` | `fischer_score.shannon_above` | flag | `0` |
| `g4_state` | `fischer_score.g4_state` | `UNKNOWN`, `EDGE_MINED`, `PATH_FOUND`, `CONVERGED`, `MISTAKE_FLAGGED` (anything else parses, then the input guard BLOCKs it) | `UNKNOWN` |
| `fischer_strict` | `VerifiedEnvelope::fischer_strict` | flag | `0` |

An optional text key that is present with an empty value (`cosign=`) is set to the empty string,
which every gate treats like unset. What each gate checks is described in
[`../gate/verdict/README.md`](../gate/verdict/README.md).

## observe

`asolaria observe --events <events> <envelope> [--pub <hex> --sig <hex>]` computes every
GNN-derived gate input itself, from a file of observed graph events and the request in the
envelope, and then runs the same five gates as `gate`. It takes no other options. It runs in
process in Rust (`gate/observed` over `model/l0-edge`): no Python, torch, Node, JSON or network.

The **envelope** uses the format above with every key except the seven scores:
`forward_score_q`, `reverse_risk_q`, `composite`, `l0_real`, `shannon_q`, `shannon_above` and
`g4_state`. Any of them is a usage error (exit 2) naming the key and its line. The required keys
are `slot`, `syscall_no`, `caller_pid`, `hook_tier`, `caller_tier`, `target_tier` and `payload`.
asolaria-hookwall.mjs:70 scores `envelope.payload` when it is a string and
`JSON.stringify(envelope.payload ?? envelope.verb ?? '')` otherwise; `observe` scores the string
form only, so an envelope without `payload` is a usage error (exit 2). An empty `payload=` is
scored as the empty string, as upstream scores an empty string payload. In the request,
`actor -> target` is the edge the L0 model scores (graph node ids), and `pid` and `payload` are
what asolaria-score scores (`score(pid, content)`). See
[`examples/observe-envelope.hbp`](examples/observe-envelope.hbp).

The **events** file holds one row per graph-runtime event,
`EVENT|actor=<id>|actor_type=<t>|target=<id>|target_type=<t>|risk=<integer>|status=<s>`, with
`#` comments and blank lines ignored. Every key is optional, and values are percent-escaped
(`%25`, `%7C`, `%3D` and every control byte). The full format and the parser's refusals are in
[`../model/l0-edge/README.md`](../model/l0-edge/README.md). `-` reads either file from stdin
(not both). The whole events file is read into memory; the parser accepts at most 1,000,000
events.

What it computes, in order:

1. Node features for every id in the events (`extractNodeFeatures`, gnnDataExport.js:25-64),
   scaled as `train_baseline.py` scales them.
2. The L0 EdgeLevelGNN forward that the running server (`inference_server.py`, port 4792) runs,
   on the request asolaria-score sends: nodes `[actor, target]`, edge `[[0, 1]]`. When the actor
   or the target never appears in the events there is no L0 reading, as when :4792 does not
   answer (`l0_real=false`). At a `toFixed(4)` rounding midpoint the L0 value can be one e4 unit
   from what torch's float32 output gives (measured in
   [`../model/l0-edge/README.md`](../model/l0-edge/README.md#the-forward)).
3. The asolaria-score signals: `l0` (when present), Shannon of the payload and the sha baseline
   of `pid|payload`. L4, G1, G2 and G3 have no service in this stack and are absent.
4. The composite (asolaria-score.mjs:155-164, the served copy in `gate/observed/vendor/acer-scorer-2026-10-18/`;
   `l4` carries no weight there since the owner's 2026-10-18 edit) and `reverseGain` (lines 104-108).
5. The gate envelope: `forward_score_q = composite_e4 / 10` (rounded down) and
   `reverse_risk_q = reverse_risk_e4 / 10` (rounded up) for the spawn gate, where `_e4` values
   are the four decimals of `toFixed(4)` as integers (units of 1/10000), and the Fischer
   score (`composite`, `l0_real`, `shannon_q`, `shannon_above`, `g4_state=UNKNOWN`). Every other
   field comes from the envelope.

`observe` prints the `GATE` row of `gate` with four keys after the verdict, rendered as the
hookwall observation row renders them (asolaria-hookwall.mjs:48-51): `score` is JavaScript
`String` of the composite (`sc.composite`), `l0_real` is `true` or `false`, `mark` is
`FORWARD_GNN_MARK_GENIUS` when `reverseGain` promotes and `REVERSE_GAIN_MARK_MISTAKE` otherwise
(asolaria-score.mjs:107), and `reverse_risk` is `+(1 - composite).toFixed(4)`. A failed signature
over an envelope or events file that does not parse gives the BLOCK row of `gate`, every gate
`UNEVALUATED`, without these keys. The L0 reading and the separate signals are not printed;
`gate/observed` returns them to Rust callers. With the
SYNTHETIC events fixture (`model/l0-edge/tests/fixtures/events.hbp`), from the repository root:

```
$ asolaria observe --events model/l0-edge/tests/fixtures/events.hbp cli/examples/observe-envelope.hbp
GATE|verdict=HOLD|score=0.2139|l0_real=true|mark=REVERSE_GAIN_MARK_MISTAKE|reverse_risk=0.7861|hookwall=PROCEED|spawn_gate=HOLD|tier_gate=PROCEED|fischer=PROCEED|input_guard=PROCEED|signature=unchecked|reason=HOLD by spawn_gate; hookwall=Proceed spawn_gate=Hold tier_gate=Allow fischer=PROCEED cpl=0 flags=[proof_gain_q,gnn_observable,reproducible] input_guard=[]|json=0
```

The exit code is 3 (HOLD). The other request pairs listed in the fixture's header give, with the
same envelope otherwise:

| `actor -> target` | `score` | `l0_real` | `mark` | verdict (exit) |
|---|---|---|---|---|
| `agent:benign -> svc:ledger` | 0.2139 | true | `REVERSE_GAIN_MARK_MISTAKE` | HOLD (3) |
| `agent:rogue -> svc:vault` | 0.7593 | true | `FORWARD_GNN_MARK_GENIUS` | PROCEED (0) |
| `agent:ghost -> svc:ledger` | 0.4705 | false | `REVERSE_GAIN_MARK_MISTAKE` | HOLD (3) |

The model was trained with `BCELoss` on the `gnnDataExport.js` edge label (train_baseline.py:83-105),
which is 1 for risk >= 6, status blocked or denied, or an action containing blocked or denied
(gnnDataExport.js:74-77). asolaria-score adds L0 to the composite with weight 0.30
(served asolaria-score.mjs:157-160). These are the upstream definitions; `observe` reproduces them.
L4, G1, G2 and G3 are absent in this stack, so the figures above are the same before and after the
owner's 2026-10-18 edit that took `l4` out of the weights.

`--pub`/`--sig` work as for `gate` and cover the exact envelope bytes only. The events file is
not signed, so `signature=verified` says nothing about it. The events file decides the L0 term:
with `examples/observe-envelope.hbp`, the single row
`EVENT|actor=agent:benign|target=svc:ledger|risk=9` gives `score=0.7375` and PROCEED (exit 0),
where the fixture gives `score=0.2139` and HOLD (exit 3).

## Scope

- Ed25519 is real: `ed25519-dalek` via `asolaria-hookwall`, verified with `verify_strict` (which
  also rejects small-order keys and non-canonical signatures). Keys come from the operating
  system's random source (`getrandom`).
- The gates are deterministic software policy over values you supply. For `gate`, scores,
  `g4_state`, `l0_real` and the tiers are inputs, not measurements. For `observe`, the scores
  are computed from the events file you supply (`g4_state` is `UNKNOWN`: this stack has no G4
  service); the events and the tiers are still inputs. The tool enforces nothing by itself; the
  caller must act on the verdict and exit code.
- `signature=verified` means the exact bytes were signed by the private key matching `--pub`,
  nothing more. There is no key registry or pinning, and envelopes carry no expiry or nonce, so a
  signed envelope can be replayed.
- Nothing persists. No ledger, log or chain row is written; `keygen` writes only the seed file.
- There is no physical attestation. The `sovereignty` tier is a policy label; nothing detects
  hardware or operator presence.
- A seed file is a secret. Keep it mode 0600, outside any repository, and never commit it. The seed is held in hookwall's
  `PrivateKey` (zeroized on drop) and the hex buffers are wiped, but this is ordinary userspace
  memory, not a hardware key store. On Windows the file gets the directory's default ACL.

- `sign` and `verify` read their whole input into memory; `gate` and `observe` cap envelopes at
  1 MiB; `observe` reads the whole events file into memory.

## Development

From the `cli/` directory:

```
cd cli
cargo +1.81.0 test --locked
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
```

`Cargo.lock` pins every crate shared with `gate/hookwall/Cargo.lock` to the same version.
`observe` adds only path dependencies (`gate/observed`, `model/l0-edge`); no new crates.io crate.

## License

MIT. See [`../LICENSE`](../LICENSE).
