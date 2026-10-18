import { GeneticAlgorithm } from "./ga.mjs";

const FEATURE_SCHEMA = Object.freeze([
  { id: "fractal_dimension", aliases: ["fractal", "D1"] },
  { id: "entropy", aliases: ["E"] },
  { id: "lesion_area", aliases: ["area", "S"] },
  { id: "intensity_sigma", aliases: ["intensityStd", "sigma"] },
  { id: "color_channel", aliases: ["color", "Ci"] },
  { id: "contrast", aliases: ["J"] },
  { id: "morphology_area", aliases: ["morphology", "Ai"] }
]);

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function squaredDistance(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) {
    const delta = normalizeNumber(a[i]) - normalizeNumber(b[i]);
    total += delta * delta;
  }
  return total;
}

function uniqueLabels(labels) {
  return Array.from(new Set(labels.map((label) => String(label)))).sort();
}

function featureValue(source, schema) {
  if (!source || typeof source !== "object") return 0;
  if (source[schema.id] != null) return normalizeNumber(source[schema.id]);
  for (const alias of schema.aliases) {
    if (source[alias] != null) return normalizeNumber(source[alias]);
  }
  return 0;
}

export class GASVMAdapter {
  constructor({ pid = "GA-SVM-LOCAL", cropType = "crop", device = "cpu", config = {} } = {}) {
    this.pid = pid;
    this.cropType = cropType;
    this.device = device;
    this.config = config;
    this.bestParams = { C: null, gamma: null };
    this.bestFitness = null;
    this.fitnessHistory = [];
    this.trainingVectors = [];
    this.trainingLabels = [];
    this.labels = [];
    this.modelMode = "rbf_kernel_ga_smoke_classifier";
  }

  extractFeatures(input = {}) {
    const source = input.features && typeof input.features === "object" ? input.features : input;
    return Object.fromEntries(FEATURE_SCHEMA.map((schema) => [schema.id, featureValue(source, schema)]));
  }

  featuresToArray(features = {}) {
    return FEATURE_SCHEMA.map((schema) => featureValue(features, schema));
  }

  normalizeTrainingData(trainingData = []) {
    return trainingData.map((entry) => {
      if (Array.isArray(entry)) return entry.map((value) => normalizeNumber(value));
      return this.featuresToArray(this.extractFeatures(entry));
    });
  }

  trainRbfClassifier(vectors, labels, params = {}) {
    this.trainingVectors = vectors.map((row) => row.slice());
    this.trainingLabels = labels.map((label) => String(label));
    this.labels = uniqueLabels(this.trainingLabels);
    this.bestParams = {
      C: normalizeNumber(params.C, 1),
      gamma: normalizeNumber(params.gamma, 0.1)
    };
  }

  predictVector(vector, params = this.bestParams, vectors = this.trainingVectors, labels = this.trainingLabels) {
    if (!vectors.length || !labels.length) throw new Error("Model not trained");
    const gamma = normalizeNumber(params.gamma, 0.1);
    const C = normalizeNumber(params.C, 1);
    const scores = {};
    for (let i = 0; i < vectors.length; i += 1) {
      const label = String(labels[i]);
      const distance = squaredDistance(vector, vectors[i]);
      const weight = Math.exp(-gamma * distance) * Math.log1p(C);
      scores[label] = normalizeNumber(scores[label]) + weight;
    }
    const total = Object.values(scores).reduce((sum, value) => sum + value, 0) || 1;
    const probabilities = Object.fromEntries(
      Object.entries(scores)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, value]) => [label, value / total])
    );
    const [label, confidence] = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0];
    return { label, confidence, probabilities };
  }

  async crossValidate(vectors, labels, folds = 5, params = {}) {
    const n = vectors.length;
    const k = Math.max(2, Math.min(Math.floor(Number(folds) || 5), n));
    let correct = 0;
    let total = 0;
    for (let fold = 0; fold < k; fold += 1) {
      const trainVectors = [];
      const trainLabels = [];
      const testVectors = [];
      const testLabels = [];
      for (let i = 0; i < n; i += 1) {
        if (i % k === fold) {
          testVectors.push(vectors[i]);
          testLabels.push(labels[i]);
        } else {
          trainVectors.push(vectors[i]);
          trainLabels.push(labels[i]);
        }
      }
      for (let i = 0; i < testVectors.length; i += 1) {
        const prediction = this.predictVector(testVectors[i], params, trainVectors, trainLabels);
        if (String(prediction.label) === String(testLabels[i])) correct += 1;
        total += 1;
      }
    }
    return total ? correct / total : 0;
  }

  async train(trainingData = [], labels = [], options = {}) {
    const vectors = this.normalizeTrainingData(trainingData);
    if (vectors.length < 2) throw new Error("GA-SVM training requires at least two rows");
    if (vectors.length !== labels.length) throw new Error("Training data and labels length mismatch");
    const folds = Math.max(2, Math.floor(Number(options.folds || this.config.crossValidation || 5)));
    const ga = new GeneticAlgorithm({
      populationSize: options.populationSize || this.config.populationSize || 30,
      generations: options.generations || this.config.generations || 40,
      crossoverRate: options.crossoverRate || this.config.crossoverRate || 0.8,
      mutationRate: options.mutationRate || this.config.mutationRate || 0.1,
      C_range: options.C_range || this.config.C_range || [0.1, 100],
      gamma_range: options.gamma_range || this.config.gamma_range || [0.001, 1],
      seed: `${this.pid}:${this.cropType}:${vectors.length}:${labels.join("|")}`,
      fitnessFunction: (params) => this.crossValidate(vectors, labels, folds, params)
    });
    const result = await ga.run();
    this.trainRbfClassifier(vectors, labels, result.bestParams);
    this.bestFitness = result.bestFitness;
    this.fitnessHistory = result.history;
    return {
      status: "trained",
      pid: this.pid,
      cropType: this.cropType,
      modelMode: this.modelMode,
      bestParams: this.bestParams,
      bestFitness: this.bestFitness,
      generations: result.generations,
      folds
    };
  }

  async predict(input = {}) {
    const features = this.extractFeatures(input);
    const vector = this.featuresToArray(features);
    const prediction = this.predictVector(vector);
    return {
      status: "predicted",
      pid: this.pid,
      cropType: this.cropType,
      modelMode: this.modelMode,
      class: prediction.label,
      confidence: prediction.confidence,
      probabilities: prediction.probabilities,
      features,
      bestParams: this.bestParams,
      bestFitness: this.bestFitness
    };
  }

  status() {
    return {
      pid: this.pid,
      cropType: this.cropType,
      device: this.device,
      modelMode: this.modelMode,
      trained: this.trainingVectors.length > 0,
      trainingRows: this.trainingVectors.length,
      labels: this.labels,
      bestParams: this.bestParams,
      bestFitness: this.bestFitness
    };
  }
}

export { FEATURE_SCHEMA };
