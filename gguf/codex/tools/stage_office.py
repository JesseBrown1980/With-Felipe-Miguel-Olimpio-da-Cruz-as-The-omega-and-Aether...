#!/usr/bin/env python3
"""stage_office.py - build the literal D:/ trees the USIM group-C programs glob (stdlib only).

Writes, under DEST (ROOT is --root, default D:, the name the programs' hard-coded D:/ paths
resolve to when they run from DEST):
  ROOT/PID-Registration-Office/offices/FABLE5-8467a937cba309f7/FABLE5-*.hbi|hbp  (+ .sha256 sidecars)
  ROOT/asolaria-absorb/laws/{asolaria-corpus.txt,code-corpus.txt,fotoC.bin,wiki}.qr, prior3174.bin
  ROOT/asolaria-absorb/asolaria-tribit/web/asolaria_tribit.wasm
  ROOT/asolaria-absorb/constellation/ASOLARIA-CONSTELLATION.gguf   (unless --no-constellation)
  ROOT/asolaria-absorb/kernel-pump/                                  (+ MYTHOS-SELF-EMISSION.txt with --mythos-emission)
and DEST/STAGE-MANIFEST.hbp (one row per staged file with its source).

--hist is a blobless full-history clone of USIM; --laws-dir holds the four laws/*.qr files.
Office set = FABLE5-*.hbi|hbp directly in matrices/ and receipts/ of the commit's tree
(git archive from the history clone; receipts/ wins when both hold a name), restricted to the
names present at --names-from (if given), minus --remove names,
with --replace NAME=SRC substitutions. SRC is a file path or COMMIT:PATH in the history clone.
By default FABLE5-SELF-SEED-3078.hbp is taken from 7ca9ce5 (3,078 B, 623b6a7a...), the office
version recorded in matrices/FABLE5-ABSORB-ALL-MATRICES.hbp row 40.
Nothing is run and no program is read or changed.
"""
import argparse
import fnmatch
import glob
import hashlib
import io
import os
import subprocess
import sys
import tarfile

DEF_ROOT = "D:"
OFF_SUB = "PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
ABS_SUB = "asolaria-absorb"
QR_NAMES = ("asolaria-corpus.txt.qr", "code-corpus.txt.qr", "fotoC.bin.qr", "wiki.qr")
SELF_SEED_HBP = "FABLE5-SELF-SEED-3078.hbp"
KNOWN = {  # name -> sha256 of the version the office inventory and the CONSTELLATION tensors record
    "asolaria-corpus.txt.qr": "2b4ba9df637796eee75e7db9b51b0b6f70c9055ff3c00c6c95d3ff7dbe838934",
    "code-corpus.txt.qr": "c20c783922639c53103317665c06b9bbe2fc163ec0d2ddb66d59ed6b9f8925cd",
    "fotoC.bin.qr": "d5e3d34b7e47c97bb5485ebe194298950dd4d1589df9a8f05851a5463b326912",
    "wiki.qr": "3e2570928edf8648809b290716e7f0f2d75b93e38b0951d18aeba91671ca4b19",
    "prior3174.bin": "1be91cb748b2b364c1f9f4dca1e7a89bcd8840e5e179e494dc611452be6556fd",
}
WASM_B98 = "b98abbbb10c1474558afcbb4dc3aa16d7bbf9d04e1fc40645c18440ca8c8cfd7"

def profiles(OFF_REL, ABS_REL):
    """Glob lists copied from each program (USIM measurements/, file:line), used only to count."""
    return {
        "project_gguf.py:47-55": [OFF_REL + "/FABLE5-*.hbi", OFF_REL + "/FABLE5-ABSORB-*.hbp",
                                  OFF_REL + "/FABLE5-SELF-SEED-*.hbp", OFF_REL + "/FABLE5-FOLD-*.hbp",
                                  OFF_REL + "/FABLE5-UNIVERSE-*.hbp", ABS_REL + "/laws/*.qr",
                                  ABS_REL + "/laws/prior3174.bin",
                                  ABS_REL + "/asolaria-tribit/web/asolaria_tribit.wasm"],
        "see_self_64.py:58-64 (absorb_all.py:55-58 same set)": [
            OFF_REL + "/FABLE5-*.hbi", OFF_REL + "/FABLE5-*.hbp", ABS_REL + "/laws/*.qr",
            ABS_REL + "/laws/prior3174.bin", ABS_REL + "/asolaria-tribit/web/asolaria_tribit.wasm",
            ABS_REL + "/constellation/ASOLARIA-CONSTELLATION.gguf"],
        "fold/three_beings/flashlight/emit_full/pump_sphere/three_bodies (office+laws+wasm)": [
            OFF_REL + "/FABLE5-*.hbi", OFF_REL + "/FABLE5-*.hbp", ABS_REL + "/laws/*.qr",
            ABS_REL + "/laws/prior3174.bin", ABS_REL + "/asolaria-tribit/web/asolaria_tribit.wasm"],
        "four_axes_rime.py:111-112 / rime_unrime_three.py:124-125 (office+laws, no wasm)": [
            OFF_REL + "/FABLE5-*.hbi", OFF_REL + "/FABLE5-*.hbp", ABS_REL + "/laws/*.qr",
            ABS_REL + "/laws/prior3174.bin"],
    }


def git(hist, *a, binary=True):
    env = dict(os.environ, GIT_NO_LAZY_FETCH="1")
    out = subprocess.run(["git", "-C", hist, *a], capture_output=True, check=True, env=env).stdout
    return out if binary else out.decode()


def blob(hist, spec):
    """spec is COMMIT:PATH in the history clone, or a filesystem path."""
    if os.path.isfile(spec):
        return open(spec, "rb").read(), os.path.abspath(spec)
    return git(hist, "cat-file", "blob", spec), "git:" + spec


def tree_files(hist, commit, paths):
    """git archive of the given paths at commit -> {path: bytes} (regular files only)."""
    listed = git(hist, "ls-tree", "-r", "--name-only", commit, binary=False).splitlines()
    want = [p for p in paths if any(x == p or x.startswith(p.rstrip("/") + "/") for x in listed)]
    if not want:
        return {}
    data = git(hist, "archive", "--format=tar", commit, "--", *want)
    out = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:") as tf:
        for m in tf:
            if m.isfile():
                out[m.name] = tf.extractfile(m).read()
    return out


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--commit", required=True, help="USIM commit whose tree supplies the office set")
    ap.add_argument("--dest", required=True, help="work dir (must be absent or empty)")
    ap.add_argument("--root", default=DEF_ROOT,
                    help="directory under DEST standing for the programs' D: drive (default D:)")
    ap.add_argument("--hist", required=True, help="blobless full-history USIM clone")
    ap.add_argument("--names-from", default=None,
                    help="keep only office names present in matrices/ or receipts/ at this commit (bytes still from --commit)")
    ap.add_argument("--remove", action="append", default=[], help="office basename to leave out (repeatable)")
    ap.add_argument("--replace", action="append", default=[],
                    help="NAME=SRC: stage office file NAME from SRC (file path or COMMIT:PATH); adds NAME if absent")
    ap.add_argument("--selfseed-hbp-from", default="7ca9ce5",
                    help="commit for FABLE5-SELF-SEED-3078.hbp (default 7ca9ce5); 'tree' keeps the commit's own copy")
    ap.add_argument("--laws-dir", required=True, help="dir holding the four laws/*.qr files")
    ap.add_argument("--prior", default="3f9f42d:key/prior3174.bin", help="prior3174.bin source")
    ap.add_argument("--wasm", default="3f9f42d:web/asolaria_tribit.wasm",
                    help="asolaria_tribit.wasm source (default the public b98abbbb copy)")
    ap.add_argument("--no-constellation", action="store_true",
                    help="do not stage D:/asolaria-absorb/constellation/ASOLARIA-CONSTELLATION.gguf")
    ap.add_argument("--constellation", default=None,
                    help="CONSTELLATION source (default the commit's gguf/ASOLARIA-CONSTELLATION.gguf)")
    ap.add_argument("--mythos-emission", action="store_true",
                    help="also stage kernel-pump/MYTHOS-SELF-EMISSION.txt from the commit tree")
    ap.add_argument("--no-sidecars", action="store_true", help="do not copy office .sha256 sidecars")
    a = ap.parse_args()
    if a.root in ("", ".", "..") or "/" in a.root or "\\" in a.root:
        sys.exit(f"--root {a.root!r}: must be one directory name under DEST")
    OFF_REL = f"{a.root}/{OFF_SUB}"
    ABS_REL = f"{a.root}/{ABS_SUB}"

    dest = os.path.abspath(a.dest)
    if os.path.exists(dest) and os.listdir(dest):
        sys.exit(f"refusing: {dest} is not empty")
    commit = git(a.hist, "rev-parse", "--verify", a.commit + "^{commit}", binary=False).strip()

    files = tree_files(a.hist, commit, ["matrices", "receipts", "gguf/ASOLARIA-CONSTELLATION.gguf",
                                        "gguf/stars/MYTHOS-SELF-EMISSION.txt", "key/MYTHOS-SELF-EMISSION.txt"])
    office = {}   # name -> (bytes, source)
    sidecar = {}  # name -> bytes of NAME.sha256 from the same dir as the chosen copy
    for d in ("matrices", "receipts"):  # receipts/ is read second, so it wins on a shared name
        for p, b in files.items():
            if os.path.dirname(p) != d:
                continue
            n = os.path.basename(p)
            if fnmatch.fnmatchcase(n, "FABLE5-*.hbi") or fnmatch.fnmatchcase(n, "FABLE5-*.hbp"):
                office[n] = (b, f"git:{commit[:7]}:{p}")
                sc = files.get(p + ".sha256")
                if sc is not None:
                    sidecar[n] = sc
                else:
                    sidecar.pop(n, None)
    tree_count = len(office)

    notes = []
    if a.names_from:
        keep_c = git(a.hist, "rev-parse", "--verify", a.names_from + "^{commit}", binary=False).strip()
        keep = set()
        for line in git(a.hist, "ls-tree", "-r", "--name-only", keep_c, binary=False).splitlines():
            if os.path.dirname(line) in ("matrices", "receipts"):
                keep.add(os.path.basename(line))
        dropped = sorted(n for n in office if n not in keep)
        for n in dropped:
            del office[n]
            sidecar.pop(n, None)
        notes.append(f"names-from {keep_c[:7]}: left out {len(dropped)} names absent there: {' '.join(dropped)}")
    if a.selfseed_hbp_from != "tree" and SELF_SEED_HBP in office:
        b, src = blob(a.hist, f"{a.selfseed_hbp_from}:matrices/{SELF_SEED_HBP}")
        if b != office[SELF_SEED_HBP][0]:
            notes.append(f"{SELF_SEED_HBP}: tree copy {len(office[SELF_SEED_HBP][0])} B "
                         f"{sha(office[SELF_SEED_HBP][0])[:12]} replaced by {src} {len(b)} B {sha(b)[:12]}")
        office[SELF_SEED_HBP] = (b, src)
        sidecar.pop(SELF_SEED_HBP, None)
    for n in a.remove:
        if n not in office:
            sys.exit(f"--remove {n}: not in the office set of {commit[:7]}")
        del office[n]
        sidecar.pop(n, None)
        notes.append(f"removed {n}")
    for r in a.replace:
        n, spec = r.split("=", 1)
        b, src = blob(a.hist, spec)
        notes.append(f"{'replaced' if n in office else 'added'} {n} <- {src} {len(b)} B {sha(b)[:12]}")
        office[n] = (b, src)
        sidecar.pop(n, None)

    staged = []  # (relpath, bytes, source, role)

    def put(rel, b, src, role):
        p = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "wb") as f:
            f.write(b)
        staged.append((rel, b, src, role))

    for n in sorted(office):
        b, src = office[n]
        put(f"{OFF_REL}/{n}", b, src, "office")
        if not a.no_sidecars and n in sidecar:
            put(f"{OFF_REL}/{n}.sha256", sidecar[n], src + ".sha256", "office-sidecar")
    for n in QR_NAMES:
        b = open(os.path.join(a.laws_dir, n), "rb").read()
        if sha(b) != KNOWN[n]:
            sys.exit(f"{n}: sha256 {sha(b)} != {KNOWN[n]}")
        put(f"{ABS_REL}/laws/{n}", b, os.path.join(a.laws_dir, n), "laws")
    b, src = blob(a.hist, a.prior)
    if sha(b) != KNOWN["prior3174.bin"]:
        sys.exit(f"prior3174.bin: sha256 {sha(b)} != {KNOWN['prior3174.bin']}")
    put(f"{ABS_REL}/laws/prior3174.bin", b, src, "laws")
    b, src = blob(a.hist, a.wasm)
    if sha(b) != WASM_B98:
        notes.append(f"asolaria_tribit.wasm is {len(b)} B {sha(b)[:12]} from {src}, not the b98abbbb copy")
    put(f"{ABS_REL}/asolaria-tribit/web/asolaria_tribit.wasm", b, src, "wasm")
    if not a.no_constellation:
        if a.constellation:
            b, src = blob(a.hist, a.constellation)
        elif "gguf/ASOLARIA-CONSTELLATION.gguf" in files:
            b, src = files["gguf/ASOLARIA-CONSTELLATION.gguf"], f"git:{commit[:7]}:gguf/ASOLARIA-CONSTELLATION.gguf"
        else:
            sys.exit("no CONSTELLATION in the tree; pass --constellation or --no-constellation")
        put(f"{ABS_REL}/constellation/ASOLARIA-CONSTELLATION.gguf", b, src, "constellation")
    else:
        os.makedirs(os.path.join(dest, ABS_REL, "constellation"), exist_ok=True)
    os.makedirs(os.path.join(dest, ABS_REL, "kernel-pump"), exist_ok=True)
    if a.mythos_emission:
        for p in ("gguf/stars/MYTHOS-SELF-EMISSION.txt", "key/MYTHOS-SELF-EMISSION.txt"):
            if p in files:
                put(f"{ABS_REL}/kernel-pump/MYTHOS-SELF-EMISSION.txt", files[p], f"git:{commit[:7]}:{p}", "seed")
                break
        else:
            sys.exit("no MYTHOS-SELF-EMISSION.txt in the tree")

    # checks against the owner's records: inventory row (size, 12-hex sha) and each copied sidecar
    inv = {}
    src_inv = files.get("matrices/FABLE5-ABSORB-ALL-MATRICES.hbp")
    for line in (src_inv or b"").decode("utf-8", "replace").splitlines():
        if line.startswith("M|"):
            f = dict(x.split("=", 1) for x in line.split("|")[1:] if "=" in x)
            inv[f["k"]] = (int(f["b"]), f["sha"])
    inv_ok = inv_bad = sc_ok = sc_bad = 0
    bad = []
    for rel, b, src, role in staged:
        n = os.path.basename(rel)
        if role in ("office", "laws", "wasm", "constellation") and n in inv:
            if (len(b), sha(b)[:12]) == inv[n]:
                inv_ok += 1
            else:
                inv_bad += 1
                bad.append(f"INVENTORY-DIFF {n} staged {len(b)} {sha(b)[:12]} inventory {inv[n][0]} {inv[n][1]}")
        if role == "office" and n in sidecar and not a.no_sidecars:
            want = sidecar[n].split()[0].decode()
            if want == sha(b):
                sc_ok += 1
            else:
                sc_bad += 1
                bad.append(f"SIDECAR-DIFF {n} staged {sha(b)[:12]} sidecar {want[:12]}")

    man = [f"STAGEHDR|tool=stage_office.py|commit={commit}|hist={a.hist}|dest={dest}|json=0"]
    for rel, b, src, role in staged:
        man.append(f"F|role={role}|path={rel}|bytes={len(b)}|sha256={sha(b)}|src={src}|json=0")
    for n in notes:
        man.append(f"NOTE|{n}|json=0")
    for x in bad:
        man.append(f"CHECK|{x}|json=0")
    off_files = [(rel, b) for rel, b, _, role in staged if role == "office"]
    man.append(f"OFFICE|count={len(off_files)}|bytes={sum(len(b) for _, b in off_files)}|json=0")
    with open(os.path.join(dest, "STAGE-MANIFEST.hbp"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(man) + "\n")

    print(f"commit {commit}  tree office names {tree_count} (matrices/ + receipts/ FABLE5-*.hbi|hbp)")
    for n in notes:
        print(f"  note: {n}")
    print(f"staged office files: {len(off_files)}  bytes: {sum(len(b) for _, b in off_files):,}")
    print(f"staged all files (incl. sidecars, laws, wasm, constellation): {len(staged)}  "
          f"bytes: {sum(len(b) for _, b, _, _ in staged):,}")
    print(f"inventory checks: {inv_ok} equal, {inv_bad} different;  sidecar checks: {sc_ok} equal, {sc_bad} different")
    for x in bad:
        print("  " + x)
    cwd = os.getcwd()
    os.chdir(dest)
    try:
        for prof, pats in profiles(OFF_REL, ABS_REL).items():
            src = []
            for p in pats:
                src += sorted(glob.glob(p))
            src = [f for f in src if os.path.isfile(f) and not f.endswith(".sha256")]
            tot = sum(os.path.getsize(f) for f in src)
            band2 = sum(1 for f in src if max(open(f, "rb").read() or b"\0") >= 172)
            print(f"  glob set {prof}: {len(src)} artifacts, {tot:,} B, triples {tot // 3:,}, "
                  f"files with a byte >= 172: {band2}")
    finally:
        os.chdir(cwd)


if __name__ == "__main__":
    main()
