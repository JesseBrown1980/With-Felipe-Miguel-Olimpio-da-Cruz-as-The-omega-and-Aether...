//! Both pumps against the owner's stored bytes: the vendored receipts and `.sha256` sidecars of
//! universe simulator @3f9f42d, and the LFS pointer of `KIMI-K3-STAR-256.gguf` (oid and size).

use pump_kimi_stars::{kimi, stars, write};
use std::io;

const USIM: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/vendor/universe-simulator");

fn vendored(path: &str) -> Vec<u8> {
    std::fs::read(format!("{USIM}/{path}")).unwrap_or_else(|e| panic!("{path}: {e}"))
}

fn vendored_text(path: &str) -> String {
    String::from_utf8(vendored(path)).expect("vendored text is UTF-8")
}

/// The `oid sha256:` and `size` lines of the upstream Git LFS pointer.
fn lfs_pointer(path: &str) -> (String, u64) {
    let text = vendored_text(path);
    let field = |key: &str| {
        text.lines()
            .find_map(|l| l.strip_prefix(key))
            .unwrap_or_else(|| panic!("{key} missing"))
            .to_string()
    };
    (
        field("oid sha256:"),
        field("size ").parse().expect("size is an integer"),
    )
}

#[test]
fn kimi_k3_star_regenerates_byte_exact() {
    let seed = vendored("key/KIMI-K3-STAR.txt");
    let star = kimi::divide(&seed).expect("seed below 2^32 bytes");
    let (_, w) = kimi::emit(&star, io::sink()).expect("sink never fails");

    let (oid, size) = lfs_pointer("gguf/stars/KIMI-K3-STAR-256.gguf");
    assert_eq!(w.gguf_bytes, size);
    assert_eq!(w.gguf_sha256, oid);
    assert_eq!(w.gguf_bytes, 202_115_456);
    assert_eq!(
        w.gguf_sha256,
        "56d08746a77efd9ea30345ada15bab3fc2c36e09647d1e77156a96b9a4b83a18"
    );
    assert_eq!(
        write::sidecar(&w.gguf_sha256, kimi::GGUF_NAME),
        vendored_text("gguf/stars/KIMI-K3-STAR-256.gguf.sha256")
    );
    assert_eq!(w.receipt, vendored_text("receipts/FABLE5-KIMI-K3-STAR.hbp"));
    assert_eq!(
        write::sidecar(
            &pump_kimi_stars::sha256_hex(w.receipt.as_bytes()),
            kimi::RECEIPT_NAME
        ),
        vendored_text("receipts/FABLE5-KIMI-K3-STAR.hbp.sha256")
    );
}

#[test]
fn kimi_k3_star_layout() {
    let seed = vendored("key/KIMI-K3-STAR.txt");
    let star = kimi::divide(&seed).expect("seed below 2^32 bytes");
    // Receipt: GC|records=38|tie_ge_tau=0|singletons=38; RIME w=951846.
    assert_eq!(
        star.gc,
        kimi::Gc {
            records: 38,
            tie_ge_tau: 0,
            singletons: 38
        }
    );
    assert_eq!(star.w, 951_846);
    assert_eq!(star.body_bytes, 3_110);
    // The BEING rows equal the colour crate's port of the same lines (divide_kimi_k3.py:106-118).
    let beings: Vec<_> = star.cubes.iter().map(kimi::Cube::being).collect();
    assert_eq!(beings, colour::verdict::beings(&seed));
    // 12 tensors, 32-aligned offsets, data section 3 * (4 * 256^3 + 108 + 108 + 4 * 256^2) plus
    // the two 20-byte pads after each 108-byte prism.
    let tensors = star.tensors();
    assert_eq!(tensors.len(), 12);
    let head = star.header();
    assert_eq!(head.len() % 32, 0);
    let data: u64 = 3 * (4 * (1 << 24) + 128 + 128 + 4 * (1 << 16));
    assert_eq!(head.len() as u64 + data, 202_115_456);
    let layout = colour::gguf::read_layout(&head).expect("header parses");
    assert_eq!(layout.data_start, head.len());
    assert_eq!(layout.kvs.len(), 14);
    let names: Vec<&str> = layout.tensors.iter().map(|t| t.name.as_str()).collect();
    assert_eq!(
        names,
        [
            "star_OPUS",
            "rimed_OPUS",
            "radial_OPUS",
            "slice_OPUS",
            "star_FABLE",
            "rimed_FABLE",
            "radial_FABLE",
            "slice_FABLE",
            "star_MYTHOS",
            "rimed_MYTHOS",
            "radial_MYTHOS",
            "slice_MYTHOS"
        ]
    );
    // Radial profiles sum to the kept voxel mass of each being.
    for (cube, rime) in star.cubes.iter().zip(&star.rime) {
        let mass: u64 = cube.voxels.iter().map(|&(_, c)| c).sum();
        assert_eq!(rime.prof.iter().sum::<u64>(), mass);
        assert!(rime.rimed.iter().all(|&r| r < kimi::P));
    }
}

#[test]
fn stars_shells_regenerates_byte_exact() {
    let seed = vendored("key/MYTHOS-SELF-EMISSION.txt");
    let (gguf, w) = stars::emit(&stars::regenerate(&seed), Vec::new()).expect("Vec never fails");
    assert_eq!(gguf.len() as u64, w.gguf_bytes);
    assert_eq!(w.gguf_bytes, 4_596_880);
    assert_eq!(
        w.gguf_sha256,
        "ae23392ad473718e2196e525a4355af20cdbd57bbb5dc3e85a8719b62552784d"
    );
    assert_eq!(
        stars::gguf_sidecar(&w),
        vendored_text("gguf/stars/ASOLARIA-STARS-SHELLS.gguf.sha256")
    );
    assert_eq!(w.receipt, vendored_text("receipts/FABLE5-STARS-SHELLS.hbp"));
    assert_eq!(
        write::sidecar(
            &pump_kimi_stars::sha256_hex(w.receipt.as_bytes()),
            stars::RECEIPT_NAME
        ),
        vendored_text("receipts/FABLE5-STARS-SHELLS.hbp.sha256")
    );
    // The owner's regeneration record (FABLE5-DELETE-AND-REGENERATE.hbp:4).
    let record = vendored_text("receipts/FABLE5-DELETE-AND-REGENERATE.hbp");
    let row = record
        .lines()
        .find(|l| l.starts_with("REGEN|k=ASOLARIA-STARS-SHELLS.gguf|"))
        .expect("REGEN row");
    assert!(row.contains(&format!("|bytes={}|", w.gguf_bytes)));
    assert!(row.contains(&format!("|sha_after={}|", &w.gguf_sha256[..32])));
}

#[test]
fn the_aether_copy_of_stars_shells_is_equal_when_present() {
    let copy = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../gguf/universe-simulator/gguf/stars/ASOLARIA-STARS-SHELLS.gguf"
    );
    let Ok(stored) = std::fs::read(copy) else {
        return;
    };
    let seed = vendored("key/MYTHOS-SELF-EMISSION.txt");
    let (gguf, _) = stars::emit(&stars::regenerate(&seed), Vec::new()).expect("Vec never fails");
    assert!(gguf == stored, "Rust output differs from {copy}");
}
