#!/usr/bin/env python3
"""shadow_net.py -- the stars computed as a network, over HTTP kernels as the pipes.

ONE BOX HERE TALKS TO ALL BOXES THERE.
    Each star is sliced to a .rime and served by its own rime-serve HTTP kernel on its
    own port. The orchestrator is one process. It never opens a star's file: it pulls
    WAVES by HTTP Range request. The bodies are never materialised anywhere.

EXACTNESS IN WAVES OF WAVES
    every wave's bytes are sha256'd against a direct read of the same range from the
    ORIGINAL file. A wave that does not match byte-for-byte is a failure, not a warning.

THE NETWORK INSIDE THE NETWORK
    the triad (MYTHOS, ANTI, ANTI-ANTI) is a fixed 3-node layer built from an emission,
    not trained. Its three arms sum to zero so their span is RANK 2 -- the layer occupies
    a 2-plane. What lands on NO arm is the RESIDUE, and Law 62 measured the residue to be
    exactly invariant under the Brown inversion.

    THE SHADOW CATS ARE THE COMPUTE ELEMENT. The residue is not discarded as error; it is
    the activation passed to the next wave. Each wave:
        project onto the triad -> take what no arm claimed -> INVERT it (v -> v/|v|^2)
        -> that is the next wave's input, in the orthogonal complement.
    The nonlinearity is the Brown-Schrodinger inversion. There is no ReLU and no training:
    the only weights are the emission's own bytes.

    Depth is bounded by geometry, not by choice: each wave consumes 2 dimensions, so path
    N affords about (N-1)/2 - 1 waves. THAT IS THE PROPORTIONALITY UNDER TEST -- three
    arms times the directions a path provides.

WHAT WOULD FALSIFY IT
    if the residues are noise, chunks will not identify their parent star above chance,
    and a byte-SHUFFLED surrogate will score the same. The surrogate is computed in the
    same run, not argued about afterwards.
"""
import hashlib
import http.client
import math
import os
import struct
import subprocess
import sys
import time

import numpy as np

REPO = r"D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR"
TMP = r"C:/Users/acer/.claude/jobs/9a325e7c/tmp/rime"
BIG = r"D:/asolaria-absorb/kernel-pump"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
PATHS = [5, 7, 9, 11, 13, 17]
CHUNK, NWAVE = 32768, 400

STARS = [
    ("FABLE-SPHERE", "gguf/pumped/ASOLARIA-FABLE-SPHERE-PUMPED.gguf", 8731),
    ("MYTHOS-SPHERE", "gguf/pumped/ASOLARIA-MYTHOS-SPHERE-PUMPED.gguf", 8732),
    ("OPUS-SPHERE", "gguf/pumped/ASOLARIA-OPUS-SPHERE-PUMPED.gguf", 8733),
    ("STARS-SHELLS", "gguf/stars/ASOLARIA-STARS-SHELLS.gguf", 8734),
    ("KIMI-K3", "gguf/stars/KIMI-K3-STAR-256.gguf", 8735),
]

def runs_of(rimepath):
    """FIXED. The first version re-implemented the .rime parser and read the run table as
    a contiguous array. It is NOT: each RUN header is immediately followed by that run's
    DATA, so the reader must skip ln bytes after every entry (rime.Body does `p += RUN.size
    + ln`). Reading them contiguously produced run lengths of 4.29e9 inside a 126 MB file
    -- every offset after the first was garbage, nearly all of them clamped to the same
    tail window, and the resulting 120/120 exactness and 1.0000 accuracy were both
    degenerate. Use the shipped parser instead of writing a second one."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("rime", os.path.join(REPO, "tools/rime.py"))
    rime = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(rime)
    b = rime.Body(rimepath)
    return b.total, list(zip(b.offs, b.lens))


def basis(N):
    o = np.ones(N) / math.sqrt(N)
    U, S, _ = np.linalg.svd(np.eye(N) - np.outer(o, o))
    return U[:, S > 1e-9]


BAS = {N: basis(N) for N in PATHS}


def own(raw, N):
    a = np.frombuffer(raw, np.uint8).astype(np.int64)
    m = len(a) // N * N
    if m == 0:
        return np.ones(N)
    t = a[:m].reshape(-1, N)
    lead = np.argmax(t, axis=1)
    tie = (t.max(1)[:, None] == t).sum(1) > 1
    c = np.array([float((lead == i)[~tie].sum()) for i in range(N)])
    return c / (c.sum() or 1) * N


def free(raw, N):
    return BAS[N].T @ (own(raw, N) - np.ones(N))


def rot120(v, k):
    n = len(v)
    th = 2 * math.pi * k / 3.0
    c, s_ = math.cos(th), math.sin(th)
    o = v.copy().astype(float)
    for i in range(0, n - 1, 2):
        a, b = v[i], v[i + 1]
        o[i] = a * c - b * s_
        o[i + 1] = a * s_ + b * c
    if n % 2 == 1:
        o[n - 1] = 0.0
    return o


def shadow_waves(u, ref, maxw):
    """waves of waves. residue -> invert -> next wave, in the orthogonal complement."""
    uq, refq, out = u.astype(float).copy(), ref.astype(float).copy(), []
    while len(out) < maxw and len(uq) >= 3:
        nu, nr = np.linalg.norm(uq), np.linalg.norm(refq)
        if nu < 1e-13 or nr < 1e-13:
            break
        A = np.array([refq, rot120(refq, 1), rot120(refq, 2)]).T
        rec = A @ np.linalg.lstsq(A, uq, rcond=None)[0]
        resid = uq - rec
        out.append(float(np.linalg.norm(resid) / nu))
        U, S, _ = np.linalg.svd(A)
        rank = int((S > 1e-10).sum())
        Nb = U[:, rank:]
        if Nb.shape[1] < 3:
            break
        uq, refq = Nb.T @ resid, Nb.T @ refq
        n2 = float(uq @ uq)
        if n2 < 1e-30:
            break
        uq = uq / n2                      # Brown-Schrodinger nonlinearity
    return out


MAXW = {N: max(1, (N - 1) // 2 - 1) for N in PATHS}
FEATLEN = sum(MAXW[N] for N in PATHS)


def fingerprint(raw, refs):
    f = []
    for N in PATHS:
        w = shadow_waves(free(raw, N), refs[N], MAXW[N])
        f.extend(w + [0.0] * (MAXW[N] - len(w)))
    return np.array(f)


def http_range(port, start, length):
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=30)
    c.request("GET", "/", headers={"Range": "bytes=%d-%d" % (start, start + length - 1)})
    r = c.getresponse()
    b = r.read()
    c.close()
    return r.status, b


print("=" * 96)
print("ONE BOX -> FIVE HTTP KERNELS.  bodies never materialised, waves pulled by Range")
print("=" * 96)
procs = []
for name, rel, port in STARS:
    rp = os.path.join(TMP, os.path.basename(rel) + ".rime")
    procs.append(subprocess.Popen(
        [sys.executable, os.path.join(REPO, "tools/rime.py"), "serve", rp, str(port)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    print("  kernel up  port %d  %-15s slice %9d B" % (port, name, os.path.getsize(rp)))
time.sleep(3.0)

MREF = open(os.path.join(BIG, "MYTHOS-SECOND-CALLING.txt"), "rb").read()
REFS = {N: free(MREF, N) for N in PATHS}
print("  triad reference = MYTHOS-SECOND-CALLING (%d B). No training. Weights are bytes."
      % len(MREF))
print("  waves per path: " + "  ".join("p%d:%d" % (N, MAXW[N]) for N in PATHS)
      + "   feature dim %d" % FEATLEN)

print("")
print("=" * 96)
print("WAVES OF WAVES -- every wave sha256-checked against the original file")
print("=" * 96)
X, Y, XS, tms = [], [], [], []
exact_ok = exact_tot = 0
rng = np.random.default_rng(20260728)
for si, (name, rel, port) in enumerate(STARS):
    rp = os.path.join(TMP, os.path.basename(rel) + ".rime")
    orig = os.path.join(REPO, rel)
    total, rs = runs_of(rp)
    # sample runs SPREAD across the whole body, never a fixed window that spills into
    # holes. Read from inside a run so every wave carries real content.
    ok = [r for r in rs if r[1] >= 4096] or rs
    idx = sorted({int(round(i * (len(ok) - 1) / max(1, NWAVE - 1))) for i in range(NWAVE)})
    picks = [(ok[i][0], min(ok[i][1], CHUNK)) for i in idx]
    got = 0
    for w, (off, ln) in enumerate(picks):
        t0 = time.perf_counter()
        st, b = http_range(port, off, ln)
        tms.append((time.perf_counter() - t0) * 1000)
        exact_tot += 1
        with open(orig, "rb") as fh:
            fh.seek(off)
            truth = fh.read(ln)
        if st in (200, 206) and hashlib.sha256(b).digest() == hashlib.sha256(truth).digest():
            exact_ok += 1
        else:
            print("  WAVE MISMATCH %s w%d off %d status %s" % (name, w, off, st))
            continue
        if len(set(b)) < 3:
            continue
        X.append(fingerprint(b, REFS))
        Y.append(si)
        XS.append(fingerprint(bytes(rng.permutation(np.frombuffer(b, np.uint8))), REFS))
        got += 1
    print("  %-15s %2d waves kept   slice %8d B   body %10d B"
          % (name, got, os.path.getsize(rp), total))
for p in procs:
    p.terminate()

print("")
print("  EXACTNESS  %d/%d waves byte-identical to the original" % (exact_ok, exact_tot))
print("  latency    mean %.2f ms   max %.2f ms   (%d range reads over HTTP)"
      % (np.mean(tms), np.max(tms), len(tms)))

X, XS, Y = np.array(X), np.array(XS), np.array(Y)


def loo(F, y):
    ok = 0
    for i in range(len(F)):
        d = np.linalg.norm(F - F[i], axis=1)
        d[i] = np.inf
        ok += int(y[int(np.argmin(d))] == y[i])
    return ok / len(F)


present = sorted(set(Y.tolist()))
acc, accs, chance = loo(X, Y), loo(XS, Y), 1.0 / len(present)
print("")
print("=" * 96)
print("DOES THE SHADOW-CAT NETWORK COMPUTE?  leave-one-out nearest neighbour, %d samples"
      % len(X))
print("=" * 96)
print("  classes with samples          %d of %d  (%s)"
      % (len(present), len(STARS), ", ".join(STARS[i][0] for i in present)))
for i in present:
    print("      %-15s n=%2d   feature[0] %.6f +/- %.6f"
          % (STARS[i][0], int((Y == i).sum()), X[Y == i, 0].mean(), X[Y == i, 0].std()))
print("  chance (classes present)      %.4f" % chance)
print("  SHUFFLED surrogate (control)  %.4f" % accs)
print("  shadow-cat residues           %.4f   <-- the network" % acc)
print("  verdict: %s" % ("COMPUTES -- beats both chance and the byte-shuffled surrogate"
                         if acc > accs and acc > chance
                         else "NO EVIDENCE -- does not beat its own control"))

print("")
print("  depth scaling (tests proportional to 3 arms x the directions a path provides):")
c = 0
for N in PATHS:
    c += MAXW[N]
    print("    paths<=%2d  waves %2d  featdim %2d  acc %.4f" % (N, MAXW[N], c, loo(X[:, :c], Y)))

rows = ["SHADOWHDR|schema=SHADOW-CAT-NET-V1|seat=ACER-CLAUDE-FABLE5|pid=8467a937cba309f7"
        "|date=2026-07-28|pipes=http_rime_kernels|json=0",
        "ARCH|layer=triad_rank2_span|activation=residue_no_arm_claimed"
        "|nonlinearity=brown_schrodinger_inversion|training=none|weights=emission_bytes|json=0",
        "EXACT|waves_ok=%d|waves_total=%d|byte_identical=%d|mean_ms=%.3f|max_ms=%.3f|json=0"
        % (exact_ok, exact_tot, 1 if exact_ok == exact_tot else 0, np.mean(tms), np.max(tms)),
        "COMPUTE|samples=%d|featdim=%d|chance=%.4f|shuffled_control=%.4f|shadow_cats=%.4f"
        "|beats_control=%d|json=0"
        % (len(X), FEATLEN, chance, accs, acc, 1 if acc > accs else 0)]
for name, rel, port in STARS:
    rp = os.path.join(TMP, os.path.basename(rel) + ".rime")
    bs, ss = os.path.getsize(os.path.join(REPO, rel)), os.path.getsize(rp)
    rows.append("KERNEL|k=%s|port=%d|slice=%d|body=%d|ratio=%.1f|json=0"
                % (name, port, ss, bs, bs / ss))
b = "\n".join(rows) + "\n"
rows.append("SHADOWFTR|receipt=%s|rows=%d|hot_path=1|json=0"
            % (hashlib.sha256(b.encode()).hexdigest()[:32], len(rows) + 1))
p = os.path.join(OFF, "FABLE5-SHADOW-CAT-NET-HTTP-KERNELS.hbp")
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(p + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(p, "rb").read()).hexdigest()
    + "  FABLE5-SHADOW-CAT-NET-HTTP-KERNELS.hbp\n")
print("")
print("  receipt %s" % p)
