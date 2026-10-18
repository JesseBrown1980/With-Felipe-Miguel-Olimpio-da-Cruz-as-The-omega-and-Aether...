"use strict";

const LAW_ID = "LAW-100-ga-svm-validation-and-drift";

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function evaluateClassificationStability(action = {}, context = {}) {
  const engine = String(action.engine || context.engine || context.engineType || "").trim().toLowerCase();
  if (engine !== "ga_svm" && engine !== "ga-svm") {
    return { passed: true, law: LAW_ID, applies: false };
  }

  const confidence = numeric(context.confidence ?? action.confidence, null);
  const supportVectorRatio = numeric(context.supportVectorRatio ?? action.supportVectorRatio, 0);
  const fitness = numeric(context.fitness ?? context.bestFitness ?? action.fitness, null);
  const featureErrors = Array.isArray(context.featureErrors) ? context.featureErrors : [];
  const datasetHash = String(context.datasetHash || action.datasetHash || "").trim();

  if (featureErrors.length > 0) {
    return {
      passed: false,
      law: LAW_ID,
      applies: true,
      reason: `GA-SVM feature validation failed: ${featureErrors.join(", ")}`,
      action: "HALT",
      severity: "HARD"
    };
  }

  if (!datasetHash && context.requireDatasetHash !== false) {
    return {
      passed: false,
      law: LAW_ID,
      applies: true,
      reason: "GA-SVM dataset hash missing",
      action: "DEFER_TO_FALLBACK",
      severity: "HARD"
    };
  }

  if (confidence != null && confidence < 0.7) {
    return {
      passed: false,
      law: LAW_ID,
      applies: true,
      reason: `GA-SVM confidence ${confidence.toFixed(3)} below 0.700`,
      action: "DEFER_TO_FALLBACK",
      severity: "HARD"
    };
  }

  if (supportVectorRatio > 0.5) {
    return {
      passed: false,
      law: LAW_ID,
      applies: true,
      reason: `GA-SVM support vector ratio ${supportVectorRatio.toFixed(3)} above 0.500`,
      action: "RETRAIN",
      severity: "HARD"
    };
  }

  if (fitness != null && fitness < 0.75) {
    return {
      passed: true,
      law: LAW_ID,
      applies: true,
      warning: `GA-SVM cross-validation fitness ${fitness.toFixed(3)} below 0.750`,
      action: "LOG_DRIFT_HARD",
      severity: "SOFT"
    };
  }

  return {
    passed: true,
    law: LAW_ID,
    applies: true,
    action: "ALLOW",
    severity: "SOFT"
  };
}

module.exports = {
  LAW_ID,
  evaluateClassificationStability
};
