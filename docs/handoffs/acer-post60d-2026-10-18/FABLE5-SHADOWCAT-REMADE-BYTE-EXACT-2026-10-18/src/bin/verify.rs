//! SHADOWCAT VERIFICATION — the checks that decide whether to trust the run.
//!
//! Operator standing rule: measure, do not assume. This binary exists because
//! the main program's two load-bearing pieces are (a) an in-tree SHA-256 with
//! no dependency to cross-check it against, and (b) a Kerr null-geodesic
//! shadow computed from a formula typed in by hand. If either is wrong,
//! everything printed on top of it is worthless. So both are checked against
//! values published outside this container.
//!
//! CHECK 1 — SHA-256 against the NIST/FIPS 180-4 published test vectors, plus
//!           the empty-string and million-'a' vectors. If these do not match
//!           bit for bit, the addressing primitive of the whole constellation
//!           is broken and every hbp/hbi emitted so far is mislabelled.
//!
//! CHECK 2 — the Kerr shadow at the two limits where the literature gives an
//!           exact closed form:
//!             a = 0        -> a perfect circle of radius sqrt(27) = 5.196152...
//!             a = M, i=90  -> the D-shape, alpha spanning exactly [-2M, +7M]
//!           Both are textbook (Bardeen 1973 / Chandrasekhar). If the code
//!           reproduces them, the intermediate spins can be believed.

#[path = "../sha256.rs"]
mod sha256;

fn photon_orbit_radii(a: f64) -> (f64, f64) {
    let pro = 2.0 * (1.0 + ((2.0 / 3.0) * (-a).acos()).cos());
    let ret = 2.0 * (1.0 + ((2.0 / 3.0) * (a).acos()).cos());
    (pro, ret)
}

fn kerr_shadow(a_in: f64, incl_deg: f64, samples: usize) -> Vec<(f64, f64)> {
    let a = if a_in.abs() < 1e-6 { 1e-6 } else { a_in };
    let i = incl_deg.to_radians();
    let (r0, r1) = photon_orbit_radii(a);
    let mut pts = Vec::new();
    for k in 0..=samples {
        let r = r0 + (r1 - r0) * (k as f64) / (samples as f64);
        let denom = a * (r - 1.0);
        if denom.abs() < 1e-12 { continue; }
        let xi = ((r * r - a * a) - r * (r * r - 2.0 * r + a * a)) / denom;
        let d2 = a * a * (r - 1.0) * (r - 1.0);
        if d2.abs() < 1e-12 { continue; }
        let eta = r * r * r * (4.0 * a * a - r * (r - 3.0) * (r - 3.0)) / d2;
        let si = i.sin();
        if si.abs() < 1e-12 { continue; }
        let alpha = -xi / si;
        let cot = i.cos() / si;
        let inside = eta + a * a * i.cos() * i.cos() - xi * xi * cot * cot;
        if inside < 0.0 { continue; }
        let beta = inside.sqrt();
        pts.push((alpha, beta));
        pts.push((alpha, -beta));
    }
    pts
}

fn main() {
    println!("SHADOWCAT VERIFICATION");
    println!("{}", "=".repeat(78));
    let mut all_ok = true;

    // ---------------------------------------------------------------- CHECK 1
    println!("\n[V1] SHA-256 vs published FIPS 180-4 / NIST test vectors");
    let vectors: [(&str, &str); 4] = [
        ("",
         "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
        ("abc",
         "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
        ("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
         "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"),
        ("abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu",
         "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1"),
    ];
    for (msg, want) in vectors.iter() {
        let got = sha256::hex(&sha256::digest(msg.as_bytes()));
        let ok = &got == want;
        if !ok { all_ok = false; }
        let label = if msg.is_empty() {
            "\"\" (empty)".to_string()
        } else if msg.len() > 24 {
            format!("{}... ({} bytes)", &msg[..20], msg.len())
        } else {
            format!("\"{}\"", msg)
        };
        println!("    {:<34} {}", label, if ok { "MATCH" } else { "*** MISMATCH ***" });
        if !ok {
            println!("        want {}", want);
            println!("        got  {}", got);
        }
    }
    // the million-'a' vector: exercises multi-block and the length field
    let million = vec![b'a'; 1_000_000];
    let got = sha256::hex(&sha256::digest(&million));
    let want = "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0";
    let ok = got == want;
    if !ok { all_ok = false; }
    println!("    {:<34} {}", "1,000,000 x 'a'",
             if ok { "MATCH" } else { "*** MISMATCH ***" });
    if !ok {
        println!("        want {}", want);
        println!("        got  {}", got);
    }
    // streaming must equal one-shot, or hbp trailers computed incrementally lie
    let mut h = sha256::Sha256::new();
    for chunk in million.chunks(7) { h.update(chunk); }
    let streamed = sha256::hex(&h.finish());
    let ok = streamed == want;
    if !ok { all_ok = false; }
    println!("    {:<34} {}", "same, streamed in 7-byte chunks",
             if ok { "MATCH" } else { "*** MISMATCH ***" });

    // ---------------------------------------------------------------- CHECK 2
    println!("\n[V2] Kerr shadow vs the two closed-form limits in the literature");

    // limit A: Schwarzschild, a = 0, exact circle of radius sqrt(27)
    let pts = kerr_shadow(0.0, 90.0, 400_000);
    let rmax = pts.iter().map(|(x, y)| (x * x + y * y).sqrt()).fold(0.0f64, f64::max);
    let rmin = pts.iter().map(|(x, y)| (x * x + y * y).sqrt()).fold(f64::MAX, f64::min);
    let want_r = 27f64.sqrt();
    let err = ((rmax - want_r).abs()).max((rmin - want_r).abs());
    let ok = err < 1e-3;
    if !ok { all_ok = false; }
    println!("    a=0  radius should be sqrt(27) = {:.9}", want_r);
    println!("         computed rmin {:.9}  rmax {:.9}   max error {:.2e}   {}",
             rmin, rmax, err, if ok { "OK" } else { "*** OFF ***" });

    // limit B: extremal Kerr seen edge-on, alpha spans exactly [-2M, +7M]
    let pts = kerr_shadow(0.9999999, 90.0, 400_000);
    let amin = pts.iter().map(|(x, _)| *x).fold(f64::MAX, f64::min);
    let amax = pts.iter().map(|(x, _)| *x).fold(f64::MIN, f64::max);
    let ok_lo = (amin - (-2.0)).abs() < 5e-3;
    let ok_hi = (amax - 7.0).abs() < 5e-3;
    if !(ok_lo && ok_hi) { all_ok = false; }
    println!("    a->M, i=90  alpha should span exactly [-2M, +7M]");
    println!("         computed alpha_min {:+.6}  ({})", amin,
             if ok_lo { "OK" } else { "*** OFF ***" });
    println!("         computed alpha_max {:+.6}  ({})", amax,
             if ok_hi { "OK" } else { "*** OFF ***" });
    println!("         width {:.6} M  (literature: 9 M)", amax - amin);

    println!("\n{}", "=".repeat(78));
    println!("VERIFICATION: {}", if all_ok {
        "ALL CHECKS PASS. the sha256 primitive and the Kerr geometry are sound."
    } else {
        "*** AT LEAST ONE CHECK FAILED — do not trust the main run until fixed."
    });
}
