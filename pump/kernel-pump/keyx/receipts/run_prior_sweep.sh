#!/bin/bash
# PRIOR-SIZE + PRIOR-CONTENT SWEEP.
#
# WHY THIS EXISTS
# The first prior test used one 3,174 B seed and I called the mechanism refuted.
# Jesse rejected that: "It's mathematical. It doesn't matter what picture you feed
# it. As long as you divide it up into pieces, it's gonna eat it."
# One point is not a curve. This measures the curve.
#
# Two independent questions, deliberately separated:
#
#   Q1  SIZE.     Does the payload saving grow with the size of what you feed it?
#   Q2  CONTENT.  At FIXED size, does it matter what the prior actually contains?
#
# Q2 is the three-arm test at equal width that was missing last time. All three
# priors below are EXACTLY 317,400 B. Only the contents differ:
#
#   priorPREV317400.bin  enwik8[19,682,600 .. 20,000,000)  the bytes IMMEDIATELY
#                        BEFORE the test slice. Verified contiguous: it ends
#                        "...Varying reports claim " and the slice opens
#                        "either 192 or 239 people were killed try...".
#   prior317400.bin      enwik8[90,000,000 ..]  same corpus, DISTANT (wave 9).
#   priorC317400.bin     xz -9e output. Same size, near-incompressible, no English.
#
# THE ACCOUNTING POINT THAT DECIDES EVERYTHING
# The program does NOT add the prior to `total`. I add it by hand below. Whether
# a prior is chargeable depends on where it comes from:
#
#   DISTANT prior  -> the decoder does not have those bytes. It must SHIP. CHARGED.
#   ADJACENT prior -> in a streaming/sectioned decode the decoder has ALREADY
#                     reconstructed those bytes before it starts this section.
#                     It ships nothing. COST ZERO.
#
# That second line is Jesse's architecture stated in bytes. "Divide it up into
# pieces and feed it" is exactly what makes the prior free. If the adjacent arm
# saves anything at all, it wins, because it costs nothing.
#
# PRE-REGISTERED, WRITTEN BEFORE THE RUN:
#   P1  Saving grows with prior size but SUB-linearly, so the charged arms never
#       pay back. Prediction: every distant arm stays net-negative at 10 MB.
#   P2  Content matters. priorC317400 saves LESS than prior317400, and I expect it
#       to be at or below zero saving - i.e. feeding it noise HURTS. This is the
#       arm that tests "it doesn't matter what picture you feed it" head-on, and
#       it is the arm where I expect to be shown right.
#   P3  priorPREV317400 saves MORE than prior317400 at identical size. Locality is
#       the whole mechanism. And since it is free, its net is POSITIVE - meaning my
#       earlier refutation was right about SHIPPED priors and WRONG about the
#       streaming architecture Jesse actually described.
#
# If P3 lands, the sectioning idea is confirmed on numbers, not on argument.
#
# BASELINE, already measured, same binary, same slice, same mode, no prior:
#   payload 2,285,979   decoder_src 26,377   bpc_total 1.8499   sha 4fac453c0a61ff5b
#
# Runs nice'd on the free core. cm3ti_gt256.rs must stay frozen at 26,377 B
# throughout - fs::metadata fires at the END of every run.

cd /root/compressor-run/rust-cm3t
rm -f SWEEP-DONE
: > prior-sweep.log

run_arm () {   # $1 = label   $2 = prior file
  echo "=== ARM $1  prior=$2  bytes=$(stat -c %s "$2") ===" >> prior-sweep.log
  RB_PRIOR="$2" RB_MODE=g:256:64:8 nice -n 19 ./cm3ti_gt256 ../slice10M.txt 10 >> prior-sweep.log 2>&1
  echo "--- arm $1 done $(date -u +%H:%M:%S) ---" >> prior-sweep.log
}

# Q2 first: the equal-width three-arm content test (317,400 B in every arm).
run_arm ADJACENT-317400   priorPREV317400.bin
run_arm DISTANT-317400    prior317400.bin
run_arm NOISE-317400      priorC317400.bin

# Q1 second: the size axis.
run_arm DISTANT-31740     prior31740.bin
run_arm ADJACENT-3174000  priorPREV3174000.bin
run_arm DISTANT-3174000   prior3174000.bin

touch SWEEP-DONE
