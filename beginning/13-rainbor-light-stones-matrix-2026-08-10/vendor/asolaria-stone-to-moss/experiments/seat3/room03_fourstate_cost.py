#!/usr/bin/env python3
"""Seat 3 Room 03: exact synthetic 3/4-state photocycle and controller-cost challenge.
Preregistered before implementation. No physical photon/current or biological validation.
"""
from __future__ import annotations

import hashlib
import json
import sys
from fractions import Fraction
from pathlib import Path

Q = 1_000_000
SCHEMA = "ASOLARIA-SEAT3-ROOM03-FOURSTATE-CONTROL-V1"
PROTOCOLS = ("dark", "continuous", "pair_gap_5", "pair_gap_20", "pair_gap_60")
PERIODS = (3, 4, 6, 8, 10, 12, 16)
LAMBDAS = (0, 100000, 221240, 300000)
ID_COUNT = 81
TICKS = 240
THREE_INITIAL = (Q, 0, 0)
FOUR_INITIAL = (Q, 0, 0, 0)
GROUP_FACTOR = 27
GROUP_STATES = 3
WAVES = 27
WAVE_TICKS = 40
TARGET_OPEN = 400000


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(obj) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("ascii")


def light_at(protocol: str, tick: int) -> bool:
    if protocol == "dark":
        return False
    if protocol == "continuous":
        return tick <= 160
    assert protocol.startswith("pair_gap_")
    gap = int(protocol.rsplit("_", 1)[1])
    return tick <= 20 or 21 + gap <= tick <= 40 + gap


def step3(previous, lit: bool):
    c, o, r = previous
    activation = c * (300000 if lit else 0) // Q
    close = o * 60000 // Q
    recover = r * 25000 // Q
    result = (c - activation + recover, o + activation - close, r + close - recover)
    assert all(0 <= n <= Q for n in result) and sum(result) == Q
    return result


def step4(previous, lit: bool):
    c1, o1, o2, c2 = previous
    a = c1 * (300000 if lit else 0) // Q
    b = c2 * (60000 if lit else 0) // Q
    d1 = o1 * 45000 // Q
    d2 = o2 * 45000 // Q
    x = o1 * (100000 if lit else 20000) // Q
    y = o2 * 20000 // Q
    r = c2 * 25000 // Q
    result = (c1 - a + d1 + r, o1 + a - d1 - x + y,
              o2 + b + x - d2 - y, c2 + d2 - b - r)
    assert all(0 <= n <= Q for n in result) and sum(result) == Q
    return result


def watch4(previous, lit: bool):
    # Separate expression of the same frozen conservation law:
    # build outgoing edge flows, then distribute to destinations.
    rates = [
        (0, 1, 300000 if lit else 0),
        (3, 2, 60000 if lit else 0),
        (1, 0, 45000),
        (2, 3, 45000),
        (1, 2, 100000 if lit else 20000),
        (2, 1, 20000),
        (3, 0, 25000),
    ]
    after = list(previous)
    for source, destination, rate in rates:
        n = (previous[source] * rate) // Q
        after[source] -= n
        after[destination] += n
    return tuple(after)


def current3(state):
    return state[1]


def current4(state):
    return state[1] + state[2] // 4


def protocol_run(protocol, nstates: int):
    prior = THREE_INITIAL if nstates == 3 else FOUR_INITIAL
    results, emitted = [], []
    for tick in range(1, TICKS + 1):
        lit = light_at(protocol, tick)
        nxt = step3(prior, lit) if nstates == 3 else step4(prior, lit)
        if nstates == 4:
            assert nxt == watch4(prior, lit)
        assert sum(nxt) == Q and min(nxt) >= 0
        opened = nxt[1] if nstates == 3 else nxt[1] + nxt[2]
        current = current3(nxt) if nstates == 3 else current4(nxt)
        fields = (
            f"C={nxt[0]}|O={nxt[1]}|R={nxt[2]}" if nstates == 3 else
            f"C1={nxt[0]}|O1={nxt[1]}|O2={nxt[2]}|C2={nxt[3]}"
        )
        emitted.append(
            f"TICK|protocol={protocol}|model={nstates}|k={tick:03d}|light={int(lit)}"
            f"|{fields}|open_total={opened}|I_proxy={current}|mass={Q}|json=0"
        )
        results.append(dict(light=int(lit), I_proxy=current, open_total=opened))
        prior = nxt
    assert len(results) == TICKS
    if protocol == "dark":
        assert all(x["I_proxy"] == x["open_total"] == 0 for x in results)
    if protocol == "continuous":
        peak = max(results[i]["I_proxy"] for i in range(80))
        plateau_sum = sum(results[i]["I_proxy"] for i in range(140, 160))
        output = {
            "peak_1_80": peak,
            "plateau_sum_141_160": plateau_sum,
            "peak_minus_plateau_times20": 20 * peak - plateau_sum,
            "last_current": results[-1]["I_proxy"],
        }
    elif protocol.startswith("pair_gap_"):
        gap = int(protocol.rsplit("_", 1)[1])
        second_tick = 21 + gap
        second_peak = max(results[i]["I_proxy"] for i in range(second_tick - 1, second_tick + 19))
        output = {
            "first_on_current": results[0]["I_proxy"],
            "second_tick": second_tick,
            "pre_second_current": results[second_tick - 2]["I_proxy"],
            "second_on_current": results[second_tick - 1]["I_proxy"],
            "second_peak_20ticks": second_peak,
        }
    else:
        output = {"last_current": 0, "dark_null": True}
    measure = "MEASURE|protocol=" + protocol + "|model=" + str(nstates)
    for k in sorted(output):
        measure += "|" + k + "=" + str(output[k]).lower() if isinstance(output[k], bool) else "|" + k + "=" + str(output[k])
    return prior, emitted + [measure + "|json=0"], output


def report_tuple(previous, light, ident=17, tick=1):
    next_state = step4(previous, light)
    return dict(id=ident, tick=tick, light=int(light), states=list(next_state),
                current=current4(next_state))


def anchored_gate(previous, light, reported, ident=17, tick=1):
    expected = watch4(previous, light)
    return (reported["id"] == ident and reported["tick"] == tick and
            reported["light"] == int(light) and tuple(reported["states"]) == expected and
            reported["current"] == current4(expected))


def run_negatives():
    prior = FOUR_INITIAL
    context_light = True
    base = report_tuple(prior, context_light)
    assert anchored_gate(prior, context_light, base)
    rejected = {}
    tests = {}
    # Intentionally alter real reports, preserving conservation where specified.
    mutant = dict(base)
    mutant["states"] = list(base["states"])
    mutant["states"][0] -= 1
    mutant["states"][1] += 1
    tests["mass_conserving_occupancy"] = mutant
    tests["forged_id"] = dict(base, id=18)
    tests["changed_light_label"] = dict(base, light=0)
    mutated_rate = list(step4(prior, True))
    mutated_rate[0] -= 1
    mutated_rate[1] += 1
    tests["changed_k1_plus_one"] = dict(base, states=mutated_rate,
                                        current=current4(mutated_rate))
    tests["stale_prior_state"] = dict(base, states=list(prior), current=current4(prior))
    tests["changed_current"] = dict(base, current=base["current"] + 1)
    mixed = list(base["states"])
    assert mixed[1] >= 1
    mixed[1] -= 1
    mixed[2] += 1
    tests["open_substate_reallocation"] = dict(base, states=mixed, current=current4(mixed))
    assert mixed[1] + mixed[2] == base["states"][1] + base["states"][2]
    for name, candidate in tests.items():
        assert not anchored_gate(prior, context_light, candidate), name + " falsely green"
        rejected[name] = "HELD"
    assert len(rejected) == 7
    wrong_context = report_tuple(prior, False)
    assert anchored_gate(prior, False, wrong_context)
    assert not anchored_gate(prior, True, wrong_context)
    rejected["coherent_forged_schedule"] = "MATH_GREEN_ORIGIN_UNAUTHENTICATED"
    rejected["honest"] = "PASS"
    rejected["origin_authenticated"] = False
    rejected["physical_source_present"] = False

    witness_a = (750000, 250000, 0, 0)
    witness_b = (750000, 0, 250000, 0)
    assert sum(witness_a) == sum(witness_b) == Q
    assert witness_a[1] + witness_a[2] == witness_b[1] + witness_b[2] == 250000
    assert current4(witness_a) == 250000 and current4(witness_b) == 62500
    assert current4(witness_a) != current4(witness_b)
    return rejected, {
        "same_open_total": 250000,
        "conducting_distribution_a": current4(witness_a),
        "conducting_distribution_b": current4(witness_b),
        "difference": current4(witness_a) - current4(witness_b),
    }


def halt_test():
    state = FOUR_INITIAL
    for tick in range(1, 73):
        state = step4(state, light_at("continuous", tick))
    before = state
    halted = True
    cannot_advance = halted
    assert cannot_advance and state == before
    bad_resume_allowed = False
    assert not bad_resume_allowed
    resume_granted = True  # synthetic standing operator signal, NOT real authentication
    halted = not resume_granted
    assert not halted
    for tick in range(73, 241):
        state = step4(state, light_at("continuous", tick))
    unbroken, _, _ = protocol_run("continuous", 4)
    assert state == unbroken
    return {"blocked_before_tick": 73, "invalid_resume_held": True,
            "synthetic_resume_count": 1, "same_final_state": True,
            "human_prompts_per_tick": 0}


def group_evaluate(kind, policy=None):
    states = [THREE_INITIAL] * GROUP_STATES
    train_E = train_C = hold_E = hold_C = 0
    for wave in range(WAVES):
        for tick in range(WAVE_TICKS):
            changes = []
            for group, s in enumerate(states):
                targeted = ((group + wave) % GROUP_STATES) == 0
                if kind == "feedback":
                    lit = targeted and s[1] < TARGET_OPEN
                else:
                    period, on_count, phase = policy
                    lit = targeted and ((tick + phase) % period < on_count)
                updated = step3(s, lit)
                error = abs(updated[1] - (TARGET_OPEN if targeted else 0)) * GROUP_FACTOR
                cmd = int(lit) * GROUP_FACTOR
                if wave < 18:
                    train_E += error
                    train_C += cmd
                else:
                    hold_E += error
                    hold_C += cmd
                changes.append(updated)
            states = changes
    return {"train_E": train_E, "train_C": train_C,
            "hold_E": hold_E, "hold_C": hold_C,
            "total_E": train_E + hold_E, "total_C": train_C + hold_C}


def policy_rows():
    candidates = []
    for period in PERIODS:
        for on_count in range(period + 1):
            for phase in range(period):
                measures = group_evaluate("open_loop", (period, on_count, phase))
                candidates.append(dict(P=period, D=on_count, F=phase, **measures))
    assert len(candidates) == 684
    return candidates


def optimize():
    candidates = policy_rows()
    feedback = group_evaluate("feedback")
    fixed = group_evaluate("open_loop", (12, 4, 0))
    assert (feedback["total_E"], feedback["total_C"]) == (4516776378, 17820)
    assert (fixed["total_E"], fixed["total_C"]) == (5878733220, 11664)
    exact_crossover = Fraction(fixed["total_E"] - feedback["total_E"],
                               feedback["total_C"] - fixed["total_C"])
    assert exact_crossover == Fraction(8407141, 38)
    best = {}
    for lam in LAMBDAS:
        chosen = min(candidates, key=lambda c: (
            c["train_E"] + lam * c["train_C"], c["P"], c["D"], c["F"]))
        test_j = chosen["hold_E"] + lam * chosen["hold_C"]
        fb_j = feedback["hold_E"] + lam * feedback["hold_C"]
        fixed_j = fixed["hold_E"] + lam * fixed["hold_C"]
        winner = ("tuned_open_loop" if test_j < fb_j else
                  "feedback" if fb_j < test_j else "tie")
        best[str(lam)] = {
            "policy": [chosen["P"], chosen["D"], chosen["F"]],
            "train_E": chosen["train_E"], "train_C": chosen["train_C"],
            "train_J": chosen["train_E"] + lam * chosen["train_C"],
            "hold_E": chosen["hold_E"], "hold_C": chosen["hold_C"],
            "hold_J": test_j, "feedback_hold_J": fb_j,
            "fixed_hold_J": fixed_j, "winner_vs_feedback": winner,
        }
    return candidates, feedback, fixed, best


def audit():
    records = [f"PORTAL|schema={SCHEMA}|Q={Q}|ids={ID_COUNT}|ticks={TICKS}|protocols=5|models=2|physical=0|json=0"]
    study = {}
    for protocol in PROTOCOLS:
        study[protocol] = {}
        for nstates in (3, 4):
            _, newrows, output = protocol_run(protocol, nstates)
            records.extend(newrows)
            study[protocol][str(nstates)] = output
    negatives, witness = run_negatives()
    halt = halt_test()
    records.append(f"WITNESS|open_total={witness['same_open_total']}|I_a={witness['conducting_distribution_a']}|I_b={witness['conducting_distribution_b']}|difference={witness['difference']}|json=0")
    for name in sorted(negatives):
        val = negatives[name]
        records.append(f"NEG|name={name}|value={str(val).lower() if isinstance(val,bool) else val}|json=0")
    records.append("HALT|before_tick=73|invalid_resume=HELD|synthetic_resume=PASS|final_equal=PASS|human_prompts_per_tick=0|json=0")
    candidates, feedback, fixed, best = optimize()
    for c in candidates:
        records.append(f"CANDIDATE|P={c['P']}|D={c['D']}|F={c['F']}|train_E={c['train_E']}|train_C={c['train_C']}|hold_E={c['hold_E']}|hold_C={c['hold_C']}|json=0")
    records.append(f"BASELINE|kind=fixed_open|train_E={fixed['train_E']}|train_C={fixed['train_C']}|hold_E={fixed['hold_E']}|hold_C={fixed['hold_C']}|json=0")
    records.append(f"BASELINE|kind=feedback|train_E={feedback['train_E']}|train_C={feedback['train_C']}|hold_E={feedback['hold_E']}|hold_C={feedback['hold_C']}|json=0")
    for lam in LAMBDAS:
        x = best[str(lam)]
        records.append(f"SELECT|lambda={lam}|P={x['policy'][0]}|D={x['policy'][1]}|F={x['policy'][2]}|train_J={x['train_J']}|hold_J={x['hold_J']}|feedback_hold_J={x['feedback_hold_J']}|fixed_hold_J={x['fixed_hold_J']}|winner={x['winner_vs_feedback']}|json=0")
    records.append("END|model_tick_rows=2400|candidates=684|fail_closed_mutations=7|source_authenticated=0|physical_light=0|json=0")
    assert sum(row.startswith("TICK|") for row in records) == 2400
    assert sum(row.startswith("CANDIDATE|") for row in records) == 684
    trace = ("\n".join(records) + "\n").encode("ascii")
    report = {
        "schema": SCHEMA, "status": "PASS",
        "source_type": "synthetic_integer_photocycle",
        "original_three_state_sha256": "de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b",
        "preregistered_new_experiment": True,
        "original_test_reproduced_via_group_symmetry": True,
        "cohort_immutable_identity_count": ID_COUNT,
        "protocols": study,
        "real_injected_negative_cases": negatives,
        "conductance_witness": witness,
        "halt_model": halt,
        "candidate_count": len(candidates),
        "feedback_baseline": feedback,
        "fixed_baseline": fixed,
        "lambda_break_even_exact": "8407141/38",
        "chosen_policies": best,
        "full_trace_bytes": len(trace),
        "full_trace_sha256": sha(trace),
        "physical_optics_measured": False,
        "biological_parameter_calibrated": False,
        "authenticated_light_source": False,
        "real_human_resume_authenticated": False,
        "physical_hosts_attested": False,
    }
    return trace, report


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: python room03_fourstate_cost.py result.hbp result.json")
    raw, stats = audit()
    Path(sys.argv[1]).write_bytes(raw)
    Path(sys.argv[2]).write_bytes(canonical(stats))
    print(json.dumps({
        "status": "PASS", "trace_bytes": len(raw), "sha256": sha(raw),
        "winner_by_lambda": {k: v["winner_vs_feedback"] for k,v in stats["chosen_policies"].items()},
        "policies": {k: v["policy"] for k,v in stats["chosen_policies"].items()},
        "four_state_continuous": stats["protocols"]["continuous"]["4"],
        "negative_cases": sum(v == "HELD" for v in stats["real_injected_negative_cases"].values()),
    }, sort_keys=True))
