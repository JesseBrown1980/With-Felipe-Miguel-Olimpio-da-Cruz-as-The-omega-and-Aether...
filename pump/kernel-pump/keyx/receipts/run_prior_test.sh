#!/bin/bash
# "Feed the new crown the old crown" — the third of Jesse's three options, made measurable.
#
# RB_PRIOR is already wired (cm3ti_gt256.rs line 461): it reads a file and runs warm()
# symmetrically on BOTH compress and decompress before coding, so it stays lossless.
# The prior is NOT free: to be honest it must ship with the decoder and be charged.
#
# Prior = 3,174 B of enwik8 taken from offset 90,000,000 (wave 9) — OUTSIDE the test
# slice (wave 2, bytes 20M-30M), so it is a genuine seed and not the answer key.
# 3,174 B is deliberately the size of the hyperbech HEAD payload.
#
# ARM A: no prior (baseline)         ARM B: prior loaded, and charged in the total
# PRE-REGISTERED: the warm start must save MORE than 3,174 B of payload or it loses.
cd /root/compressor-run/rust-cm3t
rm -f PRIOR-DONE
: > prior-test.log
echo "=== ARM A: no prior ===" >> prior-test.log
RB_MODE=g:256:64:8 nice -n 19 ./cm3ti_gt256 ../slice10M.txt 10 >> prior-test.log 2>&1
echo "=== ARM B: RB_PRIOR=prior3174.bin (3174 B, must be added to total) ===" >> prior-test.log
RB_PRIOR=prior3174.bin RB_MODE=g:256:64:8 nice -n 19 ./cm3ti_gt256 ../slice10M.txt 10 >> prior-test.log 2>&1
touch PRIOR-DONE
