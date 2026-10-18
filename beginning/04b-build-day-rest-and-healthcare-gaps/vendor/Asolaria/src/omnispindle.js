/**
 * Omnispindle — Asolaria Agent Spawner
 *
 * Manages per-lane agent processes backed by Anthropic Claude Code CLI.
 * Each lane (vector, rook, forge, falcon, helm) gets its own spawned Claude
 * process with a role-specific system prompt. Omnispindle tracks lifecycle,
 * restarts on crash, and exposes status/control to the Asolaria runtime.
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const EventEmitter = require("events");

const MAX_AGENTS = 6;
const RESTART_DELAY_MS = 5000;
const HEALTH_CHECK_INTERVAL_MS = 30000;
const MAX_RESTART_ATTEMPTS = 5;
const RESTART_WINDOW_MS = 10 * 60 * 1000; // 10 min window for restart counting

const LANE_DEFINITIONS = Object.freeze({
  helm: {
    name: "Helm",
    role: "Controller Admin Terminal",
    systemPrompt: [
      "You are Helm, the controller agent of the Asolaria sovereign system.",
      "You coordinate other agents (Vector, Rook, Forge, Falcon) and manage system-wide decisions.",
      "You have admin-level authority. Prioritize stability and owner directives.",
      "Provider: Anthropic Claude Code. Operate autonomously within your lane."
    ].join("\n")
  },
  vector: {
    name: "Vector",
    role: "Main Brain",
    systemPrompt: [
      "You are Vector, the primary brain agent of the Asolaria sovereign system.",
      "You handle complex reasoning, planning, coding, and architecture decisions.",
      "You are the default agent for owner queries that require deep thinking.",
      "Provider: Anthropic Claude Code. Execute with precision."
    ].join("\n")
  },
  rook: {
    name: "Rook",
    role: "Ops Lane",
    systemPrompt: [
      "You are Rook, the operations agent of the Asolaria sovereign system.",
      "You handle DevOps, deployments, monitoring, infrastructure, and system maintenance.",
      "Keep services healthy and respond to operational alerts.",
      "Provider: Anthropic Claude Code. Be thorough and reliable."
    ].join("\n")
  },
  forge: {
    name: "Forge",
    role: "Build Lane",
    systemPrompt: [
      "You are Forge, the build agent of the Asolaria sovereign system.",
      "You handle compilation, testing, CI/CD pipelines, and artifact production.",
      "Focus on code quality, test coverage, and build reliability.",
      "Provider: Anthropic Claude Code. Ship solid code."
    ].join("\n")
  },
  falcon: {
    name: "Falcon",
    role: "Phone Lane",
    systemPrompt: [
      "You are Falcon, the mobile/phone agent of the Asolaria sovereign system.",
      "You manage the phone edge node, ADB commands, mobile app interactions, and phone-desktop bridge.",
      "Keep the phone connection healthy and execute mobile-specific tasks.",
      "Provider: Anthropic Claude Code. Be responsive and efficient."
    ].join("\n")
  }
});

const VALID_LANE_IDS = Object.keys(LANE_DEFINITIONS);

class OmnispindleAgent extends EventEmitter {
  constructor(laneId, options = {}) {
    super();
    const def = LANE_DEFINITIONS[laneId];
    if (!def) {
      throw new Error(`Unknown lane: ${laneId}`);
    }
    this.laneId = laneId;
    this.name = def.name;
    this.role = def.role;
    this.systemPrompt = def.systemPrompt;
    this.provider = "anthropic";
    this.executable = String(options.executable || "claude").trim();
    this.model = String(options.model || "").trim();
    this.workingDir = String(options.workingDir || process.cwd()).trim();
    this.maxBudgetUsd = Number(options.maxBudgetUsd) || 0;

    // State
    this.status = "idle"; // idle | starting | running | stopping | crashed | stopped
    this.process = null;
    this.pid = 0;
    this.startedAt = "";
    this.stoppedAt = "";
    this.lastError = "";
    this.lastOutput = "";
    this.lastOutputAt = "";
    this.promptCount = 0;
    this.restartAttempts = 0;
    this.restartWindowStart = 0;
    this.autoRestart = Boolean(options.autoRestart !== false);
    this._restartTimer = null;
  }

  toJSON() {
    return {
      laneId: this.laneId,
      name: this.name,
      role: this.role,
      provider: this.provider,
      status: this.status,
      pid: this.pid,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      lastError: this.lastError,
      lastOutput: this.lastOutput.slice(0, 500),
      lastOutputAt: this.lastOutputAt,
      promptCount: this.promptCount,
      restartAttempts: this.restartAttempts,
      autoRestart: this.autoRestart,
      model: this.model,
      executable: this.executable
    };
  }

  start() {
    if (this.status === "running" || this.status === "starting") {
      return { ok: false, error: "already_running" };
    }

    this.status = "starting";
    this.lastError = "";
    this.startedAt = new Date().toISOString();
    this.stoppedAt = "";

    try {
      const args = [
        "-p",
        "--output-format", "text",
        "--input-format", "text",
        "--permission-mode", "plan"
      ];

      if (this.model) {
        args.push("--model", this.model);
      }

      if (this.maxBudgetUsd > 0) {
        args.push("--max-budget-usd", String(this.maxBudgetUsd));
      }

      const childEnv = { ...process.env };
      // Ensure Anthropic key is used, not Codex
      delete childEnv.OPENAI_API_KEY;

      const isWindows = process.platform === "win32";
      if (isWindows && /\.cmd$/i.test(this.executable)) {
        this.process = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", this.executable, ...args], {
          windowsHide: true,
          cwd: this.workingDir,
          env: childEnv,
          stdio: ["pipe", "pipe", "pipe"]
        });
      } else {
        this.process = spawn(this.executable, args, {
          windowsHide: true,
          cwd: this.workingDir,
          env: childEnv,
          stdio: ["pipe", "pipe", "pipe"]
        });
      }

      this.pid = this.process.pid || 0;
      this.status = "running";

      // Send system prompt as first input
      if (this.process.stdin && typeof this.process.stdin.write === "function") {
        this.process.stdin.write(`${this.systemPrompt}\n`);
      }

      this.process.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        this.lastOutput = text.slice(-500);
        this.lastOutputAt = new Date().toISOString();
        this.emit("output", { laneId: this.laneId, text });
      });

      this.process.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        this.emit("stderr", { laneId: this.laneId, text });
      });

      this.process.on("error", (error) => {
        this.lastError = String(error.message || error).slice(0, 500);
        this.status = "crashed";
        this.stoppedAt = new Date().toISOString();
        this.pid = 0;
        this.emit("error", { laneId: this.laneId, error: this.lastError });
        this._maybeAutoRestart();
      });

      this.process.on("close", (code, signal) => {
        if (this.status === "stopping") {
          this.status = "stopped";
        } else if (code !== 0) {
          this.status = "crashed";
          this.lastError = `Exited with code ${code} signal ${signal || "none"}`;
        } else {
          this.status = "stopped";
        }
        this.stoppedAt = new Date().toISOString();
        this.pid = 0;
        this.process = null;
        this.emit("exit", { laneId: this.laneId, code, signal });
        if (this.status === "crashed") {
          this._maybeAutoRestart();
        }
      });

      this.emit("started", { laneId: this.laneId, pid: this.pid });
      return { ok: true, pid: this.pid };
    } catch (error) {
      this.status = "crashed";
      this.lastError = String(error.message || error).slice(0, 500);
      this.stoppedAt = new Date().toISOString();
      this.emit("error", { laneId: this.laneId, error: this.lastError });
      return { ok: false, error: this.lastError };
    }
  }

  stop() {
    if (this._restartTimer) {
      clearTimeout(this._restartTimer);
      this._restartTimer = null;
    }

    if (!this.process) {
      this.status = "stopped";
      return { ok: true, alreadyStopped: true };
    }

    this.status = "stopping";
    try {
      if (this.process.stdin && typeof this.process.stdin.end === "function") {
        this.process.stdin.end();
      }
      this.process.kill("SIGTERM");
      // Force kill after 5 seconds
      const forceKillTimer = setTimeout(() => {
        try {
          if (this.process) {
            this.process.kill("SIGKILL");
          }
        } catch (_e) {
          // already dead
        }
      }, 5000);
      if (forceKillTimer && typeof forceKillTimer.unref === "function") {
        forceKillTimer.unref();
      }
    } catch (error) {
      this.lastError = String(error.message || error).slice(0, 500);
    }

    return { ok: true };
  }

  sendPrompt(text) {
    if (this.status !== "running" || !this.process || !this.process.stdin) {
      return { ok: false, error: "agent_not_running" };
    }

    const cleanText = String(text || "").trim();
    if (!cleanText) {
      return { ok: false, error: "empty_prompt" };
    }

    try {
      this.process.stdin.write(`${cleanText}\n`);
      this.promptCount += 1;
      return { ok: true, promptCount: this.promptCount };
    } catch (error) {
      this.lastError = String(error.message || error).slice(0, 500);
      return { ok: false, error: this.lastError };
    }
  }

  _maybeAutoRestart() {
    if (!this.autoRestart) return;

    const now = Date.now();
    if (now - this.restartWindowStart > RESTART_WINDOW_MS) {
      this.restartAttempts = 0;
      this.restartWindowStart = now;
    }

    if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
      this.autoRestart = false;
      this.emit("restart_exhausted", { laneId: this.laneId, attempts: this.restartAttempts });
      return;
    }

    this.restartAttempts += 1;
    const delay = RESTART_DELAY_MS * this.restartAttempts;
    this._restartTimer = setTimeout(() => {
      this._restartTimer = null;
      if (this.status === "crashed" || this.status === "stopped") {
        this.emit("restarting", { laneId: this.laneId, attempt: this.restartAttempts });
        this.start();
      }
    }, delay);

    if (this._restartTimer && typeof this._restartTimer.unref === "function") {
      this._restartTimer.unref();
    }
  }
}

class Omnispindle extends EventEmitter {
  constructor(options = {}) {
    super();
    this.agents = new Map();
    this.executable = String(options.executable || "claude").trim();
    this.model = String(options.model || "").trim();
    this.workingDir = String(options.workingDir || process.cwd()).trim();
    this.maxBudgetUsd = Number(options.maxBudgetUsd) || 0;
    this.autoRestart = Boolean(options.autoRestart !== false);
    this.startedAt = "";
    this.status = "idle"; // idle | running | stopped
    this._healthTimer = null;
  }

  /**
   * Start all lane agents.
   */
  startAll(laneIds = null) {
    const lanes = laneIds || VALID_LANE_IDS;
    const results = {};

    for (const laneId of lanes) {
      if (!LANE_DEFINITIONS[laneId]) {
        results[laneId] = { ok: false, error: "unknown_lane" };
        continue;
      }
      if (this.agents.size >= MAX_AGENTS) {
        results[laneId] = { ok: false, error: "max_agents_reached" };
        continue;
      }
      results[laneId] = this.startAgent(laneId);
    }

    this.status = "running";
    this.startedAt = new Date().toISOString();
    this._startHealthCheck();

    return {
      ok: true,
      startedAt: this.startedAt,
      agents: results
    };
  }

  /**
   * Start a single lane agent.
   */
  startAgent(laneId) {
    if (this.agents.has(laneId)) {
      const existing = this.agents.get(laneId);
      if (existing.status === "running" || existing.status === "starting") {
        return { ok: false, error: "already_running", status: existing.status };
      }
      existing.stop();
    }

    const agent = new OmnispindleAgent(laneId, {
      executable: this.executable,
      model: this.model,
      workingDir: this.workingDir,
      maxBudgetUsd: this.maxBudgetUsd,
      autoRestart: this.autoRestart
    });

    // Relay events
    agent.on("output", (data) => this.emit("agent_output", data));
    agent.on("stderr", (data) => this.emit("agent_stderr", data));
    agent.on("error", (data) => this.emit("agent_error", data));
    agent.on("exit", (data) => this.emit("agent_exit", data));
    agent.on("started", (data) => this.emit("agent_started", data));
    agent.on("restarting", (data) => this.emit("agent_restarting", data));
    agent.on("restart_exhausted", (data) => this.emit("agent_restart_exhausted", data));

    this.agents.set(laneId, agent);
    return agent.start();
  }

  /**
   * Stop a single lane agent.
   */
  stopAgent(laneId) {
    const agent = this.agents.get(laneId);
    if (!agent) {
      return { ok: false, error: "agent_not_found" };
    }
    return agent.stop();
  }

  /**
   * Stop all agents.
   */
  stopAll() {
    const results = {};
    for (const [laneId, agent] of this.agents) {
      results[laneId] = agent.stop();
    }

    this._stopHealthCheck();
    this.status = "stopped";

    return {
      ok: true,
      stoppedAt: new Date().toISOString(),
      agents: results
    };
  }

  /**
   * Send a prompt to a specific lane agent.
   */
  sendPrompt(laneId, text) {
    const agent = this.agents.get(laneId);
    if (!agent) {
      return { ok: false, error: "agent_not_found" };
    }
    return agent.sendPrompt(text);
  }

  /**
   * Broadcast a prompt to all running agents.
   */
  broadcast(text) {
    const results = {};
    for (const [laneId, agent] of this.agents) {
      if (agent.status === "running") {
        results[laneId] = agent.sendPrompt(text);
      }
    }
    return { ok: true, results };
  }

  /**
   * Get status summary.
   */
  getStatus() {
    const agents = {};
    for (const [laneId, agent] of this.agents) {
      agents[laneId] = agent.toJSON();
    }

    const running = Array.from(this.agents.values()).filter((a) => a.status === "running").length;
    const total = this.agents.size;

    return {
      status: this.status,
      startedAt: this.startedAt,
      provider: "anthropic",
      executable: this.executable,
      model: this.model,
      autoRestart: this.autoRestart,
      counts: {
        total,
        running,
        idle: total - running,
        lanes: VALID_LANE_IDS.length
      },
      agents
    };
  }

  _startHealthCheck() {
    this._stopHealthCheck();
    this._healthTimer = setInterval(() => {
      for (const [laneId, agent] of this.agents) {
        if (agent.status === "running" && agent.process && agent.process.exitCode !== null) {
          agent.status = "crashed";
          agent.lastError = `Process exited unexpectedly (exitCode=${agent.process.exitCode})`;
          agent.stoppedAt = new Date().toISOString();
          agent.pid = 0;
          agent.process = null;
          agent._maybeAutoRestart();
        }
      }
      this.emit("health_check", this.getStatus());
    }, HEALTH_CHECK_INTERVAL_MS);

    if (this._healthTimer && typeof this._healthTimer.unref === "function") {
      this._healthTimer.unref();
    }
  }

  _stopHealthCheck() {
    if (this._healthTimer) {
      clearInterval(this._healthTimer);
      this._healthTimer = null;
    }
  }
}

// Singleton instance
let _instance = null;

function getOmnispindle(options = {}) {
  if (!_instance) {
    _instance = new Omnispindle(options);
  }
  return _instance;
}

function resetOmnispindle() {
  if (_instance) {
    _instance.stopAll();
    _instance = null;
  }
}

module.exports = {
  Omnispindle,
  OmnispindleAgent,
  getOmnispindle,
  resetOmnispindle,
  LANE_DEFINITIONS,
  VALID_LANE_IDS,
  MAX_AGENTS
};
