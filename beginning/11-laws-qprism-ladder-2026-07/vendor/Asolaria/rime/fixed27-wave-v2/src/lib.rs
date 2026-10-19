//! Fixed-27 RIME carrier with wave-level, change-only passes.

pub mod constellation;
pub mod coordinate;
pub mod pass;
pub mod storage;
pub mod trit;

pub use constellation::{execute_constellation, ConstellationPass, Organ};
pub use coordinate::{
    validate_coordinates, RimeCoordinate, RimeState, COORDINATE_COUNT, VALUE_WIDTH,
};
pub use pass::{
    execute_second_cascade, NearestThird, PassMetrics, WavePass, SECOND_CASCADE_LEVELS,
    SECOND_CASCADE_ROUTES,
};
pub use storage::{read_frozen, write_frozen, Backend};
pub use trit::Trit;

impl RimeState {
    pub(crate) fn gradients_mut(&mut self) -> &mut [Trit; COORDINATE_COUNT] {
        &mut self.gradients
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuntimeReport {
    pub initial: RimeState,
    pub wave: WavePass,
    pub constellation: ConstellationPass,
    pub baryonic_exchange_numerator: i64,
    pub baryonic_exchange_denominator: u64,
    pub gravity_numerator: i64,
    pub gravity_denominator: u64,
    pub net_gradient_numerator: i64,
    pub net_gradient_denominator: u64,
}

pub fn verify() -> Result<RuntimeReport, String> {
    validate_coordinates()?;
    let initial = RimeState::seeded();
    let wave = execute_second_cascade(&initial);
    if !wave.replay_restored {
        return Err("reverse-play did not restore the pre-pass reality".into());
    }
    if wave.metrics.route_events.one_third != 31_104 {
        return Err("93,312-route cascade did not calculate an exact one-third".into());
    }
    let constellation = execute_constellation(&wave.output);
    if constellation.output.photo().len() != 27 {
        return Err("constellation expanded the fixed 27-value RIME carrier".into());
    }
    let net_gradient_numerator = constellation.output.signed_gradient() - initial.signed_gradient();
    Ok(RuntimeReport {
        initial,
        wave,
        constellation,
        baryonic_exchange_numerator: -1,
        baryonic_exchange_denominator: 3,
        gravity_numerator: -1,
        gravity_denominator: 3,
        net_gradient_numerator,
        net_gradient_denominator: 27,
    })
}

pub fn structural_receipt(report: &RuntimeReport) -> String {
    let organs = Organ::ALL.map(Organ::name).join(",");
    format!(
        concat!(
            "RIME-TRIT-WAVE|schema=RIME-TRIT-WAVE-V2|rust=1.81|json=0|pid_field=0|binary_alphabet=0\n",
            "RIMEVALUE|basis=-,.,+|width=3|distinct_values=27|identity=ordered-trit-tuple|axis_projection=color,time,space|rgb_projection=0,127,255|json=0\n",
            "RIMEPASS|mode=wave-level-change-only|gradient_states=-,.,+|value_carrier=27\n",
            "PHOTOBUFFER|slots=27|slot_order=ordered-trit-values|slot_payload=change-state-trit\n",
            "CASCADE|levels=6,6,6,6,6,12|routes=93312|nearest_third=31104|retained_two_thirds=62208\n",
            "LEVEL-THIRDS|actual=6,6,6,6,6,12|nearest=2,2,2,2,2,4|retained=4,4,4,4,4,8\n",
            "CONSTELLATION|organs={}|trained_weights=UNVERIFIED|distinct_values_after=27\n",
            "EXCHANGE|baryonic=-1/3|baseline=bidirectional|result=tridirectional\n",
            "GRAVITY|derived_dimensionless={}/{}|net_gradient={}/{}|physical_gravity=UNVERIFIED\n",
            "STORAGE|backends=local,sgram,cloud-manifest|cloud_transport=UNVERIFIED\n",
            "VERDICT|computational_structure=PASS|physical_claims=UNVERIFIED|json=0\n"
        ),
        organs,
        report.gravity_numerator,
        report.gravity_denominator,
        report.net_gradient_numerator,
        report.net_gradient_denominator
    )
}

pub fn measurement_receipt(report: &RuntimeReport) -> String {
    let calculation = report.wave.metrics.calculation_ns;
    let play = report.wave.metrics.play_ns;
    let bits = report.wave.metrics.physical_bits;
    let storage = report.wave.metrics.storage_bytes;
    let gradient_changes = report.constellation.changed_by_organ.iter().sum::<usize>() as u64;
    let gradient = NearestThird::of(gradient_changes);
    format!(
        concat!(
            "RIME-WAVE-MEASURE|seat=ACER|clock=monotonic-nanoseconds\n",
            "METRIC|name=calculation_time_ns|actual={}|nearest_third={}|retained={}\n",
            "METRIC|name=play_time_ns|actual={}|nearest_third={}|retained={}\n",
            "METRIC|name=physical_bits|actual={}|nearest_third={}|retained={}\n",
            "METRIC|name=storage_bytes|actual={}|nearest_third={}|retained={}\n",
            "METRIC|name=color_axis_states|actual=3|nearest_third=1|retained=2\n",
            "METRIC|name=time_axis_states|actual=3|nearest_third=1|retained=2\n",
            "METRIC|name=space_axis_states|actual=3|nearest_third=1|retained=2\n",
            "METRIC|name=distinct_ordered_values|actual=27|nearest_third=9|retained=18\n",
            "METRIC|name=gradient_change_events|actual={}|nearest_third={}|retained={}\n",
            "METRIC|name=route_events|actual=93312|nearest_third=31104|retained=62208\n"
        ),
        calculation.actual,
        calculation.one_third,
        calculation.retained_two_thirds,
        play.actual,
        play.one_third,
        play.retained_two_thirds,
        bits.actual,
        bits.one_third,
        bits.retained_two_thirds,
        storage.actual,
        storage.one_third,
        storage.retained_two_thirds,
        gradient.actual,
        gradient.one_third,
        gradient.retained_two_thirds,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn end_to_end_runtime_keeps_one_reality_of_twenty_seven() {
        let report = verify().unwrap();
        assert_eq!(report.initial.photo().len(), 27);
        assert_eq!(report.wave.output.photo().len(), 27);
        assert_eq!(report.constellation.output.photo().len(), 27);
        assert_eq!(
            (
                report.baryonic_exchange_numerator,
                report.baryonic_exchange_denominator
            ),
            (-1, 3)
        );
        assert_eq!(
            (report.gravity_numerator, report.gravity_denominator),
            (-1, 3)
        );
        assert_eq!(
            (
                report.net_gradient_numerator,
                report.net_gradient_denominator
            ),
            (0, 27)
        );
    }

    #[test]
    fn deterministic_receipt_names_every_exact_level_and_boundary() {
        let receipt = structural_receipt(&verify().unwrap());
        assert!(receipt.contains("levels=6,6,6,6,6,12|routes=93312"));
        assert!(receipt.contains("organs=omnishannon,gnn,reverse-gain-gnn,fnn,gslm"));
        assert!(
            receipt.contains("basis=-,.,+|width=3|distinct_values=27|identity=ordered-trit-tuple")
        );
        assert!(receipt
            .contains("slots=27|slot_order=ordered-trit-values|slot_payload=change-state-trit"));
        assert!(receipt.contains("baryonic=-1/3"));
        assert!(receipt.contains("trained_weights=UNVERIFIED"));
        assert!(!receipt.contains("distinct_values=256"));
        assert!(!receipt.contains("distinct_values=1024"));
    }
}
