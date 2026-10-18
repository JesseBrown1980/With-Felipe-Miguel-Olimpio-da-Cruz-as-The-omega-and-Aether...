#!/usr/bin/env python
import sys, os
sys.path.insert(0, r"C:\HyperBEHCS\runtime\onnxruntime-directml")

import argparse, json, time, tempfile, hashlib
import numpy as np
import onnx
from onnx import helper, TensorProto
import onnxruntime as ort

def build_matmul_model(dim, path):
    A = helper.make_tensor_value_info('A', TensorProto.FLOAT, [dim, dim])
    B = helper.make_tensor_value_info('B', TensorProto.FLOAT, [dim, dim])
    Y = helper.make_tensor_value_info('Y', TensorProto.FLOAT, [dim, dim])
    node = helper.make_node('MatMul', ['A', 'B'], ['Y'])
    graph = helper.make_graph([node], 'matmul_bench', [A, B], [Y])
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 17)])
    model.ir_version = 9
    onnx.save(model, path)
    return path

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--dim', type=int, default=1024)
    p.add_argument('--iters', type=int, default=10)
    p.add_argument('--device-id', type=int, default=0)
    args = p.parse_args()

    try:
        tmpdir = tempfile.gettempdir()
        model_path = os.path.join(tmpdir, f"w19c_matmul_{args.dim}.onnx")
        if not os.path.exists(model_path):
            build_matmul_model(args.dim, model_path)

        providers = [('DmlExecutionProvider', {'device_id': args.device_id})]
        so = ort.SessionOptions()
        so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess = ort.InferenceSession(model_path, sess_options=so, providers=providers)
        active = sess.get_providers()

        rng = np.random.default_rng(42)
        A = rng.standard_normal((args.dim, args.dim), dtype=np.float32)
        B = rng.standard_normal((args.dim, args.dim), dtype=np.float32)

        # warmup
        sess.run(None, {'A': A, 'B': B})

        t0 = time.perf_counter()
        for _ in range(args.iters):
            sess.run(None, {'A': A, 'B': B})
        wall = time.perf_counter() - t0

        flops_per_iter = 2.0 * (args.dim ** 3)
        total_flops = flops_per_iter * args.iters
        gflops = (total_flops / wall) / 1e9
        ms_per_iter = (wall / args.iters) * 1000.0

        out = {
            'kernel_id': 'matmul',
            'dim': args.dim,
            'iters': args.iters,
            'device_id': args.device_id,
            'providers_active': active,
            'wall_sec': wall,
            'ms_per_iter': ms_per_iter,
            'gflops': gflops,
            'total_flops': total_flops,
        }
        print(json.dumps(out))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({'error': str(e), 'kernel_id': 'matmul'}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
