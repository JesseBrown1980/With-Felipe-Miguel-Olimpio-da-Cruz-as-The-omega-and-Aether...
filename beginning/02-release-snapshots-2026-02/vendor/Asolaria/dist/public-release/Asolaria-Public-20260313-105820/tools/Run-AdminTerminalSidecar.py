import argparse
import json
import os
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path
import select

import pyte
from winpty.ptyprocess import PtyProcess


def now_iso() -> str:
    return datetime.now().astimezone().isoformat()


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2), encoding="utf-8")


def write_status(path: Path, value) -> None:
    existing = read_json(path, {})
    merged = existing if isinstance(existing, dict) else {}
    if isinstance(value, dict):
        merged.update(value)
    write_json(path, merged)


def append_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="") as handle:
        handle.write(text)


def write_screen(path: Path, screen: pyte.Screen) -> None:
    lines = [line.rstrip() for line in list(screen.display)]
    while len(lines) > 1 and not lines[0].strip():
        lines.pop(0)
    while len(lines) > 1 and not lines[-1].strip():
        lines.pop()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def get_profile_path(repo_root: Path, terminal_key: str) -> Path:
    mapping = {
        "helm": Path(r"C:\Users\acer\codex-bridge\profiles\admin-helm-v1.profile.json"),
        "sentinel": Path(r"C:\Users\acer\codex-bridge\profiles\admin-sentinel-v1.profile.json"),
    }
    return mapping[terminal_key]


def get_paths(repo_root: Path, terminal_key: str):
    runtime_root = repo_root / "runtime" / "admin-terminals" / terminal_key
    return {
        "runtime_root": runtime_root,
        "transcript_path": runtime_root / "transcript.log",
        "screen_path": runtime_root / "screen.txt",
        "inbox_path": runtime_root / "inbox.ndjson",
        "status_path": runtime_root / "status.json",
        "sidecar_pid_path": runtime_root / "sidecar.pid",
        "child_pid_path": runtime_root / "child.pid",
    }


def resolve_command(command: str) -> str:
    if os.path.isabs(command):
        return command
    return shutil.which(command) or command


def latest_nonempty_line(chunk: str) -> str:
    lines = [line.strip() for line in chunk.splitlines() if line.strip()]
    return lines[-1] if lines else ""


def write_input_text(proc: PtyProcess, text: str, chunk_size: int = 96, chunk_delay_s: float = 0.015) -> None:
    payload = str(text or "")
    if not payload:
        return
    for start in range(0, len(payload), max(1, chunk_size)):
        proc.write(payload[start:start + chunk_size])
        time.sleep(max(0.0, chunk_delay_s))
    proc.write("\r")


def read_inbox_lines(path: Path) -> list[str]:
    try:
        raw_text = path.read_text(encoding="utf-8-sig")
    except Exception:
        return []
    return [line.lstrip("\ufeff") for line in raw_text.splitlines() if line.strip()]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--terminal-id", required=True, choices=["Helm", "Sentinel"])
    parser.add_argument("--command-path", default="")
    parser.add_argument("--command-arg", action="append", default=[])
    parser.add_argument("--workdir", default="")
    parser.add_argument("--initial-prompt-file", default="")
    parser.add_argument("--inbox-poll-ms", type=int, default=700)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    terminal_id = args.terminal_id
    terminal_key = terminal_id.lower()
    profile = read_json(get_profile_path(repo_root, terminal_key), {})
    sidecar_cfg = profile.get("sidecar", {}) if isinstance(profile, dict) else {}
    paths = get_paths(repo_root, terminal_key)

    effective_command = args.command_path or sidecar_cfg.get("defaultCommand") or "codex"
    effective_args = list(args.command_arg or sidecar_cfg.get("defaultArgs") or ["-a", "never", "-s", "danger-full-access"])
    effective_workdir = args.workdir or sidecar_cfg.get("defaultWorkdir") or str(repo_root)
    profile_id = str((profile or {}).get("profileName") or f"admin-{terminal_key}-v1")
    resolved_command = resolve_command(effective_command)
    initial_prompt = ""
    if args.initial_prompt_file:
        try:
            prompt_path = Path(args.initial_prompt_file).resolve()
            if prompt_path.exists():
                initial_prompt = (
                    f"You are {terminal_id}. Read and follow the instructions in "
                    f"{prompt_path}. After loading them, continue the mission and reply with a short checkpoint."
                )
        except Exception:
            initial_prompt = ""

    runtime_root = paths["runtime_root"]
    runtime_root.mkdir(parents=True, exist_ok=True)

    paths["transcript_path"].write_text("", encoding="utf-8")
    paths["screen_path"].write_text("", encoding="utf-8")
    paths["inbox_path"].write_text("", encoding="utf-8")

    status = {
        "terminalId": terminal_id,
        "terminalKey": terminal_key,
        "state": "starting",
        "sidecarPid": os.getpid(),
        "childPid": 0,
        "startedAt": now_iso(),
        "updatedAt": now_iso(),
        "workdir": effective_workdir,
        "commandPath": resolved_command,
        "commandArgs": effective_args,
        "transcriptPath": str(paths["transcript_path"]),
        "inboxPath": str(paths["inbox_path"]),
        "inboxLinesProcessed": 0,
        "lastInputAt": "",
        "lastInputSource": "",
        "lastOutputAt": "",
        "lastOutputStream": "",
        "lastOutputText": "",
        "lastExitCode": 0,
    }
    write_json(paths["status_path"], status)
    paths["sidecar_pid_path"].write_text(str(os.getpid()), encoding="ascii")

    launch_argv = [resolved_command, "--no-alt-screen", *effective_args]
    if initial_prompt:
        launch_argv.append(initial_prompt)
    proc = PtyProcess.spawn(launch_argv, cwd=effective_workdir, env=os.environ.copy())
    child_pid = int(getattr(proc, "pid", 0) or 0)

    status["childPid"] = child_pid
    status["state"] = "running"
    status["updatedAt"] = now_iso()
    write_status(paths["status_path"], status)
    paths["child_pid_path"].write_text(str(child_pid), encoding="ascii")

    append_text(
        paths["transcript_path"],
        f"Asolaria Admin Terminal: {profile_id}\n"
        f"Working directory: {effective_workdir}\n"
        f"Interactive Codex session is starting...\n\n",
    )
    paths["screen_path"].write_text(
        f"Asolaria Admin Terminal: {profile_id}\n"
        f"Working directory: {effective_workdir}\n"
        f"Interactive Codex session is starting...\n",
        encoding="utf-8",
    )

    processed_inbox_lines = 0
    poll_seconds = max(0.2, args.inbox_poll_ms / 1000.0)
    screen = pyte.Screen(100, 24)
    stream = pyte.Stream(screen)

    while True:
        if proc.isalive():
          try:
              ready, _, _ = select.select([proc.fileobj], [], [], poll_seconds)
          except Exception:
              ready = []
          if ready:
              try:
                  chunk = proc.read(4096)
              except EOFError:
                  chunk = ""
              if chunk:
                  append_text(paths["transcript_path"], chunk)
                  try:
                      stream.feed(chunk)
                      write_screen(paths["screen_path"], screen)
                  except Exception:
                      pass
                  last_line = latest_nonempty_line(chunk)
                  if last_line:
                      status["lastOutputAt"] = now_iso()
                      status["lastOutputStream"] = "out"
                      status["lastOutputText"] = last_line
                      status["updatedAt"] = status["lastOutputAt"]
                      write_status(paths["status_path"], status)
        else:
            break

        inbox_lines = read_inbox_lines(paths["inbox_path"])

        if len(inbox_lines) > processed_inbox_lines:
            for raw_line in inbox_lines[processed_inbox_lines:]:
                processed_inbox_lines += 1
                try:
                    message = json.loads(raw_line)
                except Exception as error:
                    status["inboxLinesProcessed"] = processed_inbox_lines
                    status["lastError"] = f"inbox_parse_failed: {error}"
                    status["updatedAt"] = now_iso()
                    write_status(paths["status_path"], status)
                    append_text(
                        paths["transcript_path"],
                        f"\n[Asolaria] inbox parse failed: {error}\n",
                    )
                    continue

                text = str(message.get("text") or "").strip()
                if not text:
                    status["inboxLinesProcessed"] = processed_inbox_lines
                    status["updatedAt"] = now_iso()
                    write_status(paths["status_path"], status)
                    continue

                try:
                    write_input_text(proc, text)
                    status["lastInputAt"] = now_iso()
                    status["lastInputSource"] = str(message.get("source") or "")
                    status["inboxLinesProcessed"] = processed_inbox_lines
                    status["updatedAt"] = status["lastInputAt"]
                    write_status(paths["status_path"], status)
                except Exception as error:
                    status["lastError"] = f"input_write_failed: {error}"
                    status["updatedAt"] = now_iso()
                    write_status(paths["status_path"], status)
                    append_text(
                        paths["transcript_path"],
                        f"\n[Asolaria] input delivery failed: {error}\n",
                    )
                    raise

        time.sleep(0.1)

    exit_code = int(getattr(proc, "exitstatus", 0) or 0)
    append_text(paths["transcript_path"], f"\n[Asolaria] interactive terminal exited code={exit_code}\n")
    status["state"] = "exited"
    status["lastExitCode"] = exit_code
    status["inboxLinesProcessed"] = processed_inbox_lines
    status["updatedAt"] = now_iso()
    write_status(paths["status_path"], status)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
