#!/usr/bin/env bash
# Builds sha256_parity.rs with rustc 1.81.0 and runs it over every tracked file of this checkout.
# Usage: shadowcat/parity/run.sh [out.hbp]. It needs the nine aether SHA-256 copies it names, so it
# runs at the commit its receipt records (before they were switched to shadowcat).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(git -C "$here" rev-parse --show-toplevel)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cut_sha256() { awk -v start="$2" '$0 ~ start {p=1} p {print} p && /fn sha256/ {f=1} f && /^}\r?$/ {exit}' "$root/$1"; }
cut_sha256 codec/dbbh-dbwh/src/lib.rs '^const K: \[u32; 64\]' >"$work/dbbh_dbwh_sha256.rs"
cut_sha256 qprism/representation-bins/tests/referee.rs '^const SHA256_K' >"$work/referee_sha256.rs"
CARGO_MANIFEST_DIR="$root/pump/glyphs-herself" CARGO_TARGET_TMPDIR="$work" PARITY_WORK="$work" \
  rustc +1.81.0 --edition 2021 -O "$here/sha256_parity.rs" -o "$work/sha256_parity"
(cd "$root" && git ls-files -z | xargs -0 sha256sum) >"$work/sums"
if grep -q '^\\' "$work/sums"; then echo "escaped path in sha256sum output" >&2; exit 1; fi
"$work/sha256_parity" "$root" "$work/sums" "$(git -C "$root" rev-parse HEAD)" "${1:-$work/out.hbp}"
