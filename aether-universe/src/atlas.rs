//! The Atlas: read-only. Every function here takes a [`Snapshot`] (through a [`View`] parsed from its
//! rows) and returns text or rows. It has no handle on the Kernel, so the live view and a rewound
//! view go through the same code and cannot disagree: "The Atlas may feel alive. It may animate,
//! replay, alert, and explain. It must not become the source of truth."
//!
//! Nothing is drawn green. Evidence is a letter: `?` sealed, `m` local, `b` bridge, `v` verifier,
//! `V` independent.

use crate::agents::AState;
use crate::hbp::Row;
use crate::kernel::Evidence;
use crate::snapshot::Snapshot;
use crate::sources::{self, Unlock};
use crate::story;
use crate::world::{self, MAP_COLS, MAP_ROWS, NREG, REGIONS, RIVERS};

/// The Omega 5.3 QualityManager, decided by terminal width rather than a clock.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Quality {
    /// 80 columns or more: map with rivers, HUD, state summary, decision panel.
    Rich,
    /// 40 to 79: map without rivers, HUD.
    Balanced,
    /// Under 40: one line per region, no map.
    Low,
}

impl Quality {
    pub fn from_cols(cols: u32) -> Quality {
        if cols >= 80 {
            Quality::Rich
        } else if cols >= 40 {
            Quality::Balanced
        } else {
            Quality::Low
        }
    }

    pub fn word(self) -> &'static str {
        match self {
            Quality::Rich => "RICH",
            Quality::Balanced => "BALANCED",
            Quality::Low => "LOW",
        }
    }
}

/// Things the Atlas is told that are not in the snapshot.
#[derive(Clone, Debug)]
pub struct Ctx {
    pub cols: u32,
    /// `false` while the player is looking at a sealed past tick.
    pub live: bool,
    pub live_tick: u64,
    /// The last `verify` verdict word, or `none`.
    pub last_verify: String,
}

pub struct RegionView {
    pub id: u8,
    pub coherence: u32,
    pub energy: u32,
    pub population: u32,
    pub risk: u32,
    pub evidence: Evidence,
    pub unlocked: bool,
}

pub struct SecretView {
    pub id: u8,
    pub evidence: Evidence,
    pub solved_tick: Option<u64>,
    pub attempts: u32,
}

/// Everything the Atlas draws, parsed from the rows of one snapshot.
pub struct View {
    pub tick: u64,
    pub phase: String,
    pub wind: i64,
    pub fog: i64,
    pub light: i64,
    pub regions: Vec<RegionView>,
    pub agents: Vec<Row>,
    pub at: u8,
    pub chapter: u8,
    pub solved: u64,
    pub attempts: u64,
    pub visited: u64,
    pub secrets: Vec<SecretView>,
    pub alerts: Vec<Row>,
    pub this: String,
}

impl View {
    pub fn from_snapshot(s: &Snapshot) -> Result<View, String> {
        let t = s.rows_of("TICK").next().ok_or("no TICK row")?;
        let p = s.rows_of("PLAYER").next().ok_or("no PLAYER row")?;
        let num = |r: &Row, k: &str| -> Result<u64, String> {
            r.get_u64(k)
                .ok_or_else(|| format!("{} row: bad {k}", r.tag))
        };
        let mut regions = Vec::new();
        for r in s.rows_of("REGION") {
            regions.push(RegionView {
                id: num(r, "id")? as u8,
                coherence: num(r, "coherence")? as u32,
                energy: num(r, "energy")? as u32,
                population: num(r, "population")? as u32,
                risk: num(r, "risk")? as u32,
                evidence: r
                    .get("evidence")
                    .and_then(Evidence::from_word)
                    .ok_or("REGION row: bad evidence")?,
                unlocked: r.get("unlocked") == Some("1"),
            });
        }
        if regions.len() != NREG {
            return Err(format!("expected {NREG} regions, found {}", regions.len()));
        }
        let mut secrets = Vec::new();
        for r in s.rows_of("SECRET") {
            secrets.push(SecretView {
                id: num(r, "id")? as u8,
                evidence: r
                    .get("evidence")
                    .and_then(Evidence::from_word)
                    .ok_or("SECRET row: bad evidence")?,
                solved_tick: r.get_u64("solved_tick"),
                attempts: num(r, "attempts")? as u32,
            });
        }
        Ok(View {
            tick: num(t, "t")?,
            phase: t.get("phase").unwrap_or("dawn").to_string(),
            wind: t.get_i64("wind").unwrap_or(0),
            fog: t.get_i64("fog").unwrap_or(0),
            light: t.get_i64("light").unwrap_or(0),
            regions,
            agents: s.rows_of("AGENT").cloned().collect(),
            at: num(p, "at")? as u8,
            chapter: num(p, "chapter")? as u8,
            solved: num(p, "solved")?,
            attempts: num(p, "attempts")?,
            visited: num(p, "visited")?,
            secrets,
            alerts: s.rows_of("ALERT").cloned().collect(),
            this: s.this.clone(),
        })
    }

    pub fn region_secret(&self, r: u8) -> &SecretView {
        let id = world::secret_of_region(r);
        &self.secrets[(id - 1) as usize]
    }

    /// Does the region's secret count as solved?
    pub fn region_solved(&self, r: u8) -> bool {
        self.region_secret(r).evidence.is_solved()
    }

    pub fn visited(&self, r: u8) -> bool {
        (self.visited >> r) & 1 == 1
    }

    fn counts_by_state(&self) -> Vec<(AState, usize)> {
        AState::ALL
            .iter()
            .map(|st| {
                let n = self
                    .agents
                    .iter()
                    .filter(|a| a.get("state") == Some(st.name()))
                    .count();
                (*st, n)
            })
            .collect()
    }

    fn evidence_counts(&self) -> String {
        Evidence::ALL
            .iter()
            .map(|e| {
                let n = self.secrets.iter().filter(|s| s.evidence == *e).count();
                format!("{}:{n}", e.word())
            })
            .collect::<Vec<_>>()
            .join(",")
    }

    fn pending_bridges(&self) -> usize {
        self.secrets
            .iter()
            .filter(|s| s.evidence == Evidence::LocalMeasured)
            .count()
    }
}

/// One-line description of a region for the legend.
fn legend_line(v: &View, r: u8) -> String {
    let def = &REGIONS[r as usize];
    let f = &v.regions[r as usize];
    let glyph = if f.unlocked { def.glyph } else { '?' };
    let mut s = format!(
        "{glyph} {:<24} {}/{}/{}/{}  {}",
        def.name,
        f.coherence,
        f.energy,
        f.population,
        f.risk,
        f.evidence.letter()
    );
    if v.at == r {
        s.push_str("  (P)");
    }
    if !f.unlocked {
        s.push_str("  LOCKED");
    }
    if f.risk >= 60 {
        s.push_str("  ALERT risk");
    }
    if f.coherence <= 20 {
        s.push_str("  ALERT coherence");
    }
    s
}

/// The ASCII crystal map. Integer isometric projection, scale 3 on columns and 1 on rows. Rivers are
/// integer Bresenham lines of `.` (RICH only). A locked region is `?`; the player is `P`.
pub fn grid(v: &View, q: Quality) -> Vec<String> {
    let mut g = vec![vec![' '; MAP_COLS as usize]; MAP_ROWS as usize];
    let mut put = |c: i32, r: i32, ch: char, only_blank: bool| {
        if (0..MAP_COLS).contains(&c) && (0..MAP_ROWS).contains(&r) {
            let cell = &mut g[r as usize][c as usize];
            if !only_blank || *cell == ' ' {
                *cell = ch;
            }
        }
    };
    if q == Quality::Rich {
        for e in RIVERS.iter() {
            let a = world::project(REGIONS[e.from as usize].pos);
            let b = world::project(REGIONS[e.to as usize].pos);
            for (c, r) in world::bresenham(a, b) {
                if (c, r) != a && (c, r) != b {
                    put(c, r, '.', true);
                }
            }
        }
    }
    for def in REGIONS.iter() {
        let (c, r) = world::project(def.pos);
        let unlocked = v.regions[def.id as usize].unlocked;
        if unlocked && def.id == 8 && q == Quality::Rich {
            put(c - 1, r, '(', false);
            put(c, r, '*', false);
            put(c + 1, r, ')', false);
        } else {
            put(c, r, if unlocked { def.glyph } else { '?' }, false);
        }
    }
    let (pc, pr) = world::project(REGIONS[v.at as usize].pos);
    put(pc, pr, 'P', false);
    g.iter()
        .map(|row| row.iter().collect::<String>().trim_end().to_string())
        .collect()
}

pub fn hud_row(v: &View, q: Quality, ctx: &Ctx) -> Row {
    Row::new("HUD")
        .kv("world", "aether-universe")
        .kv("tick", v.tick)
        .kv("sim", if ctx.live { "live" } else { "past" })
        .kv("quality", q.word())
        .kv("agents", v.agents.len())
        .kv("regions", NREG)
        .kv("alerts", v.alerts.len())
        .kv("evidence", v.evidence_counts())
        .kv("promotion", "BLOCKED")
        .kv("timeline", format!("ch{}", v.chapter))
        .kv("snapshot", &v.this)
        .kv("pending_bridges", v.pending_bridges())
        .kv("verifier", &ctx.last_verify)
}

/// What to try next in a region: a plain suggestion.
pub fn suggest(v: &View) -> String {
    let r = v.at;
    let s = v.region_secret(r);
    if v.secrets.iter().all(|s| s.evidence.is_solved()) {
        return if r == 8 {
            "save seal, then verify".to_string()
        } else {
            "go star".to_string()
        };
    }
    if s.evidence.is_solved() {
        let next = (r + 1).min(8);
        return format!("go {}", REGIONS[next as usize].short);
    }
    if s.attempts == 0 && v.attempts == 0 {
        story::REGION_TEXT[r as usize].first_probe.to_string()
    } else {
        "look".to_string()
    }
}

pub fn decide_row(v: &View, ctx: &Ctx) -> Row {
    let recent = v
        .secrets
        .iter()
        .filter_map(|s| s.solved_tick.map(|t| (t, s.id)))
        .max()
        .map_or_else(|| "none".to_string(), |(_, id)| id.to_string());
    let first_locked = (0..NREG as u8).find(|r| !v.regions[*r as usize].unlocked);
    let blocking = match first_locked {
        Some(r) => format!(
            "ch{} needs secret {}",
            world::chapter_of_region(r),
            world::secret_of_region(r - 1)
        ),
        None => "none".to_string(),
    };
    Row::new("DECIDE")
        .kv("alerts", v.alerts.len())
        .kv("recent_evidence", recent)
        .kv("promotion", "BLOCKED")
        .kv("snapshot", &v.this)
        .kv("replay", format!("rewind {}", v.tick.saturating_sub(1)))
        .kv("timeline", format!("ch{}", v.chapter))
        .kv("verification", &ctx.last_verify)
        .kv("pending_bridges", v.pending_bridges())
        .kv("blocking", blocking)
        .kv("next", suggest(v))
}

pub fn states_row(v: &View) -> Row {
    let mut r = Row::new("STATES");
    for (st, n) in v.counts_by_state() {
        r = r.kv(st.name(), n);
    }
    r
}

/// The whole `map` output as lines (rows and grid), per quality level.
pub fn render_map(v: &View, q: Quality, ctx: &Ctx) -> Vec<String> {
    let mut out = Vec::new();
    match q {
        Quality::Low => {
            out.push(
                Row::new("MAP")
                    .kv("quality", q.word())
                    .kv("grid", "none")
                    .kv("term_cols", ctx.cols)
                    .line(),
            );
            for r in 0..NREG as u8 {
                out.push(legend_line(v, r));
            }
        }
        _ => {
            out.push(
                Row::new("MAP")
                    .kv("cols", MAP_COLS)
                    .kv("rows", MAP_ROWS)
                    .kv("quality", q.word())
                    .kv("term_cols", ctx.cols)
                    .kv("rivers", u8::from(q == Quality::Rich))
                    .line(),
            );
            out.extend(grid(v, q));
            for r in 0..NREG as u8 {
                out.push(legend_line(v, r));
            }
            if q == Quality::Rich {
                out.push(states_row(v).line());
            }
            out.push(hud_row(v, q, ctx).line());
            if q == Quality::Rich {
                out.push(decide_row(v, ctx).line());
            }
        }
    }
    out
}

/// How many hints the player has earned in a region: one always, a second after a wrong answer, the
/// third after three. A solved region shows all three.
pub fn hint_level(v: &View, r: u8) -> usize {
    let s = v.region_secret(r);
    if s.evidence.is_solved() {
        return 3;
    }
    1 + usize::from(s.attempts >= 1) + usize::from(s.attempts >= 3)
}

/// `look`: the region row, the question, and the hints earned so far.
pub fn look_rows(v: &View) -> Vec<Row> {
    let r = v.at;
    let def = &REGIONS[r as usize];
    let f = &v.regions[r as usize];
    let t = &story::REGION_TEXT[r as usize];
    let mut rows = vec![Row::new("LOOK")
        .kv("region", def.name)
        .kv("coherence", f.coherence)
        .kv("energy", f.energy)
        .kv("population", f.population)
        .kv("risk", f.risk)
        .kv("secret", def.secret)
        .kv("evidence", f.evidence.word())];
    rows.push(
        Row::new("ASK")
            .kv("question", t.question)
            .kv("answer_format", t.format),
    );
    for level in 1..=hint_level(v, r) {
        rows.push(
            Row::new("HINT")
                .kv("level", level)
                .kv("text", t.hints[level - 1]),
        );
    }
    rows
}

/// `timeline`: the nine dated events and where each chapter stands.
pub fn timeline_rows(v: &View) -> Vec<Row> {
    let open = (0..NREG as u8)
        .filter(|r| v.regions[*r as usize].unlocked)
        .count();
    let mut rows = vec![Row::new("TIMELINE").kv("chapters", 9).kv("open", open)];
    for e in sources::TIMELINE.iter() {
        let r = e.chapter - 1;
        let state = if v.region_solved(r) {
            "solved"
        } else if v.regions[r as usize].unlocked {
            "open"
        } else {
            "locked"
        };
        rows.push(
            Row::new("EVENT")
                .kv("ch", e.chapter)
                .kv("date", e.date)
                .kv("region", REGIONS[r as usize].name)
                .kv("state", state)
                .kv("tag", e.tag.word())
                .kv("text", e.text),
        );
    }
    rows
}

fn fact_row(f: &sources::Fact) -> Row {
    Row::new("FACT")
        .kv("id", f.id)
        .kv("ch", f.chapter)
        .kv("tag", f.tag.word())
        .kv("source", f.source)
        .kv("text", f.text)
}

/// Is a fact unlocked for this view?
fn unlocked(v: &View, f: &sources::Fact) -> bool {
    if f.chapter == 0 {
        return true;
    }
    let r = f.chapter - 1;
    match f.unlock {
        Unlock::Visit => v.visited(r),
        Unlock::Solve => v.region_solved(r),
    }
}

/// `codex` (all unlocked facts) or `codex <n>` (one chapter's unlocked facts).
pub fn codex_rows(v: &View, chapter: Option<u8>) -> Vec<Row> {
    let facts: Vec<&sources::Fact> = sources::FACTS
        .iter()
        .filter(|f| unlocked(v, f))
        .filter(|f| chapter.map_or(true, |c| f.chapter == c))
        .collect();
    let mut rows = vec![Row::new("CODEX").kv("entries", facts.len())];
    rows.extend(facts.into_iter().map(fact_row));
    rows
}

/// `agents`: the 27 AGENT rows exactly as sealed.
pub fn agents_rows(v: &View) -> Vec<Row> {
    let mut rows = vec![Row::new("AGENTS").kv("n", v.agents.len())];
    rows.extend(v.agents.iter().cloned());
    rows
}

/// Is a chapter's story open to read? A chapter opens when the previous one is solved.
pub fn chapter_open(v: &View, chapter: u8) -> bool {
    chapter == 0 || (chapter <= 9 && v.regions[(chapter - 1) as usize].unlocked)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kernel::Kernel;
    use crate::secrets::Inputs;

    fn view0() -> View {
        let k = Kernel::new(20_260_801, None, Inputs::empty("x"));
        View::from_snapshot(&k.snapshot()).unwrap()
    }

    fn ctx(cols: u32) -> Ctx {
        Ctx {
            cols,
            live: true,
            live_tick: 0,
            last_verify: "none".into(),
        }
    }

    #[test]
    fn quality_follows_terminal_width_and_never_a_clock() {
        assert_eq!(Quality::from_cols(80), Quality::Rich);
        assert_eq!(Quality::from_cols(200), Quality::Rich);
        assert_eq!(Quality::from_cols(79), Quality::Balanced);
        assert_eq!(Quality::from_cols(40), Quality::Balanced);
        assert_eq!(Quality::from_cols(39), Quality::Low);
        assert_eq!(Quality::from_cols(0), Quality::Low);
    }

    #[test]
    fn the_grid_places_every_region_where_the_projection_says() {
        let v = view0();
        let g = grid(&v, Quality::Balanced);
        assert_eq!(g.len(), 17);
        let at = |c: i32, r: i32| g[r as usize].chars().nth(c as usize).unwrap_or(' ');
        // at tick 0 only the first chapter is open: the rest are '?', the player stands on chapter 1
        assert_eq!(at(11, 5), 'P');
        for (c, r) in [
            (20, 6),
            (2, 8),
            (38, 4),
            (29, 15),
            (14, 4),
            (20, 8),
            (5, 15),
            (29, 1),
        ] {
            assert_eq!(at(c, r), '?', "locked region at ({c},{r})");
        }
        assert!(g.iter().all(|l| l.chars().count() <= 40));
    }

    #[test]
    fn rivers_appear_only_at_rich_quality() {
        let v = view0();
        let rich = grid(&v, Quality::Rich).join("\n");
        let bal = grid(&v, Quality::Balanced).join("\n");
        assert!(rich.contains('.'));
        assert!(!bal.contains('.'));
        assert!(
            !rich.contains("\u{1b}"),
            "no colour codes: nothing is drawn green"
        );
    }

    #[test]
    fn map_output_shrinks_with_quality() {
        let v = view0();
        let rich = render_map(&v, Quality::Rich, &ctx(80));
        let bal = render_map(&v, Quality::Balanced, &ctx(60));
        let low = render_map(&v, Quality::Low, &ctx(30));
        assert!(rich.len() > bal.len() && bal.len() > low.len());
        assert!(rich.iter().any(|l| l.starts_with("DECIDE|")));
        assert!(rich.iter().any(|l| l.starts_with("HUD|")));
        assert!(bal.iter().any(|l| l.starts_with("HUD|")));
        assert!(!bal.iter().any(|l| l.starts_with("DECIDE|")));
        assert!(!low.iter().any(|l| l.starts_with("HUD|")));
        assert_eq!(
            low.len(),
            1 + 9,
            "LOW is one MAP row and one line per region"
        );
        for l in rich.iter().filter(|l| l.contains('|')) {
            assert!(l.ends_with("|json=0"), "{l}");
        }
    }

    #[test]
    fn hud_and_decide_carry_the_promotion_block_and_the_evidence_counts() {
        let v = view0();
        let c = ctx(80);
        let h = hud_row(&v, Quality::Rich, &c);
        assert_eq!(h.get("promotion"), Some("BLOCKED"));
        assert_eq!(h.get("agents"), Some("27"));
        assert_eq!(h.get("regions"), Some("9"));
        assert!(h
            .get("evidence")
            .unwrap()
            .starts_with("SEALED:9,LOCAL_MEASURED:0"));
        let d = decide_row(&v, &c);
        assert_eq!(d.get("promotion"), Some("BLOCKED"));
        assert_eq!(d.get("blocking"), Some("ch2 needs secret 1"));
        assert_eq!(d.get("next"), Some("probe 14"));
    }

    #[test]
    fn look_gives_one_hint_at_first_and_the_ask_row_names_only_the_answer_shape() {
        let v = view0();
        let rows = look_rows(&v);
        assert_eq!(rows[0].tag, "LOOK");
        assert_eq!(rows[1].tag, "ASK");
        assert_eq!(rows[1].get("answer_format"), Some("states:reach"));
        assert_eq!(rows.iter().filter(|r| r.tag == "HINT").count(), 1);
        assert!(!rows.iter().any(|r| r.line().contains("27:13")));
    }

    #[test]
    fn timeline_starts_with_one_open_chapter_and_eight_locked() {
        let v = view0();
        let rows = timeline_rows(&v);
        assert_eq!(rows[0].get("open"), Some("1"));
        let states: Vec<&str> = rows[1..].iter().map(|r| r.get("state").unwrap()).collect();
        assert_eq!(states[0], "open");
        assert!(states[1..].iter().all(|s| *s == "locked"));
        assert_eq!(rows[1].get("date"), Some("2026-04-01"));
    }

    #[test]
    fn codex_unlocks_facts_by_visit_and_by_solve() {
        let v = view0();
        let rows = codex_rows(&v, None);
        let ids: Vec<&str> = rows[1..].iter().map(|r| r.get("id").unwrap()).collect();
        assert!(
            ids.contains(&"P01") && ids.contains(&"H01"),
            "premise and chapter 1 visit facts"
        );
        assert!(
            !ids.contains(&"H02"),
            "a solve fact is locked until the secret is solved"
        );
        assert!(!ids.contains(&"F01"), "chapter 2 is not open");
        for r in &rows[1..] {
            assert!(["MEASURED", "NAMED", "OPERATOR", "STORY"].contains(&r.get("tag").unwrap()));
            assert!(!r.get("source").unwrap().is_empty());
        }
    }

    #[test]
    fn atlas_renders_a_rewound_view_the_same_way_as_a_live_one() {
        use crate::kernel::Mission;
        let mut k = Kernel::new(20_260_801, None, Inputs::empty("x"));
        let s0 = k.snapshot();
        k.tick(&[Mission::Solve("27:13".into())]);
        let live = View::from_snapshot(&k.snapshot()).unwrap();
        let past = View::from_snapshot(&s0).unwrap();
        assert!(live.regions[1].unlocked && !past.regions[1].unlocked);
        assert_ne!(grid(&live, Quality::Rich), grid(&past, Quality::Rich));
        // deterministic: same snapshot, same drawing
        assert_eq!(
            grid(&past, Quality::Rich),
            grid(&View::from_snapshot(&s0).unwrap(), Quality::Rich)
        );
    }
}
