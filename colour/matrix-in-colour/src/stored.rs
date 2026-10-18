//! A second read of the frames that shares no code with the `png` crate. Every receipt says
//! `format=PNG RGB8 truecolour|compression=DEFLATE stored (no lossy step)` and README.md:24-25
//! says "CRC32 per chunk, Adler-32 over the zlib stream, DEFLATE *stored* blocks". This reads
//! that format and nothing else: it checks every chunk CRC, the zlib header, each stored block's
//! LEN/NLEN and the Adler-32, and refuses compressed blocks, interlace and row filters other
//! than None.

use crate::Error;

const SIGNATURE: [u8; 8] = [137, 80, 78, 71, 13, 10, 26, 10];

const CRC_TABLE: [u32; 256] = {
    let mut table = [0u32; 256];
    let mut n = 0;
    while n < 256 {
        let mut c = n as u32;
        let mut k = 0;
        while k < 8 {
            c = if c & 1 == 1 {
                0xEDB8_8320 ^ (c >> 1)
            } else {
                c >> 1
            };
            k += 1;
        }
        table[n] = c;
        n += 1;
    }
    table
};

/// The PNG chunk CRC (ISO 3309, reflected polynomial 0xEDB88320).
pub fn crc32(bytes: &[u8]) -> u32 {
    !bytes.iter().fold(!0u32, |c, &b| {
        CRC_TABLE[usize::from((c as u8) ^ b)] ^ (c >> 8)
    })
}

/// RFC 1950 Adler-32.
pub fn adler32(bytes: &[u8]) -> u32 {
    let (mut a, mut b) = (1u32, 0u32);
    for chunk in bytes.chunks(5552) {
        for &x in chunk {
            a += u32::from(x);
            b += a;
        }
        a %= 65_521;
        b %= 65_521;
    }
    (b << 16) | a
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StoredPng {
    pub width: usize,
    pub height: usize,
    /// Chunk types in file order.
    pub chunks: Vec<String>,
    /// LEN of each stored block, in stream order.
    pub blocks: Vec<u16>,
    /// 8-bit RGB pixels, row-major.
    pub rgb: Vec<u8>,
}

fn bad(what: &str) -> Error {
    Error::Format(what.to_string())
}

fn be32(b: &[u8]) -> u32 {
    u32::from_be_bytes([b[0], b[1], b[2], b[3]])
}

fn take<'a>(bytes: &'a [u8], at: &mut usize, n: usize) -> Result<&'a [u8], Error> {
    let end = at.checked_add(n).ok_or_else(|| bad("length overflow"))?;
    let out = bytes.get(*at..end).ok_or_else(|| bad("truncated"))?;
    *at = end;
    Ok(out)
}

fn usize_of(v: u32) -> Result<usize, Error> {
    usize::try_from(v).map_err(|e| Error::Format(e.to_string()))
}

/// Read an 8-bit RGB, non-interlaced PNG whose zlib stream holds only stored blocks.
pub fn read_stored_png(bytes: &[u8]) -> Result<StoredPng, Error> {
    let mut at = 0;
    if take(bytes, &mut at, 8)? != SIGNATURE {
        return Err(bad("not a PNG signature"));
    }
    let mut chunks = Vec::new();
    let mut idat = Vec::new();
    let mut size = None;
    loop {
        let len = usize_of(be32(take(bytes, &mut at, 4)?))?;
        let typ = take(bytes, &mut at, 4)?;
        let data = take(bytes, &mut at, len)?;
        let crc = be32(take(bytes, &mut at, 4)?);
        let mut covered = typ.to_vec();
        covered.extend_from_slice(data);
        if crc32(&covered) != crc {
            return Err(bad("chunk CRC mismatch"));
        }
        chunks.push(String::from_utf8_lossy(typ).into_owned());
        match typ {
            b"IHDR" => {
                if chunks.len() != 1 || len != 13 {
                    return Err(bad("IHDR is not the first 13-byte chunk"));
                }
                if data[8..] != [8, 2, 0, 0, 0] {
                    return Err(bad("not 8-bit RGB, deflate, filter method 0, no interlace"));
                }
                size = Some((usize_of(be32(&data[0..4]))?, usize_of(be32(&data[4..8]))?));
            }
            b"IDAT" => idat.extend_from_slice(data),
            b"IEND" => break,
            _ => {}
        }
    }
    if at != bytes.len() {
        return Err(bad("bytes after IEND"));
    }
    let (width, height) = size.ok_or_else(|| bad("no IHDR"))?;

    let mut z = 0;
    let head = take(&idat, &mut z, 2)?;
    let (cmf, flg) = (head[0], head[1]);
    if cmf & 15 != 8 || cmf >> 4 > 7 || (u16::from(cmf) * 256 + u16::from(flg)) % 31 != 0 {
        return Err(bad("zlib header"));
    }
    if flg & 0x20 != 0 {
        return Err(bad("zlib preset dictionary"));
    }
    let mut raw = Vec::new();
    let mut blocks = Vec::new();
    loop {
        let h = take(&idat, &mut z, 1)?[0];
        if (h >> 1) & 3 != 0 {
            return Err(bad("a compressed DEFLATE block"));
        }
        let lens = take(&idat, &mut z, 4)?;
        let len = u16::from_le_bytes([lens[0], lens[1]]);
        if !len != u16::from_le_bytes([lens[2], lens[3]]) {
            return Err(bad("stored block NLEN is not !LEN"));
        }
        raw.extend_from_slice(take(&idat, &mut z, usize::from(len))?);
        blocks.push(len);
        if h & 1 == 1 {
            break;
        }
    }
    if be32(take(&idat, &mut z, 4)?) != adler32(&raw) {
        return Err(bad("Adler-32 mismatch"));
    }
    if z != idat.len() {
        return Err(bad("bytes after the zlib stream"));
    }

    let stride = 1 + width * 3;
    if raw.len() != height * stride {
        return Err(bad("raw length is not height * (1 + 3 * width)"));
    }
    let mut rgb = Vec::with_capacity(width * height * 3);
    for row in raw.chunks_exact(stride) {
        if row[0] != 0 {
            return Err(Error::Unsupported(format!("row filter {}", row[0])));
        }
        rgb.extend_from_slice(&row[1..]);
    }
    Ok(StoredPng {
        width,
        height,
        chunks,
        blocks,
        rgb,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn check_values() {
        assert_eq!(crc32(b"123456789"), 0xCBF4_3926);
        assert_eq!(adler32(b"Wikipedia"), 0x11E6_0398);
        assert_eq!(crc32(b"IEND"), 0xAE42_6082);
    }
}
