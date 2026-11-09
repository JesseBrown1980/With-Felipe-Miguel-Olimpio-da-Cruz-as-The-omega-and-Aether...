#!/usr/bin/env bash
# publish.sh: upload the owner-approved aether crates (decisions of 2026-11-08) to crates.io in wave order.
# Resumable: a crate whose 0.1.0 is already in the index is skipped. Waits out rate limits; stops at any other failure.
# Each upload is checked: the index's cksum must equal the sha256 of the .crate packaged here.
set -uo pipefail
P=$(cd "$(dirname "$0")" && pwd); A=$1; REV=$2; LOG=$P/PUBLISH.hbp
UA='asolaria-aether-publish (cloud seat; github.com/JesseBrown1980)'
cd "$A"; [ "$(git rev-parse HEAD)" = "$REV" ] || { echo "PUBLISH_STOP|reason=head_not_$REV|json=0" | tee -a "$LOG"; exit 2; }
[ -z "$(git status --porcelain)" ] || { echo "PUBLISH_STOP|reason=dirty_tree|json=0" | tee -a "$LOG"; exit 2; }
idx() { n=$1; case ${#n} in 1) p=1/$n;; 2) p=2/$n;; 3) p=3/${n:0:1}/$n;; *) p=${n:0:2}/${n:2:2}/$n;; esac; curl -sS -A "$UA" "https://index.crates.io/$p" 2>/dev/null; }
cksum_of() { idx "$1" | python3 -I -c "import json,sys
for l in sys.stdin:
    l=l.strip()
    if l:
        d=json.loads(l)
        if d.get('vers')=='0.1.0': print(d['cksum'])"; }
while read -r wave order crate dir pkg; do
  have=$(cksum_of "$crate")
  if [ -n "$have" ]; then echo "PUBLISH_SKIP|wave=$wave|order=$order|crate=$crate|reason=0.1.0_in_index|cksum=$have|json=0" | tee -a "$LOG"; continue; fi
  sel=""; [ "$pkg" != "-" ] && sel="-p $pkg"
  T=$P/tgt; rm -rf "$T"
  for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
    out=$P/out-$crate-$attempt.txt
    ( cd "$A/$dir" && CARGO_TARGET_DIR=$T CARGO_REGISTRY_TOKEN=proxy-injected cargo +1.81.0 publish --locked $sel ) > "$out" 2>&1; rc=$?
    if [ $rc = 0 ]; then break; fi
    if grep -q -i -E 'too many|429|rate limit|try again after' "$out"; then
      until=$(grep -o -i -E 'try again after [^.]*' "$out" | head -1 | sed 's/^[Tt]ry again after //')
      wait_s=$(python3 -I -c "import sys,email.utils,time
s=sys.argv[1].strip()
try:
    t=email.utils.parsedate_to_datetime(s).timestamp(); print(max(60,int(t-time.time())+30))
except Exception:
    print(600)" "$until")
      echo "PUBLISH_WAIT|crate=$crate|attempt=$attempt|until=$until|sleep_s=$wait_s|json=0" | tee -a "$LOG"; sleep "$wait_s"; continue
    fi
    echo "PUBLISH_FAIL|wave=$wave|order=$order|crate=$crate|rc=$rc|log=$out|tail=$(tail -3 "$out" | tr '\n|' '  ' | cut -c1-300)|json=0" | tee -a "$LOG"; exit 1
  done
  [ $rc = 0 ] || { echo "PUBLISH_FAIL|crate=$crate|reason=rate_limit_retries_exhausted|json=0" | tee -a "$LOG"; exit 1; }
  local_sha=$(sha256sum "$T/package/$crate-0.1.0.crate" | cut -d' ' -f1)
  for k in 1 2 3 4 5 6; do have=$(cksum_of "$crate"); [ -n "$have" ] && break; sleep 20; done
  eq=$([ "$have" = "$local_sha" ] && echo 1 || echo 0)
  echo "PUBLISH_DONE|wave=$wave|order=$order|crate=$crate|dir=$dir|version=0.1.0|commit=$REV|crate_sha256=$local_sha|index_cksum=$have|equal=$eq|json=0" | tee -a "$LOG"
  [ "$eq" = 1 ] || { echo "PUBLISH_STOP|reason=cksum_mismatch|crate=$crate|json=0" | tee -a "$LOG"; exit 1; }
  rm -rf "$T"
done < "$P/list.txt"
echo "PUBLISH_ALL_DONE|crates=$(grep -c . "$P/list.txt")|json=0" | tee -a "$LOG"
