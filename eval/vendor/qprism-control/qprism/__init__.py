"""QPRISM-MUSCLE-SIM (Acer build) -- matter-wave interferometer control-signal test.

Turn a neural/consciousness-derived stream into a CONTROL LANGUAGE for a macroscopic
quantum-interference experiment, and test -- blinded -- whether it improves experimental
control beyond random and classical-optimizer baselines. No metaphysical claim: the
stream never touches a wavefunction; it only proposes lawful control parameters (grating
timing, UV power, velocity-window selection) evaluated against a physics simulator.
"""
from .physics import Apparatus, Schedule, Anomaly, observe, grating_factor
from .harness import compare, reference_optimum
from .neural_sources import (NeuralSource, SyntheticSource, ConnectomeSource,
                             RecordedFeatureSource, SOURCES)
from . import behcs

__all__ = ["Apparatus", "Schedule", "Anomaly", "observe", "grating_factor",
           "compare", "reference_optimum", "behcs",
           "NeuralSource", "SyntheticSource", "ConnectomeSource",
           "RecordedFeatureSource", "SOURCES"]
__version__ = "0.1.0-acer"
