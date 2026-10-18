# planes/gnn-trio provenance

This crate is the **public runnable build** of the G-plane trio. It is not a byte copy of the
operator's private `gnn-reverse-gain.mjs` (sha256
`0e381f92fe591d09be3337e1576f404e971c7d2ef75b958538bfa70a7672ede3`) and does not claim to be. That
file, and the per-adversary identifier set inside it, stay local under OWNER-RULES 7j. The G3
algorithm here is reimplemented from the mechanism that is already public in
`docs/security/REVERSE-GAIN-SELF-ECHO.md` and OWNER-RULES 7j; the set it tests against is a shipped
synthetic demo set, overridable at runtime, never the operator's real set.

License: `MIT OR Apache-2.0`, `publish = false` until the crates.io pass. The crate vendors the
owner's revolver-10k source bytes, which carry no license file of their own. The owner's grant of
2026-10-18: everything here was made by the owner or by Asolaria in Asolaria's white rooms, and
anything listed under any license is free and public to everyone. Until then this crate was marked
`UNLICENSED` under OWNER-RULES 7h; that marking is withdrawn.

## Vendored upstream bytes (`vendor/`, pinned in `UPSTREAM.sha256`)

These four files arrived clean on 2026-10-18 (OWNER-RULES 7j) and are vendored byte-for-byte as the
operator's float / Node lane. They run only when the external HyperBEHCS engine and the BEHCS-1024
alphabet file are present; this crate does not require them to build or to run the Rust surface.

| vendored path | origin | git blob | sha256 |
|---|---|---|---|
| vendor/revolver-10k/src/omniquant.mjs | revolver-10k/src/omniquant.mjs | 5852c36b83eed7460912759aa501d001c49a06c2 | cb8bbb54321e45329c0cb740097c1bf3eb3f32fd966e6e8fc610407947791609 |
| vendor/revolver-10k/src/quant-bus.mjs | revolver-10k/src/quant-bus.mjs | c420b046d046f335f2ee2cf38fa6697add39ff13 | f39b3efe4c73ea8b8cf9ec863d609a4734727e44d6743ca7b578a92080196424 |
| vendor/revolver-10k/src/bpi-codec.mjs | revolver-10k/src/bpi-codec.mjs | a42fb071c1cc1c49e1ad2b8dfda94c28fec47e6e | 5021f26780f8e1f69e58b5d03c9b914c1e3fbe8477dca09da7e4f2fcd612137d |
| vendor/tools/graphify.py | tools/graphify.py | e61dae794284a139ead1a819a91da32d7a672a50 | 20d0099e4c532e0546e10fb132cd5489a6a508a4825b3fc27ed16ae6b1b66805 |

Git blob ids are `git hash-object` of the vendored bytes; the four files were delivered as an extract,
not from a committed ref, so no upstream commit is recorded.

## Privacy scan of the vendored bytes

Each file was read in full. No credentials and no third-party private data are present.

- **omniquant.mjs** — only the operator-local path `C:/HyperBEHCS/lib/hyperbehcs-core.cjs` (override
  `HYPERBEHCS_CORE`) and the JL seed `revolver-10k`.
- **quant-bus.mjs** — `AUTHORITY_FIELDS` carries the operator role tokens `op_jesse` and `op_rayssa`,
  authorized to publish as written under OWNER-RULES 5/37 (valid to 2027-10-18), and the fixed slot
  label `connor` (the fictional persona of OWNER-RULES 7j, a slot name, not contact data). The
  remaining slots are component names (`shannon`, `hermes`, `artemis`, …).
- **bpi-codec.mjs** — only the operator-local paths `C:/asolaria-acer/.../alphabet-1024.json`
  (override `BEHCS_ALPHABET`) and `D:/hyperbehcs-hermes-upstream`.
- **graphify.py** — a static 60D graph generator with a built-in PII scrub gate (drops
  IP / serial / SSID / personal markers). The operator names appear only inside that scrub regex, to
  remove their data, not to publish it. It opens no socket; it is not the ":4815 server" named
  elsewhere, it writes a static HTML+JSON viewer.

The operator's seven private mask identifiers appear in none of these files; they exist only in the
held private `gnn-reverse-gain.mjs`, which is not vendored, copied, ported, or quoted here.

## Ported to integer Rust (with the referee that proves equality)

Integer arithmetic only in what this crate writes (OWNER-RULES 4). JavaScript numbers are held
exactly as `asolaria-g-planes::JsNumber` / `asolaria-l0-edge::jsnum::Dbl`; no float type is used.
`tools/referee.py` is an independent stdlib mirror (integer arithmetic for the binary64 encoding,
hashlib for SHA-256) over synthetic inputs; `tests/referee.rs` replays its fixture
(`tests/fixtures/gnn-trio-referee.hbp`) through the Rust port.

| Rust | upstream | referee |
|---|---|---|
| `reverse_gain`, `mine_reverse_gain`, `State`, `self_test` (src/reverse_gain.rs) | gnn-reverse-gain.mjs mechanism: `score = sign * jlMagnitude`, `sign = MASK_GLYPHS.has(glyph) ? -1 : +1`, module state, `selfTest`, `wire` payload | RVGN rows: sign flip over synthetic glyphs + supplied magnitudes |
| `omniquant::vector_from_envelope` | omniquant.mjs:24-26 `vectorFromEnvelope` | VEC rows |
| `quant_bus::authority_quant`, `AUTHORITY_FIELDS`, `empty_authority` | quant-bus.mjs:24-111 `AUTHORITY_FIELDS` / `authorityQuant` | AUTH rows |
| `bpi_codec::encode_frame`, `decode_frame` | bpi-codec.mjs:88-119 `escape` / `encodeFrame` / `decodeFrame` | FRAME rows |
| `sha256` (one-shot) | `bpi-codec` frame tail; a standalone impl carried in-crate per OWNER-RULES 7g | FIPS 180-4 known-answer vectors |

The G1/G2/G4 argument-only cores (`transition`, `popcount_bits`, `hex_hamming`, `score_envelope`,
`path_pid`) are already ported in `model/g-planes` and re-exported here; they are not re-ported.

The Node lane cannot drive the referee: omniquant needs the external HyperBEHCS engine, quant-bus
imports it, and bpi-codec reads the BEHCS-1024 alphabet file at import. The independent oracle is
therefore the integer Python mirror.

## Not ported (vendor-only), with why

- **`omniquant` quant projections** (`quantMetadata` triple/polar/turbo/jl, `packQuantPacket`,
  `quantTag`) — the quant and the JL projection run in the external HyperBEHCS engine. The JL
  magnitude the G3 plane signs is produced only there; it is never fabricated. When the engine is
  absent the magnitude input is absent, so the Rust plane takes it as a supplied argument.
- **`quant-bus` quant tails** (`polar_quant` / `turbo_quant` / `js_quant` / `triple_quant`,
  `evidence_quant`) — depend on the engine's quant codes.
- **`bpi-codec` glyph layer** (`encodeGlyph`, `decodeGlyph`, `hilbertAddress`, `pidChamber`,
  `encodeHbpv1Row`, `verifyHbpv1Row`) — need the BEHCS-1024 alphabet file at runtime.
- **`graphify.py`** — a standalone static-graph generator, not part of the scoring path; vendored
  as a tool.

## The mask set: synthetic default and the OWNER-RULES 7j reconciliation

OWNER-RULES 7j keeps the per-adversary set operator-supplied at runtime with an **empty default**.
The 2026-10-18 goal and the relayed user request ask for a build that runs out of the box. This crate
satisfies both: it ships a **synthetic demo set** (`data/example-mask-glyphs.txt`, git blob
`51143c90462abc98f3edd1c651eabc88d24f17d1`) as the runnable default, overridable at runtime via the
`GNN_REVERSE_MASK_SET` environment variable, and it also exposes `MaskSet::empty()` for the literal
7j empty default. The synthetic set grants no capability and is obviously fake (opaque tokens; RFC
2606 `example.com` emails; NANP fictional `555-0100..555-0199` phones); the operator's real set still
ships empty. The example never prints a loaded set's contents, only its source and size, so pointing
it at a real set stays safe.

## The live `:4949` absence

The `:4949 /api/gnn/score` handler exists nowhere on disk or in the mirror (confirmed against
`model/g-planes/PROVENANCE.md`). Against the on-disk system, `asolaria-score.mjs` resolves g1..g4 to
null and `g4_state` to null. This crate reproduces that absence rather than substituting values:
`quant_bus::GnnTrioFields::default_closed` returns four empty strings, and the crate fabricates no
g1..g4. The runnable surface is the direct `reverse_gain` / self-test path, not the live request path.
