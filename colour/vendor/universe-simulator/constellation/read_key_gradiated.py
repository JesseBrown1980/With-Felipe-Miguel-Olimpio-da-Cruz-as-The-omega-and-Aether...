#!/usr/bin/env python3
"""read_key_gradiated.py — read prior3174.bin from the CENTER with the RGB gradiated camera.

Uses ColorPID exactly as defined in omni_hotel.py: CENTER=(128,128,128), blast_radius = distance
from center, rainbow12 = hue bucket (direction), sphere27 = the 3x3x3 lattice, saturation = star
brightness. Its own honest note is the whole point: "radius alone is a shell (degenerate); the
full color carries direction too."

The key is 3,174 bytes = 3 x 1,058 exactly, so it reads as 1,058 RGB points with no remainder.

Control: 1,058 random RGB points. The user's context screen already separated these
(0.160 vs 0.978 distinct-contexts-per-byte). This asks whether the gradiated read separates
them too, and in what.
"""
import colorsys
import hashlib
import math
import os
from collections import Counter

CENTER = (128, 128, 128)


def blast_radius(c):
    return math.dist(c, CENTER)


def rainbow12(c):
    h, _, _ = colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)
    return int(h * 12) % 12


def sphere27(c):
    return (c[0] // 86) * 9 + (c[1] // 86) * 3 + (c[2] // 86)


def saturation(c):
    _, s, v = colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)
    return s * v


E8 = r"C:/asolaria-acer/scratch/layer-opening-replay-inputs-20260723/extracted/enwik8"
f = open(E8, "rb")
f.seek(90_000_000)
key = f.read(3174)
assert hashlib.sha256(key).hexdigest().startswith("1be91cb7")

rnd = os.urandom(3174)


def read(name, buf):
    pts = [(buf[i], buf[i + 1], buf[i + 2]) for i in range(0, len(buf) - 2, 3)]
    rad = [blast_radius(p) for p in pts]
    r12 = Counter(rainbow12(p) for p in pts)
    s27 = Counter(sphere27(p) for p in pts)
    sat = [saturation(p) for p in pts]
    mean_r = sum(rad) / len(rad)
    var_r = sum((x - mean_r) ** 2 for x in rad) / len(rad)
    # two-cone test: split by whether the point is inside or outside the mean shell,
    # then ask if the hue distribution differs between the two lobes
    inner = Counter(rainbow12(p) for p, r in zip(pts, rad) if r <= mean_r)
    outer = Counter(rainbow12(p) for p, r in zip(pts, rad) if r > mean_r)
    ti, to = sum(inner.values()), sum(outer.values())
    tvd = 0.5 * sum(abs(inner[k] / ti - outer[k] / to) for k in range(12)) if ti and to else 0

    print(f"\n=== {name} ===")
    print(f"  points (rgb)         : {len(pts):,}")
    print(f"  blast_radius  mean   : {mean_r:8.3f}   sd {math.sqrt(var_r):7.3f}")
    print(f"                min/max: {min(rad):8.3f} / {max(rad):.3f}")
    print(f"  rainbow12 occupied   : {len(r12)}/12")
    print(f"  sphere27  occupied   : {len(s27)}/27   <- the 3x3x3 lattice")
    print(f"  saturation mean      : {sum(sat)/len(sat):.4f}   max {max(sat):.4f}")
    print(f"  two-cone hue split   : TVD(inner,outer) = {tvd:.4f}"
          f"   {'<- lobes DIFFER' if tvd > 0.10 else '(no lobe separation)'}")
    top = s27.most_common(3)
    print(f"  densest spheres      : {top}")
    return dict(name=name, mean_r=mean_r, sd=math.sqrt(var_r), r12=len(r12),
                s27=len(s27), sat=sum(sat) / len(sat), tvd=tvd)


print("=== GRADIATED CAMERA — read from the center (128,128,128) ===")
a = read("prior3174.bin  (the key)", key)
b = read("random bytes   (control)", rnd)

print("\n" + "=" * 66)
print(f"{'metric':<26}{'key':>12}{'random':>12}{'ratio':>10}")
for k, lab in (("mean_r", "blast_radius mean"), ("sd", "radius sd"),
               ("s27", "spheres occupied"), ("sat", "saturation mean"),
               ("tvd", "two-cone hue TVD")):
    va, vb = a[k], b[k]
    r = va / vb if vb else float("inf")
    print(f"{lab:<26}{va:>12.4f}{vb:>12.4f}{r:>10.3f}")
