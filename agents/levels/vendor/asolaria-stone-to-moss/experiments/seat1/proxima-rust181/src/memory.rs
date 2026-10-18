#![forbid(unsafe_code)]
//! Per-particle memory for the Asolaria ternary constellation.
//! An address denotes one logically separate memory through time.
//! Unmodified particles have *derivable* (not independently measured) state;
//! observed/changed particles carry their own append-only event streams.
use std::collections::BTreeMap;

pub type Trit = i8;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum MemoryError {
    InvalidAddress,
    InvalidTrit,
    MissingParticle,
    NonMonotoneTick,
    MalformedRecord,
    CorruptHistory,
}

pub fn valid_address(address: &str) -> bool {
    !address.is_empty() && address.bytes().all(|v| matches!(v, b'-' | b'0' | b'+'))
}

// Asolaria's ternary address has arbitrary length: 3^depth POSSIBLE identities.
// Existence of an address does not mean a physical independent state was allocated.
pub fn base3_address(mut ordinal: usize, depth: usize) -> Result<String, MemoryError> {
    if depth == 0 {
        return Err(MemoryError::InvalidAddress);
    }
    let mut characters = vec![b'-'; depth];
    for c in characters.iter_mut().rev() {
        *c = match ordinal % 3 { 0 => b'-', 1 => b'0', _ => b'+' };
        ordinal /= 3;
    }
    if ordinal != 0 {
        return Err(MemoryError::InvalidAddress);
    }
    String::from_utf8(characters).map_err(|_| MemoryError::InvalidAddress)
}

fn balanced(value: i32) -> Trit {
    ((value + 1).rem_euclid(3) - 1) as Trit
}

fn rotate(state: Trit, delta: u64) -> Trit {
    balanced(i32::from(state) + (delta % 3) as i32)
}

pub fn source_seed(address: &str) -> Result<Trit, MemoryError> {
    if !valid_address(address) {
        return Err(MemoryError::InvalidAddress);
    }
    let mut sum = 0i32;
    for digit in address.bytes() {
        let value = match digit { b'-' => -1, b'0' => 0, b'+' => 1, _ => unreachable!() };
        sum = balanced(sum + value).into();
    }
    Ok(sum as Trit)
}

/// A baseline for each address and tick with no external observation.
/// Its seed and evolution are reconstructed from address+tick, not independent history.
pub fn virtual_state(address: &str, tick: u64) -> Result<Trit, MemoryError> {
    Ok(rotate(source_seed(address)?, tick))
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Note {
    pub tick: u64,
    pub input: Trit,
    pub before: Trit,
    pub after: Trit,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParticleMemory {
    pub address: String,
    pub notes: Vec<Note>,
}

impl ParticleMemory {
    fn new(address: &str) -> Result<Self, MemoryError> {
        source_seed(address)?;
        Ok(Self { address: address.to_string(), notes: Vec::new() })
    }

    /// Replay every retained source input at the correct time.
    pub fn recall(&self, tick: u64) -> Result<Trit, MemoryError> {
        let mut state = source_seed(&self.address)?;
        let mut time = 0u64;
        let mut prev = None;
        for note in &self.notes {
            if let Some(previous) = prev {
                if note.tick <= previous {
                    return Err(MemoryError::CorruptHistory);
                }
            }
            if note.tick > tick {
                break;
            }
            state = rotate(state, note.tick - time);
            if state != note.before || !(-1..=1).contains(&note.input) {
                return Err(MemoryError::CorruptHistory);
            }
            state = balanced(i32::from(state) + i32::from(note.input));
            if state != note.after {
                return Err(MemoryError::CorruptHistory);
            }
            time = note.tick;
            prev = Some(note.tick);
        }
        Ok(rotate(state, tick - time))
    }

    fn record(&mut self, tick: u64, input: Trit) -> Result<Note, MemoryError> {
        if !(-1..=1).contains(&input) {
            return Err(MemoryError::InvalidTrit);
        }
        if self.notes.last().is_some_and(|last| tick <= last.tick) {
            return Err(MemoryError::NonMonotoneTick);
        }
        let before = self.recall(tick)?;
        let after = balanced(i32::from(before) + i32::from(input));
        let note = Note { tick, input, before, after };
        self.notes.push(note.clone());
        Ok(note)
    }
}

/// One logical memory per addressed particle. Only changed histories need storage.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Ledger {
    particles: BTreeMap<String, ParticleMemory>,
}

impl Ledger {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn materialized(&self) -> usize {
        self.particles.len()
    }
    pub fn note_count(&self) -> usize {
        self.particles.values().map(|p| p.notes.len()).sum()
    }
    pub fn notes_for(&self, address: &str) -> Option<&[Note]> {
        self.particles.get(address).map(|p| p.notes.as_slice())
    }
    pub fn state(&self, address: &str, tick: u64) -> Result<Trit, MemoryError> {
        match self.particles.get(address) {
            Some(particle) => particle.recall(tick),
            None => virtual_state(address, tick),
        }
    }
    pub fn observe(&mut self, address: &str, tick: u64, input: Trit) -> Result<Note, MemoryError> {
        if !valid_address(address) { return Err(MemoryError::InvalidAddress); }
        let particle = self.particles.entry(address.to_string())
            .or_insert(ParticleMemory::new(address)?);
        particle.record(tick, input)
    }
    pub fn save_text(&self) -> String {
        let mut result = String::from("ASOLARIA-PARTICLE-LEDGER-V1\n");
        for (address, particle) in &self.particles {
            result.push_str(&format!("P|{address}\n"));
            for note in &particle.notes {
                result.push_str(&format!("E|{address}|{}|{}|{}|{}\n",
                    note.tick, note.input, note.before, note.after));
            }
        }
        result
    }
    /// Strict independent replay from serialized actual memory events.
    /// Does not authenticate origins: owner-authored coherent forgeries need external signer.
    pub fn load_text(source: &str) -> Result<Self, MemoryError> {
        let mut lines = source.lines();
        if lines.next() != Some("ASOLARIA-PARTICLE-LEDGER-V1") {
            return Err(MemoryError::MalformedRecord);
        }
        let mut ledger = Self::new();
        for line in lines {
            let fields: Vec<_> = line.split('|').collect();
            match fields.as_slice() {
                ["P", address] => {
                    if ledger.particles.contains_key(*address) {
                        return Err(MemoryError::MalformedRecord);
                    }
                    ledger.particles.insert((*address).to_string(), ParticleMemory::new(address)?);
                }
                ["E", address, tick, input, before, after] => {
                    if !ledger.particles.contains_key(*address) {
                        return Err(MemoryError::MissingParticle);
                    }
                    let tick = tick.parse::<u64>().map_err(|_| MemoryError::MalformedRecord)?;
                    let input = input.parse::<Trit>().map_err(|_| MemoryError::MalformedRecord)?;
                    let before = before.parse::<Trit>().map_err(|_| MemoryError::MalformedRecord)?;
                    let after = after.parse::<Trit>().map_err(|_| MemoryError::MalformedRecord)?;
                    let reconstructed = ledger.particles.get_mut(*address)
                        .ok_or(MemoryError::MissingParticle)?.record(tick, input)?;
                    if (reconstructed.before, reconstructed.after) != (before, after) {
                        return Err(MemoryError::CorruptHistory);
                    }
                }
                _ => return Err(MemoryError::MalformedRecord),
            }
        }
        Ok(ledger)
    }
}

/// A deterministic sensor-input fixture, *not observed telescope photons*.
/// 81 separately addressed memories, 27 time-separated events each.
pub fn synthetic_memory_fixture() -> Result<Ledger, MemoryError> {
    let mut ledger = Ledger::new();
    for tick in 0..27u64 {
        for ordinal in 0..81usize {
            let addr = base3_address(ordinal, 4)?;
            let input = [-1, 0, 1][((ordinal as u64 + 2 * tick) % 3) as usize];
            ledger.observe(&addr, 3 * tick + 1, input)?;
        }
    }
    Ok(ledger)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn each_particle_remembers_separate_history_across_time() {
        let a = base3_address(0,4).unwrap();
        let b = base3_address(1,4).unwrap();
        let mut ledger = Ledger::new();
        let b0 = ledger.state(&b,15).unwrap();
        ledger.observe(&a,2,1).unwrap();
        ledger.observe(&a,10,-1).unwrap();
        ledger.observe(&b,3,-1).unwrap();
        assert_eq!(ledger.state(&b,2).unwrap(),virtual_state(&b,2).unwrap());
        assert_ne!(ledger.state(&b,15).unwrap(),b0);
        assert_eq!(ledger.notes_for(&a).unwrap().len(),2);
        assert_eq!(ledger.notes_for(&b).unwrap().len(),1);
        assert_eq!(ledger.state(&a,100).unwrap(),Ledger::load_text(&ledger.save_text()).unwrap().state(&a,100).unwrap());
    }
    #[test]
    fn virtual_not_equal_to_no_memory_and_no_fake_mass_allocation() {
        let addr="+".repeat(180);
        assert_eq!(virtual_state(&addr,0).unwrap(),virtual_state(&addr,3).unwrap());
        assert_ne!(virtual_state(&addr,0).unwrap(),virtual_state(&addr,1).unwrap());
        let mut ledger=Ledger::new();
        assert_eq!(ledger.materialized(),0);
        ledger.observe(&addr,10,1).unwrap();
        assert_eq!(ledger.materialized(),1);
        assert_eq!(ledger.notes_for(&addr).unwrap().len(),1);
        assert_eq!(ledger.state(&addr,10).unwrap(),Ledger::load_text(&ledger.save_text()).unwrap().state(&addr,10).unwrap());
    }
    #[test]
    fn every_one_of_81_remembers_27_observations() {
        let ledger=synthetic_memory_fixture().unwrap();
        assert_eq!(ledger.materialized(),81);
        assert_eq!(ledger.note_count(),2187);
        let recovered=Ledger::load_text(&ledger.save_text()).unwrap();
        assert_eq!(ledger,recovered);
        for ordinal in 0..81 {
            let addr=base3_address(ordinal,4).unwrap();
            assert_eq!(ledger.notes_for(&addr).unwrap().len(),27);
            for tick in [0u64,1,3,7,22,81,200] {
                assert_eq!(ledger.state(&addr,tick),recovered.state(&addr,tick));
            }
        }
    }
    #[test]
    fn corruptions_and_missing_original_are_rejected() {
        let mut ledger=Ledger::new();
        assert!(ledger.observe("bad",1,1).is_err());
        assert!(ledger.observe("-0+",1,9).is_err());
        let note=ledger.observe("-0+",1,1).unwrap();
        assert!(ledger.observe("-0+",1,0).is_err());
        let original=ledger.save_text();
        let mutated=original.replace(
          &format!("|{}|{}|{}\n",note.input,note.before,note.after),
          &format!("|{}|{}|{}\n",note.input,note.before,-note.after));
        assert_ne!(mutated,original);
        assert!(Ledger::load_text(&mutated).is_err());
        assert!(Ledger::load_text(&original.replace("P|-0+\n","")).is_err());
        assert!(Ledger::load_text(&original.replace("E|-0+|1|","E|-0+|wrong|")).is_err());
    }
}
