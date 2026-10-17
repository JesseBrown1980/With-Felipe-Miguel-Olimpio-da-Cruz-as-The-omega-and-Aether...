//! asolaria-gguf-roundtrip [--manifest PATH] [--lfs-dir DIR]
//!
//! For every `GGUF|` row of the manifest with `storage=file` (and `storage=lfs_pointer` when
//! `--lfs-dir DIR` is given, read from `DIR/<local>`), runs the owner's DBBH -> DBWH codec end to end
//! and prints HBP rows. Exit 0 when every measured row matches the manifest and both the white-mouth
//! emit and the full traverse return the input byte for byte, 1 otherwise (a GGUF that cannot be read
//! is `NOT_READ`, exit 1), 2 on a usage error or a manifest that cannot be read or parsed. With no row
//! measured, `SUMMARY` carries `status=NOT_MEASURED` (exit 0, as in the codec's own workflow gate).
#![forbid(unsafe_code)]

use asolaria_gguf_roundtrip::{
    black_then_white, emitted_equals, hex, manifest_rows, ratio_6dp, traverse, verdict_name, Emit,
    CROSS, RECEIVER, RECOVER_WITH, SALT, SENDER,
};
use holographic_wormhole_codec as hwc;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

const DEFAULT_MANIFEST: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../gguf/MANIFEST.hbp");
const CODEC_LIB_RS: &[u8] = include_bytes!("../../dbbh-dbwh/src/lib.rs");
const CODEC_COMMIT: &str = "49012803778ef89b5b7c3915f582d027d4f1e096";
const USAGE: &str = "usage: asolaria-gguf-roundtrip [--manifest PATH] [--lfs-dir DIR]";

#[derive(Default)]
struct Tally {
    rows: u64,
    measured: u64,
    not_measured: u64,
    not_read: u64,
    matches_manifest: u64,
    verified_clone: u64,
    byte_identical: u64,
    traverse_verified_clone: u64,
    traverse_byte_identical: u64,
    held: u64,
    object_bytes: u64,
    packet_bytes: u64,
}

fn list(xs: &[impl ToString]) -> String {
    xs.iter()
        .map(|x| x.to_string())
        .collect::<Vec<_>>()
        .join(",")
}

fn main() -> ExitCode {
    let mut manifest = PathBuf::from(DEFAULT_MANIFEST);
    let mut lfs_dir: Option<PathBuf> = None;
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        match (a.as_str(), args.next()) {
            ("--manifest", Some(v)) => manifest = PathBuf::from(v),
            ("--lfs-dir", Some(v)) => lfs_dir = Some(PathBuf::from(v)),
            _ => {
                eprintln!("{}", USAGE);
                return ExitCode::from(2);
            }
        }
    }
    match run(&manifest, lfs_dir.as_deref()) {
        Ok(true) => ExitCode::SUCCESS,
        Ok(false) => ExitCode::from(1),
        Err(e) => {
            eprintln!("asolaria-gguf-roundtrip: {}", e);
            ExitCode::from(2)
        }
    }
}

fn run(manifest: &Path, lfs_dir: Option<&Path>) -> Result<bool, String> {
    let text_bytes =
        std::fs::read(manifest).map_err(|e| format!("{}: {}", manifest.display(), e))?;
    let text = String::from_utf8(text_bytes.clone())
        .map_err(|_| format!("{}: not UTF-8", manifest.display()))?;
    let rows = manifest_rows(&text)?;
    let base = manifest.parent().unwrap_or(Path::new("."));
    let mut out = std::io::stdout().lock();
    let mut w = |line: String| writeln!(out, "{}", line).map_err(|e| e.to_string());

    w("HBP1|schema=ASOLARIA-AETHER-GGUF-ROUNDTRIP-V1|json=0".to_string())?;
    w(format!(
        "CODEC|crate=holographic-wormhole-codec|upstream=JesseBrown1980/holographic-wormhole-codec|commit={}|lib_rs_sha256={}|cylinders={}|sender={}|receiver={}|salt={}|consent=receiver_armed|recover_with={}|cross={}|json=0",
        CODEC_COMMIT,
        hex(&hwc::sha256(CODEC_LIB_RS)),
        list(&hwc::CYLINDERS),
        String::from_utf8_lossy(SENDER),
        String::from_utf8_lossy(RECEIVER),
        String::from_utf8_lossy(SALT),
        list(&RECOVER_WITH),
        list(&CROSS),
    ))?;
    w(format!(
        "MANIFEST|sha256={}|gguf={}|file={}|lfs_pointer={}|lfs_dir_given={}|json=0",
        hex(&hwc::sha256(&text_bytes)),
        rows.len(),
        rows.iter().filter(|r| r.storage == "file").count(),
        rows.iter().filter(|r| r.storage == "lfs_pointer").count(),
        u8::from(lfs_dir.is_some()),
    ))?;

    let mut t = Tally::default();
    for row in &rows {
        t.rows += 1;
        let head = format!("GGUF_ROUNDTRIP|local={}|storage={}", row.local, row.storage);
        let path = match (row.storage.as_str(), lfs_dir) {
            ("file", _) => base.join(&row.local),
            ("lfs_pointer", Some(dir)) => dir.join(&row.local),
            ("lfs_pointer", None) => {
                t.not_measured += 1;
                w(format!(
                    "{}|status=NOT_MEASURED|reason=lfs_pointer_without_lfs_dir|json=0",
                    head
                ))?;
                continue;
            }
            _ => {
                t.not_measured += 1;
                w(format!(
                    "{}|status=NOT_MEASURED|reason=unknown_storage|json=0",
                    head
                ))?;
                continue;
            }
        };
        let object = match std::fs::read(&path) {
            Ok(b) => b,
            Err(e) => {
                t.not_read += 1;
                w(format!(
                    "{}|status=NOT_READ|reason={:?}|json=0",
                    head,
                    e.kind()
                ))?;
                continue;
            }
        };
        t.measured += 1;
        let sha = hex(&hwc::sha256(&object));
        let matches = sha == row.sha256 && object.len() as u64 == row.bytes;

        let Emit {
            size,
            agt,
            roof_bits,
            residual_bits,
            verdict,
            receipt,
        } = black_then_white(&object, &RECOVER_WITH);
        let name = verdict_name(&verdict);
        let identical = emitted_equals(&verdict, &object);
        let held = matches!(verdict, hwc::Verdict::Held(_));
        drop(verdict);
        let tv = traverse(&object);
        let t_name = verdict_name(&tv);
        let t_identical = emitted_equals(&tv, &object);
        let t_held = matches!(tv, hwc::Verdict::Held(_));
        drop(tv);

        let packet = size.packet_bytes() as u64;
        t.matches_manifest += u64::from(matches);
        t.verified_clone += u64::from(!held);
        t.byte_identical += u64::from(identical);
        t.traverse_verified_clone += u64::from(!t_held);
        t.traverse_byte_identical += u64::from(t_identical);
        t.held += u64::from(held || t_held);
        t.object_bytes += object.len() as u64;
        t.packet_bytes += packet;

        w(format!(
            "{}|status=MEASURED|object_bytes={}|sha256={}|matches_manifest={}|residues={}|shadow_bytes={}|capsule_bytes={}|packet_bytes={}|packet_over_object={}|agt={}|agt_bytes={}|roof_bits={}|residual_bits={}|verdict={}|byte_identical={}|traverse_verdict={}|traverse_byte_identical={}|json=0",
            head,
            object.len(),
            sha,
            u8::from(matches),
            size.residues,
            size.shadow_bytes,
            size.capsule_bytes,
            packet,
            ratio_6dp(packet, object.len() as u64),
            agt,
            size.agt_bytes,
            roof_bits,
            residual_bits,
            name,
            u8::from(identical),
            t_name,
            u8::from(t_identical),
        ))?;
        for r in receipt {
            w(r)?;
        }
    }

    // As the codec's own workflow gate does, a run that measured nothing says so (NOT_MEASURED).
    let nothing_measured = if t.measured == 0 {
        "|status=NOT_MEASURED|reason=no_gguf_measured"
    } else {
        ""
    };
    w(format!(
        "SUMMARY|rows={}|measured={}|not_measured={}|not_read={}|matches_manifest={}|verified_clone={}|byte_identical={}|traverse_verified_clone={}|traverse_byte_identical={}|held={}|object_bytes={}|packet_bytes={}|packet_over_object={}{}|json=0",
        t.rows,
        t.measured,
        t.not_measured,
        t.not_read,
        t.matches_manifest,
        t.verified_clone,
        t.byte_identical,
        t.traverse_verified_clone,
        t.traverse_byte_identical,
        t.held,
        t.object_bytes,
        t.packet_bytes,
        ratio_6dp(t.packet_bytes, t.object_bytes),
        nothing_measured,
    ))?;
    let all_pass = t.not_read == 0
        && t.matches_manifest == t.measured
        && t.byte_identical == t.measured
        && t.traverse_byte_identical == t.measured;
    Ok(all_pass)
}
