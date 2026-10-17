#!/usr/bin/env python3
"""
play_the_key.py — PLAY THE 3.1 KB KEY WITH THE MTP AGENT (Law 24).
Operator: Jesse Daniel Brown. Written 2026-07-27 on his instruction:
  "we just needed to save the 3.1 kb.key and IT with bobby and the mtp agents
   will play it"

This is the direct measurement of what the key CARRIES. The MTP agent (Law 24)
freezes an order-2 top-1 table on some training bytes and then predicts forward
x1 / x3 / x27 and backward x1 on held-out bytes. Here the training bytes are the
KEY ITSELF — 3,174 bytes, nothing else — and the held-out bytes are the head of
the same slice the prior sweep measured, enwik8[20,000,000..].

FOUR ARMS, all trained on exactly 3,174 bytes except BIG:
  KEY       enwik8[90,000,000 .. 90,003,174)   the actual key
  ADJACENT  enwik8[19,996,826 .. 20,000,000)   the 3,174 bytes just before the test
  RANDOM    seeded pseudo-random bytes          the noise control
  BIG       enwik8[19,500,000 .. 20,000,000)    500,000 B, for scale only

TWO DENOMINATORS, both reported, because only one of them is honest on its own:
  raw      hits / all anchors        (an uncovered context counts as a miss)
  covered  hits / anchors the frozen table actually has an entry for
The raw number is what a compressor feels. The covered number says whether the
key is RIGHT when it speaks, as opposed to merely SILENT.

No corpus ships with this script. It reads enwik8 from a path you pass in.
"""
import sys, os, hashlib

ENWIK8 = sys.argv[1] if len(sys.argv) > 1 else "/root/compressor-run/enwik8"
TEST_OFF, TEST_LEN = 20_000_000, 600_000
ANCHORS = 4000


def sha16(b):
    return hashlib.sha256(b).hexdigest()[:16]


def rd(f, off, n):
    f.seek(off)
    return f.read(n)


def freeze(byts):
    """the frozen order-2 top-1 table — train once, never retrain (Law 15)"""
    cnt = {}
    for i in range(2, len(byts)):
        c = (byts[i - 2], byts[i - 1])
        d = cnt.setdefault(c, {})
        d[byts[i]] = d.get(byts[i], 0) + 1
    return {c: max(d, key=d.get) for c, d in cnt.items()}


def rollout(model, byts, depth, anchors=ANCHORS):
    """x{depth} lookahead. returns (raw_rate, covered_rate, coverage)"""
    hits = tot = covered = chits = 0
    step = max(1, (len(byts) - depth - 2) // anchors)
    for a in range(anchors):
        i = 2 + a * step
        if i + depth >= len(byts):
            break
        c = (byts[i - 2], byts[i - 1])
        seen = c in model
        ok = True
        for d in range(depth):
            pr = model.get(c)
            if pr is None or pr != byts[i + d]:
                ok = False
                break
            c = (c[1], pr)
        hits += ok
        tot += 1
        if seen:
            covered += 1
            chits += ok
    return (hits / tot if tot else 0.0,
            chits / covered if covered else 0.0,
            covered / tot if tot else 0.0)


def main():
    f = open(ENWIK8, "rb")
    test = rd(f, TEST_OFF, TEST_LEN)
    key = rd(f, 90_000_000, 3174)
    adj = rd(f, 20_000_000 - 3174, 3174)
    big = rd(f, 19_500_000, 500_000)
    f.close()

    # seeded pseudo-random control, no RNG module, fully reproducible
    rnd = bytearray()
    h = hashlib.sha256(b"rime-control-2026-07-27").digest()
    while len(rnd) < 3174:
        rnd += h
        h = hashlib.sha256(h).digest()
    rnd = bytes(rnd[:3174])

    print("=== PLAY THE 3.1 KB KEY — MTP agent, Law 24 ===")
    print(f"corpus       {ENWIK8}")
    print(f"held-out     enwik8[{TEST_OFF:,} .. {TEST_OFF+TEST_LEN:,})  sha16 {sha16(test)}")
    print(f"KEY          3,174 B  sha16 {sha16(key)}  (full sha256 in KEY-3174.hbp)")
    print(f"ADJACENT     3,174 B  sha16 {sha16(adj)}")
    print(f"RANDOM       3,174 B  sha16 {sha16(rnd)}")
    print(f"BIG          {len(big):,} B  sha16 {sha16(big)}")
    print()
    hdr = f"{'arm':<10}{'train_B':>9}{'ctxs':>8}{'cover':>8}" \
          f"{'+x1 raw':>10}{'+x1 cov':>9}{'+x3 raw':>10}{'+x27 raw':>10}{'-x1 raw':>9}"
    print(hdr)
    print("-" * len(hdr))
    for name, train in (("KEY", key), ("ADJACENT", adj), ("RANDOM", rnd), ("BIG", big)):
        fwd = freeze(train)
        bwd = freeze(train[::-1])
        r1, c1, cov = rollout(fwd, test, 1)
        r3, _, _ = rollout(fwd, test, 3)
        r27, _, _ = rollout(fwd, test, 27)
        b1, _, _ = rollout(bwd, test[::-1], 1)
        print(f"{name:<10}{len(train):>9,}{len(fwd):>8,}{cov:>8.4f}"
              f"{r1:>10.4f}{c1:>9.4f}{r3:>10.4f}{r27:>10.4f}{b1:>9.4f}")
    print()
    print("  direction 0 (hold) is 1.0000 by construction in every arm — the free")
    print("  center. It costs nothing and it says nothing (Law 24).")
    print("  GATE: a frozen slice predicts a fraction. It never recreates an unseen")
    print("  whole. x27 going to zero is that boundary measured, not an opinion.")


if __name__ == "__main__":
    main()
