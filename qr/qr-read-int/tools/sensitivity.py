#!/usr/bin/env python3
"""Cold lane: which one-line changes to the port the page-parity corpus detects.

For each change below, copies this crate into a temporary directory, applies the change as an
exact text replacement (the old text must occur the stated number of times), runs
`cargo +1.81.0 test --release --locked --test page_parity` there and reads the PAGE_PARITY row:
the planes whose result differs from the page's recorded one are `planes - equal`. Prints one
HBP row per change; README "Sensitivity" is this output. Integer arithmetic only.

Usage: tools/sensitivity.py [--target-dir DIR]   (default: a temporary directory)
"""
import argparse
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent

# (change, file, old text, new text, occurrences of the old text)
CHANGES = [
    ("threshold `lum < t` for `lum <= t`", "src/binarize.rs",
     "25 * u32::from(lum) <= s", "25 * u32::from(lum) < s", 1),
    ("black point ties rounded up, not to even", "src/binarize.rs",
     "(r2 == den && q % 2 == 1)", "r2 == den", 1),
    ("`min / 2` rounded up", "src/binarize.rs",
     "let mut value = clamp_round(min, 2);",
     "let mut value = u8::try_from((min + 1) / 2).unwrap_or(255);", 1),
    ("a `NaN` block stored as 255, not 0", "src/binarize.rs",
     "let stored = if nan {\n                0", "let stored = if nan {\n                255", 1),
    ("neighbour black point taken on `<=`", "src/binarize.rs",
     "if 4 * min < nb {", "if 4 * min <= nb {", 1),
    ("Bresenham error start truncated, not floored", "src/locate.rs",
     "let mut error = (-dx).div_euclid(2);", "let mut error = -dx / 2;", 1),
    ("`sizeError` left out of the score", "src/locate.rs",
     "    ratio_error + size_error\n}", "    let _ = size_error;\n    ratio_error\n}", 1),
    ("`ratioError` one unit in the last place larger", "src/locate.rs",
     "            .sqrt();\n    let avg_size",
     "            .sqrt();\n    let ratio_error = Dbl::from_bits(ratio_error.to_bits() + 1);\n"
     "    let avg_size", 1),
    ("recentred x rounded down, not to nearest", "src/locate.rs",
     "matrix.get(round(x), ", "matrix.get(floor(x), ", 2),
    ("best group from the top 3 candidates, not 5", "src/locate.rs",
     "if i > MAX_FINDERPATTERNS_TO_SEARCH {", "if i > 2 {", 1),
    ("group size term weighted 3/2 (`/ 2 L` for `/ 3 L` in run lengths)", "src/locate.rs",
     "pow2(p.size - point.size) / point.size",
     "pow2(p.size - point.size) * num(3) / num(2) / point.size", 1),
    ("alignment pattern used from 16 modules, not 15", "src/locate.rs",
     "modules_between.ge(num(15))", "modules_between.ge(num(16))", 1),
    ("quad width ratio bound 2.0, not 1.5", "src/locate.rs",
     "2 * scan2 < 3 * w", "scan2 < 2 * w", 1),
    ("binary64 ties rounded away from zero, not to even", "src/binary64.rs",
     "let up = rest > half || (rest == half && (sticky || kept & 1 == 1));",
     "let up = rest >= half;", 1),
    ("binary64 results truncated toward zero, not rounded to nearest", "src/binary64.rs",
     "let up = rest > half || (rest == half && (sticky || kept & 1 == 1));",
     "let up = sticky && rest > half && kept == u128::MAX;", 1),
    ("Euclidean loop stopping one degree early", "src/reed_solomon.rs",
     "while 2 * r.degree() >= r_big {", "while 2 * r.degree() >= r_big + 2 {", 1),
    ("version information accepted at 2 bits off, not 3", "src/decode.rs",
     "    if best_difference <= 3 {\n        best\n    } else {\n        None\n    }\n}\n\n"
     "/// `readFormatInformation",
     "    if best_difference <= 2 {\n        best\n    } else {\n        None\n    }\n}\n\n"
     "/// `readFormatInformation", 1),
]


def run(change, target):
    name, file, old, new, count = change
    with tempfile.TemporaryDirectory() as tmp:
        crate = pathlib.Path(tmp) / "crate"
        crate.mkdir()
        for f in ["Cargo.toml", "Cargo.lock"]:
            shutil.copy(ROOT / f, crate / f)
        for d in ["src", "tests", "examples"]:
            shutil.copytree(ROOT / d, crate / d)
        path = crate / file
        text = path.read_text(encoding="utf-8")
        if text.count(old) != count:
            sys.exit(f"{name}: {file} holds the old text {text.count(old)} times, not {count}")
        path.write_text(text.replace(old, new), encoding="utf-8")
        env = dict(os.environ, CARGO_TARGET_DIR=target)
        out = subprocess.run(
            ["cargo", "+1.81.0", "test", "--release", "--locked", "--test", "page_parity",
             "every_corpus_plane_reads_as_the_page_reads_it", "--", "--nocapture"],
            cwd=crate, env=env, capture_output=True, text=True)
        rows = [l for l in out.stdout.splitlines() if l.startswith("PAGE_PARITY|")]
        if not rows:
            sys.exit(f"{name}: no PAGE_PARITY row\n{out.stderr[-2000:]}")
        f = dict(x.split("=", 1) for x in rows[0].split("|")[1:])
        return int(f["planes"]), int(f["planes"]) - int(f["equal"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target-dir", default=None)
    a = ap.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        target = a.target_dir or tmp
        detected = 0
        for change in CHANGES:
            planes, differ = run(change, target)
            detected += differ > 0
            print(f"SENSITIVITY|change={change[0]}|planes={planes}|differ={differ}|json=0",
                  flush=True)
        print(f"SENSITIVITY_SUMMARY|changes={len(CHANGES)}|detected={detected}|json=0")


if __name__ == "__main__":
    main()
