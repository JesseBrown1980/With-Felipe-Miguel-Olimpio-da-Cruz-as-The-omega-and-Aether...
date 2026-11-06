# Vault-reader re-run, 2026-10-19 (build order step 15c)

The reader and its Python referee, run again over every public tree aether vendors or pins.
The reader source is unchanged since `171a461`; its `sha256` is shadowcat's `sha256.rs`.

- `RERUN.hbp`: one row per tree. Lines 1-182 are the first pass, 58 repositories at their vendored commits
  (61 `RERUN` rows plus `RERUNALT`, `RERUNSUB`, `ZEROHBI` and `SKIP` rows). Lines 183-611 are the second pass, the
  386 repo@commit pairs (33 repositories) that aether's tracked text pins (`RERUNSCOPE`, `pin_source=` on each row),
  then the cause notes and the totals.
- `heads/` and `pins/VAULT-*.hbp`: the reader's output for each tree, `sha256` equal to the row's `result_sha256`.
  12 pin outputs over 5,242,880 B are not kept; their hashes are in the rows.
- `pins/targets.tsv`, `pins/results.tsv`, `pins/notes.hbp`: the pin list, the per-pin run record, the cause notes.
- `tools/`: the scripts that made them (they carry this session's scratch paths).

| Pass | Rows | Objects | +1 | -1 | 0 | Rust = referee |
|---|---|---|---|---|---|---|
| Vendored heads | 61 | 1,102,126 | 1,101,801 | 24 | 301 | 61 of 61 |
| Pinned commits | 386 | 6,809,026 | 6,799,454 | 2,591 | 6,981 | 386 of 386 |
| All rows (`ALLTOTAL`) | 455 | 7,912,614 | 7,901,266 | 2,615 | 8,733 | 455 of 455 |

The 9,572 non-`+1` objects of the second pass are explained by 39 cause notes (`RERUNNOTE`), each naming its
commits, paths and cause.

**Audit (2026-11-06), three independent checks before this commit:**

- Totals and integrity: every total recomputes from its rows; all 429 kept outputs hash to their rows; pins and
  rows match one to one; no credential or personal data. One row (line 108, a `SKIP`) names a private dataset of the
  owner's without content, as the first pass already did.
- Sampled re-run from scratch: 8 pinned trees and 1 first-pass tree, fresh build; output equal to the rows in all 9.
  The six asolaria-stone-to-moss pins (about 750 MB each) were run through an overlay view (note at line 570) and were
  not re-run in the audit.
- Cause notes: one note was wrong and is corrected here. It said `books/LAW-43-THE-UNIVERSE-TEACHES-THE-GLYPHS-TO-SPEAK.md`
  was never committed on any ref; it is committed at `2ebcc60`. The analyzer searched `git log --all` without
  `--full-history`, which hid that commit. With the flag, those 20 objects are "on other commits only", and 30 objects
  stay never committed. The notes also now say which refs each absence claim searched, and the OFFICECLI note names
  the 9 commits whose `.hbp` is committed with CRLF.

`git archive` applies `.gitattributes`, so a tree with an `eol` attribute is not byte-identical to its commit (seen in
AI-healthCare-project, on a file with no `.hbi` objects); no result is affected.
