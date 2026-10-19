# Information retention in the 81-cell Rainbow / RIME software laws

**2026-10-14 · Independent computational follow-on to merged Seat 1 PR #14**

## Question

Byte-exact Python/Node agreement after accelerated 10-trillion-step evolution proves matching digital maps. Does it establish that *all information in an arbitrary initial 81-bit state survives*?

**No.** Some laws are invertible; others merge distinct 81-bit inputs. This measures exact algebraic input reconstruction loss, **not physical or thermodynamic entropy loss**.

## Exact mathematical statement

The state is an 81-bit vector over GF(2). With cyclic rotation \(S\), a law with taps \(k_j\) is \(F=\sum_j S^{k_j}\), represented by \(p(x)=\sum_j x^{k_j}\) modulo \(x^{81}+1\).

For any positive integer \(t\):

\[
\operatorname{rank}(F^t)
=81-\deg\gcd(p(x)^t,x^{81}+1).
\]

Because 81 is odd, \(x^{81}+1\) has no repeated polynomial factors over GF(2): its derivative is \(x^{80}\), coprime to it. Therefore

\[
\gcd(p(x)^t,x^{81}+1)=\gcd(p(x),x^{81}+1),
\]

so **the rank remains unchanged for all positive horizons**, not merely the four measured. At \(t=0\) the identity has rank 81.

For uniformly distributed 81-bit inputs, rank \(r\) means \(2^r\) reachable outputs, exactly \(2^{81-r}\) possible inputs per reachable output, and conditional Shannon entropy of \(81-r\) bits. This is a property of the defined digital map.

## Independently verified result

| Law | Tap positions | Rank / 81 | Input bits lost | Preimages per reachable output |
|---|---|---:|---:|---:|
| Legacy CA150 | [0,1,80] | 79 | 2 | 4 |
| Legacy CA90 | [1,80] | 80 | 1 | 2 |
| Legacy CA60 | [0,1] | 80 | 1 | 2 |
| Legacy CA102 | [0,80] | 80 | 1 | 2 |
| Legacy SHIFT | [1] | 81 | 0 | 1 |
| New TAP0 | [0,1] | 80 | 1 | 2 |
| New TAP1 | [0,2] | 80 | 1 | 2 |
| New TAP2 | [0,1,3] | 81 | 0 | 1 |
| New TAP3 | [0,4,7] | 81 | 0 | 1 |
| New TAP4 | [0,1,5,9] | 80 | 1 | 2 |

For every law the computations checked horizons 1, \(10^{13}\), \(10^{13}+1\) and \(10^{13}+81\) modeled steps (40/40 records). Two **independently implemented** algorithms agree byte for byte:
- [Python cyclic-polynomial GCD with separate GF(2) matrix rank check](../../experiments/retention/retention_poly.py).
- [Node.js explicit 81x81 matrix powers and independent Gaussian nullspace](../../experiments/retention/retention_matrix.js).

The law-input reference is the [merged Seat 1 public triad challenge](../../experiments/seat1/TRIAD-27-CHALLENGE-20261014.json), SHA-256 e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b. Legacy laws are separate: do not pool them with the new stress-law experiment.

[40-row canonical TSV](../../stones/2026-10-14-rainbow81/retention-81-rank40.tsv) SHA-256 f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78; [machine-readable result stone](../../stones/2026-10-14-rainbow81/retention-81-rank40.json).

## Loss and the hash boundary

For each singular map the independent audits constructed a nonzero kernel vector \(z\) with \(F^t(z)=0\). For distinct sources \(s\) and \(s\oplus z\), the evolved states are **identical**, so hashing the evolved states also produces identical SHA-256. A post-evolution hash cannot distinguish input distinctions already lost.

For CA150, one 81-bit kernel witness in hex is 0db6db6db6db6db6db6db and its cyclic rotation supplies another independent one (four preimages). For rank-80 laws the all-ones 81-bit vector is a kernel witness. These are **constructed software operator collisions, not SHA-256 cryptographic collisions**: the input strings passed to SHA are equal after evolution.

## Reproduce and limitations

From the repository root, execute:

~~~sh
python experiments/retention/verify_retention.py
~~~

The public CI verifier independently recomputes 40 rows, checks the fixed challenge and receipt SHA-256, compares the two implementations, constructs collision witnesses and rejects a modified challenge. Four CI jobs run on Ubuntu and Windows with Python 3.11/3.13 and Node.js 22.

No independent physical host separation, prospective three-device blind challenge, optical distance/speed measurement, gravitational dynamics, entanglement or faster-than-light transport has been established by this test. The 10-trillion-step horizon is evaluated by binary exponentiation, not elapsed real time. Seat 2's original Ed25519 signing preimage, Hugging Face remote SHA verification, authorship/licensing and DOI decisions remain separately open.
