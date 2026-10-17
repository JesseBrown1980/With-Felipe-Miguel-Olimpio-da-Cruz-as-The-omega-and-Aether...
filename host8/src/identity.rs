//! Host8 identity and seat derivations from `federation-1024 servers/host8-serve/src/main.rs`
//! (@dc1da1a9, blob 6cd22f99). The upstream lines are included byte-identical from `src/upstream/`
//! (`main-AAAA-BBBB-*.rs` = `sed -n 'AAAA,BBBBp' main.rs`); the public functions below call them
//! unchanged. Upstream on node `gaia-loader.mjs`: sha16 is its `sha16(s)` (main.rs:583-584), the verb
//! catalog loads "exactly the way gaia-loader.mjs does" (:591), and tuple60d / resolve_instance_pid are
//! "byte-identical to gaia-loader.mjs::tuple60D" / "::resolveAgent" (:619, :647).

/// The upstream source, byte-identical. Upstream's fns and `Seat` are private to its binary, so they
/// stay private here and `api` exposes them under the same names.
mod upstream {
    use alloc::format;
    use alloc::string::{String, ToString};
    use alloc::vec::Vec;
    use sha2::{Digest, Sha256};

    include!("upstream/main-0069-0081-seat-struct.rs");
    include!("upstream/main-0324-0429-seat-parse.rs");
    include!("upstream/main-0536-0589-handle8-sha16.rs");
    include!("upstream/main-0619-0661-tuple60d-instance-pid.rs");

    /// `load_verb_catalog` (main.rs:595-617) after its file read (:596-599): lines 600 and 616 are
    /// restated, lines 601-615 are included.
    fn verb_catalog_parse(body: &str) -> Vec<String> {
        let mut verbs = Vec::new();
        include!("upstream/main-0601-0615-verb-catalog-parse.rs");
        verbs
    }

    pub mod api {
        use alloc::string::String;
        use alloc::vec::Vec;

        /// One registered seat: upstream `Seat` (main.rs:69-81) with its fields public.
        #[derive(Clone, Debug, PartialEq, Eq)]
        pub struct Seat {
            pub name: String,
            pub handle8: String,
            pub cube_bh: String,
            pub hilbert: String,
            pub class: String,
            pub layer: String,
            pub source: String,
        }

        fn seat(s: super::Seat) -> Seat {
            Seat {
                name: s.name,
                handle8: s.handle8,
                cube_bh: s.cube_bh,
                hilbert: s.hilbert,
                class: s.class,
                layer: s.layer,
                source: s.source,
            }
        }

        /// 8-byte (16 hex) host handle: FNV-1a 64 over the canonicalized text (main.rs:536-564).
        pub fn host_handle8(input: &str) -> String {
            super::host_handle8(input)
        }

        /// sha256(input) as 64 lowercase hex chars (main.rs:570-581).
        pub fn sha256hex(input: &str) -> String {
            super::sha256hex(input)
        }

        /// First 16 hex chars of sha256(input), gaia-loader `sha16` (main.rs:583-589).
        pub fn sha16(input: &str) -> String {
            super::sha16(input)
        }

        /// 60D tuple (verb, noun, glyph, sha), gaia-loader `tuple60D` (main.rs:619-645).
        pub fn tuple60d(
            name: &str,
            handle8: &str,
            cube_bh: &str,
            verb_catalog: &[String],
        ) -> (String, String, String, String) {
            super::tuple60d(name, handle8, cube_bh, verb_catalog)
        }

        /// Device-distinct instance PID, gaia-loader `resolveAgent` (main.rs:647-661).
        pub fn resolve_instance_pid(
            handle8: &str,
            device: &str,
            ts: &str,
            verb: &str,
            noun: &str,
            glyph: &str,
            sha: &str,
        ) -> String {
            super::resolve_instance_pid(handle8, device, ts, verb, noun, glyph, sha)
        }

        /// Verb axis from a `verbs.hbp` body: the first `|entry=<verb>|` capture of each line, in
        /// order (main.rs:591-617; the caller reads the file). Measured: on a line such as
        /// `|entry=|entry=a|` this yields no verb, while bigpickle-rebuild `src/gaia-loader.mjs:95`
        /// (blob 703cb8e2, `line.match(/\|entry=([^|]+)\|/)`) yields `a`.
        pub fn verb_catalog_from_hbp(body: &str) -> Vec<String> {
            super::verb_catalog_parse(body)
        }

        /// Seat from one combined (FORMULA/CHIEF/SOS/PROF) or feed REG row (main.rs:364-388).
        pub fn seat_from_row(line: &str, source: &str) -> Option<Seat> {
            super::seat_from_row(line, source).map(seat)
        }

        /// Seat from one per-seat `sup-*`/`agent-*` file body (main.rs:390-429).
        pub fn seat_from_per_seat_file(body: &str, source: &str) -> Option<Seat> {
            super::seat_from_per_seat_file(body, source).map(seat)
        }
    }

    /// Upstream's own tests (main.rs:1572-1616 and 1654-1711), byte-identical.
    #[cfg(test)]
    mod upstream_tests {
        use super::*;

        include!("upstream/main-1572-1616-seat-tests.rs");
        include!("upstream/main-1654-1711-node-parity-tests.rs");
    }
}

pub use upstream::api::{
    host_handle8, resolve_instance_pid, seat_from_per_seat_file, seat_from_row, sha16, sha256hex,
    tuple60d, verb_catalog_from_hbp, Seat,
};

#[cfg(test)]
mod tests {
    use super::*;
    use alloc::string::{String, ToString};
    use alloc::vec::Vec;

    /// Each `src/upstream/main-AAAA-BBBB-*.rs` equals lines AAAA..=BBBB of the vendored main.rs,
    /// whose sha256 is pinned in UPSTREAM.sha256.
    #[test]
    fn included_slices_equal_vendored_main_rs_lines() {
        let main = include_str!("../vendor/federation-1024/servers/host8-serve/src/main.rs");
        let lines: Vec<&str> = main.split_inclusive('\n').collect();
        let slices: [(usize, usize, &str); 7] = [
            (
                69,
                81,
                include_str!("upstream/main-0069-0081-seat-struct.rs"),
            ),
            (
                324,
                429,
                include_str!("upstream/main-0324-0429-seat-parse.rs"),
            ),
            (
                536,
                589,
                include_str!("upstream/main-0536-0589-handle8-sha16.rs"),
            ),
            (
                601,
                615,
                include_str!("upstream/main-0601-0615-verb-catalog-parse.rs"),
            ),
            (
                619,
                661,
                include_str!("upstream/main-0619-0661-tuple60d-instance-pid.rs"),
            ),
            (
                1572,
                1616,
                include_str!("upstream/main-1572-1616-seat-tests.rs"),
            ),
            (
                1654,
                1711,
                include_str!("upstream/main-1654-1711-node-parity-tests.rs"),
            ),
        ];
        for (first, last, slice) in slices {
            assert_eq!(
                lines[first - 1..last].concat(),
                slice,
                "main.rs:{first}-{last}"
            );
        }
    }

    #[test]
    fn sha256hex_matches_canonical_empty_digest() {
        // The published SHA-256 of the empty string; proves the sha2 wiring equals node crypto.
        assert_eq!(
            sha256hex(""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(sha16(""), "e3b0c44298fc1c14");
        assert_eq!(sha256hex("").len(), 64);
    }

    #[test]
    fn host_handle8_is_16_lowercase_hex() {
        let h = host_handle8("seat-1");
        assert_eq!(h.len(), 16);
        assert!(h
            .chars()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
    }

    #[test]
    fn host_handle8_measured_vectors() {
        // Measured here and by a Python stdlib FNV-1a recomputation; upstream pins no handle8 vector.
        assert_eq!(host_handle8("seat-1"), "ec5895e2535aa64a");
        assert_eq!(host_handle8("a\t\r\nb"), "e63f991904833892");
        // main.rs:540-544: a run of tab/CR/LF becomes one space before hashing.
        assert_eq!(host_handle8("a\t\r\nb"), host_handle8("a b"));
    }

    #[test]
    fn resolve_instance_pid_is_deterministic_and_16_hex() {
        let a = resolve_instance_pid(
            "0123456789abcdef",
            "acer",
            "1750000000",
            "report",
            "seat",
            "g",
            "s",
        );
        let b = resolve_instance_pid(
            "0123456789abcdef",
            "acer",
            "1750000000",
            "report",
            "seat",
            "g",
            "s",
        );
        assert_eq!(a, b);
        assert_eq!(a.len(), 16);
    }

    #[test]
    fn empty_verb_catalog_yields_report() {
        let (verb, noun, _glyph, sha) = tuple60d("seat", "0123456789abcdef", "cube", &[]);
        assert_eq!(verb, "report");
        assert_eq!(noun, "seat");
        assert_eq!(sha, "0123456789abcdef");
    }

    #[test]
    fn formula_chief_tuple_and_instance_pid_with_single_entry_catalog() {
        // Upstream's node vectors (main.rs:1669-1676) through the public API, with the single-entry
        // catalog upstream's summon test uses (main.rs:1760).
        let catalog = ["format".to_string()];
        let (verb, noun, glyph, sha) =
            tuple60d("FORMULA-CHIEF", "0155964ffc8ef1f8", "BH.51.0.591", &catalog);
        assert_eq!(verb, "format");
        assert_eq!(noun, "FORMULA-CHIEF");
        assert_eq!(glyph, "c844dff6b59b40cf");
        assert_eq!(sha, "0155964ffc8ef1f8");
        let pid = resolve_instance_pid(
            "0155964ffc8ef1f8",
            "acer",
            "1750000000",
            &verb,
            &noun,
            &glyph,
            &sha,
        );
        assert_eq!(pid, "d125579d9644c37a");
        assert_eq!(sha16("abc"), "ba7816bf8f01cfea");
    }

    #[test]
    fn verb_index_for_the_73_entry_catalog() {
        // main.rs:1663 states node selected "format" from a 73-entry verbs.hbp. The selector is
        // u32 0x1a5df878 = 442366072 (sha16("0155964ffc8ef1f8|verb")[..8]) and 442366072 % 73 = 15.
        // That catalog file is not on disk; the other 72 names here are placeholders.
        let mut catalog: Vec<String> = (0..73).map(|i| alloc::format!("placeholder-{i}")).collect();
        catalog[15] = "format".to_string();
        let (verb, ..) = tuple60d("FORMULA-CHIEF", "0155964ffc8ef1f8", "BH.51.0.591", &catalog);
        assert_eq!(verb, "format");
        assert_eq!(&sha16("0155964ffc8ef1f8|verb")[..8], "1a5df878");
    }

    #[test]
    fn verb_catalog_from_hbp_takes_the_first_entry_of_each_line_in_order() {
        let body = "VERBHDR|count=3\n\
                    VERB|entry=format|axis=verb\n\
                    VERB|entry=report|x=1|entry=second|\n\
                    VERB|entry=|empty\n\
                    VERB|entry=no-closing-pipe\n\
                    noise\n\
                    VERB|entry=scan|\r\n";
        assert_eq!(verb_catalog_from_hbp(body), ["format", "report", "scan"]);
        assert!(verb_catalog_from_hbp("").is_empty());
        // main.rs:605-610 reads only the first `|entry=` of a line.
        assert!(verb_catalog_from_hbp("VERB|entry=|entry=a|\n").is_empty());
    }

    #[test]
    fn public_seat_carries_every_upstream_field() {
        // Row from upstream's test at main.rs:1586.
        let chief = "CHIEF|FORMULA-CHIEF|PID=0155964ffc8ef1f8|HILBERT=1339|LAYER=chief|CLASS=level3_chief|GLYPH_BEHCS1024=591|CUBE_BH=BH.51.0.591|role=x|reports_to=COL-ASOLARIA-HELM";
        let s = seat_from_row(chief, "f").expect("chief parses");
        assert_eq!(
            s,
            Seat {
                name: "FORMULA-CHIEF".to_string(),
                handle8: "0155964ffc8ef1f8".to_string(),
                cube_bh: "BH.51.0.591".to_string(),
                hilbert: "1339".to_string(),
                class: "level3_chief".to_string(),
                layer: "chief".to_string(),
                source: "f".to_string(),
            }
        );
        // Body from upstream's test at main.rs:1608.
        let body = "NAME|AGT-C4\nPID|f679158eb8ca4531|birth=2026-05-29T20:30:30.763Z|authority=X\nHILBERT|930\nLAYER|supervisor\nCLASS|hyperbehcs_supervisor_entity\n";
        let p = seat_from_per_seat_file(body, "sup").expect("per-seat parses");
        assert_eq!(p.handle8, "f679158eb8ca4531");
        assert_eq!(p.name, "AGT-C4");
        assert_eq!(p.cube_bh, "");
        assert!(seat_from_per_seat_file("NAME|x\n", "sup").is_none());
    }
}
