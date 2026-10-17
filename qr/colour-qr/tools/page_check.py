#!/usr/bin/env python3
"""Cold lane: the owner's own reader decodes the colour QR PNGs.

Loads the vendored vendor/the-colour-qr/index.html (1938a9b) unmodified in headless Chromium
and hands PNGs to the page's file input (index.html:104), so the page's own path runs:
createImageBitmap -> canvas -> getImageData -> take() -> render() (index.html:10282-10288,
10238-10264). It then presses the page's save button (index.html:10265-10276) and reads the
download the page produces. One fresh page per payload, so the chunk map starts empty.

Per fixture it also measures README.md:53 "Do not convert to grey": the page's own jsQR is
called once on the unsplit RGBA image (jsQR's greyscale, index.html:545) and the result
goes through the page's b64 and index lines.

The lane_R/G/B fields are the page's lane labels after the last file: a lane label changes
only when that plane reads, or from "waiting" to "no symbol in this plane" (index.html:10244).

Usage:
  page_check.py [--check] [--chromium PATH] [--manifest tests/fixtures/FIXTURES.hbp]
  page_check.py [--check] --set SHA256:BYTES PNG [PNG ...]   one payload over several PNGs
Prints HBP rows; --check exits 1 unless the page equals its UPSTREAM.sha256 row and every
download equals its payload sha256.
"""
import argparse
import base64
import hashlib
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "vendor" / "the-colour-qr" / "index.html"
CHUNK_BYTES = 2100

UNSPLIT = """async (b64png) => {
  const bytes = Uint8Array.from(atob(b64png), c => c.charCodeAt(0));
  const bmp = await createImageBitmap(new Blob([bytes], {type: "image/png"}));
  const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
  const x = c.getContext("2d", {willReadFrequently: true}); x.drawImage(bmp, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height);
  let r = null;
  try { r = jsQR(img.data, img.width, img.height, {inversionAttempts: "attemptBoth"}); } catch (e) {}
  if (!r) return "no_symbol";
  let d; try { d = b64(r.data); } catch (e) { return "not_base64"; }
  if (d.length < 5) return "too_short";
  return "chunk_" + (d[0] | (d[1] << 8) | (d[2] << 16) | (d[3] << 24));
}"""


def page_pin():
    for line in (ROOT / "UPSTREAM.sha256").read_text(encoding="utf-8").splitlines():
        sha, _, name = line.partition("  ")
        if name == "vendor/the-colour-qr/index.html":
            return sha
    return ""


def manifest_rows(path):
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("FIXTURE|"):
            continue
        f = dict(x.split("=", 1) for x in line.split("|")[1:] if "=" in x)
        rows.append(([ROOT / f["png"]], f["sha256"], int(f["bytes"])))
    return rows


def read_set(browser, pngs, expected, nbytes, unsplit):
    page = browser.new_page(accept_downloads=True)
    page.goto(PAGE.as_uri())
    page.set_input_files("#files", [str(p) for p in pngs])
    want = -(-nbytes // CHUNK_BYTES)
    try:
        page.wait_for_function(f"chunks.size >= {want}", timeout=60_000)
    except Exception:  # a dropped plane leaves fewer chunks; the rows below say so
        pass
    lanes = page.evaluate(
        "['R','G','B'].map(k => [document.getElementById('l'+k).textContent,"
        " document.getElementById('n'+k).textContent])"
    )
    n_chunks, shown_bytes, contiguous, disabled = page.evaluate(
        "[document.getElementById('cN').textContent, document.getElementById('cB').textContent,"
        " document.getElementById('cM').textContent, document.getElementById('save').disabled]"
    )
    sha_shown, dl_sha, dl_bytes, name = "", "", 0, ""
    if not disabled:
        with page.expect_download() as info:
            page.click("#save")
        data = pathlib.Path(info.value.path()).read_bytes()
        dl_sha, dl_bytes, name = hashlib.sha256(data).hexdigest(), len(data), info.value.suggested_filename
        page.wait_for_function("document.getElementById('sha').textContent.includes('sha256')")
        sha_shown = page.evaluate("document.getElementById('sha').querySelector('code').textContent")
    grey = ""
    if unsplit:
        grey = page.evaluate(UNSPLIT, base64.b64encode(pngs[0].read_bytes()).decode("ascii"))
    page.close()
    lane_txt = "|".join(f"lane_{k}={lab}" + (f" ({n})" if n else "") for k, (lab, n) in zip("RGB", lanes))
    ok = dl_sha == expected and sha_shown == expected
    label = pngs[0].name if len(pngs) == 1 else f"{pngs[0].name}..{pngs[-1].name}"
    print(
        f"PAGE_READ|png={label}|pngs={len(pngs)}|{lane_txt}|chunks={n_chunks}|bytes={shown_bytes}"
        f"|contiguous={contiguous}|page_sha256={sha_shown}|download={name}|download_bytes={dl_bytes}"
        f"|download_sha256={dl_sha}|expected={expected}|match={int(ok)}"
        + (f"|unsplit_jsqr={grey}" if unsplit else "")
        + "|json=0"
    )
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--chromium", default=None, help="Chromium executable (default: Playwright's)")
    ap.add_argument("--manifest", default=str(ROOT / "tests" / "fixtures" / "FIXTURES.hbp"))
    ap.add_argument("--set", dest="set_", default=None, metavar="SHA256:BYTES")
    ap.add_argument("pngs", nargs="*")
    a = ap.parse_args()
    if a.set_:
        sha, nbytes = a.set_.split(":")
        sets = [([pathlib.Path(p).resolve() for p in a.pngs], sha, int(nbytes))]
    else:
        sets = manifest_rows(pathlib.Path(a.manifest))
    page_sha = hashlib.sha256(PAGE.read_bytes()).hexdigest()
    page_ok = page_sha == page_pin()
    with sync_playwright() as p:
        kw = {"headless": True}
        if a.chromium:
            kw["executable_path"] = a.chromium
        browser = p.chromium.launch(**kw)
        print(
            f"PAGE_HDR|page=vendor/the-colour-qr/index.html"
            f"|page_sha256={page_sha}|page_pinned={int(page_ok)}"
            f"|browser=chromium-{browser.version}|sets={len(sets)}|json=0"
        )
        results = [read_set(browser, pngs, sha, n, unsplit=not a.set_) for pngs, sha, n in sets]
        browser.close()
    good = sum(results)
    print(f"PAGE_SUMMARY|sets={len(results)}|byte_exact={good}|json=0")
    if a.check and (not page_ok or good != len(results)):
        sys.exit(1)


if __name__ == "__main__":
    main()
