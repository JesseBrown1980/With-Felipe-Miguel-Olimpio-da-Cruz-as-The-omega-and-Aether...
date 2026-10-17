#!/usr/bin/env bash
# Runs the checks of the colour/ CI jobs. Usage: colour/check.sh [main|rainbow27|numpy]
#   main       upstream pins, fmt, clippy, tests, stdlib referee, Rust outputs against the upstream
#              bytes, no float in the Rust lane
#   rainbow27  the vendored rainbow27-check crate, with the steps of its upstream workflow
#              (S2M .github/workflows/claude-verify-alphacen-gguf.yml:52-72) plus fmt
#   numpy      cold lane (PYTHON=<python with numpy>, default python3): numpy parity and the
#              vendored generators run unmodified; needs about 0.6 GB of temporary space
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

case "${1:-main}" in
  main)
    sha256sum -c --quiet UPSTREAM.sha256
    cargo +1.81.0 fmt --check
    cargo +1.81.0 clippy --locked --all-targets -- -D warnings
    cargo +1.81.0 test --locked
    python3 -I -B referee/colour_referee.py --check
    out="$(mktemp -d)"
    trap 'rm -rf "$out"' EXIT
    cargo +1.81.0 run --quiet --release --locked --example emit -- stars "$out"
    cmp "$out/FABLE5-STARS-SHELLS.hbp" vendor/universe-simulator/receipts/FABLE5-STARS-SHELLS.hbp
    echo "ae23392ad473718e2196e525a4355af20cdbd57bbb5dc3e85a8719b62552784d  $out/ASOLARIA-STARS-SHELLS.gguf" \
      | sha256sum -c --quiet
    cargo +1.81.0 run --quiet --release --locked --example emit -- rainbow27-v2 "$out/rainbow27-v2.hbp"
    echo "8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672  $out/rainbow27-v2.hbp" \
      | sha256sum -c --quiet
    cargo +1.81.0 run --quiet --release --locked --example emit -- colorpid-domain \
      | grep -qxF -f - tests/fixtures/colorpid.hbp
    if grep -rnE '\bf32\b|\bf64\b|as f[0-9]' src/ tests/ examples/; then exit 1; fi
    ;;
  rainbow27)
    cd vendor/rainbow27-check
    sha256sum -c --quiet Cargo.lock.sha256 Cargo.toml.sha256 EXPECTED-OUTPUT.hbp.sha256 rust-toolchain.toml.sha256
    (cd src && sha256sum -c --quiet main.rs.sha256)
    if grep -rnE '\bf32\b|\bf64\b|as f[0-9]' src; then exit 1; fi
    cargo +1.81.0 fmt --check
    cargo +1.81.0 clippy --locked --all-targets -- -D warnings
    cargo +1.81.0 test --locked
    cargo +1.81.0 build --locked --release
    cargo +1.81.0 run --quiet --locked --release | cmp - EXPECTED-OUTPUT.hbp
    ;;
  numpy)
    py="${PYTHON:-python3}"
    "$py" -I -B tools/cold_lane.py parity
    work="$(mktemp -d)"
    trap 'rm -rf "$work"' EXIT
    "$py" -I -B tools/cold_lane.py regenerate "$work/cold"
    ;;
  *)
    echo "usage: colour/check.sh [main|rainbow27|numpy]" >&2
    exit 2
    ;;
esac
