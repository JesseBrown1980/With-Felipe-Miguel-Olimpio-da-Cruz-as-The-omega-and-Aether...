"""Check that the expected digests in verify.rs are the standard SHA-256 test vectors.

Usage: python3 -I check_sha_vectors.py verify.rs
verify.rs is read as text only; the reference digests come from hashlib (OpenSSL).
"""
import hashlib
import re
import sys


def main():
    src = open(sys.argv[1], encoding="utf-8").read()
    pairs = re.findall(r'\("([a-z]*)",\s*"([0-9a-f]{64})"\)', src)
    million = re.search(r'let want = "([0-9a-f]{64})"', src).group(1)
    rows = [(m.encode(), d) for m, d in pairs] + [(b"a" * 1000000, million)]
    fails = 0
    for msg, want in rows:
        got = hashlib.sha256(msg).hexdigest()
        ok = got == want
        fails += not ok
        label = (msg[:20].decode() + ("..." if len(msg) > 20 else "")) if msg else "(empty)"
        print("  %-26s %7d bytes  %s" % (label, len(msg), "MATCH" if ok else "DIFF"))
    print("  vectors: %d  FAILS: %d" % (len(rows), fails))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
