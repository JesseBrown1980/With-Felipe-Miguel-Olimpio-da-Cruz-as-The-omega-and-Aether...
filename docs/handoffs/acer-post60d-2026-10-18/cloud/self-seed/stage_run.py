"""Stage the office as of a cutoff time from ACER's 198 bodies and run the unchanged writer in it.

Usage: stage_run.py <bodies_dir> <listing.out> <writer.py> <cutoff_utc> <book_file> <prev_seed_or_-> <workdir>
The writer reads OFF = its own folder and the relative paths D:/asolaria-absorb/{laws,shadowcat}/...,
so it is copied unchanged into <workdir>/office and run with cwd <workdir>.
"""
import hashlib, os, shutil, subprocess, sys

bodies, listing, writer, cut, book, prev, work = sys.argv[1:8]
rows = []
for line in open(listing, encoding="utf-8", errors="replace"):
    if line.startswith("AOOMFINDHIT|"):
        rows.append(dict(kv.split("=", 1) for kv in line.strip().split("|")[1:] if "=" in kv))
shutil.rmtree(work, ignore_errors=True)
off = os.path.join(work, "office")
laws = os.path.join(work, "D:", "asolaria-absorb", "laws")
cat = os.path.join(work, "D:", "asolaria-absorb", "shadowcat")
for d in (off, laws, cat):
    os.makedirs(d)
by_sha = {}
for root, _, files in os.walk(bodies):
    for f in files:
        p = os.path.join(root, f)
        by_sha.setdefault(hashlib.sha256(open(p, "rb").read()).hexdigest(), p)
placed = 0
for r in rows:
    name = os.path.basename(r["path"])
    if r.get("birthtime_utc", "") >= cut or name in ("FABLE5-SELF-SEED-3078.hbi", "COMBINED-BOOK-OF-LAWS.md"):
        continue
    src = by_sha[r["sha256"]]
    low = r["path"].replace("\\", "/").lower()
    dst = laws if "/laws/" in low else cat if "/shadowcat/" in low else off
    shutil.copyfile(src, os.path.join(dst, name))
    placed += 1
shutil.copyfile(book, os.path.join(laws, "COMBINED-BOOK-OF-LAWS.md"))
if prev != "-":
    shutil.copyfile(prev, os.path.join(off, "FABLE5-SELF-SEED-3078.hbi"))
shutil.copyfile(writer, os.path.join(off, "emit-self-seed-binary.py"))
subprocess.run([sys.executable, "-I", os.path.join(off, "emit-self-seed-binary.py")], cwd=work,
               check=True, stdout=subprocess.DEVNULL)
out = open(os.path.join(off, "FABLE5-SELF-SEED-3078.hbi"), "rb").read()
print(f"placed={placed} book={hashlib.sha256(open(book,'rb').read()).hexdigest()[:16]} "
      f"prev={'-' if prev == '-' else hashlib.sha256(open(prev,'rb').read()).hexdigest()[:16]} "
      f"out={hashlib.sha256(out).hexdigest()[:16]} bytes={len(out)}")
