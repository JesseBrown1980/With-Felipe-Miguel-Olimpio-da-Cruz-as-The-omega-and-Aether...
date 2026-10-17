/// One registered federation seat (supervisor / chief / SoS / prof / formula / feed row).
/// Loaded READ-ONLY from the PID Registration Office. `handle8` is the 8-byte BEHCS
/// host id rendered as 16 lowercase hex chars (the office calls this the PID value).
#[derive(Clone, Debug, PartialEq, Eq)]
struct Seat {
    name: String,
    handle8: String,
    cube_bh: String,
    hilbert: String,
    class: String,
    layer: String,
    source: String,
}
