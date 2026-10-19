use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::time::{SystemTime, UNIX_EPOCH};

struct Scratch(PathBuf);

impl Scratch {
    fn new(label: &str) -> Self {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "rime-wave-cli-{label}-{}-{stamp}",
            std::process::id()
        ));
        fs::create_dir(&path).expect("create isolated CLI scratch directory");
        Self(path)
    }
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn run(cwd: &Path, arguments: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_rime-wave"))
        .current_dir(cwd)
        .args(arguments)
        .output()
        .expect("run rime-wave CLI")
}

fn stdout(output: &Output) -> String {
    String::from_utf8(output.stdout.clone()).expect("strict UTF-8 stdout")
}

#[test]
fn measure_defaults_to_acer_and_validates_optional_seat() {
    let scratch = Scratch::new("measure");

    let default = run(&scratch.0, &["measure"]);
    assert!(default.status.success());
    assert!(stdout(&default).starts_with("RIME-WAVE-MEASURE|seat=ACER|"));

    let cloud = run(&scratch.0, &["measure", "cloud"]);
    assert!(cloud.status.success());
    assert!(stdout(&cloud).starts_with("RIME-WAVE-MEASURE|seat=CLOUD|"));

    for invalid in ["", "Cloud", "cloud_1", "cloud/../acer", "clöud"] {
        let output = run(&scratch.0, &["measure", invalid]);
        assert_eq!(
            output.status.code(),
            Some(2),
            "accepted invalid seat {invalid:?}"
        );
    }

    let extra = run(&scratch.0, &["measure", "cloud", "extra"]);
    assert_eq!(extra.status.code(), Some(2));
}

#[test]
fn seal_validates_before_writes_and_pairs_lowercase_filename_with_cloud_header() {
    let scratch = Scratch::new("seal");

    let invalid = run(&scratch.0, &["seal", ""]);
    assert_eq!(invalid.status.code(), Some(2));
    assert!(!scratch.0.join("receipts").exists());
    assert!(!scratch.0.join("sgram").exists());
    assert!(!scratch.0.join("runtime-store").exists());

    let extra = run(&scratch.0, &["seal", "cloud", "extra"]);
    assert_eq!(extra.status.code(), Some(2));
    assert!(!scratch.0.join("receipts").exists());

    let sealed = run(&scratch.0, &["seal", "cloud"]);
    assert!(sealed.status.success());
    assert_eq!(
        stdout(&sealed),
        "SEAL|schema=RIME-TRIT-WAVE-V2|seat=cloud|status=PASS\n"
    );

    let measurement = fs::read_to_string(scratch.0.join("receipts/rime-wave-measure-cloud-v2.hbp"))
        .expect("read cloud measurement receipt");
    assert!(measurement.starts_with("RIME-WAVE-MEASURE|seat=CLOUD|"));
    assert!(!measurement.contains("seat=ACER"));

    let structural = fs::read(scratch.0.join("receipts/rime-wave-structural-v2.hbp"))
        .expect("read sealed structural receipt");
    assert_eq!(
        structural,
        include_bytes!("../receipts/rime-wave-structural-v2.hbp")
    );
}
