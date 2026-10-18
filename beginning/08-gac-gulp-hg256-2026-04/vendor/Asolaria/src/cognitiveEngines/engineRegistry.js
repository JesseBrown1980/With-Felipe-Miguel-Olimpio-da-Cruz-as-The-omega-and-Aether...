"use strict";

const openmythos = require("./openmythosAdapter");
const gaSvm = require("./gaSvmAdapter");

const ENGINE_IDS = Object.freeze({
  OPENMYTHOS: "openmythos",
  GA_SVM: "ga_svm",
  FUSION: "openmythos_ga_svm_fusion"
});

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function classifyTask(task = {}) {
  const text = `${task.kind || ""} ${task.domain || ""} ${task.prompt || ""}`.toLowerCase();
  const wantsClassification = /\b(classif|crop|disease|svm|feature|image|sensor)\b/.test(text)
    || Boolean(task.features);
  const wantsDeepReasoning = /\b(reason|prove|plan|mythos|recurrent|loop|deep|complex)\b/.test(text)
    || numeric(task.complexity, 0) >= 0.7;

  if (wantsClassification && wantsDeepReasoning) return ENGINE_IDS.FUSION;
  if (wantsClassification) return ENGINE_IDS.GA_SVM;
  if (wantsDeepReasoning) return ENGINE_IDS.OPENMYTHOS;
  return "default";
}

function buildEngineTask(task = {}) {
  const selected = task.engine || classifyTask(task);
  if (selected === ENGINE_IDS.OPENMYTHOS) {
    return openmythos.buildOpenMythosGlyphTask(task);
  }
  if (selected === ENGINE_IDS.GA_SVM) {
    return gaSvm.buildGaSvmTask(task);
  }
  if (selected === ENGINE_IDS.FUSION) {
    return {
      engine: ENGINE_IDS.FUSION,
      status: "READY_GATED",
      stages: [
        gaSvm.buildGaSvmTask({ ...task, domain: task.domain || "crop_disease" }),
        openmythos.buildOpenMythosGlyphTask({
          ...task,
          prompt: task.prompt || "Review GA-SVM classification output, drift risk, and operator explanation.",
          verb: openmythos.GLYPH_VERBS.MYTHOS_REASON
        })
      ],
      gacLaws: [
        "LAW-099-openmythos-recurrence-stability",
        "LAW-100-ga-svm-validation-and-drift"
      ]
    };
  }
  return {
    engine: "default",
    status: "NO_SPECIAL_ENGINE_SELECTED",
    reason: "Task did not match OpenMythos or GA-SVM routing rules."
  };
}

function manifest() {
  return {
    registryId: "asolaria-cognitive-engine-registry.v1",
    engines: [
      openmythos.manifest(),
      gaSvm.manifest(),
      {
        id: ENGINE_IDS.FUSION,
        title: "OpenMythos + GA-SVM fusion lane",
        description: "GA-SVM handles validated feature classification; OpenMythos reviews deep reasoning, drift, and explanation under GAC.",
        capabilities: ["classification_then_deep_reasoning", "drift_review", "operator_explanation"],
        gacLaws: [
          "LAW-099-openmythos-recurrence-stability",
          "LAW-100-ga-svm-validation-and-drift"
        ],
        execution: "blocked_until_both_engines_pass_smoke_tests"
      }
    ],
    selectionRules: [
      {
        engine: ENGINE_IDS.GA_SVM,
        selectorId: "worker_lane.ga_svm",
        surface: "classification",
        trigger: "classification, crop disease, image/sensor features, SVM",
        fallback: "default"
      },
      {
        engine: ENGINE_IDS.OPENMYTHOS,
        selectorId: "worker_lane.openmythos",
        surface: "deep_reasoning",
        trigger: "deep reasoning, recurrent loops, high complexity",
        fallback: "default"
      },
      {
        engine: ENGINE_IDS.FUSION,
        selectorId: "worker_lane.openmythos_ga_svm_fusion",
        surface: "classification_then_deep_reasoning",
        trigger: "classification plus deep reasoning or explanation",
        fallback: ENGINE_IDS.GA_SVM
      }
    ]
  };
}

module.exports = {
  ENGINE_IDS,
  classifyTask,
  buildEngineTask,
  manifest
};
