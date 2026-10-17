#!/usr/bin/env bash
# Runs the checks of the qr/colour-qr CI jobs. Usage: qr/colour-qr/check.sh [main|page|resample]
#   main      upstream pins, fmt, clippy, tests, the CLI round trip on every fixture, no float
#             in this crate's own .rs files
#   page      cold lane: the vendored index.html in headless Chromium reads every fixture PNG
#             (PYTHON=<python with playwright>, default python3; CHROMIUM=<chrome binary> optional)
#   resample  cold lane record: Rust and the page each read integer-resampled fixture copies
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

case "${1:-main}" in
  main)
    sha256sum -c --quiet UPSTREAM.sha256
    (cd vendor/the-colour-qr && for s in $(find . -name '*.sha256'); do
      (cd "$(dirname "$s")" && sha256sum -c --quiet "$(basename "$s")"); done)
    (cd vendor/universe-simulator/key && for s in *.sha256; do sha256sum -c --quiet "$s"; done)
    cargo +1.81.0 fmt --check
    cargo +1.81.0 clippy --locked --all-targets -- -D warnings
    cargo +1.81.0 test --locked
    out="$(mktemp -d)"
    trap 'rm -rf "$out"' EXIT
    grep '^FIXTURE|' tests/fixtures/FIXTURES.hbp | while IFS= read -r row; do
      payload="$(sed -E 's/.*\|payload=([^|]*)\|.*/\1/' <<<"$row")"
      sha="$(sed -E 's/.*\|sha256=([0-9a-f]{64})\|.*/\1/' <<<"$row")"
      png="$(sed -E 's/.*\|png=([^|]*)\|.*/\1/' <<<"$row")"
      cargo +1.81.0 run --quiet --release --locked --bin colour-qr -- generate "$payload" "$out/gen" >/dev/null
      cmp "$out/gen/$(basename "$png")" "$png"
      cargo +1.81.0 run --quiet --release --locked --bin colour-qr -- ungenerate "$out/back.bin" "$png" \
        | grep -qxE "COLOURQR_OUT\|bytes=[0-9]+\|chunks=2\|contiguous_from_0=2/2\|sha256=$sha\|json=0"
      cmp "$out/back.bin" "$payload"
    done
    if grep -rnE --include='*.rs' '\bf32\b|\bf64\b|as f[0-9]' src/ tests/ examples/; then exit 1; fi
    ;;
  page)
    py="${PYTHON:-python3}"
    if [ -n "${CHROMIUM:-}" ]; then
      "$py" -I -B tools/page_check.py --check --chromium "$CHROMIUM"
    else
      "$py" -I -B tools/page_check.py --check
    fi
    ;;
  resample)
    py="${PYTHON:-python3}"
    cargo +1.81.0 build --quiet --release --locked --bin colour-qr
    bin="$(cd "${CARGO_TARGET_DIR:-target}" && pwd)/release/colour-qr"
    if [ -n "${CHROMIUM:-}" ]; then
      "$py" -I -B tools/resample_check.py --colour-qr "$bin" --chromium "$CHROMIUM"
    else
      "$py" -I -B tools/resample_check.py --colour-qr "$bin"
    fi
    ;;
  *)
    echo "usage: qr/colour-qr/check.sh [main|page|resample]" >&2
    exit 2
    ;;
esac
