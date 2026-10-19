use crate::Trit;
use std::collections::HashSet;

pub const COORDINATE_COUNT: usize = 27;
pub const VALUE_WIDTH: usize = 3;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct RimeCoordinate {
    pub color: Trit,
    pub time: Trit,
    pub space: Trit,
}

impl RimeCoordinate {
    /// The axis names are projections. The identity is this entire ordered
    /// width-three value, and every combination over `-,.,+` occurs once.
    pub const fn value(self) -> [Trit; VALUE_WIDTH] {
        [self.color, self.time, self.space]
    }

    pub const fn glyphs(self) -> [u8; VALUE_WIDTH] {
        let value = self.value();
        [value[0].glyph(), value[1].glyph(), value[2].glyph()]
    }

    pub fn all() -> [Self; COORDINATE_COUNT] {
        let mut coordinates = [Self {
            color: Trit::Zero,
            time: Trit::Zero,
            space: Trit::Zero,
        }; COORDINATE_COUNT];
        let mut index = 0;
        for color in Trit::ALL {
            for time in Trit::ALL {
                for space in Trit::ALL {
                    coordinates[index] = Self { color, time, space };
                    index += 1;
                }
            }
        }
        coordinates
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RimeState {
    pub(crate) gradients: [Trit; COORDINATE_COUNT],
}

impl RimeState {
    pub fn seeded() -> Self {
        let coordinates = RimeCoordinate::all();
        Self {
            gradients: coordinates.map(|coordinate| coordinate.space),
        }
    }

    pub fn centered() -> Self {
        Self {
            gradients: [Trit::Zero; COORDINATE_COUNT],
        }
    }

    pub const fn gradients(&self) -> &[Trit; COORDINATE_COUNT] {
        &self.gradients
    }

    pub fn apply_changes(&mut self, changes: &[Trit; COORDINATE_COUNT]) -> usize {
        let mut changed = 0;
        for (gradient, &change) in self.gradients.iter_mut().zip(changes) {
            let prior = *gradient;
            *gradient = prior.change(change);
            changed += usize::from(*gradient != prior);
        }
        changed
    }

    pub fn photo(&self) -> [u8; COORDINATE_COUNT] {
        self.gradients.map(Trit::glyph)
    }

    pub fn from_photo(photo: &[u8]) -> Result<Self, String> {
        if photo.len() != COORDINATE_COUNT {
            return Err(format!(
                "RIME state photo must be 27 trits, received {}",
                photo.len()
            ));
        }
        let mut gradients = [Trit::Zero; COORDINATE_COUNT];
        for (slot, &glyph) in gradients.iter_mut().zip(photo) {
            *slot = Trit::from_glyph(glyph)?;
        }
        Ok(Self { gradients })
    }

    pub fn signed_gradient(&self) -> i64 {
        self.gradients
            .iter()
            .map(|gradient| i64::from(gradient.value()))
            .sum()
    }
}

pub fn validate_coordinates() -> Result<(), String> {
    let coordinates = RimeCoordinate::all();
    let unique: HashSet<_> = coordinates
        .into_iter()
        .map(RimeCoordinate::glyphs)
        .collect();
    if unique.len() != COORDINATE_COUNT {
        return Err(
            "the width-three -,.,+ basis did not produce 27 distinct ordered values".into(),
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn twenty_seven_are_distinct_ordered_trit_values_not_twenty_seven_colors() {
        validate_coordinates().unwrap();
        let values = RimeCoordinate::all().map(RimeCoordinate::glyphs);
        assert_eq!(values.len(), 27);
        assert_eq!(values[0], *b"---");
        assert_eq!(values[13], *b"...");
        assert_eq!(values[26], *b"+++");

        let unique: HashSet<_> = values.into_iter().collect();
        assert_eq!(unique.len(), 27);
        for position in 0..VALUE_WIDTH {
            for glyph in b"-.+" {
                assert_eq!(
                    values
                        .iter()
                        .filter(|value| value[position] == *glyph)
                        .count(),
                    9
                );
            }
        }
    }

    #[test]
    fn strict_trit_state_photo_round_trips_without_alphabet_growth() {
        let state = RimeState::seeded();
        let photo = state.photo();
        assert_eq!(photo.len(), 27);
        assert!(photo.iter().all(|byte| b"-.+".contains(byte)));
        assert_eq!(RimeState::from_photo(&photo).unwrap(), state);
    }
}
