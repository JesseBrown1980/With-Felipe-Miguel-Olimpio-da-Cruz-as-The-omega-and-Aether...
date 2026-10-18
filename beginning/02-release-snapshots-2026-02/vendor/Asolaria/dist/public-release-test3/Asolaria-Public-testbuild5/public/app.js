const healthBadge = document.getElementById("healthBadge");
const messages = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatImages = document.getElementById("chatImages");
const chatImageStatus = document.getElementById("chatImageStatus");
const chatFiles = document.getElementById("chatFiles");
const chatFileStatus = document.getElementById("chatFileStatus");
const eventLog = document.getElementById("eventLog");
const shotOutput = document.getElementById("shotOutput");
const stealthToggle = document.getElementById("stealthToggle");
const stealthLabel = document.getElementById("stealthLabel");
const stealthHint = document.getElementById("stealthHint");
const approvalModeSelect = document.getElementById("approvalMode");
const costModeSelect = document.getElementById("costMode");
const codexWebSearchSelect = document.getElementById("codexWebSearch");
const openclawModeSelect = document.getElementById("openclawMode");
const memoryStats = document.getElementById("memoryStats");
const memoryPreview = document.getElementById("memoryPreview");
const memoryWindowTurnsInput = document.getElementById("memoryWindowTurns");
const saveMemoryWindowBtn = document.getElementById("saveMemoryWindowBtn");
const refreshMemoryBtn = document.getElementById("refreshMemoryBtn");
const clearMemoryBtn = document.getElementById("clearMemoryBtn");
const taskLedgerStats = document.getElementById("taskLedgerStats");
const taskLedgerTitle = document.getElementById("taskLedgerTitle");
const taskLedgerDescription = document.getElementById("taskLedgerDescription");
const taskLedgerCreatePriority = document.getElementById("taskLedgerCreatePriority");
const taskLedgerStatusFilter = document.getElementById("taskLedgerStatusFilter");
const taskLedgerPriorityFilter = document.getElementById("taskLedgerPriorityFilter");
const taskLedgerQuery = document.getElementById("taskLedgerQuery");
const taskLedgerIncludeArchived = document.getElementById("taskLedgerIncludeArchived");
const taskLedgerRefreshBtn = document.getElementById("taskLedgerRefreshBtn");
const taskLedgerAddBtn = document.getElementById("taskLedgerAddBtn");
const taskLedgerList = document.getElementById("taskLedgerList");
const taskLedgerEvents = document.getElementById("taskLedgerEvents");
const skillsRefreshBtn = document.getElementById("skillsRefreshBtn");
const skillsReloadBtn = document.getElementById("skillsReloadBtn");
const skillsRunForm = document.getElementById("skillsRunForm");
const skillsSelect = document.getElementById("skillsSelect");
const skillsInput = document.getElementById("skillsInput");
const skillsOutput = document.getElementById("skillsOutput");
const openclawCard = document.getElementById("openclawCard");
const openclawOutput = document.getElementById("openclawOutput");
const openclawCronRunForm = document.getElementById("openclawCronRunForm");
const openclawCronName = document.getElementById("openclawCronName");
const antigravityStatusBtn = document.getElementById("antigravityStatusBtn");
const cursorStatusBtn = document.getElementById("cursorStatusBtn");
const externalRunForm = document.getElementById("externalRunForm");
const externalProviderSelect = document.getElementById("externalProviderSelect");
const externalPrompt = document.getElementById("externalPrompt");
const externalOutput = document.getElementById("externalOutput");
const allowExternalPostingToggle = document.getElementById("allowExternalPosting");
const moltbookMissionBtn = document.getElementById("moltbookMissionBtn");
const moltbookDraftBtn = document.getElementById("moltbookDraftBtn");
const moltbookDecideBtn = document.getElementById("moltbookDecideBtn");
const moltbookHint = document.getElementById("moltbookHint");
const moltbookCreateAccountBtn = document.getElementById("moltbookCreateAccountBtn");
const moltbookShowAccountBtn = document.getElementById("moltbookShowAccountBtn");
const moltbookRevealAccountBtn = document.getElementById("moltbookRevealAccountBtn");
const moltbookMarkRegisteredBtn = document.getElementById("moltbookMarkRegisteredBtn");
const moltbookOpenSiteBtn = document.getElementById("moltbookOpenSiteBtn");
const moltbookAccountOutput = document.getElementById("moltbookAccountOutput");
const guardianModeSelect = document.getElementById("guardianMode");
const saveGuardianModeBtn = document.getElementById("saveGuardianModeBtn");
const guardianRiskThresholdSelect = document.getElementById("guardianRiskThreshold");
const saveGuardianThresholdBtn = document.getElementById("saveGuardianThresholdBtn");
const guardianAlertsEnabledToggle = document.getElementById("guardianAlertsEnabled");
const guardianAutoBlockCriticalToggle = document.getElementById("guardianAutoBlockCritical");
const guardianStatusBtn = document.getElementById("guardianStatusBtn");
const guardianBootstrapContactsBtn = document.getElementById("guardianBootstrapContactsBtn");
const guardianTestAlertBtn = document.getElementById("guardianTestAlertBtn");
const guardianOutput = document.getElementById("guardianOutput");

let stealthMode = true;
let approvalMode = "smart";
let memoryWindowTurns = 12;
let costMode = "low";
let codexWebSearch = false;
let openclawMode = "read_only";
let allowExternalPosting = false;
let guardianMode = "autonomous";
let guardianRiskThreshold = "high";
let guardianAlertsEnabled = true;
let guardianAutoBlockCritical = false;

function logEvent(text) {
  const row = document.createElement("div");
  row.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  eventLog.prepend(row);
}

function createMessage(role, text, meta) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;

  const head = document.createElement("div");
  head.className = "meta";
  head.textContent = meta;

  const body = document.createElement("div");
  body.textContent = text;

  wrap.appendChild(head);
  wrap.appendChild(body);
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
  return { wrap, head, body };
}

function pushMessage(role, text, meta) {
  createMessage(role, text, meta);
}

function updateMessageBody(messageRef, text, meta) {
  messageRef.body.textContent = text;
  if (meta) {
    messageRef.head.textContent = meta;
  }
}

async function request(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

async function apiPost(path, payload) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
}

async function apiDelete(path) {
  return request(path, {
    method: "DELETE"
  });
}

async function getJob(jobId) {
  const data = await request(`/api/jobs/${encodeURIComponent(jobId)}`);
  return data.job;
}

function applyStealthUi(enabled) {
  stealthMode = Boolean(enabled);
  document.body.classList.toggle("stealth-on", stealthMode);

  if (stealthToggle) {
    stealthToggle.checked = stealthMode;
  }

  if (stealthLabel) {
    stealthLabel.textContent = stealthMode ? "Stealth ON" : "Stealth OFF";
  }

  if (stealthHint) {
    stealthHint.textContent = stealthMode
      ? "Stealth Mode is ON. Visible launch actions are hidden."
      : "Stealth Mode is OFF. Visible launch actions are available.";
  }
}

function normalizeApprovalMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "manual" || normalized === "deny") {
    return normalized;
  }
  return "smart";
}

function normalizeCostMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "balanced" || normalized === "quality") {
    return normalized;
  }
  return "low";
}

function normalizeCodexWebSearch(value) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "on" || normalized === "enabled" || normalized === "1";
}

function normalizeOpenclawMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "governed" || normalized === "disabled") {
    return normalized;
  }
  return "read_only";
}

function normalizeGuardianMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "off" || normalized === "notify" || normalized === "strict") {
    return normalized;
  }
  return "autonomous";
}

function normalizeGuardianRiskThreshold(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "critical") {
    return normalized;
  }
  return "high";
}

function normalizeMemoryWindow(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return memoryWindowTurns;
  }
  return Math.max(4, Math.min(40, Math.round(parsed)));
}

function applyOpenclawUi(mode) {
  const disabled = String(mode || "").toLowerCase() === "disabled";
  if (openclawCard) {
    openclawCard.style.display = disabled ? "none" : "";
  }
}

function applySettingsUi(settings = {}) {
  applyStealthUi(Boolean(settings.stealthMode));

  approvalMode = normalizeApprovalMode(settings.approvalMode || approvalMode);
  if (approvalModeSelect) {
    approvalModeSelect.value = approvalMode;
  }

  costMode = normalizeCostMode(settings.costMode || costMode);
  if (costModeSelect) {
    costModeSelect.value = costMode;
  }

  codexWebSearch = normalizeCodexWebSearch(settings.codexWebSearch ?? codexWebSearch);
  if (codexWebSearchSelect) {
    codexWebSearchSelect.value = codexWebSearch ? "on" : "off";
  }

  openclawMode = normalizeOpenclawMode(settings.openclawMode || openclawMode);
  if (openclawModeSelect) {
    openclawModeSelect.value = openclawMode;
  }
  applyOpenclawUi(openclawMode);

  allowExternalPosting = Boolean(settings.allowExternalPosting);
  if (allowExternalPostingToggle) {
    allowExternalPostingToggle.checked = allowExternalPosting;
  }
  if (moltbookHint) {
    moltbookHint.textContent = allowExternalPosting
      ? "External posting is ENABLED. Use with caution."
      : "External posting is DISABLED (recommended).";
  }

  guardianMode = normalizeGuardianMode(settings.guardianMode || guardianMode);
  if (guardianModeSelect) {
    guardianModeSelect.value = guardianMode;
  }

  guardianRiskThreshold = normalizeGuardianRiskThreshold(settings.guardianRiskThreshold || guardianRiskThreshold);
  if (guardianRiskThresholdSelect) {
    guardianRiskThresholdSelect.value = guardianRiskThreshold;
  }

  guardianAlertsEnabled = Boolean(settings.guardianAlertsEnabled ?? guardianAlertsEnabled);
  if (guardianAlertsEnabledToggle) {
    guardianAlertsEnabledToggle.checked = guardianAlertsEnabled;
  }

  guardianAutoBlockCritical = Boolean(settings.guardianAutoBlockCritical ?? guardianAutoBlockCritical);
  if (guardianAutoBlockCriticalToggle) {
    guardianAutoBlockCriticalToggle.checked = guardianAutoBlockCritical;
  }

  if (guardianOutput) {
    guardianOutput.textContent = `Mode=${guardianMode}, threshold=${guardianRiskThreshold}, alerts=${guardianAlertsEnabled ? "on" : "off"}, autoBlockCritical=${guardianAutoBlockCritical ? "on" : "off"}`;
  }

  memoryWindowTurns = normalizeMemoryWindow(settings.memoryWindowTurns ?? memoryWindowTurns);
  if (memoryWindowTurnsInput) {
    memoryWindowTurnsInput.value = String(memoryWindowTurns);
  }
}

function formatJobResult(job) {
  if (!job) return "No job data returned.";

  if (job.type === "brain") {
    const lines = [String(job.result?.reply || "Brain task completed with no reply.")];
    if (job.result?.provider) {
      lines.push(`Provider: ${job.result.provider}`);
    }

    if (Array.isArray(job.result?.imagesUsed) && job.result.imagesUsed.length > 0) {
      lines.push(`Images used: ${job.result.imagesUsed.map((item) => String(item).split(/[\\/]/).pop()).join(", ")}`);
    }

    if (Array.isArray(job.result?.approvals) && job.result.approvals.length > 0) {
      const approvalLines = job.result.approvals.map((entry) => {
        return `- ${entry.choice.toUpperCase()} (${entry.reason})`;
      });
      lines.push(`Approval choices:\n${approvalLines.join("\n")}`);
    }

    return lines.join("\n\n");
  }

  if (job.type === "screenshot") {
    return `Screenshot saved to: ${job.result?.outputPath || "unknown path"}`;
  }

  if (job.type === "pad_run") {
    const code = job.result?.exitCode;
    return `PAD run finished${Number.isFinite(code) ? ` with exit code ${code}` : ""}.`;
  }

  if (job.type === "openclaw_read" || job.type === "openclaw_control") {
    const lines = [];
    if (job.result?.action) lines.push(`Action: ${job.result.action}`);
    if (job.result?.mode) lines.push(`Mode: ${job.result.mode}`);
    if (job.result?.caution) lines.push(`Safety: ${job.result.caution}`);

    if (job.result?.parsed) {
      lines.push(JSON.stringify(job.result.parsed, null, 2));
    } else if (job.result?.stdout) {
      lines.push(String(job.result.stdout));
    } else {
      lines.push("No output returned.");
    }

    return lines.join("\n\n");
  }

  if (job.type === "external_brain") {
    const lines = [];
    if (job.result?.provider) lines.push(`Provider: ${job.result.provider}`);
    if (job.result?.reply) lines.push(String(job.result.reply));
    if (!job.result?.reply && job.result?.raw) {
      lines.push(JSON.stringify(job.result.raw, null, 2));
    }
    return lines.join("\n\n") || "External provider finished with no reply.";
  }

  if (job.type === "notebooklm_ask") {
    const lines = [];
    if (job.result?.accountUsed) {
      lines.push(`Account: ${job.result.accountUsed}`);
    }
    if (job.result?.provider) {
      lines.push(`Provider: ${job.result.provider}${job.result?.model ? ` (${job.result.model})` : ""}`);
    }
    if (job.result?.noteId) {
      lines.push(`Saved note: ${job.result.noteId}`);
    }
    if (Array.isArray(job.result?.warnings) && job.result.warnings.length > 0) {
      lines.push(`Warnings:\n${job.result.warnings.map((w) => `- ${w}`).join("\n")}`);
    }
    if (job.result?.reply) {
      lines.push(String(job.result.reply));
    }
    return lines.join("\n\n") || "NotebookLM ask finished with no reply.";
  }

  return JSON.stringify(job.result || {}, null, 2);
}

function trackJob(jobId, handlers = {}) {
  const started = Date.now();
  const timeoutMs = 10 * 60 * 1000;

  async function tick() {
    try {
      const job = await getJob(jobId);
      if (handlers.onUpdate) {
        handlers.onUpdate(job);
      }

      if (job.status === "completed") {
        if (handlers.onCompleted) {
          handlers.onCompleted(job);
        }
        return;
      }

      if (job.status === "failed") {
        if (handlers.onFailed) {
          handlers.onFailed(job);
        }
        return;
      }

      if (Date.now() - started > timeoutMs) {
        if (handlers.onFailed) {
          handlers.onFailed({
            status: "failed",
            error: "Timed out while waiting for job completion."
          });
        }
        return;
      }

      setTimeout(tick, 800);
    } catch (error) {
      if (handlers.onFailed) {
        handlers.onFailed({
          status: "failed",
          error: error.message
        });
      }
    }
  }

  setTimeout(tick, 500);
}

function setChatImageStatus() {
  if (!chatImageStatus) return;

  const files = Array.from(chatImages?.files || []);
  if (files.length === 0) {
    chatImageStatus.textContent = "No images selected.";
    return;
  }

  chatImageStatus.textContent = `${files.length} image(s): ${files.map((file) => file.name).join(", ")}`;
}

function setChatFileStatus() {
  if (!chatFileStatus) return;

  const files = Array.from(chatFiles?.files || []);
  if (files.length === 0) {
    chatFileStatus.textContent = "No files selected.";
    return;
  }

  chatFileStatus.textContent = `${files.length} file(s): ${files.map((file) => file.name).join(", ")}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function uploadSelectedImages() {
  const files = Array.from(chatImages?.files || []);
  if (files.length === 0) {
    return [];
  }

  const uploadedPaths = [];
  for (const file of files.slice(0, 6)) {
    const dataUrl = await fileToDataUrl(file);
    const response = await apiPost("/api/uploads/image", {
      fileName: file.name,
      dataUrl
    });
    if (response.image?.path) {
      uploadedPaths.push(response.image.path);
    }
  }

  return uploadedPaths;
}

async function uploadSelectedFiles() {
  const files = Array.from(chatFiles?.files || []);
  if (files.length === 0) {
    return [];
  }

  const uploadedPaths = [];
  const maxBytes = 5 * 1024 * 1024;
  for (const file of files.slice(0, 6)) {
    if (Number(file.size || 0) > maxBytes) {
      logEvent(`Skipped ${file.name}: too large (${Math.ceil(file.size / 1024)} KB).`);
      continue;
    }
    const dataUrl = await fileToDataUrl(file);
    const response = await apiPost("/api/uploads/file", {
      fileName: file.name,
      dataUrl
    });
    if (response.file?.path) {
      uploadedPaths.push(response.file.path);
    }
  }

  return uploadedPaths;
}

async function refreshHealth() {
  try {
    const data = await request("/api/health");
    const codex = data.toolPaths.codexPath ? "Codex ready" : "Codex missing";
    const chrome = data.toolPaths.chromePath ? "Chrome ready" : "Chrome missing";
    const pad = data.toolPaths.padConsolePath ? "PAD ready" : "PAD missing";
    const openclaw = !data.toolPaths.openclawPath
      ? "OpenClaw missing"
      : openclawMode === "disabled"
        ? "OpenClaw disabled"
        : "OpenClaw ready";
    const externalProviders = Array.isArray(data.providers?.external) ? data.providers.external : [];
    const externalConfigured = externalProviders.filter((provider) => provider?.configured && provider?.enabled).length;
    const external = `ExtBrains:${externalConfigured}`;
    const queue = data.queue ? `Q:${data.queue.queued} R:${data.queue.running}` : "Q:0 R:0";
    const memory = data.memory ? `M:${data.memory.totalTurns}` : "M:0";
    const tasks = data.taskLedger ? `T:${data.taskLedger.openTasks || 0}/${data.taskLedger.totalTasks || 0}` : "T:0/0";
    const approvals = data.approvals ? `P:${data.approvals.persistentPrefixes}` : "P:0";
    const vault = data.vault ? `V:${data.vault.entriesCount}` : "V:0";
    const guardian = data.guardian
      ? `G:${data.guardian.mode}/${data.guardian.riskThreshold}/A${data.guardian.alertsEnabled ? "1" : "0"}`
      : "G:n/a";
    const settings = data.settings || {};
    applySettingsUi(settings);
    healthBadge.textContent = `${codex} | ${openclaw} | ${external} | ${chrome} | ${pad} | Stealth:${stealthMode ? "ON" : "OFF"} | A:${approvalMode} | C:${costMode} | WS:${codexWebSearch ? "ON" : "OFF"} | O:${openclawMode} | ${guardian} | W:${memoryWindowTurns} | ${queue} | ${memory} | ${tasks} | ${approvals} | ${vault}`;
  } catch (_error) {
    healthBadge.textContent = "Health check unavailable";
  }
}

async function refreshSkillsList() {
  if (!skillsSelect || !skillsOutput) {
    return;
  }

  try {
    const data = await request("/api/skills");
    const skills = Array.isArray(data.skills) ? data.skills : [];
    skillsSelect.innerHTML = "";

    if (skills.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No skills loaded";
      skillsSelect.appendChild(option);
      skillsOutput.textContent = "No skills found.";
      return;
    }

    for (const skill of skills) {
      const id = String(skill.id || "");
      if (!id) continue;
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${id}${skill.title ? ` - ${skill.title}` : ""}`;
      skillsSelect.appendChild(option);
    }

    skillsOutput.textContent = `Loaded ${skills.length} skill(s).`;
  } catch (error) {
    skillsOutput.textContent = `Skills unavailable: ${error.message}`;
  }
}

async function reloadSkillsRegistry() {
  if (!skillsOutput) return;
  try {
    const data = await apiPost("/api/skills/reload", {});
    const errors = Array.isArray(data.errors) ? data.errors.length : Number(data.errors || 0);
    skillsOutput.textContent = `Reloaded skills registry: ${data.total || 0} skill(s), errors: ${errors}.`;
    refreshSkillsList();
  } catch (error) {
    skillsOutput.textContent = `Reload failed: ${error.message}`;
  }
}

async function refreshMemory() {
  if (!memoryStats || !memoryPreview) {
    return;
  }

  try {
    const data = await request("/api/memory?limit=12");
    const memory = data.memory || {};
    memoryStats.textContent = `Turns: ${memory.totalTurns || 0} | Updated: ${memory.updatedAt ? new Date(memory.updatedAt).toLocaleTimeString() : "n/a"}`;

    memoryPreview.innerHTML = "";
    const turns = Array.isArray(memory.turns) ? memory.turns.slice().reverse() : [];
    if (turns.length === 0) {
      const row = document.createElement("div");
      row.textContent = "Memory is empty.";
      memoryPreview.appendChild(row);
      return;
    }

    for (const turn of turns) {
      const row = document.createElement("div");
      const prefix = `[${String(turn.role || "unknown").toUpperCase()}]`;
      const text = String(turn.text || "").replace(/\s+/g, " ").trim();
      const clipped = text.length > 120 ? `${text.slice(0, 117)}...` : text;
      const imageNote = Array.isArray(turn.images) && turn.images.length > 0
        ? ` (images: ${turn.images.length})`
        : "";
      const fileNote = Array.isArray(turn.files) && turn.files.length > 0
        ? ` (files: ${turn.files.length})`
        : "";
      row.textContent = `${prefix} ${clipped}${imageNote}${fileNote}`;
      memoryPreview.appendChild(row);
    }
  } catch (error) {
    memoryStats.textContent = `Memory unavailable: ${error.message}`;
  }
}

function formatLedgerStatus(value) {
  return String(value || "planned").replace(/_/g, " ");
}

function formatLedgerPriority(value) {
  return String(value || "normal").toLowerCase();
}

function renderTaskLedgerTasks(tasks = []) {
  if (!taskLedgerList) return;
  taskLedgerList.innerHTML = "";
  if (!Array.isArray(tasks) || tasks.length < 1) {
    const empty = document.createElement("div");
    empty.textContent = "No tasks match the current filter.";
    taskLedgerList.appendChild(empty);
    return;
  }

  for (const task of tasks) {
    const taskId = String(task.id || "");
    const node = document.createElement("div");
    node.className = "ledger-task";

    const head = document.createElement("div");
    head.className = "ledger-task-head";

    const title = document.createElement("div");
    title.className = "ledger-task-title";
    title.textContent = task.title || taskId || "Task";

    const meta = document.createElement("div");
    meta.className = "ledger-task-meta";
    const updatedAt = task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "n/a";
    meta.textContent = `${formatLedgerStatus(task.status)} | ${formatLedgerPriority(task.priority)} | ${Math.max(0, Math.min(100, Number(task.progress || 0)))}% | ${updatedAt}`;

    head.appendChild(title);
    head.appendChild(meta);
    node.appendChild(head);

    if (task.description) {
      const desc = document.createElement("div");
      desc.className = "ledger-task-desc";
      desc.textContent = String(task.description);
      node.appendChild(desc);
    }

    const actions = document.createElement("div");
    actions.className = "ledger-task-actions";
    const addAction = (action, label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.taskId = taskId;
      button.dataset.action = action;
      button.textContent = label;
      actions.appendChild(button);
    };

    if (!task.archived && task.status !== "in_progress") addAction("start", "Start");
    if (!task.archived && task.status !== "review") addAction("review", "Review");
    if (!task.archived && task.status !== "blocked") addAction("block", "Block");
    if (!task.archived && task.status !== "done") addAction("done", "Done");
    if (!task.archived) {
      addAction("archive", "Archive");
    } else {
      addAction("unarchive", "Unarchive");
    }
    addAction("note", "Add Note");

    node.appendChild(actions);
    taskLedgerList.appendChild(node);
  }
}

function renderTaskLedgerEvents(events = []) {
  if (!taskLedgerEvents) return;
  taskLedgerEvents.innerHTML = "";
  if (!Array.isArray(events) || events.length < 1) {
    const empty = document.createElement("div");
    empty.textContent = "No events yet.";
    taskLedgerEvents.appendChild(empty);
    return;
  }
  for (const event of events) {
    const row = document.createElement("div");
    const stamp = event.at ? new Date(event.at).toLocaleString() : "n/a";
    const actor = String(event.actor || "system");
    const type = String(event.type || "task_event");
    const note = String(event.note || "").replace(/\s+/g, " ").trim();
    const clipped = note.length > 140 ? `${note.slice(0, 137)}...` : note;
    row.textContent = `${stamp} | ${event.taskId || "-"} | ${type} | ${actor}${clipped ? ` | ${clipped}` : ""}`;
    taskLedgerEvents.appendChild(row);
  }
}

function buildTaskLedgerStateUrl() {
  const params = new URLSearchParams();
  params.set("taskLimit", "60");
  params.set("eventLimit", "24");
  params.set("taskStatus", String(taskLedgerStatusFilter?.value || "all"));
  params.set("taskPriority", String(taskLedgerPriorityFilter?.value || "all"));
  params.set("includeArchived", String(Boolean(taskLedgerIncludeArchived?.checked)));
  const q = String(taskLedgerQuery?.value || "").trim();
  if (q) {
    params.set("taskQuery", q);
  }
  return `/api/task-ledger/state?${params.toString()}`;
}

async function refreshTaskLedger(options = {}) {
  if (!taskLedgerStats || !taskLedgerList || !taskLedgerEvents) {
    return;
  }
  const silent = Boolean(options.silent);
  try {
    const data = await request(buildTaskLedgerStateUrl());
    const ledger = data.ledger || {};
    const summary = ledger.summary || {};
    taskLedgerStats.textContent = `Open: ${summary.openTasks || 0} | Total: ${summary.totalTasks || 0} | Archived: ${summary.archivedTasks || 0} | Events: ${summary.eventsCount || 0}`;
    renderTaskLedgerTasks(ledger.tasks || []);
    renderTaskLedgerEvents(ledger.events || []);
  } catch (error) {
    taskLedgerStats.textContent = `Task ledger unavailable: ${error.message}`;
    if (!silent) {
      logEvent(`Task ledger refresh failed: ${error.message}`);
    }
  }
}

async function setTaskLedgerTaskStatus(taskId, status, options = {}) {
  const id = String(taskId || "").trim();
  if (!id) return;
  await request(`/api/task-ledger/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      actor: "web-ui",
      source: "web-ui",
      note: options.note || ""
    })
  });
}

async function archiveTaskLedgerTask(taskId) {
  const id = String(taskId || "").trim();
  if (!id) return;
  await request(`/api/task-ledger/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

async function unarchiveTaskLedgerTask(taskId) {
  const id = String(taskId || "").trim();
  if (!id) return;
  await request(`/api/task-ledger/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      archived: false,
      status: "planned",
      actor: "web-ui",
      source: "web-ui",
      note: "Unarchived from web UI."
    })
  });
}

async function addTaskLedgerNote(taskId) {
  const id = String(taskId || "").trim();
  if (!id) return;
  const note = window.prompt("Task event note:");
  if (note === null) return;
  await request(`/api/task-ledger/tasks/${encodeURIComponent(id)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "task_note",
      note: String(note || "").trim() || "UI note",
      actor: "web-ui",
      source: "web-ui"
    })
  });
}

async function createTaskLedgerTaskFromUi() {
  const title = String(taskLedgerTitle?.value || "").trim();
  const description = String(taskLedgerDescription?.value || "").trim();
  if (!title && !description) {
    throw new Error("Task title or description is required.");
  }
  const priority = String(taskLedgerCreatePriority?.value || "normal");
  const data = await apiPost("/api/task-ledger/tasks", {
    title,
    description,
    priority,
    actor: "web-ui",
    source: "web-ui"
  });
  if (taskLedgerTitle) taskLedgerTitle.value = "";
  if (taskLedgerDescription) taskLedgerDescription.value = "";
  return data;
}

async function handleTaskLedgerAction(action, taskId) {
  const id = String(taskId || "").trim();
  if (!id) return;
  if (action === "start") {
    await setTaskLedgerTaskStatus(id, "in_progress", { note: "Moved to in_progress from web UI." });
  } else if (action === "review") {
    await setTaskLedgerTaskStatus(id, "review", { note: "Moved to review from web UI." });
  } else if (action === "block") {
    await setTaskLedgerTaskStatus(id, "blocked", { note: "Marked blocked from web UI." });
  } else if (action === "done") {
    await setTaskLedgerTaskStatus(id, "done", { note: "Marked done from web UI." });
  } else if (action === "archive") {
    await archiveTaskLedgerTask(id);
  } else if (action === "unarchive") {
    await unarchiveTaskLedgerTask(id);
  } else if (action === "note") {
    await addTaskLedgerNote(id);
  } else {
    throw new Error(`Unknown task action: ${action}`);
  }
}

async function queueChatCommand(command, sourceMeta = "Asolaria Router") {
  const data = await apiPost("/api/chat", { message: String(command || "").trim() });
  if (data.mode === "routed") {
    pushMessage("brain", String(data.reply || "Done."), sourceMeta);
    logEvent(`Command completed: ${command}`);
    refreshHealth();
    refreshMemory();
    return;
  }

  if (data.job?.id) {
    const messageRef = createMessage(
      "brain",
      `${data.reply}\nWaiting for job completion...`,
      `Asolaria Brain (${data.job.id})`
    );
    trackJob(data.job.id, {
      onUpdate: (job) => {
        updateMessageBody(
          messageRef,
          `Job ${job.id} status: ${job.status}...`,
          `Asolaria Brain (${job.id})`
        );
      },
      onCompleted: (job) => {
        updateMessageBody(
          messageRef,
          formatJobResult(job),
          `Asolaria Brain (${job.id}, ${job.elapsedMs || 0}ms)`
        );
        logEvent(`Command job completed: ${job.id}`);
        refreshHealth();
        refreshMemory();
      },
      onFailed: (job) => {
        updateMessageBody(
          messageRef,
          `Job failed: ${job.error || "Unknown error"}`,
          `Asolaria Brain (${job.id || "unknown"})`
        );
        logEvent(`Command job failed: ${job.error || "Unknown error"}`);
        refreshHealth();
        refreshMemory();
      }
    });
    return;
  }

  pushMessage("brain", String(data.reply || "Done."), sourceMeta);
  refreshHealth();
  refreshMemory();
}

async function queueOpenclawAction(action, payload = {}) {
  if (!openclawOutput) {
    return;
  }

  openclawOutput.textContent = `Queued ${action}...`;
  const data = await apiPost("/api/openclaw/action", { action, payload });
  const jobId = data.job?.id;
  if (!jobId) {
    openclawOutput.textContent = "OpenClaw action queued with no job id.";
    return;
  }

  logEvent(`OpenClaw action queued: ${action} (${jobId})`);
  openclawOutput.textContent = `Tracking OpenClaw job: ${jobId}`;
  trackJob(jobId, {
    onUpdate: (job) => {
      openclawOutput.textContent = `OpenClaw ${action}: ${job.status}`;
    },
    onCompleted: (job) => {
      openclawOutput.textContent = `Completed ${action}.`;
      pushMessage("brain", formatJobResult(job), `OpenClaw (${job.id})`);
      refreshHealth();
    },
    onFailed: (job) => {
      openclawOutput.textContent = `Failed ${action}: ${job.error || "Unknown error"}`;
      logEvent(`OpenClaw action failed: ${job.error || "Unknown error"}`);
      refreshHealth();
    }
  });
}

async function queueExternalProvider(provider, prompt) {
  if (!externalOutput) {
    return;
  }

  externalOutput.textContent = `Queued ${provider}...`;
  const data = await apiPost("/api/providers/external/run", { provider, prompt });
  const jobId = data.job?.id;
  if (!jobId) {
    externalOutput.textContent = "External provider queued with no job id.";
    return;
  }

  logEvent(`External provider queued: ${provider} (${jobId})`);
  externalOutput.textContent = `Tracking ${provider} job: ${jobId}`;
  trackJob(jobId, {
    onUpdate: (job) => {
      externalOutput.textContent = `${provider} job ${job.status}`;
    },
    onCompleted: (job) => {
      externalOutput.textContent = `${provider} completed.`;
      pushMessage("brain", formatJobResult(job), `${provider} (${job.id})`);
      refreshHealth();
    },
    onFailed: (job) => {
      externalOutput.textContent = `${provider} failed: ${job.error || "Unknown error"}`;
      logEvent(`External provider failed: ${job.error || "Unknown error"}`);
      refreshHealth();
    }
  });
}

async function showMoltbookAccountMasked() {
  const data = await request("/api/moltbook/account");
  const account = data.account || null;
  const vault = data.vault || null;
  const text = JSON.stringify({ account, vault }, null, 2);
  if (moltbookAccountOutput) {
    moltbookAccountOutput.textContent = account
      ? `Account loaded (${account.status || "draft"}).`
      : "No MoltBook account profile yet.";
  }
  pushMessage("brain", text, "MoltBook Account");
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = chatInput.value.trim();
  if (!text) return;

  pushMessage("user", text, "You");
  chatSend.disabled = true;

  try {
    let uploadedImages = [];
    if ((chatImages?.files?.length || 0) > 0) {
      logEvent(`Uploading ${chatImages.files.length} image(s)...`);
      uploadedImages = await uploadSelectedImages();
      if (uploadedImages.length > 0) {
        logEvent(`Image ingest ready (${uploadedImages.length}).`);
      }
    }

    let uploadedFiles = [];
    if ((chatFiles?.files?.length || 0) > 0) {
      logEvent(`Uploading ${chatFiles.files.length} file(s)...`);
      uploadedFiles = await uploadSelectedFiles();
      if (uploadedFiles.length > 0) {
        logEvent(`File ingest ready (${uploadedFiles.length}).`);
      }
    }

    const data = await apiPost("/api/chat", { message: text, images: uploadedImages, files: uploadedFiles });
    logEvent(data.reply || "Chat request accepted.");

    if (data.mode === "routed") {
      pushMessage("brain", data.reply, "Asolaria Router");
      chatInput.value = "";
      if (chatImages) chatImages.value = "";
      if (chatFiles) chatFiles.value = "";
      setChatImageStatus();
      setChatFileStatus();
      refreshMemory();
      return;
    }

    if (data.job?.id) {
      const messageRef = createMessage(
        "brain",
        `${data.reply}\nWaiting for job completion...`,
        `Asolaria Brain (${data.job.id})`
      );

      trackJob(data.job.id, {
        onUpdate: (job) => {
          updateMessageBody(
            messageRef,
            `Job ${job.id} status: ${job.status}...`,
            `Asolaria Brain (${job.id})`
          );
        },
        onCompleted: (job) => {
          updateMessageBody(
            messageRef,
            formatJobResult(job),
            `Asolaria Brain (${job.id}, ${job.elapsedMs || 0}ms)`
          );
          logEvent(`Brain job completed: ${job.id}`);
          refreshHealth();
          refreshMemory();
        },
        onFailed: (job) => {
          updateMessageBody(
            messageRef,
            `Job failed: ${job.error || "Unknown error"}`,
            `Asolaria Brain (${job.id || "unknown"})`
          );
          logEvent(`Brain job failed: ${job.error || "Unknown error"}`);
          refreshHealth();
          refreshMemory();
        }
      });
      chatInput.value = "";
      if (chatImages) chatImages.value = "";
      if (chatFiles) chatFiles.value = "";
      setChatImageStatus();
      setChatFileStatus();
      return;
    }

    pushMessage("brain", data.reply || "Task accepted.", "Asolaria Brain");
    chatInput.value = "";
    if (chatImages) chatImages.value = "";
    if (chatFiles) chatFiles.value = "";
    setChatImageStatus();
    setChatFileStatus();
    refreshMemory();
  } catch (error) {
    pushMessage("brain", error.message, "Error");
    logEvent(`Chat failed: ${error.message}`);
  } finally {
    chatSend.disabled = false;
    chatInput.focus();
  }
});

if (chatImages) {
  chatImages.addEventListener("change", setChatImageStatus);
}

if (chatFiles) {
  chatFiles.addEventListener("change", setChatFileStatus);
}

document.getElementById("openChromeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = document.getElementById("chromeUrl").value.trim();
  if (!url) return;
  if (stealthMode) {
    logEvent("Blocked: Stealth Mode prevents visible Chrome launch.");
    return;
  }

  try {
    const data = await apiPost("/api/chrome/open", { url });
    logEvent(`Chrome launched: ${data.opened}`);
  } catch (error) {
    logEvent(`Open Chrome failed: ${error.message}`);
  }
});

document.getElementById("shotForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = document.getElementById("shotUrl").value.trim();
  const fileName = document.getElementById("shotFile").value.trim();
  if (!url) return;

  shotOutput.textContent = "Queued...";
  try {
    const data = await apiPost("/api/chrome/screenshot", { url, fileName });
    const jobId = data.job?.id;
    if (!jobId) {
      shotOutput.textContent = "No job id returned.";
      return;
    }

    shotOutput.textContent = `Tracking job: ${jobId}`;
    logEvent(`Screenshot queued: ${jobId}`);

    trackJob(jobId, {
      onUpdate: (job) => {
        shotOutput.textContent = `Job ${job.id}: ${job.status}`;
      },
      onCompleted: (job) => {
        shotOutput.textContent = `Saved: ${job.result?.outputPath || "unknown path"}`;
        logEvent(`Screenshot completed: ${job.id}`);
        refreshHealth();
      },
      onFailed: (job) => {
        shotOutput.textContent = `Failed: ${job.error || "Unknown error"}`;
        logEvent(`Screenshot failed: ${job.error || "Unknown error"}`);
        refreshHealth();
      }
    });
  } catch (error) {
    shotOutput.textContent = `Error: ${error.message}`;
    logEvent(`Screenshot request failed: ${error.message}`);
  }
});

if (skillsRefreshBtn) {
  skillsRefreshBtn.addEventListener("click", () => {
    refreshSkillsList();
  });
}

if (skillsReloadBtn) {
  skillsReloadBtn.addEventListener("click", () => {
    reloadSkillsRegistry();
  });
}

if (skillsRunForm) {
  skillsRunForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!skillsSelect || !skillsOutput) return;

    const id = String(skillsSelect.value || "").trim();
    if (!id) {
      skillsOutput.textContent = "Select a skill to run.";
      return;
    }

    const rawInput = String(skillsInput?.value || "").trim();
    let input = {};
    if (rawInput) {
      try {
        input = JSON.parse(rawInput);
      } catch (_error) {
        input = { text: rawInput };
      }
    }

    try {
      skillsOutput.textContent = `Queued skill "${id}"...`;
      const data = await apiPost("/api/skills/run", { id, input });
      const jobId = data.job?.id;
      if (!jobId) {
        skillsOutput.textContent = "Skill queued with no job id.";
        return;
      }

      skillsOutput.textContent = `Tracking skill job: ${jobId}`;
      logEvent(`Skill queued: ${id} (${jobId})`);

      trackJob(jobId, {
        onUpdate: (job) => {
          skillsOutput.textContent = `Skill ${id}: ${job.status}`;
        },
        onCompleted: (job) => {
          skillsOutput.textContent = `Completed ${id}.`;
          pushMessage("brain", formatJobResult(job), `Skill ${id} (${job.id})`);
          refreshHealth();
        },
        onFailed: (job) => {
          skillsOutput.textContent = `Failed ${id}: ${job.error || "Unknown error"}`;
          logEvent(`Skill failed: ${job.error || "Unknown error"}`);
          refreshHealth();
        }
      });
    } catch (error) {
      skillsOutput.textContent = `Error: ${error.message}`;
      logEvent(`Skill run failed: ${error.message}`);
    }
  });
}

document.getElementById("openPadBtn").addEventListener("click", async () => {
  if (stealthMode) {
    logEvent("Blocked: Stealth Mode prevents opening PAD UI.");
    return;
  }

  try {
    const data = await apiPost("/api/pad/open");
    logEvent(`PAD opened: ${data.opened}`);
  } catch (error) {
    logEvent(`Open PAD failed: ${error.message}`);
  }
});

if (stealthToggle) {
  stealthToggle.addEventListener("change", async () => {
    const next = Boolean(stealthToggle.checked);
    try {
      const data = await apiPost("/api/settings", { stealthMode: next });
      applySettingsUi(data.settings || {});
      logEvent(`Stealth Mode ${data.settings?.stealthMode ? "enabled" : "disabled"}.`);
      refreshHealth();
    } catch (error) {
      stealthToggle.checked = stealthMode;
      logEvent(`Stealth toggle failed: ${error.message}`);
    }
  });
}

if (approvalModeSelect) {
  approvalModeSelect.addEventListener("change", async () => {
    const requested = normalizeApprovalMode(approvalModeSelect.value);
    try {
      const data = await apiPost("/api/settings", { approvalMode: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Approval mode set to ${approvalMode}.`);
      refreshHealth();
    } catch (error) {
      approvalModeSelect.value = approvalMode;
      logEvent(`Approval mode update failed: ${error.message}`);
    }
  });
}

if (costModeSelect) {
  costModeSelect.addEventListener("change", async () => {
    const requested = normalizeCostMode(costModeSelect.value);
    try {
      const data = await apiPost("/api/settings", { costMode: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Cost mode set to ${costMode}.`);
      refreshHealth();
    } catch (error) {
      costModeSelect.value = costMode;
      logEvent(`Cost mode update failed: ${error.message}`);
    }
  });
}

if (codexWebSearchSelect) {
  codexWebSearchSelect.addEventListener("change", async () => {
    const requested = normalizeCodexWebSearch(codexWebSearchSelect.value);
    try {
      const data = await apiPost("/api/settings", { codexWebSearch: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Codex web search ${codexWebSearch ? "enabled" : "disabled"}.`);
      refreshHealth();
    } catch (error) {
      codexWebSearchSelect.value = codexWebSearch ? "on" : "off";
      logEvent(`Codex web search update failed: ${error.message}`);
    }
  });
}

if (openclawModeSelect) {
  openclawModeSelect.addEventListener("change", async () => {
    const requested = normalizeOpenclawMode(openclawModeSelect.value);
    try {
      const data = await apiPost("/api/settings", { openclawMode: requested });
      applySettingsUi(data.settings || {});
      logEvent(`OpenClaw mode set to ${openclawMode}.`);
      refreshHealth();
    } catch (error) {
      openclawModeSelect.value = openclawMode;
      logEvent(`OpenClaw mode update failed: ${error.message}`);
    }
  });
}

if (allowExternalPostingToggle) {
  allowExternalPostingToggle.addEventListener("change", async () => {
    const requested = Boolean(allowExternalPostingToggle.checked);
    try {
      const data = await apiPost("/api/settings", { allowExternalPosting: requested });
      applySettingsUi(data.settings || {});
      logEvent(`allowExternalPosting set to ${allowExternalPosting}.`);
      refreshHealth();
    } catch (error) {
      allowExternalPostingToggle.checked = allowExternalPosting;
      logEvent(`allowExternalPosting update failed: ${error.message}`);
    }
  });
}

if (saveGuardianModeBtn && guardianModeSelect) {
  saveGuardianModeBtn.addEventListener("click", async () => {
    const requested = normalizeGuardianMode(guardianModeSelect.value);
    try {
      const data = await apiPost("/api/settings", { guardianMode: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Guardian mode set to ${guardianMode}.`);
      refreshHealth();
    } catch (error) {
      guardianModeSelect.value = guardianMode;
      logEvent(`Guardian mode update failed: ${error.message}`);
    }
  });
}

if (saveGuardianThresholdBtn && guardianRiskThresholdSelect) {
  saveGuardianThresholdBtn.addEventListener("click", async () => {
    const requested = normalizeGuardianRiskThreshold(guardianRiskThresholdSelect.value);
    try {
      const data = await apiPost("/api/settings", { guardianRiskThreshold: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Guardian risk threshold set to ${guardianRiskThreshold}.`);
      refreshHealth();
    } catch (error) {
      guardianRiskThresholdSelect.value = guardianRiskThreshold;
      logEvent(`Guardian threshold update failed: ${error.message}`);
    }
  });
}

if (guardianAlertsEnabledToggle) {
  guardianAlertsEnabledToggle.addEventListener("change", async () => {
    const requested = Boolean(guardianAlertsEnabledToggle.checked);
    try {
      const data = await apiPost("/api/settings", { guardianAlertsEnabled: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Guardian alerts ${guardianAlertsEnabled ? "enabled" : "disabled"}.`);
      refreshHealth();
    } catch (error) {
      guardianAlertsEnabledToggle.checked = guardianAlertsEnabled;
      logEvent(`Guardian alerts update failed: ${error.message}`);
    }
  });
}

if (guardianAutoBlockCriticalToggle) {
  guardianAutoBlockCriticalToggle.addEventListener("change", async () => {
    const requested = Boolean(guardianAutoBlockCriticalToggle.checked);
    try {
      const data = await apiPost("/api/settings", { guardianAutoBlockCritical: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Guardian auto-block critical ${guardianAutoBlockCritical ? "enabled" : "disabled"}.`);
      refreshHealth();
    } catch (error) {
      guardianAutoBlockCriticalToggle.checked = guardianAutoBlockCritical;
      logEvent(`Guardian auto-block update failed: ${error.message}`);
    }
  });
}

if (saveMemoryWindowBtn) {
  saveMemoryWindowBtn.addEventListener("click", async () => {
    const requested = normalizeMemoryWindow(memoryWindowTurnsInput?.value);
    try {
      const data = await apiPost("/api/settings", { memoryWindowTurns: requested });
      applySettingsUi(data.settings || {});
      logEvent(`Memory window set to ${memoryWindowTurns} turns.`);
      refreshHealth();
    } catch (error) {
      if (memoryWindowTurnsInput) {
        memoryWindowTurnsInput.value = String(memoryWindowTurns);
      }
      logEvent(`Memory window update failed: ${error.message}`);
    }
  });
}

document.querySelectorAll(".openclaw-action").forEach((button) => {
  button.addEventListener("click", async () => {
    const action = String(button.dataset.action || "").trim();
    if (!action) return;

    try {
      await queueOpenclawAction(action);
    } catch (error) {
      if (openclawOutput) {
        openclawOutput.textContent = `Error: ${error.message}`;
      }
      logEvent(`OpenClaw request failed: ${error.message}`);
    }
  });
});

if (openclawCronRunForm) {
  openclawCronRunForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = String(openclawCronName?.value || "").trim();
    if (!name) {
      if (openclawOutput) openclawOutput.textContent = "Cron name is required.";
      return;
    }

    try {
      await queueOpenclawAction("cron_run", { name });
    } catch (error) {
      if (openclawOutput) {
        openclawOutput.textContent = `Error: ${error.message}`;
      }
      logEvent(`OpenClaw cron run failed: ${error.message}`);
    }
  });
}

if (antigravityStatusBtn) {
  antigravityStatusBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("antigravity status", "Antigravity Status");
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Antigravity status failed: ${error.message}`);
    }
  });
}

if (cursorStatusBtn) {
  cursorStatusBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("cursor status", "Cursor Status");
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Cursor status failed: ${error.message}`);
    }
  });
}

if (externalRunForm) {
  externalRunForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const provider = String(externalProviderSelect?.value || "").trim();
    const prompt = String(externalPrompt?.value || "").trim();
    if (!provider || !prompt) {
      if (externalOutput) externalOutput.textContent = "Provider and prompt are required.";
      return;
    }

    try {
      await queueExternalProvider(provider, prompt);
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`External provider run failed: ${error.message}`);
    }
  });
}

if (guardianStatusBtn) {
  guardianStatusBtn.addEventListener("click", async () => {
    try {
      const data = await request("/api/guardian/status");
      if (guardianOutput) {
        guardianOutput.textContent = `Contacts=${data.summary?.profile?.contacts?.length || 0}, alerts=${data.alerts?.total || 0}`;
      }
      pushMessage("brain", JSON.stringify(data, null, 2), "Guardian Status");
    } catch (error) {
      if (guardianOutput) guardianOutput.textContent = `Error: ${error.message}`;
      logEvent(`Guardian status failed: ${error.message}`);
    }
  });
}

if (guardianBootstrapContactsBtn) {
  guardianBootstrapContactsBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/guardian/profile/bootstrap");
      if (guardianOutput) {
        guardianOutput.textContent = `Guardian contacts ready (${data.profile?.contacts?.length || 0}).`;
      }
      pushMessage("brain", JSON.stringify(data.profile || {}, null, 2), "Guardian Contacts");
      refreshHealth();
    } catch (error) {
      if (guardianOutput) guardianOutput.textContent = `Error: ${error.message}`;
      logEvent(`Guardian bootstrap failed: ${error.message}`);
    }
  });
}

if (guardianTestAlertBtn) {
  guardianTestAlertBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/guardian/alert/test");
      if (guardianOutput) {
        guardianOutput.textContent = `Guardian test alert sent (${data.result?.alertId || "unknown"}).`;
      }
      pushMessage("brain", JSON.stringify(data.result || {}, null, 2), "Guardian Alert Test");
      refreshHealth();
    } catch (error) {
      if (guardianOutput) guardianOutput.textContent = `Error: ${error.message}`;
      logEvent(`Guardian test alert failed: ${error.message}`);
    }
  });
}

if (moltbookMissionBtn) {
  moltbookMissionBtn.addEventListener("click", async () => {
    try {
      const data = await request("/api/moltbook/mission");
      pushMessage("brain", data.mission || "No mission text.", "MoltBook Mission");
      logEvent("Loaded MoltBook mission policy.");
    } catch (error) {
      logEvent(`MoltBook mission failed: ${error.message}`);
    }
  });
}

if (moltbookCreateAccountBtn) {
  moltbookCreateAccountBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/moltbook/account/bootstrap", {
        displayName: "Asolaria"
      });
      const account = data.account || null;
      if (moltbookAccountOutput) {
        moltbookAccountOutput.textContent = account
          ? `AI account profile secured for ${account.usernameMasked || account.username || "Asolaria"}.`
          : "No account response.";
      }
      pushMessage("brain", JSON.stringify(account || {}, null, 2), "MoltBook Account");
      refreshHealth();
    } catch (error) {
      if (moltbookAccountOutput) moltbookAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`MoltBook account bootstrap failed: ${error.message}`);
    }
  });
}

if (moltbookShowAccountBtn) {
  moltbookShowAccountBtn.addEventListener("click", async () => {
    try {
      await showMoltbookAccountMasked();
    } catch (error) {
      if (moltbookAccountOutput) moltbookAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`MoltBook account status failed: ${error.message}`);
    }
  });
}

if (moltbookRevealAccountBtn) {
  moltbookRevealAccountBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/moltbook/account/reveal", { confirm: true });
      const account = data.account || {};
      if (moltbookAccountOutput) {
        moltbookAccountOutput.textContent = "Sensitive account data revealed in chat output.";
      }
      pushMessage("brain", JSON.stringify(account, null, 2), "MoltBook Secret");
    } catch (error) {
      if (moltbookAccountOutput) moltbookAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`MoltBook reveal failed: ${error.message}`);
    }
  });
}

if (moltbookMarkRegisteredBtn) {
  moltbookMarkRegisteredBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/moltbook/account/mark-registered", {
        notes: "Marked as registered via Asolaria UI."
      });
      const account = data.account || {};
      if (moltbookAccountOutput) {
        moltbookAccountOutput.textContent = `MoltBook status updated to ${account.status || "registered"}.`;
      }
      pushMessage("brain", JSON.stringify(account, null, 2), "MoltBook Account");
      refreshHealth();
    } catch (error) {
      if (moltbookAccountOutput) moltbookAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`MoltBook mark-registered failed: ${error.message}`);
    }
  });
}

if (moltbookOpenSiteBtn) {
  moltbookOpenSiteBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("moltbook open", "MoltBook Portal");
    } catch (error) {
      if (moltbookAccountOutput) moltbookAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`MoltBook open-site failed: ${error.message}`);
    }
  });
}

if (moltbookDraftBtn) {
  moltbookDraftBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("moltbook draft post", "MoltBook Draft");
    } catch (error) {
      logEvent(`MoltBook draft failed: ${error.message}`);
    }
  });
}

if (moltbookDecideBtn) {
  moltbookDecideBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("moltbook decide proceed", "MoltBook Decision");
    } catch (error) {
      logEvent(`MoltBook decision failed: ${error.message}`);
    }
  });
}

document.getElementById("padRunForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const packagePath = document.getElementById("padPackage").value.trim();
  const mode = document.getElementById("padMode").value;
  const disableScreenshots = document.getElementById("padDisableShots").checked;
  if (!packagePath) return;

  logEvent("PAD run queued...");
  try {
    const data = await apiPost("/api/pad/run", { packagePath, mode, disableScreenshots });
    const jobId = data.job?.id;
    if (!jobId) {
      logEvent("PAD run request returned no job id.");
      return;
    }

    logEvent(`Tracking PAD job ${jobId}`);
    trackJob(jobId, {
      onCompleted: (job) => {
        logEvent(`PAD job completed: ${job.id}`);
        refreshHealth();
      },
      onFailed: (job) => {
        logEvent(`PAD job failed: ${job.error || "Unknown error"}`);
        refreshHealth();
      }
    });
  } catch (error) {
    logEvent(`PAD run failed: ${error.message}`);
  }
});

if (refreshMemoryBtn) {
  refreshMemoryBtn.addEventListener("click", () => {
    refreshMemory();
  });
}

if (clearMemoryBtn) {
  clearMemoryBtn.addEventListener("click", async () => {
    try {
      await apiDelete("/api/memory");
      logEvent("Memory cleared.");
      refreshMemory();
      refreshHealth();
    } catch (error) {
      logEvent(`Clear memory failed: ${error.message}`);
    }
  });
}

if (taskLedgerRefreshBtn) {
  taskLedgerRefreshBtn.addEventListener("click", () => {
    refreshTaskLedger();
  });
}

if (taskLedgerAddBtn) {
  taskLedgerAddBtn.addEventListener("click", async () => {
    try {
      const created = await createTaskLedgerTaskFromUi();
      logEvent(`Task created: ${created.task?.id || "unknown"}`);
      refreshTaskLedger();
      refreshHealth();
    } catch (error) {
      logEvent(`Task create failed: ${error.message}`);
    }
  });
}

if (taskLedgerStatusFilter) {
  taskLedgerStatusFilter.addEventListener("change", () => {
    refreshTaskLedger({ silent: true });
  });
}

if (taskLedgerPriorityFilter) {
  taskLedgerPriorityFilter.addEventListener("change", () => {
    refreshTaskLedger({ silent: true });
  });
}

if (taskLedgerIncludeArchived) {
  taskLedgerIncludeArchived.addEventListener("change", () => {
    refreshTaskLedger({ silent: true });
  });
}

if (taskLedgerQuery) {
  taskLedgerQuery.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      refreshTaskLedger({ silent: true });
    }
  });
}

if (taskLedgerList) {
  taskLedgerList.addEventListener("click", async (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target || target.tagName !== "BUTTON") {
      return;
    }
    const taskId = String(target.dataset.taskId || "").trim();
    const action = String(target.dataset.action || "").trim();
    if (!taskId || !action) {
      return;
    }
    target.disabled = true;
    try {
      await handleTaskLedgerAction(action, taskId);
      logEvent(`Task ${taskId}: ${action}`);
      refreshTaskLedger({ silent: true });
      refreshHealth();
    } catch (error) {
      logEvent(`Task action failed (${action}): ${error.message}`);
    } finally {
      target.disabled = false;
    }
  });
}

pushMessage(
  "brain",
  "Asolaria online. Ask me to reason, launch browser tests, or run a PAD package.",
  "System"
);
refreshHealth();
refreshMemory();
refreshSkillsList();
refreshTaskLedger({ silent: true });
setInterval(refreshHealth, 7000);
setInterval(refreshMemory, 12000);
setInterval(() => refreshTaskLedger({ silent: true }), 15000);
