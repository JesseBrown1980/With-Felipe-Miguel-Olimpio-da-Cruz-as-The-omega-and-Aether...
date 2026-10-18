//! Driver for `referee/referee_ports.py`: reads one case per stdin line and writes the case followed
//! by this crate's answer. Cases (pipe rows, no JSON):
//! `ports|L|B|I`, `capacity|L|B`, `pid|L|B|PID`, `next|L|B|START|COUNT`, `row|L|B|IP|K=V;K=V|PID`.

use std::io::{self, BufRead, BufWriter, Write};

use port_address_emitter::{
    capacity, port_addr_row, ports_for_index, EmitterOpts, PortAddressEmitter,
};

fn num<T: std::str::FromStr>(s: &str) -> T {
    s.parse()
        .unwrap_or_else(|_| panic!("not an unsigned integer: {s}"))
}

fn join(ports: &[u32]) -> String {
    ports
        .iter()
        .map(u32::to_string)
        .collect::<Vec<_>>()
        .join(".")
}

fn emitter(levels: &str, bits: &str, ip: Option<&str>, start: Option<u64>) -> PortAddressEmitter {
    PortAddressEmitter::new(EmitterOpts {
        ip: ip.map(str::to_string),
        levels: Some(num(levels)),
        bits: Some(num(bits)),
        start,
    })
}

fn main() {
    let stdin = io::stdin();
    let mut out = BufWriter::new(io::stdout().lock());
    for line in stdin.lock().lines() {
        let line = line.expect("stdin line");
        let op = line.split('|').next().unwrap_or_default();
        match op {
            "ports" => {
                let f: Vec<&str> = line.split('|').collect();
                let ports = ports_for_index(num(f[3]), num(f[1]), num(f[2]));
                writeln!(out, "{line}|{}", join(&ports)).expect("write");
            }
            "capacity" => {
                let f: Vec<&str> = line.split('|').collect();
                let cap = capacity(num(f[1]), num(f[2])).unwrap_or_else(|_| "RangeError".into());
                writeln!(out, "{line}|{cap}").expect("write");
            }
            "pid" => {
                let f: Vec<&str> = line.splitn(4, '|').collect();
                let answer = match emitter(f[1], f[2], None, None).for_pid(f[3]) {
                    Some(a) => format!("{}|{}", a.index, a.full),
                    None => "none".to_string(),
                };
                writeln!(out, "{line}|{answer}").expect("write");
            }
            "next" => {
                let f: Vec<&str> = line.split('|').collect();
                let mut e = emitter(f[1], f[2], None, Some(num(f[3])));
                let count: u64 = num(f[4]);
                for k in 0..count {
                    let a = e.next_address();
                    writeln!(out, "{line}|{k}|{}|{}|{}", a.index, a.full, e.counter)
                        .expect("write");
                }
            }
            "row" => {
                let f: Vec<&str> = line.splitn(6, '|').collect();
                let e = emitter(f[1], f[2], Some(f[3]), None);
                let extra: Vec<(&str, &str)> = f[4]
                    .split(';')
                    .filter(|kv| !kv.is_empty())
                    .map(|kv| kv.split_once('=').expect("k=v"))
                    .collect();
                let answer = match e.for_pid(f[5]) {
                    Some(a) => port_addr_row(f[5], &a, &extra),
                    None => "none".to_string(),
                };
                writeln!(out, "{line}|{answer}").expect("write");
            }
            other => panic!("unknown case {other}"),
        }
    }
    out.flush().expect("flush");
}
