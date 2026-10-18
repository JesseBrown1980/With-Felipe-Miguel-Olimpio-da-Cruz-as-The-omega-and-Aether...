"use strict";

const { sha256, stableStringify } = require("./bimlFeedbackContract");
const { evaluateClassificationStability, LAW_ID } = require("../gac/laws/classification-stability");

const CONTRACT_ID = "ga-svm-glsm-feature-manifest.v1";
const REQUIRED_FEATURES = Object.freeze([
  "fractal_dimension",
  "entropy",
  "lesion_area",
  "intensity_sigma",
  "color_channel",
  "contrast",
  "morphology_area"
]);

function clip(value, max = 500) {
  return String(value === null || value === undefined ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
}

function buildFeatureManifest(input = {}) {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const dataset = input.dataset && typeof input.dataset === "object" ? input.dataset : {};
  const featureExtractor = input.featureExtractor && typeof input.featureExtractor === "object" ? input.featureExtractor : {};
  const manifest = {
    contractId: CONTRACT_ID,
    generatedAt,
    engine: "ga_svm_glsm",
    supervisor: clip(input.supervisor || "Hermes GA-SVM/GLSM Crop Supervisor", 240),
    law: LAW_ID,
    cropType: clip(input.cropType || "crop_disease", 160),
    dataset: {
      manifestPath: clip(dataset.manifestPath || "", 1000),
      hash: clip(dataset.hash || "", 128),
      status: dataset.hash ? "dataset_manifest_bound" : "dataset_manifest_required"
    },
    featureExtractor: {
      status: featureExtractor.status || "manifest_first_no_production_claim",
      features: REQUIRED_FEATURES.map((name) => ({
        name,
        source: clip(featureExtractor[name]?.source || "image_or_sensor_feature", 200),
        transform: clip(featureExtractor[name]?.transform || "bounded_numeric", 200),
        required: true
      }))
    },
    classifier: {
      kernel: "rbf",
      optimizer: "genetic_algorithm",
      parameters: {
        C: { min: 0.1, max: 100, distribution: "log_uniform" },
        gamma: { min: 0.001, max: 1, distribution: "log_uniform" }
      },
      productionPromotion: "closed_until_dataset_cross_validation_and_law100_pass"
    },
    output: {
      classes: "disease_class_1_to_n",
      confidenceRequired: 0.7,
      explainability: ["feature_vector", "support_vector_ratio", "law100_result"]
    }
  };
  return {
    ...manifest,
    digest: sha256(stableStringify(manifest))
  };
}

function validateFeatureVector(features = {}) {
  const errors = [];
  const vector = [];
  for (const feature of REQUIRED_FEATURES) {
    const value = Number(features[feature]);
    if (!Number.isFinite(value)) errors.push(`missing_or_invalid_${feature}`);
    else vector.push(value);
  }
  return { ok: errors.length === 0, errors, vector };
}

function validateManifest(manifest = {}, options = {}) {
  const featureValidation = validateFeatureVector(options.features || {});
  const lawResult = evaluateClassificationStability(
    { engine: "ga_svm", datasetHash: manifest.dataset?.hash, confidence: options.confidence },
    {
      engine: "ga_svm",
      datasetHash: manifest.dataset?.hash,
      confidence: options.confidence,
      supportVectorRatio: options.supportVectorRatio || 0,
      featureErrors: featureValidation.errors,
      requireDatasetHash: options.requireDatasetHash !== false
    }
  );
  const errors = [];
  if (manifest.contractId !== CONTRACT_ID) errors.push("wrong_contract_id");
  if (!manifest.supervisor) errors.push("missing_supervisor");
  if (!featureValidation.ok) errors.push(...featureValidation.errors);
  if (!lawResult.passed) errors.push(`law100_${lawResult.action}`);
  return {
    ok: errors.length === 0,
    contractId: CONTRACT_ID,
    errors,
    featureValidation,
    lawResult,
    digest: manifest.digest || sha256(stableStringify(manifest))
  };
}

module.exports = {
  CONTRACT_ID,
  REQUIRED_FEATURES,
  buildFeatureManifest,
  validateFeatureVector,
  validateManifest
};
