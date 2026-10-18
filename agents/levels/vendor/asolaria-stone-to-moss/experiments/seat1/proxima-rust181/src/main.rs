#![forbid(unsafe_code)]
//! Reproducible hosted-CPU run. Source physics measurements are not fabricated.
use asolaria_proxima_ternary::{B_PERIOD,D_PERIOD,decimal_pow3,phase_3pow,report};
use asolaria_proxima_ternary::memory::{self,Ledger};
use std::{env,fs,io,path::Path,time::Instant};
fn main()->io::Result<()>{
    let started=Instant::now();
    let destination=env::args().nth(1).unwrap_or_else(||"out".to_string());
    let dir=Path::new(&destination);
    fs::create_dir_all(dir)?;
    let hbp=report();
    assert_eq!(hbp.lines().filter(|x|x.starts_with("LEVEL|")).count(),7);
    assert!(!hbp.contains("BobbyFischer=FAIL"));
    fs::write(dir.join("ASOLARIA-PROXIMA-RUST181.hbp"),hbp)?;
    let mut csv=String::from("exponent,years_exact,b_phase_numerator,b_phase_denominator,d_phase_numerator,d_phase_denominator,field,method,observed_photons\n");
    for exponent in 1..=200{
        let years=decimal_pow3(exponent);
        let b=phase_3pow(exponent,B_PERIOD);
        let d=phase_3pow(exponent,D_PERIOD);
        use std::fmt::Write as _;
        writeln!(csv,"{exponent},{years},{},{},{},{},GF3,EXACT_MODULAR_FAST_FORWARD,false",b.n,b.d,d.n,d.d).expect("write string");
    }
    fs::write(dir.join("EPOCHS-RUST181.csv"),csv)?;
    // Separate physical CPU execution from external astronomical truth.
    // 81 distinct particles each retain their 27 *own* observation events.
    let original=memory::synthetic_memory_fixture().expect("memory test fixture");
    let persisted=original.save_text();
    let restored=Ledger::load_text(&persisted).expect("particle histories reconstruct");
    assert_eq!(original,restored);
    assert_eq!(original.materialized(),81);
    assert_eq!(original.note_count(),2187);
    fs::write(dir.join("PARTICLE-MEMORY-R1.ledger"),persisted)?;
    let high_address="+".repeat(180);
    let virtual_at_0=memory::virtual_state(&high_address,0).expect("180-trit address");
    let virtual_at_1=memory::virtual_state(&high_address,1).expect("180-trit address");
    let mut memory_report=String::from("MEMORY|schema=ASOLARIA-PER-PARTICLE-MEMORY-V1|trits=-1,0,+1|fixture=SYNTHETIC|source_2d_raw=UNAVAILABLE|json=0\n");
    memory_report.push_str(&format!("ADDR|depth=180|possible_identifiers=3^180|exact_decimal={}|materialized_in_benchmark=0|virtual_initial={}|virtual_next={}|json=0\n",decimal_pow3(180),virtual_at_0,virtual_at_1));
    memory_report.push_str("LEDGER|independent_particles=81|stored_events=2187|per_particle_events=27|serialize_and_reload=PASS|json=0\n");
    for depth in 1..=7usize {
        let address=memory::base3_address(0,depth).expect("level address");
        let _ = original.state(&address,81).expect("address is valid");
        memory_report.push_str(&format!("DEPTH|depth={depth}|address={address}|memory_namespace=PER_PARTICLE|FischerReplay=PASS|json=0\n"));
    }
    memory_report.push_str("BOUNDARY|independent_observations_per_virtual_address=NOT_ASSUMED|capacity_not_allocated_memory|json=0\n");
    fs::write(dir.join("PARTICLE-MEMORY-R1.hbp"),memory_report)?;
    // 10 billion model-year matrix jump uses the declared order-three recurrence
    // and every particle's own persisted history, not one global memory.
    let (history,ten_gyr)=asolaria_proxima_ternary::long_horizon::individual_memory_witness()
        .expect("separately retained particle histories at the target horizon");
    assert_eq!(history,restored);
    fs::write(dir.join("TEN-BILLION-YEAR-R1.hbp"),ten_gyr)?;
    let (freeze_receipt,synthetic_fits)=asolaria_proxima_ternary::freeze_play::synthetic_freeze_play_receipt()
        .expect("freeze two 2D frames with time-linked SHA and exact replay");
    fs::write(dir.join("FREEZE-PLAY-R4.hbp"),freeze_receipt)?;
    fs::write(dir.join("SYNTHETIC-FITS-R4.fits"),synthetic_fits)?;
    let qr_fixture=asolaria_proxima_ternary::camera::synthetic_fits(77,88,3);
    let chunks=asolaria_proxima_ternary::camera::rainbow_qr_payloads(&qr_fixture)
        .expect("QR payload encoding");
    let mut qr_tsv=String::from("index\tlane\tcolor\tsource_size\tindexed_chunk_hex\n");
    for chunk in &chunks{
        let bytes=asolaria_proxima_ternary::camera::encode_transport(chunk);
        qr_tsv.push_str(&format!("{}\t{}\t{}\t{}\t{}\n",
            chunk.ordinal,chunk.lane,asolaria_proxima_ternary::camera::COLOURS[chunk.lane],
            chunk.payload.len(),asolaria_proxima_ternary::sha256::hex(&bytes)));
    }
    fs::write(dir.join("RAINBOW-QR-R4.tsv"),qr_tsv)?;
    let (motion_csv,motion_hbp)=asolaria_proxima_ternary::motion::emit();
    fs::write(dir.join("NINE-JUMP-MOTION-R5.csv"),motion_csv)?;
    fs::write(dir.join("NINE-JUMP-MOTION-R5.hbp"),motion_hbp)?;
    fs::write(dir.join("RUNTIME.hbp"),format!(
        "RUNTIME|hosted_os={}|arch={}|elapsed_ns={}|physical_device=HOSTED_CPU|distinct_host_custody=UNATTESTED|instrumented_optics=NONE|json=0\n",
        env::consts::OS,env::consts::ARCH,started.elapsed().as_nanos()))?;
    println!("ASOLARIA_RUST181_TERNARY_PASS levels=7 epochs=200 actual_cpu_instructions=TRUE");
    Ok(())
}
