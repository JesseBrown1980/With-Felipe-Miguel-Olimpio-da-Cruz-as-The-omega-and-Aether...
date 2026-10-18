#!/usr/bin/env python3
"""Cold lane record: the Rust readers and the owner's page on resampled fixture PNGs.

the-colour-qr README.md:73 reads its codes back "from a 457 px crop of a screenshot rather
than the original file". This tool resamples each fixture PNG (tests/fixtures/FIXTURES.hbp,
555 px) in integers to other sides and has every reader read every copy:

  box      each output pixel is the exact area-weighted sum of the source pixels it covers,
           divided once, rounded half up
  nearest  each output pixel is the source pixel under its centre

Readers:
  int   `colour-qr ungenerate` from the default build: qr-read-int, the integer-only port of
        the page's jsQR (the default un-generate path)
  rqrr  `colour-qr ungenerate --rqrr-secondary` from a build with `--features rqrr-secondary`:
        the labelled secondary, third-party rqrr with f64 geometry (only with --colour-qr-rqrr)
  page  the vendored index.html, unmodified, through its file input and save button, one fresh
        page per copy, as page_check.py drives it

Prints one HBP row per copy with every reader's per-plane result, one summary row per
resampling, one row per pair of differing per-plane results and a total row. It records the
readers and does not require them to agree, except that --check-int-page exits 1 unless the
integer reader and the page give the same result on every plane. Integer arithmetic only.

Usage: resample_check.py --colour-qr BIN [--colour-qr-rqrr BIN] [--chromium PATH]
                         [--manifest FIXTURES.hbp] [--check-int-page]
"""
import argparse
import collections
import hashlib
import pathlib
import struct
import subprocess
import sys
import tempfile
import zlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "vendor" / "the-colour-qr" / "index.html"
BOX = (520, 500, 480, 457, 440, 400, 370)
NEAREST = (500, 457, 400)


def page_pin():
    for line in (ROOT / "UPSTREAM.sha256").read_text(encoding="utf-8").splitlines():
        sha, _, name = line.partition("  ")
        if name == "vendor/the-colour-qr/index.html":
            return sha
    sys.exit("UPSTREAM.sha256 has no row for vendor/the-colour-qr/index.html")


def read_png(data):
    """8-bit non-interlaced grey, RGB or RGBA PNG -> (width, height, channels, samples)."""
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos, idat, ihdr = 8, b"", None
    while pos < len(data):
        (n,) = struct.unpack(">I", data[pos:pos + 4])
        kind, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + n]
        if kind == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", body)
        elif kind == b"IDAT":
            idat += body
        pos += 12 + n
    w, h, depth, ctype, _, _, interlace = ihdr
    assert depth == 8 and interlace == 0 and ctype in (0, 2, 6), ihdr
    ch = {0: 1, 2: 3, 6: 4}[ctype]
    raw, stride = zlib.decompress(idat), w * ch
    out, prev, p = bytearray(h * stride), bytearray(stride), 0
    for y in range(h):
        f, line = raw[p], bytearray(raw[p + 1:p + 1 + stride])
        p += 1 + stride
        for i in range(stride):
            a = line[i - ch] if i >= ch else 0
            b = prev[i]
            c = prev[i - ch] if i >= ch else 0
            if f == 1:
                line[i] = (line[i] + a) & 255
            elif f == 2:
                line[i] = (line[i] + b) & 255
            elif f == 3:
                line[i] = (line[i] + ((a + b) >> 1)) & 255
            elif f == 4:
                q = a + b - c
                pa, pb, pc = abs(q - a), abs(q - b), abs(q - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, ch, out


def write_png(w, h, ch, pix):
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))

    stride = w * ch
    raw = b"".join(b"\x00" + bytes(pix[y * stride:(y + 1) * stride]) for y in range(h))
    ihdr = struct.pack(">IIBBBBB", w, h, 8, {1: 0, 3: 2, 4: 6}[ch], 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b""))


def overlaps(src, dst):
    """Output x covers [x*src, (x+1)*src) and source i covers [i*dst, (i+1)*dst)."""
    table = []
    for x in range(dst):
        lo, hi, row, i = x * src, (x + 1) * src, [], (x * src) // dst
        while i * dst < hi:
            ov = min(hi, (i + 1) * dst) - max(lo, i * dst)
            if ov > 0:
                row.append((i, ov))
            i += 1
        table.append(row)
    return table


def box(w, h, ch, pix, side):
    wx, wy, den = overlaps(w, side), overlaps(h, side), w * h
    out = bytearray(side * side * ch)
    for y in range(side):
        for x in range(side):
            for c in range(ch):
                acc = 0
                for j, vy in wy[y]:
                    for i, vx in wx[x]:
                        acc += vx * vy * pix[(j * w + i) * ch + c]
                out[(y * side + x) * ch + c] = (2 * acc + den) // (2 * den)
    return out


def nearest(w, h, ch, pix, side):
    out = bytearray(side * side * ch)
    for y in range(side):
        sy = (2 * y + 1) * h // (2 * side)
        for x in range(side):
            s = (sy * w + (2 * x + 1) * w // (2 * side)) * ch
            out[(y * side + x) * ch:(y * side + x + 1) * ch] = pix[s:s + ch]
    return out


def rust_read(binary, png, tmp, secondary=False):
    flag = ["--rqrr-secondary"] if secondary else []
    rows = subprocess.run([binary, "ungenerate", *flag, str(tmp / "rust.bin"), str(png)],
                          check=True, capture_output=True, text=True).stdout.splitlines()
    planes, sha = [], ""
    for row in rows:
        f = dict(x.split("=", 1) for x in row.split("|")[1:] if "=" in x)
        if row.startswith("COLOURQR_PLANE|"):
            planes.append("chunk_" + f["index"] if f["read"] == "chunk" else
                          {"no_symbol_in_this_plane": "none"}.get(f["read"], f["read"]))
        elif row.startswith("COLOURQR_OUT|"):
            sha = f["sha256"]
    return planes, sha


PAGE_LABELS = {"no symbol in this plane": "none", "symbol found, not base64": "not_base64",
               "symbol too short": "too_short"}


def page_read(browser, png):
    page = browser.new_page(accept_downloads=True)
    page.goto(PAGE.as_uri())
    page.set_input_files("#files", [str(png)])
    # take() (index.html:10238-10254) sets every lane label in one call for one image
    page.wait_for_function(
        "['R','G','B'].every(k => document.getElementById('l'+k).textContent !== 'waiting')",
        timeout=60_000)
    labels = page.evaluate("['R','G','B'].map(k => document.getElementById('l'+k).textContent)")
    sha = ""
    if not page.evaluate("document.getElementById('save').disabled"):
        with page.expect_download() as info:
            page.click("#save")
        sha = hashlib.sha256(pathlib.Path(info.value.path()).read_bytes()).hexdigest()
    page.close()
    planes = [PAGE_LABELS.get(t, t.replace("chunk ", "chunk_")) for t in labels]
    return planes, sha


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--colour-qr", required=True, help="colour-qr binary, default build")
    ap.add_argument("--colour-qr-rqrr", default=None,
                    help="colour-qr binary built with --features rqrr-secondary")
    ap.add_argument("--chromium", default=None, help="Chromium executable (default: Playwright's)")
    ap.add_argument("--manifest", default=str(ROOT / "tests" / "fixtures" / "FIXTURES.hbp"))
    ap.add_argument("--check-int-page", action="store_true")
    a = ap.parse_args()
    page_sha = hashlib.sha256(PAGE.read_bytes()).hexdigest()
    if page_sha != page_pin():
        sys.exit(f"index.html sha256 {page_sha} differs from UPSTREAM.sha256")
    fixtures = []
    for line in pathlib.Path(a.manifest).read_text(encoding="utf-8").splitlines():
        if line.startswith("FIXTURE|"):
            f = dict(x.split("=", 1) for x in line.split("|")[1:] if "=" in x)
            fixtures.append((ROOT / f["png"], f["sha256"]))
    kinds = [("box", s) for s in BOX] + [("nearest", s) for s in NEAREST]
    readers = ["int", "page"] + (["rqrr"] if a.colour_qr_rqrr else [])
    pairs = [("int", "page")] + ([("int", "rqrr"), ("rqrr", "page")] if a.colour_qr_rqrr else [])
    # per resampling: copies, exact per reader, then per pair: copies equal, planes equal
    summary = collections.OrderedDict(
        (f"{k}{s}", {"copies": 0, **{f"{r}_exact": 0 for r in readers},
                     **{f"{x}_{y}_copies_equal": 0 for x, y in pairs},
                     **{f"{x}_{y}_planes_equal": 0 for x, y in pairs}}) for k, s in kinds)
    diffs = {pair: collections.Counter() for pair in pairs}
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        tmp = pathlib.Path(tmp)
        kw = {"headless": True}
        if a.chromium:
            kw["executable_path"] = a.chromium
        browser = p.chromium.launch(**kw)
        print(f"RESAMPLE_HDR|page=vendor/the-colour-qr/index.html|page_sha256={page_sha}"
              f"|browser=chromium-{browser.version}|fixtures={len(fixtures)}"
              f"|box={','.join(map(str, BOX))}|nearest={','.join(map(str, NEAREST))}"
              f"|readers={','.join(readers)}|json=0", flush=True)
        for png, expected in fixtures:
            w, h, ch, pix = read_png(png.read_bytes())
            stem = png.stem.replace("-code-01", "")
            for kind, side in kinds:
                pix2 = (box if kind == "box" else nearest)(w, h, ch, pix, side)
                copy = tmp / f"{stem}-{kind}{side}.png"
                copy.write_bytes(write_png(side, side, ch, pix2))
                got = {"int": rust_read(a.colour_qr, copy, tmp),
                       "page": page_read(browser, copy)}
                if a.colour_qr_rqrr:
                    got["rqrr"] = rust_read(a.colour_qr_rqrr, copy, tmp, secondary=True)
                s = summary[f"{kind}{side}"]
                s["copies"] += 1
                fields = []
                for r in readers:
                    exact = int(got[r][1] == expected)
                    s[f"{r}_exact"] += exact
                    fields.append(f"{r}={','.join(got[r][0])}|{r}_exact={exact}")
                for x, y in pairs:
                    px, py = got[x][0], got[y][0]
                    planes = sum(int(u == v) for u, v in zip(px, py))
                    s[f"{x}_{y}_planes_equal"] += planes
                    s[f"{x}_{y}_copies_equal"] += int(px == py)
                    fields.append(f"{x}_{y}_planes_equal={planes}/3")
                    if px != py:
                        diffs[(x, y)][(",".join(px), ",".join(py))] += 1
                print(f"RESAMPLE|png={copy.name}|png_sha256={hashlib.sha256(copy.read_bytes()).hexdigest()}"
                      f"|{'|'.join(fields)}|json=0", flush=True)
        browser.close()
    total = collections.Counter()
    for name, s in summary.items():
        total.update(s)
        n = s["copies"]
        cells = [f"{r}_exact={s[f'{r}_exact']}/{n}" for r in readers]
        cells += [f"{x}_{y}_copies_equal={s[f'{x}_{y}_copies_equal']}/{n}"
                  f"|{x}_{y}_planes_equal={s[f'{x}_{y}_planes_equal']}/{3 * n}" for x, y in pairs]
        print(f"RESAMPLE_SUMMARY|resample={name}|copies={n}|{'|'.join(cells)}|json=0")
    for (x, y), counter in diffs.items():
        for (u, v), n in sorted(counter.items(), key=lambda kv: (-kv[1], kv[0])):
            print(f"RESAMPLE_DIFF|pair={x}_{y}|{x}={u}|{y}={v}|copies={n}|json=0")
    n = total["copies"]
    cells = [f"{r}_exact={total[f'{r}_exact']}/{n}" for r in readers]
    cells += [f"{x}_{y}_copies_equal={total[f'{x}_{y}_copies_equal']}/{n}"
              f"|{x}_{y}_planes_equal={total[f'{x}_{y}_planes_equal']}/{3 * n}" for x, y in pairs]
    print(f"RESAMPLE_TOTAL|copies={n}|{'|'.join(cells)}|json=0")
    if a.check_int_page and total["int_page_planes_equal"] != 3 * n:
        sys.exit(1)


if __name__ == "__main__":
    main()
