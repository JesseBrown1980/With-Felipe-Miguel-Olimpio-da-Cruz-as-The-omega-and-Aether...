#!/usr/bin/env bash
# Runs the checks of the qr/qr-read-int CI jobs. Usage: qr/qr-read-int/check.sh [main|page]
#   main  the owner's page the tables come from is the pinned one, the generated tables equal
#         what the page's lines give, fmt, clippy, tests (unit, symbols, page parity against
#         tests/fixtures/JSQR-PAGE.hbp, no float literal in any .rs file), no normal
#         dependencies, no float type name or cast in this crate's text
#   page  cold lane: the owner's page re-reads the corpus in headless Chromium and must give
#         tests/fixtures/JSQR-PAGE.hbp again, row for row
#         (PYTHON=<python with playwright>, default python3; CHROMIUM=<chrome binary> optional)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
page=../colour-qr/vendor/the-colour-qr/index.html

case "${1:-main}" in
  main)
    echo "7b9a0830aa01efe770c8b69a4c5712069fba3a82eab7c00ab4dc2392379d573a  $page" | sha256sum -c --quiet
    cargo +1.81.0 fmt --check
    cargo +1.81.0 clippy --locked --all-targets -- -D warnings
    cargo +1.81.0 test --locked
    cargo +1.81.0 run --quiet --locked --example gen_tables -- "$page" --check
    # The reader has no dependencies: one line, the crate itself.
    test "$(cargo +1.81.0 tree --locked -e normal --prefix none | wc -l)" -eq 1
    # No float type name or cast in this crate's text files (code, tests, tools, data, docs);
    # tests/no_float_literal.rs, run above, finds any float literal in the .rs files.
    if grep -rnIE --exclude-dir=target '\bf32\b|\bf64\b|as f[0-9]' .; then exit 1; fi
    ;;
  page)
    py="${PYTHON:-python3}"
    corpus="$(mktemp -d)"
    trap 'rm -rf "$corpus"' EXIT
    cargo +1.81.0 run --quiet --release --locked --example corpus -- "$corpus" >/dev/null
    set -- --corpus "$corpus" --check tests/fixtures/JSQR-PAGE.hbp
    if [ -n "${CHROMIUM:-}" ]; then
      set -- "$@" --chromium "$CHROMIUM"
    fi
    "$py" -I -B tools/jsqr_page.py "$@"
    ;;
  *)
    echo "usage: qr/qr-read-int/check.sh [main|page]" >&2
    exit 2
    ;;
esac
