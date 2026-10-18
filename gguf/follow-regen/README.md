# gguf/follow-regen

Cold-lane referees for the two timed-chiral GGUFs in `gguf/follow/matrix/`. The owner's Python
generators from `JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS@8712368` run exactly as written
(vendored unchanged under `matrix/`, see `PROVENANCE.md`), and every file they write is compared
byte for byte with the stored copies. This is a verification lane only: nothing here is on the
request path, and no Rust is involved.

The monitor's own description (`matrix/timed_chiral_gguf_monitor.py:4-7`): "The running phase
writes only a bounded HBP/HBI status pair.  At the target elapsed time it additionally writes a
GGUF v3 containing derived public color/orbit bytes and source commitments.  It has no network,
subprocess, repository-content, credential, or publication capability."

## What the referee runs

`referee/follow_regen.py` (stdlib only) stages the vendored files in a fresh temporary directory,
runs each program there with `python -E -s -B` from a `matrix/` layout like upstream, and prints one
HBP row per run and per compared file, with balanced trits (`+1` equal, `-1` different, `0` a side
missing) and integer counts.

| step | owner command (upstream `matrix/README.md` or measured record) | compared with |
|---|---|---|
| `public2d` | `owner3d_to_public2d.py matrix/PUBLIC-OWNER-3D-TREE.hbi matrix/PUBLIC-OWNER-2D.hbp --replace` (README.md:57) | `qprism/representation/PUBLIC-OWNER-2D.hbp`; vendored `PUBLIC-OWNER-2D.hbp.sha256`; the program's stdout row |
| `timed-chiral` | `timed_chiral_gguf_monitor.py matrix/PUBLIC-OWNER-2D.hbp o7200 --started-ns 0 --now-ns 7200000000000 --target-seconds 7200` (REGEN-2.md, item 3) | GGUF and `.gguf.sha256` in `gguf/follow/matrix/`; the four `TIMED-CHIRAL-MONITOR.*` files in `matrix/`; GGUF sha256 `77174fb8…bb6e` |
| `timed-chiral` | `timed_chiral_gguf_monitor.py matrix/PUBLIC-OWNER-MEDIA-POSITION-2D.hbp o86400 --started-ns 0 --now-ns 86400000000000 --target-seconds 86400` (REGEN-1.md, item 4) | GGUF and `.gguf.sha256` in `gguf/follow/matrix/timed-86400-parent-c8c3/`; the four receipts in `matrix/timed-86400-parent-c8c3/`; GGUF sha256 `6afb6229…425a` |
| `owner-tests` | `test_owner3d_to_public2d.py`, `test_spherical_public_projection.py`, `test_timed_chiral_gguf_monitor.py` (README.md:69, 70, 72) | exit status 0 and at least one test run, for each |

The `--now-ns` values are the recorded elapsed times: both stored `TIMED-CHIRAL-MONITOR.hbp` files
say `status=COMPLETE|elapsed_seconds=7200|target_seconds=7200` and
`status=COMPLETE|elapsed_seconds=86400|target_seconds=86400` in their first row. The owner's runs
used `--watch` (README.md:68) on a monotonic clock; without `--watch`, `main()` passes the given
`--now-ns` as the clock (`timed_chiral_gguf_monitor.py:500-508`). The owner's 86400-second record
reports the same rebuild: `PARITY|actual_final_group_files=6|deterministic_rebuild_files=6|byte_equal_files=6|byte_mismatch_files=0|json=0`
(`matrix/timed-86400-parent-c8c3/LIRIS-TIMED-86400-ACTUAL-RUN.hbp:10` upstream).

Before any step, the referee checks every line of `UPSTREAM.sha256` and the size, Git blob id and
SHA-256 of the referenced seed. The `public2d` step checks the file given with `--owner3d-hbp` the
same way before it runs the adapter.

## Python version

Python 3.12 or newer. The owner runs these programs with `py -3.12` (upstream `matrix/README.md:56-73`),
and `collect_public_owner_inventory.py:114` calls `Path.is_junction`, which Python added in 3.12.
Measured on 3.11.17: all generator outputs are equal (14 of 14 files), and the spherical and monitor
tests pass. `test_owner3d_to_public2d.py` reports `errors=2`
(`AttributeError: 'PosixPath' object has no attribute 'is_junction'`, raised at line 114 through
`resolve_output_roles` line 161, from test lines 167 and 207). The verdict there is 26 of 27, exit 1.

## Use

```sh
cd gguf/follow-regen
sha256sum -c UPSTREAM.sha256
python3 -I referee/follow_regen.py --check   # all 3 steps; reads the vendored matrix/PUBLIC-OWNER-3D-TREE.hbp
python3 -I referee/follow_regen.py --step timed-chiral --step owner-tests   # subset: skips the 3D->2D re-derivation
```

`python3` here must be 3.12 or newer (see "Python version"); the referee runs the owner's programs
with the same interpreter. `--work DIR` keeps the work tree (DIR must not exist). Exit status 0 only
when every check is `+1`.
`PUBLIC-OWNER-3D-TREE.hbp` is vendored under `matrix/` on the owner's 2026-10-18 decision
(`PROVENANCE.md`) and read by default; `--owner3d-hbp <path>` optionally overrides it with another
copy of the upstream file, checked the same way.

## Measured (2026-10-18, Linux x86_64)

`--check` now reads the vendored `matrix/PUBLIC-OWNER-3D-TREE.hbp` and needs no network. With
`scratchpad/evalvenv` (Python 3.13.16; `numpy==2.5.4` installed, not loaded) and with
`/usr/bin/python3.12` (3.12.3, no numpy installed):
`VERDICT|steps=3|checks=27|checks_plus=27|checks_minus=0|checks_zero=0|pass=+1`, exit 0 — 3 runs on
3.13.16, 1 on 3.12.3. The subset `--step timed-chiral --step owner-tests`: 23 of 23. Passing
`--owner3d-hbp matrix/PUBLIC-OWNER-3D-TREE.hbp` (override against the vendored copy): `--step public2d`
is 4 of 4. On Python 3.11 the verdict is 26 of 27 (see "Python version"); not re-run here.

- 14 of 14 compared files equal: `PUBLIC-OWNER-2D.hbp` (97469 B) and its sidecar (86 B); for each
  run the GGUF (2200 B), its sidecar (104 B), `TIMED-CHIRAL-MONITOR.hbp` (3765 B / 4607 B), `.hbi`
  (392 B) and their sidecars (91 B each).
- Each run writes exactly 6 files; the owner's stdout rows are the expected ones
  (`OWNER3D_TO_PUBLIC2D|PASS=1|repos=147|sha256=f3a9ade5…6e17|…` and
  `TIMED_CHIRAL_MONITOR|PASS=1|status=COMPLETE|json=0`), with empty stderr.
- Owner tests, 0 skipped, 0 failures, 0 errors and exit 0 each: `test_owner3d_to_public2d.py`
  12 tests, `test_spherical_public_projection.py` 8, `test_timed_chiral_gguf_monitor.py` 9.
- Each `RUN` row also carries `wall_ms`, the program's wall time on the host that ran it. It changes
  from run to run and with host load, and it is not part of the verdict.
- Negative controls (scratch mirror, repo files untouched), each exit 1: one bit flipped in the
  stored 7200 GGUF (1 `equal=-1`); one byte of a vendored receipt (refused by the `UPSTREAM.sha256`
  check); one byte of the referenced seed (refused before any step, also with `--step public2d`
  alone and with `--step owner-tests` alone); one byte of the `--owner3d-hbp` file (refused);
  the stored 86400 `.gguf.sha256` removed (1 `equal=0`); the monitor's architecture string changed
  at lines 137 and 233 with `UPSTREAM.sha256` re-made (12 files `equal=-1`, both recorded GGUF
  sha256 checks `-1`); one expected count in `test_spherical_public_projection.py:97` changed with
  `UPSTREAM.sha256` re-made (that `RUN` row `rc=1|failures=1`).

## Numbers and lanes

- numpy: no vendored file and not the referee imports numpy (`VENDORED|…|numpy_import_lines=0`).
  The measured runs used the same venv as REGEN-1/REGEN-2 (numpy 2.5.4 installed, not loaded) and a
  Python 3.12.3 with no numpy installed; both give 27/27. The CI job installs nothing.
- Float: on the regeneration paths the generators compute with integers, bytes, `hashlib` and
  `fractions.Fraction`. Float appears in the vendored code at `timed_chiral_gguf_monitor.py:455`
  (the `--watch` wait, not taken with `--now-ns`; the owner's monitor test reaches it through
  `watch_monitor` with a fake clock whose `wait(self, seconds: float)` adds
  `int(seconds * 1_000_000_000)`, `test_timed_chiral_gguf_monitor.py:187-188`) and
  `collect_public_owner_inventory.py:241-245` (`color_from_root` through `colorsys`, reached only by
  the owner's adapter test). These run unchanged as the owner wrote them. The referee itself is
  integer-only (`grep` for float constructs is empty).
- The 3D-to-2D adapter also re-derives the 86400-second seed: run on upstream
  `PUBLIC-OWNER-3D-MEDIA-TREE.hbi` (README.md:59) it wrote `PUBLIC-OWNER-MEDIA-POSITION-2D.hbp`
  and its sidecar, both equal to the stored files (`c8c3a6ba…3310`), in a scratch run. That media
  tree carries the same repository names, so it is not vendored and this step is not wired here.
