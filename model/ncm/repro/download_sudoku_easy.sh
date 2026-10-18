#!/usr/bin/env bash
# Download exactly the sudoku/easy checkpoint + dataset files at their pinned
# revisions. HELD: this is a no-op unless the operator sets NCM_OPERATOR_GO=1.
# Downloads ~163 MB of blobs; needs ~0.5 GB free. Resolves nothing else.
set -euo pipefail

CKPT_REPO="hazyresearch/ncm-checkpoints"
CKPT_REV="d342ce8aaea58830eef3b8ad473664673e41f692"
DATA_REPO="hazyresearch/ncm-datasets"
DATA_REV="6580ba41a4b0a976dde876fbe84d25327617b0e6"

ART="${NCM_ART_DIR:-$(cd "$(dirname "$0")" && pwd)/artifacts}"
CKPT_ROOT="$ART/ckpt"
DATA_ROOT="$ART/data"

# The five files this reproduction needs (path under each repo):
CKPT_FILES=( "sudoku/easy/generator.pt" "sudoku/easy/tokenizer.pt" "sudoku/easy/config.yaml" )
DATA_FILES=( "sudoku/easy/puzzles.pickle" "sudoku/easy/solutions.pickle" )

if [ "${NCM_OPERATOR_GO:-}" != "1" ]; then
  cat <<EOF
HELD - E=0: no blobs downloaded. This script fetches ONLY:
  $CKPT_REPO @ $CKPT_REV
    ${CKPT_FILES[*]}
  $DATA_REPO (dataset) @ $DATA_REV
    ${DATA_FILES[*]}
  -> $ART  (checkpoints in ckpt/, data in data/, ~163 MB total)
Set NCM_OPERATOR_GO=1 to run, only on the operator's explicit go.
After downloading, certify with ./verify_sudoku_easy.sh before any load.
EOF
  exit 0
fi

command -v hf >/dev/null 2>&1 || { echo "need the huggingface_hub CLI (hf)"; exit 2; }
mkdir -p "$CKPT_ROOT" "$DATA_ROOT"

echo "[download] checkpoints $CKPT_REPO @ $CKPT_REV"
hf download "$CKPT_REPO" "${CKPT_FILES[@]}" --revision "$CKPT_REV" --local-dir "$CKPT_ROOT"

echo "[download] datasets $DATA_REPO @ $DATA_REV"
hf download "$DATA_REPO" --repo-type dataset "${DATA_FILES[@]}" --revision "$DATA_REV" --local-dir "$DATA_ROOT"

echo "[download] done. sizes:"
for f in "${CKPT_FILES[@]}"; do printf '  %12s  %s\n' "$(stat -c%s "$CKPT_ROOT/$f" 2>/dev/null || echo '-')" "ckpt/$f"; done
for f in "${DATA_FILES[@]}"; do printf '  %12s  %s\n' "$(stat -c%s "$DATA_ROOT/$f" 2>/dev/null || echo '-')" "data/$f"; done
echo "[download] NOW RUN: ./verify_sudoku_easy.sh   (certify sha256 against the manifest before loading)"
