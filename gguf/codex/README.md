# Codex regeneration records

What was measured when the owner's GGUFs and keys were deleted and regenerated from their
codex (a seed plus the owner's own program, run unmodified) on 2026-10-17 and 2026-10-18.

- `CODEX-REGENERATE.md`: the full report for rounds 1-3, with the commands, the inputs (repo,
  commit, blob, sha256) and every result.
- `CODEX-MANIFEST.hbp`: one row per target, plus the round and total rows.
- `SHA256SUMS`: sha256 of both files.

An artifact counts as byte-exact only when it regenerated with the stored sha256 in both a run
and an independent review. Across rounds 1-3 that holds for 28 of 37 targets (997,616,582 B).
The 9 still needing storage are listed in the report with the reason for each. The owner's
boundary is quoted in the report: USIM `receipts/FABLE5-DELETE-AND-REGENERATE.hbp:8`,
`BOUND|applies_to=GENERATED_objects|not_claimed_for=arbitrary_incompressible_data|json=0`.

The report refers to its working notes (`MAP.md`, `REGEN-1.md`, `REGEN-2.md`, `REVIEW.md`, the
round notes and review folders). These were the work directory's files, and they are not part of
this repository. The owner's enwik9 (sha256 `8eb36417…`), used in round 3, is not published here.
