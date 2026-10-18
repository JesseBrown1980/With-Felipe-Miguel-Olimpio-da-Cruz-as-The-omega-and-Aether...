#![forbid(unsafe_code)]
//! Asolaria Freeze → 2D stack → recurrent projection → play at selected dates.
//! Hash receipts prove byte *consistency* of named checkpoints, not occurrence
//! of missing intermediate physical states, and not external source custody.
use crate::camera::{CameraError,CameraMemory,Frame,COLOURS,rainbow_qr_payloads,
    rainbow_reconstruct,synthetic_fits,parse_primary_fits,verify_exact_trit_frame};
use crate::sha256::{digest,hex};
#[derive(Debug,Clone,PartialEq,Eq)]
pub enum FreezeError{Camera(CameraError),NonMonotoneTick,NoPriorSnapshot,Empty,CorruptLink}
impl From<CameraError> for FreezeError{
    fn from(value:CameraError)->Self{Self::Camera(value)}
}
#[derive(Debug,Clone,PartialEq,Eq)]
pub struct FrozenPicture{
    pub logical_tick:u64,
    pub source_tag:String,
    pub filter:String,
    pub sample_digest:[u8;32],
    pub frame:Frame
}
#[derive(Debug,Clone,Default,PartialEq,Eq)]
pub struct Stack{
    pub pictures:Vec<FrozenPicture>,
    pub individual_pixel_memories:CameraMemory
}
impl Stack{
    pub fn freeze(&mut self,source:&[u8],tag:&str,filter:&str,tick:u64)
      ->Result<(),FreezeError>{
        if self.pictures.last().is_some_and(|p|p.logical_tick>=tick){
            return Err(FreezeError::NonMonotoneTick);
        }
        let frame=parse_primary_fits(source)?;
        verify_exact_trit_frame(&frame)?;
        let mut records=self.individual_pixel_memories.clone();
        records.freeze(&frame,tag,filter,tick)?;
        self.pictures.push(FrozenPicture{logical_tick:tick,source_tag:tag.to_string(),
            filter:filter.to_string(),sample_digest:digest(source),frame});
        self.individual_pixel_memories=records;
        Ok(())
    }
    /// Select latest observed frame <= requested time. Every pixel retains
    /// the full original bit pattern and its own history; a *separate* lawful
    /// 3-state visualization state is advanced by integer tick modular 3.
    pub fn play(&self,tick:u64)->Result<Played,FreezeError>{
        let chosen=self.pictures.iter().rev().find(|p|p.logical_tick<=tick)
            .ok_or(FreezeError::NoPriorSnapshot)?;
        let elapsed=tick-chosen.logical_tick;
        let mut original_projection=Vec::with_capacity(chosen.frame.sample_words.len());
        let mut projected=Vec::with_capacity(chosen.frame.sample_words.len());
        for &sample in &chosen.frame.sample_words{
            let trit=(sample%3)as i8-1;
            original_projection.push(trit);
            projected.push(((i64::from(trit)+i64::try_from(elapsed%3).expect("<=2")+1)
                .rem_euclid(3)-1) as i8);
        }
        let digest0=digest(&original_projection.iter().map(|v|(*v+1)as u8).collect::<Vec<_>>());
        let digest1=digest(&projected.iter().map(|v|(*v+1)as u8).collect::<Vec<_>>());
        Ok(Played{tick,previous_observation_tick:chosen.logical_tick,
            source_tag:chosen.source_tag.clone(),source_digest:chosen.sample_digest,
            width:chosen.frame.width,height:chosen.frame.height,
            original_state_digest:digest0,projected_state_digest:digest1,
            projected_trits:projected})
    }
}
#[derive(Debug,Clone,PartialEq,Eq)]
pub struct Played{
    pub tick:u64,pub previous_observation_tick:u64,pub source_tag:String,
    pub source_digest:[u8;32],pub width:usize,pub height:usize,
    pub original_state_digest:[u8;32],pub projected_state_digest:[u8;32],
    pub projected_trits:Vec<i8>
}
#[derive(Debug,Clone,PartialEq,Eq)]
pub struct Checkpoint{
    pub tick:u64,pub source_digest:[u8;32],pub state_digest:[u8;32],
    pub prev_digest:[u8;32],pub digest:[u8;32]
}
pub fn receipt_digest(prev:[u8;32],tick:u64,source:[u8;32],state:[u8;32])->[u8;32]{
    let mut bytes=b"ASOLARIA-FREEZE-PLAY-CHECKPOINT-V1\0".to_vec();
    bytes.extend(prev);
    bytes.extend(tick.to_le_bytes());
    bytes.extend(source);
    bytes.extend(state);
    digest(&bytes)
}
pub fn checkpoints(stack:&Stack,times:&[u64])->Result<Vec<Checkpoint>,FreezeError>{
    let mut prior_time=None;
    let mut prev=[0;32];
    let mut out=Vec::new();
    for &time in times{
        if prior_time.is_some_and(|v|time<=v){return Err(FreezeError::NonMonotoneTick);}
        let played=stack.play(time)?;
        let hash=receipt_digest(prev,time,played.source_digest,played.projected_state_digest);
        out.push(Checkpoint{tick:time,source_digest:played.source_digest,
            state_digest:played.projected_state_digest,prev_digest:prev,digest:hash});
        prev=hash;prior_time=Some(time);
    }
    Ok(out)
}
pub fn verify_checkpoints(stack:&Stack,rows:&[Checkpoint])->Result<(),FreezeError>{
    let times=rows.iter().map(|v|v.tick).collect::<Vec<_>>();
    let expected=checkpoints(stack,&times)?;
    if rows!=expected{return Err(FreezeError::CorruptLink);}
    Ok(())
}
pub fn synthetic_freeze_play_receipt()->Result<(String,Vec<u8>),FreezeError>{
    let frame_a=synthetic_fits(7,9,1);
    let frame_b=synthetic_fits(7,9,2);
    let mut stack=Stack::default();
    stack.freeze(&frame_a,"SYNTH1","RED",81)?;
    stack.freeze(&frame_b,"SYNTH2","RED",243)?;
    stack.individual_pixel_memories.verify()?;
    if stack.individual_pixel_memories.addresses.len()!=63||
       stack.individual_pixel_memories.event_count()!=126{
        return Err(FreezeError::CorruptLink);
    }
    let payloads=rainbow_qr_payloads(&frame_a)?;
    if rainbow_reconstruct(&payloads)?!=frame_a{return Err(FreezeError::CorruptLink);}
    let times=[81,243,729,2187,10_000_000_000];
    let receipt=checkpoints(&stack,&times)?;
    verify_checkpoints(&stack,&receipt)?;
    let mut text=String::from("HBP1|schema=ASOLARIA-FREEZE-PLAY-R4|field=GF3|Rust=1.81|float_used=0|observed_camera=NONE|json=0\n");
    text.push_str(&format!("FITS|width=7|height=9|bitpix=16|source_kind=SYNTHETIC|frames=2|source1_sha256={}|source2_sha256={}|json=0\n",
        hex(&digest(&frame_a)),hex(&digest(&frame_b))));
    text.push_str("STACK|individually_addressed_pixels=63|individually_retained_exposures=126|source_ticks=81,243|HRM_source_note=SIMULATED|json=0\n");
    text.push_str(&format!("RAINBOW_QR|lanes={}|plane_mode=SEVEN_SEPARATE_STANDARD_QR_PAYLOADS|chunk_bytes=2100|chunk_count={}|source_order_uint32_le=TRUE|independent_readback=PASS|QR_raster_encoded_in_Rust=NO|json=0\n",
        COLOURS.join(","),payloads.len()));
    text.push_str("CHART|every_level=HRM_MTP1_MTP2_MTP3_FISCHER_SHANNON_GNN_GULP_CHARIOTS|this_test=SOURCE_CODEC_ONLY|json=0\n");
    for item in &receipt{
        let selected=stack.play(item.tick)?;
        let visible=selected.projected_trits.iter().filter(|&&t|t==1).count();
        text.push_str(&format!("PLAY|tick={}|source_tick={}|projected_positive_trits={}|source_sha256={}|state_sha256={}|previous_checkpoint_sha256={}|checkpoint_sha256={}|skipped_logic=EXACT_FIXED_ORDER3|json=0\n",
            item.tick,selected.previous_observation_tick,visible,
            hex(&item.source_digest),hex(&item.state_digest),
            hex(&item.prev_digest),hex(&item.digest)));
    }
    for (name,votes) in [("all_accepted",[1,1,1]),("two_accepted",[1,1,-1]),
          ("two_bad",[1,0,-1]),("two_rejected",[1,-1,-1])]{
        let decision=crate::camera::branch_vote(votes)?;
        let promoted=crate::camera::scientific_promotion(votes,2)?;
        text.push_str(&format!("BRANCH|name={}|leaf1={}|leaf2={}|leaf3={}|grow={:?}|scientific_promotion={}|json=0\n",
            name,votes[0],votes[1],votes[2],decision,promoted));
    }
    text.push_str("BOUNDARY|camera_raw_proxima_acquisition=NOT_DONE|rainbow_channels_not_calibrated_wavelengths|hashes_not_external_signatures|no_physical_10Gyr_elapsed|no_new_planet=TRUE|json=0\n");
    // Return *one* original FITS fixture for independent Python oracle.
    Ok((text,frame_a))
}
#[cfg(test)]
mod tests{
    use super::*;
    #[test] fn freeze_two_pictures_and_skip_play_back(){
        let a=synthetic_fits(7,9,1);
        let b=synthetic_fits(7,9,2);
        let mut stack=Stack::default();
        stack.freeze(&a,"SYNTH1","RED",81).unwrap();
        stack.freeze(&b,"SYNTH2","RED",243).unwrap();
        assert_eq!(stack.individual_pixel_memories.event_count(),126);
        assert!(stack.freeze(&a,"OLD","RED",81).is_err());
        assert_eq!(stack.pictures.len(),2);
        assert_eq!(stack.play(80),Err(FreezeError::NoPriorSnapshot));
        let from_start=stack.play(81).unwrap();
        let after3=stack.play(84).unwrap();
        assert_eq!(from_start.projected_trits,after3.projected_trits);
        let later=stack.play(10_000_000_000).unwrap();
        let plus3=stack.play(10_000_000_003).unwrap();
        assert_eq!(later.projected_trits,plus3.projected_trits);
        // Direct 243 updates for one individual trit agree with exact modular skip.
        let mut trit=from_start.projected_trits[0];
        for _ in 0..243{trit=((i64::from(trit)+2).rem_euclid(3)-1) as i8;}
        assert_eq!(trit,from_start.projected_trits[0]);
    }
    #[test] fn time_labels_and_hasher_tamper_falsifiers(){
        let mut bank=Stack::default();
        let a=synthetic_fits(7,9,1);
        bank.freeze(&a,"SYNTH1","RED",81).unwrap();
        let rows=checkpoints(&bank,&[81,243,729,10_000_000_000]).unwrap();
        verify_checkpoints(&bank,&rows).unwrap();
        let mut altered=rows.clone();altered[1].tick+=1;
        assert_eq!(verify_checkpoints(&bank,&altered),Err(FreezeError::CorruptLink));
        let mut altered=rows.clone();altered[0].source_digest[0]^=1;
        assert_eq!(verify_checkpoints(&bank,&altered),Err(FreezeError::CorruptLink));
        let mut altered=rows.clone();altered[2].digest[0]^=1;
        assert_eq!(verify_checkpoints(&bank,&altered),Err(FreezeError::CorruptLink));
        assert!(checkpoints(&bank,&[81,81]).is_err());
        // New timestamp changes the hash even if no physical image state changed.
        assert_ne!(receipt_digest([0;32],81,[1;32],[2;32]),
                   receipt_digest([0;32],243,[1;32],[2;32]));
    }
    #[test] fn receipt_is_computed_from_real_rust_fixture(){
        let (text,a)=synthetic_freeze_play_receipt().unwrap();
        assert!(text.contains("FRAME")||text.contains("FITS"));
        assert!(text.contains("BRANCH|name=two_rejected"));
        assert_eq!(a.len()%2880,0);
        assert_eq!(text.lines().filter(|s|s.starts_with("PLAY|")).count(),5);
    }
}
