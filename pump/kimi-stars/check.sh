#!/usr/bin/env bash
# Runs the checks of the pump-kimi-stars CI jobs. Usage: pump/kimi-stars/check.sh [main|cold|parity]
#   main    upstream pins, fmt, clippy, tests, the pump binary against the stored bytes, no float
#           in the Rust lane
#   cold    cold lane (PYTHON=<python with numpy 2.5.4>, default python3): the owner's two
#           generators run unmodified on the owner's seeds and every output is compared with the
#           Rust pump's; needs about 420 MB of temporary space and keeps 2 GiB free
#   parity  cold lane on the 10 synthetic seeds of tools/make_seeds.py, same comparison (one
#           seed, below 81 bytes, is refused by both programs with no file written)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

case "${1:-main}" in
  main)
    sha256sum -c --quiet UPSTREAM.sha256
    cargo +1.81.0 fmt --check
    cargo +1.81.0 clippy --locked --all-targets -- -D warnings
    cargo +1.81.0 test --locked
    out="$(mktemp -d)"
    trap 'rm -rf "$out"' EXIT
    usim=vendor/universe-simulator
    cargo +1.81.0 run --quiet --release --locked -- stars-shells "$usim/key/MYTHOS-SELF-EMISSION.txt" "$out" \
      | cmp - "$usim/receipts/FABLE5-STARS-SHELLS.hbp"
    cargo +1.81.0 run --quiet --release --locked -- kimi-k3 "$usim/key/KIMI-K3-STAR.txt" "$out" \
      | cmp - "$usim/receipts/FABLE5-KIMI-K3-STAR.hbp"
    for f in FABLE5-STARS-SHELLS.hbp FABLE5-STARS-SHELLS.hbp.sha256 FABLE5-KIMI-K3-STAR.hbp FABLE5-KIMI-K3-STAR.hbp.sha256; do
      cmp "$out/$f" "$usim/receipts/$f"
    done
    cmp "$out/ASOLARIA-STARS-SHELLS.gguf.sha256" "$usim/gguf/stars/ASOLARIA-STARS-SHELLS.gguf.sha256"
    cmp "$out/KIMI-K3-STAR-256.gguf.sha256" "$usim/gguf/stars/KIMI-K3-STAR-256.gguf.sha256"
    (cd "$out" && sha256sum -c --quiet ASOLARIA-STARS-SHELLS.gguf.sha256 KIMI-K3-STAR-256.gguf.sha256)
    [ "$(stat -c %s "$out/KIMI-K3-STAR-256.gguf")" = "$(sed -n 's/^size //p' "$usim/gguf/stars/KIMI-K3-STAR-256.gguf")" ]
    rm -f "$out/KIMI-K3-STAR-256.gguf"
    if grep -rnE '\bf32\b|\bf64\b|as f[0-9]' src/ tests/; then exit 1; fi
    ;;
  cold)
    work="$(mktemp -d)"
    trap 'rm -rf "$work"' EXIT
    tools/cold-lane.sh "$work/cold"
    ;;
  parity)
    work="$(mktemp -d)"
    trap 'rm -rf "$work"' EXIT
    tools/parity.sh "$work/parity"
    ;;
  *)
    echo "usage: pump/kimi-stars/check.sh [main|cold|parity]" >&2
    exit 2
    ;;
esac
