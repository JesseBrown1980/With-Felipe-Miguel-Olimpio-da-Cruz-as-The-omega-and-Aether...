#!/usr/bin/env bash
# Carry each payload through qr/colour-qr (generate, then ungenerate) and check it with shadowcat's sha256.rs.
# Usage: cloud/qr_roundtrip.sh [work-dir]. Prints HBP rows on stdout.
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)
ROOT=$(cd "$HERE/../../.." && pwd)
WORK=${1:-$(mktemp -d)}
mkdir -p "$WORK"
C=$ROOT/qr/colour-qr
(cd "$C" && CARGO_TARGET_DIR=$WORK/target cargo +1.81.0 build --release --locked --quiet --bin colour-qr)
rustc +1.81.0 --edition 2021 -C opt-level=3 "$HERE/cloud/shadowcat_sum.rs" -o "$WORK/shadowcat-sum"
QR=$WORK/target/release/colour-qr
SUM=$WORK/shadowcat-sum
digest() { "$SUM" "$1" | cut -c1-64; }

echo "SCQRHDR|tool=qr/colour-qr(generate+ungenerate,default_integer_reader)|check=shadowcat_src/sha256.rs(6a6a9c83860b383f)|cross=coreutils_sha256sum|rust=$(rustc +1.81.0 --version | cut -d' ' -f2)|json=0"
total=0
exact=0
for p in \
  "$C/tests/fixtures/payloads/asolaria-corpus_txt_qr.bin" \
  "$C/tests/fixtures/payloads/code-corpus_txt_qr.bin" \
  "$C/tests/fixtures/payloads/fotoC_bin_qr.bin" \
  "$C/tests/fixtures/payloads/wiki_qr.bin" \
  "$C/vendor/universe-simulator/key/prior3174.bin" \
  "$C/vendor/universe-simulator/key/ASOLARIA-CONSTELLATION-KEY-3174.bin" \
  "$C/vendor/universe-simulator/key/ASOLARIA-HERSELF-KEY-3174.bin" \
  "$C/vendor/universe-simulator/key/ASOLARIA-KERNEL-3174.bin" \
  "$ROOT/gguf/universe-simulator/gguf/ASOLARIA-CONSTELLATION.gguf"; do
  n=$(basename "$p")
  d=$WORK/rt/$n
  rm -rf "$d"
  mkdir -p "$d/png"
  "$QR" generate "$p" "$d/png" > /dev/null
  # shellcheck disable=SC2046
  "$QR" ungenerate "$d/out.bin" $(find "$d/png" -name '*.png' | sort) > /dev/null
  a=$(digest "$p")
  b=$(digest "$d/out.bin")
  c=$(sha256sum < "$d/out.bin" | cut -c1-64)
  ok=0
  if [ "$a" = "$b" ] && cmp -s "$p" "$d/out.bin"; then ok=1; fi
  same=0
  if [ "$b" = "$c" ]; then same=1; fi
  total=$((total + 1))
  exact=$((exact + ok * same))
  echo "SCQR|payload=${p#"$ROOT"/}|bytes=$(wc -c < "$p")|codes=$(find "$d/png" -name '*.png' | wc -l)|png_bytes=$(cat "$d"/png/*.png | wc -c)|shadowcat_in=$a|shadowcat_out=$b|byte_exact=$ok|shadowcat_eq_coreutils=$same|json=0"
done
echo "SCQRFTR|payloads=$total|byte_exact_and_digests_agree=$exact|json=0"
[ "$exact" = "$total" ]
