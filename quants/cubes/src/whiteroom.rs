//! Registry slot 28, `Q-WHITEROOM-GULP-MINT-v1` (registry line 34): the white room that keeps
//! genius and compacts mistakes (atlas line 157: "KEEP genius, COMPACT mistakes, drain bounded
//! windows, mint persistent cubes/glyphs/receipts").
//!
//! Integer port of asolaria-whiteroom-engine @ 896518a, cited as
//! - `sector:<line>`: `liris-sector-emitter.mjs` (blob 5474e1c1), `primeAt` and
//!   `globalRoomAddress`, the prime-sector PID space;
//! - `hilbert:<line>`: `liris-hilbert.mjs` (blob b505fc8c), `hilbertD2XY`;
//! - `engine:<line>`: `liris-whiteroom-engine.mjs` (blob 8bf9fa4a): the two PID emitters, the
//!   never-delete store, the deterministic scorer, `geniusScore` and the engine's
//!   emit -> score -> keep/compact -> seal turn.
//!
//! Not ported: `L0GnnScorer` (`engine:110-128`), which POSTs JSON to the L0 server at
//! `127.0.0.1:4792`; aether runs L0 in process in `model/l0-edge`. The CLI smoke run
//! (`engine:185-200`) is `examples/whiteroom_smoke.rs` without the seal path of line 189, an
//! operator-local Windows path. JavaScript doubles go through `l0_edge::jsnum::Dbl`.

use crate::sha256_hex;
use l0_edge::jsnum::Dbl;
use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap};
use std::io::Write;
use std::path::PathBuf;
use std::rc::Rc;

/// `sha256hex(s)` (`engine:19`).
pub fn sha256hex(s: &str) -> String {
    sha256_hex(s.as_bytes())
}

/// `sha16(s)` (`sector:12`).
pub fn sha16(s: &str) -> String {
    sha256hex(s)[..16].to_string()
}

/// `SECTOR_CAPACITY` (`sector:13`).
pub const SECTOR_CAPACITY: u64 = 1_000_000;

thread_local! {
    /// `const _primes = [2]` (`sector:16`): the primes found so far, kept between calls.
    static PRIMES: RefCell<Vec<u64>> = RefCell::new(vec![2]);
}

/// `primeAt(n)` (`sector:15-27`): the 0-indexed n-th prime, by the same trial division,
/// continued from the last prime `_primes` holds (`sector:19`).
pub fn prime_at(n: u64) -> u64 {
    PRIMES.with(|cell| {
        let mut primes = cell.borrow_mut();
        let mut cand = *primes.last().expect("_primes starts as [2]");
        while primes.len() as u64 <= n {
            cand += if cand == 2 { 1 } else { 2 };
            let mut is_p = true;
            for &p in primes.iter() {
                if p * p > cand {
                    break;
                }
                if cand % p == 0 {
                    is_p = false;
                    break;
                }
            }
            if is_p {
                primes.push(cand);
            }
        }
        primes[n as usize]
    })
}

/// A `RangeError` upstream throws, with its message.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RangeError(pub String);

/// `globalRoomAddress(sectorIndex, roomInSector)` (`sector:31-40`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RoomAddress {
    /// `sectorIndex`.
    pub sector_index: u64,
    /// `roomInSector`.
    pub room_in_sector: u64,
    /// `globalIndex = sectorIndex * SECTOR_CAPACITY + roomInSector`.
    pub global_index: u64,
    /// `prime = primeAt(sectorIndex)`.
    pub prime: u64,
    /// `BH.SECTOR.P${prime}.R${room padStart 7}.${sha16("room|" + globalIndex)[0..8] upper}`.
    pub pid: String,
}

/// `globalRoomAddress` (`sector:31-40`). A negative or non-integer sector (the first throw) is
/// outside `u64`; the room bound of `sector:33-35` is checked as upstream checks it.
pub fn global_room_address(
    sector_index: u64,
    room_in_sector: u64,
) -> Result<RoomAddress, RangeError> {
    if room_in_sector >= SECTOR_CAPACITY {
        return Err(RangeError(format!(
            "roomInSector out of 1M sector capacity (0..{})",
            SECTOR_CAPACITY - 1
        )));
    }
    let prime = prime_at(sector_index);
    let global_index = sector_index * SECTOR_CAPACITY + room_in_sector;
    let pid = format!(
        "BH.SECTOR.P{prime}.R{room_in_sector:07}.{}",
        sha16(&format!("room|{global_index}"))[..8].to_ascii_uppercase()
    );
    Ok(RoomAddress {
        sector_index,
        room_in_sector,
        global_index,
        prime,
        pid,
    })
}

/// `hilbertD2XY(n, d)` (`hilbert:6-19`), the standard d -> (x, y) curve. JavaScript reads
/// `t ^ rx` through ToInt32, which keeps the low bit `1 &` takes; every value stays below 2^53
/// for `d < 2^53`. `n` is the number JavaScript receives: an integer a double holds (every
/// `n <= 2^53`, and above that only the doubles). For `n > 2^63` the loop's last turn is
/// `s = 2^63`, as in JavaScript, where `s *= 2` then gives `2^64 >= n`.
pub fn hilbert_d2xy(n: u64, d: u64) -> (u64, u64) {
    let (mut x, mut y, mut t) = (0u64, 0u64, d);
    let mut s = 1u64;
    while s < n {
        let rx = 1 & (t / 2);
        let ry = 1 & (t ^ rx);
        if ry == 0 {
            if rx == 1 {
                x = s - 1 - x;
                y = s - 1 - y;
            }
            std::mem::swap(&mut x, &mut y);
        }
        x += s * rx;
        y += s * ry;
        t /= 4;
        let Some(next) = s.checked_mul(2) else {
            break;
        };
        s = next;
    }
    (x, y)
}

/// What an emitter's `next()` returns (`engine:30-35`, `engine:50-54`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Emitted {
    /// `pid`.
    pub pid: String,
    /// `counter` (the room index for the sector emitter).
    pub counter: u64,
    /// `coord64 = sha256hex(pid)`.
    pub coord64: String,
    /// `cp = parseInt(coord64.slice(0, 3), 16) % 1024`.
    pub cp: u16,
    /// `glyph = "cp" + cp.toString(16).padStart(4, "0")`.
    pub glyph: String,
    /// `port3 = ${4096 + b(0)}.${b(1)}.${b(2)}`.
    pub port3: String,
    /// `prime` (sector emitter only).
    pub prime: Option<u64>,
    /// `globalIndex` (sector emitter only).
    pub global_index: Option<u64>,
}

fn hex_byte(h: &str, i: usize) -> u64 {
    u64::from_str_radix(&h[2 * i..2 * i + 2], 16).expect("sha256 hex")
}

fn emitted(pid: String, counter: u64, prime: Option<u64>, global_index: Option<u64>) -> Emitted {
    let coord64 = sha256hex(&pid);
    let cp = (u64::from_str_radix(&coord64[..3], 16).expect("sha256 hex") % 1024) as u16;
    let port3 = format!(
        "{}.{}.{}",
        4096 + hex_byte(&coord64, 0),
        hex_byte(&coord64, 1),
        hex_byte(&coord64, 2)
    );
    Emitted {
        glyph: format!("cp{cp:04x}"),
        pid,
        counter,
        coord64,
        cp,
        port3,
        prime,
        global_index,
    }
}

/// A PID emitter: `next()` of the two emitter classes.
pub trait Emitter {
    /// The next room address.
    fn next(&mut self) -> Result<Emitted, RangeError>;
}

/// `BHPidEmitter` (`engine:22-37`): `BH.WR.${seed}.${counter}`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BhPidEmitter {
    /// `seed` (default `"liris-whiteroom"`).
    pub seed: String,
    /// `counter`.
    pub counter: u64,
}

impl Default for BhPidEmitter {
    fn default() -> Self {
        BhPidEmitter::new("liris-whiteroom")
    }
}

impl BhPidEmitter {
    /// `new BHPidEmitter(seed)`.
    pub fn new(seed: &str) -> Self {
        BhPidEmitter {
            seed: seed.to_string(),
            counter: 0,
        }
    }
}

impl Emitter for BhPidEmitter {
    fn next(&mut self) -> Result<Emitted, RangeError> {
        let counter = self.counter;
        self.counter += 1;
        Ok(emitted(
            format!("BH.WR.{}.{counter}", self.seed),
            counter,
            None,
            None,
        ))
    }
}

/// `SectorAwareEmitter` (`engine:42-56`): room PIDs are `globalRoomAddress(sector, room)`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SectorAwareEmitter {
    /// `sectorIndex`.
    pub sector_index: u64,
    /// `room`, the next room to emit.
    pub room: u64,
}

impl SectorAwareEmitter {
    /// `new SectorAwareEmitter(sectorIndex, startRoom)`.
    pub fn new(sector_index: u64, start_room: u64) -> Self {
        SectorAwareEmitter {
            sector_index,
            room: start_room,
        }
    }
}

impl Emitter for SectorAwareEmitter {
    fn next(&mut self) -> Result<Emitted, RangeError> {
        let room = self.room;
        self.room += 1;
        let addr = global_room_address(self.sector_index, room)?;
        Ok(emitted(
            addr.pid,
            room,
            Some(addr.prime),
            Some(addr.global_index),
        ))
    }
}

/// `"genius"` or `"mistake"` (`engine:167`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Verdict {
    /// `score >= geniusThreshold`.
    Genius,
    /// otherwise.
    Mistake,
}

impl Verdict {
    /// The row text.
    pub fn as_str(self) -> &'static str {
        match self {
            Verdict::Genius => "genius",
            Verdict::Mistake => "mistake",
        }
    }
}

/// A room record (`engine:165`, `engine:169`, `engine:66`, `engine:173`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Record {
    /// `pid`.
    pub pid: String,
    /// `port3`.
    pub port3: String,
    /// `cp`.
    pub cp: u16,
    /// `mark`.
    pub mark: String,
    /// `score`, once scored.
    pub score: Option<Dbl>,
    /// `verdict`, once scored.
    pub verdict: Option<Verdict>,
    /// `compacted: true` on the copy `compact` moves (`engine:66`).
    pub compacted: bool,
    /// `sealed`, the sealed row (`engine:173`).
    pub sealed: Option<String>,
}

/// A record object as JavaScript shares it: the store and the engine hold the same object, so a
/// field the engine sets on what `get` returned is seen in the store (`engine:168-173`).
pub type Shared = Rc<RefCell<Record>>;

/// The error of `RedisCloudStore._gate()` (`engine:75-80`), of an emitter, or of a seal append.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum EngineError {
    /// `GATED: ...` from the Redis-Cloud adapter.
    Gated(String),
    /// A `RangeError` from `globalRoomAddress`.
    Range(RangeError),
    /// `fs.appendFileSync` failed.
    Io(String),
}

/// The store interface (`engine:58`): put / get / scanByPID / compact (never delete).
pub trait Store {
    /// `kind`.
    fn kind(&self) -> &str;
    /// `put(pid, rec)`.
    fn put(&mut self, pid: &str, rec: Shared) -> Result<(), EngineError>;
    /// `get(pid)`: live, else compacted, else none.
    fn get(&self, pid: &str) -> Result<Option<Shared>, EngineError>;
    /// `scanByPID(pred)`: live records whose PID satisfies `pred`, in insertion order.
    fn scan_by_pid(&self, pred: &dyn Fn(&str) -> bool) -> Result<Vec<Shared>, EngineError>;
    /// `compact(pid)`: move live -> compacted (a copy with `compacted: true`), never delete.
    fn compact(&mut self, pid: &str) -> Result<Option<Shared>, EngineError>;
}

/// A JavaScript `Map` with insertion order: re-setting a key keeps its place.
#[derive(Clone, Debug, Default)]
struct OrderedMap {
    seq: u64,
    by_key: HashMap<String, (u64, Shared)>,
    order: BTreeMap<u64, String>,
}

impl OrderedMap {
    fn set(&mut self, key: &str, rec: Shared) {
        if let Some(slot) = self.by_key.get_mut(key) {
            slot.1 = rec;
            return;
        }
        self.seq += 1;
        self.order.insert(self.seq, key.to_string());
        self.by_key.insert(key.to_string(), (self.seq, rec));
    }

    fn get(&self, key: &str) -> Option<&Shared> {
        self.by_key.get(key).map(|(_, r)| r)
    }

    fn delete(&mut self, key: &str) {
        if let Some((seq, _)) = self.by_key.remove(key) {
            self.order.remove(&seq);
        }
    }

    fn entries(&self) -> impl Iterator<Item = (&String, &Shared)> {
        self.order
            .values()
            .map(move |k| (k, &self.by_key[k.as_str()].1))
    }

    fn len(&self) -> usize {
        self.by_key.len()
    }
}

/// `MemoryStore` (`engine:59-70`).
#[derive(Clone, Debug, Default)]
pub struct MemoryStore {
    live: OrderedMap,
    compacted: OrderedMap,
}

/// `stats()` (`engine:69`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct StoreStats {
    /// `live.size`.
    pub live: usize,
    /// `compacted.size`.
    pub compacted: usize,
}

impl MemoryStore {
    /// `new MemoryStore()`.
    pub fn new() -> Self {
        MemoryStore::default()
    }

    /// `stats()` (`engine:69`).
    pub fn stats(&self) -> StoreStats {
        StoreStats {
            live: self.live.len(),
            compacted: self.compacted.len(),
        }
    }
}

impl Store for MemoryStore {
    fn kind(&self) -> &str {
        "memory"
    }

    fn put(&mut self, pid: &str, rec: Shared) -> Result<(), EngineError> {
        self.live.set(pid, rec);
        Ok(())
    }

    fn get(&self, pid: &str) -> Result<Option<Shared>, EngineError> {
        Ok(self
            .live
            .get(pid)
            .or_else(|| self.compacted.get(pid))
            .cloned())
    }

    fn scan_by_pid(&self, pred: &dyn Fn(&str) -> bool) -> Result<Vec<Shared>, EngineError> {
        Ok(self
            .live
            .entries()
            .filter(|(pid, _)| pred(pid))
            .map(|(_, r)| Rc::clone(r))
            .collect())
    }

    fn compact(&mut self, pid: &str) -> Result<Option<Shared>, EngineError> {
        let r = self.live.get(pid).cloned();
        if let Some(rec) = &r {
            let mut moved = rec.borrow().clone();
            moved.compacted = true;
            self.compacted.set(pid, Rc::new(RefCell::new(moved)));
            self.live.delete(pid);
        }
        Ok(r)
    }
}

/// The message `RedisCloudStore._gate()` throws (`engine:76-79`).
pub const REDIS_GATED: &str = "GATED: RedisCloudStore needs a connection string loaded by role via the Asolaria Profile (never inlined). Enable with: npm i ioredis + profile-provided REDIS_URL. Interface is drop-in.";

/// `RedisCloudStore` (`engine:73-82`): every operation is gated.
#[derive(Clone, Copy, Debug, Default)]
pub struct RedisCloudStore;

impl Store for RedisCloudStore {
    fn kind(&self) -> &str {
        "redis-cloud(GATED)"
    }

    fn put(&mut self, _: &str, _: Shared) -> Result<(), EngineError> {
        Err(EngineError::Gated(REDIS_GATED.to_string()))
    }

    fn get(&self, _: &str) -> Result<Option<Shared>, EngineError> {
        Err(EngineError::Gated(REDIS_GATED.to_string()))
    }

    fn scan_by_pid(&self, _: &dyn Fn(&str) -> bool) -> Result<Vec<Shared>, EngineError> {
        Err(EngineError::Gated(REDIS_GATED.to_string()))
    }

    fn compact(&mut self, _: &str) -> Result<Option<Shared>, EngineError> {
        Err(EngineError::Gated(REDIS_GATED.to_string()))
    }
}

/// The scorer interface (`engine:84-128`).
pub trait Scorer {
    /// `name`.
    fn name(&self) -> &str;
    /// `score(pid, mark, coord64)`, a value in [0, 1].
    fn score(&self, pid: &str, mark: &str, coord64: Option<&str>) -> Dbl;
}

/// `parseInt(h.slice(0, 8), 16) / 0xffffffff` (`engine:96`, `engine:107`).
fn unit_score(h: &str) -> Dbl {
    let n = u64::from_str_radix(&h[..8], 16).expect("sha256 hex");
    Dbl::from_ratio(n, 0xffff_ffff)
}

/// The JavaScript literal `0.72` (`engine:86`, `engine:105`, `engine:132`).
pub fn genius_threshold() -> Dbl {
    Dbl::decimal(72, 2)
}

/// `geniusScore(pid)` (`engine:106-108`): `parseInt(sha256hex(pid).slice(0, 8), 16) / 0xffffffff`.
pub fn genius_score(pid: &str) -> Dbl {
    unit_score(&sha256hex(pid))
}

/// `DeterministicScorer` (`engine:85-98`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DeterministicScorer {
    /// `threshold` (stored; `score` does not read it).
    pub threshold: Dbl,
    /// `reuseCoord64`: score from the emitter's `coord64` instead of `sha256(pid|mark)`.
    pub reuse_coord64: bool,
}

impl Default for DeterministicScorer {
    fn default() -> Self {
        DeterministicScorer::new(genius_threshold(), false)
    }
}

impl DeterministicScorer {
    /// `new DeterministicScorer(threshold, reuseCoord64)`.
    pub fn new(threshold: Dbl, reuse_coord64: bool) -> Self {
        DeterministicScorer {
            threshold,
            reuse_coord64,
        }
    }
}

impl Scorer for DeterministicScorer {
    fn name(&self) -> &str {
        if self.reuse_coord64 {
            "deterministic-coord64"
        } else {
            "deterministic-sha"
        }
    }

    fn score(&self, pid: &str, mark: &str, coord64: Option<&str>) -> Dbl {
        match coord64 {
            Some(c) if self.reuse_coord64 && !c.is_empty() => unit_score(c),
            _ => unit_score(&sha256hex(&format!("{pid}|{mark}"))),
        }
    }
}

/// JavaScript `x.toFixed(6)` for `0 <= x < 2^53`: the integer `n` nearest `x * 10^6`, the larger
/// on a tie, written with six decimals.
pub fn to_fixed6(x: Dbl) -> String {
    let bits = x.to_bits();
    let units: u128 = if bits == 0 {
        0
    } else {
        let mant = u128::from((bits & ((1 << 52) - 1)) | (1 << 52));
        let exp = ((bits >> 52) & 0x7ff) as i32 - 1075;
        let scaled = mant * 1_000_000;
        if exp >= 0 {
            scaled << exp as u32
        } else {
            let k = exp.unsigned_abs();
            if k >= 120 {
                0
            } else {
                (2 * scaled + (1u128 << k)) >> (k + 1)
            }
        }
    };
    format!("{}.{:06}", units / 1_000_000, units % 1_000_000)
}

/// `metrics` (`engine:140`).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Metrics {
    /// `ticks`.
    pub ticks: u64,
    /// `genius`.
    pub genius: u64,
    /// `mistake`.
    pub mistake: u64,
}

/// `WhiteRoomEngine` (`engine:131-183`).
pub struct WhiteRoomEngine<St: Store, Sc: Scorer, E: Emitter> {
    /// `store`.
    pub store: St,
    /// `scorer`.
    pub scorer: Sc,
    /// `emitter`.
    pub emitter: E,
    /// `sealPath`: sealed rows are appended here in batches; `None` keeps them in memory only.
    pub seal_path: Option<PathBuf>,
    /// `geniusThreshold`.
    pub genius_threshold: Dbl,
    /// `batchSize`.
    pub batch_size: usize,
    buf: Vec<String>,
    /// `metrics`.
    pub metrics: Metrics,
    /// `prevHash`, the last `row_hash` (sixteen `0` before the first row).
    pub prev_hash: String,
}

impl WhiteRoomEngine<MemoryStore, DeterministicScorer, BhPidEmitter> {
    /// `new WhiteRoomEngine()` with every default (`engine:132-135`).
    pub fn with_defaults() -> Self {
        WhiteRoomEngine::new(
            MemoryStore::new(),
            DeterministicScorer::new(genius_threshold(), false),
            BhPidEmitter::default(),
            None,
            genius_threshold(),
            1,
        )
    }
}

impl<St: Store, Sc: Scorer, E: Emitter> WhiteRoomEngine<St, Sc, E> {
    /// `new WhiteRoomEngine({ store, scorer, emitter, sealPath, geniusThreshold, batchSize })`.
    pub fn new(
        store: St,
        scorer: Sc,
        emitter: E,
        seal_path: Option<PathBuf>,
        genius_threshold: Dbl,
        batch_size: usize,
    ) -> Self {
        WhiteRoomEngine {
            store,
            scorer,
            emitter,
            seal_path,
            genius_threshold,
            batch_size,
            buf: Vec::new(),
            metrics: Metrics::default(),
            prev_hash: "0".repeat(16),
        }
    }

    /// `_seal(rec)` (`engine:143-155`): the HBP row, chained by
    /// `row_hash = sha256hex(row + prevHash).slice(0, 16)`.
    fn seal(&mut self, rec: &Record) -> Result<String, EngineError> {
        let mark: String = rec
            .mark
            .chars()
            .map(|c| {
                if matches!(c, '|' | '\r' | '\n') {
                    '_'
                } else {
                    c
                }
            })
            .collect();
        let row = format!(
            "WHITEROOM|pid={}|port3={}|cp={}|mark={mark}|score={}|verdict={}|store={}|scorer={}|json=0",
            rec.pid,
            rec.port3,
            rec.cp,
            to_fixed6(rec.score.expect("scored before sealing")),
            rec.verdict.expect("scored before sealing").as_str(),
            self.store.kind(),
            self.scorer.name()
        );
        let rh = sha256hex(&format!("{row}{}", self.prev_hash))[..16].to_string();
        let sealed = format!("{row}|row_hash={rh}");
        self.prev_hash = rh;
        if self.seal_path.is_some() {
            self.buf.push(sealed.clone());
            if self.buf.len() >= self.batch_size {
                self.flush()?;
            }
        }
        Ok(sealed)
    }

    /// `_flush()` (`engine:156-161`): append the buffered rows, one per line.
    pub fn flush(&mut self) -> Result<(), EngineError> {
        if let Some(path) = &self.seal_path {
            if !self.buf.is_empty() {
                let mut f = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(path)
                    .map_err(|e| EngineError::Io(e.to_string()))?;
                f.write_all((self.buf.join("\n") + "\n").as_bytes())
                    .map_err(|e| EngineError::Io(e.to_string()))?;
                self.buf.clear();
            }
        }
        Ok(())
    }

    /// `tick(mark)` (`engine:163-175`), one omnispindle turn: emit, put, score, keep or
    /// compact, seal. Returns the record object `tick` returns.
    pub fn tick(&mut self, mark: &str) -> Result<Shared, EngineError> {
        let a = self.emitter.next().map_err(EngineError::Range)?;
        let put = Rc::new(RefCell::new(Record {
            pid: a.pid.clone(),
            port3: a.port3.clone(),
            cp: a.cp,
            mark: mark.to_string(),
            score: None,
            verdict: None,
            compacted: false,
            sealed: None,
        }));
        self.store.put(&a.pid, put)?;
        let score = self.scorer.score(&a.pid, mark, Some(&a.coord64));
        let verdict = if score >= self.genius_threshold {
            Verdict::Genius
        } else {
            Verdict::Mistake
        };
        let rec = self
            .store
            .get(&a.pid)?
            .expect("the record put above is live");
        {
            let mut r = rec.borrow_mut();
            r.score = Some(score);
            r.verdict = Some(verdict);
        }
        if verdict == Verdict::Mistake {
            self.store.compact(&a.pid)?;
            self.metrics.mistake += 1;
        } else {
            self.metrics.genius += 1;
        }
        self.metrics.ticks += 1;
        let snapshot = rec.borrow().clone();
        let sealed = self.seal(&snapshot)?;
        rec.borrow_mut().sealed = Some(sealed);
        Ok(rec)
    }

    /// `spin(marks)` (`engine:177-182`), the omniflywheel: one `tick` per mark, then flush the
    /// last partial batch.
    pub fn spin<'a, I: IntoIterator<Item = &'a str>>(
        &mut self,
        marks: I,
    ) -> Result<Vec<Shared>, EngineError> {
        let mut out = Vec::new();
        for mark in marks {
            out.push(self.tick(mark)?);
        }
        self.flush()?;
        Ok(out)
    }
}
