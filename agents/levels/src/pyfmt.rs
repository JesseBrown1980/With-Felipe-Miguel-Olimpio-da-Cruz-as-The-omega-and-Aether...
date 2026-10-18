//! The Python 3 text forms the upstream `print` lines use: `str(bool)`, `f"{n:,}"`, and the
//! `repr` of lists and tuples of integers.

/// `str(b)`: `True` or `False`.
pub fn py_bool(b: bool) -> &'static str {
    if b {
        "True"
    } else {
        "False"
    }
}

/// `f"{n:,}"`: decimal digits grouped by three with commas.
pub fn grouped(n: u128) -> String {
    let digits = n.to_string();
    let mut out = String::with_capacity(digits.len() + digits.len() / 3);
    for (i, c) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(c);
    }
    out
}

/// `repr(list)` of integers: `[a, b, c]`.
pub fn list<T: ToString>(items: &[T]) -> String {
    let parts: Vec<String> = items.iter().map(ToString::to_string).collect();
    format!("[{}]", parts.join(", "))
}

/// `repr(tuple)` of two or more integers: `(a, b, c)`.
pub fn tuple<T: ToString>(items: &[T]) -> String {
    let parts: Vec<String> = items.iter().map(ToString::to_string).collect();
    format!("({})", parts.join(", "))
}

/// The line `print("=" * 74)` writes.
pub fn rule74() -> String {
    "=".repeat(74)
}

/// Text written by a run of `print` calls: each line followed by `\n`.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Stdout(String);

impl Stdout {
    /// An empty stream.
    pub fn new() -> Stdout {
        Stdout(String::new())
    }

    /// `print(line)`.
    pub fn print(&mut self, line: impl AsRef<str>) {
        self.0.push_str(line.as_ref());
        self.0.push('\n');
    }

    /// The text written so far.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// The text written.
    pub fn into_string(self) -> String {
        self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn python_forms() {
        assert_eq!(grouped(0), "0");
        assert_eq!(grouped(999), "999");
        assert_eq!(grouped(1_000), "1,000");
        assert_eq!(grouped(1_000_080), "1,000,080");
        assert_eq!(grouped(4_814_857), "4,814,857");
        assert_eq!(list(&[16u64, 27, 5, 463]), "[16, 27, 5, 463]");
        assert_eq!(list(&[0i64, 0, -1]), "[0, 0, -1]");
        assert_eq!(list::<u8>(&[]), "[]");
        assert_eq!(tuple(&[-1i64, 0, -1]), "(-1, 0, -1)");
        assert_eq!(py_bool(true), "True");
    }
}
