//! Registry slot 26, `Q-SHARD-CUBE-v1` (registry line 32, "shard-quant-cube"; atlas line 155:
//! "room/shard vectors folded through JL, Turbo, Polar and Triple into a cube descriptor").
//!
//! Integer port of the shard fold in `room-rotor/hyperbehcs-d-drive-10000-room-rotor.mjs` of
//! Asolaria-hermes-work @ 84f0b20 (blob 8651c542), cited as `rotor:<line>`: the room lanes and
//! shards (18-39, 143-145, 178-194, 216-230) and `quantReceiptForShard`'s vector, seed and
//! target dimension (281-304). The four codecs are registry slots 9-12, ported bit for bit in the
//! sibling crate `quant_hyperbehcs`.
//!
//! Not ported: `buildQuantizedSubstrateReceipt` (`rotor:13-16` requires it from
//! `src/behcs/hyperbehcsQuantSubstrate.js`), which shapes the receipt object and computes its
//! five fingerprints. No branch tip of the owner's reachable repositories and no commit of the
//! git stores on this disk holds that path (PROVENANCE.md, "Not brought in"). The rest of the
//! rotor writes JSON descriptors to `D:\` and is not on the quant path.

use std::collections::HashMap;

/// `TASK_ID` (`rotor:18`).
pub const TASK_ID: &str = "HYP-D-10000-ROOM-ROTOR";
/// `DEFAULT_ROOM_COUNT` (`rotor:22`).
pub const DEFAULT_ROOM_COUNT: u64 = 10000;
/// `DEFAULT_SHARD_SIZE` (`rotor:23`).
pub const DEFAULT_SHARD_SIZE: u64 = 100;
/// The `targetDimension` the rotor passes for every shard (`rotor:300`).
pub const TARGET_DIMENSION: u64 = 4;

/// `LANES` (`rotor:26-39`).
pub const LANES: [&str; 12] = [
    "carry_z",
    "quant",
    "reflex",
    "gulp",
    "super_gulp",
    "gc",
    "gnn",
    "shannon",
    "white_room",
    "minting",
    "watcher",
    "indexer",
];

/// The fields of a room (`rotor:178-194`) that the shard fold reads.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Room {
    /// `room_index`.
    pub index: u64,
    /// `shard_id`: `shard-${String(shard).padStart(4, "0")}`.
    pub shard_id: String,
    /// `lane`: `LANES[index % LANES.length]`.
    pub lane: &'static str,
}

/// `roomShard(index, shardSize)` (`rotor:143-145`).
pub fn room_shard(index: u64, shard_size: u64) -> u64 {
    index / shard_size
}

/// `shard-${String(shard).padStart(4, "0")}` (`rotor:188`).
pub fn shard_id(shard: u64) -> String {
    format!("shard-{shard:04}")
}

/// `buildRooms` (`rotor:216-221`), keeping the fields the fold reads. The rotor clamps its
/// arguments first (`rotor:548-549`: room count 1..=100000, shard size 1..=1000); `shard_size`
/// must be at least 1 here.
pub fn rooms(room_count: u64, shard_size: u64) -> Vec<Room> {
    (0..room_count)
        .map(|index| Room {
            index,
            shard_id: shard_id(room_shard(index, shard_size)),
            lane: LANES[(index % LANES.len() as u64) as usize],
        })
        .collect()
}

/// `groupByShard` (`rotor:223-230`): shards in first-seen order, rooms in input order. The
/// `Map` keyed by shard id is a `HashMap` from id to position in the ordered `Vec`.
pub fn group_by_shard(rooms: Vec<Room>) -> Vec<(String, Vec<Room>)> {
    let mut groups: Vec<(String, Vec<Room>)> = Vec::new();
    let mut position: HashMap<String, usize> = HashMap::new();
    for room in rooms {
        match position.get(&room.shard_id) {
            Some(&i) => groups[i].1.push(room),
            None => {
                position.insert(room.shard_id.clone(), groups.len());
                groups.push((room.shard_id.clone(), vec![room]));
            }
        }
    }
    groups
}

/// `Number(shardId.replace(/[^0-9]/g, "")) || 0` (`rotor:289`).
pub fn shard_number(shard_id: &str) -> u64 {
    shard_id
        .bytes()
        .filter(u8::is_ascii_digit)
        .fold(0u64, |n, d| n * 10 + u64::from(d - b'0'))
}

/// The eight-value vector of `quantReceiptForShard` (`rotor:282-291`): room count, the
/// `carry_z`, `quant`, `gc`, `gnn` and `shannon` lane counts, the shard number and the sum of room
/// indices mod 100000.
pub fn quant_vector(shard_id: &str, rows: &[Room]) -> [u64; 8] {
    let lane = |name: &str| rows.iter().filter(|r| r.lane == name).count() as u64;
    [
        rows.len() as u64,
        lane("carry_z"),
        lane("quant"),
        lane("gc"),
        lane("gnn"),
        lane("shannon"),
        shard_number(shard_id),
        rows.iter().map(|r| r.index).sum::<u64>() % 100000,
    ]
}

/// The `seed` the rotor passes for a shard, `${TASK_ID}:${shardId}` (`rotor:301`).
pub fn quant_seed(shard_id: &str) -> String {
    format!("{TASK_ID}:{shard_id}")
}
