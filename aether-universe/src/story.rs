//! Story text and the per-region questions. Story files are labelled STORY on their first line.

/// `ch0` is the premise; `ch1` to `ch9` are the nine chapters.
pub static CHAPTERS: [&str; 10] = [
    include_str!("../story/ch0.txt"),
    include_str!("../story/ch1.txt"),
    include_str!("../story/ch2.txt"),
    include_str!("../story/ch3.txt"),
    include_str!("../story/ch4.txt"),
    include_str!("../story/ch5.txt"),
    include_str!("../story/ch6.txt"),
    include_str!("../story/ch7.txt"),
    include_str!("../story/ch8.txt"),
    include_str!("../story/ch9.txt"),
];

/// The ending, printed under the final seal.
pub static ENDING: &str = include_str!("../story/ch9-end.txt");

/// The page the White Field counts when `data/enwik8` is not there. Do not edit it without
/// regenerating `tests/playthrough.txt`: the census of this page is the answer.
pub static WHITE_PAGE: &str = include_str!("../story/white-page.txt");

/// What a region asks.
pub struct RegionText {
    pub question: &'static str,
    /// The shape of the answer token, never its value.
    pub format: &'static str,
    /// Three hints, cumulative: level 1 is always shown.
    pub hints: [&'static str; 3],
    /// A first command worth trying.
    pub first_probe: &'static str,
}

pub static REGION_TEXT: [RegionText; 9] = [
    RegionText {
        question: "How many states do three trits hold, and how far from the centre do they reach?",
        format: "states:reach",
        hints: [
            "A trit has three values: -1, 0, +1. Count the words you can write with three of them.",
            "Try probe 13 and then probe 14. One of them fits in three trits and one does not.",
            "Try the first number that does not fit. Count is not range.",
        ],
        first_probe: "probe 14",
    },
    RegionText {
        question: "How many trits does one PID of the channel need?",
        format: "n",
        hints: [
            "A PID is 64 bits. Every agent's PID is 16 hex characters; probe one.",
            "trits 18446744073709551615 shows the largest 64-bit value in trits, three ways.",
            "The largest PID is 2^64 - 1. How many powers of three until you pass it?",
        ],
        first_probe: "trits 18446744073709551615",
    },
    RegionText {
        question: "Which spoke leads below ten million, and by how many?",
        format: "spoke:lead",
        hints: [
            "Every prime above 3 is 6k+1 or 6k-1. probe 5, probe 7, probe 11, probe 13 show the spokes.",
            "The answer is written like +1:5 or -1:5: the leading spoke, a colon, the size of the lead.",
            "Count every prime to 10^7 by its residue mod 6, then subtract.",
        ],
        first_probe: "probe 5",
    },
    RegionText {
        question: "At which level do the primes below ten million stop sharing a room?",
        format: "level",
        hints: [
            "A room is a place in a ternary map; probe 2 and probe 3 show the rooms of the first two primes.",
            "probe <a> <b> tells you the first level at which two numbers are in different rooms.",
            "A room at level L is the residue mod 3^(3L), written as 3L trits. Which L first exceeds ten million?",
        ],
        first_probe: "probe 2",
    },
    RegionText {
        question: "Does the closure survive eighty-one levels?",
        format: "residual",
        hints: [
            "probe 1, probe 3, probe 9, probe 27, probe 81 walk the exact closure to that depth.",
            "Look at the fracture line: the float column is cited beside the integer column the kernel computes.",
            "The arms are 2a-b-c, 2b-a-c, 2c-a-b. Shift the centre and the arms must not move.",
        ],
        first_probe: "probe 81",
    },
    RegionText {
        question: "How many bits does the lattice need before bytes and symbols agree?",
        format: "bits",
        hints: [
            "Send a word through the lattice: probe hello. Bytes are 8 bits, symbols are 10.",
            "Five bytes go in and four symbols come out. What is five times eight?",
            "The smallest number that both 8 and 10 divide.",
        ],
        first_probe: "probe hello",
    },
    RegionText {
        question: "Which cells of the cube hold primes, and which prime sits on the centre planes?",
        format: "cells:prime",
        hints: [
            "probe 3, probe 9, probe 27, probe 13 show where numbers sit in the 27 cells.",
            "Count the cells that share no factor with 27; then look at what is left.",
            "The centre planes are the nine cells whose residue is a multiple of three.",
        ],
        first_probe: "probe 3",
    },
    RegionText {
        question: "What share of the page is white?",
        format: "per10000",
        hints: [
            "probe some text of your own here: the field counts its white bytes. probe field counts the page the field holds.",
            "White is the bytes 0x20, 0x09, 0x0A and 0x0D. The answer is per 10,000, remainder carried.",
            "Place the genuine enwik8 (the first 100,000,000 bytes of the original enwik9; its sha256 begins 2b49720e) at data/enwik8 and probe the field. The game checks the hash, not just the size.",
        ],
        first_probe: "probe the quick brown fox",
    },
    RegionText {
        question: "What is the star's hash, and where is its centre?",
        format: "sha8:a,b,c",
        hints: [
            "probe star hashes the file and reads its header.",
            "The answer is the first eight hex digits of the hash, a colon, and the three centre numbers.",
            "A star is checked, not believed: hash the bytes and compare them with the sidecar.",
        ],
        first_probe: "probe star",
    },
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_story_file_is_labelled_story_on_its_first_line() {
        for (i, t) in CHAPTERS.iter().enumerate() {
            let first = t.lines().next().unwrap();
            assert_eq!(first, format!("STORY|chapter={i}|json=0"), "chapter {i}");
        }
        assert!(ENDING.starts_with("STORY|chapter=9|json=0"));
    }

    #[test]
    fn story_text_is_ascii() {
        // (the privacy patterns, serials, addresses and phone paths, are checked by tests/privacy.rs)
        let all: Vec<&str> = CHAPTERS
            .iter()
            .copied()
            .chain([ENDING, WHITE_PAGE])
            .collect();
        for t in all {
            assert!(t.is_ascii(), "story text must be ascii");
        }
    }

    #[test]
    fn every_region_has_a_question_a_format_and_three_distinct_hints() {
        for r in &REGION_TEXT {
            assert!(!r.question.is_empty() && !r.format.is_empty());
            assert!(r.hints.iter().all(|h| !h.is_empty()));
            assert!(r.hints[0] != r.hints[1] && r.hints[1] != r.hints[2]);
        }
    }

    #[test]
    fn the_white_page_has_a_short_stable_census() {
        let c = crate::secrets::census_bytes(WHITE_PAGE.as_bytes());
        assert!(c.bytes > 200 && c.white > 40);
        assert!(
            !WHITE_PAGE.contains('\r'),
            "the page must not depend on line endings"
        );
    }
}
