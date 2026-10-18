//! "To un-generate" (the-colour-qr README.md:51-60). Plane extraction, `atob`, the index and
//! body split and reassembly follow the reader in index.html:10228-10289. The QR decode is
//! [`Reader::Integer`] by default: `qr-read-int`, the integer-only port of the page's own jsQR
//! (owner decision 2026-10-17). [`Reader::RqrrSecondary`], the third-party `rqrr` crate with
//! floating-point geometry, exists only with the `rqrr-secondary` feature and is never the
//! default.

use crate::png_io::{decode_png, RgbaImage};
use crate::{sha256_hex, Error, INDEX_BYTES, PLANES};
use std::collections::BTreeMap;

/// `planeData(img, ch)` (index.html:10230-10235): channel `ch` of every RGBA pixel, taken
/// alone. README.md:53 "Do not convert to grey".
pub fn plane(img: &RgbaImage, ch: usize) -> Vec<u8> {
    img.data.iter().skip(ch).step_by(4).copied().collect()
}

/// Which QR decoder reads the planes.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Reader {
    /// The default: `qr-read-int`, the page's jsQR (index.html:125-10226) in integer Rust,
    /// called as index.html:10242 calls jsQR.
    #[default]
    Integer,
    /// The labelled secondary, built only with the `rqrr-secondary` feature: the third-party
    /// `rqrr` 0.10.1 crate, which computes capstone matching and perspective geometry in
    /// double-precision floating point (README "Floating point"). Not the owner's decoder and
    /// never the default.
    #[cfg(feature = "rqrr-secondary")]
    RqrrSecondary,
}

impl Reader {
    /// The name the CLI prints for this reader.
    pub fn label(&self) -> &'static str {
        match self {
            Reader::Integer => "qr-read-int",
            #[cfg(feature = "rqrr-secondary")]
            Reader::RqrrSecondary => "rqrr-0.10.1-secondary-float-geometry",
        }
    }
}

/// The QR read of one plane with the default [`Reader::Integer`]: the text jsQR's
/// `r.data` holds (index.html:10242, 10245), as UTF-8 bytes. A symbol whose Reed-Solomon
/// check fails gives no result, so it is never read (README.md:59-60).
pub fn read_plane(width: usize, height: usize, plane: &[u8]) -> Option<Vec<u8>> {
    read_plane_with(Reader::Integer, width, height, plane)
}

/// The QR read of one plane with the given reader.
pub fn read_plane_with(
    reader: Reader,
    width: usize,
    height: usize,
    plane: &[u8],
) -> Option<Vec<u8>> {
    match reader {
        Reader::Integer => qr_read_int::read(width, height, plane).map(|c| c.text.into_bytes()),
        #[cfg(feature = "rqrr-secondary")]
        Reader::RqrrSecondary => {
            rqrr_scan(width, height, plane, false).or_else(|| rqrr_scan(width, height, plane, true))
        }
    }
}

/// Secondary only: rqrr on the plane as it is, then inverted, in the order of
/// `inversionAttempts: "attemptBoth"` (index.html:494-500); the first located grid that decodes
/// is the result. rqrr returns the segments' raw bytes, not jsQR's text.
#[cfg(feature = "rqrr-secondary")]
fn rqrr_scan(width: usize, height: usize, plane: &[u8], inverted: bool) -> Option<Vec<u8>> {
    let mut img = rqrr::PreparedImage::prepare_from_greyscale(width, height, |x, y| {
        let v = plane[y * width + x];
        if inverted {
            255 - v
        } else {
            v
        }
    });
    img.detect_grids().into_iter().find_map(|grid| {
        let mut out = Vec::new();
        grid.decode_to(&mut out).ok().map(|_| out)
    })
}

/// `atob` as `b64` (index.html:10236-10237) calls it: the WHATWG forgiving-base64 decode.
/// ASCII whitespace is removed; at a length that is a multiple of 4, one or two trailing `=`
/// are removed; a length of 1 mod 4 or any byte outside `A-Z a-z 0-9 + /` is a failure;
/// leftover bits after the last whole byte are discarded.
pub fn atob(text: &[u8]) -> Option<Vec<u8>> {
    let mut s: Vec<u8> = text
        .iter()
        .copied()
        .filter(|b| !matches!(b, b'\t' | b'\n' | 0x0c | b'\r' | b' '))
        .collect();
    if s.len() % 4 == 0 {
        if s.ends_with(b"==") {
            s.truncate(s.len() - 2);
        } else if s.ends_with(b"=") {
            s.truncate(s.len() - 1);
        }
    }
    if s.len() % 4 == 1 {
        return None;
    }
    let mut out = Vec::with_capacity(s.len() / 4 * 3 + 2);
    let mut buffer: u32 = 0;
    let mut bits: u32 = 0;
    for c in s {
        let v = match c {
            b'A'..=b'Z' => c - b'A',
            b'a'..=b'z' => c - b'a' + 26,
            b'0'..=b'9' => c - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            _ => return None,
        };
        buffer = ((buffer << 6) | u32::from(v)) & 0x3fff;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push(u8::try_from((buffer >> bits) & 0xff).unwrap_or(0));
        }
    }
    Some(out)
}

/// What one plane gave, with the label text index.html:10244-10249 shows for it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PlaneRead {
    /// "no symbol in this plane": no symbol located or none decoded (a filler plane reads so).
    NoSymbol,
    /// "symbol found, not base64".
    NotBase64,
    /// "symbol too short": fewer than 5 decoded bytes.
    TooShort,
    /// "chunk N", with the body length shown beside it.
    Chunk { index: u32, body_bytes: usize },
}

impl PlaneRead {
    /// The page's label for this read.
    pub fn label(&self) -> String {
        match self {
            PlaneRead::NoSymbol => "no symbol in this plane".into(),
            PlaneRead::NotBase64 => "symbol found, not base64".into(),
            PlaneRead::TooShort => "symbol too short".into(),
            PlaneRead::Chunk { index, .. } => format!("chunk {index}"),
        }
    }
}

/// The page's `chunks` map (index.html:10228): chunk index to body.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Chunks {
    pub map: BTreeMap<u32, Vec<u8>>,
}

/// The save handler's result (index.html:10265-10273).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Reassembled {
    pub bytes: Vec<u8>,
    pub chunks: usize,
    pub sha256: String,
}

impl Chunks {
    pub fn new() -> Self {
        Self::default()
    }

    /// `render`'s `m` (index.html:10259): how many indices from 0 upward are all held.
    pub fn contiguous_from_zero(&self) -> u64 {
        let mut m: u64 = 0;
        while u32::try_from(m).is_ok_and(|i| self.map.contains_key(&i)) {
            m += 1;
        }
        m
    }

    /// `render`'s `max + 1` (index.html:10256): the highest index held plus one, 1 when empty.
    pub fn span(&self) -> u64 {
        self.map.keys().next_back().map_or(1, |&k| u64::from(k) + 1)
    }

    /// The save handler (index.html:10265-10271): bodies in ascending index order,
    /// concatenated, and their sha256.
    pub fn reassemble(&self) -> Reassembled {
        let bytes: Vec<u8> = self.map.values().flatten().copied().collect();
        let sha256 = sha256_hex(&bytes);
        Reassembled {
            bytes,
            chunks: self.map.len(),
            sha256,
        }
    }
}

/// `take(img)` (index.html:10238-10253): each plane read alone; a decoded plane enters the
/// map under its index (a later read of the same index replaces the earlier one, as `Map.set`
/// does); a plane that fails is dropped. README.md:57 names the index a little-endian uint32;
/// index.html:10247 builds it with JS bitwise OR, which equals that uint32 below 2^31 and is
/// the negative int32 from 2^31 up (README "The Rust reader next to the page").
pub fn take(chunks: &mut Chunks, img: &RgbaImage) -> [PlaneRead; PLANES] {
    take_with(Reader::Integer, chunks, img)
}

/// [`take`] with the given reader.
pub fn take_with(reader: Reader, chunks: &mut Chunks, img: &RgbaImage) -> [PlaneRead; PLANES] {
    let mut reads = [PlaneRead::NoSymbol; PLANES];
    for (ch, read) in reads.iter_mut().enumerate() {
        let Some(text) = read_plane_with(reader, img.width, img.height, &plane(img, ch)) else {
            continue;
        };
        let Some(d) = atob(&text) else {
            *read = PlaneRead::NotBase64;
            continue;
        };
        if d.len() < INDEX_BYTES + 1 {
            *read = PlaneRead::TooShort;
            continue;
        }
        let index = u32::from_le_bytes([d[0], d[1], d[2], d[3]]);
        let body = d[INDEX_BYTES..].to_vec();
        *read = PlaneRead::Chunk {
            index,
            body_bytes: body.len(),
        };
        chunks.map.insert(index, body);
    }
    reads
}

/// The whole "To un-generate" direction over PNG files with the default reader: every image
/// through [`take`] in the order given, then [`Chunks::reassemble`].
pub fn ungenerate(pngs: &[&[u8]]) -> Result<(Vec<[PlaneRead; PLANES]>, Chunks), Error> {
    ungenerate_with(Reader::Integer, pngs)
}

/// [`ungenerate`] with the given reader.
pub fn ungenerate_with(
    reader: Reader,
    pngs: &[&[u8]],
) -> Result<(Vec<[PlaneRead; PLANES]>, Chunks), Error> {
    let mut chunks = Chunks::new();
    let mut reads = Vec::with_capacity(pngs.len());
    for png in pngs {
        let img = decode_png(png)?;
        reads.push(take_with(reader, &mut chunks, &img));
    }
    Ok((reads, chunks))
}
