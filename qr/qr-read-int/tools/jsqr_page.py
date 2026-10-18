#!/usr/bin/env python3
"""Cold lane: the owner's page reads the page-parity corpus with its own jsQR.

Loads the-colour-qr @ 1938a9b index.html (vendored at qr/colour-qr/vendor/the-colour-qr/,
checked against its pinned sha256) unmodified in headless Chromium. For every plane that
`cargo run --example corpus -- DIR` wrote, it builds an ImageData whose red channel is the
plane, passes it through the page's own planeData(img, 0) (index.html:10230-10235) and calls
the page's jsQR(..., {inversionAttempts: "attemptBoth"}) exactly as take() does
(index.html:10242). It prints one HBP row per plane:

  JSQR|name|grey_sha256|w|h|found|version|text_sha256|bytes_sha256|chunks|
       tl|tr|bl|al|corner_tr|corner_tl|corner_br|corner_bl|
       tl_bits|tr_bits|bl_bits|al_bits|corner_tr_bits|corner_tl_bits|corner_br_bits|
       corner_bl_bits|json=0

text_sha256 is the sha256 of the UTF-8 bytes of jsQR's `data`; bytes_sha256 of `binaryData`.
A point is "x,y", each coordinate the page's own decimal string for the number (String(v)); its
`_bits` twin gives each coordinate as the 16 hex digits of its IEEE-754 binary64 bit pattern
(DataView.getBigUint64 after setFloat64). The JS here only reads and formats the page's values.
Integer arithmetic only on this side.

Usage:
  jsqr_page.py --corpus DIR [--chromium PATH] [--page INDEX.HTML]           print rows
  jsqr_page.py --corpus DIR --check tests/fixtures/JSQR-PAGE.hbp [...]      exit 1 unless equal
"""
import argparse
import base64
import hashlib
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT.parent / "colour-qr" / "vendor" / "the-colour-qr" / "index.html"
PAGE_SHA256 = "7b9a0830aa01efe770c8b69a4c5712069fba3a82eab7c00ab4dc2392379d573a"

READ = """([b64, w, h]) => {
  const bin = atob(b64);
  const img = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) { img.data[i * 4] = bin.charCodeAt(i); img.data[i * 4 + 3] = 255; }
  let r = null, thrown = false;
  try { r = jsQR(planeData(img, 0).data, w, h, {inversionAttempts: "attemptBoth"}); }
  catch (e) { thrown = true; }
  if (!r) return [thrown ? "thrown" : "none"];
  const b64of = (u8) => { let s = ""; for (const x of u8) s += String.fromCharCode(x); return btoa(s); };
  const pt = (p) => String(p.x) + "," + String(p.y);
  const view = new DataView(new ArrayBuffer(8));
  const hex = (v) => { view.setFloat64(0, v); return view.getBigUint64(0).toString(16).padStart(16, "0"); };
  const ptBits = (p) => hex(p.x) + "," + hex(p.y);
  const L = r.location;
  const points = [L.topLeftFinderPattern, L.topRightFinderPattern, L.bottomLeftFinderPattern,
                  L.bottomRightAlignmentPattern, L.topRightCorner, L.topLeftCorner,
                  L.bottomRightCorner, L.bottomLeftCorner];
  const chunks = r.chunks.map(k => k.type === "eci" ? "eci" + k.assignmentNumber : k.type).join(".");
  return ["found", String(r.version), b64of(new TextEncoder().encode(r.data)),
          b64of(Uint8Array.from(r.binaryData)), chunks].concat(points.map(pt), points.map(ptBits));
}"""


def planes(corpus):
    for line in (corpus / "CORPUS.hbp").read_text(encoding="ascii").splitlines():
        f = dict(x.split("=", 1) for x in line.split("|")[1:] if "=" in x)
        data = (corpus / f["file"]).read_bytes()
        header = f"P5\n{f['w']} {f['h']}\n255\n".encode("ascii")
        if not data.startswith(header):
            sys.exit(f"{f['file']}: not the P5 header the corpus writes")
        grey = data[len(header):]
        if hashlib.sha256(grey).hexdigest() != f["grey_sha256"]:
            sys.exit(f"{f['file']}: grey bytes differ from CORPUS.hbp")
        yield f["name"], int(f["w"]), int(f["h"]), grey


def row(name, w, h, grey, got):
    head = f"JSQR|name={name}|grey_sha256={hashlib.sha256(grey).hexdigest()}|w={w}|h={h}"
    if got[0] != "found":
        return f"{head}|found=0|status={got[0]}|json=0"
    version, text, data, chunks = got[1], base64.b64decode(got[2]), base64.b64decode(got[3]), got[4]
    keys = ["tl", "tr", "bl", "al", "corner_tr", "corner_tl", "corner_br", "corner_bl"]
    keys += [k + "_bits" for k in keys]
    points = "|".join(f"{k}={v}" for k, v in zip(keys, got[5:]))
    return (f"{head}|found=1|version={version}|text_sha256={hashlib.sha256(text).hexdigest()}"
            f"|bytes_sha256={hashlib.sha256(data).hexdigest()}|chunks={chunks}|{points}|json=0")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", required=True)
    ap.add_argument("--chromium", default=None)
    ap.add_argument("--page", default=str(PAGE))
    ap.add_argument("--check", default=None)
    a = ap.parse_args()
    page_path = pathlib.Path(a.page)
    if hashlib.sha256(page_path.read_bytes()).hexdigest() != PAGE_SHA256:
        sys.exit(f"{page_path}: sha256 differs from the pinned the-colour-qr @ 1938a9b index.html")
    rows = []
    with sync_playwright() as p:
        kw = {"headless": True}
        if a.chromium:
            kw["executable_path"] = a.chromium
        browser = p.chromium.launch(**kw)
        page = browser.new_page()
        page.goto(page_path.resolve().as_uri())
        rows.append(f"JSQR_HDR|page=the-colour-qr@1938a9b/index.html|page_sha256={PAGE_SHA256}"
                    f"|browser=chromium-{browser.version}|json=0")
        for name, w, h, grey in planes(pathlib.Path(a.corpus)):
            got = page.evaluate(READ, [base64.b64encode(grey).decode("ascii"), w, h])
            rows.append(row(name, w, h, grey, got))
        browser.close()
    found = sum(1 for r in rows if "|found=1|" in r)
    rows.append(f"JSQR_SUMMARY|planes={len(rows) - 1}|found={found}|json=0")
    if a.check:
        want = pathlib.Path(a.check).read_text(encoding="ascii").splitlines()
        same = [r for r in rows if not r.startswith("JSQR_HDR")] == \
               [r for r in want if not r.startswith("JSQR_HDR")]
        print(f"JSQR_CHECK|planes={len(rows) - 2}|equal_to={a.check}|equal={int(same)}|json=0")
        if not same:
            for got, exp in zip(rows, want):
                if got != exp and not got.startswith("JSQR_HDR"):
                    print(f"JSQR_DIFF|got={got}\nJSQR_DIFF|want={exp}")
            sys.exit(1)
        return
    print("\n".join(rows))


if __name__ == "__main__":
    main()
