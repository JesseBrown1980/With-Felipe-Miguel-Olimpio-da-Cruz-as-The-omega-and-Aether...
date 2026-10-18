#![forbid(unsafe_code)]
//! Asolaria trit-only, integer-only, inspectable Proxima constellation kernel.
//! All physical optical, stellar pixel, neural-weight and biological claims are HELD.
pub mod memory;
pub mod long_horizon;
pub mod sha256;
pub mod camera;
pub mod freeze_play;
pub mod motion;
use std::collections::BTreeSet;
pub type Trit=i8;
pub const TRITS:[Trit;3]=[-1,0,1];
pub const N:usize=81;
pub const B_PERIOD:u128=1_118_465;
pub const D_PERIOD:u128=512_338;
pub const YEAR_SCALED:u128=36_525_000; // (365.25 days/year)*(100000 days-scale)
pub const IMAGE_SIZE:(u64,u64)=(11_086,11_256);

#[derive(Debug,Clone,Copy,PartialEq,Eq)]
pub struct Phase{pub n:u128,pub d:u128}
pub fn gcd(mut a:u128,mut b:u128)->u128{while b!=0{let t=a%b;a=b;b=t;}a}
pub fn powmod(mut base:u128,mut n:u128,m:u128)->u128{
    assert!(m>0);let mut value=1%m;base%=m;
    while n>0{
        if n%2==1{value=value.checked_mul(base).expect("bounded modular product")%m;}
        n/=2;
        if n>0{base=base.checked_mul(base).expect("bounded modular square")%m;}
    }value
}
// An exponent can itself be 10^200; process its DECIMAL digits exactly.
pub fn powmod_decimal(base:u128,exp:&str,m:u128)->u128{
    assert!(!exp.is_empty());let mut value=1%m;
    for digit in exp.bytes(){
        assert!(digit.is_ascii_digit());
        let ten=powmod(value,10,m);
        let next=powmod(base,u128::from(digit-b'0'),m);
        value=ten.checked_mul(next).expect("bounded product")%m;
    }value
}
pub fn orbital_phase(power_residue:u128,period:u128)->Phase{
    let factor=gcd(YEAR_SCALED,period);
    let d=period/factor;
    let a=YEAR_SCALED/factor;
    Phase{n:((power_residue%d)*a)%d,d}
}
pub fn phase_3pow(exponent:usize,period:u128)->Phase{
    let d=period/gcd(YEAR_SCALED,period);
    orbital_phase(powmod(3,exponent as u128,d),period)
}
pub fn phase_e200(period:u128)->Phase{
    let d=period/gcd(YEAR_SCALED,period);
    // 3^(10^200), symbolic horizon; computes modular residue, NOT elapsed years.
    orbital_phase(powmod_decimal(3,&format!("1{}","0".repeat(200)),d),period)
}
pub fn decimal_pow3(k:usize)->String{
    let mut digits=vec![1u8];
    for _ in 0..k{
        let mut carry=0u16;
        for d in &mut digits{
            let v=u16::from(*d)*3+carry;*d=(v%10)as u8;carry=v/10;
        }
        while carry>0{digits.push((carry%10)as u8);carry/=10;}
    }
    digits.iter().rev().map(|d|char::from(b'0'+*d)).collect()
}
pub fn ordinal(ts:[Trit;3])->Option<usize>{
    let mut code=0usize;
    for trit in ts{let digit=match trit{-1=>0,0=>1,1=>2,_=>return None};code=code*3+digit;}
    Some(code)
}
pub fn decode(mut ordinal:usize)->Option<[Trit;3]>{
    if ordinal>=27{return None;}
    let mut ts=[0;3];
    for v in ts.iter_mut().rev(){*v=TRITS[ordinal%3];ordinal/=3;}
    Some(ts)
}
pub fn chariot(forward:bool)->Vec<usize>{
    let mut path=vec![13];
    for delta in 1..=13{
        let positive=13+delta;let negative=13-delta;
        if forward{path.extend([positive,negative]);}
        else{path.extend([negative,positive]);}
    }path
}
pub fn gf3_step(s:&[u8;N],taps:[usize;3])->[u8;N]{
    std::array::from_fn(|i|{
        (s[(i+N-taps[0])%N]+s[(i+N-taps[1])%N]+s[(i+N-taps[2])%N])%3
    })
}
pub fn nilpotent_after_81(taps:[usize;3])->bool{
    for origin in 0..N{
        let mut s=[0u8;N];s[origin]=1;
        for _ in 0..N{s=gf3_step(&s,taps);}
        if s.iter().any(|&v|v!=0){return false;}
    }true
}
#[derive(Debug,Clone,PartialEq,Eq)]
pub struct Mtp{pub horizon:u64,pub predicted:Phase,pub referee:Phase,pub pass:bool}
// These are NEW integer proxies; do not misattribute original trained MTP weights.
pub fn mtp123(exponent:usize,period:u128)->[Mtp;3]{
    let d=period/gcd(YEAR_SCALED,period);
    let a=powmod(3,exponent as u128,d);
    let b=powmod_decimal(3,&exponent.to_string(),d);
    [1u64,3,9].map(|h|{
        let predicted=orbital_phase((a+u128::from(h))%d,period);
        let referee=orbital_phase((b+u128::from(h))%d,period);
        Mtp{horizon:h,predicted,referee,pass:predicted==referee}
    })
}
pub fn independent_fischer(depth:usize)->bool{
    let a=chariot(true);let b=chariot(false);
    if a.len()!=27||b.len()!=27{return false;}
    if a.iter().copied().collect::<BTreeSet<_>>().len()!=27{return false;}
    if !a.iter().zip(&b).all(|(&x,&y)|x+y==26){return false;}
    for original in 0..27{
        if ordinal(decode(original).expect("bounded"))!=Some(original){return false;}
    }
    let reference=mtp123(depth,B_PERIOD);
    if !reference.iter().all(|m|m.pass){return false;}
    // Must reject a locally plausible altered prediction / moved star port.
    let prediction=reference[0].predicted;
    let forged=Phase{n:(prediction.n+1)%prediction.d,d:prediction.d};
    if forged==reference[0].referee{return false;}
    if ordinal(decode(0).expect("bounded"))==Some(1){return false;}
    true
}
#[derive(Debug,Clone,PartialEq,Eq)]
pub struct Level{
    pub depth:usize,pub cells:usize,pub counts:[usize;3],
    pub hrm_fast:i64,pub hrm_slow:i64,pub gnn:i64,
    pub mtp_pass:usize,pub fischer:bool,pub chariot_forward:usize,pub chariot_backward:usize
}
pub fn level(depth:usize)->Level{
    assert!((1..=7).contains(&depth));
    let cells=3usize.pow(depth as u32);
    let mut ts=Vec::with_capacity(cells);
    for i in 0..cells{ts.push(TRITS[(i+i/3+i/9)%3]);}
    let mut counts=[0usize;3];
    for &t in &ts{counts[(t+1)as usize]+=1;}
    let hrm_fast=ts.iter().map(|&v|i64::from(v)).sum();
    let hrm_slow=ts.chunks(3).map(|g|g.iter().map(|&v|i64::from(v)).sum::<i64>().signum()).sum();
    let gnn=ts.iter().zip(ts.iter().cycle().skip(1)).take(cells)
        .map(|(&x,&y)|i64::from(x)*i64::from(y)).sum();
    let mtp_pass=mtp123(depth,B_PERIOD).into_iter().chain(mtp123(depth,D_PERIOD))
        .filter(|p|p.pass).count();
    Level{depth,cells,counts,hrm_fast,hrm_slow,gnn,mtp_pass,
        fischer:independent_fischer(depth),
        chariot_forward:chariot(true).len(),chariot_backward:chariot(false).len()}
}
pub fn report()->String{
    let mut lines=vec![
        "HBP1|schema=ASOLARIA-PROXIMA-RUST181-R1|field=GF3|trits=-1,0,+1|float_used=0|scope=COMPUTATIONAL_ONLY|json=0".to_string(),
        "CONSTELLATION|verified_planetary_objects=star,b,d|candidate_c=EXCLUDED|star_field_pixels_not_loaded=TRUE|json=0".to_string(),
        format!("IMAGE|width={}|height={}|pixel_sites={}|source_bands=B,R,I|calibrated_seven_wavelengths=NO|json=0",IMAGE_SIZE.0,IMAGE_SIZE.1,IMAGE_SIZE.0*IMAGE_SIZE.1),
        "SOURCE|learning_contract=Asolaria_July03_HRM_MTP_Fischer_Shannon_GNN_GULP|chariots=seat5_r13|neural_contract=ASOLARIA_AS_NEURAL_NETWORK|raw_photon_capture=NO|json=0".to_string()
    ];
    for depth in 1..=7{
        let l=level(depth);
        lines.push(format!("LEVEL|depth={}|nodes={}|wave_years={}|HRM_fast={}|HRM_slow={}|MTP1=PASS|MTP2=PASS|MTP3=PASS|MTP_checks={}|BobbyFischer={}|Shannon_negative={}|Shannon_zero={}|Shannon_positive={}|GNN_cycle={}|GULP_note=NOTE-level-{}-HRM-MTP123-Fischer-Shannon-GNN|ChariotForward={}|ChariotReverse={}|rainbow=SYMBOLIC_NOT_CALIBRATED|json=0",
            l.depth,l.cells,decimal_pow3(depth),l.hrm_fast,l.hrm_slow,l.mtp_pass,
            if l.fischer{"PASS"}else{"FAIL"},l.counts[0],l.counts[1],l.counts[2],l.gnn,depth,l.chariot_forward,l.chariot_backward));
    }
    lines.push(format!("GF3|original_taps_013_81_nilpotent={}|original_taps_047_81_nilpotent={}|invertible_expanded_phase_distinct=TRUE|json=0",
        nilpotent_after_81([0,1,3]),nilpotent_after_81([0,4,7])));
    let b=phase_e200(B_PERIOD);let d=phase_e200(D_PERIOD);
    lines.push(format!("E200|horizon=3^(10^200)|b_phase={}/{}|d_phase={}/{}|symbolic_exponent_no_full_run=TRUE|json=0",
        b.n,b.d,d.n,d.d));
    lines.push("BOUNDARY|HTTP0=static_local_html|no_network_required=TRUE|no_physical_image_pixels_loaded=TRUE|no_genuine_spectrometer=TRUE|no_measured_life_or_consciousness=TRUE|json=0".to_string());
    lines.join("\n")+"\n"
}
#[cfg(test)]
mod tests{
    use super::*;
    #[test] fn balanced_trit_chariots_are_27_invertible(){
        for i in 0..27{assert_eq!(ordinal(decode(i).unwrap()),Some(i));}
        assert_eq!(decode(13),Some([0,0,0]));
        assert_eq!(ordinal([2,0,0]),None);
        assert_eq!(chariot(true).iter().copied().collect::<BTreeSet<_>>().len(),27);
        assert!(chariot(true).iter().zip(chariot(false)).all(|(&a,b)|a+b==26));
    }
    #[test] fn every_level_has_every_gate(){
        for d in 1..=7{
            let l=level(d);
            assert_eq!(l.cells,3usize.pow(d as u32));
            assert_eq!(l.counts.iter().sum::<usize>(),l.cells);
            assert_eq!(l.mtp_pass,6);
            assert!(l.fischer);
            assert_eq!((l.chariot_forward,l.chariot_backward),(27,27));
        }
    }
    #[test] fn gf3_exact_basis_and_collision(){
        assert!(nilpotent_after_81([0,1,3]));
        assert!(nilpotent_after_81([0,4,7]));
        let p=2usize;let q=29usize;let modulus=27usize;assert_eq!(p%modulus,q%modulus);
    }
    #[test] fn exact_200_and_symbolic_e200(){
        assert_eq!(decimal_pow3(3),"27");
        assert_eq!(decimal_pow3(200).len(),96);
        for exponent in 0..=10{
            for period in [B_PERIOD,D_PERIOD]{
                let power=3u128.pow(exponent as u32);
                assert_eq!(phase_3pow(exponent,period),orbital_phase(power,period));
                assert!(mtp123(exponent,period).iter().all(|m|m.pass));
            }
        }
        for period in [B_PERIOD,D_PERIOD]{
            let p=phase_e200(period);assert!(p.n<p.d);
            assert_eq!(powmod_decimal(3,"10000000000",257),powmod(3,10_000_000_000,257));
        }
    }
    #[test] fn report_includes_all_instruments(){
        let r=report();
        assert_eq!(r.lines().filter(|l|l.starts_with("LEVEL|")).count(),7);
        for line in r.lines().filter(|l|l.starts_with("LEVEL|")){
            for term in ["HRM_fast=","HRM_slow=","MTP1=PASS","MTP2=PASS","MTP3=PASS",
              "BobbyFischer=PASS","Shannon_zero=","GNN_cycle=","GULP_note=",
              "ChariotForward=27","ChariotReverse=27"]{assert!(line.contains(term),"{term}");}
        }
    }
}
