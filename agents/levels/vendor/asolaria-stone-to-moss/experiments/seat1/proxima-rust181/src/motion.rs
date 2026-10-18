#![forbid(unsafe_code)]
//! Nine-jump exact integer 2D motion: detect aliasing of 3-power samples.
//! Solar-wind-like impulse is SYNTHETIC, not a claim about Proxima or black holes.
use crate::camera::{branch_vote,scientific_promotion,BranchDecision};
use crate::freeze_play::receipt_digest;
use crate::sha256::{digest,hex};
pub const WIDTH:u128=81;
pub const CHANGE_TICK:u64=1000;
pub const NINE_JUMPS:[u64;9]=[
    81,243,729,2_187,6_561,19_683,59_049,177_147,531_441
];
#[derive(Debug,Clone,Copy,PartialEq,Eq)]
pub struct Point{pub x:u8,pub y:u8}
pub fn position(tick:u64,impulse:bool)->Point{
    let t=u128::from(tick);
    let elapsed=if impulse&&tick>CHANGE_TICK {
        t-u128::from(CHANGE_TICK)
    }else{0};
    Point{x:((13+2*t+3*elapsed)%WIDTH)as u8,
          y:((26+5*t+2*elapsed)%WIDTH)as u8}
}
pub fn direct_bounded(tick:u64,impulse:bool)->Point{
    let mut p=Point{x:13,y:26};
    for n in 1..=tick{
        let changed=impulse&&n>CHANGE_TICK;
        p.x=((u16::from(p.x)+if changed{5}else{2})%81)as u8;
        p.y=((u16::from(p.y)+if changed{7}else{5})%81)as u8;
    }
    p
}
pub fn difference(a:u8,b:u8)->u8{
    ((u16::from(a)+81-u16::from(b))%81)as u8
}
#[derive(Debug,Clone,PartialEq,Eq)]
pub struct JumpObservation{
    pub rung:usize,pub tick:u64,pub baseline:Point,pub observed:Point,
    pub offset1:Point,pub offset2:Point,pub velocity:Point,
    pub mismatch:bool,pub branch:BranchDecision,
    pub prev_hash:[u8;32],pub state_hash:[u8;32],pub hash:[u8;32]
}
pub fn nine_observations()->Vec<JumpObservation>{
    let mut rows=Vec::new();
    let mut previous=[0u8;32];
    let source=digest(b"ASOLARIA-R5-SYNTHETIC-2D-ORBIT-SURROGATE-WIND-PULSE-1000");
    for (rung,&tick) in NINE_JUMPS.iter().enumerate(){
        let baseline=position(tick,false);
        let observed=position(tick,true);
        let offset1=position(tick+1,true);
        let offset2=position(tick+2,true);
        let velocity=Point{
            x:difference(offset1.x,observed.x),
            y:difference(offset1.y,observed.y)
        };
        let mismatch=baseline!=observed;
        let votes=if mismatch{[-1,1,-1]}else{[1,1,-1]};
        let branch=branch_vote(votes).expect("fixed valid signed trits");
        assert!(!scientific_promotion(votes,2).expect("no unverified promotion"));
        let state_hash=digest(&[observed.x,observed.y]);
        let hash=receipt_digest(previous,tick,source,state_hash);
        rows.push(JumpObservation{
            rung,tick,baseline,observed,offset1,offset2,velocity,
            mismatch,branch,prev_hash:previous,state_hash,hash
        });
        previous=hash;
    }
    rows
}
pub fn emit()->(String,String){
    let rows=nine_observations();
    let mut csv=String::from("rung,logical_tick,baseline_x,baseline_y,observed_x,observed_y,offset1_x,offset1_y,offset2_x,offset2_y,velocity_x,velocity_y,baseline_failure,branch,source_physical,checkpoint_sha256\n");
    let mut hbp=String::from(
        "HBP1|schema=ASOLARIA-NINE-JUMP-MOTION-R5|field=GF3|Rust=1.81|float_used=0|camera_source=SYNTHETIC_ONLY|json=0\n"
    );
    hbp.push_str("CONTRACT|fixed_grid=81x81|synthetic_motion=velocity_2_5|impulse_tick=1000|post_impulse_velocity=5_7|black_hole_orbit=NOT_OBSERVED|stellar_wind=MODELED_ONLY|json=0\n");
    for p in &rows{
        let vote=if p.mismatch{"Hold"}else{"Grow"};
        assert_eq!(format!("{:?}",p.branch),vote);
        use std::fmt::Write as _;
        writeln!(csv,"{},{},{},{},{},{},{},{},{},{},{},{},{},{},false,{}",
            p.rung,p.tick,p.baseline.x,p.baseline.y,p.observed.x,p.observed.y,
            p.offset1.x,p.offset1.y,p.offset2.x,p.offset2.y,p.velocity.x,p.velocity.y,
            p.mismatch,vote,hex(&p.hash)).expect("CSV");
        writeln!(hbp,"JUMP|rung={}|tick={}|reference={}:{}|observed={}:{}|velocity={}:{}|baseline_failure={}|branch={}|source_custody=UNVERIFIED|state_sha256={}|prev_sha256={}|linked_sha256={}|json=0",
            p.rung,p.tick,p.baseline.x,p.baseline.y,p.observed.x,p.observed.y,
            p.velocity.x,p.velocity.y,p.mismatch,vote,
            hex(&p.state_hash),hex(&p.prev_hash),hex(&p.hash)).expect("HBP");
    }
    let failures=rows.iter().filter(|p|p.mismatch).count();
    let holds=rows.iter().filter(|p|p.branch==BranchDecision::Hold).count();
    hbp.push_str(&format!("SUMMARY|sampled_rungs=9|baseline_pass={}|baseline_fail={failures}|held_branches={holds}|repeat_positions_does_not_prove_rest=TRUE|interleaved_plus1_plus2_detect_motion=TRUE|json=0\n",rows.len()-failures));
    let future=position(10_000_000_000,true);
    let periodic=position(10_000_000_000+81,true);
    assert_eq!(future,periodic);
    hbp.push_str(&format!("FASTFORWARD|logical_ticks=10000000000|point={}:{}|plus81={}:{}|periodic_persistence=PASS|computed_by_EXACT_PIECEWISE_ARITHMETIC=TRUE|real_elapsed_10Gyr=FALSE|json=0\n",
        future.x,future.y,periodic.x,periodic.y));
    hbp.push_str("BOUNDARY|independent_real_astrometry=NONE|new_planet=NONE|simulated_force_does_not_establish_actual_solar_wind_or_black_hole|time_hash_link_not_observation_authentication|json=0\n");
    (csv,hbp)
}
#[cfg(test)]
mod tests{
    use super::*;
    #[test] fn direct_small_steps_match_matrix_piecewise_jump(){
        for n in 0..=1200{
            assert_eq!(position(n,false),direct_bounded(n,false));
            assert_eq!(position(n,true),direct_bounded(n,true));
        }
        assert_eq!(position(10_000_000_000,true),position(10_000_000_081,true));
    }
    #[test] fn nine_rungs_show_alias_and_six_falsifications(){
        let data=nine_observations();
        assert_eq!(data.len(),9);
        assert_eq!(data.iter().filter(|v|!v.mismatch).count(),3);
        assert_eq!(data.iter().filter(|v|v.mismatch).count(),6);
        assert_eq!(data.iter().filter(|v|v.branch==BranchDecision::Hold).count(),6);
        for row in data{
            assert_eq!(row.baseline,Point{x:13,y:26});
            assert_eq!(row.observed,if row.tick<=729{Point{x:13,y:26}}
                else{Point{x:10,y:51}});
            assert_eq!(row.velocity,if row.tick<=729{Point{x:2,y:5}}
                else{Point{x:5,y:7}});
            assert_eq!(difference(row.offset2.x,row.offset1.x),row.velocity.x);
            assert_eq!(difference(row.offset2.y,row.offset1.y),row.velocity.y);
        }
    }
    #[test] fn hash_digest_timelabel_is_not_past_state(){
        let rows=nine_observations();
        let source=digest(b"ASOLARIA-R5-SYNTHETIC-2D-ORBIT-SURROGATE-WIND-PULSE-1000");
        let mut prior=[0;32];
        for p in &rows{
            assert_eq!(p.prev_hash,prior);
            assert_eq!(p.hash,receipt_digest(prior,p.tick,source,p.state_hash));
            let fake=receipt_digest(prior,p.tick+1,source,p.state_hash);
            assert_ne!(fake,p.hash);
            prior=p.hash;
        }
    }
}
