#!/usr/bin/env bash
# Build and test every Asolaria Aether layer exactly as CI (.github/workflows/gate.yml) does.
# Usage: scripts/check-all.sh [--no-eval]
#   --no-eval  skip the Python Q-PRISM/N-Nest eval gate (it needs numpy/scipy/pytest)
# Needs: rustup with toolchain 1.81.0 (+clippy), python3 >= 3.11, node >= 18.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
RUN_EVAL=1
[ "${1:-}" = "--no-eval" ] && RUN_EVAL=0

passed=()
failed=()
skipped=()

job() {
  local name="$1"
  shift
  printf '\n=== %s ===\n' "$name"
  if ( set -e; "$@" ); then
    passed+=("$name")
  else
    failed+=("$name")
  fi
}

no_float() {
  ! grep -rnE '\bf32\b|\bf64\b|as f[0-9]' "$@"
}

rust() {
  local dir="$1"
  shift
  cd "$ROOT/$dir"
  cargo +1.81.0 clippy --locked --all-targets -- -D warnings "$@"
  cargo +1.81.0 test --locked
}

if ! rustup toolchain list | grep -q '^1\.81\.0'; then
  echo "Installing Rust 1.81.0 (clippy, rustfmt)..."
  rustup toolchain install 1.81.0 --profile minimal -c clippy -c rustfmt
fi

job python-slices bash -c 'python3 prime_cylinder_expansion.py && python3 slice_glyph_messaging.py'

job tribit-kernel bash -c '
  cd kernel/tribit
  cargo +1.81.0 fmt --check
  cargo +1.81.0 clippy --all-targets -- -D warnings
  cargo +1.81.0 test
  ! grep -rnE "\bf32\b|\bf64\b|as f[0-9]" src/'

job behcs1024-kernel bash -c '
  cd kernel/behcs1024-60d
  sha256sum -c UPSTREAM.sha256
  cargo +1.81.0 clippy --all-targets -- -D warnings
  cargo +1.81.0 test
  cargo +1.81.0 build -q --bin behcs60-demo
  python3 independent_referee.py target/debug/behcs60-demo
  ! grep -rnE "\bf32\b|\bf64\b|as f[0-9]" src/'

job qprism-representation bash -c "$(declare -f rust no_float); ROOT='$ROOT'
  cd qprism/representation && sha256sum -c UPSTREAM.sha256
  rust qprism/representation && no_float rust-qprism-181/src/"

job qprism-recovery bash -c "$(declare -f rust no_float); ROOT='$ROOT'
  cd qprism/recovery/omega && sha256sum -c UPSTREAM.sha256
  rust qprism/recovery/omega \
    -A clippy::unusual_byte_groupings -A clippy::derivable_impls -A clippy::needless_range_loop
  no_float omega-path123-v0/ omega-operator-catalog-v0/"

job omega-operator-catalog bash -c "$(declare -f rust no_float); ROOT='$ROOT'
  cd qprism/recovery/catalog && sha256sum -c UPSTREAM.sha256
  cmp omega_operator_catalog.rs ../omega/omega-operator-catalog-v0/omega_operator_catalog.rs
  rust qprism/recovery/catalog -A clippy::unusual_byte_groupings
  no_float omega_operator_catalog.rs"

job qprism-throat bash -c "$(declare -f rust no_float); ROOT='$ROOT'
  rust qprism/recovery/throat && no_float src/"

job time-evolution bash -c '
  cd time
  python3 test_three_seat_ci.py
  rm -f three-seat-ci-only-result.json'

if [ "$RUN_EVAL" = 1 ]; then
  job qprism-eval-watchers bash -c '
    python3 -m venv .check-venv
    .check-venv/bin/python -m pip install -q -r eval/vendor/qprism-control/requirements.txt
    .check-venv/bin/python eval/vendor_gate.py
    rm -rf eval/artifacts eval/vendor/nnest/data'
else
  skipped+=(qprism-eval-watchers)
fi

job fischer-gate bash -c "$(declare -f rust no_float); ROOT='$ROOT'
  cd gate/fischer-eval
  sha256sum -c Cargo.toml.sha256
  (cd src && sha256sum -c lib.rs.sha256)
  rust gate/fischer-eval
  cargo +1.81.0 run --locked -q -- --once
  no_float src/"

job hookwall-gate bash -c "$(declare -f rust no_float); ROOT='$ROOT'
  rust gate/hookwall -A clippy::identity_op -A clippy::manual_range_contains
  no_float src/"

job verdict-compose bash -c "$(declare -f rust no_float); ROOT='$ROOT'
  rust gate/verdict && no_float src/"

job verify-schedule bash -c "$(declare -f rust no_float); ROOT='$ROOT'
  cd proposals/verify-schedule
  sha256sum -c schedule.rs.sha256
  rust proposals/verify-schedule
  no_float schedule.rs"

job gnn-int bash -c "$(declare -f rust no_float); ROOT='$ROOT'
  rust model/gnn-int && no_float src/ tests/"

if [ -d cli ]; then
  job asolaria-cli bash -c "$(declare -f rust no_float); ROOT='$ROOT'
    rust cli && no_float src/ tests/"
fi

printf '\n=== summary ===\n'
printf 'PASS  %s\n' "${passed[@]}"
[ "${#skipped[@]}" -gt 0 ] && printf 'SKIP  %s\n' "${skipped[@]}"
[ "${#failed[@]}" -gt 0 ] && printf 'FAIL  %s\n' "${failed[@]}"
printf 'CHECK_ALL|passed=%d|failed=%d|skipped=%d|json=0\n' "${#passed[@]}" "${#failed[@]}" "${#skipped[@]}"
[ "${#failed[@]}" -eq 0 ]
