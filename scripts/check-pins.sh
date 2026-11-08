#!/usr/bin/env bash
# Pin check, run by .github/workflows/pins.yml. Integers and sha256sum only. Three groups of tracked
# files; every count below is frozen, and any difference fails.
#   A  UPSTREAM.sha256 and *SHA256SUMS outside */vendor/*: `sha256sum -c` from the file's directory.
#      No entry may mismatch or be unparsed. An entry may be absent only if it is on the frozen list
#      scripts/check-pins.absent (bodies held outside aether by design); the list is pinned below.
#      A file counts as all OK only if it checks at least one entry. Every line that is not blank
#      and not a `#` comment must come back as OK, FAILED or FAILED open or read, or as unparsed;
#      `no properly formatted checksum lines found` counts all of the file's lines as unparsed, and
#      any other sha256sum output fails. The sorted per-file table (path, ok, mismatch, absent,
#      unparsed) must equal scripts/check-pins.files, pinned below, so a pin moved between files fails.
#   B  *.sha256 sidecars (all but UPSTREAM.sha256), and
#   C  UPSTREAM.sha256 and *SHA256SUMS under */vendor/*: measured, not claimed to pass. Every entry
#      is counted as ok, mismatch, absent, outside (absolute path) or other (unparsed line). A GNU
#      line names its file relative to the sidecar's directory; a bare hash names the sidecar's
#      path minus ".sha256". The counts and a sha256 of the not-ok rows are frozen.
# Usage: scripts/check-pins.sh [--list]   (--list prints the absent and not-ok rows, then checks)
set -euo pipefail
export LC_ALL=C
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LIST=0
[ "${1:-}" = "--list" ] && LIST=1

# Frozen 2026-11-08 on branch cloud/pins-20261108 (after the A1 pin repairs). A_* came from the plan
# and a run at main 7c4711f; B_* and C_* from an uncommitted prototype count. Both were written here
# before this script's first run (UNVERIFIED: the script and its numbers are one commit, ceb68e2).
# A_FILES_NO_CHECKSUM_LINES, A_UNEXPECTED_OUTPUT and scripts/check-pins.files were derived from the
# claim alone (line counts and the absent list, no hashing) and committed before the first run of
# the code that measures them (UNVERIFIED: git does not record the run).
A_FILES=102
A_FILES_ALL_OK=94
A_FILES_WITH_ABSENT=8
A_ENTRIES=14232
A_OK=14116
A_MISMATCH=0
A_ABSENT=116
A_UNPARSED=0
A_FILES_NO_CHECKSUM_LINES=0
A_UNEXPECTED_OUTPUT=0
A_FILES_TABLE_SHA256=9806381af0584136e65e6db84bc28f19f94b6be153efa558c1cf7c6b5285cca3
A_ABSENT_LIST_SHA256=1d93bb146bd83eb9b466a6bdcf11e370e709d984f1dcb37670cadd19200ee176
A_ABSENT_PER_FILE=(
  "62 docs/handoffs/acer-post60d-2026-10-18/FABLE5-MATRIX-IN-COLOUR-62-FILES-NOT-IN-AETHER-2026-10-18/SHA256SUMS"
  "2 docs/handoffs/acer-post60d-2026-10-18/FABLE5-REGEN-P5-GNN-BRIDGE-AND-PREDICTIONS-2026-10-18/SHA256SUMS"
  "10 docs/handoffs/acer-post60d-2026-10-18/FABLE5-SEED-SEARCH-10-FILES-3078B-C-ROOTS-2026-10-18/SHA256SUMS"
  "10 docs/handoffs/acer-post60d-2026-10-18/FABLE5-SHADOWCAT-ACER-10-FILES-NOT-IN-AETHER-2026-10-18/SHA256SUMS"
  "11 docs/handoffs/cube-9859b576-transfer-2026-10-18/CHECKPOINTS.SHA256SUMS"
  "14 docs/handoffs/cube-9859b576-transfer-2026-10-18/CODE.SHA256SUMS"
  "1 docs/handoffs/cube-9859b576-transfer-2026-10-18/CORPUS.SHA256SUMS"
  "6 docs/handoffs/cube-9859b576-transfer-2026-10-18/LEDGERS.SHA256SUMS"
)
B_FILES=2216
B_FILES_ALL_OK=673
B_OK=691
B_MISMATCH=50
B_ABSENT=1559
B_OUTSIDE=0
B_OTHER=4
B_NOT_OK_SHA256=64602fac68e2888ab55dca85efa2d1862430a2f74a3067f0ef049b71dd5f5b2a
C_FILES=8
C_FILES_ALL_OK=5
C_OK=59
C_MISMATCH=0
C_ABSENT=56
C_OUTSIDE=0
C_OTHER=1
C_NOT_OK_SHA256=fc1d5de67f82d0cb3e18322562bb0542bd769e3e7a098720a230f4f5d3ceb502

misses=0
expect() { # name got want
  if [ "$2" != "$3" ]; then
    echo "MISS|$1|got=$2|want=$3|json=0"
    misses=$((misses + 1))
  fi
}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
if [ -n "$(git status --porcelain --ignored)" ]; then
  echo "NOTE|untracked, ignored or modified files present; a clean checkout is what CI measures|json=0"
fi

git ls-files -z >"$work/tracked"
pins_a=()
pins_c=()
sidecars=()
while IFS= read -r -d '' p; do
  base=${p##*/}
  if [ "$base" = UPSTREAM.sha256 ] || [[ $base == *SHA256SUMS ]]; then
    if [[ $p == */vendor/* ]]; then pins_c+=("$p"); else pins_a+=("$p"); fi
  elif [[ $base == *.sha256 ]]; then
    sidecars+=("$p")
  fi
done <"$work/tracked"

# ---- A: sha256sum -c
entry_lines() { # file -> its lines that sha256sum -c reads as entries (not blank, not a # comment)
  local line n=0
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%$'\r'}
    if [ -n "$line" ] && [ "${line:0:1}" != '#' ]; then n=$((n + 1)); fi
  done <"$1"
  echo "$n"
}
a_all_ok=0 a_with_absent=0 a_ok=0 a_mismatch=0 a_absent=0 a_unparsed=0 a_no_lines=0 a_unexpected=0
: >"$work/a-absent"
: >"$work/a-per-file"
: >"$work/a-files"
for f in "${pins_a[@]}"; do
  d=${f%/*}
  [ "$d" = "$f" ] && d=.
  ok=0 mm=0 ab=0 un=0 noline=0 open_err=0 odd=0
  if [ ! -f "$f" ]; then
    echo "FAILED|group=A|file=$f|pin_file_missing=1|json=0"
    a_unexpected=$((a_unexpected + 1))
    printf '%s|ok=0|mismatch=0|absent=0|unparsed=0\n' "$f" >>"$work/a-files"
    continue
  fi
  lines=$(entry_lines "$f")
  out=$(cd "$d" && sha256sum -c -- "${f##*/}" 2>"$work/err") || true
  while IFS= read -r line; do
    case "$line" in
      '') ;;
      *': OK') ok=$((ok + 1)) ;;
      *': FAILED open or read')
        ab=$((ab + 1))
        printf '%s|%s\n' "$f" "${line%: FAILED open or read}" >>"$work/a-absent"
        ;;
      *': FAILED') mm=$((mm + 1)) ;;
      *)
        odd=$((odd + 1))
        echo "FAILED|group=A|file=$f|unexpected_stdout=$line|json=0"
        ;;
    esac
  done <<<"$out"
  while IFS= read -r line; do
    if [[ $line =~ ^sha256sum:\ WARNING:\ ([0-9]+)\ lines?\ (is|are)\ improperly\ formatted$ ]]; then
      un=$((un + BASH_REMATCH[1]))
    elif [[ $line =~ ^sha256sum:\ WARNING:\ [0-9]+\ (listed\ files?\ could\ not\ be\ read|computed\ checksums?\ did\ NOT\ match)$ ]]; then
      :
    elif [ "$line" = "sha256sum: ${f##*/}: no properly formatted checksum lines found" ]; then
      noline=1
    elif [[ $line =~ ^sha256sum:\ .+:\ (No\ such\ file\ or\ directory|Is\ a\ directory|Permission\ denied)$ ]]; then
      open_err=$((open_err + 1))
    elif [ -n "$line" ]; then
      odd=$((odd + 1))
      echo "FAILED|group=A|file=$f|unexpected_stderr=$line|json=0"
    fi
  done <"$work/err"
  if [ "$noline" = 1 ]; then
    un=$((un + lines))
    echo "FAILED|group=A|file=$f|no_checksum_lines=1|lines=$lines|json=0"
  fi
  if [ "$open_err" -ne "$ab" ]; then
    odd=$((odd + 1))
    echo "FAILED|group=A|file=$f|open_errors=$open_err|absent=$ab|json=0"
  fi
  if [ $((ok + mm + ab + un)) -ne "$lines" ]; then
    odd=$((odd + 1))
    echo "FAILED|group=A|file=$f|lines=$lines|accounted=$((ok + mm + ab + un))|json=0"
  fi
  [ "$mm" -gt 0 ] && echo "FAILED|group=A|file=$f|mismatch=$mm|json=0"
  [ "$un" -gt 0 ] && echo "FAILED|group=A|file=$f|unparsed=$un|json=0"
  [ "$ok" -eq 0 ] && [ "$ab" -eq 0 ] && echo "FAILED|group=A|file=$f|ok=0|json=0"
  if [ "$ab" -gt 0 ]; then
    a_with_absent=$((a_with_absent + 1))
    printf '%s %s\n' "$ab" "$f" >>"$work/a-per-file"
  fi
  if [ "$ok" -gt 0 ] && [ $((mm + ab + un + odd)) -eq 0 ]; then a_all_ok=$((a_all_ok + 1)); fi
  printf '%s|ok=%d|mismatch=%d|absent=%d|unparsed=%d\n' "$f" "$ok" "$mm" "$ab" "$un" >>"$work/a-files"
  a_ok=$((a_ok + ok)) a_mismatch=$((a_mismatch + mm)) a_absent=$((a_absent + ab)) a_unparsed=$((a_unparsed + un))
  a_no_lines=$((a_no_lines + noline)) a_unexpected=$((a_unexpected + odd))
done
sort -o "$work/a-absent" "$work/a-absent"
sort -o "$work/a-files" "$work/a-files"
[ "$LIST" = 1 ] && sed 's/^/ABSENT|group=A|/' "$work/a-absent"
echo "PINS|group=A|files=${#pins_a[@]}|files_all_ok=$a_all_ok|files_with_absent=$a_with_absent|entries=$((a_ok + a_mismatch + a_absent))|ok=$a_ok|mismatch=$a_mismatch|absent=$a_absent|unparsed=$a_unparsed|files_no_checksum_lines=$a_no_lines|unexpected_output=$a_unexpected|files_table_sha256=$(sha256sum <"$work/a-files" | cut -c1-64)|json=0"
expect A.files "${#pins_a[@]}" "$A_FILES"
expect A.files_all_ok "$a_all_ok" "$A_FILES_ALL_OK"
expect A.files_with_absent "$a_with_absent" "$A_FILES_WITH_ABSENT"
expect A.entries "$((a_ok + a_mismatch + a_absent))" "$A_ENTRIES"
expect A.ok "$a_ok" "$A_OK"
expect A.mismatch "$a_mismatch" "$A_MISMATCH"
expect A.absent "$a_absent" "$A_ABSENT"
expect A.unparsed "$a_unparsed" "$A_UNPARSED"
expect A.files_no_checksum_lines "$a_no_lines" "$A_FILES_NO_CHECKSUM_LINES"
expect A.unexpected_output "$a_unexpected" "$A_UNEXPECTED_OUTPUT"
expect A.files_table_sha256 "$(sha256sum <scripts/check-pins.files | cut -c1-64)" "$A_FILES_TABLE_SHA256"
if ! diff scripts/check-pins.files "$work/a-files" >/dev/null; then
  echo "MISS|A.files_table_differs_from_scripts/check-pins.files|json=0"
  diff scripts/check-pins.files "$work/a-files" || true
  misses=$((misses + 1))
fi
expect A.absent_list_sha256 "$(sha256sum <scripts/check-pins.absent | cut -c1-64)" "$A_ABSENT_LIST_SHA256"
if ! diff <(printf '%s\n' "${A_ABSENT_PER_FILE[@]}") "$work/a-per-file" >/dev/null; then
  echo "MISS|A.absent_per_file|json=0"
  diff <(printf '%s\n' "${A_ABSENT_PER_FILE[@]}") "$work/a-per-file" || true
  misses=$((misses + 1))
fi
if ! diff scripts/check-pins.absent "$work/a-absent" >/dev/null; then
  echo "MISS|A.absent_entries_differ_from_scripts/check-pins.absent|json=0"
  diff scripts/check-pins.absent "$work/a-absent" || true
  misses=$((misses + 1))
fi

# ---- B and C: measured, frozen
judge() { # want target -> one of ok mismatch absent outside
  local got
  if [[ $2 == /* ]]; then
    echo outside
  elif [ ! -f "$2" ]; then
    echo absent
  else
    read -r got _ < <(sha256sum <"$2")
    if [ "$got" = "${1,,}" ]; then echo ok; else echo mismatch; fi
  fi
}
measure() { # group files...
  local g=$1 f d line r name ok mm ab os ot files=0 all_ok=0 t_ok=0 t_mm=0 t_ab=0 t_os=0 t_ot=0
  shift
  : >"$work/$g-not-ok"
  for f in "$@"; do
    d=${f%/*}
    [ "$d" = "$f" ] && d=.
    ok=0 mm=0 ab=0 os=0 ot=0
    while IFS= read -r line || [ -n "$line" ]; do
      line=${line%$'\r'}
      if [[ $line =~ ^([0-9a-fA-F]{64})\ [\ *](.+)$ ]]; then
        name=${BASH_REMATCH[2]}
        [[ $name == /* ]] || name="$d/$name"
        r=$(judge "${BASH_REMATCH[1]}" "$name")
      elif [[ $line =~ ^([0-9a-fA-F]{64})[[:blank:]]*$ ]]; then
        r=$(judge "${BASH_REMATCH[1]}" "${f%.sha256}")
      elif [[ $line =~ ^SHA256\ \((.+)\)\ =\ ([0-9a-fA-F]{64})$ ]]; then
        name=${BASH_REMATCH[1]}
        [[ $name == /* ]] || name="$d/$name"
        r=$(judge "${BASH_REMATCH[2]}" "$name")
      elif [ -z "${line//[[:space:]]/}" ]; then
        continue
      else
        r=other
      fi
      case $r in
        ok) ok=$((ok + 1)) ;;
        mismatch) mm=$((mm + 1)) ;;
        absent) ab=$((ab + 1)) ;;
        outside) os=$((os + 1)) ;;
        other) ot=$((ot + 1)) ;;
      esac
    done <"$f"
    files=$((files + 1))
    if [ "$ok" -gt 0 ] && [ $((mm + ab + os + ot)) -eq 0 ]; then
      all_ok=$((all_ok + 1))
    else
      printf '%s|ok=%d|mismatch=%d|absent=%d|outside=%d|other=%d\n' "$f" "$ok" "$mm" "$ab" "$os" "$ot" >>"$work/$g-not-ok"
    fi
    t_ok=$((t_ok + ok)) t_mm=$((t_mm + mm)) t_ab=$((t_ab + ab)) t_os=$((t_os + os)) t_ot=$((t_ot + ot))
  done
  sort -o "$work/$g-not-ok" "$work/$g-not-ok"
  [ "$LIST" = 1 ] && sed "s/^/NOT_OK|group=$g|/" "$work/$g-not-ok"
  echo "PINS|group=$g|files=$files|files_all_ok=$all_ok|not_ok=$((files - all_ok))|ok=$t_ok|mismatch=$t_mm|absent=$t_ab|outside=$t_os|other=$t_ot|not_ok_sha256=$(sha256sum <"$work/$g-not-ok" | cut -c1-64)|json=0"
  printf '%s %s %s %s %s %s %s %s\n' "$files" "$all_ok" "$t_ok" "$t_mm" "$t_ab" "$t_os" "$t_ot" \
    "$(sha256sum <"$work/$g-not-ok" | cut -c1-64)" >"$work/$g-counts"
}
for g in B C; do
  if [ "$g" = B ]; then measure B "${sidecars[@]}"; else measure C "${pins_c[@]}"; fi
  read -r files all_ok ok mm ab os ot digest <"$work/$g-counts"
  for k in FILES FILES_ALL_OK OK MISMATCH ABSENT OUTSIDE OTHER NOT_OK_SHA256; do
    want_var="${g}_$k"
    case $k in
      FILES) got=$files ;; FILES_ALL_OK) got=$all_ok ;; OK) got=$ok ;; MISMATCH) got=$mm ;;
      ABSENT) got=$ab ;; OUTSIDE) got=$os ;; OTHER) got=$ot ;; NOT_OK_SHA256) got=$digest ;;
    esac
    expect "$g.${k,,}" "$got" "${!want_var}"
  done
done

if [ "$misses" -eq 0 ]; then
  echo "PINS_CHECK|status=PASS|misses=0|json=0"
else
  echo "PINS_CHECK|status=FAIL|misses=$misses|json=0"
  exit 1
fi
