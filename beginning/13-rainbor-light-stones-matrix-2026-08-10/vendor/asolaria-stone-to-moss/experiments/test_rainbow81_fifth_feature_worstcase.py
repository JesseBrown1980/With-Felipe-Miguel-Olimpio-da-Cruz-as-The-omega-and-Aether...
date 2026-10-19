#!/usr/bin/env python3
"""Exhaustively check EVERY address pair/candidate under bounded five-channel error.

Not optical data. Four peak measurements and the fifth synthetic side-channel
have independently allowed errors in [-24,24]. A candidate may pass the
four-peak decoder if its ideal peak is within 48 of a mixed peak; for the
fifth channel it may pass if its ideal value is within 48 of the mixed value.
"""
from itertools import combinations, product
import json

SEATS = [tuple(((s // 3) // (3**i)) % 3 - 1 for i in range(3)) + (s % 3 - 1,)
         for s in range(81)]
ADDRESS = {x:i for i,x in enumerate(SEATS)}
assert len(ADDRESS) == 81 and SEATS[40] == (0,0,0,0)
FREE_CENTRE = {"identity":"BROWN_HILBERT_FREE_CENTRE", "seat":None, "uncoloured":True}
FIFTH = [128*sum(3**i * x*x for i,x in enumerate(t)) for t in SEATS]
noise=24
count=0
accepted=0
min_gap2=None
for left,right in combinations(range(81),2):
    lhs,rhs=SEATS[left],SEATS[right]
    choices = [[trit for trit in (-1,0,1)
                if abs(25*(a+b)-50*trit) <= 2*noise]
               for a,b in zip(lhs,rhs)]
    for t in product(*choices):
        candidate=ADDRESS[t]
        gap2=abs(FIFTH[left]+FIFTH[right]-2*FIFTH[candidate])
        count+=1
        if min_gap2 is None or gap2 < min_gap2:
            min_gap2=gap2
        if gap2 <= 4*noise:
            accepted+=1
assert count == 14240 and min_gap2 == 128 and accepted == 0
print(json.dumps({
    "schema":"RAINBOW81-FIFTH-FEATURE-WORSTCASE-V1",
    "date":"2026-10-14",
    "kind":"exhaustive discrete synthetic control (not hardware)",
    "pairs":3240,
    "candidate_comparisons":count,
    "minimum_fifth_channel_gap_units":min_gap2//2,
    "maximum_gap_allowing_false_accept_units":2*noise,
    "false_accept_candidates":accepted,
    "free_centre":FREE_CENTRE,
    "single_seat_zero_address_is_separate":True,
    "status":"PASS"
},indent=2,sort_keys=True))
