#!/usr/bin/env python3
"""Capture a strict-trit RIME object in CUDA memory and store its SGRAM photo."""

from __future__ import annotations

import argparse
import ctypes
import hashlib
import itertools
import json
from pathlib import Path


CUDA_SUCCESS = 0
TRIT_BASIS = "-.+"
IDENTITY_VALUES = tuple(
    "".join(value) for value in itertools.product(TRIT_BASIS, repeat=3)
)
IDENTITY_ORDER_SHA256 = hashlib.sha256(
    "\n".join(IDENTITY_VALUES).encode("ascii")
).hexdigest()


def checked(name: str, code: int) -> None:
    if code != CUDA_SUCCESS:
        raise RuntimeError(f"{name} failed with CUDA driver status {code}")


def capture(payload: bytes, stage: int) -> tuple[bytes, dict[str, object]]:
    if len(payload) != len(IDENTITY_VALUES):
        raise ValueError("GPU state photo must contain one trit for each of 27 values")
    if any(glyph not in b"-.+" for glyph in payload):
        raise ValueError("GPU object must contain strict -,.,+ trit glyphs only")

    cuda = ctypes.CDLL("libcuda.so.1")
    cuda.cuInit.argtypes = [ctypes.c_uint]
    cuda.cuDeviceGet.argtypes = [ctypes.POINTER(ctypes.c_int), ctypes.c_int]
    cuda.cuDeviceGetName.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.c_int]
    cuda.cuDriverGetVersion.argtypes = [ctypes.POINTER(ctypes.c_int)]
    cuda.cuCtxCreate_v2.argtypes = [
        ctypes.POINTER(ctypes.c_void_p),
        ctypes.c_uint,
        ctypes.c_int,
    ]
    cuda.cuMemAlloc_v2.argtypes = [ctypes.POINTER(ctypes.c_uint64), ctypes.c_size_t]
    cuda.cuMemcpyHtoD_v2.argtypes = [
        ctypes.c_uint64,
        ctypes.c_void_p,
        ctypes.c_size_t,
    ]
    cuda.cuMemcpyDtoH_v2.argtypes = [
        ctypes.c_void_p,
        ctypes.c_uint64,
        ctypes.c_size_t,
    ]
    cuda.cuMemFree_v2.argtypes = [ctypes.c_uint64]
    cuda.cuCtxDestroy_v2.argtypes = [ctypes.c_void_p]

    checked("cuInit", cuda.cuInit(0))
    device = ctypes.c_int()
    checked("cuDeviceGet", cuda.cuDeviceGet(ctypes.byref(device), 0))
    name_buffer = ctypes.create_string_buffer(256)
    checked(
        "cuDeviceGetName",
        cuda.cuDeviceGetName(name_buffer, len(name_buffer), device.value),
    )
    driver_version = ctypes.c_int()
    checked("cuDriverGetVersion", cuda.cuDriverGetVersion(ctypes.byref(driver_version)))

    context = ctypes.c_void_p()
    checked(
        "cuCtxCreate_v2",
        cuda.cuCtxCreate_v2(ctypes.byref(context), 0, device.value),
    )
    device_pointer = ctypes.c_uint64()
    host_input = ctypes.create_string_buffer(payload, len(payload))
    host_output = ctypes.create_string_buffer(len(payload))
    try:
        checked(
            "cuMemAlloc_v2",
            cuda.cuMemAlloc_v2(ctypes.byref(device_pointer), len(payload)),
        )
        try:
            checked(
                "cuMemcpyHtoD_v2",
                cuda.cuMemcpyHtoD_v2(
                    device_pointer.value, ctypes.byref(host_input), len(payload)
                ),
            )
            checked(
                "cuMemcpyDtoH_v2",
                cuda.cuMemcpyDtoH_v2(
                    ctypes.byref(host_output), device_pointer.value, len(payload)
                ),
            )
        finally:
            checked("cuMemFree_v2", cuda.cuMemFree_v2(device_pointer.value))
    finally:
        checked("cuCtxDestroy_v2", cuda.cuCtxDestroy_v2(context))

    readback = host_output.raw
    receipt = {
        "schema": "NEW-RIME-FIXED27-WAVE-GPU-PHOTO-v2",
        "stage": stage,
        "rust_toolchain": "1.81",
        "kernel": "Ubuntu WSL2 Asolaria kernel",
        "device_index": device.value,
        "device_name": name_buffer.value.decode("utf-8", errors="strict"),
        "cuda_driver_version": driver_version.value,
        "storage": "SGRAM",
        "identity": "27 distinct ordered width-3 values over -,.,+",
        "identity_count": len(IDENTITY_VALUES),
        "identity_width": 3,
        "identity_basis": list(TRIT_BASIS),
        "identity_values": list(IDENTITY_VALUES),
        "identity_order_sha256": IDENTITY_ORDER_SHA256,
        "payload_role": "one change-state trit per ordered identity value",
        "separate_pid": False,
        "payload": readback.decode("ascii"),
        "payload_alphabet_observed": sorted(set(readback.decode("ascii"))),
        "gpu_round_trip": readback == payload,
    }
    return readback, receipt


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", type=int, required=True)
    payload_group = parser.add_mutually_exclusive_group(required=True)
    payload_group.add_argument("--payload")
    payload_group.add_argument("--payload-file")
    parser.add_argument("--output", required=True)
    parser.add_argument("--receipt", required=True)
    args = parser.parse_args()

    payload_text = (
        Path(args.payload_file).read_text(encoding="ascii")
        if args.payload_file
        else args.payload
    )
    payload = payload_text.encode("ascii", errors="strict")
    readback, receipt = capture(payload, args.stage)
    if readback != payload:
        raise RuntimeError("GPU readback differs from the changed fixed-27 RIME state")

    output = Path(args.output)
    receipt_path = Path(args.receipt)
    output.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(readback)
    receipt_path.write_text(
        json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(
        f"GPU-PHOTO|stage={args.stage}|status=PASS|"
        f"device={receipt['device_name']}|payload={receipt['payload']}|storage=SGRAM"
    )


if __name__ == "__main__":
    main()
