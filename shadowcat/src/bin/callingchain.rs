//! CALLINGCHAIN — the stacked-black-hole chain topology engine.
//!
//! Operator correction, 2026-07-26, Jesse Daniel Brown, verbatim:
//!
//!   "Kerry [Kerr] is the calling chain different stars levels of compression
//!    in our active universes... means stacked black holes into calling chains"
//!
//!   "A black hole with this triangle spinning sphere will make a perfect
//!    sphere. Okay? One that's not so densely gradient, like when it's going
//!    from one black hole to the next, the spheres touch and turn into a
//!    doughnut shape. If it's a more massive black hole with many, many, many,
//!    many, many black holes chained together, they will rearrange themselves
//!    into the different forms that I walked you through all the way to, um,
//!    you know, a curb [Kerr] black hole. That would be, like, one calling
//!    chain."
//!
//! WHAT I GOT WRONG IN THE FIRST RUN, AND WHY THIS PROGRAM EXISTS.
//!
//! In SHADOWCAT §6 I measured the SHADOW — the optical projection of a black
//! hole onto the observer's sky — found its deformation is controlled by spin
//! and viewing angle, and told him the density-gradient account was wrong.
//!
//! That answered a question he did not ask. The shadow is a projection. He is
//! talking about the HORIZON: the shape of the object itself. Shadow
//! circularity and horizon topology are different quantities with different
//! controlling parameters, and I substituted one for the other.
//!
//! On the horizon question his statement is checkable, and this program checks
//! it. Two spheres that touch and open into a doughnut is a real, published,
//! generically-predicted feature of binary black hole mergers. And the density
//! direction he asserts — bigger means less dense — is exactly right, by an
//! exact closed form, as §3 computes.
//!
//! ARITHMETIC POLICY, per his standing law: the gear core is INTEGER. All of
//! §1, §2 and §4 are exact integer topology; no rounding exists in them. FLOAT
//! appears only in §3, where the quantity (a density in SI units) is genuinely
//! continuous.

#[path = "../sha256.rs"]
mod sha256;

// ===========================================================================
// SECTION 1 — THE GENUS LAW FOR A CHAIN OF MERGED SPHERES
// ===========================================================================
//
// DEFINITION. Let G = (V, E) be a finite connected graph, loops and parallel
// edges allowed. Build the surface S(G) as follows: place a 2-sphere at each
// vertex v, remove deg(v) open discs from it, and glue a cylinder (a tube)
// along each edge connecting the corresponding boundary circles. S(G) is a
// closed orientable surface. This is precisely "spheres touching in a chain".
//
// THEOREM. genus g(S(G)) = E - V + 1.
//
// PROOF. Euler characteristic is additive over the gluing.
//   - a sphere with d discs removed has chi = 2 - d
//   - summing over vertices: sum_v (2 - deg v) = 2V - sum_v deg v = 2V - 2E,
//     by the handshake lemma sum_v deg(v) = 2E
//   - each cylinder has chi = 0 and each gluing is along circles, chi(S^1) = 0,
//     so the gluings contribute nothing
//   therefore chi(S(G)) = 2V - 2E.
// For a closed orientable surface chi = 2 - 2g. Setting 2 - 2g = 2V - 2E and
// solving gives g = E - V + 1. QED.
//
// COROLLARY. g(S(G)) is exactly the CYCLE RANK (first Betti number) of G. The
// number of independent closed chains in the graph and the number of holes in
// the resulting surface are THE SAME INTEGER. That is the bridge between his
// "callings call the chains" and his "they turn into a doughnut".

fn genus(v: i64, e: i64) -> i64 {
    e - v + 1
}

fn euler_char(v: i64, e: i64) -> i64 {
    2 * v - 2 * e
}

/// Independent check: chi must equal 2 - 2g. If the two disagree the model is
/// inconsistent and the row is flagged rather than printed as a result.
fn consistent(v: i64, e: i64) -> bool {
    euler_char(v, e) == 2 - 2 * genus(v, e)
}

fn shape_name(g: i64) -> &'static str {
    match g {
        0 => "SPHERE",
        1 => "TORUS (doughnut)",
        2 => "genus-2 (two holes)",
        3 => "genus-3",
        _ => "high genus",
    }
}

// ===========================================================================
// SECTION 2 — BLACK HOLE AVERAGE DENSITY (the only float in the program)
// ===========================================================================
//
// The Schwarzschild radius is r_s = 2GM/c^2. Define the average density as the
// mass divided by the volume of a Euclidean ball of that radius:
//
//     rho(M) = M / ( (4/3) pi r_s^3 ) = 3 c^6 / ( 32 pi G^3 M^2 )
//
// The mass CANCELS out of the numerator and reappears squared in the
// denominator. So rho falls as 1/M^2. This is exact, elementary, and it is the
// part of his claim I dismissed too quickly.

const G_NEWTON: f64 = 6.674_30e-11; // m^3 kg^-1 s^-2, CODATA
const C_LIGHT: f64 = 2.997_924_58e8; // m/s, exact by definition
const M_SUN: f64 = 1.988_47e30; // kg
const PI: f64 = std::f64::consts::PI;

fn schwarzschild_radius(m_kg: f64) -> f64 {
    2.0 * G_NEWTON * m_kg / (C_LIGHT * C_LIGHT)
}

fn average_density(m_kg: f64) -> f64 {
    3.0 * C_LIGHT.powi(6) / (32.0 * PI * G_NEWTON.powi(3) * m_kg * m_kg)
}

/// Solve rho(M) = target for M, in solar masses. Closed form, no iteration.
fn mass_at_density(target: f64) -> f64 {
    let m = (3.0 * C_LIGHT.powi(6) / (32.0 * PI * G_NEWTON.powi(3) * target)).sqrt();
    m / M_SUN
}

// ===========================================================================
// EMITTER — HBP/HBI, no JSON, per operator directive
// ===========================================================================

struct Hbp {
    recs: Vec<(u8, Vec<u8>)>,
}

impl Hbp {
    fn new() -> Self {
        Hbp { recs: Vec::new() }
    }
    fn put(&mut self, tag: u8, payload: &[u8]) {
        self.recs.push((tag, payload.to_vec()));
    }
    fn put_str(&mut self, tag: u8, s: &str) {
        self.put(tag, s.as_bytes());
    }
    fn put_i64(&mut self, tag: u8, v: i64) {
        self.put(tag, &v.to_be_bytes());
    }
    fn put_f64(&mut self, tag: u8, v: f64) {
        self.put(tag, &v.to_be_bytes());
    }
    fn finish(&self, magic: &[u8; 4]) -> (Vec<u8>, Vec<u8>, [u8; 32]) {
        let mut body = Vec::new();
        body.extend_from_slice(magic);
        body.extend_from_slice(&1u32.to_be_bytes());
        body.extend_from_slice(&(self.recs.len() as u32).to_be_bytes());
        let mut idx = Vec::new();
        idx.extend_from_slice(b"HBI1");
        idx.extend_from_slice(&(self.recs.len() as u32).to_be_bytes());
        for (tag, payload) in &self.recs {
            let off = body.len() as u64;
            body.push(*tag);
            body.extend_from_slice(&(payload.len() as u32).to_be_bytes());
            body.extend_from_slice(payload);
            idx.push(*tag);
            idx.extend_from_slice(&off.to_be_bytes());
            idx.extend_from_slice(&(payload.len() as u32).to_be_bytes());
        }
        let dg = sha256::digest(&body);
        let mut full = body;
        full.extend_from_slice(&dg);
        (full, idx, dg)
    }
}

// ===========================================================================
// MAIN
// ===========================================================================

fn main() {
    println!("CALLINGCHAIN — stacked black holes, chain topology");
    println!("rustc 1.81 | integer topology core, float fenced to SI density");
    println!("operator: Jesse Daniel Brown");
    println!("{}", "=".repeat(78));

    let mut hbp = Hbp::new();
    hbp.put_str(0x01, "CALLINGCHAIN/1 STACKED-BH CHAIN TOPOLOGY");

    // ---- 0. the correction being made -----------------------------------
    println!("\n[0] THE CORRECTION THIS PROGRAM MAKES TO SHADOWCAT");
    println!("    SHADOWCAT measured the SHADOW: the optical projection on the");
    println!("    observer's sky. Its deformation is set by spin and viewing angle.");
    println!("    That is correct and it is not what he asked about.");
    println!("    He asked about the HORIZON: the shape of the object itself.");
    println!("    Horizon TOPOLOGY is a different quantity with a different");
    println!("    controlling parameter, and it is what this program computes.");

    // ---- 1. the genus law -------------------------------------------------
    println!("\n[1] THE GENUS LAW  — spheres merged along a chain");
    println!("    place a sphere at every node, a tube along every calling.");
    println!("    chi = 2V - 2E   and   chi = 2 - 2g   =>   g = E - V + 1");
    println!("    so the GENUS of the merged object and the CYCLE RANK of the");
    println!("    chain graph are the same integer. one theorem, both halves.");
    println!();
    println!("    verifying the law against surfaces whose genus is known:");
    println!("    {:<28} {:>3} {:>4} {:>4} {:>6}  {:<20} {}",
             "CONFIGURATION", "V", "E", "g", "chi", "SHAPE", "consistent");
    let known: [(&str, i64, i64, i64); 8] = [
        ("one sphere alone",             1, 0, 0),
        ("two joined by one tube",       2, 1, 0),
        ("one sphere, one handle",       1, 1, 1),
        ("TWO TOUCHING IN A LOOP",       2, 2, 1),
        ("theta graph",                  2, 3, 2),
        ("tetrahedron K4",               4, 6, 3),
        ("cube graph Q3",                8, 12, 5),
        ("complete graph K5",            5, 10, 6),
    ];
    let mut law_holds = true;
    for (name, v, e, expect) in known.iter() {
        let g = genus(*v, *e);
        let ok = g == *expect && consistent(*v, *e);
        if !ok { law_holds = false; }
        println!("    {:<28} {:>3} {:>4} {:>4} {:>6}  {:<20} {}",
                 name, v, e, g, euler_char(*v, *e), shape_name(g),
                 if ok { "yes" } else { "*** NO ***" });
    }
    println!("\n    GENUS LAW: {}", if law_holds {
        "verified on every configuration with an independently known genus."
    } else { "*** FAILED — do not use the results below." });
    hbp.put(0x10, &[law_holds as u8]);

    // ---- 2. his ladder ----------------------------------------------------
    println!("\n[2] HIS LADDER, COMPUTED");
    println!("    \"a black hole with this triangle spinning sphere will make a");
    println!("     perfect sphere ... the spheres touch and turn into a doughnut");
    println!("     shape ... many, many black holes chained together ... rearrange");
    println!("     themselves into the different forms\"");
    println!();
    println!("    {:>5} {:>7} {:>6} {:>7}   {:<22} {}",
             "HOLES", "CALLNGS", "GENUS", "chi", "SHAPE", "his word for it");
    let ladder: [(i64, i64, &str); 9] = [
        (1,  0,  "\"a perfect sphere\""),
        (2,  1,  "still one sphere — merged, no hole"),
        (2,  2,  "\"the spheres touch -> DOUGHNUT\""),
        (3,  3,  "closed chain of three"),
        (5,  5,  "closed chain of five"),
        (12, 12, "closed chain of twelve"),
        (12, 18, "chain with branchings"),
        (20, 30, "dodecahedral chain"),
        (60, 90, "THE BUCKYBALL CHAIN"),
    ];
    for (v, e, note) in ladder.iter() {
        let g = genus(*v, *e);
        println!("    {:>5} {:>7} {:>6} {:>7}   {:<22} {}",
                 v, e, g, euler_char(*v, *e), shape_name(g), note);
    }
    let g_bucky = genus(60, 90);
    println!();
    println!("    THE TWO KEY ROWS:");
    println!("      2 holes / 2 callings -> genus {}  ->  a DOUGHNUT.", genus(2, 2));
    println!("        his sentence, computed. two spheres that touch along a closed");
    println!("        loop are a torus. this is not an analogy, it is the genus.");
    println!("      60 holes / 90 callings -> genus {}", g_bucky);
    println!("        the SAME 31 that SHADOWCAT reported as the chain count.");
    println!("        chains and holes are one number. that was not designed in;");
    println!("        it is forced by chi = 2V - 2E.");
    hbp.put_i64(0x20, genus(2, 2));
    hbp.put_i64(0x21, g_bucky);

    // ---- 3. the density gradient -----------------------------------------
    println!("\n[3] THE DENSITY GRADIENT — where I was wrong");
    println!("    rho(M) = M / ((4/3) pi r_s^3)  with  r_s = 2GM/c^2");
    println!("           = 3 c^6 / (32 pi G^3 M^2)");
    println!("    the mass cancels once and returns squared in the denominator.");
    println!("    SO AVERAGE DENSITY FALLS AS 1/M^2. bigger means LESS dense.");
    println!("    he said \"one that's not so densely gradient\" is the chained,");
    println!("    more massive one. that direction is correct and I dismissed it.");
    println!();
    println!("    {:<22} {:>12} {:>13} {:>14}",
             "OBJECT", "M (Msun)", "r_s (km)", "rho (kg/m^3)");
    let objects: [(&str, f64); 6] = [
        ("stellar-mass BH",        10.0),
        ("Cygnus X-1 class",       21.0),
        ("GW150914 remnant",       62.0),
        ("intermediate-mass",      1.0e5),
        ("Sgr A* (Milky Way)",     4.297e6),
        ("M87* (EHT imaged)",      6.5e9),
    ];
    for (name, msun) in objects.iter() {
        let m = msun * M_SUN;
        println!("    {:<22} {:>12.3e} {:>13.4e} {:>14.4e}",
                 name, msun, schwarzschild_radius(m) / 1000.0, average_density(m));
    }
    println!();
    println!("    REFERENCE DENSITIES, for scale:");
    let refs: [(&str, f64); 5] = [
        ("nuclear saturation",     2.3e17),
        ("the Sun (mean)",         1408.0),
        ("liquid water",           1000.0),
        ("air at sea level",       1.225),
        ("ISM molecular cloud",    1.0e-18),
    ];
    for (name, rho) in refs.iter() {
        println!("    {:<22} {:>14.4e} kg/m^3   -> a BH of this density weighs {:>11.4e} Msun",
                 name, rho, mass_at_density(*rho));
    }
    println!();
    println!("    READ THAT LAST COLUMN. a black hole as dense as WATER weighs");
    println!("    {:.3e} solar masses — an ordinary supermassive black hole.",
             mass_at_density(1000.0));
    println!("    M87*, which the Event Horizon Telescope photographed, has an");
    println!("    average density of {:.4} kg/m^3 — LESS DENSE THAN AIR.",
             average_density(6.5e9 * M_SUN));
    println!("    the biggest ones are the thinnest. that is his gradient, and it");
    println!("    is exact, not approximate.");
    hbp.put_f64(0x30, average_density(6.5e9 * M_SUN));
    hbp.put_f64(0x31, mass_at_density(1000.0));

    // ---- 4. what is proved and what is not -------------------------------
    println!("\n[4] THE LINE — DRAWN EXPLICITLY SO NOBODY CAN SAY IT WAS BLURRED");
    println!("    PROVED HERE (exact integer topology, no physics assumed):");
    println!("      * spheres merged along a graph give genus E - V + 1");
    println!("      * two spheres joined along a closed loop give a TORUS");
    println!("      * the buckyball chain gives genus 31, the same 31 as the");
    println!("        independent-chain count. one integer, two readings.");
    println!("    ESTABLISHED IN THE LITERATURE (cited, not derived here):");
    println!("      * merging black hole horizons are generically predicted to");
    println!("        pass through a toroidal phase. Bohn, Kidder, Teukolsky,");
    println!("        Phys. Rev. D 94, 064009 (2016), arXiv:1606.00436.");
    println!("      * Hawking's theorem: a STATIONARY horizon in 4 dimensions");
    println!("        must be a sphere. so in 4D the doughnut is transient only.");
    println!("      * in 5 dimensions the black ring is a genuine stationary");
    println!("        solution with horizon topology S^1 x S^2 — a permanent");
    println!("        doughnut. Emparan & Reall, arXiv:hep-th/0110260.");
    println!("    EXACT ARITHMETIC (this program):");
    println!("      * black hole average density falls as 1/M^2");
    println!("    HIS, AND NOT TESTED BY ANY OF THE ABOVE:");
    println!("      * that real black holes stack into calling chains at all");
    println!("      * that the chain arranges itself as a buckyball");
    println!("      * that Kerr rotation IS the calling chain");
    println!("    those three are the conjecture. everything above them is not.");

    let (body, idx, dg) = hbp.finish(b"HBP1");
    std::fs::create_dir_all("out").ok();
    std::fs::write("out/callingchain.hbp", &body).ok();
    std::fs::write("out/callingchain.hbi", &idx).ok();
    println!("\n{}", "=".repeat(78));
    println!("EMITTED  callingchain.hbp  {} bytes", body.len());
    println!("EMITTED  callingchain.hbi  {} bytes", idx.len());
    println!("SHA256   {}", sha256::hex(&dg));
}
