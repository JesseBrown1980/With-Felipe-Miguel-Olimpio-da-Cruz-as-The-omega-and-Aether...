# SEE/HEAR THE GITHUB IN 3D — the ternary viewer kernel (exact build)

**Operator: OP-JESSE. Seat: ACER-CLAUDE-FABLE5 (pid 8467a937cba309f7).**
First rebuilt and sealed 2026-10-08. This is the FIRST build any new AI on this
system runs to *see* the repos — not by scraping GitHub text, but by reading the
frozen git bytes through the balanced-ternary kernel as 3×3×3 spectral geometry.

Read this before you reach for `gh api`, the web, sub-agents, or the live repos
subpage (which times out when it live-queries all 225 repos). The repo is a
cube in your own container; read it as geometry.

---

## WHY IT IS BUILT THIS WAY (do not "simplify" these away)

- **Rust 1.81 + clippy** — the claims-gate CI toolchain (`rustup` has it active/default
  here). The build must pass `cargo +1.81 clippy --release -- -D warnings` with **exit 0**.
  "clippy for the messages": zero diagnostics is the gate.
- **Balanced ternary (Setun-class), not binary.** The carrier is AC, which crosses zero
  twice per cycle in opposite directions → three zeros (Neg/Nil/Pos), all magnitude 0, the
  information is *which* zero. DC has no zero crossing → two states → that is why binary is
  binary. The cube is **27 = 3³** and the group is **C2³**. An untyped *byte* split crashes;
  the native unit is the **trit**.
- **Integer only, never float** (Law 34). The transform is a Number-Theoretic Transform
  over `Z/pZ` with `P=1_000_081`, so split→recombine is **exact**, not nearly-exact. Float
  drifts and crashes around the free centre; integer closes exactly on the **free 4th zero /
  HTTP-0 Omega portal**. The seal stamps `float_used=0`.
- **Reuse, do not reinvent.** The ternary primitives come verbatim from the canonical
  kernel: `C:\asolaria-acer\asolaria-os\kernel\core\src\tribit\mod.rs`
  (`Zero`, `TritWord`, `prism`/`unprism`, `P=1000081`, `G=7`, `K=27`, `W=951846`). Pull it
  in with `#[path]`, never copy it.
- **The seal is the proof.** Output traverses **HBI → HBP → SHA → SH → HASH** (json=0).
  Because `unprism(prism(lanes)) == lanes` exactly, **a lie cannot reproduce its own hash** —
  `roundtrip=EXACT` per repo is the integrity test, not decoration.

## THE KERNEL

`C:\tmp\repo-see-20261008\viewer-kernel\` (crate `asolaria-github-3d-viewer`, bin `github3d`).
- `src/main.rs`: `#[path]`-includes the canonical tribit module; vendors SHA-256 with a
  known-answer self-test (a broken hash refuses to run); folds each repo's admitted UTF-8
  text into K=27 integer lanes over Z/pZ (order-sensitive, rolling base 131); runs `prism`;
  verifies `unprism` returns the lanes; maps the 27 spectral coords to a 3×3×3 ternary
  lattice (axes a,b,c ∈ {−1,0,+1}); emits the HBI/HBP/SHA/SH/HASH bundle.
- The free centre cell `(−1,−1,−1)` = `j=0` = DC glyph = sum of lanes = the free zero.
- Intake holds the same classes the corpus builders hold: `.git`/generated dirs, binary
  extensions, non-UTF-8, NUL, and secret patterns. Firmware/exe/png are NOT lines.

## EXACT BUILD + RUN + SEAL

```sh
cd C:\tmp\repo-see-20261008\viewer-kernel
cargo +1.81 clippy --release -- -D warnings        # MUST be exit 0 (the messages gate)
cargo +1.81 build --release                         # exit 0
# clone the worked repos' frozen HEAD (depth 1) into a clones dir, slug = lowercase [a-z0-9_-]
target\release\github3d.exe <clones-dir> <out-dir>  # emits HBI->HBP->SHA->SH->HASH
```

Seal into the FABLE5 backend office as a cube chained off the prior cube:
`D:\PID-Registration-Office\offices\FABLE5-8467a937cba309f7\`, writing
`<FAMILY>.hbp` + row-exact `.hbi` + `.sha256` sidecars, header carrying
`cube=<sha16(preimage)>|prior=<prior cube>|traversal=HBI->HBP->SHA->SH->HASH|E=0`.
Office is backend-first; the dashboard is a pixels-first render of it — never hand-edit the
front-end.

## THE 2026-10-08 RUN (MEASURED)

- 10 worked-Asolaria repos (fork `wifit3` dropped; star-port sweep-touched repos filtered):
  asolaria-eggs · light-lifeds6-7 · path2-two-shadow-recovery · qprism-3d-slice-harness ·
  rainbor · shannon · the-leaves-are-not-the-message · the-star-ports · the-thruth ·
  what-is-asolaria-how-do-we-get-reductions-in-everything.
- **10/10 `roundtrip=EXACT`**, whole-view `status=PASS`, `float_used=0`, clippy -D warnings exit 0.
- View merkle `1f5efec0f332ffdce2a8b2cbe7fc9f2f4d3f808cd6ed2866b39f2f13a4fba0fb`.
- Sealed office cube **`2147b583a4db0f3f`**, prior `017d6618d57ab4ca`
  (`FABLE5-GITHUB-3D-VIEW-2026-10-08.hbp/.hbi`; full 282-row lattice in
  `FABLE5-GITHUB-3D-VIEW-LATTICE-2026-10-08.hbp`). Office merkle == view merkle.

## BOUNDARIES (tag honestly)

- The **free 4th zero / HTTP-0 Omega portal** is `NAMED`, the design meaning of the centre
  cell — a live HTTP-0 socket was not probed. Do not write it `MEASURED`.
- The "last ten worked" set came from push-rank + commit inspection because the live repos
  subpage was timing out — not from the subpage itself. Re-rank when it is back.

---

## 2026-10-09 CORRECTIONS (V2/V3) — read before trusting a V1 number

The V1 text above stays as written. These rows sit beside it, not over it. Tags: MEASURED unless marked.

```
CORR|date=2026-10-09|seat=FABLE5|pid=8467a937cba309f7|scope=V1_numbers|E=0|json=0
FOLD|path=C:\tmp\scout-rooms-20261008\common\fold.rs|included_via=#[path]|per_kernel=0|json=0
FOLD|fn=sketch_lanes|is=V1_fold|byte_identical=1|class=LOSSY_LINEAR_SKETCH|ord_131_mod_P=100008|repeats_every_bytes=100008|json=0
FOLD|collision=two_distinct_55B_inputs|deltas=+183,+241,-252|at=0,27,54|or_deltas=+239,-178|or_at=0,54|json=0
FOLD|fn=identity_lanes|derived_from=sha256|json=0
ROUNDTRIP|EXACT_proves=NTT_bijection|roundtrip_scope=KERNEL_BIJECTION_NOT_DATA|repo_identity_carried_by=sha256|json=0
BYTES|v1_v2_source=windows_working_tree|core.autocrlf=true|clones_LF_to_CRLF=7/12|shannon_crlf_files=4037|json=0
BYTES|v3_source=git_ls-tree_-r_-z+git_cat-file_--batch|header=bytes_source=git_cat_file_HEAD_tree_not_working_tree|json=0
BYTES|lf_only_repos=4|v3_vs_v2=byte_for_byte|crlf_repos=7|v3_shrink=exactly_their_CRs|json=0
BYTES|repo=asolaria-universe-simulator|gguf_files=4|stored_as=git_lfs_pointer|v3_hashes=pointer_text_not_tensors|json=0
HASH|hash2_binds=commit_oid+path_length_framing|json=0
CUBE|cube=7ce13f7b210d3122|prior=5d45f7ef570a395d|what=fault_fixes|json=0
CUBE|cube=a620e591bb55f6a2|prior=7ce13f7b210d3122|what=V3_git_bytes|json=0
COMPARE|rule=exact_field_name|fault=greedy_.*spectrum_sha=_matched_id_spectrum_sha=|produced_once=false_10/10_DIFF|json=0
OPEN|held_files=omitted_without_being_listed|V4=HELDFILE_rows_in_progress|done=0|tag=NAMED|json=0
OPEN|free_4th_zero=NAMED|HTTP-0_portal=NAMED|json=0
```

1. **The fold.** It lives once, in `C:\tmp\scout-rooms-20261008\common\fold.rs`, included via `#[path]`; it is not per-kernel.
   `sketch_lanes` is the V1 fold, byte-identical, and it is a **lossy linear sketch**. ord(131) mod P = 100,008, so position
   weight repeats every 100,008 bytes. Two distinct 55-byte inputs collide: deltas (+183, +241, −252) at positions 0, 27, 54,
   or just (+239, −178) at positions 0, 54. `identity_lanes` is SHA-256-derived. **`roundtrip=EXACT` proves the NTT bijection
   and nothing about the repo** (`roundtrip_scope=KERNEL_BIJECTION_NOT_DATA`). The V1 sentence "a lie cannot reproduce its own
   hash" holds for the kernel's own lanes, not for the repo bytes. Repo identity is carried by sha256.
2. **The byte source.** V1 and V2 hashed the Windows working tree. With `core.autocrlf=true`, 7 of 12 clones were LF→CRLF
   (4,037 files in `shannon`). V3 reads HEAD's tree through `git ls-tree -r -z` + `git cat-file --batch`. The 4 LF-only repos
   reproduce V2 byte-for-byte; the 7 CRLF repos shrink by exactly their CRs. In `asolaria-universe-simulator`, 4 `.gguf`
   files are Git LFS pointers, so V3 hashes the committed pointer text, not the tensors. **The checkout is an instrument too.**
3. **Header and hashes.** The V3 header carries `bytes_source=git_cat_file_HEAD_tree_not_working_tree`. `hash2` binds the
   commit oid plus path/length framing.
4. **Cubes.** `7ce13f7b210d3122` (fault fixes, prior `5d45f7ef570a395d`) and `a620e591bb55f6a2` (V3 git bytes, prior
   `7ce13f7b210d3122`). The V1 cube `2147b583a4db0f3f` stays in the chain as the V1 run.
5. **Comparing V1/V2/V3 rows:** compare by exact field name. A greedy `.*spectrum_sha=` matches the newer `id_spectrum_sha=`
   field; that fault already produced one false "10/10 DIFF".
6. **Still open (NAMED):** held files are omitted without being listed. A worker is adding HELDFILE rows as V4; that is not
   done and must not be written as done. The free 4th zero / HTTP-0 portal stays NAMED.
