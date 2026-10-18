#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const repoRoot = path.resolve(__dirname, "..");

const PATHS = Object.freeze({
  state: rel("data/behcs/state/openmythos/ga-svm-engine-smoke.state.json"),
  reportJson: rel("reports/ga-svm-engine-smoke-latest.json"),
  reportMd: rel("reports/ga-svm-engine-smoke-latest.md"),
  cube: rel("data/behcs/cubes/ga-svm-engine-smoke.cube.js")
});

const FEATURES = Object.freeze([
  "fractal_dimension",
  "entropy",
  "lesion_area",
  "intensity_sigma",
  "color_channel",
  "contrast",
  "morphology_area"
]);

const CENTERS = Object.freeze({
  healthy: [0, 0, 0, 0, 0, 0, 0],
  mild: [10, 10, 10, 10, 10, 10, 10],
  severe: [20, 20, 20, 20, 20, 20, 20]
});

function rel(p) {
  return path.join(repoRoot, p);
}

function repoRel(p) {
  return path.relative(repoRoot, p).replace(/\\/g, "/");
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeText(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, data.endsWith("\n") ? data : `${data}\n`, "utf8");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function buildRows() {
  const rows = [];
  const labels = [];
  for (const [label, center] of Object.entries(CENTERS)) {
    for (let i = 0; i < 10; i += 1) {
      const row = {};
      FEATURES.forEach((name, index) => {
        row[name] = center[index] + ((i % 5) - 2) * 0.005 + (index % 2) * 0.002;
      });
      rows.push(row);
      labels.push(label);
    }
  }
  return { rows, labels };
}

function buildReport(result, generatedAt) {
  const json = {
    reportId: "ga-svm-engine-smoke-latest",
    generatedAt,
    status: "GA_SVM_LOCAL_SMOKE_PASS",
    runtimeMode: "rbf_kernel_ga_smoke_classifier",
    result,
    gates: {
      packageInstall: "closed",
      nativeSvmRuntime: "gated",
      productionDataset: "gated",
      diagnosisClaim: "gated",
      promotionRule: "requires_real_dataset_manifest_feature_extractor_and_fitness_report"
    }
  };
  const md = `# GA-SVM Engine Smoke

Generated: ${generatedAt}

Status: GA_SVM_LOCAL_SMOKE_PASS

Runtime mode: \`rbf_kernel_ga_smoke_classifier\`

The local GA-SVM engine package trained on synthetic crop-feature rows, optimized \`C\` and \`gamma\`, ran cross-validation fitness, and produced a prediction through the same feature schema used by the fusion bridge.

## Result

- Training rows: ${result.trainingRows}
- Labels: ${result.labels.join(", ")}
- Best fitness: ${result.train.bestFitness}
- Generations: ${result.train.generations}
- Best C: ${result.train.bestParams.C}
- Best gamma: ${result.train.bestParams.gamma}
- Prediction class: ${result.prediction.class}
- Prediction confidence: ${result.prediction.confidence}

## Gates

- Native SVM package: gated
- Production dataset: gated
- Diagnosis/promotion: gated until dataset manifest, feature extractor, and fitness report exist
`;
  return { json, md };
}

function buildCube(result, generatedAt) {
  const cube = {
    id: "ga-svm-engine-smoke",
    generatedAt,
    primaryCatalog: { D: 37, name: "AUTHORITY", prime: 157 },
    touches: [6, 20, 35, 37, 38, 39, 42, 47],
    payload: {
      kind: "ga-svm-local-smoke",
      status: "GA_SVM_LOCAL_SMOKE_PASS",
      runtimeMode: "rbf_kernel_ga_smoke_classifier",
      bestFitness: result.train.bestFitness,
      predictedClass: result.prediction.class,
      dataHash: result.dataHash
    },
    translate: {
      human: "GA-SVM local smoke trained a gated RBF-kernel classifier on synthetic crop features.",
      agent: "(asolaria, ga_svm, crop_features, genetic_algorithm, rbf_kernel, gated_smoke)",
      device: "node tools/ga-svm-engine-smoke.js run --execute"
    }
  };
  return `// cube: ga-svm-engine-smoke | classification | D37 AUTHORITY\nexport const CUBE = ${JSON.stringify(cube, null, 2)}\n`;
}

async function run({ execute = false } = {}) {
  const generatedAt = new Date().toISOString();
  const { GASVMAdapter } = await import("../packages/ga-svm-engine/src/GASVMAdapter.mjs");
  const { rows, labels } = buildRows();
  const engine = new GASVMAdapter({ pid: "GA-SVM-SMOKE", cropType: "leaf" });
  const train = await engine.train(rows, labels, { populationSize: 10, generations: 8, folds: 5 });
  const prediction = await engine.predict({
    features: {
      fractal_dimension: 20,
      entropy: 20,
      lesion_area: 20,
      intensity_sigma: 20,
      color_channel: 20,
      contrast: 20,
      morphology_area: 20
    }
  });
  const result = {
    dataHash: sha256Text(JSON.stringify({ rows, labels })),
    trainingRows: rows.length,
    labels: Array.from(new Set(labels)).sort(),
    train,
    prediction: {
      class: prediction.class,
      confidence: Math.round(prediction.confidence * 1000) / 1000,
      probabilities: prediction.probabilities
    },
    engineStatus: engine.status()
  };
  const report = buildReport(result, generatedAt);
  if (execute) {
    writeJson(PATHS.state, { savedAt: generatedAt, status: "GA_SVM_LOCAL_SMOKE_PASS", report: repoRel(PATHS.reportMd) });
    writeJson(PATHS.reportJson, report.json);
    writeText(PATHS.reportMd, report.md);
    writeText(PATHS.cube, buildCube(result, generatedAt));
  }
  return {
    ok: true,
    action: execute ? "run" : "preview",
    generatedAt,
    status: "GA_SVM_LOCAL_SMOKE_PASS",
    result,
    outputs: {
      state: repoRel(PATHS.state),
      reportJson: repoRel(PATHS.reportJson),
      reportMd: repoRel(PATHS.reportMd),
      cube: repoRel(PATHS.cube)
    }
  };
}

async function main(argv) {
  const action = argv[2] || "status";
  const execute = argv.includes("--execute");
  if (action === "status" || action === "run") {
    console.log(JSON.stringify(await run({ execute: action === "run" && execute }), null, 2));
    return;
  }
  console.error(JSON.stringify({
    ok: false,
    error: `Unknown action: ${action}`,
    usage: [
      "node tools/ga-svm-engine-smoke.js status",
      "node tools/ga-svm-engine-smoke.js run --execute"
    ]
  }, null, 2));
  process.exitCode = 2;
}

main(process.argv).catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
