# Construction gap map (2026-10-18)

The owner asked what aether is missing from the construction, beginning first, now that
`JesseBrown1980/Asolaria` and the rest of the estate are public: "That now public repo has the keys
to everything in it ... You can't have the end without the beginning."

`construction-gap.json` is the map, read-only over the public Asolaria repository (all 132 refs,
364 commits, 12,213 distinct blobs) and the estate repositories:

- `maps[]`: one map per subsystem (trained GNNs and FNNs; hookwalls, layers and GAC; the 60D chain;
  rainbow and the full Monty; shadow cats; Q-PRISM and the quant-down; vaults and keys), 179 items,
  each with what it is, where it is (repo @ commit : path, blob, bytes), its beginning date, its
  status in aether and what to bring in. Status counts: 28 in aether byte-identical, 13 ported,
  43 partial, 95 missing.
- `critic`: 22 items the maps missed (among them the release snapshots of 2026-02-19 to 03-13, the
  first commit's 89 files, and the keys committed in the public history), 12 corrections, a
  16-step build order (beginning first), `notes`, and `unimplemented_stub_bodies` (added 2026-11-08
  at aether `7c4711f`). That block records the 8 function stub bodies that return `Unimplemented` in
  three files aether vendors byte-identical from the owner's `asolaria-federation-1024` @ `dc1da1a9`
  (`gnn`, `envelope`, `cosign-ledger`; pinned at `kernel/lane/UPSTREAM.sha256:6,8` and
  `ledger/cosign-council/UPSTREAM.sha256:1`), so none of them is aether-written code; the 6 plan-listed
  lines that are not stub bodies are recorded alongside. MEASURED at `7c4711f`.

At the time of the map aether held 67 of the 12,213 blobs and none of the first commit's 89 files.
Step 0 of the build order is the owner's: rotate the private keys and token committed in the public
repository's history (an ed25519 supervisor key, an SSH key, the Bearer token in
`gates/hookwall-v2.js`, and the vault files); aether records only their blob ids and never copies them.

## Where the build order stands (2026-10-19)

| Step | What | Status | Where |
|---|---|---|---|
| 0 | Rotate the keys and token committed in public history | **Owner's to do.** aether holds only their blob ids, in the `HELD.hbp` of the steps that met them. | `beginning/*/HELD.hbp` |
| 1–4, 4b | Healthcare origin, release snapshots, GNN design seed, the build day | Vendored byte-identical | `beginning/01`–`04b` (`4a7fa20`, `9201291`, `5e096d3`) |
| 5–8 | Index language, verbs and cubes, glyphs and cosign, GAC/GULP/HG256 | Vendored byte-identical | `beginning/05`–`08` (`5e096d3`) |
| 9–13 | Federation kernel, quant and PID office, laws and Q-PRISM, shadow cats, RAINBOR to the matrix | Vendored byte-identical | `beginning/09`–`13` (`ba1ffe1`) |
| 14 | Regeneration closers | **Open.** One closer found in part (Liris's callings return, which pins both inputs). The rest are not in any public history, local store or the owner's phone photos; each has an acceptance test. | `beginning/14-regeneration-closers-2026-10/` (`a0c0ad4`) |
| 15a | The **9** SHA-256 copies written for aether (`shadowcat/parity/README.md:6`) and shadowcat's `sha256.rs`: 7 now reuse it as adapters (`171a461`); 2 stay as they are, `aether-universe` (ACER's game crate) and `codec/dbbh-dbwh` (whose SHA-256 block is marked vendored) (`shadowcat/parity/README.md:41-48`). The owner's other SHA-256 code stays vendored, and the crates that declare the `sha2` crate (39 `Cargo.toml` files, 30 of them with no `vendor/` directory in their path, one of which, `loop/vendor-pid-mod`, is itself a byte-identical vendor) are unchanged by `171a461`. MEASURED at `7c4711f`. (Row revised 2026-11-08.) | Done, after digest parity: the receipt `SHA256-PARITY-2026-10-19.hbp` was run at `fcddaf9`, the parent of the switch commit `171a461` (`compared=9`, 23,486 inputs per implementation, 0 mismatches, `verdict=EQUAL`). **No CI job runs `shadowcat/parity`**: `.github/workflows/gate.yml` is the only workflow and names no `shadowcat` path, and `run.sh` runs only at the receipt's commit (`shadowcat/parity/README.md:14-15`). MEASURED at `7c4711f`. | `shadowcat/parity/` (`171a461`) |
| 15b | Benched GNNs L1, L2, L4 wired through the one hookwall | Done: connected, observed, non-voting; `asolaria watch` recomputes the chain in a separate process | `gate/observed/` (`ad9b22a`) |
| 15c | Vault-reader re-run over every vendored repo | Done. 58 repositories at their vendored commits and the 386 commits aether pins: 455 rows, 7,912,614 objects, 7,901,266 verified, 2,615 failed, 8,733 unresolved, every non-verified pinned object explained by a cause note, and the Rust reader equals the Python referee on all 455 rows. Audited 2026-11-06. | `hbp/vault-reader/corpus/rerun-2026-10-19/` |

The audit trail is followed to its end in the sense the owner asked: every step that can be done
from public bytes is done. What remains open needs the owner or ACER: step 0's
rotation, and step 14's closers (their find commands are in `docs/handoffs/ACER-REGENERATE-HANDOFF.md`).
