#!/usr/bin/env bash
# The ladder-rungs checks: the upstream extracts, fmt, clippy -D warnings, the 4 tests, no float, and
# the printed ladder rows against ../dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp lines 7-24, byte for byte.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

sed -n '92,98p' ../dbbh-dbwh/src/lib.rs | cmp - src/upstream/hex.rs
sed -n '394,424p' ../dbbh-dbwh/src/lib.rs | cmp - src/upstream/symbols.rs
cargo +1.81.0 fmt --check
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
test "$(cargo +1.81.0 test --locked -- --list 2>/dev/null | grep -c ': test$')" = 4
cargo +1.81.0 test --locked
if grep -rnE '\bf32\b|\bf64\b|as f[0-9]' src/; then exit 1; fi

out=$(cargo +1.81.0 test --locked metatag_ladder -- --nocapture --test-threads=1 2>/dev/null)
rows=$(grep -oE '(RUNG|LADDER|WIDE-LADDER)\|.*\|json=0$' <<<"$out")
diff <(grep -v '^WIDE-LADDER|' <<<"$rows"; grep '^WIDE-LADDER|' <<<"$rows") \
  <(sed -n '7,24p' ../dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp)
echo "LADDER_RUNGS_CHECK|tests=4|receipt_rows=18|receipt_lines=7-24|equal=1|json=0"
