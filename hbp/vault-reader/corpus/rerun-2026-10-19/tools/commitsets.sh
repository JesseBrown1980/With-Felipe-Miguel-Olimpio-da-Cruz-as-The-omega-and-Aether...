#!/bin/bash
# commits.tsv: repo<TAB>commit for every commit object in each local clone (read-only).
S=/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad
out=$1; : > $out/commits.tsv; : > $out/clones.tsv
emit() { # name gitdir
  git -C "$2" cat-file --batch-all-objects --batch-check='%(objecttype) %(objectname)' 2>/dev/null | awk -v n="$1" '$1=="commit"{print n"\t"$2}' >> $out/commits.tsv
  printf '%s\t%s\n' "$1" "$2" >> $out/clones.tsv
}
for d in $S/beginning-src/*; do n=$(basename $d .git); emit "$n" "$d"; done
emit Asolaria $S/asolaria-mirror.git
for d in /home/user/*/; do
  n=$(basename $d)
  case $n in hf-phone-archive-2026-08-04-private|simplicio|hermes-turbo-agent|jessebrown1980) continue;; esac
  [ -d "$d/.git" ] || continue
  u=$(git -C $d remote get-url origin); rn=${u##*/}; rn=${rn%.git}
  [ "$rn" = asolaria ] && rn=Asolaria
  emit "$rn" "$d"
done
sort -u -o $out/commits.tsv $out/commits.tsv
cut -f1 $out/commits.tsv | sort | uniq -c | sort -rn | wc -l
wc -l < $out/commits.tsv
