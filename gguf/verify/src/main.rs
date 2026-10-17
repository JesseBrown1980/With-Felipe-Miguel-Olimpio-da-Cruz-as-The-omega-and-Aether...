//! gguf-verify-hbp: verify a GGUF file and emit HBP lines (json=0, float_used=0).
//! Usage: gguf-verify-hbp <file.gguf> [--expect-sha256 <hex>] [--expect-meta key=value]... [--tensors]

mod gguf;
mod sha256;

use gguf::Value;
use std::collections::BTreeMap;
use std::process::ExitCode;

fn clip(s: &str, n: usize) -> String {
    let flat: String = s
        .chars()
        .map(|ch| {
            if ch == '|' || ch == '\n' || ch == '\r' {
                '_'
            } else {
                ch
            }
        })
        .collect();
    if flat.chars().count() <= n {
        flat
    } else {
        flat.chars().take(n).collect::<String>() + "~"
    }
}

fn is_hex64(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit())
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let Some(path) = args.get(1) else {
        eprintln!("usage: gguf-verify-hbp <file.gguf> [--expect-sha256 <hex>] [--tensors]");
        return ExitCode::from(2);
    };
    let expect = args
        .iter()
        .position(|a| a == "--expect-sha256")
        .and_then(|i| args.get(i + 1))
        .map(|s| s.to_ascii_lowercase());
    let per_tensor = args.iter().any(|a| a == "--tensors");
    let expect_meta: Vec<(String, String)> = args
        .windows(2)
        .filter(|w| w[0] == "--expect-meta")
        .filter_map(|w| {
            w[1].split_once('=')
                .map(|(k, v)| (k.to_string(), v.to_string()))
        })
        .collect();
    let buf = match std::fs::read(path) {
        Ok(b) => b,
        Err(e) => {
            println!(
                "HBP1|schema=GGUF-VERIFY-V1|verdict=-1|error={}|json=0",
                clip(&e.to_string(), 80)
            );
            return ExitCode::from(1);
        }
    };
    let file_sha = sha256::hex(&sha256::digest(&buf));
    println!("HBP1|schema=GGUF-VERIFY-V1|rust=1.81|float_used=0|json=0");
    println!("FILE|bytes={}|sha256={}|json=0", buf.len(), file_sha);
    let mut ok = true;
    if let Some(e) = &expect {
        let m = *e == file_sha;
        ok &= m;
        println!(
            "EXPECT|sha256={}|match={}|json=0",
            e,
            if m { "+1" } else { "-1" }
        );
    }
    let g = match gguf::parse(&buf) {
        Ok(g) => g,
        Err(e) => {
            println!("PARSE|verdict=-1|error={}|json=0", clip(&e, 120));
            return ExitCode::from(1);
        }
    };
    println!(
        "HEADER|version={}|tensors={}|metadata={}|alignment={}|data_start={}|json=0",
        g.version,
        g.tensors.len(),
        g.metadata.len(),
        g.alignment,
        g.data_start
    );
    let mut hex_values: Vec<(String, String)> = Vec::new();
    for (k, v) in &g.metadata {
        let shown = match v {
            Value::Uint(u) => format!("u:{u}"),
            Value::Int(i) => format!("i:{i}"),
            Value::Bool(b) => format!("b:{}", u8::from(*b)),
            Value::Str(s) => {
                if is_hex64(s) {
                    hex_values.push((k.clone(), s.to_ascii_lowercase()));
                }
                format!("s:{}", clip(s, 96))
            }
            Value::FloatBits { width, bits } => format!("f{width}bits:0x{bits:x}"),
            Value::Array {
                elem_type,
                len,
                strings,
            } => {
                for s in strings.iter().filter(|s| is_hex64(s)) {
                    hex_values.push((k.clone(), s.to_ascii_lowercase()));
                }
                format!("array:type{elem_type}:len{len}")
            }
        };
        println!("META|key={}|value={}|json=0", clip(k, 80), shown);
    }
    let mut by_type: BTreeMap<&str, (u64, u64)> = BTreeMap::new();
    let mut spans: Vec<(u64, u64, &str)> = Vec::new();
    let mut tensor_hashes: Vec<String> = Vec::new();
    for t in &g.tensors {
        let e = by_type
            .entry(gguf::type_name(t.ggml_type))
            .or_insert((0, 0));
        e.0 += 1;
        match t.byte_len {
            Some(n) => {
                e.1 += n;
                spans.push((t.abs_offset, t.abs_offset + n, t.name.as_str()));
                let (a, b) = (t.abs_offset as usize, (t.abs_offset + n) as usize);
                let h = sha256::hex(&sha256::digest(&buf[a..b]));
                if per_tensor {
                    println!(
                        "TENSOR|name={}|type={}|dims={:?}|offset={}|bytes={}|sha256={}|json=0",
                        t.name,
                        gguf::type_name(t.ggml_type),
                        t.dims,
                        t.abs_offset,
                        n,
                        h
                    );
                }
                tensor_hashes.push(h);
            }
            None => {
                if per_tensor {
                    println!(
                        "TENSOR|name={}|type={}|dims={:?}|offset={}|bytes=UNSIZED|json=0",
                        t.name, t.ggml_type, t.dims, t.abs_offset
                    );
                }
            }
        }
    }
    for (ty, (n, bytes)) in &by_type {
        println!("TYPE|ggml={ty}|tensors={n}|bytes={bytes}|json=0");
    }
    spans.sort();
    let overlaps = spans.windows(2).filter(|w| w[0].1 > w[1].0).count();
    let end = spans.last().map_or(g.data_start, |s| s.1);
    let trailing = (buf.len() as u64).saturating_sub(end);
    println!("LAYOUT|overlaps={overlaps}|data_end={end}|trailing_bytes={trailing}|json=0");
    ok &= overlaps == 0 && trailing < g.alignment;
    let unsized_tensors = g.tensors.iter().filter(|t| t.byte_len.is_none()).count();
    if unsized_tensors > 0 {
        println!("UNSIZED|tensors={unsized_tensors}|verdict=0|json=0");
    }
    for (k, want) in &expect_meta {
        let got = g
            .metadata
            .iter()
            .find(|(mk, _)| mk == k)
            .map(|(_, v)| match v {
                Value::Str(s) => s.clone(),
                Value::Uint(u) => u.to_string(),
                Value::Int(i) => i.to_string(),
                Value::Bool(b) => u8::from(*b).to_string(),
                Value::FloatBits { bits, .. } => format!("0x{bits:x}"),
                Value::Array { len, .. } => format!("array:len{len}"),
            });
        let m = got.as_deref() == Some(want.as_str());
        ok &= m;
        println!(
            "EXPECT_META|key={}|want={}|got={}|match={}|json=0",
            clip(k, 80),
            clip(want, 96),
            clip(got.as_deref().unwrap_or("ABSENT"), 96),
            if m { "+1" } else { "-1" }
        );
    }
    let mut names: Vec<&str> = g.tensors.iter().map(|t| t.name.as_str()).collect();
    names.sort_unstable();
    let dup_names = names.windows(2).filter(|w| w[0] == w[1]).count();
    println!(
        "NAMES|unique={}|duplicates={}|json=0",
        names.len() - dup_names,
        dup_names
    );
    ok &= dup_names == 0;
    let mut computed: Vec<&str> = tensor_hashes.iter().map(String::as_str).collect();
    computed.sort_unstable();
    let matched = hex_values
        .iter()
        .filter(|(_, v)| computed.binary_search(&v.as_str()).is_ok())
        .count();
    println!(
        "META_HASHES|hex64_values={}|equal_to_a_tensor_sha256={}|json=0",
        hex_values.len(),
        matched
    );
    for (k, v) in hex_values
        .iter()
        .filter(|(_, v)| computed.binary_search(&v.as_str()).is_err())
        .take(12)
    {
        println!("META_HASH_OTHER|key={}|sha256={}|json=0", clip(k, 80), v);
    }
    let verdict = if !ok {
        "-1"
    } else if unsized_tensors > 0 {
        "0"
    } else {
        "+1"
    };
    println!("VERDICT|structure={verdict}|json=0");
    if ok {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(1)
    }
}
