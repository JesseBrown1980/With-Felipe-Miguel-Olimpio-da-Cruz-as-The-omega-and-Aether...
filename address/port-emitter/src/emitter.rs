//! `addressString`, `indexForPid`, `PortAddressEmitter` and `portAddrRow`
//! (bigpickle port-address-emitter.mjs:56-99).

use aether_loop::sha::sha256_hex;
use l0_edge::jsnum::Dbl;

use crate::ports::{capacity, ports_for_index, CapacityRangeError};
use crate::{DEFAULT_BITS, DEFAULT_IP, DEFAULT_LEVELS};

/// `` `${ip}:${ports.join('.')}` `` (port-address-emitter.mjs:56-58).
pub fn address_string(ports: &[u32], ip: &str) -> String {
    format!("{ip}:{}", join_ports(ports))
}

fn join_ports(ports: &[u32]) -> String {
    ports
        .iter()
        .map(u32::to_string)
        .collect::<Vec<_>>()
        .join(".")
}

/// `indexForPid(pid, { levels, bits })` (port-address-emitter.mjs:60-68): the first
/// `ceil(min(52, bits*levels) / 4)` hex digits of `sha256(pid)`, modulo `2^min(52, bits*levels)`.
/// `None` where upstream's value is NaN: with `bits * levels == 0` the slice is empty and
/// `parseInt('', 16)` is NaN (:66).
pub fn index_for_pid(pid: &str, levels: u32, bits: u32) -> Option<u64> {
    let total_bits = (u64::from(bits) * u64::from(levels)).min(52); // :64
    let hex_needed = usize::try_from(total_bits.div_ceil(4)).expect("<= 13"); // :65
    let hex = sha256_hex(pid); // :26 `sha` (same computation as district-fabric.mjs:28)
    let prefix = &hex[..hex_needed]; // :66
    if prefix.is_empty() {
        return None;
    }
    let i = u64::from_str_radix(prefix, 16).expect("hex digits");
    Some(i % (1u64 << total_bits)) // :67
}

/// The constructor options of `new PortAddressEmitter(opts)` (port-address-emitter.mjs:71-77); `None`
/// takes upstream's `??` fallback.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct EmitterOpts {
    pub ip: Option<String>,
    pub levels: Option<u32>,
    pub bits: Option<u32>,
    pub start: Option<u64>,
}

/// The object `addressFor` returns (port-address-emitter.mjs:86).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Address {
    pub index: u64,
    pub ip: String,
    pub ports: Vec<u32>,
    pub address: String,
    pub full: String,
    pub levels: u32,
    pub bits: u32,
}

/// `PortAddressEmitter` (port-address-emitter.mjs:70-90).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PortAddressEmitter {
    pub ip: String,
    pub levels: u32,
    pub bits: u32,
    pub start: u64,
    pub counter: u64,
}

impl Default for PortAddressEmitter {
    /// `new PortAddressEmitter({})`.
    fn default() -> Self {
        Self::new(EmitterOpts::default())
    }
}

impl PortAddressEmitter {
    /// `constructor(opts)` (:71-77); `Math.max(0, Math.floor(start))` is the identity on `u64`.
    pub fn new(opts: EmitterOpts) -> Self {
        Self {
            ip: opts.ip.unwrap_or_else(|| DEFAULT_IP.to_string()),
            levels: opts.levels.unwrap_or(DEFAULT_LEVELS),
            bits: opts.bits.unwrap_or(DEFAULT_BITS),
            start: opts.start.unwrap_or(0),
            counter: 0,
        }
    }

    /// Upstream `next()` (:79-83): the address at `start + counter`, then `counter++`. Both are JS
    /// Number additions (binary64, ties to even), so past 2^53 the index is the binary64 value nearest
    /// the sum (`2^53 + 1` gives `2^53`). A `start` or `counter` that is not a binary64 value enters as
    /// the binary64 value nearest it.
    ///
    /// # Panics
    /// When `start + counter` rounds to 2^64 or above, an integer Number with no `u64` form.
    pub fn next_address(&mut self) -> Address {
        let index = js_add(self.start, self.counter); // :80
        self.counter = js_add(self.counter, 1); // :81
        self.address_for(index)
    }

    /// `addressFor(index)` (:84-87).
    pub fn address_for(&self, index: u64) -> Address {
        let ports = ports_for_index(index, self.levels, self.bits);
        Address {
            index,
            ip: self.ip.clone(),
            address: join_ports(&ports),
            full: address_string(&ports, &self.ip),
            ports,
            levels: self.levels,
            bits: self.bits,
        }
    }

    /// `forPid(pid)` (:88); `None` where [`index_for_pid`] is `None` (upstream index NaN).
    pub fn for_pid(&self, pid: &str) -> Option<Address> {
        index_for_pid(pid, self.levels, self.bits).map(|index| self.address_for(index))
    }

    /// `capacity()` (:89).
    pub fn capacity(&self) -> Result<String, CapacityRangeError> {
        capacity(self.levels, self.bits)
    }
}

/// JS `a + b` on the Numbers nearest `a` and `b`, read back as an integer (`Math.round` of an integer
/// Number is that integer); panics when the sum is 2^64 or above.
fn js_add(a: u64, b: u64) -> u64 {
    (Dbl::from_u64(a) + Dbl::from_u64(b)).js_round()
}

/// `portAddrRow(pid, addr, extra)` (port-address-emitter.mjs:92-99). `extra` lists the properties of
/// upstream's `extra` object in creation order; they enter the row in `Object.entries` order.
pub fn port_addr_row(pid: &str, addr: &Address, extra: &[(&str, &str)]) -> String {
    let mut fields = vec![
        "HBPv1".to_string(),
        "row=port_addr".to_string(),
        format!("pid={pid}"),
        format!("ip={}", addr.ip),
        format!("port_addr={}", addr.address),
        format!("full={}", addr.full),
        format!("levels={}", addr.levels),
        "same_process=true".to_string(),
        "bound_socket=false".to_string(),
    ];
    fields.extend(
        object_entries(extra)
            .into_iter()
            .map(|(k, v)| format!("{k}={v}")),
    ); // :94
    fields.push("json=0".to_string());
    let hash = sha256_hex(&format!("{pid}{}", addr.full));
    fields.push(format!("row_hash={}", &hash[..16])); // :98
    fields.join("|")
}

/// `Object.entries` of an object whose properties were created in `pairs` order (ECMA-262
/// OrdinaryOwnPropertyKeys): a repeated key keeps its first position and takes its last value; array
/// index keys come first in ascending numeric order, then the other keys in creation order.
fn object_entries<'a>(pairs: &[(&'a str, &'a str)]) -> Vec<(&'a str, &'a str)> {
    let mut props: Vec<(&'a str, &'a str)> = Vec::new();
    for &(k, v) in pairs {
        match props.iter_mut().find(|(pk, _)| *pk == k) {
            Some(slot) => slot.1 = v,
            None => props.push((k, v)),
        }
    }
    let mut indexed: Vec<(u32, &'a str, &'a str)> = props
        .iter()
        .filter_map(|&(k, v)| array_index(k).map(|i| (i, k, v)))
        .collect();
    indexed.sort_by_key(|&(i, _, _)| i);
    indexed
        .into_iter()
        .map(|(_, k, v)| (k, v))
        .chain(props.into_iter().filter(|(k, _)| array_index(k).is_none()))
        .collect()
}

/// An array index key: the canonical decimal form of an integer in `[0, 2^32 - 2]`.
fn array_index(key: &str) -> Option<u32> {
    let canonical = !key.is_empty()
        && key.len() <= 10
        && key.bytes().all(|b| b.is_ascii_digit())
        && (key == "0" || !key.starts_with('0'));
    if !canonical {
        return None;
    }
    let value: u64 = key.parse().ok()?;
    if value <= 4_294_967_294 {
        u32::try_from(value).ok()
    } else {
        None
    }
}
