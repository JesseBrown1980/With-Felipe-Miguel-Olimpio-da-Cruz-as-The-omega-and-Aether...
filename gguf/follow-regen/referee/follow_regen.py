#!/usr/bin/env python3
"""Cold-lane referee for the FOLLOW timed-chiral GGUFs (stdlib only, integer-only reporting).

Runs the owner's generators from FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS@8712368, vendored unchanged in
../matrix, in a fresh work directory, then compares every file they write, byte for byte:

  public2d      matrix/README.md:57  owner3d_to_public2d.py PUBLIC-OWNER-3D-TREE.hbi -> PUBLIC-OWNER-2D.hbp
                compared with qprism/representation/PUBLIC-OWNER-2D.hbp and the upstream sidecar.
  timed-chiral  timed_chiral_gguf_monitor.py on PUBLIC-OWNER-2D.hbp (--now-ns 7200000000000) and on
                PUBLIC-OWNER-MEDIA-POSITION-2D.hbp (--now-ns 86400000000000), the elapsed_seconds in row 1
                of the stored TIMED-CHIRAL-MONITOR.hbp of each run; the six files of each run compared
                with gguf/follow/matrix and the vendored receipts.
  owner-tests   matrix/README.md:69,70,72  test_owner3d_to_public2d.py, test_spherical_public_projection.py,
                test_timed_chiral_gguf_monitor.py.

Before any step, every UPSTREAM.sha256 line and the referenced seed's size, Git blob id and sha256 are
checked. PUBLIC-OWNER-3D-TREE.hbp is vendored under ../matrix (see ../PROVENANCE.md) and read by
default; --owner3d-hbp optionally names another copy of the upstream file, checked against its pinned
Git blob id and its vendored sidecar the same way before use.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
REPO = HERE.parent.parent
VENDOR = HERE.joinpath("matrix")
UPSTREAM_LIST = HERE.joinpath("UPSTREAM.sha256")
SEED_2D = REPO.joinpath("qprism", "representation", "PUBLIC-OWNER-2D.hbp")
FOLLOW_GGUF = REPO.joinpath("gguf", "follow", "matrix")

UPSTREAM = "JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS@8712368c851abe347ddf97a25bfbd96275d4316c"
OWNER3D_HBP = "PUBLIC-OWNER-3D-TREE.hbp"
OWNER3D_HBP_BLOB = "ea607cbe9b248a5c7f78c95c89960954f92a79c4"
OWNER3D_HBP_BYTES = 66191
SEED_2D_BLOB = "d81a4a9d7c56b5f673526fdc7a27ec5af69363d5"
SEED_2D_BYTES = 97469

GGUF = "TIMED-CHIRAL-PUBLIC-COLOR-ORBITS.gguf"
OUTPUTS = (
    GGUF,
    GGUF + ".sha256",
    "TIMED-CHIRAL-MONITOR.hbp",
    "TIMED-CHIRAL-MONITOR.hbp.sha256",
    "TIMED-CHIRAL-MONITOR.hbi",
    "TIMED-CHIRAL-MONITOR.hbi.sha256",
)
SCRIPTS = ("timed_chiral_gguf_monitor.py", "spherical_public_projection.py", "owner3d_to_public2d.py")
OWNER_TESTS = (
    "test_owner3d_to_public2d.py",
    "test_spherical_public_projection.py",
    "test_timed_chiral_gguf_monitor.py",
)
TEST_FILES = SCRIPTS + OWNER_TESTS + ("collect_public_owner_inventory.py",)

# (seed, --target-seconds, --now-ns, reference dir for the GGUF pair, vendored receipt dir,
#  GGUF sha256 recorded in gguf/MANIFEST.hbp rows 32 and 33)
TIMED_RUNS = (
    (
        "PUBLIC-OWNER-2D.hbp",
        7200,
        7_200_000_000_000,
        FOLLOW_GGUF,
        VENDOR,
        "77174fb892a1c8152de362730d2864ef2b7f929b496af7758a5c42a88798bb6e",
    ),
    (
        "PUBLIC-OWNER-MEDIA-POSITION-2D.hbp",
        86400,
        86_400_000_000_000,
        FOLLOW_GGUF.joinpath("timed-86400-parent-c8c3"),
        VENDOR.joinpath("timed-86400-parent-c8c3"),
        "6afb6229fd2fa23e2dc38c37a31ac9a035b9cddfea2b12bdae1470b03af4425a",
    ),
)


class RefereeError(RuntimeError):
    pass


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()


def row(kind: str, **fields: object) -> str:
    return "|".join([kind, *(f"{key}={value}" for key, value in fields.items()), "json=0"])


def rel(path: Path) -> str:
    try:
        return path.relative_to(REPO).as_posix()
    except ValueError:
        return path.name


def sidecar_sha(name: str) -> str:
    text = VENDOR.joinpath(name + ".sha256").read_text(encoding="ascii")
    match = re.fullmatch(r"([0-9a-f]{64})  " + re.escape(name) + r"\n", text)
    if match is None:
        raise RefereeError(f"sidecar shape {name}.sha256")
    return match.group(1)


def check_vendored() -> list[str]:
    lines = UPSTREAM_LIST.read_text(encoding="ascii").splitlines()
    for line in lines:
        match = re.fullmatch(r"([0-9a-f]{64})  (\S+)", line)
        if match is None or sha256(HERE.joinpath(match.group(2)).read_bytes()) != match.group(1):
            raise RefereeError(f"UPSTREAM.sha256 line {line!r}")
    seed = SEED_2D.read_bytes()
    if (len(seed), git_blob(seed), sha256(seed)) != (
        SEED_2D_BYTES, SEED_2D_BLOB, sidecar_sha("PUBLIC-OWNER-2D.hbp")
    ):
        raise RefereeError("qprism/representation/PUBLIC-OWNER-2D.hbp is not the upstream seed")
    numpy_lines = 0
    for script in VENDOR.glob("*.py"):
        text = script.read_text(encoding="utf-8")
        numpy_lines += len(re.findall(r"^\s*(?:import|from)\s+numpy\b", text, re.MULTILINE))
    return [row("VENDORED", upstream=UPSTREAM, files=len(lines), sha256_equal=len(lines),
                numpy_import_lines=numpy_lines)]


def stage(matrix: Path, names: tuple[str, ...]) -> None:
    matrix.mkdir(parents=True)
    for name in names:
        shutil.copyfile(VENDOR.joinpath(name), matrix.joinpath(name))


def run_owner(cwd: Path, args: list[str]) -> tuple[int, str, str, int]:
    start = time.monotonic_ns()
    done = subprocess.run(
        [sys.executable, "-E", "-s", "-B", *args],
        cwd=cwd,
        capture_output=True,
        timeout=900,
        check=False,
    )
    wall_ms = (time.monotonic_ns() - start) // 1_000_000
    return done.returncode, done.stdout.decode("utf-8"), done.stderr.decode("utf-8"), wall_ms


def compare(step: str, produced: Path, reference: Path) -> tuple[str, int]:
    """Balanced trit: +1 equal bytes, -1 different bytes, 0 a side is missing."""
    if not produced.is_file() or not reference.is_file():
        equal = 0
        data = b""
    else:
        data = produced.read_bytes()
        equal = 1 if data == reference.read_bytes() else -1
    line = row("CMP", step=step, file=produced.name, bytes=len(data), sha256=sha256(data),
               ref=rel(reference), equal=f"{equal:+d}" if equal else "0")
    return line, equal


def step_public2d(work: Path, owner3d_hbp: Path | None) -> tuple[list[str], list[int]]:
    source = owner3d_hbp if owner3d_hbp is not None else VENDOR.joinpath(OWNER3D_HBP)
    data = source.read_bytes()
    pinned = (len(data), git_blob(data), sha256(data))
    if pinned != (OWNER3D_HBP_BYTES, OWNER3D_HBP_BLOB, sidecar_sha(OWNER3D_HBP)):
        raise RefereeError(f"{rel(source)} is not the upstream PUBLIC-OWNER-3D-TREE.hbp")
    root = work.joinpath("public2d")
    matrix = root.joinpath("matrix")
    stage(matrix, SCRIPTS[1:] + ("PUBLIC-OWNER-3D-TREE.hbi", "PUBLIC-OWNER-3D-TREE.hbi.sha256",
                                 OWNER3D_HBP + ".sha256"))
    matrix.joinpath(OWNER3D_HBP).write_bytes(data)
    rc, out, err, wall_ms = run_owner(root, [
        "matrix/owner3d_to_public2d.py", "matrix/PUBLIC-OWNER-3D-TREE.hbi",
        "matrix/PUBLIC-OWNER-2D.hbp", "--replace",
    ])
    expected_out = (
        "OWNER3D_TO_PUBLIC2D|PASS=1|repos=147|sha256=" + sidecar_sha("PUBLIC-OWNER-2D.hbp")
        + "|raw_contents=0|private_metadata=0|json=0\n"
    )
    lines = [row("RUN", step="public2d", script="owner3d_to_public2d.py", rc=rc, wall_ms=wall_ms,
                 owner3d_hbp_blob=pinned[1], stdout_equal="+1" if out == expected_out else "-1",
                 stderr_bytes=len(err.encode("utf-8")))]
    trits = [1 if rc == 0 else -1, 1 if out == expected_out else -1]
    for produced, reference in (
        (matrix.joinpath("PUBLIC-OWNER-2D.hbp"), SEED_2D),
        (matrix.joinpath("PUBLIC-OWNER-2D.hbp.sha256"), VENDOR.joinpath("PUBLIC-OWNER-2D.hbp.sha256")),
    ):
        line, equal = compare("public2d", produced, reference)
        lines.append(line)
        trits.append(equal)
    return lines, trits


def step_timed_chiral(work: Path) -> tuple[list[str], list[int]]:
    lines: list[str] = []
    trits: list[int] = []
    for name, target, now_ns, gguf_dir, receipt_dir, gguf_sha in TIMED_RUNS:
        root = work.joinpath(f"timed-{target}")
        matrix = root.joinpath("matrix")
        if name == "PUBLIC-OWNER-2D.hbp":
            stage(matrix, SCRIPTS[:2] + (name + ".sha256",))
            shutil.copyfile(SEED_2D, matrix.joinpath(name))
        else:
            stage(matrix, SCRIPTS[:2] + (name, name + ".sha256"))
        out_dir = root.joinpath(f"o{target}")
        out_dir.mkdir()
        rc, out, err, wall_ms = run_owner(root, [
            "matrix/timed_chiral_gguf_monitor.py", f"matrix/{name}", out_dir.name,
            "--started-ns", "0", "--now-ns", str(now_ns), "--target-seconds", str(target),
        ])
        expected_out = "TIMED_CHIRAL_MONITOR|PASS=1|status=COMPLETE|json=0\n"
        written = sorted(path.name for path in out_dir.iterdir())
        gguf = out_dir.joinpath(GGUF)
        produced_sha = sha256(gguf.read_bytes()) if gguf.is_file() else "NONE"
        lines.append(row("RUN", step="timed-chiral", seed=name, started_ns=0, now_ns=now_ns,
                         target_seconds=target, rc=rc, wall_ms=wall_ms,
                         stdout_equal="+1" if out == expected_out else "-1",
                         stderr_bytes=len(err.encode("utf-8")), files_written=len(written),
                         gguf_sha256=produced_sha,
                         gguf_sha256_recorded="+1" if produced_sha == gguf_sha else "-1"))
        trits += [
            1 if rc == 0 else -1,
            1 if out == expected_out else -1,
            1 if written == sorted(OUTPUTS) else -1,
            1 if produced_sha == gguf_sha else -1,
        ]
        for output in OUTPUTS:
            reference_dir = gguf_dir if output.startswith(GGUF) else receipt_dir
            line, equal = compare(f"timed-{target}", out_dir.joinpath(output),
                                  reference_dir.joinpath(output))
            lines.append(line)
            trits.append(equal)
    return lines, trits


def unittest_count(err: str, name: str) -> int:
    found = re.search(rf"\b{name}=(\d+)", err)
    return int(found.group(1)) if found else 0


def step_owner_tests(work: Path) -> tuple[list[str], list[int]]:
    root = work.joinpath("owner-tests")
    stage(root.joinpath("matrix"), TEST_FILES)
    lines: list[str] = []
    trits: list[int] = []
    for script in OWNER_TESTS:
        rc, out, err, wall_ms = run_owner(root, [f"matrix/{script}"])
        ran = re.search(r"^Ran (\d+) tests? in ", err, re.MULTILINE)
        tests = int(ran.group(1)) if ran else 0
        lines.append(row("RUN", step="owner-tests", script=script, rc=rc, wall_ms=wall_ms,
                         tests_run=tests, skipped=unittest_count(err, "skipped"),
                         failures=unittest_count(err, "failures"),
                         errors=unittest_count(err, "errors"),
                         stdout_bytes=len(out.encode("utf-8"))))
        trits.append(1 if rc == 0 and tests > 0 else -1)
    return lines, trits


STEPS = ("public2d", "timed-chiral", "owner-tests")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="run every step (the default)")
    parser.add_argument("--step", action="append", choices=STEPS)
    parser.add_argument("--owner3d-hbp", type=Path, help="upstream matrix/PUBLIC-OWNER-3D-TREE.hbp")
    parser.add_argument("--work", type=Path, help="keep the work tree here (must not exist)")
    args = parser.parse_args(argv)
    steps = STEPS if args.check or not args.step else tuple(dict.fromkeys(args.step))
    if args.work is not None:
        args.work.mkdir(parents=True)
        work = args.work.resolve()
    else:
        work = Path(tempfile.mkdtemp(prefix="follow-regen-")).resolve()
    trits: list[int] = []
    try:
        for line in check_vendored():
            print(line)
        for step in steps:
            if step == "public2d":
                lines, results = step_public2d(work, args.owner3d_hbp)
            elif step == "timed-chiral":
                lines, results = step_timed_chiral(work)
            else:
                lines, results = step_owner_tests(work)
            for line in lines:
                print(line)
            trits += results
    except (RefereeError, OSError, UnicodeError, subprocess.SubprocessError) as exc:
        print(row("VERDICT", reason=type(exc).__name__, detail=str(exc), **{"pass": "-1"}))
        return 1
    finally:
        if args.work is None:
            shutil.rmtree(work, ignore_errors=True)
    passed = bool(trits) and all(trit == 1 for trit in trits)
    print(row("VERDICT", steps=len(steps), checks=len(trits), checks_plus=trits.count(1),
              checks_minus=trits.count(-1), checks_zero=trits.count(0),
              python=".".join(str(part) for part in sys.version_info[:3]),
              **{"pass": "+1" if passed else "-1"}))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
