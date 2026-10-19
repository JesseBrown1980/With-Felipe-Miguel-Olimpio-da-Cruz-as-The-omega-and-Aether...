//! The world as data: nine regions, nine rivers, and the integer projection of their positions.
//!
//! The four biomes come from Relic's Aether Map with the positions that map proposes. The 3D audit
//! tags those positions INFERIDO (a design synthesis, not canon geometry), so they are NAMED here,
//! not MEASURED. The five other regions are additions of this game and their positions are STORY.
//! The graph is fixed: it is data in this file, not something a player can edit.

use std::collections::VecDeque;

pub const NREG: usize = 9;
pub const NAG: usize = 27;

/// One region's fixed description and starting fields.
pub struct RegionDef {
    pub id: u8,
    /// Snake-case name used in rows.
    pub name: &'static str,
    /// The short form `go` accepts.
    pub short: &'static str,
    /// Display title.
    pub title: &'static str,
    pub pos: (i32, i32, i32),
    pub glyph: char,
    /// The secret this region holds (the lead's numbering of the nine measured results).
    pub secret: u8,
    /// Starting `coherence`, `energy`, `risk`. Population starts as the three home agents.
    pub init: (u32, u32, u32),
    /// Tag on the position: NAMED for Relic's four biomes, STORY for the rest.
    pub pos_tag: &'static str,
}

/// Regions in chapter order: region `i` is chapter `i + 1`.
pub static REGIONS: [RegionDef; NREG] = [
    RegionDef {
        id: 0,
        name: "hollow_strata",
        short: "hollow",
        title: "Hollow Strata",
        pos: (-5, -2, -2),
        glyph: '#',
        secret: 1,
        init: (60, 40, 30),
        pos_tag: "NAMED",
    },
    RegionDef {
        id: 1,
        name: "flow_channel",
        short: "flow",
        title: "Flow Channel",
        pos: (0, 1, 0),
        glyph: '~',
        secret: 2,
        init: (70, 60, 20),
        pos_tag: "NAMED",
    },
    RegionDef {
        id: 2,
        name: "prime_cylinders",
        short: "cylinders",
        title: "Prime Cylinders",
        pos: (-3, 0, 3),
        glyph: '|',
        secret: 3,
        init: (50, 30, 25),
        pos_tag: "STORY",
    },
    RegionDef {
        id: 3,
        name: "hotel_of_infinite_rooms",
        short: "hotel",
        title: "Hotel of Infinite Rooms",
        pos: (3, 2, -3),
        glyph: 'H',
        secret: 5,
        init: (80, 20, 10),
        pos_tag: "STORY",
    },
    RegionDef {
        id: 4,
        name: "rupture_zone",
        short: "rupture",
        title: "Rupture Zone",
        pos: (4, -1, 1),
        glyph: '*',
        secret: 7,
        init: (30, 50, 60),
        pos_tag: "NAMED",
    },
    RegionDef {
        id: 5,
        name: "crystalline_reach",
        short: "crystal",
        title: "Crystalline Reach",
        pos: (0, 3, 2),
        glyph: '^',
        secret: 6,
        init: (90, 30, 10),
        pos_tag: "NAMED",
    },
    RegionDef {
        id: 6,
        name: "cube_27",
        short: "cube",
        title: "27-Cube Chamber",
        pos: (0, 0, 0),
        glyph: '@',
        secret: 4,
        init: (100, 27, 0),
        pos_tag: "STORY",
    },
    RegionDef {
        id: 7,
        name: "white_field",
        short: "white",
        title: "White Field",
        pos: (-2, -3, 3),
        glyph: '_',
        secret: 8,
        init: (40, 10, 40),
        pos_tag: "STORY",
    },
    RegionDef {
        id: 8,
        name: "blue_star",
        short: "star",
        title: "Blue Star",
        pos: (2, 4, -1),
        glyph: '*',
        secret: 9,
        init: (50, 0, 50),
        pos_tag: "STORY",
    },
];

/// A directed edge along which energy flows.
pub struct River {
    pub from: u8,
    pub to: u8,
    pub label: &'static str,
    pub tag: &'static str,
}

/// The nine rivers. The first four are the edges of Relic's map with the map's own labels.
pub static RIVERS: [River; 9] = [
    River {
        from: 0,
        to: 1,
        label: "cubes/decomposition feed emitter lane",
        tag: "NAMED",
    },
    River {
        from: 1,
        to: 4,
        label: "emitter flow enters collision discipline",
        tag: "NAMED",
    },
    River {
        from: 4,
        to: 5,
        label: "collision/search maps to prism-comb law",
        tag: "NAMED",
    },
    River {
        from: 5,
        to: 0,
        label: "0-loss transcode frames cube absorption boundary",
        tag: "NAMED",
    },
    River {
        from: 2,
        to: 6,
        label: "the towers are read mod 27",
        tag: "STORY",
    },
    River {
        from: 6,
        to: 3,
        label: "residues nest outward, level by level",
        tag: "STORY",
    },
    River {
        from: 3,
        to: 1,
        label: "every PID gets a room",
        tag: "STORY",
    },
    River {
        from: 7,
        to: 0,
        label: "the slice is absorbed",
        tag: "STORY",
    },
    River {
        from: 5,
        to: 8,
        label: "the prism opens on the star",
        tag: "STORY",
    },
];

/// The four Omega 5.3 fields of a region, each in `0..=100`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Fields {
    pub coherence: u32,
    pub energy: u32,
    pub population: u32,
    pub risk: u32,
}

/// Starting fields: the table of the design, with population the three home agents.
pub fn initial_fields() -> [Fields; NREG] {
    let mut out = [Fields {
        coherence: 0,
        energy: 0,
        population: 3,
        risk: 0,
    }; NREG];
    for (f, r) in out.iter_mut().zip(REGIONS.iter()) {
        f.coherence = r.init.0;
        f.energy = r.init.1;
        f.risk = r.init.2;
    }
    out
}

pub fn chapter_of_region(r: u8) -> u8 {
    r + 1
}

pub fn secret_of_region(r: u8) -> u8 {
    REGIONS[r as usize].secret
}

pub fn region_of_secret(secret: u8) -> Option<u8> {
    REGIONS.iter().find(|r| r.secret == secret).map(|r| r.id)
}

/// Regions that share a river with `r`, in either direction, ascending.
pub fn neighbours(r: u8) -> Vec<u8> {
    let mut v: Vec<u8> = RIVERS
        .iter()
        .filter_map(|e| {
            if e.from == r {
                Some(e.to)
            } else if e.to == r {
                Some(e.from)
            } else {
                None
            }
        })
        .collect();
    v.sort_unstable();
    v.dedup();
    v
}

/// Shortest path over the undirected river graph, breadth-first in ascending id order, excluding
/// `from` and including `to`. Empty when `from == to`.
pub fn route(from: u8, to: u8) -> Vec<u8> {
    if from == to {
        return Vec::new();
    }
    let mut parent = [u8::MAX; NREG];
    let mut seen = [false; NREG];
    let mut q = VecDeque::new();
    seen[from as usize] = true;
    q.push_back(from);
    while let Some(u) = q.pop_front() {
        for v in neighbours(u) {
            if !seen[v as usize] {
                seen[v as usize] = true;
                parent[v as usize] = u;
                if v == to {
                    let mut path = vec![to];
                    let mut cur = to;
                    while parent[cur as usize] != from {
                        cur = parent[cur as usize];
                        path.push(cur);
                    }
                    path.reverse();
                    return path;
                }
                q.push_back(v);
            }
        }
    }
    Vec::new()
}

/// Why a region name did not resolve.
#[derive(Debug, PartialEq, Eq)]
pub enum NameError {
    NotFound,
    Ambiguous(Vec<u8>),
}

/// Resolve a region by id, short form, snake name, or unique prefix of either.
pub fn region_by_name(s: &str) -> Result<u8, NameError> {
    let s = s.trim().to_lowercase();
    if s.is_empty() {
        return Err(NameError::NotFound);
    }
    if let Ok(n) = s.parse::<usize>() {
        return if n < NREG {
            Ok(n as u8)
        } else {
            Err(NameError::NotFound)
        };
    }
    if let Some(r) = REGIONS.iter().find(|r| r.short == s || r.name == s) {
        return Ok(r.id);
    }
    let hits: Vec<u8> = REGIONS
        .iter()
        .filter(|r| r.short.starts_with(&s) || r.name.starts_with(&s))
        .map(|r| r.id)
        .collect();
    match hits.len() {
        0 => Err(NameError::NotFound),
        1 => Ok(hits[0]),
        _ => Err(NameError::Ambiguous(hits)),
    }
}

/// Grid size of the crystal map.
pub const MAP_COLS: i32 = 40;
pub const MAP_ROWS: i32 = 17;

/// Integer isometric projection: `col = 20 + 3(x - z)`, `row = 8 + (x + z) - 2y`.
/// Scale 3 on columns and 1 on rows reads as isometric in a monospace font.
pub fn project(pos: (i32, i32, i32)) -> (i32, i32) {
    let (x, y, z) = pos;
    (20 + 3 * (x - z), 8 + (x + z) - 2 * y)
}

/// Integer Bresenham line between two grid cells, inclusive of both ends.
pub fn bresenham(a: (i32, i32), b: (i32, i32)) -> Vec<(i32, i32)> {
    let (mut x0, mut y0) = a;
    let (x1, y1) = b;
    let dx = (x1 - x0).abs();
    let dy = -(y1 - y0).abs();
    let sx = if x0 < x1 { 1 } else { -1 };
    let sy = if y0 < y1 { 1 } else { -1 };
    let mut err = dx + dy;
    let mut out = Vec::new();
    loop {
        out.push((x0, y0));
        if x0 == x1 && y0 == y1 {
            break;
        }
        let e2 = 2 * err;
        if e2 >= dy {
            err += dy;
            x0 += sx;
        }
        if e2 <= dx {
            err += dx;
            y0 += sy;
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn there_are_nine_regions_nine_rivers_and_twenty_seven_agents() {
        assert_eq!(REGIONS.len(), 9);
        assert_eq!(RIVERS.len(), 9);
        assert_eq!(NAG, 27);
        assert_eq!(NAG, 3 * NREG);
        for (i, r) in REGIONS.iter().enumerate() {
            assert_eq!(r.id as usize, i);
            assert_eq!(chapter_of_region(r.id) as usize, i + 1);
        }
        let mut secrets: Vec<u8> = REGIONS.iter().map(|r| r.secret).collect();
        secrets.sort_unstable();
        assert_eq!(secrets, (1..=9).collect::<Vec<u8>>());
        for s in 1..=9u8 {
            assert_eq!(secret_of_region(region_of_secret(s).unwrap()), s);
        }
    }

    #[test]
    fn relics_four_biomes_sit_where_the_map_puts_them() {
        assert_eq!(REGIONS[0].pos, (-5, -2, -2));
        assert_eq!(REGIONS[1].pos, (0, 1, 0));
        assert_eq!(REGIONS[4].pos, (4, -1, 1));
        assert_eq!(REGIONS[5].pos, (0, 3, 2));
        for id in [0usize, 1, 4, 5] {
            assert_eq!(REGIONS[id].pos_tag, "NAMED");
        }
        // the 27-cube chamber is the free centre
        assert_eq!(REGIONS[6].pos, (0, 0, 0));
    }

    #[test]
    fn projection_matches_the_design_table_and_every_region_has_its_own_cell() {
        let want = [
            (11, 5),
            (20, 6),
            (2, 8),
            (38, 4),
            (29, 15),
            (14, 4),
            (20, 8),
            (5, 15),
            (29, 1),
        ];
        let mut cells = std::collections::BTreeSet::new();
        for (r, w) in REGIONS.iter().zip(want) {
            let c = project(r.pos);
            assert_eq!(c, w, "{}", r.name);
            assert!((0..MAP_COLS).contains(&c.0) && (0..MAP_ROWS).contains(&c.1));
            assert!(cells.insert(c), "two regions share cell {c:?}");
        }
    }

    #[test]
    fn the_graph_is_connected_and_routes_are_shortest() {
        for a in 0..NREG as u8 {
            for b in 0..NREG as u8 {
                let p = route(a, b);
                if a == b {
                    assert!(p.is_empty());
                } else {
                    assert_eq!(*p.last().unwrap(), b, "no route {a} -> {b}");
                    assert!(p.len() < NREG);
                    // every step is an edge
                    let mut cur = a;
                    for s in &p {
                        assert!(neighbours(cur).contains(s));
                        cur = *s;
                    }
                }
            }
        }
        assert_eq!(route(0, 4), vec![1, 4]);
        assert_eq!(route(2, 3), vec![6, 3]);
    }

    #[test]
    fn gating_travel_by_edges_alone_would_deadlock_the_chapter_order() {
        // After the Flow Channel (chapter 2) the next chapter is the Prime Cylinders. They share no
        // river, so `go` must reach any unlocked region, not only a neighbour.
        assert!(!neighbours(1).contains(&2));
        // and the only neighbour of the cylinders is the cube, which is chapter 7
        assert_eq!(neighbours(2), vec![6]);
        assert_eq!(chapter_of_region(6), 7);
    }

    #[test]
    fn names_resolve_by_id_short_name_and_unique_prefix() {
        assert_eq!(region_by_name("hollow"), Ok(0));
        assert_eq!(region_by_name("Flow_Channel"), Ok(1));
        assert_eq!(region_by_name("6"), Ok(6));
        assert_eq!(region_by_name("rup"), Ok(4));
        assert_eq!(region_by_name("star"), Ok(8));
        assert_eq!(region_by_name("hotel"), Ok(3));
        assert!(matches!(region_by_name("c"), Err(NameError::Ambiguous(_))));
        assert_eq!(region_by_name("nowhere"), Err(NameError::NotFound));
        assert_eq!(region_by_name("9"), Err(NameError::NotFound));
        assert_eq!(region_by_name(""), Err(NameError::NotFound));
    }

    #[test]
    fn bresenham_is_integer_and_hits_both_ends() {
        let a = project(REGIONS[1].pos);
        let b = project(REGIONS[4].pos);
        let line = bresenham(a, b);
        assert_eq!(line.first(), Some(&a));
        assert_eq!(line.last(), Some(&b));
        // consecutive cells touch
        for w in line.windows(2) {
            assert!((w[0].0 - w[1].0).abs() <= 1 && (w[0].1 - w[1].1).abs() <= 1);
        }
        assert_eq!(bresenham((3, 3), (3, 3)), vec![(3, 3)]);
    }
}
