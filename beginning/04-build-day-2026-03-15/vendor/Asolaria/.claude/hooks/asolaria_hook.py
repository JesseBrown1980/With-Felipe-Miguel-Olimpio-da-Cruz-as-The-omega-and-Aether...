#!/usr/bin/env python3
"""Thin shim: reads Claude Code hook JSON from stdin, POSTs to Asolaria."""
import json, sys, argparse, urllib.request, urllib.error

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--event-type", required=True)
    parser.add_argument("--source-app", default="claude-code")
    parser.add_argument("--server", default="http://localhost:4781")
    args = parser.parse_args()

    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    data["event_type"] = args.event_type
    data["source_app"] = args.source_app

    try:
        req = urllib.request.Request(
            f"{args.server}/api/hooks/events",
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass  # Never block Claude Code

    sys.exit(0)

if __name__ == "__main__":
    main()
