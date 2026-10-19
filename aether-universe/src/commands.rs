//! The command line: one command per line, so the game runs on any terminal, Termux included.

use crate::hbp::Row;

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum Command {
    Help,
    Look,
    Map,
    Go(String),
    /// Everything after `probe`, as typed.
    Probe(String),
    Trits(String),
    Solve(String),
    Codex(Option<String>),
    Timeline,
    Agents,
    Wait(Option<String>),
    Rewind(String),
    Branch,
    Save(String),
    Load(String),
    Verify(Option<String>),
    Quit,
    /// A known command with a missing argument: its usage line.
    Usage(&'static str, &'static str),
    Unknown(String),
}

/// The command names, in the order `help` lists them.
pub const NAMES: [&str; 17] = [
    "look", "map", "go", "probe", "trits", "solve", "codex", "timeline", "agents", "wait",
    "rewind", "branch", "save", "load", "verify", "help", "quit",
];

/// One line of help per command.
pub const HELP: [(&str, &str); 17] = [
    (
        "look",
        "describe the region you stand in: its question and the hints you have earned",
    ),
    (
        "map",
        "the ASCII crystal map, with the HUD and the decision panel at 80 columns",
    ),
    (
        "go <region>",
        "travel to an open region: hollow flow cylinders hotel rupture crystal cube white star",
    ),
    (
        "probe <n> | <a> <b> | <word> | star",
        "run the region's experiment on a number, two numbers, a word, or the star",
    ),
    (
        "trits <n>",
        "balanced ternary of n at its minimal width and at widths 3, 13 and 41",
    ),
    (
        "solve <answer>",
        "give the region's secret; the kernel compares it with its own computed number",
    ),
    (
        "codex [n]",
        "the ledger of unlocked facts, each with its tag and its source; n prints a chapter",
    ),
    (
        "timeline",
        "the nine dated events of the Aether timeline and where each chapter stands",
    ),
    ("agents", "the 27 agents, as sealed in the current snapshot"),
    (
        "wait [n]",
        "let n ticks pass (1 to 27); the world runs only when you wait or act",
    ),
    (
        "rewind <tick|live>",
        "look at a sealed past snapshot, read-only; nothing recalculates",
    ),
    (
        "branch",
        "while looking at the past: fork a new timeline from that tick, beside the old one",
    ),
    (
        "save <name>",
        "write a verifiable save; locally measured secrets become bridge-published",
    ),
    (
        "load <name>",
        "verify a save from tick 0 and continue from it on a new timeline",
    ),
    (
        "verify [path]",
        "check the chain, the sidecars and every answer; with a path, another machine's seal",
    ),
    ("help", "this list"),
    ("quit", "leave; every tick is already sealed on disk"),
];

/// Parse one input line.
pub fn parse(line: &str) -> Command {
    let line = line.trim();
    let (word, rest) = match line.split_once(char::is_whitespace) {
        Some((w, r)) => (w, r.trim()),
        None => (line, ""),
    };
    let arg = |s: &str| -> Option<String> { (!s.is_empty()).then(|| s.to_string()) };
    match word.to_ascii_lowercase().as_str() {
        "help" | "?" => Command::Help,
        "look" | "l" => Command::Look,
        "map" | "m" => Command::Map,
        "go" => arg(rest).map_or(Command::Usage("go", "go <region>"), Command::Go),
        "probe" | "p" => Command::Probe(rest.to_string()),
        "trits" => arg(rest).map_or(Command::Usage("trits", "trits <integer>"), Command::Trits),
        "solve" => arg(rest).map_or(Command::Usage("solve", "solve <answer>"), Command::Solve),
        "codex" => Command::Codex(arg(rest)),
        "timeline" => Command::Timeline,
        "agents" => Command::Agents,
        "wait" => Command::Wait(arg(rest)),
        "rewind" => arg(rest).map_or(
            Command::Usage("rewind", "rewind <tick|live>"),
            Command::Rewind,
        ),
        "branch" => Command::Branch,
        "save" => arg(rest).map_or(Command::Usage("save", "save <name>"), Command::Save),
        "load" => arg(rest).map_or(Command::Usage("load", "load <name>"), Command::Load),
        "verify" => Command::Verify(arg(rest)),
        "quit" | "exit" | "q" => Command::Quit,
        _ => Command::Unknown(line.to_string()),
    }
}

/// `UNKNOWN|input=<first 32 bytes, escaped>|json=0`. Anything outside printable ASCII becomes `?`.
pub fn unknown_row(input: &str) -> Row {
    let clean: String = input
        .chars()
        .map(|c| {
            if c.is_ascii_graphic() || c == ' ' {
                c
            } else {
                '?'
            }
        })
        .take(32)
        .collect();
    Row::new("UNKNOWN").kv("input", clean)
}

/// Is this a save name the game will write? Letters, digits, `-` and `_`, 1 to 40 characters, so a
/// name can never be a path.
pub fn valid_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 40
        && name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// A script line is a command unless it is blank or starts with `#`.
pub fn is_script_command(line: &str) -> bool {
    let t = line.trim();
    !t.is_empty() && !t.starts_with('#')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_every_command_and_keeps_probe_text_as_typed() {
        assert_eq!(parse("look"), Command::Look);
        assert_eq!(parse("  MAP "), Command::Map);
        assert_eq!(parse("go hollow"), Command::Go("hollow".into()));
        assert_eq!(parse("probe 13"), Command::Probe("13".into()));
        assert_eq!(
            parse("probe the  quick brown"),
            Command::Probe("the  quick brown".into()),
            "interior spacing is the player's text"
        );
        assert_eq!(parse("probe"), Command::Probe(String::new()));
        assert_eq!(parse("solve 27:13"), Command::Solve("27:13".into()));
        assert_eq!(parse("codex"), Command::Codex(None));
        assert_eq!(parse("codex 3"), Command::Codex(Some("3".into())));
        assert_eq!(parse("wait"), Command::Wait(None));
        assert_eq!(parse("wait 9"), Command::Wait(Some("9".into())));
        assert_eq!(parse("rewind live"), Command::Rewind("live".into()));
        assert_eq!(parse("verify"), Command::Verify(None));
        assert_eq!(
            parse("verify some/path"),
            Command::Verify(Some("some/path".into()))
        );
        assert_eq!(parse("quit"), Command::Quit);
        assert_eq!(parse("branch"), Command::Branch);
        assert_eq!(parse("timeline"), Command::Timeline);
        assert_eq!(parse("agents"), Command::Agents);
        assert_eq!(parse("help"), Command::Help);
    }

    #[test]
    fn missing_arguments_give_a_usage_line_and_nonsense_gives_unknown() {
        assert!(matches!(parse("go"), Command::Usage("go", _)));
        assert!(matches!(parse("solve"), Command::Usage("solve", _)));
        assert!(matches!(parse("save"), Command::Usage("save", _)));
        assert_eq!(parse("dance"), Command::Unknown("dance".into()));
        assert_eq!(parse(""), Command::Unknown(String::new()));
    }

    #[test]
    fn help_lists_every_named_command() {
        assert_eq!(NAMES.len(), HELP.len());
        for (n, (h, _)) in NAMES.iter().zip(HELP.iter()) {
            assert!(h.starts_with(n), "{n} vs {h}");
        }
    }

    #[test]
    fn unknown_row_is_clipped_and_escaped() {
        let r = unknown_row(
            "a|b=c\u{e9}\u{1b}[0m and a very long tail that goes beyond thirty-two bytes",
        );
        let v = r.get("input").unwrap();
        assert!(v.chars().count() <= 32);
        assert!(v.is_ascii() && !v.contains('\u{1b}'));
        assert!(r.line().ends_with("|json=0"));
    }

    #[test]
    fn save_names_can_never_be_paths() {
        assert!(valid_name("s"));
        assert!(valid_name("my-save_2"));
        assert!(!valid_name(""));
        assert!(!valid_name("../x"));
        assert!(!valid_name("a/b"));
        assert!(!valid_name("a b"));
        assert!(!valid_name(&"x".repeat(41)));
    }

    #[test]
    fn script_lines_skip_comments_and_blanks() {
        assert!(is_script_command("look"));
        assert!(!is_script_command("# comment"));
        assert!(!is_script_command("   "));
        assert!(!is_script_command("  # indented comment"));
    }
}
