import contextlib
import importlib.util
import io
import sys
import threading
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "shadow_tunnel_3x3x3",
    ROOT / "tools" / "shadow_tunnel_3x3x3.py",
)
SHADOW = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = SHADOW
SPEC.loader.exec_module(SHADOW)


class ShadowTunnelTopologyTests(unittest.TestCase):
    def setUp(self):
        self.topology = SHADOW.build_topology()

    def test_exact_3x3x3_shape_and_one_shared_middle(self):
        self.assertEqual(len(self.topology.kernels), 3)
        self.assertEqual(
            [len(kernel.branches) for kernel in self.topology.kernels],
            [3, 3, 3],
        )
        self.assertEqual(
            [
                len(branch.leaves)
                for kernel in self.topology.kernels
                for branch in kernel.branches
            ],
            [3] * 9,
        )
        self.assertEqual(len(self.topology.ordered_leaves), 27)
        self.assertEqual(
            tuple(leaf.coordinate for leaf in self.topology.ordered_leaves),
            SHADOW.expected_coordinates(),
        )
        observations = SHADOW.observations_from_topology(self.topology)
        self.assertEqual(
            {observation.declared_omega for observation in observations},
            {self.topology.omega},
        )
        self.assertEqual(
            SHADOW.verify_fanin(self.topology, observations),
            self.topology.omega,
        )

    def test_dag_is_deterministic_domain_separated_and_ordered(self):
        second = SHADOW.build_topology()
        self.assertEqual(second.omega, self.topology.omega)
        leaf = self.topology.ordered_leaves[0]
        self.assertNotEqual(
            SHADOW.hash_leaf(*leaf.coordinate, leaf.payload),
            SHADOW.hashlib.sha256(leaf.payload).digest(),
        )
        branch = self.topology.kernels[0].branches[0]
        digests = [leaf.digest for leaf in branch.leaves]
        self.assertNotEqual(
            SHADOW.hash_branch(0, 0, digests),
            SHADOW.hash_branch(0, 0, [digests[1], digests[0], digests[2]]),
        )
        kernels = [kernel.digest for kernel in self.topology.kernels]
        self.assertNotEqual(
            SHADOW.hash_omega(kernels),
            SHADOW.hash_omega([kernels[1], kernels[0], kernels[2]]),
        )

    def test_one_byte_mutation_propagates_leaf_branch_root_and_omega(self):
        def mutated_payload(kernel, branch, leaf):
            payload = SHADOW.default_payload(kernel, branch, leaf)
            if (kernel, branch, leaf) == (0, 0, 0):
                return payload + b"!"
            return payload

        changed = SHADOW.build_topology(mutated_payload)
        self.assertNotEqual(
            changed.kernels[0].branches[0].leaves[0].digest,
            self.topology.kernels[0].branches[0].leaves[0].digest,
        )
        self.assertNotEqual(
            changed.kernels[0].branches[0].digest,
            self.topology.kernels[0].branches[0].digest,
        )
        self.assertNotEqual(
            changed.kernels[0].digest,
            self.topology.kernels[0].digest,
        )
        self.assertNotEqual(changed.omega, self.topology.omega)
        self.assertEqual(changed.kernels[1].digest, self.topology.kernels[1].digest)
        self.assertEqual(changed.kernels[2].digest, self.topology.kernels[2].digest)

    def assert_control_code(self, observations, code):
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW.verify_fanin(self.topology, observations)
        self.assertEqual(caught.exception.code, code)

    def test_mutation_omission_swap_and_duplicate_controls(self):
        good = list(SHADOW.observations_from_topology(self.topology))
        self.assert_control_code(
            [
                SHADOW.replace(good[0], payload=good[0].payload + b"mutation")
            ]
            + good[1:],
            "MUTATION",
        )
        self.assert_control_code(good[:-1], "FANIN_COUNT")
        self.assert_control_code([good[1], good[0]] + good[2:], "ORDER")
        self.assert_control_code(good[:-1] + [good[0]], "DUPLICATE")
        self.assertEqual(
            SHADOW.run_negative_controls(self.topology),
            {
                "mutation": "PASS",
                "omission": "PASS",
                "swap": "PASS",
                "duplicate": "PASS",
            },
        )

    def test_topology_rejects_stale_leaf_reference(self):
        kernel0 = self.topology.kernels[0]
        branch0 = kernel0.branches[0]
        stale_branch = SHADOW.Branch(
            branch0.kernel,
            branch0.branch,
            (branch0.leaves[0], branch0.leaves[0], branch0.leaves[0]),
            branch0.digest,
        )
        stale_kernel = SHADOW.Kernel(
            kernel0.kernel,
            (stale_branch,) + kernel0.branches[1:],
            kernel0.digest,
        )
        stale = SHADOW.Topology(
            (stale_kernel,) + self.topology.kernels[1:],
            self.topology.omega,
        )
        with self.assertRaises(SHADOW.TopologyError):
            SHADOW.validate_topology(stale)

    def test_payload_content_must_be_distinct_before_coordinate_hashing(self):
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW.build_topology(lambda _kernel, _branch, _leaf: b"same")
        self.assertEqual(caught.exception.code, "PAYLOAD_DUPLICATE")

    def test_root_branch_leaf_and_shared_omega_routes(self):
        omega_bodies = []
        roots = []
        branches = []
        leaves = []
        for kernel in range(3):
            omega_bodies.append(
                SHADOW.route_object(self.topology, kernel, "/omega")
            )
            roots.append(SHADOW.route_object(self.topology, kernel, "/root"))
            for branch in range(3):
                branches.append(
                    SHADOW.route_object(
                        self.topology, kernel, "/branch/%d" % branch
                    )
                )
                for leaf in range(3):
                    leaves.append(
                        SHADOW.route_object(
                            self.topology,
                            kernel,
                            "/branch/%d/leaf/%d" % (branch, leaf),
                        )
                    )
        self.assertEqual([item.kind for item in omega_bodies], ["OMEGA"] * 3)
        self.assertEqual(len({item.payload for item in omega_bodies}), 1)
        self.assertEqual(
            {item.content_address for item in omega_bodies},
            {self.topology.omega},
        )
        self.assertEqual(len(roots), 3)
        self.assertEqual(len(branches), 9)
        self.assertEqual(len(leaves), 27)
        self.assertEqual(len({item.payload for item in leaves}), 27)


class RootOfUnityGeometryTests(unittest.TestCase):
    def test_exact_c3_r6_geometry(self):
        proof = SHADOW.verify_root_geometry()
        self.assertTrue(proof.roots_sum_zero)
        self.assertTrue(proof.hermitian_gram_3_identity)
        self.assertEqual(proof.c_rank, 3)
        self.assertEqual(proof.r_rank, 6)
        self.assertTrue(proof.nested_centroids)
        self.assertEqual(proof.grid_points, 27)
        self.assertEqual(proof.branch_centroids, 9)
        self.assertEqual(proof.kernel_centroids, 3)
        self.assertTrue(proof.fresh_references)
        self.assertTrue(proof.nonzero_vectors)

    def test_repeated_reference_guard(self):
        vectors = SHADOW.root_of_unity_vectors()
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW.verify_root_geometry([vectors[0], vectors[0], vectors[0]])
        self.assertEqual(caught.exception.code, "STALE_REFERENCE")

    def test_zero_vector_guard(self):
        vectors = list(SHADOW.root_of_unity_vectors())
        zero = (SHADOW.Qsqrt3(), SHADOW.Qsqrt3())
        vectors[2] = tuple([zero, zero, zero])
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW.verify_root_geometry(vectors)
        self.assertEqual(caught.exception.code, "ZERO_VECTOR")

    def test_rank_guard_rejects_fresh_but_dependent_vectors(self):
        vectors = SHADOW.root_of_unity_vectors()
        dependent = (
            tuple(list(vectors[0])),
            tuple(list(vectors[0])),
            tuple(list(vectors[1])),
        )
        self.assertEqual(len({id(vector) for vector in dependent}), 3)
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW.verify_root_geometry(dependent)
        self.assertEqual(caught.exception.code, "RANK_GUARD")


class FakeTLSContext:
    def __init__(self):
        self.wrapped = []

    def wrap_socket(self, socket, server_side=False):
        self.wrapped.append((socket, server_side))
        return socket


class FailingTLSContext:
    def wrap_socket(self, socket, server_side=False):
        raise RuntimeError("deliberate TLS wrap failure")


class FakeServer:
    instances = []

    def __init__(self, address, handler):
        self.server_address = (address[0], 41000 + len(self.instances))
        self.handler = handler
        self.socket = object()
        self.daemon_threads = False
        self.shutdown_called = False
        self.close_called = False
        self.serve_started = False
        self.stop_event = threading.Event()
        self.instances.append(self)

    def serve_forever(self):
        self.serve_started = True
        self.stop_event.wait(5)

    def shutdown(self):
        self.shutdown_called = True
        self.stop_event.set()

    def server_close(self):
        self.close_called = True


class CollidingFakeServer(FakeServer):
    def __init__(self, address, handler):
        super().__init__(address, handler)
        self.server_address = (address[0], 42000)


class HTTPSFleetContractTests(unittest.TestCase):
    def setUp(self):
        FakeServer.instances = []
        self.topology = SHADOW.build_topology()

    def test_loopback_default_and_nonloopback_gate(self):
        fleet = SHADOW.HTTPSKernelFleet(self.topology)
        self.assertEqual(fleet.host, "127.0.0.1")
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW.HTTPSKernelFleet(self.topology, host="0.0.0.0")
        self.assertEqual(caught.exception.code, "BIND_SCOPE")
        permitted = SHADOW.HTTPSKernelFleet(
            self.topology,
            host="0.0.0.0",
            allow_non_loopback=True,
        )
        self.assertEqual(permitted.host, "0.0.0.0")

    def test_exactly_three_servers_and_clean_shutdown_without_cert(self):
        fleet = SHADOW.HTTPSKernelFleet(
            self.topology,
            server_factory=FakeServer,
        )
        context = FakeTLSContext()
        threads = []
        try:
            fleet.start(tls_context=context)
            self.assertEqual(len(fleet.servers), 3)
            self.assertEqual(len(FakeServer.instances), 3)
            self.assertEqual([server.kernel_index for server in fleet.servers], [0, 1, 2])
            self.assertEqual({id(server.topology) for server in fleet.servers}, {id(self.topology)})
            self.assertEqual(len(context.wrapped), 3)
            self.assertEqual(len(fleet.addresses), 3)
            self.assertTrue(all(thread.is_alive() for thread in fleet.threads))
            threads = list(fleet.threads)
        finally:
            fleet.close()
        self.assertTrue(all(not thread.is_alive() for thread in threads))
        self.assertTrue(all(server.shutdown_called for server in FakeServer.instances))
        self.assertTrue(all(server.close_called for server in FakeServer.instances))

    def test_fourth_or_missing_port_is_rejected(self):
        for ports in ((0, 0), (0, 0, 0, 0)):
            with self.subTest(ports=ports):
                with self.assertRaises(SHADOW.TopologyError) as caught:
                    SHADOW.HTTPSKernelFleet(self.topology, ports=ports)
                self.assertEqual(caught.exception.code, "SERVER_COUNT")

    def test_cert_and_key_are_required_for_real_tls_context(self):
        fleet = SHADOW.HTTPSKernelFleet(
            self.topology,
            server_factory=FakeServer,
        )
        with self.assertRaisesRegex(ValueError, "--cert and --key"):
            fleet.start()

    def test_tls_wrap_failure_closes_partially_created_server(self):
        fleet = SHADOW.HTTPSKernelFleet(
            self.topology,
            server_factory=FakeServer,
        )
        with self.assertRaisesRegex(RuntimeError, "deliberate TLS wrap failure"):
            fleet.start(tls_context=FailingTLSContext())
        self.assertEqual(len(FakeServer.instances), 1)
        self.assertTrue(FakeServer.instances[0].close_called)
        self.assertEqual(fleet.servers, [])
        self.assertEqual(fleet.threads, [])

    def test_port_collision_closes_all_three_before_threads_start(self):
        fleet = SHADOW.HTTPSKernelFleet(
            self.topology,
            server_factory=CollidingFakeServer,
        )
        with self.assertRaises(SHADOW.TopologyError) as caught:
            fleet.start(tls_context=FakeTLSContext())
        self.assertEqual(caught.exception.code, "PORT_COLLISION")
        self.assertEqual(len(FakeServer.instances), 3)
        self.assertTrue(all(server.close_called for server in FakeServer.instances))
        self.assertTrue(all(not server.serve_started for server in FakeServer.instances))

    def test_client_context_keeps_hostname_verification_enabled(self):
        sentinel = object()
        with mock.patch.object(
            SHADOW.ssl, "create_default_context", return_value=sentinel
        ) as create:
            self.assertIs(SHADOW.make_client_context("ca.pem"), sentinel)
        create.assert_called_once_with(
            SHADOW.ssl.Purpose.SERVER_AUTH,
            cafile="ca.pem",
        )


class OutputContractTests(unittest.TestCase):
    def make_proof_inputs(self):
        topology = SHADOW.build_topology()
        geometry = SHADOW.verify_root_geometry()
        controls = SHADOW.run_negative_controls(topology)
        return topology, geometry, controls

    def test_proof_output_is_hbp_like_and_scopes_claims(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            result = SHADOW.run_proof()
        self.assertEqual(result, 0)
        rows = output.getvalue().splitlines()
        self.assertGreaterEqual(len(rows), 6)
        self.assertTrue(all(row.endswith("|json=0") for row in rows))
        self.assertTrue(any("fanin=27_of_27" in row for row in rows))
        self.assertTrue(any("fourth_server=0" in row for row in rows))
        transport = next(row for row in rows if row.startswith("TRANSPORT|"))
        self.assertIn("listener_count=0", transport)
        self.assertIn("process_model=SINGLE_PROCESS_THREE_LISTENERS", transport)
        claim = next(row for row in rows if row.startswith("CLAIM|"))
        self.assertIn("software_topology=MEASURED_BY_THIS_PROCESS", claim)
        self.assertIn("operator_physical_law=JESSE_MEASURED_OPERATOR_CANON", claim)
        self.assertIn("this_run_scope=SOFTWARE_REMEASUREMENT_ONLY", claim)
        self.assertIn("physical_remeasurement_by_this_process=0", claim)

    def test_https_output_fails_closed_without_exact_evidence(self):
        topology, geometry, controls = self.make_proof_inputs()
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW.proof_rows(topology, geometry, controls, "HTTPS")
        self.assertEqual(caught.exception.code, "TRANSPORT_EVIDENCE")

        observations = SHADOW.observations_from_topology(topology)
        incomplete = SHADOW.HTTPSFanIn(
            observations,
            (b"omega",) * 3,
            (b"root",) * 3,
            (b"branch",) * 8,
        )
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW.proof_rows(
                topology,
                geometry,
                controls,
                "HTTPS",
                transport_evidence=incomplete,
            )
        self.assertEqual(caught.exception.code, "HTTPS_COVERAGE")

    def test_not_started_output_rejects_https_evidence(self):
        topology, geometry, controls = self.make_proof_inputs()
        evidence = SHADOW.HTTPSFanIn(
            SHADOW.observations_from_topology(topology),
            (b"same-omega",) * 3,
            (b"root",) * 3,
            (b"branch",) * 9,
        )
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW.proof_rows(
                topology,
                geometry,
                controls,
                "NOT_STARTED",
                transport_evidence=evidence,
            )
        self.assertEqual(caught.exception.code, "TRANSPORT_EVIDENCE")

    def test_required_header_rejects_missing_and_malformed_digest(self):
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW._required_header({}, "X-Test")
        self.assertEqual(caught.exception.code, "HTTP_HEADER")
        with self.assertRaises(SHADOW.TopologyError) as caught:
            SHADOW._digest_header({"X-Test": "not-hex"}, "X-Test")
        self.assertEqual(caught.exception.code, "HTTP_HEADER")

    def test_serve_cli_requires_certificate_and_key(self):
        parser = SHADOW.build_parser()
        with self.assertRaises(SystemExit):
            with contextlib.redirect_stderr(io.StringIO()):
                parser.parse_args(["serve"])


if __name__ == "__main__":
    unittest.main()
