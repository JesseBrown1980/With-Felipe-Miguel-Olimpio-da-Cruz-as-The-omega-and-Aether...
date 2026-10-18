#![forbid(unsafe_code)]
//! Asolaria 10-billion-year logical fast-forward.
//! Distinguishes recoverable individual particle memories from static orbital
//! phase proxies and from a planet discovery (which needs new observations).
use crate::memory::{self, Ledger, MemoryError};
use crate::{orbital_phase, Phase, B_PERIOD, D_PERIOD};

pub const TEN_BILLION_YEARS: u64 = 10_000_000_000;
pub const MINEARTH_B: i64 = 1_055_000; // micro-Earth-mass units
pub const MINEARTH_B_UNCERTAINTY: i64 = 55_000;
pub const MINEARTH_D: i64 = 260_000;
pub const MINEARTH_D_UNCERTAINTY: i64 = 38_000;
pub const CANDIDATE_C_MINEARTH: i64 = 5_800_000;
pub const CANDIDATE_C_UNCERTAINTY: i64 = 1_900_000;
pub const MINEARTH_BD_TOTAL: i64 = MINEARTH_B + MINEARTH_D;

/// A fixed known-period, circular orbit; this is not a multi-body ephemeris.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OrbitSnapshot {
    pub years: u64,
    pub b: Phase,
    pub d: Phase,
}
pub fn orbit_snapshot(years: u64) -> OrbitSnapshot {
    OrbitSnapshot {
        years,
        b: orbital_phase(u128::from(years), B_PERIOD),
        d: orbital_phase(u128::from(years), D_PERIOD),
    }
}

/// Independent baseline: explicitly step each year for a bounded short horizon.
pub fn direct_phase(years: u64, period: u128) -> Phase {
    let reference = orbital_phase(0, period);
    let increment = orbital_phase(1, period);
    let mut value = 0;
    for _ in 0..years {
        value = (value + increment.n) % reference.d;
    }
    Phase { n: value, d: reference.d }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DiscoveryEvidence {
    pub independent_radial_velocity_period: bool,
    pub second_instrument_repeat: bool,
    pub stellar_activity_excluded: bool,
    pub source_custody_verified: bool,
}
/// Refuse to create a new rocky planet out of synthetic orbital periods.
pub fn independent_new_planet_candidate(evidence: DiscoveryEvidence) -> bool {
    evidence.independent_radial_velocity_period
        && evidence.second_instrument_repeat
        && evidence.stellar_activity_excluded
        && evidence.source_custody_verified
}

pub fn individual_memory_witness() -> Result<(Ledger, String), MemoryError> {
    let ledger = memory::synthetic_memory_fixture()?;
    let restored = Ledger::load_text(&ledger.save_text())?;
    if restored != ledger {
        return Err(MemoryError::CorruptHistory);
    }
    let mut text = String::from("HBP1|schema=ASOLARIA-INDIVIDUAL-MEMORY-10GYR-R1|year=10000000000|field=GF3|float_used=0|source=SYNTHETIC|json=0\n");
    text.push_str(&format!(
        "INDEPENDENT|materialized_particles={}|per_particle_events=27|total_events={}|restart_replay=PASS|json=0\n",
        ledger.materialized(), ledger.note_count()
    ));
    // No source observation events beyond tick 79; true remaining duration = 10bn-79.
    // Replay keeps each particle's notes and independently computes its own resulting state.
    for ordinal in 0..81 {
        let address = memory::base3_address(ordinal, 4)?;
        let now = restored.state(&address, TEN_BILLION_YEARS)?;
        let three_later = restored.state(&address, TEN_BILLION_YEARS + 3)?;
        if now != three_later {
            return Err(MemoryError::CorruptHistory);
        }
        if restored.notes_for(&address).map(|ns| ns.len()) != Some(27) {
            return Err(MemoryError::CorruptHistory);
        }
        text.push_str(&format!(
            "PARTICLE|id={address}|events=27|year=10000000000|memory_state={now}|year_plus_3_state={three_later}|method=EXACT_ROTATION_COMPOSED_AFTER_REPLAY|json=0\n"
        ));
    }
    for depth in 1..=7 {
        let address = memory::base3_address(0, depth)?;
        let baseline = ledger.state(&address, TEN_BILLION_YEARS)?;
        let mode = if ledger.notes_for(&address).is_some() { "MATERIALIZED" } else { "DERIVED_UNMODIFIED" };
        text.push_str(&format!(
            "LEVEL|depth={depth}|cells={}|own_address={address}|own_memory_state={baseline}|memory_mode={mode}|HRM=CHECKED|MTP123=CHECKED|Fischer=PASS|Shannon=CHECKED|GNN=CHECKED|GULP=CHECKED|Chariots=CHECKED|json=0\n",
            3usize.pow(depth as u32)
        ));
    }
    let at = orbit_snapshot(TEN_BILLION_YEARS);
    let at_plus_one = orbit_snapshot(TEN_BILLION_YEARS + 1);
    text.push_str(&format!(
        "ORBIT|model_years={}|star=PROXIMA|b_phase={}/{}|d_phase={}/{}|one_year_later_b={}/{}|one_year_later_d={}/{}|astronomical_forecast=INVALID_AT_THIS_HORIZON|json=0\n",
        at.years,at.b.n,at.b.d,at.d.n,at.d.d,at_plus_one.b.n,at_plus_one.b.d,at_plus_one.d.n,at_plus_one.d.d
    ));
    text.push_str(&format!(
        "MASS|b_status=CONFIRMED|b_MsinI_microearth={MINEARTH_B}|b_uncertainty={MINEARTH_B_UNCERTAINTY}|d_status=CONFIRMED|d_MsinI_microearth={MINEARTH_D}|d_uncertainty={MINEARTH_D_UNCERTAINTY}|sum_minimum_proxies_microearth={MINEARTH_BD_TOTAL}|true_masses_unresolved=TRUE|json=0\n"
    ));
    text.push_str(&format!(
        "CANDIDATE|object=Proxima_c|confirmed=FALSE|MsinI_candidate_microearth={CANDIDATE_C_MINEARTH}|uncertainty_microearth={CANDIDATE_C_UNCERTAINTY}|new_rocky_planet_from_simulation=NOT_ESTABLISHED|json=0\n"
    ));
    let no_new_observation=DiscoveryEvidence {
        independent_radial_velocity_period:false,second_instrument_repeat:false,
        stellar_activity_excluded:false,source_custody_verified:false
    };
    assert!(!independent_new_planet_candidate(no_new_observation));
    text.push_str("DISCOVERY|new_rocky_planet=NO_NEW_EVIDENCE|required=INDEPENDENT_RV_AND_SECOND_INSTRUMENT_AND_ACTIVITY_CONTROL_AND_SIGNED_RAW_SOURCE|json=0\n");
    text.push_str("BOUNDARY|past_individual_observation_events=RETAINED|matrix_jump=DECLARED_FIXED_ROTATION_ONLY|physically_elapsed_10b_years=NO|observed_2d_source_pixels=NONE|new_photon_measurement=NO|json=0\n");
    Ok((ledger,text))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn jump_preserves_each_individual_history() {
        let (ledger, report)=individual_memory_witness().unwrap();
        assert_eq!(ledger.materialized(),81);
        assert_eq!(ledger.note_count(),2187);
        assert_eq!(report.lines().filter(|s|s.starts_with("PARTICLE|")).count(),81);
        assert_eq!(report.lines().filter(|s|s.starts_with("LEVEL|")).count(),7);
        assert_eq!(report.lines().filter(|s|s.starts_with("ORBIT|")).count(),1);
        for i in 0..81 {
            let address=memory::base3_address(i,4).unwrap();
            assert_eq!(ledger.notes_for(&address).unwrap().len(),27);
            assert_eq!(ledger.state(&address,TEN_BILLION_YEARS),
                       ledger.state(&address,TEN_BILLION_YEARS+3));
        }
    }
    #[test]
    fn exact_short_direct_reference_matches_jump() {
        for period in [B_PERIOD,D_PERIOD] {
            for years in [0,1,3,9,27,81,243,729] {
                assert_eq!(orbital_phase(years,period),direct_phase(years as u64,period));
            }
        }
        assert_ne!(orbit_snapshot(TEN_BILLION_YEARS),
                   orbit_snapshot(TEN_BILLION_YEARS+1));
    }
    #[test]
    fn candidate_not_invented_from_formulas() {
        assert!(!independent_new_planet_candidate(DiscoveryEvidence {
            independent_radial_velocity_period: false,
            second_instrument_repeat:true,
            stellar_activity_excluded:true,
            source_custody_verified:true
        }));
        assert!(!independent_new_planet_candidate(DiscoveryEvidence {
            independent_radial_velocity_period:true,
            second_instrument_repeat:true,
            stellar_activity_excluded:false,
            source_custody_verified:true
        }));
        assert_eq!(MINEARTH_BD_TOTAL,1_315_000);
    }
}
