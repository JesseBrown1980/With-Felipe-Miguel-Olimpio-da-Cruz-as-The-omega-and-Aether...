// host8_rooms_probe: std-only, integer-only measurement of an 8-byte-room file.
// Room n holds stub(n) = splitmix64(n) as u64 little-endian at byte offset 8n.
// Build: rustc +1.81.0 -O --edition 2021 host8_rooms_probe.rs
// Run:   ./host8_rooms_probe <run_dir> "<rustc --version output>"

use std::fs::{self, File, OpenOptions};
use std::io::{self, Read, Write};
use std::os::unix::fs::{FileExt, OpenOptionsExt};
use std::path::{Path, PathBuf};
use std::time::Instant;

const N: u64 = 50_000_000;
const ROOM: u64 = 8;
const FILE_BYTES: u64 = N * ROOM;
const CHUNK: usize = 8 * 1024 * 1024;
const BLOCK: usize = 4096;
const RAM_READS: u64 = 20_000_000;
const WARM_READS: u64 = 2_000_000;
const COLD_READS: u64 = 20_000;
const THREAD_READS: u64 = 1_000_000;
const SEED_RAM: u64 = 1;
const SEED_WARM: u64 = 2;
const SEED_COLD: u64 = 3;
const SEED_THREAD_BASE: u64 = 100;

fn stub(n: u64) -> u64 {
    let mut z = n.wrapping_add(0x9E37_79B9_7F4A_7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

struct Lcg(u64);

impl Lcg {
    fn next_index(&mut self) -> u64 {
        self.0 = self
            .0
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        (self.0 >> 33) % N
    }
}

fn per_s(count: u64, ns: u128) -> u128 {
    if ns == 0 {
        0
    } else {
        (count as u128) * 1_000_000_000 / ns
    }
}

// MB = 10^6 bytes: bytes * 10^9 / ns / 10^6 = bytes * 1000 / ns.
fn mb_per_s(bytes: u64, ns: u128) -> u128 {
    if ns == 0 {
        0
    } else {
        (bytes as u128) * 1_000 / ns
    }
}

fn ns_per(count: u64, ns: u128) -> u128 {
    if count == 0 {
        0
    } else {
        ns / (count as u128)
    }
}

fn read_trim<P: AsRef<Path>>(p: P) -> String {
    fs::read_to_string(p)
        .map(|s| s.trim().to_string())
        .unwrap_or_default()
}

fn clean(s: &str) -> String {
    s.replace('|', "/").replace('\n', " ")
}

// "10.96" -> 1096 without floating point.
fn centi(s: &str) -> u64 {
    let mut parts = s.splitn(2, '.');
    let whole: u64 = parts.next().unwrap_or("0").parse().unwrap_or(0);
    let frac_s = parts.next().unwrap_or("0");
    let mut frac: u64 = 0;
    let mut digits = 0;
    for c in frac_s.chars().take(2) {
        frac = frac * 10 + c.to_digit(10).unwrap_or(0) as u64;
        digits += 1;
    }
    if digits == 1 {
        frac *= 10;
    }
    whole * 100 + frac
}

fn loadavg_x100() -> String {
    let text = read_trim("/proc/loadavg");
    let v: Vec<String> = text
        .split_whitespace()
        .take(3)
        .map(|t| centi(t).to_string())
        .collect();
    v.join(",")
}

fn load1_x100() -> u64 {
    let text = read_trim("/proc/loadavg");
    centi(text.split_whitespace().next().unwrap_or("0"))
}

fn cpu_model() -> String {
    let text = fs::read_to_string("/proc/cpuinfo").unwrap_or_default();
    for line in text.lines() {
        if line.starts_with("model name") {
            if let Some(pos) = line.find(':') {
                return line[pos + 1..].trim().to_string();
            }
        }
    }
    "unknown".to_string()
}

fn meminfo_kb(key: &str) -> u64 {
    let text = fs::read_to_string("/proc/meminfo").unwrap_or_default();
    for line in text.lines() {
        if let Some(rest) = line.strip_prefix(key) {
            if let Some(rest) = rest.strip_prefix(':') {
                let num = rest.split_whitespace().next().unwrap_or("0");
                return num.parse().unwrap_or(0);
            }
        }
    }
    0
}

struct Mount {
    mountpoint: String,
    majmin: String,
    fstype: String,
    source: String,
}

fn mount_for(path: &Path) -> Option<Mount> {
    let canon = fs::canonicalize(path).ok()?;
    let canon_s = canon.to_string_lossy().into_owned();
    let text = fs::read_to_string("/proc/self/mountinfo").ok()?;
    let mut best: Option<Mount> = None;
    for line in text.lines() {
        let fields: Vec<&str> = line.split(' ').collect();
        if fields.len() < 10 {
            continue;
        }
        let sep = match fields.iter().position(|f| *f == "-") {
            Some(p) => p,
            None => continue,
        };
        if sep + 2 >= fields.len() {
            continue;
        }
        let mp = fields[4];
        let covers = mp == "/" || canon_s == mp || canon_s.starts_with(&format!("{}/", mp));
        if !covers {
            continue;
        }
        let better = match &best {
            None => true,
            Some(b) => mp.len() >= b.mountpoint.len(),
        };
        if better {
            best = Some(Mount {
                mountpoint: mp.to_string(),
                majmin: fields[2].to_string(),
                fstype: fields[sep + 1].to_string(),
                source: fields[sep + 2].to_string(),
            });
        }
    }
    best
}

struct BlockDev {
    name: String,
    sysfs: String,
    rotational: String,
    driver: String,
    virtio: bool,
}

fn block_dev(majmin: &str) -> BlockDev {
    let link = PathBuf::from(format!("/sys/dev/block/{}", majmin));
    let canon = fs::canonicalize(&link).unwrap_or(link);
    let parent = canon.parent().map(|p| p.to_path_buf()).unwrap_or_default();
    let mut rotational = read_trim(canon.join("queue/rotational"));
    if rotational.is_empty() {
        rotational = read_trim(parent.join("queue/rotational"));
    }
    let mut driver = fs::read_link(canon.join("device/driver"))
        .ok()
        .and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned()))
        .unwrap_or_default();
    if driver.is_empty() {
        driver = fs::read_link(parent.join("device/driver"))
            .ok()
            .and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned()))
            .unwrap_or_default();
    }
    let sysfs = canon.to_string_lossy().into_owned();
    let name = canon
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let virtio = sysfs.contains("/virtio") || driver.starts_with("virtio");
    BlockDev {
        name,
        sysfs,
        rotational,
        driver,
        virtio,
    }
}

fn header(run_dir: &Path, rustc: &str) {
    let threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(0);
    let (mp, majmin, fstype, source) = match mount_for(run_dir) {
        Some(m) => (m.mountpoint, m.majmin, m.fstype, m.source),
        None => (
            "unknown".to_string(),
            String::new(),
            "unknown".to_string(),
            "unknown".to_string(),
        ),
    };
    let bd = block_dev(&majmin);
    println!(
        "H8PROBE|step=header|N={}|file_bytes={}|room_bytes={}|rustc={}|cpu_model={}|cpus={}|memtotal_kb={}|memavailable_kb={}|cached_kb={}|run_dir={}|mount={}|fstype={}|source={}|majmin={}|blockdev={}|sysfs={}|rotational={}|driver={}|virtio={}|loadavg_x100_start={}|json=0",
        N,
        FILE_BYTES,
        ROOM,
        clean(rustc),
        clean(&cpu_model()),
        threads,
        meminfo_kb("MemTotal"),
        meminfo_kb("MemAvailable"),
        meminfo_kb("Cached"),
        clean(&run_dir.to_string_lossy()),
        clean(&mp),
        clean(&fstype),
        clean(&source),
        clean(&majmin),
        clean(&bd.name),
        clean(&bd.sysfs),
        clean(&bd.rotational),
        clean(&bd.driver),
        bd.virtio as u8,
        loadavg_x100(),
    );
}

fn step_make(path: &Path) -> io::Result<()> {
    let rooms_per_chunk = (CHUNK as u64) / ROOM;
    let mut buf = vec![0u8; CHUNK];
    let t0 = Instant::now();
    let mut f = File::create(path)?;
    let mut n: u64 = 0;
    let mut writes: u64 = 0;
    while n < N {
        let rooms = std::cmp::min(rooms_per_chunk, N - n);
        let len = (rooms * ROOM) as usize;
        for (i, slot) in buf[..len].chunks_exact_mut(8).enumerate() {
            slot.copy_from_slice(&stub(n + i as u64).to_le_bytes());
        }
        f.write_all(&buf[..len])?;
        writes += 1;
        n += rooms;
    }
    let write_ns = t0.elapsed().as_nanos();
    f.sync_all()?;
    let ns = t0.elapsed().as_nanos();
    let bytes = f.metadata()?.len();
    println!(
        "H8PROBE|step=make|rooms={}|bytes={}|writes={}|chunk_bytes={}|write_ns={}|sync_ns={}|ns={}|mb_per_s={}|rooms_per_s={}|size_ok={}|load1_x100={}|json=0",
        n,
        bytes,
        writes,
        CHUNK,
        write_ns,
        ns - write_ns,
        ns,
        mb_per_s(bytes, ns),
        per_s(n, ns),
        (bytes == FILE_BYTES) as u8,
        load1_x100(),
    );
    Ok(())
}

fn step_verify(path: &Path) -> io::Result<()> {
    let rooms_per_chunk = (CHUNK as u64) / ROOM;
    let mut buf = vec![0u8; CHUNK];
    let t0 = Instant::now();
    let mut f = File::open(path)?;
    let mut n: u64 = 0;
    let mut mismatch: u64 = 0;
    while n < N {
        let rooms = std::cmp::min(rooms_per_chunk, N - n);
        let len = (rooms * ROOM) as usize;
        f.read_exact(&mut buf[..len])?;
        for (i, slot) in buf[..len].chunks_exact(8).enumerate() {
            let mut b = [0u8; 8];
            b.copy_from_slice(slot);
            if u64::from_le_bytes(b) != stub(n + i as u64) {
                mismatch += 1;
            }
        }
        n += rooms;
    }
    let ns = t0.elapsed().as_nanos();
    println!(
        "H8PROBE|step=verify|rooms_checked={}|bytes={}|ns={}|mb_per_s={}|rooms_per_s={}|mismatch={}|load1_x100={}|json=0",
        n,
        n * ROOM,
        ns,
        mb_per_s(n * ROOM, ns),
        per_s(n, ns),
        mismatch,
        load1_x100(),
    );
    Ok(())
}

fn step_ram() {
    let t0 = Instant::now();
    let mut rooms: Vec<u64> = Vec::with_capacity(N as usize);
    for n in 0..N {
        rooms.push(stub(n));
    }
    let build_ns = t0.elapsed().as_nanos();
    let mut lcg = Lcg(SEED_RAM);
    let mut sum: u64 = 0;
    let t1 = Instant::now();
    for _ in 0..RAM_READS {
        let i = lcg.next_index();
        sum = sum.wrapping_add(rooms[i as usize]);
    }
    let ns = t1.elapsed().as_nanos();
    let sum = std::hint::black_box(sum);
    let mut check = Lcg(SEED_RAM);
    let mut expected: u64 = 0;
    for _ in 0..RAM_READS {
        expected = expected.wrapping_add(stub(check.next_index()));
    }
    drop(rooms);
    println!(
        "H8PROBE|step=ram|rooms={}|vec_bytes={}|build_ns={}|reads={}|seed={}|ns={}|per_s={}|ns_per_read={}|sum={}|mismatch={}|load1_x100={}|json=0",
        N,
        N * ROOM,
        build_ns,
        RAM_READS,
        SEED_RAM,
        ns,
        per_s(RAM_READS, ns),
        ns_per(RAM_READS, ns),
        sum,
        (sum != expected) as u8,
        load1_x100(),
    );
}

fn random_file_reads(f: &File, seed: u64, reads: u64) -> (u64, u64) {
    let mut lcg = Lcg(seed);
    let mut b = [0u8; 8];
    let mut mismatch: u64 = 0;
    let mut done: u64 = 0;
    for _ in 0..reads {
        let i = lcg.next_index();
        match f.read_at(&mut b, i * ROOM) {
            Ok(8) => {
                if u64::from_le_bytes(b) != stub(i) {
                    mismatch += 1;
                }
            }
            _ => mismatch += 1,
        }
        done += 1;
    }
    (done, mismatch)
}

fn step_warm(path: &Path) -> io::Result<()> {
    let f = File::open(path)?;
    let t0 = Instant::now();
    let (reads, mismatch) = random_file_reads(&f, SEED_WARM, WARM_READS);
    let ns = t0.elapsed().as_nanos();
    println!(
        "H8PROBE|step=warm|reads={}|seed={}|ns={}|per_s={}|ns_per_read={}|mismatch={}|load1_x100={}|json=0",
        reads,
        SEED_WARM,
        ns,
        per_s(reads, ns),
        ns_per(reads, ns),
        mismatch,
        load1_x100(),
    );
    Ok(())
}

#[cfg(all(target_os = "linux", target_arch = "x86_64"))]
fn o_direct_flag() -> Option<i32> {
    Some(0o40000)
}

#[cfg(not(all(target_os = "linux", target_arch = "x86_64")))]
fn o_direct_flag() -> Option<i32> {
    None
}

fn open_direct(path: &Path) -> Result<File, String> {
    match o_direct_flag() {
        None => Err("O_DIRECT_flag_unknown_on_this_target".to_string()),
        Some(flag) => OpenOptions::new()
            .read(true)
            .custom_flags(flag)
            .open(path)
            .map_err(|e| clean(&e.to_string())),
    }
}

fn align_pad(buf: &[u8]) -> usize {
    let addr = buf.as_ptr() as usize;
    (BLOCK - addr % BLOCK) % BLOCK
}

fn step_cold(path: &Path) {
    let f = match open_direct(path) {
        Ok(f) => f,
        Err(e) => {
            println!(
                "H8PROBE|step=cold|skipped=1|reason=O_DIRECT_open_failed:{}|json=0",
                e
            );
            return;
        }
    };
    let mut raw = vec![0u8; BLOCK * 2];
    let pad = align_pad(&raw);
    let win = &mut raw[pad..pad + BLOCK];
    let mut lcg = Lcg(SEED_COLD);
    let mut mismatch: u64 = 0;
    let mut errors: u64 = 0;
    let mut first_error = String::new();
    let mut reads: u64 = 0;
    let t0 = Instant::now();
    for _ in 0..COLD_READS {
        let i = lcg.next_index();
        let off = i * ROOM;
        let block_off = off - off % (BLOCK as u64);
        let within = (off - block_off) as usize;
        match f.read_at(win, block_off) {
            Ok(got) if got >= within + 8 => {
                let mut b = [0u8; 8];
                b.copy_from_slice(&win[within..within + 8]);
                if u64::from_le_bytes(b) != stub(i) {
                    mismatch += 1;
                }
            }
            Ok(_) => mismatch += 1,
            Err(e) => {
                errors += 1;
                if first_error.is_empty() {
                    first_error = clean(&e.to_string());
                }
            }
        }
        reads += 1;
    }
    let ns = t0.elapsed().as_nanos();
    println!(
        "H8PROBE|step=cold|o_direct=1|block_bytes={}|align_pad={}|reads={}|seed={}|ns={}|per_s={}|ns_per_read={}|mismatch={}|errors={}|first_error={}|load1_x100={}|json=0",
        BLOCK,
        pad,
        reads,
        SEED_COLD,
        ns,
        per_s(reads, ns),
        ns_per(reads, ns),
        mismatch,
        errors,
        if first_error.is_empty() { "none" } else { &first_error },
        load1_x100(),
    );
}

fn room_at(win: &[u8], byte: usize) -> u64 {
    let mut b = [0u8; 8];
    b.copy_from_slice(&win[byte..byte + 8]);
    u64::from_le_bytes(b)
}

fn step_seqread(path: &Path) {
    let f = match open_direct(path) {
        Ok(f) => f,
        Err(e) => {
            println!(
                "H8PROBE|step=seqread|skipped=1|reason=O_DIRECT_open_failed:{}|json=0",
                e
            );
            return;
        }
    };
    let mut raw = vec![0u8; CHUNK + BLOCK];
    let pad = align_pad(&raw);
    let win = &mut raw[pad..pad + CHUNK];
    let mut off: u64 = 0;
    let mut chunks: u64 = 0;
    let mut spot_checks: u64 = 0;
    let mut mismatch: u64 = 0;
    let mut error = String::new();
    let t0 = Instant::now();
    loop {
        let got = match f.read_at(win, off) {
            Ok(g) => g,
            Err(e) => {
                error = clean(&e.to_string());
                break;
            }
        };
        if got == 0 {
            break;
        }
        let rooms = got / 8;
        if rooms > 0 {
            let first = off / ROOM;
            spot_checks += 2;
            if room_at(win, 0) != stub(first) {
                mismatch += 1;
            }
            if room_at(win, (rooms - 1) * 8) != stub(first + rooms as u64 - 1) {
                mismatch += 1;
            }
        }
        off += got as u64;
        chunks += 1;
        if got < CHUNK {
            break;
        }
    }
    let ns = t0.elapsed().as_nanos();
    println!(
        "H8PROBE|step=seqread|o_direct=1|chunk_bytes={}|align_pad={}|chunks={}|bytes={}|bytes_ok={}|ns={}|mb_per_s={}|spot_checks={}|mismatch={}|error={}|load1_x100={}|json=0",
        CHUNK,
        pad,
        chunks,
        off,
        (off == FILE_BYTES) as u8,
        ns,
        mb_per_s(off, ns),
        spot_checks,
        mismatch,
        if error.is_empty() { "none" } else { &error },
        load1_x100(),
    );
}

fn step_threads(path: &Path) -> io::Result<()> {
    let threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);
    let f = File::open(path)?;
    let t0 = Instant::now();
    let results: Vec<(u64, u64)> = std::thread::scope(|s| {
        let handles: Vec<_> = (0..threads)
            .map(|t| {
                let f = &f;
                s.spawn(move || random_file_reads(f, SEED_THREAD_BASE + t as u64, THREAD_READS))
            })
            .collect();
        handles
            .into_iter()
            .map(|h| h.join().unwrap_or((0, THREAD_READS)))
            .collect()
    });
    let ns = t0.elapsed().as_nanos();
    let reads: u64 = results.iter().map(|r| r.0).sum();
    let mismatch: u64 = results.iter().map(|r| r.1).sum();
    println!(
        "H8PROBE|step=threads|threads={}|reads_per_thread={}|reads={}|seeds={}..{}|ns={}|per_s={}|per_s_per_thread={}|mismatch={}|load1_x100={}|json=0",
        threads,
        THREAD_READS,
        reads,
        SEED_THREAD_BASE,
        SEED_THREAD_BASE + threads as u64 - 1,
        ns,
        per_s(reads, ns),
        per_s(reads, ns) / (threads as u128),
        mismatch,
        load1_x100(),
    );
    Ok(())
}

fn main() -> io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        eprintln!("usage: host8_rooms_probe <run_dir> [rustc_version]");
        std::process::exit(2);
    }
    let run_dir = PathBuf::from(&args[1]);
    let rustc = args
        .get(2)
        .cloned()
        .unwrap_or_else(|| "unknown".to_string());
    fs::create_dir_all(&run_dir)?;
    let path = run_dir.join("host8_rooms_50m.bin");
    let t_all = Instant::now();
    header(&run_dir, &rustc);
    step_make(&path)?;
    step_verify(&path)?;
    step_ram();
    step_warm(&path)?;
    step_cold(&path);
    step_seqread(&path);
    step_threads(&path)?;
    println!(
        "H8PROBE|step=end|total_ns={}|file={}|loadavg_x100_end={}|json=0",
        t_all.elapsed().as_nanos(),
        clean(&path.to_string_lossy()),
        loadavg_x100(),
    );
    Ok(())
}
