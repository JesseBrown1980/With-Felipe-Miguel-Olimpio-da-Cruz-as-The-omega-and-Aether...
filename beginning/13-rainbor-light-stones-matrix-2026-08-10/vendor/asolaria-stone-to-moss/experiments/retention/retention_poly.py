#!/usr/bin/env python3
"""GF(2) polynomial-GCD and matrix-rank audit of 81-bit software evolution.
Tests injectivity of digital laws, not physical entropy, signaling or photons.
"""
import hashlib
import json
import pathlib
import sys

N = 81
MASK = (1 << N) - 1
MOD = (1 << N) | 1
CHALLENGE_SHA = "e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
LEGACY = [
    ("CA150", (0, 1, 80)), ("CA90", (1, 80)), ("CA60", (0, 1)),
    ("CA102", (0, 80)), ("SHIFT", (1,)),
]
STRESS = [
    ("TAP0", (0, 1)), ("TAP1", (0, 2)), ("TAP2", (0, 1, 3)),
    ("TAP3", (0, 4, 7)), ("TAP4", (0, 1, 5, 9)),
]
TIMES = (1, 10**13, 10**13 + 1, 10**13 + 81)


def rotate(value, count):
    count %= N
    return (value if count == 0 else
            ((value << count) | (value >> (N - count)))) & MASK


def cyclic_product(left, right):
    result = 0
    while left:
        bit = left & -left
        result ^= rotate(right, bit.bit_length() - 1)
        left ^= bit
    return result


def power(base, steps):
    result = 1
    while steps:
        if steps & 1:
            result = cyclic_product(result, base)
        base = cyclic_product(base, base)
        steps >>= 1
    return result


def remainder(value, divisor):
    while value and value.bit_length() >= divisor.bit_length():
        value ^= divisor << (value.bit_length() - divisor.bit_length())
    return value


def quotient(value, divisor):
    q = 0
    while value and value.bit_length() >= divisor.bit_length():
        shift = value.bit_length() - divisor.bit_length()
        q ^= 1 << shift
        value ^= divisor << shift
    return q, value


def gcd(a, b):
    while b:
        a, b = b, remainder(a, b)
    return a


def matrix_rank(columns):
    pivots = {}
    for col in columns:
        value = col
        while value:
            top = value.bit_length() - 1
            if top not in pivots:
                pivots[top] = value
                break
            value ^= pivots[top]
    return len(pivots)


def run(challenge):
    assert challenge["bodies"] == N
    assert challenge["horizons"] == list(TIMES[1:])
    assert challenge["laws"] == [list(taps) for _, taps in STRESS]
    rows, witnesses = [], []
    for family, laws in (("legacy", LEGACY), ("triad-stress", STRESS)):
        for name, taps in laws:
            polynomial = sum(1 << tap for tap in taps)
            divisor = gcd(polynomial, MOD)
            nullity = divisor.bit_length() - 1
            witness, rest = quotient(MOD, divisor)
            assert rest == 0
            if nullity:
                assert witness and cyclic_product(polynomial, witness) == 0
            for horizon in TIMES:
                jump = power(polynomial, horizon)
                rank_from_gcd = N - (gcd(jump, MOD).bit_length() - 1)
                columns = [cyclic_product(jump, 1 << i) for i in range(N)]
                rank_from_columns = matrix_rank(columns)
                assert rank_from_columns == rank_from_gcd == N - nullity
                loss = N - rank_from_columns
                if loss:
                    x, y = (1 << 17), (1 << 17) ^ witness
                    assert x != y and cyclic_product(jump, x) == cyclic_product(jump, y)
                    input_a, input_b = f"{x:021x}".encode(), f"{y:021x}".encode()
                    output_a = f"{cyclic_product(jump, x):021x}".encode()
                    output_b = f"{cyclic_product(jump, y):021x}".encode()
                    assert hashlib.sha256(input_a).digest() != hashlib.sha256(input_b).digest()
                    assert hashlib.sha256(output_a).digest() == hashlib.sha256(output_b).digest()
                else:
                    assert rank_from_columns == 81
                rows.append(f"{family}|{name}|{horizon}|{rank_from_columns}|{loss}|{1 << loss}\n")
            witnesses.append({
                "family": family, "law": name, "taps": list(taps),
                "rank": N - nullity, "kernel_dimension_bits": nullity,
                "preimages_per_reachable_output": 1 << nullity,
                "kernel_example_hex": f"{witness:021x}" if nullity else None,
            })
    return rows, witnesses


def main():
    raw = pathlib.Path(sys.argv[1]).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == CHALLENGE_SHA
    rows, witnesses = run(json.loads(raw))
    output = "".join(rows).encode("ascii")
    pathlib.Path(sys.argv[2]).write_bytes(output)
    print(json.dumps({
        "schema": "ASOLARIA-GF2-81-RETENTION-AUDIT-V1",
        "algorithm": "polynomial-GCD-plus-explicit-column-GF2-rank",
        "challenge_sha256": CHALLENGE_SHA,
        "horizon_count": len(TIMES),
        "laws": len(witnesses),
        "rows": len(rows),
        "csv_sha256": hashlib.sha256(output).hexdigest(),
        "law_results": witnesses,
        "physical_host_verified": False,
        "meaning": "information retention of digital linear maps; not physical entropy or signaling",
    }, sort_keys=True))


if __name__ == "__main__":
    main()
