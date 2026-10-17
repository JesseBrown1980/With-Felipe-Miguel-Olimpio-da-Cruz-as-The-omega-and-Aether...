# Creating `the-colour-qr` — 8 taps, then it works

It does not exist yet (404 for you while logged in, and the live bridge corpus holds 182 repos
without it). This folder is the whole repo, ready to upload.

## 1. Create it

**https://github.com/new**

- Repository name: **`the-colour-qr`** (exact — the bridge door and the Pages URL depend on it)
- Public
- Do **not** add a README (one is included here)
- Create repository

## 2. Upload these files

On the empty repo page: **uploading an existing file** → drag in *everything* from this folder →
Commit.

Commit message: `the colour QR — the door, both directions, room 44`

| file | what it is |
|---|---|
| `index.html` | the door page — 267,679 B, **fully self-contained** (0 external URLs, inline scripts only) |
| `README.md` | generate *and* un-generate, the Fischer index, room 44, plus the toolchain rule |
| `.nojekyll` | tells Pages to serve the file as-is instead of running Jekyll over it |
| `.gitattributes` | LF-pins text so committed bytes match the sidecars |
| `COLOUR-QR-RECEIPT-2026-08-06.hbp` + `.sha256` | the HBP receipt row per file |
| `*.sha256` | one sidecar per file, so anyone can verify byte-exactness after the commit |

## 3. Turn the door on

**Settings → Pages** → Source: **Deploy from a branch** → Branch: **main**, folder: **/ (root)** → Save.

Give it a minute, then: **https://jessebrown1980.github.io/the-colour-qr/**

## 4. Put it in the bridge

The live corpus at `the-bridge-to-all-of-it/corpus.json` lists 182 repos and does not include this
one. Either re-run your corpus generator, or add this entry by hand:

```json
{"n":"the-colour-qr","door":1,"url":"https://jessebrown1980.github.io/the-colour-qr/","out":1,"in":1,"readme":1}
```

Then the index reads 183 and the door opens — which is the state my landing kit had assumed since
August 4th, and the reason two of my audit reports said "183" and called this repo "unaudited."
It was never unaudited; it was never there. Now it will be.

## Verified before packaging

- `index.html` references **zero** external URLs — no CDN, no font, no analytics. It runs from a
  file, offline, exactly like everything else in the corpus.
- It requests `getUserMedia`, i.e. the camera, which is the point: the page reads a colour QR
  from a phone camera. **Camera access on Pages requires HTTPS**, which `github.io` provides —
  it will *not* work from a `file://` open, so use the Pages URL when testing on a phone.
- No build step, no dependency, no Rust. The toolchain rule is stated in the README anyway so it
  governs anything added later.

Sidecars for the record: `index.html` sha16 **`4212990d22153880`** ·
`README.md` **`70c79289b67ffaa3`** · receipt **`74ae33506b8bce0a`**.
