//! Golden values computed by `referee/referee_ports.py` (the stdlib mirror of
//! port-address-emitter.mjs and district-fabric.mjs:61-74), never by this crate.

use port_address_emitter::{
    capacity, index_for_pid, port_addr_row, ports_for_index, CapacityRangeError, EmitterOpts,
    PortAddressEmitter, MAX_BITS,
};

#[test]
fn ports_for_index_goldens() {
    assert_eq!(ports_for_index(123_456_789, 3, 16), [4560, 11367, 0]);
    assert_eq!(ports_for_index(1000, 3, 16), [6, 30, 0]);
    assert_eq!(ports_for_index(1_000_001, 3, 16), [784, 153, 0]);
    // the last index of the first 2^32 block, then the first of the next
    assert_eq!(ports_for_index((1 << 32) - 1, 3, 16), [65535, 0, 0]);
    assert_eq!(ports_for_index(1 << 32, 3, 16), [0, 0, 1]);
    // capacity(3, 16) - 1, then capacity(3, 16): the index is read modulo side^levels
    assert_eq!(ports_for_index((1 << 48) - 1, 3, 16), [65535, 0, 65535]);
    assert_eq!(ports_for_index(1 << 48, 3, 16), [0, 0, 0]);
    // u64-extension: 2^64 - 1 and 2^62 - 1 are not binary64 values, so no JS Number reaches them;
    // these two pin the integer lines on them, not an upstream output
    assert_eq!(ports_for_index(u64::MAX, 4, 16), [65535, 0, 65535, 0]);
    assert_eq!(
        ports_for_index((1 << 62) - 1, 2, MAX_BITS),
        [2_147_483_647, 0]
    );
    assert!(ports_for_index(42, 0, 16).is_empty());
    assert_eq!(ports_for_index(42, 3, 0), [0, 0, 0]);
}

#[test]
fn capacity_goldens() {
    assert_eq!(
        capacity(5, 16).unwrap(),
        "1208925819614629174706176",
        "2^80"
    );
    assert_eq!(capacity(0, 16).unwrap(), "1");
    assert_eq!(capacity(3, 0).unwrap(), "1");
    assert_eq!(
        capacity(8, 1023).unwrap().len(),
        2464,
        "2^8184 has 2464 digits"
    );
    assert_eq!(
        capacity(1, 1024),
        Err(CapacityRangeError),
        "2 ** 1024 is Infinity"
    );
}

#[test]
fn for_pid_goldens() {
    let e = PortAddressEmitter::default();
    let a = e.for_pid("BH.DISTRICT.ENGINEERING.R00007.ABCD").unwrap();
    assert_eq!(a.index, 52_085_316_469_116);
    assert_eq!(a.full, "127.0.0.1:11160.518.12127");
    let b = e.for_pid("BH.DISTRICT.WHITE-ROOM.R00042.WXYZ").unwrap();
    assert_eq!(b.full, "127.0.0.1:38377.64405.42487");
    let four = PortAddressEmitter::new(EmitterOpts {
        levels: Some(4),
        ..EmitterOpts::default()
    });
    let c = four.for_pid("BH.X").unwrap();
    assert_eq!(c.index, 2_779_215_409_635_027, "52 bits: min(52, 64)");
    assert_eq!(c.full, "127.0.0.1:38981.36520.691.833");
    assert_eq!(
        index_for_pid("BH.X", 3, 5),
        Some(7674),
        "15 bits from 4 hex digits"
    );
}

#[test]
fn nan_index_is_none() {
    // bits * levels == 0: parseInt('', 16) is NaN (port-address-emitter.mjs:66)
    assert_eq!(index_for_pid("BH.X", 0, 16), None);
    assert_eq!(index_for_pid("BH.X", 3, 0), None);
    let e = PortAddressEmitter::new(EmitterOpts {
        levels: Some(0),
        ..EmitterOpts::default()
    });
    assert_eq!(e.for_pid("BH.X"), None);
}

#[test]
fn port_addr_row_goldens() {
    let e = PortAddressEmitter::default();
    let a = e.for_pid("BH.AGENT.PID.X").unwrap();
    assert_eq!(
        port_addr_row("BH.AGENT.PID.X", &a, &[("district", "engineering")]),
        "HBPv1|row=port_addr|pid=BH.AGENT.PID.X|ip=127.0.0.1|port_addr=8589.21573.54802|\
         full=127.0.0.1:8589.21573.54802|levels=3|same_process=true|bound_socket=false|\
         district=engineering|json=0|row_hash=75c5fc6e5df81667"
    );
    // Object.entries order: array-index keys ascending, then the rest by first creation
    let b = e.for_pid("BH.X").unwrap();
    let extra = [
        ("district", "engineering"),
        ("2", "b"),
        ("10", "c"),
        ("1", "a"),
        ("01", "z"),
        ("4294967294", "m"),
        ("4294967295", "n"),
        ("district", "council"),
    ];
    assert_eq!(
        port_addr_row("BH.X", &b, &extra),
        "HBPv1|row=port_addr|pid=BH.X|ip=127.0.0.1|port_addr=40021.6638.40442|\
         full=127.0.0.1:40021.6638.40442|levels=3|same_process=true|bound_socket=false|\
         1=a|2=b|10=c|4294967294=m|district=council|01=z|4294967295=n|json=0|\
         row_hash=4f37cbd66bfef0e6"
    );
}

#[test]
fn next_address_follows_start_plus_counter() {
    let mut e = PortAddressEmitter::default();
    let fulls: Vec<String> = (0..3).map(|_| e.next_address().full).collect();
    assert_eq!(
        fulls,
        ["127.0.0.1:0.0.0", "127.0.0.1:1.0.0", "127.0.0.1:1.1.0"]
    );
}

#[test]
fn next_address_adds_as_js_numbers_past_2_pow_53() {
    // :80-81 are JS Number additions: 2^53 + 1 gives 2^53, 2^53 + 3 gives 2^53 + 4
    let mut e = PortAddressEmitter::new(EmitterOpts {
        start: Some(1 << 53),
        ..EmitterOpts::default()
    });
    let got: Vec<(u64, String)> = (0..4)
        .map(|_| e.next_address())
        .map(|a| (a.index, a.full))
        .collect();
    assert_eq!(
        got,
        [
            (9_007_199_254_740_992, "127.0.0.1:0.0.0".to_string()),
            (9_007_199_254_740_992, "127.0.0.1:0.0.0".to_string()),
            (9_007_199_254_740_994, "127.0.0.1:1.1.0".to_string()),
            (9_007_199_254_740_996, "127.0.0.1:0.2.0".to_string()),
        ]
    );
    assert_eq!(e.counter, 4);
    // `counter++` at 2^53 gives 2^53
    let mut e = PortAddressEmitter {
        counter: 1 << 53,
        ..PortAddressEmitter::default()
    };
    assert_eq!(e.next_address().index, 9_007_199_254_740_992);
    assert_eq!(e.counter, 1 << 53);
    // 2^64 - 2048, the largest binary64 value below 2^64: + 1023 rounds back to it
    let mut e = PortAddressEmitter::new(EmitterOpts {
        start: Some(18_446_744_073_709_549_568),
        ..EmitterOpts::default()
    });
    e.counter = 1023;
    let a = e.next_address();
    assert_eq!(
        (a.index, a.full.as_str(), e.counter),
        (18_446_744_073_709_549_568, "127.0.0.1:65504.32.65535", 1024)
    );
}

#[test]
#[should_panic(expected = "value outside the u64 domain")]
fn next_address_index_2_pow_64_panics() {
    // upstream's index here is the Number 2^64 ((2^64 - 2048) + 1024, ties to even), which u64 cannot hold
    let mut e = PortAddressEmitter::new(EmitterOpts {
        start: Some(18_446_744_073_709_549_568),
        ..EmitterOpts::default()
    });
    e.counter = 1024;
    let _ = e.next_address();
}

#[test]
#[should_panic(expected = "bits 32 > 31")]
fn bits_above_max_panic() {
    let _ = ports_for_index(0, 2, 32);
}
