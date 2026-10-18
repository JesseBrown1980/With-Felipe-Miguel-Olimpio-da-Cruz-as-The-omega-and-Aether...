#!/usr/bin/env bash
# check.sh — reproduce the owner's recorded 1 MB k=7 anchors from the vendored sources and
# compare byte-exact (payload + comp_sha). Integer-only: it parses integers and compares hex
# strings; no float arithmetic. Lossless is asserted via each binary's own SHA restore gate.
#
# Usage:  scripts/check.sh <path-to-enwik8>
#   enwik8 is the public corpus (http://mattmahoney.net/dc/enwik8.zip, 100,000,000 B,
#   sha256 2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8). This script
#   takes its first 1,000,000 bytes as the "slice1m" input the owner's runs used.
#
# The bpc_total the binaries print depends on the vendored .rs size (decoder_src), which the
# owner's source has grown since measurement, so bpc is NOT compared; payload and comp_sha are
# input-only and are the byte-exact anchors.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

enwik8="${1:-}"
if [ -z "$enwik8" ] || [ ! -f "$enwik8" ]; then
  echo "usage: scripts/check.sh <path-to-enwik8>" >&2
  exit 2
fi

echo "== 1. vendored bytes unchanged =="
sha256sum -c UPSTREAM.sha256

echo "== 2. build the integer family (release) =="
cargo +1.81.0 build --locked --release
bin="${CARGO_TARGET_DIR:-target}/release"

echo "== 3. slice1m = first 1,000,000 B of enwik8, sha256-pinned =="
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
head -c 1000000 "$enwik8" > "$work/slice1m"
slice_sha="$(sha256sum "$work/slice1m" | cut -d' ' -f1)"
want_slice="369b688978f649681136198fb96db14c1616756260c55fb4b65e9bc049552cad"
if [ "$slice_sha" != "$want_slice" ]; then
  echo "FAIL: slice1m sha256 $slice_sha != $want_slice (wrong enwik8?)" >&2
  exit 1
fi
echo "slice1m sha256 OK ($slice_sha)"
in="$work/slice1m"
binabs="$(cd "$bin" && pwd)"

fails=0
# run <bin> <srcdir> : prints "payload=.. comp_sha=.. restore=.." fields
run() { ( cd "$2" && "$binabs/$1" "$in" 7 ); }
field() { echo "$1" | grep -oE "$2=[A-Za-z0-9]+" | head -1 | cut -d= -f2; }

check_exact() { # name expect_payload expect_sha cite  (sha may be a prefix)
  local name="$1" ep="$2" es="$3" cite="$4" out p s r
  out="$(run "$name" "${5:-rust}")"
  p="$(field "$out" payload)"; s="$(field "$out" comp_sha)"; r="$(field "$out" restore)"
  local ok=1
  [ "$r" = "OK" ] || { echo "  restore=$r (not OK)"; ok=0; }
  if [ -n "$ep" ] && [ "$p" != "$ep" ]; then echo "  payload $p != $ep"; ok=0; fi
  case "$s" in "$es"*) : ;; *) echo "  comp_sha $s !~ $es"; ok=0 ;; esac
  if [ "$ok" = 1 ]; then echo "PASS $name  payload=$p comp_sha=$s restore=$r  [$cite]"
  else echo "FAIL $name  payload=$p comp_sha=$s restore=$r  [$cite]"; fails=$((fails+1)); fi
}

echo "== 4. recorded 1 MB k=7 anchors =="
# cm3ti determinism gate: two runs must be identical and comp_sha must begin 101c86ae (RESULTS.md:333).
o1="$(run cm3ti rust)"; o2="$(run cm3ti rust)"
s1="$(field "$o1" comp_sha)"; s2="$(field "$o2" comp_sha)"; r1="$(field "$o1" restore)"
if [ "$s1" = "$s2" ] && [ "$r1" = "OK" ] && [ "${s1:0:8}" = "101c86ae" ]; then
  echo "PASS cm3ti  comp_sha=$s1 (x2 identical) restore=$r1  [RESULTS.md:333]"
else
  echo "FAIL cm3ti  run1=$s1 run2=$s2 restore=$r1 (want prefix 101c86ae, x2 identical)  [RESULTS.md:333]"
  fails=$((fails+1))
fi

check_exact cm3ti_sector   242020 251c0b44          "payload RESULTS-cloud-seat.md:106; comp_sha RESULTS.md:459"  rust
check_exact cm3ti_rainbow12 239869 53ad10066c34ac66 "RESULTS.md:634"                                              rust
check_exact v6_even        239869 53ad10066c34ac66  "RESULTS.md:634; RESULTS-cloud-seat.md:67-68"                 rust/variants

echo "== result =="
if [ "$fails" -eq 0 ]; then echo "ALL ANCHORS REPRODUCED"; else echo "$fails anchor(s) FAILED"; exit 1; fi
