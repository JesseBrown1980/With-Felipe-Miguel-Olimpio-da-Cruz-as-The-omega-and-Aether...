// ---------------------------------------------------------------- sha256 (no_std, no-alloc)
/// Minimal fixed-buffer sha256. Input is bounded by `TUPLE_CAP`; the padded message fits
/// in a 640-byte stack buffer, so no heap is used (the boot heap is a 16 KiB bump arena).
pub(crate) fn sha256(data: &[u8]) -> [u8; 32] {
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    let mut msg = [0u8; 640];
    let n = if data.len() > TUPLE_CAP {
        TUPLE_CAP
    } else {
        data.len()
    };
    msg[..n].copy_from_slice(&data[..n]);
    msg[n] = 0x80;
    let mut total = n + 1;
    while total % 64 != 56 {
        total += 1;
    }
    let bit_len = (n as u64).wrapping_mul(8);
    msg[total..total + 8].copy_from_slice(&bit_len.to_be_bytes());
    total += 8;

    let mut off = 0;
    while off < total {
        let mut w = [0u32; 64];
        for (i, word) in w.iter_mut().enumerate().take(16) {
            let j = off + i * 4;
            *word = u32::from_be_bytes([msg[j], msg[j + 1], msg[j + 2], msg[j + 3]]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh) =
            (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let t1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let t2 = s0.wrapping_add(maj);
            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(t1);
            d = c;
            c = b;
            b = a;
            a = t1.wrapping_add(t2);
        }
        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
        off += 64;
    }
    let mut out = [0u8; 32];
    for (i, word) in h.iter().enumerate() {
        out[i * 4..i * 4 + 4].copy_from_slice(&word.to_be_bytes());
    }
    out
}

/// Project the hardware tuple into a 60D Brown-Hilbert coordinate: 60 × 10-bit glyphs,
/// counter-salted sha256 — the same 60-tuple frame the kernel's BEHCS-1024 PIDs use
/// (`envelope`/`spawn_gate`/`syscall`/`hookwall`). Makes `dims=60` a real coordinate. No alloc.
fn project_60d(tuple: &[u8]) -> [u16; 60] {
    let mut sel = [0u16; 60];
    let mut buf = [0u8; TUPLE_CAP + 4];
    let n = if tuple.len() > TUPLE_CAP {
        TUPLE_CAP
    } else {
        tuple.len()
    };
    buf[..n].copy_from_slice(&tuple[..n]);
    let (mut i, mut counter) = (0usize, 0u32);
    while i < 60 {
        buf[n..n + 4].copy_from_slice(&counter.to_be_bytes());
        let h = sha256(&buf[..n + 4]);
        let mut j = 0;
        while j + 1 < 32 && i < 60 {
            sel[i] = (((h[j] as u16) << 8) | h[j + 1] as u16) & 0x03FF;
            i += 1;
            j += 2;
        }
        counter += 1;
    }
    sel
}
