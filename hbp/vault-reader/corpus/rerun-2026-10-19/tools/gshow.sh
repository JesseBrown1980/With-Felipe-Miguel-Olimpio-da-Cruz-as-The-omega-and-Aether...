#!/bin/bash
# gshow.sh <label-or-repo:commit7> <path> : print the blob at that commit (read-only)
P=/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad/vault-rerun/pins
row=$(awk -F'\t' -v l="$1" '$1==l' $P/work/targets.tsv)
[ -n "$row" ] || { echo "no target $1" >&2; exit 2; }
c=$(echo "$row" | cut -f3); gd=$(echo "$row" | cut -f4)
git -C "$gd" show "$c:$2"
