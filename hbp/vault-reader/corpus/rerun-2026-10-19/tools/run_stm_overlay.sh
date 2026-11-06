#!/bin/bash
P=/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad/vault-rerun/pins
grep -P '^PIN-asolaria-stone-to-moss-' $P/work/targets.tsv | while IFS=$'\t' read label repo c gd mode src kinds; do
  if cut -f1 $P/results.tsv | grep -q -x -F "$label"; then continue; fi
  $P/tools/run_pin_overlay.sh "$label" "$gd" "$c" < /dev/null || echo "FAIL $label rc=$?"
done
echo STMDONE
