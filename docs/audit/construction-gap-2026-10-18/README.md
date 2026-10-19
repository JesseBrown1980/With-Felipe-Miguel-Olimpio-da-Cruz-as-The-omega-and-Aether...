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
  first commit's 89 files, and the keys committed in the public history), 12 corrections, and a
  16-step build order, beginning first.

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
| 15a | aether's own SHA-256 is shadowcat's `sha256.rs` | Done, after digest parity | `shadowcat/parity/` (`171a461`) |
| 15b | Benched GNNs L1, L2, L4 wired through the one hookwall | Done: connected, observed, non-voting; `asolaria watch` recomputes the chain in a separate process | `gate/observed/` (`ad9b22a`) |
| 15c | Vault-reader re-run over every vendored repo | **Running.** 58 repositories at their vendored commits: 1,102,126 objects, 1,101,801 verified, 24 failed, 301 unresolved, and the Rust reader equals the Python referee on all 61 rows. A second pass over the other 386 pinned commits is still running. | to be committed under `hbp/vault-reader/` |

The audit trail is followed to its end in the sense the owner asked: every step that can be done
from public bytes is done or running. What remains open needs the owner or ACER: step 0's
rotation, and step 14's closers (their find commands are in `docs/handoffs/ACER-REGENERATE-HANDOFF.md`).
