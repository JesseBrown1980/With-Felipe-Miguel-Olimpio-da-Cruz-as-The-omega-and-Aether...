# Codex regeneration records

What was measured when the owner's GGUFs and keys were deleted and regenerated from their
codex (a seed plus the owner's own program, run unmodified) on 2026-10-17 and 2026-10-18.

- `CODEX-REGENERATE.md`: the full report for rounds 1-3, with the commands, the inputs (repo,
  commit, blob, sha256) and every result.
- `CODEX-MANIFEST.hbp`: one row per target, plus the round and total rows.
- `SHA256SUMS`: sha256 of both files.
- `CODEX-COMMANDS.hbp`: for each of the 37 targets, the manifest row's command written with this
  repository's paths, as bash that can be pasted, and the check that compares its output. Each
  row also names every input that is not in this repository, and says when that input is held.
  For n=1..4 it also gives aether's Rust port as a separate command. `tools/check_commands.py`
  checks the file against the manifest and the tree, and `tools/run_row.py` runs one row as
  written.
- `tools/`: the staging and inspection tools the rounds used, with their pins, tests and
  `check.sh`. See `tools/README.md`.
- `receipts/`: re-runs made after the report.
  - `CONSTELLATION-RERUN-2026-11-08.hbp` is a re-run of #13 on the cloud seat, with the same USIM
    clone as round 2; it is not a second machine. Its expectation was committed before the run.
    The GGUF came out byte-exact (MEASURED: that receipt).
  - In that receipt, 7 of 8 expectations held. The miss is the order of 6 tied lines in the
    program's stdout, which depends on Python's hash seed (MEASURED: that receipt).
  - The receipt keeps the caveat: one 3,078 B input exists only inside the target itself (CANON:
    the target's tensor table, that receipt's E2).
  - `CODEX-MANIFEST.hbp` is not changed. Whether this re-run counts as the review that row 34
    asks for, which would make 29 of 37, is for the owner to decide.
  - `CODEX-COMMANDS-RUNS-2026-11-08.hbp` records rows of `CODEX-COMMANDS.hbp` run as written,
    with the expectations committed before the runs. 10 rows ran (n=1-4, 7, 8, 13 and 21-23),
    all 8 expectations held, and every output was byte-exact (MEASURED: that receipt). The other
    27 rows are UNVERIFIED in that form. These runs used the same seat and USIM clone as round 2.

An artifact counts as byte-exact only when it regenerated with the stored sha256 in both a run
and an independent review. Across rounds 1-3 that holds for 28 of 37 targets (997,616,582 B).
The 9 still needing storage are listed in the report with the reason for each. The owner's
boundary is quoted in the report: USIM `receipts/FABLE5-DELETE-AND-REGENERATE.hbp:8`,
`BOUND|applies_to=GENERATED_objects|not_claimed_for=arbitrary_incompressible_data|json=0`.

The report refers to its working notes (`MAP.md`, `REGEN-1.md`, `REGEN-2.md`, `REVIEW.md`, the
round notes and review folders). These were the work directory's files, and they are not part of
this repository. The owner's enwik9 (sha256 `8eb36417…`), used in round 3, is not published here.
