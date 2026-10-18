#!/usr/bin/env python3
"""PreToolUse guard: POSTs to Asolaria guard endpoint, exits 2 if blocked."""
import json, sys, argparse, urllib.request, urllib.error

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-app", default="claude-code")
    parser.add_argument("--server", default="http://localhost:4781")
    args = parser.parse_args()

    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    # Also send event for logging
    event_data = dict(data)
    event_data["event_type"] = "PreToolUse"
    event_data["source_app"] = args.source_app
    try:
        req = urllib.request.Request(
            f"{args.server}/api/hooks/events",
            data=json.dumps(event_data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass

    # Check guard
    guard_payload = {
        "tool_name": data.get("tool_name", ""),
        "tool_input": data.get("tool_input", {}),
    }
    try:
        req = urllib.request.Request(
            f"{args.server}/api/hooks/guard",
            data=json.dumps(guard_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        resp = urllib.request.urlopen(req, timeout=5)
        result = json.loads(resp.read().decode("utf-8"))
        if result.get("blocked"):
            print(f"BLOCKED: {result.get('reason', 'Blocked by Asolaria guard')}", file=sys.stderr)
            sys.exit(2)
    except urllib.error.URLError:
        pass  # If Asolaria is down, don't block

    sys.exit(0)

if __name__ == "__main__":
    main()
