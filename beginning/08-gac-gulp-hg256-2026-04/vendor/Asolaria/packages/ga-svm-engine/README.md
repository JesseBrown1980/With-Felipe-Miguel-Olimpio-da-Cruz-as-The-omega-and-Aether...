# GA-SVM Engine

Local GA-SVM runtime bridge for Asolaria cognitive-engine routing.

Current runtime mode: `rbf_kernel_ga_smoke_classifier`.

The engine provides:

- GA optimization for `C` and `gamma`
- RBF-kernel classification smoke path
- deterministic seeded GA runs
- cross-validation fitness scoring
- crop-disease feature schema compatibility with the GA-SVM paper summary

Production classifier promotion stays gated on a real dataset manifest, feature extractor validation, fitness report, and operator approval.
