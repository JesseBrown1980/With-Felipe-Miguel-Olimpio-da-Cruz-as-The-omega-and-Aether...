    // -----------------------------------------------------------------------
    // step A · PARITY with node gaia-loader.mjs (the whole point of this route).
    // The node values below were computed by calling gaia-loader::resolveAgent
    // (and re-derived manually, both agreed) on the SAME fixed inputs:
    //   handle8 = 0155964ffc8ef1f8  (FORMULA-CHIEF)
    //   name    = FORMULA-CHIEF
    //   cube_bh = BH.51.0.591
    //   device  = acer
    //   ts      = 1750000000
    // verb catalog = C:\HyperBEHCS\data\catalogs\verbs.hbp (73 entries) -> "format"
    // Node results:
    //   glyph        = c844dff6b59b40cf
    //   instance_pid = d125579d9644c37a
    // -----------------------------------------------------------------------

    const NODE_HANDLE8: &str = "0155964ffc8ef1f8";
    const NODE_NAME: &str = "FORMULA-CHIEF";
    const NODE_CUBE_BH: &str = "BH.51.0.591";
    const NODE_DEVICE: &str = "acer";
    const NODE_TS: &str = "1750000000";
    const NODE_VERB: &str = "format";
    const NODE_GLYPH: &str = "c844dff6b59b40cf";
    const NODE_INSTANCE_PID: &str = "d125579d9644c37a";

    #[test]
    fn sha16_matches_node_crypto() {
        // node: crypto.createHash('sha256').update('abc').digest('hex').slice(0,16)
        // = ba7816bf8f01cfea (sha256("abc") = ba7816bf8f01cfea414140de5dae2223...)
        assert_eq!(sha16("abc"), "ba7816bf8f01cfea");
        assert_eq!(sha256hex("abc").len(), 64);
        assert!(sha256hex("abc").starts_with("ba7816bf8f01cfea414140de5dae2223"));
    }

    #[test]
    fn glyph_matches_node_for_formula_chief() {
        // glyph = sha16("glyph|" + noun + "|" + cube_bh)
        let glyph = sha16(&format!("glyph|{}|{}", NODE_NAME, NODE_CUBE_BH));
        assert_eq!(glyph, NODE_GLYPH);
    }

    #[test]
    fn resolve_instance_pid_matches_node_with_baked_verb() {
        // Catalog-independent: feed the verb node selected ("format") directly and
        // assert the device-distinct instance pid is byte-equal to node's.
        let pid = resolve_instance_pid(
            NODE_HANDLE8,
            NODE_DEVICE,
            NODE_TS,
            NODE_VERB,
            NODE_NAME,
            NODE_GLYPH,
            NODE_HANDLE8, // sha = handle8
        );
        assert_eq!(
            pid, NODE_INSTANCE_PID,
            "Rust instance_pid must equal node gaia-loader resolveAgent for fixed FORMULA-CHIEF inputs"
        );
    }
