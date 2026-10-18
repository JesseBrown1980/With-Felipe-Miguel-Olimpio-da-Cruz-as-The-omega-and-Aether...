#!/usr/bin/env bash
# Cold lane: runs the owner's two generators, vendored unmodified, with numpy (measured with
# numpy 2.5.4), and the Rust pump on the same seeds; compares all eight output files byte for
# byte with each other and with the stored digests; prints wall times in integer milliseconds.
#
# Usage: tools/cold-lane.sh <work-dir>
#   PYTHON=<python with numpy>   default python3
#   PUMP=<path to the pump binary>  default: built with cargo +1.81.0 build --release --locked
#   KIMI_LFS_GGUF=<path>         optional: also cmp against a copy of the stored LFS bytes
# The upstream scripts open fixed paths under D:/ (divide_kimi_k3.py:41-44,154-156,240;
# stars_shells.py:48-50,202,244). On Linux those are relative paths, so the scripts run with the
# fresh work directory as their current directory. Peak disk use is about 420 MB; both
# 202,115,456-byte GGUFs are deleted after they are compared.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
usim="$here/vendor/universe-simulator"
py="${PYTHON:-python3}"
work="${1:?usage: tools/cold-lane.sh <work-dir>}"
if [ -e "$work" ] && [ -n "$(ls -A "$work" 2>/dev/null)" ]; then
  echo "work dir $work is not empty" >&2
  exit 2
fi
mkdir -p "$work"
work="$(cd "$work" && pwd)"

# Keep at least 2 GiB free after the run: need 2 GiB + 420 MiB available now.
avail_kib="$(df -Pk "$work" | awk 'NR==2 {print $4}')"
if [ "$avail_kib" -lt $(( (2048 + 420) * 1024 )) ]; then
  echo "only ${avail_kib} KiB free under $work; need $(( (2048 + 420) * 1024 )) KiB" >&2
  exit 2
fi

big_py="$work/py/D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR/gguf/stars/KIMI-K3-STAR-256.gguf"
big_rs="$work/rust/KIMI-K3-STAR-256.gguf"
trap 'rm -f "$big_py" "$big_rs"' EXIT

if [ -z "${PUMP:-}" ]; then
  (cd "$here" && cargo +1.81.0 build --quiet --release --locked)
  PUMP="${CARGO_TARGET_DIR:-$here/target}/release/pump"
fi

ms_now() { date +%s%N; }
elapsed_ms() { echo $(( ($2 - $1) / 1000000 )); }

# ---- Python (owner's programs, unmodified) ----
big="$work/py/D:/asolaria-absorb/kernel-pump"
off="$work/py/D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
mkdir -p "$big" "$off"
cp "$usim/key/MYTHOS-SELF-EMISSION.txt" "$usim/key/KIMI-K3-STAR.txt" "$big/"
"$py" -I -c 'import numpy, sys; print("PYTHON|version=" + sys.version.split()[0] + "|numpy=" + numpy.__version__ + "|json=0")'

t0="$(ms_now)"
(cd "$work/py" && "$py" -I "$usim/measurements/stars_shells.py" 8 >"$work/stars_shells.out")
t1="$(ms_now)"
py_stars_ms="$(elapsed_ms "$t0" "$t1")"

t0="$(ms_now)"
(cd "$work/py" && "$py" -I "$usim/measurements/divide_kimi_k3.py" >"$work/divide_kimi_k3.out")
t1="$(ms_now)"
py_kimi_ms="$(elapsed_ms "$t0" "$t1")"

# ---- Rust hot lane ----
mkdir -p "$work/rust"
t0="$(ms_now)"
"$PUMP" stars-shells "$usim/key/MYTHOS-SELF-EMISSION.txt" "$work/rust" >"$work/pump-stars.out"
t1="$(ms_now)"
rs_stars_ms="$(elapsed_ms "$t0" "$t1")"

t0="$(ms_now)"
"$PUMP" kimi-k3 "$usim/key/KIMI-K3-STAR.txt" "$work/rust" >"$work/pump-kimi.out"
t1="$(ms_now)"
rs_kimi_ms="$(elapsed_ms "$t0" "$t1")"

# ---- compare: Python == Rust, both == stored ----
pairs=(
  "$big/ASOLARIA-STARS-SHELLS.gguf|$work/rust/ASOLARIA-STARS-SHELLS.gguf"
  "$big/ASOLARIA-STARS-SHELLS.gguf.sha256|$work/rust/ASOLARIA-STARS-SHELLS.gguf.sha256"
  "$off/FABLE5-STARS-SHELLS.hbp|$work/rust/FABLE5-STARS-SHELLS.hbp"
  "$off/FABLE5-STARS-SHELLS.hbp.sha256|$work/rust/FABLE5-STARS-SHELLS.hbp.sha256"
  "$big_py|$big_rs"
  "$big_py.sha256|$work/rust/KIMI-K3-STAR-256.gguf.sha256"
  "$off/FABLE5-KIMI-K3-STAR.hbp|$work/rust/FABLE5-KIMI-K3-STAR.hbp"
  "$off/FABLE5-KIMI-K3-STAR.hbp.sha256|$work/rust/FABLE5-KIMI-K3-STAR.hbp.sha256"
)
for p in "${pairs[@]}"; do
  cmp "${p%%|*}" "${p##*|}"
  echo "CMP|python=$(basename "${p%%|*}")|rust=$(basename "${p##*|}")|equal=1|json=0"
done
cmp "$off/FABLE5-STARS-SHELLS.hbp" "$usim/receipts/FABLE5-STARS-SHELLS.hbp"
cmp "$off/FABLE5-STARS-SHELLS.hbp.sha256" "$usim/receipts/FABLE5-STARS-SHELLS.hbp.sha256"
cmp "$off/FABLE5-KIMI-K3-STAR.hbp" "$usim/receipts/FABLE5-KIMI-K3-STAR.hbp"
cmp "$off/FABLE5-KIMI-K3-STAR.hbp.sha256" "$usim/receipts/FABLE5-KIMI-K3-STAR.hbp.sha256"
cmp "$big/ASOLARIA-STARS-SHELLS.gguf.sha256" "$usim/gguf/stars/ASOLARIA-STARS-SHELLS.gguf.sha256"
cmp "$big_py.sha256" "$usim/gguf/stars/KIMI-K3-STAR-256.gguf.sha256"
cmp "$work/pump-stars.out" "$usim/receipts/FABLE5-STARS-SHELLS.hbp"
cmp "$work/pump-kimi.out" "$usim/receipts/FABLE5-KIMI-K3-STAR.hbp"
(cd "$big" && sha256sum -c --quiet "$usim/gguf/stars/ASOLARIA-STARS-SHELLS.gguf.sha256")
kimi_oid="$(sed -n 's/^oid sha256://p' "$usim/gguf/stars/KIMI-K3-STAR-256.gguf")"
kimi_size="$(sed -n 's/^size //p' "$usim/gguf/stars/KIMI-K3-STAR-256.gguf")"
echo "$kimi_oid  $big_rs" | sha256sum -c --quiet
[ "$(stat -c %s "$big_rs")" = "$kimi_size" ]
if [ -n "${KIMI_LFS_GGUF:-}" ]; then
  cmp "$big_rs" "$KIMI_LFS_GGUF"
  echo "CMP|rust=KIMI-K3-STAR-256.gguf|stored_lfs_bytes=1|equal=1|json=0"
fi
rm -f "$big_py" "$big_rs"

echo "STORED|k=ASOLARIA-STARS-SHELLS.gguf|sha256=$(cut -d' ' -f1 "$usim/gguf/stars/ASOLARIA-STARS-SHELLS.gguf.sha256")|python=1|rust=1|json=0"
echo "STORED|k=KIMI-K3-STAR-256.gguf|sha256=$kimi_oid|bytes=$kimi_size|python=1|rust=1|json=0"
echo "TIME|k=stars-shells|python_ms=$py_stars_ms|rust_ms=$rs_stars_ms|json=0"
echo "TIME|k=kimi-k3|python_ms=$py_kimi_ms|rust_ms=$rs_kimi_ms|json=0"
echo "COLD_LANE|PASS=1|files_equal=8|json=0"
