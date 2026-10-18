"""Static guard: the check scripts contain no float literal, no float(), no math module
other than isqrt, no round(), and no '**' with a non-integer exponent. Every true
division ('/') is listed with its line so it can be read and confirmed to act on a
Fraction (the formatting helpers also assert int/Fraction at run time).

Usage: python3 -I nofloat_lint.py check_*.py
"""
import ast
import sys


def lint(path):
    tree = ast.parse(open(path, encoding="utf-8").read(), path)
    bad, divs = [], []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, (float, complex)):
            bad.append((node.lineno, "float/complex literal %r" % node.value))
        elif isinstance(node, ast.Name) and node.id in ("float", "complex", "round"):
            bad.append((node.lineno, "uses %s" % node.id))
        elif isinstance(node, ast.Import):
            for a in node.names:
                if a.name in ("math", "cmath", "decimal", "statistics", "numpy"):
                    bad.append((node.lineno, "import %s" % a.name))
        elif isinstance(node, ast.ImportFrom):
            if node.module in ("math",) and any(a.name != "isqrt" for a in node.names):
                bad.append((node.lineno, "from math import non-isqrt"))
            if node.module in ("cmath", "decimal", "statistics", "numpy"):
                bad.append((node.lineno, "from %s import" % node.module))
        elif isinstance(node, ast.BinOp) and isinstance(node.op, ast.Pow):
            e = node.right
            if not (isinstance(e, ast.Constant) and isinstance(e.value, int) and e.value >= 0) and not isinstance(e, ast.Name):
                bad.append((node.lineno, "power with non-literal-int exponent"))
        elif isinstance(node, (ast.BinOp, ast.AugAssign)) and isinstance(node.op, ast.Div):
            divs.append(node.lineno)
    return bad, divs


def main():
    total = 0
    for p in sys.argv[1:]:
        bad, divs = lint(p)
        total += len(bad)
        print("%s: %d violations; true divisions at lines %s" % (p.rsplit("/", 1)[-1], len(bad), sorted(set(divs))))
        for ln, msg in bad:
            print("    line %d: %s" % (ln, msg))
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
