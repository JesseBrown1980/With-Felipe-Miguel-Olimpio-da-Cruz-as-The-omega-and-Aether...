/**
 * Phone Construction Bridge — Integrates phones as construction workers
 *
 * Falcon (Jesse's phone) and Felipe's phone become agents that can be
 * dispatched to constructions. Their CPU, sensors, and edge capabilities
 * contribute to the simulation as mobile construction workers.
 *
 * This bridge:
 * 1. Registers phone agents as construction-aware workers
 * 2. Routes phone-initiated messages to the construction pipeline
 * 3. Dispatches construction tasks to phones for edge processing
 * 4. Feeds phone activity into GNN tracer observations
 */

const EventEmitter = require("events");
const { appendGraphEvent } = require("./graphRuntimeStore");

const phoneEmitter = new EventEmitter();
phoneEmitter.setMaxListeners(16);

// ── Phone Agent Registry ──

const PHONE_AGENTS = Object.freeze({
  falcon: {
    id: "phone:falcon",
    label: "Falcon (Jesse)",
    owner: "jesse",
    deviceId: "R5CXA4MGQXV",
    role: "mobile_construction_worker",
    capabilities: ["screen_capture", "browser_history", "whatsapp", "adb_control", "ui_automation", "developer_options", "termux", "termux_api", "edge_compute"],
    omnispindleLane: "falcon",
    constructionAffinity: ["qdd-ez-protect", "qdd-scheduler-fixes"] // default preferred constructions
  },
  felipe: {
    id: "phone:felipe",
    label: "Felipe (Phone)",
    owner: "felipe",
    deviceId: null, // discovered dynamically
    role: "mobile_construction_worker",
    capabilities: ["termux", "termux_api", "f_droid", "edge_compute"],
    omnispindleLane: null, // no dedicated omnispindle lane yet
    constructionAffinity: ["qdd-queue-server", "qdd-pq-bid"]
  }
});

// ── Phone Construction Worker ──

class PhoneConstructionWorker {
  constructor(phoneSpec) {
    this.id = phoneSpec.id;
    this.label = phoneSpec.label;
    this.owner = phoneSpec.owner;
    this.deviceId = phoneSpec.deviceId;
    this.role = phoneSpec.role;
    this.capabilities = phoneSpec.capabilities || [];
    this.omnispindleLane = phoneSpec.omnispindleLane;
    this.constructionAffinity = phoneSpec.constructionAffinity || [];

    // Worker state
    this.status = "idle"; // idle | dispatched | working | returning | offline
    this.currentConstructionId = null;
    this.taskCount = 0;
    this.lastTaskAt = "";
    this.lastSeenAt = "";
    this.edgeComputeResults = [];
    this.maxResults = 20;
  }

  /**
   * Dispatch this phone worker to a construction.
   */
  dispatchToConstruction(constructionId, task) {
    this.currentConstructionId = constructionId;
    this.status = "dispatched";
    this.taskCount += 1;
    this.lastTaskAt = new Date().toISOString();

    phoneEmitter.emit("phone_dispatched", {
      phoneId: this.id,
      constructionId,
      task: String(task || "").slice(0, 500)
    });

    appendGraphEvent({
      component: "phone-construction-bridge",
      category: "phone_construction",
      action: "phone_dispatched_to_construction",
      actor: { type: "phone_agent", id: this.id, label: this.label, domain: "phone" },
      target: { type: "construction", id: constructionId, domain: "simulation" },
      context: {
        owner: this.owner,
        capabilities: this.capabilities.join(","),
        taskCount: String(this.taskCount)
      }
    });

    return {
      ok: true,
      phoneId: this.id,
      constructionId,
      status: this.status
    };
  }

  /**
   * Report results from edge processing.
   */
  reportResults(results = {}) {
    const entry = {
      at: new Date().toISOString(),
      constructionId: this.currentConstructionId,
      summary: String(results.summary || "").slice(0, 500),
      data: results.data || null,
      success: Boolean(results.success !== false)
    };

    this.edgeComputeResults.push(entry);
    if (this.edgeComputeResults.length > this.maxResults) {
      this.edgeComputeResults = this.edgeComputeResults.slice(-this.maxResults);
    }

    this.status = "returning";
    this.lastSeenAt = entry.at;

    phoneEmitter.emit("phone_results", {
      phoneId: this.id,
      constructionId: this.currentConstructionId,
      results: entry
    });

    return entry;
  }

  /**
   * Return to idle state after completing construction work.
   */
  returnToIdle() {
    const prevConstruction = this.currentConstructionId;
    this.currentConstructionId = null;
    this.status = "idle";

    phoneEmitter.emit("phone_returned", {
      phoneId: this.id,
      fromConstruction: prevConstruction
    });
  }

  /**
   * Check if this phone has affinity for a construction.
   */
  hasAffinityFor(constructionId) {
    return this.constructionAffinity.includes(constructionId);
  }

  toJSON() {
    const latestResult = this.edgeComputeResults.length > 0
      ? this.edgeComputeResults[this.edgeComputeResults.length - 1]
      : null;
    return {
      id: this.id,
      label: this.label,
      owner: this.owner,
      deviceId: this.deviceId,
      role: this.role,
      capabilities: this.capabilities,
      omnispindleLane: this.omnispindleLane,
      constructionAffinity: this.constructionAffinity,
      status: this.status,
      currentConstructionId: this.currentConstructionId,
      taskCount: this.taskCount,
      lastTaskAt: this.lastTaskAt,
      lastSeenAt: this.lastSeenAt,
      edgeComputeResultCount: this.edgeComputeResults.length,
      latestEdgeComputeAt: latestResult?.at || "",
      latestEdgeComputeSummary: latestResult?.summary || "",
      latestEdgeComputeSuccess: latestResult ? Boolean(latestResult.success) : null
    };
  }
}

// ── Phone Worker Registry ──

const _phoneWorkers = new Map();

function initializePhoneWorkers() {
  for (const spec of Object.values(PHONE_AGENTS)) {
    if (!_phoneWorkers.has(spec.id)) {
      _phoneWorkers.set(spec.id, new PhoneConstructionWorker(spec));
    }
  }
}

function resetPhoneWorkers() {
  _phoneWorkers.clear();
}

function getPhoneWorker(phoneId) {
  return _phoneWorkers.get(phoneId) || null;
}

function getAllPhoneWorkers() {
  return Array.from(_phoneWorkers.values());
}

/**
 * Find the best available phone worker for a construction.
 */
function findBestPhoneWorker(constructionId) {
  // Prefer phones with affinity that are idle
  let best = null;
  for (const worker of _phoneWorkers.values()) {
    if (worker.status !== "idle") continue;
    if (worker.hasAffinityFor(constructionId)) {
      return worker; // Perfect match
    }
    if (!best) best = worker; // First idle fallback
  }
  return best;
}

/**
 * Dispatch a phone to a construction for edge processing.
 */
function dispatchPhoneToConstruction(phoneId, constructionId, task) {
  const worker = _phoneWorkers.get(phoneId);
  if (!worker) return { ok: false, error: "phone_not_found" };
  if (worker.status !== "idle") return { ok: false, error: "phone_busy", status: worker.status };
  return worker.dispatchToConstruction(constructionId, task);
}

/**
 * Build civilization entities for phone construction workers.
 */
function buildPhoneConstructionEntities() {
  const entities = [];
  const routes = [];

  for (const worker of _phoneWorkers.values()) {
    const isActive = worker.status !== "idle" && worker.status !== "offline";

    entities.push({
      id: worker.id,
      label: worker.label,
      kind: "agent",
      subtype: "mobile_construction_worker",
      district: "colony",
      status: worker.status,
      online: worker.status !== "offline",
      hot: isActive,
      trusted: true,
      owned: true,
      icon: worker.owner === "jesse" ? "F" : "FP",
      summary: `${worker.label} — mobile construction worker with ${worker.capabilities.length} capabilities.`,
      provider: "phone",
      sourceRef: worker.deviceId || "",
      motion: isActive ? "moving" : "resting",
      securityState: "normal",
      risk: { score: 0, level: "low" },
      meta: {
        owner: worker.owner,
        capabilities: worker.capabilities,
        taskCount: worker.taskCount,
        omnispindleLane: worker.omnispindleLane
      }
    });

    // Route phone to its current construction
    if (worker.currentConstructionId) {
      routes.push({
        source: worker.id,
        target: `construction:${worker.currentConstructionId}`,
        kind: "phone_construction_dispatch",
        status: "active",
        traffic: 3,
        lastSeenAt: worker.lastTaskAt || new Date().toISOString(),
        notes: `${worker.label} dispatched to ${worker.currentConstructionId}.`
      });
    }

    // Route phone to its affiliated constructions (ambient connections)
    for (const affinity of worker.constructionAffinity) {
      if (affinity === worker.currentConstructionId) continue; // already have active route
      routes.push({
        source: worker.id,
        target: `construction:${affinity}`,
        kind: "phone_construction_affinity",
        status: "ambient",
        traffic: 1,
        notes: `${worker.label} has affinity for ${affinity}.`
      });
    }
  }

  return { entities, routes };
}

function getPhoneBridgeStatus() {
  return {
    phoneWorkers: getAllPhoneWorkers().map(w => w.toJSON()),
    activeDispatches: getAllPhoneWorkers().filter(w => w.status !== "idle" && w.status !== "offline").length,
    totalWorkers: _phoneWorkers.size
  };
}

module.exports = {
  PhoneConstructionWorker,
  phoneEmitter,
  initializePhoneWorkers,
  resetPhoneWorkers,
  getPhoneWorker,
  getAllPhoneWorkers,
  findBestPhoneWorker,
  dispatchPhoneToConstruction,
  buildPhoneConstructionEntities,
  getPhoneBridgeStatus,
  PHONE_AGENTS
};
