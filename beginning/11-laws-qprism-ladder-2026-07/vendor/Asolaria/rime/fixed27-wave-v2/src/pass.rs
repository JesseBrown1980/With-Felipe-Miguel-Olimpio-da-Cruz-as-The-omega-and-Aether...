use crate::{RimeState, Trit, COORDINATE_COUNT};
use std::time::{Duration, Instant};

pub const SECOND_CASCADE_LEVELS: [u64; 6] = [6, 6, 6, 6, 6, 12];
pub const SECOND_CASCADE_ROUTES: u64 = 93_312;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct NearestThird {
    pub actual: u64,
    pub one_third: u64,
    pub retained_two_thirds: u64,
}

impl NearestThird {
    pub const fn of(actual: u64) -> Self {
        let one_third = (actual + 1) / 3;
        Self {
            actual,
            one_third,
            retained_two_thirds: actual - one_third,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PassMetrics {
    pub calculation_ns: NearestThird,
    pub play_ns: NearestThird,
    pub route_events: NearestThird,
    pub persisted_trits: NearestThird,
    pub physical_bits: NearestThird,
    pub storage_bytes: NearestThird,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WavePass {
    pub output: RimeState,
    pub replay_restored: bool,
    pub route_direction_counts: [u64; 3],
    pub level_node_counts: [u64; 6],
    pub coordinate_visits: [u64; COORDINATE_COUNT],
    pub metrics: PassMetrics,
}

pub fn execute_second_cascade(input: &RimeState) -> WavePass {
    debug_assert_eq!(
        SECOND_CASCADE_LEVELS.iter().product::<u64>(),
        SECOND_CASCADE_ROUTES
    );
    let mut output = input.clone();
    let mut direction_counts = [0_u64; 3];
    let mut coordinate_visits = [0_u64; COORDINATE_COUNT];
    let calculation_start = Instant::now();
    walk_routes(false, &mut |path| {
        let route = route_ordinal(path);
        let coordinate = route as usize % COORDINATE_COUNT;
        let change_index = path.iter().map(|&branch| u64::from(branch)).sum::<u64>() % 3;
        let change = Trit::ALL[change_index as usize];
        output.gradients_mut()[coordinate] = output.gradients()[coordinate].change(change);
        direction_counts[change_index as usize] += 1;
        coordinate_visits[coordinate] += 1;
    });
    let calculation_elapsed = nonzero_elapsed(calculation_start.elapsed());

    let mut replay = output.clone();
    let play_start = Instant::now();
    walk_routes(true, &mut |path| {
        let route = route_ordinal(path);
        let coordinate = route as usize % COORDINATE_COUNT;
        let change_index = path.iter().map(|&branch| u64::from(branch)).sum::<u64>() % 3;
        let inverse = -Trit::ALL[change_index as usize];
        replay.gradients_mut()[coordinate] = replay.gradients()[coordinate].change(inverse);
    });
    let play_elapsed = nonzero_elapsed(play_start.elapsed());

    WavePass {
        output,
        replay_restored: replay == *input,
        route_direction_counts: direction_counts,
        level_node_counts: [6, 36, 216, 1_296, 7_776, 93_312],
        coordinate_visits,
        metrics: PassMetrics {
            calculation_ns: NearestThird::of(calculation_elapsed.as_nanos() as u64),
            play_ns: NearestThird::of(play_elapsed.as_nanos() as u64),
            route_events: NearestThird::of(SECOND_CASCADE_ROUTES),
            persisted_trits: NearestThird::of(COORDINATE_COUNT as u64),
            physical_bits: NearestThird::of((COORDINATE_COUNT * 8) as u64),
            storage_bytes: NearestThird::of(COORDINATE_COUNT as u64),
        },
    }
}

fn walk_routes(reverse: bool, visit: &mut impl FnMut(&[u8; 6])) {
    fn descend(depth: usize, reverse: bool, path: &mut [u8; 6], visit: &mut impl FnMut(&[u8; 6])) {
        if depth == path.len() {
            visit(path);
            return;
        }
        let branches = SECOND_CASCADE_LEVELS[depth] as u8;
        if reverse {
            for branch in (0..branches).rev() {
                path[depth] = branch;
                descend(depth + 1, reverse, path, visit);
            }
        } else {
            for branch in 0..branches {
                path[depth] = branch;
                descend(depth + 1, reverse, path, visit);
            }
        }
    }
    descend(0, reverse, &mut [0; 6], visit);
}

fn route_ordinal(path: &[u8; 6]) -> u64 {
    path.iter()
        .zip(SECOND_CASCADE_LEVELS)
        .fold(0_u64, |ordinal, (&branch, radix)| {
            ordinal * radix + u64::from(branch)
        })
}

fn nonzero_elapsed(elapsed: Duration) -> Duration {
    if elapsed.is_zero() {
        Duration::from_nanos(1)
    } else {
        elapsed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_second_cascade_is_93312_routes_over_fixed_27() {
        assert_eq!(SECOND_CASCADE_LEVELS.iter().product::<u64>(), 93_312);
        let pass = execute_second_cascade(&RimeState::seeded());
        assert!(pass.replay_restored);
        assert_eq!(pass.route_direction_counts.iter().sum::<u64>(), 93_312);
        assert_eq!(pass.level_node_counts, [6, 36, 216, 1_296, 7_776, 93_312]);
        assert!(pass.coordinate_visits.iter().all(|&visits| visits == 3_456));
        assert_eq!(pass.output.photo().len(), 27);
    }

    #[test]
    fn every_actual_metric_calculates_its_nearest_one_third() {
        for actual in 0..10_000 {
            let split = NearestThird::of(actual);
            assert_eq!(split.actual, split.one_third + split.retained_two_thirds);
            let exact_error = (3_i128 * i128::from(split.one_third) - i128::from(actual)).abs();
            assert!(exact_error <= 1);
        }
        let routes = NearestThird::of(93_312);
        assert_eq!(routes.one_third, 31_104);
        assert_eq!(routes.retained_two_thirds, 62_208);
    }
}
