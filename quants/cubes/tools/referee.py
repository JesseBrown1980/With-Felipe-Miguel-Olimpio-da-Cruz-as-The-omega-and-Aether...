"""Cold-lane referee for quants/cubes (stdlib only). Mirrors the owner's JavaScript line by line:

  ingest:<n>   reductions cubes/ingest-google-to-cube.mjs @ 29307bf        (slot 25)
  rotor:<n>    Asolaria-hermes-work room-rotor/hyperbehcs-d-drive-10000-room-rotor.mjs @ 84f0b20 (slot 26)
  sector:<n>   asolaria-whiteroom-engine liris-sector-emitter.mjs @ 896518a (slot 28)
  hilbert:<n>  asolaria-whiteroom-engine liris-hilbert.mjs @ 896518a        (slot 28)
  engine:<n>   asolaria-whiteroom-engine liris-whiteroom-engine.mjs @ 896518a (slot 28)
  gc:<n>       after-100B backend/gc-runtime.mjs @ c59e2e6               (slot 28)
  consumer:<n> Shannon stage pipeline/whiteroom-consumer-index.mjs @ 32f9670 (slot 28)

Integer arithmetic only. A JavaScript double is held as the exact fractions.Fraction of its
binary64 value: js_div(a, b) rounds the quotient of two integers to binary64 with integer
operations (the double `a / b` gives, and the double a decimal literal parses to), and Math.round
and toFixed are taken on that exact value, as the ECMAScript definitions state them.

  python3 -I tools/referee.py --write            write tests/fixtures/*.hbp
  python3 -I tools/referee.py --check            regenerate and compare with the committed fixtures
  python3 -I tools/referee.py --receipts DIR [--write|--check]
                                                 the 12 upstream ingest receipts (fetched into DIR)
  python3 -I tools/referee.py --grid N           random cases for `cargo run --example grid`
"""
import hashlib
import math
import os
import random
import re
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
CRATE = os.path.dirname(HERE)
FIX = os.path.join(CRATE, "tests", "fixtures")


def sha(s):  # ingest:10, engine:19, sector:12 (update(String(s)) hashes the UTF-8 bytes)
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def js_div(a, b):  # the binary64 nearest a / b for integers a >= 0, b > 0 (ties to even), exact
    if a == 0:
        return Fraction(0)
    k = 54 - (a.bit_length() - b.bit_length())  # quotient scaled into [2^53, 2^55)
    q, r = divmod(a << k, b) if k >= 0 else divmod(a, b << -k)
    extra = q.bit_length() - 53
    mant, rest, half = q >> extra, q & ((1 << extra) - 1), 1 << (extra - 1)
    if rest > half or (rest == half and (r != 0 or mant & 1)):
        mant += 1
    e = extra - k
    return Fraction(mant << e) if e >= 0 else Fraction(mant, 1 << -e)


def js_round(x):  # Math.round: the integral value closest to x, ties toward +infinity
    return math.floor(Fraction(x) + Fraction(1, 2))


def to_fixed(x, f):  # Number.prototype.toFixed for 0 <= x < 1e21: n closest to x*10^f, larger on a tie
    n = math.floor(Fraction(x) * 10 ** f + Fraction(1, 2))
    s = str(n).rjust(f + 1, "0")
    return s[:-f] + "." + s[-f:]


# ---------------------------------------------------------------- slot 25: ingest-google-to-cube.mjs
STOP = set("the a an is it of to and or in on for as by with not no but its are be that this each so an at into we us our their they them then than only one two more most every all any can could should would".split(" "))  # ingest:28
LINEAGE = "INGESTLINEAGE|path=drive-doc->slice->tuple/HBP->quant8->cube10->verb-noun-glyph-catalog|maps_into=existing-BEHCS-cubes+index-language-catalogs|new_infra_required=NONE-beyond-this-ingestor|json=0"  # ingest:45
BOUNDARY = "INGESTBOUNDARY|raw_content_published=0|provider_calls=0|device_mutation=local-receipt-only|gemini_notebooklm=PROPOSE/slice-sources-not-dependencies|notebooklm_write_api=UNVERIFIED|json=0"  # ingest:46
TOKEN = re.compile(r"[a-z][a-z0-9_-]{1,}")


def ingest_rows(file_bytes):
    text = file_bytes.decode("utf-8", errors="replace")  # ingest:15
    raw_bytes = len(text.encode("utf-8"))  # ingest:16
    full_sha = sha(text)  # ingest:17
    cube10 = full_sha[0:20]  # ingest:18
    handle8 = full_sha[0:16]  # ingest:19
    proj = [0] * 8  # ingest:22
    toks = TOKEN.findall(text.lower())  # ingest:23
    for t in toks:  # ingest:24
        h = 7
        for c in t:
            h = (h * 131 + ord(c)) % 2 ** 32
        proj[h & 7] += -1 if (h & 8) else 1
    quant8 = ",".join(str(max(0, min(255, js_round(128 + v)))) for v in proj)  # ingest:25
    freq = {}  # ingest:29
    for t in toks:  # ingest:30
        if len(t) < 4 or t in STOP:
            continue
        freq[t] = freq.get(t, 0) + 1
    vocab = sorted(freq.items(), key=lambda kv: -kv[1])  # ingest:31 (stable)
    distinct_terms = len(vocab)  # ingest:32
    top = ["%s:%d:g%s" % (w, n, sha(w)[0:8]) for w, n in vocab[0:10]]  # ingest:33
    ratio_raw_to_handle = js_round(js_div(raw_bytes, 8))  # ingest:36
    ratio_raw_to_cube = js_round(js_div(raw_bytes, 10))  # ingest:37
    return [  # ingest:41-46
        "INGESTSLICE|raw_bytes=%d|sha256_16=%s|tokens=%d|distinct_content_terms=%d|json=0" % (raw_bytes, handle8, len(toks), distinct_terms),
        "INGESTCUBE|cube10=%s|host_handle8=%s|quant8=%s|schema=asolaria.drive_ingest.cube.v1|descriptor_only=1|json=0" % (cube10, handle8, quant8),
        "INGESTREDUCTION|raw_bytes=%d|host_handle=8B|cube_glyph=10B|raw->handle=%dx|raw->cube=%dx|note=referential-content-address-not-lossless|json=0" % (raw_bytes, ratio_raw_to_handle, ratio_raw_to_cube),
        "INGESTCATALOG|kind=verb-noun-glyph-vocabulary|distinct_terms=%d|sample_top10=%s|each_term=glyph-tuple-addressable|json=0" % (distinct_terms, " ".join(top)),
        LINEAGE,
        BOUNDARY,
    ]


def footer(rows):  # ingest:47-48
    body = "\n".join(rows) + "\n"
    return "INGESTFTR|sha256=%s|rows=%d|verdict=INGEST-NOT-INTEGRATE-PROVEN-on-1-real-drive-doc|json=0\n" % (sha(body), len(rows))


# ---------------------------------------------------------------- slot 26: the room-rotor shard fold
TASK_ID = "HYP-D-10000-ROOM-ROTOR"  # rotor:18
LANES = ["carry_z", "quant", "reflex", "gulp", "super_gulp", "gc", "gnn", "shannon", "white_room", "minting", "watcher", "indexer"]  # rotor:26-39


def shard_vectors(room_count, shard_size):
    groups = {}  # rotor:223-230 (Map: first-seen order)
    for index in range(room_count):  # rotor:216-221
        shard = index // shard_size  # rotor:143-145
        shard_id = "shard-" + str(shard).rjust(4, "0")  # rotor:188
        groups.setdefault(shard_id, []).append((index, LANES[index % len(LANES)]))  # rotor:179
    out = []
    for shard_id, rows in groups.items():  # rotor:281-304
        lane = lambda name: sum(1 for _, l in rows if l == name)
        digits = re.sub(r"[^0-9]", "", shard_id)
        vector = [len(rows), lane("carry_z"), lane("quant"), lane("gc"), lane("gnn"), lane("shannon"),
                  int(digits) if digits else 0, sum(i for i, _ in rows) % 100000]
        out.append((shard_id, vector, "%s:%s" % (TASK_ID, shard_id)))
    return out


# ---------------------------------------------------------------- slot 28: white room (sector, hilbert, engine)
SECTOR_CAPACITY = 1000000  # sector:13
_primes = [2]


def prime_at(n):  # sector:15-27
    cand = _primes[-1]
    while len(_primes) <= n:
        cand += 1 if cand == 2 else 2
        is_p = True
        for p in _primes:
            if p * p > cand:
                break
            if cand % p == 0:
                is_p = False
                break
        if is_p:
            _primes.append(cand)
    return _primes[n]


def global_room_address(sector, room):  # sector:31-40
    if room < 0 or room >= SECTOR_CAPACITY:
        raise ValueError("roomInSector out of 1M sector capacity (0..%d)" % (SECTOR_CAPACITY - 1))
    prime = prime_at(sector)
    gi = sector * SECTOR_CAPACITY + room
    pid = "BH.SECTOR.P%d.R%s.%s" % (prime, str(room).rjust(7, "0"), sha("room|%d" % gi)[0:16][0:8].upper())
    return prime, gi, pid


def hilbert_d2xy(n, d):  # hilbert:6-19
    t, x, y, s = d, 0, 0, 1
    while s < n:
        rx = 1 & (t // 2)
        ry = 1 & (t ^ rx)
        if ry == 0:
            if rx == 1:
                x = s - 1 - x
                y = s - 1 - y
            x, y = y, x
        x += s * rx
        y += s * ry
        t = t // 4
        s *= 2
    return x, y


def emitted(pid, counter):  # engine:27-35, 47-54
    coord64 = sha(pid)
    b = lambda i: int(coord64[2 * i:2 * i + 2], 16)
    cp = int(coord64[0:3], 16) % 1024
    return {"pid": pid, "counter": counter, "coord64": coord64, "cp": cp,
            "glyph": "cp" + format(cp, "x").rjust(4, "0"), "port3": "%d.%d.%d" % (4096 + b(0), b(1), b(2))}


def unit_score(h):  # engine:96, 107
    return js_div(int(h[0:8], 16), 0xffffffff)


def genius_score(pid):  # engine:106-108
    return unit_score(sha(pid))


GENIUS_THRESHOLD = js_div(72, 100)  # the literal 0.72 (engine:86, 105, 132)


def engine_rows(marks, emit, reuse_coord64=False, threshold=GENIUS_THRESHOLD):  # engine:131-183 with MemoryStore
    live, compacted, prev = {}, {}, "0" * 16
    scorer = "deterministic-coord64" if reuse_coord64 else "deterministic-sha"
    rows, genius, mistake = [], 0, 0
    for mark in marks:
        a = emit()  # engine:164
        live[a["pid"]] = {"pid": a["pid"], "port3": a["port3"], "cp": a["cp"], "mark": mark}  # engine:165
        h = a["coord64"] if (reuse_coord64 and a["coord64"]) else sha(a["pid"] + "|" + mark)  # engine:95
        score = unit_score(h)  # engine:96
        verdict = "genius" if score >= threshold else "mistake"  # engine:167
        if verdict == "mistake":  # engine:170
            compacted[a["pid"]] = dict(live.pop(a["pid"]), compacted=True)
            mistake += 1
        else:
            genius += 1
        row = ("WHITEROOM|pid=%s|port3=%s|cp=%d|mark=%s|score=%s|verdict=%s|store=memory|scorer=%s|json=0"
               % (a["pid"], a["port3"], a["cp"], re.sub(r"[|\r\n]", "_", mark), to_fixed(score, 6), verdict, scorer))  # engine:144-146
        rh = sha(row + prev)[0:16]  # engine:147
        prev = rh
        rows.append(row + "|row_hash=" + rh)  # engine:148
    return rows, (len(marks), genius, mistake, len(live), len(compacted))


def bh_emitter(seed="liris-whiteroom"):  # engine:22-37
    state = {"counter": 0}

    def nxt():
        c = state["counter"]
        state["counter"] += 1
        return emitted("BH.WR.%s.%d" % (seed, c), c)
    return nxt


def sector_emitter(sector, start=0):  # engine:42-56
    state = {"room": start}

    def nxt():
        r = state["room"]
        state["room"] += 1
        return emitted(global_room_address(sector, r)[2], r)
    return nxt


# ---------------------------------------------------------------- slot 28: GC runtime and consumer address
def gc_trace(ops, every=2000, cap_max=2000, warn_at=1800):  # gc:14-59
    total = since = runs = files = 0
    reason = None
    out = []
    for op in ops:
        if op == "e":  # gc:27-35
            total += 1
            since += 1
            files += 1
            if since >= every:
                since, runs, reason, files = 0, runs + 1, "auto_threshold", max(0, files - every)
        else:  # gc:37-44
            since, runs, reason, files = 0, runs + 1, op, max(0, files - every)
        cap = "fail" if files >= cap_max else "warn" if files >= warn_at else "pass"  # gc:52-55
        out.append((total, since, runs, files, cap, reason or "null"))
    return out


def stable_stringify(v):  # consumer:104-110 (for the null/bool/int/str/list/dict payloads used here)
    import json
    if v is None:
        return "null"
    if isinstance(v, list):
        return "[" + ",".join(stable_stringify(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + stable_stringify(v[k]) for k in sorted(v)) + "}"
    return json.dumps(v, ensure_ascii=False)


def cube_address(norm):  # consumer:60-67
    s = sha(norm)
    return s, [int(s[0:3], 16) % 3, int(s[3:4], 16) % 6, int(s[4:5], 16) % 6]


# ---------------------------------------------------------------- fixtures
EDGE_TEXTS = [
    b"",
    b"a",
    b"ab",
    b"The THE the theory: x9 a1 _x -y --z 9abc abc-def_ghi",
    "\u0130stanbul \u212aelvin KELVIN \u00c9t\u00e9 na\u00efve stra\u00dfe".encode("utf-8"),
    b"\xef\xbb\xbfbom-lead text text text",
    b"line one\r\nline two\r\nline three",
    b"bad \xff\xfe bytes \xed\xa0\x80 here \xf0\x9f\x98 end \xc3",
    b"word " * 9 + b"other " * 9 + b"third " * 3 + b"fourth " * 3,
    b"tie tie alpha beta gamma delta epsilon zeta theta iota kappa lambda",
    b"{json} | pipes\rcr",
]


# A header row for the footer check: line 40's row carries the owner's e-mail and a Drive id, so the
# fixtures use this stand-in first row (the footer of ingest:47-48 hashes whatever rows it is given).
TEST_HDR = "INGESTHDR|proof=GOOGLE-DRIVE-TO-CUBE-INGEST|form=hbp-tuple|json=0"


def vendor_texts():
    out = []
    vend = os.path.join(CRATE, "vendor")
    for root, _, files in os.walk(vend):
        for f in files:
            out.append(os.path.relpath(os.path.join(root, f), CRATE).replace(os.sep, "/"))
    return sorted(out)


def build_fixtures():
    fx = {}
    lines = ["INGESTVECTORS|source=ingest-google-to-cube.mjs@29307bf:15-46|json=0"]
    for rel in vendor_texts():
        data = open(os.path.join(CRATE, rel), "rb").read()
        lines.append("CASE|file=%s|json=0" % rel)
        rows = ingest_rows(data)
        lines.extend(rows)
        lines.append(footer([TEST_HDR] + rows).rstrip("\n"))
    for data in EDGE_TEXTS:
        lines.append("CASE|hex=%s|json=0" % data.hex())
        rows = ingest_rows(data)
        lines.extend(rows)
        lines.append(footer([TEST_HDR] + rows).rstrip("\n"))
    fx["ingest-vectors.hbp"] = lines

    lines = ["SHARDVECTORS|source=hyperbehcs-d-drive-10000-room-rotor.mjs@84f0b20:216-230,281-304|json=0"]
    for rooms, size in ((10000, 100), (24, 6), (1, 1), (7, 3), (100000, 1000)):
        for sid, vec, seed in shard_vectors(rooms, size):
            lines.append("SHARD|rooms=%d|shard_size=%d|shard_id=%s|vector=%s|seed=%s|json=0" % (rooms, size, sid, ",".join(map(str, vec)), seed))
    fx["shard-vectors.hbp"] = lines

    lines = ["WHITEROOM|source=asolaria-whiteroom-engine@896518a|json=0"]
    lines.append("PRIMES|n=0..199|primes=%s|json=0" % ",".join(str(prime_at(i)) for i in range(200)))
    for s, r in ((0, 0), (0, 1), (1, 7), (2, 42), (3, 999999), (10, 123456), (47, 5), (199, 999998)):
        p, gi, pid = global_room_address(s, r)
        lines.append("ADDR|sector=%d|room=%d|prime=%d|global_index=%d|pid=%s|score=%s|json=0" % (s, r, p, gi, pid, to_fixed(genius_score(pid), 6)))
    for n, d in ((65536, 0), (65536, 1000007), (65536, 3999999), (2, 3), (4, 15), (1024, 1048575), (65536, 4294967295), (8, 37),
                 (2 ** 63 + 2048, 5)):  # a double above 2^63: JavaScript's loop ends at s = 2^64
        lines.append("HILBERT|n=%d|d=%d|xy=%d,%d|json=0" % ((n, d) + hilbert_d2xy(n, d)))
    rows, m = engine_rows(["bigpickle:room:%d:work" % i for i in range(12)], bh_emitter())  # engine:194
    lines.append("SMOKE|marks=bigpickle:room:i:work|n=12|seed=liris-whiteroom|scorer=deterministic-sha|json=0")
    lines.extend(rows)
    lines.append("METRICS|ticks=%d|genius=%d|mistake=%d|live=%d|compacted=%d|json=0" % m)
    rows, m = engine_rows(["fabric:sector2:room:%d:work" % i for i in range(40)], sector_emitter(2), reuse_coord64=True)
    lines.append("SECTORRUN|sector=2|n=40|scorer=deterministic-coord64|json=0")
    lines.extend(rows)
    lines.append("METRICS|ticks=%d|genius=%d|mistake=%d|live=%d|compacted=%d|json=0" % m)
    rows, m = engine_rows(["room:%d" % i for i in range(200)], bh_emitter())  # engine.test.mjs:55-58
    lines.append("METRICS200|ticks=%d|genius=%d|mistake=%d|live=%d|compacted=%d|first_row_hash=%s|last_row_hash=%s|json=0" % (m + (rows[0][-16:], rows[-1][-16:])))
    fx["whiteroom.hbp"] = lines

    ops = ["e"] * 1799 + ["e"] + ["e"] * 199 + ["e"] + ["e"] * 5 + ["cli_manual"] + ["e"] * 4000
    lines = ["GCTRACE|source=gc-runtime.mjs@c59e2e6:14-59|ops=1799e+e+199e+e+5e+cli_manual+4000e|json=0"]
    trace = gc_trace(ops)
    for i, t in enumerate(trace):
        if i < 3 or i in (1798, 1799, 1800, 1998, 1999, 2000, 2004, 2005, 2006) or i >= len(ops) - 3 or t[2] != trace[i - 1][2]:
            lines.append("GC|op=%d|total=%d|since=%d|runs=%d|files=%d|cap=%s|reason=%s|json=0" % ((i,) + t))
    fx["gc.hbp"] = lines

    payloads = [None, True, 0, 7, "", "pattern", "caf\u00e9 \"q\" \\ \n\t\u0001", [1, "a", None], {"b": 1, "a": [2, 3], "c": {"z": "y", "x": False}},
                {"pattern": {"kind": "genius", "room": 42}}, {"tags": ["room:whiteroom"], "room": "whiteroom"}]
    lines = ["CONSUMER|source=whiteroom-consumer-index.mjs@32f9670:60-67,104-110|json=0"]
    for p in payloads:
        norm = stable_stringify(p)
        s, addr = cube_address(norm)
        lines.append("ADDR|norm_hex=%s|pattern_sha=%s|cube_address=%s|json=0" % (norm.encode("utf-8").hex(), s, ",".join(map(str, addr))))
    fx["consumer.hbp"] = lines
    return fx


def receipts_fixture(d):
    cycle = "cloud-cycle-002-receipt.hbp"
    names = sorted(f for f in os.listdir(d) if f.endswith(".hbp") and f != cycle)
    lines = ["INGESTRECEIPTS|source=what-is-asolaria---how-do-we-get-reductions-in-everything@29307bf:cubes|files=%d|json=0" % len(names)]
    for name in names:
        raw = open(os.path.join(d, name), "rb").read()
        crlf = b"\r\n" in raw
        rows = [r.rstrip("\r") for r in raw.decode("utf-8").split("\n") if r.strip()]
        body, ftr = rows[:-1], rows[-1]
        m = re.match(r"INGESTFTR\|sha256=([0-9a-f]{64})\|rows=(\d+)\|verdict=([^|]+)\|json=0$", ftr)
        recomputed = sha("\n".join(body) + "\n")
        lines.append("RECEIPT|file=cubes/%s|crlf=%d|rows=%s|footer_sha256=%s|footer_recomputed=%s|verdict=%s|json=0"
                     % (name, int(crlf), m.group(2), m.group(1), "match" if recomputed == m.group(1) and int(m.group(2)) == len(body) else "differ:" + recomputed, m.group(3)))
        assert body[0].startswith("INGESTHDR|")
        lines.extend(body[1:])  # rows 2-7; the INGESTHDR row (owner e-mail, Drive id) is not copied
    # cubes/cloud-cycle-002-receipt.hbp lines 3-10 record the ratios of the 8 cycle-2 ingests (its
    # line 2 names a Drive folder id and is not copied).
    rows = open(os.path.join(d, cycle), encoding="utf-8").read().split("\n")
    lines.append("CYCLE2|file=cubes/%s|json=0" % cycle)
    lines.extend(r for r in rows if r.startswith("CYCLE2INGEST|"))
    return {"ingest-receipts.hbp": lines}


def write_or_check(fx, check):
    bad = 0
    for name, lines in sorted(fx.items()):
        text = "\n".join(lines) + "\n"
        path = os.path.join(FIX, name)
        if check:
            old = open(path, encoding="utf-8", newline="").read() if os.path.exists(path) else None
            if old != text:
                print("DIFF|fixture=%s|json=0" % name)
                bad += 1
            else:
                print("SAME|fixture=%s|rows=%d|json=0" % (name, len(lines)))
        else:
            os.makedirs(FIX, exist_ok=True)
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(text)
            print("WROTE|fixture=%s|rows=%d|json=0" % (name, len(lines)))
    return bad


def grid(n):
    rng = random.Random(20261017)
    words = ["genius", "mistake", "cube", "glyph", "room", "sector", "the", "and", "a1", "x", "white-room", "super_gulp", "Q9", "\u0130x", "\u212aa"]
    for _ in range(n):
        parts = []
        for _ in range(rng.randrange(0, 40)):
            r = rng.randrange(10)
            if r < 6:
                parts.append(rng.choice(words).encode("utf-8"))
            elif r < 8:
                parts.append(bytes(rng.randrange(32, 127) for _ in range(rng.randrange(1, 8))))
            else:
                parts.append(bytes(rng.randrange(0, 256) for _ in range(rng.randrange(1, 4))))
            parts.append(rng.choice([b" ", b"\n", b"\r\n", b"\t", b"-", b".", b""]))
        data = b"".join(parts)
        print("ICASE|hex=%s|json=0" % data.hex())
        for r in ingest_rows(data):
            print(r.replace("\r", "\\r").replace("\n", "\\n"))
        pid = "BH.SECTOR.P%d.R%07d.%08X" % (rng.randrange(2, 1000), rng.randrange(0, 10 ** 6), rng.randrange(0, 2 ** 32))
        print("SCASE|pid=%s|score=%s|json=0" % (pid, to_fixed(genius_score(pid), 6)))
        nn = 2 ** rng.randrange(1, 17)
        dd = rng.randrange(0, nn * nn)
        print("HCASE|n=%d|d=%d|xy=%d,%d|json=0" % ((nn, dd) + hilbert_d2xy(nn, dd)))


def main(argv):
    check = "--check" in argv
    if "--grid" in argv:
        grid(int(argv[argv.index("--grid") + 1]))
        return 0
    if "--receipts" in argv:
        return 1 if write_or_check(receipts_fixture(argv[argv.index("--receipts") + 1]), check) else 0
    if "--write" in argv or check:
        return 1 if write_or_check(build_fixtures(), check) else 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
