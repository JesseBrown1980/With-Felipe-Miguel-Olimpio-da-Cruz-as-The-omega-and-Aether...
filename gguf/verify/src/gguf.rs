//! GGUF v2/v3 reader. Float-typed values are carried as raw bit patterns, never interpreted.

pub enum Value {
    Uint(u64),
    Int(i64),
    Bool(bool),
    Str(String),
    FloatBits {
        width: u8,
        bits: u64,
    },
    Array {
        elem_type: u32,
        len: u64,
        strings: Vec<String>,
    },
}

pub struct TensorInfo {
    pub name: String,
    pub dims: Vec<u64>,
    pub ggml_type: u32,
    pub rel_offset: u64,
    pub abs_offset: u64,
    pub byte_len: Option<u64>,
}

pub struct Gguf {
    pub version: u32,
    pub metadata: Vec<(String, Value)>,
    pub tensors: Vec<TensorInfo>,
    pub alignment: u64,
    pub data_start: u64,
}

struct Cursor<'a> {
    buf: &'a [u8],
    pos: usize,
}

impl<'a> Cursor<'a> {
    fn take(&mut self, n: u64) -> Result<&'a [u8], String> {
        let n = usize::try_from(n).map_err(|_| "length overflow".to_string())?;
        let end = self.pos.checked_add(n).ok_or("length overflow")?;
        let s = self
            .buf
            .get(self.pos..end)
            .ok_or_else(|| format!("truncated at byte {}", self.pos))?;
        self.pos = end;
        Ok(s)
    }
    fn u8(&mut self) -> Result<u8, String> {
        Ok(self.take(1)?[0])
    }
    fn u16(&mut self) -> Result<u16, String> {
        let b = self.take(2)?;
        Ok(u16::from_le_bytes([b[0], b[1]]))
    }
    fn u32(&mut self) -> Result<u32, String> {
        let b = self.take(4)?;
        Ok(u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
    }
    fn u64(&mut self) -> Result<u64, String> {
        let b = self.take(8)?;
        let mut a = [0u8; 8];
        a.copy_from_slice(b);
        Ok(u64::from_le_bytes(a))
    }
    fn string(&mut self) -> Result<String, String> {
        let n = self.u64()?;
        if n > 1 << 24 {
            return Err(format!("string length {n} too large"));
        }
        String::from_utf8(self.take(n)?.to_vec()).map_err(|_| "non-UTF-8 string".to_string())
    }
    fn scalar(&mut self, t: u32) -> Result<Value, String> {
        Ok(match t {
            0 => Value::Uint(u64::from(self.u8()?)),
            1 => Value::Int(i64::from(self.u8()? as i8)),
            2 => Value::Uint(u64::from(self.u16()?)),
            3 => Value::Int(i64::from(self.u16()? as i16)),
            4 => Value::Uint(u64::from(self.u32()?)),
            5 => Value::Int(i64::from(self.u32()? as i32)),
            6 => Value::FloatBits {
                width: 32,
                bits: u64::from(self.u32()?),
            },
            7 => Value::Bool(self.u8()? != 0),
            8 => Value::Str(self.string()?),
            10 => Value::Uint(self.u64()?),
            11 => Value::Int(self.u64()? as i64),
            12 => Value::FloatBits {
                width: 64,
                bits: self.u64()?,
            },
            _ => return Err(format!("unknown metadata type {t}")),
        })
    }
    fn value(&mut self, t: u32) -> Result<Value, String> {
        if t != 9 {
            return self.scalar(t);
        }
        let elem_type = self.u32()?;
        let len = self.u64()?;
        if len > 1 << 26 {
            return Err(format!("array length {len} too large"));
        }
        let mut strings = Vec::new();
        for _ in 0..len {
            match self.value(elem_type)? {
                Value::Str(s) => strings.push(s),
                Value::Uint(_)
                | Value::Int(_)
                | Value::Bool(_)
                | Value::FloatBits { .. }
                | Value::Array { .. } => {}
            }
        }
        Ok(Value::Array {
            elem_type,
            len,
            strings,
        })
    }
}

/// Bytes per element for the non-block ggml types this reader can size exactly.
pub fn elem_bytes(ggml_type: u32) -> Option<u64> {
    match ggml_type {
        0 | 26 => Some(4),
        1 | 25 | 30 => Some(2),
        24 => Some(1),
        27 | 28 => Some(8),
        _ => None,
    }
}

pub fn type_name(ggml_type: u32) -> &'static str {
    match ggml_type {
        0 => "F32",
        1 => "F16",
        24 => "I8",
        25 => "I16",
        26 => "I32",
        27 => "I64",
        28 => "F64",
        30 => "BF16",
        _ => "BLOCK_OR_OTHER",
    }
}

pub fn parse(buf: &[u8]) -> Result<Gguf, String> {
    let mut c = Cursor { buf, pos: 0 };
    if c.take(4)? != b"GGUF" {
        return Err("bad magic".into());
    }
    let version = c.u32()?;
    if !(2..=3).contains(&version) {
        return Err(format!("unsupported version {version}"));
    }
    let n_tensors = c.u64()?;
    let n_kv = c.u64()?;
    if n_tensors > 1 << 20 || n_kv > 1 << 20 {
        return Err("implausible header counts".into());
    }
    let mut metadata = Vec::new();
    for _ in 0..n_kv {
        let key = c.string()?;
        let t = c.u32()?;
        metadata.push((key, c.value(t)?));
    }
    let alignment = metadata
        .iter()
        .find_map(|(k, v)| match (k.as_str(), v) {
            ("general.alignment", Value::Uint(a)) => Some(*a),
            _ => None,
        })
        .unwrap_or(32);
    if alignment == 0 || !alignment.is_power_of_two() {
        return Err(format!("bad alignment {alignment}"));
    }
    let mut tensors = Vec::new();
    for _ in 0..n_tensors {
        let name = c.string()?;
        let nd = c.u32()?;
        if nd == 0 || nd > 4 {
            return Err(format!("tensor {name}: bad rank {nd}"));
        }
        let mut dims = Vec::new();
        for _ in 0..nd {
            dims.push(c.u64()?);
        }
        let ggml_type = c.u32()?;
        let rel_offset = c.u64()?;
        tensors.push(TensorInfo {
            name,
            dims,
            ggml_type,
            rel_offset,
            abs_offset: 0,
            byte_len: None,
        });
    }
    let pos = c.pos as u64;
    let data_start = pos.div_ceil(alignment) * alignment;
    let file_len = buf.len() as u64;
    for t in &mut tensors {
        if t.rel_offset % alignment != 0 {
            return Err(format!(
                "tensor {} unaligned offset {}",
                t.name, t.rel_offset
            ));
        }
        t.abs_offset = data_start
            .checked_add(t.rel_offset)
            .ok_or("offset overflow")?;
        let count = t
            .dims
            .iter()
            .try_fold(1u64, |acc, d| acc.checked_mul(*d))
            .ok_or("dims overflow")?;
        t.byte_len = elem_bytes(t.ggml_type).map(|b| count * b);
        if let Some(n) = t.byte_len {
            if t.abs_offset
                .checked_add(n)
                .map_or(true, |end| end > file_len)
            {
                return Err(format!("tensor {} truncated", t.name));
            }
        }
    }
    Ok(Gguf {
        version,
        metadata,
        tensors,
        alignment,
        data_start,
    })
}
