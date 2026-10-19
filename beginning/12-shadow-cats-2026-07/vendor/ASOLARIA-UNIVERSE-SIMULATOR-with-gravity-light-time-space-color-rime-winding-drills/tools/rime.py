#!/usr/bin/env python3
"""rime - stream the generator, not the generated.  Law 59.

A translucent body is mostly holes. A hole is DESCRIBED, not STORED.
This keeps the non-zero runs (the slice) and answers any read from them,
without ever materialising the body.

  rime stat    FILE            what would it reduce to?  (changes nothing)
  rime slice   FILE            write FILE.rime
  rime restore FILE.rime       rebuild the body, byte-exact
  rime verify  FILE.rime FILE  prove the rebuild equals the original
  rime serve   FILE.rime       HTTP, Range-capable, body never materialised

Stdlib only. No dependencies. Python 3.8+.
"""
import sys, os, struct, hashlib, bisect

MAGIC = b"RIME1\x00"
HDR = struct.Struct("<6sQI32s")
RUN = struct.Struct("<QI")


def carve(raw):
    runs, n, i = [], len(raw), 0
    while i < n:
        if raw[i]:
            j = i + 1
            while j < n and raw[j]:
                j += 1
            runs.append((i, raw[i:j]))
            i = j
        else:
            i += 1
    return runs


def write_rime(path, out=None):
    raw = open(path, "rb").read()
    runs = carve(raw)
    out = out or path + ".rime"
    with open(out, "wb") as f:
        f.write(HDR.pack(MAGIC, len(raw), len(runs), hashlib.sha256(raw).digest()))
        for off, chunk in runs:
            f.write(RUN.pack(off, len(chunk)))
            f.write(chunk)
    return out, len(raw), os.path.getsize(out), len(runs)


class Body:
    def __init__(self, path):
        self.f = open(path, "rb")
        magic, self.total, nruns, self.sha = HDR.unpack(self.f.read(HDR.size))
        if magic != MAGIC:
            raise ValueError("not a .rime file: " + path)
        self.offs, self.pos, self.lens = [], [], []
        p = HDR.size
        for _ in range(nruns):
            self.f.seek(p)
            off, ln = RUN.unpack(self.f.read(RUN.size))
            self.offs.append(off)
            self.pos.append(p + RUN.size)
            self.lens.append(ln)
            p += RUN.size + ln
        self.slice_bytes = p

    def __len__(self):
        return self.total

    def read(self, start, length):
        start = max(0, min(start, self.total))
        length = max(0, min(length, self.total - start))
        out = bytearray(length)
        i = bisect.bisect_right(self.offs, start) - 1
        if i < 0:
            i = 0
        end = start + length
        while i < len(self.offs) and self.offs[i] < end:
            off, ln = self.offs[i], self.lens[i]
            lo, hi = max(off, start), min(off + ln, end)
            if hi > lo:
                self.f.seek(self.pos[i] + (lo - off))
                out[lo - start:hi - start] = self.f.read(hi - lo)
            i += 1
        return bytes(out)

    def stream(self, chunk=1 << 22):
        p = 0
        while p < self.total:
            n = min(chunk, self.total - p)
            yield self.read(p, n)
            p += n


def human(n):
    return format(n, ",")


def cmd_stat(path):
    raw = open(path, "rb").read()
    runs = carve(raw)
    sl = HDR.size + sum(RUN.size + len(c) for _, c in runs)
    z = raw.count(0)
    print("  body    %14s B" % human(len(raw)))
    print("  zeros   %14s B   %.4f%%" % (human(z), 100.0 * z / max(1, len(raw))))
    print("  runs    %14s" % human(len(runs)))
    print("  slice   %14s B   %.4f%% of body" % (human(sl), 100.0 * sl / max(1, len(raw))))
    if sl < len(raw):
        print("  -> %.1fx smaller" % (len(raw) / float(sl)))
    else:
        print("  -> DENSE: the slice would be LARGER. do not reduce this one.")


def cmd_slice(path, out=None):
    out, n, sl, runs = write_rime(path, out)
    print("  wrote " + out)
    print("  body %s B -> slice %s B  (%.4f%%, %s runs)"
          % (human(n), human(sl), 100.0 * sl / max(1, n), human(runs)))


def cmd_restore(rp, out=None):
    b = Body(rp)
    out = out or (rp[:-5] if rp.endswith(".rime") else rp + ".out")
    h = hashlib.sha256()
    with open(out, "wb") as f:
        for c in b.stream():
            f.write(c)
            h.update(c)
    ok = h.digest() == b.sha
    print("  restored %s  %s B" % (out, human(b.total)))
    print("  sha256 %s" % ("MATCHES the original" if ok else "*** MISMATCH ***"))
    return 0 if ok else 1


def cmd_verify(rp, orig):
    b = Body(rp)
    h = hashlib.sha256()
    for c in b.stream():
        h.update(c)
    real = hashlib.sha256(open(orig, "rb").read()).hexdigest()
    mine = h.hexdigest()
    print("  original   " + real)
    print("  from slice " + mine)
    print("  " + ("BYTE-EXACT" if real == mine else "*** MISMATCH ***"))
    print("  slice resident: %s B for a %s B body  (%.0fx)"
          % (human(b.slice_bytes), human(b.total), b.total / float(max(1, b.slice_bytes))))
    return 0 if real == mine else 1


def cmd_serve(rp, port=8731):
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    body = Body(rp)

    class H(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass

        def _send(self, code, length, extra=None):
            self.send_response(code)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Length", str(length))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("X-Rime-Slice-Bytes", str(body.slice_bytes))
            self.send_header("X-Rime-Body-Bytes", str(body.total))
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()

        def do_HEAD(self):
            self._send(200, body.total)

        def do_GET(self):
            rng = self.headers.get("Range")
            if rng and rng.startswith("bytes="):
                a, _, b2 = rng[6:].partition("-")
                start = int(a) if a else 0
                end = int(b2) if b2 else body.total - 1
                end = min(end, body.total - 1)
                self._send(206, end - start + 1,
                           {"Content-Range": "bytes %d-%d/%d" % (start, end, body.total)})
                p = start
                while p <= end:
                    c = body.read(p, min(1 << 20, end - p + 1))
                    self.wfile.write(c)
                    p += len(c)
            else:
                self._send(200, body.total)
                for c in body.stream(1 << 20):
                    self.wfile.write(c)

    srv = ThreadingHTTPServer(("127.0.0.1", port), H)
    print("  body   %s B" % human(body.total))
    print("  slice  %s B resident   (%.0fx)"
          % (human(body.slice_bytes), body.total / float(max(1, body.slice_bytes))))
    print("  http://127.0.0.1:%d/   Range supported. body never materialised." % port)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("stopped")


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    c, a = argv[1], argv[2:]
    if c == "stat" and a:
        return cmd_stat(a[0])
    if c == "slice" and a:
        return cmd_slice(a[0], a[1] if len(a) > 1 else None)
    if c == "restore" and a:
        return cmd_restore(a[0], a[1] if len(a) > 1 else None)
    if c == "verify" and len(a) > 1:
        return cmd_verify(a[0], a[1])
    if c == "serve" and a:
        return cmd_serve(a[0], int(a[1]) if len(a) > 1 else 8731)
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv) or 0)
