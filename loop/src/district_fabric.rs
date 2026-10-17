//! District fabric: Brown-Hilbert room addressing and HBP room descriptors (bigpickle district-fabric.mjs:28-186).
//!
//! The filesystem build (`mkdirSync`/`writeFileSync` in `createDistrict`/`createAllDistricts`,
//! district-fabric.mjs:146-186) is the integrator's lane; this module brings the pure pieces:
//! `hilbert_xy`, `room_coords`, `room_pid`, the `DISTRICTS` catalog (room counts sum to 10,000),
//! `supervisor_pid`, and `room_descriptor_row` (the per-room `ROOM.hbp` row), each taking the
//! timestamp as a parameter so the row is deterministic.

use crate::sha::{sha16, sha256_hex, sha8};

/// `(x, y)` for a 1D Hilbert index.
pub struct Xy {
    pub x: i64,
    pub y: i64,
}

/// Brown-Hilbert d2xy (district-fabric.mjs:61-74). Upstream's `1 & (t/2)` / `Math.floor(t/4)` act on
/// non-negative integers via ToInt32, reproduced here with integer division (inputs stay below 2^31).
pub fn hilbert_xy(n: i64, d: i64) -> Xy {
    let mut t = d;
    let mut x = 0i64;
    let mut y = 0i64;
    let mut s = 1i64;
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
        s *= 2;
    }
    Xy { x, y }
}

/// The six cube-tuple axes (district-fabric.mjs:36-42).
pub const TUPLE_WAVE: [&str; 6] = [
    "scout", "evidence", "executor", "fabric", "voice", "planner",
];
pub const TUPLE_PROTOCOL: [&str; 6] = ["bus", "usb", "adb", "direct-wire", "tailnet", "fabric"];
pub const TUPLE_SURFACE: [&str; 6] = ["dashboard", "canon", "viz", "agent", "device", "operator"];
pub const TUPLE_DIMENSION: [&str; 6] = ["G", "I", "O", "B", "S", "C"];
pub const TUPLE_BODY: [&str; 6] = [
    "operator",
    "organ",
    "citizen",
    "free-agent",
    "supervisor",
    "prof",
];

/// 60D+ coordinate derived from a PID (district-fabric.mjs:43-58).
pub struct RoomCoords {
    pub coord64: String,
    pub dims: u32,
    pub cp: u32,
    pub glyph: String,
    pub tuple: String,
}

/// Deterministic coordinate, codepoint, glyph token and cube tuple for a PID (district-fabric.mjs:43-58).
pub fn room_coords(pid: &str) -> RoomCoords {
    let h = sha256_hex(pid);
    let byte = |i: usize| -> u32 { u32::from_str_radix(&h[i * 2..i * 2 + 2], 16).expect("2 hex") };
    let cp = u32::from_str_radix(&h[0..3], 16).expect("3 hex") % 1024;
    let glyph = format!("cp{cp:04x}");
    let tuple = format!(
        "wave={}:protocol={}:surface={}:dim={}:body={}:shannon={}",
        TUPLE_WAVE[(byte(0) % 6) as usize],
        TUPLE_PROTOCOL[(byte(1) % 6) as usize],
        TUPLE_SURFACE[(byte(2) % 6) as usize],
        TUPLE_DIMENSION[(byte(3) % 6) as usize],
        TUPLE_BODY[(byte(4) % 6) as usize],
        byte(5) % 12,
    );
    RoomCoords {
        coord64: h,
        dims: 64,
        cp,
        glyph,
        tuple,
    }
}

/// Room PID for `idx` in `district` on the default 128 grid (district-fabric.mjs:77-81).
pub fn room_pid(district: &str, idx: u64) -> String {
    room_pid_grid(district, idx, 128)
}

/// Room PID with an explicit Hilbert grid size.
pub fn room_pid_grid(district: &str, idx: u64, grid_n: i64) -> String {
    let xy = hilbert_xy(grid_n, idx as i64);
    let h = sha16(&format!("room|{district}|{idx}|hilbert|{}|{}", xy.x, xy.y));
    format!(
        "BH.DISTRICT.{}.R{:05}.{}",
        district.to_uppercase(),
        idx,
        h.to_uppercase()
    )
}

/// One district catalog entry (district-fabric.mjs:85-92).
pub struct District {
    pub name: &'static str,
    pub kind: &'static str,
    pub role: &'static str,
    pub rooms: u64,
    pub cp: u32,
}

/// The district catalog; `rooms` sum to 10,000 (district-fabric.mjs:85-92).
pub const DISTRICTS: [District; 6] = [
    District {
        name: "rotator",
        kind: "pid-rotation",
        role: "revolver feed — rotate PIDs through rooms one-after-another",
        rooms: 2000,
        cp: 480,
    },
    District {
        name: "prism",
        kind: "dispatch-collect",
        role: "forward-prism dispatch + reverse-prism collect",
        rooms: 2000,
        cp: 576,
    },
    District {
        name: "engineering",
        kind: "build",
        role: "code/build/engineering rooms for real work",
        rooms: 2000,
        cp: 704,
    },
    District {
        name: "white-room",
        kind: "clean-mint",
        role: "clean-room mint — genius/mistake extraction from 0",
        rooms: 1500,
        cp: 800,
    },
    District {
        name: "gnn-feed",
        kind: "gnn-edge",
        role: "GNN edge rooms — forward + reverse-gain scoring",
        rooms: 1500,
        cp: 384,
    },
    District {
        name: "council",
        kind: "vote-review",
        role: "vote-quorum + review rooms — supervisor decisions",
        rooms: 1000,
        cp: 256,
    },
];

/// Sum of the catalog room counts (10,000 at scale 1).
pub fn total_default_rooms() -> u64 {
    DISTRICTS.iter().map(|d| d.rooms).sum()
}

/// Room count for a district at a given scale (district-fabric.mjs:147).
pub fn district_room_count(d: &District, scale: u64) -> u64 {
    d.rooms * scale
}

/// District supervisor PID (district-fabric.mjs:123).
pub fn supervisor_pid(name: &str) -> String {
    format!(
        "BH.SUPERVISOR.DISTRICT.{}.{}",
        name.to_uppercase(),
        sha16(&format!("sup|{name}")).to_uppercase()
    )
}

/// The per-room `ROOM.hbp` descriptor row (district-fabric.mjs:95-118 `writeRoomDescriptor`), with the
/// creation timestamp supplied by the caller so the row is deterministic.
pub fn room_descriptor_row(
    district: &str,
    idx: u64,
    pid: &str,
    band_cp: u32,
    created_ts: &str,
) -> String {
    let xy = hilbert_xy(256, (idx % 65536) as i64);
    let c = room_coords(pid);
    [
        "HBPv1".to_string(),
        "row=room_descriptor".to_string(),
        format!("pid={pid}"),
        format!("district={district}"),
        format!("idx={idx}"),
        "kind=micro-kernel".to_string(),
        format!("bh3d={},{}", xy.x, xy.y),
        format!("band_cp={band_cp}"),
        format!("cp={}", c.cp),
        format!("glyph={}", c.glyph),
        format!("dims={}", c.dims),
        format!("coord64={}", c.coord64),
        format!("tuple={}", c.tuple),
        "state=empty".to_string(),
        "inbox=inbox.hbp".to_string(),
        "outbox=outbox.hbp".to_string(),
        format!("created={created_ts}"),
        "json=0".to_string(),
        "runtime=0".to_string(),
        format!("row_hash={}", sha8(&format!("{pid}{district}{idx}"))),
    ]
    .join("|")
}
