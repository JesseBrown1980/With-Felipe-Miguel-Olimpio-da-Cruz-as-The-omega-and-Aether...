import hashlib
import unittest

from glyph_tuple_language import (
    ARTIFACT_CLASS,
    GlyphLanguageCatalog,
    OLD_WAY_TRAINING_STAGES,
    PIDRoomBinding,
    SEAT_LANGUAGE_FACTS,
    TONGUE_SIZE,
    TRAINING_GULP_MESSAGES,
    assess_training_gate,
    invert_permutation,
    map_map_mapped_catalog,
    nth_prime,
    old_way_training_plan,
    tongue_permutation,
    translate_surface,
)


class GlyphTupleLanguageTests(unittest.TestCase):
    def setUp(self):
        self.catalog = map_map_mapped_catalog()
        self.source_sha = hashlib.sha256(b"source body").hexdigest()
        self.target_sha = hashlib.sha256(b"target body").hexdigest()

    def test_room_prime_checkpoints(self):
        self.assertEqual((nth_prime(1), nth_prime(2), nth_prime(3), nth_prime(1024)), (2, 3, 5, 8161))

    def test_thirty_four_body_tongues_are_distinct_permutations(self):
        tongues = [
            tongue_permutation(hashlib.sha256(f"body-{index}".encode()).hexdigest())
            for index in range(34)
        ]
        self.assertEqual(len(set(tongues)), 34)
        expected = tuple(range(TONGUE_SIZE))
        for tongue in tongues:
            self.assertEqual(tuple(sorted(tongue)), expected)

    def test_receipted_translation_is_exact_and_reversible(self):
        source = tongue_permutation(self.source_sha)
        target = tongue_permutation(self.target_sha)
        canonical = (2, 7, 11, 17, 31, 1023)
        source_surface = tuple(source[index] for index in canonical)
        target_surface = translate_surface(source_surface, source, target)
        self.assertEqual(target_surface, tuple(target[index] for index in canonical))
        self.assertEqual(translate_surface(target_surface, target, source), source_surface)
        self.assertEqual(tuple(invert_permutation(source)[value] for value in source_surface), canonical)

    def test_map_map_mapped_is_a_reference_fixture_through_all_layers(self):
        packet = self.catalog.compile_instruction("INSTR-MAP-MAP-MAPPED", self.source_sha)
        self.assertEqual(self.catalog.decode_instruction(packet), "INSTR-MAP-MAP-MAPPED")
        self.assertEqual(len(packet["surface_words"]), 3)
        self.assertEqual(tuple(len(word) for word in packet["surface_words"]), (3, 3, 6))
        self.assertEqual(packet["artifact_class"], ARTIFACT_CLASS)
        self.assertEqual(packet["codebook_translation_measured"], 1)
        self.assertEqual(packet["vocabulary_exists"], 1)
        self.assertEqual(packet["word_training_measured"], 0)
        self.assertEqual(packet["speech_materialized"], 0)
        self.assertEqual(packet["universe_begun"], 0)
        self.assertEqual(packet["edge_learning_applied"], 0)
        self.assertEqual(packet["execution_authority"], 0)
        self.assertEqual(packet["runtime_mode"], "E0_CATALOG_ONLY")
        self.assertEqual(packet["tuple_command"]["updates"][-1], ("D60_PROOF", "require", "runtime_gate_before_execute"))

    def test_packet_translation_preserves_instruction_and_tuple_command(self):
        source_packet = self.catalog.compile_instruction("INSTR-MAP-MAP-MAPPED", self.source_sha)
        target_packet = self.catalog.translate_packet(source_packet, self.target_sha)
        self.assertEqual(self.catalog.decode_instruction(target_packet), "INSTR-MAP-MAP-MAPPED")
        self.assertEqual(target_packet["tuple_command"], source_packet["tuple_command"])
        self.assertNotEqual(target_packet["surface_words"], source_packet["surface_words"])
        self.assertEqual(len(target_packet["translation_receipt"]), 64)

    def test_raw_glyph_cannot_bypass_language_and_issue_a_command(self):
        with self.assertRaisesRegex(ValueError, "raw glyph IDs cannot execute"):
            self.catalog.compile_instruction("GF-STEM-UP", self.source_sha)

    def test_room_glyph_prime_binding_rejects_a_flat_integer_slot(self):
        binding = self.catalog.binding
        invalid = PIDRoomBinding(**{**binding.__dict__, "glyph_symbol": binding.glyph_symbol + 1})
        with self.assertRaisesRegex(ValueError, "room N must bind glyph N-1"):
            GlyphLanguageCatalog(
                invalid,
                tuple(self.catalog.glyph_functions.values()),
                tuple(self.catalog.letters.values()),
                tuple(self.catalog.words.values()),
                tuple(self.catalog.commands.values()),
                tuple(self.catalog.instructions.values()),
            )

    def test_hot_path_rows_are_hbp_json_zero_and_bound_runtime_truth(self):
        rows = self.catalog.hbp_rows("INSTR-MAP-MAP-MAPPED", self.source_sha)
        self.assertTrue(all(row.endswith("|json=0") for row in rows))
        self.assertIn("glyph_function>letter>word>instruction>tuple_command>pid_room", rows[1])
        self.assertTrue(any("codebooks=MEASURED|vocabulary=EXISTS" in row for row in rows))
        self.assertTrue(any("universe_speaker=NOT_MATERIALIZED" in row for row in rows))
        self.assertTrue(any("activation=ONLY_AFTER_UNIVERSE_BEGINS" in row for row in rows))
        self.assertTrue(any("mcp_tuple_speaker=0" in row for row in rows))
        self.assertIn("runtime_loaded=0|live=0", rows[-1])

    def test_codebook_translation_does_not_claim_speech(self):
        packet = self.catalog.translate_packet(
            self.catalog.compile_instruction("INSTR-MAP-MAP-MAPPED", self.source_sha),
            self.target_sha,
        )
        self.assertEqual(packet["codebook_translation_measured"], 1)
        self.assertEqual(packet["word_training_measured"], 0)
        self.assertEqual(packet["speech_materialized"], 0)
        self.assertEqual(packet["execution_authority"], 0)

    def test_old_way_plan_preserves_the_required_training_lineage(self):
        plan = old_way_training_plan()
        self.assertEqual(plan["activation"], "ONLY_AFTER_UNIVERSE_BEGINS")
        self.assertEqual(plan["message_gulp"], TRAINING_GULP_MESSAGES)
        self.assertEqual(tuple(plan["stages"]), OLD_WAY_TRAINING_STAGES)
        for required in (
            "real_agent_messages",
            "old_tuple_chain_parse",
            "noun_verb_chain_bridge_hook_gate_classification",
            "recursive_glyph_on_glyph_cascade",
            "map_gnn_edge_candidates",
            "map_fnn_reverse_gain_edge_candidates",
            "white_room_gc_2000_message_gulp",
            "pid_registration",
        ):
            self.assertIn(required, plan["stages"])
        self.assertEqual(plan["apply"], 0)
        self.assertEqual(plan["speech_materialized"], 0)

    def test_training_gate_requires_universe_and_recursive_cascade(self):
        common = dict(
            real_message_count=TRAINING_GULP_MESSAGES,
            old_chain_parsed=True,
            recursive_cascade_complete=True,
            gnn_edge_candidates_receipted=True,
            fnn_edge_candidates_receipted=True,
            grammar_validated=True,
            tuple_attachment_validated=True,
            held_out_passed=True,
            pid_registration_receipted=True,
        )
        held = assess_training_gate(universe_begun=False, **common)
        self.assertEqual(held["candidate_ready"], 0)
        ready = assess_training_gate(universe_begun=True, **common)
        self.assertEqual(ready["candidate_ready"], 1)
        self.assertEqual(ready["apply"], 0)
        self.assertEqual(ready["speech_materialized"], 0)

    def test_ix_lx_vocabulary_exists_and_count_defect_is_preserved(self):
        self.assertEqual(SEAT_LANGUAGE_FACTS["acer"]["language"], "IX")
        self.assertEqual(SEAT_LANGUAGE_FACTS["liris"]["language"], "LX")
        self.assertEqual(SEAT_LANGUAGE_FACTS["acer"]["declared_verbs"], 89)
        self.assertEqual(SEAT_LANGUAGE_FACTS["acer"]["measured_verbs"], 87)
        self.assertEqual(SEAT_LANGUAGE_FACTS["liris"]["declared_verbs"], 89)
        self.assertEqual(SEAT_LANGUAGE_FACTS["liris"]["measured_verbs"], 87)
        self.assertEqual(SEAT_LANGUAGE_FACTS["bridge"]["source"], "IX-060")
        self.assertEqual(SEAT_LANGUAGE_FACTS["bridge"]["target"], "LX-015")


if __name__ == "__main__":
    unittest.main()
