"use strict";

const FEATURE_SCHEMA = Object.freeze([
  { id: "fractal_dimension", symbol: "D1", required: true },
  { id: "entropy", symbol: "E", required: true },
  { id: "lesion_area", symbol: "S", required: true },
  { id: "intensity_sigma", symbol: "sigma", required: true },
  { id: "color_channel", symbol: "Ci", required: true },
  { id: "contrast", symbol: "J", required: true },
  { id: "morphology_area", symbol: "Ai", required: true }
]);

function cleanFeatureVector(features = {}) {
  const out = {};
  for (const feature of FEATURE_SCHEMA) {
    const raw = features[feature.id] ?? features[feature.symbol];
    const value = Number(raw);
    out[feature.id] = Number.isFinite(value) ? value : null;
  }
  return out;
}

function validateGaSvmTask(task = {}) {
  const errors = [];
  const warnings = [];
  const features = cleanFeatureVector(task.features || {});

  for (const feature of FEATURE_SCHEMA) {
    if (feature.required && features[feature.id] == null) {
      errors.push(`missing_feature_${feature.id}`);
    }
  }
  if (task.crossValidationFolds != null && Number(task.crossValidationFolds) < 2) {
    errors.push("cross_validation_requires_at_least_two_folds");
  }
  if (task.datasetHash == null) {
    warnings.push("dataset_hash_missing");
  }
  if (task.fitness == null) {
    warnings.push("fitness_not_evaluated");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalized: {
      features,
      kernel: String(task.kernel || "rbf").toLowerCase(),
      crossValidationFolds: Math.max(2, Math.floor(Number(task.crossValidationFolds || 5)))
    }
  };
}

function buildGaSvmTask(task = {}) {
  const validation = validateGaSvmTask(task);
  return {
    engine: "ga_svm",
    status: validation.ok ? "READY_GATED" : "BLOCKED_BY_SCHEMA",
    taskType: "classification",
    domain: String(task.domain || "crop_disease").trim(),
    kernel: validation.normalized.kernel,
    hyperparameters: {
      optimizer: "genetic_algorithm",
      svmKernel: validation.normalized.kernel,
      target: ["C", "gamma"],
      fitness: "k_fold_cross_validation_accuracy"
    },
    featureSchema: FEATURE_SCHEMA,
    features: validation.normalized.features,
    gac: validation
  };
}

function manifest() {
  return {
    id: "ga_svm",
    title: "GA-SVM classification cognitive engine",
    description: "Gated adapter contract for genetic-algorithm optimized SVM classification tasks such as crop disease diagnosis.",
    capabilities: ["classification", "feature_validation", "hyperparameter_search", "fitness_scoring"],
    gacLaws: ["LAW-100-ga-svm-validation-and-drift"],
    runtime: {
      language: "node",
      package: "packages/ga-svm-engine",
      implementation: "packages/ga-svm-engine/src/GASVMAdapter.mjs",
      mode: "rbf_kernel_ga_smoke_classifier",
      productionPromotion: "requires_external_svm_or_validated_dataset_fitness_report",
      execution: "local_smoke_ready_dataset_runtime_gated"
    },
    featureSchema: FEATURE_SCHEMA,
    constraints: {
      requireDatasetHash: true,
      requireCrossValidation: true,
      requireFitnessReport: true,
      noMedicalOrAgriculturalGuaranteeClaim: true
    }
  };
}

module.exports = {
  FEATURE_SCHEMA,
  buildGaSvmTask,
  validateGaSvmTask,
  manifest
};
