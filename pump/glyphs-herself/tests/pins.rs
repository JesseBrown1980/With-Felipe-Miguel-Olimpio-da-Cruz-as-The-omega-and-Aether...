//! Hermetic checks against the cold-lane referee vectors (owner numpy, USIM @3f9f42d):
//! the pinned Gaussian kernel and the 12 seed uint8 LUTs. The full GGUF byte-exactness
//! (sha256 == recorded == owner Python) is proven by the CI job in ci-snippets/, which
//! regenerates both the Python and the Rust outputs and `cmp`s them.
use pump_glyphs_herself::mythos;
use std::path::PathBuf;

fn vec_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/vectors")
        .join(name)
}

#[test]
fn kernel_constant_matches_owner_numpy() {
    // KERNEL_BITS little-endian bytes == exp(-0.5*(arange(-32,33)/12)**2) normalised, captured.
    let want = std::fs::read(vec_path("mythos_kernel_f64.bin")).unwrap();
    assert_eq!(want.len(), 65 * 8);
    let mut got = Vec::with_capacity(65 * 8);
    for b in mythos::KERNEL_BITS {
        got.extend_from_slice(&b.to_le_bytes());
    }
    assert_eq!(
        got, want,
        "pinned Gaussian kernel differs from the owner's numpy value"
    );
}

#[test]
fn seed_luts_match_owner_numpy() {
    // The 3 channels x {P,R,G,D} uint8 LUTs of the mythos seed, as the generator builds them.
    let seed = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("vendor/MYTHOS-SELF-EMISSION.txt");
    let got = mythos::luts_flat(&seed).unwrap();
    let want = std::fs::read(vec_path("mythos_luts_u8.bin")).unwrap();
    assert_eq!(
        got, want,
        "seed uint8 LUTs (P,R,G,D x 3 channels) differ from the referee"
    );
}
