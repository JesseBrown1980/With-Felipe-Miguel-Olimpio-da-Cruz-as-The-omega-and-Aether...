#!/usr/bin/env python3
"""Cold-lane referee for kernel/lane (Python standard library only).

Recomputes the kernel boot lane independently of the Rust crate, mirroring the upstream Rust lines
one by one (asolaria-federation-1024 @ dc1da1a9; line numbers cited inline), and renders the same
HBP transcript the Rust test `tests/fixture.rs` renders from the vendored code:

  python3 tools/referee.py --check    # transcript == tests/fixtures/kernel-lane.hbp, receipts hold,
                                      # every `upstream-lines` block matches EXTRACTS.sha256
  python3 tools/referee.py --write    # rewrite the fixture
  python3 tools/referee.py --check --upstream federation-1024@dc1da1a9=<dir> \
                                      # also compare each block with the upstream file lines

Inputs are the vendored receipts under vendor/federation-1024/kernel/docs/receipts (HBP text).
"""

import argparse
import hashlib
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
RECEIPTS = ROOT / "vendor/federation-1024/kernel/docs/receipts"
FIXTURE = ROOT / "tests/fixtures/kernel-lane.hbp"
EXTRACTS = ROOT / "EXTRACTS.sha256"
MASK64 = (1 << 64) - 1

# kernel/core/src/lib.rs:73, 76
KERNEL_VERSION = b"0.2.0-phase3-scaffold"
FEDERATION_ANCHOR_PID = b"ASOLARIA-FEDERATION-REMAKE-1024-PID-2026-05-11"


def hexs(b):
    return bytes(b).hex()


def sha256(b):
    return hashlib.sha256(bytes(b)).digest()


# ---------------------------------------------------------------- receipts (HBP text)
def receipt_rows(name):
    rows = []
    for line in (RECEIPTS / name).read_text().splitlines():
        parts = line.split("|")
        fields = {}
        for p in parts[1:]:
            if "=" in p:
                k, v = p.split("=", 1)
                fields[k] = v
        rows.append((parts[0], fields, parts[1:]))
    return rows


def receipt_row(name, kind):
    for k, fields, raw in receipt_rows(name):
        if k == kind:
            return fields, raw
    raise SystemExit(f"{name}: no {kind} row")


def qemu_pci():
    """PCI functions of the QEMU q35 boot: bus/dev/func and ids from PCI_QEMU, cross-checked
    against DEVPIDHW (vendor:device/class:subclass)."""
    _, raw = receipt_row("ACER-HWINV-BUILD-BOOT-PROOF-2026-07-07.hbp", "PCI_QEMU")
    found = []
    for p in raw:
        bdf, val = p.split("=", 1)
        bus, rest = bdf.split(":")
        dev, func = rest.split(".")
        vendor, device = val[0:4], val[5:9]
        cls = val[val.index("_cls") + 4:]
        klass, sub = cls.split(":")
        found.append((int(bus, 16), int(dev, 16), int(func), int(vendor, 16), int(device, 16),
                      int(klass, 16), int(sub, 16)))
    hw, _ = receipt_row("ACER-DEVICE-PID-MINT-BOOT-PROOF-2026-07-08.hbp", "DEVPIDHW")
    for i, f in enumerate(found):
        ids, cs = hw[f"d{i}"].split("/")
        v, d = ids.split(":")
        c, s = cs.split(":")
        assert (int(v, 16), int(d, 16), int(c, 16), int(s, 16)) == f[3:], (i, f)
    return found


def receipt_clock():
    t, _ = receipt_row("ACER-DEVICE-TIME-60D-BOOT-PROOF-2026-07-08.hbp", "BOOTTIME")
    u = t["utc"]  # YYYY-MM-DDTHH:MM:SSZ
    return (int(u[0:4]), int(u[5:7]), int(u[8:10]), int(u[11:13]), int(u[14:16]), int(u[17:19]),
            int(t["tsc"]))


# ---------------------------------------------------------------- kernel/boot rows
HEX = b"0123456789abcdef"  # hwinv.rs:51


def put_u32(v):  # hwinv.rs:73-93 (and rtc.rs:188-207 put_u64): decimal, no padding
    return str(v).encode()


def hwtuple(found):  # hwinv.rs:103-145
    buf, count, rst_vmd, storage = bytearray(), 0, False, False
    for (_, _, _, vendor, device, klass, sub) in found:
        b = bytes([vendor >> 8, vendor & 0xFF, device >> 8, device & 0xFF, klass, sub])
        if len(buf) + 6 <= 512:
            buf += b
        count += 1
        if vendor == 0x8086 and device == 0x282A:
            rst_vmd = True
        if klass == 0x01:
            storage = True
    return bytes(buf), count, rst_vmd, storage


def project_60d(t):  # hwinv.rs:240-262
    t = t[:512]
    sel, counter = [], 0
    while len(sel) < 60:
        h = sha256(t + counter.to_bytes(4, "big"))
        j = 0
        while j + 1 < 32 and len(sel) < 60:
            sel.append(((h[j] << 8) | h[j + 1]) & 0x03FF)
            j += 2
        counter += 1
    return sel


def pci_line(f):  # hwinv.rs:384-405
    bus, dev, func, vendor, device, klass, sub = f
    return b"  PCI %02x:%02x.%c  %04x:%04x class=%02x:%02x\r\n" % (
        bus, dev, ord("0") + func, vendor, device, klass, sub)


def emit_device_pid(tup, count, rst_vmd, storage):  # hwinv.rs:267-319
    hw_digest = sha256(tup)
    coord = project_60d(tup)
    device_digest = sha256(b"".join(g.to_bytes(2, "big") for g in coord))
    row = (b"  BOOTPID|device_pid=" + hexs(device_digest[:8]).encode()
           + b"|device_pid_full=" + hexs(device_digest).encode()
           + b"|hw_tuple_pid_full=" + hexs(hw_digest).encode()
           + b"|hw_devices=" + put_u32(count)
           + b"|rst_vmd=" + (b"1" if rst_vmd else b"0")
           + b"|storage=" + (b"1" if storage else b"0")
           + b"|colony=acer|behcs=1024|dims=60|derived_from=60d_coordinate|coord_prefix="
           + b".".join(put_u32(g) for g in coord[:6])
           + b"|e=0|fire=0|json=0\r\n")
    return row, device_digest, coord


def write_utc(clock):  # rtc.rs:59-79 with put_u4 (180-186) and put_2 (174-178)
    y, mo, d, h, mi, s, _ = clock
    u4 = bytes([48 + (y // 1000) % 10, 48 + (y // 100) % 10, 48 + (y // 10) % 10, 48 + y % 10])
    p2 = lambda v: bytes([48 + (v // 10) % 10, 48 + v % 10])  # noqa: E731
    return u4 + b"-" + p2(mo) + b"-" + p2(d) + b"T" + p2(h) + b":" + p2(mi) + b":" + p2(s) + b"Z"


def boot_rows(found, clock):  # main.rs:317-323
    rows = [b"  hwinv . PCI enumeration (0xCF8/0xCFC, read-only)\r\n"]  # hwinv.rs:360
    present = [f for f in found if f[3] != 0xFFFF][:64]  # hwinv.rs:376-378, 420
    rows += [pci_line(f) for f in present]
    rows.append(b"  hwinv . PCI scan complete\r\n" if len(present) < 64
                else b"  hwinv . (capped at 64 device-functions)\r\n")
    tup, count, rst_vmd, storage = hwtuple(present)
    row, device_digest, coord = emit_device_pid(tup, count, rst_vmd, storage)
    rows.append(row)
    utc, tsc = write_utc(clock), clock[6]
    rows.append(b"  BOOTTIME|utc=" + utc + b"|tsc=" + put_u32(tsc)
                + b"|src=cmos_rtc+tsc|e=0|json=0\r\n")  # rtc.rs:162-167
    boot_pid = sha256(device_digest + utc + tsc.to_bytes(8, "big"))[:8]  # bootproj.rs:12-21
    rows.append(b"  BOOTPROJ|boot_pid=" + hexs(boot_pid).encode() + b"|device_pid="
                + hexs(device_digest[:8]).encode() + b"|utc=" + utc
                + b"|volatile=1|stable_ref=device_pid|e=0|fire=0|json=0\r\n")  # bootproj.rs:23-38
    status = (b"GATED_MATCH|vmd_walk=TODO_next_step" if rst_vmd
              else b"NOT_APPLICABLE|no_8086:282A_on_this_device")
    rows.append(b"  BOOTDRIVER|driver=intel-rst-vmd|match=8086:282A|device_pid="
                + hexs(device_digest[:8]).encode() + b"|boot_pid=" + hexs(boot_pid).encode()
                + b"|utc=" + utc + b"|status=" + status
                + b"|writes=0|e=0|fire=0|json=0\r\n")  # driver_rst_vmd.rs:18-39
    facts = dict(device_digest=device_digest, hw_digest=sha256(tup), coord=coord,
                 boot_pid=boot_pid, count=count, rst_vmd=rst_vmd, storage=storage)
    return rows, facts


# ---------------------------------------------------------------- kernel/core (single process)
class Kernel:
    """The process-global kernel state the lane touches: the single bus slot
    (envelope/mod.rs:111-252), the cosign counter (cosign_chain/mod.rs:198-220) and the exec
    handle counter (syscall/mod.rs:130)."""

    def __init__(self):
        self.slot = None
        self.appends = 0
        self.exec_next = 1

    # envelope/mod.rs:149-176
    def enqueue(self, env):
        if len(env) > 1024:
            return "PayloadOversize"
        if self.slot is not None:
            return "QueueFull"
        self.slot = bytes(env)
        return None

    # envelope/mod.rs:189-230
    def dequeue(self, buflen):
        if self.slot is None:
            return "QueueEmpty", None
        if len(self.slot) > buflen:
            return "PayloadOversize", None
        env, self.slot = self.slot, None
        return None, env

    def sys_exec(self, env):  # syscall/mod.rs:123-137
        if len(env) < 32:
            return "Invalid", None
        e = self.enqueue(env)
        if e is None:
            h, self.exec_next = self.exec_next, self.exec_next + 1
            return None, h
        return ("Exhausted" if e == "QueueFull" else "Invalid"), None

    def sys_envelope_send(self, env):  # syscall/mod.rs:242-257
        if len(env) < 32:
            return "Invalid"
        e = self.enqueue(env)
        if e is None:
            return None
        return "Exhausted" if e == "QueueFull" else "Invalid"

    def sys_envelope_recv(self, buflen):  # syscall/mod.rs:267-277
        if buflen == 0:
            return "Invalid", None
        e, env = self.dequeue(buflen)
        if e is None:
            return None, env
        return ("WouldBlock" if e == "QueueEmpty" else "Invalid"), None

    def sys_hookwall_pre(self, env):  # syscall/mod.rs:284-296, hookwall/mod.rs:59-68 (Micro)
        if len(env) < 2 or env[0] >= 64:
            return "Invalid", None
        return None, "Proceed"

    def sys_hookwall_post(self, env, verdict):  # syscall/mod.rs:304-316, hookwall/mod.rs:81-88
        if len(env) < 2 or env[0] >= 64:
            return "Invalid"
        self.cosign_append(verdict_row(env, verdict))
        return None

    def cosign_append(self, row):  # cosign_chain/mod.rs:208-220
        if not row:
            return "KindMalformed", None
        self.appends += 1
        return None, self.appends

    def sys_cosign_append(self, row):  # syscall/mod.rs:327-334
        if len(row) < 16:
            return "Invalid", None
        e, n = self.cosign_append(row)
        return ("CosignReject" if e else None), n


VERDICT_CODE = {"Proceed": 1, "Hold": 2, "Block": 3}


def verdict_row(hook, verdict):
    """compose_verdict_row (hookwall/mod.rs:104-133) over the context sys_hookwall_post builds
    (syscall/mod.rs:308-314): caller_pid 0, Micro (1), Public (0)."""
    return bytes([hook[0], hook[1], 1, VERDICT_CODE[verdict]]) + (0).to_bytes(8, "little") \
        + bytes([0]) + b"HVD"


def hook_context(t):  # init.rs:149-163
    no = 3 if t == b"EXEC" else 10
    return bytes([no - 1, no])


EERR = {"Invalid": b"invalid", "PermissionDenied": b"perm-denied",
        "HookwallBlock": b"hookwall-block", "Exhausted": b"exhausted",
        "WouldBlock": b"would-block", "Unimplemented": b"unimplemented",
        "CosignReject": b"cosign-reject"}  # init.rs:176-183


class Init:
    """kernel/boot/src/init.rs."""

    def __init__(self, k):
        self.k = k

    def emit_envelope(self, t, seq, payload):  # init.rs:207-216
        n = min(len(payload), 512 - 12)
        buf = t + seq.to_bytes(8, "little") + payload[:n]
        buf += bytes(max(12 + n, 32) - len(buf))
        self.k.sys_envelope_send(buf)
        return (seq + 1) & MASK64

    def pre(self, hook):  # init.rs:102-106
        e, v = self.k.sys_hookwall_pre(hook)
        return "Block" if e else v

    def dispatch(self, t, full, seq):  # init.rs:94-147 (SHTD handled by shutdown)
        hook = hook_context(t)
        v = self.pre(hook)
        if v == "Block":
            seq = self.emit_envelope(b"BLOK", seq, t)
            self.k.sys_hookwall_post(hook, "Block")
            return seq
        if v == "Hold":
            seq = self.emit_envelope(b"HOLD", seq, t)
            self.k.sys_hookwall_post(hook, "Hold")
            return seq
        if t == b"PING":
            seq = self.emit_envelope(b"PONG", seq, b"")
        elif t == b"EXEC":
            seq = self.handle_exec(full[12:], seq)
        elif t == b"VERS":
            seq = self.emit_envelope(b"VERS", seq, KERNEL_VERSION)
        elif t == b"PIDA":
            seq = self.emit_envelope(b"PIDA", seq, FEDERATION_ANCHOR_PID)
        else:
            seq = self.emit_envelope(b"UNKN", seq, t)
        self.k.sys_hookwall_post(hook, "Proceed")
        return seq

    def shutdown(self, seq):  # init.rs:127-132; line 133 sys_exit(0) does not return
        hook = hook_context(b"SHTD")
        assert self.pre(hook) == "Proceed"
        seq = self.emit_envelope(b"FINI", seq, b"init-shutdown")
        self.k.sys_hookwall_post(hook, "Proceed")
        e, _ = self.k.sys_cosign_append(b"init-shutdown")
        return seq, e

    def handle_exec(self, payload, seq):  # init.rs:166-185
        if not payload:
            return self.emit_envelope(b"EERR", seq, b"empty-exec")
        e, h = self.k.sys_exec(payload)
        if e is None:
            return self.emit_envelope(b"EOKx", seq, h.to_bytes(8, "little"))
        return self.emit_envelope(b"EERR", seq, EERR.get(e, b"other-err"))

    def emit_init_ready(self, pid):  # init.rs:189-199
        buf = b"INIT" + (0).to_bytes(8, "little") + pid.to_bytes(8, "little") + bytes(12)
        hook = hook_context(b"INIT")
        self.k.sys_hookwall_pre(hook)
        self.k.sys_envelope_send(buf)
        self.k.sys_hookwall_post(hook, "Proceed")
        return buf

    def drain(self):  # init.rs:223-232
        for _ in range(4):
            e, _ = self.k.sys_envelope_recv(1024)
            if e:
                break

    def exchange(self, t, seq):  # init.rs:238-267
        req = t + seq.to_bytes(8, "little") + bytes(20)
        seq = (seq + 1) & MASK64
        if self.k.sys_envelope_send(req) is not None:
            self.drain()
            return req, ("err", b"send-rejected"), seq
        e, env = self.k.sys_envelope_recv(1024)
        if e:
            return req, ("err", b"request-lost"), seq
        if len(env) < 4:
            return req, ("err", b"malformed"), seq
        want = seq
        seq = self.dispatch(env[:4], env, seq)
        e, rep = self.k.sys_envelope_recv(1024)
        if e is None and len(rep) >= 12 and rep[4:12] != want.to_bytes(8, "little"):
            return req, ("err", b"stale-reply"), seq
        if e is None:
            return req, ("ok", rep), seq
        self.drain()
        return req, ("err", b"no-reply"), seq


def sys_pid_current():  # syscall/mod.rs:222-232
    return int.from_bytes(sha256(FEDERATION_ANCHOR_PID)[:8], "big")


def run_turn(k, init, seq, failures):
    """One turn of run()'s loop (init.rs:69-89); SHTD is not sent to this scenario.
    Returns (kind, detail, seq, failures)."""
    e, env = k.sys_envelope_recv(512)  # init.rs:64 INIT_ENVELOPE_MAX, :69
    if e is None and len(env) >= 4:  # init.rs:70-74
        return "Dispatched", env, init.dispatch(env[:4], env, seq), 0
    if e is None:  # init.rs:75-77
        return "Malformed", len(env), seq, failures
    if e == "WouldBlock":  # init.rs:78-80
        return "WouldBlock", None, seq, failures
    failures = min(failures + 1, 0xFFFFFFFF)  # init.rs:82 saturating_add
    if failures >= 32:  # init.rs:40 RECV_FAILURE_THRESHOLD, :83-86
        seq = init.emit_envelope(b"SOS!", seq, b"init-recv-exhausted")
        return "Exhausted", None, seq, failures
    return "RecvFailed", e, seq, failures


# ---------------------------------------------------------------- tier / bus_fabric / gnn / sign_gate
class GnnInference:  # gnn/mod.rs:91-151 (`new` leaves the model unloaded, :103-108)
    def __init__(self):
        self.model_loaded = False

    def predict_route(self, _envelope):  # gnn/mod.rs:125-130
        return ("ok", "Local") if not self.model_loaded else ("err", "Unimplemented")

    def rank_top_n(self, items, n):  # gnn/mod.rs:133-138
        return ("ok", top_n_fallback(items, n)) if not self.model_loaded \
            else ("err", "Unimplemented")

    def aggregate_verdict(self, _in_favor, _total):  # gnn/mod.rs:141-150
        return ("ok", "Hold") if not self.model_loaded else ("err", "Unimplemented")


def top_n_fallback(items, n):  # gnn/mod.rs:78-88: score_q = 1000u16.saturating_sub(i as u16)
    return [(x, max(0, 1000 - (i & 0xFFFF))) for i, x in enumerate(items[:n])]


ROUTE_CODE = {"Local": 0, "TriadBroadcast": 1, "QuadBroadcast": 2, "UnicastAcer": 3,
              "UnicastLiris": 4, "UnicastFalcon": 5, "UnicastAether": 6}  # syscall/mod.rs:363-371


def sys_gnn_infer(inp, out):  # syscall/mod.rs:355-374
    if not out:
        return "Invalid", None
    status, decision = GnnInference().predict_route(inp)
    if status != "ok":
        return "Invalid", None
    out[0] = ROUTE_CODE[decision]
    return None, 1


def classify_path(path):  # tier/mod.rs:121-142
    if not path or "\0" in path:
        return "PathMalformed"
    lower = path.lower()
    if "_big-pickle-quarantine" in lower:
        return "Hidden"
    if "sovlinux" in lower:
        return "Shadow"
    if lower.startswith("vault/secret/") or "/vault/secret/" in lower:
        return "Secret"
    if "stealth/" in lower:
        return "Stealth"
    if "restricted/" in lower:
        return "Restricted"
    return "Public"


def sys_tier_query(raw):  # syscall/mod.rs:340-347
    try:
        s = raw.decode("utf-8")
    except UnicodeDecodeError:
        return "Invalid"
    t = classify_path(s)
    return "Invalid" if t == "PathMalformed" else t


def resolve_label(levels):  # bus_fabric/mod.rs:115-149
    if len(levels) > 20:
        return "LabelTooDeep"
    if any(g >= 1024 for g in levels):
        return "GlyphOutOfRange"
    data = b"".join(g.to_bytes(2, "big") for g in levels)
    h = 0xcbf29ce484222325
    for b in data:
        h ^= b
        h = (h * 0x100000001B3) & MASK64
    if h == 0 and data:
        h = 0x8000000000000000
    return "%016x" % h


def phase1_derive_public(seed):  # crypto/mod.rs:160-168
    return sha256(seed + b":derive:")


def phase1_sig(public, msg):  # crypto/mod.rs:95-110
    a = sha256(public + b":sign:" + msg)
    return a + sha256(a)


DEFAULT_DENIES = ["HD-virus", "drift", "malformed-PID", "unknown-cube", "off-fabric"]


def virus_allow(name):  # sign_gate/mod.rs:94-112
    if not name or not ("A" <= name[0] <= "Z"):
        return False
    if any(not (("A" <= c <= "Z") or ("0" <= c <= "9") or c == "_") for c in name):
        return False
    return "VIRUS" in name


def gate_envelope(msg, sig, public, alg, tags, envvars):  # sign_gate/mod.rs:116-146
    sig_valid = bool(msg) and alg == "ed25519" and phase1_sig(public, msg) == sig
    deny_clean = not any(d in t for t in tags for d in DEFAULT_DENIES)
    allow_rescued = (not deny_clean) and any(virus_allow(n) for n in envvars)
    admitted = sig_valid and (deny_clean or allow_rescued)
    if not sig_valid:
        reason = "signature-invalid"
    elif not deny_clean and not allow_rescued:
        reason = "deny-tag-matched-no-allow-rescue"
    elif allow_rescued:
        reason = "deny-tag-matched-but-allow-rescued"
    else:
        reason = "admitted-clean"
    return sig_valid, deny_clean, allow_rescued, admitted, reason


def hbp_escape(s):  # servers/host8-serve/src/main.rs:670-681
    out = []
    for ch in s:
        if ch in "|\r\n\t":
            out.append("_")
        elif (ch.isascii() and ch.isprintable() and ch != " ") or ch == " ":
            out.append(ch)
        else:
            out.append("_")
    return "".join(out[:240])


def rust_lines(s):
    """Rust `str::lines`: split on "\\n" only, no final empty piece, and drop one "\\r" from a
    piece that a "\\n" ended (a lone "\\r" or any other separator stays in the line)."""
    pieces = s.split("\n")
    ended = len(pieces) - 1  # pieces[:ended] were each followed by "\n"
    if pieces[-1] == "":
        pieces.pop()
    return [p[:-1] if i < ended and p.endswith("\r") else p for i, p in enumerate(pieces)]


def parse_health(kernel):  # asolaria-asi-os@457159d6 src/main.rs:361-375
    kver, kanchor = "-", "-"
    for line in rust_lines(kernel):  # main.rs:363 `kernel.lines()`
        if line.startswith("HOST8KERNEL|"):
            for f in line[len("HOST8KERNEL|"):].split("|"):
                if f.startswith("version="):
                    kver = f[len("version="):]
                if f.startswith("anchor_pid="):
                    kanchor = f[len("anchor_pid="):]
    return kver, kanchor, kernel != ""


# ---------------------------------------------------------------- the transcript
def b01(x):
    return "1" if x else "0"


def step_row(kind, call, recv, hook, hvd, appends, extra=""):
    r = "-" if recv is None else hexs(recv)
    return f"{kind}|call={call}|recv={r}|hook={hexs(hook)}|hvd={hexs(hvd)}|cosign_appends={appends}{extra}"


def transcript():
    out = ["KLANE|source=asolaria-federation-1024@dc1da1a9"
           "|pci=ACER-HWINV-BUILD-BOOT-PROOF-2026-07-07.hbp:PCI_QEMU"
           "|clock=ACER-DEVICE-TIME-60D-BOOT-PROOF-2026-07-08.hbp:BOOTTIME|json=0"]
    rows, _ = boot_rows(qemu_pci(), receipt_clock())
    out += ["SERIAL|" + r.decode()[:-2] for r in rows]
    out.append("PIDCURRENT|sys_pid_current=%016x" % sys_pid_current())

    # Console path: the console sends PING, VERS and PIDA through init::exchange
    # (console.rs:305-308, 344-355), seq from 1 (console.rs:544). XCHG rows: the same
    # init::exchange with types the console does not issue, continuing the same seq.
    k = Kernel()
    init = Init(k)
    seq = 1
    for t in [b"PING", b"VERS", b"PIDA", b"EXEC", b"INIT"]:
        kind = "CONSOLE" if t in (b"PING", b"VERS", b"PIDA") else "XCHG"
        before = k.appends
        hook = hook_context(t)
        req, (status, rep), seq = init.exchange(t, seq)
        reply = hexs(rep) if status == "ok" else "err:" + rep.decode()
        out.append(f"{kind}|ty={t.decode()}|recv={hexs(req)}|hook={hexs(hook)}"
                   f"|hvd={hexs(verdict_row(hook, init.pre(hook)))}"
                   f"|cosign_appends={k.appends - before}|reply={reply}")

    # Headless run() (init.rs:60-91).
    k = Kernel()
    init = Init(k)
    pid = sys_pid_current()
    before = k.appends
    init.emit_init_ready(pid)
    hook = hook_context(b"INIT")
    out.append(step_row("RUN", "init_ready", None, hook, verdict_row(hook, "Proceed"),
                        k.appends - before))
    seq = 1
    for _ in range(3):
        before = k.appends
        _, env = k.sys_envelope_recv(512)
        t = env[:4]
        seq = init.dispatch(t, env, seq)
        hook = hook_context(t)
        out.append(step_row("RUN", "run_step", env, hook, verdict_row(hook, init.pre(hook)),
                            k.appends - before))
    e = k.sys_envelope_send(b"PING" + bytes(28))
    out.append(f"RUN|call=producer_send|len=32|result={e or 'ok'}")

    # run() fed an EXEC envelope whose 32-byte payload is itself a PING envelope.
    k = Kernel()
    init = Init(k)
    seq = 1
    payload = b"PING" + (7).to_bytes(8, "little") + bytes(20)
    env = b"EXEC" + (0).to_bytes(8, "little") + payload
    e = k.sys_envelope_send(env)
    out.append(f"EXECRUN|call=producer_send|len={len(env)}|result={e or 'ok'}")
    for _ in range(2):
        before = k.appends
        _, got = k.sys_envelope_recv(512)
        t = got[:4]
        seq = init.dispatch(t, got, seq)
        hook = hook_context(t)
        out.append(step_row("EXECRUN", "run_step", got, hook, verdict_row(hook, init.pre(hook)),
                            k.appends - before))
    _, left = k.sys_envelope_recv(1024)
    out.append(f"EXECRUN|call=bus_read|env={hexs(left)}|seq_after={seq}")

    # run() fed SHTD: init.rs:127-132, then sys_exit(0).
    k = Kernel()
    init = Init(k)
    seq = 1
    env = b"SHTD" + bytes(28)
    e = k.sys_envelope_send(env)
    out.append(f"SHTDRUN|call=producer_send|len={len(env)}|result={e or 'ok'}")
    before = k.appends
    _, got = k.sys_envelope_recv(512)
    seq, ce = init.shutdown(seq)
    hook = hook_context(b"SHTD")
    out.append(step_row("SHTDRUN", "run_step", got, hook, verdict_row(hook, "Proceed"),
                        k.appends - before, f"|sys_cosign_append={ce or 'ok'}"))
    _, left = k.sys_envelope_recv(1024)
    out.append(f"SHTDRUN|call=bus_read|env={hexs(left)}")

    # run() with a 600-byte envelope in the slot: every recv into its 512-byte buffer fails.
    k = Kernel()
    init = Init(k)
    seq = 1
    big = b"BIGx" + bytes(596)
    e = k.sys_envelope_send(big)
    failed, err, failures = 0, None, 0
    while True:
        kind, detail, seq, failures = run_turn(k, init, seq, failures)
        if kind != "RecvFailed":
            break
        failed, err = failures, detail
    assert kind == "Exhausted", kind
    _, left = k.sys_envelope_recv(1024)
    out.append(f"EXHAUST|sent_len={len(big)}|send={e or 'ok'}|recv_failed={failed}|recv_err={err}"
               f"|step32={kind}|bus_len={len(left)}|bus_type={hexs(left[:4])}|seq_after={seq}")

    # sys_cosign_append length floor (syscall/mod.rs:327-334).
    k = Kernel()
    for row in [b"", b"init-shutdown", b"x" * 15, b"x" * 16, b"console-reset-request"]:
        before = k.appends
        e, _ = k.sys_cosign_append(row)
        out.append(f"COSIGN|row_hex={hexs(row) or '-'}|len={len(row)}"
                   f"|sys_cosign_append={e or 'ok'}|cosign_appends={k.appends - before}")

    # sys_gnn_infer (syscall/mod.rs:355-374) and the GNN shim fallbacks (gnn/mod.rs:78-150).
    out4 = bytearray([0xAA] * 4)
    e, n = sys_gnn_infer(b"route-me", out4)
    out.append(f"GNN|input={hexs(b'route-me')}|out_len=4|ret={e or n}|out0={out4[0]:02x}")
    e, n = sys_gnn_infer(b"", bytearray())
    out.append(f"GNN|input=-|out_len=0|ret={e or n}")
    ranked = top_n_fallback(["a", "b", "c", "d"], 3)
    out.append("GNNTOPN|items=a.b.c.d|n=3|ranked=" + ".".join(f"{x}:{s}" for x, s in ranked))
    _, verdict = GnnInference().aggregate_verdict(50, 100)
    out.append(f"GNNAGG|in_favor=50|total=100|verdict={verdict}")

    for raw in [b"", b"a\x00b", b"\xff\xfe", b"C:/asolaria-acer/_big-pickle-quarantine/x",
                b"/mnt/SOVLINUX/x", b"vault/secret/k", b"x/vault/secret/y", b"a/stealth/b",
                b"a/Restricted/b", b"docs/readme.md"]:
        out.append(f"TIER|path_hex={hexs(raw) or '-'}|sys_tier_query={sys_tier_query(raw)}")

    for levels in [[], [0], [1, 2, 3], [1023] * 20, [1024], [1] * 21]:
        lv = ".".join(str(g) for g in levels) or "-"
        out.append(f"LABEL|levels={lv}|resolve_label={resolve_label(levels)}")

    seed_a, seed_b = bytes([0x11] * 32), bytes([0x22] * 32)
    pub_a, pub_b = phase1_derive_public(seed_a), phase1_derive_public(seed_b)
    msg = b"kernel-lane-envelope"
    sig = phase1_sig(pub_a, msg)
    for name, pub, tags, env in [("own-key", pub_a, ["safe"], []),
                                 ("own-key", pub_a, ["drift-detected"], []),
                                 ("own-key", pub_a, ["drift-detected"], ["ASOLARIA_VIRUS_SCANNER"]),
                                 ("other-key", pub_b, ["safe"], [])]:
        sv, dc, ar, ad, reason = gate_envelope(msg, sig, pub, "ed25519", tags, env)
        out.append(f"SIGNGATE|signer=seed11|verify_with={name}|tags={'.'.join(tags) or '-'}"
                   f"|envvars={'.'.join(env) or '-'}|sig_valid={b01(sv)}|deny_clean={b01(dc)}"
                   f"|allow_rescued={b01(ar)}|admitted={b01(ad)}|reason={reason}")

    body = ("HOST8KERNEL|version={}|anchor_pid={}|server_libs=5|json=0\n".format(
        hbp_escape(KERNEL_VERSION.decode()), hbp_escape(FEDERATION_ANCHOR_PID.decode())))
    for b in [body, ""]:
        kver, kanchor, up = parse_health(b)
        out.append(f"HEALTH|body_hex={hexs(b.encode()) or '-'}|kver={kver}|kanchor={kanchor}"
                   f"|kernel_up={b01(up)}")

    # main.rs:363 splits the body with Rust `str::lines`; values are hex (they hold line breaks).
    for b in ["HOST8KERNEL|version=a\r\nHOST8KERNEL|anchor_pid=b\r\n",
              "HOST8KERNEL|version=a\r",
              "HOST8KERNEL|version=a\rHOST8KERNEL|anchor_pid=b",
              "HOST8KERNEL|version=\x0b",
              "\x0bHOST8KERNEL|version=v",
              "HOST8KERNEL|version=a\x85b c\x1c|anchor_pid=\x0c",
              "x\nHOST8KERNEL|version=v\n\nHOST8KERNEL|version=w\r\r\n"]:
        kver, kanchor, up = parse_health(b)
        out.append(f"HEALTHSPLIT|body_hex={hexs(b.encode())}|kver_hex={hexs(kver.encode())}"
                   f"|kanchor_hex={hexs(kanchor.encode())}|kernel_up={b01(up)}")
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------- receipt claims
def check_receipts():
    _, facts = boot_rows(qemu_pci(), receipt_clock())
    p60, _ = receipt_row("ACER-DEVICE-TIME-60D-BOOT-PROOF-2026-07-08.hbp", "BOOTPID")
    proj, _ = receipt_row("ACER-DEVICE-TIME-60D-BOOT-PROOF-2026-07-08.hbp", "BOOTPROJ")
    drv, _ = receipt_row("ACER-DEVICE-TIME-60D-BOOT-PROOF-2026-07-08.hbp", "BOOTDRIVER")
    old, _ = receipt_row("ACER-DEVICE-PID-MINT-BOOT-PROOF-2026-07-08.hbp", "BOOTPID")
    vox, _ = receipt_row("ACER-DEVICE-VOXEL-20260708.hbp", "ACERVOXEL")
    gate = [f for k, f, _ in receipt_rows("ACER-KERNEL-GREEN-HARNESS-2026-07-07.hbp")
            if k == "GATE" and "fingerprint" in f][0]
    dd = facts["device_digest"]
    checks = [
        ("device_pid", p60["device_pid"], hexs(dd[:8])),
        ("device_pid_full", p60["device_pid_full"], hexs(dd)),
        ("hw_tuple_pid_full", p60["hw_tuple_pid_full"], hexs(facts["hw_digest"])),
        ("coord_prefix", p60["coord_prefix"], ".".join(str(g) for g in facts["coord"][:6])),
        ("rst_vmd", p60["rst_vmd"], b01(facts["rst_vmd"])),
        ("storage", p60["storage"], b01(facts["storage"])),
        ("boot_pid", proj["boot_pid"], hexs(facts["boot_pid"])),
        ("bootproj device_pid", proj["device_pid"], hexs(dd[:8])),
        ("bootdriver boot_pid", drv["boot_pid"], hexs(facts["boot_pid"])),
        ("bootdriver status_on_q35", drv["status_on_q35"],
         "GATED_MATCH" if facts["rst_vmd"] else "NOT_APPLICABLE"),
        ("07-08 mint device_pid_full (raw tuple formula)", old["device_pid_full"],
         hexs(facts["hw_digest"])),
        ("07-08 mint hw_devices", old["hw_devices"], str(facts["count"])),
        ("voxel bh_coord", vox["bh_coord"], ".".join(str(g) for g in facts["coord"])),
        ("voxel coord_sha = sha256(bh_coord string)", vox["coord_sha"],
         hexs(sha256(vox["bh_coord"].encode()))),
        ("green-harness fingerprint", gate["fingerprint"], "0x%016x" % sys_pid_current()),
    ]
    bad = [c for c in checks if c[1] != c[2]]
    for name, want, got in checks:
        print(f"RECEIPT|{name}|receipt={want}|computed={got}|{'ok' if want == got else 'DIFF'}")
    return not bad


# ---------------------------------------------------------------- upstream-lines blocks
def blocks():
    found = []
    for path in sorted(list((ROOT / "src").rglob("*.rs")) + [ROOT / "core/src/lib.rs"]):
        lines = path.read_text().split("\n")
        i = 0
        while i < len(lines):
            s = lines[i].strip()
            if s.startswith("// upstream-lines ") and s != "// upstream-lines-end":
                label = s[len("// upstream-lines "):]
                j = i + 1
                while lines[j].strip() != "// upstream-lines-end":
                    j += 1
                found.append((path.relative_to(ROOT), label, "\n".join(lines[i + 1:j]) + "\n"))
                i = j
            i += 1
    return found


def check_blocks(upstream):
    recorded = {}
    for line in EXTRACTS.read_text().splitlines():
        digest, label = line.split("  ", 1)
        recorded[label] = digest
    ok = True
    seen = set()
    for path, label, text in blocks():
        digest = hashlib.sha256(text.encode()).hexdigest()
        seen.add(label)
        status = "ok" if recorded.get(label) == digest else "DIFF"
        repo, loc = label.split(" ", 1)
        if repo in upstream:
            rel, rng = loc.rsplit(":", 1)
            a, b = map(int, rng.split("-"))
            up = (pathlib.Path(upstream[repo]) / rel).read_text().split("\n")[a - 1:b]
            if "\n".join(up) + "\n" != text:
                status = "DIFF-UPSTREAM"
            else:
                status += "+upstream"
        ok &= status.startswith("ok")
        print(f"EXTRACT|{path}|{label}|sha256={digest}|{status}")
    missing = set(recorded) - seen
    for label in sorted(missing):
        print(f"EXTRACT|missing|{label}")
    return ok and not missing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--upstream", action="append", default=[],
                    help="repo@commit=<checkout dir> for direct block comparison")
    a = ap.parse_args()
    text = transcript()
    if a.write:
        FIXTURE.write_text(text)
        print(f"wrote {FIXTURE.relative_to(ROOT)} ({len(text.splitlines())} rows)")
        return 0
    if a.check:
        upstream = dict(u.split("=", 1) for u in a.upstream)
        good = check_receipts()
        good &= check_blocks(upstream)
        same = FIXTURE.read_text() == text
        print(f"FIXTURE|{FIXTURE.relative_to(ROOT)}|rows={len(text.splitlines())}"
              f"|{'ok' if same else 'DIFF'}")
        good &= same
        print("REFEREE|" + ("PASS" if good else "FAIL"))
        return 0 if good else 1
    sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
