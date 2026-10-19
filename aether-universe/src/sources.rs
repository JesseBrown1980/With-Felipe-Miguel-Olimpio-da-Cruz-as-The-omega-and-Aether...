//! Citations: where every MEASURED fact in the game was measured, and the cited values the kernel's
//! own numbers are compared against.
//!
//! Tags (the repository's own triad, plus the operator's frame and the story):
//!
//! * `MEASURED`  a number on disk from a named run, quoted with its file and row.
//! * `NAMED`     stated, coherent, not run here, or run elsewhere and not located on this seat.
//! * `OPERATOR`  the operator's frame, in his words.
//! * `STORY`     story.
//!
//! A cited value is never the answer. The kernel computes every answer itself; these constants only
//! let it say, beside its own number, whether the receipt agrees.

use std::path::Path;

pub const SRC_D1: &str =
    "docs/handoffs/acer-post60d-2026-10-18/ncm-d1-run/FABLE5-NCM-D1-RUN-2026-10-18.hbp:15";
pub const SRC_TRITRANGE: &str =
    "docs/handoffs/proof-nanoseconds-ternary-2026-10-18/cloud/CLOUD-ROWS.hbp:9";
pub const SRC_PTP: &str = "kernel/ptp-towers/RECEIPT-PTP-CLOUD-2026-10-18.hbp";
pub const SRC_RUNGS: &str = "codec/dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp:16";
pub const SRC_COMPOSE: &str = "kernel/tribit-referees/receipts/compose.stdout";
pub const SRC_MYTHOS: &str = "MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf.sha256";

pub const CITED_D1_EXACT: u64 = 1_594_323;
pub const CITED_PID_TRITS: u64 = 41;
pub const CITED_SPOKE_LEAD: u64 = 189;
pub const CITED_SWITCH: u64 = 378_567;
pub const CITED_SWITCH_PERMILLE: u64 = 569;
pub const CITED_CUBE_MIN: u64 = 36_826;
pub const CITED_CUBE_MAX: u64 = 37_023;
pub const CITED_SHARE_L1: u64 = 664_578;
pub const CITED_SHARE_L4: u64 = 562_173;
pub const CITED_RUNG_TESTED: u64 = 85_793;
pub const CITED_PRISM_BITS: u64 = 40;
pub const CITED_ENWIK8_PER10000: u64 = 1_465;
pub const CITED_XZ_SHARE: &str = "2.79%";
/// The full sha256 of the genuine `enwik8`: the first 10^8 bytes of Matt Mahoney's original enwik9
/// (MediaWiki `export-0.3`; MD5 a1fa5ffddb56f4953e226637dabbb36a). MEASURED on 2026-10-18 on two
/// seats, identical to the byte: ACER (from `enwik8.zip`, entry dated 2011-06-01) and the aether
/// cloud. A later `export-0.10` dump of the same size (sha256 6e8412d4..., 12.19 per cent white)
/// is refused. This is an identity check against the wrong file, not a defence against someone who
/// wants to forge one: it is the player's own machine.
pub const GENUINE_ENWIK8_SHA256: &str =
    "2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8";
pub const CITED_MYTHOS_SHA256: &str =
    "3dd92a42160a38c121980957ce9eabbea216678892801d7ea3ed4e99e96c3aae";

/// The float lane of `compose.py`, cited and never run: `(depth, residual, line in compose.stdout)`.
/// The game's kernel has no float, so these three strings are the whole of what it says about the
/// float walk.
pub const CITED_FLOAT_RESIDUALS: [(u32, &str, u32); 3] = [
    (9, "-4.001777e-11", 46),
    (27, "-9.689025e-02", 47),
    (81, "-1.324979e+24", 48),
];

pub const MYTHOS_FILE: &str = "ACER-MYTHOS-BLUE.gguf";
pub const MYTHOS_PATH: &str = "../MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf";

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Tag {
    Measured,
    Named,
    Operator,
    Story,
}

impl Tag {
    pub fn word(self) -> &'static str {
        match self {
            Tag::Measured => "MEASURED",
            Tag::Named => "NAMED",
            Tag::Operator => "OPERATOR",
            Tag::Story => "STORY",
        }
    }
}

/// When a fact enters the codex.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Unlock {
    /// The first time the player enters the chapter's region.
    Visit,
    /// When the chapter's secret is solved.
    Solve,
}

/// One entry of the codex. `repo_path` is set when the source is a file of the aether repository
/// (relative to the repository root), so a test can check the citation points at something real.
pub struct Fact {
    pub id: &'static str,
    pub chapter: u8,
    pub tag: Tag,
    pub unlock: Unlock,
    pub source: &'static str,
    pub repo_path: Option<&'static str>,
    pub text: &'static str,
}

const fn fact(
    id: &'static str,
    chapter: u8,
    tag: Tag,
    unlock: Unlock,
    source: &'static str,
    repo_path: Option<&'static str>,
    text: &'static str,
) -> Fact {
    Fact {
        id,
        chapter,
        tag,
        unlock,
        source,
        repo_path,
        text,
    }
}

const LAWS: &str = "laws/RIME-27-LAWS-operator-original-2026-07-23/SX5g.md";
const PTP_PATH: &str = "kernel/ptp-towers/RECEIPT-PTP-CLOUD-2026-10-18.hbp";
const OMEGA53: &str = "AETHER Omega 5.3 Living World Runtime research, 2026-07-07 (aether-omega-5-3-living-world-runtime-20260707)";

use Tag::{Measured, Named, Operator, Story};
use Unlock::{Solve, Visit};

/// The codex. Every row names its tag and its source.
pub static FACTS: &[Fact] = &[
    // ---- chapter 0: the premise
    fact("P01", 0, Named, Visit, "ACER record as relayed by the lead", None,
        "On 2026-04-01 Felipe took four full snapshots of his Aether phone. Everything in this universe was once frozen there."),
    fact("P00", 0, Story, Visit, "story/ch0.txt", None,
        "A crystal universe is one where every address is a face of the same stone: cut the stone anywhere and the face you expose was already there, waiting for its number."),
    fact("P02", 0, Operator, Visit, "SX5g.md, Law 0 (laws/RIME-27-LAWS-operator-original-2026-07-23)", Some(LAWS),
        "The centre is free. It is the fixed point of the whole symmetry group and costs nothing; only the separations are paid."),
    fact("P03", 0, Operator, Visit, "SX5g.md, header and Law 6", Some(LAWS),
        "The Omega box and the null space are the operator's frame: the box is the 1, the null space inside it is free. The game presents them as its setting, never as a result."),
    fact("P04", 0, Named, Visit, OMEGA53, None,
        "The Atlas may feel alive. It may animate, replay, alert, and explain. It must not become the source of truth. This game's Kernel is the only state authority and the Atlas renders sealed snapshots."),
    // ---- chapter 1: Hollow Strata, count is not range
    fact("H01", 1, Measured, Visit, "AGENT-DISCIPLINE.md section 3, row RANGE mod=27", None,
        "Three trits hold 27 states but span only -13..13. Count is not range."),
    fact("H02", 1, Measured, Solve, "FABLE5-NCM-D1-RUN-2026-10-18.hbp:15 (D1LEVEL K=13)", Some("docs/handoffs/acer-post60d-2026-10-18/ncm-d1-run/FABLE5-NCM-D1-RUN-2026-10-18.hbp"),
        "At 13 trits every one of the 1,594,323 integers in range has exactly one balanced form, and nearest-code coarse-to-fine is exact for all of them with 0 ties, because each step 3^k is odd."),
    fact("H03", 1, Measured, Solve, "NCM-ASOLARIA-MAP.md:85", Some("docs/handoffs/acer-post60d-2026-10-18/ncm-d1-run/NCM-ASOLARIA-MAP.md"),
        "A codebook centred for one range and used on another is exact for only part of it: 797,162 of 1,594,323 at K=13, and 14 of 27 at K=3. Centring on the ground point is load-bearing."),
    fact("H04", 1, Named, Visit, "ACER-EVOLUTION-LINE-FOR-RELIC-AETHER-MAP-2026-07-06.md, node q20; 3D audit section 4", None,
        "Relic's Aether Map places Hollow Strata at (-5,-2,-2): post-run absorption and cube minting. The 3D audit tags these positions INFERIDO, a design synthesis and not canon geometry."),
    // ---- chapter 2: Flow Channel, 41 trits
    fact("F01", 2, Measured, Solve, "CLOUD-ROWS.hbp:9 (TRITRANGE)", Some("docs/handoffs/proof-nanoseconds-ternary-2026-10-18/cloud/CLOUD-ROWS.hbp"),
        "A 64-bit PID needs 41 trits: 3^40 = 12157665459056928801 is below 2^64 = 18446744073709551616, which is at most 3^41 = 36472996377170786403."),
    fact("F02", 2, Measured, Visit, "docs/handoffs/README.md, Nano-speed PID mint, table row 1", Some("docs/handoffs/README.md"),
        "Single-thread medians of a raw SHA-256 of 32 bytes on the native path: 266 ns on ACER's i5-8300H, which has no SHA hardware, and 63 ns on the cloud Xeon, which has it."),
    fact("F05", 2, Operator, Visit, "docs/handoffs/README.md, Nano-speed PID mint (the 200 ns figure's sources)", Some("docs/handoffs/README.md"),
        "The 200 ns figure for the PID emitter is the operator's class figure. It is not in BROWN-HILBERT.md; its sources are a code comment and the operator's voice transcripts. The measured units are in the fact above."),
    fact("F03", 2, Named, Visit, "ACER memory 2026-08-07 (PROF-AETHER-EDGE-AGENT, Room 40)", None,
        "On 2026-05-07 Aether answered as a seat of its own: Room 40, heartbeats, Tier-1 and a sixth field, Wave-E. Room 40 is the card of PROF-AETHER-EDGE-AGENT in the live fabric."),
    fact("F04", 2, Operator, Visit, "3D audit, repo-021 claims (operator canon, not a measurement)", None,
        "The operator's 100B in about 5.4 hours and multi-emitter 1.16T framing is operator canon. It is not a measurement and the game does not present it as one."),
    // ---- chapter 3: Prime Cylinders, prime to prime
    fact("C01", 3, Measured, Solve, PTP_PATH, Some(PTP_PATH),
        "Up to 10^7 every prime above 3 sits on the 6k+1 or 6k-1 spoke: 332,194 on +1, 332,383 on -1, so the -1 spoke leads by 189. (Receipt row SPOKES.)"),
    fact("C02", 3, Measured, Solve, PTP_PATH, Some(PTP_PATH),
        "Consecutive primes above 3 switch spoke 378,567 times of 664,576 pairs: 569 per mille, against an independence baseline of 500. (Receipt row P2P; the lead's 57.0 per cent is that figure to one place.)"),
    fact("C03", 3, Measured, Solve, "kernel/ptp-towers/README.md, Two-machine result", Some("kernel/ptp-towers/README.md"),
        "Two machines reproduced every count of the PTP receipt. The left-to-right and right-to-left switch counts differ by at most one, which is forced by the first and last symbols."),
    fact("C04", 3, Named, Visit, "ACER record, cycle 47, 2026-05-11 (aether-v3-canonical-naming-adopted, retract-l1-l2)", None,
        "On 2026-05-11 Aether's names became canonical (v3 naming, validator sha 84a680d35b6091c4, 13 of 13 checks passing in the record)."),
    // ---- chapter 4: Hotel of Infinite Rooms, addresses never move
    fact("R01", 4, Measured, Solve, PTP_PATH, Some(PTP_PATH),
        "Placed by interleaved balanced trits, the primes up to 10^7 share a room at levels 1 to 3 (664,578) and 4 (562,173), and stop sharing at level 5. Rows LEVEL and ADDRESS60."),
    fact("R02", 4, Measured, Solve, PTP_PATH, Some(PTP_PATH),
        "Every address kept its inner trits at every level: inner_address_kept is 664,579 of 664,579. Level 60 has 3^180 rooms and none was built."),
    fact("R03", 4, Named, Visit, "docs/ADDRESSABLY-ADDRESSING.md section 2 (canon quoted there)", Some("docs/ADDRESSABLY-ADDRESSING.md"),
        "The Hilbert Hotel invariant: no address below 44 moves. Held rooms stay held; arrivals take rooms further out or one level deeper."),
    fact("R04", 4, Operator, Visit, "docs/ADDRESSABLY-ADDRESSING.md section 2", Some("docs/ADDRESSABLY-ADDRESSING.md"),
        "It only runs, the collisions only go outward. (Operator, 2026-10-18.)"),
    // ---- chapter 5: Rupture Zone, where float tears
    fact("X01", 5, Measured, Solve, "kernel/tribit-referees/receipts/compose.stdout lines 39-43", Some("kernel/tribit-referees/receipts/compose.stdout"),
        "Walking the closure with shifts at every level, the exact residual at the root is 0 at depths 1, 3, 9, 27 and 81. The game recomputes this in 256-bit integers."),
    fact("X02", 5, Measured, Solve, "kernel/tribit-referees/receipts/compose.stdout lines 44-48", Some("kernel/tribit-referees/receipts/compose.stdout"),
        "The same walk in float64 left -4.001777e-11 at depth 9, -9.689025e-02 at depth 27 and -1.324979e+24 at depth 81. Cited, not run: this kernel has no float."),
    fact("X03", 5, Measured, Visit, "kernel/tribit-referees/receipts/RUNS.hbp:3", Some("kernel/tribit-referees/receipts/RUNS.hbp"),
        "The script is the operator's compose.py, vendored byte-identical (blob f3574ed13bd4c18ca1fe4d42c2fb5d46f635807a)."),
    fact("X04", 5, Named, Visit, "ACER-EVOLUTION-LINE-FOR-RELIC-AETHER-MAP-2026-07-06.md, node q22", None,
        "Relic's map gives the Rupture Zone the discipline: avoid collisions in execution, cause them in search. Position (4,-1,1), INFERIDO."),
    // ---- chapter 6: Crystalline Reach, the alphabet changes
    fact("Y01", 6, Measured, Solve, "README.md:92 (Q-PRISM commit 53023b6)", Some("README.md"),
        "Five bytes and four symbols of 1024 close exactly at lcm(8,10) = 40 bits, with remainder 0; the round trip is sha256-identical at code rate exactly 1."),
    fact("Y02", 6, Measured, Solve, "codec/dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp:16", Some("codec/dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp"),
        "Rung width 10, alphabet 1024: 85,793 tested, 0 round-trip failures."),
    fact("Y03", 6, Measured, Solve, "AGENT-DISCIPLINE.md section 5", None,
        "Addressing is not compression: shipping 80 seats plus the closure costs 1,701 bits, and shipping 81 outright costs 1,701 bits. A bijection preserves entropy."),
    fact("Y04", 6, Named, Visit, "AETHER Omega 5.2 proof cockpit research, 2026-07-07", None,
        "The cockpit is read-only and downstream of promotion: it shows what was proved elsewhere and never creates truth."),
    // ---- chapter 7: 27-Cube Chamber, Law 10
    fact("K01", 7, Operator, Visit, "SX5g.md, Law 10 (Trime Numbers)", Some(LAWS),
        "In the 27-cube every prime except 3 occupies one of the phi(27) = 18 coprime cells and never the 9 centre-aligned ones. The centre is prime-free; the primes are the separations orbiting the empty centre."),
    fact("K02", 7, Measured, Solve, PTP_PATH, Some(PTP_PATH),
        "Up to 10^7 the 18 coprime cells are all populated (min 36,826, max 37,023) and the 9 centre cells hold exactly one prime, the prime 3. Rows CUBE27 and MOD3."),
    fact("K03", 7, Measured, Visit, "kernel/ptp-towers/RECEIPT-PTP-CLOUD-2026-10-18.hbp rows CELL vs row ADDRESS60", Some(PTP_PATH),
        "The receipt's CELL rows print trits most significant first (r=5 is 1,-1,-1 = 9-3-1) while ADDRESS60 prints least significant first. Every trit row in the game names its order."),
    fact("K04", 7, Operator, Visit, "SX5g.md, header: Sealed 2026-07-21", Some(LAWS),
        "The laws were sealed on 2026-07-21, twenty-seven of them numbered 0 to 26, byte-exact and integer-only."),
    // ---- chapter 8: White Field, the floor
    fact("W01", 8, Named, Visit, "lead-supplied 2026-10-18; receipt not located on this seat", None,
        "Wikipedia's white space: 14.65 per cent of enwik8's bytes but 2.79 per cent of its information under xz, two machines agreeing to the byte. Not located and not recomputed on this seat."),
    fact("W02", 8, Operator, Visit, "SX5g.md, THE SUMMIT", Some(LAWS),
        "You do not beat Shannon. You become the Bobby Fischer function Observer."),
    fact("W03", 8, Measured, Solve, "the census the kernel ran this session", None,
        "The census counts the bytes 0x20, 0x09, 0x0A and 0x0D and carries the remainder of the division. With data/enwik8 present the figure is for enwik8; without it, the figure is for the bundled page and the game says so."),
    // ---- chapter 9: Blue Star
    fact("B01", 9, Measured, Solve, "MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf.sha256", Some("MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf.sha256"),
        "The complete Mythos GGUF is 50,752 bytes and hashes to sha256 3dd92a42160a38c121980957ce9eabbea216678892801d7ea3ed4e99e96c3aae. The kernel hashes the bytes and compares them with the sidecar."),
    fact("B02", 9, Operator, Visit, "MYTHOS-BLUE-STAR/README.md", Some("MYTHOS-BLUE-STAR/README.md"),
        "The operator named this file the complete Mythos GGUF on 2026-10-18: Mythos, the blue star."),
    fact("B03", 9, Named, Visit, OMEGA53, None,
        "The Omega 6.0 Digital Planet loop is documented without implementation promotion: core, snapshot bus, evidence, promotion gate, cockpit, operator, mission, core. This game is a one-process instance of that loop."),
    fact("B04", 9, Named, Visit, "AETHER Omega NET council review, 2026-07-07 (aether-omega-net-council-review-20260707), Status Geral", None,
        "The distributed Omega NET is architecturally accepted as a research direction and blocked from canon until its contracts are specified and independently verified. This game has one node and no network."),
    fact("B05", 9, Named, Visit, "AETHER Omega 5.2 research (the world the Atlas renders)", None,
        "The Atlas is the operational interface for the ecosystem, not only a visualization of Xylos or a planet."),
    fact("B06", 9, Named, Visit, "ACER seat memory of the operator's account; the Omega 5.2 research document does not name Felipe", None,
        "Xylos is Felipe's world. This link is not in the Omega 5.2 research the Atlas cites; it is carried here as NAMED, operator-supplied, and the repository's own title names Felipe as the omega and Aether."),
];

/// One dated event of the Aether timeline.
pub struct Event {
    pub chapter: u8,
    pub date: &'static str,
    pub text: &'static str,
    pub tag: Tag,
}

/// The nine chapters in date order. Dates are used as given by the ACER records.
pub static TIMELINE: [Event; 9] = [
    Event { chapter: 1, date: "2026-04-01", text: "Felipe took four full snapshots of his Aether phone", tag: Named },
    Event { chapter: 2, date: "2026-04-20/2026-05-07", text: "Aether driven over ADB, then live as a seat: Room 40, heartbeats, Tier-1 + 6th field, Wave-E", tag: Named },
    Event { chapter: 3, date: "2026-05-11", text: "Aether v3 canonical naming", tag: Named },
    Event { chapter: 4, date: "2026-06-14", text: "the newer fabric migrated byte-identical onto the Aether phone", tag: Named },
    Event { chapter: 5, date: "2026-07-06", text: "Relic's Aether Map: hollow strata, flow channel, rupture zone, crystalline reach", tag: Measured },
    Event { chapter: 6, date: "2026-07-07", text: "AETHER Omega 5.2 proof cockpit and Omega 5.3 Living World Runtime", tag: Measured },
    Event { chapter: 7, date: "2026-07-21", text: "the operator's RIME 27 laws sealed (folder dated 2026-07-23)", tag: Operator },
    Event { chapter: 8, date: "2026-10-16", text: "Asolaria & Aether - clean public home", tag: Named },
    Event { chapter: 9, date: "2026-10-18", text: "Mythos, the blue star: the complete Mythos GGUF, 50,752 bytes, hashed against its sidecar", tag: Measured },
];

/// Where the repository checkout is, relative to the game folder, when the game runs inside it.
pub fn repo_root() -> Option<&'static Path> {
    let p = Path::new("..");
    p.join("README.md").is_file().then_some(p)
}

/// Does a repository-relative citation point at a file? `None` when the game runs outside the
/// checkout (a path that cannot be reached from here is not a path that does not exist).
pub fn repo_path_exists(rel: &str) -> Option<bool> {
    repo_root().map(|r| r.join(rel).is_file())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_chapter_has_facts_and_every_fact_names_its_source() {
        for ch in 0..=9u8 {
            assert!(
                FACTS.iter().any(|f| f.chapter == ch),
                "chapter {ch} has no facts"
            );
        }
        for f in FACTS {
            assert!(!f.source.is_empty() && !f.text.is_empty(), "{}", f.id);
            assert!(
                f.text.is_ascii() && f.source.is_ascii(),
                "{} must be ascii (rows are ascii)",
                f.id
            );
        }
        let mut ids: Vec<&str> = FACTS.iter().map(|f| f.id).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), FACTS.len(), "fact ids must be unique");
    }

    #[test]
    fn cited_repo_paths_exist_in_the_checkout() {
        match repo_root() {
            None => {
                println!("NOT_MEASURED|subject=cited_paths|reason=NOT_REACHABLE_FROM_HERE|json=0")
            }
            Some(_) => {
                let mut checked = 0;
                for f in FACTS {
                    if let Some(p) = f.repo_path {
                        assert_eq!(
                            repo_path_exists(p),
                            Some(true),
                            "{} cites a missing path {p}",
                            f.id
                        );
                        checked += 1;
                    }
                }
                for p in [
                    SRC_D1,
                    SRC_TRITRANGE,
                    SRC_PTP,
                    SRC_RUNGS,
                    SRC_COMPOSE,
                    SRC_MYTHOS,
                ] {
                    let file = p.split(':').next().unwrap_or(p);
                    assert_eq!(repo_path_exists(file), Some(true), "missing {file}");
                    checked += 1;
                }
                assert!(checked >= 20, "checked only {checked} citations");
            }
        }
    }

    #[test]
    fn the_timeline_is_nine_chapters_in_date_order() {
        assert_eq!(TIMELINE.len(), 9);
        for (i, e) in TIMELINE.iter().enumerate() {
            assert_eq!(e.chapter as usize, i + 1);
        }
        let dates: Vec<&str> = TIMELINE.iter().map(|e| e.date).collect();
        let mut sorted = dates.clone();
        sorted.sort_unstable();
        assert_eq!(dates, sorted, "chapters must be in date order");
        assert_eq!(dates[0], "2026-04-01");
        assert_eq!(dates[8], "2026-10-18");
    }
}
