# hbp/vault-reader — provenance

Every rule the reader applies is taken from public owner code or from the row forms of the
public corpus; each is listed here with the line it reproduces. Nothing here was invented as
behaviour of the owner's system: where the public code states no rule, the reader does not
check (README "Not checked").

## Code reused (dependency, not copied)

| crate | path | what is used |
|---|---|---|
| asolaria-hbi-hbp @ dca3f45 (vendored, aether `hbp/vendor/asolaria-hbi-hbp`) | `src/lib.rs` blob 907bec401f17875a3352f6ce5368ce3389590729, sha256 d0354ccc84b5b66f1df2637b27ed75ec5bea475a1c0d000869fd37987386164a | `sha256_hex`, `agt` (107-111), `encode_row`/`parse_row` (117-187), `IdxPointer` (194-210), `ReceiptChain`/`verify_chain` (217-272) |
| aether `hbp` (Rust port of bigpickle-rebuild `hbp-reader.mjs:118-156`, `hbp-emitter.mjs:28-111`) @ 85faeb1 | `src/reader.rs` blob ee13613f7bd936d06536ce223cc3f57702e8e43f, sha256 eaa3b510ace02f617df4e89282b702d629db5e42fff6d1b9015cf28c7b19ed50 (pinned in `DEPENDS.sha256`, checked by `tests/fixtures.rs` and `sha256sum -c DEPENDS.sha256`) | `verify_hbp` 204-271 with `js_is_space` 16-31, `read_sidecar` 155-161, `node_hex_decode` 172-185, `regex_capture_after` 187-202 (trinity; the referee mirrors these lines one by one); `write_hbp` (fixtures only) |

## Lines copied

`src/sha.rs` carries the vendored SHA-256 constants, initial state, schedule, rounds, padding
and hex rendering (`asolaria-hbi-hbp src/lib.rs:14-23, 27-30, 31-37, 40-86, 96-104`) in
block-by-block form, because the vendored `sha256(&[u8])` copies its whole input into one `Vec`
and exposes no per-block call. `tests/sha.rs` checks it against the vendored `sha256_hex` for
lengths 0-300 under seven chunkings and for 1 MiB.

## Rules reproduced (cold-lane sources, pinned)

| repo @ commit | path | git blob | sha256 | lines → rule |
|---|---|---|---|---|
| JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS @ 8712368 | tests/verify_public_repo.py | 1715b89917a16c801d7e6da27b47ef464d709aab | d1be6b56f5ea46b777e161521910eccc6a3a9f51814b1b67131ef38449ea0368 | 360-374 strict tuple fields; 377-401 footer `body_sha256`/`rows`; 385-386 LF-only bytes; 458-466 `strict_uint`, sha256 shape; 526-530 exact sidecar; 1522-1533 `hbp_file/hbp_bytes/hbp_sha256/hbp_rows` (`hbp_file=hbp_path.name`: a path in the `.hbi` directory); 1790-1799 CENTER hbi = hbp; 1943-1946 `hbp_path/hbi_path` sha256 (`ROOT / ...`: a path from the root); 1948-1969 `SHA256_UTF8_DOMAIN_NUL_MEMBER_V1`; 3938, 3968 `read_text(encoding="utf-8").strip().split()` (Python's whitespace set, `src/text.rs` `py_fields`); 3961-3978 named sidecar rule |
| same | matrix/collect_public_folder_inventory.py | 1afa18937ce70cbff97813ea39e6bcdc4d19f1e1 | d9bff08c69c7e31a58eabc1bb7ea8ae08bcbdcc0bc1ac8dcb3c991e01c02f08a | 1090-1093 footer with extra keys (`FOLDER3DFTR`); 1109, 1132 `FOLDER3DHBI` writer |
| same | matrix/collect_public_owner_inventory.py | 390bd70a043dc2a7fcc0cce7d142b08886562584 | 08d9fc021478fa75bd39addedc6e348f2f183681066c02a35998377247bf4589 | 454-467 `OWNER3DHBI` writer |
| same | matrix/rust-qprism-181/src/folders.rs | 37d367b63a607b5799ff88921b593751ad55c28f | c30d8d20599a94fca43181fb0c4b633a010468cf2439a852c437f4fa4ba12a79 | 1725, 1754 `FOLDEROILIDX` writer; 906-920 footer reader |
| same | matrix/rust-qprism-181/src/outward.rs | f0310c0d7cc13acc481eaf6d487ff23298ef2e77 | 21a53a295bb32d3d2a4cada1713ebe8c03eadefd19ec4da1ab7b95a8ca69611b | 1427, 1460 `OUTWARDIDX` writer |
| same | matrix/timed_chiral_gguf_monitor.py | e091bf8dbeb80e270f13136fad14bfa8a4247d5d | 8d7ef8ec50e9e451350110c594e532c07a06ce0d4e3d145efdc1eb628ef5fec3 | 323-325 `HBI\|hbp_file=\|gguf_file=` writer |
| same | matrix/finalize_timed_86400_flowes_x3x3.py | af1c4aface5b0760b0e304e7d8b6209f338f7283 | 5f913ffb3174cb0c1674269330c7e127ae00b42149cfd7f7f52f16c8eb2625a8 | 566-599 `FLOWEX9FINALIDX` writer |
| JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills @ 3f9f42d | constellation/absorb_all.py | e48961efe02ac8e8f714672ff98936bc4cb38047 | 59891f90ec36a13d5b0168d1265d9045216e925b5b282439f386a34aece0d218 | 194-196 `FTR\|receipt=sha256(body)[:32]\|rows=` |
| same | constellation/quality_sphere_16k.py | 1a1552759adf42476104ff7b21ba8d8711fa4ab7 | 624bcac8de6fb3764465f707ed19665ea6656bda884f4333a33cfadb7d93879c | 449-451 same footer; 52 binary `.hbi` seed reader |
| same | constellation/three_body_collider.py | 4113f7379208bc8cc396f13c44fbc56c901c170d | 08acbbb78c7095fc5d478d26ac567d5dbc24468316b99c8db36ae52b10d472f0 | 181-183 same footer |
| JesseBrown1980/asolaria-office-service @ 205253b | fable5-office-render/bigpickle-map-and-ramp.py | 6f88d3832ed2e01044322d2477ccf339cbfd131e | b3f83dbcd4ab596688b92f44115229a920af0affcc9648c719628c14a282b76e | 3 `sha16`, 8-9 seed and `pid[n]=sha16(pid[n-1]\|name)`, 13-17 `EMIT` rows, 57-60 `.hbi`/sidecar writes |
| JesseBrown1980/bigpickle-rebuild @ c592599 | src/hbp-reader.mjs | 27bf471ae6576f91d407baca0fff6d8d56661610 | 8af1efac0be712a7dfb13ba2668ba8033b0bed630f6ab8020e537f117ed16949 | 118-156 `verifyHBP` (via aether `hbp`) |
| same | src/hbp-emitter.mjs | f5a8e3daea7770dd72bccdf1f15e39b127f81dfb | 66766a5f944e1c25831244949e4e4d1340427520225705c3d7901229f7a4540d | 65-111 `writeHBP`, 83 sidecar form |

Rules added for row forms that the owner's newer public repositories and writers carry
(none occurs in the three-tree corpus, whose results are unchanged by them):

| repo @ commit | path | git blob | sha256 | lines → rule |
|---|---|---|---|---|
| JesseBrown1980/asolaria-omega-omnibit-tournament @ dad4647 | scripts/verify_receipt_privacy.py | 17f6437c0857afa28fcae789f8882f23607bbe87 | c551415a186f5ddb6f76ed40fd5dd13f274184b13e14ad7f1ea0663c0ba4c804 | 35-44 sidecar name with leading `*` stripped; 73-117 `HBIROW\|row=\|off=\|len=\|sha256=[\|hex=]` into the paired `.hbp`, row sequence, contiguous offsets, full coverage, `hex` = `chunk.hex()` |
| same | tools/movable-flashlight/hbp.py | f13a311c09de337e4ff82721759f6ee3b1c6b750 | 937335c6dc49b775646f05742081175b318cc6512f3667f727a0bc7fe8e9a00f | 29-50 `tuple_value`/`hbp_row`; 91-135 `write_hbp_hbi` (`HBIHDR`/`HBIROW\|offset=`/`HBIFTR`); 139-163 `verify_hbi` |
| JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS @ 8712368 | tournament/public-dependencies/gitram/pais_path3_bridge.rs | 578ef29f9b31efd5c6ae5e8588007971af195d64 | 55b10a07a4c8a7278cd4a95883216da6153c9d416acbd94c0a3dfa81e88ab813 | 97-104 `hex`/`sha_hex`; 674-677 `hbi_for` (`HBI\|row=\|sha256=\|hex=`); 749-753 written next to the `.hbp` |
| JesseBrown1980/asolaria-rotating-lighthouse-2026-10-09 @ 7b98416 | viewer/github3d.rs | 92f82521686b0e64c7b7328d9c108a03ecdd50f8 | 7189fb73a3a6eea373379c1be6f72bbc2956d02fe732b9228e35c895ea81c31e | 149-155 `hex`; 427-437 `hbp_row`; 444-458 the same hex-row `.hbi` |
| JesseBrown1980/asolaria-stone-to-moss @ f032bc0 | tools/seal_quantum_gravity_81.py | f02ad01e1a33b31061787423a1a286858748aed0 | 22c9072eafd7ba9ce1a7df780c2188eae57e62dee1700db6c4fcf39757308d7b | 89-97 `ARTIFACT\|name=\|sha256=` (`name` a file in the `.hbi` directory) |
| same | experiments/integration/seat1/upstream_bridge.py | 41b12a8a58e64cdf20e9d0fa8029d6e0af940afc | c4e2ee1fd55aef3886f96bad0955488476035cf0933dbeb4837e77853c775a81 | 338-348 same form |
| same | experiments/seat1/recurrence/seat1_recurrence_72.py | 25f26c0cc46cf58636324b1a4a3b1313c3b85063 | fe6ff926f4a66857883c7862b962f4a5b421cb2bfc7d8cf9ca6932d509aa2de6 | 262-268 same form |
| same | experiments/seat3/verify_lightbank_memory.py | 66343927d4bc7fbeeefa2de74d2af28c78f22a5f | 09a6cd47af8333eccec1a3e722e8df3f0ba247a25f05d8d1665ea359fae78ed3 | 75-85 `X.hbi` `HBP\|bytes=\|sha256=` = `X.hbp`, `JSON\|..` = `X.json` |
| same | experiments/seat3/verify_opto_toy.py | 94309f90ee1979efe76548d8b28831ab9552170e | cc6cc2abf8b32761be23ad2714cfc89a316e4f65aca091f1ca98bd59db864320 | 54-65 same |
| same | experiments/seat3/verify_autonomous_universe.py | e384dc5807d5bd32d4ee29fad126be106d5fddcf | e5b0679e4c5c65c815091c828e7a3b02e7a51ee65b01f6fcc54410c6c84ca03e | 48-59 same |
| same | experiments/seat3/verify_room03_fourstate.py | c83b8f13332bf8f82135c9f41ac44fb9bb97600d | f5f21925d976a9ac6ff3c214a93300cc052ffd262350fd6fbd340f6baf7e2a1d | 110-121 same |
| same | experiments/seat3/rainbow27_v2/rainbow27_v2.py | 097c2d93cc6cfeb6f03a2df75d9529b267dadc44 | 92e7ffa50a9258b86fc15891609a73e90b45e7c3632b2a2f465c2f31f72254d0 | 149-179 same |

Where the reader's -1/0 rule needs a length (a declared `bytes=` longer than the file, or an
index whose extent passes the end of the `.hbp`), the result is 0 with `bytes_short`, as for
the existing whole-file rule (`presence_of`).

## Claude's choices (no upstream line states them)

These are the reader's own rules, labelled so they are not read as the owner's:

- Path resolution, after the `.hbi` directory and the root (the two public conventions above):
  each directory between them, nearest first, so paths written from a repository root that sits
  below `<root>` resolve (a vault holding several trees; `tests/fixtures/tamper` uses it).
- The trit semantics (`+1`/`0`/`-1`) and its reason tokens, including: a byte range or index
  extent that runs past the end of its target reads 0 even when the present bytes check equal;
  "zero-filled" means every byte of the target or range is `0x00` (a partly zero-filled target is
  read as content).
- File names keyed by their bytes (`OsStr::as_encoded_bytes`; UTF-8 as written with `\` doubled,
  other bytes as `\xHH`), so names that are not UTF-8 stay distinct.
- The trinity check runs on walked files only (`sidecar_not_walked` when `X.sha256`/`X.hex`
  exists but is not a walked file, `hbp_absent` when `X.hbp` is not), and its `.hbi`
  comparison counts only when `X.hbi` starts `!HBI-v0` or carries `sha256=`+hex or
  `bytes=`+digit (`trinity_hbi_not_declared` otherwise). `verifyHBP` itself compares every
  `X.hbi`; this choice keeps a `.hbi` of another format that declares nothing from reading `-1`.
- `tests/cases/CASES.hbp` (written by `tests/common/gen.rs` `cases_spec`): edge cases of these
  rules and of the `verify_hbp` port, with no owner data; both readers build the trees from it.

## Writer evidence (`corpus/WRITERS.hbp`)

Six corpus `.hbi` files were regenerated byte for byte by running the public writer with
Python `-I` from the scratchpad, output kept in memory. Importing the modules wrote
`__pycache__/*.pyc` into FOLLOW `matrix/` and omnibit `tools/movable-flashlight/`; those two
directories were removed and both trees read 0 entries in `git status --short --ignored`
afterwards (later runs use `-B`):
`bigpickle-map-and-ramp.py` lines 1-56 (its file writes start at 57) give the simulator's
`FABLE5-BIGPICKLE-MAP-2026-07-04.hbp` (3,424 bytes) and `.hbi` (1,382 bytes);
`timed_chiral_gguf_monitor.pointer_hbi(hbp, sha256(gguf))` (blob e091bf8d…) gives both FOLLOW
`TIMED-CHIRAL-MONITOR.hbi`; `collect_public_owner_inventory.build_hbi` at 8712368 (blob
390bd70a…) gives `PUBLIC-OWNER-3D-MEDIA-TREE.hbi` and at 22c7596 (blob
9aff19e0c73102c6022f0bd07e441836252a6fb0, sha256
a59e6edc9935edb86e7b80ac5b0337b745f9fce288ede3e3717b6ae061e4f82d) gives
`PUBLIC-OWNER-3D-TREE.hbi`; `collect_public_folder_inventory.build_hbi` gives
`PUBLIC-FOLDER-3D-TREE.hbi`. For the last three, values the writer takes from a GitHub
inventory (object root, repository and folder counts, public-set and capture digests) were read
from the `.hbi`'s own rows; the `.hbp` digest and length were measured. The movable-flashlight
port in `tests/common/gen.rs` equals the owner's `write_hbp_hbi` output on the fixture rows (4/4
files). Pickaxe searches over the full history of the three trees (all refs, code files) found
no writer of `HBISTREAM|`, `HBIHDR|`, `FABLE5HBIROW`, `RGBINDEXHDR`, `RIMELIGHTINDEXHDR`,
`byte_end_exclusive`, `WPCORPUSPOST`, `INDEXROW` or `D22ADAPTERINDEX`, and none of
`GRADIENTAUDITIDX|`, `QPRISMONDEMANDIDX|`, `SNOWSELECTORIDX|` in FOLLOW; `FLOWEX9RUNHBI` occurs
only in the reader added by f671193.

Cited, not used by the reader (no row form binds them; README "Not checked"):
Q-PRISM @ b4a21a2 `qprism/cube_absorb.py` (blob 542d6573134911ce41a43613e6c027ce906362fe,
sha256 00674cbf66abf246b2bdf2cc55f15ef08c2a7b5c03579b0c2792fb3fa019b5a9) lines 118-149
(`transcode_256_to_1024`, `transcode_1024_to_256`, `roundtrip_proof`); HYPER-BECHS--the-third-set
@ 83a8a1e `third-seat-2026-07-12/gpt-crosscheck/behcs_ladder_framed_v1.py` (blob
4c450ed0ecf7d0adf335b1e077f3123138aa8cc0, sha256
a1eebd651c85502785e6c8043662fe5e8becb47415a0dd24294d645488fd3266) line 56 (`BEHCS_FRAMED` print row);
ASOLARIA-AS-NEURAL-NETWORK @ 4cc7624 `tools/behcs/github-pid-register.mjs` (blob
a2beaf697c3c89565feb49b17c3b74ac46a62507, sha256
49b1da933edad721c18c43ab433ea78ab0f1a5a9ee3eb9e75ae51b08af059ddf) lines 42-62 (`mintPid`,
`glyph_1024 = u32(sha256(NAME)[0:8]) % 1024`) and 84 (`PIDDIV` row writer): measured against the
23 rows that declare a glyph index (README "Not checked"); none of them is in an `.hbi` row.

## Fixtures

`tests/fixtures/public-follow`, `public-simulator`, `public-annn`: 62 files copied byte-identical
from the three public repositories; `public-colour` (asolaria-matrix-in-colour @ 7035def, hex
rows), `public-omnibit` (asolaria-omega-omnibit-tournament @ dad4647, `HBIROW` rows and `*`
sidecars) and `public-stone` (asolaria-stone-to-moss @ f032bc0, `ARTIFACT|name=`): 14 more.
Every file's git blob id equals upstream's (`FIXTURES-PROVENANCE.hbp`, one `FIXTURE` row per
file; `sha256sum -c UPSTREAM.sha256` = 76 OK).
`tests/fixtures/codec` and `tests/fixtures/tamper` are written by `tests/common/gen.rs` (the owner's
`write_hbp`, `ReceiptChain`, `IdxPointer`, `agt`; copies of public fixtures with one stated change
each) and are checked to regenerate byte for byte by `tests/fixtures.rs`.

## Privacy

Every copied file was read in full before copying (the binary `FABLE5-SELF-SEED-3078.hbi` was
scanned with `strings`; no readable text). Searched for e-mail addresses, LAN addresses, drive
paths, key blocks, serial numbers and personal names. Not copied, by reason: a simulator receipt
whose rows carry a personal name (`LIRIS-ACER-RIME-RELATION-LAWS-54-58`), kernel receipts that
carry local machine paths (`FABLE5-ACER-MAIN-CANON-KERNEL-REVERIFIED`, `matrices/FABLE5-SELF-SEED-3078.hbp`),
and the SOVLINUX scan receipts (device serials and a personal folder name). The `receipts/` copy
of the binary seed `.hbi` (no paired `.hbp`) was used instead. The 14 newer fixtures were read
in full (their `.hbi` rows are hex of the `.hbp` rows that were read) and scanned for e-mail
addresses, LAN addresses, drive paths and key blocks: none; the names in them are the owner's
handle (`OP-JESSE`) and machine seat names. The private mirror
(`scratchpad/asolaria-mirror.git`) was searched across its 132 refs for writer strings
(`FABLE5HBIROW`, `HBI-OFFSET-V1`, `RGBINDEXHDR`, `row_hash_includes_lf`, `byte_end_exclusive`,
`HBISTREAM`, `HBIHDR|`, `INDEXROW|`); it holds other `.hbi` files and no writer of these shapes.
Nothing from it is copied.
