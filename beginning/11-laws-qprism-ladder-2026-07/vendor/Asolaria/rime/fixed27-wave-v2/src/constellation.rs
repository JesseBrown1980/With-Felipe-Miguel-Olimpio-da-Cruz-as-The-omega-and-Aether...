use crate::{RimeCoordinate, RimeState, Trit, COORDINATE_COUNT};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Organ {
    OmniShannon,
    ForwardGnn,
    ReverseGainGnn,
    Fnn,
    Gslm,
}

impl Organ {
    pub const ALL: [Self; 5] = [
        Self::OmniShannon,
        Self::ForwardGnn,
        Self::ReverseGainGnn,
        Self::Fnn,
        Self::Gslm,
    ];

    pub const fn name(self) -> &'static str {
        match self {
            Self::OmniShannon => "omnishannon",
            Self::ForwardGnn => "gnn",
            Self::ReverseGainGnn => "reverse-gain-gnn",
            Self::Fnn => "fnn",
            Self::Gslm => "gslm",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ConstellationPass {
    pub output: RimeState,
    pub changed_by_organ: [usize; 5],
    pub trained_weights_connected: bool,
}

/// Integer trit kernels exercise the exact constellation wiring. They are not
/// represented as trained model weights; that external binding remains gated.
pub fn execute_constellation(input: &RimeState) -> ConstellationPass {
    let coordinates = RimeCoordinate::all();
    let mut state = input.clone();
    let mut changed_by_organ = [0_usize; 5];
    for (organ_index, organ) in Organ::ALL.into_iter().enumerate() {
        let before = state.clone();
        let changes = std::array::from_fn(|index| {
            kernel_change(organ, index, &coordinates, before.gradients())
        });
        changed_by_organ[organ_index] = state.apply_changes(&changes);
    }
    ConstellationPass {
        output: state,
        changed_by_organ,
        trained_weights_connected: false,
    }
}

fn kernel_change(
    organ: Organ,
    index: usize,
    coordinates: &[RimeCoordinate; COORDINATE_COUNT],
    gradients: &[Trit; COORDINATE_COUNT],
) -> Trit {
    match organ {
        Organ::OmniShannon => -gradients[index],
        Organ::ForwardGnn => gradients[(index + 1) % COORDINATE_COUNT],
        Organ::ReverseGainGnn => -gradients[(index + COORDINATE_COUNT - 1) % COORDINATE_COUNT],
        Organ::Fnn => coordinates[index].color,
        Organ::Gslm => coordinates[index].time.change(coordinates[index].space),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entire_constellation_changes_only_the_same_twenty_seven_gradients() {
        let pass = execute_constellation(&RimeState::seeded());
        assert_eq!(pass.output.photo().len(), 27);
        assert!(pass.output.photo().iter().all(|byte| b"-.+".contains(byte)));
        assert_eq!(pass.changed_by_organ.len(), Organ::ALL.len());
        assert!(!pass.trained_weights_connected);
    }
}
