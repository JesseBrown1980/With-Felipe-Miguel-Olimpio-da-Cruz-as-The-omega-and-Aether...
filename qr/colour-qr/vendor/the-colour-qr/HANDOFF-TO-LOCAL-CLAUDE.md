# Handoff — for the Claude running on the operator's computer

You have what this seat does not: **`gh` authenticated as `JesseBrown1980`**. Everything below
needs exactly that, which is why it is being handed to you rather than done remotely.

Context: `the-colour-qr` **does not exist**. It returns 404 while logged in, and the live bridge
corpus (`the-bridge-to-all-of-it/corpus.json`) holds **182** repos without it. The cloud seat's
local copy of that corpus had a 183rd entry which the cloud seat itself had added in anticipation —
that entry was speculative and is the reason two audit reports said "183" and called this repo
"unaudited." It was never unaudited; it was never there.

Everything in this folder is the finished repo. Nothing needs writing — only landing.

---

## Step 1 — create and populate

```bash
cd <this folder>
gh auth status                      # must show JesseBrown1980
gh repo create the-colour-qr --public --description "The colour QR — three ordinary QR symbols, one per RGB channel. Both directions. Room 44."
git init -b main
git add .
git commit -m "the colour QR — the door, both directions, room 44"
git remote add origin https://github.com/JesseBrown1980/the-colour-qr.git
git push -u origin main
```

Do **not** re-generate or reformat any file. `.gitattributes` LF-pins the text so the committed
bytes match the sidecars already present. Verify after pushing:

```bash
sha256sum -c *.sha256            # every line must say OK
```

Expected: `index.html` sha16 `4212990d22153880` · `README.md` `70c79289b67ffaa3` ·
`COLOUR-QR-RECEIPT-2026-08-06.hbp` `74ae33506b8bce0a`.

## Step 2 — the door has to open

```bash
gh api -X POST repos/JesseBrown1980/the-colour-qr/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

Then confirm **https://jessebrown1980.github.io/the-colour-qr/** serves. `.nojekyll` is included so
Pages serves the file as-is. **The page calls `getUserMedia`** — the camera only works over HTTPS,
so test on the Pages URL, never a `file://` open.

## Step 3 — REMEASURE THE 3-D GITHUB OF THRUTH

This is the part that matters, and the reason this is a handoff. The operator's instruction is to
register the repo through **the 3-D GitHub of Truth**, not through a flat index.

The harness lives on `main` of `FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS`:

```
matrix/3-D-GITHUB-OF-THRUTH.md            (+ .sha256)
matrix/build_3d_github_harness.py         (+ .sha256)
matrix/GITHUB-THREE-DIMENSIONALLY-RIMED-2026-07-29.hbp   (+ .sha256)
matrix/PUBLIC-OWNER-3D-TREE.hbi / .hbp    (+ .sha256)
```

Its own READ-FIRST carry states the rule:

```
VERIFY(POINTER_AND_GRAPH)
REMEASURE(CURRENT_GITHUB_REFS)
CONTINUE(UNFINISHED_GOAL)
```

**What I verified about the harness from here (read-only), so you don't have to rediscover it:**

- It shells out to `gh api --hostname github.com <endpoint>` and **asserts the authenticated viewer
  is `JesseBrown1980`** (`assert_authenticated_owner`) — it refuses to run as anyone else. That is
  the hard reason a cloud seat cannot do this.
- It scrubs every environment variable whose name looks sensitive except `GH_TOKEN`/`GITHUB_TOKEN`.
- `REPOSITORIES` is hardcoded at **line 33** to three repos: UNIVERSE, FOLLOW, SAFE.
  `parse_args` exposes only `--gh` and `--output` — **there is no flag for adding a repository.**
- It emits LF-only `json=0` HyperBEHCS tuple text plus a SHA-256 sidecar, schema
  `ASOLARIA-3-D-GITHUB-OF-THRUTH-V2`, and it binds the *already-public parent ref* rather than
  claiming to embed its own commit.
- `assert_repository_is_empty` exists to reject a false `EMPTY_UNBORN` label — so a brand-new repo
  is a state it already reasons about. Run the harness **after** step 1's push, not before.

**So step 3 is a one-line change plus a rerun:**

```python
# matrix/build_3d_github_harness.py line 33
COLOUR_QR = "the-colour-qr"
REPOSITORIES = (UNIVERSE, FOLLOW, SAFE, COLOUR_QR)
```

```bash
cd <FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS>
python3 matrix/build_3d_github_harness.py      # regenerates the .hbp and its .sha256
sha256sum -c matrix/*.sha256
git add -A && git commit -m "3-D GitHub of Thruth: remeasure, the colour QR door enters the graph"
git push
```

Ask the operator before widening `REPOSITORIES` past four — the graph is deliberately bounded
(`MAX_OUTPUT_BYTES = 1 MiB`), and he may want the colour-QR door as its own node rather than a
fourth universe.

## Step 4 — the flat projection, second not first

The bridge's `corpus.json` is `PROJECTION(MATRIX)` in the harness's own terms
(`PROJECTION_IS_WHOLE_MATRIX = 0`). Update it **after** the graph, not instead of it:

```json
{"n":"the-colour-qr","door":1,"url":"https://jessebrown1980.github.io/the-colour-qr/","out":1,"in":1,"readme":1}
```

Then the live index reads 183 for the first time — truthfully.

## While you are in there — one thing worth telling the operator

`FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS` has **11 branches**, and the harness lives on `main` — good.
But `asolaria-federation-1024` carries **12 diverging branches**, several named `acer/…`, and
`acer/prism-comb-0loss-2026-07-01` alone changes 25 of 86 Rust files. **The acer machine is down.**
Those branches are the only surviving copy of that work. Cutting `git bundle` files for them before
any merge is cheap insurance, and it is a bigger deal than this repo.

## Toolchain standard, in case you touch any Rust

**Rust 1.81 with clippy. Integer and ternary only, never float.** Pinned in `rust-toolchain.toml`
(`channel = "1.81.0"`, `components = ["clippy","rustfmt"]`), `rust-version = "1.81"` in every
`Cargo.toml`, CI runs `cargo clippy --all-targets -- -D warnings` plus a grep that fails on any
`f32`/`f64`. Measured in the cloud seat on real rustc 1.81.0 today: `dbbh-coms-quant-prism` 19/19,
`path2-two-shadow-recovery` 30/30, `qprism-3d-slice-harness` 8/8, clippy clean after three
one-line lint fixes. This repo carries no Rust; the rule is stated in its README anyway.
