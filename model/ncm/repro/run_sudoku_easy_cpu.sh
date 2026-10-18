#!/usr/bin/env bash
# CPU reproduction of the released sudoku/easy NCM eval (metric: exact match).
# HELD - E != 0: this is a no-op unless the operator sets NCM_OPERATOR_GO=1.
#
# It never edits the vendored tree. It copies vendor/ncm into a scratch workdir,
# applies cpu.patch (cuda->cpu + routes every .pt/.pickle load through
# safe_load.py), drops safe_load.py in as repro_safe_load.py, and runs one CPU
# shard then the merge. The generator/tokenizer load with weights_only=True and
# the datasets through a restricted unpickler.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
VENDOR="$(cd "$HERE/../vendor/ncm" && pwd)"
ART="${NCM_ART_DIR:-$HERE/artifacts}"
CK="$ART/ckpt/sudoku/easy"
DD="$ART/data/sudoku/easy"
WORK="${NCM_WORK_DIR:-${TMPDIR:-/tmp}/ncm-repro-sudoku-easy}"

if [ "${NCM_OPERATOR_GO:-}" != "1" ]; then
  cat <<EOF
HELD - E != 0: the sudoku/easy evaluation has NOT been run.
It runs ONLY on the operator's explicit go: set NCM_OPERATOR_GO=1.
Before running: ./download_sudoku_easy.sh then ./verify_sudoku_easy.sh must both pass.
Plan when enabled (CPU, deterministic greedy, no GPU, no network):
  CUDA_VISIBLE_DEVICES=''  OMP_NUM_THREADS=\${OMP_NUM_THREADS:-nproc}  TOKENIZERS_PARALLELISM=false
  workdir: $WORK  (copy of vendor/ncm + cpu.patch; vendor/ stays byte-identical)
  shard : python scripts/eval_shard.py --config config/eval/sudoku-easy.yaml \\
            --checkpoint-dir $CK --data-dir $DD --shard 0 --nshards 1 \\
            --out eval/sudoku-easy/shard_0.pkl
  score : python scripts/eval_merge.py --config config/eval/sudoku-easy.yaml \\
            --glob 'eval/sudoku-easy/shard_*.pkl'   # -> solved %, cell %, valid %
EOF
  exit 0
fi

# --- require certified inputs before touching any pickle ---
"$HERE/verify_sudoku_easy.sh" || { echo "verify failed; refusing to run"; exit 2; }
for f in "$CK/generator.pt" "$CK/tokenizer.pt" "$DD/puzzles.pickle" "$DD/solutions.pickle"; do
  [ -f "$f" ] || { echo "missing $f; run ./download_sudoku_easy.sh first"; exit 2; }
done

# --- pick a CPU torch env (record-only defaults; override with NCM_PY) ---
PY="${NCM_PY:-}"
if [ -z "$PY" ]; then
  for cand in \
    /tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad/ci-torch-venv/bin/python \
    /tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad/torch213/bin/python ; do
    [ -x "$cand" ] && PY="$cand" && break
  done
fi
[ -n "$PY" ] || { echo "no CPU torch env found; set NCM_PY=/path/to/python"; exit 2; }
echo "[run] python: $PY ($("$PY" -I -c 'import torch;print("torch",torch.__version__)'))"

# --- build the scratch workdir (vendor stays untouched) ---
rm -rf "$WORK"; mkdir -p "$WORK"
cp -r "$VENDOR/." "$WORK/"
cp "$HERE/safe_load.py" "$WORK/repro_safe_load.py"
( cd "$WORK" && patch -p1 < "$HERE/cpu.patch" >/dev/null ) || { echo "cpu.patch failed to apply"; exit 2; }
mkdir -p "$WORK/eval/sudoku-easy"

# --- run: CPU only, deterministic (sudoku-easy config has temperature 0.0 = greedy argmax, no seed) ---
export CUDA_VISIBLE_DEVICES=''
export TOKENIZERS_PARALLELISM=false
export OMP_NUM_THREADS="${OMP_NUM_THREADS:-$(nproc)}"
export MKL_NUM_THREADS="$OMP_NUM_THREADS"
export PYTHONHASHSEED=0
export NCM_ROOT="$WORK"
export NCM_OPERATOR_GO=1   # the safe loaders in repro_safe_load.py check this

echo "[run] generation shard (CPU, 1 shard)"
( cd "$WORK" && "$PY" -I scripts/eval_shard.py \
    --config config/eval/sudoku-easy.yaml \
    --checkpoint-dir "$CK" --data-dir "$DD" \
    --shard 0 --nshards 1 --out eval/sudoku-easy/shard_0.pkl )

echo "[run] merge + score (exact match)"
( cd "$WORK" && "$PY" -I scripts/eval_merge.py \
    --config config/eval/sudoku-easy.yaml \
    --glob 'eval/sudoku-easy/shard_*.pkl' )

echo "[run] done. Authors' NAMED sudoku-easy solve rate is 99.5% (not reproduced until this prints)."
