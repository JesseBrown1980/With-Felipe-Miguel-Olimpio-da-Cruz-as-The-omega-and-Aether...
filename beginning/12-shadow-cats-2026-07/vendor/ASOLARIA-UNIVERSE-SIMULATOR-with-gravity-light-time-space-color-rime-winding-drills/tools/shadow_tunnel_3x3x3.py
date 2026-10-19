#!/usr/bin/env python3
"""Three HTTPS shadow kernels around one content-addressed middle.

This is a software-topology proof:

    3 HTTPS kernels x 3 ordered branches x 3 ordered leaves = 27 leaves

The three kernels share one immutable topology and one Omega digest.  Omega is
the root of a domain-separated, fixed-width, ordered SHA-256 DAG.  There is no
fourth HTTP server: fan-in is performed by the invoking process.

TLS certificate and private-key paths are accepted only from the CLI.  No key
material is generated, embedded, printed, or committed by this module.

The exact C^3/R^6 check uses rational arithmetic in Q(sqrt(3)); it does not use
floating-point approximations.  This process remeasures the software topology
only; Jesse's physical law remains separately tagged as operator canon.

Stdlib only.  Python 3.9+.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import ipaddress
import re
import ssl
import struct
import sys
import threading
import time
import urllib.request
from dataclasses import dataclass, replace
from fractions import Fraction
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple


KERNEL_COUNT = 3
BRANCHES_PER_KERNEL = 3
LEAVES_PER_BRANCH = 3
TOTAL_LEAVES = KERNEL_COUNT * BRANCHES_PER_KERNEL * LEAVES_PER_BRANCH

_U32 = struct.Struct(">I")
_LEAF_HEADER = struct.Struct(">IIIQ")
_BRANCH_HEADER = struct.Struct(">III")
_KERNEL_HEADER = struct.Struct(">II")
_OMEGA_HEADER = struct.Struct(">I")
_INDEXED_DIGEST = struct.Struct(">I32s")


def _domain(label: str) -> bytes:
    """Return an exact 32-byte domain separator."""
    raw = ("ASO-SHADOW-3X3X3-V1:" + label).encode("ascii")
    if len(raw) > 32:
        raise ValueError("domain label is too long")
    return raw.ljust(32, b"\x00")


DOMAIN_LEAF = _domain("LEAF")
DOMAIN_BRANCH = _domain("BRANCH")
DOMAIN_KERNEL = _domain("KERNEL")
DOMAIN_OMEGA = _domain("OMEGA")


class TopologyError(ValueError):
    """A topology, geometry, or fan-in invariant failed."""

    def __init__(self, code: str, message: str):
        super().__init__("%s: %s" % (code, message))
        self.code = code


@dataclass(frozen=True)
class Leaf:
    kernel: int
    branch: int
    leaf: int
    payload: bytes
    digest: bytes

    @property
    def coordinate(self) -> Tuple[int, int, int]:
        return (self.kernel, self.branch, self.leaf)


@dataclass(frozen=True)
class Branch:
    kernel: int
    branch: int
    leaves: Tuple[Leaf, ...]
    digest: bytes


@dataclass(frozen=True)
class Kernel:
    kernel: int
    branches: Tuple[Branch, ...]
    digest: bytes


@dataclass(frozen=True)
class Topology:
    kernels: Tuple[Kernel, ...]
    omega: bytes

    @property
    def ordered_leaves(self) -> Tuple[Leaf, ...]:
        return tuple(
            leaf
            for kernel in self.kernels
            for branch in kernel.branches
            for leaf in branch.leaves
        )

    @property
    def leaf_map(self) -> Mapping[Tuple[int, int, int], Leaf]:
        return {leaf.coordinate: leaf for leaf in self.ordered_leaves}


@dataclass(frozen=True)
class Observation:
    kernel: int
    branch: int
    leaf: int
    payload: bytes
    declared_digest: bytes
    declared_omega: bytes

    @property
    def coordinate(self) -> Tuple[int, int, int]:
        return (self.kernel, self.branch, self.leaf)


@dataclass(frozen=True)
class HTTPSFanIn:
    observations: Tuple[Observation, ...]
    omega_bodies: Tuple[bytes, ...]
    root_bodies: Tuple[bytes, ...]
    branch_bodies: Tuple[bytes, ...]


def expected_coordinates() -> Tuple[Tuple[int, int, int], ...]:
    return tuple(
        (kernel, branch, leaf)
        for kernel in range(KERNEL_COUNT)
        for branch in range(BRANCHES_PER_KERNEL)
        for leaf in range(LEAVES_PER_BRANCH)
    )


def default_payload(kernel: int, branch: int, leaf: int) -> bytes:
    return (
        "SHADOWLEAF|kernel=%d|branch=%d|leaf=%d|json=0\n"
        % (kernel, branch, leaf)
    ).encode("ascii")


def hash_leaf(kernel: int, branch: int, leaf: int, payload: bytes) -> bytes:
    header = _LEAF_HEADER.pack(kernel, branch, leaf, len(payload))
    return hashlib.sha256(DOMAIN_LEAF + header + payload).digest()


def hash_branch(kernel: int, branch: int, leaf_digests: Sequence[bytes]) -> bytes:
    if len(leaf_digests) != LEAVES_PER_BRANCH:
        raise TopologyError("BRANCH_WIDTH", "a branch must contain exactly 3 leaves")
    material = bytearray(DOMAIN_BRANCH)
    material.extend(_BRANCH_HEADER.pack(kernel, branch, len(leaf_digests)))
    for index, digest in enumerate(leaf_digests):
        if len(digest) != hashlib.sha256().digest_size:
            raise TopologyError("DIGEST_WIDTH", "leaf digest must be 32 bytes")
        material.extend(_INDEXED_DIGEST.pack(index, digest))
    return hashlib.sha256(material).digest()


def hash_kernel(kernel: int, branch_digests: Sequence[bytes]) -> bytes:
    if len(branch_digests) != BRANCHES_PER_KERNEL:
        raise TopologyError("KERNEL_WIDTH", "a kernel must contain exactly 3 branches")
    material = bytearray(DOMAIN_KERNEL)
    material.extend(_KERNEL_HEADER.pack(kernel, len(branch_digests)))
    for index, digest in enumerate(branch_digests):
        if len(digest) != hashlib.sha256().digest_size:
            raise TopologyError("DIGEST_WIDTH", "branch digest must be 32 bytes")
        material.extend(_INDEXED_DIGEST.pack(index, digest))
    return hashlib.sha256(material).digest()


def hash_omega(kernel_digests: Sequence[bytes]) -> bytes:
    if len(kernel_digests) != KERNEL_COUNT:
        raise TopologyError("OMEGA_WIDTH", "Omega must contain exactly 3 kernels")
    material = bytearray(DOMAIN_OMEGA)
    material.extend(_OMEGA_HEADER.pack(len(kernel_digests)))
    for index, digest in enumerate(kernel_digests):
        if len(digest) != hashlib.sha256().digest_size:
            raise TopologyError("DIGEST_WIDTH", "kernel digest must be 32 bytes")
        material.extend(_INDEXED_DIGEST.pack(index, digest))
    return hashlib.sha256(material).digest()


def build_topology(
    payload_factory: Callable[[int, int, int], bytes] = default_payload,
) -> Topology:
    kernels: List[Kernel] = []
    for kernel_index in range(KERNEL_COUNT):
        branches: List[Branch] = []
        for branch_index in range(BRANCHES_PER_KERNEL):
            leaves: List[Leaf] = []
            for leaf_index in range(LEAVES_PER_BRANCH):
                payload = bytes(payload_factory(kernel_index, branch_index, leaf_index))
                digest = hash_leaf(kernel_index, branch_index, leaf_index, payload)
                leaves.append(
                    Leaf(kernel_index, branch_index, leaf_index, payload, digest)
                )
            branch_digest = hash_branch(
                kernel_index, branch_index, [leaf.digest for leaf in leaves]
            )
            branches.append(
                Branch(kernel_index, branch_index, tuple(leaves), branch_digest)
            )
        kernel_digest = hash_kernel(
            kernel_index, [branch.digest for branch in branches]
        )
        kernels.append(Kernel(kernel_index, tuple(branches), kernel_digest))

    topology = Topology(tuple(kernels), hash_omega([k.digest for k in kernels]))
    validate_topology(topology)
    return topology


def validate_topology(topology: Topology) -> None:
    if len(topology.kernels) != KERNEL_COUNT:
        raise TopologyError("KERNEL_COUNT", "exactly 3 kernels are required")
    if len({id(kernel) for kernel in topology.kernels}) != KERNEL_COUNT:
        raise TopologyError("STALE_REFERENCE", "kernel objects must be fresh references")

    coordinates: List[Tuple[int, int, int]] = []
    all_branches: List[Branch] = []
    all_leaves: List[Leaf] = []
    recomputed_kernels: List[bytes] = []
    for kernel_index, kernel in enumerate(topology.kernels):
        if kernel.kernel != kernel_index:
            raise TopologyError("KERNEL_ORDER", "kernel order is not canonical")
        if len(kernel.branches) != BRANCHES_PER_KERNEL:
            raise TopologyError("BRANCH_COUNT", "each kernel requires 3 branches")
        all_branches.extend(kernel.branches)
        recomputed_branches: List[bytes] = []
        for branch_index, branch in enumerate(kernel.branches):
            if (branch.kernel, branch.branch) != (kernel_index, branch_index):
                raise TopologyError("BRANCH_ORDER", "branch order is not canonical")
            if len(branch.leaves) != LEAVES_PER_BRANCH:
                raise TopologyError("LEAF_COUNT", "each branch requires 3 leaves")
            all_leaves.extend(branch.leaves)
            recomputed_leaves: List[bytes] = []
            for leaf_index, leaf in enumerate(branch.leaves):
                expected = (kernel_index, branch_index, leaf_index)
                if leaf.coordinate != expected:
                    raise TopologyError("LEAF_ORDER", "leaf order is not canonical")
                if not leaf.payload:
                    raise TopologyError("EMPTY_LEAF", "leaf payloads must be nonzero")
                digest = hash_leaf(*expected, leaf.payload)
                if not hmac.compare_digest(digest, leaf.digest):
                    raise TopologyError("LEAF_HASH", "leaf digest mismatch")
                coordinates.append(expected)
                recomputed_leaves.append(digest)
            branch_digest = hash_branch(
                kernel_index, branch_index, recomputed_leaves
            )
            if not hmac.compare_digest(branch_digest, branch.digest):
                raise TopologyError("BRANCH_HASH", "branch digest mismatch")
            recomputed_branches.append(branch_digest)
        kernel_digest = hash_kernel(kernel_index, recomputed_branches)
        if not hmac.compare_digest(kernel_digest, kernel.digest):
            raise TopologyError("KERNEL_HASH", "kernel digest mismatch")
        recomputed_kernels.append(kernel_digest)

    if coordinates != list(expected_coordinates()):
        raise TopologyError("COORDINATE_SET", "the exact ordered 3x3x3 grid is required")
    if len(set(coordinates)) != TOTAL_LEAVES:
        raise TopologyError("DUPLICATE", "leaf coordinates must be unique")
    if len({id(branch) for branch in all_branches}) != KERNEL_COUNT * 3:
        raise TopologyError("STALE_REFERENCE", "branch objects must be fresh references")
    if len({id(leaf) for leaf in all_leaves}) != TOTAL_LEAVES:
        raise TopologyError("STALE_REFERENCE", "leaf objects must be fresh references")
    if len({leaf.payload for leaf in all_leaves}) != TOTAL_LEAVES:
        raise TopologyError(
            "PAYLOAD_DUPLICATE",
            "all 27 payload contents must be distinct before coordinate hashing",
        )

    omega = hash_omega(recomputed_kernels)
    if not hmac.compare_digest(omega, topology.omega):
        raise TopologyError("OMEGA_HASH", "shared Omega digest mismatch")


def observations_from_topology(topology: Topology) -> Tuple[Observation, ...]:
    return tuple(
        Observation(
            leaf.kernel,
            leaf.branch,
            leaf.leaf,
            leaf.payload,
            leaf.digest,
            topology.omega,
        )
        for leaf in topology.ordered_leaves
    )


def verify_fanin(topology: Topology, observations: Sequence[Observation]) -> bytes:
    """Verify exact 27/27 ordered fan-in and return the recomputed Omega."""
    if len(observations) != TOTAL_LEAVES:
        raise TopologyError(
            "FANIN_COUNT",
            "expected 27 observations, got %d" % len(observations),
        )

    coordinates = [observation.coordinate for observation in observations]
    if len(set(coordinates)) != TOTAL_LEAVES:
        raise TopologyError("DUPLICATE", "fan-in contains duplicate coordinates")
    if coordinates != list(expected_coordinates()):
        raise TopologyError("ORDER", "fan-in coordinates are not in canonical order")

    kernel_digests: List[bytes] = []
    cursor = 0
    for kernel_index in range(KERNEL_COUNT):
        branch_digests: List[bytes] = []
        for branch_index in range(BRANCHES_PER_KERNEL):
            leaf_digests: List[bytes] = []
            for leaf_index in range(LEAVES_PER_BRANCH):
                observation = observations[cursor]
                cursor += 1
                digest = hash_leaf(
                    kernel_index,
                    branch_index,
                    leaf_index,
                    observation.payload,
                )
                if not hmac.compare_digest(digest, observation.declared_digest):
                    raise TopologyError(
                        "MUTATION", "payload does not match its declared leaf digest"
                    )
                if not hmac.compare_digest(
                    observation.declared_omega, topology.omega
                ):
                    raise TopologyError(
                        "MIDDLE_DIVERGENCE",
                        "a kernel did not declare the shared Omega",
                    )
                leaf_digests.append(digest)
            branch_digests.append(
                hash_branch(kernel_index, branch_index, leaf_digests)
            )
        kernel_digests.append(hash_kernel(kernel_index, branch_digests))

    omega = hash_omega(kernel_digests)
    if not hmac.compare_digest(omega, topology.omega):
        raise TopologyError("OMEGA_HASH", "fan-in did not reproduce Omega")
    return omega


def run_negative_controls(topology: Topology) -> Mapping[str, str]:
    """Run the required mutation, omission, swap, and duplicate controls."""
    good = list(observations_from_topology(topology))
    controls = {
        "mutation": (
            [replace(good[0], payload=good[0].payload + b"!")] + good[1:],
            "MUTATION",
        ),
        "omission": (good[:-1], "FANIN_COUNT"),
        "swap": ([good[1], good[0]] + good[2:], "ORDER"),
        "duplicate": (good[:-1] + [good[0]], "DUPLICATE"),
    }
    results: Dict[str, str] = {}
    for name, (candidate, expected_code) in controls.items():
        try:
            verify_fanin(topology, candidate)
        except TopologyError as error:
            if error.code != expected_code:
                raise TopologyError(
                    "CONTROL_WRONG_FAILURE",
                    "%s produced %s instead of %s"
                    % (name, error.code, expected_code),
                )
            results[name] = "PASS"
        else:
            raise TopologyError(
                "CONTROL_FALSE_ACCEPT", "%s control was accepted" % name
            )
    return results


# Exact Q(sqrt(3)) arithmetic for the C^3/R^6 root-of-unity guard.
@dataclass(frozen=True)
class Qsqrt3:
    a: Fraction = Fraction(0)
    b: Fraction = Fraction(0)

    @classmethod
    def rational(cls, value: int) -> "Qsqrt3":
        return cls(Fraction(value), Fraction(0))

    def __add__(self, other: "Qsqrt3") -> "Qsqrt3":
        return Qsqrt3(self.a + other.a, self.b + other.b)

    def __sub__(self, other: "Qsqrt3") -> "Qsqrt3":
        return Qsqrt3(self.a - other.a, self.b - other.b)

    def __neg__(self) -> "Qsqrt3":
        return Qsqrt3(-self.a, -self.b)

    def __mul__(self, other: "Qsqrt3") -> "Qsqrt3":
        return Qsqrt3(
            self.a * other.a + 3 * self.b * other.b,
            self.a * other.b + self.b * other.a,
        )

    def __truediv__(self, other: "Qsqrt3") -> "Qsqrt3":
        denominator = other.a * other.a - 3 * other.b * other.b
        if denominator == 0:
            raise ZeroDivisionError("division by zero in Q(sqrt(3))")
        conjugate = Qsqrt3(other.a, -other.b)
        numerator = self * conjugate
        return Qsqrt3(numerator.a / denominator, numerator.b / denominator)

    def is_zero(self) -> bool:
        return self.a == 0 and self.b == 0


ExactComplex = Tuple[Qsqrt3, Qsqrt3]
ExactVector = Tuple[ExactComplex, ExactComplex, ExactComplex]


def _cadd(left: ExactComplex, right: ExactComplex) -> ExactComplex:
    return (left[0] + right[0], left[1] + right[1])


def _cmul(left: ExactComplex, right: ExactComplex) -> ExactComplex:
    return (
        left[0] * right[0] - left[1] * right[1],
        left[0] * right[1] + left[1] * right[0],
    )


def _cconj(value: ExactComplex) -> ExactComplex:
    return (value[0], -value[1])


def _inner(left: ExactVector, right: ExactVector) -> ExactComplex:
    total = (Qsqrt3(), Qsqrt3())
    for lvalue, rvalue in zip(left, right):
        total = _cadd(total, _cmul(_cconj(lvalue), rvalue))
    return total


def root_of_unity_vectors() -> Tuple[ExactVector, ExactVector, ExactVector]:
    zero = Qsqrt3()
    one: ExactComplex = (Qsqrt3.rational(1), zero)
    omega: ExactComplex = (
        Qsqrt3(Fraction(-1, 2), Fraction(0)),
        Qsqrt3(Fraction(0), Fraction(1, 2)),
    )
    omega2: ExactComplex = (
        Qsqrt3(Fraction(-1, 2), Fraction(0)),
        Qsqrt3(Fraction(0), Fraction(-1, 2)),
    )
    # Fresh tuple objects are intentional; a repeated-reference construction is
    # rejected before rank is considered.
    vector0: ExactVector = tuple([one, one, one])  # type: ignore[assignment]
    vector1: ExactVector = tuple([one, omega, omega2])  # type: ignore[assignment]
    vector2: ExactVector = tuple([one, omega2, omega])  # type: ignore[assignment]
    return (vector0, vector1, vector2)


def _real_map(vector: ExactVector) -> Tuple[Qsqrt3, ...]:
    return tuple(component for value in vector for component in value)


def _i_real_map(vector: ExactVector) -> Tuple[Qsqrt3, ...]:
    values: List[Qsqrt3] = []
    for real, imaginary in vector:
        values.extend((-imaginary, real))
    return tuple(values)


def exact_rank(matrix: Sequence[Sequence[Qsqrt3]]) -> int:
    if not matrix:
        return 0
    width = len(matrix[0])
    if any(len(row) != width for row in matrix):
        raise TopologyError("RANK_SHAPE", "rank matrix is ragged")
    work = [list(row) for row in matrix]
    rank = 0
    for column in range(width):
        pivot = next(
            (row for row in range(rank, len(work)) if not work[row][column].is_zero()),
            None,
        )
        if pivot is None:
            continue
        work[rank], work[pivot] = work[pivot], work[rank]
        pivot_value = work[rank][column]
        work[rank] = [value / pivot_value for value in work[rank]]
        for row in range(len(work)):
            if row == rank or work[row][column].is_zero():
                continue
            factor = work[row][column]
            work[row] = [
                value - factor * pivot_entry
                for value, pivot_entry in zip(work[row], work[rank])
            ]
        rank += 1
        if rank == len(work):
            break
    return rank


def _vector_add(left: ExactVector, right: ExactVector) -> ExactVector:
    return tuple(  # type: ignore[return-value]
        _cadd(lvalue, rvalue) for lvalue, rvalue in zip(left, right)
    )


def _vector_sum(vectors: Sequence[ExactVector]) -> ExactVector:
    zero = (Qsqrt3(), Qsqrt3())
    total: ExactVector = (zero, zero, zero)
    for vector in vectors:
        total = _vector_add(total, vector)
    return total


def _vector_scale(vector: ExactVector, factor: int) -> ExactVector:
    scalar = (Qsqrt3.rational(factor), Qsqrt3())
    return tuple(  # type: ignore[return-value]
        _cmul(scalar, value) for value in vector
    )


def _nested_centroid_identity(roots: ExactVector) -> Tuple[bool, int, int, int]:
    """Check the exact 3 leaves -> 9 branches -> 27 grid centroids."""
    zero = (Qsqrt3(), Qsqrt3())
    points: Dict[Tuple[int, int, int], ExactVector] = {}
    for kernel in range(KERNEL_COUNT):
        for branch in range(BRANCHES_PER_KERNEL):
            for leaf in range(LEAVES_PER_BRANCH):
                points[(kernel, branch, leaf)] = tuple(  # type: ignore[assignment]
                    [roots[kernel], roots[branch], roots[leaf]]
                )
    if len(points) != TOTAL_LEAVES or len({id(point) for point in points.values()}) != 27:
        raise TopologyError(
            "STALE_REFERENCE", "the 27 C^3 grid points must be fresh references"
        )

    branch_checks = 0
    for kernel in range(KERNEL_COUNT):
        for branch in range(BRANCHES_PER_KERNEL):
            children = [points[(kernel, branch, leaf)] for leaf in range(3)]
            parent: ExactVector = (roots[kernel], roots[branch], zero)
            if _vector_sum(children) != _vector_scale(parent, 3):
                return False, len(points), branch_checks, 0
            branch_checks += 1

    kernel_checks = 0
    for kernel in range(KERNEL_COUNT):
        descendants = [
            points[(kernel, branch, leaf)]
            for branch in range(3)
            for leaf in range(3)
        ]
        parent = (roots[kernel], zero, zero)
        if _vector_sum(descendants) != _vector_scale(parent, 9):
            return False, len(points), branch_checks, kernel_checks
        kernel_checks += 1

    global_sum = _vector_sum(list(points.values()))
    global_zero: ExactVector = (zero, zero, zero)
    return (
        global_sum == global_zero,
        len(points),
        branch_checks,
        kernel_checks,
    )


@dataclass(frozen=True)
class GeometryProof:
    roots_sum_zero: bool
    hermitian_gram_3_identity: bool
    c_rank: int
    r_rank: int
    fresh_references: bool
    nonzero_vectors: bool
    nested_centroids: bool
    grid_points: int
    branch_centroids: int
    kernel_centroids: int


def verify_root_geometry(
    vectors: Optional[Sequence[ExactVector]] = None,
) -> GeometryProof:
    source = root_of_unity_vectors() if vectors is None else vectors
    if len(source) != 3:
        raise TopologyError("GEOMETRY_WIDTH", "C^3 geometry needs 3 vectors")
    fresh = len({id(vector) for vector in source}) == 3
    if not fresh:
        raise TopologyError(
            "STALE_REFERENCE", "root-of-unity vectors must be fresh references"
        )
    nonzero = all(
        any(not real.is_zero() or not imaginary.is_zero() for real, imaginary in v)
        for v in source
    )
    if not nonzero:
        raise TopologyError("ZERO_VECTOR", "root-of-unity vectors must be nonzero")

    one, omega, omega2 = source[1]
    root_sum = _cadd(_cadd(one, omega), omega2)
    roots_sum_zero = root_sum[0].is_zero() and root_sum[1].is_zero()

    gram_ok = True
    three = (Qsqrt3.rational(3), Qsqrt3())
    zero = (Qsqrt3(), Qsqrt3())
    for row, left in enumerate(source):
        for column, right in enumerate(source):
            if _inner(left, right) != (three if row == column else zero):
                gram_ok = False

    c_rank = 3 if gram_ok else 0
    real_rows: List[Tuple[Qsqrt3, ...]] = []
    for vector in source:
        real_rows.append(_real_map(vector))
        real_rows.append(_i_real_map(vector))
    if len({id(row) for row in real_rows}) != 6:
        raise TopologyError(
            "STALE_REFERENCE", "R^6 basis rows must be fresh references"
        )
    r_rank = exact_rank(real_rows)
    nested, grid_points, branch_centroids, kernel_centroids = (
        _nested_centroid_identity(source[1])
    )
    proof = GeometryProof(
        roots_sum_zero,
        gram_ok,
        c_rank,
        r_rank,
        fresh,
        nonzero,
        nested,
        grid_points,
        branch_centroids,
        kernel_centroids,
    )
    if not roots_sum_zero or not gram_ok or c_rank != 3 or r_rank != 6:
        raise TopologyError(
            "RANK_GUARD",
            "expected exact C-rank 3 and R-rank 6 root-of-unity geometry",
        )
    if not nested or (grid_points, branch_centroids, kernel_centroids) != (27, 9, 3):
        raise TopologyError(
            "CENTROID_GUARD",
            "expected exact nested centroids for the 3x3x3 C^3 grid",
        )
    return proof


_SAFE_VALUE = re.compile(r"^[^\r\n|]*$")


def hbp_row(tag: str, **fields: object) -> str:
    if not re.fullmatch(r"[A-Z][A-Z0-9_]*", tag):
        raise ValueError("invalid HBP tag")
    parts = [tag]
    for key, value in fields.items():
        if not re.fullmatch(r"[a-z][a-z0-9_]*", key):
            raise ValueError("invalid HBP key: " + key)
        if isinstance(value, bool):
            text = "1" if value else "0"
        else:
            text = str(value)
        if not _SAFE_VALUE.fullmatch(text):
            raise ValueError("unsafe HBP value for " + key)
        parts.append("%s=%s" % (key, text))
    parts.append("json=0")
    return "|".join(parts)


def proof_rows(
    topology: Topology,
    geometry: GeometryProof,
    controls: Mapping[str, str],
    transport: str,
    transport_evidence: Optional[HTTPSFanIn] = None,
    bind_scope: str = "LOOPBACK_ONLY",
) -> Tuple[str, ...]:
    if transport not in ("NOT_STARTED", "HTTPS"):
        raise TopologyError(
            "TRANSPORT_MODE", "transport must be NOT_STARTED or HTTPS"
        )
    if transport == "NOT_STARTED" and transport_evidence is not None:
        raise TopologyError(
            "TRANSPORT_EVIDENCE",
            "NOT_STARTED must not carry HTTPS crossing evidence",
        )
    if transport == "HTTPS":
        if transport_evidence is None:
            raise TopologyError(
                "TRANSPORT_EVIDENCE", "HTTPS output requires exact crossing evidence"
            )
        counts = (
            len(transport_evidence.omega_bodies),
            len(transport_evidence.root_bodies),
            len(transport_evidence.branch_bodies),
            len(transport_evidence.observations),
        )
        if counts != (3, 3, 9, 27):
            raise TopologyError(
                "HTTPS_COVERAGE",
                "HTTPS output requires 3 Omega, 3 root, 9 branch, and 27 leaf reads",
            )
        verify_fanin(topology, transport_evidence.observations)
        if len(set(transport_evidence.omega_bodies)) != 1:
            raise TopologyError(
                "MIDDLE_DIVERGENCE", "the three HTTPS Omega bodies must be identical"
            )
    roots_crossed = len(transport_evidence.root_bodies) if transport_evidence else 0
    branches_crossed = (
        len(transport_evidence.branch_bodies) if transport_evidence else 0
    )
    leaves_crossed = (
        len(transport_evidence.observations) if transport_evidence else 0
    )
    omegas_crossed = len(transport_evidence.omega_bodies) if transport_evidence else 0
    return (
        hbp_row(
            "SHADOW3",
            schema="ASOLARIA_SHADOW_TUNNEL_3X3X3_V1",
            kernels=KERNEL_COUNT,
            branches_per_kernel=BRANCHES_PER_KERNEL,
            leaves_per_branch=LEAVES_PER_BRANCH,
            fanin="%d_of_%d" % (TOTAL_LEAVES, TOTAL_LEAVES),
        ),
        hbp_row(
            "OMEGA",
            sha256=topology.omega.hex(),
            dag="DOMAIN_SEPARATED_FIXED_WIDTH_ORDERED_SHA256",
            shared_middle=1,
        ),
        hbp_row(
            "GEOMETRY",
            field="C3_R6_ROOT_OF_UNITY",
            arithmetic="EXACT_Q_SQRT3",
            roots_sum_zero=geometry.roots_sum_zero,
            c_rank=geometry.c_rank,
            r_rank=geometry.r_rank,
            nested_centroids=geometry.nested_centroids,
            grid_points=geometry.grid_points,
            branch_centroids=geometry.branch_centroids,
            kernel_centroids=geometry.kernel_centroids,
            fresh_references=geometry.fresh_references,
            nonzero_vectors=geometry.nonzero_vectors,
        ),
        hbp_row(
            "CONTROLS",
            mutation=controls["mutation"],
            omission=controls["omission"],
            swap=controls["swap"],
            duplicate=controls["duplicate"],
        ),
        hbp_row(
            "TRANSPORT",
            mode=transport,
            listener_count=KERNEL_COUNT if transport == "HTTPS" else 0,
            process_model="SINGLE_PROCESS_THREE_LISTENERS",
            fourth_server=0,
            bind_scope=bind_scope,
            roots_crossed=roots_crossed,
            branches_crossed=branches_crossed,
            leaves_crossed=leaves_crossed,
            omegas_crossed=omegas_crossed,
        ),
        hbp_row(
            "CLAIM",
            software_topology="MEASURED_BY_THIS_PROCESS",
            operator_physical_law="JESSE_MEASURED_OPERATOR_CANON",
            this_run_scope="SOFTWARE_REMEASUREMENT_ONLY",
            physical_remeasurement_by_this_process=0,
        ),
    )


@dataclass(frozen=True)
class RouteObject:
    kind: str
    payload: bytes
    content_address: bytes
    coordinate: Optional[Tuple[int, int, int]] = None


def _row_bytes(tag: str, **fields: object) -> bytes:
    return (hbp_row(tag, **fields) + "\n").encode("ascii")


def route_object(topology: Topology, kernel_index: int, path: str) -> RouteObject:
    kernel = topology.kernels[kernel_index]
    if path == "/omega":
        payload = _row_bytes(
            "OMEGAOBJ",
            sha256=topology.omega.hex(),
            kernel0=topology.kernels[0].digest.hex(),
            kernel1=topology.kernels[1].digest.hex(),
            kernel2=topology.kernels[2].digest.hex(),
        )
        return RouteObject("OMEGA", payload, topology.omega)
    if path == "/root":
        payload = _row_bytes(
            "KERNELOBJ",
            kernel=kernel_index,
            sha256=kernel.digest.hex(),
            branch0=kernel.branches[0].digest.hex(),
            branch1=kernel.branches[1].digest.hex(),
            branch2=kernel.branches[2].digest.hex(),
            omega=topology.omega.hex(),
        )
        return RouteObject("ROOT", payload, kernel.digest)

    branch_match = re.fullmatch(r"/branch/([0-2])", path)
    if branch_match is not None:
        branch_index = int(branch_match.group(1))
        branch = kernel.branches[branch_index]
        payload = _row_bytes(
            "BRANCHOBJ",
            kernel=kernel_index,
            branch=branch_index,
            sha256=branch.digest.hex(),
            leaf0=branch.leaves[0].digest.hex(),
            leaf1=branch.leaves[1].digest.hex(),
            leaf2=branch.leaves[2].digest.hex(),
            omega=topology.omega.hex(),
        )
        return RouteObject("BRANCH", payload, branch.digest)

    leaf_match = re.fullmatch(r"/branch/([0-2])/leaf/([0-2])", path)
    if leaf_match is not None:
        branch_index, leaf_index = map(int, leaf_match.groups())
        leaf = kernel.branches[branch_index].leaves[leaf_index]
        return RouteObject("LEAF", leaf.payload, leaf.digest, leaf.coordinate)
    raise KeyError(path)


def _handler_for(kernel_index: int, topology: Topology):

    class ShadowHandler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, _format: str, *args: object) -> None:
            return

        def do_GET(self) -> None:
            try:
                routed = route_object(topology, kernel_index, self.path)
            except KeyError:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Length", str(len(routed.payload)))
            self.send_header("X-Shadow-Object-Kind", routed.kind)
            self.send_header(
                "X-Shadow-Content-Address", routed.content_address.hex()
            )
            self.send_header("X-Shadow-Omega-SHA256", topology.omega.hex())
            if routed.coordinate is not None:
                self.send_header(
                    "X-Shadow-Coordinate",
                    "%d,%d,%d" % routed.coordinate,
                )
                self.send_header(
                    "X-Shadow-Leaf-SHA256", routed.content_address.hex()
                )
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(routed.payload)

    return ShadowHandler


def is_loopback_host(host: str) -> bool:
    if host.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


class HTTPSKernelFleet:
    """Own exactly three HTTPS ThreadingHTTPServer instances."""

    def __init__(
        self,
        topology: Topology,
        host: str = "127.0.0.1",
        ports: Sequence[int] = (0, 0, 0),
        allow_non_loopback: bool = False,
        server_factory=ThreadingHTTPServer,
    ):
        validate_topology(topology)
        if len(ports) != KERNEL_COUNT:
            raise TopologyError("SERVER_COUNT", "exactly 3 ports are required")
        if any(port < 0 or port > 65535 for port in ports):
            raise ValueError("ports must be in the range 0..65535")
        nonzero_ports = [port for port in ports if port]
        if len(set(nonzero_ports)) != len(nonzero_ports):
            raise ValueError("explicit nonzero ports must be distinct")
        if not is_loopback_host(host) and not allow_non_loopback:
            raise TopologyError(
                "BIND_SCOPE",
                "non-loopback binding requires --allow-non-loopback",
            )
        self.topology = topology
        self.host = host
        self.ports = tuple(ports)
        self.server_factory = server_factory
        self.servers: List[ThreadingHTTPServer] = []
        self.threads: List[threading.Thread] = []

    @property
    def addresses(self) -> Tuple[Tuple[str, int], ...]:
        return tuple(
            (str(server.server_address[0]), int(server.server_address[1]))
            for server in self.servers
        )

    def start(
        self,
        certfile: Optional[str] = None,
        keyfile: Optional[str] = None,
        tls_context: Optional[ssl.SSLContext] = None,
    ) -> None:
        if self.servers:
            raise RuntimeError("fleet is already started")
        if tls_context is None:
            if not certfile or not keyfile:
                raise ValueError("HTTPS start requires --cert and --key")
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.minimum_version = ssl.TLSVersion.TLSv1_2
            context.load_cert_chain(certfile=certfile, keyfile=keyfile)
        else:
            context = tls_context

        created: List[ThreadingHTTPServer] = []
        started: List[Tuple[ThreadingHTTPServer, threading.Thread]] = []
        try:
            for kernel_index, port in enumerate(self.ports):
                handler = _handler_for(kernel_index, self.topology)
                server = self.server_factory((self.host, port), handler)
                created.append(server)
                server.daemon_threads = True
                server.kernel_index = kernel_index
                server.topology = self.topology
                server.socket = context.wrap_socket(server.socket, server_side=True)
            if len(created) != KERNEL_COUNT:
                raise TopologyError("SERVER_COUNT", "a fourth or missing server exists")
            actual_ports = [int(server.server_address[1]) for server in created]
            if len(set(actual_ports)) != KERNEL_COUNT:
                raise TopologyError(
                    "PORT_COLLISION", "the three listeners require unique ports"
                )
            self.servers = created
            for kernel_index, server in enumerate(self.servers):
                thread = threading.Thread(
                    target=server.serve_forever,
                    name="shadow-https-kernel-%d" % kernel_index,
                    daemon=True,
                )
                thread.start()
                self.threads.append(thread)
                started.append((server, thread))
            deadline = time.monotonic() + 2.0
            while not all(thread.is_alive() for thread in self.threads):
                if time.monotonic() >= deadline:
                    raise TopologyError(
                        "LISTENER_LIVENESS", "all three listener threads must be live"
                    )
                time.sleep(0.005)
        except Exception:
            for server, thread in reversed(started):
                if thread.is_alive():
                    server.shutdown()
                thread.join(timeout=5)
            for server in reversed(created):
                server.server_close()
            self.servers = []
            self.threads = []
            raise

    def close(self) -> None:
        first_error: Optional[BaseException] = None
        pairs = list(zip(self.servers, self.threads))
        for server, thread in reversed(pairs):
            if not thread.is_alive():
                continue
            try:
                server.shutdown()
            except BaseException as error:
                if first_error is None:
                    first_error = error
        for _server, thread in reversed(pairs):
            try:
                thread.join(timeout=5)
                if thread.is_alive() and first_error is None:
                    first_error = RuntimeError(
                        "HTTPS kernel thread did not stop: " + thread.name
                    )
            except BaseException as error:
                if first_error is None:
                    first_error = error
        for server in reversed(self.servers):
            try:
                server.server_close()
            except BaseException as error:
                if first_error is None:
                    first_error = error
        self.servers = []
        self.threads = []
        if first_error is not None:
            raise first_error

    def __enter__(self) -> "HTTPSKernelFleet":
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        self.close()


def make_client_context(cafile: str) -> ssl.SSLContext:
    return ssl.create_default_context(ssl.Purpose.SERVER_AUTH, cafile=cafile)


def _client_host(host: str) -> str:
    if host == "0.0.0.0":
        return "127.0.0.1"
    if host == "::":
        return "::1"
    return host


def _https_url(host: str, port: int, path: str) -> str:
    rendered = "[%s]" % host if ":" in host else host
    return "https://%s:%d%s" % (rendered, port, path)


def _required_header(headers, name: str) -> str:
    value = headers.get(name)
    if value is None or not value.strip():
        raise TopologyError("HTTP_HEADER", "missing required header " + name)
    return value.strip()


def _digest_header(headers, name: str) -> bytes:
    value = _required_header(headers, name)
    try:
        digest = bytes.fromhex(value)
    except ValueError as error:
        raise TopologyError("HTTP_HEADER", "malformed digest header " + name) from error
    if len(digest) != hashlib.sha256().digest_size:
        raise TopologyError("HTTP_HEADER", "wrong digest width in " + name)
    return digest


def fetch_fanin(
    fleet: HTTPSKernelFleet,
    context: ssl.SSLContext,
    timeout: float = 5.0,
) -> HTTPSFanIn:
    if len(fleet.servers) != KERNEL_COUNT:
        raise TopologyError("SERVER_COUNT", "exactly 3 live servers are required")
    if len(fleet.threads) != KERNEL_COUNT or not all(
        thread.is_alive() for thread in fleet.threads
    ):
        raise TopologyError("LISTENER_LIVENESS", "all three listeners must be live")

    host = _client_host(fleet.host)
    observations: List[Observation] = []
    omega_bodies: List[bytes] = []
    root_bodies: List[bytes] = []
    branch_bodies: List[bytes] = []

    def fetch_object(kernel_index: int, port: int, path: str) -> bytes:
        expected = route_object(fleet.topology, kernel_index, path)
        with urllib.request.urlopen(
            _https_url(host, port, path), context=context, timeout=timeout
        ) as response:
            if response.status != 200:
                raise TopologyError(
                    "HTTP_STATUS", "%s endpoint did not return 200" % path
                )
            payload = response.read(len(expected.payload) + 1)
            if payload != expected.payload:
                raise TopologyError("HTTP_PAYLOAD", "%s payload mismatch" % path)
            if _required_header(
                response.headers, "X-Shadow-Object-Kind"
            ) != expected.kind:
                raise TopologyError("HTTP_KIND", "%s object-kind mismatch" % path)
            address = _digest_header(
                response.headers, "X-Shadow-Content-Address"
            )
            if not hmac.compare_digest(address, expected.content_address):
                raise TopologyError(
                    "HTTP_CONTENT_ADDRESS", "%s content address mismatch" % path
                )
            declared_omega = _digest_header(
                response.headers, "X-Shadow-Omega-SHA256"
            )
            if not hmac.compare_digest(declared_omega, fleet.topology.omega):
                raise TopologyError("MIDDLE_DIVERGENCE", "%s Omega mismatch" % path)
            return payload

    for kernel_index, (_host, port) in enumerate(fleet.addresses):
        omega_bodies.append(fetch_object(kernel_index, port, "/omega"))
        root_bodies.append(fetch_object(kernel_index, port, "/root"))
        for branch_index in range(BRANCHES_PER_KERNEL):
            branch_bodies.append(
                fetch_object(kernel_index, port, "/branch/%d" % branch_index)
            )
            for leaf_index in range(LEAVES_PER_BRANCH):
                path = "/branch/%d/leaf/%d" % (branch_index, leaf_index)
                expected_object = route_object(
                    fleet.topology, kernel_index, path
                )
                url = _https_url(host, port, path)
                with urllib.request.urlopen(
                    url, context=context, timeout=timeout
                ) as response:
                    if response.status != 200:
                        raise TopologyError(
                            "HTTP_STATUS", "leaf endpoint did not return 200"
                        )
                    payload = response.read(len(expected_object.payload) + 1)
                    coordinate = tuple(
                        int(part)
                        for part in _required_header(
                            response.headers, "X-Shadow-Coordinate"
                        ).split(",")
                    )
                    expected = (kernel_index, branch_index, leaf_index)
                    if coordinate != expected:
                        raise TopologyError(
                            "HTTP_COORDINATE", "leaf endpoint returned wrong coordinate"
                        )
                    content_address = _digest_header(
                        response.headers, "X-Shadow-Content-Address"
                    )
                    if not hmac.compare_digest(
                        content_address, expected_object.content_address
                    ):
                        raise TopologyError(
                            "HTTP_CONTENT_ADDRESS", "leaf content address mismatch"
                        )
                    observations.append(
                        Observation(
                            kernel_index,
                            branch_index,
                            leaf_index,
                            payload,
                            content_address,
                            _digest_header(
                                response.headers, "X-Shadow-Omega-SHA256"
                            ),
                        )
                    )
    evidence = HTTPSFanIn(
        tuple(observations),
        tuple(omega_bodies),
        tuple(root_bodies),
        tuple(branch_bodies),
    )
    if (
        len(evidence.omega_bodies),
        len(evidence.root_bodies),
        len(evidence.branch_bodies),
        len(evidence.observations),
    ) != (3, 3, 9, 27):
        raise TopologyError(
            "HTTPS_COVERAGE", "expected 3 Omega, 3 root, 9 branch, and 27 leaf reads"
        )
    if len(set(evidence.omega_bodies)) != 1:
        raise TopologyError(
            "MIDDLE_DIVERGENCE", "all three /omega bodies must be byte-identical"
        )
    return evidence


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser(
        "proof",
        help="run DAG, fan-in controls, and exact geometry without transport",
    )
    serve = subparsers.add_parser(
        "serve",
        help="start exactly three HTTPS kernels, fan in 27/27, then stop",
    )
    serve.add_argument("--cert", required=True, help="TLS certificate path")
    serve.add_argument("--key", required=True, help="TLS private-key path")
    serve.add_argument(
        "--cafile",
        help="client trust anchor; defaults to the supplied certificate",
    )
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument(
        "--ports",
        nargs=3,
        type=int,
        metavar=("K0", "K1", "K2"),
        default=(0, 0, 0),
    )
    serve.add_argument(
        "--allow-non-loopback",
        action="store_true",
        help="explicitly permit a non-loopback bind",
    )
    serve.add_argument(
        "--hold",
        action="store_true",
        help="keep the three kernels serving after the 27/27 proof",
    )
    return parser


def _emit(rows: Iterable[str]) -> None:
    for row in rows:
        print(row)


def run_proof() -> int:
    topology = build_topology()
    verify_fanin(topology, observations_from_topology(topology))
    geometry = verify_root_geometry()
    controls = run_negative_controls(topology)
    _emit(proof_rows(topology, geometry, controls, "NOT_STARTED"))
    return 0


def run_serve(args: argparse.Namespace) -> int:
    topology = build_topology()
    geometry = verify_root_geometry()
    controls = run_negative_controls(topology)
    fleet = HTTPSKernelFleet(
        topology,
        host=args.host,
        ports=args.ports,
        allow_non_loopback=args.allow_non_loopback,
    )
    try:
        fleet.start(args.cert, args.key)
        client_context = make_client_context(args.cafile or args.cert)
        evidence = fetch_fanin(fleet, client_context)
        verify_fanin(topology, evidence.observations)
        bind_scope = (
            "LOOPBACK_ONLY"
            if is_loopback_host(args.host)
            else "EXPLICIT_NON_LOOPBACK"
        )
        _emit(
            proof_rows(
                topology,
                geometry,
                controls,
                "HTTPS",
                transport_evidence=evidence,
                bind_scope=bind_scope,
            )
        )
        for kernel_index, (_host, port) in enumerate(fleet.addresses):
            print(
                hbp_row(
                    "KERNEL",
                    kernel=kernel_index,
                    bind=args.host,
                    port=port,
                    branches=BRANCHES_PER_KERNEL,
                    leaves=BRANCHES_PER_KERNEL * LEAVES_PER_BRANCH,
                    listener_model="SINGLE_PROCESS",
                )
            )
        if args.hold:
            print(hbp_row("STATE", status="SERVING", stop="CTRL_C"))
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                pass
        return 0
    finally:
        fleet.close()


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        if args.command == "proof":
            return run_proof()
        if args.command == "serve":
            return run_serve(args)
        parser.error("unknown command")
    except (OSError, ssl.SSLError, TopologyError, TypeError, ValueError) as error:
        message = str(error).replace("|", "/").replace("\r", " ").replace("\n", " ")
        print(
            hbp_row(
                "ERROR",
                error_type=type(error).__name__,
                message=message,
                operator_physical_law="JESSE_MEASURED_OPERATOR_CANON",
                this_run_scope="SOFTWARE_REMEASUREMENT_ONLY",
            ),
            file=sys.stderr,
        )
        return 1
    return 2


if __name__ == "__main__":
    sys.exit(main())
