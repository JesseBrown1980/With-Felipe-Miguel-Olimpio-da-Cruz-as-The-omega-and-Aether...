#!/bin/bash
# run_pin_overlay.sh <label> <git-dir> <commit>
# For a tree that does not fit on disk: an overlay view whose lower layer is the read-only checkout
# /home/user/asolaria-stone-to-moss (never written; overlayfs writes only to the upper layer under pins/),
# made equal to <commit> (extra files removed, changed files written from git blobs) and verified file
# by file with git hash-object --no-filters against the commit's tree. Then vault-read and the referee
# are compared byte for byte through a fifo (Rust stdout hashed and counted in flight, non-+1 rows kept).
set -u
S=/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad
A=$S/asolaria-aether
P=$S/vault-rerun/pins
BIN=$S/vault-rerun-pins/target/release/vault-read
REF=$A/hbp/vault-reader/referee/vault_referee.py
LOWER=/home/user/asolaria-stone-to-moss
label=$1; gd=$2; c=$3
full=$(git -C "$gd" rev-parse -q --verify "$c^{commit}") || { echo "$label: no commit"; exit 2; }
git -C "$gd" ls-tree -r -l "$full" > "$P/lt.$label.tmp"
bytes=$(awk '$2=="blob"{s+=$4} END {printf "%d", s}' "$P/lt.$label.tmp")
nblob=$(awk '$2=="blob"' "$P/lt.$label.tmp" | wc -l)
nhbi=$(awk -F'\t' '$2 ~ /\.hbi$/' "$P/lt.$label.tmp" | wc -l)
rm -f "$P/lt.$label.tmp"
O=$P/ov/$label; X=$P/out/$label.stream
rm -rf "$O" "$X"; mkdir -p "$O/up" "$O/wk" "$O/mnt" "$X"
mount -t overlay overlay -o "lowerdir=$LOWER,upperdir=$O/up,workdir=$O/wk" "$O/mnt" || { echo "$label: mount failed"; exit 6; }
cleanup() { umount "$O/mnt" 2>/dev/null; rm -rf "$O" "$X"; }
trap cleanup EXIT
rm -rf "$O/mnt/.git"
mat=$(python3 -I -B "$P/tools/materialize.py" "$O/mnt" "$gd" "$full"); mx=$?
echo "$label materialize expected,removed,written,verified_equal,extra,missing: $mat (exit $mx)"
[ $mx -eq 0 ] || { echo "$label: tree not equal to commit"; exit 7; }
printf '%s\t%s\t%s\n' "$label" "$full" "$mat" >> "$P/work/overlay-verify.tsv"
mkfifo "$X/rust.fifo"
t0=$(date +%s%N)
( "$BIN" "$O/mnt" 2> "$P/out/$label.rust.err"; echo $? > "$X/rx" ) | tee >(sha256sum | cut -d' ' -f1 > "$X/sha") >(wc -c > "$X/bytes") >(grep -v '^VAULTOBJ|.*|verified=+1|' > "$P/out/$label.nonplus1.hbp") > "$X/rust.fifo" &
python3 -I -B "$REF" "$O/mnt" 2> "$P/out/$label.ref.err" | cmp -s - "$X/rust.fifo"; st=("${PIPESTATUS[@]}")
wait; sleep 1
t1=$(date +%s%N); ms=$(( (t1 - t0) / 1000000 ))
fx=${st[0]}; eq=$([ "${st[1]}" -eq 0 ] && echo 1 || echo 0)
rx=$(cat "$X/rx"); rsha=$(cat "$X/sha"); rbytes=$(tr -d ' ' < "$X/bytes")
tot=$(grep '^VAULTTOTAL|' "$P/out/$label.nonplus1.hbp" | tail -1)
printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$label" "$full" "$bytes" "$nblob" "$nhbi" "$rx" "$rsha" "$rbytes" "$ms" "$fx" "$eq" "$ms" "$tot" >> "$P/results.tsv"
echo "$label ${full:0:7} bytes=$bytes blobs=$nblob hbi=$nhbi rx=$rx rbytes=$rbytes fx=$fx eq=$eq ms=$ms mode=overlay $tot"
