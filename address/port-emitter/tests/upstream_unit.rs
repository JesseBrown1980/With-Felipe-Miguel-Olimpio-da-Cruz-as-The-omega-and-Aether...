//! The nine tests of bigpickle-rebuild@c592599 `tests/unit/port-address-emitter.test.mjs`
//! (blob 2f594c535e1d), assertion for assertion; line numbers cite that file.

use std::collections::HashSet;

use port_address_emitter::{
    address_string, capacity, port_addr_row, ports_for_index, EmitterOpts, PortAddressEmitter,
};

fn emitter(levels: Option<u32>, bits: Option<u32>) -> PortAddressEmitter {
    PortAddressEmitter::new(EmitterOpts {
        levels,
        bits,
        ..EmitterOpts::default()
    })
}

#[test]
fn ports_for_index_is_deterministic_and_yields_levels_ports_in_range() {
    // :11-17
    let a = ports_for_index(123_456_789, 3, 16);
    let b = ports_for_index(123_456_789, 3, 16);
    assert_eq!(a, b, "deterministic");
    assert_eq!(a.len(), 3, "port.port.port = 3 levels");
    for p in &a {
        assert!(*p <= 65535, "each level is a valid 16-bit port");
    }
}

#[test]
fn no_bump_5000_sequential_agents_get_5000_distinct_addresses() {
    // :19-24
    let mut e = emitter(Some(3), Some(16));
    let seen: HashSet<String> = (0..5000).map(|_| e.next_address().full).collect();
    assert_eq!(
        seen.len(),
        5000,
        "every agent address is unique — no collisions"
    );
}

#[test]
fn capacity_is_almost_infinite_and_expands_per_level() {
    // :26-30
    assert_eq!(capacity(3, 16).unwrap(), "281474976710656");
    assert_eq!(capacity(4, 16).unwrap(), "18446744073709551616");
    let c3: u128 = capacity(3, 16).unwrap().parse().unwrap();
    assert!(c3 > 1_000_000_000_000, "far past a flat port (9999)");
}

#[test]
fn hilbert_locality_adjacent_indices_trace_to_adjacent_ports() {
    // :32-40
    for i in [0u64, 1000, 50_000, 1_000_000] {
        let a = ports_for_index(i, 3, 16);
        let b = ports_for_index(i + 1, 3, 16);
        let manhattan = a[0].abs_diff(b[0]) + a[1].abs_diff(b[1]);
        assert_eq!(
            manhattan,
            1,
            "index {i}->{} is a single Hilbert step",
            i + 1
        );
    }
}

#[test]
fn emitter_next_is_sequential_and_unique_counter_advances() {
    // :42-49
    let mut e = PortAddressEmitter::default();
    let a0 = e.next_address();
    let a1 = e.next_address();
    assert_eq!(e.counter, 2);
    assert_eq!(a0.index, 0);
    assert_eq!(a1.index, 1);
    assert_ne!(a0.full, a1.full);
    assert!(a0.full.starts_with("127.0.0.1:"), "loopback = same process");
}

#[test]
fn for_pid_is_deterministic_distinct_pids_get_distinct_addresses() {
    // :51-58
    let e = PortAddressEmitter::default();
    let p1 = e.for_pid("BH.DISTRICT.ENGINEERING.R00007.ABCD").unwrap();
    let p1b = e.for_pid("BH.DISTRICT.ENGINEERING.R00007.ABCD").unwrap();
    let p2 = e.for_pid("BH.DISTRICT.WHITE-ROOM.R00042.WXYZ").unwrap();
    assert_eq!(p1.full, p1b.full, "same PID => same address");
    assert_ne!(p1.full, p2.full, "different PID => different address");
}

#[test]
fn address_string_format_is_ip_port_port_port() {
    // :60-62
    assert_eq!(
        address_string(&[4949, 7, 3], "127.0.0.1"),
        "127.0.0.1:4949.7.3"
    );
}

#[test]
fn port_addr_row_is_pure_hbp() {
    // :64-71
    let e = PortAddressEmitter::default();
    let addr = e.for_pid("BH.AGENT.PID.X").unwrap();
    let row = port_addr_row("BH.AGENT.PID.X", &addr, &[("district", "engineering")]);
    assert!(row.starts_with("HBPv1|row=port_addr|"));
    assert!(row.contains("|same_process=true|"));
    assert!(row.contains("|bound_socket=false|"));
    assert!(row.contains("|json=0|") && !row.contains('{') && !row.contains('}'));
}

#[test]
fn levels_knob_extends_the_address() {
    // :73-78
    let e = emitter(Some(4), None);
    let a = e.for_pid("BH.X").unwrap();
    assert_eq!(a.ports.len(), 4, "four nested ports");
    assert_eq!(a.full.split(':').nth(1).unwrap().split('.').count(), 4);
}
