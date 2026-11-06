#!/bin/bash
P=/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad/vault-rerun/pins
order() { awk -F'\t' '{big=($2=="asolaria-stone-to-moss"||$2=="Asolaria"||$2=="GitRAM")?1:0; print big"\t"$0}' $P/work/targets.tsv | sort -s -t$'\t' -k1,1n | cut -f2-; }
order | while IFS=$'\t' read label repo c gd mode src kinds; do
  if cut -f1 $P/results.tsv | grep -q -x -F "$label"; then continue; fi
  $P/tools/run_pin.sh "$label" "$gd" "$c" < /dev/null || echo "FAIL $label rc=$?"
done
echo ALLDONE
