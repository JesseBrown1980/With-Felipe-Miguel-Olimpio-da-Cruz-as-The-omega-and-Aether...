//! cosign-serve (asolaria-federation-1024 @ dc1da1a9, servers/cosign-serve) as an in-process library.
//!
//! `resume.rs`, `routes.rs` and `store.rs` are upstream's files, byte-identical and compiled whole.
//! `main.rs` and `http.rs` are byte-identical too; build.rs takes their line ranges that are not the
//! listener (EXTRACTS.sha256). The listener (main.rs:56-78 with MAX_CONN at :19 and the boot row
//! at :57-62 with `hbp_escape` at :114-121; http.rs:15-110) is the process boundary and is not
//! compiled here. Request and response bodies, and the ledger rows, are upstream's JSON / NDJSON:
//! this crate is a cold lane (OWNER-RULES 3).
//!
//! This file is glue: the imports of main.rs:1-7 that the extracts use, the module declarations of
//! main.rs:11-14, and `CosignServe`, which holds main.rs's `Arc<Shared>` in process.

#![forbid(unsafe_code)]

use std::env;
use std::fs::OpenOptions;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

mod resume;
mod routes;
mod store;

mod http {
    // http.rs:8-13
    include!(concat!(env!("OUT_DIR"), "/http_8_13.rs"));
}

// main.rs:16-18
include!(concat!(env!("OUT_DIR"), "/main_16_18.rs"));
// main.rs:21-25
include!(concat!(env!("OUT_DIR"), "/main_21_25.rs"));
// main.rs:81-112
include!(concat!(env!("OUT_DIR"), "/main_81_112.rs"));
// main.rs:123-146
include!(concat!(env!("OUT_DIR"), "/main_123_146.rs"));

/// One cosign-serve process state (main.rs:46-54), held in process instead of behind :5091.
pub struct CosignServe {
    shared: Arc<Shared>,
}

impl CosignServe {
    /// main.rs:39-54: refuses a shadow ledger whose last byte is not `\n`, resumes the head
    /// (max integer `seq` and its `row_hash`) from it, and opens it for append.
    ///
    /// One `CosignServe` (shared, for example through `Arc`) owns a given shadow path per host.
    /// Each `open` makes its own `Mutex<Writer>` (main.rs:46-54); upstream ran one per process
    /// behind one bind (main.rs:56, default `127.0.0.1:5091`), and appends through two instances
    /// on one shadow path can write the same `seq` twice (README, "Using it in process").
    pub fn open(
        live_path: PathBuf,
        shadow_path: PathBuf,
        append_enabled: bool,
    ) -> std::io::Result<Self> {
        include!(concat!(env!("OUT_DIR"), "/main_39_54.rs"))
    }

    /// main.rs:28-37 (ASOLARIA_COSIGN_BIND, _LIVE, _SHADOW, _APPEND_SHADOW), then main.rs:39-54.
    /// Returns the bind address main.rs:28 reads; no socket is bound here.
    pub fn from_env() -> std::io::Result<(String, Self)> {
        let (bind, live_path, shadow_path, append_enabled) =
            include!(concat!(env!("OUT_DIR"), "/main_28_37.rs"));
        Ok((bind, Self::open(live_path, shadow_path, append_enabled)?))
    }

    /// One request through routes.rs:10-25, in the form http.rs:17-20 passes it after reading
    /// the socket. Returns (status, body).
    pub fn handle(&self, method: &str, path: &str, query: &str, body: &[u8]) -> (u16, String) {
        routes::route(
            &self.shared,
            http::Request {
                method: method.to_string(),
                path: path.to_string(),
                query: query.to_string(),
                body: body.to_vec(),
            },
        )
    }
}
