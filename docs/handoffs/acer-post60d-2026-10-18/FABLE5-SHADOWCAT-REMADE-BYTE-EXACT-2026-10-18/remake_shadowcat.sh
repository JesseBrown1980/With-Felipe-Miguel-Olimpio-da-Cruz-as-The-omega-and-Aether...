#!/bin/sh
# Remake shadowcat.hbp / shadowcat.hbi byte-exact from ACER's unchanged sources, at the original Linux path, Rust 1.81.0.
# Only Cargo.toml is reconstructed (no dependencies). Never overwrites: refuses if the work dir exists.
export PATH=/root/.cargo/bin:$PATH
SRC=/mnt/d/asolaria-absorb/shadowcat
W=/root/_horizon/shadowcat
[ -e "$W" ] && { echo "REFUSE|exists=$W|json=0"; exit 1; }
mkdir -p "$W/src/bin" "$W/out"
cp "$SRC/main.rs" "$SRC/sha256.rs" "$W/src/"
cp "$SRC/verify.rs" "$SRC/threegap.rs" "$SRC/callingchain.rs" "$W/src/bin/"
printf '%s\n' '[package]' 'name = "shadowcat"' 'version = "0.1.0"' 'edition = "2021"' '' '[dependencies]' > "$W/Cargo.toml"
cd "$W" || exit 1
echo "SRCPARITY|$(cd "$SRC" && sha256sum main.rs sha256.rs verify.rs threegap.rs callingchain.rs | sha256sum | cut -c1-16)|copied=$(cat src/main.rs src/sha256.rs src/bin/verify.rs src/bin/threegap.rs src/bin/callingchain.rs | sha256sum | cut -c1-16)|json=0"
cargo +1.81 build --release 2>&1 | grep -E 'error|warning: unused|Finished' | head -8
./target/release/shadowcat     > out/RUN-remake.txt 2>&1;      echo "RC_shadowcat=$?"
./target/release/verify        > out/VERIFY-remake.txt 2>&1;   echo "RC_verify=$?"
./target/release/threegap      > out/THREEGAP-remake.txt 2>&1; echo "RC_threegap=$?"
./target/release/callingchain  > out/CALLINGCHAIN-remake.txt 2>&1; echo "RC_callingchain=$?"
HBP=$(sha256sum out/shadowcat.hbp | cut -d' ' -f1); HBI=$(sha256sum out/shadowcat.hbi | cut -d' ' -f1)
TRAILER=$(tail -c 32 out/shadowcat.hbp | od -An -tx1 | tr -d ' \n')
echo "REMAKE|shadowcat.hbp|bytes=$(wc -c < out/shadowcat.hbp)|sha256=$HBP|recorded=7ccf5b1c240e796b8ef653ca89269620505c01ff9bd49f20480e9e40722842d1|match=$([ "$HBP" = 7ccf5b1c240e796b8ef653ca89269620505c01ff9bd49f20480e9e40722842d1 ] && echo 1 || echo 0)|json=0"
echo "REMAKE|shadowcat.hbi|bytes=$(wc -c < out/shadowcat.hbi)|sha256=$HBI|recorded=82b52dce49b411624fb683ea1b1eb86d808b6977e401bbe3e6c3627f49c666d7|match=$([ "$HBI" = 82b52dce49b411624fb683ea1b1eb86d808b6977e401bbe3e6c3627f49c666d7 ] && echo 1 || echo 0)|json=0"
echo "REMAKE|hbp_trailer=$TRAILER|recorded=8763231837629f9461e8ec5e7a26d1c5e1cfc3ff16aa3f019e085bc51b23b987|match=$([ "$TRAILER" = 8763231837629f9461e8ec5e7a26d1c5e1cfc3ff16aa3f019e085bc51b23b987 ] && echo 1 || echo 0)|json=0"
for pair in "RUN-2026-07-26.txt:RUN-remake.txt" "VERIFY-2026-07-26.txt:VERIFY-remake.txt" "THREEGAP-2026-07-26.txt:THREEGAP-remake.txt"; do
  o="${pair%%:*}"; n="${pair##*:}"
  d=$(diff "$SRC/$o" "out/$n" | grep -c '^[<>]')
  echo "LOGDIFF|orig=$o|remake=$n|differing_lines=$d|identical=$(cmp -s "$SRC/$o" "out/$n" && echo 1 || echo 0)|json=0"
done
ls -la out | sed 's/^/OUT /'
