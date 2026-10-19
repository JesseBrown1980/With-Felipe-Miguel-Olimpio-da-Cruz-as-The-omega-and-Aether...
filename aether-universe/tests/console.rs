//! The console: commands, refusals, hint escalation, quality levels, stdin mode, and the exit codes
//! of the real binary.

mod common;

use common::*;
use std::process::Command;

fn run(script: &str) -> (i32, String) {
    let saves = tmpdir("console");
    run_script_text(cfg(&saves), &saves, script)
}

#[test]
fn help_lists_every_command() {
    let (code, out) = run("help\nquit\n");
    assert_eq!(code, 0);
    let h = rows_of(&out, "HELP");
    assert_eq!(h.len(), 1);
    assert_eq!(
        field(h[0], "commands"),
        Some("look,map,go,probe,trits,solve,codex,timeline,agents,wait,rewind,branch,save,load,verify,help,quit")
    );
    for c in [
        "look",
        "map",
        "go <region>",
        "probe",
        "trits <n>",
        "solve <answer>",
        "codex [n]",
        "timeline",
        "agents",
        "wait [n]",
        "rewind",
        "branch",
        "save <name>",
        "load <name>",
        "verify",
        "quit",
    ] {
        assert!(out.contains(c), "help does not mention {c}");
    }
}

#[test]
fn unknown_input_missing_arguments_and_bad_names_are_answered_with_rows() {
    let (_, out) = run("dance\ngo\nsolve\nsave\nwait x\nwait 0\nwait 28\ngo c\ngo nowhere\ngo flow\ngo hollow\ncodex 5\ncodex q\nquit\n");
    assert!(out.contains("UNKNOWN|input=dance|json=0"));
    assert!(out.contains("USAGE|command=go|usage=go <region>|json=0"));
    assert!(out.contains("USAGE|command=solve|usage=solve <answer>|json=0"));
    assert!(out.contains("USAGE|command=save|usage=save <name>|json=0"));
    assert_eq!(
        rows_of(&out, "REFUSED")
            .iter()
            .filter(|l| field(l, "reason") == Some("wait_takes_1_to_27"))
            .count(),
        3
    );
    assert!(out.contains("AMBIGUOUS|input=c|matches=cylinders,crystal,cube|json=0"));
    assert!(out.contains("NOREGION|input=nowhere|json=0"));
    assert!(out.contains("LOCKED|region=flow_channel|needs=secret 1|json=0"));
    assert!(out.contains("GO|from=hollow_strata|to=hollow_strata|hops=0|stay=1|json=0"));
    assert!(out.contains("LOCKED|chapter=5|needs=the previous chapter's secret|json=0"));
    assert!(out.contains("USAGE|command=codex|usage=codex [0-9]|json=0"));
    // none of these cost a tick
    assert_eq!(field(rows_of(&out, "QUIT")[0], "tick"), Some("0"));
}

#[test]
fn the_hints_escalate_with_wrong_answers_and_never_reveal_the_answer() {
    let (_, out) = run("look\nsolve a\nlook\nsolve b\nsolve c\nlook\nquit\n");
    let hints: Vec<&str> = rows_of(&out, "HINT");
    // 1 hint, then 2 after one wrong answer, then 3 after three
    assert_eq!(hints.len(), 1 + 2 + 3);
    assert_eq!(
        hints
            .iter()
            .filter(|l| field(l, "level") == Some("3"))
            .count(),
        1
    );
    let attempts: Vec<&str> = rows_of(&out, "SOLVE")
        .iter()
        .filter_map(|l| field(l, "attempts"))
        .collect();
    assert_eq!(attempts, ["1", "2", "3"]);
    assert!(
        !out.contains("27:13"),
        "the answer never appears in what the game prints before it is solved"
    );
    assert!(out.contains("not the kernel's number"));
}

#[test]
fn a_solved_chapter_is_not_solved_twice_and_its_answer_is_not_re_accepted_elsewhere() {
    let (_, out) = run("solve 27:13\nsolve 27:13\ngo flow\nsolve 27:13\nsolve 41\nquit\n");
    assert!(
        out.contains("SOLVE|region=hollow_strata|already_solved=1|evidence=LOCAL_MEASURED|json=0")
    );
    // chapter 1's answer is not chapter 2's
    assert!(out.contains("SOLVE|region=flow_channel|match=0|attempts=1|json=0"));
    assert!(out.contains("SOLVE|region=flow_channel|match=1|evidence=LOCAL_MEASURED|json=0"));
}

#[test]
fn story_prints_at_the_start_and_once_per_region_unless_no_story() {
    let (_, out) = run("solve 27:13\ngo flow\ngo hollow\ngo flow\nquit\n");
    let stories = rows_of(&out, "STORY");
    let chapters: Vec<&str> = stories.iter().filter_map(|l| field(l, "chapter")).collect();
    assert_eq!(
        chapters,
        ["0", "1", "2"],
        "premise, chapter 1, then chapter 2 once: {chapters:?}"
    );
    assert!(out.contains("FLOW CHANNEL - the channel opens"));
    assert_eq!(out.matches("FLOW CHANNEL - the channel opens").count(), 1);
    let saves = tmpdir("nostory");
    let mut c = cfg(&saves);
    c.no_story = true;
    let (_, quiet) = run_script_text(c, &saves, "solve 27:13\ngo flow\nquit\n");
    assert!(rows_of(&quiet, "STORY").is_empty());
    assert!(!quiet.contains("FLOW CHANNEL"));
    // codex prints a chapter again once it is open
    let (_, again) = run("solve 27:13\ncodex 1\ncodex 2\nquit\n");
    assert!(
        again.matches("HOLLOW STRATA - the first snapshot").count() == 2,
        "the start and codex 1"
    );
    assert!(again.contains("CODEX|entries="));
}

#[test]
fn the_map_follows_the_terminal_width() {
    let render = |cols: u32| {
        let saves = tmpdir("cols");
        let mut c = cfg(&saves);
        c.cols = cols;
        run_script_text(c, &saves, "map\nquit\n").1
    };
    let (rich, balanced, low) = (render(80), render(79), render(39));
    assert!(rich.contains("MAP|cols=40|rows=17|quality=RICH|term_cols=80|rivers=1|json=0"));
    assert!(rich.contains("\nDECIDE|") && rich.contains("\nSTATES|"));
    assert!(balanced.contains("quality=BALANCED|term_cols=79|rivers=0|json=0"));
    assert!(balanced.contains("\nHUD|") && !balanced.contains("\nDECIDE|"));
    assert!(low.contains("MAP|quality=LOW|grid=none|term_cols=39|json=0"));
    assert!(!low.contains("\nHUD|"));
    // nothing is coloured: no escape character anywhere
    for o in [&rich, &balanced, &low] {
        assert!(!o.contains('\u{1b}'));
    }
}

#[test]
fn stdin_mode_runs_the_same_commands_as_a_script_without_the_echo() {
    let saves = tmpdir("stdin");
    let (code, out) = run_with_input(
        cfg(&saves),
        "look\nwait 2\nsolve 27:13\n# a comment\n\nquit\nlook\n",
    );
    assert_eq!(code, 0);
    assert!(out.starts_with("SELFTEST|sha256=OK|vectors=3|json=0\n"));
    assert!(!out.contains("\n> "), "stdin mode does not echo");
    assert!(out.contains("SOLVE|region=hollow_strata|match=1|evidence=LOCAL_MEASURED|json=0"));
    // `quit` ends the session: the `look` after it never ran
    assert_eq!(rows_of(&out, "LOOK").len(), 1);
    // end of input is a quit
    let saves2 = tmpdir("stdin2");
    let (_, out2) = run_with_input(cfg(&saves2), "wait 3\n");
    assert_eq!(field(rows_of(&out2, "QUIT")[0], "tick"), Some("3"));
}

#[test]
fn agents_timeline_and_codex_read_the_sealed_snapshot() {
    let (_, out) = run("agents\ntimeline\ncodex\nquit\n");
    assert!(out.contains("AGENTS|n=27|json=0"));
    assert_eq!(rows_of(&out, "AGENT").len(), 27);
    let t = rows_of(&out, "TIMELINE");
    assert_eq!(field(t[0], "chapters"), Some("9"));
    assert_eq!(rows_of(&out, "EVENT").len(), 9);
    let ev: Vec<&str> = rows_of(&out, "EVENT");
    assert_eq!(field(ev[0], "date"), Some("2026-04-01"));
    assert_eq!(field(ev[8], "date"), Some("2026-10-18"));
    let facts = rows_of(&out, "FACT");
    assert!(facts.len() >= 5);
    for f in facts {
        assert!(["MEASURED", "NAMED", "OPERATOR", "STORY"].contains(&field(f, "tag").unwrap()));
        assert!(field(f, "source").is_some_and(|s| !s.is_empty()));
    }
}

#[test]
fn the_white_field_counts_the_page_it_holds_and_says_it_is_not_enwik8() {
    let script = "solve 27:13\ngo flow\nsolve 41\ngo cylinders\nsolve -1:189\ngo hotel\nsolve 5\ngo rupture\nsolve 0\ngo crystal\nsolve 40\ngo cube\nsolve 18:3\ngo white\nlook\nprobe field\nprobe a b c\nquit\n";
    let (_, out) = run(script);
    assert!(out.contains("data/enwik8 is absent: the census is for the page you hold"));
    let census: Vec<&str> = rows_of(&out, "CENSUS");
    let page = census
        .iter()
        .find(|l| field(l, "file") == Some("bundled_page"))
        .expect("the page census");
    assert_eq!(field(page, "bytes"), Some("412"));
    assert_eq!(field(page, "white"), Some("78"));
    assert_eq!(field(page, "per10000"), Some("1893"));
    assert_eq!(field(page, "rem"), Some("84"));
    let own = census
        .iter()
        .find(|l| field(l, "scope") == Some("your_text"))
        .expect("own text");
    assert_eq!(field(own, "white"), Some("2"));
    assert!(out.contains("SCOPE|secret=8|scope=bundled_page|enwik8=NOT_MEASURED"));
}

// ---- the real binary

fn bin() -> Command {
    Command::new(env!("CARGO_BIN_EXE_aether-universe"))
}

#[test]
fn the_binary_exits_2_on_a_bad_flag_and_0_on_help() {
    let o = bin().arg("--no-such-flag").output().unwrap();
    assert_eq!(o.status.code(), Some(2));
    assert!(String::from_utf8_lossy(&o.stderr).contains("REFUSED|reason=bad_flag"));
    let o = bin().arg("--seed").output().unwrap();
    assert_eq!(o.status.code(), Some(2));
    let o = bin().arg("--help").output().unwrap();
    assert_eq!(o.status.code(), Some(0));
    assert!(String::from_utf8_lossy(&o.stdout).contains("--seed"));
    let saves = tmpdir("bin-missing");
    let o = bin()
        .args([
            "--script",
            saves.join("nope.aether").to_str().unwrap(),
            "--saves",
            saves.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert_eq!(
        o.status.code(),
        Some(2),
        "an unreadable script is a bad invocation"
    );
    assert!(String::from_utf8_lossy(&o.stdout).contains("REFUSED|reason=cannot_read_script"));
}

#[test]
fn the_binary_runs_the_smoke_script_and_prints_hbp_rows_only() {
    let saves = tmpdir("bin-smoke");
    let o = bin()
        .current_dir(root())
        .args([
            "--script",
            "scripts/smoke.aether",
            "--no-story",
            "--saves",
            saves.to_str().unwrap(),
            "--data",
            saves.join("none").to_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert_eq!(
        o.status.code(),
        Some(0),
        "{}",
        String::from_utf8_lossy(&o.stderr)
    );
    let out = String::from_utf8(o.stdout).unwrap();
    assert!(out.starts_with("SELFTEST|sha256=OK|vectors=3|json=0\n"));
    assert!(out.contains(
        "VERIFY|subject=summary|pass=6|fail=0|not_measured=0|verdict=MEASURED_PASS|json=0"
    ));
    assert!(
        o.stderr.is_empty(),
        "nothing on stderr: {}",
        String::from_utf8_lossy(&o.stderr)
    );
}

#[test]
fn a_scripted_verify_that_fails_exits_4() {
    // an --also-verify against a seal whose rows were changed after sealing
    let a = tmpdir("red-a");
    let (_, oa) = run_script_file(cfg(&a), &playthrough());
    let session = field(rows_of(&oa, "GAME")[0], "session")
        .unwrap()
        .to_string();
    let seal = a.join(&session).join("FINAL-SEAL.hbp");
    let mut bytes = std::fs::read(&seal).unwrap();
    let at = bytes.windows(8).position(|w| w == b"answer_s").unwrap();
    bytes[at + 16] ^= 1; // one hex digit of one answer hash
    std::fs::write(&seal, &bytes).unwrap();
    let b = tmpdir("red-b");
    let mut cb = cfg(&b);
    cb.also_verify = Some(seal);
    let (code, ob) = run_script_file(cb, &playthrough());
    assert_eq!(
        code,
        4,
        "{}",
        ob.lines().rev().take(6).collect::<Vec<_>>().join("\n")
    );
    assert!(
        ob.contains("MEASURED_FAIL|subject=other_seal|detail=SIDECAR_MISMATCH"),
        "the tampered seal is refused before it is compared"
    );
    // a seal that is simply not there is not measured, and not a failure
    let c = tmpdir("red-c");
    let mut cc = cfg(&c);
    cc.also_verify = Some(c.join("no-such-seal.hbp"));
    let (code, oc) = run_script_file(cc, &playthrough());
    assert_eq!(code, 0);
    assert!(oc.contains("VERIFY|subject=other_seal|reason=NO_INPUT|"));
    assert!(oc.contains("verdict=NOT_MEASURED"));
}
