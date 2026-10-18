(function () {
  const liveState = document.getElementById("abacusLiveState");
  const accountPill = document.getElementById("abacusAccountPill");
  const tierPill = document.getElementById("abacusTierPill");
  const metricCards = document.getElementById("abacusMetricCards");
  const surfaceGrid = document.getElementById("abacusSurfaceGrid");
  const presetGrid = document.getElementById("abacusPresetGrid");
  const strategyGrid = document.getElementById("abacusStrategyGrid");
  const knownIssues = document.getElementById("abacusKnownIssues");
  const packetList = document.getElementById("abacusPacketList");
  const packetsEmpty = document.getElementById("abacusPacketsEmpty");
  const detailGrid = document.getElementById("abacusPacketDetailGrid");
  const detailEmpty = document.getElementById("abacusPacketDetailEmpty");
  const statusMessage = document.getElementById("abacusStatusMessage");

  const openBrowserBtn = document.getElementById("abacusOpenBrowserBtn");
  const openDesktopBtn = document.getElementById("abacusOpenDesktopBtn");
  const probeMcpBtn = document.getElementById("abacusProbeMcpBtn");
  const probeReadyBtn = document.getElementById("abacusProbeReadyBtn");
  const refreshBtn = document.getElementById("abacusRefreshBtn");

  const presetSelect = document.getElementById("abacusPresetSelect");
  const titleInput = document.getElementById("abacusTitleInput");
  const objectiveInput = document.getElementById("abacusObjectiveInput");
  const instructionsInput = document.getElementById("abacusInstructionsInput");
  const pathsInput = document.getElementById("abacusPathsInput");
  const artifactsInput = document.getElementById("abacusArtifactsInput");
  const surfaceHintsInput = document.getElementById("abacusSurfaceHintsInput");
  const taskIdInput = document.getElementById("abacusTaskIdInput");
  const workerModeInput = document.getElementById("abacusWorkerModeInput");
  const launchDesktopToggle = document.getElementById("abacusLaunchDesktopToggle");
  const createPacketBtn = document.getElementById("abacusCreatePacketBtn");
  const resetDraftBtn = document.getElementById("abacusResetDraftBtn");

  const openPacketBtn = document.getElementById("abacusOpenPacketBtn");
  const scanPacketBtn = document.getElementById("abacusScanPacketBtn");
  const importPacketBtn = document.getElementById("abacusImportPacketBtn");

  const state = {
    status: null,
    strategy: null,
    presets: [],
    packets: [],
    selectedPacketId: "",
    busy: false
  };

  function safeText(value, fallback = "") {
    const text = value === undefined || value === null ? "" : String(value).trim();
    return text || fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function splitLines(value) {
    return safeText(value)
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function formatTime(value) {
    const text = safeText(value);
    if (!text) return "unknown";
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toLocaleString();
  }

  function formatBoolean(value) {
    return value ? "yes" : "no";
  }

  function setStatusMessage(text, tone = "") {
    statusMessage.textContent = safeText(text, "Ready.");
    statusMessage.className = "abacus-status-message";
    if (tone) {
      statusMessage.classList.add(`is-${tone}`);
    }
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json"
      },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(safeText(data?.error || data?.message || response.statusText, "request_failed"));
    }
    return data;
  }

  async function postJson(url, body = {}) {
    return fetchJson(url, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  function renderMetricCards() {
    const status = state.status || {};
    const desktop = status.surfaces?.desktop || {};
    const listener = status.surfaces?.listener || {};
    const workerLane = status.workerLane || {};
    const probe = status.probeStatus?.byMode || {};
    const metrics = [
      ["Browser", status.capabilities?.browser?.ready ? "ready" : "not ready"],
      ["Desktop PIDs", String(asArray(desktop.running).length)],
      ["Listener", listener.installed ? (listener.running?.length ? "running" : "installed") : "missing"],
      ["CLI Tier", safeText(status.capabilities?.workerLane?.tier, "unknown")],
      ["Packets", String(Number(workerLane.totalPackets || 0) || 0)],
      ["MCP Probe", probe.mcp_list?.ok ? "ok" : "pending"]
    ];
    metricCards.innerHTML = metrics.map(([label, value]) => `
      <div class="abacus-metric">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(value)}</span>
      </div>
    `).join("");
  }

  function buildSurfaceCard(title, subtitle, detailRows, tone) {
    const chips = detailRows.map(([label, value]) => `<span class="abacus-chip">${escapeHtml(label)}: ${escapeHtml(value)}</span>`).join("");
    return `
      <div class="abacus-surface-card">
        <div class="abacus-pill-row">
          <span class="abacus-pill ${tone ? `is-${tone}` : ""}">${escapeHtml(title)}</span>
        </div>
        <p>${escapeHtml(subtitle)}</p>
        <div class="abacus-chip-row">${chips}</div>
      </div>
    `;
  }

  function renderSurfaceGrid() {
    const status = state.status || {};
    const desktop = status.surfaces?.desktop || {};
    const listener = status.surfaces?.listener || {};
    const cli = status.capabilities?.cli || {};
    surfaceGrid.innerHTML = [
      buildSurfaceCard(
        "Browser",
        status.capabilities?.browser?.authenticatedLikely
          ? "Managed browser profile looks authenticated."
          : "Managed browser profile is not clearly authenticated yet.",
        [
          ["profile", safeText(status.profile?.profileName, "unknown")],
          ["isolated", formatBoolean(status.browserMode === "managed_isolated")],
          ["cookies", formatBoolean(status.profile?.cookiesPresent)]
        ],
        status.capabilities?.browser?.ready ? "ok" : "warn"
      ),
      buildSurfaceCard(
        "Desktop",
        desktop.installed
          ? "Abacus desktop app is installed and available for packet work."
          : "Desktop app is not installed.",
        [
          ["running", String(asArray(desktop.running).length)],
          ["listening ports", String(asArray(desktop.listening).length)],
          ["cli", formatBoolean(desktop.cliExists)]
        ],
        desktop.installed ? (asArray(desktop.running).length > 0 ? "ok" : "warn") : "bad"
      ),
      buildSurfaceCard(
        "Listener",
        listener.installed
          ? "Listener surface is installed for voice/session work."
          : "Listener surface is not installed.",
        [
          ["installed", formatBoolean(listener.installed)],
          ["running", String(asArray(listener.running).length)],
          ["ports", String(asArray(listener.listening).length)]
        ],
        listener.installed ? (asArray(listener.running).length > 0 ? "ok" : "warn") : "bad"
      ),
      buildSurfaceCard(
        "CLI",
        cli.mcpReady
          ? "CLI can enumerate MCP servers, but print-mode still needs work."
          : "CLI is installed but not yet proven as a stable unattended worker.",
        [
          ["mcp", formatBoolean(cli.mcpReady)],
          ["print", formatBoolean(cli.printReady)],
          ["interactive fallback", formatBoolean(cli.interactiveFallbackDetected)],
          ["broken paths", formatBoolean(cli.brokenResourcePathsDetected)]
        ],
        cli.mcpReady ? "warn" : "bad"
      )
    ].join("");
  }

  function renderPresetSelect() {
    const current = presetSelect.value;
    presetSelect.innerHTML = '<option value="">custom</option>';
    for (const preset of state.presets) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = `${preset.title} (${preset.workerMode})`;
      presetSelect.appendChild(option);
    }
    if (current) {
      presetSelect.value = current;
    }
  }

  function renderStrategyGrid() {
    const strategy = state.strategy || {};
    strategyGrid.innerHTML = asArray(strategy.profiles).map((profile) => `
      <div class="abacus-preset-card">
        <h3>${escapeHtml(profile.title || profile.id)}</h3>
        <p>${escapeHtml(profile.bestFor || "")}</p>
        <div class="abacus-chip-row">
          <span class="abacus-chip">preferred: ${escapeHtml(profile.preferredSurface || "")}</span>
          <span class="abacus-chip">fallback: ${escapeHtml(profile.fallbackSurface || "")}</span>
          <span class="abacus-chip">cost: ${escapeHtml(profile.costProfile || "")}</span>
        </div>
        <div class="abacus-chip-row">
          ${profile.packetPresetId ? `<span class="abacus-chip">preset: ${escapeHtml(profile.packetPresetId)}</span>` : ""}
        </div>
        <p>${escapeHtml(profile.notes || "")}</p>
      </div>
    `).join("");
    knownIssues.innerHTML = asArray(strategy.knownIssues).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function renderPresetGrid() {
    presetGrid.innerHTML = state.presets.map((preset) => `
      <div class="abacus-preset-card">
        <h3>${escapeHtml(preset.title)}</h3>
        <p>${escapeHtml(preset.description || "")}</p>
        <div class="abacus-chip-row">
          <span class="abacus-chip">mode: ${escapeHtml(preset.workerMode || "desktop_packet")}</span>
          <span class="abacus-chip">sensitivity: ${escapeHtml(preset.sensitivity || "sanitized")}</span>
        </div>
        <div class="abacus-chip-row">
          ${asArray(preset.surfaceHints).map((item) => `<span class="abacus-chip">${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="abacus-button-row" style="margin-top: 12px;">
          <button class="abacus-button use-preset-btn" type="button" data-preset-id="${escapeHtmlAttr(preset.id)}">Use Preset</button>
        </div>
      </div>
    `).join("");
    for (const button of presetGrid.querySelectorAll(".use-preset-btn")) {
      button.addEventListener("click", () => {
        applyPreset(button.dataset.presetId || "");
      });
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeHtmlAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function getSelectedPacket() {
    return state.packets.find((item) => item.id === state.selectedPacketId) || null;
  }

  function renderPackets() {
    packetsEmpty.hidden = state.packets.length > 0;
    packetList.innerHTML = state.packets.map((packet) => `
      <li class="abacus-packet-item ${packet.id === state.selectedPacketId ? "is-selected" : ""}" data-packet-id="${escapeHtmlAttr(packet.id)}">
        <div class="abacus-packet-head">
          <h3>${escapeHtml(packet.title || packet.id)}</h3>
          <span class="abacus-pill ${packet.responseReady ? "is-ok" : "is-warn"}">${packet.responseReady ? "response ready" : "pending"}</span>
        </div>
        <p>${escapeHtml(packet.objective || "")}</p>
        <div class="abacus-chip-row">
          ${packet.presetId ? `<span class="abacus-chip">preset: ${escapeHtml(packet.presetId)}</span>` : ""}
          <span class="abacus-chip">mode: ${escapeHtml(packet.workerMode || "")}</span>
          ${asArray(packet.surfaceHints).map((item) => `<span class="abacus-chip">${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="abacus-packet-meta">
          <span>${escapeHtml(formatTime(packet.createdAt))}</span>
          <span>${escapeHtml(packet.sourceTaskId || "no task link")}</span>
        </div>
      </li>
    `).join("");
    for (const item of packetList.querySelectorAll(".abacus-packet-item")) {
      item.addEventListener("click", () => {
        state.selectedPacketId = item.dataset.packetId || "";
        renderPackets();
        renderSelectedPacket();
      });
    }
  }

  function renderSelectedPacket() {
    const packet = getSelectedPacket();
    const disabled = !packet;
    openPacketBtn.disabled = disabled;
    scanPacketBtn.disabled = disabled;
    importPacketBtn.disabled = disabled || !packet?.responseReady;
    detailEmpty.hidden = Boolean(packet);
    if (!packet) {
      detailGrid.innerHTML = "";
      return;
    }
    detailGrid.innerHTML = `
      <div class="abacus-detail-card">
        <strong>Metadata</strong>
        <pre>${escapeHtml(JSON.stringify({
          id: packet.id,
          presetId: packet.presetId || "",
          workerMode: packet.workerMode || "",
          surfaceHints: asArray(packet.surfaceHints),
          sensitivity: packet.sensitivity || "",
          sourceTaskId: packet.sourceTaskId || "",
          createdAt: packet.createdAt || "",
          responseReady: Boolean(packet.responseReady)
        }, null, 2))}</pre>
      </div>
      <div class="abacus-detail-card">
        <strong>Paths</strong>
        <pre>${escapeHtml(JSON.stringify({
          packetDir: packet.packetDir || "",
          promptPath: packet.promptPath || "",
          responsePath: packet.responsePath || "",
          artifactDir: packet.artifactDir || ""
        }, null, 2))}</pre>
      </div>
      <div class="abacus-detail-card">
        <strong>Response Preview</strong>
        <pre>${escapeHtml(packet.responsePreview || "No response detected yet.")}</pre>
      </div>
      <div class="abacus-detail-card">
        <strong>Artifacts</strong>
        <pre>${escapeHtml(JSON.stringify(asArray(packet.artifactFiles), null, 2))}</pre>
      </div>
    `;
  }

  function renderStatusHeader() {
    const status = state.status || {};
    const workerTier = safeText(status.capabilities?.workerLane?.tier, "unknown");
    const browserReady = Boolean(status.capabilities?.browser?.ready);
    liveState.textContent = browserReady ? "Worker Lane Live" : "Worker Lane Needs Attention";
    liveState.className = `abacus-pill ${browserReady ? "is-ok" : "is-warn"}`;
    accountPill.textContent = `Account: ${safeText(status.accountEmail, "unknown")}`;
    tierPill.textContent = `Tier: ${workerTier}`;
    tierPill.className = `abacus-pill ${workerTier.includes("limited") ? "is-warn" : "is-ok"}`;
  }

  function applyPreset(presetId) {
    const preset = state.presets.find((item) => item.id === presetId);
    presetSelect.value = presetId;
    if (!preset) {
      return;
    }
    if (!safeText(titleInput.value)) {
      titleInput.value = safeText(preset.title);
    }
    instructionsInput.value = safeText(preset.instructions);
    artifactsInput.value = asArray(preset.expectedArtifacts).join("\n");
    surfaceHintsInput.value = asArray(preset.surfaceHints).join("\n");
    workerModeInput.value = safeText(preset.workerMode);
    objectiveInput.focus();
    setStatusMessage(`Loaded preset ${preset.title}. Fill in the objective and create the packet.`, "ok");
  }

  function resetDraft() {
    presetSelect.value = "";
    titleInput.value = "";
    objectiveInput.value = "";
    instructionsInput.value = "";
    pathsInput.value = "";
    artifactsInput.value = "";
    surfaceHintsInput.value = "";
    taskIdInput.value = "";
    workerModeInput.value = "";
    launchDesktopToggle.checked = true;
  }

  async function loadStatus() {
    const data = await fetchJson("/api/integrations/abacus/status");
    state.status = data.status || {};
  }

  async function loadPresets() {
    const data = await fetchJson("/api/integrations/abacus/presets");
    state.presets = asArray(data.presets);
  }

  async function loadStrategy() {
    const data = await fetchJson("/api/integrations/abacus/strategy");
    state.strategy = data.strategy || {};
  }

  async function loadPackets() {
    const data = await fetchJson("/api/integrations/abacus/packets?limit=50");
    state.packets = asArray(data.packets?.items);
    if (!state.selectedPacketId && state.packets.length > 0) {
      state.selectedPacketId = state.packets[0].id;
    } else if (state.selectedPacketId && !state.packets.some((item) => item.id === state.selectedPacketId)) {
      state.selectedPacketId = state.packets.length > 0 ? state.packets[0].id : "";
    }
  }

  async function refreshAll(message) {
    try {
      setBusy(true);
      if (message) setStatusMessage(message);
      await Promise.all([loadStatus(), loadStrategy(), loadPresets(), loadPackets()]);
      renderStatusHeader();
      renderMetricCards();
      renderSurfaceGrid();
      renderStrategyGrid();
      renderPresetSelect();
      renderPresetGrid();
      renderPackets();
      renderSelectedPacket();
      setStatusMessage("Abacus worker state refreshed.", "ok");
    } catch (error) {
      setStatusMessage(String(error.message || error), "bad");
    } finally {
      setBusy(false);
    }
  }

  function setBusy(value) {
    state.busy = Boolean(value);
    const disabled = state.busy;
    openBrowserBtn.disabled = disabled;
    openDesktopBtn.disabled = disabled;
    probeMcpBtn.disabled = disabled;
    probeReadyBtn.disabled = disabled;
    refreshBtn.disabled = disabled;
    createPacketBtn.disabled = disabled;
    resetDraftBtn.disabled = disabled;
  }

  async function runQuickAction(action) {
    try {
      setBusy(true);
      setStatusMessage("Running action...");
      let result;
      if (action === "openBrowser") {
        result = await postJson("/api/integrations/abacus/open", {});
        setStatusMessage(`Opened managed browser surface${result.windowTarget ? ` in ${result.windowTarget}` : ""}.`, "ok");
      } else if (action === "openDesktop") {
        result = await postJson("/api/integrations/abacus/desktop/open", {});
        setStatusMessage("Opened Abacus desktop app.", "ok");
      } else if (action === "probeMcp") {
        result = await postJson("/api/integrations/abacus/cli/probe", { mode: "mcp_list" });
        setStatusMessage(result.probe?.ok ? "MCP list probe succeeded." : "MCP list probe failed.", result.probe?.ok ? "ok" : "warn");
      } else if (action === "probeReady") {
        result = await postJson("/api/integrations/abacus/cli/probe", { mode: "ready_json" });
        setStatusMessage(result.probe?.ok ? "Print-mode probe succeeded." : "Print-mode probe is still limited.", result.probe?.ok ? "ok" : "warn");
      }
      await refreshAll();
      return result;
    } catch (error) {
      setStatusMessage(String(error.message || error), "bad");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createPacket() {
    const objective = safeText(objectiveInput.value);
    if (!objective) {
      setStatusMessage("Objective is required.", "warn");
      objectiveInput.focus();
      return;
    }
    try {
      setBusy(true);
      setStatusMessage("Creating packet...");
      const body = {
        presetId: safeText(presetSelect.value),
        title: safeText(titleInput.value),
        objective,
        instructions: safeText(instructionsInput.value),
        allowedPaths: splitLines(pathsInput.value),
        expectedArtifacts: splitLines(artifactsInput.value),
        surfaceHints: splitLines(surfaceHintsInput.value),
        sourceTaskId: safeText(taskIdInput.value),
        workerMode: safeText(workerModeInput.value),
        launchDesktop: Boolean(launchDesktopToggle.checked)
      };
      const result = await postJson("/api/integrations/abacus/handoff", body);
      state.selectedPacketId = safeText(result?.handoff?.packet?.id);
      await refreshAll();
      setStatusMessage(`Created packet ${state.selectedPacketId || "successfully"}.`, "ok");
    } catch (error) {
      setStatusMessage(String(error.message || error), "bad");
    } finally {
      setBusy(false);
    }
  }

  async function openSelectedPacket() {
    const packet = getSelectedPacket();
    if (!packet) return;
    try {
      setBusy(true);
      await postJson(`/api/integrations/abacus/packets/${encodeURIComponent(packet.id)}/open`, {
        openFolder: true,
        openPrompt: true,
        openResponse: true
      });
      setStatusMessage(`Opened packet ${packet.id} in Abacus desktop.`, "ok");
    } catch (error) {
      setStatusMessage(String(error.message || error), "bad");
    } finally {
      setBusy(false);
    }
  }

  async function scanSelectedPacket() {
    const packet = getSelectedPacket();
    if (!packet) return;
    try {
      setBusy(true);
      const result = await postJson(`/api/integrations/abacus/packets/${encodeURIComponent(packet.id)}/scan`, {});
      const updated = result.packet || null;
      if (updated) {
        state.packets = state.packets.map((item) => item.id === updated.id ? updated : item);
      }
      renderPackets();
      renderSelectedPacket();
      setStatusMessage(updated?.responseReady ? `Response detected for ${packet.id}.` : `Packet ${packet.id} is still pending.`, updated?.responseReady ? "ok" : "warn");
    } catch (error) {
      setStatusMessage(String(error.message || error), "bad");
    } finally {
      setBusy(false);
    }
  }

  async function importSelectedPacket() {
    const packet = getSelectedPacket();
    if (!packet) return;
    try {
      setBusy(true);
      const result = await postJson(`/api/integrations/abacus/packets/${encodeURIComponent(packet.id)}/import`, {});
      setStatusMessage(`Imported packet ${packet.id} back into Asolaria.`, "ok");
      await refreshAll();
      if (result.packet) {
        state.selectedPacketId = result.packet.id;
      }
    } catch (error) {
      setStatusMessage(String(error.message || error), "bad");
    } finally {
      setBusy(false);
    }
  }

  presetSelect.addEventListener("change", () => applyPreset(presetSelect.value));
  resetDraftBtn.addEventListener("click", resetDraft);
  createPacketBtn.addEventListener("click", createPacket);
  openBrowserBtn.addEventListener("click", () => runQuickAction("openBrowser"));
  openDesktopBtn.addEventListener("click", () => runQuickAction("openDesktop"));
  probeMcpBtn.addEventListener("click", () => runQuickAction("probeMcp"));
  probeReadyBtn.addEventListener("click", () => runQuickAction("probeReady"));
  refreshBtn.addEventListener("click", () => refreshAll("Refreshing Abacus worker state..."));
  openPacketBtn.addEventListener("click", openSelectedPacket);
  scanPacketBtn.addEventListener("click", scanSelectedPacket);
  importPacketBtn.addEventListener("click", importSelectedPacket);

  refreshAll("Loading Abacus worker state...");
  window.setInterval(() => {
    if (!state.busy) {
      refreshAll();
    }
  }, 20000);
})();
