#!/bin/bash
# run_pin_stream.sh <label> <git-dir> <commit>
# As run_pin.sh (git archive tree, vault-read, referee, byte-for-byte cmp), but the Rust stdout is not
# stored: it is compared with the referee's stdout through a fifo, hashed and counted in flight, and
# only its non-+1 rows and totals are kept. For trees whose output would not fit beside the tree.
set -u
S=/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad
A=$S/asolaria-aether
P=$S/vault-rerun/pins
BIN=$S/vault-rerun-pins/target/release/vault-read
REF=$A/hbp/vault-reader/referee/vault_referee.py
label=$1; gd=$2; c=$3; NEED=${NEED:-250000000}
full=$(git -C "$gd" rev-parse -q --verify "$c^{commit}") || { echo "$label: no commit"; exit 2; }
if [ "$(git -C "$gd" config --get remote.origin.promisor)" = "true" ]; then
  missing=$(git -C "$gd" rev-list --objects --missing=print "$full" | grep '^?' | cut -c2-)
  if [ -n "$missing" ]; then
    echo "$missing" | git -C "$gd" -c fetch.negotiationAlgorithm=noop fetch origin --no-tags --no-write-fetch-head --recurse-submodules=no --filter=blob:none --stdin >/dev/null 2>&1
    [ "$(git -C "$gd" rev-list --objects --missing=print "$full" | grep -c '^?')" -eq 0 ] || { echo "$label: objects missing"; exit 3; }
  fi
fi
git -C "$gd" ls-tree -r -l "$full" > "$P/lt.$label.tmp"
bytes=$(awk '$2=="blob"{s+=$4} END {printf "%d", s}' "$P/lt.$label.tmp")
nblob=$(awk '$2=="blob"' "$P/lt.$label.tmp" | wc -l)
nhbi=$(awk -F'\t' '$2 ~ /\.hbi$/' "$P/lt.$label.tmp" | wc -l)
rm -f "$P/lt.$label.tmp"
free=$(df -B1 --output=avail "$P" | tail -1)
if [ "$bytes" -gt $(( free - NEED )) ]; then echo "$label: not enough disk ($bytes vs free $free)"; exit 5; fi
T=$P/trees/$label; X=$P/out/$label.stream
rm -rf "$T" "$X"; mkdir -p "$T" "$X"
git -C "$gd" archive "$full" | tar -x -C "$T" || { echo "$label: archive failed"; rm -rf "$T" "$X"; exit 4; }
mkfifo "$X/rust.fifo"
t0=$(date +%s%N)
( "$BIN" "$T" 2> "$P/out/$label.rust.err"; echo $? > "$X/rx" ) | tee >(sha256sum | cut -d' ' -f1 > "$X/sha") >(wc -c > "$X/bytes") >(grep -v '^VAULTOBJ|.*|verified=+1|' > "$P/out/$label.nonplus1.hbp") > "$X/rust.fifo" &
python3 -I -B "$REF" "$T" 2> "$P/out/$label.ref.err" | cmp -s - "$X/rust.fifo"; st=("${PIPESTATUS[@]}")
wait; sleep 1
t1=$(date +%s%N); ms=$(( (t1 - t0) / 1000000 ))
fx=${st[0]}; eq=$([ "${st[1]}" -eq 0 ] && echo 1 || echo 0)
rx=$(cat "$X/rx"); rsha=$(cat "$X/sha"); rbytes=$(tr -d ' ' < "$X/bytes")
tot=$(grep '^VAULTTOTAL|' "$P/out/$label.nonplus1.hbp" | tail -1)
printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$label" "$full" "$bytes" "$nblob" "$nhbi" "$rx" "$rsha" "$rbytes" "$ms" "$fx" "$eq" "$ms" "$tot" >> "$P/results.tsv"
echo "$label ${full:0:7} bytes=$bytes blobs=$nblob hbi=$nhbi rx=$rx rbytes=$rbytes fx=$fx eq=$eq ms=$ms mode=stream $tot"
rm -rf "$T" "$X"
