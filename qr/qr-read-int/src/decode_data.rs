//! `decode(data, version)` (index.html:1075-1162) with `BitStream` (index.html:1173-1221):
//! the segments of the corrected data codewords.
//!
//! Modes as the page handles them: 0 terminator; 1 numeric; 2 alphanumeric; 4 byte; 8 kanji;
//! 7 ECI (recorded as a chunk, the text is not re-decoded). Every other mode indicator —
//! 3 structured append, 5 FNC1 in first position, 9 FNC1 in second position and the rest — is
//! read and skipped with nothing else consumed, and the next 4 bits are read as a mode
//! (index.html:965-968 lists them as comments only). A byte segment's text is its bytes
//! decoded as UTF-8 by `decodeURIComponent`; bytes that are not UTF-8 add no text
//! (index.html:1048-1053). A kanji character's text is `String.fromCharCode` of the page's
//! Shift JIS table, `"\0"` where the table has no entry (index.html:1069).

use crate::shift_jis::SHIFT_JIS;
use crate::tables::ALPHANUMERIC;
use crate::Thrown;

/// One entry of jsQR's `chunks` (index.html:1091-1155).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Chunk {
    Numeric {
        text: String,
    },
    Alphanumeric {
        text: String,
    },
    Byte {
        bytes: Vec<u8>,
        text: String,
    },
    Kanji {
        bytes: Vec<u8>,
        text: String,
    },
    /// `assignmentNumber`; -1 when the designator's first three bits are all 1.
    Eci {
        assignment_number: i32,
    },
}

/// The result of `decode(data, version)`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Decoded {
    pub text: String,
    pub bytes: Vec<u8>,
    pub chunks: Vec<Chunk>,
    pub version: u32,
}

/// `BitStream` (index.html:1173-1221).
struct BitStream<'a> {
    bytes: &'a [u8],
    byte_offset: usize,
    bit_offset: usize,
}

impl BitStream<'_> {
    /// `readBits(numBits)`: throws for fewer than 1, more than 32, or more than available.
    fn read_bits(&mut self, num_bits: usize) -> Result<u32, Thrown> {
        if !(1..=32).contains(&num_bits) || num_bits > self.available() {
            return Err(Thrown);
        }
        let mut num_bits = num_bits;
        let mut result: u64 = 0;
        if self.bit_offset > 0 {
            let bits_left = 8 - self.bit_offset;
            let to_read = num_bits.min(bits_left);
            let bits_to_not_read = bits_left - to_read;
            let mask = (0xffu64 >> (8 - to_read)) << bits_to_not_read;
            result = (u64::from(self.bytes[self.byte_offset]) & mask) >> bits_to_not_read;
            num_bits -= to_read;
            self.bit_offset += to_read;
            if self.bit_offset == 8 {
                self.bit_offset = 0;
                self.byte_offset += 1;
            }
        }
        if num_bits > 0 {
            while num_bits >= 8 {
                result = (result << 8) | u64::from(self.bytes[self.byte_offset]);
                self.byte_offset += 1;
                num_bits -= 8;
            }
            if num_bits > 0 {
                let bits_to_not_read = 8 - num_bits;
                let mask = (0xffu64 >> bits_to_not_read) << bits_to_not_read;
                result = (result << num_bits)
                    | ((u64::from(self.bytes[self.byte_offset]) & mask) >> bits_to_not_read);
                self.bit_offset += num_bits;
            }
        }
        Ok(u32::try_from(result & 0xffff_ffff).unwrap_or(0))
    }

    /// `available()`: bits left.
    fn available(&self) -> usize {
        8 * (self.bytes.len() - self.byte_offset) - self.bit_offset
    }
}

/// `decodeNumeric(stream, size)` (index.html:973-1011).
fn decode_numeric(stream: &mut BitStream, size: usize) -> Result<(Vec<u8>, String), Thrown> {
    let mut length = stream.read_bits([10, 12, 14][size])?;
    let mut digits: Vec<u8> = Vec::new();
    while length >= 3 {
        let num = stream.read_bits(10)?;
        if num >= 1000 {
            return Err(Thrown);
        }
        digits.extend([num / 100, (num / 10) % 10, num % 10].map(digit));
        length -= 3;
    }
    if length == 2 {
        let num = stream.read_bits(7)?;
        if num >= 100 {
            return Err(Thrown);
        }
        digits.extend([num / 10, num % 10].map(digit));
    } else if length == 1 {
        let num = stream.read_bits(4)?;
        if num >= 10 {
            return Err(Thrown);
        }
        digits.push(digit(num));
    }
    let text = String::from_utf8(digits.clone()).map_err(|_| Thrown)?;
    Ok((digits, text))
}

fn digit(d: u32) -> u8 {
    b'0' + u8::try_from(d).unwrap_or(0)
}

/// `AlphanumericCharacterCodes[i]`; an index past 44 is `undefined`, and `.charCodeAt` on it
/// throws (index.html:1028, 1034).
fn alnum(i: u32) -> Result<u8, Thrown> {
    usize::try_from(i)
        .ok()
        .and_then(|i| ALPHANUMERIC.get(i))
        .copied()
        .ok_or(Thrown)
}

/// `decodeAlphanumeric(stream, size)` (index.html:1019-1038).
fn decode_alphanumeric(stream: &mut BitStream, size: usize) -> Result<(Vec<u8>, String), Thrown> {
    let mut length = stream.read_bits([9, 11, 13][size])?;
    let mut out = Vec::new();
    while length >= 2 {
        let v = stream.read_bits(11)?;
        out.push(alnum(v / 45)?);
        out.push(alnum(v % 45)?);
        length -= 2;
    }
    if length == 1 {
        out.push(alnum(stream.read_bits(6)?)?);
    }
    let text = String::from_utf8(out.clone()).map_err(|_| Thrown)?;
    Ok((out, text))
}

/// `decodeByte(stream, size)` (index.html:1039-1055).
fn decode_byte(stream: &mut BitStream, size: usize) -> Result<(Vec<u8>, String), Thrown> {
    let length = stream.read_bits([8, 16, 16][size])?;
    let mut bytes = Vec::new();
    for _ in 0..length {
        bytes.push(u8::try_from(stream.read_bits(8)?).unwrap_or(0));
    }
    // decodeURIComponent of "%XX" per byte: the UTF-8 decode, or a URIError (caught, no text).
    let text = String::from_utf8(bytes.clone()).unwrap_or_default();
    Ok((bytes, text))
}

/// `decodeKanji(stream, size)` (index.html:1056-1074).
fn decode_kanji(stream: &mut BitStream, size: usize) -> Result<(Vec<u8>, String), Thrown> {
    let length = stream.read_bits([8, 10, 12][size])?;
    let mut bytes = Vec::new();
    let mut text = String::new();
    for _ in 0..length {
        let k = stream.read_bits(13)?;
        let mut c = ((k / 0xc0) << 8) | (k % 0xc0);
        c += if c < 0x1f00 { 0x8140 } else { 0xc140 };
        bytes.push(u8::try_from(c >> 8).unwrap_or(0));
        bytes.push(u8::try_from(c & 0xff).unwrap_or(0));
        let unit = SHIFT_JIS
            .binary_search_by_key(&c, |&(key, _)| u32::from(key))
            .map_or(0, |i| SHIFT_JIS[i].1);
        text.push(char::from_u32(u32::from(unit)).unwrap_or('\0'));
    }
    Ok((bytes, text))
}

/// `decode(data, version)`: `None` where jsQR returns `undefined` (bits left over after the
/// last segment that are not all 0) or a segment throws (caught in `decodeMatrix`,
/// index.html:914-919).
pub fn decode(data: &[u8], version: u32) -> Option<Decoded> {
    decode_inner(data, version).ok().flatten()
}

fn decode_inner(data: &[u8], version: u32) -> Result<Option<Decoded>, Thrown> {
    let mut stream = BitStream {
        bytes: data,
        byte_offset: 0,
        bit_offset: 0,
    };
    let size = if version <= 9 {
        0
    } else if version <= 26 {
        1
    } else {
        2
    };
    let mut result = Decoded {
        text: String::new(),
        bytes: Vec::new(),
        chunks: Vec::new(),
        version,
    };
    while stream.available() >= 4 {
        let mode = stream.read_bits(4)?;
        match mode {
            0 => return Ok(Some(result)),
            7 => {
                let assignment_number = if stream.read_bits(1)? == 0 {
                    i32::try_from(stream.read_bits(7)?).unwrap_or(-1)
                } else if stream.read_bits(1)? == 0 {
                    i32::try_from(stream.read_bits(14)?).unwrap_or(-1)
                } else if stream.read_bits(1)? == 0 {
                    i32::try_from(stream.read_bits(21)?).unwrap_or(-1)
                } else {
                    -1
                };
                result.chunks.push(Chunk::Eci { assignment_number });
            }
            1 => {
                let (bytes, text) = decode_numeric(&mut stream, size)?;
                result.text.push_str(&text);
                result.bytes.extend_from_slice(&bytes);
                result.chunks.push(Chunk::Numeric { text });
            }
            2 => {
                let (bytes, text) = decode_alphanumeric(&mut stream, size)?;
                result.text.push_str(&text);
                result.bytes.extend_from_slice(&bytes);
                result.chunks.push(Chunk::Alphanumeric { text });
            }
            4 => {
                let (bytes, text) = decode_byte(&mut stream, size)?;
                result.text.push_str(&text);
                result.bytes.extend_from_slice(&bytes);
                result.chunks.push(Chunk::Byte { bytes, text });
            }
            8 => {
                let (bytes, text) = decode_kanji(&mut stream, size)?;
                result.text.push_str(&text);
                result.bytes.extend_from_slice(&bytes);
                result.chunks.push(Chunk::Kanji { bytes, text });
            }
            _ => {}
        }
    }
    let left = stream.available();
    if left == 0 || stream.read_bits(left)? == 0 {
        return Ok(Some(result));
    }
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn modes_the_page_does_not_name_are_skipped() {
        // FNC1 first (0101), then byte mode (0100), count 2, "hi", terminator.
        let bits = "0101 0100 00000010 01101000 01101001 0000";
        let mut bytes = Vec::new();
        let mut cur = 0u8;
        let mut n = 0;
        for c in bits.chars().filter(|c| *c != ' ') {
            cur = (cur << 1) | u8::from(c == '1');
            n += 1;
            if n == 8 {
                bytes.push(cur);
                cur = 0;
                n = 0;
            }
        }
        let d = decode(&bytes, 1).unwrap();
        assert_eq!(d.text, "hi");
        assert_eq!(d.chunks.len(), 1);
        // Numeric "5", then mode 3 (skipped), then 2 bits left: 00 ends the data, 01 makes the
        // page's decode return undefined.
        assert_eq!(decode(&[0x10, 0x05, 0x4c], 1).unwrap().text, "5");
        assert!(decode(&[0x10, 0x05, 0x4d], 1).is_none());
    }

    #[test]
    fn non_utf8_byte_segment_adds_bytes_but_no_text() {
        // byte mode, count 1, 0xFF, terminator.
        let d = decode(&[0b0100_0000, 0b0001_1111, 0b1111_0000], 1).unwrap();
        assert_eq!(d.bytes, vec![0xff]);
        assert_eq!(d.text, "");
    }
}
