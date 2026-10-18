#!/usr/bin/env bash
# Checks model/gnn-zoo: pinned bytes, the corpora stream verifier, the stdlib tools, the Rust crate and the
# parity run of the aether ports on the zoo's checkpoints.
# Usage: model/gnn-zoo/check.sh [--write-parity]
# Needs rustup with toolchain 1.81.0 (clippy, rustfmt) and python3 >= 3.11.
# ASOLARIA_TORCH_PYTHON=<python with torch 2.14.1+cpu and torch_geometric 2.8.1> also runs the torch checks
# and the full parity run (both graphs, both GCNConv variants); without it they print SKIP, and the parity run
# uses the committed first-training-set fixture only. --write-parity rewrites results/parity.hbp (needs torch).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

WRITE=0
[ "${1:-}" = "--write-parity" ] && WRITE=1
EXAMPLES=(l0_baseline l0_retrained l1_prototype l2_contrastive l4_gsl_model l4_gsl_archive_200k l4_gsl_archive_200k_shuffled)
BIN="${CARGO_TARGET_DIR:-target}/release/examples"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

sha256sum -c --quiet UPSTREAM.sha256
echo "UPSTREAM|check=PASS|files=$(grep -c . UPSTREAM.sha256)|json=0"
(cd vendor && sha256sum -c --quiet SHA256SUMS)
echo "VENDOR|sha256sum_c=PASS|files=$(grep -c . vendor/SHA256SUMS)|json=0"
python3 -I tools/verify_corpora.py | tail -n 1
python3 -I tools/zoo_inspect.py --check
python3 -I tools/zoo_weights.py --self-check
python3 -I tools/zoo_weights.py --check
python3 -I tools/corpus_check.py --check

cargo +1.81.0 fmt --check
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
if grep -rnE '\bf32\b|\bf64\b|as f[0-9]' src/ examples/ weights/; then
  echo "FLOAT|found in src/, examples/ or weights/|json=0"
  exit 1
fi
cargo +1.81.0 build --locked --release --examples -q

fixture_parity() {
  for e in "${EXAMPLES[@]}"; do "$BIN/$e" --check tests/fixtures/parity-first.hbp; done > "$tmp/fixture-rows.hbp"
  grep -v '^#' results/parity.hbp | grep '|set=first|' | grep '|same_forward=1|' | diff - "$tmp/fixture-rows.hbp"
  echo "PARITY|fixture=tests/fixtures/parity-first.hbp|rows=$(grep -c . "$tmp/fixture-rows.hbp")|equal_to_results=1|json=0"
}

torch_checks() {
  local torch_py=("$ASOLARIA_TORCH_PYTHON" -I -W ignore::FutureWarning)
  "${torch_py[@]}" tools/zoo_torch.py load --check
  "${torch_py[@]}" tools/zoo_torch.py trained-on --check
  "${torch_py[@]}" tools/zoo_torch.py parity-fixture --check
  "${torch_py[@]}" tools/zoo_torch.py parity "$tmp/parity-input.hbp"
  for e in "${EXAMPLES[@]}"; do "$BIN/$e" --check "$tmp/parity-input.hbp"; done > "$tmp/parity-rows.hbp"
  if [ "$WRITE" = 1 ]; then
    {
      echo "# results/parity.hbp: PARITY rows of the seven examples on the file of tools/zoo_torch.py parity; written"
      echo "# by ./check.sh --write-parity. q24 = the port's Q24 output; torch outputs are rounded to Q24 from their bits."
      grep '^VERSIONS|' "$tmp/parity-input.hbp" | sed 's/^/# /'
      for f in ../l0-edge/src/model.rs ../l0-edge/src/weights.rs ../l1-prototype/src/model.rs \
               ../l2-contrastive/src/model.rs ../l4-gslgnn/src/model.rs; do
        echo "# PORTSRC|path=model/${f#../}|sha256=$(sha256sum "$f" | cut -c1-64)"
      done
      cat "$tmp/parity-rows.hbp"
    } > results/parity.hbp
    echo "PARITY|written=results/parity.hbp|rows=$(grep -c . "$tmp/parity-rows.hbp")|json=0"
  else
    grep -v '^#' results/parity.hbp | diff - "$tmp/parity-rows.hbp"
    echo "PARITY|full_run=PASS|rows=$(grep -c . "$tmp/parity-rows.hbp")|json=0"
  fi
}

if [ -z "${ASOLARIA_TORCH_PYTHON:-}" ]; then
  [ "$WRITE" = 0 ] || { echo "--write-parity needs ASOLARIA_TORCH_PYTHON" >&2; exit 2; }
  fixture_parity
  echo "TORCH|SKIP|reason=ASOLARIA_TORCH_PYTHON unset|json=0"
elif [ "$WRITE" = 1 ]; then
  torch_checks
  fixture_parity
else
  fixture_parity
  torch_checks
fi
