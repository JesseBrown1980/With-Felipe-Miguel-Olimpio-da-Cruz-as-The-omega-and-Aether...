//! The vendored asolaria-matrix-in-colour @ 7035def against its pins, its own sidecars, `.hbi`
//! rows and frame chain, and the Light Harness verdict it records.

use matrix_in_colour::hbp::{check_hbi, lf_to_crlf, row, seal, text_lines, Row};
use matrix_in_colour::{sha256_hex, VENDOR};
use std::path::{Path, PathBuf};

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn read(rel: &str) -> Vec<u8> {
    std::fs::read(root().join(VENDOR).join(rel)).unwrap()
}

fn rows_of(bytes: &[u8]) -> Vec<Row<'_>> {
    text_lines(bytes)
        .unwrap()
        .into_iter()
        .map(|l| row(l).unwrap())
        .collect()
}

fn files_under(dir: &Path, prefix: &str, out: &mut Vec<String>) {
    for entry in std::fs::read_dir(dir).unwrap() {
        let entry = entry.unwrap();
        let name = format!("{prefix}{}", entry.file_name().to_str().unwrap());
        if entry.file_type().unwrap().is_dir() {
            files_under(&entry.path(), &format!("{name}/"), out);
        } else {
            out.push(name);
        }
    }
}

fn vendored() -> Vec<String> {
    let mut out = Vec::new();
    files_under(&root().join(VENDOR), "", &mut out);
    out.sort_unstable();
    out
}

fn stems() -> Vec<String> {
    let mut stems: Vec<String> = ["INDEX", "CORRECTION", "HARNESS-VERDICT"]
        .map(String::from)
        .to_vec();
    stems.extend((1..=10).map(|n| format!("receipts/matrix-min-{n:02}")));
    stems
}

#[test]
fn every_pin_holds_and_every_vendored_file_is_pinned() {
    let text = std::fs::read_to_string(root().join("UPSTREAM.sha256")).unwrap();
    let mut pinned = Vec::new();
    for line in text.lines() {
        let (hex, path) = line.split_once("  ").unwrap();
        assert_eq!(
            sha256_hex(&std::fs::read(root().join(path)).unwrap()),
            hex,
            "{path}"
        );
        pinned.push(path.to_string());
    }
    assert_eq!(pinned.len(), 67);
    let files = vendored();
    assert_eq!(files.len(), 66);
    for f in files {
        assert!(
            pinned.contains(&format!("{VENDOR}/{f}")),
            "{f} is not pinned"
        );
    }
}

/// Every `<hex>  <name>` sidecar names a file in its own directory, and holds.
#[test]
fn every_sidecar_holds() {
    let sidecars: Vec<String> = vendored()
        .into_iter()
        .filter(|f| f.ends_with(".sha256"))
        .collect();
    assert_eq!(sidecars.len(), 27);
    for s in sidecars {
        let line = String::from_utf8(read(&s)).unwrap();
        let (hex, name) = line.strip_suffix('\n').unwrap().split_once("  ").unwrap();
        assert!(!name.contains('/'), "{s}");
        let target = match s.rsplit_once('/') {
            Some((dir, _)) => format!("{dir}/{name}"),
            None => name.to_string(),
        };
        assert_eq!(sha256_hex(&read(&target)), hex, "{s}");
    }
}

/// .gitattributes:13-20 pins `*.md *.hbp *.hbi *.txt *.py *.sha256 .gitattributes` to LF.
#[test]
fn text_stays_lf() {
    let lf = [".md", ".hbp", ".hbi", ".txt", ".py", ".sha256"];
    let text: Vec<String> = vendored()
        .into_iter()
        .filter(|f| f == ".gitattributes" || lf.iter().any(|e| f.ends_with(e)))
        .collect();
    assert_eq!(text.len(), 56);
    for f in text {
        let bytes = read(&f);
        assert!(!bytes.contains(&b'\r') && bytes.ends_with(b"\n"), "{f}");
    }
}

#[test]
fn every_hbi_row_is_its_hbp_line() {
    let mut rows = 0;
    for stem in stems() {
        rows += check_hbi(&read(&format!("{stem}.hbi")), &read(&format!("{stem}.hbp"))).unwrap();
    }
    assert_eq!(rows, 69);
}

/// Each receipt's `frame_hash` seals its first three rows, the next receipt's header carries its
/// first 16 hex, the photo row names the frame's bytes, and INDEX.hbp repeats each receipt.
#[test]
fn the_frame_chain_holds() {
    let index_bytes = read("INDEX.hbp");
    let index = rows_of(&index_bytes);
    assert_eq!(index.len(), 10);
    let mut prev = "0".repeat(16);
    for n in 1..=10 {
        let bytes = read(&format!("receipts/matrix-min-{n:02}.hbp"));
        let lines = text_lines(&bytes).unwrap();
        let rows: Vec<Row<'_>> = lines.iter().map(|l| row(l).unwrap()).collect();
        let kinds: Vec<&str> = rows.iter().map(|r| r.kind).collect();
        assert_eq!(
            kinds,
            [
                "MATRIXFRAMEHDR",
                "MATRIXMEASURE",
                "MATRIXPHOTO",
                "MATRIXFRAMEFTR"
            ]
        );
        let (hdr, measure, photo, ftr) = (&rows[0], &rows[1], &rows[2], &rows[3]);
        let minute = n.to_string();
        assert_eq!(hdr.get("minute"), Some(minute.as_str()));
        assert_eq!(ftr.get("minute"), Some(minute.as_str()));
        assert_eq!(hdr.get("prev_frame_hash"), Some(prev.as_str()));
        let frame_hash = seal(&lines[..3]);
        assert_eq!(ftr.get("frame_hash"), Some(frame_hash.as_str()));

        let file = photo.get("file").unwrap();
        let png = read(file);
        let sha = sha256_hex(&png);
        let width = u32::from_be_bytes([png[16], png[17], png[18], png[19]]).to_string();
        let height = u32::from_be_bytes([png[20], png[21], png[22], png[23]]).to_string();
        assert_eq!(photo.get("bytes"), Some(png.len().to_string().as_str()));
        assert_eq!(photo.get("sha256"), Some(sha.as_str()));
        assert_eq!(photo.get("sh"), Some(&sha[..16]));
        assert_eq!(photo.get("w"), Some(width.as_str()));
        assert_eq!(photo.get("h"), Some(height.as_str()));

        let i = &index[n - 1];
        assert_eq!(i.kind, "FRAME");
        assert_eq!(i.get("minute"), Some(minute.as_str()));
        assert_eq!(i.get("elapsed_s"), hdr.get("elapsed_s"));
        assert_eq!(i.get("photo"), Some(file));
        assert_eq!(i.get("photo_sha256"), Some(sha.as_str()));
        assert_eq!(
            i.get("subagents"),
            measure.get("subagents_spawned_cumulative")
        );
        assert_eq!(i.get("rooms_occupied"), measure.get("rooms_occupied"));
        assert_eq!(i.get("frame_hash"), Some(frame_hash.as_str()));
        prev = frame_hash[..16].to_string();
    }
}

/// CORRECTION.hbp DEFECT id=1: `substrate_sha256` "printed the SAME value all ten minutes".
#[test]
fn the_blind_field_is_one_value_in_every_receipt() {
    let mut values = Vec::new();
    for n in 1..=10 {
        let bytes = read(&format!("receipts/matrix-min-{n:02}.hbp"));
        let rows = rows_of(&bytes);
        values.push(rows[1].get("substrate_sha256").unwrap().to_string());
    }
    values.dedup();
    assert_eq!(values.len(), 1);
    let correction = read("CORRECTION.hbp");
    let rows = rows_of(&correction);
    let defect = rows
        .iter()
        .find(|r| r.kind == "DEFECT" && r.get("id") == Some("1"))
        .unwrap();
    assert_eq!(
        defect.get("evidence"),
        Some(format!("{} identical at minutes 1,2,3,4,5", &values[0][..16]).as_str())
    );
}

/// CORRECTION.hbp DEFECT id=2: "frames 06 and 07 are byte-identical".
#[test]
fn frames_06_and_07_are_one_file() {
    assert_eq!(
        read("frames/matrix-min-06.png"),
        read("frames/matrix-min-07.png")
    );
}

/// The last row of CORRECTION.hbp and HARNESS-VERDICT.hbp seals every row before it.
#[test]
fn correction_and_verdict_seals_hold() {
    for (file, kind) in [
        ("CORRECTION.hbp", "CORRECTIONHASH"),
        ("HARNESS-VERDICT.hbp", "HARNESSVERDICTHASH"),
    ] {
        let bytes = read(file);
        let lines = text_lines(&bytes).unwrap();
        let (last, body) = lines.split_last().unwrap();
        let last = row(last).unwrap();
        let merkle = seal(body);
        assert_eq!(last.kind, kind);
        assert_eq!(last.get("merkle"), Some(merkle.as_str()), "{file}");
        assert_eq!(last.get("sh"), Some(&merkle[..16]), "{file}");
    }
    let bytes = read("HARNESS-VERDICT.hbp");
    let rows = rows_of(&bytes);
    let count = |kind: &str| rows.iter().filter(|r| r.kind == kind).count().to_string();
    let last = rows.last().unwrap();
    assert_eq!(last.get("shin"), Some(count("SHIN").as_str()));
    assert_eq!(last.get("gimel"), Some(count("GIMEL").as_str()));
    assert_eq!(last.get("fixes"), Some(count("FIX").as_str()));
}

/// HARNESS-VERDICT.hbp: the SHIN examples are the sha256 of each LF file and of the same file
/// with every LF turned into CRLF; the GIMEL row names the frames' own sha256.
#[test]
fn the_harness_verdict_reproduces() {
    let bytes = read("HARNESS-VERDICT.hbp");
    let rows = rows_of(&bytes);
    let shin = rows
        .iter()
        .find(|r| r.kind == "SHIN" && r.get("examples").is_some())
        .unwrap();
    let examples: Vec<String> = ["CORRECTION.hbp", "INDEX.hbp"]
        .iter()
        .map(|f| {
            let lf = read(f);
            format!(
                "{f} claims {} but working gave {}",
                &sha256_hex(&lf)[..16],
                &sha256_hex(&lf_to_crlf(&lf))[..16]
            )
        })
        .collect();
    assert_eq!(shin.get("examples"), Some(examples.join("; ").as_str()));

    let gimel = rows.iter().find(|r| r.kind == "GIMEL").unwrap();
    let sh =
        |n: usize| sha256_hex(&read(&format!("frames/matrix-min-{n:02}.png")))[..16].to_string();
    let measured = format!(
        "min01 {}, min06 {}, min10 {} byte-identical between fresh clone and origin",
        sh(1),
        sh(6),
        sh(10)
    );
    assert_eq!(gimel.get("measured"), Some(measured.as_str()));
}
