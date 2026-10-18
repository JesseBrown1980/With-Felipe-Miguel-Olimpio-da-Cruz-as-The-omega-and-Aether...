#![forbid(unsafe_code)]
//! Freeze exact 2D FITS source bytes, stack observations, and frame Rainbow7 QR
//! PAYLOADS. Standard QR image rendering/decoding is a separate optical layer.
//! A FITS pixel value is an instrument sample, not a resolved physical atom.
use std::collections::BTreeMap;
use crate::sha256::digest;
#[derive(Debug,Clone,PartialEq,Eq)]
pub enum CameraError {
    MalformedFits,UnsupportedRaster,Overflow,InvalidTrit,TruncatedFrame,
    NonMonotoneExposure,NoPixels,InconsistentShape,InvalidIdentity,
    DuplicateChunk,MissingChunk,ChunkCorrupt
}
#[derive(Debug,Clone,PartialEq,Eq)]
pub struct Frame{
    pub width:usize,pub height:usize,pub bitpix:i32,pub header_length:usize,
    pub bytes_per_pixel:usize,pub sample_words:Vec<u64>,pub source_digest:[u8;32]
}
pub fn parse_primary_fits(source:&[u8])->Result<Frame,CameraError>{
    if source.len()<2880{return Err(CameraError::TruncatedFrame);}
    let mut cards=BTreeMap::<String,String>::new();
    let mut found_end=None;
    for (i,part) in source.chunks_exact(80).enumerate(){
        if i>=50000{return Err(CameraError::MalformedFits);}
        if !part.is_ascii(){return Err(CameraError::MalformedFits);}
        let key=std::str::from_utf8(&part[..8]).map_err(|_|CameraError::MalformedFits)?
            .trim().to_string();
        if key=="END"{found_end=Some(i+1);break;}
        if &part[8..10]!=b"= "{continue;}
        let value=std::str::from_utf8(&part[10..80]).map_err(|_|CameraError::MalformedFits)?
            .split('/').next().unwrap_or("").trim().to_string();
        if !key.is_empty(){cards.insert(key,value);}
    }
    let count=found_end.ok_or(CameraError::MalformedFits)?;
    let hdr=count.checked_mul(80).and_then(|n|n.checked_add(2879))
        .map(|n|n/2880*2880).ok_or(CameraError::Overflow)?;
    if source.len()<hdr{return Err(CameraError::TruncatedFrame);}
    let field=|key:&str|->Result<i64,CameraError>{
        cards.get(key).ok_or(CameraError::MalformedFits)?
            .parse::<i64>().map_err(|_|CameraError::UnsupportedRaster)
    };
    if cards.get("SIMPLE").map(String::as_str)!=Some("T")||field("NAXIS")?!=2{
        return Err(CameraError::MalformedFits);
    }
    let width=usize::try_from(field("NAXIS1")?).map_err(|_|CameraError::Overflow)?;
    let height=usize::try_from(field("NAXIS2")?).map_err(|_|CameraError::Overflow)?;
    if width==0||height==0{return Err(CameraError::NoPixels);}
    let bitpix=i32::try_from(field("BITPIX")?).map_err(|_|CameraError::UnsupportedRaster)?;
    let bpp=match bitpix{8=>1,16=>2,32|-32=>4,64|-64=>8,_=>return Err(CameraError::UnsupportedRaster)};
    // Scaling is not applied: these are raw sample WORDS, not calibrated flux.
    let n=width.checked_mul(height).ok_or(CameraError::Overflow)?;
    let total=n.checked_mul(bpp).ok_or(CameraError::Overflow)?;
    let end=hdr.checked_add(total).ok_or(CameraError::Overflow)?;
    if source.len()<end{return Err(CameraError::TruncatedFrame);}
    let mut samples=Vec::with_capacity(n);
    for byteword in source[hdr..end].chunks_exact(bpp){
        let mut value=0u64;
        for &byte in byteword{value=(value<<8)|u64::from(byte);}
        samples.push(value);
    }
    Ok(Frame{width,height,bitpix,header_length:hdr,bytes_per_pixel:bpp,
        sample_words:samples,source_digest:digest(source)})
}
pub fn trit_width(bitpix:i32)->Result<usize,CameraError>{
    match bitpix{8=>Ok(6),16=>Ok(11),32|-32=>Ok(21),64|-64=>Ok(42),
        _=>Err(CameraError::UnsupportedRaster)}
}
pub fn to_balanced(word:u64,width:usize)->Result<Vec<i8>,CameraError>{
    let mut number=i128::from(word);
    let mut trits=Vec::with_capacity(width);
    for _ in 0..width{
        let rem=number.rem_euclid(3);
        let trit=if rem==2{-1}else{rem as i8};
        number=(number-i128::from(trit))/3;
        trits.push(trit);
    }
    if number!=0{return Err(CameraError::Overflow);}
    Ok(trits)
}
pub fn from_balanced(trits:&[i8])->Result<u64,CameraError>{
    let mut number=0i128;
    let mut place=1i128;
    for &t in trits{
        if !(-1..=1).contains(&t){return Err(CameraError::InvalidTrit);}
        number=number.checked_add(i128::from(t).checked_mul(place).ok_or(CameraError::Overflow)?)
            .ok_or(CameraError::Overflow)?;
        place=place.checked_mul(3).ok_or(CameraError::Overflow)?;
    }
    u64::try_from(number).map_err(|_|CameraError::Overflow)
}
pub fn verify_exact_trit_frame(frame:&Frame)->Result<(),CameraError>{
    let width=trit_width(frame.bitpix)?;
    for &value in &frame.sample_words{
        if from_balanced(&to_balanced(value,width)?)?!=value{
            return Err(CameraError::ChunkCorrupt);
        }
    }Ok(())
}
/// The fixture simulates FITS images. Real telescope bytes are NOT used here.
pub fn synthetic_fits(width:usize,height:usize,frame_number:u64)->Vec<u8>{
    assert!(width>0&&height>0&&width*height<=10_000);
    let mut source=Vec::new();
    for (key,value) in [("SIMPLE","T".to_string()),("BITPIX","16".to_string()),
        ("NAXIS","2".to_string()),("NAXIS1",width.to_string()),
        ("NAXIS2",height.to_string())]{
        let card=format!("{key:<8}= {value:<20}");
        let mut b=card.into_bytes();b.resize(80,b' ');source.extend(b);
    }
    let mut end=b"END".to_vec();end.resize(80,b' ');source.extend(end);
    let padding=(2880-(source.len()%2880))%2880;
    source.extend(vec![b' ';padding]);
    for y in 0..height{
        for x in 0..width{
            let n=((x*277+y*71)as u64+frame_number*101)%65_536;
            source.extend((n as u16).to_be_bytes());
        }
    }
    // FITS source records are padded, but science sample payload is exact.
    let padding=(2880-(source.len()%2880))%2880;
    source.extend(vec![0; padding]);
    source
}
#[derive(Debug,Clone,PartialEq,Eq)]
pub struct PixelEvent{
    pub logical_tick:u64,pub source_tag:String,pub sample:u64,pub trits:Vec<i8>
}
#[derive(Debug,Clone,Default,PartialEq,Eq)]
pub struct CameraMemory{
    /// One pixel address *per filter*, with its own event history.
    pub addresses:BTreeMap<String,Vec<PixelEvent>>
}
impl CameraMemory{
    pub fn freeze(&mut self,frame:&Frame,tag:&str,filter:&str,tick:u64)
      ->Result<(),CameraError>{
        if tag.is_empty()||filter.is_empty()||
            !tag.bytes().all(|b|b.is_ascii_alphanumeric()||b"_.".contains(&b))||
            !filter.bytes().all(|b|b.is_ascii_alphanumeric()||b"_.".contains(&b)){
            return Err(CameraError::InvalidIdentity);
        }
        if frame.sample_words.len()!=frame.width*frame.height{
            return Err(CameraError::InconsistentShape);
        }
        let width=trit_width(frame.bitpix)?;
        let mut staged=Vec::with_capacity(frame.sample_words.len());
        for (i,&sample) in frame.sample_words.iter().enumerate(){
            let key=format!("{filter}:{}:{}",i%frame.width,i/frame.width);
            if self.addresses.get(&key).is_some_and(|items|
                items.last().is_some_and(|last|last.logical_tick>=tick)){
                return Err(CameraError::NonMonotoneExposure);
            }
            staged.push((key,PixelEvent{logical_tick:tick,source_tag:tag.to_string(),
                sample,trits:to_balanced(sample,width)?}));
        }
        for (key,event) in staged{self.addresses.entry(key).or_default().push(event);}
        Ok(())
    }
    pub fn event_count(&self)->usize{self.addresses.values().map(Vec::len).sum()}
    pub fn verify(&self)->Result<(),CameraError>{
        for history in self.addresses.values(){
            let mut previous=None;
            for e in history{
                if previous.is_some_and(|p|e.logical_tick<=p){return Err(CameraError::NonMonotoneExposure);}
                if from_balanced(&e.trits)?!=e.sample{return Err(CameraError::ChunkCorrupt);}
                previous=Some(e.logical_tick);
            }
        }Ok(())
    }
}
pub const COLOURS:[&str;7]=["violet","indigo","blue","green","yellow","orange","red"];
pub const MAX_QR_SOURCE_CHUNK:usize=2100;
/// Payload framing for seven ordinary *separate* QR symbols, one per rainbow lane.
/// This crate does NOT pretend to implement ISO QR Reed–Solomon/raster rendering.
#[derive(Debug,Clone,PartialEq,Eq)]
pub struct QrPayload{
    pub ordinal:u32,pub lane:usize,pub frame_index:usize,pub payload:Vec<u8>
}
pub fn rainbow_qr_payloads(source:&[u8])->Result<Vec<QrPayload>,CameraError>{
    let mut out=Vec::new();
    for (index,body) in source.chunks(MAX_QR_SOURCE_CHUNK).enumerate(){
        let ordinal=u32::try_from(index).map_err(|_|CameraError::Overflow)?;
        out.push(QrPayload{ordinal,lane:index%7,frame_index:index/7,
            payload:body.to_vec()});
    }Ok(out)
}
pub fn encode_transport(packet:&QrPayload)->Vec<u8>{
    let mut out=packet.ordinal.to_le_bytes().to_vec();
    out.extend(&packet.payload);out
}
pub fn rainbow_reconstruct(chunks:&[QrPayload])->Result<Vec<u8>,CameraError>{
    let mut got=BTreeMap::<u32,&[u8]>::new();
    for chunk in chunks{
        if chunk.lane!=chunk.ordinal as usize%7||
            chunk.frame_index!=chunk.ordinal as usize/7||
            chunk.payload.len()>MAX_QR_SOURCE_CHUNK{return Err(CameraError::ChunkCorrupt);}
        if got.insert(chunk.ordinal,chunk.payload.as_slice()).is_some(){
            return Err(CameraError::DuplicateChunk);
        }
    }
    let mut output=Vec::new();
    for (ordinal,body) in got{
        if usize::try_from(ordinal).map_err(|_|CameraError::Overflow)?!=
            output.len().div_ceil(MAX_QR_SOURCE_CHUNK){
            return Err(CameraError::MissingChunk);
        }
        output.extend_from_slice(body);
    }
    Ok(output)
}
/// Three leaves at each branch; pass = +1, unavailable = 0, reject = -1.
/// Scientific promotion REQUIRES provenance leaf +1, regardless of tally.
#[derive(Debug,Clone,Copy,PartialEq,Eq)]
pub enum BranchDecision{Grow,Hold}
pub fn branch_vote(leaves:[i8;3])->Result<BranchDecision,CameraError>{
    if leaves.into_iter().any(|v|!(-1..=1).contains(&v)){
        return Err(CameraError::InvalidTrit);
    }
    let accepted=leaves.into_iter().filter(|&v|v==1).count();
    Ok(if accepted>=2{BranchDecision::Grow}else{BranchDecision::Hold})
}
pub fn scientific_promotion(leaves:[i8;3],source_custody_leaf:usize)->Result<bool,CameraError>{
    if source_custody_leaf>2{return Err(CameraError::InvalidIdentity);}
    Ok(branch_vote(leaves)?==BranchDecision::Grow&&leaves[source_custody_leaf]==1)
}
#[cfg(test)]
mod tests{
    use super::*;
    #[test] fn real_fits_header_codec_and_all_pixels_roundtrip(){
        for frame_no in [1u64,2]{
            let raw=synthetic_fits(7,9,frame_no);
            let frame=parse_primary_fits(&raw).unwrap();
            assert_eq!((frame.width,frame.height,frame.bitpix),(7,9,16));
            assert_eq!(frame.source_digest,digest(&raw));
            verify_exact_trit_frame(&frame).unwrap();
            assert_eq!(frame.sample_words.len(),63);
            assert_eq!(trit_width(16),Ok(11));
        }
        let raw=synthetic_fits(7,9,1);
        let mut bad=raw.clone();bad[0]^=1;
        assert!(parse_primary_fits(&bad).is_err());
        assert!(parse_primary_fits(&raw[..3000]).is_err());
        let mut truncated=raw;truncated[2880]=42;
        assert!(parse_primary_fits(&truncated).is_ok()); // valid image changed, hash changes
    }
    #[test] fn two_2d_exposures_make_independent_histories(){
        let one=parse_primary_fits(&synthetic_fits(7,9,1)).unwrap();
        let two=parse_primary_fits(&synthetic_fits(7,9,2)).unwrap();
        let mut bank=CameraMemory::default();
        bank.freeze(&one,"SYNTH1","RED",81).unwrap();
        bank.freeze(&two,"SYNTH2","RED",243).unwrap();
        assert_eq!(bank.addresses.len(),63);
        assert_eq!(bank.event_count(),126);
        assert!(bank.addresses.values().all(|v|v.len()==2));
        bank.verify().unwrap();
        assert!(bank.freeze(&one,"SYNTH1","RED",81).is_err());
        assert_eq!(bank.event_count(),126); // failed insertion does not mutate bank
        let mut altered=bank.clone();
        altered.addresses.get_mut("RED:0:0").unwrap()[1].trits[0]^=1;
        assert!(altered.verify().is_err());
    }
    #[test] fn rainbow_qr_chunks_and_replay(){
        let source=synthetic_fits(77,88,3);
        let packets=rainbow_qr_payloads(&source).unwrap();
        assert!(packets.len()>7);
        for p in &packets {
            assert_eq!(p.lane,p.ordinal as usize%7);
            let bytes=encode_transport(p);
            assert_eq!(&bytes[..4],&p.ordinal.to_le_bytes());
            assert_eq!(&bytes[4..],p.payload);
        }
        let mut shuffled=packets.clone();shuffled.reverse();
        assert_eq!(rainbow_reconstruct(&shuffled).unwrap(),source);
        shuffled.push(packets[0].clone());
        assert_eq!(rainbow_reconstruct(&shuffled),Err(CameraError::DuplicateChunk));
        shuffled.pop();shuffled.retain(|p|p.ordinal!=3);
        assert_eq!(rainbow_reconstruct(&shuffled),Err(CameraError::MissingChunk));
    }
    #[test] fn three_leaf_branch_rule(){
        for input in [[1,1,0],[1,1,-1],[1,1,1]]{
            assert_eq!(branch_vote(input),Ok(BranchDecision::Grow));
        }
        for input in [[1,-1,0],[1,-1,-1],[0,0,1],[0,-1,-1]]{
            assert_eq!(branch_vote(input),Ok(BranchDecision::Hold));
        }
        assert_eq!(scientific_promotion([1,1,-1],2),Ok(false));
        assert_eq!(scientific_promotion([1,0,1],2),Ok(true));
        assert_eq!(branch_vote([2,1,1]),Err(CameraError::InvalidTrit));
    }
    #[test] fn balanced_trit_all_edges(){
        for bitpix in [8,16,32,64]{
            let width=trit_width(bitpix).unwrap();
            for n in [0u64,1,2,17,255,65_535,u64::MAX]{
                // Values outside a BITPIX word are invalid *input*, not failed codec.
                if bitpix<64 && (u128::from(n)>=1u128<<bitpix.unsigned_abs()){continue;}
                assert_eq!(from_balanced(&to_balanced(n,width).unwrap()),Ok(n));
            }
        }
    }
    #[test] fn source_hash_changes_on_tamper(){
        let a=synthetic_fits(7,9,1);
        let mut b=a.clone();b[2880]^=1;
        assert_ne!(crate::sha256::hex(&digest(&a)),crate::sha256::hex(&digest(&b)));
    }
}
