"""Parse ACER's writer-input listing and show the writer's top-38 picks for a given cutoff time."""
import re, sys, os
rows = []
for line in open(sys.argv[1], encoding="utf-8", errors="replace"):
    if not line.startswith("AOOMFINDHIT|"):
        continue
    f = dict(kv.split("=", 1) for kv in line.strip().split("|")[1:] if "=" in kv)
    rows.append(f)
print("rows", len(rows))
seen = {}
for r in rows:
    r["name"] = os.path.basename(r["path"])
    r["bytes"] = int(r["bytes"])
for r in rows:
    if "SELF-SEED" in r["name"] or "COMBINED-BOOK" in r["name"]:
        print("KEY", r["name"], r["bytes"], "birth", r.get("birthtime_utc"), "mtime", r.get("mtime_utc"), r["sha256"][:16])
cut = sys.argv[2] if len(sys.argv) > 2 else None
cand = [r for r in rows if (cut is None or r.get("birthtime_utc", "") < cut)]
names = set()
files = []
for r in cand:
    if r["name"] not in names:
        names.add(r["name"]); files.append(r)
files.sort(key=lambda r: (-r["bytes"], r["name"]))
for i, r in enumerate(files[:40]):
    late = "MODIFIED_AFTER" if cut and r.get("mtime_utc", "") >= cut else ""
    print(i, r["name"], r["bytes"], r["sha256"][:16], r.get("birthtime_utc", "")[:19], r.get("mtime_utc", "")[:19], late)
