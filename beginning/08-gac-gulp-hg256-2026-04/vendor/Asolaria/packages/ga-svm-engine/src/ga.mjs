import crypto from "crypto";

function createPrng(seedText = "ga-svm") {
  let state = crypto.createHash("sha256").update(String(seedText)).digest().readUInt32LE(0);
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class GeneticAlgorithm {
  constructor(config = {}) {
    this.populationSize = Math.max(4, Math.floor(Number(config.populationSize || 30)));
    this.generations = Math.max(1, Math.floor(Number(config.generations || 40)));
    this.crossoverRate = Number.isFinite(Number(config.crossoverRate)) ? Number(config.crossoverRate) : 0.8;
    this.mutationRate = Number.isFinite(Number(config.mutationRate)) ? Number(config.mutationRate) : 0.1;
    this.C_range = Array.isArray(config.C_range) ? config.C_range.slice(0, 2).map(Number) : [0.1, 100];
    this.gamma_range = Array.isArray(config.gamma_range) ? config.gamma_range.slice(0, 2).map(Number) : [0.001, 1];
    this.fitnessFunction = config.fitnessFunction;
    this.random = createPrng(config.seed || "ga-svm");
    this.population = [];
    this.history = [];
  }

  logUniform(min, max) {
    const lo = Math.log(Math.max(Number(min), Number.EPSILON));
    const hi = Math.log(Math.max(Number(max), Number.EPSILON));
    return Math.exp(lo + this.random() * (hi - lo));
  }

  gaussian(mean = 0, std = 1) {
    let u = this.random();
    let v = this.random();
    if (u <= 0) u = Number.EPSILON;
    if (v <= 0) v = Number.EPSILON;
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * std;
  }

  initialize() {
    this.population = [];
    for (let i = 0; i < this.populationSize; i += 1) {
      this.population.push({
        C: this.logUniform(this.C_range[0], this.C_range[1]),
        gamma: this.logUniform(this.gamma_range[0], this.gamma_range[1]),
        fitness: 0
      });
    }
  }

  async evaluateAll() {
    if (typeof this.fitnessFunction !== "function") {
      throw new Error("GeneticAlgorithm requires a fitnessFunction");
    }
    for (const individual of this.population) {
      individual.fitness = Number(await this.fitnessFunction({ C: individual.C, gamma: individual.gamma })) || 0;
    }
  }

  tournamentSelection(size = 3) {
    let best = null;
    for (let i = 0; i < size; i += 1) {
      const candidate = this.population[Math.floor(this.random() * this.population.length)];
      if (!best || candidate.fitness > best.fitness) best = candidate;
    }
    return { ...best };
  }

  crossover(parent1, parent2) {
    if (this.random() > this.crossoverRate) {
      return [{ ...parent1, fitness: 0 }, { ...parent2, fitness: 0 }];
    }
    const alpha = this.random();
    return [
      {
        C: alpha * parent1.C + (1 - alpha) * parent2.C,
        gamma: alpha * parent1.gamma + (1 - alpha) * parent2.gamma,
        fitness: 0
      },
      {
        C: alpha * parent2.C + (1 - alpha) * parent1.C,
        gamma: alpha * parent2.gamma + (1 - alpha) * parent1.gamma,
        fitness: 0
      }
    ];
  }

  mutate(individual) {
    let C = Number(individual.C);
    let gamma = Number(individual.gamma);
    if (this.random() < this.mutationRate) {
      C += this.gaussian(0, Math.max(0.01, C * 0.1));
    }
    if (this.random() < this.mutationRate) {
      gamma += this.gaussian(0, Math.max(0.0001, gamma * 0.1));
    }
    return {
      C: clamp(C, this.C_range[0], this.C_range[1]),
      gamma: clamp(gamma, this.gamma_range[0], this.gamma_range[1]),
      fitness: 0
    };
  }

  async run() {
    this.initialize();
    for (let generation = 0; generation < this.generations; generation += 1) {
      await this.evaluateAll();
      this.population.sort((a, b) => b.fitness - a.fitness);
      const best = this.population[0];
      const avg = this.population.reduce((sum, entry) => sum + entry.fitness, 0) / this.population.length;
      const min = this.population[this.population.length - 1].fitness;
      this.history.push({
        generation,
        best: best.fitness,
        avg,
        min,
        bestParams: { C: best.C, gamma: best.gamma }
      });

      if (generation > 0) {
        const prev = this.history[generation - 1].best;
        if (Math.abs(best.fitness - prev) < 0.0001) break;
      }

      const next = [{ ...best, fitness: 0 }];
      while (next.length < this.populationSize) {
        const parent1 = this.tournamentSelection();
        const parent2 = this.tournamentSelection();
        const [child1, child2] = this.crossover(parent1, parent2);
        next.push(this.mutate(child1));
        if (next.length < this.populationSize) next.push(this.mutate(child2));
      }
      this.population = next;
    }

    await this.evaluateAll();
    this.population.sort((a, b) => b.fitness - a.fitness);
    return {
      bestParams: {
        C: this.population[0].C,
        gamma: this.population[0].gamma
      },
      bestFitness: this.population[0].fitness,
      history: this.history,
      generations: this.history.length
    };
  }
}
