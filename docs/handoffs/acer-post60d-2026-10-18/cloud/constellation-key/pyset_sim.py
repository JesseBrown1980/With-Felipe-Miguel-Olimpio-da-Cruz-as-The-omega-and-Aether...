"""CPython bytes hash (PYTHONHASHSEED -> secret -> SipHash-1-3 / 2-4) and set iteration order.

Library + self-check. usage: python3 -I pyset_sim.py EMISSION   (self-check against this interpreter
is done by check_sim.sh, which runs this interpreter under fixed PYTHONHASHSEED values)
"""
M64 = (1 << 64) - 1


def secret(seed):
    """Python/bootstrap_hash.c: seed 0 -> zero secret; else lcg_urandom over 24 bytes."""
    if seed == 0:
        b = bytes(24)
    else:
        x, out = seed & 0xFFFFFFFF, bytearray()
        for _ in range(24):
            x = (x * 214013 + 2531011) & 0xFFFFFFFF
            out.append((x >> 16) & 0xFF)
        b = bytes(out)
    return int.from_bytes(b[0:8], "little"), int.from_bytes(b[8:16], "little")


def _rotl(x, b):
    return ((x << b) | (x >> (64 - b))) & M64


def _round(v0, v1, v2, v3):
    v0 = (v0 + v1) & M64; v2 = (v2 + v3) & M64
    v1 = _rotl(v1, 13) ^ v0; v3 = _rotl(v3, 16) ^ v2
    v0 = _rotl(v0, 32)
    v2 = (v2 + v1) & M64; v0 = (v0 + v3) & M64
    v1 = _rotl(v1, 17) ^ v2; v3 = _rotl(v3, 21) ^ v0
    v2 = _rotl(v2, 32)
    return v0, v1, v2, v3


def siphash(k0, k1, data, c_rounds, d_rounds):
    v0 = k0 ^ 0x736f6d6570736575
    v1 = k1 ^ 0x646f72616e646f6d
    v2 = k0 ^ 0x6c7967656e657261
    v3 = k1 ^ 0x7465646279746573
    n = len(data)
    nb = n // 8
    for i in range(nb):
        mi = int.from_bytes(data[8 * i:8 * i + 8], "little")
        v3 ^= mi
        for _ in range(c_rounds):
            v0, v1, v2, v3 = _round(v0, v1, v2, v3)
        v0 ^= mi
    b = ((n & 0xFF) << 56) | int.from_bytes(data[8 * nb:], "little")
    v3 ^= b
    for _ in range(c_rounds):
        v0, v1, v2, v3 = _round(v0, v1, v2, v3)
    v0 ^= b
    v2 ^= 0xFF
    for _ in range(d_rounds):
        v0, v1, v2, v3 = _round(v0, v1, v2, v3)
    return v0 ^ v1 ^ v2 ^ v3


def py_hash_bytes(seed, data, alg="siphash13"):
    """Return the unsigned 64-bit pattern of hash(bytes) (Py_hash_t -1 mapped to -2)."""
    if len(data) == 0:
        return 0
    k0, k1 = secret(seed)
    h = siphash(k0, k1, data, 1, 3) if alg == "siphash13" else siphash(k0, k1, data, 2, 4)
    if h == M64:          # -1 -> -2
        h = M64 - 1
    return h


def set_order(items, hashes):
    """Objects/setobject.c (3.7+): set_add_entry with LINEAR_PROBES 9, PERTURB_SHIFT 5, growth
    when fill*5 >= mask*3 to used*4 (used <= 50000), resize re-inserting in old slot order."""
    LP = 9
    mask = 7
    table = [None] * 8
    fill = used = 0

    def insert_clean(tab, msk, idx, h):
        perturb = h
        i = h & msk
        while True:
            if tab[i] is None:
                tab[i] = idx
                return
            if i + LP <= msk:
                for j in range(1, LP + 1):
                    if tab[i + j] is None:
                        tab[i + j] = idx
                        return
            perturb >>= 5
            i = (i * 5 + 1 + perturb) & msk

    for idx, h in enumerate(hashes):
        # items are distinct, so set_add_entry reduces to insert at first free slot on the probe path
        perturb = h
        i = h & mask
        placed = False
        while not placed:
            probes = LP if i + LP <= mask else 0
            for j in range(probes + 1):
                if table[i + j] is None:
                    table[i + j] = idx
                    placed = True
                    break
            if not placed:
                perturb >>= 5
                i = (i * 5 + 1 + perturb) & mask
        fill += 1
        used += 1
        if fill * 5 >= mask * 3:
            minused = used * 4 if used <= 50000 else used * 2
            newsize = 8
            while newsize <= minused:
                newsize <<= 1
            newtab = [None] * newsize
            for k in table:
                if k is not None:
                    insert_clean(newtab, newsize - 1, k, hashes[k])
            table, mask = newtab, newsize - 1
    return [k for k in table if k is not None], mask
