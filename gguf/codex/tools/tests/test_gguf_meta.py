#!/usr/bin/env python3
"""Integer-only checks of gguf_meta.py (stdlib only). Usage: python3 -I tests/test_gguf_meta.py

1. repr-vectors.txt: 4,104 IEEE-754 bit patterns (3,327 binary64 "b64", 777 binary32 "b32") with
   the text CPython 3.13.16 repr() gave for each; binary_repr() must give the same text.
2. float-kv.gguf, built below from integers (1,701 B, sha256 c24c7594...): the tool's output must
   equal float-kv.expected.txt, the output of the float version of gguf_meta.py (sha256 289dc0b4...).
The expected texts were written before the integer version ran on them; they are data, not
regenerated here.
"""
import hashlib
import importlib.util
import os
import struct
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = os.path.join(os.path.dirname(HERE), "gguf_meta.py")
FIXTURE_SHA256 = "c24c75949d429ac78a973f33f8ac0715b061b486b7ad5cd519bde9371d058630"
B32 = [0x3dcccccd, 0x3f800000, 0x80000000, 0x7f800000, 0xff800000, 0x7fc00000, 0x00000001, 0x7f7fffff, 0x4b800001, 0x3eaaaaab]
B64 = [0x3fb999999999999a, 0x4341c37937e08000, 0x3ee4f8b588e368f1, 0x0000000000000001, 0xbff8000000000000,
       0x44b52d02c7e14af6, 0x7fefffffffffffff, 0x8000000000000000, 0x3ff0000000000000, 0x4415af1d78b58c40]


def s(x):
    b = x.encode()
    return struct.pack("<Q", len(b)) + b


def kv(k, t, p):
    return s(k) + struct.pack("<I", t) + p


def arr(et, items):
    return struct.pack("<IQ", et, len(items)) + b"".join(items)


def build_fixture():
    kvs = [
        kv("general.architecture", 8, s("float-kv-fixture")),
        kv("t.u8", 0, struct.pack("<B", 200)), kv("t.i8", 1, struct.pack("<b", -5)),
        kv("t.u16", 2, struct.pack("<H", 65535)), kv("t.i16", 3, struct.pack("<h", -300)),
        kv("t.u32", 4, struct.pack("<I", 4000000000)), kv("t.i32", 5, struct.pack("<i", -7)),
        kv("t.bool", 7, struct.pack("<B", 1)), kv("t.u64", 10, struct.pack("<Q", 1 << 63)),
        kv("t.i64", 11, struct.pack("<q", -(1 << 40))),
    ]
    for i, b in enumerate(B32):
        kvs.append(kv("t.binary32.%d" % i, 6, struct.pack("<I", b)))
    for i, b in enumerate(B64):
        kvs.append(kv("t.binary64.%d" % i, 12, struct.pack("<Q", b)))
    kvs.append(kv("t.arr.binary32", 9, arr(6, [struct.pack("<I", b) for b in B32])))
    kvs.append(kv("t.arr.binary64", 9, arr(12, [struct.pack("<Q", b) for b in B64])))
    kvs.append(kv("t.arr.binary64.long", 9, arr(12, [struct.pack("<Q", 0x3fb999999999999a + i) for i in range(40)])))
    kvs.append(kv("t.arr.nested", 9, arr(9, [arr(12, [struct.pack("<Q", b) for b in B64[:3]]),
                                               arr(6, [struct.pack("<I", b) for b in B32[:3]])])))
    kvs.append(kv("t.arr.str", 9, arr(8, [s("a"), s("b|c")])))
    tensors = [(s("w.binary32") + struct.pack("<I", 2) + struct.pack("<QQ", 2, 3) + struct.pack("<IQ", 0, 0)),
               (s("w.i8") + struct.pack("<I", 1) + struct.pack("<Q", 5) + struct.pack("<IQ", 24, 32))]
    head = struct.pack("<IIQQ", 0x46554747, 3, len(tensors), len(kvs)) + b"".join(kvs) + b"".join(tensors)
    head += b"\0" * ((-len(head)) % 32)
    return head + struct.pack("<6I", *B32[:6]) + b"\0" * 8 + bytes([1, 2, 3, 4, 5])


def main():
    spec = importlib.util.spec_from_file_location("gguf_meta", TOOL)
    gm = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gm)
    equal = different = 0
    with open(os.path.join(HERE, "repr-vectors.txt"), encoding="utf-8") as f:
        for line in f:
            kind, hx, want = line.split()
            got = gm.binary_repr(int(hx, 16), *{"b64": (11, 52), "b32": (8, 23)}[kind])
            if got == want:
                equal += 1
            else:
                different += 1
                print(f"DIFF {kind} {hx} want {want} got {got}")
    print(f"VECTORS|equal={equal}|different={different}|json=0")
    fixture = build_fixture()
    fixture_ok = hashlib.sha256(fixture).hexdigest() == FIXTURE_SHA256
    with tempfile.TemporaryDirectory() as tmp:
        with open(os.path.join(tmp, "float-kv.gguf"), "wb") as f:
            f.write(fixture)
        out = subprocess.run([sys.executable, "-I", TOOL, "float-kv.gguf"], cwd=tmp, capture_output=True, check=True).stdout
    with open(os.path.join(HERE, "float-kv.expected.txt"), "rb") as f:
        output_ok = out == f.read()
    print(f"FIXTURE|bytes={len(fixture)}|sha256_ok={int(fixture_ok)}|output_equal={int(output_ok)}|json=0")
    ok = different == 0 and equal == 4104 and fixture_ok and output_ok
    print(f"VERDICT|pass={int(ok)}|json=0")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
