/// Cap on the canonical tuple: 6 bytes per device-function, so 512 covers 85 functions
/// (a laptop presents far fewer). The sha256 buffer below is sized for this cap.
const TUPLE_CAP: usize = 512;
