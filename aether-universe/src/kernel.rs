//! The Kernel: the only state authority.
//!
//! It owns the nine regions, the 27 agents, the player, the nine secrets and the tick counter, and
//! only [`Kernel::tick`] changes any of it, in the fixed order below. It does no I/O: the console
//! reads files and hands the bytes in as [`Inputs`], and writes the [`Snapshot`] that `tick` returns.
//!
//! The tick order is part of the determinism contract (a golden test pins its result):
//!
//! 1. `t = tick + 1`.
//! 2. Weather from `t` alone: `t mod 27` as three balanced trits (wind, fog, light) and a phase.
//! 3. Rivers: every edge sends `energy[from] / 27`; all sends are computed first, then applied.
//!    The remainder stays where it was: remainders are carried, never dropped.
//! 4. Sources, then clamp every energy to `0..=100`.
//! 5. Missions, in the order given.
//! 6. All 27 agents step once, in id order.
//! 7. Risk. 8. Coherence. 9. Population. 10. Alerts. 11. Seal the snapshot and chain it.
//!
//! Everything is integer. There are no timers: the tick advances only when told to.

use crate::agents::{self, Agent, HIGH_RISK};
use crate::hbp::Row;
use crate::secrets::{self, Inputs, Outcome, SECRET_COUNT};
use crate::snapshot::{self, Snapshot};
use crate::trits;
use crate::world::{self, Fields, NAG, NREG};

/// How far a secret has travelled from sealed to verified (the Omega 5.2 evidence states).
/// `PROMOTED` has no variant on purpose: the game never sets it.
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub enum Evidence {
    Sealed,
    LocalMeasured,
    BridgePublished,
    VerifierReceived,
    IndependentlyVerified,
}

impl Evidence {
    pub const ALL: [Evidence; 5] = [
        Evidence::Sealed,
        Evidence::LocalMeasured,
        Evidence::BridgePublished,
        Evidence::VerifierReceived,
        Evidence::IndependentlyVerified,
    ];

    pub fn word(self) -> &'static str {
        match self {
            Evidence::Sealed => "SEALED",
            Evidence::LocalMeasured => "LOCAL_MEASURED",
            Evidence::BridgePublished => "BRIDGE_PUBLISHED",
            Evidence::VerifierReceived => "VERIFIER_RECEIVED",
            Evidence::IndependentlyVerified => "INDEPENDENTLY_VERIFIED",
        }
    }

    /// The letter the Atlas draws. Nothing is drawn green.
    pub fn letter(self) -> char {
        match self {
            Evidence::Sealed => '?',
            Evidence::LocalMeasured => 'm',
            Evidence::BridgePublished => 'b',
            Evidence::VerifierReceived => 'v',
            Evidence::IndependentlyVerified => 'V',
        }
    }

    pub fn from_word(s: &str) -> Option<Evidence> {
        Evidence::ALL.iter().copied().find(|e| e.word() == s)
    }

    pub fn is_solved(self) -> bool {
        self >= Evidence::LocalMeasured
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SecretState {
    pub evidence: Evidence,
    pub answer_sha16: Option<String>,
    pub solved_tick: Option<u64>,
    pub attempts: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Player {
    pub at: u8,
    pub attempts: u32,
    /// Bit `r` set once the player has entered region `r`.
    pub visited: u16,
}

/// What the console asks the kernel to do inside a tick.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Mission {
    Go(u8),
    Solve(String),
    /// A `save` wrote the snapshot: `LOCAL_MEASURED` becomes `BRIDGE_PUBLISHED`.
    Bridge,
    /// `verify` recomputed these secrets and they matched: `BRIDGE_PUBLISHED` becomes `VERIFIER_RECEIVED`.
    Verified(Vec<u8>),
    /// Another machine's seal matched these secrets.
    Independent(Vec<u8>),
}

/// Weather from the tick alone.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Weather {
    /// 0 dawn, 1 day, 2 night.
    pub phase: u8,
    pub wind: i8,
    pub fog: i8,
    pub light: i8,
}

pub fn phase_name(phase: u8) -> &'static str {
    match phase {
        0 => "dawn",
        1 => "day",
        _ => "night",
    }
}

/// `t mod 27` as three balanced trits, least significant first. The residue is centred on the ground
/// point first (`c - 27` when `c > 13`): three trits hold 27 states but reach only -13..13, so an
/// uncentred 14..26 would not fit. Every 27 ticks the sky repeats: 27 = 3^3, the cube.
pub fn weather(t: u64) -> Weather {
    let c = (t % 27) as i64;
    let centred = if c > 13 { c - 27 } else { c };
    let w = trits::bal3_width(i128::from(centred), 3)
        .expect("a centred residue mod 27 fits three trits");
    Weather {
        phase: (c / 9) as u8,
        wind: w[0],
        fog: w[1],
        light: w[2],
    }
}

/// Step 3: rivers. Every edge sends `energy[from] / 27`, all sends computed before any is applied,
/// so the result does not depend on edge order. The remainder stays in `from`.
pub fn flow(fields: &mut [Fields; NREG]) {
    let sends: Vec<(usize, usize, u32)> = world::RIVERS
        .iter()
        .map(|e| {
            (
                e.from as usize,
                e.to as usize,
                fields[e.from as usize].energy / 27,
            )
        })
        .collect();
    for (from, to, amount) in sends {
        fields[from].energy -= amount;
        fields[to].energy += amount;
    }
}

pub struct Kernel {
    pub seed: u64,
    pub tick: u64,
    /// `sha16` of the `--script` file, or `none`.
    pub script: String,
    pub fields: [Fields; NREG],
    pub agents: Vec<Agent>,
    pub player: Player,
    pub secrets: Vec<SecretState>,
    /// The MISSION rows of the last tick (the player's applied commands; never an answer's text).
    pub last_missions: Vec<Row>,
    /// `tick[k-1]` and `tick[k]`.
    pub prev_head: String,
    pub head: String,
    pub genesis: String,
    inputs: Inputs,
    cache: Vec<Option<Outcome>>,
}

fn clamp100(v: i32) -> u32 {
    v.clamp(0, 100) as u32
}

impl Kernel {
    /// The genesis kernel: tick 0, nothing solved, three agents home in each region.
    pub fn new(seed: u64, script: Option<&str>, inputs: Inputs) -> Kernel {
        let genesis = snapshot::genesis_hash(seed);
        let mut k = Kernel {
            seed,
            tick: 0,
            script: script.unwrap_or("none").to_string(),
            fields: world::initial_fields(),
            agents: agents::genesis(seed),
            player: Player {
                at: 0,
                attempts: 0,
                visited: 1,
            },
            secrets: (0..SECRET_COUNT)
                .map(|_| SecretState {
                    evidence: Evidence::Sealed,
                    answer_sha16: None,
                    solved_tick: None,
                    attempts: 0,
                })
                .collect(),
            last_missions: Vec::new(),
            // tick 0 chains onto the genesis hash like every tick chains onto the one before it
            prev_head: genesis.clone(),
            head: genesis.clone(),
            genesis,
            inputs,
            cache: (0..SECRET_COUNT).map(|_| None).collect(),
        };
        // tick[0] = sha16(genesis | state0): the head of a fresh kernel binds tick 0's own state
        k.head = k.snapshot().this;
        k
    }

    pub fn inputs(&self) -> &Inputs {
        &self.inputs
    }

    /// The kernel's own computation of a secret, computed on first use and kept.
    pub fn answer(&mut self, id: u8) -> &Outcome {
        let i = (id - 1) as usize;
        if self.cache[i].is_none() {
            self.cache[i] = Some(secrets::compute_memo(id, self.seed, &self.inputs));
        }
        self.cache[i].as_ref().expect("just filled")
    }

    pub fn secret_state(&self, id: u8) -> &SecretState {
        &self.secrets[(id - 1) as usize]
    }

    pub fn region_evidence(&self, r: u8) -> Evidence {
        self.secret_state(world::secret_of_region(r)).evidence
    }

    /// How many chapters, counted from the first, are solved without a gap.
    pub fn progress(&self) -> u8 {
        let mut n = 0;
        for r in 0..NREG as u8 {
            if self.region_evidence(r).is_solved() {
                n += 1;
            } else {
                break;
            }
        }
        n
    }

    /// The chapter the player is on: one past the solved run, at most nine.
    pub fn chapter(&self) -> u8 {
        (self.progress() + 1).min(9)
    }

    /// A chapter opens when the one before it is solved.
    pub fn unlocked(&self, r: u8) -> bool {
        r <= self.progress()
    }

    pub fn solved_count(&self) -> usize {
        self.secrets
            .iter()
            .filter(|s| s.evidence.is_solved())
            .count()
    }

    pub fn all_solved(&self) -> bool {
        self.solved_count() == SECRET_COUNT
    }

    fn mission_row(kind: &str, region: u8) -> Row {
        Row::new("MISSION").kv("kind", kind).kv("region", region)
    }

    fn apply(&mut self, m: &Mission, t: u64, rows: &mut Vec<Row>) {
        match m {
            Mission::Go(to) => {
                let to = *to;
                if (to as usize) < NREG && self.unlocked(to) {
                    self.player.at = to;
                    self.player.visited |= 1 << to;
                    rows.push(Self::mission_row("go", to).kv("match", 1));
                } else {
                    rows.push(
                        Self::mission_row("go", to)
                            .kv("match", 0)
                            .kv("reason", "locked"),
                    );
                }
            }
            Mission::Solve(token) => {
                let region = self.player.at;
                let id = world::secret_of_region(region);
                if self.secret_state(id).evidence.is_solved() {
                    rows.push(
                        Self::mission_row("solve", region)
                            .kv("match", 1)
                            .kv("already", 1),
                    );
                    return;
                }
                enum Verdict {
                    Match(String),
                    Wrong,
                    NotMeasured(&'static str),
                    Failed,
                }
                let verdict = match self.answer(id) {
                    Outcome::Ready(out) if out.matches(token) => Verdict::Match(out.answer_sha16()),
                    Outcome::Ready(_) => Verdict::Wrong,
                    Outcome::NotMeasured { reason, .. } => Verdict::NotMeasured(reason),
                    Outcome::Failed { .. } => Verdict::Failed,
                };
                let s = &mut self.secrets[(id - 1) as usize];
                match verdict {
                    Verdict::Match(sha) => {
                        s.evidence = Evidence::LocalMeasured;
                        s.answer_sha16 = Some(sha);
                        s.solved_tick = Some(t);
                        rows.push(Self::mission_row("solve", region).kv("match", 1));
                    }
                    Verdict::Wrong => {
                        s.attempts += 1;
                        self.player.attempts += 1;
                        rows.push(Self::mission_row("solve", region).kv("match", 0));
                    }
                    Verdict::NotMeasured(reason) => {
                        rows.push(
                            Self::mission_row("solve", region)
                                .kv("match", 0)
                                .kv("not_measured", 1)
                                .kv("reason", reason),
                        );
                    }
                    Verdict::Failed => {
                        rows.push(
                            Self::mission_row("solve", region)
                                .kv("match", 0)
                                .kv("measured_fail", 1),
                        );
                    }
                }
            }
            Mission::Bridge => {
                let mut n = 0;
                for s in self.secrets.iter_mut() {
                    if s.evidence == Evidence::LocalMeasured {
                        s.evidence = Evidence::BridgePublished;
                        n += 1;
                    }
                }
                rows.push(Row::new("MISSION").kv("kind", "bridge").kv("n", n));
            }
            Mission::Verified(ids) => {
                let mut n = 0;
                for id in ids {
                    if let Some(s) = self.secrets.get_mut((*id as usize).wrapping_sub(1)) {
                        if s.evidence == Evidence::BridgePublished {
                            s.evidence = Evidence::VerifierReceived;
                            n += 1;
                        }
                    }
                }
                rows.push(Row::new("MISSION").kv("kind", "verified").kv("n", n));
            }
            Mission::Independent(ids) => {
                let mut n = 0;
                for id in ids {
                    if let Some(s) = self.secrets.get_mut((*id as usize).wrapping_sub(1)) {
                        if s.evidence.is_solved() && s.evidence != Evidence::IndependentlyVerified {
                            s.evidence = Evidence::IndependentlyVerified;
                            n += 1;
                        }
                    }
                }
                rows.push(Row::new("MISSION").kv("kind", "independent").kv("n", n));
            }
        }
    }

    /// Advance one tick with the given missions and return the sealed snapshot.
    pub fn tick(&mut self, missions: &[Mission]) -> Snapshot {
        let t = self.tick + 1;
        let w = weather(t);
        // 3. rivers
        flow(&mut self.fields);
        // 4. sources, then clamp
        self.fields[1].energy += 3;
        self.fields[5].energy += 1;
        if self.all_solved() {
            self.fields[8].energy += 1;
        }
        for f in self.fields.iter_mut() {
            f.energy = f.energy.min(100);
        }
        // 5. missions
        let mut rows = Vec::new();
        for m in missions {
            self.apply(m, t, &mut rows);
        }
        // 6. agents, in id order
        for a in self.agents.iter_mut() {
            a.step(t, self.seed, &mut self.fields);
        }
        // 7. risk
        let day = i32::from(w.phase == 1);
        for (r, f) in self.fields.iter_mut().enumerate() {
            let rupture_wind = i32::from(r == 4 && w.wind == 1);
            f.risk = clamp100(f.risk as i32 + i32::from(w.fog) + rupture_wind - day);
        }
        // 8. coherence
        let solved: Vec<i32> = (0..NREG as u8)
            .map(|r| i32::from(self.region_evidence(r).is_solved()))
            .collect();
        for (f, s) in self.fields.iter_mut().zip(solved) {
            let high = i32::from(f.risk >= HIGH_RISK);
            f.coherence = clamp100(f.coherence as i32 + s - high);
        }
        // 9. population
        for (r, f) in self.fields.iter_mut().enumerate() {
            f.population = self.agents.iter().filter(|a| a.at as usize == r).count() as u32;
        }
        // 10. alerts are derived from the fields when the rows are built
        // 11. seal
        self.tick = t;
        self.last_missions = rows;
        self.prev_head = self.head.clone();
        let snap = self.snapshot();
        self.head = snap.this.clone();
        snap
    }

    /// The rows of the current state (without the chain row), exactly as they are sealed.
    fn body(&self) -> Vec<Row> {
        let w = weather(self.tick);
        let mut rows = vec![snapshot::header("snapshot")];
        rows.push(
            Row::new("TICK")
                .kv("t", self.tick)
                .kv("seed", self.seed)
                .kv("phase", phase_name(w.phase))
                .kv("wind", w.wind)
                .kv("fog", w.fog)
                .kv("light", w.light)
                .kv("script", &self.script),
        );
        for (r, def) in world::REGIONS.iter().enumerate() {
            let f = &self.fields[r];
            rows.push(
                Row::new("REGION")
                    .kv("id", def.id)
                    .kv("name", def.name)
                    .kv("x", def.pos.0)
                    .kv("y", def.pos.1)
                    .kv("z", def.pos.2)
                    .kv("coherence", f.coherence)
                    .kv("energy", f.energy)
                    .kv("population", f.population)
                    .kv("risk", f.risk)
                    .kv("secret", def.secret)
                    .kv("evidence", self.region_evidence(def.id).word())
                    .kv("unlocked", u8::from(self.unlocked(def.id))),
            );
        }
        for a in &self.agents {
            rows.push(a.row());
        }
        rows.push(
            Row::new("PLAYER")
                .kv("at", self.player.at)
                .kv("chapter", self.chapter())
                .kv("solved", self.solved_count())
                .kv("attempts", self.player.attempts)
                .kv("visited", self.player.visited)
                .kv("view", "live"),
        );
        for id in 1..=SECRET_COUNT as u8 {
            let s = self.secret_state(id);
            rows.push(
                Row::new("SECRET")
                    .kv("id", id)
                    .kv("region", world::region_of_secret(id).unwrap_or(0))
                    .kv("evidence", s.evidence.word())
                    .kv("answer_sha16", s.answer_sha16.as_deref().unwrap_or("none"))
                    .kv(
                        "solved_tick",
                        s.solved_tick
                            .map_or_else(|| "none".to_string(), |t| t.to_string()),
                    )
                    .kv("attempts", s.attempts),
            );
        }
        for (r, f) in self.fields.iter().enumerate() {
            if f.risk >= HIGH_RISK {
                rows.push(
                    Row::new("ALERT")
                        .kv("kind", "risk")
                        .kv("region", r)
                        .kv("value", f.risk),
                );
            }
            if f.coherence <= 20 {
                rows.push(
                    Row::new("ALERT")
                        .kv("kind", "coherence")
                        .kv("region", r)
                        .kv("value", f.coherence),
                );
            }
        }
        rows.extend(self.last_missions.iter().cloned());
        rows
    }

    /// The sealed snapshot of the current state, chained onto `prev_head`.
    pub fn snapshot(&self) -> Snapshot {
        Snapshot::seal(self.tick, self.seed, &self.prev_head, self.body())
    }

    /// Rebuild the live kernel from a sealed snapshot (used by `load` and `branch`). Every piece of
    /// state is carried in a row; the rebuild is checked by re-sealing it and comparing byte for byte.
    pub fn from_snapshot(s: &Snapshot, inputs: Inputs) -> Result<Kernel, String> {
        let tick_row = s.rows_of("TICK").next().ok_or("no TICK row")?;
        let seed = tick_row.get_u64("seed").ok_or("TICK: no seed")?;
        let script = tick_row.get("script").ok_or("TICK: no script")?.to_string();
        let mut k = Kernel::new(seed, None, inputs);
        k.script = script;
        k.tick = tick_row.get_u64("t").ok_or("TICK: no t")?;

        let regions: Vec<&Row> = s.rows_of("REGION").collect();
        if regions.len() != NREG {
            return Err(format!(
                "expected {NREG} REGION rows, found {}",
                regions.len()
            ));
        }
        for (i, r) in regions.iter().enumerate() {
            if r.get_u64("id") != Some(i as u64) {
                return Err(format!("REGION row {i} out of order"));
            }
            let get = |key: &str| -> Result<u32, String> {
                r.get_u64(key)
                    .filter(|v| *v <= 100)
                    .map(|v| v as u32)
                    .ok_or_else(|| format!("REGION {i}: bad {key}"))
            };
            k.fields[i] = Fields {
                coherence: get("coherence")?,
                energy: get("energy")?,
                population: get("population")?,
                risk: get("risk")?,
            };
        }
        let agent_rows: Vec<&Row> = s.rows_of("AGENT").collect();
        // (population is derived: it is checked against the agents once they are read, below)
        if agent_rows.len() != NAG {
            return Err(format!(
                "expected {NAG} AGENT rows, found {}",
                agent_rows.len()
            ));
        }
        k.agents.clear();
        for (i, r) in agent_rows.iter().enumerate() {
            let a = Agent::from_row(r)?;
            if a.id as usize != i {
                return Err(format!("AGENT row {i} out of order"));
            }
            k.agents.push(a);
        }
        for (r, f) in k.fields.iter().enumerate() {
            let here = k.agents.iter().filter(|a| a.at as usize == r).count() as u32;
            if f.population != here {
                return Err(format!(
                    "REGION {r}: population {} but {here} agents stand there",
                    f.population
                ));
            }
        }
        let p = s.rows_of("PLAYER").next().ok_or("no PLAYER row")?;
        k.player = Player {
            at: p
                .get_u64("at")
                .filter(|v| *v < NREG as u64)
                .ok_or("PLAYER: bad at")? as u8,
            attempts: p.get_u64("attempts").ok_or("PLAYER: bad attempts")? as u32,
            visited: p
                .get_u64("visited")
                .filter(|v| *v < 1 << NREG)
                .ok_or("PLAYER: bad visited")? as u16,
        };
        let secret_rows: Vec<&Row> = s.rows_of("SECRET").collect();
        if secret_rows.len() != SECRET_COUNT {
            return Err(format!(
                "expected {SECRET_COUNT} SECRET rows, found {}",
                secret_rows.len()
            ));
        }
        for (i, r) in secret_rows.iter().enumerate() {
            if r.get_u64("id") != Some(i as u64 + 1) {
                return Err(format!("SECRET row {i} out of order"));
            }
            let evidence = r
                .get("evidence")
                .and_then(Evidence::from_word)
                .ok_or("SECRET: bad evidence")?;
            let sha = match r.get("answer_sha16") {
                Some("none") => None,
                Some(v) if v.len() == 16 => Some(v.to_string()),
                _ => return Err("SECRET: bad answer_sha16".to_string()),
            };
            let solved_tick = match r.get("solved_tick") {
                Some("none") => None,
                Some(v) => Some(v.parse::<u64>().map_err(|_| "SECRET: bad solved_tick")?),
                None => return Err("SECRET: no solved_tick".to_string()),
            };
            k.secrets[i] = SecretState {
                evidence,
                answer_sha16: sha,
                solved_tick,
                attempts: r.get_u64("attempts").ok_or("SECRET: bad attempts")? as u32,
            };
        }
        k.last_missions = s.rows_of("MISSION").cloned().collect();
        k.prev_head = s.prev.clone();
        k.head = s.this.clone();
        let again = k.snapshot();
        if &again != s {
            return Err("the rebuilt kernel does not re-seal to the same snapshot".to_string());
        }
        Ok(k)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn kernel() -> Kernel {
        Kernel::new(
            20_260_801,
            None,
            Inputs::empty("a page of text\nwith some white\n"),
        )
    }

    #[test]
    fn genesis_is_tick_zero_and_roots_the_chain() {
        let k = kernel();
        let s = k.snapshot();
        assert_eq!(s.tick, 0);
        assert_eq!(s.prev, snapshot::genesis_hash(20_260_801));
        assert_eq!(k.genesis, s.prev);
        assert_eq!(k.head, s.this, "the fresh kernel's head is tick 0's hash");
        assert_eq!(s.this, snapshot::chain_link(&s.prev, &s.state));
        assert_ne!(s.this, snapshot::genesis_hash(20_260_801));
        assert_eq!(s.rows_of("REGION").count(), 9);
        assert_eq!(s.rows_of("AGENT").count(), 27);
        assert_eq!(s.rows_of("SECRET").count(), 9);
        assert!(s
            .rows
            .iter()
            .all(|r| r.line().is_ascii() && r.line().ends_with("|json=0")));
        // population starts as the three home agents
        for r in s.rows_of("REGION") {
            assert_eq!(r.get("population"), Some("3"));
        }
        // the design's starting table
        let hollow = s.rows_of("REGION").next().unwrap();
        assert_eq!(hollow.get("coherence"), Some("60"));
        assert_eq!(hollow.get("energy"), Some("40"));
        assert_eq!(hollow.get("risk"), Some("30"));
    }

    #[test]
    fn weather_repeats_every_27_ticks_and_uses_all_27_cells() {
        let mut cells = std::collections::BTreeSet::new();
        for t in 0..27u64 {
            let w = weather(t);
            cells.insert((w.wind, w.fog, w.light));
            assert_eq!(weather(t), weather(t + 27));
            assert_eq!(weather(t), weather(t + 27 * 1000));
        }
        assert_eq!(
            cells.len(),
            27,
            "the 27 cells of the cube are the weather alphabet"
        );
        // phase thirds: dawn, day, night
        assert_eq!(weather(0).phase, 0);
        assert_eq!(weather(9).phase, 1);
        assert_eq!(weather(18).phase, 2);
        assert_eq!(weather(26).phase, 2);
        // centring: t mod 27 = 14 is -13 = (-,-,-), not an out-of-range 14
        let w = weather(14);
        assert_eq!((w.wind, w.fog, w.light), (-1, -1, -1));
        // sums over a cycle are zero for each trit: every value occurs nine times
        let mut sum = (0i32, 0i32, 0i32);
        for t in 0..27u64 {
            let w = weather(t);
            sum = (
                sum.0 + i32::from(w.wind),
                sum.1 + i32::from(w.fog),
                sum.2 + i32::from(w.light),
            );
        }
        assert_eq!(sum, (0, 0, 0));
    }

    #[test]
    fn rivers_conserve_energy_and_carry_remainders() {
        let mut f = world::initial_fields();
        let before: u32 = f.iter().map(|x| x.energy).sum();
        flow(&mut f);
        let after: u32 = f.iter().map(|x| x.energy).sum();
        assert_eq!(before, after, "no energy is created or lost by the rivers");
        // an edge sends energy/27 with the remainder kept: 40/27 = 1 from the Hollow Strata
        let mut g = world::initial_fields();
        g.iter_mut().for_each(|x| x.energy = 0);
        g[0].energy = 80;
        flow(&mut g);
        assert_eq!(g[0].energy, 80 - 2, "80 / 27 = 2, remainder 26 stays");
        assert_eq!(g[1].energy, 2);
        // order independence: reversing the edge table gives the same state
        let mut h = world::initial_fields();
        h.iter_mut()
            .enumerate()
            .for_each(|(i, x)| x.energy = (i as u32 * 29) % 101);
        let mut a = h;
        let mut b = h;
        flow(&mut a);
        let sends: Vec<(usize, usize, u32)> = world::RIVERS
            .iter()
            .rev()
            .map(|e| {
                (
                    e.from as usize,
                    e.to as usize,
                    b[e.from as usize].energy / 27,
                )
            })
            .collect();
        for (from, to, amt) in sends {
            b[from].energy -= amt;
            b[to].energy += amt;
        }
        assert_eq!(a, b);
    }

    #[test]
    fn two_runs_of_the_same_seed_and_missions_are_identical() {
        let run = || {
            let mut k = kernel();
            let mut heads = vec![k.snapshot().this];
            for t in 0..100u64 {
                let m: Vec<Mission> = if t == 40 {
                    vec![Mission::Solve("nonsense".into())]
                } else {
                    vec![]
                };
                heads.push(k.tick(&m).this);
            }
            heads
        };
        assert_eq!(run(), run());
    }

    #[test]
    fn a_different_seed_gives_a_different_chain() {
        let mut a = Kernel::new(1, None, Inputs::empty("x"));
        let mut b = Kernel::new(2, None, Inputs::empty("x"));
        assert_ne!(a.snapshot().this, b.snapshot().this);
        assert_ne!(a.tick(&[]).this, b.tick(&[]).this);
    }

    #[test]
    fn the_snapshot_rebuilds_the_kernel_byte_for_byte_every_tick() {
        let mut k = kernel();
        let mut s = k.snapshot();
        for t in 0..729u64 {
            let rebuilt = Kernel::from_snapshot(&s, Inputs::empty("x")).expect("rebuild");
            assert_eq!(rebuilt.snapshot(), s, "tick {t}");
            let m: Vec<Mission> = if t % 90 == 7 {
                vec![Mission::Solve("wrong".into())]
            } else {
                vec![]
            };
            s = k.tick(&m);
        }
        // and the rebuilt kernel continues on the same chain as the original
        let mut a = Kernel::from_snapshot(&s, Inputs::empty("x")).unwrap();
        let sa = a.tick(&[]);
        let sb = k.tick(&[]);
        assert_eq!(sa, sb);
    }

    #[test]
    fn a_forged_snapshot_is_refused() {
        let mut k = kernel();
        let s = k.tick(&[]);
        // change one region field and re-seal it consistently: the chain row is recomputed by
        // Snapshot::seal, but the rebuilt kernel's own state rows are what get compared, so a forged
        // `population` that the agents do not support is refused
        let mut body: Vec<Row> = s.rows[..s.rows.len() - 1].to_vec();
        for r in body.iter_mut().filter(|r| r.tag == "REGION") {
            for (key, v) in r.kv.iter_mut() {
                if key == "population" {
                    *v = "27".to_string();
                }
            }
        }
        let forged = Snapshot::seal(s.tick, 20_260_801, &s.prev, body);
        assert!(Kernel::from_snapshot(&forged, Inputs::empty("x")).is_err());
    }

    #[test]
    fn go_is_refused_until_the_chapter_is_solved_and_solve_checks_the_kernels_own_number() {
        let mut k = kernel();
        assert_eq!(k.progress(), 0);
        assert!(k.unlocked(0) && !k.unlocked(1));
        // locked
        let s = k.tick(&[Mission::Go(1)]);
        assert_eq!(k.player.at, 0);
        let m = s.rows_of("MISSION").next().unwrap();
        assert_eq!(
            (m.get("kind"), m.get("match"), m.get("reason")),
            (Some("go"), Some("0"), Some("locked"))
        );
        // a wrong answer is counted and never stored
        let s = k.tick(&[Mission::Solve("26:13".into())]);
        let m = s.rows_of("MISSION").next().unwrap();
        assert_eq!(m.get("match"), Some("0"));
        assert!(
            !m.line().contains("26:13"),
            "the attempt's text is never recorded"
        );
        assert_eq!(k.secret_state(1).attempts, 1);
        assert_eq!(k.player.attempts, 1);
        // the right answer
        let s = k.tick(&[Mission::Solve("27:13".into())]);
        assert_eq!(s.rows_of("MISSION").next().unwrap().get("match"), Some("1"));
        let st = k.secret_state(1);
        assert_eq!(st.evidence, Evidence::LocalMeasured);
        assert_eq!(st.solved_tick, Some(k.tick));
        assert_eq!(
            st.answer_sha16.as_deref(),
            Some(secrets::answer_sha16(1, "27:13").as_str())
        );
        assert!(
            !s.rows.iter().any(|r| r.line().contains("27:13")),
            "the answer is stored only as a hash"
        );
        // chapter 2 opens
        assert_eq!(k.progress(), 1);
        assert!(k.unlocked(1) && !k.unlocked(2));
        let s = k.tick(&[Mission::Go(1)]);
        assert_eq!(k.player.at, 1);
        assert_eq!(s.rows_of("MISSION").next().unwrap().get("match"), Some("1"));
        assert_eq!(k.player.visited & 0b11, 0b11);
    }

    #[test]
    fn evidence_only_climbs_through_the_five_states_and_promoted_does_not_exist() {
        let mut k = kernel();
        k.tick(&[Mission::Solve("27:13".into())]);
        assert_eq!(k.secret_state(1).evidence, Evidence::LocalMeasured);
        // verified needs bridge first
        k.tick(&[Mission::Verified(vec![1])]);
        assert_eq!(k.secret_state(1).evidence, Evidence::LocalMeasured);
        k.tick(&[Mission::Bridge]);
        assert_eq!(k.secret_state(1).evidence, Evidence::BridgePublished);
        k.tick(&[Mission::Verified(vec![1])]);
        assert_eq!(k.secret_state(1).evidence, Evidence::VerifierReceived);
        k.tick(&[Mission::Independent(vec![1, 2])]);
        assert_eq!(k.secret_state(1).evidence, Evidence::IndependentlyVerified);
        assert_eq!(
            k.secret_state(2).evidence,
            Evidence::Sealed,
            "an unsolved secret is not promoted"
        );
        let words: Vec<&str> = Evidence::ALL.iter().map(|e| e.word()).collect();
        assert!(!words.contains(&"PROMOTED"));
    }

    #[test]
    fn fields_stay_in_range_and_population_counts_agents() {
        let mut k = kernel();
        for _ in 0..500 {
            let s = k.tick(&[]);
            let mut pop = 0;
            for r in s.rows_of("REGION") {
                for key in ["coherence", "energy", "population", "risk"] {
                    assert!(r.get_u64(key).unwrap() <= 100, "{key}");
                }
                pop += r.get_u64("population").unwrap();
            }
            assert_eq!(pop, 27);
        }
    }

    #[test]
    fn solving_a_chapter_raises_its_coherence() {
        let mut k = kernel();
        let before = k.fields[0].coherence;
        k.tick(&[Mission::Solve("27:13".into())]);
        for _ in 0..30 {
            k.tick(&[]);
        }
        assert!(
            k.fields[0].coherence > before,
            "{} should exceed {before}",
            k.fields[0].coherence
        );
    }
}
