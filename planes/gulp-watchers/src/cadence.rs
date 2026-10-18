//! GNNFeedbackCadenceAdjuster: the poll/kick interval adjuster driven by reverse-gain verdicts.
//! Ports gnn-feedback-cadence-adjuster.mjs:26-94 (per-mille score, 4/5 and 5/4 rationals, 850 decay).
//! `Math.floor` (:60, :81, :84) is `div_euclid` here (every divisor is positive), and the bound
//! `Math.max(min, Math.min(max, x))` (:73, :88) returns `min` when `min > max`. Upstream numbers are doubles;
//! the two agree while every intermediate value stays below 2^53 in magnitude.

const SPEED_UP_NUM: i128 = 4;
const SPEED_UP_DEN: i128 = 5;
const SLOW_DOWN_NUM: i128 = 5;
const SLOW_DOWN_DEN: i128 = 4;
const DAMPER_THRESHOLD_PM: i128 = 500;
const SCORE_THRESHOLD_PM: i128 = 2000;

/// The reverse-gain sieve verdict (gnn-feedback-cadence-adjuster.mjs:48-52). `Unknown` mirrors upstream's
/// zero-contribution fall-through for an unrecognised verdict.
#[derive(Clone, Copy)]
pub enum Verdict {
    Promote,
    Demote,
    Halt,
    Neutral,
    Unknown,
}

/// Whether the counterpart is hiding (gnn-feedback-cadence-adjuster.mjs:54-55); `None` is any other intent.
#[derive(Clone, Copy)]
pub enum Intent {
    Leak,
    Mask,
    None,
}

/// The result of one `on_outcome` (gnn-feedback-cadence-adjuster.mjs:66).
pub struct Outcome {
    pub score_pm: i128,
    pub next_interval_ms: i128,
    pub damped: bool,
}

/// The adjuster state: current interval, accumulated per-mille score, decay as per-mille.
pub struct CadenceAdjuster {
    min_ms: i128,
    max_ms: i128,
    current_ms: i128,
    decay_pm: i128,
    score_pm: i128,
    history_len: usize,
    pub dampers_skipped: u64,
}

impl Default for CadenceAdjuster {
    fn default() -> Self {
        CadenceAdjuster::new(5_000, 60_000, 10_000, 850)
    }
}

impl CadenceAdjuster {
    /// From the constructor (gnn-feedback-cadence-adjuster.mjs:32-42): bounds, initial interval, decay per mille.
    pub fn new(min_ms: i128, max_ms: i128, initial_ms: i128, decay_pm: i128) -> Self {
        CadenceAdjuster {
            min_ms,
            max_ms,
            current_ms: initial_ms,
            decay_pm,
            score_pm: 0,
            history_len: 0,
            dampers_skipped: 0,
        }
    }

    /// The current per-mille score (test and fixture seam).
    pub fn score_pm(&self) -> i128 {
        self.score_pm
    }

    /// The current interval in milliseconds (gnn-feedback-cadence-adjuster.mjs:92-94 `nextIntervalMs`).
    pub fn next_interval_ms(&self) -> i128 {
        self.current_ms
    }

    /// Seam for replaying a fixture row from an explicit in-state.
    pub fn set_state(&mut self, score_pm: i128, current_ms: i128) {
        self.score_pm = score_pm;
        self.current_ms = current_ms;
    }

    /// One scored outcome (gnn-feedback-cadence-adjuster.mjs:44-67): decay then delta, then bound/adjust.
    pub fn on_outcome(&mut self, verdict: Verdict, intent: Intent, is_reply: bool) -> Outcome {
        let mut delta_pm: i128 = match verdict {
            Verdict::Promote => {
                if is_reply {
                    2000
                } else {
                    1000
                }
            }
            Verdict::Demote => -500,
            Verdict::Halt => -5000,
            Verdict::Neutral | Verdict::Unknown => 0,
        };
        match intent {
            Intent::Leak => delta_pm += 100,
            Intent::Mask => delta_pm -= 300,
            Intent::None => {}
        }

        let sgn: i128 = if self.score_pm < 0 { -1 } else { 1 };
        let decayed = sgn * (self.score_pm.abs() * self.decay_pm + 500).div_euclid(1000);
        self.score_pm = decayed + delta_pm;

        self.history_len = (self.history_len + 1).min(128);
        let damped = self.adjust_cadence();
        Outcome {
            score_pm: self.score_pm,
            next_interval_ms: self.current_ms,
            damped,
        }
    }

    // `Math.max(this.min_ms, Math.min(this.max_ms, x))` (:73, :88).
    fn bound(&self, x: i128) -> i128 {
        self.min_ms.max(self.max_ms.min(x))
    }

    // _adjustCadence (gnn-feedback-cadence-adjuster.mjs:69-90): damper band, then symmetric 4/5 or 5/4, then bound.
    fn adjust_cadence(&mut self) -> bool {
        if self.score_pm.abs() < DAMPER_THRESHOLD_PM {
            self.current_ms = self.bound(self.current_ms);
            self.dampers_skipped += 1;
            return true;
        }
        if self.score_pm > SCORE_THRESHOLD_PM {
            let sped = (self.current_ms * SPEED_UP_NUM + SPEED_UP_DEN - 1).div_euclid(SPEED_UP_DEN);
            self.current_ms = self.min_ms.max(sped);
        } else if self.score_pm < -SCORE_THRESHOLD_PM {
            let slowed =
                (self.current_ms * SLOW_DOWN_NUM + SLOW_DOWN_DEN - 1).div_euclid(SLOW_DOWN_DEN);
            self.current_ms = self.max_ms.min(slowed);
        }
        self.current_ms = self.bound(self.current_ms);
        false
    }
}
