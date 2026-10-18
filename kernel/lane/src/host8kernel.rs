//! The `HOST8KERNEL` row parse asolaria-asi-os runs on host8-serve's `/health.hbp` body
//! (asolaria-asi-os @ 457159d6, `src/main.rs:358-375`, function `live_status`), as a library
//! function. The HTTP GET (`:360`) stays out: the caller passes the body it fetched, and an
//! unreachable kernel is the empty string, which is what `unwrap_or_default()` gives upstream.
//! host8-serve writes the row as `HOST8KERNEL|version={}|anchor_pid={}|server_libs=5|json=0`
//! (federation-1024 @ dc1da1a9, `servers/host8-serve/src/main.rs:760-764`).

/// The body asi-os `/api/kernel` answers with when `127.0.0.1:5088/health.hbp` gives nothing
/// (`src/main.rs:283`).
pub const KERNEL_UNREACHABLE_BODY: &str =
    "HOST8|up=0|port=5088|note=kernel-unreachable-from-front-end|json=0\n";

/// The three values `live_status` takes from the kernel body (`src/main.rs:361-375`); it renders
/// them into its `KERNEL|port=5088|up=..|listen=..|version=..|anchor=..` row (`:391`, `:398-401`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct KernelHealth {
    pub kver: String,
    pub kanchor: String,
    pub kernel_up: bool,
}

/// `live_status` lines 361-375 over a `/health.hbp` body (`""` when the GET failed).
pub fn parse_health(kernel: &str) -> KernelHealth {
    // upstream-lines asolaria-asi-os@457159d6 src/main.rs:361-375
    let mut kver = "-".to_string();
    let mut kanchor = "-".to_string();
    for line in kernel.lines() {
        if let Some(rest) = line.strip_prefix("HOST8KERNEL|") {
            for f in rest.split('|') {
                if let Some(v) = f.strip_prefix("version=") {
                    kver = v.to_string();
                }
                if let Some(v) = f.strip_prefix("anchor_pid=") {
                    kanchor = v.to_string();
                }
            }
        }
    }
    let kernel_up = !kernel.is_empty();
    // upstream-lines-end
    KernelHealth {
        kver,
        kanchor,
        kernel_up,
    }
}

/// `/api/kernel` (`src/main.rs:281-286`) without the HTTP GET: `fetched` is the `/health.hbp` body
/// when the GET returned one.
pub fn api_kernel_body(fetched: Option<String>) -> String {
    fetched.unwrap_or_else(|| KERNEL_UNREACHABLE_BODY.into())
}
