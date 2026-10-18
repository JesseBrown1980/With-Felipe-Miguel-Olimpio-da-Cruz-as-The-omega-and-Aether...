"use strict";

const path = require("path");
const { spawn } = require("child_process");
const engineRegistry = require("./engineRegistry");
const { evaluateSpectralStability, LAW_ID } = require("../gac/laws/spectral-stability");
const {
  LAW_ID: CLASSIFICATION_LAW_ID,
  evaluateClassificationStability
} = require("../gac/laws/classification-stability");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

function cleanText(value, maxLen = 4000) {
  return String(value || "").replace(/\r/g, "").trim().slice(0, maxLen);
}

function normalizeTask(input = {}) {
  const body = input && typeof input === "object" ? input : {};
  const task = body.task && typeof body.task === "object" ? body.task : body;
  return {
    ...task,
    prompt: cleanText(task.prompt || task.message || task.text || "", 12000),
    engine: cleanText(task.engine || "", 120),
    pid: cleanText(task.pid || "", 160),
    kind: cleanText(task.kind || task.type || "", 160),
    domain: cleanText(task.domain || "", 160),
    loops: task.loops,
    maxTokens: task.maxTokens || task.max_new_tokens
  };
}

function buildLawContext(engineTask = {}, task = {}) {
  const engine = engineTask.engine || task.engine || "";
  if (engine === engineRegistry.ENGINE_IDS.GA_SVM) {
    const featureErrors = engineTask?.gac?.errors || [];
    return [
      evaluateClassificationStability(
        { engine: "ga_svm", datasetHash: task.datasetHash, confidence: task.confidence },
        {
          engine: "ga_svm",
          featureErrors,
          datasetHash: task.datasetHash,
          confidence: task.confidence,
          bestFitness: task.bestFitness ?? task.fitness,
          supportVectorRatio: task.supportVectorRatio,
          requireDatasetHash: task.requireDatasetHash
        }
      )
    ];
  }
  if (engine !== engineRegistry.ENGINE_IDS.OPENMYTHOS && engine !== "mythos") {
    return [];
  }
  const spectralRadius = task.spectralRadius ?? engineTask.spectralRadius ?? 0;
  return [
    evaluateSpectralStability(
      { engine: "openmythos", loops: engineTask.loops || task.loops, spectralRadius },
      { engine: "openmythos", loops: engineTask.loops || task.loops, spectralRadius }
    )
  ];
}

function buildCognitiveEngineRoute(input = {}) {
  const task = normalizeTask(input);
  const selectedEngine = task.engine || engineRegistry.classifyTask(task);
  const engineTask = engineRegistry.buildEngineTask({ ...task, engine: selectedEngine });
  const lawResults = buildLawContext(engineTask, task);
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    selectedEngine,
    engineTask,
    lawResults,
    manifest: engineRegistry.manifest()
  };
}

async function probeOpenMythosImport(python = process.env.ASOLARIA_MYTHOS_PYTHON || process.env.PYTHON || "python") {
  const code = [
    "import json",
    "try:",
    "    import open_mythos",
    "    from open_mythos.main import OpenMythos, MythosConfig",
    "    print(json.dumps({'ok': True, 'module': getattr(open_mythos, '__file__', '')}))",
    "except Exception as e:",
    "    print(json.dumps({'ok': False, 'error': type(e).__name__ + ': ' + str(e)}))"
  ].join("\n");

  return new Promise((resolve) => {
    const child = spawn(python, ["-c", code], { cwd: REPO_ROOT, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => resolve({ ok: false, error: error.message, python }));
    child.on("close", () => {
      try {
        const parsed = JSON.parse(stdout.trim() || "{}");
        resolve({ ...parsed, python, stderr: cleanText(stderr, 1000) });
      } catch {
        resolve({ ok: false, error: "open_mythos_probe_bad_json", stdout: cleanText(stdout, 1000), stderr: cleanText(stderr, 1000), python });
      }
    });
  });
}

async function executeOpenMythos(input = {}) {
  const route = buildCognitiveEngineRoute(input);
  if (route.selectedEngine !== engineRegistry.ENGINE_IDS.OPENMYTHOS) {
    return {
      ...route,
      executed: false,
      status: "ENGINE_ROUTE_ONLY",
      reason: "Selected engine is not OpenMythos."
    };
  }

  const task = normalizeTask(input);
  const configPath = cleanText(input.configPath || task.configPath || process.env.ASOLARIA_MYTHOS_CONFIG || "", 1000);
  const weightsPath = cleanText(input.weightsPath || task.weightsPath || process.env.ASOLARIA_MYTHOS_WEIGHTS || "", 1000);
  const shouldLoad = Boolean(input.load || task.load || configPath);
  const probe = await probeOpenMythosImport(input.python || task.python);

  const { MythosCognitiveEngine } = await import("../../packages/mythos-cognitive-engine/src/engine.mjs");
  const engine = new MythosCognitiveEngine({
    pid: task.pid || undefined,
    device: cleanText(input.device || task.device || process.env.ASOLARIA_MYTHOS_DEVICE || "cpu", 120),
    configPath: shouldLoad ? configPath : "",
    weightsPath: shouldLoad ? weightsPath : "",
    python: cleanText(input.python || task.python || "", 500)
  });

  const pid = engine.spawn();
  const statusBefore = await engine.status();
  let loadResult = { status: "skipped", reason: "no_config_requested" };
  let runResult = null;
  try {
    if (shouldLoad) {
      loadResult = await engine.loadModel(configPath, weightsPath);
    }
    if (input.run || task.run || task.prompt || task.inputIds || task.input_ids) {
      runResult = await engine.think(task.prompt, {
        loops: task.loops,
        maxNewTokens: task.maxTokens,
        inputIds: task.inputIds || task.input_ids,
        timeoutMs: input.timeoutMs || task.timeoutMs
      });
    }
    return {
      ...route,
      executed: true,
      status: "OPENMYTHOS_RUNTIME_INVOKED",
      pid,
      packageProbe: probe,
      statusBefore,
      loadResult,
      runResult,
      statusAfter: await engine.status()
    };
  } finally {
    if (!input.keepAlive && !task.keepAlive) {
      await engine.halt().catch(() => {});
    }
  }
}

async function executeGaSvm(input = {}) {
  const route = buildCognitiveEngineRoute({ ...input, engine: engineRegistry.ENGINE_IDS.GA_SVM });
  const task = normalizeTask(input);
  const { GASVMAdapter } = await import("../../packages/ga-svm-engine/src/GASVMAdapter.mjs");
  const engine = new GASVMAdapter({
    pid: task.pid || input.pid || "GA-SVM-RUNTIME",
    cropType: task.cropType || input.cropType || "crop_disease",
    device: task.device || input.device || "cpu",
    config: input.config || {}
  });

  const trainingData = Array.isArray(input.trainingData) ? input.trainingData : [];
  const labels = Array.isArray(input.labels) ? input.labels : [];
  const smoke = Boolean(input.smoke || task.smoke);
  let trainResult = null;
  if (trainingData.length && labels.length) {
    trainResult = await engine.train(trainingData, labels, input.options || {});
  } else if (smoke) {
    const rows = [
      { fractal_dimension: 0, entropy: 0, lesion_area: 0, intensity_sigma: 0, color_channel: 0, contrast: 0, morphology_area: 0 },
      { fractal_dimension: 0.1, entropy: 0.1, lesion_area: 0.1, intensity_sigma: 0.1, color_channel: 0.1, contrast: 0.1, morphology_area: 0.1 },
      { fractal_dimension: 10, entropy: 10, lesion_area: 10, intensity_sigma: 10, color_channel: 10, contrast: 10, morphology_area: 10 },
      { fractal_dimension: 10.1, entropy: 10.1, lesion_area: 10.1, intensity_sigma: 10.1, color_channel: 10.1, contrast: 10.1, morphology_area: 10.1 },
      { fractal_dimension: 20, entropy: 20, lesion_area: 20, intensity_sigma: 20, color_channel: 20, contrast: 20, morphology_area: 20 },
      { fractal_dimension: 20.1, entropy: 20.1, lesion_area: 20.1, intensity_sigma: 20.1, color_channel: 20.1, contrast: 20.1, morphology_area: 20.1 }
    ];
    trainResult = await engine.train(rows, ["healthy", "healthy", "mild", "mild", "severe", "severe"], {
      populationSize: 8,
      generations: 6,
      folds: 3
    });
  }

  const predictionInput = input.predict || input.features ? { features: input.predict || input.features } : null;
  const prediction = predictionInput ? await engine.predict(predictionInput) : null;
  const postLaw = prediction ? evaluateClassificationStability(
    {
      engine: "ga_svm",
      confidence: prediction.confidence,
      datasetHash: input.datasetHash || input.trainingDataHash || "runtime-smoke-dataset"
    },
    {
      engine: "ga_svm",
      confidence: prediction.confidence,
      bestFitness: trainResult?.bestFitness,
      datasetHash: input.datasetHash || input.trainingDataHash || "runtime-smoke-dataset",
      supportVectorRatio: input.supportVectorRatio || 0
    }
  ) : null;

  return {
    ...route,
    executed: true,
    status: "GA_SVM_RUNTIME_INVOKED",
    lawId: CLASSIFICATION_LAW_ID,
    trainResult,
    prediction,
    postLaw,
    engineStatus: engine.status()
  };
}

module.exports = {
  LAW_ID,
  CLASSIFICATION_LAW_ID,
  normalizeTask,
  buildCognitiveEngineRoute,
  executeOpenMythos,
  executeGaSvm,
  probeOpenMythosImport
};
