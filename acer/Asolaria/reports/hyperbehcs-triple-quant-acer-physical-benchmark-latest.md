# HYP-255 Triple Quant Acer Physical Benchmark

Status: triple_quant_acer_physical_benchmark_complete_zero_receipt_loss

Fingerprint: 084d2516949609aa

## Result

Triple Quant is wired as the local 3D geometric quant lane tying together Johnson-Lindenstrauss projection, Polar Quant, and Turbo Quant. This benchmark ran on the physical Acer local CPU/C: artifact path and measured receipt preservation, byte reduction, and JSON parse/stringify speed.

## Acer Inventory

CPU: Intel(R) Core(TM) i5-8300H CPU @ 2.30GHz

Threads: 8

Memory bytes: 17014509568

## Counts

| Metric | Value |
| --- | ---: |
| benchmark_rows | 7 |
| receipt_zero_loss_rows | 7 |
| missing_receipts | 0 |
| duplicate_receipts | 0 |
| hash_mismatches | 0 |
| receipt_loss_rate | 0 |
| numeric_zero_loss_rows | 1 |
| sidecar_hash_lossless_rows | 6 |
| rows_with_triple_quant | 7 |
| rows_with_jl | 7 |
| rows_with_polar_quant | 7 |
| rows_with_turbo_quant | 7 |
| average_triple_fast_size_ratio | 0.387648 |
| average_triple_fast_size_reduction_percent | 61.235333 |
| average_raw_to_triple_parse_speedup_ratio | 5.773609 |
| average_raw_to_triple_stringify_speedup_ratio | 2.410621 |
| average_quant_encode_overhead_ratio | 1842.866757 |
| server_hot_path_replaced | 0 |
| gpu_runtime_enabled | 0 |
| d_drive_write_used | 0 |
| usb_write_used | 0 |
| peer_device_storage_export_executed | 0 |
| heap_used_before_bytes | 4920440 |
| heap_used_after_bytes | 52113880 |
| hardware_mutations | 0 |
| cpu_affinity_changes | 0 |
| gpu_kernel_launches | 0 |
| gpu_driver_mutations | 0 |
| remote_writes | 0 |
| adb_actions | 0 |
| scrcpy_actions | 0 |
| device_file_writes | 0 |
| route_mutations | 0 |
| provider_calls | 0 |
| mcp_tool_calls | 0 |
| process_starts | 0 |
| executor_executions | 0 |
| cleanup_actions | 0 |
| runtime_authority_grants | 0 |
| production_promotions | 0 |

## Rows

| Row | Raw Bytes | Triple Fast Bytes | Reduction % | Parse Speedup | Numeric 0 Loss | Receipt 0 Loss |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| processor_local | 15542 | 5924 | 61.884 | 5.652246 | false | true |
| leworld_world_model | 15464 | 5938 | 61.601 | 6.799124 | false | true |
| backend_state_receipt | 15433 | 5889 | 61.842 | 5.49034 | false | true |
| pixel_look_truth | 10513 | 4182 | 60.221 | 5.747623 | false | true |
| storage_c_drive | 15483 | 5941 | 61.629 | 6.07834 | false | true |
| exact_line_tuple_receipt | 10552 | 4196 | 60.235 | 4.873982 | false | true |
| triple_quant_exact_z_axis_control | 2632 | 2737 | -3.989 | 0.910592 | true | true |

## Boundary

This is a local software representation benchmark. It wrote/read C: workspace benchmark artifacts only. It did not launch GPU kernels, change CPU affinity, write D:/USB, write Liris/Falcon/Aether, mutate routes, call providers/MCP tools, start child processes, clean up files, grant runtime authority, or promote production paths.
