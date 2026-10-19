# Provenance: acer-zero-portal-update-2026-10-19

On 2026-10-19 ACER (seat ACER-CLAUDE-FABLE5, on the operator's direction) recorded that the free 4th zero / HTTP-0
Omega portal exists. It is *The light hub*, <https://jessebrown1980.github.io/the-light-hub-http-0/>. ACER pushed:

- **aether:** `76e7e92`, then `44bf8f5`, which only restores LF line endings;
- **Asolaria:** `94c84d8`, then `b7d6b4b`, also a line-ending fix only.

ACER also sent the files as `ZERO-PORTAL-UPDATE-2026-10-19.zip` (43,654 B, sha256
`32ae6157c8b606d586e6875a43d7a40899f4a97870d04a255e9dc2cf2fb081fb`, 12 entries).

Every file of that zip is in this folder byte-identical, at its path under the zip's top folder, with one exception.
`seat/CLAUDE.md` is stored as `seat/CLAUDE.archived.md` (same bytes, 20,616 B, `c3a36a71…`), so that no coding agent
loads it as live instructions; `canon-archive/` follows the same rule. With that rename, all 11 `FILE` rows of
`MANIFEST.hbp` match. `sha256sum -c SHA256SUMS` checks every file in this folder.

## What a second machine established

The cloud checked these on 2026-10-19 (`cloud/CLOUD-ROWS.hbp`):

- **The commits.** The parent chains are linear: `ba1ffe1 → 76e7e92 → 44bf8f5` in aether and `179d2ca → 94c84d8 →
  b7d6b4b` in Asolaria. Each second commit only removes the carriage returns the first added: `git diff
  --ignore-cr-at-eol` between them is empty. No file in either net change has a CR.
- **The net change.**
  - aether gains the root `ZERO-PORTAL.md`, `.hbp` and `.sha256` plus 10 README lines, and three files in
    `canon-archive/` change (see the correction below): 7 files, +46/−6.
  - Asolaria gains its own three `ZERO-PORTAL` files and 10 README lines: 4 files, +41/−0.
  - Both `ZERO-PORTAL.sha256` sidecars check.
- **The page exists and loads** (MEASURED here too). At 14:27 UTC it returned HTTP 200, 12,372 B, sha256
  `96de88cd09f00341f7fe405b04eed780531a97dcc1b73f5884114dc6467a05d9`. Those bytes are `index.html` on `main` of
  `JesseBrown1980/the-light-hub-http-0` (`9ba2939`). It is a WebRTC data channel: public STUN only (two Google STUN
  addresses), no TURN, and no fetch, XHR or WebSocket. The offer and answer travel by copy and paste.

## The correction this folder carries: `canon-archive/` is restored to its pins

`canon-archive/` is the owner's Brown-Hilbert canon, published 2026-10-18 as a read-only archive, byte-identical to
cube `FABLE5-BROWN-HILBERT-PASS-2026-10-18` (`docs/handoffs/`): 46 files, 213,855 B. `76e7e92` edited three of those
files in place. That broke their pins (43/46, 214,488 B) and replaced the old `NAMED` lines instead of adding beside
them, against the note's own rule (`ZERO-PORTAL.hbp`: `rule=correction_beside_never_over`).

The commit that adds this folder restores those three files to their pinned bytes, so the archive is 46/46 again:

| `canon-archive/` path | pinned (restored) | ACER's 2026-10-19 copy, kept here |
|---|---|---|
| `seat/CLAUDE.archived.md` | 20,506 B `cc8874ea…` | `seat/CLAUDE.archived.md`, 20,616 B `c3a36a71…` |
| `asolaria-acer/claims-gate/AGENT-DISCIPLINE.md` | 35,659 B `dcad4c33…` | `claims-gate/AGENT-DISCIPLINE.md`, 36,505 B `6d2ec087…` (CRLF, as ACER sent it) |
| `asolaria-acer/claims-gate/GITHUB-3D-VIEWER-BUILD.md` | 8,667 B `3e487228…` | `claims-gate/GITHUB-3D-VIEWER-BUILD.md`, 9,214 B `f1b2feee…` (CRLF, as ACER sent it) |

So the old wording stays in the archive, and ACER's new wording sits beside it here. The LF copies that `44bf8f5` held
(35,760 B `22f138e2…` and 9,089 B `39e19135…`) are the same text with the CRs removed. They remain in git history. The
gate job `canon-archive` now checks all 46 pins on every push.

## Notes beside the note

The note (`ZERO-PORTAL.md`, root and here) is kept byte-identical; its sidecar pins it. These notes qualify it:

1. **How to connect.** The page has two buttons, and the flow is one-sided.
   - One person presses **OPEN THE LIGHT** and sends *your light* (an offer).
   - The other presses **join someone's**, pastes that offer, presses **take it**, and sends back their own *your
     light* (an answer).
   - The first person pastes the answer and presses **take it**. The channel then opens.

   The note's "press *OPEN THE LIGHT*, and exchange the two light blocks" would put both people in offer mode. The page
   then never creates an answer, so the channel cannot open (`index.html`, the `take` handler).
2. **Colour.** Each side paints the sha256 of its own block: the opener's offer, the joiner's answer. The two colours
   differ. The note says the colour comes from "the sha256 of the offer".
3. **Corridor.** 27 links, one of which is the hub itself, so 26 lead elsewhere.
4. **"Verified live."** What is measured is that the page exists and loads. No receipt shows a channel opened. The note
   itself tags anything further `NAMED` until measured.
5. **"No server in the path."** The page says "no server of ours". The STUN servers are Google's, and without TURN some
   networks cannot connect at all.
6. **"canon-archive copies" and the hook.** The note lists the SessionStart hook among the updated canon and says
   this repository's `canon-archive/` holds copies. The hook is not in `canon-archive/`. Its two delivered files are
   here under `seat/hooks/`, as records, not as hooks to run. After the restore above, the updated copies are here,
   not in `canon-archive/`.
7. **Asolaria's copy of the note** says the vendored snapshots and the `canon-archive/` copies are in aether. Its
   `.hbp` is byte-identical to aether's and does not say so.
8. **Other uses of "HTTP-0 portal".** Some files in this repository use the phrase for RAINBOR, its waves or
   `OMEGA-RAINBONTY-VERSE.html`, and describe the free fourth zero as the point where three waves agree. The note does
   not reconcile those with the light hub. Both stand as written until the owner says which is meant.
9. **Commit identity.** All four commits are by `acer <acer@localhost>`, unsigned, pushed straight to `main`.
   `MANIFEST.hbp` names them by short id.
