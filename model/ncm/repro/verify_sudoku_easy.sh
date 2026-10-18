#!/usr/bin/env bash
# Certify the five downloaded sudoku/easy files against the manifest rows that
# were verified against the Hugging Face API on 2026-10-18. Safe to run: it only
# hashes bytes, never unpickles. A no-op (skips) for any file not yet present.
set -uo pipefail

ART="${NCM_ART_DIR:-$(cd "$(dirname "$0")" && pwd)/artifacts}"

# path|sha256 (LFS oid) : '-' = non-LFS, certify by git-blob oid + size instead
ROWS=(
  "ckpt/sudoku/easy/generator.pt|1cefebcd1eae0e210b7e991fdce0e86964d0e897e94a3b432d1008ab92d9926e|102560203"
  "ckpt/sudoku/easy/tokenizer.pt|3f9c87e99fd49900929cd650181f55bf00530280416992b11ddc4ea869b39d68|59816209"
  "ckpt/sudoku/easy/config.yaml|-|1980"            # non-LFS; git_oid adef40fc50a296bf598ecf6fee092bc571715c34
  "data/sudoku/easy/puzzles.pickle|403353dd5d11e49d42627aee84c7b1ceb399fda03d01f6210ce78d0e61f2b29d|372063"
  "data/sudoku/easy/solutions.pickle|b52de75f5e4642adca58b18967bcd4bbcafa699c61b21ac33ee0fd7389e0d576|364063"
)
CONFIG_GIT_OID="adef40fc50a296bf598ecf6fee092bc571715c34"

rc=0
present=0
for row in "${ROWS[@]}"; do
  IFS='|' read -r rel want size <<<"$row"
  f="$ART/$rel"
  if [ ! -f "$f" ]; then
    echo "SKIP (absent)  $rel"
    continue
  fi
  present=$((present+1))
  got_size=$(stat -c%s "$f")
  if [ "$got_size" != "$size" ]; then echo "BAD  size   $rel  got=$got_size want=$size"; rc=1; continue; fi
  if [ "$want" = "-" ]; then
    # non-LFS: certify the git blob oid (sha1 of "blob <len>\0" + content)
    got_oid=$(python3 -I -c "import hashlib,sys;b=open(sys.argv[1],'rb').read();print(hashlib.sha1(b'blob %d\0'%len(b)+b).hexdigest())" "$f")
    if [ "$got_oid" = "$CONFIG_GIT_OID" ]; then echo "OK   gitoid $rel"; else echo "BAD  gitoid $rel  got=$got_oid want=$CONFIG_GIT_OID"; rc=1; fi
  else
    got=$(sha256sum "$f" | cut -c1-64)
    if [ "$got" = "$want" ]; then echo "OK   sha256 $rel"; else echo "BAD  sha256 $rel  got=$got want=$want"; rc=1; fi
  fi
done

if [ "$present" = 0 ]; then
  echo "nothing downloaded yet (E=0 held). Run ./download_sudoku_easy.sh first, under the operator's go."
  exit 0
fi
[ "$rc" = 0 ] && echo "ALL VERIFIED ($present/5 present)" || echo "VERIFICATION FAILED"
exit $rc
