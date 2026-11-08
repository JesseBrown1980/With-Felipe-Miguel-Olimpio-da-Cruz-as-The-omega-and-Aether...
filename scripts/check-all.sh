#!/usr/bin/env bash
# Build and test every Asolaria Aether layer as CI (.github/workflows/gate.yml) does.
# Usage: scripts/check-all.sh [--no-eval]
#   --no-eval  skip the Python Q-PRISM/N-Nest eval gate (it needs numpy/scipy/pytest)
# Needs: rustup with toolchain 1.81.0 (+clippy), python3 >= 3.11, curl, git, node >= 18 (time/ and
# eval/ only). Every job body runs under set -euo pipefail, so a failing command fails its job, but
# set -e does not stop on a check negated with ! or placed before the last command of an && / || list:
# such a check must be the job's last command, or a command of its own.
# ASOLARIA_TORCH_PYTHON=<python with torch 2.14.1+cpu, torch_geometric 2.8.1> runs the L0 torch
# parity check; without it that check prints SKIP. The per-crate jobs of .github/workflows/crates.yml
# are not run here.
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
  no_float omega-path123-v0/ omega-operator-catalog-v0/"'
  grep -q "source_sha256=$(sha256sum omega-path123-v0/omega_path123.rs | cut -c1-64)|" vectors/OMEGA-PATH123-COMPONENT.hbp
  grep -q "|sha256=$(sha256sum omega-operator-catalog-v0/omega_operator_catalog.rs | cut -c1-64)|" vectors/OMEGA-PATH123-COMPONENT.hbp
  grep -q "|tests=35of35_PASS|" vectors/OMEGA-PATH123-COMPONENT.hbp
  test "$(cargo +1.81.0 test --locked --lib -- --list 2>/dev/null | grep -c ": test$")" = 35'

job omega-codecs bash -c "set -euo pipefail; $(declare -f rust no_float); ROOT='$ROOT'"'
  cd qprism/recovery-omega-codecs
  sha256sum -c UPSTREAM.sha256
  cmp omega-operator-catalog-v0/omega_operator_catalog.rs ../recovery/catalog/omega_operator_catalog.rs
  rust qprism/recovery-omega-codecs -A dead_code -A clippy::unusual_byte_groupings \
    -A clippy::needless_range_loop -A clippy::unnecessary_to_owned
  test "$(cargo +1.81.0 test --locked --bin omega_floor_codec_v0 -- --list 2>/dev/null | grep -c ": test$")" = 11
  test "$(cargo +1.81.0 test --locked --bin omega_hyper_codec_v0 -- --list 2>/dev/null | grep -c ": test$")" = 34
  cargo +1.81.0 build -q --locked --release
  T="${CARGO_TARGET_DIR:-target}/release"
  diff <("$T/omega_floor_codec_v0" self-test) <(grep "^SELFTEST|" vectors/OMEGA-FLOOR-CODEC-V0-VERIFY.hbp)
  test "$("$T/omega_hyper_codec_v0" self-test)" = "AOCWMSELFTEST|ok=1|grammar=AOCWM001+STG1|floors=64,256,1024,4096|directions_per_floor=40|raw=PASS|path3_hook=PASS|path123=PENDING|whole_monty=0|json=0|"
  no_float omega-floor-codec-v0/ omega-hyper-codec-integration-v0/ omega-operator-catalog-v0/'

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

# As in CI, the Host8 rooms crate builds outside the delivered folder unless CARGO_TARGET_DIR is set.
job host8-rooms bash -c 'set -euo pipefail
  cd docs/handoffs/acer-host8-rooms-guide-2026-10-19/host8rooms
  tmp="$(mktemp -d)"
  trap "rm -rf \"$tmp\"" EXIT
  export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$tmp/host8rooms-target}"
  (cd .. && sha256sum -c --quiet SHA256SUMS)
  sha256sum -c TRIBIT.sha256
  cmp src/tribit/mod.rs ../../acer-tribit-mod-rs-fb7e786-2026-10-18/kernel/core/src/tribit/mod.rs
  tail -n +8 ../../../../kernel/tribit/src/lib.rs | cmp - src/tribit/mod.rs
  cargo +1.81.0 fmt --check
  cargo +1.81.0 clippy --locked --all-targets -- -D warnings
  cargo +1.81.0 test --locked
  cargo +1.81.0 build --release --locked
  bin="$(cd "$CARGO_TARGET_DIR" && pwd)/release/host8rooms"
  t="$tmp/reseal"
  mkdir -p "$t"
  for r in MAKE:b6b64a02864356f9 VERIFY:cc391c49c90ee068 PROBE:f06366a0e0002d2e; do
    name="${r%%:*}"; prior="${r##*:}"
    cp "../receipts/ROOMS-$name.hbp" "$t/"
    (cd "$t" && "$bin" seal "ROOMS-$name.hbp" "$prior" > "SEAL-$name.hbp")
    for f in "SEAL-$name.hbp" "ROOMS-$name.hbp.hbi" "ROOMS-$name.hbp.sha256" "ROOMS-$name.hbp.hbi.sha256"; do
      cmp "$t/$f" "../receipts/$f"
    done
  done
  ! grep -rnE "\bf32\b|\bf64\b|as f[0-9]" src/'

job canon-archive bash -c 'set -euo pipefail
  cube=docs/handoffs/FABLE5-BROWN-HILBERT-PASS-2026-10-18.hbp
  (cd docs/handoffs && sha256sum -c FABLE5-BROWN-HILBERT-PASS-2026-10-18.hbp.sha256)
  ok=0; total=0; sum=0
  while IFS= read -r row; do
    arc=$(sed -n "s/.*|arc=\([^|]*\)|.*/\1/p" <<<"$row")
    want_b=$(sed -n "s/.*|bytes=\([0-9]*\)|.*/\1/p" <<<"$row")
    want_s=$(sed -n "s/.*|sha256=\([0-9a-f]*\)|.*/\1/p" <<<"$row")
    case "$arc" in
      */CLAUDE.md|*/AGENTS.md|*/CODEX.md) p="canon-archive/${arc%.md}.archived.md" ;;
      *) p="canon-archive/$arc" ;;
    esac
    total=$((total+1))
    got_b=$(wc -c < "$p"); got_s=$(sha256sum "$p" | cut -d" " -f1); sum=$((sum+got_b))
    if [ "$got_b" = "$want_b" ] && [ "$got_s" = "$want_s" ]; then ok=$((ok+1)); else echo "FAIL $p"; fi
  done < <(grep "^FILE|" "$cube")
  echo "canon-archive pins: $ok/$total, $sum bytes"
  [ "$ok" = 46 ]
  [ "$total" = 46 ]
  [ "$sum" = 213855 ]
  (cd docs/handoffs/acer-zero-portal-update-2026-10-19 && sha256sum -c --quiet SHA256SUMS)'

printf '\n=== summary ===\n'
printf 'PASS  %s\n' "${passed[@]}"
[ "${#skipped[@]}" -gt 0 ] && printf 'SKIP  %s\n' "${skipped[@]}"
[ "${#failed[@]}" -gt 0 ] && printf 'FAIL  %s\n' "${failed[@]}"
printf 'CHECK_ALL|passed=%d|failed=%d|skipped=%d|json=0\n' "${#passed[@]}" "${#failed[@]}" "${#skipped[@]}"
[ "${#failed[@]}" -eq 0 ]
