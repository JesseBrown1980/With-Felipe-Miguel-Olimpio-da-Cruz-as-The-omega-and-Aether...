//! Twenty-seven agents (3^3), deterministic trit state machines.
//!
//! Three agents per region, one per colour register in {Red, Green, Blue} from `asolaria_tribit`.
//! The two free registers, Zero and Translucent, are never agents: "free, never computed".
//!
//! The eight allowed Omega 5.3 visual states are encoded as a pair of trits `(s1, s2)` so that the
//! state is itself a cell of a 3x3 slice of the cube, with `idle` at the free centre. The cell
//! `(+, +)` is **reserved and never entered**; that is said plainly so nobody reads a meaning into
//! it that was not measured. The state is stored as the pair, not as an enum, so a test that walks
//! 3^9 ticks and checks the pair is a test that can fail.

use crate::hbp::Row;
use crate::sha256::sha16;
use crate::world::{self, Fields, NAG, NREG};
use asolaria_tribit::Register;

/// An edge takes three ticks (velocity one step per tick; no float).
pub const EDGE_TICKS: u8 = 3;

/// Risk at or above this value sends a patrolling agent to investigate.
pub const HIGH_RISK: u32 = 60;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum AState {
    Patrolling,
    Building,
    Exploring,
    Waiting,
    Idle,
    Transporting,
    Investigating,
    Returning,
}

impl AState {
    pub const ALL: [AState; 8] = [
        AState::Patrolling,
        AState::Building,
        AState::Exploring,
        AState::Waiting,
        AState::Idle,
        AState::Transporting,
        AState::Investigating,
        AState::Returning,
    ];

    /// The `(s1, s2)` cell of the 3x3 slice.
    pub fn cell(self) -> (i8, i8) {
        match self {
            AState::Patrolling => (-1, -1),
            AState::Building => (-1, 0),
            AState::Exploring => (-1, 1),
            AState::Waiting => (0, -1),
            AState::Idle => (0, 0),
            AState::Transporting => (0, 1),
            AState::Investigating => (1, -1),
            AState::Returning => (1, 0),
        }
    }

    /// The state at a cell; `None` for the reserved cell `(+, +)` and anything outside the slice.
    pub fn from_cell(s1: i8, s2: i8) -> Option<AState> {
        AState::ALL.iter().copied().find(|s| s.cell() == (s1, s2))
    }

    pub fn name(self) -> &'static str {
        match self {
            AState::Patrolling => "patrolling",
            AState::Building => "building",
            AState::Exploring => "exploring",
            AState::Waiting => "waiting",
            AState::Idle => "idle",
            AState::Transporting => "transporting",
            AState::Investigating => "investigating",
            AState::Returning => "returning",
        }
    }
}

pub fn colour_name(c: Register) -> &'static str {
    match c {
        Register::Red => "red",
        Register::Green => "green",
        Register::Blue => "blue",
        Register::Zero => "zero",
        Register::Translucent => "translucent",
    }
}

fn colour_from_name(s: &str) -> Option<Register> {
    match s {
        "red" => Some(Register::Red),
        "green" => Some(Register::Green),
        "blue" => Some(Register::Blue),
        _ => None,
    }
}

/// One agent. Every field is carried in its snapshot row, so a snapshot rebuilds it exactly.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Agent {
    pub id: u8,
    pub pid: String,
    pub home: u8,
    pub colour: Register,
    pub at: u8,
    pub target: u8,
    pub route: Vec<u8>,
    pub rpos: u8,
    pub progress: u8,
    pub heading: i8,
    pub s1: i8,
    pub s2: i8,
    pub energy: u8,
    pub timer: u8,
    pub frequency: u8,
    pub priority: u8,
    pub objective: Option<u8>,
    /// Which of the home's edges a patrol is on.
    pub leg: u8,
}

/// The 27 PIDs: `pid[n] = sha16(pid[n-1] | name)` from `sha16("AETHER-UNIVERSE-AGENTS|seed=<seed>")`,
/// the seat's office chain rule. The name is `<region>-<colour>`.
pub fn pids(seed: u64) -> Vec<String> {
    let mut prev = sha16(format!("AETHER-UNIVERSE-AGENTS|seed={seed}").as_bytes());
    let mut out = Vec::with_capacity(NAG);
    for id in 0..NAG as u8 {
        let name = format!(
            "{}-{}",
            world::REGIONS[(id / 3) as usize].name,
            colour_name(colour_of(id))
        );
        prev = sha16(format!("{prev}|{name}").as_bytes());
        out.push(prev.clone());
    }
    out
}

pub fn colour_of(id: u8) -> Register {
    match id % 3 {
        0 => Register::Red,
        1 => Register::Green,
        _ => Register::Blue,
    }
}

/// Wait length by colour: Red 3, Green 9, Blue 27.
pub fn frequency_of(c: Register) -> u8 {
    match c {
        Register::Red => 3,
        Register::Green => 9,
        _ => 27,
    }
}

fn priority_of(c: Register) -> u8 {
    match c {
        Register::Red => 0,
        Register::Green => 1,
        _ => 2,
    }
}

/// The genesis agents: three per region at home, idle, carrying nothing.
pub fn genesis(seed: u64) -> Vec<Agent> {
    let pid = pids(seed);
    (0..NAG as u8)
        .map(|id| {
            let colour = colour_of(id);
            let home = id / 3;
            let (s1, s2) = AState::Idle.cell();
            Agent {
                id,
                pid: pid[id as usize].clone(),
                home,
                colour,
                at: home,
                target: home,
                route: Vec::new(),
                rpos: 0,
                progress: 0,
                heading: 0,
                s1,
                s2,
                energy: 0,
                timer: 0,
                frequency: frequency_of(colour),
                priority: priority_of(colour),
                objective: None,
                leg: 0,
            }
        })
        .collect()
}

/// The LCG of the operator's compose.py: `s = (s * 1103515245 + 12345) & 0x7FFFFFFF`.
/// The state starts as `seed ^ (id * 2654435761) ^ t` (folded to 31 bits), so the same seed, tick
/// and agent give the same draw on any machine.
fn lcg_start(seed: u64, id: u8, t: u64) -> u64 {
    let s0 =
        ((seed ^ (seed >> 32)) as u32) ^ u32::from(id).wrapping_mul(2_654_435_761) ^ (t as u32);
    u64::from(s0 & 0x7FFF_FFFF)
}

/// One trit from the LCG: `(s mod 3) - 1`.
fn lcg_trit(s: &mut u64) -> i8 {
    *s = (*s * 1_103_515_245 + 12_345) & 0x7FFF_FFFF;
    (*s % 3) as i8 - 1
}

/// The draw an agent makes at tick `t` (exposed for the distribution test).
pub fn draw(seed: u64, id: u8, t: u64) -> i8 {
    let mut s = lcg_start(seed, id, t);
    lcg_trit(&mut s)
}

fn pick_neighbour(at: u8, d: i8) -> u8 {
    let nb = world::neighbours(at);
    nb[(d + 1) as usize % nb.len()]
}

impl Agent {
    /// The state, from the cell. The reserved cell is never entered; reaching it is a kernel bug.
    pub fn state(&self) -> AState {
        AState::from_cell(self.s1, self.s2).expect("an agent entered the reserved cell (+,+)")
    }

    fn set_state(&mut self, st: AState) {
        let (a, b) = st.cell();
        self.s1 = a;
        self.s2 = b;
    }

    fn set_target(&mut self, target: u8) {
        self.target = target;
        self.route = world::route(self.at, target);
        self.rpos = 0;
        self.progress = 0;
    }

    /// Advance one tick along the route; `true` when the agent stands on its target.
    /// `progress` counts steps along the current edge; at three the agent crosses.
    fn advance(&mut self, forward: bool) -> bool {
        if self.at == self.target && self.progress == 0 {
            return true;
        }
        if self.route.get(self.rpos as usize).is_none() {
            self.route = world::route(self.at, self.target);
            self.rpos = 0;
        }
        match self.route.get(self.rpos as usize).copied() {
            None => true,
            Some(next) => {
                self.progress += 1;
                self.heading = if forward { 1 } else { -1 };
                if self.progress >= EDGE_TICKS {
                    self.at = next;
                    self.rpos += 1;
                    self.progress = 0;
                }
                self.at == self.target && self.progress == 0
            }
        }
    }

    /// Step once at tick `t`. Fields may be changed: transporting moves energy, building adds
    /// coherence, investigating lowers risk. All values stay inside `0..=100`.
    pub fn step(&mut self, t: u64, seed: u64, f: &mut [Fields; NREG]) {
        let mut rng = lcg_start(seed, self.id, t);
        let d = lcg_trit(&mut rng);
        self.heading = 0;
        match self.state() {
            AState::Idle => match d {
                1 => {
                    let d2 = lcg_trit(&mut rng);
                    let tgt = pick_neighbour(self.at, d2);
                    self.set_target(tgt);
                    self.set_state(AState::Exploring);
                }
                0 => {
                    self.timer = self.frequency;
                    self.set_state(AState::Waiting);
                }
                _ => {
                    self.leg = 0;
                    let nb = world::neighbours(self.home);
                    let tgt = nb[0];
                    self.set_target(tgt);
                    self.set_state(AState::Patrolling);
                }
            },
            AState::Patrolling => {
                if self.advance(true) {
                    // the next leg of the cycle of the home's edges: out to a neighbour, then home
                    let nb = world::neighbours(self.home);
                    let tgt = if self.at == self.home {
                        self.leg = ((self.leg as usize + 1) % nb.len()) as u8;
                        nb[self.leg as usize]
                    } else {
                        self.home
                    };
                    self.set_target(tgt);
                }
                if self.progress == 0 {
                    if f[self.at as usize].risk >= HIGH_RISK {
                        self.timer = 2;
                        self.objective = Some(self.at);
                        self.set_state(AState::Investigating);
                    } else if d == 1 {
                        let home = self.home;
                        self.set_target(home);
                        self.set_state(AState::Returning);
                    }
                }
            }
            AState::Exploring => {
                if self.advance(true) {
                    let here = self.at as usize;
                    if f[here].energy >= 27 {
                        f[here].energy -= 3;
                        self.energy = (self.energy + 3).min(27);
                        let home = self.home;
                        self.set_target(home);
                        self.set_state(AState::Transporting);
                    } else if d == -1 {
                        self.timer = self.frequency;
                        self.set_state(AState::Waiting);
                    } else {
                        let d2 = lcg_trit(&mut rng);
                        let tgt = pick_neighbour(self.at, d2);
                        self.set_target(tgt);
                    }
                }
            }
            AState::Waiting => {
                self.timer = self.timer.saturating_sub(1);
                if self.timer == 0 {
                    self.set_state(AState::Idle);
                }
            }
            AState::Transporting => {
                if self.advance(true) {
                    let here = self.at as usize;
                    f[here].energy = (f[here].energy + 3).min(100);
                    self.energy = self.energy.saturating_sub(3);
                    self.timer = 3;
                    self.set_state(AState::Building);
                }
            }
            AState::Building => {
                self.timer = self.timer.saturating_sub(1);
                if self.timer == 0 {
                    let here = self.at as usize;
                    f[here].coherence = (f[here].coherence + 1).min(100);
                    let home = self.home;
                    self.set_target(home);
                    self.set_state(AState::Returning);
                }
            }
            AState::Investigating => {
                self.timer = self.timer.saturating_sub(1);
                if self.timer == 0 {
                    let at = self.objective.unwrap_or(self.at) as usize;
                    f[at].risk = f[at].risk.saturating_sub(3);
                    self.objective = None;
                    let home = self.home;
                    self.set_target(home);
                    self.set_state(AState::Returning);
                }
            }
            AState::Returning => {
                if self.advance(false) {
                    self.set_state(AState::Idle);
                }
            }
        }
        assert!(
            AState::from_cell(self.s1, self.s2).is_some(),
            "agent {} reached the reserved cell (+,+)",
            self.id
        );
    }

    /// The snapshot row.
    pub fn row(&self) -> Row {
        let route = if self.route.is_empty() {
            "none".to_string()
        } else {
            self.route
                .iter()
                .map(u8::to_string)
                .collect::<Vec<_>>()
                .join(",")
        };
        Row::new("AGENT")
            .kv("id", self.id)
            .kv("pid", &self.pid)
            .kv("home", self.home)
            .kv("colour", colour_name(self.colour))
            .kv("at", self.at)
            .kv("target", self.target)
            .kv("route", route)
            .kv("rpos", self.rpos)
            .kv("progress", self.progress)
            .kv("heading", self.heading)
            .kv("state", self.state().name())
            .kv("s1", self.s1)
            .kv("s2", self.s2)
            .kv("energy", self.energy)
            .kv("timer", self.timer)
            .kv("frequency", self.frequency)
            .kv("priority", self.priority)
            .kv(
                "objective",
                self.objective
                    .map_or_else(|| "none".to_string(), |o| o.to_string()),
            )
            .kv("leg", self.leg)
    }

    /// Rebuild an agent from its row. The reserved cell, a state name that disagrees with its
    /// cell, or any field out of range is an error: a snapshot is never loaded half-believed.
    pub fn from_row(r: &Row) -> Result<Agent, String> {
        fn num<T: std::str::FromStr>(r: &Row, k: &str) -> Result<T, String> {
            r.get(k)
                .and_then(|v| v.parse::<T>().ok())
                .ok_or_else(|| format!("AGENT row: bad or missing {k}"))
        }
        let s1: i8 = num(r, "s1")?;
        let s2: i8 = num(r, "s2")?;
        let st = AState::from_cell(s1, s2).ok_or_else(|| {
            format!("AGENT row: cell ({s1},{s2}) is reserved or outside the slice")
        })?;
        if r.get("state") != Some(st.name()) {
            return Err(format!("AGENT row: state does not match cell ({s1},{s2})"));
        }
        let colour = r
            .get("colour")
            .and_then(colour_from_name)
            .ok_or("AGENT row: bad colour")?;
        let route = match r.get("route") {
            Some("none") => Vec::new(),
            Some(v) => v
                .split(',')
                .map(|x| {
                    x.parse::<u8>()
                        .map_err(|_| "AGENT row: bad route".to_string())
                })
                .collect::<Result<Vec<u8>, String>>()?,
            None => return Err("AGENT row: missing route".to_string()),
        };
        let objective = match r.get("objective") {
            Some("none") => None,
            Some(v) => Some(v.parse::<u8>().map_err(|_| "AGENT row: bad objective")?),
            None => return Err("AGENT row: missing objective".to_string()),
        };
        let a = Agent {
            id: num(r, "id")?,
            pid: r.get("pid").ok_or("AGENT row: missing pid")?.to_string(),
            home: num(r, "home")?,
            colour,
            at: num(r, "at")?,
            target: num(r, "target")?,
            route,
            rpos: num(r, "rpos")?,
            progress: num(r, "progress")?,
            heading: num(r, "heading")?,
            s1,
            s2,
            energy: num(r, "energy")?,
            timer: num(r, "timer")?,
            frequency: num(r, "frequency")?,
            priority: num(r, "priority")?,
            objective,
            leg: num(r, "leg")?,
        };
        let ok = (a.id as usize) < NAG
            && (a.home as usize) < NREG
            && (a.at as usize) < NREG
            && (a.target as usize) < NREG
            && a.progress < EDGE_TICKS
            && a.energy <= 27
            && (-1..=1).contains(&a.heading)
            && a.route.iter().all(|x| (*x as usize) < NREG)
            && a.pid.len() == 16;
        if ok {
            Ok(a)
        } else {
            Err("AGENT row: a field is out of range".to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_eight_states_fill_the_slice_except_the_reserved_cell() {
        let mut cells = std::collections::BTreeSet::new();
        for s in AState::ALL {
            assert!(cells.insert(s.cell()));
            assert_eq!(AState::from_cell(s.cell().0, s.cell().1), Some(s));
        }
        assert_eq!(cells.len(), 8);
        // 3x3 = 9 cells, 8 used, (+,+) reserved
        assert_eq!(AState::from_cell(1, 1), None);
        assert_eq!(AState::Idle.cell(), (0, 0), "idle is the free centre");
        assert_eq!(AState::from_cell(2, 0), None);
    }

    #[test]
    fn genesis_has_three_agents_per_region_none_of_them_a_free_register() {
        let ag = genesis(20_260_801);
        assert_eq!(ag.len(), 27);
        for r in 0..9u8 {
            let here: Vec<&Agent> = ag.iter().filter(|a| a.home == r).collect();
            assert_eq!(here.len(), 3);
            let mut colours: Vec<&str> = here.iter().map(|a| colour_name(a.colour)).collect();
            colours.sort_unstable();
            assert_eq!(colours, ["blue", "green", "red"]);
        }
        for a in &ag {
            assert!(
                !a.colour.is_free(),
                "the two free registers are never agents"
            );
            assert_eq!(a.state(), AState::Idle);
        }
        let mut p: Vec<&String> = ag.iter().map(|a| &a.pid).collect();
        p.sort();
        p.dedup();
        assert_eq!(p.len(), 27, "PIDs are distinct");
        assert!(ag.iter().all(|a| a.pid.len() == 16));
    }

    #[test]
    fn pids_follow_the_chain_rule_and_depend_on_the_seed() {
        let a = pids(1);
        let seed_hash = sha16(b"AETHER-UNIVERSE-AGENTS|seed=1");
        assert_eq!(
            a[0],
            sha16(format!("{seed_hash}|hollow_strata-red").as_bytes())
        );
        assert_eq!(
            a[1],
            sha16(format!("{}|hollow_strata-green", a[0]).as_bytes())
        );
        assert_ne!(pids(1), pids(2));
        assert_eq!(pids(1), pids(1));
    }

    #[test]
    fn the_draw_is_deterministic_and_all_three_trits_occur() {
        let mut counts = [0u32; 3];
        for id in 0..27u8 {
            for t in 1..=600u64 {
                assert_eq!(draw(7, id, t), draw(7, id, t));
                counts[(draw(7, id, t) + 1) as usize] += 1;
            }
        }
        let total: u32 = counts.iter().sum();
        assert_eq!(total, 27 * 600);
        for c in counts {
            // not uniform to the digit, but no trit may be starved
            assert!(c * 100 / total >= 20, "a trit is starved: {counts:?}");
        }
    }

    #[test]
    fn a_long_walk_keeps_every_invariant_and_never_enters_the_reserved_cell() {
        let seed = 20_260_801;
        let mut ag = genesis(seed);
        let mut f = world::initial_fields();
        let mut seen_states = std::collections::BTreeSet::new();
        for t in 1..=3_000u64 {
            for a in ag.iter_mut() {
                a.step(t, seed, &mut f);
                assert_ne!((a.s1, a.s2), (1, 1), "reserved cell entered at t={t}");
                seen_states.insert(a.state().name());
                assert!((a.at as usize) < 9 && a.progress < EDGE_TICKS);
                assert!(a.energy <= 27 && a.timer <= 27);
                assert!(a.colour != Register::Zero && a.colour != Register::Translucent);
            }
            for fl in &f {
                assert!(fl.coherence <= 100 && fl.energy <= 100 && fl.risk <= 100);
            }
        }
        assert!(
            seen_states.len() >= 6,
            "the machines barely moved: {seen_states:?}"
        );
    }

    #[test]
    fn rows_round_trip_and_the_reserved_cell_is_refused() {
        let seed = 3;
        let mut ag = genesis(seed);
        let mut f = world::initial_fields();
        for t in 1..=200u64 {
            for a in ag.iter_mut() {
                a.step(t, seed, &mut f);
            }
        }
        for a in &ag {
            let row = a.row();
            assert!(row.line().is_ascii());
            assert_eq!(&Agent::from_row(&row).unwrap(), a);
        }
        // forge the reserved cell: it must be refused, whatever the state name says
        let mut bad = ag[0].row();
        for (k, v) in bad.kv.iter_mut() {
            if k == "s1" || k == "s2" {
                *v = "1".to_string();
            }
        }
        assert!(Agent::from_row(&bad).unwrap_err().contains("reserved"));
        // a state name that disagrees with its cell is refused too
        let mut lie = ag[0].row();
        for (k, v) in lie.kv.iter_mut() {
            if k == "state" {
                *v = "returning".to_string();
            }
        }
        if ag[0].state() != AState::Returning {
            assert!(Agent::from_row(&lie).is_err());
        }
    }

    #[test]
    fn crossing_an_edge_takes_three_ticks() {
        let mut a = genesis(1).remove(0);
        a.set_target(1);
        assert_eq!(a.route, vec![1]);
        assert!(!a.advance(true));
        assert_eq!((a.at, a.progress), (0, 1));
        assert!(!a.advance(true));
        assert_eq!((a.at, a.progress), (0, 2));
        assert!(a.advance(true));
        assert_eq!((a.at, a.progress), (1, 0));
    }
}
