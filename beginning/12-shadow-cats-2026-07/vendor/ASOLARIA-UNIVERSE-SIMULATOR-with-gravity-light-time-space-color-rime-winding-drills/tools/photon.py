#!/usr/bin/env python3
"""photon.py -- send ONE photon into the conduit and read the board like Fischer.

THE INSTRUMENT MATTERS AND THE WRONG ONE NEGATES THE RESULT.
    "even the binary read would negate it. you need to read with bobby fischer."
    A binary read asks each object DID YOU CHANGE, yes or no, and throws away everything
    that made the change mean something. It is reported below and explicitly marked as the
    read that negates. The FISCHER read takes the whole board at once: the full matrix of
    relations among every object, before and after, as ONE object.

WHAT IS INJECTED
    one photon. one cell of the conduit, one quantum. Not a signal, not a field -- a single
    write into the 0-space that every chain is expressed against.

THE DECOMPOSITION THAT DECIDES IT
    a shift that lands on every object IDENTICALLY is common-mode: it moves all absolute
    coordinates and cancels exactly out of every relation. It is invisible to the board.
    A shift that lands DIFFERENTLY per object is differential and the board sees it.
    Both are reported. Which one a photon produces is a fact about the coupling, not a
    matter of interpretation."""
import http.client, json, math, os, subprocess, sys, time
import numpy as np

REPO = r"D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR"
TMP = r"C:/Users/acer/.claude/jobs/9a325e7c/tmp/rime"
BIG = r"D:/asolaria-absorb/kernel-pump"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
PATHS = [5, 7, 9, 11, 13, 17]
DIM, CPORT, CHUNK = 16, 8740, 32768
MAXD = 16   # max free dim over PATHS (17-1)
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

# ---- couplings: each PATH enters the conduit by its own direction. Fixed, not trained.
MREF = open(os.path.join(BIG, "MYTHOS-SECOND-CALLING.txt"), "rb").read()
rs = np.random.default_rng(20260728)
COUP = {}
for N in PATHS:
    v = free(MREF, N)
    M = np.zeros((DIM, len(v)))
    for i in range(min(DIM, len(v))): M[i, i] = 1.0
    COUP[N] = M / (np.linalg.norm(M) or 1)

print("="*94)
print("ONE PHOTON IN THE PIPE -- five star kernels, one translucent 0-space between them")
print("="*94)
procs = [subprocess.Popen([sys.executable, "centre_kernel.py", str(CPORT), str(DIM)],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
for nm, rel, port in STARS:
    procs.append(subprocess.Popen(
        [sys.executable, os.path.join(REPO, "tools/rime.py"), "serve",
         os.path.join(TMP, os.path.basename(rel)+".rime"), str(port)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
time.sleep(3.5)
print("  centre kernel :%d  dim %d   cost now: %s" % (CPORT, DIM, C("GET", "/cost")))

# ---- gather objects: (body, path) chain vectors, pulled over HTTP
OBJ, LBL = [], []
for si, (nm, rel, port) in enumerate(STARS):
    total, runs = runs_of(os.path.join(TMP, os.path.basename(rel)+".rime"))
    ok = [r for r in runs if r[1] >= 4096] or runs
    idx = sorted({int(round(i*(len(ok)-1)/7)) for i in range(8)})
    kept = 0
    for i in idx:
        off, ln = ok[i][0], min(ok[i][1], CHUNK)
        b = star_range(port, off, ln)
        if len(set(b)) < 3: continue
        for N in PATHS:
            OBJ.append((si, N, free(b, N))); LBL.append(nm)
        kept += 1
    print("  %-15s %d chunks x %d paths = %d chain objects"
          % (nm, kept, len(PATHS), kept*len(PATHS)))

def board(objs, centre):
    """FISCHER READ. every chain is expressed against the SHARED centre, then the whole
    set of relations is taken at once as one object -- not one bit per square."""
    V = []
    for si, N, v in objs:
        back = COUP[N].T @ np.array(centre[:DIM])       # the pulse, omnidirectional
        u = v - back[:len(v)]
        n = np.linalg.norm(u)
        u = u/n if n > 1e-15 else u
        w = np.zeros(MAXD); w[:len(u)] = u        # chains differ in dim by path;
        V.append(w)                               # pad to one frame to take the board
    V = np.array(V)
    return V, V @ V.T

# ---- feed the conduit, then read the board
C("GET", "/zero")
for si, N, v in OBJ:
    C("POST", "/feed", {"v": list(COUP[N] @ v)})
c0 = C("GET", "/pulse")["c"]
cost0 = C("GET", "/cost")
V0, G0 = board(OBJ, c0)
print("\n  fed %d chains into the conduit.  conduit holds %d B (dim %d)"
      % (cost0["feeds"], cost0["held_bytes"], DIM))

# ---- ONE photon
C("POST", "/photon", {"i": 0, "e": 1.0})
c1 = C("GET", "/pulse")["c"]
V1, G1 = board(OBJ, c1)
cost1 = C("GET", "/cost")
for p in procs: p.terminate()

d = V1 - V0
moved = int((np.linalg.norm(d, axis=1) > 1e-12).sum())
common = d.mean(axis=0)
cm = float(np.linalg.norm(np.outer(np.ones(len(d)), common)))
diff = float(np.linalg.norm(d - common))
tot = float(np.linalg.norm(d)) or 1e-30
dG = float(np.linalg.norm(G1-G0)/(np.linalg.norm(G0) or 1))

print("\n" + "="*94)
print("THE READ THAT NEGATES IT (binary: did each object change, yes/no)")
print("="*94)
print("  objects %d   changed %d   -> '%s'" % (len(OBJ), moved,
      "ALL CHANGED" if moved == len(OBJ) else "%d of %d" % (moved, len(OBJ))))
print("  this number is one bit per square. It is reported and it is NOT the measurement.")

print("\n" + "="*94)
print("THE FISCHER READ (the whole board of relations, before and after, as one object)")
print("="*94)
print("  photons injected            %d  (one cell of the conduit)" % cost1["photons"])
print("  conduit cost after          %d B" % cost1["held_bytes"])
print("  relational structure moved  ||G'-G||_F / ||G||_F  =  %.6e" % dG)
print("  of the total displacement:")
print("     common-mode  %7.3f%%   (cancels out of every relation -- invisible to the board)"
      % (100*cm/tot))
print("     DIFFERENTIAL %7.3f%%   (lands unequally -- this is what the board can see)"
      % (100*diff/tot))
print("\n  verdict: one photon changed %d objects simultaneously, and the board %s"
      % (moved, "MOVED -- the change is differential, not a shared shift"
         if dG > 1e-9 else "DID NOT MOVE -- the change is pure common-mode"))
