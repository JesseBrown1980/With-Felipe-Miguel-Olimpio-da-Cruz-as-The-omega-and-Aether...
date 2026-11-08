#!/usr/bin/env bash
# Checks for gguf/codex/tools (needs python3 >= 3.11, stdlib only). Usage: gguf/codex/tools/check.sh
#   pins     every file listed in SHA256SUMS
#   tests    tests/test_gguf_meta.py (4,104 repr vectors and the float-kv fixture)
#   commands check_commands.py (../CODEX-COMMANDS.hbp against the manifest and the tree)
#   no float the repository's pattern, then an integer-rule scan of every .py here: no true
#            division, no float literal, no float/complex/math/decimal name, no struct float format
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
sha256sum -c --quiet SHA256SUMS
python3 -I tests/test_gguf_meta.py
python3 -I check_commands.py
if grep -rnE '\bf32\b|\bf64\b|as f[0-9]' . ; then exit 1; fi
python3 -I - ./*.py tests/*.py <<'EOF'
import io, re, sys, tokenize
names = {"float", "complex", "math", "cmath", "decimal", "statistics", "truediv", "fsum", "numpy"}
found = 0
for path in sys.argv[1:]:
    with open(path, encoding="utf-8") as f:
        toks = list(tokenize.generate_tokens(io.StringIO(f.read()).readline))
    for t in toks:
        why = None
        if t.type == tokenize.OP and t.string in ("/", "/="):
            why = "true division"
        elif t.type == tokenize.NUMBER and not t.string.lower().startswith(("0x", "0o", "0b")) \
                and re.search(r"[.eEjJ]", t.string):
            why = "float literal"
        elif t.type == tokenize.NAME and t.string in names:
            why = "float name"
        elif t.type == tokenize.STRING and re.search(r"^[rb]*['\"][<>=!@][0-9xcbB?hHiIlLqQnNspP]*[efd]", t.string):
            why = "struct float format"
        if why:
            found += 1
            print(f"{path}:{t.start[0]}: {why}: {t.string}")
print(f"INTEGER_RULE|files={len(sys.argv) - 1}|findings={found}|json=0")
sys.exit(1 if found else 0)
EOF
