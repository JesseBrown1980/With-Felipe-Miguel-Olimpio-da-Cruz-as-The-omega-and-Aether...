#!/usr/bin/env bash
# End-to-end probes through the built `asolaria gate` binary (stdin envelopes; nothing written to the repo).
set -u
B="$(cd "$(dirname "$0")/../../../../../.." && pwd)/cli/target/debug/asolaria"
D=$(cd "$(dirname "$0")" && pwd)
EX="$D/example.hbp"
W="$D/work"; rm -rf "$W"; mkdir -p "$W"

# edit KEY=VALUE pairs on the example (replace if present, else append); "-KEY" deletes the key
mk() { local out="$W/$1"; shift; cp "$EX" "$out"
  for kv in "$@"; do
    if [[ $kv == -* ]]; then sed -i "/^${kv#-}=/d" "$out"; continue; fi
    k=${kv%%=*}
    if grep -q "^$k=" "$out"; then sed -i "s|^$k=.*|$kv|" "$out"; else echo "$kv" >> "$out"; fi
  done; echo "$out"; }
gate() { local f=$1; shift; local row; row=$("$B" gate - "$@" < "$f"); local rc=$?
  printf '  %-44s exit=%s | %s\n' "$(basename "$f")" "$rc" "$(echo "$row" | tr '|' '\n' | grep -E '^(verdict|hookwall|spawn_gate|tier_gate|fischer|input_guard|signature)=' | tr '\n' ' ')"
  echo "      reason=$(echo "$row" | sed -n 's/.*|reason=\(.*\)|json=0$/\1/p')"; }

echo "== l0_real 0 vs 1 =="
gate "$(mk A_l0_0.hbp l0_real=0)"; gate "$(mk A_l0_1.hbp l0_real=1)"
gate "$(mk B_l0_0.hbp -hbp_path pid=X1 l0_real=0)"; gate "$(mk B_l0_1.hbp -hbp_path pid=X1 l0_real=1)"
gate "$(mk D_l0_0.hbp -hbp_path pid=X1 authority_jump=1 cosign=c l0_real=0)"; gate "$(mk D_l0_1.hbp -hbp_path pid=X1 authority_jump=1 cosign=c l0_real=1)"
echo "== forged spawn scores forward_score_q=1000 reverse_risk_q=0 vs 100/900 =="
gate "$(mk S_forged.hbp forward_score_q=1000 reverse_risk_q=0)"; gate "$(mk S_honest.hbp forward_score_q=100 reverse_risk_q=900)"
echo "== caller_tier label =="
gate "$(mk T_pub_sov.hbp caller_tier=public target_tier=sovereignty)"
gate "$(mk T_sov_sov.hbp caller_tier=sovereignty target_tier=sovereignty)"
echo "== operator_witness bool =="
gate "$(mk W0.hbp operator_witness_required=1 operator_witness=0)"; gate "$(mk W1.hbp operator_witness_required=1 operator_witness=1)"
echo "== g4_state strings =="
for s in DESCRIBED UNKNOWN CONVERGED MISTAKE_FLAGGED converged; do gate "$(mk G_$s.hbp g4_state=$s)"; done
gate "$(mk G_empty.hbp 'g4_state=')"
gate "$(mk G_spawn_unknown.hbp verb=spawn -halt_path -hbp_path pid=X1 l0_real=0 g4_state=UNKNOWN)"
gate "$(mk G_spawn_converged.hbp verb=spawn -halt_path -hbp_path pid=X1 l0_real=0 g4_state=CONVERGED)"
echo "== signatures =="
"$B" keygen --out "$W/seed" > "$W/keygen.row"; PUB=$(sed -n 's/.*public=\([0-9a-f]*\).*/\1/p' "$W/keygen.row")
SIG=$("$B" sign --key "$W/seed" "$EX" | sed -n 's/.*sig=\([0-9a-f]*\).*/\1/p')
first=${SIG:0:1}; if [[ $first == 0 ]]; then f=1; else f=0; fi; FLIP="$f${SIG:1}"
gate "$EX" --pub "$PUB" --sig "$SIG"
gate "$EX" --pub "$PUB" --sig "$FLIP"
gate "$(mk SIG_other_bytes.hbp l0_real=1 caller_tier=sovereignty)" --pub "$PUB" --sig "$SIG"
printf 'garbage\n' > "$W/garbage.hbp"; gate "$W/garbage.hbp" --pub "$PUB" --sig "$FLIP"
rm -f "$W/seed"
