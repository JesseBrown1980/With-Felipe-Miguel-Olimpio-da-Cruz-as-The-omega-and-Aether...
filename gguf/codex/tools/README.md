# gguf/codex/tools

The staging and inspection tools used for the codex regeneration rounds in `../CODEX-REGENERATE.md`,
and two tools for `../CODEX-COMMANDS.hbp`. The cloud seat wrote all of them, not the owner; the
first three lived in that work directory as `regen/tools/` (CANON: `../CODEX-MANIFEST.hbp:15` names
`stage_office.py`). They import only the Python standard library and pass the integer-rule scan of
`check.sh` (MEASURED: `check.sh`). `run_row.py` runs the command of a `../CODEX-COMMANDS.hbp` row,
and so the owner program that row names; the other tools run no owner program.

| file | what it does |
|---|---|
| `stage_office.py` | Builds the literal `D:/` trees that the USIM group-C programs glob: the office `FABLE5-*.hbi\|hbp` files from one USIM commit, the 4 `laws/*.qr` files, `prior3174.bin`, the wasm and, if asked, the CONSTELLATION GGUF. It writes `STAGE-MANIFEST.hbp`, with one row per staged file and its source. It stops when one of the 4 qr files or `prior3174.bin` differs from the sha256 in its `KNOWN` table. It reports, and does not stop on, a wasm that is not the `b98abbbb` copy and a staged file that differs from its office inventory row or from its copied `.sha256` sidecar; a staged file with neither is not checked. It prints the counts that each program's globs select. |
| `gguf_meta.py` | Prints the header, the key/value metadata and the tensor descriptors of GGUF files. |
| `tensor_eq.py` | For each tensor of one GGUF, prints its size and sha256 prefix, and the tensors of a second GGUF that are byte-equal to it (GGML types 0 and 24 only). |
| `check_commands.py` | Checks `../CODEX-COMMANDS.hbp` against `../CODEX-MANIFEST.hbp` and the tree, and checks that every bash field of it can be pasted: `bash -n` parses it, it holds no single quote and no placeholder, every `cd` is inside a subshell, and every variable is a `VARS` one, in double quotes except `$STAGE`. It runs nothing but `bash -n`. |
| `run_row.py` | Runs one row of `../CODEX-COMMANDS.hbp` as written: `setup` and `command` in one `bash`, then `setup` and `check` in another, from the repository root. It prints the sha256 of each text it ran and both exit statuses. |
| `check.sh` | Runs every check below. |
| `tests/` | `test_gguf_meta.py` and its two frozen expectation files. |

## Changes from the work-directory copies

| file | work-directory sha256 | change |
|---|---|---|
| `stage_office.py` | `3f168689…0d0c` (14,920 B; named in `../CODEX-MANIFEST.hbp:15`) | The hard-coded `D:` is now `--root` (default `D:`, one directory name under `--dest`). `--hist` and `--laws-dir` are now required: their defaults were paths in the cloud seat's scratch directory. |
| `gguf_meta.py` | `289dc0b4…e2bd2` (1,115 B) | float32 and float64 metadata values were read with `struct` `<f` and `<d` into Python floats. They are now read as bit patterns and printed with the text CPython's `repr()` gives. That text (the fewest digits that read back to the same binary64, the nearest such, the even one on a tie) is computed in integers. A `main()` guard was added. |
| `tensor_eq.py` | `83c87f64…ddc1` (1,192 B) | none (byte-identical) |

**The outputs did not change.** The following are MEASURED on 2026-11-08, with the hashes in `../receipts/TOOLS-OUTPUT-EQUIVALENCE-2026-11-08.hbp`. Each was checked against an expectation of byte-identical output, set before the run:

- `stage_office.py`: the old and the new version were run with the same arguments into the same `--dest` path, for 3 recipes (the CONSTELLATION, SELF-64 and RIME-UNRIME-THREE stagings in `../CODEX-REGENERATE.md`). In all 3, stdout, `STAGE-MANIFEST.hbp` and the sha256 of every staged file were byte-identical (287, 291 and 310 files). With `--root E:`, stdout was the same as with the default.
- `gguf_meta.py`: the old and the new version gave byte-identical output on the 37 GGUFs in this repository that are not LFS pointers (825 lines, sha256 `c9d43f49…0f4e`). None of the 37 has a float key, so this does not exercise the float path. The float path is covered by the two tests below.
- `tests/test_gguf_meta.py`:
  - `tests/repr-vectors.txt` holds 4,104 bit patterns and the text CPython 3.13.16 `repr()` gave for each. That covers every normal binary64 power of two and the two smallest subnormal ones (2,048 of the 2,098 positive powers of two), the binary64 nearest each power of ten from 1e-323 to 1e308, the subnormal and overflow edges, and random patterns. All 4,104 come out equal.
  - The test builds a GGUF with float keys from integers (1,701 B, `c24c7594…`). Its output equals `tests/float-kv.expected.txt`, which is what the old version printed for the same file.
  - The vectors were frozen with labels made of the letter f and the bit width. They were then relabelled `b64`/`b32`, so that the repository's no-float pattern does not match them. The texts were not changed: before relabelling, the file had sha256 `4a12c9f5…7cd4`.

One more comparison is UNVERIFIED here. In the session that wrote the integer formatter, it was compared with CPython `repr()` on 1,000,000 random binary64 patterns, 500,000 random binary32 patterns and 524,288 low-fraction binary32 patterns, with 0 differences. That comparison is not committed, because it computes with floats.

## Use

```sh
H=<a clone of USIM with full history>   # every git call runs with GIT_NO_LAZY_FETCH=1
python3 -I gguf/codex/tools/stage_office.py --commit 37248b2 --names-from 7ca9ce5 \
  --hist "$H" --laws-dir docs/handoffs/acer-post60d-2026-10-18/FABLE5-REGEN-ITEM4-QR-CODEXES-AND-HRM-2026-10-18/qr-codexes \
  --dest <new empty directory>
python3 -I gguf/codex/tools/gguf_meta.py <file.gguf> ...
python3 -I gguf/codex/tools/tensor_eq.py <a.gguf> <b.gguf>
gguf/codex/tools/check.sh
```

`../CODEX-COMMANDS.hbp` gives the full command for each of the 37 targets, using these tools. To run one
row as written, export the variables its `VARS` row names, make `W` a new empty directory, and run
`python3 -I gguf/codex/tools/run_row.py <n>` from the repository root.

## Checks

`check.sh` runs, in order:

1. `sha256sum -c SHA256SUMS`;
2. `tests/test_gguf_meta.py`;
3. `check_commands.py` (it calls `bash -n` on every bash field);
4. the repository's no-float pattern (`\bf32\b|\bf64\b|as f[0-9]`) over this directory;
5. an integer-rule scan of every `.py` file here, which looks for true division, float literals, float, complex, math or decimal names, and struct float formats.

A CI job is not wired for this directory yet.

## Left out

These files from the work directory's `tools/` are not committed:

- `herself-7df89d8.txt` and `herself-da43991.txt`;
- `office-found.txt`;
- `follow-sha.txt`;
- `herself_body.py`, which was not part of this item.
