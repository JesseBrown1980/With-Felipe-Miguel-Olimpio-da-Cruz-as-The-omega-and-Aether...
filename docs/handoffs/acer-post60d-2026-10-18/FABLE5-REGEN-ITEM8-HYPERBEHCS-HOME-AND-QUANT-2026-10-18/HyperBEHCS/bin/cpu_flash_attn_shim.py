#!/usr/bin/env python3
# cpu_flash_attn_shim.py - Wave-306 Spec 3 dependency
# Purpose: provide flash_attn_interface.flash_attn_func + flash_attn.flash_attn_func
# as a CPU PyTorch fallback so models/layers.py in D:/Asolaria-HRM imports cleanly.
# Anchor: ASOLARIA-V43-WAVE-306-HRM-HARNESS-PID-2026-05-23
# IMPORTANT: MUST be imported BEFORE any models.* import. Inserts dummy modules into
#            sys.modules so the `from flash_attn_interface import ...` path resolves.

import sys
import types
import math

try:
    import torch
    import torch.nn.functional as F
    _HAVE_TORCH = True
except Exception:
    _HAVE_TORCH = False


def _cpu_flash_attn(q, k, v, causal: bool = False, softmax_scale=None):
    """CPU SDPA fallback matching flash_attn_func(q, k, v) signature for HRM.
    Args:
      q, k, v: tensors shape (B, S, H, D) - flash uses (batch, seq, heads, head_dim)
      causal: bool
    Returns:
      output tensor shape (B, S, H, D)
    """
    if not _HAVE_TORCH:
        raise RuntimeError("cpu_flash_attn_shim requires torch (not installed)")
    # flash signature: (B, S, H, D) -> torch SDPA wants (B, H, S, D)
    qf = q.transpose(1, 2).contiguous()
    kf = k.transpose(1, 2).contiguous()
    vf = v.transpose(1, 2).contiguous()
    scale = softmax_scale if softmax_scale is not None else 1.0 / math.sqrt(qf.size(-1))
    out = F.scaled_dot_product_attention(qf, kf, vf, is_causal=causal, scale=scale)
    return out.transpose(1, 2).contiguous()


def install():
    """Insert flash_attn / flash_attn_interface into sys.modules with CPU shim."""
    if "flash_attn_interface" in sys.modules and "flash_attn" in sys.modules:
        return False
    if not _HAVE_TORCH:
        # Stub still inserted so import doesn't crash, but call will raise
        pass
    mod_iface = types.ModuleType("flash_attn_interface")
    mod_iface.flash_attn_func = _cpu_flash_attn
    sys.modules["flash_attn_interface"] = mod_iface

    mod_attn = types.ModuleType("flash_attn")
    mod_attn.flash_attn_func = _cpu_flash_attn
    sys.modules["flash_attn"] = mod_attn
    return True


# Auto-install on import - whoever imports us gets the shim immediately
_installed = install()
