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
const anthropicStatusBtn = document.getElementById("anthropicStatusBtn");
const geminiCliStatusBtn = document.getElementById("geminiCliStatusBtn");
const externalSaveDefaultBtn = document.getElementById("externalSaveDefaultBtn");
const externalClearDefaultBtn = document.getElementById("externalClearDefaultBtn");
const externalClearObservedBtn = document.getElementById("externalClearObservedBtn");
const externalClearObservedAllBtn = document.getElementById("externalClearObservedAllBtn");
const externalModelStatusBtn = document.getElementById("externalModelStatusBtn");
const externalObservedMaxAgeDaysInput = document.getElementById("externalObservedMaxAgeDays");
const externalPruneObservedBtn = document.getElementById("externalPruneObservedBtn");
const externalObservedAutoPruneEnabledToggle = document.getElementById("externalObservedAutoPruneEnabled");
const externalObservedAutoPruneDaysInput = document.getElementById("externalObservedAutoPruneDays");
const externalObservedAutoPruneHourInput = document.getElementById("externalObservedAutoPruneHour");
const externalSaveObservedPruneSettingsBtn = document.getElementById("externalSaveObservedPruneSettingsBtn");
const externalObservedPruneStatus = document.getElementById("externalObservedPruneStatus");
const externalRunForm = document.getElementById("externalRunForm");
const externalProviderSelect = document.getElementById("externalProviderSelect");
const externalModelInput = document.getElementById("externalModelInput");
const externalModelAliasList = document.getElementById("externalModelAliasList");
const externalModelHint = document.getElementById("externalModelHint");
const externalObservedHint = document.getElementById("externalObservedHint");
const externalPrompt = document.getElementById("externalPrompt");
const externalOutput = document.getElementById("externalOutput");
const allowExternalPostingToggle = document.getElementById("allowExternalPosting");
const companyMissionBtn = document.getElementById("companyMissionBtn");
const companyDraftBtn = document.getElementById("companyDraftBtn");
const companyDecideBtn = document.getElementById("companyDecideBtn");
const companyHint = document.getElementById("companyHint");
const companyCreateAccountBtn = document.getElementById("companyCreateAccountBtn");
const companyShowAccountBtn = document.getElementById("companyShowAccountBtn");
const companyRevealAccountBtn = document.getElementById("companyRevealAccountBtn");
const companyMarkRegisteredBtn = document.getElementById("companyMarkRegisteredBtn");
const companyOpenSiteBtn = document.getElementById("companyOpenSiteBtn");
const companyAccountOutput = document.getElementById("companyAccountOutput");
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
const gatewayAuditTypeSelect = document.getElementById("gatewayAuditType");
const gatewayAuditLimitInput = document.getElementById("gatewayAuditLimit");
const gatewayAuditRefreshBtn = document.getElementById("gatewayAuditRefreshBtn");
const gatewayAuditVerifyBtn = document.getElementById("gatewayAuditVerifyBtn");
const gatewayReadinessDrillBtn = document.getElementById("gatewayReadinessDrillBtn");
const gatewayHeartbeatRunBtn = document.getElementById("gatewayHeartbeatRunBtn");
const gatewayStartSandboxBtn = document.getElementById("gatewayStartSandboxBtn");
const gatewayAuthorityStatus = document.getElementById("gatewayAuthorityStatus");
const gatewayAuditStatus = document.getElementById("gatewayAuditStatus");
const gatewayReadinessDrillOutput = document.getElementById("gatewayReadinessDrillOutput");
const gatewayReadinessHints = document.getElementById("gatewayReadinessHints");
const gatewayAuditEvents = document.getElementById("gatewayAuditEvents");
const railFilter = document.getElementById("railFilter");
const projectNav = document.getElementById("projectNav");
const projectFolderTree = document.getElementById("projectFolderTree");
const projectFolderSearch = document.getElementById("projectFolderSearch");
const projectRefreshBtn = document.getElementById("projectRefreshBtn");
const projectCreateBtn = document.getElementById("projectCreateBtn");
const projectUpdateBtn = document.getElementById("projectUpdateBtn");
const projectDeleteBtn = document.getElementById("projectDeleteBtn");
const projectAdminOutput = document.getElementById("projectAdminOutput");
const openPhoneModeBtn = document.getElementById("openPhoneModeBtn");
const colonyDashboardCard = document.getElementById("colonyDashboardCard");
const colonyGrid = document.getElementById("colonyGrid");
const colonySummary = document.getElementById("colonySummary");
const colonyUpdatedAt = document.getElementById("colonyUpdatedAt");

const AGENT_DASHBOARD_ORDER = Object.freeze([
  "asolaria-core",
  "this-codex",
  "other-codex",
  "build-codex",
  "phone-codex",
  "watchdog"
]);

const AGENT_FALLBACK_META = Object.freeze({
  "asolaria-core": Object.freeze({ name: "Asolaria", role: "Core Runtime", icon: "A" }),
  "this-codex": Object.freeze({ name: "Vector", role: "Main Brain", icon: "V" }),
  "other-codex": Object.freeze({ name: "Rook", role: "Ops Lane", icon: "R" }),
  "build-codex": Object.freeze({ name: "Forge", role: "Build Lane", icon: "F" }),
  "phone-codex": Object.freeze({ name: "Falcon", role: "Phone Lane", icon: "P" }),
  "watchdog": Object.freeze({ name: "Watchdog", role: "Supervisor", icon: "W" })
});

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
let activeProjectScope = "all";
let externalModelAliases = {};
let externalModelCatalog = {};
let externalDefaultModels = {};
let externalDefaultModelsRevision = "";
let externalObservedPruneRuntime = {
  enabled: true,
  maxAgeDays: 30,
  dailyHourLocal: 3,
  timerActive: false,
  nextRunAt: "",
  lastRunAt: "",
  lastError: "",
  lastSummary: null,
  runs: 0
};

const PROJECT_SCOPE_STORAGE_KEY = "ASOLARIA_ACTIVE_PROJECT_SCOPE";
const PROJECT_ALLOWED_GROUPS = Object.freeze(["projects", "tasks", "skills", "runtime"]);

let projectScopeList = [];
let projectScopeMap = Object.create(null);
let projectCatalogById = Object.create(null);

function normalizeProjectScopeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function normalizeProjectGroup(value, fallback = "projects") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "all") {
    return "all";
  }
  if (PROJECT_ALLOWED_GROUPS.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeProjectFolders(value) {
  if (Array.isArray(value)) {
    return uniqueNonEmptyStrings(value).slice(0, 120);
  }
  const raw = String(value || "");
  if (!raw.trim()) {
    return [];
  }
  return uniqueNonEmptyStrings(raw.split(/[\n,]/g)).slice(0, 120);
}

function createProjectScopeFromValue(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const id = normalizeProjectScopeId(source.id || source.scopeId || source.name || source.label || "");
  if (!id) {
    return null;
  }
  const label = String(source.label || source.name || (id === "all" ? "All Projects" : id))
    .trim()
    .slice(0, 100) || (id === "all" ? "All Projects" : id);
  const marker = String(source.marker || "").replace(/\r/g, "").trim().slice(0, 80);
  const group = id === "all"
    ? "all"
    : normalizeProjectGroup(source.group, "projects");
  const folders = normalizeProjectFolders(source.folders);
  return {
    id,
    label,
    marker: id === "all" ? "" : marker,
    group,
    folders
  };
}

function buildAllProjectScope(scopes = []) {
  const folders = uniqueNonEmptyStrings(
    scopes.flatMap((scope) => (Array.isArray(scope?.folders) ? scope.folders : []))
  ).slice(0, 200);
  return {
    id: "all",
    label: "All Projects",
    marker: "",
    group: "all",
    folders
  };
}

function buildFallbackProjectScopes() {
  return [buildAllProjectScope([])];
}

function setProjectScopeCatalog(scopes = [], projects = []) {
  const list = [];
  const seen = new Set();
  const scopeRows = Array.isArray(scopes) ? scopes : [];
  for (const raw of scopeRows) {
    const scope = createProjectScopeFromValue(raw);
    if (!scope || !scope.id || scope.id === "all" || seen.has(scope.id)) {
      continue;
    }
    seen.add(scope.id);
    list.push(scope);
  }
  const projectRows = Array.isArray(projects) ? projects : [];
  for (const raw of projectRows) {
    if (Boolean(raw?.archived)) {
      continue;
    }
    const scope = createProjectScopeFromValue(raw);
    if (!scope || !scope.id || scope.id === "all" || seen.has(scope.id)) {
      continue;
    }
    seen.add(scope.id);
    list.push(scope);
  }
  list.sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));

  const allScope = buildAllProjectScope(list);
  const explicitAll = scopeRows
    .map((scope) => createProjectScopeFromValue(scope))
    .find((scope) => scope?.id === "all");
  if (explicitAll) {
    allScope.label = explicitAll.label || allScope.label;
    allScope.folders = uniqueNonEmptyStrings([
      ...(explicitAll.folders || []),
      ...allScope.folders
    ]).slice(0, 200);
  }

  projectScopeList = [allScope, ...list];
  projectScopeMap = Object.create(null);
  for (const scope of projectScopeList) {
    projectScopeMap[scope.id] = scope;
  }

  projectCatalogById = Object.create(null);
  for (const raw of projectRows) {
    const scope = createProjectScopeFromValue(raw);
    if (!scope || !scope.id || scope.id === "all") {
      continue;
    }
    projectCatalogById[scope.id] = {
      id: scope.id,
      label: String(raw.label || scope.label || "").trim().slice(0, 100) || scope.label,
      marker: String(raw.marker || scope.marker || "").replace(/\r/g, "").trim().slice(0, 80),
      group: normalizeProjectGroup(raw.group, scope.group || "projects"),
      folders: normalizeProjectFolders(raw.folders),
      archived: Boolean(raw.archived),
      createdAt: String(raw.createdAt || ""),
      updatedAt: String(raw.updatedAt || "")
    };
  }
  for (const scope of list) {
    if (projectCatalogById[scope.id]) {
      continue;
    }
    projectCatalogById[scope.id] = {
      id: scope.id,
      label: scope.label,
      marker: scope.marker,
      group: scope.group,
      folders: scope.folders.slice(0),
      archived: false,
      createdAt: "",
      updatedAt: ""
    };
  }
}

function normalizeProjectScope(value) {
  const normalized = normalizeProjectScopeId(value);
  if (!normalized || !Object.prototype.hasOwnProperty.call(projectScopeMap, normalized)) {
    return "all";
  }
  return normalized;
}

function getActiveProjectScope() {
  const normalized = normalizeProjectScope(activeProjectScope);
  return projectScopeMap[normalized] || projectScopeMap.all || {
    id: "all",
    label: "All Projects",
    marker: "",
    group: "all",
    folders: []
  };
}

function renderProjectScopeNav() {
  if (!projectNav) {
    return;
  }
  const normalized = normalizeProjectScope(activeProjectScope);
  projectNav.innerHTML = "";
  for (const scope of projectScopeList) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-pill";
    button.dataset.project = scope.id;
    button.textContent = scope.label;
    if (scope.marker) {
      button.title = `${scope.marker} ${scope.label}`;
    }
    if (scope.id === normalized) {
      button.classList.add("active");
    }
    projectNav.appendChild(button);
  }
}

function renderProjectFolderTree(scopeId) {
  if (!projectFolderTree) {
    return;
  }
  const normalized = normalizeProjectScope(scopeId);
  const scope = projectScopeMap[normalized] || getActiveProjectScope();
  const allFolders = Array.isArray(scope.folders) ? scope.folders : [];
  const query = String(projectFolderSearch?.value || "").trim().toLowerCase();
  const folders = query
    ? allFolders.filter((folder) => String(folder || "").toLowerCase().includes(query))
    : allFolders;
  projectFolderTree.innerHTML = "";
  const title = document.createElement("div");
  title.className = "folder-tree-title";
  title.textContent = `${scope.label} folders (${folders.length}/${allFolders.length})`;
  projectFolderTree.appendChild(title);
  if (folders.length < 1) {
    const empty = document.createElement("div");
    empty.className = "folder-tree-empty";
    empty.textContent = "No folders match this filter.";
    projectFolderTree.appendChild(empty);
    return;
  }
  for (const folder of folders) {
    const line = document.createElement("div");
    line.className = "folder-tree-item";
    line.textContent = folder;
    projectFolderTree.appendChild(line);
  }
}

function applyProjectScope(scopeId, options = {}) {
  const normalized = normalizeProjectScope(scopeId);
  const scope = projectScopeMap[normalized] || getActiveProjectScope();
  activeProjectScope = normalized;
  if (options.persist !== false) {
    try {
      localStorage.setItem(PROJECT_SCOPE_STORAGE_KEY, normalized);
    } catch {}
  }

  renderProjectScopeNav();
  renderProjectFolderTree(normalized);

  if (taskLedgerTitle) {
    taskLedgerTitle.placeholder = scope.marker
      ? `${scope.marker} task title`
      : "Task title";
  }
  if (taskLedgerDescription) {
    taskLedgerDescription.placeholder = scope.marker
      ? `Notes for ${scope.label}`
      : "Task description (optional)";
  }
  if (memoryStats) {
    memoryStats.dataset.scope = scope.label;
  }

  if (options.syncGroupFilter !== false) {
    applyActionGroupFilter(scope.group || "all");
  }
  if (options.refreshLedger !== false) {
    refreshTaskLedger({ silent: true });
  }
}

async function refreshProjectScopes(options = {}) {
  const limit = Number(options.limit);
  const boundedLimit = Number.isFinite(limit) ? Math.max(20, Math.min(1000, Math.round(limit))) : 500;
  const params = new URLSearchParams();
  params.set("limit", String(boundedLimit));
  if (options.includeArchived) {
    params.set("includeArchived", "true");
  }
  const data = await request(`/api/projects?${params.toString()}`);
  setProjectScopeCatalog(data.scopes, data.projects);
  const preferredScope = options.preferredScopeId || options.scopeId || activeProjectScope || "all";
  applyProjectScope(preferredScope, {
    syncGroupFilter: options.syncGroupFilter !== false,
    refreshLedger: options.refreshLedger !== false
  });
  if (!options.silent) {
    const count = Number(data.count || (Array.isArray(data.projects) ? data.projects.length : 0));
    setProjectAdminMessage(`Loaded ${count} project${count === 1 ? "" : "s"}.`);
  }
  return data;
}

function getProjectForEdit(scopeId) {
  const normalized = normalizeProjectScope(scopeId);
  if (!normalized || normalized === "all") {
    return null;
  }
  const cached = projectCatalogById[normalized];
  if (cached) {
    return JSON.parse(JSON.stringify(cached));
  }
  const scope = projectScopeMap[normalized];
  if (!scope) {
    return null;
  }
  return {
    id: scope.id,
    label: scope.label,
    marker: scope.marker,
    group: scope.group,
    folders: Array.isArray(scope.folders) ? scope.folders.slice(0) : [],
    archived: false,
    createdAt: "",
    updatedAt: ""
  };
}

function setProjectAdminMessage(message, isError = false) {
  if (!projectAdminOutput) {
    return;
  }
  const text = String(message || "").trim();
  projectAdminOutput.textContent = text || "Projects are persisted in local data storage.";
  projectAdminOutput.style.color = isError ? "#ffb8b8" : "";
}

function buildProjectInputPayload(mode, current = null) {
  const baseline = current && typeof current === "object" ? current : {};
  const currentLabel = String(baseline.label || "").trim();
  const labelPrompt = window.prompt("Project label:", currentLabel);
  if (labelPrompt === null) return null;
  const label = String(labelPrompt || "").trim();
  if (!label) {
    throw new Error("Project label is required.");
  }

  let id = "";
  if (mode === "create") {
    const suggestedId = normalizeProjectScopeId(String(baseline.id || label));
    const idPrompt = window.prompt("Project id (optional):", suggestedId);
    if (idPrompt === null) return null;
    id = normalizeProjectScopeId(idPrompt);
    if (id === "all") {
      throw new Error("Project id \"all\" is reserved.");
    }
  }

  const markerPrompt = window.prompt(
    "Marker (optional, e.g. [ASOLARIA]):",
    String(baseline.marker || "").trim()
  );
  if (markerPrompt === null) return null;
  const marker = String(markerPrompt || "").replace(/\r/g, "").trim().slice(0, 80);

  const currentGroup = normalizeProjectGroup(baseline.group, "projects");
  const groupPrompt = window.prompt(
    "Group (projects|tasks|skills|runtime):",
    currentGroup
  );
  if (groupPrompt === null) return null;
  const group = normalizeProjectGroup(groupPrompt, currentGroup || "projects");

  const foldersPrompt = window.prompt(
    "Folders/paths (comma or newline separated):",
    Array.isArray(baseline.folders) ? baseline.folders.join("\n") : ""
  );
  if (foldersPrompt === null) return null;
  const folders = normalizeProjectFolders(foldersPrompt);

  const payload = {
    label,
    marker,
    group,
    folders
  };
  if (mode === "create" && id) {
    payload.id = id;
  }
  return payload;
}

async function createProjectFromUi() {
  const payload = buildProjectInputPayload("create");
  if (!payload) return;
  const created = await apiPost("/api/projects", payload);
  const newScope = normalizeProjectScopeId(created?.project?.id || payload.id || payload.label || "");
  await refreshProjectScopes({
    preferredScopeId: newScope || activeProjectScope,
    syncGroupFilter: true,
    refreshLedger: true,
    silent: true
  });
  setProjectAdminMessage(`Project created: ${created?.project?.label || payload.label}`);
}

async function updateSelectedProjectFromUi() {
  const selected = getProjectForEdit(activeProjectScope);
  if (!selected || !selected.id || selected.id === "all") {
    throw new Error("Select a specific project before editing.");
  }
  const payload = buildProjectInputPayload("update", selected);
  if (!payload) return;
  await request(`/api/projects/${encodeURIComponent(selected.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  await refreshProjectScopes({
    preferredScopeId: selected.id,
    syncGroupFilter: true,
    refreshLedger: true,
    silent: true
  });
  setProjectAdminMessage(`Project updated: ${payload.label}`);
}

async function deleteSelectedProjectFromUi() {
  const selected = getProjectForEdit(activeProjectScope);
  if (!selected || !selected.id || selected.id === "all") {
    throw new Error("Select a specific project before deleting.");
  }
  const confirmed = window.confirm(`Delete project "${selected.label}"?\n\nOK = continue\nCancel = keep project`);
  if (!confirmed) return;
  const hard = window.confirm(`Hard delete "${selected.label}" permanently?\n\nOK = hard delete\nCancel = archive (soft delete)`);
  const query = hard ? "?hard=true" : "";
  await request(`/api/projects/${encodeURIComponent(selected.id)}${query}`, {
    method: "DELETE"
  });
  await refreshProjectScopes({
    preferredScopeId: "all",
    syncGroupFilter: true,
    refreshLedger: true,
    silent: true
  });
  setProjectAdminMessage(`${hard ? "Deleted" : "Archived"} project: ${selected.label}`);
}

setProjectScopeCatalog([], []);

function applyActionGroupFilter(group) {
  const normalized = String(group || "all").trim().toLowerCase() || "all";
  const cards = Array.from(document.querySelectorAll(".action-panel .card[data-group]"));
  for (const card of cards) {
    const cardGroup = String(card.getAttribute("data-group") || "runtime").trim().toLowerCase();
    const alwaysVisible = card.id === "workspaceCard" || card.id === "colonyDashboardCard";
    const match = alwaysVisible || normalized === "all" || cardGroup === normalized;
    card.classList.toggle("group-hidden", !match);
  }
  if (railFilter) {
    const buttons = Array.from(railFilter.querySelectorAll(".rail-filter-btn"));
    for (const button of buttons) {
      const btnGroup = String(button.dataset.group || "").trim().toLowerCase();
      button.classList.toggle("active", btnGroup === normalized);
    }
  }
}

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
  const requestOptions = { ...options };
  const headers = {
    ...(options && options.headers && typeof options.headers === "object" ? options.headers : {})
  };
  if (!headers["x-asolaria-viewer"] && !headers["X-Asolaria-Viewer"]) {
    headers["x-asolaria-viewer"] = "owner";
  }
  requestOptions.headers = headers;
  const response = await fetch(path, requestOptions);
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

async function apiDelete(path, payload) {
  const options = {
    method: "DELETE"
  };
  if (payload !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(payload || {});
  }
  return request(path, options);
}

const FALLBACK_EXTERNAL_MODEL_ALIASES = Object.freeze({
  anthropic: Object.freeze(["opus", "sonnet", "haiku"]),
  gemini: Object.freeze(["gemini-pro", "gemini-flash", "pro", "flash"]),
  cursor: Object.freeze(["opus", "sonnet", "gemini-pro", "gemini-flash"]),
  antigravity: Object.freeze([])
});

function uniqueNonEmptyStrings(values) {
  const seen = new Set();
  const output = [];
  for (const value of Array.isArray(values) ? values : []) {
    const text = String(value || "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }
  return output;
}

function normalizeExternalProviderId(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (provider === "cursor" || provider === "antigravity" || provider === "anthropic" || provider === "gemini") {
    return provider;
  }
  return "anthropic";
}

function normalizeExternalDefaultModelValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  let text = raw;
  if (
    (text.startsWith("\"") && text.endsWith("\""))
    || (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text.slice(0, 160);
}

function normalizeExternalDefaultModelsMap(value) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = {};
  const providers = ["anthropic", "gemini", "cursor", "antigravity"];
  for (const providerId of providers) {
    const provider = normalizeExternalProviderId(providerId);
    const model = normalizeExternalDefaultModelValue(source[provider]);
    if (model) {
      normalized[provider] = model;
    }
  }
  return normalized;
}

function serializeExternalDefaultModelsMap(value) {
  const normalized = normalizeExternalDefaultModelsMap(value);
  const keys = Object.keys(normalized).sort();
  return keys.map((key) => `${key}:${normalized[key]}`).join("|");
}

function getExternalDefaultModel(providerId) {
  const provider = normalizeExternalProviderId(providerId);
  return normalizeExternalDefaultModelValue(externalDefaultModels?.[provider]);
}

function normalizeExternalObservedModelDetailEntry(value) {
  const source = value && typeof value === "object" ? value : {};
  const model = normalizeExternalDefaultModelValue(
    source.model !== undefined
      ? source.model
      : value
  );
  if (!model) {
    return null;
  }
  const firstSeenAtRaw = String(source.firstSeenAt || source.firstSeen || source.first_seen_at || "").trim();
  const lastSeenAtRaw = String(source.lastSeenAt || source.lastSeen || source.last_seen_at || source.seenAt || "").trim();
  const firstSeenMs = Date.parse(firstSeenAtRaw);
  const lastSeenMs = Date.parse(lastSeenAtRaw);
  const firstSeenAt = Number.isFinite(firstSeenMs) ? new Date(firstSeenMs).toISOString() : "";
  const lastSeenAt = Number.isFinite(lastSeenMs) ? new Date(lastSeenMs).toISOString() : "";
  const seenCountRaw = Number(
    source.seenCount !== undefined
      ? source.seenCount
      : (source.count !== undefined ? source.count : source.seen)
  );
  const seenCount = Number.isFinite(seenCountRaw) ? Math.max(1, Math.round(seenCountRaw)) : 1;
  return {
    model,
    firstSeenAt,
    lastSeenAt: lastSeenAt || firstSeenAt,
    seenCount
  };
}

function getExternalObservedModelDetails(providerId) {
  const provider = normalizeExternalProviderId(providerId);
  const catalogEntry = externalModelCatalog?.[provider] && typeof externalModelCatalog[provider] === "object"
    ? externalModelCatalog[provider]
    : {};
  const rawDetails = Array.isArray(catalogEntry.observedModelDetails)
    ? catalogEntry.observedModelDetails
    : (Array.isArray(catalogEntry.observedModels) ? catalogEntry.observedModels : []);
  const seen = new Set();
  const details = [];
  for (const raw of rawDetails) {
    const parsed = normalizeExternalObservedModelDetailEntry(raw);
    if (!parsed) continue;
    const key = parsed.model.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    details.push(parsed);
  }
  return details;
}

function getExternalObservedModels(providerId) {
  return getExternalObservedModelDetails(providerId).map((entry) => entry.model);
}

function formatObservedAge(value) {
  const parsed = Date.parse(String(value || ""));
  if (!Number.isFinite(parsed)) {
    return "unknown";
  }
  const diffMs = Date.now() - parsed;
  if (!Number.isFinite(diffMs) || diffMs < 15 * 1000) {
    return "just now";
  }
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  }
  if (diffMs < day) {
    return `${Math.max(1, Math.floor(diffMs / hour))}h ago`;
  }
  return `${Math.max(1, Math.floor(diffMs / day))}d ago`;
}

function readExternalObservedMaxAgeDays() {
  const parsed = Number(externalObservedMaxAgeDaysInput?.value || 30);
  const days = Number.isFinite(parsed) ? Math.max(1, Math.min(3650, Math.round(parsed))) : 30;
  if (externalObservedMaxAgeDaysInput) {
    externalObservedMaxAgeDaysInput.value = String(days);
  }
  return days;
}

function normalizeExternalObservedPruneDays(value, fallback = 30) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(3650, Math.round(parsed)));
}

function normalizeExternalObservedPruneHour(value, fallback = 3) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(23, Math.round(parsed)));
}

function readExternalObservedAutoPruneDays() {
  const days = normalizeExternalObservedPruneDays(
    externalObservedAutoPruneDaysInput?.value,
    externalObservedPruneRuntime.maxAgeDays
  );
  if (externalObservedAutoPruneDaysInput) {
    externalObservedAutoPruneDaysInput.value = String(days);
  }
  return days;
}

function readExternalObservedAutoPruneHour() {
  const hour = normalizeExternalObservedPruneHour(
    externalObservedAutoPruneHourInput?.value,
    externalObservedPruneRuntime.dailyHourLocal
  );
  if (externalObservedAutoPruneHourInput) {
    externalObservedAutoPruneHourInput.value = String(hour);
  }
  return hour;
}

function renderExternalObservedPruneStatus() {
  if (!externalObservedPruneStatus) {
    return;
  }
  const enabled = Boolean(externalObservedPruneRuntime.enabled);
  const days = normalizeExternalObservedPruneDays(externalObservedPruneRuntime.maxAgeDays, 30);
  const hour = normalizeExternalObservedPruneHour(externalObservedPruneRuntime.dailyHourLocal, 3);
  const hourText = `${String(hour).padStart(2, "0")}:00`;
  const timerText = externalObservedPruneRuntime.timerActive ? "armed" : "idle";
  const nextRunText = externalObservedPruneRuntime.nextRunAt
    ? formatLocalTimestamp(externalObservedPruneRuntime.nextRunAt)
    : "n/a";
  const lastRunText = externalObservedPruneRuntime.lastRunAt
    ? formatLocalTimestamp(externalObservedPruneRuntime.lastRunAt)
    : "n/a";
  const runs = Math.max(0, Number(externalObservedPruneRuntime.runs || 0));
  const error = String(externalObservedPruneRuntime.lastError || "").trim();
  const errorText = error ? ` Error: ${error.slice(0, 140)}.` : "";
  if (enabled) {
    externalObservedPruneStatus.textContent = `Auto-prune ON (${timerText}): keep ${days} day(s), run daily at ${hourText} local. Next: ${nextRunText}. Last: ${lastRunText}. Runs: ${runs}.${errorText}`;
    return;
  }
  externalObservedPruneStatus.textContent = `Auto-prune OFF. Configured window: ${days} day(s), hour: ${hourText} local.${errorText}`;
}

function applyExternalObservedPruneRuntimeSnapshot(snapshot = {}) {
  const source = snapshot && typeof snapshot === "object" ? snapshot : {};
  if (source.enabled !== undefined) {
    externalObservedPruneRuntime.enabled = Boolean(source.enabled);
  }
  externalObservedPruneRuntime.maxAgeDays = normalizeExternalObservedPruneDays(
    source.maxAgeDays,
    externalObservedPruneRuntime.maxAgeDays
  );
  externalObservedPruneRuntime.dailyHourLocal = normalizeExternalObservedPruneHour(
    source.dailyHourLocal,
    externalObservedPruneRuntime.dailyHourLocal
  );
  externalObservedPruneRuntime.timerActive = Boolean(source.timerActive);
  externalObservedPruneRuntime.nextRunAt = String(source.nextRunAt || "");
  externalObservedPruneRuntime.lastRunAt = String(source.lastRunAt || "");
  externalObservedPruneRuntime.lastError = String(source.lastError || "");
  externalObservedPruneRuntime.lastSummary = source.lastSummary && typeof source.lastSummary === "object"
    ? source.lastSummary
    : null;
  externalObservedPruneRuntime.runs = Math.max(0, Number(source.runs || 0));
  renderExternalObservedPruneStatus();
}

function buildExternalModelSuggestions(providerId) {
  const provider = normalizeExternalProviderId(providerId);
  const fallback = Array.isArray(FALLBACK_EXTERNAL_MODEL_ALIASES[provider])
    ? FALLBACK_EXTERNAL_MODEL_ALIASES[provider]
    : [];
  const hints = Array.isArray(externalModelAliases?.[provider])
    ? externalModelAliases[provider]
    : fallback;
  const catalogEntry = externalModelCatalog?.[provider] && typeof externalModelCatalog[provider] === "object"
    ? externalModelCatalog[provider]
    : {};
  const aliasMap = catalogEntry.aliases && typeof catalogEntry.aliases === "object"
    ? Object.keys(catalogEntry.aliases)
    : [];
  const canonicalModels = Array.isArray(catalogEntry.canonicalModels)
    ? catalogEntry.canonicalModels
    : [];
  const defaultModel = getExternalDefaultModel(provider);
  return uniqueNonEmptyStrings([...hints, ...aliasMap, ...canonicalModels, defaultModel]).slice(0, 180);
}

function refreshExternalModelInputUi(options = {}) {
  const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
  const suggestions = buildExternalModelSuggestions(provider);
  const defaultModel = getExternalDefaultModel(provider);
  const observedModelDetails = getExternalObservedModelDetails(provider);
  const observedModels = getExternalObservedModels(provider);
  const syncValue = Boolean(options.syncValue);
  const forceValue = Boolean(options.forceValue);

  if (externalModelAliasList) {
    externalModelAliasList.innerHTML = "";
    for (const value of suggestions) {
      const option = document.createElement("option");
      option.value = value;
      externalModelAliasList.appendChild(option);
    }
  }

  if (externalModelInput) {
    externalModelInput.placeholder = defaultModel
      ? `Model alias or exact ID for ${provider} (default: ${defaultModel})`
      : `Model alias or exact ID for ${provider} (optional)`;
    const currentValue = String(externalModelInput.value || "").trim();
    if (syncValue && (forceValue || !currentValue)) {
      externalModelInput.value = defaultModel;
    }
  }

  if (externalModelHint) {
    const aliasHint = suggestions.length > 0
      ? `Aliases for ${provider}: ${suggestions.slice(0, 8).join(", ")}${suggestions.length > 8 ? ", ..." : ""}`
      : `No known aliases for ${provider}. You can still use an exact model ID.`;
    const defaultHint = defaultModel ? ` Default model: ${defaultModel}.` : "";
    const observedHint = observedModels.length > 0
      ? ` Observed: ${observedModels.length}.`
      : "";
    externalModelHint.textContent = `${aliasHint}${defaultHint}${observedHint}`.trim();
  }

  if (externalObservedHint) {
    if (observedModelDetails.length > 0) {
      const preview = observedModelDetails
        .slice(0, 5)
        .map((entry) => `${entry.model} (${formatObservedAge(entry.lastSeenAt)}, x${entry.seenCount})`)
        .join(", ");
      externalObservedHint.textContent = `Observed models for ${provider}: ${preview}${observedModelDetails.length > 5 ? ", ..." : ""}`;
    } else {
      externalObservedHint.textContent = `Observed models for ${provider}: none yet.`;
    }
  }
}

async function refreshExternalModelAliases(options = {}) {
  const silent = Boolean(options.silent);
  let defaultModelsChanged = false;
  try {
    const data = await request("/api/providers/model-aliases");
    externalModelAliases = data.aliases && typeof data.aliases === "object"
      ? data.aliases
      : {};
    externalModelCatalog = data.catalog && typeof data.catalog === "object"
      ? data.catalog
      : {};
    if (data.defaultModels && typeof data.defaultModels === "object") {
      const nextDefaults = normalizeExternalDefaultModelsMap(data.defaultModels);
      const nextRevision = serializeExternalDefaultModelsMap(nextDefaults);
      defaultModelsChanged = nextRevision !== externalDefaultModelsRevision;
      externalDefaultModels = nextDefaults;
      externalDefaultModelsRevision = nextRevision;
    }
    if (!silent) {
      logEvent("External model aliases refreshed.");
    }
  } catch (error) {
    externalModelAliases = { ...FALLBACK_EXTERNAL_MODEL_ALIASES };
    externalModelCatalog = {};
    if (!silent) {
      logEvent(`External model aliases unavailable: ${error.message}`);
    }
  } finally {
    refreshExternalModelInputUi({ syncValue: defaultModelsChanged });
  }
}

async function saveExternalDefaultModel(providerId, modelValue, options = {}) {
  const silent = Boolean(options.silent);
  const provider = normalizeExternalProviderId(providerId);
  const normalizedModel = normalizeExternalDefaultModelValue(modelValue);
  const currentDefault = getExternalDefaultModel(provider);
  if (currentDefault === normalizedModel) {
    return false;
  }
  const data = await apiPost("/api/providers/model-settings/default", {
    provider,
    model: normalizedModel
  });
  applySettingsUi(data.settings || {});
  if (data.modelSettings?.catalog && typeof data.modelSettings.catalog === "object") {
    externalModelCatalog = {
      ...externalModelCatalog,
      [provider]: data.modelSettings.catalog
    };
  }
  if (data.modelSettings?.observedPrune && typeof data.modelSettings.observedPrune === "object") {
    applyExternalObservedPruneRuntimeSnapshot(data.modelSettings.observedPrune);
  }
  refreshExternalModelInputUi({ syncValue: true });
  if (!silent) {
    logEvent(
      normalizedModel
        ? `Saved default model for ${provider}: ${data.model || normalizedModel}`
        : `Cleared default model for ${provider}.`
    );
  }
  return true;
}

async function clearObservedExternalModels(providerId, options = {}) {
  const silent = Boolean(options.silent);
  const provider = String(providerId || "").trim() || "all";
  const data = await apiPost("/api/providers/model-settings/observed/clear", {
    provider
  });
  if (!silent) {
    logEvent(`Observed external models cleared for ${data.cleared || provider}.`);
  }
  if (data.modelSettings?.observedPrune && typeof data.modelSettings.observedPrune === "object") {
    applyExternalObservedPruneRuntimeSnapshot(data.modelSettings.observedPrune);
  }
  await refreshExternalModelAliases({ silent: true });
  refreshExternalModelInputUi({ syncValue: true });
  return data;
}

async function pruneObservedExternalModels(providerId, maxAgeDays, options = {}) {
  const silent = Boolean(options.silent);
  const provider = String(providerId || "").trim() || "all";
  const days = Number.isFinite(Number(maxAgeDays))
    ? Math.max(1, Math.min(3650, Math.round(Number(maxAgeDays))))
    : 30;
  const data = await apiPost("/api/providers/model-settings/observed/prune", {
    provider,
    maxAgeDays: days
  });
  if (!silent) {
    const removed = Number(data.removed || 0);
    logEvent(`Pruned observed models for ${data.target || provider}: removed=${removed}, days=${days}.`);
  }
  if (data.modelSettings?.observedPrune && typeof data.modelSettings.observedPrune === "object") {
    applyExternalObservedPruneRuntimeSnapshot(data.modelSettings.observedPrune);
  }
  await refreshExternalModelAliases({ silent: true });
  refreshExternalModelInputUi({ syncValue: true });
  return data;
}

async function showExternalModelSettings(providerId = "") {
  const provider = normalizeExternalProviderId(providerId || externalProviderSelect?.value || "");
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : "";
  const data = await request(`/api/providers/model-settings${query}`);
  if (externalOutput) {
    externalOutput.textContent = provider
      ? `Loaded external model settings for ${provider}.`
      : "Loaded external model settings.";
  }
  if (data.observedPrune && typeof data.observedPrune === "object") {
    applyExternalObservedPruneRuntimeSnapshot(data.observedPrune);
  }
  pushMessage(
    "brain",
    JSON.stringify(data, null, 2),
    provider ? `Model Settings (${provider})` : "Model Settings"
  );
  return data;
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
  if (companyHint) {
    companyHint.textContent = allowExternalPosting
      ? "External posting is ENABLED. Use with caution."
      : "External posting is DISABLED (recommended).";
  }

  const nextExternalDefaultModels = normalizeExternalDefaultModelsMap(settings.externalDefaultModels);
  const nextExternalDefaultModelsRevision = serializeExternalDefaultModelsMap(nextExternalDefaultModels);
  const externalDefaultsChanged = nextExternalDefaultModelsRevision !== externalDefaultModelsRevision;
  externalDefaultModels = nextExternalDefaultModels;
  externalDefaultModelsRevision = nextExternalDefaultModelsRevision;
  refreshExternalModelInputUi({ syncValue: externalDefaultsChanged });

  externalObservedPruneRuntime.enabled = Boolean(
    settings.externalObservedPruneEnabled ?? externalObservedPruneRuntime.enabled
  );
  externalObservedPruneRuntime.maxAgeDays = normalizeExternalObservedPruneDays(
    settings.externalObservedPruneMaxAgeDays,
    externalObservedPruneRuntime.maxAgeDays
  );
  externalObservedPruneRuntime.dailyHourLocal = normalizeExternalObservedPruneHour(
    settings.externalObservedPruneDailyHourLocal,
    externalObservedPruneRuntime.dailyHourLocal
  );
  if (externalObservedAutoPruneEnabledToggle) {
    externalObservedAutoPruneEnabledToggle.checked = externalObservedPruneRuntime.enabled;
  }
  if (externalObservedAutoPruneDaysInput) {
    externalObservedAutoPruneDaysInput.value = String(externalObservedPruneRuntime.maxAgeDays);
  }
  if (externalObservedAutoPruneHourInput) {
    externalObservedAutoPruneHourInput.value = String(externalObservedPruneRuntime.dailyHourLocal);
  }
  renderExternalObservedPruneStatus();

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
    applyExternalObservedPruneRuntimeSnapshot(data.externalObservedPrune || {});
    renderAgentColony(data);
    healthBadge.textContent = `${codex} | ${openclaw} | ${external} | ${chrome} | ${pad} | Stealth:${stealthMode ? "ON" : "OFF"} | A:${approvalMode} | C:${costMode} | WS:${codexWebSearch ? "ON" : "OFF"} | O:${openclawMode} | ${guardian} | W:${memoryWindowTurns} | ${queue} | ${memory} | ${tasks} | ${approvals} | ${vault}`;
  } catch (_error) {
    renderAgentColony(null);
    healthBadge.textContent = "Health check unavailable";
  }
}

function formatLocalTimestamp(value) {
  const ms = Date.parse(String(value || ""));
  if (!Number.isFinite(ms)) {
    return "n/a";
  }
  return new Date(ms).toLocaleString();
}

function formatAgeFromSeconds(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) {
    return "n/a";
  }
  if (value < 60) {
    return `${Math.round(value)}s`;
  }
  if (value < 3600) {
    return `${Math.max(1, Math.round(value / 60))}m`;
  }
  if (value < 86400) {
    return `${Math.max(1, Math.round(value / 3600))}h`;
  }
  return `${Math.max(1, Math.round(value / 86400))}d`;
}

function normalizeAgentCardRows(agents = []) {
  const rows = [];
  const byId = Object.create(null);
  for (const raw of Array.isArray(agents) ? agents : []) {
    const id = String(raw?.id || "").trim().toLowerCase();
    if (!id) continue;
    byId[id] = raw;
  }
  for (const id of AGENT_DASHBOARD_ORDER) {
    rows.push(byId[id] || { id });
    delete byId[id];
  }
  for (const id of Object.keys(byId)) {
    rows.push(byId[id]);
  }
  return rows;
}

function renderAgentColony(healthData) {
  if (!colonyGrid || !colonySummary || !colonyUpdatedAt || !colonyDashboardCard) {
    return;
  }

  const colony = healthData && typeof healthData === "object" && healthData.agentColony && typeof healthData.agentColony === "object"
    ? healthData.agentColony
    : {};
  const rows = normalizeAgentCardRows(colony.agents);

  colonyGrid.innerHTML = "";
  for (const row of rows) {
    const id = String(row?.id || "").trim().toLowerCase();
    if (!id) continue;
    const fallback = AGENT_FALLBACK_META[id] || { name: id, role: "Agent", icon: String(id || "?").slice(0, 1).toUpperCase() };
    const name = String(row?.name || fallback.name || id).trim() || id;
    const role = String(row?.role || fallback.role || "Agent").trim() || "Agent";
    const icon = String(row?.icon || fallback.icon || name.slice(0, 1) || "?").toUpperCase().slice(0, 2);
    const running = Boolean(row?.running);
    const rawState = String(row?.state || (running ? "active" : "offline")).trim().toLowerCase();
    const state = rawState === "active" || rawState === "idle" ? rawState : "offline";
    const pid = Number(row?.pid || 0);
    const lastSeenSeconds = Number(row?.lastSeenSeconds);
    const seenLabel = Number.isFinite(lastSeenSeconds) ? formatAgeFromSeconds(lastSeenSeconds) : "n/a";

    const tile = document.createElement("article");
    tile.className = `agent-tile is-${state}`;
    tile.setAttribute("data-agent-id", id);
    tile.title = `${name} | ${role} | pid=${Number.isFinite(pid) && pid > 0 ? pid : "n/a"} | seen=${seenLabel}`;

    const iconWrap = document.createElement("div");
    iconWrap.className = "agent-icon";
    iconWrap.textContent = icon;

    const copy = document.createElement("div");
    copy.className = "agent-copy";

    const title = document.createElement("div");
    title.className = "agent-name";
    title.textContent = name;

    const meta = document.createElement("div");
    meta.className = "agent-meta";
    meta.textContent = role;

    const status = document.createElement("div");
    status.className = "agent-state";
    status.textContent = `${state.toUpperCase()} | seen ${seenLabel}`;

    copy.appendChild(title);
    copy.appendChild(meta);
    copy.appendChild(status);
    tile.appendChild(iconWrap);
    tile.appendChild(copy);
    colonyGrid.appendChild(tile);
  }

  const counts = colony && typeof colony.counts === "object" ? colony.counts : {};
  const activeCount = Number.isFinite(Number(counts.active))
    ? Number(counts.active)
    : rows.filter((row) => String(row?.state || "").toLowerCase() === "active").length;
  const totalCount = Number.isFinite(Number(counts.total))
    ? Number(counts.total)
    : rows.length;
  const queueRunning = Number(healthData?.queue?.running || 0);
  const queueQueued = Number(healthData?.queue?.queued || 0);
  const relayOnline = Boolean(colony?.relay?.running);
  const tunnelOnline = Boolean(colony?.tunnel?.running);
  const updatedAt = String(colony?.updatedAt || "").trim();
  colonySummary.textContent = `Active ${activeCount}/${Math.max(totalCount, 0)} | Queue R:${queueRunning} Q:${queueQueued} | Relay:${relayOnline ? "ON" : "OFF"} | Tunnel:${tunnelOnline ? "ON" : "OFF"}`;
  colonyUpdatedAt.textContent = `Updated: ${formatLocalTimestamp(updatedAt || new Date().toISOString())}`;
}

function shortHash(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "-";
  }
  return raw.length > 14 ? `${raw.slice(0, 14)}...` : raw;
}

function readGatewayAuditLimit() {
  const parsed = Number(gatewayAuditLimitInput?.value || 15);
  const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(100, Math.round(parsed))) : 15;
  if (gatewayAuditLimitInput) {
    gatewayAuditLimitInput.value = String(limit);
  }
  return limit;
}

function readGatewayAuditType() {
  const value = String(gatewayAuditTypeSelect?.value || "").trim();
  return value;
}

function renderGatewayAuditEvents(events = []) {
  if (!gatewayAuditEvents) {
    return;
  }
  gatewayAuditEvents.innerHTML = "";
  if (!Array.isArray(events) || events.length < 1) {
    const row = document.createElement("div");
    row.textContent = "No audit events returned.";
    gatewayAuditEvents.appendChild(row);
    return;
  }
  for (const event of events) {
    const row = document.createElement("div");
    const at = formatLocalTimestamp(event?.at);
    const type = String(event?.type || "event");
    const actor = String(event?.actor || "unknown");
    const hash = shortHash(event?.hash);
    row.textContent = `${at} | ${type} | actor=${actor} | hash=${hash}`;
    gatewayAuditEvents.appendChild(row);
  }
}

function renderGatewayReadinessHints(actions = []) {
  if (!gatewayReadinessHints) {
    return;
  }
  gatewayReadinessHints.innerHTML = "";
  const list = Array.isArray(actions) ? actions : [];
  if (list.length < 1) {
    const row = document.createElement("div");
    row.textContent = "Readiness recommendations appear here after running a drill.";
    gatewayReadinessHints.appendChild(row);
    return;
  }
  for (const action of list) {
    const row = document.createElement("div");
    row.textContent = `- ${String(action || "")}`;
    gatewayReadinessHints.appendChild(row);
  }
}

async function refreshGatewayAuditPanel(options = {}) {
  if (!gatewayAuditStatus || !gatewayAuthorityStatus || !gatewayAuditEvents) {
    return;
  }
  const silent = Boolean(options.silent);
  const limit = readGatewayAuditLimit();
  const type = readGatewayAuditType();
  try {
    const [authorityData, statusData] = await Promise.all([
      request("/api/gateway/authority/status"),
      request("/api/gateway/audit/status")
    ]);

    const query = new URLSearchParams();
    query.set("limit", String(limit));
    if (type) {
      query.set("type", type);
    }
    const eventsData = await request(`/api/gateway/audit/events?${query.toString()}`);
    const authority = authorityData.authority || {};
    const readiness = authorityData.readiness || {};
    const audit = statusData.audit || {};
    const integrity = audit.integrity || {};
    const gateLocked = Boolean(audit.gateLocked);
    const gateReason = String(audit.gateReason || "").trim();
    const gateLabel = gateLocked ? "LOCKED" : "OPEN";
    const readinessOk = Boolean(readiness.ok);
    const readinessLabel = readinessOk ? "READY" : "BLOCKED";
    const readinessReason = Array.isArray(readiness.blockingReasons) && readiness.blockingReasons.length > 0
      ? ` (${String(readiness.blockingReasons[0] || "").slice(0, 120)})`
      : "";

    gatewayAuthorityStatus.textContent = `Authority: ${String(authority.mode || "unknown")} | Handover ${readinessLabel}${readinessReason} | Updated ${formatLocalTimestamp(authority.updatedAt)} by ${String(authority.updatedBy || "unknown")}`;
    gatewayAuditStatus.textContent = `Audit: events=${Number(audit.totalEvents || 0)} | integrity=${integrity.ok ? "OK" : "FAIL"} | gate=${gateLabel}${gateLocked && gateReason ? ` (${gateReason})` : ""} | checked=${formatLocalTimestamp(integrity.checkedAt)} | hash=${shortHash(audit.lastHash)}`;
    renderGatewayAuditEvents(eventsData.events || []);
  } catch (error) {
    gatewayAuthorityStatus.textContent = "Authority: unavailable";
    gatewayAuditStatus.textContent = `Audit unavailable: ${error.message}`;
    renderGatewayAuditEvents([]);
    if (!silent) {
      logEvent(`Gateway audit refresh failed: ${error.message}`);
    }
  }
}

async function verifyGatewayAuditChain() {
  if (!gatewayAuditStatus) {
    return;
  }
  try {
    gatewayAuditStatus.textContent = "Audit: verifying chain...";
    const data = await apiPost("/api/gateway/audit/verify", {});
    const result = data.result || {};
    const ok = Boolean(result.ok);
    gatewayAuditStatus.textContent = `Audit verify: ${ok ? "OK" : "FAIL"} | errors=${Number(result.errorCount || 0)} | checked=${formatLocalTimestamp(result.checkedAt)} | hash=${shortHash(result.lastHash)}`;
    logEvent(`Gateway audit verify ${ok ? "passed" : "failed"} (errors=${Number(result.errorCount || 0)}).`);
    refreshGatewayAuditPanel({ silent: true });
  } catch (error) {
    gatewayAuditStatus.textContent = `Audit verify failed: ${error.message}`;
    logEvent(`Gateway audit verify failed: ${error.message}`);
  }
}

async function runGatewayReadinessDrill() {
  if (!gatewayReadinessDrillOutput) {
    return;
  }
  try {
    gatewayReadinessDrillOutput.textContent = "Running readiness drill...";
    const data = await apiPost("/api/gateway/authority/readiness/drill", {
      targetMode: "asolaria_primary"
    });
    const drill = data.drill || {};
    const readiness = drill.readiness || {};
    const blockingReasons = Array.isArray(readiness.blockingReasons) ? readiness.blockingReasons : [];
    const recommended = Array.isArray(drill.recommendedActions) ? drill.recommendedActions : [];
    const fallbackHints = blockingReasons.length > 0
      ? blockingReasons.map((reason) => `Resolve: ${String(reason || "").trim()}`)
      : [];
    const hintList = recommended.length > 0 ? recommended : fallbackHints;
    const reasonText = blockingReasons.length > 0 ? ` | reason=${String(blockingReasons[0] || "").slice(0, 140)}` : "";
    gatewayReadinessDrillOutput.textContent = `Drill ${drill.ok ? "PASS" : "FAIL"} | target=${String(drill.targetMode || "asolaria_primary")} | finished=${formatLocalTimestamp(drill.finishedAt)}${reasonText}`;
    renderGatewayReadinessHints(hintList);
    logEvent(`Gateway readiness drill ${drill.ok ? "passed" : "failed"} for ${String(drill.targetMode || "asolaria_primary")}.`);
    refreshGatewayAuditPanel({ silent: true });
  } catch (error) {
    gatewayReadinessDrillOutput.textContent = `Readiness drill failed: ${error.message}`;
    renderGatewayReadinessHints([
      "Verify gateway service is running and token auth is configured.",
      "Check Gateway Audit panel status and retry the drill."
    ]);
    logEvent(`Gateway readiness drill failed: ${error.message}`);
  }
}

async function runGatewayHeartbeat() {
  if (!gatewayReadinessDrillOutput) {
    return;
  }
  try {
    gatewayReadinessDrillOutput.textContent = "Running gateway heartbeat...";
    const data = await apiPost("/api/gateway/heartbeat/run", {});
    const result = data.result || {};
    const checks = Array.isArray(result.checks) ? result.checks : [];
    const failedChecks = checks.filter((check) => !check?.ok);
    const finishedAt = result.at || data.heartbeat?.lastRunAt || "";
    gatewayReadinessDrillOutput.textContent = `Heartbeat ${result.ok ? "OK" : "DEGRADED"} | checks=${checks.length} | failed=${failedChecks.length} | finished=${formatLocalTimestamp(finishedAt)}`;
    if (result.ok) {
      renderGatewayReadinessHints(["Heartbeat acknowledged as HEARTBEAT_OK."]);
    } else if (failedChecks.length > 0) {
      renderGatewayReadinessHints(
        failedChecks.slice(0, 6).map((item) => {
          const url = String(item?.url || "unknown target");
          return `Recover dependency: ${url}`;
        })
      );
    }
    logEvent(`Gateway heartbeat run ${result.ok ? "passed" : "degraded"} (failed=${failedChecks.length}).`);
    refreshGatewayAuditPanel({ silent: true });
  } catch (error) {
    gatewayReadinessDrillOutput.textContent = `Heartbeat run failed: ${error.message}`;
    logEvent(`Gateway heartbeat run failed: ${error.message}`);
  }
}

async function startGatewaySandboxRemediation() {
  if (!gatewayReadinessDrillOutput) {
    return;
  }
  try {
    gatewayReadinessDrillOutput.textContent = "Starting sandbox manager...";
    const data = await apiPost("/api/gateway/remediation/start-sandbox", {});
    const wait = data.wait || {};
    const health = data.health || {};
    const processInfo = data.process || {};
    const statusLabel = data.alreadyRunning
      ? "already running"
      : (data.ok ? "started" : "starting");
    const finishedAt = health?.data?.time || "";
    gatewayReadinessDrillOutput.textContent = `Sandbox remediation ${statusLabel} | health=${health.ok ? "OK" : "PENDING"} | attempts=${Number(wait.attempts || 0)} | finished=${formatLocalTimestamp(finishedAt)}`;

    const hints = [];
    if (health.ok) {
      hints.push("Sandbox manager health is reachable.");
      hints.push("Run Readiness Drill to confirm handover blockers are cleared.");
    } else {
      hints.push("Sandbox startup is still pending. Wait a few seconds and run Readiness Drill again.");
    }
    if (processInfo?.lastLogFile) {
      hints.push(`Sandbox log: ${String(processInfo.lastLogFile)}`);
    }
    renderGatewayReadinessHints(hints);
    logEvent(`Sandbox remediation ${statusLabel}; process pid=${processInfo?.pid || "n/a"}.`);
    refreshGatewayAuditPanel({ silent: true });
  } catch (error) {
    gatewayReadinessDrillOutput.textContent = `Sandbox remediation failed: ${error.message}`;
    logEvent(`Sandbox remediation failed: ${error.message}`);
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
  const scope = getActiveProjectScope();
  if (scope?.id && scope.id !== "all") {
    params.set("projectScope", String(scope.id));
  }
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
    const projectScope = data.projectScope && typeof data.projectScope === "object"
      ? data.projectScope
      : {};
    const scopeLabel = String(projectScope.label || getActiveProjectScope().label || "All Projects");
    const tasks = Array.isArray(ledger.tasks) ? ledger.tasks : [];
    const events = Array.isArray(ledger.events) ? ledger.events : [];
    const totalTasks = Number.isFinite(Number(summary.totalTasks)) ? Number(summary.totalTasks) : 0;
    const openTasks = Number.isFinite(Number(summary.openTasks)) ? Number(summary.openTasks) : 0;
    const archivedTasks = Number.isFinite(Number(summary.archivedTasks)) ? Number(summary.archivedTasks) : 0;
    const eventsCount = Number.isFinite(Number(summary.eventsCount)) ? Number(summary.eventsCount) : 0;

    taskLedgerStats.textContent = `Scope: ${scopeLabel} | Tasks: ${totalTasks} | Open: ${openTasks} | Archived: ${archivedTasks} | Events: ${eventsCount}`;
    renderTaskLedgerTasks(tasks);
    renderTaskLedgerEvents(events);
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
  const scope = getActiveProjectScope();
  const marker = String(scope.marker || "").trim();
  let scopedTitle = title;
  if (marker) {
    if (scopedTitle) {
      if (!scopedTitle.toUpperCase().includes(marker.toUpperCase())) {
        scopedTitle = `${marker} ${scopedTitle}`;
      }
    } else {
      scopedTitle = `${marker} Task`;
    }
  }
  const scopedDescription = description || (marker ? `Project scope: ${scope.label}` : "");
  const priority = String(taskLedgerCreatePriority?.value || "normal");
  const scopedProjectId = scope?.id && scope.id !== "all" ? String(scope.id) : "";
  const data = await apiPost("/api/task-ledger/tasks", {
    title: scopedTitle,
    description: scopedDescription,
    priority,
    projectScope: scopedProjectId,
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

async function queueExternalProvider(provider, prompt, options = {}) {
  if (!externalOutput) {
    return;
  }

  const providerId = normalizeExternalProviderId(provider);
  const model = normalizeExternalDefaultModelValue(options.model || "");
  externalOutput.textContent = model ? `Queued ${providerId} (${model})...` : `Queued ${providerId}...`;
  const payload = { provider: providerId, prompt };
  if (model) {
    payload.model = model;
  }
  const data = await apiPost("/api/providers/external/run", payload);
  const jobId = data.job?.id;
  if (!jobId) {
    externalOutput.textContent = "External provider queued with no job id.";
    return;
  }

  logEvent(`External provider queued: ${providerId} (${jobId})`);
  externalOutput.textContent = `Tracking ${providerId} job: ${jobId}`;
  trackJob(jobId, {
    onUpdate: (job) => {
      const jobModel = String(job?.result?.model || model || "").trim();
      externalOutput.textContent = `${providerId}${jobModel ? ` (${jobModel})` : ""} job ${job.status}`;
    },
    onCompleted: (job) => {
      const jobModel = String(job?.result?.model || model || "").trim();
      externalOutput.textContent = `${providerId}${jobModel ? ` (${jobModel})` : ""} completed.`;
      pushMessage("brain", formatJobResult(job), `${providerId}${jobModel ? `/${jobModel}` : ""} (${job.id})`);
      refreshHealth();
    },
    onFailed: (job) => {
      externalOutput.textContent = `${providerId} failed: ${job.error || "Unknown error"}`;
      logEvent(`External provider failed: ${job.error || "Unknown error"}`);
      refreshHealth();
    }
  });
}

async function showCompanyAccountMasked() {
  const data = await request("/api/company/primary-signin");
  const account = data.account || null;
  const vault = data.vault || null;
  const text = JSON.stringify({ account, vault }, null, 2);
  if (companyAccountOutput) {
    companyAccountOutput.textContent = account
      ? `Account loaded (${account.status || "draft"}).`
      : "No company primary sign-in profile yet.";
  }
  pushMessage("brain", text, "Company Account");
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

if (openPhoneModeBtn) {
  openPhoneModeBtn.addEventListener("click", () => {
    const popup = window.open("/phone-mode.html", "_blank", "noopener");
    if (!popup) {
      logEvent("Phone mode popup blocked by browser.");
      return;
    }
    logEvent("Opened Asolaria phone mode.");
  });
}

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

if (gatewayAuditRefreshBtn) {
  gatewayAuditRefreshBtn.addEventListener("click", () => {
    refreshGatewayAuditPanel();
  });
}

if (gatewayAuditVerifyBtn) {
  gatewayAuditVerifyBtn.addEventListener("click", () => {
    verifyGatewayAuditChain();
  });
}

if (gatewayReadinessDrillBtn) {
  gatewayReadinessDrillBtn.addEventListener("click", () => {
    runGatewayReadinessDrill();
  });
}

if (gatewayHeartbeatRunBtn) {
  gatewayHeartbeatRunBtn.addEventListener("click", () => {
    runGatewayHeartbeat();
  });
}

if (gatewayStartSandboxBtn) {
  gatewayStartSandboxBtn.addEventListener("click", () => {
    startGatewaySandboxRemediation();
  });
}

if (gatewayAuditTypeSelect) {
  gatewayAuditTypeSelect.addEventListener("change", () => {
    refreshGatewayAuditPanel({ silent: true });
  });
}

if (railFilter) {
  railFilter.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest(".rail-filter-btn");
    if (!button) {
      return;
    }
    const group = String(button.dataset.group || "all").trim().toLowerCase() || "all";
    applyActionGroupFilter(group);
  });
}

if (projectNav) {
  projectNav.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest(".project-pill");
    if (!button) {
      return;
    }
    const scopeId = String(button.dataset.project || "all");
    applyProjectScope(scopeId, { syncGroupFilter: true, refreshLedger: true });
  });
}

if (projectFolderSearch) {
  projectFolderSearch.addEventListener("input", () => {
    renderProjectFolderTree(activeProjectScope);
  });
}

if (projectRefreshBtn) {
  projectRefreshBtn.addEventListener("click", async () => {
    try {
      await refreshProjectScopes({
        preferredScopeId: activeProjectScope,
        syncGroupFilter: true,
        refreshLedger: true
      });
    } catch (error) {
      setProjectAdminMessage(`Refresh failed: ${error.message}`, true);
      logEvent(`Project refresh failed: ${error.message}`);
    }
  });
}

if (projectCreateBtn) {
  projectCreateBtn.addEventListener("click", async () => {
    try {
      await createProjectFromUi();
    } catch (error) {
      setProjectAdminMessage(`Create failed: ${error.message}`, true);
      logEvent(`Project create failed: ${error.message}`);
    }
  });
}

if (projectUpdateBtn) {
  projectUpdateBtn.addEventListener("click", async () => {
    try {
      await updateSelectedProjectFromUi();
    } catch (error) {
      setProjectAdminMessage(`Update failed: ${error.message}`, true);
      logEvent(`Project update failed: ${error.message}`);
    }
  });
}

if (projectDeleteBtn) {
  projectDeleteBtn.addEventListener("click", async () => {
    try {
      await deleteSelectedProjectFromUi();
    } catch (error) {
      setProjectAdminMessage(`Delete failed: ${error.message}`, true);
      logEvent(`Project delete failed: ${error.message}`);
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

if (anthropicStatusBtn) {
  anthropicStatusBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("anthropic status", "Anthropic Status");
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Anthropic status failed: ${error.message}`);
    }
  });
}

if (geminiCliStatusBtn) {
  geminiCliStatusBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("gemini cli status", "Gemini CLI Status");
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Gemini CLI status failed: ${error.message}`);
    }
  });
}

if (externalProviderSelect) {
  externalProviderSelect.addEventListener("change", () => {
    refreshExternalModelInputUi({ syncValue: true, forceValue: true });
  });
}

if (externalSaveDefaultBtn) {
  externalSaveDefaultBtn.addEventListener("click", async () => {
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    const model = normalizeExternalDefaultModelValue(externalModelInput?.value || "");
    try {
      await saveExternalDefaultModel(provider, model);
      if (externalOutput) {
        externalOutput.textContent = model
          ? `Default model saved for ${provider}: ${model}`
          : `Default model cleared for ${provider}.`;
      }
      refreshHealth();
      await refreshExternalModelAliases({ silent: true });
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Save default model failed: ${error.message}`);
    }
  });
}

if (externalClearDefaultBtn) {
  externalClearDefaultBtn.addEventListener("click", async () => {
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    try {
      await saveExternalDefaultModel(provider, "");
      if (externalOutput) {
        externalOutput.textContent = `Default model cleared for ${provider}.`;
      }
      if (externalModelInput) {
        externalModelInput.value = "";
      }
      refreshHealth();
      await refreshExternalModelAliases({ silent: true });
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Clear default model failed: ${error.message}`);
    }
  });
}

if (externalClearObservedBtn) {
  externalClearObservedBtn.addEventListener("click", async () => {
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    try {
      await clearObservedExternalModels(provider);
      if (externalOutput) {
        externalOutput.textContent = `Observed models cleared for ${provider}.`;
      }
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Clear observed models failed: ${error.message}`);
    }
  });
}

if (externalClearObservedAllBtn) {
  externalClearObservedAllBtn.addEventListener("click", async () => {
    try {
      await clearObservedExternalModels("all");
      if (externalOutput) {
        externalOutput.textContent = "Observed models cleared for all providers.";
      }
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Clear observed models (all) failed: ${error.message}`);
    }
  });
}

if (externalPruneObservedBtn) {
  externalPruneObservedBtn.addEventListener("click", async () => {
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    const maxAgeDays = readExternalObservedMaxAgeDays();
    try {
      const data = await pruneObservedExternalModels(provider, maxAgeDays);
      if (externalOutput) {
        externalOutput.textContent = `Observed models pruned for ${data.target || provider}: removed ${Number(data.removed || 0)} older than ${maxAgeDays} day(s).`;
      }
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Prune observed models failed: ${error.message}`);
    }
  });
}

if (externalSaveObservedPruneSettingsBtn) {
  externalSaveObservedPruneSettingsBtn.addEventListener("click", async () => {
    const enabled = Boolean(externalObservedAutoPruneEnabledToggle?.checked);
    const maxAgeDays = readExternalObservedAutoPruneDays();
    const dailyHourLocal = readExternalObservedAutoPruneHour();
    try {
      const data = await apiPost("/api/settings", {
        externalObservedPruneEnabled: enabled,
        externalObservedPruneMaxAgeDays: maxAgeDays,
        externalObservedPruneDailyHourLocal: dailyHourLocal
      });
      applySettingsUi(data.settings || {});
      await refreshHealth();
      const hourText = `${String(dailyHourLocal).padStart(2, "0")}:00`;
      if (externalOutput) {
        externalOutput.textContent = `Auto-prune ${enabled ? "enabled" : "disabled"} (window ${maxAgeDays} day(s), hour ${hourText} local).`;
      }
      logEvent(`Observed model auto-prune saved: enabled=${enabled}, days=${maxAgeDays}, hour=${dailyHourLocal}.`);
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Save auto-prune settings failed: ${error.message}`);
    }
  });
}

if (externalModelStatusBtn) {
  externalModelStatusBtn.addEventListener("click", async () => {
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    try {
      await showExternalModelSettings(provider);
    } catch (error) {
      if (externalOutput) externalOutput.textContent = `Error: ${error.message}`;
      logEvent(`Model settings lookup failed: ${error.message}`);
    }
  });
}

if (externalRunForm) {
  externalRunForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const provider = normalizeExternalProviderId(externalProviderSelect?.value || "");
    let model = normalizeExternalDefaultModelValue(externalModelInput?.value || "");
    if (!model) {
      model = getExternalDefaultModel(provider);
    }
    const prompt = String(externalPrompt?.value || "").trim();
    if (!provider || !prompt) {
      if (externalOutput) externalOutput.textContent = "Provider and prompt are required.";
      return;
    }

    try {
      if (externalModelInput) {
        externalModelInput.value = model;
      }
      try {
        await saveExternalDefaultModel(provider, model, { silent: true });
      } catch (error) {
        logEvent(`External model default save failed: ${error.message}`);
      }
      await queueExternalProvider(provider, prompt, { model });
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

if (companyMissionBtn) {
  companyMissionBtn.addEventListener("click", async () => {
    try {
      const data = await request("/api/company/mission");
      pushMessage("brain", data.mission || "No mission text.", "Company Mission");
      logEvent("Loaded Company mission policy.");
    } catch (error) {
      logEvent(`Company mission failed: ${error.message}`);
    }
  });
}

if (companyCreateAccountBtn) {
  companyCreateAccountBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/company/primary-signin/bootstrap", {
        displayName: "Asolaria"
      });
      const account = data.account || null;
      if (companyAccountOutput) {
        companyAccountOutput.textContent = account
          ? `AI account profile secured for ${account.usernameMasked || account.username || "Asolaria"}.`
          : "No account response.";
      }
      pushMessage("brain", JSON.stringify(account || {}, null, 2), "Company Account");
      refreshHealth();
    } catch (error) {
      if (companyAccountOutput) companyAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`Company account bootstrap failed: ${error.message}`);
    }
  });
}

if (companyShowAccountBtn) {
  companyShowAccountBtn.addEventListener("click", async () => {
    try {
      await showCompanyAccountMasked();
    } catch (error) {
      if (companyAccountOutput) companyAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`Company account status failed: ${error.message}`);
    }
  });
}

if (companyRevealAccountBtn) {
  companyRevealAccountBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/company/primary-signin/reveal", {
        confirm: true,
        confirmText: "I_UNDERSTAND_SECRET_REVEAL"
      });
      const account = data.account || {};
      if (companyAccountOutput) {
        companyAccountOutput.textContent = "Sensitive account data revealed in chat output.";
      }
      pushMessage("brain", JSON.stringify(account, null, 2), "Company Secret");
    } catch (error) {
      if (companyAccountOutput) companyAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`Company reveal failed: ${error.message}`);
    }
  });
}

if (companyMarkRegisteredBtn) {
  companyMarkRegisteredBtn.addEventListener("click", async () => {
    try {
      const data = await apiPost("/api/company/primary-signin/mark-registered", {
        notes: "Marked as registered via Asolaria UI."
      });
      const account = data.account || {};
      if (companyAccountOutput) {
        companyAccountOutput.textContent = `Company status updated to ${account.status || "registered"}.`;
      }
      pushMessage("brain", JSON.stringify(account, null, 2), "Company Account");
      refreshHealth();
    } catch (error) {
      if (companyAccountOutput) companyAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`Company mark-registered failed: ${error.message}`);
    }
  });
}

if (companyOpenSiteBtn) {
  companyOpenSiteBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("company open", "Company Portal");
    } catch (error) {
      if (companyAccountOutput) companyAccountOutput.textContent = `Error: ${error.message}`;
      logEvent(`Company open-site failed: ${error.message}`);
    }
  });
}

if (companyDraftBtn) {
  companyDraftBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("company draft post", "Company Draft");
    } catch (error) {
      logEvent(`Company draft failed: ${error.message}`);
    }
  });
}

if (companyDecideBtn) {
  companyDecideBtn.addEventListener("click", async () => {
    try {
      await queueChatCommand("company decide proceed", "Company Decision");
    } catch (error) {
      logEvent(`Company decision failed: ${error.message}`);
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
    const proceed = window.confirm("Clear memory turns now? A backup snapshot and notebook audit note will be created.");
    if (!proceed) {
      return;
    }
    try {
      const result = await apiDelete("/api/memory", {
        confirm: "APPROVE_MEMORY_CLEAR"
      });
      const backupPath = String(result?.memory?.backupPath || "").trim();
      if (backupPath) {
        logEvent(`Memory cleared. Backup saved: ${backupPath}`);
      } else {
        logEvent("Memory cleared.");
      }
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
let startupScope = "all";
try {
  startupScope = normalizeProjectScope(localStorage.getItem(PROJECT_SCOPE_STORAGE_KEY) || "all");
} catch {}
applyProjectScope(startupScope, { syncGroupFilter: true, refreshLedger: false });
renderGatewayReadinessHints([]);
renderExternalObservedPruneStatus();
refreshHealth();
refreshExternalModelAliases({ silent: true });
refreshMemory();
refreshSkillsList();
refreshProjectScopes({
  preferredScopeId: startupScope,
  syncGroupFilter: true,
  refreshLedger: true,
  silent: true
}).catch((error) => {
  setProjectAdminMessage(`Project catalog unavailable: ${error.message}`, true);
  logEvent(`Project catalog refresh failed: ${error.message}`);
  refreshTaskLedger({ silent: true });
});
refreshGatewayAuditPanel({ silent: true });
setInterval(refreshHealth, 7000);
setInterval(() => refreshExternalModelAliases({ silent: true }), 60000);
setInterval(refreshMemory, 12000);
setInterval(() => refreshTaskLedger({ silent: true }), 15000);
setInterval(() => refreshGatewayAuditPanel({ silent: true }), 20000);
