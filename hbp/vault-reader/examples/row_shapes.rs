#![forbid(unsafe_code)]
//! `row_shapes <root> [<corpus/WRITERS.hbp> <tree>]`: every distinct `.hbi` row shape under
//! `<root>` (tag plus ordered keys, vendored `parse_row`), with its row count and first
//! `file:line`; given the writers file, also the number of files carrying the shape and the
//! writers of those files (`writer=` of their `HBIWRITER` rows). Read-only.

use asolaria_hbi_hbp::{encode_row, parse_row};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

fn walk(dir: &Path, rel: &str, out: &mut Vec<(String, std::path::PathBuf)>) {
    let mut entries: Vec<_> = std::fs::read_dir(dir)
        .expect("read_dir")
        .map(|e| e.expect("entry"))
        .collect();
    entries.sort_by_key(|e| e.file_name());
    for e in entries {
        let name = e.file_name().to_string_lossy().into_owned();
        let child = if rel.is_empty() {
            name.clone()
        } else {
            format!("{rel}/{name}")
        };
        let ft = e.file_type().expect("file_type");
        if ft.is_dir() && name != ".git" {
            walk(&e.path(), &child, out);
        } else if ft.is_file() && name.ends_with(".hbi") {
            out.push((child, e.path()));
        }
    }
}

/// `HBIWRITER|tree=|hbi=|..|writer=` rows of `corpus/WRITERS.hbp` for one tree: hbi -> writer.
fn writers_of(path: &str, tree: &str) -> BTreeMap<String, String> {
    let text = std::fs::read_to_string(path).expect("writers file");
    let mut out = BTreeMap::new();
    for line in text.lines() {
        let (tag, fields) = parse_row(line);
        let get = |k: &str| fields.iter().find(|(a, _)| a == k).map(|(_, v)| v.clone());
        if tag == "HBIWRITER" && get("tree").as_deref() == Some(tree) {
            if let (Some(h), Some(w)) = (get("hbi"), get("writer")) {
                out.insert(h, w);
            }
        }
    }
    out
}

struct Shape {
    rows: u64,
    first: String,
    files: BTreeSet<String>,
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 2 && args.len() != 4 {
        eprintln!("usage: row_shapes <root> [<corpus/WRITERS.hbp> <tree>]");
        std::process::exit(2);
    }
    let writers = (args.len() == 4).then(|| writers_of(&args[2], &args[3]));
    let mut files = Vec::new();
    walk(Path::new(&args[1]), "", &mut files);
    files.sort();
    let mut shapes: BTreeMap<String, Shape> = BTreeMap::new();
    let mut binary = Vec::new();
    for (rel, real) in &files {
        let data = std::fs::read(real).expect("read");
        let Ok(text) = std::str::from_utf8(&data) else {
            binary.push(rel.clone());
            continue;
        };
        for (i, piece) in text.split('\n').enumerate() {
            let line = piece.strip_suffix('\r').unwrap_or(piece);
            if line.is_empty() {
                continue;
            }
            let (tag, fields) = parse_row(line);
            let keys: Vec<&str> = fields.iter().map(|(k, _)| k.as_str()).collect();
            let shape = format!("{tag}|{}", keys.join(","));
            let e = shapes.entry(shape).or_insert_with(|| Shape {
                rows: 0,
                first: format!("{rel}:{}", i + 1),
                files: BTreeSet::new(),
            });
            e.rows += 1;
            e.files.insert(rel.clone());
        }
    }
    // the writers of the files a shape occurs in (corpus/WRITERS.hbp), `;`-joined
    let writer_list = |fs: &mut dyn Iterator<Item = &String>| -> Option<String> {
        writers.as_ref().map(|w| {
            let set: BTreeSet<&str> = fs
                .map(|f| w.get(f).map_or("not_listed", |s| s.as_str()))
                .collect();
            set.into_iter().collect::<Vec<_>>().join(";")
        })
    };
    for (shape, s) in &shapes {
        let (tag, keys) = shape.split_once('|').unwrap_or((shape, ""));
        let rows = s.rows.to_string();
        let nfiles = s.files.len().to_string();
        let mut f: Vec<(&str, &str)> = vec![("tag", tag), ("keys", keys), ("rows", &rows)];
        let w = writer_list(&mut s.files.iter());
        if let Some(w) = &w {
            f.push(("files", &nfiles));
            f.push(("first", &s.first));
            f.push(("writers", w));
        } else {
            f.push(("first", &s.first));
        }
        println!("{}", encode_row("HBISHAPE", &f));
    }
    for b in &binary {
        let w = writer_list(&mut std::iter::once(b));
        let mut f: Vec<(&str, &str)> = vec![("binary", b)];
        if let Some(w) = &w {
            f.push(("writers", w));
        }
        println!("{}", encode_row("HBISHAPE", &f));
    }
    println!(
        "{}",
        encode_row(
            "HBISHAPETOTAL",
            &[
                ("hbi", &files.len().to_string()),
                ("shapes", &shapes.len().to_string()),
                ("binary", &binary.len().to_string())
            ]
        )
    );
}
