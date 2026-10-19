//! Original Colour QR indexed transport -> Q-PRISM exact cube -> N-Nest corrective
//! source gate -> GitRAM independent 3-cell fan-out / all-or-nothing fan-in.
//! QR-ready base64 is exported; no claim of a generated optical QR image here.
//! Host I/O and hashes use RAM and electrons; this is not measured optical storage.
use dbbh_coms_quant_prism::{
    agt, dbbh_receive, dbbh_send, sha256_hex, verify_chain, ComsMode, Held, Pid,
    QPrismCube, ReceiptChain, SessionCapsule,
};
use std::collections::BTreeSet;
use std::env;
use std::fs;
use std::path::Path;

const CHUNK: usize = 2100;
const MAX_CHUNKS: usize = 10_000;

fn hex(value: &[u8]) -> String {
    const H: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(value.len() * 2);
    for &b in value {
        s.push(char::from(H[(b >> 4) as usize]));
        s.push(char::from(H[(b & 15) as usize]));
    }
    s
}

fn base64(bytes: &[u8]) -> String {
    const A: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for p in bytes.chunks(3) {
        let x = u32::from(p[0]) << 16 | u32::from(*p.get(1).unwrap_or(&0)) << 8
            | u32::from(*p.get(2).unwrap_or(&0));
        out.push(char::from(A[((x >> 18) & 63) as usize]));
        out.push(char::from(A[((x >> 12) & 63) as usize]));
        out.push(if p.len() > 1 { char::from(A[((x >> 6) & 63) as usize]) } else { '=' });
        out.push(if p.len() > 2 { char::from(A[(x & 63) as usize]) } else { '=' });
    }
    out
}

fn unbase64(s: &str) -> Result<Vec<u8>, String> {
    let b = s.as_bytes();
    if b.len() % 4 != 0 {
        return Err("bad base64 length".into());
    }
    let mut out = Vec::with_capacity(b.len() / 4 * 3);
    for block in b.chunks(4) {
        let mut v = [0u32; 4];
        for j in 0..4 {
            v[j] = match block[j] {
                b'A'..=b'Z' => u32::from(block[j] - b'A'),
                b'a'..=b'z' => u32::from(block[j] - b'a') + 26,
                b'0'..=b'9' => u32::from(block[j] - b'0') + 52,
                b'+' => 62,
                b'/' => 63,
                b'=' if j >= 2 => 0,
                _ => return Err("bad base64 digit".into()),
            };
        }
        let word = (v[0] << 18) | (v[1] << 12) | (v[2] << 6) | v[3];
        out.push((word >> 16) as u8);
        if block[2] != b'=' {
            out.push((word >> 8) as u8);
        }
        if block[3] != b'=' {
            out.push(word as u8);
        }
    }
    if base64(&out) != s {
        return Err("noncanonical base64".into());
    }
    Ok(out)
}

fn frame(i: usize, bytes: &[u8]) -> Result<Vec<u8>, String> {
    let index = u32::try_from(i).map_err(|_| "frame index too large")?;
    let mut f = Vec::with_capacity(bytes.len() + 4);
    f.extend_from_slice(&index.to_le_bytes());
    f.extend_from_slice(bytes);
    Ok(f)
}

fn parts(source: &[u8]) -> Result<usize, String> {
    if source.is_empty() {
        return Err("empty source is held".into());
    }
    let n = source.len().div_ceil(CHUNK);
    if n > MAX_CHUNKS {
        return Err("bounded integration exceeds maximum chunks".into());
    }
    Ok(n)
}

fn path_for(root: &Path, lane: usize, i: usize, suffix: &str) -> std::path::PathBuf {
    let name = ["R", "G", "B"][lane];
    root.join(name).join(format!("frame-{i:06}.{suffix}"))
}

fn seal_sidecar(file: &Path, contents: &[u8]) -> Result<(), String> {
    fs::write(file, contents).map_err(|e| e.to_string())?;
    fs::write(
        format!("{}.sha256", file.display()),
        format!("{}  {}\n", sha256_hex(contents), file.file_name().unwrap().to_string_lossy()),
    )
    .map_err(|e| e.to_string())
}

fn verify_sidecar(file: &Path) -> Result<Vec<u8>, String> {
    let data = fs::read(file).map_err(|e| format!("missing {}: {e}", file.display()))?;
    let expected = format!("{}  {}\n", sha256_hex(&data), file.file_name().unwrap().to_string_lossy());
    let sidecar = fs::read_to_string(format!("{}.sha256", file.display()))
        .map_err(|e| format!("missing sidecar: {e}"))?;
    if sidecar != expected {
        return Err("sidecar mismatch".into());
    }
    Ok(data)
}

fn qprism_roundtrip(frame: &[u8], lane: usize) -> Result<String, String> {
    let pid = Pid([0x31, 0x81, lane as u8, 0, 0, 0, 0, 1]);
    let watcher = Pid([0x31, 0x81, lane as u8, 0, 0, 0, 0, 2]);
    let cube = QPrismCube::new(pid, frame);
    if cube.reconstruct() != frame {
        return Err("QPRISM inverse failure".into());
    }
    let mut capsule = SessionCapsule::propose(pid, watcher, ComsMode::AiToAi, frame);
    if !matches!(dbbh_send(&cube, &mut capsule), Err(Held::NoConsent)) {
        return Err("unarmed capsule escaped".into());
    }
    capsule.arm(pid);
    capsule.arm(watcher);
    let crossing = dbbh_send(&cube, &mut capsule).map_err(|e| format!("send held: {e:?}"))?;
    let received = dbbh_receive(&crossing, &capsule).map_err(|e| format!("receive held: {e:?}"))?;
    if received != frame || !verify_chain(capsule.audit.rows()) {
        return Err("QPRISM or N-Nest receipt mismatch".into());
    }
    capsule.collapse();
    if capsule.is_open() {
        return Err("collapsed capsule remained open".into());
    }
    Ok(cube.addr)
}

fn expected_hbp(i: usize, src: &[u8], f: &[u8], lane: usize, address: &str) -> String {
    format!(
        "COLOURQR|chunk={i}|lane={}|room=44|frame_bytes={}|frame_sha256={}|source_sha256={}|index_le_hex={}|qprism_addr={address}|watcher=RECOMPUTE_SOURCE|consent=SIMULATED_BILATERAL|json=0\n",
        ["R", "G", "B"][lane],
        f.len(), sha256_hex(f), sha256_hex(src), hex(&f[..4])
    )
}

fn shard(lane: usize, source: &[u8], root: &Path) -> Result<(), String> {
    let n = parts(source)?;
    fs::create_dir_all(root.join(["R", "G", "B"][lane])).map_err(|e| e.to_string())?;
    let mut count = 0;
    for i in (lane..n).step_by(3) {
        let a = i * CHUNK;
        let f = frame(i, &source[a..(a + CHUNK).min(source.len())])?;
        let addr = qprism_roundtrip(&f, lane)?;
        let hbi = path_for(root, lane, i, "hbi");
        seal_sidecar(&hbi, &f)?;
        let qr = path_for(root, lane, i, "qr.txt");
        seal_sidecar(&qr, format!("{}\n", base64(&f)).as_bytes())?;
        let hbp = path_for(root, lane, i, "hbp");
        seal_sidecar(&hbp, expected_hbp(i, source, &f, lane, &addr).as_bytes())?;
        count += 1;
    }
    println!(
        "GITRAM_SHARD_PASS|lane={}|chunks={count}|source_sha256={}|json=0",
        ["R", "G", "B"][lane], sha256_hex(source)
    );
    Ok(())
}

fn seal(source: &[u8], root: &Path, output: &Path) -> Result<(), String> {
    let n = parts(source)?;
    // An unexpected extra/stale checkpoint must not silently bypass the watcher.
    for lane in 0..3 {
        let mut allowed = BTreeSet::new();
        for i in (lane..n).step_by(3) {
            for suffix in ["hbi", "hbp", "qr.txt"] {
                let item = format!("frame-{i:06}.{suffix}");
                allowed.insert(format!("{item}.sha256"));
                allowed.insert(item);
            }
        }
        let dir = root.join(["R", "G", "B"][lane]);
        for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("frame-") && !allowed.contains(&name) {
                return Err(format!("unexpected or duplicate checkpoint: {name}"));
            }
        }
    }
    let mut seen = BTreeSet::new();
    let mut chain = ReceiptChain::new();
    let mut reconstructed = Vec::new();
    for i in 0..n {
        let lane = i % 3;
        let raw = verify_sidecar(&path_for(root, lane, i, "hbi"))?;
        let text = verify_sidecar(&path_for(root, lane, i, "qr.txt"))?;
        let encoded = std::str::from_utf8(&text).map_err(|e| e.to_string())?
            .strip_suffix('\n').ok_or("missing QR line terminator")?;
        let decoded = unbase64(encoded)?;
        if decoded != raw {
            return Err(format!("QR transfer and raw frame differ at {i}"));
        }
        if raw.len() < 5 || raw.len() > CHUNK + 4 {
            return Err(format!("invalid raw frame length {i}"));
        }
        let idx = u32::from_le_bytes(raw[..4].try_into().unwrap()) as usize;
        if idx != i || !seen.insert(idx) {
            return Err(format!("duplicate or out-of-order Fischer index {i}"));
        }
        let start = i * CHUNK;
        let expected = &source[start..(start + CHUNK).min(source.len())];
        if &raw[4..] != expected {
            return Err(format!("N-Nest watcher rejected changed source at {i}"));
        }
        let addr = qprism_roundtrip(&raw, lane)?;
        let hbp = verify_sidecar(&path_for(root, lane, i, "hbp"))?;
        if hbp != expected_hbp(i, source, &raw, lane, &addr).as_bytes() {
            return Err(format!("source-bound HBP mismatch at {i}"));
        }
        chain.append(&format!(
            "WATCH|addr=R.{lane}.{i}|reported={}|truth={}|source_checked=true|json=0",
            sha256_hex(&raw[4..]), sha256_hex(expected)
        ));
        reconstructed.extend_from_slice(&raw[4..]);
    }
    if reconstructed != source || seen.len() != n || !verify_chain(chain.rows()) {
        return Err("APEX HELD: missing chunks, broken chain, or wrong original".into());
    }
    // A capsule crossing is not actual human-apex authorization to deploy or scale.
    let report = format!(
        "GITRAM-SEALED|source_sha256={}|chunks={n}|bytes={}|root_agt={}|watcher=PASS|scope=DIGITAL_ONLY|physical_optical=NOT_MEASURED|operator_scale_consent=NOT_GRANTED|json=0\n{}HEAD|chain_sha256={}|json=0\n",
        sha256_hex(source), source.len(), agt(source),
        chain.rows().join("\n") + "\n",
        chain.head(),
    );
    fs::create_dir_all(output).map_err(|e| e.to_string())?;
    seal_sidecar(&output.join("SEAT2-GITRAM-SEALED.hbp"), report.as_bytes())?;
    println!(
        "GITRAM_APEX_PASS|chunks={n}|source_sha256={}|chain={}|json=0",
        sha256_hex(source), chain.head()
    );
    Ok(())
}

fn run() -> Result<(), String> {
    let args: Vec<String> = env::args().collect();
    match args.as_slice() {
        [_, mode, lane, input, root] if mode == "shard" => {
            let l = match lane.as_str() {
                "R" => 0, "G" => 1, "B" => 2, _ => return Err("invalid lane".into()),
            };
            let source = fs::read(input).map_err(|e| e.to_string())?;
            shard(l, &source, Path::new(root))
        }
        [_, mode, input, root, output] if mode == "seal" => {
            let source = fs::read(input).map_err(|e| e.to_string())?;
            seal(&source, Path::new(root), Path::new(output))
        }
        _ => Err("usage: bridge shard R|G|B SOURCE ROOT OR bridge seal SOURCE ROOT OUTPUT".into()),
    }
}

fn main() {
    if let Err(e) = run() {
        eprintln!("HELD|reason={e}|json=0");
        std::process::exit(2);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_canonical_and_negative() {
        assert_eq!(base64(b"Man"), "TWFu");
        assert_eq!(unbase64("TWE=").unwrap(), b"Ma");
        assert!(unbase64("TWE!").is_err());
        assert!(unbase64("TWF=").is_err());
    }
    #[test]
    fn exact_index_and_qprism() {
        let bytes = frame(30, b"123").unwrap();
        assert_eq!(&bytes[..4], &[30, 0, 0, 0]);
        assert_eq!(qprism_roundtrip(&bytes, 0).unwrap(), agt(&bytes));
        assert_eq!(hex(&bytes[..4]), "1e000000");
    }
    #[test]
    fn full_gitram_roundtrip_and_five_forgery_negatives() {
        use std::time::{SystemTime, UNIX_EPOCH};
        let stamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let temp = std::env::temp_dir().join(format!("seat2-qr-{}-{stamp}", std::process::id()));
        let root = temp.join("cells");
        let output = temp.join("sealed");
        let source: Vec<u8> = (0..4201).map(|i| (i % 251) as u8).collect();
        for l in 0..3 {
            shard(l, &source, &root).unwrap();
        }
        seal(&source, &root, &output).unwrap();

        // Case 1: payload alteration with a newly recalculated SHA sidecar.
        let p = path_for(&root, 0, 0, "hbi");
        let original = fs::read(&p).unwrap();
        let mut wrong = original.clone();
        wrong[8] ^= 1;
        seal_sidecar(&p, &wrong).unwrap();
        assert!(seal(&source, &root, &output).is_err());
        seal_sidecar(&p, &original).unwrap();

        // Case 2: change the Fischer index but rehash the raw file.
        let mut wrong = original.clone();
        wrong[0] = 3;
        seal_sidecar(&p, &wrong).unwrap();
        assert!(seal(&source, &root, &output).is_err());
        seal_sidecar(&p, &original).unwrap();

        // Case 3: a separately rehashed QR-ready representation disagrees.
        let pqr = path_for(&root, 1, 1, "qr.txt");
        let raw_qr = fs::read(&pqr).unwrap();
        let mut forged_qr = raw_qr.clone();
        forged_qr[5] = if forged_qr[5] == b'A' { b'B' } else { b'A' };
        seal_sidecar(&pqr, &forged_qr).unwrap();
        assert!(seal(&source, &root, &output).is_err());
        seal_sidecar(&pqr, &raw_qr).unwrap();

        // Case 4: a missing independent channel must HALT.
        let missing = path_for(&root, 2, 2, "hbi");
        let raw_missing = fs::read(&missing).unwrap();
        fs::remove_file(&missing).unwrap();
        assert!(seal(&source, &root, &output).is_err());
        seal_sidecar(&missing, &raw_missing).unwrap();

        // Case 5: unexpected extra frame is not silently ignored.
        let extra = root.join("R/frame-999999.hbi");
        seal_sidecar(&extra, b"\0\0\0\0fake").unwrap();
        assert!(seal(&source, &root, &output).is_err());
        fs::remove_file(&extra).unwrap();
        fs::remove_file(format!("{}.sha256", extra.display())).unwrap();

        seal(&source, &root, &output).unwrap();
        fs::remove_dir_all(&temp).unwrap();
    }

    #[test]
    fn reject_empty_and_missing_consent() {
        assert!(parts(b"").is_err());
        assert_eq!(parts(&vec![1; 4201]).unwrap(), 3);
        let pid = Pid([1; 8]);
        let other = Pid([2; 8]);
        let cube = QPrismCube::new(pid, b"input");
        let mut session = SessionCapsule::propose(pid, other, ComsMode::AiToAi, b"nonce");
        session.arm(pid);
        assert!(matches!(dbbh_send(&cube, &mut session), Err(Held::NoConsent)));
    }
}
