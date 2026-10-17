fn canonicalize(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut in_control_run = false;
    for ch in input.chars() {
        if matches!(ch, '\t' | '\r' | '\n') {
            if !in_control_run {
                output.push(' ');
            }
            in_control_run = true;
        } else {
            output.push(ch);
            in_control_run = false;
        }
    }
    output
}

fn fnv1a64(input: &str) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in canonicalize(input).as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn host_handle8(input: &str) -> String {
    format!("{:016x}", fnv1a64(input))
}

// ---------------------------------------------------------------------------
// step A · /summon WORKLOAD — sha256 instance_pid (PARITY with gaia-loader.mjs)
// ---------------------------------------------------------------------------

/// Full sha256 of `input` rendered as 64 lowercase hex chars. Matches node's
/// crypto.createHash('sha256').update(s).digest('hex').
fn sha256hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let digest = hasher.finalize();
    let mut out = String::with_capacity(64);
    for byte in digest.iter() {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}

/// First 16 hex chars of sha256(input). This is node gaia-loader's `sha16(s)` =
/// `sha256hex(s).slice(0, 16)`. The fabric's BEHCS-style 8-byte (16 hex) id.
fn sha16(input: &str) -> String {
    let mut s = sha256hex(input);
    s.truncate(16);
    s
}
