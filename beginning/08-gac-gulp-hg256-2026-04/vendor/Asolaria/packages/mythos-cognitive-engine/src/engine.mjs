import { spawn } from "child_process";
import { randomBytes } from "crypto";
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanText(value, maxLen = 4000) {
  return String(value || "").replace(/\r/g, "").trim().slice(0, maxLen);
}

function defaultPython() {
  return cleanText(process.env.ASOLARIA_MYTHOS_PYTHON || process.env.PYTHON || "python", 500);
}

function defaultAdapterPath() {
  return path.join(__dirname, "glyph_adapter.py");
}

export class MythosCognitiveEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.pid = cleanText(config.pid || `MYTHOS-${randomBytes(8).toString("hex")}`, 120);
    this.config = { ...config };
    this.process = null;
    this.pending = [];
    this.stdoutBuffer = "";
    this.stderrBuffer = "";
    this.spectralRadius = null;
    this.driftSignal = "SOFT";
    this.loopCount = 0;
  }

  spawn() {
    if (this.process) {
      return this.pid;
    }

    const adapterPath = cleanText(this.config.adapterPath || defaultAdapterPath(), 1000);
    if (!fs.existsSync(adapterPath)) {
      throw new Error(`Mythos glyph adapter not found: ${adapterPath}`);
    }

    const python = cleanText(this.config.python || defaultPython(), 500);
    const args = [
      adapterPath,
      "--pid",
      this.pid,
      "--device",
      cleanText(this.config.device || "cpu", 120),
      "--max-loops",
      String(Number(this.config.maxLoops || 16) || 16)
    ];

    if (this.config.configPath) {
      args.push("--config", cleanText(this.config.configPath, 1000));
    }
    if (this.config.weightsPath) {
      args.push("--weights", cleanText(this.config.weightsPath, 1000));
    }

    this.process = spawn(python, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      cwd: this.config.cwd || path.resolve(__dirname, "..", "..", "..")
    });

    this.process.stdout.on("data", (chunk) => this.#handleStdout(chunk));
    this.process.stderr.on("data", (chunk) => {
      this.stderrBuffer += chunk.toString();
      this.emit("stderr", this.stderrBuffer.slice(-4000));
    });
    this.process.on("exit", (code, signal) => {
      const pending = this.pending.splice(0);
      for (const item of pending) {
        clearTimeout(item.timer);
        item.reject(new Error(`Mythos engine exited before response: code=${code} signal=${signal || ""}`));
      }
      this.process = null;
      this.emit("exit", { code, signal });
    });
    this.process.on("error", (error) => {
      const pending = this.pending.splice(0);
      for (const item of pending) {
        clearTimeout(item.timer);
        item.reject(error);
      }
      this.process = null;
      this.emit("error", error);
    });

    return this.pid;
  }

  async send(verb, payload = {}, timeoutMs = 60000) {
    if (!this.process) {
      this.spawn();
    }
    const message = {
      verb: cleanText(verb, 80),
      pid: this.pid,
      ...payload
    };
    const line = `${JSON.stringify(message)}\n`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.pending.findIndex((item) => item.resolve === resolve);
        if (index >= 0) {
          this.pending.splice(index, 1);
        }
        reject(new Error("Mythos engine timed out."));
      }, Math.max(1000, Number(timeoutMs || 60000)));
      this.pending.push({ resolve, reject, timer });
      this.process.stdin.write(line);
    }).then((result) => {
      this.#captureStatus(result);
      return result;
    });
  }

  async loadModel(configPath, weightsPath = "") {
    return this.send("MYTHOS_LOAD", { config_path: configPath, weights_path: weightsPath });
  }

  async think(prompt, options = {}) {
    return this.send("MYTHOS_THINK", {
      prompt: cleanText(prompt, 12000),
      loops: options.loops,
      max_new_tokens: options.maxNewTokens,
      input_ids: options.inputIds
    }, options.timeoutMs);
  }

  async reason(options = {}) {
    return this.send("MYTHOS_REASON", {
      loops: options.loops,
      input_ids: options.inputIds
    }, options.timeoutMs);
  }

  async checkDrift() {
    return this.send("MYTHOS_DRIFT", {});
  }

  async status() {
    return this.send("MYTHOS_STATUS", {});
  }

  async halt() {
    const result = this.process ? await this.send("MYTHOS_HALT", {}, 5000).catch((error) => ({ status: "error", error: error.message })) : { status: "not_running", pid: this.pid };
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    return result;
  }

  #handleStdout(chunk) {
    this.stdoutBuffer += chunk.toString();
    let newline = this.stdoutBuffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.stdoutBuffer.slice(0, newline).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      if (line) {
        this.#resolveLine(line);
      }
      newline = this.stdoutBuffer.indexOf("\n");
    }
  }

  #resolveLine(line) {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      parsed = { status: "error", code: "bad_json_from_mythos", line: cleanText(line, 1000), error: error.message };
    }
    const next = this.pending.shift();
    if (!next) {
      this.emit("response", parsed);
      return;
    }
    clearTimeout(next.timer);
    next.resolve(parsed);
  }

  #captureStatus(result) {
    if (!result || typeof result !== "object") {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(result, "spectral_radius")) {
      this.spectralRadius = result.spectral_radius;
    }
    if (Object.prototype.hasOwnProperty.call(result, "drift_signal")) {
      this.driftSignal = result.drift_signal;
    }
    if (Object.prototype.hasOwnProperty.call(result, "last_loop_count")) {
      this.loopCount = result.last_loop_count;
    }
    if (Object.prototype.hasOwnProperty.call(result, "loops_used")) {
      this.loopCount = result.loops_used;
    }
  }
}

export function manifest() {
  return {
    id: "mythos-cognitive-engine",
    title: "OpenMythos PID-bound cognitive engine wrapper",
    runtime: "node-spawns-python-glyph-adapter",
    defaultAdapterPath: defaultAdapterPath(),
    environment: {
      python: "ASOLARIA_MYTHOS_PYTHON",
      package: "open-mythos"
    },
    constraints: {
      startsOnlyWhenSpawnCalled: true,
      noAutomaticDownloads: true,
      noAutomaticInstalls: true,
      noModelLoadedWithoutConfig: true
    }
  };
}
