#!/usr/bin/env bash
# Cold-lane parity on synthetic seeds: for every seed from tools/make_seeds.py, runs the owner's
# generator (vendored, unmodified, numpy) and the Rust pump, and compares the GGUF, its sidecar,
# the receipt and the receipt's sidecar byte for byte. Each 202,115,456-byte KIMI GGUF pair is
# deleted after the comparison. A kimi seed with no whole 81-byte record is one the owner's
# program does not take (divide_kimi_k3.py:63-65 raises before any output is opened): there both
# programs must exit non-zero and write no file.
#
# Usage: tools/parity.sh <work-dir>      (PYTHON, PUMP as in tools/cold-lane.sh)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
usim="$here/vendor/universe-simulator"
py="${PYTHON:-python3}"
work="${1:?usage: tools/parity.sh <work-dir>}"
mkdir -p "$work"
work="$(cd "$work" && pwd)"
avail_kib="$(df -Pk "$work" | awk 'NR==2 {print $4}')"
if [ "$avail_kib" -lt $(( (2048 + 420) * 1024 )) ]; then
  echo "only ${avail_kib} KiB free under $work" >&2
  exit 2
fi
if [ -z "${PUMP:-}" ]; then
  (cd "$here" && cargo +1.81.0 build --quiet --release --locked)
  PUMP="${CARGO_TARGET_DIR:-$here/target}/release/pump"
fi
"$py" -I "$here/tools/make_seeds.py" "$work/seeds"

ms_now() { date +%s%N; }
pass=0
refused=0
for seed in "$work"/seeds/*.bin; do
  base="$(basename "$seed" .bin)"
  lane="${base%%--*}"
  name="${base#*--}"
  run="$work/$base"
  big="$run/py/D:/asolaria-absorb/kernel-pump"
  off="$run/py/D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
  mkdir -p "$big" "$off" "$run/rust"
  if [ "$lane" = kimi ]; then
    cp "$seed" "$big/KIMI-K3-STAR.txt"
    program=divide_kimi_k3.py
    args=()
    cmd=kimi-k3
    gguf=KIMI-K3-STAR-256.gguf
    receipt=FABLE5-KIMI-K3-STAR.hbp
    py_gguf="$run/py/D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR/gguf/stars/$gguf"
  else
    cp "$seed" "$big/MYTHOS-SELF-EMISSION.txt"
    program=stars_shells.py
    args=(8)
    cmd=stars-shells
    gguf=ASOLARIA-STARS-SHELLS.gguf
    receipt=FABLE5-STARS-SHELLS.hbp
    py_gguf="$big/$gguf"
  fi
  if [ "$lane" = kimi ] && [ "$(stat -c %s "$seed")" -lt 81 ]; then
    py_rc=0
    (cd "$run/py" && "$py" -I "$usim/measurements/$program" >"$run/python.out" 2>"$run/python.err") || py_rc=$?
    rs_rc=0
    "$PUMP" "$cmd" "$seed" "$run/rust" >"$run/rust.out" 2>"$run/rust.err" || rs_rc=$?
    written="$(find "$run/py" "$run/rust" -type f ! -path "$big/*" | wc -l)"
    if [ "$py_rc" = 0 ] || [ "$rs_rc" = 0 ] || [ "$written" != 0 ]; then
      echo "$base: python rc $py_rc, rust rc $rs_rc, files written $written" >&2
      exit 1
    fi
    refused=$((refused + 1))
    echo "PARITY|lane=$lane|k=$name|python_rc=$py_rc|rust_rc=$rs_rc|files_written=0|json=0"
    continue
  fi
  t0="$(ms_now)"
  (cd "$run/py" && "$py" -I "$usim/measurements/$program" "${args[@]}" >"$run/python.out")
  t1="$(ms_now)"
  "$PUMP" "$cmd" "$seed" "$run/rust" >"$run/rust.out"
  t2="$(ms_now)"
  cmp "$py_gguf" "$run/rust/$gguf"
  cmp "$py_gguf.sha256" "$run/rust/$gguf.sha256"
  cmp "$off/$receipt" "$run/rust/$receipt"
  cmp "$off/$receipt.sha256" "$run/rust/$receipt.sha256"
  bytes="$(stat -c %s "$py_gguf")"
  sha="$(cut -d' ' -f1 "$py_gguf.sha256")"
  rm -f "$py_gguf" "$run/rust/$gguf"
  pass=$((pass + 1))
  echo "PARITY|lane=$lane|k=$name|gguf_bytes=$bytes|sha256=$sha|equal_files=4|python_ms=$(( (t1 - t0) / 1000000 ))|rust_ms=$(( (t2 - t1) / 1000000 ))|json=0"
done
echo "PARITY_RUN|PASS=1|seeds=$((pass + refused))|equal=$pass|refused=$refused|json=0"
