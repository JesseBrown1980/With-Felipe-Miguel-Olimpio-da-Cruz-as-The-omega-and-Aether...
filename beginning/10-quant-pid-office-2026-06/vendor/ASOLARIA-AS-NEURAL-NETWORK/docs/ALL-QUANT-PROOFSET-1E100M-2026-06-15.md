# All Quant Proof Set - 1e100Million

Date: 2026-06-15
Tool: all-quant-proof-set-1e100m.v1

## Scope

This proof set runs the eight quant engines together over concrete finite vectors and address samples, then tests the 1e100000000 target by symbolic modular invariants. It does not enumerate 1e100000000 agents and does not materialize a 100,000,001-digit decimal string.

## Core formulas

- QUANT8: count-sketch JL bucket, Turbo int8, Polar sign plane, Zeta log bucket, Triple ternary, Quadruple 4-level, JS histogram, von-Mangoldt prime-power accumulator.
- Zeta address quant: lane = index mod 3; residue6 = index mod 6; cylinder = floor(index/6), phase index mod 6.
- von-Mangoldt address class: unit / prime / p2 / p3 / pk / composite; Lambda(n) != 0 exactly on prime powers.
- QUANT4 address quant: sha256 tuple -> lane mod 3, quad mod 4, glyph1024, sector113, cube_bh.
- Extreme target: 10^100000000 mod 3 = 1; 10^100000000 mod 6 = 4; 10^E = 2^E * 5^E, so it is composite, not a prime power.

## Row counts

- AQPEXTREMEDEF: 1
- AQPEXTREMEFORMULA: 1
- AQPEXTREMEPROBES: 1
- AQPEXTREMESAMPLE: 1
- AQPFALCONCORE: 1
- AQPFTR: 1
- AQPHDR: 1
- AQPOMNIQUANT: 4
- AQPQUANT4: 1
- AQPQUANT4ADDR: 3
- AQPQUANT8: 5
- AQPQUANT8PAIR: 4
- AQPSCOPE: 1
- AQPZETACLASS: 17
- AQPZETAPROCESS: 1
- AQPZETASWEEP: 1
- AQPZETATRANSITION: 6

## HBP proof rows

```text
AQPHDR|id=all-quant-proof-set-1e100m.v1|date=2026-06-15|target=1e100000000|engines=Polar+Turbo+JL+Zeta+Triple+Quadruple+JS-histogram+von-Mangoldt+QUANT4+OmniQuant|json=0
AQPSCOPE|enumerates_universe=0|materializes_100000001_digit_decimal=0|method=finite-engine-runs+symbolic-extreme-address-proof+saved-HBP-rows|json=0
AQPQUANT8|scenario=dense-sine|dims=4096|D=1024|tuple_bytes=3200|tuple_sha16=e1694413c82ffeab|scale=2.420110762|turbo_nonzero=1019|sign_bits=519|zeta_bucket_counts=295,368,184,96,36,21,13,6,1,1,1,2,0,0,0,0|triple_counts_neg_zero_pos=260,505,259|quad_counts_0_1_2_3=158,361,368,137|hist_nonzero=236|vmAcc=270|json=0
AQPQUANT8|scenario=sparse-prime-spikes|dims=4096|D=1024|tuple_bytes=3200|tuple_sha16=5948f72eeb506988|scale=2.875000000|turbo_nonzero=16|sign_bits=5|zeta_bucket_counts=12,4,0,0,0,0,0,0,0,0,0,0,0,0,0,1008|triple_counts_neg_zero_pos=5,1008,11|quad_counts_0_1_2_3=4,1009,3,8|hist_nonzero=17|vmAcc=12|json=0
AQPQUANT8|scenario=heavy-tail|dims=4096|D=1024|tuple_bytes=3200|tuple_sha16=049f8b42c47d6ac4|scale=0.459583867|turbo_nonzero=966|sign_bits=531|zeta_bucket_counts=6,37,171,298,248,104,69,33,27,13,9,3,3,0,2,1|triple_counts_neg_zero_pos=11,998,15|quad_counts_0_1_2_3=1,530,488,5|hist_nonzero=95|vmAcc=253|json=0
AQPQUANT8|scenario=alternating-cancel|dims=4096|D=1024|tuple_bytes=3200|tuple_sha16=a45fa3e6774cd63d|scale=2.724137931|turbo_nonzero=1012|sign_bits=512|zeta_bucket_counts=281,433,94,194,0,10,0,0,0,0,0,0,0,0,0,12|triple_counts_neg_zero_pos=264,492,268|quad_counts_0_1_2_3=140,372,371,141|hist_nonzero=115|vmAcc=266|json=0
AQPQUANT8|scenario=monotone-ramp|dims=4096|D=1024|tuple_bytes=3200|tuple_sha16=86523ee1e83b4877|scale=2.000488400|turbo_nonzero=1022|sign_bits=512|zeta_bucket_counts=820,100,53,27,12,6,2,2,1,0,0,1,0,0,0,0|triple_counts_neg_zero_pos=446,134,444|quad_counts_0_1_2_3=410,102,102,410|hist_nonzero=241|vmAcc=266|json=0
AQPQUANT8PAIR|a=dense-sine|b=sparse-prime-spikes|raw_cos=0.012071|quant_cos=0.024682|abs_err=0.012610|metric=diagnostic-not-promotion-gate|json=0
AQPQUANT8PAIR|a=dense-sine|b=heavy-tail|raw_cos=-0.004804|quant_cos=0.027331|abs_err=0.032134|metric=diagnostic-not-promotion-gate|json=0
AQPQUANT8PAIR|a=dense-sine|b=alternating-cancel|raw_cos=0.000316|quant_cos=0.005459|abs_err=0.005144|metric=diagnostic-not-promotion-gate|json=0
AQPQUANT8PAIR|a=heavy-tail|b=monotone-ramp|raw_cos=0.004072|quant_cos=0.019061|abs_err=0.014989|metric=diagnostic-not-promotion-gate|json=0
AQPFALCONCORE|status=PASS|polar=410d025caaf843f0|turbo=7b7c7a8ff10e4341|jl=0316dae543bf7920|jl_dim=24|triple=cf6d9c2be60302e7|zero_loss_boundary=payload_hash_preserved; numeric quantization is approximate unless proven by caller|json=0
AQPZETASWEEP|limit=100000|primes=9592|primes_gt3=9590|pairs=9589|violations=0|gap_mod6_0=3852|gap_mod6_2=2869|gap_mod6_4=2868|json=0
AQPZETACLASS|index=0|lane=0|residue6=0|ppow=unit|binder_lane=0|binder_ppow=unit|prime_residence=none|ring=0|phase=0|json=0
AQPZETACLASS|index=1|lane=1|residue6=1|ppow=unit|binder_lane=1|binder_ppow=unit|prime_residence=none|ring=0|phase=1|json=0
AQPZETACLASS|index=2|lane=2|residue6=2|ppow=prime|binder_lane=2|binder_ppow=prime|prime_residence=small-prime-exception|ring=0|phase=2|json=0
AQPZETACLASS|index=3|lane=0|residue6=3|ppow=prime|binder_lane=0|binder_ppow=prime|prime_residence=small-prime-exception|ring=0|phase=3|json=0
AQPZETACLASS|index=4|lane=1|residue6=4|ppow=p2|binder_lane=1|binder_ppow=p2|prime_residence=none|ring=0|phase=4|json=0
AQPZETACLASS|index=5|lane=2|residue6=5|ppow=prime|binder_lane=2|binder_ppow=prime|prime_residence=5|ring=0|phase=5|json=0
AQPZETACLASS|index=6|lane=0|residue6=0|ppow=composite|binder_lane=0|binder_ppow=composite|prime_residence=none|ring=1|phase=0|json=0
AQPZETACLASS|index=25|lane=1|residue6=1|ppow=p2|binder_lane=1|binder_ppow=p2|prime_residence=none|ring=4|phase=1|json=0
AQPZETACLASS|index=49|lane=1|residue6=1|ppow=p2|binder_lane=1|binder_ppow=p2|prime_residence=none|ring=8|phase=1|json=0
AQPZETACLASS|index=137|lane=2|residue6=5|ppow=prime|binder_lane=2|binder_ppow=prime|prime_residence=5|ring=22|phase=5|json=0
AQPZETACLASS|index=343|lane=1|residue6=1|ppow=p3|binder_lane=1|binder_ppow=p3|prime_residence=none|ring=57|phase=1|json=0
AQPZETACLASS|index=961|lane=1|residue6=1|ppow=p2|binder_lane=1|binder_ppow=p2|prime_residence=none|ring=160|phase=1|json=0
AQPZETACLASS|index=2401|lane=1|residue6=1|ppow=pk|binder_lane=1|binder_ppow=pk|prime_residence=none|ring=400|phase=1|json=0
AQPZETACLASS|index=7919|lane=2|residue6=5|ppow=prime|binder_lane=2|binder_ppow=prime|prime_residence=5|ring=1319|phase=5|json=0
AQPZETACLASS|index=994009|lane=1|residue6=1|ppow=p2|binder_lane=1|binder_ppow=p2|prime_residence=none|ring=165668|phase=1|json=0
AQPZETACLASS|index=999983|lane=2|residue6=5|ppow=prime|binder_lane=2|binder_ppow=prime|prime_residence=5|ring=166663|phase=5|json=0
AQPZETACLASS|index=999999|lane=0|residue6=3|ppow=composite|binder_lane=0|binder_ppow=composite|prime_residence=none|ring=166666|phase=3|json=0
AQPZETATRANSITION|a=5|b=7|mode=truthful|gap=2|gap_mod6=2|forced=lane2-to-1|verdict=FORCED_CONSISTENT|json=0
AQPZETATRANSITION|a=7|b=11|mode=truthful|gap=4|gap_mod6=4|forced=lane1-to-2|verdict=FORCED_CONSISTENT|json=0
AQPZETATRANSITION|a=11|b=13|mode=truthful|gap=2|gap_mod6=2|forced=lane2-to-1|verdict=FORCED_CONSISTENT|json=0
AQPZETATRANSITION|a=23|b=29|mode=truthful|gap=6|gap_mod6=0|forced=same-lane|verdict=FORCED_CONSISTENT|json=0
AQPZETATRANSITION|a=7919|b=7927|mode=truthful|gap=8|gap_mod6=2|forced=lane2-to-1|verdict=FORCED_CONSISTENT|json=0
AQPZETATRANSITION|a=11|b=13|mode=corrupt-external-lane|gap=2|gap_mod6=2|forced=lane2-to-1|verdict=FORCING_VIOLATION|json=0
AQPZETAPROCESS|status=PASS|lambda=2:0.693147,3:1.098612,4:0.693147,8:0.693147,9:1.098612,12:0.000000,16:0.693147,25:1.609438,27:1.098612,31:3.433987|nuLambda_1024=0.000140888|bandWeight_2_1023=2.730680361|predict500_final=2|trajectory_sha16=c41e152701b30d2c|json=0
AQPQUANT4|samples=8192|duplicates=512|mutations=1024|result=PASS|grade=ROUTING_HINT_MEASURED_NOT_GATING|identity_collisions=0|pid_collisions=0|route_unique=8096|route_collisions=96|lane_counts=2799,2646,2747|quad_counts=2074,2005,2130,1983|sector_coverage=113|glyph_coverage=1024|json=0
AQPQUANT4ADDR|name=jesse-prime-cylinder|pid_sha16=8abe8224452d1cfd|register_identity=25f4894800d710be|lane=2|quad=0|sector=63|glyph1024=548|cube_bh=BH.63.2.548|route_key=2.0.63.548|bh_ppow=composite|json=0
AQPQUANT4ADDR|name=slice-distance-pipe|pid_sha16=98a8e8508253915d|register_identity=f8351e4af08996ad|lane=2|quad=0|sector=106|glyph1024=80|cube_bh=BH.106.2.80|route_key=2.0.106.80|bh_ppow=composite|json=0
AQPQUANT4ADDR|name=addresses-abundant-bodies-scarce|pid_sha16=0ec8d14f4cb48c95|register_identity=4147ee5e7818a357|lane=1|quad=3|sector=27|glyph1024=335|cube_bh=BH.27.1.335|route_key=1.3.27.335|bh_ppow=p3|json=0
AQPOMNIQUANT|key=jesse-prime-cylinder|score=172|verdict=GC|formula=sha256-first16bits-mod1001|json=0
AQPOMNIQUANT|key=slice-distance-pipe|score=232|verdict=GC|formula=sha256-first16bits-mod1001|json=0
AQPOMNIQUANT|key=addresses-abundant-bodies-scarce|score=844|verdict=EXTRACT|formula=sha256-first16bits-mod1001|json=0
AQPOMNIQUANT|key=1e100000000|score=545|verdict=HOLD|formula=sha256-first16bits-mod1001|json=0
AQPEXTREMEDEF|target=1e100000000|digits=100000001|materialized_decimal_digits=0|method=symbolic-modular-proof-plus-offset-sampling|json=0
AQPEXTREMEFORMULA|pow10_mod3=1|pow10_mod6=4|because=10-equivalent-1-mod3-and-4-mod6-for-positive-exponents|ppow_10E=composite-2^E*5^E-two-prime-bases|json=0
AQPEXTREMESAMPLE|offsets=1000000|stride_mod3=1|stride_mod6=1|salt_mod3=1|salt_mod6=1|lane_counts=333333,333333,333334|residue6_counts=166667,166667,166667,166666,166666,166667|checksum=2124707648|json=0
AQPEXTREMEPROBES|offset_lane_residue=0:2/5,1:0/0,2:1/1,3:2/2,10:0/3,999:2/2,65536:0/3,999999:2/2|json=0
AQPFTR|status=PASS|claim=all-quant-engines-run-together-plus-symbolic-1e100000000-address-proof|rows=50|json=0
```
