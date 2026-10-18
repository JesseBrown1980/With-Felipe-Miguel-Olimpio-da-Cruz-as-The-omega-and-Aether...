//! The Rust ports rebuild every committed fixture under `tests/fixtures/` byte for byte. The same
//! files are rebuilt by the stdlib referee (`referee/colour_referee.py --check`), which mirrors or
//! calls the upstream lines; so Rust, referee and upstream agree.

use colour::binary64::B64;
use colour::flashlight::{self, Luts, Perms};
use colour::{colorpid, hex, oil, rainbow27v2, rainbow7, sha256_hex, stars, verdict};
use sha2::{Digest, Sha256};
use std::fs;

const USIM: &str = "vendor/universe-simulator";

fn read(path: &str) -> Vec<u8> {
    fs::read(path).unwrap_or_else(|e| panic!("{path}: {e}"))
}

fn committed(name: &str) -> String {
    String::from_utf8(read(&format!("tests/fixtures/{name}"))).expect("ASCII fixture")
}

fn header(name: &str, source: &str) -> String {
    format!("FIXTURE|k={name}|source={source}|referee=referee/colour_referee.py|json=0")
}

fn bits(x: B64) -> String {
    format!("{:016x}", x.to_bits())
}

fn assert_rows(name: &str, rows: &[String]) {
    let want = committed(name);
    let got = rows.join("\n") + "\n";
    if want != got {
        for (i, (w, g)) in want.lines().zip(got.lines()).enumerate() {
            assert_eq!(w, g, "{name} row {i}");
        }
        assert_eq!(
            want.lines().count(),
            got.lines().count(),
            "{name} row count"
        );
    }
}

#[test]
fn stars_shells_fixture() {
    let seed = read(&format!("{USIM}/gguf/stars/MYTHOS-SELF-EMISSION.txt"));
    let out = stars::regenerate(&seed, stars::MAXR);
    let mut rows = vec![
        header(
            "stars-shells",
            "universe-simulator@3f9f42d/measurements/stars_shells.py",
        ),
        format!(
            "SEED|bytes={}|sha256={}|json=0",
            seed.len(),
            sha256_hex(&seed)
        ),
    ];
    for r in &out.rounds {
        rows.push(format!(
            "ROUND|n={}|bytes={}|stars={}|shells={}|json=0",
            r.n, r.bytes, r.stars, r.shells
        ));
    }
    for sh in &out.shells {
        let hist: Vec<String> = sh.test.hist.iter().map(u64::to_string).collect();
        rows.push(format!(
            "RING|s={}|stars={}|hist={}|pk={}|inner={}|ring={}|json=0",
            sh.s,
            sh.stars,
            hist.join("."),
            sh.test.pk,
            bits(sh.test.inner),
            u8::from(sh.test.ring)
        ));
    }
    for (name, dims, bytes) in &out.tensors {
        let dims: Vec<String> = dims.iter().map(u64::to_string).collect();
        rows.push(format!(
            "TENSOR|name={name}|dims={}|sha256={}|json=0",
            dims.join("."),
            sha256_hex(bytes)
        ));
    }
    rows.push(format!(
        "GGUF|bytes={}|sha256={}|json=0",
        out.gguf.len(),
        sha256_hex(&out.gguf)
    ));
    rows.push(format!(
        "RECEIPT|bytes={}|sha256={}|json=0",
        out.receipt.len(),
        sha256_hex(&out.receipt)
    ));
    assert_rows("stars-shells.hbp", &rows);
}

fn split_rows(c: &verdict::Colour) -> String {
    format!(
        "SPLIT|R={}|G={}|B={}|spread={}|json=0",
        bits(c.split[0]),
        bits(c.split[1]),
        bits(c.split[2]),
        bits(c.spread)
    )
}

#[test]
fn colour_verdict_fixture() {
    let mut rows = vec![header(
        "colour-verdict",
        "universe-simulator@3f9f42d/measurements/divide_kimi_k3.py",
    )];
    for path in [
        format!("{USIM}/measurements/KIMI-K3-STAR.txt"),
        format!("{USIM}/gguf/stars/MYTHOS-SELF-EMISSION.txt"),
    ] {
        let body = read(&path);
        let own = verdict::ownership(&body);
        let c = verdict::colour(&own);
        rows.push(format!(
            "BODY|k={}|bytes={}|own={},{},{}|ties={}|json=0",
            path.rsplit('/').next().unwrap(),
            body.len(),
            own.own[0],
            own.own[1],
            own.own[2],
            own.ties
        ));
        rows.push(verdict::colour_row(&c));
        rows.push(split_rows(&c));
        rows.extend(verdict::beings(&body).iter().map(verdict::being_row));
    }
    // The boundary splits the referee chose: own counts read back, verdicts recomputed here.
    for line in committed("colour-verdict.hbp")
        .lines()
        .filter(|l| l.starts_with("CASE|"))
    {
        let own_field = line
            .split('|')
            .nth(1)
            .unwrap()
            .strip_prefix("own=")
            .unwrap();
        let own: Vec<u64> = own_field.split(',').map(|x| x.parse().unwrap()).collect();
        let c = verdict::colour(&verdict::Ownership {
            own: [own[0], own[1], own[2]],
            ties: 0,
        });
        rows.push(format!(
            "CASE|own={own_field}|R={}|G={}|B={}|spread={}|verdict={}|json=0",
            bits(c.split[0]),
            bits(c.split[1]),
            bits(c.split[2]),
            bits(c.spread),
            c.verdict.replace(' ', "_")
        ));
    }
    assert_rows("colour-verdict.hbp", &rows);
}

#[test]
fn colorpid_fixture() {
    let fixture = committed("colorpid.hbp");
    // The whole-domain row is rebuilt by `cargo run --release --example emit -- colorpid-domain`.
    let domain = fixture
        .lines()
        .find(|l| l.starts_with("COLORPID_DOMAIN|"))
        .unwrap()
        .to_string();
    let mut rows = vec![
        header(
            "colorpid",
            "universe-simulator@3f9f42d/engines/omni_hotel.py:39-49",
        ),
        domain,
    ];
    let mut h = Sha256::new();
    let mut count = 0;
    for i in (0u32..1 << 24).step_by(4099) {
        h.update(colorpid_record([(i >> 16) as u8, (i >> 8) as u8, i as u8]));
        count += 1;
    }
    rows.push(format!(
        "COLORPID_STRIDE|step=4099|colours={count}|sha256={}|json=0",
        hex(&h.finalize())
    ));
    for i in 0..16 {
        let key = format!("PID{i}");
        let c = colorpid::pid_color(&key);
        rows.push(format!(
            "PID|key={key}|rgb={},{},{}|rainbow12={}|sphere27={}|blast_radius={}|saturation={}|json=0",
            c[0],
            c[1],
            c[2],
            colorpid::rainbow12(c),
            colorpid::sphere27(c),
            bits(colorpid::blast_radius(c)),
            bits(colorpid::saturation(c))
        ));
    }
    rows.push(omni_row(2000));
    assert_rows("colorpid.hbp", &rows);
}

/// The referee's 42-byte digest record of one colour (`referee/colour_referee.py:615-619`,
/// `<BBddddd` as bit patterns: rainbow12, sphere27, h, s, v, s*v, blast_radius). A check
/// format, not upstream output.
fn colorpid_record(c: [u8; 3]) -> [u8; 42] {
    let (h, s, v) = colorpid::hsv(c);
    let mut out = [0u8; 42];
    out[0] = colorpid::rainbow12(c);
    out[1] = colorpid::sphere27(c);
    for (i, x) in [h, s, v, s * v, colorpid::blast_radius(c)]
        .iter()
        .enumerate()
    {
        out[2 + 8 * i..10 + 8 * i].copy_from_slice(&x.to_bits().to_le_bytes());
    }
    out
}

/// The ColorPID values `omni_hotel.py:51-69` prints for `PID0..PID{n-1}` (occupied rainbow12 and
/// sphere27 classes, `dist(PID0, PID500)` to one decimal, the first maximum of `saturation`), in the
/// referee's `OMNI` row (`referee/colour_referee.py:743-753`); upstream prints them as text.
fn omni_row(n: usize) -> String {
    let colors: Vec<(String, [u8; 3])> = (0..n)
        .map(|i| {
            let pid = format!("PID{i}");
            let c = colorpid::pid_color(&pid);
            (pid, c)
        })
        .collect();
    let mut r12 = [false; 12];
    let mut s27 = [false; 27];
    for (_, c) in &colors {
        r12[usize::from(colorpid::rainbow12(*c))] = true;
        s27[usize::from(colorpid::sphere27(*c))] = true;
    }
    let count = |xs: &[bool]| xs.iter().filter(|&&x| x).count();
    let dist = colorpid::color_dist(colors[0].1, colors[500].1).format_fixed(1);
    let mut star = &colors[0];
    let mut best = colorpid::saturation(star.1);
    for entry in &colors[1..] {
        let sat = colorpid::saturation(entry.1);
        if sat > best {
            best = sat;
            star = entry;
        }
    }
    format!(
        "OMNI|pids={n}|dist_PID0_PID500={dist}|rainbow12={}/12|sphere27={}/27\
         |star={}|star_rgb={},{},{}|json=0",
        count(&r12),
        count(&s27),
        star.0,
        star.1[0],
        star.1[1],
        star.1[2]
    )
}

fn oil_streams() -> Vec<(&'static str, Vec<u8>)> {
    let a: Vec<u8> = (0u32..1152)
        .flat_map(|i| {
            let mut h = Sha256::new();
            h.update(b"asolaria-colour-oil-A");
            h.update(i.to_le_bytes());
            h.finalize().to_vec()
        })
        .collect();
    let mut b = Vec::new();
    for f in 0..64u32 {
        for y in 0..12u32 {
            for x in 0..16u32 {
                b.push(((x * 17 + f * 3) % 256) as u8);
                b.push(((y * 23 + f * 5) % 256) as u8);
                b.push((((x + y) * 11 + f * 7) % 256) as u8);
            }
        }
    }
    vec![("A", a), ("B", b)]
}

#[test]
fn oil_fixture() {
    let mut rows = vec![header(
        "oil",
        "follow@8712368/codes/double_rainbow_to_gguf.py",
    )];
    for frames in [64u64, 65, 100, 1000, 5229] {
        let idx = oil::uniform_frame_indices(frames);
        let list: Vec<String> = idx.iter().map(u64::to_string).collect();
        rows.push(format!(
            "INDICES|frames={frames}|first={}|second={}|last={}|sha256={}|json=0",
            idx[0],
            idx[1],
            idx[63],
            sha256_hex(list.join(",").as_bytes())
        ));
    }
    let mut h = Sha256::new();
    for r in 0..=255u8 {
        for g in 0..=255u8 {
            for b in 0..=255u8 {
                let p = [r, g, b];
                h.update([oil::luma(p), oil::hue_bin(p).unwrap_or(255)]);
            }
        }
    }
    rows.push(format!(
        "LUMA_HUE_DOMAIN|colours=16777216|sha256={}|json=0",
        hex(&h.finalize())
    ));
    for (name, stream) in oil_streams() {
        let descriptors = oil::describe_samples(&stream);
        for (i, d) in descriptors.iter().enumerate() {
            let values: Vec<String> = d.iter().map(u8::to_string).collect();
            rows.push(format!(
                "DESC|stream={name}|i={i}|values={}|json=0",
                values.join(".")
            ));
        }
        rows.push(format!(
            "DESCRIPTOR|stream={name}|unsigned_sha256={}|i8_sha256={}|json=0",
            sha256_hex(&oil::descriptor_unsigned(&descriptors)),
            sha256_hex(&oil::i8_zero_point_encode(&descriptors))
        ));
    }
    assert_rows("oil.hbp", &rows);
}

fn flash_inputs() -> Vec<(String, Vec<u8>)> {
    let seed = read(&format!("{USIM}/gguf/stars/MYTHOS-SELF-EMISSION.txt"));
    let kimi = read(&format!("{USIM}/measurements/KIMI-K3-STAR.txt"));
    let mut out = Vec::new();
    for (name, raw) in [("mythos", &seed), ("kimi", &kimi)] {
        let n = raw.len() / 3;
        for c in 0..3 {
            out.push((
                format!("{name}-c{c}"),
                (0..n).map(|i| raw[3 * i + c]).collect(),
            ));
        }
    }
    let rnd: Vec<u8> = (0u32..32)
        .flat_map(|i| {
            let mut h = Sha256::new();
            h.update(b"asolaria-colour-flash");
            h.update(i.to_le_bytes());
            h.finalize().to_vec()
        })
        .take(1000)
        .collect();
    out.push(("one".into(), vec![7]));
    out.push(("ten".into(), (0..10).collect()));
    out.push(("all".into(), (0..=255).collect()));
    out.push(("constant".into(), vec![42; 1000]));
    out.push(("ends".into(), vec![0, 255]));
    out.push(("sha1000".into(), rnd));
    out
}

#[test]
fn flashlight_fixture() {
    let mut rows = vec![header(
        "flashlight",
        "universe-simulator@3f9f42d/measurements/pump_glyphs_mythos.py:74-163+asolaria_herself.py:56-99",
    )];
    for (name, v) in flash_inputs() {
        let luts = Luts::of(&v);
        let perms = Perms::of(&v);
        rows.push(format!(
            "INPUT|k={name}|n={}|sha256={}|json=0",
            v.len(),
            sha256_hex(&v)
        ));
        rows.push(format!(
            "PCT|lo={}|hi={}|json=0",
            bits(flashlight::percentile(&v, 5, 1)),
            bits(flashlight::percentile(&v, 995, 1))
        ));
        rows.push(format!(
            "LUT|P={}|R={}|G={}|RPR={}|json=0",
            hex(&luts.p),
            hex(&luts.r),
            hex(&luts.g),
            hex(&flashlight::glyph_lut(&luts, "RPR").unwrap())
        ));
        rows.push(format!(
            "PERM|P={}|R={}|G={}|RPR={}|json=0",
            hex(&perms.p),
            hex(&perms.r),
            hex(&perms.g),
            hex(&flashlight::glyph(&perms, "RPR"))
        ));
    }
    // pump_glyphs_mythos.py:68-70,108,142-156 on the seed: the 81 words without D.
    let seed = read(&format!("{USIM}/gguf/stars/MYTHOS-SELF-EMISSION.txt"));
    let tri: Vec<[u8; 3]> = seed.chunks_exact(3).map(|t| [t[0], t[1], t[2]]).collect();
    let luts: [Luts; 3] =
        core::array::from_fn(|c| Luts::of(&tri.iter().map(|t| t[c]).collect::<Vec<_>>()));
    for w in flashlight::words(4) {
        let Some((cube, dropped, owned)) = flashlight::emit(&tri, &luts, &w) else {
            continue;
        };
        let bytes: Vec<u8> = cube
            .iter()
            .flat_map(|&x| colour::gguf::binary32_bits(x.into()).to_le_bytes())
            .collect();
        rows.push(format!(
            "GLYPH|w={w}|owned={owned}|dropped={dropped}|sha256={}|json=0",
            sha256_hex(&bytes)
        ));
    }
    assert_rows("flashlight.hbp", &rows);
}

#[test]
fn rainbow_fixture() {
    let (raw, normalized) = rainbow27v2::orbit_sizes();
    let join = |v: &[usize]| v.iter().map(usize::to_string).collect::<Vec<_>>().join(".");
    let (trace, lanes, dark) = rainbow27v2::trace();
    let addresses = rainbow7::addresses();
    let listing = addresses.join("\n") + "\n";
    let rows = vec![
        header(
            "rainbow",
            "stone-to-moss@f032bc0/experiments/seat3/rainbow27_v2/rainbow27_v2.py\
             +experiments/seat1/rainbow7/rainbow7_bank.py",
        ),
        format!(
            "R27V2_FIXTURE|sha256={}|json=0",
            sha256_hex(&rainbow27v2::fixture())
        ),
        format!(
            "R27V2_ORBITS|raw={}|normalized={}|json=0",
            join(&raw),
            join(&normalized)
        ),
        format!(
            "TRACE|rows={}|bytes={}|sha256={}|json=0",
            rainbow27v2::TOTAL,
            trace.len(),
            sha256_hex(&trace)
        ),
        format!(
            "LANES|lane0={}|lane1={}|lane2={}|dark_held={dark}|json=0",
            lanes[0], lanes[1], lanes[2]
        ),
        format!(
            "RAINBOW7|bands={}|addresses={}|first={}|last={}|sha256={}|json=0",
            rainbow7::BANDS.join("."),
            addresses.len(),
            addresses[0],
            addresses[addresses.len() - 1],
            sha256_hex(listing.as_bytes())
        ),
    ];
    assert_rows("rainbow.hbp", &rows);
}
