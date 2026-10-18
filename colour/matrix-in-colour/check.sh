#!/usr/bin/env bash
# Runs the checks of colour/matrix-in-colour. Usage: colour/matrix-in-colour/check.sh [main|python]
#   main    upstream pins, the vendored sidecars, fmt, clippy, tests, the verify-frames binary
#           against the recorded Python output, no float in this crate's own .rs files
#   python  cold lane (PYTHON=<python with Pillow>, default python3): the vendored
#           verify-frames.py, unmodified, over copies of the frames; its output must equal the
#           recorded output and the Rust binary's
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

case "${1:-main}" in
  main)
    sha256sum -c --quiet UPSTREAM.sha256
    (cd vendor/asolaria-matrix-in-colour && for s in $(find . -name '*.sha256'); do
      (cd "$(dirname "$s")" && sha256sum -c --quiet "$(basename "$s")"); done)
    cargo +1.81.0 fmt --check
    cargo +1.81.0 clippy --locked --all-targets -- -D warnings
    cargo +1.81.0 test --locked
    cargo +1.81.0 run --quiet --release --locked --bin verify-frames \
      | cmp - tests/fixtures/verify-frames.python.out
    if grep -rnE --include='*.rs' '\bf32\b|\bf64\b|as f[0-9]' src/ tests/ examples/; then exit 1; fi
    ;;
  python)
    py="${PYTHON:-python3}"
    work="$(mktemp -d)"
    trap 'rm -rf "$work"' EXIT
    # verify-frames.py:20 REPO = r"C:\tmp\scout-rooms-20261008\repo". Off Windows that is one
    # relative directory name, so the script runs unmodified from a directory that holds it.
    repo="$work/run/C:\\tmp\\scout-rooms-20261008\\repo"
    mkdir -p "$repo/frames" "$work/script"
    cp vendor/asolaria-matrix-in-colour/frames/*.png "$repo/frames/"
    cp vendor/asolaria-matrix-in-colour/verify-frames.py "$work/script/"
    (cd "$work/run" && "$py" -I -B "$work/script/verify-frames.py") >"$work/python.out"
    cmp "$work/python.out" tests/fixtures/verify-frames.python.out
    cargo +1.81.0 run --quiet --release --locked --bin verify-frames | cmp - "$work/python.out"
    ;;
  *)
    echo "usage: colour/matrix-in-colour/check.sh [main|python]" >&2
    exit 2
    ;;
esac
