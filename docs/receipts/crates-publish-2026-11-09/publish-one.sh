#!/usr/bin/env bash
# publish-one.sh A REV CRATE DIR VERSION: upload one owner-approved crate version from the clean checkout A at REV,
# then check that the index cksum of VERSION equals the sha256 of the .crate packaged here. Rows go to PUBLISH.hbp.
set -uo pipefail
P=$(cd "$(dirname "$0")" && pwd); A=$1; REV=$2; crate=$3; dir=$4; ver=$5; LOG=$P/PUBLISH.hbp
UA='asolaria-aether-publish (cloud seat; github.com/JesseBrown1980)'
cd "$A"; [ "$(git rev-parse HEAD)" = "$REV" ] || { echo "PUBLISH_STOP|crate=$crate|reason=head_not_$REV|json=0" | tee -a "$LOG"; exit 2; }
[ -z "$(git status --porcelain)" ] || { echo "PUBLISH_STOP|crate=$crate|reason=dirty_tree|json=0" | tee -a "$LOG"; exit 2; }
idx() { n=$1; case ${#n} in 1) p=1/$n;; 2) p=2/$n;; 3) p=3/${n:0:1}/$n;; *) p=${n:0:2}/${n:2:2}/$n;; esac; curl -sS -A "$UA" "https://index.crates.io/$p" 2>/dev/null; }
cksum_of() { idx "$1" | python3 -I -c "import json,sys
for l in sys.stdin:
    l=l.strip()
    if l.startswith('{'):
        d=json.loads(l)
        if d.get('vers')==sys.argv[1]: print(d['cksum'])" "$2"; }
have=$(cksum_of "$crate" "$ver")
[ -z "$have" ] || { echo "PUBLISH_SKIP|crate=$crate|version=$ver|reason=in_index|cksum=$have|json=0" | tee -a "$LOG"; exit 0; }
T=$P/tgt-one; rm -rf "$T"; out=$P/out-$crate-$ver.txt
( cd "$A/$dir" && CARGO_TARGET_DIR=$T CARGO_REGISTRY_TOKEN=proxy-injected cargo +1.81.0 publish --locked ) > "$out" 2>&1; rc=$?
[ $rc = 0 ] || { echo "PUBLISH_FAIL|crate=$crate|version=$ver|rc=$rc|log=$out|tail=$(tail -3 "$out" | tr '\n|' '  ' | cut -c1-300)|json=0" | tee -a "$LOG"; exit 1; }
local_sha=$(sha256sum "$T/package/$crate-$ver.crate" | cut -d' ' -f1)
for k in 1 2 3 4 5 6; do have=$(cksum_of "$crate" "$ver"); [ -n "$have" ] && break; sleep 20; done
eq=$([ "$have" = "$local_sha" ] && echo 1 || echo 0)
echo "PUBLISH_DONE|crate=$crate|dir=$dir|version=$ver|commit=$REV|crate_sha256=$local_sha|index_cksum=$have|equal=$eq|json=0" | tee -a "$LOG"
[ "$eq" = 1 ] || { echo "PUBLISH_STOP|reason=cksum_mismatch|crate=$crate|version=$ver|json=0" | tee -a "$LOG"; exit 1; }
