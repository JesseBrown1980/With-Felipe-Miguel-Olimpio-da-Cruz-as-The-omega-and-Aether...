#!/bin/bash
# Waits for disk, then runs each stone-to-moss pin in streaming mode. Gives up after $1 seconds.
P=/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad/vault-rerun/pins
deadline=$(( $(date +%s) + $1 ))
grep -P '^PIN-asolaria-stone-to-moss-' $P/work/targets.tsv | while IFS=$'\t' read label repo c gd mode src kinds; do
  if cut -f1 $P/results.tsv | grep -q -x -F "$label"; then continue; fi
  while :; do
    NEED=150000000 $P/tools/run_pin_stream.sh "$label" "$gd" "$c" < /dev/null; rc=$?
    [ $rc -ne 5 ] && break
    [ $(date +%s) -ge $deadline ] && { echo "GAVEUP $label"; break; }
    sleep 20
  done
done
echo STMDONE
