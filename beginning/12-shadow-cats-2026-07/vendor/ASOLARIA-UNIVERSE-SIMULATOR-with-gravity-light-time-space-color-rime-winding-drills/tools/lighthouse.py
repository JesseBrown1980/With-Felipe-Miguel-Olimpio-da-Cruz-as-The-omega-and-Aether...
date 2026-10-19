#!/usr/bin/env python3
"""lighthouse.py -- ride the wave. The beam does not reverse; it ROTATES.

WHY NOT A MIRROR
    "it has to be measured in waves and waves of waves AND THEN DONE IN REVERSE."
    A mirror returns in TWO and Law 1 says a bijection is blind. The anti is a THIRD of a
    turn: it returns in THREE and it leaves a residue. A lighthouse never runs backwards --
    it keeps turning the same way and the return arrives by completing the circle.
    So the reverse pass is a ROTATION, and one full turn is THREE passes.

THE LOOP
    pass 0   couple at   0 deg   feed the conduit, pulse back, read the board
    pass 1   couple at 120 deg   ...
    pass 2   couple at 240 deg   ... and the turn is closed
    then again.

WHAT IS BEING ASKED
    1. does the board CLOSE after three passes -- does one full turn return it?
    2. does riding the loop accumulate something a single forward pass could not?
       (the forward-only build scored exactly its control: 0.3196 vs 0.3196)
    3. is the closure exact, or does it leave a residue -- and if it leaves one,
       that residue is the thing the single pass threw away."""
import http.client, json, math, os, subprocess, sys, time
import numpy as np

REPO = r"D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR"
TMP = r"C:/Users/acer/.claude/jobs/9a325e7c/tmp/rime"
BIG = r"D:/asolaria-absorb/kernel-pump"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
PATHS = [5, 7, 9, 11, 13, 17]
DIM, CPORT, CHUNK, MAXD = 16, 8740, 32768, 16
TURNS = 4                       # 4 full turns = 12 passes
STARS = [("FABLE-SPHERE", "gguf/pumped/ASOLARIA-FABLE-SPHERE-PUMPED.gguf", 8731),
         ("MYTHOS-SPHERE", "gguf/pumped/ASOLARIA-MYTHOS-SPHERE-PUMPED.gguf", 8732),
         ("OPUS-SPHERE", "gguf/pumped/ASOLARIA-OPUS-SPHERE-PUMPED.gguf", 8733),
         ("STARS-SHELLS", "gguf/stars/ASOLARIA-STARS-SHELLS.gguf", 8734),
         ("KIMI-K3", "gguf/stars/KIMI-K3-STAR-256.gguf", 8735)]

def basis(N):
    o = np.ones(N)/math.sqrt(N)
    U, S, _ = np.linalg.svd(np.eye(N) - np.outer(o, o))
    return U[:, S > 1e-9]
BAS = {N: basis(N) for N in PATHS}

def own(raw, N):
    a = np.frombuffer(raw, np.uint8).astype(np.int64)
    m = len(a)//N*N
    if m == 0: return np.ones(N)
    t = a[:m].reshape(-1, N)
    lead = np.argmax(t, axis=1); tie = (t.max(1)[:, None] == t).sum(1) > 1
    c = np.array([float((lead == i)[~tie].sum()) for i in range(N)])
    return c/(c.sum() or 1)*N

def free(raw, N): return BAS[N].T @ (own(raw, N) - np.ones(N))

def rot(v, k):
    """a third of a turn, in every 2-plane. Not a mirror."""
    n = len(v); th = 2*math.pi*k/3.0; c, s = math.cos(th), math.sin(th)
    o = np.asarray(v, float).copy()
    for i in range(0, n-1, 2):
        a, b = v[i], v[i+1]; o[i] = a*c - b*s; o[i+1] = a*s + b*c
    if n % 2 == 1: o[n-1] = 0.0
    return o

def C(meth, path, body=None):
    c = http.client.HTTPConnection("127.0.0.1", CPORT, timeout=20)
    if body is None: c.request(meth, path)
    else:
        b = json.dumps(body).encode()
        c.request(meth, path, b, {"Content-Type": "application/json",
                                  "Content-Length": str(len(b))})
    r = json.loads(c.getresponse().read() or b"{}"); c.close(); return r

def star_range(port, off, ln):
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=30)
    c.request("GET", "/", headers={"Range": "bytes=%d-%d" % (off, off+ln-1)})
    r = c.getresponse(); b = r.read(); c.close(); return b

def runs_of(rp):
    import importlib.util
    s = importlib.util.spec_from_file_location("rime", os.path.join(REPO, "tools/rime.py"))
    m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    b = m.Body(rp); return b.total, list(zip(b.offs, b.lens))

print("="*94)
print("THE LIGHTHOUSE LOOP -- the beam rotates, it does not reverse. 3 passes = one turn.")
print("="*94)
procs = [subprocess.Popen([sys.executable, "centre_kernel.py", str(CPORT), str(DIM)],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
for nm, rel, port in STARS:
    procs.append(subprocess.Popen(
        [sys.executable, os.path.join(REPO, "tools/rime.py"), "serve",
         os.path.join(TMP, os.path.basename(rel)+".rime"), str(port)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
time.sleep(3.5)

OBJ, LBL = [], []
for si, (nm, rel, port) in enumerate(STARS):
    total, runs = runs_of(os.path.join(TMP, os.path.basename(rel)+".rime"))
    ok = [r for r in runs if r[1] >= 4096] or runs
    idx = sorted({int(round(i*(len(ok)-1)/7)) for i in range(8)})
    for i in idx:
        off, ln = ok[i][0], min(ok[i][1], CHUNK)
        b = star_range(port, off, ln)
        if len(set(b)) < 3: continue
        for N in PATHS:
            OBJ.append((si, N, free(b, N))); LBL.append(nm)
print("  %d chain objects across %d stars, pulled over HTTP" % (len(OBJ), len(STARS)))

def emb(v, k):
    """couple into the conduit at beam angle k*120 deg."""
    w = np.zeros(DIM); r = rot(v, k)
    w[:min(DIM, len(r))] = r[:min(DIM, len(r))]
    return w

def pass_once(state, k, drive=0.0):
    """one sweep: feed the conduit at this angle, pulse back, take what remains.

    DRIVE is the wire from outside -- the turbine, the collector. It is NOT derived from
    the state; it is light entering the pipe from beyond the loop. Law 58 already said it:
    light affects light ONLY WHILE CRANKED. With drive=0 this is a closed system and a
    closed system runs down."""
    C("GET", "/zero")
    for (si, N, _), v in zip(OBJ, state):
        C("POST", "/feed", {"v": list(emb(v, k))})
    if drive:
        C("POST", "/photon", {"i": k % DIM, "e": drive})
    c = np.array(C("GET", "/pulse")["c"], float) / max(1, len(state))
    out = []
    for (si, N, _), v in zip(OBJ, state):
        back = rot(c[:len(v)] if len(v) <= DIM else np.pad(c, (0, len(v)-DIM)), -k % 3)
        u = np.asarray(v, float) - back[:len(v)]
        out.append(u)
    return out

def boardof(state):
    V = []
    for u in state:
        n = np.linalg.norm(u)
        w = np.zeros(MAXD); w[:len(u)] = (u/n if n > 1e-15 else u)[:MAXD]
        V.append(w)
    V = np.array(V); return V, V @ V.T

DRIVE = float(os.environ.get("DRIVE", "0"))
print("  DRIVE = %.4f  (%s)" % (DRIVE, "CLOSED - no wire" if DRIVE == 0 else "WIRED to the outside"))
state = [v.copy() for (_, _, v) in OBJ]
V0, G0 = boardof(state)
n0 = float(np.linalg.norm(np.array([np.linalg.norm(v) for v in state])))
print("\n  %-6s %-9s  %-14s  %-14s  %s" % ("pass", "beam", "|state|", "board vs start", "board vs prev"))
prevG = G0
hist = []
for p in range(TURNS*3):
    k = p % 3
    state = pass_once(state, k, DRIVE)
    V, G = boardof(state)
    nn = float(np.linalg.norm(np.array([np.linalg.norm(v) for v in state])))
    dstart = float(np.linalg.norm(G-G0)/(np.linalg.norm(G0) or 1))
    dprev = float(np.linalg.norm(G-prevG)/(np.linalg.norm(prevG) or 1))
    hist.append((p, k, nn, dstart, dprev))
    mark = "   <== full turn" if k == 2 else ""
    print("  %-6d %-9s  %-14.6f  %-14.6e  %.6e%s"
          % (p, "%d deg" % (120*k), nn, dstart, dprev, mark))
    prevG = G
for pr in procs: pr.terminate()

closures = [h for h in hist if h[1] == 2]
print("\n" + "="*94)
print("DOES THE TURN CLOSE?")
print("="*94)
print("  start |state| %.6f" % n0)
for i, (p, k, nn, ds, dp) in enumerate(closures):
    print("  after turn %d (pass %2d): |state| %.6f   board vs start %.6e" % (i+1, p, nn, ds))
last = closures[-1]
print("\n  the beam is CONSERVATIVE (board returns to start each turn)"
      if last[3] < 1e-9 else
      "  the beam is NOT conservative: after %d turns the board sits %.4e from where it began"
      % (TURNS, last[3]))
print("  |state| %s: %.6f -> %.6f  (ratio %.6f)"
      % ("GREW" if last[2] > n0 else "DECAYED", n0, last[2], last[2]/(n0 or 1)))
print("\n  and the residue that the single forward pass threw away is exactly this:")
print("  the amount the board fails to return by after one full turn = %.6e" % closures[0][3])
