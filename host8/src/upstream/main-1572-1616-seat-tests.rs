    #[test]
    fn parses_seat_from_combined_formula_row() {
        let line = "FORMULA|REALMATHPOS — node placement function|PID=84b4c6c420426dd7|CUBE_BH=BH.7.0.566|HILBERT=1083|GLYPH_BEHCS1024=566|GLYPH_BEHCS5=2|SECTOR=7|LANE=0|KIND=algorithm|TAG=MEASURED|CLASS=addressing-geometry (Brown-Hilbert linear index + cylinder fold + distance)|PROF=PROF-FORMULA-ADDRESSING-GEOMETRY-BROWN-HILBERT-LINEAR-INDEX-C|WHERE=x";
        let seat = seat_from_row(line, "ACER-FORMULA-CORPUS-REGISTRATION-2026-06-19.hbp")
            .expect("formula row should parse");
        assert_eq!(seat.handle8, "84b4c6c420426dd7");
        assert_eq!(seat.cube_bh, "BH.7.0.566");
        assert_eq!(seat.hilbert, "1083");
        assert!(seat.class.starts_with("addressing-geometry"));
        assert_eq!(seat.name, "REALMATHPOS — node placement function");
    }

    #[test]
    fn parses_seat_from_chief_and_sos_rows() {
        let chief = "CHIEF|FORMULA-CHIEF|PID=0155964ffc8ef1f8|HILBERT=1339|LAYER=chief|CLASS=level3_chief|GLYPH_BEHCS1024=591|CUBE_BH=BH.51.0.591|role=x|reports_to=COL-ASOLARIA-HELM";
        let s = seat_from_row(chief, "f").expect("chief parses");
        assert_eq!(s.handle8, "0155964ffc8ef1f8");
        assert_eq!(s.layer, "chief");
        assert_eq!(s.class, "level3_chief");
        assert_eq!(s.name, "FORMULA-CHIEF");
    }

    #[test]
    fn parses_seat_from_feed_reg_row() {
        let line = "REG|name=CEO-ASOLARIA-INSTANCES|pid=9198ed80b00dddee|hilbert=892|layer=helm|class=supervisor_of_supervisors_role_seat|g1024=858|g5=0|sector=?|status=CANONICAL";
        let seat = seat_from_row(line, "supervisors-fabric-feed-2026-06-10.hbp")
            .expect("feed row should parse");
        assert_eq!(seat.handle8, "9198ed80b00dddee");
        assert_eq!(seat.class, "supervisor_of_supervisors_role_seat");
        assert_eq!(seat.layer, "helm");
        assert_eq!(seat.hilbert, "892");
        assert_eq!(seat.name, "CEO-ASOLARIA-INSTANCES");
    }

    #[test]
    fn parses_seat_from_per_seat_file() {
        let body = "NAME|AGT-C4\nPID|f679158eb8ca4531|birth=2026-05-29T20:30:30.763Z|authority=X\nHILBERT|930\nLAYER|supervisor\nCLASS|hyperbehcs_supervisor_entity\n";
        let seat = seat_from_per_seat_file(body, "sup-AGT-C4-f679158eb8ca4531.hbp")
            .expect("per-seat file should parse");
        assert_eq!(seat.handle8, "f679158eb8ca4531");
        assert_eq!(seat.name, "AGT-C4");
        assert_eq!(seat.layer, "supervisor");
        assert_eq!(seat.class, "hyperbehcs_supervisor_entity");
        assert_eq!(seat.hilbert, "930");
    }
