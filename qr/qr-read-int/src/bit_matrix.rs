//! jsQR's `BitMatrix` (index.html:207-234): one byte per pixel over a flat array.

/// `get` checks both coordinates against the bounds (index.html:216-221); `set` writes the flat
/// index `y * width + x` as a typed array does (index.html:222-224): an index past the end is
/// dropped, and an `x` at or past `width` lands in the next row.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BitMatrix {
    pub width: usize,
    pub height: usize,
    data: Vec<u8>,
}

impl BitMatrix {
    /// `BitMatrix.createEmpty(width, height)` (index.html:213-215).
    pub fn create_empty(width: usize, height: usize) -> BitMatrix {
        BitMatrix {
            width,
            height,
            data: vec![0; width * height],
        }
    }

    /// `get(x, y)`: `false` outside the matrix.
    pub fn get(&self, x: i64, y: i64) -> bool {
        match (usize::try_from(x), usize::try_from(y)) {
            (Ok(x), Ok(y)) if x < self.width && y < self.height => {
                self.data[y * self.width + x] != 0
            }
            _ => false,
        }
    }

    /// `set(x, y, v)` at the flat index `y * width + x`.
    pub fn set(&mut self, x: i64, y: i64, v: bool) {
        let w = i64::try_from(self.width).unwrap_or(i64::MAX);
        let index = y.checked_mul(w).and_then(|i| i.checked_add(x));
        if let Some(i) = index.and_then(|i| usize::try_from(i).ok()) {
            if let Some(cell) = self.data.get_mut(i) {
                *cell = u8::from(v);
            }
        }
    }

    /// `setRegion(left, top, width, height, v)` (index.html:225-231).
    pub fn set_region(&mut self, left: i64, top: i64, width: i64, height: i64, v: bool) {
        for y in top..top + height {
            for x in left..left + width {
                self.set(x, y, v);
            }
        }
    }
}
