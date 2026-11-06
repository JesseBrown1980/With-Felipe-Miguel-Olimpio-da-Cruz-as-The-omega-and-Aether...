#!/bin/bash
# run_pin.sh <label> <git-dir> <commit> [path ...]
# Same method as vault-rerun/tools/run_gap.sh: git archive of <commit> (whole tree, or only the given paths)
# into a fresh dir, vault-read and the referee, byte-for-byte cmp, delete the tree, keep the Rust output.
# Appends one TSV line to $P/results.tsv:
# label commit blob_bytes files hbi_files exit_rust rust_sha256 rust_bytes rust_ms ref_exit ref_equal ref_ms VAULTTOTAL
set -u
S=/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad
A=$S/asolaria-aether
P=$S/vault-rerun/pins
BIN=$S/vault-rerun-pins/target/release/vault-read
REF=$A/hbp/vault-reader/referee/vault_referee.py
LIMIT=1500000000
label=$1; gd=$2; c=$3; shift 3
full=$(git -C "$gd" rev-parse -q --verify "$c^{commit}") || { echo "$label: no commit $c in $gd"; exit 2; }
if [ "$(git -C "$gd" config --get remote.origin.promisor)" = "true" ]; then
  if [ "$#" -eq 0 ]; then
    missing=$(git -C "$gd" rev-list --objects --missing=print "$full" | grep '^?' | cut -c2-)
  else
    missing=$(git -C "$gd" rev-list --objects --missing=print "$full" | grep '^?' | cut -c2- | grep -F -x -f <(git -C "$gd" ls-tree -r "$full" -- "$@" | awk '$2=="blob"{print $3}'))
  fi
  if [ -n "$missing" ]; then
    echo "$label: prefetching $(echo "$missing" | wc -l) missing objects"
    echo "$missing" | git -C "$gd" -c fetch.negotiationAlgorithm=noop fetch origin --no-tags --no-write-fetch-head --recurse-submodules=no --filter=blob:none --stdin >/dev/null 2>&1
    left=$(git -C "$gd" rev-list --objects --missing=print "$full" | grep '^?' | cut -c2- | grep -c -F -x -f <(echo "$missing"))
    [ "$left" -eq 0 ] || { echo "$label: $left objects still missing"; exit 3; }
  fi
fi
git -C "$gd" ls-tree -r -l "$full" -- "$@" > "$P/lt.$label.tmp" || { echo "$label: ls-tree failed"; exit 3; }
bytes=$(awk '$2=="blob"{s+=$4} END {printf "%d", s}' "$P/lt.$label.tmp")
nblob=$(awk '$2=="blob"' "$P/lt.$label.tmp" | wc -l)
nhbi=$(awk -F'\t' '$2 ~ /\.hbi$/' "$P/lt.$label.tmp" | wc -l)
rm -f "$P/lt.$label.tmp"
if [ "$bytes" -gt "$LIMIT" ]; then
  printf '%s\t%s\tSKIP_SIZE\t%s\t%s\t%s\n' "$label" "$full" "$bytes" "$nblob" "$nhbi" >> "$P/results.tsv"
  echo "$label: skip, $bytes bytes, hbi=$nhbi"; exit 0
fi
free=$(df -B1 --output=avail "$P" | tail -1)
if [ "$bytes" -gt $(( free - 300000000 )) ]; then echo "$label: not enough disk ($bytes vs free $free)"; exit 5; fi
T=$P/trees/$label
mkdir -p "$P/out" "$P/trees"
rm -rf "$T"; mkdir -p "$T"
git -C "$gd" archive "$full" -- "$@" | tar -x -C "$T" || { echo "$label: archive failed"; rm -rf "$T"; exit 4; }
xfiles=$(find "$T" -type f | wc -l)
OUT=$P/out/$label.rust.hbp
t0=$(date +%s%N); "$BIN" "$T" > "$OUT" 2> "$P/out/$label.rust.err"; rx=$?; t1=$(date +%s%N)
rms=$(( (t1 - t0) / 1000000 ))
rsha=$(sha256sum "$OUT" | cut -d' ' -f1); rbytes=$(stat -c %s "$OUT")
t2=$(date +%s%N); python3 -I -B "$REF" "$T" 2> "$P/out/$label.ref.err" | cmp -s - "$OUT"; st=("${PIPESTATUS[@]}"); t3=$(date +%s%N)
fms=$(( (t3 - t2) / 1000000 ))
fx=${st[0]}; eq=$([ "${st[1]}" -eq 0 ] && echo 1 || echo 0)
tot=$(grep '^VAULTTOTAL|' "$OUT" | tail -1)
printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$label" "$full" "$bytes" "$nblob" "$nhbi" "$rx" "$rsha" "$rbytes" "$rms" "$fx" "$eq" "$fms" "$tot" >> "$P/results.tsv"
echo "$label ${full:0:7} bytes=$bytes blobs=$nblob xfiles=$xfiles hbi=$nhbi rx=$rx rbytes=$rbytes ms=$rms fx=$fx eq=$eq fms=$fms $tot"
rm -rf "$T"
if [ "$rbytes" -ge 5242880 ]; then
  grep -v '^VAULTOBJ|.*|verified=+1|' "$OUT" > "$P/out/$label.nonplus1.hbp"; rm -f "$OUT"
fi
