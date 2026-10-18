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
The build order is being carried out in `beginning/` (steps 1 to 4 so far). Step 0 of the build
order is the owner's: rotate the private keys and token committed in the public repository's
history (an ed25519 supervisor key, an SSH key, the Bearer token in `gates/hookwall-v2.js`, and the
vault files); aether records only their blob ids and never copies them.
