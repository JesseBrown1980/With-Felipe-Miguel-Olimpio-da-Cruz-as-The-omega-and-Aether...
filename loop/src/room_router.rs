//! Project-room router: PID -> room, folder naming, and the rename-before-load swap plan
//! (bigpickle project-room-router.mjs:20-117). Pure planners; the filesystem rename is the caller's lane.

/// 10,000 rooms (project-room-router.mjs:20).
pub const ROOM_COUNT: u32 = 10000;

/// Deterministic PID -> room id (project-room-router.mjs:24-33) over the UTF-16 code units `charCodeAt`
/// reads, `>>> 0` keeping u32. `None` for an empty PID, where upstream throws `TypeError` (:25-27).
pub fn room_id_from_pid(pid_hex: &str) -> Option<u32> {
    if pid_hex.is_empty() {
        return None;
    }
    let mut acc: u32 = 0;
    for unit in pid_hex.encode_utf16() {
        acc = acc.wrapping_mul(31).wrapping_add(u32::from(unit));
    }
    Some(acc % ROOM_COUNT)
}

/// Codex-rotatable folder name for a room (project-room-router.mjs:37-44).
pub fn room_folder_name(room_id: u32, stem: &str, alphabet: &str) -> String {
    assert!(room_id < ROOM_COUNT, "roomFolderName: roomId out of range");
    format!("{stem}-{alphabet}-{room_id:04}")
}

/// The default folder stem.
pub const DEFAULT_STEM: &str = "omni-room";
/// The default alphabet label.
pub const DEFAULT_ALPHABET: &str = "behcs-256";

/// A room-swap plan (project-room-router.mjs:48-62). `Noop` when current equals next; otherwise a
/// rename (current folder -> next folder) followed by a load of the next room.
pub enum RoomSwapPlan {
    Noop {
        room_id: u32,
    },
    Swap {
        rename_from: String,
        rename_to: String,
        load_room_id: u32,
        load_folder: String,
    },
}

/// Plan a room swap (project-room-router.mjs:48-62).
pub fn plan_room_swap(current: u32, next: u32, stem: &str, alphabet: &str) -> RoomSwapPlan {
    if current == next {
        return RoomSwapPlan::Noop { room_id: current };
    }
    let from = room_folder_name(current, stem, alphabet);
    let to = room_folder_name(next, stem, alphabet);
    RoomSwapPlan::Swap {
        rename_from: from,
        rename_to: to.clone(),
        load_room_id: next,
        load_folder: to,
    }
}

/// A prism route plan (project-room-router.mjs:64-78).
pub struct PrismRoutePlan {
    pub room_id: u32,
    pub out_path: String,
    pub schema: String,
}

/// Plan a prism route for a room (project-room-router.mjs:64-78).
pub fn prism_route_plan(
    room_id: u32,
    prism_base_dir: &str,
    stem: &str,
    alphabet: &str,
) -> PrismRoutePlan {
    assert!(room_id < ROOM_COUNT, "prismRoutePlan: invalid roomId");
    let folder = room_folder_name(room_id, stem, alphabet);
    PrismRoutePlan {
        room_id,
        out_path: format!("{prism_base_dir}/{folder}/prism-out.ndjson"),
        schema: "bilateral-3d-join-v1".to_string(),
    }
}

/// Stateful router (project-room-router.mjs:82-117).
pub struct ProjectRoomRouter {
    pub active_room_id: u32,
    pub swap_count: u64,
    pub stem: String,
    pub alphabet: String,
}

impl Default for ProjectRoomRouter {
    fn default() -> Self {
        Self::new()
    }
}

impl ProjectRoomRouter {
    /// New router with the default stem and alphabet, active room 0.
    pub fn new() -> Self {
        Self {
            active_room_id: 0,
            swap_count: 0,
            stem: DEFAULT_STEM.to_string(),
            alphabet: DEFAULT_ALPHABET.to_string(),
        }
    }

    /// Room for a PID (project-room-router.mjs:114-116); `None` for an empty PID.
    pub fn room_for_pid(&self, pid_hex: &str) -> Option<u32> {
        room_id_from_pid(pid_hex)
    }

    /// Plan a swap to `next` and advance active room / swap count unless it is a noop
    /// (project-room-router.mjs:91-103).
    pub fn plan_swap_to(&mut self, next: u32) -> RoomSwapPlan {
        let plan = plan_room_swap(self.active_room_id, next, &self.stem, &self.alphabet);
        if !matches!(plan, RoomSwapPlan::Noop { .. }) {
            self.active_room_id = next;
            self.swap_count += 1;
        }
        plan
    }
}
