#!/usr/bin/env bash
# Verify every GGUF in MANIFEST.hbp with the Rust verifier (hot lane: Rust 1.81, integers only).
# Usage: gguf/check.sh [--lfs-dir DIR]
#   --lfs-dir DIR  also verify the real bytes behind each Git LFS pointer, read from DIR/<local path>
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LFS_DIR=""
[ "${1:-}" = "--lfs-dir" ] && LFS_DIR="$2"

cargo +1.81.0 build -q --release --locked --manifest-path "$HERE/verify/Cargo.toml" \
  --target-dir "${CARGO_TARGET_DIR:-$HERE/verify/target}"
VERIFY="${CARGO_TARGET_DIR:-$HERE/verify/target}/release/gguf-verify-hbp"

field() { sed -n "s/.*|$1=\([^|]*\)|.*/\1/p" <<<"$2"; }

passed=0
pointers=0
failed=0
while IFS= read -r row; do
  local_path="$(field local "$row")"
  sha="$(field sha256 "$row")"
  bytes="$(field bytes "$row")"
  file="$HERE/$local_path"
  if [ "$(field storage "$row")" = lfs_pointer ]; then
    if grep -qx "oid sha256:$sha" "$file" && grep -qx "size $bytes" "$file"; then
      pointers=$((pointers + 1))
    else
      echo "FAIL|local=$local_path|reason=pointer|json=0"; failed=$((failed + 1)); continue
    fi
    [ -n "$LFS_DIR" ] || continue
    file="$LFS_DIR/$local_path"
  fi
  report="$("$VERIFY" "$file" --expect-sha256 "$sha" || true)"
  if grep -qx 'VERDICT|structure=+1|json=0' <<<"$report"; then
    passed=$((passed + 1))
  else
    echo "FAIL|local=$local_path|reason=verify|json=0"; failed=$((failed + 1))
  fi
done < <(grep '^GGUF|' "$HERE/MANIFEST.hbp")

echo "GGUF_CHECK|verified=$passed|lfs_pointers_matched=$pointers|failed=$failed|json=0"
[ "$failed" -eq 0 ]
