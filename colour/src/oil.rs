//! Port of FOLLOW @8712368 `codes/double_rainbow_to_gguf.py`: the integer colour-state descriptor
//! of 64 sampled 16x12 RGB frames (integer luma, 12-bin integer hue, spatial and temporal
//! gradients, shares), its signed-i8 encoding, the exact 3,174-byte GGUF and the HBP receipt.
//! Frame sampling itself runs in ffmpeg upstream (`:175-223`) and is not part of this port.

use crate::gguf::{self, Value};
use crate::sha256_hex;

/// `TARGET_BYTES` (`:33`).
pub const TARGET_BYTES: usize = 3_174;
/// `SAMPLE_COUNT` (`:34`).
pub const SAMPLE_COUNT: usize = 64;
/// `SAMPLE_WIDTH` (`:35`).
pub const SAMPLE_WIDTH: usize = 16;
/// `SAMPLE_HEIGHT` (`:36`).
pub const SAMPLE_HEIGHT: usize = 12;
/// `PIXELS_PER_SAMPLE` (`:37`).
pub const PIXELS_PER_SAMPLE: usize = SAMPLE_WIDTH * SAMPLE_HEIGHT;
/// `SOURCE_URL` (`:39`).
pub const SOURCE_URL: &str = "https://www.youtube.com/watch?v=OQSNhk5ICTI";
/// `SOURCE_ID` (`:40`).
pub const SOURCE_ID: &str = "OQSNhk5ICTI";
/// `SOURCE_TITLE` (`:41`).
pub const SOURCE_TITLE: &str = "Yosemitebear Mountain Double Rainbow 1-8-10";
/// `SCHEMA` (`:42`).
pub const SCHEMA: &str = "ASOLARIA-DOUBLE-RAINBOW-COLOR-STATE-V1";
/// `FIELD_NAMES` (`:44-63`).
pub const FIELD_NAMES: [&str; 18] = [
    "mean_r",
    "mean_g",
    "mean_b",
    "mean_luma",
    "mean_chroma",
    "mean_saturation",
    "oil_amplitude",
    "spatial_gradient",
    "temporal_gradient",
    "negative_share",
    "centre_share",
    "positive_share",
    "red_dominance",
    "green_dominance",
    "blue_dominance",
    "warm_share",
    "cool_share",
    "hue_coverage",
];
/// The recipe string `sample_rgb` returns (`:218-222`).
pub const RECIPE: &str = "frame_index=nearest(i*(frame_count-1)/63),i=0..63;\
                          ffmpeg_select;scale=16:12:flags=area;format=rgb24;\
                          descriptor=ASOLARIA-DOUBLE-RAINBOW-COLOR-STATE-V1";
/// File name of the GGUF (`:66`).
pub const GGUF_NAME: &str = "DOUBLE-RAINBOW-OIL-3174.gguf";

/// One descriptor: the 18 fields, each in `0..=255`.
pub type Descriptor = [u8; 18];

/// `uniform_frame_indices` (`:159-166`).
pub fn uniform_frame_indices(frame_count: u64) -> Vec<u64> {
    let last = frame_count - 1;
    let denominator = SAMPLE_COUNT as u64 - 1;
    (0..SAMPLE_COUNT as u64)
        .map(|sample| (sample * last + denominator / 2) / denominator)
        .collect()
}

/// `rounded_mean` (`:226-227`).
pub fn rounded_mean(total: u64, count: u64) -> u64 {
    (total + count / 2) / count
}

/// `share` (`:230-231`).
pub fn share(count: u64, total: u64) -> u64 {
    (count * 255 + total / 2) / total
}

/// `luma` (`:234-236`): `(54 R + 183 G + 19 B + 128) // 256`.
pub fn luma(pixel: [u8; 3]) -> u8 {
    let [r, g, b] = pixel.map(u32::from);
    ((54 * r + 183 * g + 19 * b + 128) / 256) as u8
}

/// `hue_bin` (`:239-254`): one of 12 integer hue bins, `None` for chroma below 12.
pub fn hue_bin(pixel: [u8; 3]) -> Option<u8> {
    let [red, green, blue] = pixel.map(i32::from);
    let high = red.max(green).max(blue);
    let low = red.min(green).min(blue);
    let chroma = high - low;
    if chroma < 12 {
        return None;
    }
    // Python // and % floor toward minus infinity.
    let hue = if high == red {
        ((green - blue) * 256).div_euclid(chroma)
    } else if high == green {
        512 + ((blue - red) * 256).div_euclid(chroma)
    } else {
        1024 + ((red - green) * 256).div_euclid(chroma)
    };
    let hue = hue.rem_euclid(1536);
    Some(11.min((hue * 12) / 1536) as u8)
}

/// `frame_descriptor` (`:257-335`) of one 16x12 RGB frame and the frame before it.
pub fn frame_descriptor(frame: &[u8], previous: Option<&[u8]>) -> Descriptor {
    assert_eq!(frame.len(), PIXELS_PER_SAMPLE * 3, "frame size");
    let pixels: Vec<[u8; 3]> = frame.chunks_exact(3).map(|p| [p[0], p[1], p[2]]).collect();
    let count = PIXELS_PER_SAMPLE as u64;
    let lumas: Vec<u64> = pixels.iter().map(|&p| u64::from(luma(p))).collect();
    let max = |p: &[u8; 3]| u64::from(*p.iter().max().unwrap_or(&0));
    let min = |p: &[u8; 3]| u64::from(*p.iter().min().unwrap_or(&0));
    let chromas: u64 = pixels.iter().map(|p| max(p) - min(p)).sum();
    let saturations: u64 = pixels
        .iter()
        .map(|p| {
            if max(p) == 0 {
                0
            } else {
                ((max(p) - min(p)) * 255) / max(p)
            }
        })
        .sum();
    let mean_luma = rounded_mean(lumas.iter().sum(), count);

    // :275-288 spatial gradient over right and below neighbours.
    let abs_sum = |a: &[u8; 3], b: &[u8; 3]| -> u64 {
        a.iter()
            .zip(b)
            .map(|(&x, &y)| u64::from(x.abs_diff(y)))
            .sum()
    };
    let (mut spatial_total, mut spatial_terms) = (0u64, 0u64);
    for row in 0..SAMPLE_HEIGHT {
        for column in 0..SAMPLE_WIDTH {
            let here = &pixels[row * SAMPLE_WIDTH + column];
            if column + 1 < SAMPLE_WIDTH {
                spatial_total += abs_sum(here, &pixels[row * SAMPLE_WIDTH + column + 1]);
                spatial_terms += 3;
            }
            if row + 1 < SAMPLE_HEIGHT {
                spatial_total += abs_sum(here, &pixels[(row + 1) * SAMPLE_WIDTH + column]);
                spatial_terms += 3;
            }
        }
    }
    let spatial_gradient = (spatial_total + spatial_terms / 2) / spatial_terms;

    // :290-297 temporal gradient against the previous frame.
    let temporal_gradient = match previous {
        None => 0,
        Some(prev) => {
            let terms = frame.len() as u64;
            let total: u64 = frame
                .iter()
                .zip(prev)
                .map(|(&a, &b)| u64::from(a.abs_diff(b)))
                .sum();
            (total + terms / 2) / terms
        }
    };

    // :299-311.
    let negative = lumas.iter().filter(|&&v| v < 85).count() as u64;
    let centre = lumas.iter().filter(|&&v| (85..=170).contains(&v)).count() as u64;
    let positive = count - negative - centre;
    let red_dominant = pixels.iter().filter(|p| p[0] > p[1] && p[0] > p[2]).count() as u64;
    let green_dominant = pixels.iter().filter(|p| p[1] > p[0] && p[1] > p[2]).count() as u64;
    let blue_dominant = pixels.iter().filter(|p| p[2] > p[0] && p[2] > p[1]).count() as u64;
    let warm = pixels.iter().filter(|p| p[0] > p[2]).count() as u64;
    let cool = pixels.iter().filter(|p| p[2] > p[0]).count() as u64;
    let mut occupied = [false; 12];
    for &p in &pixels {
        if let Some(bin) = hue_bin(p) {
            occupied[usize::from(bin)] = true;
        }
    }
    let occupied_hues = occupied.iter().filter(|&&x| x).count() as u64;

    let channel_sum = |c: usize| pixels.iter().map(|p| u64::from(p[c])).sum::<u64>();
    let amplitude: u64 = lumas.iter().map(|&v| v.abs_diff(mean_luma)).sum();
    // :313-332.
    let values = [
        rounded_mean(channel_sum(0), count),
        rounded_mean(channel_sum(1), count),
        rounded_mean(channel_sum(2), count),
        mean_luma,
        rounded_mean(chromas, count),
        rounded_mean(saturations, count),
        rounded_mean(amplitude, count),
        spatial_gradient,
        temporal_gradient,
        share(negative, count),
        share(centre, count),
        share(positive, count),
        share(red_dominant, count),
        share(green_dominant, count),
        share(blue_dominant, count),
        share(warm, count),
        share(cool, count),
        (occupied_hues * 255 + 6) / 12,
    ];
    // :333-334 every value lies in 0..=255.
    values.map(|v| u8::try_from(v).expect("descriptor value above 255"))
}

/// `describe_samples` (`:338-347`) of 64 concatenated frames.
pub fn describe_samples(rgb: &[u8]) -> Vec<Descriptor> {
    let frame_bytes = PIXELS_PER_SAMPLE * 3;
    assert_eq!(rgb.len(), SAMPLE_COUNT * frame_bytes, "sample stream size");
    let mut previous: Option<&[u8]> = None;
    (0..SAMPLE_COUNT)
        .map(|sample| {
            let frame = &rgb[sample * frame_bytes..(sample + 1) * frame_bytes];
            let d = frame_descriptor(frame, previous);
            previous = Some(frame);
            d
        })
        .collect()
}

/// `i8_zero_point_encode` (`:388-393`): each value minus 128 as a signed byte.
pub fn i8_zero_point_encode(descriptors: &[Descriptor]) -> Vec<u8> {
    descriptors
        .iter()
        .flatten()
        .map(|&v| v.wrapping_sub(128))
        .collect()
}

/// The unsigned descriptor bytes whose SHA-256 is `descriptor_sha256` (`:611-617`).
pub fn descriptor_unsigned(descriptors: &[Descriptor]) -> Vec<u8> {
    descriptors.iter().flatten().copied().collect()
}

/// The descriptors decoded from the `color_state` tensor of a GGUF built by `build_gguf`.
pub fn descriptors_from_gguf(bytes: &[u8]) -> Result<Vec<Descriptor>, String> {
    let layout = gguf::read_layout(bytes)?;
    let info = layout
        .tensors
        .iter()
        .find(|t| t.name == "color_state")
        .ok_or("no color_state tensor")?;
    if info.dims != [FIELD_NAMES.len() as u64, SAMPLE_COUNT as u64]
        || info.tensor_type != gguf::GGML_TYPE_I8
    {
        return Err("color_state shape or type".into());
    }
    let start = layout.data_start + info.offset as usize;
    let raw = bytes
        .get(start..start + FIELD_NAMES.len() * SAMPLE_COUNT)
        .ok_or("color_state data truncated")?;
    Ok(raw
        .chunks_exact(FIELD_NAMES.len())
        .map(|c| {
            let mut d = [0u8; 18];
            for (o, &x) in d.iter_mut().zip(c) {
                *o = x.wrapping_add(128);
            }
            d
        })
        .collect())
}

/// Facts about the source video that `probe_video` (`:104-156`) reports and the receipt records.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Probe {
    /// `codec`.
    pub codec: String,
    /// `width`.
    pub width: u64,
    /// `height`.
    pub height: u64,
    /// `frame_count`.
    pub frame_count: u64,
    /// `duration_ms`.
    pub duration_ms: u64,
}

fn align_up(value: usize) -> usize {
    value + gguf::pad_to_align(value)
}

/// `build_gguf` (`:400-499`): the exact-size GGUF and its padding length.
pub fn build_gguf(
    source_sha256: &str,
    probe: &Probe,
    descriptor_sha256: &str,
    recipe: &str,
    descriptor_bytes: &[u8],
) -> (Vec<u8>, usize) {
    let fields = FIELD_NAMES.join(",");
    let s = |text: &str| Value::Str(text.to_string());
    let entries = [
        ("general.architecture", s("asolaria-color-state")),
        ("general.name", s("DOUBLE-RAINBOW-OIL-3174")),
        ("general.alignment", Value::U32(gguf::ALIGN as u32)),
        ("asolaria.schema", s(SCHEMA)),
        ("asolaria.payload.kind", s("COLOR_STATE_DESCRIPTOR")),
        ("asolaria.source.youtube_id", s(SOURCE_ID)),
        ("asolaria.source.url", s(SOURCE_URL)),
        ("asolaria.source.sha256", s(source_sha256)),
        ("asolaria.source.frames", Value::U64(probe.frame_count)),
        ("asolaria.source.duration_ms", Value::U64(probe.duration_ms)),
        ("asolaria.sample.count", Value::U32(SAMPLE_COUNT as u32)),
        ("asolaria.sample.recipe", s(recipe)),
        ("asolaria.descriptor.fields", s(&fields)),
        ("asolaria.descriptor.sha256", s(descriptor_sha256)),
        (
            "asolaria.descriptor.encoding",
            s("GGML_I8;unsigned_value=signed_i8+128;shape=[18,64]"),
        ),
        (
            "asolaria.oil.axes",
            s("sign={NEGATIVE,CENTRE,POSITIVE};\
               tense={WAS_OIL,IS_OIL,WILL_OIL};\
               family={OIL,ANTI_OIL,ANTI_ANTI_OIL}"),
        ),
        (
            "asolaria.oil.sign_rule",
            s("luma<85=NEGATIVE;85<=luma<=170=CENTRE;luma>170=POSITIVE"),
        ),
        ("asolaria.video_bytes_embedded", Value::U32(0)),
        ("asolaria.audio_bytes_embedded", Value::U32(0)),
        ("asolaria.lossless_video_claim", Value::U32(0)),
        ("asolaria.reconstructs_source_video", Value::U32(0)),
        (
            "asolaria.boundary",
            s("derived color/time descriptors only; no source frames/audio/video bytes"),
        ),
    ];
    let mut metadata = Vec::new();
    for (k, v) in &entries {
        metadata.extend_from_slice(&gguf::kv(k, v));
    }
    let dims = [FIELD_NAMES.len() as u64, SAMPLE_COUNT as u64];
    let infos = |padding: u64| {
        let mut out = gguf::tensor_info("color_state", &dims, gguf::GGML_TYPE_I8, 0);
        out.extend_from_slice(&gguf::tensor_info(
            "size_padding",
            &[padding],
            gguf::GGML_TYPE_I8,
            descriptor_bytes.len() as u64,
        ));
        out
    };
    let prefix = gguf::header_prefix(2, entries.len() as u64);
    let data_start = align_up(prefix.len() + metadata.len() + infos(1).len());
    let padding_length = TARGET_BYTES
        .checked_sub(data_start + descriptor_bytes.len())
        .filter(|&p| p > 0)
        .expect("metadata leaves no room in 3174 bytes");
    let mut header = prefix;
    header.extend_from_slice(&metadata);
    header.extend_from_slice(&infos(padding_length as u64));
    assert_eq!(align_up(header.len()), data_start, "header size changed");
    let mut blob = header;
    blob.resize(data_start, 0);
    blob.extend_from_slice(descriptor_bytes);
    blob.resize(blob.len() + padding_length, 0);
    assert_eq!(blob.len(), TARGET_BYTES);
    (blob, padding_length)
}

/// Inputs of `receipt_bytes` (`:511-525`) that come from the source copy and the environment.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Source {
    /// `source_sha256`.
    pub sha256: String,
    /// `source_size`.
    pub size: u64,
    /// `probe`.
    pub probe: Probe,
    /// `rgb_sha256` of the sampled stream.
    pub rgb_sha256: String,
    /// `recipe`.
    pub recipe: String,
    /// `ffmpeg_build`.
    pub ffmpeg_build: String,
}

/// `receipt_bytes` (`:511-583`) with the GGUF built by [`build_gguf`] from `descriptors`.
pub fn receipt(source: &Source, descriptors: &[Descriptor]) -> (Vec<u8>, Vec<u8>) {
    let indices = uniform_frame_indices(source.probe.frame_count);
    let descriptor_sha256 = sha256_hex(&descriptor_unsigned(descriptors));
    let (blob, padding_length) = build_gguf(
        &source.sha256,
        &source.probe,
        &descriptor_sha256,
        &source.recipe,
        &i8_zero_point_encode(descriptors),
    );
    let gguf_sha256 = sha256_hex(&blob);
    let p = &source.probe;
    let mut rows = vec![
        format!(
            "DR64HDR|schema={SCHEMA}|youtube_id={SOURCE_ID}|samples={SAMPLE_COUNT}|fields={}|json=0",
            FIELD_NAMES.len()
        ),
        format!(
            "SOURCE|url={SOURCE_URL}|youtube_id={SOURCE_ID}|title={SOURCE_TITLE}\
             |sha256={}|bytes={}|codec={}|width={}|height={}|frames={}|duration_ms={}|json=0",
            source.sha256, source.size, p.codec, p.width, p.height, p.frame_count, p.duration_ms
        ),
        format!(
            "RECIPE|value={}|rgb_sha256={}|ffmpeg={}|json=0",
            source.recipe, source.rgb_sha256, source.ffmpeg_build
        ),
        "BOUNDARY|payload=COLOR_STATE_DESCRIPTOR|video_bytes_embedded=0\
         |audio_bytes_embedded=0|lossless_video_claim=0\
         |reconstructs_source_video=0|json=0"
            .to_string(),
        "AXES|sign=NEGATIVE,CENTRE,POSITIVE|tense=WAS_OIL,IS_OIL,WILL_OIL\
         |family=OIL,ANTI_OIL,ANTI_ANTI_OIL|json=0"
            .to_string(),
        format!("FIELDS|ordered={}|json=0", FIELD_NAMES.join(",")),
    ];
    let last_frame = p.frame_count - 1;
    for (sample_number, (frame_index, descriptor)) in indices.iter().zip(descriptors).enumerate() {
        let time_ms = if last_frame == 0 {
            0
        } else {
            (frame_index * p.duration_ms + last_frame / 2) / last_frame
        };
        let values: Vec<String> = FIELD_NAMES
            .iter()
            .zip(descriptor)
            .map(|(field, value)| format!("{field}={value}"))
            .collect();
        rows.push(format!(
            "SLICE|i={sample_number}|frame={frame_index}|time_ms={time_ms}|{}|json=0",
            values.join("|")
        ));
    }
    rows.push(format!(
        "DESCRIPTOR|bytes={}|sha256={descriptor_sha256}|i8_zero_point=128|json=0",
        SAMPLE_COUNT * FIELD_NAMES.len()
    ));
    rows.push(format!(
        "GGUF|file={GGUF_NAME}|bytes={TARGET_BYTES}|sha256={gguf_sha256}\
         |padding_tensor_bytes={padding_length}|json=0"
    ));
    let body = rows.join("\n") + "\n";
    let commitment = sha256_hex(body.as_bytes());
    rows.push(format!(
        "DR64FTR|body_sha256={commitment}|rows={}|json=0",
        rows.len() + 1
    ));
    ((rows.join("\n") + "\n").into_bytes(), blob)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn luma_and_hue() {
        assert_eq!(luma([255, 255, 255]), 255);
        assert_eq!(luma([0, 0, 0]), 0);
        assert_eq!(hue_bin([255, 0, 0]), Some(0));
        assert_eq!(hue_bin([0, 255, 0]), Some(4));
        assert_eq!(hue_bin([0, 0, 255]), Some(8));
        assert_eq!(hue_bin([255, 0, 1]), Some(11)); // (0 - 1) * 256 // 255 = -2 -> 1534
        assert_eq!(hue_bin([100, 95, 90]), None);
    }

    #[test]
    fn indices_include_both_ends() {
        let idx = uniform_frame_indices(5229);
        assert_eq!(idx[0], 0);
        assert_eq!(idx[1], 83);
        assert_eq!(idx[63], 5228);
    }
}
