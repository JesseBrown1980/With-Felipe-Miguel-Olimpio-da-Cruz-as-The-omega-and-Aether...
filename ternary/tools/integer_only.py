#!/usr/bin/env python3
"""Integer-only check for the code written in ternary/ (stdlib only; run with python3 -I -B).

Exit 0 when nothing below is found, 1 otherwise (each hit printed as file:line).

  Python (tools/*.py, this file included), by AST:
    true division `/` or `/=` (ast.Div); a float or complex literal; a call to float(), round()
    or complex(); an import of math, cmath, fractions, decimal, statistics, random or numpy; `**`
    with a negative literal exponent; a %-format or format spec with a float conversion
    (e, E, f, F, g, G, %).
    Not seen by a static check: `**` with a computed exponent (the referee's are `10 ** places`
    and `10 ** len(part)`, both >= 0), and the owner's vendored code, which the referee compiles
    from vendor/ and whose float lane (measure(), lzma, math.sin) runs unchanged by design.
  Rust (src/, tests/, examples/), with comments, strings and char literals blanked first:
    the tokens f32 / f64 (types, `as f64`, `f64::...`); a float literal: `1.5`, `2.`, `1e3`,
    `1.5e-3`, `1f64`, `1_f32` (hex, octal and binary integers and integer suffixes are not floats;
    `t.0.1` tuple access and `1.max(2)` are not literals).
"""
import ast
import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BANNED_IMPORTS = {"math", "cmath", "fractions", "decimal", "statistics", "random", "numpy"}
BANNED_CALLS = {"float", "round", "complex"}
PCT_FLOAT = re.compile(r"%(?:\([^)]*\))?[#0\- +]*(?:\*|\d+)?(?:\.(?:\*|\d+))?([a-zA-Z%])")
SPEC_FLOAT = re.compile(r"[eEfFgG%]$")


def python_hits(path):
    with open(path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=path)
    hits = []

    def hit(node, what):
        hits.append("%s:%d: %s" % (os.path.relpath(path, HERE), getattr(node, "lineno", 0), what))

    for node in ast.walk(tree):
        if isinstance(node, ast.Div):
            continue  # reported through its BinOp / AugAssign (they carry the line number)
        if isinstance(node, (ast.BinOp, ast.AugAssign)) and isinstance(node.op, ast.Div):
            hit(node, "true division /")
        if isinstance(node, ast.Constant) and isinstance(node.value, (float, complex)):
            hit(node, "float literal %r" % (node.value,))
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in BANNED_CALLS:
            hit(node, "call %s()" % node.func.id)
        if isinstance(node, ast.Import):
            for a in node.names:
                if a.name.split(".")[0] in BANNED_IMPORTS:
                    hit(node, "import %s" % a.name)
        if isinstance(node, ast.ImportFrom) and (node.module or "").split(".")[0] in BANNED_IMPORTS:
            hit(node, "from %s import" % node.module)
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Pow):
            r = node.right
            if isinstance(r, ast.UnaryOp) and isinstance(r.op, ast.USub) and isinstance(r.operand, ast.Constant):
                hit(node, "** with a negative exponent")
        if (isinstance(node, ast.BinOp) and isinstance(node.op, ast.Mod)
                and isinstance(node.left, ast.Constant) and isinstance(node.left.value, str)):
            for m in PCT_FLOAT.finditer(node.left.value.replace("%%", "")):
                if m.group(1) in "eEfFgG":
                    hit(node, "%%-format float conversion %r" % m.group(0))
        if isinstance(node, ast.FormattedValue) and node.format_spec is not None:
            spec = "".join(v.value for v in node.format_spec.values
                           if isinstance(v, ast.Constant) and isinstance(v.value, str))
            if SPEC_FLOAT.search(spec):
                hit(node, "format spec %r" % spec)
    return hits


def blank_rust(text):
    """Comments, string literals and char literals replaced by spaces (newlines kept)."""
    out = []
    i, n = 0, len(text)

    def keep_newlines(s):
        return "".join("\n" if ch == "\n" else " " for ch in s)

    while i < n:
        ch = text[i]
        if text.startswith("//", i):
            j = text.find("\n", i)
            j = n if j < 0 else j
            out.append(" " * (j - i))
            i = j
        elif text.startswith("/*", i):
            depth, j = 1, i + 2
            while j < n and depth:
                if text.startswith("/*", j):
                    depth, j = depth + 1, j + 2
                elif text.startswith("*/", j):
                    depth, j = depth - 1, j + 2
                else:
                    j += 1
            out.append(keep_newlines(text[i:j]))
            i = j
        elif re.match(r"b?r#*\"", text[i:i + 260]) and (i == 0 or not (text[i - 1].isalnum() or text[i - 1] == "_")):
            m = re.match(r"b?r(#*)\"", text[i:])
            close = "\"" + m.group(1)
            j = text.find(close, i + m.end())
            j = n if j < 0 else j + len(close)
            out.append(keep_newlines(text[i:j]))
            i = j
        elif ch == "\"":
            j = i + 1
            while j < n and text[j] != "\"":
                j += 2 if text[j] == "\\" else 1
            j = min(j + 1, n)
            out.append(keep_newlines(text[i:j]))
            i = j
        elif ch == "'":
            if i + 1 < n and text[i + 1] == "\\":
                j = text.find("'", i + 3)
                j = n if j < 0 else j + 1
            elif i + 2 < n and text[i + 2] == "'":
                j = i + 3
            else:
                j = i + 1  # a lifetime or label: keep scanning after the quote
                out.append(" ")
                i = j
                continue
            out.append(keep_newlines(text[i:j]))
            i = j
        else:
            out.append(ch)
            i += 1
    return "".join(out)


RUST_FLOAT_TYPE = re.compile(r"\bf(?:32|64)\b")
RUST_NUMBER = re.compile(r"(?<![\w.])(\d\w*)(\.\d\w*|\.(?![.\w]))?")
RUST_INT = re.compile(r"(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|\d[\d_]*)(?:_?[iu](?:8|16|32|64|128|size))?$")


def rust_hits(path):
    with open(path, "r", encoding="utf-8") as f:
        code = blank_rust(f.read())
    hits = []
    rel = os.path.relpath(path, HERE)
    for no, line in enumerate(code.split("\n"), 1):
        for m in RUST_FLOAT_TYPE.finditer(line):
            hits.append("%s:%d: %s" % (rel, no, m.group(0)))
        for m in RUST_NUMBER.finditer(line):
            head, frac = m.group(1), m.group(2)
            exp_sign = re.match(r"[+-]\d", line[m.end():]) and head[-1:] in "eE"
            if frac or exp_sign or not RUST_INT.match(head):
                hits.append("%s:%d: float literal %r" % (rel, no, m.group(0)))
    return hits


def files(dirs, ext):
    for d in dirs:
        for root, subdirs, names in os.walk(os.path.join(HERE, d)):
            subdirs.sort()
            for name in sorted(names):
                if name.endswith(ext):
                    yield os.path.join(root, name)


def main():
    py = list(files(["tools"], ".py"))
    rs = list(files(["src", "tests", "examples"], ".rs"))
    hits = []
    for p in py:
        hits += python_hits(p)
    for p in rs:
        hits += rust_hits(p)
    for h in hits:
        print("INTEGER_ONLY|FAIL|%s" % h)
    print("INTEGER_ONLY|python_files=%d|rust_files=%d|hits=%d|%s" % (
        len(py), len(rs), len(hits), "OK" if not hits else "FAIL"))
    return 0 if not hits else 1


if __name__ == "__main__":
    sys.exit(main())
