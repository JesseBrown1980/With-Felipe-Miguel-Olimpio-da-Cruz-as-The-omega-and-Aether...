#!/usr/bin/env python3
"""Run the SEALED retrain_stratified.py (sha c66ca57d...) unchanged, but single-threaded + deterministic algorithms.
usage: retrain_det_wrapper.py <outdir>"""
import os, runpy, sys
import torch
torch.set_num_threads(1)
torch.use_deterministic_algorithms(True, warn_only=True)
print(f"DETWRAP|threads={torch.get_num_threads()}|deterministic_algorithms=1|warn_only=1|json=0", flush=True)
script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "retrain_stratified.py")
sys.argv = [script, sys.argv[1]]
runpy.run_path(script, run_name="__main__")
