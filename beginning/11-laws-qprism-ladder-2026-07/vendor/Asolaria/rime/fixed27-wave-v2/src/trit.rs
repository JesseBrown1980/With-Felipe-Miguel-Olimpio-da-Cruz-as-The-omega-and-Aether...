use std::fmt;
use std::ops::Neg;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash)]
#[repr(i8)]
pub enum Trit {
    Neg = -1,
    #[default]
    Zero = 0,
    Pos = 1,
}

impl Trit {
    pub const ALL: [Self; 3] = [Self::Neg, Self::Zero, Self::Pos];

    pub const fn value(self) -> i8 {
        self as i8
    }

    pub const fn glyph(self) -> u8 {
        match self {
            Self::Neg => b'-',
            Self::Zero => b'.',
            Self::Pos => b'+',
        }
    }

    pub fn from_glyph(glyph: u8) -> Result<Self, String> {
        match glyph {
            b'-' => Ok(Self::Neg),
            b'.' => Ok(Self::Zero),
            b'+' => Ok(Self::Pos),
            _ => Err(format!("invalid RIME trit glyph 0x{glyph:02x}")),
        }
    }

    pub const fn rotate(self) -> Self {
        match self {
            Self::Neg => Self::Zero,
            Self::Zero => Self::Pos,
            Self::Pos => Self::Neg,
        }
    }

    pub const fn anti_rotate(self) -> Self {
        match self {
            Self::Neg => Self::Pos,
            Self::Zero => Self::Neg,
            Self::Pos => Self::Zero,
        }
    }

    /// Apply a change only: reverse, hold, or forward in the order-three orbit.
    pub const fn change(self, change: Self) -> Self {
        match change {
            Self::Neg => self.anti_rotate(),
            Self::Zero => self,
            Self::Pos => self.rotate(),
        }
    }

    pub const fn display_rgb(self) -> u8 {
        match self {
            Self::Neg => 0,
            Self::Zero => 127,
            Self::Pos => 255,
        }
    }
}

impl Neg for Trit {
    type Output = Self;

    fn neg(self) -> Self::Output {
        match self {
            Self::Neg => Self::Pos,
            Self::Zero => Self::Zero,
            Self::Pos => Self::Neg,
        }
    }
}

impl fmt::Display for Trit {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Neg => "-",
            Self::Zero => ".",
            Self::Pos => "+",
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn alphabet_and_display_projection_are_exact() {
        assert_eq!(Trit::ALL.map(Trit::glyph), *b"-.+");
        assert_eq!(Trit::ALL.map(Trit::display_rgb), [0, 127, 255]);
    }

    #[test]
    fn every_state_changes_in_an_order_three_orbit() {
        for state in Trit::ALL {
            assert_eq!(state.rotate().rotate().rotate(), state);
            assert_eq!(state.change(Trit::Pos).change(Trit::Neg), state);
            assert_eq!(state.change(Trit::Zero), state);
        }
    }
}
