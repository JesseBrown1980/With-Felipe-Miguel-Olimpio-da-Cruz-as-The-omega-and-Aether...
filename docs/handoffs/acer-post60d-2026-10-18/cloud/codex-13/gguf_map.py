#!/usr/bin/env python3
"""gguf_map.py - integer-only GGUF v3 layout reader (stdlib). Read-only on its input.

usage:
  gguf_map.py map GGUF                 -> one row per header field / KV / tensor-info / tensor-data range
  gguf_map.py tensors GGUF             -> one row per tensor: name, elements, type, abs offset, sha256
  gguf_map.py extract GGUF TENSOR OUT  -> write that tensor's bytes to OUT (OUT must not exist)
  gguf_map.py where GGUF OFFSET        -> which region holds byte OFFSET (0-based)
"""
import hashlib
import os
import struct
import sys

TSIZE = {0: 4, 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 4, 7: 1, 10: 8, 11: 8, 12: 8}  # GGUF value types
GGML_ELEM_BYTES = {24: 1, 25: 2, 26: 4, 27: 8, 0: 4, 1: 2}  # I8, I16, I32, I64, F32, F16


def parse(buf):
    regions = []  # (start, end, label)
    p = 0

    def take(n, label):
        nonlocal p
        regions.append((p, p + n, label))
        b = buf[p:p + n]
        p += n
        return b

    def rd_str(label):
        n = struct.unpack("<Q", take(8, label + ".len"))[0]
        return take(n, label + ".bytes").decode("utf-8", "replace")

    def rd_val(t, label):
        if t == 8:
            return rd_str(label)
        if t == 9:
            et = struct.unpack("<I", take(4, label + ".arr_type"))[0]
            n = struct.unpack("<Q", take(8, label + ".arr_len"))[0]
            return [rd_val(et, f"{label}[{i}]") for i in range(n)]
        sz = TSIZE[t]
        raw = take(sz, label)
        fmt = {1: "<B", 0: "<B", 2: "<H", 3: "<h", 4: "<I", 5: "<i", 6: "<f", 7: "<B", 10: "<Q", 11: "<q", 12: "<d"}[t]
        return struct.unpack(fmt, raw)[0] if t not in (6, 12) else raw.hex()

    magic = take(4, "header.magic")
    ver = struct.unpack("<I", take(4, "header.version"))[0]
    nt = struct.unpack("<Q", take(8, "header.tensor_count"))[0]
    nkv = struct.unpack("<Q", take(8, "header.kv_count"))[0]
    kvs = []
    for i in range(nkv):
        k = rd_str(f"kv[{i}].key")
        t = struct.unpack("<I", take(4, f"kv[{i}]({k}).type"))[0]
        v = rd_val(t, f"kv[{i}]({k}).value")
        kvs.append((k, t, v))
    infos = []
    for i in range(nt):
        name = rd_str(f"tinfo[{i}].name")
        nd = struct.unpack("<I", take(4, f"tinfo[{i}]({name}).n_dims"))[0]
        dims = [struct.unpack("<Q", take(8, f"tinfo[{i}]({name}).dim[{d}]"))[0] for d in range(nd)]
        ty = struct.unpack("<I", take(4, f"tinfo[{i}]({name}).type"))[0]
        off = struct.unpack("<Q", take(8, f"tinfo[{i}]({name}).offset"))[0]
        infos.append((name, dims, ty, off))
    align = 32
    for k, t, v in kvs:
        if k == "general.alignment":
            align = v
    data0 = p + ((-p) % align)
    if data0 > p:
        regions.append((p, data0, "header.pad_to_data"))
    tens = []
    for name, dims, ty, off in infos:
        n = 1
        for d in dims:
            n *= d
        nb = n * GGML_ELEM_BYTES[ty]
        tens.append((name, dims, ty, data0 + off, nb))
    tens_sorted = sorted(tens, key=lambda x: x[3])
    cur = data0
    for name, dims, ty, a, nb in tens_sorted:
        if a > cur:
            regions.append((cur, a, f"data.pad_before({name})"))
        regions.append((a, a + nb, f"tensor({name})"))
        cur = a + nb
    if cur < len(buf):
        regions.append((cur, len(buf), "data.trailing"))
    return dict(magic=magic, version=ver, tensor_count=nt, kv_count=nkv, kvs=kvs, tensors=tens,
                regions=regions, data0=data0, align=align, size=len(buf))


def main():
    cmd, path = sys.argv[1], sys.argv[2]
    buf = open(path, "rb").read()
    g = parse(buf)
    if cmd == "map":
        print(f"FILE|bytes={g['size']}|sha256={hashlib.sha256(buf).hexdigest()}|magic={g['magic']!r}|version={g['version']}"
              f"|tensors={g['tensor_count']}|kv={g['kv_count']}|data_start={g['data0']}|align={g['align']}")
        for k, t, v in g["kvs"]:
            print(f"KV|{k}|type={t}|value={v}")
        tb = sum(nb for *_, nb in g["tensors"])
        print(f"TENSOR_BYTES|{tb}|non_tensor_bytes={g['size'] - tb}")
    elif cmd == "tensors":
        for name, dims, ty, a, nb in g["tensors"]:
            print(f"T|{name}|dims={'x'.join(map(str, dims))}|type={ty}|abs_offset={a}|bytes={nb}"
                  f"|sha256={hashlib.sha256(buf[a:a + nb]).hexdigest()}")
    elif cmd == "extract":
        name, out = sys.argv[3], sys.argv[4]
        if os.path.exists(out):
            sys.exit(f"refusing: {out} exists")
        for tn, dims, ty, a, nb in g["tensors"]:
            if tn == name:
                with open(out, "xb") as f:
                    f.write(buf[a:a + nb])
                print(f"EXTRACT|{name}|abs_offset={a}|bytes={nb}|sha256={hashlib.sha256(buf[a:a + nb]).hexdigest()}|out={out}")
                return
        sys.exit(f"no tensor {name}")
    elif cmd == "where":
        o = int(sys.argv[3])
        for a, b, label in g["regions"]:
            if a <= o < b:
                print(f"WHERE|offset={o}|region={label}|region_start={a}|region_end={b}|index_in_region={o - a}")
                return
        print(f"WHERE|offset={o}|region=beyond_end")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
