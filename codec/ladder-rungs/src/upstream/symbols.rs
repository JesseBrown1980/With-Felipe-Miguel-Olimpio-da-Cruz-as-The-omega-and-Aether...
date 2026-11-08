fn to_symbols(bytes: &[u8], width: u32) -> Vec<u16> {
    let mut out = Vec::new();
    let (mut acc, mut n) = (0u32, 0u32);
    let mask = (1u32 << width) - 1;
    for &b in bytes {
        acc = (acc << 8) | b as u32;
        n += 8;
        while n >= width {
            n -= width;
            out.push(((acc >> n) & mask) as u16);
        }
    }
    if n > 0 {
        out.push(((acc << (width - n)) & mask) as u16);
    }
    out
}
fn from_symbols(syms: &[u16], width: u32, orig_len: usize) -> Vec<u8> {
    let mut out = Vec::new();
    let (mut acc, mut n) = (0u32, 0u32);
    for &s in syms {
        acc = (acc << width) | (s as u32 & ((1u32 << width) - 1));
        n += width;
        while n >= 8 {
            n -= 8;
            out.push(((acc >> n) & 0xFF) as u8);
        }
    }
    out.truncate(orig_len);
    out
}
