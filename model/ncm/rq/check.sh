#!/usr/bin/env bash
# Gates for model/ncm/rq: rustfmt --check, clippy -D warnings, the D1/D2 count tests, and a proof
# that the crate's own sources carry no floating point. Usage: model/ncm/rq/check.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

cargo +1.81.0 fmt --check
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
if grep -rnE '\bf32\b|\bf64\b|as f[0-9]' src/ tests/ examples/; then
  echo "FLOAT|found in src/, tests/ or examples/|json=0"
  exit 1
fi
echo "NCM-RQ|fmt=PASS|clippy=PASS|test=PASS|no_float=PASS|json=0"
