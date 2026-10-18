//! Slot 28 white-room cube address: `deriveCubeAddress` over the referee's `stableStringify`
//! pre-images.

mod common;

use common::{fixture, get, unhex};
use quant_cubes::consumer::derive_cube_address;

#[test]
fn addresses_equal_the_referee() {
    let lines = fixture("consumer.hbp");
    for r in &lines[1..] {
        let norm = String::from_utf8(unhex(get(r, "norm_hex"))).unwrap();
        let a = derive_cube_address(&norm);
        assert_eq!(a.pattern_sha, get(r, "pattern_sha"));
        let c: Vec<String> = a.cube_address.iter().map(u32::to_string).collect();
        assert_eq!(c.join(","), get(r, "cube_address"));
        assert!(a.cube_address[0] < 3 && a.cube_address[1] < 6 && a.cube_address[2] < 6);
    }
    assert_eq!(lines.len(), 12);
}
