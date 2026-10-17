//! Live-format deterministic PID minter `mintPid` (ASOLARIA-AS-NEURAL-NETWORK@4cc7624
//! tools/behcs/github-pid-register.mjs:14-68), the minter `extractRegisterPlace` uses.
//!
//! Role and kind are enums, so upstream's role/kind throws (:43-44) have no input that reaches them;
//! `prime` and `nest` are non-negative integers, as every upstream caller passes.

use crate::sha::sha256_hex;

/// 113 Asolaria sectors (github-pid-register.mjs:15).
pub const SECTORS: u32 = 113;
/// BEHCS-1024 glyph width (github-pid-register.mjs:16).
pub const WIDTH: u32 = 1024;

/// PID role (github-pid-register.mjs:17 `ROLES`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    Agt,
    Sup,
    Prof,
}

impl Role {
    /// Upstream role name.
    pub fn as_str(self) -> &'static str {
        match self {
            Role::Agt => "AGT",
            Role::Sup => "SUP",
            Role::Prof => "PROF",
        }
    }

    /// Hex suffix for the role (github-pid-register.mjs:17).
    pub fn suffix(self) -> char {
        match self {
            Role::Agt => 'C',
            Role::Sup => 'A',
            Role::Prof => 'B',
        }
    }
}

/// Yin/yang kind (github-pid-register.mjs:18-19 `KINDS`, `KIND_BITS`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Real,
    Logical,
}

impl Kind {
    /// Upstream kind name.
    pub fn as_str(self) -> &'static str {
        match self {
            Kind::Real => "real",
            Kind::Logical => "logical",
        }
    }

    /// `KIND_BITS[kind]`.
    pub fn bit(self) -> u32 {
        match self {
            Kind::Real => 1,
            Kind::Logical => 0,
        }
    }
}

/// A minted live-format PID and its divisions (github-pid-register.mjs:54-67).
pub struct MintedPid {
    pub pid: String,
    pub role: Role,
    pub name: String,
    pub hex: String,
    pub tier: String,
    pub width: String,
    pub prime: String,
    pub nest: String,
    pub yin_yang: Kind,
    pub yin_yang_bit: u32,
    pub lane: u32,
    pub quad: u32,
    pub glyph_5: u32,
    pub glyph_1024: u32,
    pub sector: u32,
    pub hilbert: u32,
    pub cube_bh: String,
    pub sha16: String,
}

/// `String(name).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')` (:45).
pub fn safe_name(name: &str) -> String {
    let mut out = String::new();
    let mut in_run = false;
    for c in name.to_uppercase().chars() {
        if c.is_ascii_uppercase() || c.is_ascii_digit() {
            out.push(c);
            in_run = false;
        } else if !in_run {
            out.push('-');
            in_run = true;
        }
    }
    let s = out.strip_prefix('-').unwrap_or(&out);
    let s = s.strip_suffix('-').unwrap_or(s);
    s.to_string()
}

/// `mintPid({ role, name, tier, nest, kind, prime })` (github-pid-register.mjs:42-68); upstream
/// defaults are tier 4, nest 1, kind logical, prime 0.
pub fn mint_pid(role: Role, name: &str, tier: i64, nest: u64, kind: Kind, prime: u64) -> MintedPid {
    let safe = safe_name(name);
    let h = sha256_hex(&safe);
    let base3 = h[0..3].to_uppercase();
    let hex = format!("{base3}{}", role.suffix());
    let seed = u32::from_str_radix(&h[0..8], 16).expect("8 hex digits");
    let tier_s = format!("{:02}", tier.clamp(0, 15));
    let prime_s = format!("{prime:02}");
    let nest_s = format!("{nest:05}");
    let pid = format!(
        "{}-{safe}-PID-H{hex}-A{tier_s}-W{WIDTH}-P{prime_s}-N{nest_s}",
        role.as_str()
    );
    MintedPid {
        pid,
        role,
        name: safe,
        hex: format!("H{hex}"),
        tier: tier_s,
        width: WIDTH.to_string(),
        prime: prime_s,
        nest: nest_s,
        yin_yang: kind,
        yin_yang_bit: kind.bit(),
        lane: seed % 3,
        quad: seed % 4,
        glyph_5: seed % 5,
        glyph_1024: seed % WIDTH,
        sector: seed % SECTORS,
        hilbert: u32::from_str_radix(&h[8..16], 16).expect("8 hex digits"),
        cube_bh: format!("BH.{}.{}.{}", seed % SECTORS, seed % 3, seed % WIDTH),
        sha16: h[0..16].to_string(),
    }
}
