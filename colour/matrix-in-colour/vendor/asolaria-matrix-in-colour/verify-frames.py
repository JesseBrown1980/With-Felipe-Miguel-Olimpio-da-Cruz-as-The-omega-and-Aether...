#!/usr/bin/env python3
"""Independent verification of the matrix photographs.

The receipt field `substrate_sha256` was BLIND: it folded only room->colour, and under create-only
the colours never change, so it printed the same digest every minute while the moss deepened.

This asks the question that matters: were the PHOTOGRAPHS blind too, or did they carry the depth the
receipt field missed? It decodes each frame with PIL -- a decoder that did NOT write these files --
samples the centre pixel of every one of the 10,000 room cells, and folds that grid. If the grid
fold changes per minute, the images are a faithful record and nothing was lost.

Read-only. Writes nothing.
"""
import hashlib
import os
import sys

from PIL import Image

REPO = r"C:\tmp\scout-rooms-20261008\repo"
GRID, CELL, MARGIN = 100, 10, 12


def cell_grid(img):
    """Centre pixel of each room cell -> the 10,000-room lattice as the image recorded it."""
    px = img.load()
    out = []
    for ry in range(GRID):
        for rx in range(GRID):
            x = MARGIN + rx * CELL + CELL // 2 - 1
            y = MARGIN + ry * CELL + CELL // 2 - 1
            out.append(px[x, y])
    return out


def main():
    frames = sorted(
        f for f in os.listdir(os.path.join(REPO, "frames")) if f.endswith(".png")
    )
    if not frames:
        print("no frames")
        return 1
    print(f"{'frame':22} {'px':>11} {'mean_rgb':>10} {'nonzero':>8} {'distinct':>9} {'grid_sha16':>18}")
    prev = None
    rows = []
    for f in frames:
        p = os.path.join(REPO, "frames", f)
        img = Image.open(p)
        if img.mode != "RGB":
            img = img.convert("RGB")
        w, h = img.size
        g = cell_grid(img)
        tot = sum(sum(c) for c in g)
        mean = tot // (len(g) * 3)
        nonzero = sum(1 for c in g if sum(c) > 30)
        distinct = len(set(g))
        gsha = hashlib.sha256(bytes(b for c in g for b in c)).hexdigest()
        changed = "" if prev is None else ("CHANGED" if gsha != prev else "IDENTICAL<-BLIND")
        print(f"{f:22} {w}x{h:<6} {mean:>10} {nonzero:>8} {distinct:>9} {gsha[:16]:>18} {changed}")
        rows.append((f, mean, nonzero, distinct, gsha))
        prev = gsha

    shas = [r[4] for r in rows]
    all_distinct = len(set(shas)) == len(shas)
    means = [r[1] for r in rows]
    monotonic = all(means[i] <= means[i + 1] for i in range(len(means) - 1))
    print()
    print(f"frames                      : {len(rows)}")
    print(f"every frame grid distinct   : {all_distinct}  <- the photographs are NOT blind" if all_distinct
          else f"every frame grid distinct   : {all_distinct}  <- some frames identical")
    print(f"mean cell brightness trend  : {means}")
    print(f"monotonic non-decreasing    : {monotonic}")
    print(f"rooms lit (of 10000)        : {rows[-1][2]} at final frame")
    print(f"distinct cell colours       : {rows[-1][3]} at final frame")
    print()
    print("CORRECTED FOLD (for future runs): fold room->colour->DEPTH, not room->colour.")
    print("The depth witness that DID work all along is each frame's own photo_sha256,")
    print("which changed every minute and is already in INDEX.hbp.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
