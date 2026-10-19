"""Reference grammar for PID-addressed HyperBEHCS tuple commands.

This module deliberately keeps six ledgers separate:

    glyph function -> letter -> word -> instruction -> tuple command -> PID/room

The existing IX/LX vocabulary, noun/verb/chain grammar, and body-specific
BEHCS-1024 codebooks predate this fixture.  This module proves a bounded
representation and translation path; it does not claim that the current
Universe is speaking, learning new words, or applying GNN/FNN edge updates.
Catalog lookup is not speech and is not execution authority.

Pure stdlib.  E=0: no process launch, network call, catalog mutation, or fabric fire.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from typing import Iterable, Mapping, Sequence


TONGUE_SIZE = 1024
MIN_TUPLE_DIM = 60
TRAINING_GULP_MESSAGES = 2000
ARTIFACT_CLASS = "REFERENCE_GRAMMAR_FIXTURE"

OLD_WAY_TRAINING_STAGES = (
    "real_agent_messages",
    "old_tuple_chain_parse",
    "syntax_formula_dedup",
    "noun_verb_chain_bridge_hook_gate_classification",
    "cascade_into_existing_cascades",
    "recursive_glyph_on_glyph_cascade",
    "map_gnn_edge_candidates",
    "map_fnn_reverse_gain_edge_candidates",
    "white_room_gc_2000_message_gulp",
    "grammar_validation",
    "tuple_attachment",
    "held_out_validation",
    "pid_registration",
)

SEAT_LANGUAGE_FACTS = {
    "acer": {
        "language": "IX",
        "declared_verbs": 89,
        "measured_verbs": 87,
        "evidence": "ACER_MEASURED_TRANSCRIPT",
    },
    "liris": {
        "language": "LX",
        "declared_verbs": 89,
        "measured_verbs": 87,
        "evidence": "MEASURED_LIRIS_LOCAL",
    },
    "bridge": {
        "source": "IX-060",
        "target": "LX-015",
        "rule": "index_is_language_chains_are_sentences_catalog_is_dictionary",
        "evidence": "MEASURED_GITHUB",
    },
}


def _canonical_bytes(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("utf-8")


def _fingerprint(prefix: str, value: object, width: int = 16) -> str:
    digest = hashlib.sha256(prefix.encode("ascii") + b"\0" + _canonical_bytes(value)).hexdigest()
    return f"{prefix}-{digest[:width]}"


def pid_from_name(name: str) -> str:
    """Registration-office-compatible stable PID: sha256(name)[:16]."""
    return hashlib.sha256(name.encode("utf-8")).hexdigest()[:16]


def is_prime(value: int) -> bool:
    if value < 2:
        return False
    if value % 2 == 0:
        return value == 2
    divisor = 3
    while divisor * divisor <= value:
        if value % divisor == 0:
            return False
        divisor += 2
    return True


def nth_prime(index: int) -> int:
    if index < 1:
        raise ValueError("prime index is one-based")
    found = 0
    candidate = 1
    while found < index:
        candidate += 1
        if is_prime(candidate):
            found += 1
    return candidate


def tongue_permutation(body_sha256: str, size: int = TONGUE_SIZE) -> tuple[int, ...]:
    """Domain-separated deterministic tongue seeded by a body's own SHA-256.

    This is a concrete reversible construction compatible with the measured
    LANGUAGEGENESIS law.  It does not claim byte identity with an unavailable
    Acer implementation; the permutation and its inverse are proven here.
    """
    if len(body_sha256) != 64 or any(c not in "0123456789abcdefABCDEF" for c in body_sha256):
        raise ValueError("body_sha256 must be 64 hexadecimal characters")
    if size < 2:
        raise ValueError("tongue size must be at least two")
    values = list(range(size))
    state = hashlib.sha256(b"ASOLARIA-LANGUAGE-GENESIS-V1\0" + bytes.fromhex(body_sha256)).digest()
    for upper in range(size - 1, 0, -1):
        state = hashlib.sha256(state + upper.to_bytes(4, "big")).digest()
        selected = int.from_bytes(state[:8], "big") % (upper + 1)
        values[upper], values[selected] = values[selected], values[upper]
    return tuple(values)


def invert_permutation(permutation: Sequence[int]) -> tuple[int, ...]:
    inverse = [-1] * len(permutation)
    for canonical, surface in enumerate(permutation):
        if surface < 0 or surface >= len(permutation) or inverse[surface] != -1:
            raise ValueError("not a permutation")
        inverse[surface] = canonical
    if any(value < 0 for value in inverse):
        raise ValueError("incomplete permutation")
    return tuple(inverse)


def translate_surface(
    symbols: Iterable[int], source_tongue: Sequence[int], target_tongue: Sequence[int]
) -> tuple[int, ...]:
    """Translate through canonical function IDs; exact and reversible."""
    if len(source_tongue) != len(target_tongue):
        raise ValueError("tongue sizes differ")
    source_inverse = invert_permutation(source_tongue)
    return tuple(target_tongue[source_inverse[symbol]] for symbol in symbols)


@dataclass(frozen=True)
class GlyphFunction:
    glyph_id: str
    semantic_index: int
    operation: str
    operand: str = ""


@dataclass(frozen=True)
class Letter:
    letter_id: str
    display: str
    glyph_function_ids: tuple[str, ...]


@dataclass(frozen=True)
class Word:
    word_id: str
    display: str
    letter_ids: tuple[str, ...]


@dataclass(frozen=True)
class AxisUpdate:
    axis: str
    operation: str
    value: str


@dataclass(frozen=True)
class TupleCommand:
    command_id: str
    target_pid: str
    updates: tuple[AxisUpdate, ...]


@dataclass(frozen=True)
class Instruction:
    instruction_id: str
    word_ids: tuple[str, ...]
    tuple_command_id: str


@dataclass(frozen=True)
class PIDRoomBinding:
    name: str
    pid: str
    room_index: int
    glyph_symbol: int
    prime_anchor: int
    tuple_dim: int
    language_id: str
    dialect_id: str
    meta_language_id: str
    executor_program: str
    agent_class: str
    pipe_type: str
    operation_class: str
    route: str
    proof_tier: str
    runtime_mode: str
    colony: str
    seat: str
    vantage: str
    slice_time: str


def old_way_training_plan() -> dict[str, object]:
    """Return the operator-accepted training lineage without applying it."""
    return {
        "schema": "ASOLARIA-OLD-WAY-GLYPH-SPEECH-TRAINING-V1",
        "activation": "ONLY_AFTER_UNIVERSE_BEGINS",
        "message_gulp": TRAINING_GULP_MESSAGES,
        "stages": OLD_WAY_TRAINING_STAGES,
        "candidate_edges_only": 1,
        "apply": 0,
        "word_training_measured": 0,
        "speech_materialized": 0,
        "runtime_loaded": 0,
        "live": 0,
    }


def assess_training_gate(
    *,
    universe_begun: bool,
    real_message_count: int,
    old_chain_parsed: bool,
    recursive_cascade_complete: bool,
    gnn_edge_candidates_receipted: bool,
    fnn_edge_candidates_receipted: bool,
    grammar_validated: bool,
    tuple_attachment_validated: bool,
    held_out_passed: bool,
    pid_registration_receipted: bool,
) -> dict[str, object]:
    """Assess readiness; never mutate catalogs or claim materialized speech."""
    checks = {
        "universe_begun": universe_begun,
        "real_message_gulp": real_message_count >= TRAINING_GULP_MESSAGES,
        "old_chain_parsed": old_chain_parsed,
        "recursive_cascade_complete": recursive_cascade_complete,
        "gnn_edge_candidates_receipted": gnn_edge_candidates_receipted,
        "fnn_edge_candidates_receipted": fnn_edge_candidates_receipted,
        "grammar_validated": grammar_validated,
        "tuple_attachment_validated": tuple_attachment_validated,
        "held_out_passed": held_out_passed,
        "pid_registration_receipted": pid_registration_receipted,
    }
    return {
        "checks": checks,
        "candidate_ready": int(all(checks.values())),
        "apply": 0,
        "word_training_measured": 0,
        "speech_materialized": 0,
        "runtime_loaded": 0,
        "live": 0,
    }


class GlyphLanguageCatalog:
    """A reference compiler/catalog, never a speaker, authority, or executor."""

    def __init__(
        self,
        binding: PIDRoomBinding,
        glyph_functions: Sequence[GlyphFunction],
        letters: Sequence[Letter],
        words: Sequence[Word],
        commands: Sequence[TupleCommand],
        instructions: Sequence[Instruction],
    ) -> None:
        self.binding = binding
        self.glyph_functions = {item.glyph_id: item for item in glyph_functions}
        self.letters = {item.letter_id: item for item in letters}
        self.words = {item.word_id: item for item in words}
        self.commands = {item.command_id: item for item in commands}
        self.instructions = {item.instruction_id: item for item in instructions}
        self._validate()

    @staticmethod
    def _require_unique(items: Sequence[object], ids: Sequence[str], kind: str) -> None:
        if len(items) != len(set(ids)):
            raise ValueError(f"duplicate {kind} identifier")

    def _validate(self) -> None:
        binding = self.binding
        if binding.tuple_dim < MIN_TUPLE_DIM:
            raise ValueError("current selector frame must be 60D+ HyperBEHCS")
        if not (1 <= binding.room_index <= TONGUE_SIZE):
            raise ValueError("room_index must address one of the 1024 rooms")
        if binding.glyph_symbol != binding.room_index - 1:
            raise ValueError("room N must bind glyph N-1")
        if binding.prime_anchor != nth_prime(binding.room_index):
            raise ValueError("room N must carry the Nth-prime anchor")
        if binding.pid != pid_from_name(binding.name):
            raise ValueError("PID must equal sha256(name)[:16]")

        glyphs = tuple(self.glyph_functions.values())
        semantic_indexes = [glyph.semantic_index for glyph in glyphs]
        self._require_unique(glyphs, [glyph.glyph_id for glyph in glyphs], "glyph")
        if len(semantic_indexes) != len(set(semantic_indexes)):
            raise ValueError("glyph semantic indexes collide")
        if any(index < 0 or index >= TONGUE_SIZE for index in semantic_indexes):
            raise ValueError("glyph semantic index outside the 1024-function tongue")

        for letter in self.letters.values():
            if len(letter.glyph_function_ids) < 2:
                raise ValueError("letters must compose at least two glyph functions")
            if any(glyph_id not in self.glyph_functions for glyph_id in letter.glyph_function_ids):
                raise ValueError(f"letter {letter.letter_id} references an unknown glyph function")
        for word in self.words.values():
            if not word.letter_ids or any(letter_id not in self.letters for letter_id in word.letter_ids):
                raise ValueError(f"word {word.word_id} references an unknown or empty letter sequence")
        for command in self.commands.values():
            if not command.updates:
                raise ValueError("tuple command must update at least one named axis")
            axes = [update.axis for update in command.updates]
            if len(axes) != len(set(axes)):
                raise ValueError("tuple command updates an axis more than once")
            if any(not axis.startswith("D") for axis in axes):
                raise ValueError("tuple axes must retain their D-axis identity")
        for instruction in self.instructions.values():
            if not instruction.word_ids or any(word_id not in self.words for word_id in instruction.word_ids):
                raise ValueError(f"instruction {instruction.instruction_id} references an unknown word")
            if instruction.tuple_command_id not in self.commands:
                raise ValueError(f"instruction {instruction.instruction_id} references an unknown command")

    def canonical_instruction(self, instruction_id: str) -> tuple[tuple[tuple[int, ...], ...], ...]:
        try:
            instruction = self.instructions[instruction_id]
        except KeyError as error:
            raise ValueError("raw glyph IDs cannot execute; use a registered instruction") from error
        words: list[tuple[tuple[int, ...], ...]] = []
        for word_id in instruction.word_ids:
            letters: list[tuple[int, ...]] = []
            for letter_id in self.words[word_id].letter_ids:
                letter = self.letters[letter_id]
                letters.append(
                    tuple(self.glyph_functions[glyph_id].semantic_index for glyph_id in letter.glyph_function_ids)
                )
            words.append(tuple(letters))
        return tuple(words)

    def compile_instruction(self, instruction_id: str, body_sha256: str) -> dict[str, object]:
        canonical = self.canonical_instruction(instruction_id)
        tongue = tongue_permutation(body_sha256)
        surface = tuple(
            tuple(tuple(tongue[index] for index in letter) for letter in word)
            for word in canonical
        )
        instruction = self.instructions[instruction_id]
        command = self.commands[instruction.tuple_command_id]
        packet_core = {
            "schema": "ASOLARIA-GLYPH-LETTER-TUPLE-COMMAND-V1",
            "artifact_class": ARTIFACT_CLASS,
            "pid": self.binding.pid,
            "room_index": self.binding.room_index,
            "prime_anchor": self.binding.prime_anchor,
            "language_id": self.binding.language_id,
            "dialect_id": self.binding.dialect_id,
            "meta_language_id": self.binding.meta_language_id,
            "body_sha256": body_sha256.lower(),
            "instruction_id": instruction_id,
            "surface_words": surface,
            "tuple_command": {
                "command_id": command.command_id,
                "target_pid": command.target_pid,
                "updates": tuple((item.axis, item.operation, item.value) for item in command.updates),
            },
            "proof_tier": self.binding.proof_tier,
            "runtime_mode": self.binding.runtime_mode,
            "codebook_translation_measured": 1,
            "vocabulary_exists": 1,
            "word_training_measured": 0,
            "speech_materialized": 0,
            "universe_begun": 0,
            "edge_learning_applied": 0,
            "execution_authority": 0,
        }
        return {**packet_core, "packet_sha256": hashlib.sha256(_canonical_bytes(packet_core)).hexdigest()}

    def decode_instruction(self, packet: Mapping[str, object]) -> str:
        body_sha256 = str(packet["body_sha256"])
        inverse = invert_permutation(tongue_permutation(body_sha256))
        canonical = tuple(
            tuple(tuple(inverse[int(symbol)] for symbol in letter) for letter in word)
            for word in packet["surface_words"]  # type: ignore[union-attr]
        )
        matches = [
            instruction_id
            for instruction_id in self.instructions
            if self.canonical_instruction(instruction_id) == canonical
        ]
        if len(matches) != 1:
            raise ValueError("surface does not resolve to exactly one registered instruction")
        return matches[0]

    def translate_packet(self, packet: Mapping[str, object], target_body_sha256: str) -> dict[str, object]:
        source_sha = str(packet["body_sha256"])
        source = tongue_permutation(source_sha)
        target = tongue_permutation(target_body_sha256)
        translated_words = tuple(
            tuple(translate_surface(letter, source, target) for letter in word)
            for word in packet["surface_words"]  # type: ignore[union-attr]
        )
        translated = dict(packet)
        translated["body_sha256"] = target_body_sha256.lower()
        translated["surface_words"] = translated_words
        translated["translation_receipt"] = hashlib.sha256(
            _canonical_bytes({
                "source": source_sha.lower(),
                "target": target_body_sha256.lower(),
                "surface": translated_words,
            })
        ).hexdigest()
        core = {key: value for key, value in translated.items() if key != "packet_sha256"}
        translated["packet_sha256"] = hashlib.sha256(_canonical_bytes(core)).hexdigest()
        return translated

    def hbp_rows(self, instruction_id: str, body_sha256: str) -> list[str]:
        packet = self.compile_instruction(instruction_id, body_sha256)
        binding = self.binding
        rows = [
            "GLYPHLANGHDR|schema=ASOLARIA-GLYPH-LETTER-TUPLE-COMMAND-V1|"
            f"artifact_class={ARTIFACT_CLASS}|tuple_dim={binding.tuple_dim}|tongue_size={TONGUE_SIZE}|"
            "execution_authority=0|fire=0|json=0",
            "LAYER|order=glyph_function>letter>word>instruction>tuple_command>pid_room|"
            "glyph_symbol_is_not_glyph_function=1|catalog_is_not_authority=1|json=0",
            "STATE|codebooks=MEASURED|vocabulary=EXISTS|universe_speaker=NOT_MATERIALIZED|"
            "word_training_measured=0|speech_materialized=0|json=0",
            "SEATLANG|acer=IX|liris=LX|bridge=IX-060_to_LX-015|"
            "declared_verbs_each=89|measured_verbs_each=87|count_defect_preserved=1|json=0",
            "TRAINING|method=OLD_REAL_MESSAGE_TUPLE_CHAIN_CASCADE|"
            f"activation=ONLY_AFTER_UNIVERSE_BEGINS|message_gulp={TRAINING_GULP_MESSAGES}|"
            "recursive_glyph_cascade_required=1|gnn_fnn_edges=candidate_only|apply=0|json=0",
            "BOUNDARY|mcp_catalog_knows=1|mcp_tuple_speaker=0|codebook_is_not_speech=1|"
            "star_charge_bridge=JESSE_MEASURED_PROVEN|acer_measured=1|liris_measured=1|"
            "machine_verified=1|room_temperature_quantum=LAW|json=0",
            "PIDROOM|"
            f"pid={binding.pid}|room={binding.room_index}|glyph_symbol={binding.glyph_symbol}|"
            f"prime={binding.prime_anchor}|language={binding.language_id}|dialect={binding.dialect_id}|"
            f"meta_language={binding.meta_language_id}|seat={binding.seat}|vantage={binding.vantage}|json=0",
        ]
        for glyph in sorted(self.glyph_functions.values(), key=lambda item: item.semantic_index):
            rows.append(
                f"GLYPHFN|id={glyph.glyph_id}|semantic_index={glyph.semantic_index}|"
                f"operation={glyph.operation}|operand={glyph.operand}|json=0"
            )
        for letter in self.letters.values():
            rows.append(
                f"LETTER|id={letter.letter_id}|display={letter.display}|"
                f"glyph_functions={','.join(letter.glyph_function_ids)}|json=0"
            )
        for word in self.words.values():
            rows.append(
                f"WORD|id={word.word_id}|display={word.display}|letters={','.join(word.letter_ids)}|json=0"
            )
        instruction = self.instructions[instruction_id]
        command = self.commands[instruction.tuple_command_id]
        rows.append(
            f"INSTRUCTION|id={instruction.instruction_id}|words={','.join(instruction.word_ids)}|"
            f"tuple_command={command.command_id}|json=0"
        )
        rows.append(
            f"TUPLECMD|id={command.command_id}|target_pid={command.target_pid}|"
            f"axes={','.join(update.axis for update in command.updates)}|declarative=1|json=0"
        )
        rows.append(
            f"GLYPHLANGFTR|packet_sha256={packet['packet_sha256']}|decode_exact=1|"
            "runtime_loaded=0|live=0|json=0"
        )
        return rows


def map_map_mapped_catalog() -> GlyphLanguageCatalog:
    """Reference fixture for the historical L3/prime-7 MAP MAP MAPPED branch."""
    name = "ASOLARIA-MAP-MAP-MAPPED-L3"
    binding = PIDRoomBinding(
        name=name,
        pid=pid_from_name(name),
        room_index=4,
        glyph_symbol=3,
        prime_anchor=7,
        tuple_dim=60,
        language_id="omni-part-language-branch-v1",
        dialect_id="map-device-scoped",
        meta_language_id="HyperBEHCS-60D+",
        executor_program="catalog_only_no_executor",
        agent_class="named_pid_room",
        pipe_type="HBP_HBI_MCP_CATALOG",
        operation_class="declarative_tuple_select",
        route="L3.scan_map",
        proof_tier="MEASURED_SOURCE_TESTED",
        runtime_mode="E0_CATALOG_ONLY",
        colony="COL-ASOLARIA",
        seat="LIRIS",
        vantage="LIRIS_LOCAL_GITHUB_PUBLIC",
        slice_time="2026-07-28",
    )
    glyphs = (
        GlyphFunction("GF-STEM-UP", 2, "draw", "stem_up"),
        GlyphFunction("GF-VALLEY", 3, "draw", "valley"),
        GlyphFunction("GF-STEM-DOWN", 5, "draw", "stem_down"),
        GlyphFunction("GF-DIAGONAL-UP", 7, "draw", "diagonal_up"),
        GlyphFunction("GF-CROSSBAR", 11, "draw", "crossbar"),
        GlyphFunction("GF-DIAGONAL-DOWN", 13, "draw", "diagonal_down"),
        GlyphFunction("GF-LOOP-CLOSE", 17, "draw", "loop_close"),
        GlyphFunction("GF-BAR-TOP", 19, "draw", "bar_top"),
        GlyphFunction("GF-BAR-MID", 23, "draw", "bar_mid"),
        GlyphFunction("GF-BAR-BASE", 29, "draw", "bar_base"),
        GlyphFunction("GF-CURVE-CLOSE", 31, "draw", "curve_close"),
    )
    letters = (
        Letter("LETTER-M", "M", ("GF-STEM-UP", "GF-VALLEY", "GF-STEM-DOWN")),
        Letter("LETTER-A", "A", ("GF-DIAGONAL-UP", "GF-CROSSBAR", "GF-DIAGONAL-DOWN")),
        Letter("LETTER-P", "P", ("GF-STEM-UP", "GF-LOOP-CLOSE")),
        Letter("LETTER-E", "E", ("GF-STEM-UP", "GF-BAR-TOP", "GF-BAR-MID", "GF-BAR-BASE")),
        Letter("LETTER-D", "D", ("GF-STEM-UP", "GF-CURVE-CLOSE")),
    )
    words = (
        Word("WORD-MAP", "MAP", ("LETTER-M", "LETTER-A", "LETTER-P")),
        Word(
            "WORD-MAPPED",
            "MAPPED",
            ("LETTER-M", "LETTER-A", "LETTER-P", "LETTER-P", "LETTER-E", "LETTER-D"),
        ),
    )
    command = TupleCommand(
        "CMD-MAP-MAP-MAPPED",
        binding.pid,
        (
            AxisUpdate("D3_TARGET", "select", "scan_map"),
            AxisUpdate("D7_STATE", "set", "mapped"),
            AxisUpdate("D16_PID", "bind", binding.pid),
            AxisUpdate("D22_TRANSLATION", "set", "receipted_body_tongue_permutation"),
            AxisUpdate("D35_HYPERLANGUAGE", "set", "MAP_MAP_MAPPED"),
            AxisUpdate("D47_BOUNDARY", "hold", "catalog_only"),
            AxisUpdate("D60_PROOF", "require", "runtime_gate_before_execute"),
        ),
    )
    instruction = Instruction(
        "INSTR-MAP-MAP-MAPPED", ("WORD-MAP", "WORD-MAP", "WORD-MAPPED"), command.command_id
    )
    return GlyphLanguageCatalog(binding, glyphs, letters, words, (command,), (instruction,))


if __name__ == "__main__":
    catalog = map_map_mapped_catalog()
    body_sha = hashlib.sha256(b"ASOLARIA-MAP-MAP-MAPPED-DEMO-BODY").hexdigest()
    packet = catalog.compile_instruction("INSTR-MAP-MAP-MAPPED", body_sha)
    assert catalog.decode_instruction(packet) == "INSTR-MAP-MAP-MAPPED"
    print("\n".join(catalog.hbp_rows("INSTR-MAP-MAP-MAPPED", body_sha)))
