#!/usr/bin/env bash
# Build and test every Asolaria Aether layer as CI (.github/workflows/gate.yml) does.
# Usage: scripts/check-all.sh [--no-eval]
#   --no-eval  skip the Python Q-PRISM/N-Nest eval gate (it needs numpy/scipy/pytest)
# Needs: rustup with toolchain 1.81.0 (+clippy), python3 >= 3.11, curl, git, node >= 18 (time/ and
# eval/ only). Every job body runs under set -euo pipefail, so any failing command fails its job.
# ASOLARIA_TORCH_PYTHON=<python with torch 2.14.1+cpu, torch_geometric 2.8.1> runs the L0 torch
# parity check; without it that check prints SKIP.
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

job python-slices bash -c 'set -euo pipefail
  python3 prime_cylinder_expansion.py
  python3 slice_glyph_messaging.py'

job tribit-kernel bash -c 'set -euo pipefail
  cd kernel/tribit
  cargo +1.81.0 fmt --check
  cargo +1.81.0 clippy --all-targets -- -D warnings
  cargo +1.81.0 test
  ! grep -rnE "\bf32\b|\bf64\b|as f[0-9]" src/'

job behcs1024-kernel bash -c 'set -euo pipefail
  cd kernel/behcs1024-60d
  sha256sum -c UPSTREAM.sha256
  hwinv="$(mktemp)"
  curl -fsSL -o "$hwinv" https://raw.githubusercontent.com/JesseBrown1980/asolaria-federation-1024/dc1da1a9cd88b77eb463053312b7c42a7dbe9b33/kernel/boot/src/hwinv.rs
  test "$(git hash-object "$hwinv")" = d08bc2a9ba6f3b63fec5249f0670d68c8df744d4
  sed -n "99,101p" "$hwinv" | cmp - src/upstream/hwinv-tuple-cap.rs
  sed -n "147,262p" "$hwinv" | cmp - src/upstream/hwinv-sha256-project-60d.rs
  rm -f "$hwinv"
  cargo +1.81.0 clippy --locked --all-targets -- -D warnings
  cargo +1.81.0 test --locked
  cargo +1.81.0 build -q --bin behcs60-demo
  python3 -I independent_referee.py "${CARGO_TARGET_DIR:-target}/debug/behcs60-demo"
  ! grep -rnE "\bf32\b|\bf64\b|as f[0-9]" src/'

job qprism-representation bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  cd qprism/representation
  sha256sum -c UPSTREAM.sha256
  rust qprism/representation
  no_float rust-qprism-181/src/"

job qprism-recovery bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  cd qprism/recovery/omega
  sha256sum -c UPSTREAM.sha256
  rust qprism/recovery/omega \
    -A clippy::unusual_byte_groupings -A clippy::derivable_impls -A clippy::needless_range_loop
  no_float omega-path123-v0/ omega-operator-catalog-v0/"

job omega-operator-catalog bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  cd qprism/recovery/catalog
  sha256sum -c UPSTREAM.sha256
  cmp omega_operator_catalog.rs ../omega/omega-operator-catalog-v0/omega_operator_catalog.rs
  rust qprism/recovery/catalog -A clippy::unusual_byte_groupings
  no_float omega_operator_catalog.rs"

job qprism-throat bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  rust qprism/recovery/throat
  no_float src/"

job time-evolution bash -c 'set -euo pipefail
  cd time
  python3 test_three_seat_ci.py
  rm -f three-seat-ci-only-result.json'

if [ "$RUN_EVAL" = 1 ]; then
  job qprism-eval-watchers bash -c 'set -euo pipefail
    python3 -m venv .check-venv
    .check-venv/bin/python -m pip install -q -r eval/vendor/qprism-control/requirements.txt
    .check-venv/bin/python eval/vendor_gate.py
    rm -rf eval/artifacts eval/vendor/nnest/data'
else
  skipped+=(qprism-eval-watchers)
fi

job fischer-gate bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  cd gate/fischer-eval
  sha256sum -c Cargo.toml.sha256
  (cd src && sha256sum -c lib.rs.sha256)
  rust gate/fischer-eval
  cargo +1.81.0 run --locked -q -- --once
  no_float src/"

job hookwall-gate bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  rust gate/hookwall -A clippy::identity_op -A clippy::manual_range_contains
  no_float src/"

job verdict-compose bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  rust gate/verdict
  no_float src/"

job verify-schedule bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  cd proposals/verify-schedule
  sha256sum -c schedule.rs.sha256
  rust proposals/verify-schedule
  no_float schedule.rs"

job gnn-int bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  rust model/gnn-int
  no_float src/ tests/"

job l0-edge bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  cd model/l0-edge
  sha256sum -c UPSTREAM.sha256
  rust model/l0-edge
  python3 -I tools/make_fixture.py --check
  python3 -I tools/quantize.py --check
  python3 -I tools/features_referee.py --check
  python3 -I tools/jsnum_referee.py --check
  python3 -I tools/jsnum_referee.py --grid | cargo +1.81.0 run --locked -q --release --example jsnum_grid
  no_float src/ tests/ examples/"

if [ -n "${ASOLARIA_TORCH_PYTHON:-}" ]; then
  job l0-torch-parity bash -c 'set -euo pipefail
    cd model/l0-edge
    "$ASOLARIA_TORCH_PYTHON" -I tools/model_parity.py --check'
else
  printf '\n=== l0-torch-parity ===\n'
  echo "SKIP l0-torch-parity: set ASOLARIA_TORCH_PYTHON to a python with torch 2.14.1+cpu and torch_geometric 2.8.1"
  skipped+=(l0-torch-parity)
fi

job observed bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
  rust gate/observed
  python3 -I tools/score_referee.py --check
  no_float src/ tests/"

if [ -d cli ]; then
  job asolaria-cli bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'
    rust cli
    root=\$(mktemp -d)
    cargo +1.81.0 install --locked --path . --root \"\$root\"
    \"\$root/bin/asolaria\" gate examples/envelope.hbp
    status=0
    \"\$root/bin/asolaria\" observe --events ../model/l0-edge/tests/fixtures/events.hbp examples/observe-envelope.hbp || status=\$?
    test \"\$status\" -eq 3
    rm -rf \"\$root\"
    no_float src/ tests/"
fi

printf '\n=== summary ===\n'
printf 'PASS  %s\n' "${passed[@]}"
[ "${#skipped[@]}" -gt 0 ] && printf 'SKIP  %s\n' "${skipped[@]}"
[ "${#failed[@]}" -gt 0 ] && printf 'FAIL  %s\n' "${failed[@]}"
printf 'CHECK_ALL|passed=%d|failed=%d|skipped=%d|json=0\n' "${#passed[@]}" "${#failed[@]}" "${#skipped[@]}"
[ "${#failed[@]}" -eq 0 ]
