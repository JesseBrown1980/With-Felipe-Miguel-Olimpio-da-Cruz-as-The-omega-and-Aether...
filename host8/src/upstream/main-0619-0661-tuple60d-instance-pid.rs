/// 60D tuple verb·noun·glyph·sha — byte-identical to gaia-loader.mjs::tuple60D.
///   verb  = verb_catalog[ parseInt(sha16(handle8+"|verb")[..8], 16) % len ]  (or "report")
///   noun  = seat name
///   glyph = sha16("glyph|"+noun+"|"+cube_bh)
///   sha   = handle8
fn tuple60d(
    name: &str,
    handle8: &str,
    cube_bh: &str,
    verb_catalog: &[String],
) -> (String, String, String, String) {
    let noun = name.to_string();
    let verb = if verb_catalog.is_empty() {
        "report".to_string()
    } else {
        // parseInt(sha16(handle8+"|verb").slice(0,8), 16) % len
        let sel = sha16(&format!("{}|verb", handle8));
        // first 8 hex chars -> u32 (fits, 8 hex = 32 bits). JS parseInt(.,16) on
        // an 8-hex string is an exact integer; modulo by catalog length.
        let idx_src = u64::from_str_radix(&sel[..8], 16).unwrap_or(0);
        let idx = (idx_src % verb_catalog.len() as u64) as usize;
        verb_catalog[idx].clone()
    };
    let glyph = sha16(&format!("glyph|{}|{}", noun, cube_bh));
    let sha = handle8.to_string();
    (verb, noun, glyph, sha)
}

/// Device-distinct INSTANCE pid — byte-identical to gaia-loader.mjs::resolveAgent.
///   tupleStr     = verb "." noun "." glyph "." sha
///   instance_pid = sha16( handle8 "|" device "|" ts "|" tupleStr )
fn resolve_instance_pid(
    handle8: &str,
    device: &str,
    ts: &str,
    verb: &str,
    noun: &str,
    glyph: &str,
    sha: &str,
) -> String {
    let tuple_str = format!("{}.{}.{}.{}", verb, noun, glyph, sha);
    sha16(&format!("{}|{}|{}|{}", handle8, device, ts, tuple_str))
}
