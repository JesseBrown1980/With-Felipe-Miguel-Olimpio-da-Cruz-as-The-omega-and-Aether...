#!/usr/bin/env python3
"""RAINBOR/Rainbow81 fifth-channel falsification test (2026-10-14).

This is a deterministic CPU DIGITAL FIXTURE, not independent optical hardware
measurement. The additional channel is a proposed separately-read nonlinear
spectral signature; its samples are constructed from the address trits.

The uncoloured Brown-Hilbert free centre is a separate origin and is NOT
encoded as any of the 81 seats, including trit-zero seat 40.
"""
import hashlib
import itertools
import json
import random
from collections import Counter

SCHEMA = "RAINBOW81-FIFTH-FEATURE-V1"
PEAKS = (430, 530, 630, 730)
WAVELENGTHS = range(380, 781)
TOLERANCE = 24
WEIGHTS = (1, 3, 9, 27)
GAIN = 128
SEED = 20261014
PAIR_NOISE_TRIALS = 32
FREE_CENTRE = {"identity": "BROWN_HILBERT_FREE_CENTRE", "uncoloured": True, "seat": None, "trits": None}


def trits(seat):
    cube, arm = divmod(seat, 3)
    return tuple((cube // (3 ** i)) % 3 - 1 for i in range(3)) + (arm - 1,)


def baseline(wavelength):
    return 500 + wavelength - 380


def spectral(t, wavelength):
    return baseline(wavelength) + sum(v * max(0, 50 - abs(wavelength - p)) for v, p in zip(t, PEAKS))


def fifth_affine(t):
    return GAIN * sum(w * x for w, x in zip(WEIGHTS, t))


def fifth_quadratic(t):
    return GAIN * sum(w * x * x for w, x in zip(WEIGHTS, t))


def decode_four(values):
    out = []
    for value, peak in zip(values, PEAKS):
        deviation = value - baseline(peak)
        digit = round(deviation / 50)
        if digit not in (-1, 0, 1) or abs(deviation - 50 * digit) > TOLERANCE:
            return None
        out.append(digit)
    return tuple(out)


def main():
    addresses = [trits(i) for i in range(81)]
    inverse = {t: i for i, t in enumerate(addresses)}
    assert len(inverse) == 81
    assert addresses[40] == (0, 0, 0, 0)
    assert FREE_CENTRE["seat"] is None and FREE_CENTRE["trits"] is None
    assert FREE_CENTRE["identity"] not in inverse
    peak_values = [tuple(spectral(t, p) for p in PEAKS) for t in addresses]
    spectra = [tuple(spectral(t, n) for n in WAVELENGTHS) for t in addresses]
    quadratic = [fifth_quadratic(t) for t in addresses]
    affine = [fifth_affine(t) for t in addresses]
    assert len(set(spectra)) == 81

    pairs = list(itertools.combinations(range(81), 2))
    baseline_aliases = []
    affine_survivors = []
    quadratic_survivors = []
    gap_hist = Counter()
    target_set = set()
    for left, right in pairs:
        blended_peaks = tuple((a+b)/2 for a,b in zip(peak_values[left], peak_values[right]))
        decoded = decode_four(blended_peaks)
        if decoded is None:
            continue
        target = inverse[decoded]
        blended_spectrum = tuple((a+b)/2 for a,b in zip(spectra[left], spectra[right]))
        assert blended_spectrum == spectra[target]
        baseline_aliases.append((left, right, target))
        target_set.add(target)

        affine_gap = abs((affine[left] + affine[right])/2 - affine[target])
        quadratic_gap = abs((quadratic[left] + quadratic[right])/2 - quadratic[target])
        if affine_gap <= TOLERANCE:
            affine_survivors.append((left, right, target))
        if quadratic_gap <= TOLERANCE:
            quadratic_survivors.append((left, right, target))
        assert quadratic_gap % GAIN == 0 and quadratic_gap >= GAIN
        gap_hist[str(int(quadratic_gap))] += 1

    assert len(pairs) == 3240
    assert len(baseline_aliases) == 272
    assert len(target_set) == 65
    assert len(affine_survivors) == 272
    assert len(quadratic_survivors) == 0
    expected_gaps = {str(GAIN * sum(WEIGHTS[i] for i in range(4) if mask & (1 << i))):
                     2 ** (mask.bit_count() - 1) * 3 ** (4 - mask.bit_count())
                     for mask in range(1, 16)}
    assert dict(gap_hist) == expected_gaps
    assert (0, 80, 40) in baseline_aliases

    # All single-seat fifth-channel readings remain decodable at +/- 24 units.
    seat_noise_passes = 0
    for i in range(81):
        assert decode_four(peak_values[i]) == addresses[i]
        for error in (-TOLERANCE, 0, TOLERANCE):
            assert abs((quadratic[i] + error) - quadratic[i]) <= TOLERANCE
            seat_noise_passes += 1
    assert seat_noise_passes == 243

    # Inject bounded noise into every original peak AND the fifth channel;
    # this is a stress test of the strict five-channel candidate decoder.
    rng = random.Random(SEED)
    noisy_pair_trials = 0
    noisy_false_accepts = 0
    for left, right in pairs:
        blended_peaks = [(a+b)/2 for a,b in zip(peak_values[left], peak_values[right])]
        blended_fifth = (quadratic[left] + quadratic[right])/2
        for _ in range(PAIR_NOISE_TRIALS):
            noisy_peaks = [v+rng.randint(-TOLERANCE,TOLERANCE) for v in blended_peaks]
            noisy_fifth = blended_fifth + rng.randint(-TOLERANCE,TOLERANCE)
            candidate = decode_four(noisy_peaks)
            if candidate is not None and abs(noisy_fifth-quadratic[inverse[candidate]]) <= TOLERANCE:
                noisy_false_accepts += 1
            noisy_pair_trials += 1
    assert noisy_pair_trials == 103680
    assert noisy_false_accepts == 0, "Nonlinear fifth channel left noisy mixture aliases"

    result = {
        "schema": SCHEMA,
        "date": "2026-10-14",
        "status": "PASS",
        "evidence_class": "deterministic synthetic CPU computation, NOT independent physical measurement",
        "free_centre": FREE_CENTRE,
        "zero_trit_seat": 40,
        "seat_count": 81,
        "unordered_distinct_pairs": len(pairs),
        "old_four_feature_aliases": len(baseline_aliases),
        "old_four_feature_distinct_targets": len(target_set),
        "new_affine_fifth_feature_aliases": len(affine_survivors),
        "new_quadratic_fifth_feature_aliases": len(quadratic_survivors),
        "quadratic_side_channel": "128 * sum(3**i * trit[i]**2, i=0..3)",
        "quadratic_alias_gap_histogram": dict(sorted(gap_hist.items(), key=lambda kv:int(kv[0]))),
        "minimum_quadratic_alias_gap": min(map(int, gap_hist)),
        "acceptance_tolerance": TOLERANCE,
        "single_seat_fifth_channel_noise_tests": seat_noise_passes,
        "seeded_five_channel_noisy_pair_trials": noisy_pair_trials,
        "seeded_five_channel_noisy_false_accepts": noisy_false_accepts,
        "noise_seed": SEED,
        "pair_noise_trials_each": PAIR_NOISE_TRIALS,
        "independent_hardware_measurement": False,
        "limitations": ["fifth channel is mathematically constructed from known trits", "no real optical, GPU, or time-distance measurement", "noise is uniformly simulated and bounded to +/-24", "strictly applies to normalized 50/50 pair mixtures and this decoder"],
    }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
