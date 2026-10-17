//! The GGUF v3 byte layout the upstream colour scripts write by hand: `stars_shells.py:194-238`
//! and `double_rainbow_to_gguf.py:25-31,350-499`, plus a reader for the same layout.

/// `0x46554747`, "GGUF" little-endian.
pub const MAGIC: u32 = 0x4655_4747;
/// GGUF version 3.
pub const VERSION: u32 = 3;
/// Data alignment, 32 bytes.
pub const ALIGN: usize = 32;
/// Metadata value type `UINT32`.
pub const TYPE_U32: u32 = 4;
/// Metadata value type `STRING`.
pub const TYPE_STRING: u32 = 8;
/// Metadata value type `UINT64`.
pub const TYPE_U64: u32 = 10;
/// Tensor type `F32` (IEEE-754 binary32).
pub const GGML_TYPE_F32: u32 = 0;
/// Tensor type `I8`.
pub const GGML_TYPE_I8: u32 = 24;

/// `ss(x)`: little-endian u64 length, then the UTF-8 bytes.
pub fn string(value: &str) -> Vec<u8> {
    let mut out = (value.len() as u64).to_le_bytes().to_vec();
    out.extend_from_slice(value.as_bytes());
    out
}

/// A metadata value as the upstream scripts write it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Value {
    /// `STRING`.
    Str(String),
    /// `UINT32`.
    U32(u32),
    /// `UINT64`.
    U64(u64),
}

/// One metadata entry: key string, value type, value payload.
pub fn kv(key: &str, value: &Value) -> Vec<u8> {
    let mut out = string(key);
    match value {
        Value::Str(text) => {
            out.extend_from_slice(&TYPE_STRING.to_le_bytes());
            out.extend_from_slice(&string(text));
        }
        Value::U32(n) => {
            out.extend_from_slice(&TYPE_U32.to_le_bytes());
            out.extend_from_slice(&n.to_le_bytes());
        }
        Value::U64(n) => {
            out.extend_from_slice(&TYPE_U64.to_le_bytes());
            out.extend_from_slice(&n.to_le_bytes());
        }
    }
    out
}

/// One tensor-info record: name, dimension count, dimensions (in the order given), type, offset.
pub fn tensor_info(name: &str, dims: &[u64], tensor_type: u32, offset: u64) -> Vec<u8> {
    let mut out = string(name);
    out.extend_from_slice(&(dims.len() as u32).to_le_bytes());
    for dim in dims {
        out.extend_from_slice(&dim.to_le_bytes());
    }
    out.extend_from_slice(&tensor_type.to_le_bytes());
    out.extend_from_slice(&offset.to_le_bytes());
    out
}

/// The fixed header prefix `struct.pack("<IIQQ", MAGIC, 3, tensors, kvs)`.
pub fn header_prefix(tensor_count: u64, kv_count: u64) -> Vec<u8> {
    let mut out = MAGIC.to_le_bytes().to_vec();
    out.extend_from_slice(&VERSION.to_le_bytes());
    out.extend_from_slice(&tensor_count.to_le_bytes());
    out.extend_from_slice(&kv_count.to_le_bytes());
    out
}

/// Zero bytes that pad `len` up to the next multiple of 32 (`(-len) % 32`).
pub fn pad_to_align(len: usize) -> usize {
    (ALIGN - len % ALIGN) % ALIGN
}

/// The IEEE-754 binary32 bit pattern of the integer `n`, rounded to nearest with ties to even:
/// the pattern numpy writes for `int64.astype(np.float32)`. Exact below 2^24.
pub fn binary32_bits(n: u64) -> u32 {
    if n == 0 {
        return 0;
    }
    let e = 63 - n.leading_zeros();
    if e <= 23 {
        return ((e + 127) << 23) | ((n << (23 - e)) as u32 & 0x7f_ffff);
    }
    let shift = e - 23;
    let rest = n & ((1u64 << shift) - 1);
    let half = 1u64 << (shift - 1);
    let mut m = n >> shift;
    if rest > half || (rest == half && m & 1 == 1) {
        m += 1;
    }
    let (m, e) = if m == 1 << 24 {
        (m >> 1, e + 1)
    } else {
        (m, e)
    };
    ((e + 127) << 23) | (m as u32 & 0x7f_ffff)
}

/// `x + 1.0` in binary32 for a whole-number count `x <= 2^24`. At 2^24 the sum `2^24 + 1` rounds
/// to even, back to 2^24, so a cube filled by `np.add.at(c, idx, np.float32(1.0))` stops there.
pub fn binary32_increment(x: u32) -> u32 {
    if x < 1 << 24 {
        x + 1
    } else {
        x
    }
}

/// A tensor-info record read back from a file.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TensorInfo {
    /// Tensor name.
    pub name: String,
    /// Dimensions in file order.
    pub dims: Vec<u64>,
    /// GGML tensor type.
    pub tensor_type: u32,
    /// Offset from the start of the data section.
    pub offset: u64,
}

/// The parts of a GGUF file needed to locate tensor data.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Layout {
    /// Metadata entries as (key, value).
    pub kvs: Vec<(String, Value)>,
    /// Tensor-info records.
    pub tensors: Vec<TensorInfo>,
    /// Byte offset of the data section (header padded to 32).
    pub data_start: usize,
}

struct Cursor<'a> {
    bytes: &'a [u8],
    at: usize,
}

impl<'a> Cursor<'a> {
    fn take(&mut self, n: usize) -> Result<&'a [u8], String> {
        let end = self.at.checked_add(n).ok_or("length overflow")?;
        let out = self.bytes.get(self.at..end).ok_or("truncated GGUF")?;
        self.at = end;
        Ok(out)
    }
    fn u32(&mut self) -> Result<u32, String> {
        let mut b = [0u8; 4];
        b.copy_from_slice(self.take(4)?);
        Ok(u32::from_le_bytes(b))
    }
    fn u64(&mut self) -> Result<u64, String> {
        let mut b = [0u8; 8];
        b.copy_from_slice(self.take(8)?);
        Ok(u64::from_le_bytes(b))
    }
    fn string(&mut self) -> Result<String, String> {
        let len = usize::try_from(self.u64()?).map_err(|_| "string length overflow")?;
        let raw = self.take(len)?;
        String::from_utf8(raw.to_vec()).map_err(|_| "string is not UTF-8".to_string())
    }
}

/// Reads the header of a GGUF v3 file whose metadata uses only `UINT32`, `STRING` and `UINT64`.
pub fn read_layout(bytes: &[u8]) -> Result<Layout, String> {
    let mut c = Cursor { bytes, at: 0 };
    if c.u32()? != MAGIC || c.u32()? != VERSION {
        return Err("not GGUF v3".into());
    }
    let tensor_count = c.u64()?;
    let kv_count = c.u64()?;
    let mut kvs = Vec::new();
    for _ in 0..kv_count {
        let key = c.string()?;
        let value = match c.u32()? {
            TYPE_U32 => Value::U32(c.u32()?),
            TYPE_STRING => Value::Str(c.string()?),
            TYPE_U64 => Value::U64(c.u64()?),
            other => return Err(format!("metadata type {other} outside the domain")),
        };
        kvs.push((key, value));
    }
    let mut tensors = Vec::new();
    for _ in 0..tensor_count {
        let name = c.string()?;
        let ndim = c.u32()?;
        let mut dims = Vec::new();
        for _ in 0..ndim {
            dims.push(c.u64()?);
        }
        let tensor_type = c.u32()?;
        let offset = c.u64()?;
        tensors.push(TensorInfo {
            name,
            dims,
            tensor_type,
            offset,
        });
    }
    let data_start = c.at + pad_to_align(c.at);
    Ok(Layout {
        kvs,
        tensors,
        data_start,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binary32_patterns_match_numpy() {
        // numpy: np.float32(1).view(np.uint32) == 0x3f800000, 3 -> 0x40400000, 4301 -> 0x45866800.
        assert_eq!(binary32_bits(1), 0x3f80_0000);
        assert_eq!(binary32_bits(3), 0x4040_0000);
        assert_eq!(binary32_bits(4301), 0x4586_6800);
        assert_eq!(binary32_bits(0), 0);
        // numpy 2.5.4: np.arange(16777216, 16777225).astype(np.float32).view(np.uint32) ==
        // 4b800000 4b800000 4b800001 4b800002 4b800002 4b800002 4b800003 4b800004 4b800004.
        let want = [
            0x4b80_0000,
            0x4b80_0000,
            0x4b80_0001,
            0x4b80_0002,
            0x4b80_0002,
            0x4b80_0002,
            0x4b80_0003,
            0x4b80_0004,
            0x4b80_0004,
        ];
        for (i, &w) in want.iter().enumerate() {
            assert_eq!(binary32_bits((1 << 24) + i as u64), w, "2^24 + {i}");
        }
        // np.array([2**25-1, 2**62+2**38, 2**62+2**38+1, 2**62+3*2**38, 2**63-1], np.int64)
        //   .astype(np.float32).view(np.uint32) == 4c000000 5e800000 5e800001 5e800002 5f000000.
        let wide = [
            ((1u64 << 25) - 1, 0x4c00_0000),
            ((1 << 62) + (1 << 38), 0x5e80_0000),
            ((1 << 62) + (1 << 38) + 1, 0x5e80_0001),
            ((1 << 62) + 3 * (1 << 38), 0x5e80_0002),
            ((1 << 63) - 1, 0x5f00_0000),
        ];
        for (n, w) in wide {
            assert_eq!(binary32_bits(n), w, "{n}");
        }
    }

    #[test]
    fn binary32_counter_stops_at_two_to_the_24() {
        // numpy: c = np.zeros(1, np.float32); np.add.at(c, [0] * (2**24 + 5), np.float32(1.0))
        // leaves c[0] == 16777216.0.
        assert_eq!(binary32_increment(0), 1);
        assert_eq!(binary32_increment((1 << 24) - 1), 1 << 24);
        assert_eq!(binary32_increment(1 << 24), 1 << 24);
    }

    #[test]
    fn padding() {
        assert_eq!(pad_to_align(0), 0);
        assert_eq!(pad_to_align(1), 31);
        assert_eq!(pad_to_align(32), 0);
    }
}
