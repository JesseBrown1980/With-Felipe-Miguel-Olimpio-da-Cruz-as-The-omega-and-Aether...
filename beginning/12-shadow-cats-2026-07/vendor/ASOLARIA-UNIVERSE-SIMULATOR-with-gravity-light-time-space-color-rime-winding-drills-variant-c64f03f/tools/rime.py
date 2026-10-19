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
import sys, os, struct, hashlib, bisect, tempfile, threading

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
    with open(path, "rb") as source:
        raw = source.read()
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
        self.path = path
        self.f = open(path, "rb")
        self._io_lock = threading.Lock()
        try:
            size = os.fstat(self.f.fileno()).st_size
            header = self.f.read(HDR.size)
            if len(header) != HDR.size:
                raise ValueError("truncated .rime header: " + path)
            magic, self.total, nruns, self.sha = HDR.unpack(header)
            if magic != MAGIC:
                raise ValueError("not a .rime file: " + path)
            max_runs = max(0, (size - HDR.size) // (RUN.size + 1))
            if nruns > max_runs:
                raise ValueError("impossible run count in .rime file: " + path)

            self.offs, self.pos, self.lens = [], [], []
            p, previous_end = HDR.size, 0
            for _ in range(nruns):
                self.f.seek(p)
                packed = self.f.read(RUN.size)
                if len(packed) != RUN.size:
                    raise ValueError("truncated .rime run header: " + path)
                off, ln = RUN.unpack(packed)
                data_pos = p + RUN.size
                run_end = off + ln
                if ln == 0 or off < previous_end or run_end > self.total:
                    raise ValueError("invalid or overlapping .rime run: " + path)
                if data_pos + ln > size:
                    raise ValueError("truncated .rime run payload: " + path)
                self.offs.append(off)
                self.pos.append(data_pos)
                self.lens.append(ln)
                previous_end = run_end
                p = data_pos + ln
            if p != size:
                raise ValueError("trailing bytes in .rime file: " + path)
            self.slice_bytes = p
        except Exception:
            self.f.close()
            raise

    def close(self):
        self.f.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()

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
                wanted = hi - lo
                with self._io_lock:
                    self.f.seek(self.pos[i] + (lo - off))
                    chunk = self.f.read(wanted)
                if len(chunk) != wanted:
                    raise ValueError("truncated .rime payload during read: " + self.path)
                out[lo - start:hi - start] = chunk
            i += 1
        return bytes(out)

    def stream(self, chunk=1 << 22):
        p = 0
        while p < self.total:
            n = min(chunk, self.total - p)
            yield self.read(p, n)
            p += n

    def sha_matches(self):
        digest = hashlib.sha256()
        for chunk in self.stream():
            digest.update(chunk)
        return digest.digest() == self.sha


def human(n):
    return format(n, ",")


def parse_byte_range(value, total):
    """Return an inclusive (start, end) pair for one RFC 7233 byte range."""
    if not value:
        return None
    if not value.startswith("bytes="):
        raise ValueError("unsupported range unit")
    spec = value[6:].strip()
    if not spec or "," in spec or "-" not in spec:
        raise ValueError("invalid byte range")
    first, last = spec.split("-", 1)
    if not first:
        if not last.isdigit() or int(last) <= 0 or total <= 0:
            raise ValueError("invalid suffix byte range")
        count = min(int(last), total)
        return total - count, total - 1
    if not first.isdigit() or (last and not last.isdigit()):
        raise ValueError("invalid byte range")
    start = int(first)
    if start >= total:
        raise ValueError("unsatisfiable byte range")
    end = total - 1 if not last else min(int(last), total - 1)
    if end < start:
        raise ValueError("unsatisfiable byte range")
    return start, end


def cmd_stat(path):
    with open(path, "rb") as source:
        raw = source.read()
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
    out = out or (rp[:-5] if rp.endswith(".rime") else rp + ".out")
    out_abs = os.path.abspath(out)
    if os.path.abspath(rp) == out_abs:
        raise ValueError("restore output cannot replace the .rime input")
    out_dir = os.path.dirname(out_abs) or os.curdir
    prefix = "." + os.path.basename(out_abs) + "."
    fd, temporary = tempfile.mkstemp(prefix=prefix, suffix=".rime-restore", dir=out_dir)
    os.close(fd)
    try:
        with Body(rp) as b:
            h = hashlib.sha256()
            with open(temporary, "wb") as f:
                for c in b.stream():
                    f.write(c)
                    h.update(c)
                f.flush()
                os.fsync(f.fileno())
            ok = h.digest() == b.sha
            if not ok:
                print("  refused to replace %s" % out)
                print("  sha256 *** MISMATCH ***")
                return 1
            os.replace(temporary, out_abs)
            temporary = None
            print("  restored %s  %s B" % (out, human(b.total)))
            print("  sha256 MATCHES the original")
            return 0
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def cmd_verify(rp, orig):
    with Body(rp) as b:
        h = hashlib.sha256()
        for c in b.stream():
            h.update(c)
        real_hash = hashlib.sha256()
        with open(orig, "rb") as original:
            while True:
                chunk = original.read(1 << 22)
                if not chunk:
                    break
                real_hash.update(chunk)
        real = real_hash.hexdigest()
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
    if not body.sha_matches():
        body.close()
        raise ValueError("stored body SHA does not match reconstructed bytes")

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
            rng = self.headers.get("Range")
            if not rng:
                self._send(200, body.total)
                return
            try:
                start, end = parse_byte_range(rng, body.total)
            except ValueError:
                self._send(416, 0, {"Content-Range": "bytes */%d" % body.total})
                return
            self._send(206, end - start + 1,
                       {"Content-Range": "bytes %d-%d/%d" % (start, end, body.total)})

        def do_GET(self):
            rng = self.headers.get("Range")
            if rng:
                try:
                    start, end = parse_byte_range(rng, body.total)
                except ValueError:
                    self._send(416, 0, {"Content-Range": "bytes */%d" % body.total})
                    return
                self._send(206, end - start + 1,
                           {"Content-Range": "bytes %d-%d/%d" % (start, end, body.total)})
                p = start
                while p <= end:
                    wanted = min(1 << 20, end - p + 1)
                    c = body.read(p, wanted)
                    if len(c) != wanted:
                        raise IOError("short .rime read")
                    self.wfile.write(c)
                    p += len(c)
            else:
                self._send(200, body.total)
                for c in body.stream(1 << 20):
                    self.wfile.write(c)

    srv = ThreadingHTTPServer(("127.0.0.1", port), H)
    print("  body   %s B" % human(body.total))
    print("  slice file  %s B, %s indexed runs   (%.0fx body/slice)"
          % (human(body.slice_bytes), human(len(body.offs)),
             body.total / float(max(1, body.slice_bytes))))
    print("  http://127.0.0.1:%d/   Range supported. body never materialised." % port)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("stopped")
    finally:
        srv.server_close()
        body.close()


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
