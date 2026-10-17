# asolaria-verdict

Layer-5 composition. `compose(&VerifiedEnvelope) -> Composed` runs four upstream gates and one glue
input guard over one input struct and returns the strictest result. Every gate reads its inputs
from that struct; there are no separate overrides.

## Gates

| Gate | Source | Checks | Mapping |
|---|---|---|---|
| `hookwall` | `../hookwall` `hookwall_pre` | Slot is below 64, then the hook tier only: Micro, Cosign, Firmware | Proceed / Hold / Block; out-of-range slot is Block |
| `spawn_gate` | `../hookwall` `spawn_gate_verdict` | Event tags against `sign_gate::DEFAULT_DENIES`, then the hookwall tier, then forward score >= 720 and reverse risk <= 280 (both 0..1000) | Proceed / Hold / Block |
| `tier_gate` | `../hookwall` `tier_gate::check` | The 7x7 caller-tier to target-tier matrix | Allow = Proceed, Escalate = Hold, Deny = Block |
| `fischer` | `../fischer-eval` `evaluate` | Fischer CPL rules on the Fischer envelope and score (missing pid or verb, refuted verbs, missing cosign / halt path / witness, proof paths, and so on) | PROCEED = Proceed; HOLD and ANALYZE = Hold; BLOCK and REFUTE = Block |
| `input_guard` | this crate, `input_guard` | Inputs the upstream gates do not fail closed on (see below) | Block or Hold per rule; Proceed when no rule fires |

ANALYZE is always Hold, even though Fischer sets its own `pass` flag for it. The mapping functions
use exhaustive matches, so a new upstream verdict variant fails to compile instead of defaulting
open.

## Tighten-only rule

Severity is ordered `Proceed < Hold < Block`. The composed verdict is the maximum over all gates, so
a gate can only make the result stricter. A Fischer PROCEED cannot lower another gate's Hold or
Block. With the input guard, a caller-supplied `g4_state = "CONVERGED"` cannot lower any gate's
severity, Fischer's included. `strictest(&[])` is Block.
`Composed::reason` names the gates that decided the result and each gate's raw verdict.

## Scope

- This is deterministic software policy over values passed in. It is not a sandbox and it does not
  stop or launch anything; the caller must act on the verdict.
- "Verified" in `VerifiedEnvelope` is the caller's contract. This crate checks no signature, origin
  or identity. The hookwall crate's `crypto` module is real Ed25519 (`verify_strict`), but it is not
  called here: verify the envelope with `asolaria_hookwall::crypto::verify` before building one.
- `forward_score_q`, `reverse_risk_q` and the Fischer score fields (including `g4_state`,
  `l0_real` and `shannon_q`) are caller-provided inputs, not measurements.
- Nothing persists. No ledger, file, chain row or log is written.
- There is no physical attestation. The Sovereignty tier is a policy label; nothing here detects
  operator presence or hardware.

## Input guard

`input_guard` only adds strictness. Its fired rules are listed in `Composed::reason`.

| Rule | Severity | Upstream gap it covers |
|---|---|---|
| `pid_malformed` | Block | Fischer only rejects a missing or empty pid. A blank pid (`" "`, `"\t"`), a pid with whitespace or control characters, or the sentinel `UNKNOWN` (any case) passed. |
| `verb_malformed` | Block | Fischer matches verbs exactly, so `SELF_AUTHORIZE`, `self_authorize ` or `Delete_Evidence` escaped the refuted-verb list and composed to Proceed. Verbs must be non-empty `[a-z0-9_]`. |
| `g4_state_unknown` | Block | Fischer treats an unrecognised `g4_state` (`mistake_flagged`, `converged`, `CONVERGED `, empty) as neutral. Only `UNKNOWN`, `EDGE_MINED`, `PATH_FOUND`, `CONVERGED` and `MISTAKE_FLAGGED` are accepted. |
| `deny_tag_any_case` | Block | `sign_gate::deny_check` is case-sensitive, so `DRIFT` or `Off-Fabric` passed `spawn_gate`. Tags are compared to `DEFAULT_DENIES` in any ASCII case. |
| `no_replay_path_write_or_spawn` | Hold | A write or spawn verb with no `hbp_path`, `sidecar_plan` or `ledger_path` |
| `g4_state_cannot_loosen` | Fischer's severity under `UNKNOWN` | A lowering `g4_state` (`EDGE_MINED`, `PATH_FOUND`, `CONVERGED`) cannot lower Fischer's severity below what it is with `g4_state = "UNKNOWN"`. |

`FISCHER_WRITE_VERBS` and `FISCHER_SPAWN_VERBS` mirror fischer-eval's private verb lists. A test
checks that ANALYZE is reachable for exactly those verbs.

## Known upstream behaviour (fischer-eval, not changed here)

These are fixed in composition only. `evaluate` itself still behaves this way, and tests pin it:

- **No replay path.** The `no_replay_path` hard floor is 100, below the Hold threshold of 150. An
  unsealed `write` (or a spawn verb) with no replay path can therefore reach PROCEED. CONVERGED is
  not needed: `l0_real = true`, a `tuple` or `cube_47d`, a `BH.` pid prefix, or CONVERGED can each
  lower the CPL, and together they reach the floor, in strict mode too. Example: a `write` with
  `l0_real`, a tuple and a `BH.` pid gives 180 + 220 - 100 - 80 - 140 = 80, which rises to the floor
  of 100, so the result is PROCEED. The fix belongs in fischer-eval: raise that floor to at least 150
  for write and spawn verbs.
- **CONVERGED can lower a BLOCK.** The GLSM modifier (-200 for CONVERGED) is applied before the hard
  floors, which are all below 500. For example, a `spawn` with no halt path and no replay path drops
  from BLOCK (CPL 530) to ANALYZE (CPL 330).
- **Exact matching.** Verb, pid and `g4_state` are matched exactly (see the guard table above).

`asolaria-hookwall`'s `sign_gate::gate_envelope` verifies real Ed25519 signatures, but any
VIRUS-named envvar still rescues every deny term, so this crate does not call it. See
`../hookwall/PROVENANCE.md`.

## Commands

```
cargo +1.81.0 test --locked
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
```
