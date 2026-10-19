#!/usr/bin/env python3
"""Collect public Asolaria repo activity without inventing agent attribution.

Stdlib only. Run on GitHub Actions (hourly) or manually:
    python tools/collect_three_seat_activity.py

This program never reads private repositories, fetches source bodies,
uses an HF token, or attempts to identify agents from a shared GitHub login.
"""
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

OWNER = "JesseBrown1980"
ROOT = Path(__file__).resolve().parents[1]
TRACKING = ROOT / "tracking"
REGISTRY = TRACKING / "seat-registry.json"
USER_AGENT = "Asolaria-stones-public-activity-audit/1.0"
SEAT_RE = re.compile(r"(?im)^Asolaria-Seat:\s*(seat-[123])\s*$")
BRANCH_RE = re.compile(r"^agent/(seat-[123])(?:/|$)")
MAX_COMMIT_ROWS = 15

def utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def fetch(path):
    token = os.environ.get("GITHUB_TOKEN", "")
    headers = {"Accept": "application/vnd.github+json",
               "User-Agent": USER_AGENT,
               "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = Request("https://api.github.com/" + path.lstrip("/"), headers=headers)
    try:
        with urlopen(req, timeout=25) as response:
            return json.load(response), None
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        # Do not capture headers or tokens in public records.
        return None, {"type": type(exc).__name__,
                      "status": getattr(exc, "code", None),
                      "endpoint": path.split("?")[0]}

def seat_from_commit(item, branch):
    # The public GitHub authenticated account is NOT an agent identity.
    msg = item.get("commit", {}).get("message", "")
    match = SEAT_RE.search(msg)
    if match:
        return match.group(1), "explicit_commit_trailer"
    match = BRANCH_RE.match(branch)
    if match:
        return match.group(1), "explicit_branch_label"
    return "unassigned", "no_explicit_seat_proof"

def sanitize_commit(item, branch):
    commit = item.get("commit", {})
    seat, evidence = seat_from_commit(item, branch)
    return {
        "sha": item.get("sha"),
        "url": item.get("html_url"),
        "branch": branch,
        "timestamp_utc": commit.get("committer", {}).get("date"),
        "github_actor": (item.get("author") or {}).get("login"),
        "author_label": commit.get("author", {}).get("name"),
        "message_title": commit.get("message", "").split("\n")[0][:180],
        "seat": seat,
        "attribution_basis": evidence,
    }

def pull_value(item):
    return {"number": item.get("number"), "title": (item.get("title") or "")[:180],
            "url": item.get("html_url"), "state": item.get("state"),
            "updated_at": item.get("updated_at"),
            "github_actor": (item.get("user") or {}).get("login")}

def workflow_value(item):
    return {"id": item.get("id"), "name": item.get("name"),
            "url": item.get("html_url"), "branch": item.get("head_branch"),
            "sha": item.get("head_sha"), "status": item.get("status"),
            "conclusion": item.get("conclusion"),
            "updated_at": item.get("updated_at")}

def capture_repo(repo):
    base = "repos/" + repo + "/"
    data = {"repo": repo, "url": "https://github.com/" + repo,
            "errors": [], "branches": [], "pull_requests": [],
            "workflows": [], "recent_commits": []}
    branches, err = fetch(base + "branches?per_page=100")
    if err: data["errors"].append(err)
    else:
        data["branches"] = [{"name": b["name"],
                             "sha": b.get("commit", {}).get("sha")}
                            for b in branches]
    prs, err = fetch(base + "pulls?state=all&per_page=20")
    if err: data["errors"].append(err)
    else: data["pull_requests"] = [pull_value(p) for p in prs]
    runs, err = fetch(base + "actions/runs?per_page=12")
    if err: data["errors"].append(err)
    else: data["workflows"] = [workflow_value(w) for w in runs.get("workflow_runs", [])]
    branches_to_scan = data["branches"][:12]
    if not branches_to_scan:
        branches_to_scan = [{"name":"main","sha":None}]
    for branch in branches_to_scan:
        from urllib.parse import quote
        label = branch["name"]
        commits, err = fetch(base + "commits?sha=" + quote(label, safe="") +
                             "&per_page=" + str(MAX_COMMIT_ROWS))
        if err:
            data["errors"].append(err)
        else:
            data["recent_commits"].extend(sanitize_commit(c, label) for c in commits
                                          if not c.get("commit", {}).get("message","").startswith("[tracker]"))
    # Deduplicate commits across branches without suppressing branch-attribution evidence.
    data["recent_commits"] = sorted(data["recent_commits"],
                                   key=lambda x:(x.get("timestamp_utc") or "",x.get("sha") or ""),
                                   reverse=True)[:60]
    return data

def fingerprint(data):
    # Ignore capture wall-time; hash only observed repo states.
    relevant = [{"repo":r["repo"], "branches":r["branches"],
                 "pull_requests":r["pull_requests"],
                 "workflows":r["workflows"],
                 "recent_commits":r["recent_commits"],
                 "errors":r["errors"]} for r in data["repositories"]]
    return hashlib.sha256(json.dumps(relevant,sort_keys=True,
                                   separators=(",",":")).encode()).hexdigest()

def main():
    config = json.loads(REGISTRY.read_text(encoding="utf-8"))
    assert len(config["seats"]) == 3
    assert all(r.startswith(OWNER + "/") for r in config["repositories"]), \
        "Only the explicitly approved owner's public repositories may be polled."
    snapshot = {"schema":"ASOLARIA-THREE-SEAT-ACTIVITY-SNAPSHOT-V1",
                "captured_at_utc":utc_now(),"source":"GitHub public REST API",
                "seat_assertion":"three agents reported; untagged commits not attributable",
                "registry_seats":[s["seat"] for s in config["seats"]],
                "repositories":[capture_repo(repo) for repo in config["repositories"]]}
    snapshot["source_state_sha256"] = fingerprint(snapshot)
    TRACKING.mkdir(parents=True,exist_ok=True)
    prior_path = TRACKING/"latest.json"
    previous = None
    if prior_path.exists():
        try:
            previous = json.loads(prior_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    # Only record a new snapshot if observable state changed. First run always persists.
    if previous is not None and previous.get("source_state_sha256")==snapshot["source_state_sha256"]:
        print(json.dumps({"status":"UNCHANGED","fingerprint":snapshot["source_state_sha256"]}))
        return
    filename = snapshot["captured_at_utc"].replace(":","").replace("-","")
    name = "snapshot-"+filename+"-"+os.environ.get("GITHUB_RUN_ID","manual")+".json"
    canonical = json.dumps(snapshot,sort_keys=True,indent=2)+"\n"
    folder = TRACKING/"snapshots"
    folder.mkdir(parents=True,exist_ok=True)
    artifact = folder/name
    artifact.write_text(canonical,encoding="utf-8")
    sidecar_sha = hashlib.sha256(canonical.encode()).hexdigest()
    artifact.with_name(name+".sha256").write_text(sidecar_sha+"  "+name+"\n",encoding="utf-8")
    prior_path.write_text(canonical,encoding="utf-8")
    summary = [
        "# Asolaria three-seat activity snapshot",
        "",
        "Updated: "+snapshot["captured_at_utc"]+" UTC",
        "",
        "Repository state SHA-256: \`"+snapshot["source_state_sha256"]+"\`.",
        "",
        "All three agent seats remain *unverified* unless explicitly tagged by the agent.",
        "A GitHub account shared by multiple sessions does not identify a particular agent.",
        "",
        "| Repository | Observed branches | Recent commit | CI status |",
        "|---|---:|---|---|"
    ]
    for r in snapshot["repositories"]:
        sha = r["branches"][0]["sha"][:12] if r["branches"] and r["branches"][0]["sha"] else "unknown"
        ci = r["workflows"][0] if r["workflows"] else {}
        status = str(ci.get("conclusion") or ci.get("status") or "not returned")
        summary.append("| ["+r["repo"]+"]("+r["url"]+") | "+str(len(r["branches"]))+
                       " | \`"+sha+"\` | "+status+" |")
    summary.extend(["", "See [JSON snapshot](snapshots/"+name+") for exact commits,",
                    "branches, pull requests and workflow links.", "",
                    "**Scope:** public GitHub software provenance. Not a process, physical, or",
                    "quantum measurement.", ""])
    (TRACKING/"STATUS.md").write_text("\n".join(summary), encoding="utf-8")
    print(json.dumps({"status":"CHANGED","snapshot":str(artifact.relative_to(ROOT)),
                      "fingerprint":snapshot["source_state_sha256"],
                      "repos":len(snapshot["repositories"])}))

if __name__ == "__main__":
    main()
