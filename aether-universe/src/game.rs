//! The Console: flags, the command loop, and everything that touches the disk.
//!
//! `read line -> Mission -> Kernel::tick -> write snapshot -> Atlas`. The Kernel has no I/O; this
//! module reads the files the kernel needs (the enwik8 census, the Mythos file), writes every tick's
//! snapshot, and prints. Output is hot-path first: HBP rows, then prose.

use crate::atlas::{self, Ctx, Quality, View};
use crate::commands::{self, Command};
use crate::evidence;
use crate::hbp::{self, Row};
use crate::kernel::{Kernel, Mission};
use crate::probe;
use crate::script;
use crate::secrets::{self, Inputs, MythosFile, Outcome};
use crate::sha256;
use crate::snapshot::{self, Snapshot};
use crate::sources;
use crate::story;
use crate::world::{self, NameError, REGIONS};
use std::fs;
use std::io::{BufRead, Write};
use std::path::{Path, PathBuf};

pub const DEFAULT_SEED: u64 = 20_260_801;
pub const DEFAULT_MAX_TICKS: u64 = 19_683;
pub const ENWIK8_BYTES: u64 = 100_000_000;

/// Everything the flags set.
#[derive(Clone, Debug)]
pub struct Config {
    pub seed: u64,
    pub cols: u32,
    pub saves: PathBuf,
    pub data: PathBuf,
    pub mythos: PathBuf,
    pub seat: String,
    pub max_ticks: u64,
    pub no_story: bool,
    pub script: Option<PathBuf>,
    pub strict_enwik8: bool,
    pub timing: bool,
    pub session: Option<String>,
    /// After the last command, also run `verify <path>` against another machine's seal.
    pub also_verify: Option<PathBuf>,
    /// Print a `> ` prompt (set by `main` when stdin is a terminal; not a flag).
    pub prompt: bool,
}

impl Default for Config {
    fn default() -> Config {
        Config {
            seed: DEFAULT_SEED,
            cols: 80,
            saves: PathBuf::from("saves"),
            data: PathBuf::from("data"),
            mythos: PathBuf::from(sources::MYTHOS_PATH),
            seat: "unknown".to_string(),
            max_ticks: DEFAULT_MAX_TICKS,
            no_story: false,
            script: None,
            strict_enwik8: false,
            timing: false,
            session: None,
            also_verify: None,
            prompt: false,
        }
    }
}

pub const USAGE: &str =
    "aether-universe [--seed <u64>] [--cols <n>] [--saves <dir>] [--data <dir>] \
[--mythos <path>] [--seat <name>] [--max-ticks <n>] [--script <file>] [--session <name>] \
[--also-verify <seal>] [--no-story] [--strict-enwik8] [--timing]";

/// Parse the command-line flags. `Err` carries a message; the caller exits with code 2.
pub fn parse_args(args: &[String]) -> Result<Config, String> {
    let mut c = Config::default();
    let mut i = 0;
    let need = |i: usize, flag: &str| -> Result<&String, String> {
        args.get(i + 1)
            .ok_or_else(|| format!("{flag} needs a value"))
    };
    while i < args.len() {
        let a = args[i].as_str();
        match a {
            "--seed" => {
                c.seed = need(i, a)?
                    .parse()
                    .map_err(|_| "--seed needs an unsigned integer".to_string())?;
                i += 1;
            }
            "--cols" => {
                c.cols = need(i, a)?
                    .parse()
                    .map_err(|_| "--cols needs an unsigned integer".to_string())?;
                i += 1;
            }
            "--saves" => {
                c.saves = PathBuf::from(need(i, a)?);
                i += 1;
            }
            "--data" => {
                c.data = PathBuf::from(need(i, a)?);
                i += 1;
            }
            "--mythos" => {
                c.mythos = PathBuf::from(need(i, a)?);
                i += 1;
            }
            "--seat" => {
                let s = need(i, a)?;
                if !commands::valid_name(s) {
                    return Err("--seat takes letters, digits, '-' and '_' only".to_string());
                }
                c.seat = s.clone();
                i += 1;
            }
            "--max-ticks" => {
                c.max_ticks = need(i, a)?
                    .parse()
                    .map_err(|_| "--max-ticks needs an unsigned integer".to_string())?;
                i += 1;
            }
            "--script" => {
                c.script = Some(PathBuf::from(need(i, a)?));
                i += 1;
            }
            "--session" => {
                let s = need(i, a)?;
                if !commands::valid_name(s) {
                    return Err("--session takes letters, digits, '-' and '_' only".to_string());
                }
                c.session = Some(s.clone());
                i += 1;
            }
            "--also-verify" => {
                c.also_verify = Some(PathBuf::from(need(i, a)?));
                i += 1;
            }
            "--no-story" => c.no_story = true,
            "--strict-enwik8" => c.strict_enwik8 = true,
            "--timing" => c.timing = true,
            "--help" | "-h" => return Err("help".to_string()),
            other => return Err(format!("unknown flag {other}")),
        }
        i += 1;
    }
    Ok(c)
}

/// Is this census the genuine enwik8? The size alone is not an identity (any 100,000,000 bytes have
/// it): the sha256 must begin with the genuine prefix. `Ok` is a pass; `Err` is the note that goes in
/// the `NOT_MEASURED` row, with the hash that was seen beside the one that was expected.
pub fn enwik8_identity(
    c: &secrets::Census,
    want_bytes: u64,
    want_prefix: &str,
) -> Result<(), String> {
    if c.bytes != want_bytes {
        return Err(format!("read {} bytes, not {want_bytes}", c.bytes));
    }
    if !c.sha256.starts_with(want_prefix) {
        let seen: String = c.sha256.chars().take(16).collect();
        let want: String = want_prefix.chars().take(16).collect();
        return Err(format!(
            "sha256 {seen}... is not the genuine enwik8 (sha256 {want}..., MEASURED on two seats); \
a file of the right size is not enwik8"
        ));
    }
    Ok(())
}

/// Read the files the kernel may need and hand them over as bytes and counts.
pub fn load_inputs(cfg: &Config) -> Inputs {
    let mut inputs = Inputs::empty(&story::WHITE_PAGE.replace("\r\n", "\n"));
    inputs.strict_enwik8 = cfg.strict_enwik8;
    let enwik = cfg.data.join("enwik8");
    match fs::metadata(&enwik) {
        Ok(m) if m.len() == ENWIK8_BYTES => {
            match fs::File::open(&enwik).and_then(|mut f| secrets::census_reader(&mut f)) {
                Ok(c) => match enwik8_identity(&c, ENWIK8_BYTES, sources::GENUINE_ENWIK8_SHA256) {
                    Ok(()) => inputs.enwik8 = Some(c),
                    Err(note) => inputs.enwik8_note = Some(note),
                },
                Err(e) => inputs.enwik8_note = Some(format!("unreadable: {e}")),
            }
        }
        Ok(m) => {
            inputs.enwik8_note = Some(format!("size {} is not {ENWIK8_BYTES}", m.len()));
        }
        Err(_) => {}
    }
    if let Ok(bytes) = fs::read(&cfg.mythos) {
        if bytes.len() <= 64 << 20 {
            let side = PathBuf::from(format!("{}.sha256", cfg.mythos.display()));
            let sidecar = fs::read_to_string(side)
                .ok()
                .map(|s| s.lines().next().unwrap_or("").to_string());
            inputs.mythos = Some(MythosFile { bytes, sidecar });
        }
    }
    inputs
}

fn fresh_name(saves: &Path, base: &str) -> String {
    let mut n = 1;
    let mut name = base.to_string();
    while saves.join(&name).exists() {
        n += 1;
        name = format!("{base}-{n}");
    }
    name
}

/// Copy ticks `0..=upto` of a timeline (four files each) from one directory to another.
fn copy_ticks(src: &Path, dst: &Path, upto: u64) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for k in 0..=upto {
        let stem = snapshot::stem(k);
        for ext in ["hbp", "hbi", "hbp.sha256", "hbi.sha256"] {
            let name = format!("{stem}.{ext}");
            fs::copy(src.join(&name), dst.join(&name))?;
        }
    }
    Ok(())
}

pub struct Game<'a> {
    cfg: Config,
    kernel: Kernel,
    session: String,
    /// The logical session id the seal carries: the default name, without the uniqueness suffix
    /// a directory may need. A seal depends on seed, script, seat and this id, nothing else.
    session_id: String,
    session_dir: PathBuf,
    /// `Some` while looking at a sealed past tick.
    past: Option<Snapshot>,
    last_verify: String,
    verify_failed: bool,
    script_sha256: String,
    out: &'a mut dyn Write,
    quit: bool,
    io_failed: bool,
}

impl<'a> Game<'a> {
    /// Build the game: genesis kernel, a fresh session directory, and tick 0 on disk.
    pub fn new(
        cfg: Config,
        script_sha256: Option<String>,
        out: &'a mut dyn Write,
    ) -> Result<Game<'a>, i32> {
        let script16 = script_sha256.as_deref().map(|h| h[..16].to_string());
        let inputs = load_inputs(&cfg);
        let kernel = Kernel::new(cfg.seed, script16.as_deref(), inputs);
        let tag = script_sha256
            .as_deref()
            .map_or("live".to_string(), |h| h[..8].to_string());
        let base = cfg
            .session
            .clone()
            .unwrap_or_else(|| format!("s{}-{tag}", cfg.seed));
        let session = match &cfg.session {
            Some(s) => {
                if cfg.saves.join(s).exists() {
                    let _ = writeln!(
                        out,
                        "{}",
                        Row::new("REFUSED")
                            .kv("reason", "session_exists")
                            .kv("name", s)
                            .line()
                    );
                    return Err(2);
                }
                s.clone()
            }
            None => fresh_name(&cfg.saves, &format!("s{}-{tag}", cfg.seed)),
        };
        let session_dir = cfg.saves.join(&session);
        let mut g = Game {
            cfg,
            kernel,
            session,
            session_id: base,
            session_dir,
            past: None,
            last_verify: "none".to_string(),
            verify_failed: false,
            script_sha256: script_sha256.unwrap_or_else(|| "none".to_string()),
            out,
            quit: false,
            io_failed: false,
        };
        let genesis = g.kernel.snapshot();
        if let Err(e) = snapshot::write(&g.ticks_dir(), &genesis) {
            g.row(
                &Row::new("MEASURED_FAIL")
                    .kv("subject", "write")
                    .kv("detail", e),
            );
            return Err(5);
        }
        Ok(g)
    }

    // ---- output

    fn say(&mut self, s: &str) {
        if writeln!(self.out, "{s}").is_err() {
            self.quit = true;
        }
    }

    fn row(&mut self, r: &Row) {
        let l = r.line();
        self.say(&l);
    }

    fn rows(&mut self, rs: &[Row]) {
        for r in rs {
            self.row(r);
        }
    }

    fn story(&mut self, chapter: usize) {
        if self.cfg.no_story {
            return;
        }
        if let Some(t) = story::CHAPTERS.get(chapter) {
            for l in t.lines() {
                self.say(l);
            }
        }
    }

    fn ticks_dir(&self) -> PathBuf {
        self.session_dir.join("ticks")
    }

    fn quality(&self) -> Quality {
        Quality::from_cols(self.cfg.cols)
    }

    /// The snapshot being looked at: a past one, or the live head.
    fn viewed(&self) -> Snapshot {
        self.past.clone().unwrap_or_else(|| self.kernel.snapshot())
    }

    fn view(&self) -> Option<(View, Ctx)> {
        let v = View::from_snapshot(&self.viewed()).ok()?;
        let ctx = Ctx {
            cols: self.cfg.cols,
            live: self.past.is_none(),
            live_tick: self.kernel.tick,
            last_verify: self.last_verify.clone(),
        };
        Some((v, ctx))
    }

    fn refuse_past(&mut self) -> bool {
        if let Some(p) = &self.past {
            let r = Row::new("REFUSED")
                .kv("reason", "viewing_past")
                .kv("view_tick", p.tick)
                .kv("live_tick", self.kernel.tick);
            self.row(&r);
            return true;
        }
        false
    }

    /// One tick with the given missions, written to disk. `None` when the run has halted.
    fn commit(&mut self, missions: &[Mission]) -> Option<Snapshot> {
        if self.kernel.tick >= self.cfg.max_ticks {
            self.row(
                &Row::new("HALT")
                    .kv("reason", "max_ticks")
                    .kv("max", self.cfg.max_ticks),
            );
            return None;
        }
        let snap = self.kernel.tick(missions);
        if let Err(e) = snapshot::write(&self.ticks_dir(), &snap) {
            self.row(
                &Row::new("MEASURED_FAIL")
                    .kv("subject", "write")
                    .kv("detail", e),
            );
            self.io_failed = true;
            self.quit = true;
            return None;
        }
        Some(snap)
    }

    // ---- start and the loop

    fn banner(&mut self) {
        let chain = self.kernel.head.clone();
        let r = Row::new("GAME")
            .kv("name", "aether-universe")
            .kv("seed", self.kernel.seed)
            .kv("session", &self.session)
            .kv("chain", chain)
            .kv("quality", self.quality().word())
            .kv("seat", &self.cfg.seat)
            .kv("float_used", 0)
            .kv("javascript", 0);
        self.row(&r);
        self.story(0);
        self.story(1);
        let next = Row::new("READY")
            .kv("region", REGIONS[0].name)
            .kv("chapter", 1)
            .kv("next", "look")
            .kv("help", "help");
        self.row(&next);
    }

    /// Run commands from stdin (or a script) until `quit` or the end of input.
    pub fn run_lines(&mut self, lines: &mut dyn Iterator<Item = String>, echo: bool) {
        for line in lines {
            if self.quit {
                break;
            }
            if !commands::is_script_command(&line) {
                continue;
            }
            if echo {
                let l = format!("> {}", line.trim());
                self.say(&l);
            }
            self.exec(&line);
        }
        if !self.quit {
            self.cmd_quit();
        }
    }

    fn exec(&mut self, line: &str) {
        match commands::parse(line) {
            Command::Help => self.cmd_help(),
            Command::Look => self.cmd_look(),
            Command::Map => self.cmd_map(),
            Command::Go(name) => self.cmd_go(&name),
            Command::Probe(raw) => self.cmd_probe(&raw),
            Command::Trits(n) => {
                let rs = probe::trits_rows(&n);
                self.rows(&rs);
            }
            Command::Solve(a) => self.cmd_solve(&a),
            Command::Codex(n) => self.cmd_codex(n.as_deref()),
            Command::Timeline => self.cmd_timeline(),
            Command::Agents => self.cmd_agents(),
            Command::Wait(n) => self.cmd_wait(n.as_deref()),
            Command::Rewind(a) => self.cmd_rewind(&a),
            Command::Branch => self.cmd_branch(),
            Command::Save(n) => self.cmd_save(&n),
            Command::Load(n) => self.cmd_load(&n),
            Command::Verify(p) => self.cmd_verify(p.as_deref()),
            Command::Quit => self.cmd_quit(),
            Command::Usage(cmd, usage) => {
                self.row(&Row::new("USAGE").kv("command", cmd).kv("usage", usage));
            }
            Command::Unknown(s) => {
                self.row(&commands::unknown_row(&s));
                self.say("type help for the commands");
            }
        }
    }

    // ---- commands

    fn cmd_help(&mut self) {
        let names = commands::NAMES.join(",");
        self.row(&Row::new("HELP").kv("commands", names));
        for (c, d) in commands::HELP {
            self.say(&format!("  {c:<36} {d}"));
        }
    }

    fn cmd_look(&mut self) {
        let Some((v, _)) = self.view() else {
            self.say("cannot read the current snapshot");
            return;
        };
        self.rows(&atlas::look_rows(&v));
        for l in probe::look_extras(v.at, &self.kernel) {
            self.say(&l);
        }
    }

    fn cmd_map(&mut self) {
        let Some((v, ctx)) = self.view() else {
            self.say("cannot read the current snapshot");
            return;
        };
        for l in atlas::render_map(&v, self.quality(), &ctx) {
            self.say(&l);
        }
    }

    fn cmd_go(&mut self, name: &str) {
        if self.refuse_past() {
            return;
        }
        let to = match world::region_by_name(name) {
            Ok(r) => r,
            Err(NameError::NotFound) => {
                self.row(&Row::new("NOREGION").kv("input", name));
                return;
            }
            Err(NameError::Ambiguous(list)) => {
                let names: Vec<&str> = list.iter().map(|r| REGIONS[*r as usize].short).collect();
                self.row(
                    &Row::new("AMBIGUOUS")
                        .kv("input", name)
                        .kv("matches", names.join(",")),
                );
                return;
            }
        };
        let from = self.kernel.player.at;
        let def = &REGIONS[to as usize];
        if !self.kernel.unlocked(to) {
            let needs = world::secret_of_region(self.kernel.progress());
            self.row(
                &Row::new("LOCKED")
                    .kv("region", def.name)
                    .kv("needs", format!("secret {needs}")),
            );
            return;
        }
        if to == from {
            self.row(
                &Row::new("GO")
                    .kv("from", REGIONS[from as usize].name)
                    .kv("to", def.name)
                    .kv("hops", 0)
                    .kv("stay", 1),
            );
            return;
        }
        let first = (self.kernel.player.visited >> to) & 1 == 0;
        if self.commit(&[Mission::Go(to)]).is_none() {
            return;
        }
        self.row(
            &Row::new("GO")
                .kv("from", REGIONS[from as usize].name)
                .kv("to", def.name)
                .kv("hops", probe::hops(from, to)),
        );
        if first {
            self.story(to as usize + 1);
        }
    }

    fn cmd_probe(&mut self, raw: &str) {
        let region = self.view().map_or(self.kernel.player.at, |(v, _)| v.at);
        let rs = probe::probe_rows(raw, region, &mut self.kernel);
        self.rows(&rs);
    }

    fn cmd_solve(&mut self, answer: &str) {
        if self.refuse_past() {
            return;
        }
        let region = self.kernel.player.at;
        let def = &REGIONS[region as usize];
        let id = def.secret;
        let st = self.kernel.secret_state(id).clone();
        if st.evidence.is_solved() {
            self.row(
                &Row::new("SOLVE")
                    .kv("region", def.name)
                    .kv("already_solved", 1)
                    .kv("evidence", st.evidence.word()),
            );
            return;
        }
        let started = std::time::Instant::now();
        if self.commit(&[Mission::Solve(answer.to_string())]).is_none() {
            return;
        }
        let elapsed = started.elapsed().as_nanos();
        let now = self.kernel.secret_state(id).clone();
        if now.evidence.is_solved() {
            self.row(
                &Row::new("SOLVE")
                    .kv("region", def.name)
                    .kv("match", 1)
                    .kv("evidence", now.evidence.word()),
            );
            let proof = match self.kernel.answer(id) {
                Outcome::Ready(o) => o.rows.clone(),
                _ => Vec::new(),
            };
            self.rows(&proof);
            if self.cfg.timing {
                let mut t = Row::new("TIMING")
                    .kv("subject", format!("secret{id}"))
                    .kv("op", "solve_tick_including_first_kernel_computation")
                    .kv("elapsed_ns", elapsed)
                    .kv("host", "this_process_only");
                if id == 1 {
                    t = t.kv("ns_per_value_at_k13", elapsed / 1_594_323);
                }
                self.row(&t);
            }
            if let Some((v, _)) = self.view() {
                self.rows(&atlas::codex_rows(&v, Some(def.id + 1)));
            }
            if region < 8 {
                self.row(
                    &Row::new("UNLOCKED")
                        .kv("chapter", region + 2)
                        .kv("region", REGIONS[region as usize + 1].name),
                );
            }
        } else {
            // refused, wrong, not measured, or failed: say which, beside the attempt count
            match self.kernel.answer(id) {
                Outcome::NotMeasured { reason, rows } => {
                    let (reason, rows) = (*reason, rows.clone());
                    self.rows(&rows);
                    self.row(
                        &Row::new("SOLVE")
                            .kv("region", def.name)
                            .kv("match", 0)
                            .kv("not_measured", 1)
                            .kv("reason", reason),
                    );
                }
                Outcome::Failed { rows } => {
                    let rows = rows.clone();
                    self.rows(&rows);
                    self.row(
                        &Row::new("SOLVE")
                            .kv("region", def.name)
                            .kv("match", 0)
                            .kv("measured_fail", 1),
                    );
                }
                Outcome::Ready(_) => {
                    self.row(
                        &Row::new("SOLVE")
                            .kv("region", def.name)
                            .kv("match", 0)
                            .kv("attempts", now.attempts),
                    );
                    self.say("not the kernel's number. look for the next hint.");
                }
            }
        }
    }

    fn cmd_codex(&mut self, arg: Option<&str>) {
        let Some((v, _)) = self.view() else {
            return;
        };
        let chapter = match arg {
            None => None,
            Some(a) => match a.parse::<u8>() {
                Ok(n) if n <= 9 => Some(n),
                _ => {
                    self.row(
                        &Row::new("USAGE")
                            .kv("command", "codex")
                            .kv("usage", "codex [0-9]"),
                    );
                    return;
                }
            },
        };
        if let Some(n) = chapter {
            if !atlas::chapter_open(&v, n) {
                self.row(
                    &Row::new("LOCKED")
                        .kv("chapter", n)
                        .kv("needs", "the previous chapter's secret"),
                );
                return;
            }
            self.story(n as usize);
        }
        self.rows(&atlas::codex_rows(&v, chapter));
    }

    fn cmd_timeline(&mut self) {
        if let Some((v, _)) = self.view() {
            self.rows(&atlas::timeline_rows(&v));
        }
    }

    fn cmd_agents(&mut self) {
        if let Some((v, _)) = self.view() {
            self.rows(&atlas::agents_rows(&v));
        }
    }

    fn cmd_wait(&mut self, arg: Option<&str>) {
        if self.refuse_past() {
            return;
        }
        let n: u64 = match arg {
            None => 1,
            Some(a) => match a.parse() {
                Ok(n) if (1..=27).contains(&n) => n,
                _ => {
                    self.row(
                        &Row::new("REFUSED")
                            .kv("reason", "wait_takes_1_to_27")
                            .kv("input", a),
                    );
                    return;
                }
            },
        };
        let mut last: Option<Snapshot> = None;
        for _ in 0..n {
            match self.commit(&[]) {
                Some(s) => {
                    if let Some(t) = s.rows_of("TICK").next() {
                        self.row(t);
                    }
                    last = Some(s);
                }
                None => break,
            }
        }
        if let Some(s) = last {
            if let Some(c) = s.rows.last() {
                self.row(c);
            }
        }
    }

    fn cmd_rewind(&mut self, arg: &str) {
        if arg.eq_ignore_ascii_case("live") {
            self.past = None;
            let r = Row::new("REWIND")
                .kv("view", "live")
                .kv("tick", self.kernel.tick)
                .kv("chain", &self.kernel.head);
            self.row(&r);
            return;
        }
        let k: u64 = match arg.parse() {
            Ok(k) => k,
            Err(_) => {
                self.row(
                    &Row::new("USAGE")
                        .kv("command", "rewind")
                        .kv("usage", "rewind <tick|live>"),
                );
                return;
            }
        };
        if k > self.kernel.tick {
            self.row(
                &Row::new("REFUSED")
                    .kv("reason", "that_tick_has_not_happened")
                    .kv("live_tick", self.kernel.tick),
            );
            return;
        }
        match snapshot::read(&self.ticks_dir(), k) {
            Ok(s) => {
                let r = Row::new("REWIND")
                    .kv("view", k)
                    .kv("chain", &s.this)
                    .kv("verified", 1)
                    .kv("live_tick", self.kernel.tick)
                    .kv("note", "read_not_replayed");
                self.past = Some(s);
                self.row(&r);
            }
            Err(e) => {
                self.row(
                    &Row::new("MEASURED_FAIL")
                        .kv("subject", "rewind")
                        .kv("tick", k)
                        .kv("detail", e),
                );
            }
        }
    }

    fn cmd_branch(&mut self) {
        let Some(past) = self.past.clone() else {
            self.row(
                &Row::new("REFUSED")
                    .kv("reason", "branch_needs_a_past_view")
                    .kv("try", "rewind <tick>"),
            );
            return;
        };
        let k = past.tick;
        let name = fresh_name(&self.cfg.saves, &format!("{}-b{k}", self.session));
        let dir = self.cfg.saves.join(&name);
        let kernel = match Kernel::from_snapshot(&past, self.kernel.inputs().clone()) {
            Ok(k) => k,
            Err(e) => {
                self.row(
                    &Row::new("MEASURED_FAIL")
                        .kv("subject", "branch")
                        .kv("detail", e),
                );
                return;
            }
        };
        if let Err(e) = copy_ticks(&self.ticks_dir(), &dir.join("ticks"), k) {
            self.row(
                &Row::new("MEASURED_FAIL")
                    .kv("subject", "branch_copy")
                    .kv("detail", e),
            );
            return;
        }
        let rows = vec![
            snapshot::header("branch"),
            Row::new("BRANCH")
                .kv("from_session", &self.session)
                .kv("from_tick", k)
                .kv("from_chain", &past.this)
                .kv("session", &name),
        ];
        if let Err(e) = hbp::write_set(&dir, "BRANCH", &rows) {
            self.row(
                &Row::new("MEASURED_FAIL")
                    .kv("subject", "branch_write")
                    .kv("detail", e),
            );
            return;
        }
        let r = Row::new("BRANCH")
            .kv("from_tick", k)
            .kv("from_chain", &past.this)
            .kv("session", &name)
            .kv("note", "beside_the_old_timeline_never_over_it");
        self.kernel = kernel;
        self.session = name;
        self.session_dir = dir;
        self.past = None;
        self.row(&r);
    }

    fn cmd_save(&mut self, name: &str) {
        if self.refuse_past() {
            return;
        }
        if !commands::valid_name(name) {
            self.row(
                &Row::new("REFUSED").kv("reason", "name_must_be_letters_digits_dash_underscore"),
            );
            return;
        }
        let dir = self.cfg.saves.join(name);
        if dir.join("SAVE.hbp").exists() {
            let mine = hbp::read_set(&dir, "SAVE").ok().and_then(|rows| {
                rows.iter()
                    .find(|r| r.tag == "SAVE")
                    .and_then(|r| r.get("session").map(str::to_string))
            });
            if mine.as_deref() != Some(self.session.as_str()) {
                self.row(
                    &Row::new("REFUSED")
                        .kv("reason", "a_save_of_that_name_belongs_to_another_session")
                        .kv("name", name),
                );
                return;
            }
        }
        if self.commit(&[Mission::Bridge]).is_none() {
            return;
        }
        let t = self.kernel.tick;
        let ticks = self.ticks_dir();
        let head_file = ticks.join(format!("{}.hbp", snapshot::stem(t)));
        let head_sha = match fs::read(&head_file) {
            Ok(b) => sha256::sha256_hex(&b),
            Err(e) => {
                self.row(
                    &Row::new("MEASURED_FAIL")
                        .kv("subject", "save")
                        .kv("detail", e),
                );
                return;
            }
        };
        let mut rows = vec![
            snapshot::header("save"),
            Row::new("SAVE")
                .kv("name", name)
                .kv("session", &self.session)
                .kv("tick", t)
                .kv("chain", &self.kernel.head)
                .kv("genesis", &self.kernel.genesis)
                .kv("seed", self.kernel.seed),
            Row::new("SNAPSHOT")
                .kv("path", format!("ticks/{}.hbp", snapshot::stem(t)))
                .kv("sha256", head_sha),
        ];
        for k in 0..=t {
            match snapshot::read(&ticks, k) {
                Ok(s) => rows.push(Row::new("INDEX").kv("tick", k).kv("chain", s.this)),
                Err(e) => {
                    self.row(
                        &Row::new("MEASURED_FAIL")
                            .kv("subject", "save")
                            .kv("tick", k)
                            .kv("detail", e),
                    );
                    return;
                }
            }
        }
        if let Err(e) = copy_ticks(&ticks, &dir.join("ticks"), t)
            .and_then(|()| hbp::write_set(&dir, "SAVE", &rows))
        {
            self.row(
                &Row::new("MEASURED_FAIL")
                    .kv("subject", "save_write")
                    .kv("detail", e),
            );
            return;
        }
        let r = Row::new("SAVE")
            .kv("name", name)
            .kv("tick", t)
            .kv("chain", &self.kernel.head)
            .kv(
                "files",
                "SAVE.hbp,SAVE.hbi,SAVE.hbp.sha256,SAVE.hbi.sha256,ticks/",
            );
        self.row(&r);
    }

    /// Verify a save from tick 0: its own sidecars and HBI, the head snapshot, every INDEX row
    /// against the stored snapshot it names, and the links between them.
    fn read_save(&self, name: &str) -> Result<(Snapshot, PathBuf), String> {
        let dir = self.cfg.saves.join(name);
        let rows = hbp::read_set(&dir, "SAVE").map_err(|e| format!("SAVE: {e}"))?;
        let save = rows.iter().find(|r| r.tag == "SAVE").ok_or("no SAVE row")?;
        let tick = save.get_u64("tick").ok_or("SAVE: no tick")?;
        let chain = save.get("chain").ok_or("SAVE: no chain")?.to_string();
        let ticks = dir.join("ticks");
        let snap_row = rows
            .iter()
            .find(|r| r.tag == "SNAPSHOT")
            .ok_or("no SNAPSHOT row")?;
        let rel = snap_row.get("path").ok_or("SNAPSHOT: no path")?;
        let bytes = fs::read(dir.join(rel)).map_err(|e| format!("MISSING_TICK {rel}: {e}"))?;
        if snap_row.get("sha256") != Some(sha256::sha256_hex(&bytes).as_str()) {
            return Err(format!("SNAPSHOT {rel}: sha256 does not match the file"));
        }
        let head = snapshot::read(&ticks, tick)?;
        if head.this != chain {
            return Err(format!(
                "head snapshot chain {} but the save says {chain}",
                head.this
            ));
        }
        let index: Vec<&Row> = rows.iter().filter(|r| r.tag == "INDEX").collect();
        if index.len() as u64 != tick + 1 {
            return Err(format!(
                "INDEX has {} rows but the save is at tick {tick}",
                index.len()
            ));
        }
        for (k, r) in index.iter().enumerate() {
            let s = snapshot::read(&ticks, k as u64).map_err(|e| format!("tick {k}: {e}"))?;
            if r.get_u64("tick") != Some(k as u64) || r.get("chain") != Some(s.this.as_str()) {
                return Err(format!("INDEX row {k} does not match the stored snapshot"));
            }
        }
        snapshot::verify_chain(&ticks, tick)?;
        Ok((head, ticks))
    }

    fn cmd_load(&mut self, name: &str) {
        if !commands::valid_name(name) {
            self.row(
                &Row::new("REFUSED").kv("reason", "name_must_be_letters_digits_dash_underscore"),
            );
            return;
        }
        let (head, src_ticks) = match self.read_save(name) {
            Ok(x) => x,
            Err(e) => {
                self.row(
                    &Row::new("MEASURED_FAIL")
                        .kv("subject", "load")
                        .kv("name", name)
                        .kv("detail", e),
                );
                return;
            }
        };
        let kernel = match Kernel::from_snapshot(&head, self.kernel.inputs().clone()) {
            Ok(k) => k,
            Err(e) => {
                self.row(
                    &Row::new("MEASURED_FAIL")
                        .kv("subject", "load")
                        .kv("name", name)
                        .kv("detail", e),
                );
                return;
            }
        };
        let t = head.tick;
        let session = fresh_name(&self.cfg.saves, &format!("{name}-l{t}"));
        let dir = self.cfg.saves.join(&session);
        if let Err(e) = copy_ticks(&src_ticks, &dir.join("ticks"), t) {
            self.row(
                &Row::new("MEASURED_FAIL")
                    .kv("subject", "load_copy")
                    .kv("detail", e),
            );
            return;
        }
        let marker = vec![
            snapshot::header("load"),
            Row::new("LOAD")
                .kv("name", name)
                .kv("from_tick", t)
                .kv("from_chain", &head.this)
                .kv("session", &session),
        ];
        if let Err(e) = hbp::write_set(&dir, "LOAD", &marker) {
            self.row(
                &Row::new("MEASURED_FAIL")
                    .kv("subject", "load_write")
                    .kv("detail", e),
            );
            return;
        }
        self.kernel = kernel;
        self.session = session;
        self.session_dir = dir;
        self.past = None;
        self.row(
            &Row::new("LOAD")
                .kv("name", name)
                .kv("tick", t)
                .kv("chain_verified_depth", t),
        );
    }

    fn cmd_verify(&mut self, path: Option<&str>) {
        let ticks = self.ticks_dir();
        let rep = evidence::verify_session(&mut self.kernel, &ticks);
        self.rows(&rep.rows);
        self.last_verify = rep.verdict_word().to_string();
        if rep.fail > 0 {
            self.verify_failed = true;
        }
        if let Some(p) = path {
            self.compare_other(p);
            return;
        }
        if self.past.is_some() {
            self.say("viewing the past: promotion and the seal need the live head (rewind live)");
            return;
        }
        let mut final_rep = rep;
        if !final_rep.promote.is_empty() {
            let ids = final_rep.promote.clone();
            if self.commit(&[Mission::Verified(ids.clone())]).is_none() {
                return;
            }
            let list = ids.iter().map(u8::to_string).collect::<Vec<_>>().join(",");
            self.row(
                &Row::new("PROMOTE")
                    .kv("secrets", list)
                    .kv("evidence", "VERIFIER_RECEIVED")
                    .kv("promotion", "BLOCKED"),
            );
            final_rep = evidence::verify_session(&mut self.kernel, &ticks);
            if final_rep.fail > 0 {
                self.verify_failed = true;
            }
        }
        if evidence::may_seal(&self.kernel, &final_rep).is_ok() {
            self.seal();
        }
    }

    fn compare_other(&mut self, path: &str) {
        let p = Path::new(path);
        let (Some(dir), Some(file)) = (p.parent(), p.file_name().and_then(|f| f.to_str())) else {
            self.row(
                &Row::new("MEASURED_FAIL")
                    .kv("subject", "other_seal")
                    .kv("detail", "bad path"),
            );
            return;
        };
        let stem = file.strip_suffix(".hbp").unwrap_or(file);
        let dir = if dir.as_os_str().is_empty() {
            Path::new(".")
        } else {
            dir
        };
        let rows = match hbp::read_set(dir, stem) {
            Ok(r) => r,
            Err(hbp::SetError::Missing(m)) => {
                // a file that is not there is not a seal that failed: nothing was measured
                self.row(
                    &Row::new("VERIFY")
                        .kv("subject", "other_seal")
                        .kv("reason", "NO_INPUT")
                        .kv("detail", m)
                        .kv("verdict", "NOT_MEASURED"),
                );
                return;
            }
            Err(e) => {
                self.verify_failed = true;
                self.row(
                    &Row::new("MEASURED_FAIL")
                        .kv("subject", "other_seal")
                        .kv("detail", e.to_string()),
                );
                return;
            }
        };
        if let Err(e) = snapshot::check_sealed_rows(&rows) {
            self.verify_failed = true;
            self.row(
                &Row::new("MEASURED_FAIL")
                    .kv("subject", "other_seal_chain")
                    .kv("detail", e),
            );
            return;
        }
        let ticks = self.ticks_dir();
        let cmp = evidence::compare_seal(
            &self.kernel,
            &ticks,
            &rows,
            &self.script_sha256,
            &self.cfg.seat,
        );
        self.rows(&cmp.rows);
        if !cmp.reproduced {
            self.verify_failed = true;
            self.last_verify = "MEASURED_FAIL".to_string();
        } else if !cmp.independent {
            // the same seat matched itself: a reproduction, not a failure and not independent. It
            // never promotes; the verdict row said NOT_MEASURED with the reason.
            self.last_verify = "NOT_MEASURED".to_string();
            self.row(
                &Row::new("REPRODUCED")
                    .kv("matched", cmp.matched.len())
                    .kv("independent", 0)
                    .kv("evidence", "unchanged")
                    .kv("needs", "a_seal_from_another_seat"),
            );
        }
        if cmp.independent && !cmp.matched.is_empty() && self.past.is_none() {
            let ids = cmp.matched.clone();
            if self.commit(&[Mission::Independent(ids)]).is_some() {
                self.row(
                    &Row::new("PROMOTE")
                        .kv("evidence", "INDEPENDENTLY_VERIFIED")
                        .kv("promotion", "BLOCKED"),
                );
            }
        }
    }

    fn seal(&mut self) {
        let dir = self.session_dir.clone();
        if let Ok(rows) = hbp::read_set(&dir, "FINAL-SEAL") {
            // never overwrite a record: a seal that exists stands
            if let Some(chain) = rows.last() {
                let r = Row::new("SEAL")
                    .kv("already", 1)
                    .kv("this", chain.get("this").unwrap_or("none"))
                    .kv("file", "FINAL-SEAL.hbp");
                self.row(&r);
            }
            return;
        }
        let seat = self.cfg.seat.clone();
        let script = self.script_sha256.clone();
        let session = self.session_id.clone();
        let rows = evidence::build_seal(&mut self.kernel, &session, &seat, &script);
        if let Err(e) = hbp::write_set(&dir, "FINAL-SEAL", &rows) {
            self.row(
                &Row::new("MEASURED_FAIL")
                    .kv("subject", "seal_write")
                    .kv("detail", e),
            );
            return;
        }
        let this = rows
            .last()
            .and_then(|c| c.get("this"))
            .unwrap_or("none")
            .to_string();
        let file_sha = sha256::sha256_hex(&hbp::file_bytes(&rows));
        if let Some(s) = rows.iter().find(|r| r.tag == "SEAL") {
            self.row(s);
        }
        // what the seal rests on, counted from the kernel and not written down: how many secrets are
        // solved, how many were recomputed over their full scope, and what secret 8 was measured on
        let solved = self.kernel.solved_count();
        let mut full = 0usize;
        let mut secret8_scope = "none";
        for id in 1..=secrets::SECRET_COUNT as u8 {
            if let Outcome::Ready(o) = self.kernel.answer(id) {
                if o.scope == "full" {
                    full += 1;
                }
                if id == 8 {
                    secret8_scope = o.scope;
                }
            }
        }
        self.row(
            &Row::new("SEALED")
                .kv("file", "FINAL-SEAL.hbp")
                .kv("sha256", file_sha)
                .kv("secrets_solved", solved)
                .kv("recomputed_full_scope", full)
                .kv("secret8_scope", secret8_scope)
                .kv(
                    "enwik8",
                    if secret8_scope == "full" {
                        "MEASURED"
                    } else {
                        "NOT_MEASURED"
                    },
                )
                .kv("xz_share", "CITED_NAMED_not_recomputed")
                .kv("promotion", "BLOCKED")
                .kv("omega_6_0", "NAMED_not_promoted"),
        );
        if !self.cfg.no_story {
            for l in story::ENDING.lines() {
                self.say(l);
            }
        }
        let tick = self.kernel.tick;
        let chain = self.kernel.head.clone();
        self.row(
            &Row::new("FINALSEAL")
                .kv("this", &this)
                .kv("chain", chain)
                .kv("tick", tick),
        );
        self.say(&this);
    }

    fn cmd_quit(&mut self) {
        // `--also-verify <seal>`: before leaving, check another machine's seal against this run
        if let Some(p) = self.cfg.also_verify.take() {
            let shown = p.display().to_string();
            self.cmd_verify(Some(&shown));
        }
        let r = Row::new("QUIT")
            .kv("tick", self.kernel.tick)
            .kv("chain", &self.kernel.head);
        self.row(&r);
        self.quit = true;
    }
}

/// Run a whole session. Returns the exit code: 0 normal; 2 bad flag; 3 self-test failed;
/// 4 a `verify` in a script failed; 5 the disk could not be written.
pub fn run(cfg: Config, stdin: &mut dyn BufRead, out: &mut dyn Write) -> i32 {
    if !sha256::selftest() {
        let _ = writeln!(
            out,
            "{}",
            Row::new("SELFTEST")
                .kv("sha256", "FAIL")
                .kv("vectors", 3)
                .line()
        );
        return 3;
    }
    let _ = writeln!(
        out,
        "{}",
        Row::new("SELFTEST")
            .kv("sha256", "OK")
            .kv("vectors", 3)
            .line()
    );
    let script_path = cfg.script.clone();
    let (script, sha) = match &script_path {
        Some(p) => match script::load(p) {
            Ok(s) => (Some(s.lines), Some(s.sha256)),
            Err(e) => {
                let _ = writeln!(
                    out,
                    "{}",
                    Row::new("REFUSED")
                        .kv("reason", "cannot_read_script")
                        .kv("detail", e)
                        .line()
                );
                return 2;
            }
        },
        None => (None, None),
    };
    let prompt = cfg.prompt;
    let mut game = match Game::new(cfg, sha, out) {
        Ok(g) => g,
        Err(code) => return code,
    };
    game.banner();
    match script {
        Some(lines) => game.run_lines(&mut lines.into_iter(), true),
        None => {
            let mut it = stdin.lines().map_while(Result::ok);
            if prompt {
                let mut with_prompt = std::iter::from_fn(|| {
                    print!("> ");
                    let _ = std::io::stdout().flush();
                    it.next()
                });
                game.run_lines(&mut with_prompt, false);
            } else {
                game.run_lines(&mut it, false);
            }
        }
    }
    if game.io_failed {
        5
    } else if game.verify_failed && script_path.is_some() {
        4
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(v: &[&str]) -> Vec<String> {
        v.iter().map(|s| (*s).to_string()).collect()
    }

    #[test]
    fn enwik8_needs_the_right_size_and_the_right_hash_not_just_the_size() {
        // the same census code the game runs, on bytes small enough to test; the sha256 of "abc" is
        // a known answer, so the prefix below is not taken from the code under test
        let c = secrets::census_bytes(b"abc");
        assert!(c.sha256.starts_with("ba7816bf"));
        assert!(enwik8_identity(&c, 3, "ba7816bf").is_ok());
        // right size, wrong hash: refused, and the note carries the hash that was seen
        let err = enwik8_identity(&c, 3, sources::GENUINE_ENWIK8_SHA256).unwrap_err();
        assert!(err.contains("ba7816bf8f01cfea"), "{err}");
        assert!(
            err.contains("2b49720ec4d78c3c") && err.contains("MEASURED"),
            "{err}"
        );
        assert!(err.contains("not the genuine enwik8"), "{err}");
        // right hash prefix, wrong size: refused
        let err2 = enwik8_identity(&c, 4, "ba7816bf").unwrap_err();
        assert!(err2.contains("3 bytes") && err2.contains("not 4"), "{err2}");
        // the note must not break an HBP row: no pipe, no equals sign
        assert!(!err.contains('|') && !err.contains('='));
        // the constant is the full 64-hex sha256 measured on two seats, lower case
        assert_eq!(sources::GENUINE_ENWIK8_SHA256.len(), 64);
        assert!(sources::GENUINE_ENWIK8_SHA256
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)));
    }

    #[test]
    fn flags_parse_and_defaults_are_the_designs() {
        let c = parse_args(&[]).unwrap();
        assert_eq!(c.seed, 20_260_801);
        assert_eq!(c.cols, 80);
        assert_eq!(c.max_ticks, 19_683);
        assert_eq!(c.saves, PathBuf::from("saves"));
        assert_eq!(c.data, PathBuf::from("data"));
        assert_eq!(
            c.mythos,
            PathBuf::from("../MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf")
        );
        assert_eq!(c.seat, "unknown");
        assert!(!c.no_story && !c.strict_enwik8 && c.script.is_none());
        let c = parse_args(&args(&[
            "--seed",
            "7",
            "--cols",
            "40",
            "--saves",
            "x",
            "--data",
            "d",
            "--mythos",
            "m",
            "--seat",
            "ACER-1",
            "--max-ticks",
            "9",
            "--script",
            "s.aether",
            "--session",
            "ses",
            "--no-story",
            "--strict-enwik8",
            "--timing",
        ]))
        .unwrap();
        assert_eq!((c.seed, c.cols, c.max_ticks), (7, 40, 9));
        assert_eq!(c.seat, "ACER-1");
        assert_eq!(c.script, Some(PathBuf::from("s.aether")));
        assert_eq!(c.session.as_deref(), Some("ses"));
        assert!(c.no_story && c.strict_enwik8 && c.timing);
    }

    #[test]
    fn bad_flags_are_refused_with_a_message() {
        for bad in [
            vec!["--nope"],
            vec!["--seed"],
            vec!["--seed", "x"],
            vec!["--cols", "-1"],
            vec!["--seat", "a b"],
            vec!["--session", "../x"],
        ] {
            assert!(parse_args(&args(&bad)).is_err(), "{bad:?}");
        }
        assert_eq!(parse_args(&args(&["--help"])).unwrap_err(), "help");
    }

    #[test]
    fn fresh_names_never_collide_and_never_delete() {
        let d = std::env::temp_dir().join(format!("aether-universe-fresh-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(d.join("a")).unwrap();
        fs::create_dir_all(d.join("a-2")).unwrap();
        assert_eq!(fresh_name(&d, "a"), "a-3");
        assert_eq!(fresh_name(&d, "b"), "b");
        assert!(d.join("a").exists() && d.join("a-2").exists());
        let _ = fs::remove_dir_all(&d);
    }
}
