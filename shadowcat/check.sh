#!/usr/bin/env bash
# Runs the shadowcat checks. Usage: shadowcat/check.sh [main|opt0]
#   main  owner-file pins, rustfmt on this crate's own .rs files, clippy, tests, then every row of
#         tests/fixtures/REPRODUCE.hbp again from the --release binaries with coreutils sha256sum
#         and cmp, and no float in this crate's own .rs files
#   opt0  callingchain built at opt-level 0: the one-ULP change in callingchain.hbp tag 0x30
#         and the trailer and stdout line it moves, as REPRODUCE.hbp row SCOPT0 records
# The owner's five .rs files are not in rustfmt layout and are kept byte-identical, so
# `cargo fmt --check` is not run here (README.md, "Gates").
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

field() { sed -nE "s/.*\|$1=([^|]*)\|.*/\1/p" <<<"$2"; }
hex32() { od -An -tx1 -v | tr -d ' \n'; }

case "${1:-main}" in
  main)
    sha256sum -c --quiet UPSTREAM.sha256
    rustfmt +1.81.0 --check --edition 2021 tests/*.rs
    cargo +1.81.0 clippy --locked --all-targets -- -D warnings
    cargo +1.81.0 test --locked
    cargo +1.81.0 build --quiet --locked --release
    bin="$(cd "${CARGO_TARGET_DIR:-target}" && pwd)/release"
    run="$(mktemp -d)"
    trap 'rm -rf "$run"' EXIT
    mkdir "$run/threegap" "$run/verify" "$run/callingchain" "$run/shadowcat"
    "$bin/threegap" >"$run/threegap/stdout"
    "$bin/verify" >"$run/verify/stdout"
    (cd "$run/callingchain" && "$bin/callingchain" >stdout)
    sh tools/horizon.sh "$bin/shadowcat" "$run/shadowcat"
    grep '^SCREP|' tests/fixtures/REPRODUCE.hbp | while IFS= read -r row; do
      name="$(field bin "$row")"
      path="$(field path "$row")"
      case "$path" in
        /root/_horizon/shadowcat/out/*) f="$run/$name/$(basename "$path")" ;;
        *) f="$run/$name/$path" ;;
      esac
      test "$(wc -c <"$f")" = "$(field bytes "$row")"
      echo "$(field sha256 "$row")  $f" | sha256sum -c --quiet
      lines="$(field lines "$row")"
      if [ -n "$lines" ]; then test "$(wc -l <"$f")" = "$lines"; fi
      equals="$(field equals "$row")"
      if [ -n "$equals" ]; then cmp "$f" "$equals"; fi
      trailer="$(field trailer "$row")"
      if [ -n "$trailer" ]; then
        test "$(tail -c 32 "$f" | hex32)" = "$trailer"
        test "$(head -c -32 "$f" | sha256sum | cut -c1-64)" = "$trailer"
      fi
      echo "SCREP|bin=$name|path=$path|expected_from=$(field expected_from "$row")|match=1|json=0"
    done
    if grep -rnE --include='*.rs' '\bf32\b|\bf64\b|as f[0-9]' tests/ parity/; then exit 1; fi
    ;;
  opt0)
    work="$(mktemp -d)"
    trap 'rm -rf "$work"' EXIT
    CARGO_TARGET_DIR="$work/target" cargo +1.81.0 build --quiet --locked --release --bin callingchain
    CARGO_TARGET_DIR="$work/target" CARGO_PROFILE_DEV_OPT_LEVEL=0 \
      cargo +1.81.0 build --quiet --locked --bin callingchain
    mkdir -p "$work/opt3" "$work/opt0"
    (cd "$work/opt3" && "$work/target/release/callingchain" >stdout)
    (cd "$work/opt0" && "$work/target/debug/callingchain" >stdout)
    row="$(grep '^SCOPT0|' tests/fixtures/REPRODUCE.hbp)"
    hbp0="$work/opt0/out/callingchain.hbp"
    hbp3="$work/opt3/out/callingchain.hbp"
    test "$(wc -c <"$hbp0")" = "$(field bytes "$row")"
    echo "$(field sha256 "$row")  $hbp0" | sha256sum -c --quiet
    test "$(tail -c 32 "$hbp0" | hex32)" = "$(field trailer "$row")"
    # Tag 0x30's 8-byte payload is at offset 94 (12 header + 45 + 6 + 13 + 13 + 5).
    test "$(od -An -tx1 -v -j94 -N8 "$hbp0" | tr -d ' \n')" = "$(field tag30_bits "$row")"
    test "$(od -An -tx1 -v -j94 -N8 "$hbp3" | tr -d ' \n')" = "$(field tag30_bits_opt3 "$row")"
    # Outside the trailer the two files differ in exactly one byte, the last of that payload.
    test "$(head -c -32 "$hbp0" | cmp -l - <(head -c -32 "$hbp3") | awk '{print $1}' | tr '\n' ' ')" = "102 "
    cmp "$work/opt0/out/callingchain.hbi" "$work/opt3/out/callingchain.hbi"
    # stdout differs only in its last line, the printed trailer.
    cmp <(head -n -1 "$work/opt0/stdout") <(head -n -1 "$work/opt3/stdout")
    test "$(tail -n 1 "$work/opt0/stdout")" = "SHA256   $(field trailer "$row")"
    echo "SCOPT0|bin=callingchain|differing_body_bytes=1|at_offset=101|stdout_lines_differing=1|json=0"
    ;;
  *)
    echo "usage: shadowcat/check.sh [main|opt0]" >&2
    exit 2
    ;;
esac
