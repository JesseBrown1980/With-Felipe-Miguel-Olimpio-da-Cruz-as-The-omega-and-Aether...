#!/usr/bin/env python3
"""Stdlib referee for address/port-emitter (asolaria-port-address-emitter).

Mirrors bigpickle-rebuild@c592599 src/port-address-emitter.mjs (blob 8ccac7c13e4c) and the hilbertXY it
imports from src/district-fabric.mjs:61-74 (blob b40d206330b3) line by line, never the Rust code. It
generates the cases (exhaustive small indexes, sha256-seeded large ones, boundaries, capacities, PIDs,
sequential emitters, port_addr rows), feeds them to the `emit_ports` example on stdin and compares every
answer byte for byte. It also runs the nine upstream unit tests (tests/unit/port-address-emitter.test.mjs,
blob 2f594c535e1d) against the mirror.

Integer arithmetic only. JS Number operations are mirrored on Python integers, and every value the JS
lines compute is checked to be exactly representable as an IEEE-754 binary64 (`dbl_exact`); where all
of them are, the double results equal these integer results. Divisions in the mirrored lines are by
powers of two (2, 4, 2**bits, 2**(2*bits)), whose quotients binary64 holds exactly. The additions at
:80-81 are rounded to binary64 (`js_add`), because the `next` cases take their sums past 2**53. NaN is a
sentinel.

Usage: referee_ports.py --check PATH/TO/emit_ports   (exit 1 on any mismatch)
       referee_ports.py --selftest                   (upstream unit tests on the mirror only)
"""
import hashlib
import subprocess
import sys

sys.set_int_max_str_digits(0)

DEFAULT_IP = "127.0.0.1"  # :22 fallback literal
DEFAULT_LEVELS = 3  # :23 fallback literal
DEFAULT_BITS = 16  # :24 fallback literal
RUST_MAX_BITS = 31  # the Rust port's bits bound (hilbert_xy takes i64)


class _NaN:
    def __repr__(self):
        return "NaN"


NAN = _NaN()

# ---- binary64 exactness bookkeeping (integer-only) ----
COUNT = {"checked": 0, "inexact": 0}


def dbl_exact(v):
    """Integer v is a finite binary64 value: odd part below 2**53 and magnitude below 2**1024."""
    a = abs(v)
    if a == 0:
        return True
    odd = a // (a & -a)
    return odd < (1 << 53) and a.bit_length() <= 1024


def chk(v):
    if v is not NAN:
        COUNT["checked"] += 1
        if not dbl_exact(v):
            COUNT["inexact"] += 1
    return v


def nearest_dbl(v):
    """The binary64 value nearest the non-negative integer v, ties to even (IEEE-754 roundTiesToEven)."""
    sh = v.bit_length() - 53
    if sh <= 0:
        return v
    q, r = v >> sh, v & ((1 << sh) - 1)
    half = 1 << (sh - 1)
    if r > half or (r == half and q & 1):
        q += 1
    return q << sh


def js_add(a, b):
    """JS `a + b` on the Numbers nearest the non-negative integers a and b: their exact sum, rounded."""
    return nearest_dbl(nearest_dbl(a) + nearest_dbl(b))


def is_pow2(v):
    return v > 0 and v & (v - 1) == 0


def js_pow2(bits):
    """`2 ** bits` for a non-negative integer: exact below 2**1024, else Infinity (None)."""
    return (1 << bits) if bits <= 1023 else None


def to_int32(v):
    """ECMA-262 ToInt32 of an integer-valued Number (NaN -> 0)."""
    if v is NAN:
        return 0
    m = v % (1 << 32)
    return m - (1 << 32) if m >= (1 << 31) else m


def js_trunc_half(t):
    """`t / 2` as ToInt32 truncates it, for t >= 0 (NaN stays NaN)."""
    if t is NAN:
        return NAN
    assert t >= 0
    return t // 2


def js_mod(a, b):
    """`a % b` for non-negative integer Numbers (fmod is exact); NaN propagates."""
    if a is NAN or b is NAN:
        return NAN
    return a % b


def js_floor_div(a, b):
    """`Math.floor(a / b)` with b a power of two (the quotient is exact); NaN propagates."""
    if a is NAN:
        return NAN
    assert is_pow2(b)
    return a // b


def js_max0(v):
    """`Math.max(0, v)`: NaN if v is NaN."""
    return NAN if v is NAN else max(0, v)


def js_str(v):
    return "NaN" if v is NAN else str(v)


def sha(s):
    """:26 createHash('sha256').update(String(s)).digest('hex')"""
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ---- district-fabric.mjs:61-74 hilbertXY ----
def hilbert_xy(n, d):
    t, x, y = chk(d), 0, 0  # :62 let rx, ry, t = d, x = 0, y = 0;
    s = 1  # :63 for (let s = 1; s < n; s *= 2) {
    while s < n:
        rx = 1 & to_int32(js_trunc_half(t))  # :64 rx = 1 & (t / 2);
        ry = 1 & (to_int32(t) ^ rx)  # :65 ry = 1 & (t ^ rx);
        if ry == 0:  # :66
            if rx == 1:  # :67
                x = chk(chk(s - 1) - x)
                y = chk(chk(s - 1) - y)
            x, y = y, x  # :68 const tmp = x; x = y; y = tmp;
        x = chk(x + chk(s * rx))  # :70 x += s * rx; y += s * ry;
        y = chk(y + chk(s * ry))
        t = chk(js_floor_div(t, 4))  # :71 t = Math.floor(t / 4);
        s = chk(s * 2)  # :63 s *= 2
    return x, y  # :73


# ---- port-address-emitter.mjs ----
class RangeErr(Exception):
    pass


def capacity(levels=DEFAULT_LEVELS, bits=DEFAULT_BITS):  # :29
    side = js_pow2(bits)  # 2 ** bits
    if side is None:
        raise RangeErr("BigInt(Infinity)")  # BigInt(Infinity) throws a RangeError
    return str(side ** levels)  # :30 (BigInt(2 ** bits) ** BigInt(levels)).toString()


def ports_for_index(index, levels=DEFAULT_LEVELS, bits=DEFAULT_BITS):  # :36
    side = chk(js_pow2(bits))  # :39 const side = 2 ** bits;
    block = chk(side * side)  # :40 const block = side * side;
    ports = []  # :41
    rem = js_max0(chk(index))  # :42 let rem = Math.max(0, Math.floor(index));
    while len(ports) + 2 <= levels:  # :43
        d = chk(js_mod(rem, block))  # :44 const d = rem % block;
        rem = chk(js_floor_div(rem, block))  # :45 rem = Math.floor(rem / block);
        x, y = hilbert_xy(side, d)  # :46
        ports.extend([x, y])  # :47 ports.push(x, y);
    while len(ports) < levels:  # :49
        ports.append(chk(js_mod(rem, side)))  # :50 ports.push(rem % side);
        rem = chk(js_floor_div(rem, side))  # :51 rem = Math.floor(rem / side);
    return ports[:levels]  # :53


def address_string(ports, ip=DEFAULT_IP):  # :56
    return f"{ip}:{'.'.join(js_str(p) for p in ports)}"  # :57


def parse_int_hex(s):
    """parseInt(s, 16) for a string of hex digits: '' -> NaN."""
    return int(s, 16) if s else NAN


def index_for_pid(pid, levels=DEFAULT_LEVELS, bits=DEFAULT_BITS):  # :61
    total_bits = min(52, bits * levels)  # :64
    hex_needed = -(-total_bits // 4)  # :65 Math.ceil(totalBits / 4)
    i = parse_int_hex(sha(pid)[:hex_needed])  # :66
    return js_mod(i, 2 ** total_bits)  # :67


class PortAddressEmitter:  # :70
    def __init__(self, ip=None, levels=None, bits=None, start=None):  # :71
        self.ip = DEFAULT_IP if ip is None else ip  # :72
        self.levels = DEFAULT_LEVELS if levels is None else levels  # :73
        self.bits = DEFAULT_BITS if bits is None else bits  # :74
        self.start = max(0, 0 if start is None else start)  # :75
        self.counter = 0  # :76

    def next(self):  # :79
        index = js_add(self.start, self.counter)  # :80 const index = this.start + this.counter;
        self.counter = js_add(self.counter, 1)  # :81 this.counter++;
        return self.address_for(index)  # :82

    def address_for(self, index):  # :84
        ports = ports_for_index(index, self.levels, self.bits)  # :85
        return {"index": index, "ip": self.ip, "ports": ports,
                "address": ".".join(js_str(p) for p in ports),
                "full": address_string(ports, self.ip), "levels": self.levels, "bits": self.bits}  # :86

    def for_pid(self, pid):  # :88
        return self.address_for(index_for_pid(pid, self.levels, self.bits))

    def capacity(self):  # :89
        return capacity(self.levels, self.bits)


def is_array_index(p):
    """ECMA-262: canonical numeric string of an integer i with 0 <= i < 2**32 - 1."""
    if not p or any(c not in "0123456789" for c in p):
        return False
    n = int(p)
    return str(n) == p and n < (1 << 32) - 1


def object_entries(assignments):
    """Object.entries of an object whose properties were assigned in this order (OrdinaryOwnPropertyKeys)."""
    obj = {}
    for k, v in assignments:
        obj[k] = v  # a repeated key keeps its first position
    idx = sorted((k for k in obj if is_array_index(k)), key=int)
    rest = [k for k in obj if not is_array_index(k)]
    return [(k, obj[k]) for k in idx + rest]


def port_addr_row(pid, addr, extra=()):  # :93
    e = [f"{k}={v}" for k, v in object_entries(extra)]  # :94
    return "|".join(["HBPv1", "row=port_addr", f"pid={pid}", f"ip={addr['ip']}",
                     f"port_addr={addr['address']}", f"full={addr['full']}", f"levels={addr['levels']}",
                     "same_process=true", "bound_socket=false", *e, "json=0",
                     f"row_hash={sha(pid + addr['full'])[:16]}"])  # :95-98


# ---- upstream unit tests (tests/unit/port-address-emitter.test.mjs) on the mirror ----
def upstream_unit_tests():
    a = ports_for_index(123456789, 3, 16)  # :12-17
    b = ports_for_index(123456789, 3, 16)
    assert a == b and len(a) == 3 and all(0 <= p <= 65535 for p in a)
    e = PortAddressEmitter(levels=3, bits=16)  # :19-24
    assert len({e.next()["full"] for _ in range(5000)}) == 5000
    assert capacity(3, 16) == "281474976710656"  # :26-30
    assert capacity(4, 16) == "18446744073709551616"
    assert int(capacity(3, 16)) > 1_000_000_000_000
    for i in [0, 1000, 50000, 1_000_000]:  # :32-40
        p, q = ports_for_index(i, 3, 16), ports_for_index(i + 1, 3, 16)
        assert abs(p[0] - q[0]) + abs(p[1] - q[1]) == 1
    e = PortAddressEmitter()  # :42-49
    a0, a1 = e.next(), e.next()
    assert e.counter == 2 and a0["index"] == 0 and a1["index"] == 1
    assert a0["full"] != a1["full"] and a0["full"].startswith("127.0.0.1:")
    e = PortAddressEmitter()  # :51-58
    p1 = e.for_pid("BH.DISTRICT.ENGINEERING.R00007.ABCD")
    p1b = e.for_pid("BH.DISTRICT.ENGINEERING.R00007.ABCD")
    p2 = e.for_pid("BH.DISTRICT.WHITE-ROOM.R00042.WXYZ")
    assert p1["full"] == p1b["full"] and p1["full"] != p2["full"]
    assert address_string([4949, 7, 3], "127.0.0.1") == "127.0.0.1:4949.7.3"  # :60-62
    e = PortAddressEmitter()  # :64-71
    row = port_addr_row("BH.AGENT.PID.X", e.for_pid("BH.AGENT.PID.X"), [("district", "engineering")])
    assert row.startswith("HBPv1|row=port_addr|")
    assert "|same_process=true|" in row and "|bound_socket=false|" in row
    assert "|json=0|" in row and "{" not in row and "}" not in row
    e = PortAddressEmitter(levels=4)  # :73-78
    a = e.for_pid("BH.X")
    assert len(a["ports"]) == 4 and len(a["full"].split(":")[1].split(".")) == 4
    return 9


# ---- case generation ----
U64 = (1 << 64) - 1


def seeded_u64(tag, k):
    return int.from_bytes(hashlib.sha256(f"port-emitter|{tag}|{k}".encode()).digest()[:8], "big")


EXHAUSTIVE = [(levels, bits) for bits in range(0, 5) for levels in range(0, 5)] + [(3, 5)]
SEEDED_SHAPES = [(3, 16), (4, 16), (2, 16), (1, 16), (5, 16), (6, 16), (3, 8), (5, 13), (2, 31), (3, 31),
                 (4, 24), (7, 9), (3, 1), (1, 0), (3, 0), (0, 16)]
SEEDED_N = 400


def boundary_indexes(levels, bits):
    side, block = 1 << bits, 1 << (2 * bits)
    cap = side ** levels
    raw = [0, 1, 2, 3, side - 1, side, side + 1, block - 1, block, block + 1, cap - 1, cap, cap + 1,
           (1 << 32) - 1, 1 << 32, (1 << 48) - 1, 1 << 48, (1 << 52) - 1, 1 << 52, (1 << 53) - 1, 1 << 53,
           (1 << 64) - (1 << 11), U64]
    return sorted({v for v in raw if 0 <= v <= U64})


def build_cases():
    """Returns (stdin lines, expected lines, per-row class and JS-value exactness counts, NaN-index PIDs)."""
    cases, expect, klass = [], [], []
    mark = dict(COUNT)

    def emit(tag, line, outs):
        """One stdin case; the JS values checked since the previous case are booked on its first row."""
        cases.append(line)
        for j, out in enumerate(outs):
            expect.append(f"{line}|{out}")
            first = j == 0
            klass.append((tag, COUNT["checked"] - mark["checked"] if first else 0,
                          COUNT["inexact"] - mark["inexact"] if first else 0))
        mark.update(COUNT)

    def add_ports(levels, bits, index, tag):
        emit(tag, f"ports|{levels}|{bits}|{index}",
             [".".join(js_str(p) for p in ports_for_index(index, levels, bits))])

    for levels, bits in EXHAUSTIVE:
        cap = (1 << bits) ** levels
        for i in range(2 * cap):
            add_ports(levels, bits, i, "exhaustive")
    for i in range(1 << 16):
        add_ports(2, 8, i, "full-curve-256")
        add_ports(3, 16, i, "exhaustive-16bit-first-65536")
    for levels, bits in SEEDED_SHAPES:
        for v in boundary_indexes(levels, bits):
            add_ports(levels, bits, v, "boundary" if dbl_exact(v) else "u64-extension")
        for k in range(SEEDED_N):
            r = seeded_u64(f"{levels}/{bits}", k)
            add_ports(levels, bits, r >> 11, "seeded-53bit")  # any JS safe integer
            add_ports(levels, bits, (r >> 11) << (r % 12), "seeded-double")  # binary64 integers < 2**64
            add_ports(levels, bits, r, "seeded-u64" if dbl_exact(r) else "u64-extension")

    shapes = [(levels, bits) for levels in range(0, 9)
              for bits in [0, 1, 2, 8, 15, 16, 17, 31, 32, 52, 53, 64, 1000, 1023, 1024, 1025, 4294967295]]
    for levels, bits in shapes + [(100, 1000), (4294967295, 0), (0, 4294967295)]:
        try:
            out = capacity(levels, bits)
        except RangeErr:
            out = "RangeError"
        emit("capacity", f"capacity|{levels}|{bits}", [out])

    pids = ["BH.DISTRICT.ENGINEERING.R00007.ABCD", "BH.DISTRICT.WHITE-ROOM.R00042.WXYZ", "BH.AGENT.PID.X",
            "BH.X", "", "BH.\u00fc.\u2603.\U0001F702"] + [f"BH.AGENT.{seeded_u64('pid', k):016x}" for k in range(200)]
    nan_pid = []
    for levels, bits in [(3, 16), (4, 16), (1, 16), (2, 8), (13, 4), (5, 31), (1, 31), (0, 16), (3, 0), (2, 0)]:
        e = PortAddressEmitter(levels=levels, bits=bits)
        for pid in pids:
            a = e.for_pid(pid)
            if a["index"] is NAN:
                nan_pid.append((levels, bits, a["full"]))
            emit("pid", f"pid|{levels}|{bits}|{pid}",
                 ["none" if a["index"] is NAN else f"{a['index']}|{a['full']}"])

    # the last five start past 2**53, where the :80 sum is rounded to binary64; (1 << 64) - (1 << 11) is
    # the largest binary64 value below 2**64, and (1 << 53) + 1 is not a binary64 value (u64-extension)
    for levels, bits, start, count in [(3, 16, 0, 5000), (3, 16, (1 << 32) - 3, 6), (4, 16, 0, 3),
                                       (1, 16, 65534, 4), (2, 8, 65534, 4), (3, 16, (1 << 48) - 2, 4),
                                       (3, 16, (1 << 53) - 4, 12), (4, 16, 1 << 53, 6), (1, 16, (1 << 53) + 2, 5),
                                       (2, 31, 1 << 54, 6), (3, 16, (1 << 60) + (1 << 8), 4),
                                       (4, 16, (1 << 64) - (1 << 11), 4), (3, 16, (1 << 53) + 1, 3)]:
        e = PortAddressEmitter(levels=levels, bits=bits, start=start)
        outs = []
        for k in range(count):
            a = e.next()
            outs.append(f"{k}|{a['index']}|{a['full']}|{e.counter}")
        emit("next" if dbl_exact(start) else "u64-extension", f"next|{levels}|{bits}|{start}|{count}", outs)

    extras = ["", "district=engineering", "district=engineering;2=b;10=c;1=a;01=z;4294967294=m;4294967295=n",
              "b=1;a=2;b=3", "0=x;x=0;-1=y;1.5=w;007=q"]
    for ip in [DEFAULT_IP, "::1"]:
        for ex in extras:
            for levels, bits in [(3, 16), (4, 16), (0, 16)]:
                for pid in ["BH.AGENT.PID.X", "BH.X", "BH.\u00fc.\u2603"]:
                    a = PortAddressEmitter(ip=ip, levels=levels, bits=bits).for_pid(pid)
                    pairs = [tuple(kv.split("=", 1)) for kv in ex.split(";") if kv]
                    emit("row", f"row|{levels}|{bits}|{ip}|{ex}|{pid}",
                         ["none" if a["index"] is NAN else port_addr_row(pid, a, pairs)])
    return cases, expect, klass, nan_pid


def measurements():
    """Integer counts of the upstream claims at :33-35 and the unit test at :32-40."""
    out = []
    for levels, bits in EXHAUSTIVE:
        cap = (1 << bits) ** levels
        seen = {tuple(ports_for_index(i, levels, bits)) for i in range(cap)}
        wrap = sum(ports_for_index(i + cap, levels, bits) == ports_for_index(i, levels, bits) for i in range(cap))
        out.append(f"bijective levels={levels} bits={bits}: distinct={len(seen)}/{cap} wrap_equal={wrap}/{cap}")
    for levels, bits, n in [(2, 8, 1 << 16), (3, 16, 1 << 16), (3, 4, 1 << 12)]:
        prev, steps1, steps = None, 0, 0
        for i in range(n):
            p = ports_for_index(i, levels, bits)
            if prev is not None:
                steps += 1
                steps1 += abs(p[0] - prev[0]) + abs(p[1] - prev[1]) == 1
            prev = p
        out.append(f"locality levels={levels} bits={bits} index<{n}: manhattan1={steps1}/{steps}")
    for bits in [4, 8, 16]:
        block = 1 << (2 * bits)
        a, b = ports_for_index(block - 1, 3, bits), ports_for_index(block, 3, bits)
        out.append(f"block-boundary bits={bits} index {block - 1}->{block}: {a}->{b}"
                   f" manhattan01={abs(a[0] - b[0]) + abs(a[1] - b[1])}")
    return out


def main():
    args = sys.argv[1:]
    n = upstream_unit_tests()
    print(f"upstream unit tests on the mirror: {n}/9 pass")
    if args[:1] == ["--selftest"]:
        for m in measurements():
            print(m)
        return 0
    if len(args) != 2 or args[0] != "--check":
        print(__doc__)
        return 2
    COUNT["checked"] = COUNT["inexact"] = 0
    cases, expect, klass, nan_pid = build_cases()
    proc = subprocess.run([args[1]], input="\n".join(cases) + "\n", capture_output=True, text=True,
                          encoding="utf-8", check=False)
    if proc.returncode != 0:
        print(proc.stderr)
        print("FAIL: emit_ports exited", proc.returncode)
        return 1
    got = proc.stdout.split("\n")
    if got and got[-1] == "":
        got.pop()
    bad = 0
    per = {}
    for i, want in enumerate(expect):
        tag, checked, inexact = klass[i]
        c = per.setdefault(tag, [0, 0, 0, 0])
        c[0] += 1
        c[2] += checked
        c[3] += inexact
        if i >= len(got) or got[i] != want:
            bad += 1
            c[1] += 1
            if bad <= 5:
                print(f"MISMATCH line {i}:\n  want {want[:300]}\n  got  {got[i][:300] if i < len(got) else '<none>'}")
    if len(got) != len(expect):
        bad += 1
        print(f"MISMATCH: {len(got)} output lines, {len(expect)} expected")
    for tag in sorted(per):
        rows, mism, checked, inexact = per[tag]
        print(f"{tag}: rows={rows} mismatches={mism} js_values_checked={checked} not_binary64_exact={inexact}")
    for levels, bits, full in sorted(set(nan_pid)):
        print(f"upstream index NaN (Rust None): levels={levels} bits={bits} upstream full={full}")
    js_exact_inexact = sum(v[3] for k, v in per.items() if k != "u64-extension")
    print(f"total rows={len(expect)} mismatches={bad} inexact_outside_u64_extension={js_exact_inexact}")
    if bad or js_exact_inexact:
        print("FAIL")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
