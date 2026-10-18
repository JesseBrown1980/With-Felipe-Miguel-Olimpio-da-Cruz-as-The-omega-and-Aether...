# Provenance

Every vendored file is byte-identical to its upstream source. Upstream repository:
`JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS` at commit `8712368`
(`8712368c851abe347ddf97a25bfbd96275d4316c`, "Publish Host A cross-chat handoff and
staged blinded receipt protocol").

The outward seed `matrix/PUBLIC-OWNER-3D-MEDIA-TREE.hbp` is vendored on the owner's
decision to publish it (2026-10-18); see Privacy.

`git hash-object` blob ids and SHA-256 are listed for each file. The SHA-256 column
is also the pinning in `UPSTREAM.sha256`; verify with `sha256sum -c UPSTREAM.sha256`.

The path dependency `rust_qprism_181` (package `asolaria-qprism-representation`, at
`../representation`) carries the library source `rust-qprism-181/` under its own
`UPSTREAM.sha256`; it is not re-vendored here.

## Binaries — upstream `matrix/rust-qprism-181/src/bin/`

| vendored path | upstream path | git blob id | sha256 |
|---|---|---|---|
| `src/bin/folder-calming-oils.rs` | `matrix/rust-qprism-181/src/bin/folder-calming-oils.rs` | `443f53c4086cbe649fab3a93afb775a3e647edf1` | `17f05c371b38cc31c4096b6201d0fb43b3b726683134686618d7683126403a54` |
| `src/bin/outward-truth-waves.rs` | `matrix/rust-qprism-181/src/bin/outward-truth-waves.rs` | `2f3393a9d9570d560b9eb2172318cfa8165a0eb2` | `d00df9cab63a8c918d3d80a8738f817caf0c902c816b1d4aacc33f513b4324e7` |

## Seeds — upstream `matrix/`

| vendored path | git blob id | sha256 |
|---|---|---|
| `seeds/PUBLIC-FOLDER-3D-TREE.hbp` | `672601fe1dbbe85d4dc58c05954a6e9538e5b44c` | `b8cdcc4ce89a2003cefd47d2790d69707a05c257cc0fbc8cdf2c07d3adf91e43` |
| `seeds/PUBLIC-FOLDER-3D-TREE.hbp.sha256` | `4a53190aa7dbfa6e1d31df5232e4d2c6c168a7dc` | `a5d1f9d2aa9ae8cd9c4d86894a557e791cd2f3f693e545204a9163f25f56ebda` |
| `seeds/PUBLIC-FOLDER-3D-TREE.hbi` | `5c725ba199a318930cec60c5b16e7647c942b892` | `86b924d88f5533fd207ae8137577036b1f68c688b6cb0528ba35af0f8912fb8a` |
| `seeds/PUBLIC-FOLDER-3D-TREE.hbi.sha256` | `81b1d466cc651cc9c3988249c4ae779d7ee7d8c1` | `e06c21b2fd3ca175f77b4157e1d8eb42d3cd2df8f22f80370aaa2c90aa650a20` |
| `seeds/PUBLIC-OWNER-3D-MEDIA-TREE.hbp` | `4ecd1447ead540aadad815805467561a85471295` | `6fb6df090527a2c6f422a63ccacd31168d8cf6df5aa4b5029753c34cc50d7ab4` |
| `seeds/PUBLIC-OWNER-3D-MEDIA-TREE.hbp.sha256` | `5b7c04f955d15756c0759dc84a48c7a9f6b691fc` | `71943463bdc70f4aecc492a3679db46a5ece679548e53b324beecf13c5fd6356` |
| `seeds/PUBLIC-OWNER-3D-MEDIA-TREE.hbi` | `6cb77ba43597c567086c238e14f79941f12f103f` | `7f6101ea8b8f4fe6bc2aed5e0f95878162b0554f1abdbe263e6037a7d93fedf7` |
| `seeds/PUBLIC-OWNER-3D-MEDIA-TREE.hbi.sha256` | `fac6446f02d65e5818f9b5a139687f1c45803059` | `96bbc8ae9a39557a2981c7346d2e4652f56fd3cd53302c6e4c85ca86d45b4e6a` |

The binaries read the `.hbp` seed and its `.hbp.sha256` sidecar (verified in
`lib.rs:read_verified_input`). The `.hbi`/`.hbi.sha256` sidecars are the seed's own
descriptor and are vendored with it; they are not read at run time. The vendored
`seeds/PUBLIC-OWNER-3D-MEDIA-TREE.hbp.sha256` is the sidecar the outward binary checks
the vendored seed against.

## Expected stored object sets — upstream `matrix/`

Vendored under `expected/follow/matrix/` for the referee's byte-for-byte comparison.

| vendored path | git blob id | sha256 |
|---|---|---|
| `expected/follow/matrix/PUBLIC-FOLDER-CALMING-OILS.gguf` | `fc4f66b29f3b8d8915dccbe4d8733850336cff70` | `fa266f1bf527d3757b6825d97b65653c547d8f1557a1ba516cee1598facd2bcf` |
| `expected/follow/matrix/PUBLIC-FOLDER-CALMING-OILS.gguf.sha256` | `b952e90e6bded0e7f7c0ad88ce36d41b15e8a0e2` | `02a9b94da9233b627bf35847d952ce8d7a9ba7ec0fb1e783d66fa1a825a97dc9` |
| `expected/follow/matrix/PUBLIC-FOLDER-CALMING-OILS.hbp` | `55cd73b1a8f5b2216e12c4cc0da1fcfb99c8f3c9` | `43300780cac2b85e3ed6cfa10398052f530ccbf76c43b404e650c26c9ed8b006` |
| `expected/follow/matrix/PUBLIC-FOLDER-CALMING-OILS.hbp.sha256` | `ddfe99e84651661b244d220564bddca2d97290bc` | `1d3fa0d70de86dc3c0ea3de91a9c3dfb44cfcfc4ecea7b24c2f97ed21e86553a` |
| `expected/follow/matrix/PUBLIC-FOLDER-CALMING-OILS.hbi` | `368eefae3537a9eb5bdb29924e01385aab67f330` | `9920d5cb2031d6453fba2d410e4b2f6e0136a4537fa6ea2ea9385c163503a28b` |
| `expected/follow/matrix/PUBLIC-FOLDER-CALMING-OILS.hbi.sha256` | `b9c496c0418c4e27c1bbdbb6e015f3759a51b071` | `fcb6ca449003896faaac6aedd51b3dfb0bd74a45a6fb87998a6d38f211ca1893` |
| `expected/follow/matrix/PUBLIC-FOLDER-CALMING-OILS.svg` | `12072bfe4adbe187c75e843024e6f11bd58caed2` | `feb18cc1e5034620a0ce78787df22683ccd662409df8b8af0752438c07d6a63b` |
| `expected/follow/matrix/PUBLIC-FOLDER-CALMING-OILS.svg.sha256` | `3002bf73f8496c0547e35ef2aebf2098c2d56dfc` | `9fbb8a0a8b49c6f057dd79156ccf8723487ed77cc58299032addbf37b19cbf73` |
| `expected/follow/matrix/PUBLIC-OUTWARD-TRUTH-WAVES.gguf` | `2c4d66b4b6e61e84eb1fce300f5a9b0830c94930` | `b315be52a4a6870d2eb15f44736dd29e30685bea6b0b16936e16abc9a809e9f6` |
| `expected/follow/matrix/PUBLIC-OUTWARD-TRUTH-WAVES.gguf.sha256` | `2640e03420049a0b493c9a0935497e77050b074c` | `8147fcdc347a3186499a3c779108f522b1d3f4d8384b67fee41344b26b909395` |
| `expected/follow/matrix/PUBLIC-OUTWARD-TRUTH-WAVES.hbp` | `6ba378b9d9aebb72b99f37efdd303e9433fe5275` | `a0a0d0ab471e337edc7942ca42b4fb5c9e6f05060635e3b1ed6c94c1dad03472` |
| `expected/follow/matrix/PUBLIC-OUTWARD-TRUTH-WAVES.hbp.sha256` | `7e27273341cdb888e703512ac2aeff6c4bc2035c` | `4b69c7e621d1270435c8da4426b23c4e69e5780a8372dac31f1318981e1e6ece` |
| `expected/follow/matrix/PUBLIC-OUTWARD-TRUTH-WAVES.hbi` | `ab54e0b53543e79cd7b9e0113b7a3b9251e87138` | `81ad88a2e3a64e55accce6a886975eca08c8eff83f65fb25b7c30c07aa765e99` |
| `expected/follow/matrix/PUBLIC-OUTWARD-TRUTH-WAVES.hbi.sha256` | `0393e5c931c7dbcf631ee1e0e5138294876e8116` | `c83ceb699c70a0a553062a97cb51be13f62c7c3195fd1d0b7f0498f696e3da0c` |
| `expected/follow/matrix/PUBLIC-OUTWARD-TRUTH-WAVES.svg` | `7fdd58ec6ec7993b7a1a045a519c693f61400229` | `b6ad987e4a4b503aef4d1a42eeb662e7e803e6195494ea4704e58267796246aa` |
| `expected/follow/matrix/PUBLIC-OUTWARD-TRUTH-WAVES.svg.sha256` | `81e5ed87dd9bef8910493d96475f939d9c21017c` | `5e2effcaa64a305a76a9965c63b24f01ae521612a9e5f36689b157ce5b657871` |

The two `.gguf` files are byte-identical to the in-repo copies the referee also
cross-checks at `../../gguf/follow/matrix/`.

## Privacy

Every upstream file listed above was scanned for emails, phone numbers, private LAN
addresses (10/8, 172.16/12, 192.168/16), private-key markers and personal names of
people other than the owner. The seeds declare `surface=PUBLIC_API_SUBSET` /
`MEASURED_GITHUB_PUBLIC`, `private_keys=0`, `credentials_in_output=0`,
`blob_bodies_read=0`, `public_metadata_only=1`. `owner=JesseBrown1980` is the owner,
not a third party.

- No file carries an email, phone number, private LAN address or private-key marker.
- `matrix/PUBLIC-OWNER-3D-MEDIA-TREE.hbp` (the outward seed) carries the owner's 147
  public repository names, one per `REPO|i=…|name=…` row. Fourteen of those names
  (rows i=14, 15, 17, 18, 19, 53, 83, 84, 101, 133, 134, 144, 145, 146) contain
  personal names of people other than the owner. The 147 names are already public on
  the owner's GitHub account. The seed is vendored to `seeds/` and the referee runs on
  it by default.
- The seed cannot be redacted and still run. Its `HASH` row commits to the raw `REPO`
  rows (`outward.rs:560-582`), and the binary requires the byte-exact `.hbp.sha256`
  sidecar (`lib.rs:714-723`).
- Owner decision, 2026-10-18 — Q "The outward seed PUBLIC-OWNER-3D-MEDIA-TREE.hbp lists
  the owner's 147 public GitHub repo names, 14 of which contain other people's names;
  they are already public on the owner's GitHub": answer "Publish the seed". The seed is
  therefore copied to `seeds/`, pinned in `UPSTREAM.sha256`, and the referee case
  `regenerates_outward_object_set_byte_exact` runs by default.
- None of the 147 names occurs in any pinned file other than the outward seed itself:
  measured 2026-10-18, 0 hits in each of the other 25 files with
  `grep -a -F -f <name list>`, including the outward seed's `.hbi` descriptor and all 16
  expected outputs; the outward seed carries all 147. The upstream repository's own name,
  `FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS`, is one of the 147. It appears as the source
  reference in `Cargo.toml`, this file, `README.md` and `tests/referee.rs`.
