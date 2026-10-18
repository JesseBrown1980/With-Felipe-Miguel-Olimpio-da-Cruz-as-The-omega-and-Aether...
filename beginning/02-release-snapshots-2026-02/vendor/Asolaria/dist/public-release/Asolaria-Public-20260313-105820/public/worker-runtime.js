(function () {
  const livePill = document.getElementById("runtimeLivePill");
  const brainPill = document.getElementById("runtimeBrainPill");
  const colonyPill = document.getElementById("runtimeColonyPill");
  const symphonyPill = document.getElementById("runtimeSymphonyPill");
  const abacusPill = document.getElementById("runtimeAbacusPill");
  const metricGrid = document.getElementById("runtimeMetricGrid");
  const coreGrid = document.getElementById("runtimeCoreGrid");
  const mistakesList = document.getElementById("runtimeMistakes");
  const agentGrid = document.getElementById("runtimeAgentGrid");
  const symphonyGrid = document.getElementById("runtimeSymphonyGrid");
  const symphonySessions = document.getElementById("runtimeSymphonySessions");
  const abacusGrid = document.getElementById("runtimeAbacusGrid");
  const abacusIssues = document.getElementById("runtimeAbacusIssues");
  const dispatchList = document.getElementById("runtimeDispatchList");
  const taskList = document.getElementById("runtimeTaskList");
  const cleanupGrid = document.getElementById("runtimeCleanupGrid");
  const cleanupPre = document.getElementById("runtimeCleanupPre");
  let latestPayload = null;
  const panelState = {
    colony: null,
    symphony: null,
    abacus: null,
    work: null
  };

  function safeText(value, fallback = "") {
    const text = value === undefined || value === null ? "" : String(value).trim();
    return text || fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTime(value) {
    const text = safeText(value);
    if (!text) return "unknown";
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toLocaleString();
  }

  function setPill(el, text, tone = "") {
    el.textContent = text;
    el.className = "pill";
    if (tone) {
      el.classList.add(tone);
    }
  }

  function metricCard(label, value) {
    return `
      <div class="metric-card">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(value)}</span>
      </div>
    `;
  }

  function miniCard(title, body, chips = []) {
    return `
      <div class="mini-card">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <div class="chip-row">
          ${chips.map((chip) => `<span class="chip ${escapeHtml(chip.tone || "")}">${escapeHtml(chip.text || "")}</span>`).join("")}
        </div>
      </div>
    `;
  }

  function renderMetrics(payload) {
    const colony = panelState.colony?.agentColony || payload.agentColony || {};
    const symphonyLive = panelState.symphony?.symphony?.liveState?.summary || payload.symphony?.liveState?.summary || {};
    const abacus = panelState.abacus?.abacus || payload.abacus || {};
    const taskLedger = panelState.work?.taskLedger?.summary || payload.taskLedger?.summary || {};
    metricGrid.innerHTML = [
      metricCard("Queue", `${Number(payload.queue?.running || 0)} running / ${Number(payload.queue?.queued || 0)} queued`),
      metricCard("Colony", `${Number(colony?.counts?.active || 0)} active / ${Number(colony?.counts?.online || 0)} online`),
      metricCard("Symphony", `${Number(symphonyLive.running || 0)} running / ${Number(symphonyLive.retrying || 0)} retrying`),
      metricCard("Abacus", `${abacus.workerLane?.tier || "unknown"} / ${Number(abacus.workerLane?.totalPackets || 0)} packets`),
      metricCard("Open Tasks", String(Number(taskLedger.openTasks || 0) || 0)),
      metricCard("Updated", formatTime(payload.generatedAt))
    ].join("");
  }

  function renderCore(payload) {
    const brain = payload.brainLeader || {};
    const phone = payload.phoneRuntime || {};
    const settings = payload.settings || {};
    const cleanup = payload.cleanup || {};
    coreGrid.innerHTML = [
      miniCard(
        "Brain",
        `${safeText(brain.selectedProvider, "unknown")} / ${safeText(brain.selectedModel, "unknown")}`,
        [
          { text: `status: ${safeText(brain.status, "idle")}`, tone: brain.lastError ? "warn" : "good" },
          { text: `loop: ${safeText(brain.loopStatus, "idle")}` },
          { text: `last run: ${formatTime(brain.lastRunAt)}` }
        ]
      ),
      miniCard(
        "Approvals & Voice",
        `Approvals ${safeText(settings.approvalMode, "unknown")} | Voice ${safeText(settings.voiceOutputMode, "unknown")}`,
        [
          { text: `cost: ${safeText(settings.costMode, "unknown")}` },
          { text: `bridge sync: ${settings.bridgeAutoSyncEnabled ? "on" : "off"}`, tone: settings.bridgeAutoSyncEnabled ? "good" : "warn" },
          { text: `watchdog: ${settings.agentColonyWatchdogEnabled ? "on" : "off"}`, tone: settings.agentColonyWatchdogEnabled ? "good" : "warn" }
        ]
      ),
      miniCard(
        "Phone Runtime",
        `Keeper ${phone.phoneBridgeKeeper?.running ? "running" : "stopped"} | Tunnel monitor ${phone.phoneTunnelMonitor?.running ? "running" : "stopped"}`,
        [
          { text: `keeper log: ${formatTime(phone.phoneBridgeKeeper?.latestLogUpdatedAt)}` },
          { text: `monitor log: ${formatTime(phone.phoneTunnelMonitor?.latestLogUpdatedAt)}` },
          { text: `monitor pass: ${phone.phoneTunnelMonitor?.latestReportPass ? "yes" : "no"}`, tone: phone.phoneTunnelMonitor?.latestReportPass ? "good" : "warn" }
        ]
      ),
      miniCard(
        "Cleanup",
        `${Number(cleanup.staleCount || 0)} stale night-ops PID files`,
        [
          { text: `zero-length: ${Number(cleanup.zeroLengthCount || 0)}` },
          { text: `pid files: ${asArray(cleanup.pidFiles).length}` },
          { text: `root: ${safeText(cleanup.root, "unknown")}` }
        ]
      )
    ].join("");

    const mistakes = asArray(payload.mistakes);
    mistakesList.innerHTML = mistakes.length
      ? mistakes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : "<li>No active operator-level mistakes detected.</li>";
  }

  function renderAgents(payload) {
    const source = panelState.colony || payload;
    const agents = asArray(source.agentColony?.agents);
    if (!agents.length) {
      agentGrid.innerHTML = `<div class="mini-card"><h3>No agents detected</h3><p>The colony status payload is empty.</p></div>`;
      return;
    }
    agentGrid.innerHTML = agents.map((agent) => {
      const state = safeText(agent.state, "offline").toLowerCase();
      return `
        <article class="agent-card is-${escapeHtml(state)}">
          <h3>${escapeHtml(agent.name || agent.id || "agent")}</h3>
          <p>${escapeHtml(agent.role || "Agent")} | ${escapeHtml(agent.id || "")}</p>
          <div class="chip-row">
            <span class="chip ${state === "active" ? "good" : state === "idle" ? "warn" : "bad"}">${escapeHtml(state)}</span>
            <span class="chip">pid: ${escapeHtml(String(agent.pid || 0))}</span>
            <span class="chip">seen: ${escapeHtml(String(agent.lastSeenSeconds ?? "n/a"))}s</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderSymphony(payload) {
    const source = panelState.symphony || payload;
    const status = source.symphony?.status || payload.symphony?.status || {};
    const live = source.symphony?.liveState || payload.symphony?.liveState || {};
    const summary = live.summary || {};
    symphonyGrid.innerHTML = [
      miniCard(
        "Service",
        status.process?.running ? `running on ${status.port}` : "stopped",
        [
          { text: `configured: ${status.configured ? "yes" : "no"}`, tone: status.configured ? "good" : "bad" },
          { text: `workflow: ${safeText(status.workflowPath || "").split(/[\\/]/).pop() || "unknown"}` },
          { text: `project: ${safeText(status.linearProjectSlug, "unknown")}` }
        ]
      ),
      miniCard(
        "Live State",
        live.ok ? `${summary.running || 0} running / ${summary.retrying || 0} retrying` : safeText(live.reason || live.error, "unavailable"),
        [
          { text: `tokens: ${Number(summary.totalTokens || 0).toLocaleString()}` },
          { text: `fetched: ${formatTime(live.fetchedAt)}` },
          { text: `port: ${safeText(String(live.port || status.port || ""))}` }
        ]
      )
    ].join("");

    const running = asArray(live.state?.running);
    const retrying = asArray(live.state?.retrying);
    const items = running.concat(retrying);
    if (!items.length) {
      symphonySessions.innerHTML = `<div class="feed-item"><h3>No active Symphony sessions</h3><p>When Symphony picks up Linear issues, they will appear here.</p></div>`;
      return;
    }
    symphonySessions.innerHTML = items.map((item) => `
      <div class="feed-item">
        <h3>${escapeHtml(item.issue_identifier || item.issue_id || "session")}</h3>
        <p>${escapeHtml(item.last_message || item.last_event || "No recent detail")}</p>
        <div class="feed-meta">
          <span class="chip">${escapeHtml(item.state || "unknown")}</span>
          <span class="chip">turns: ${escapeHtml(String(item.turn_count || 0))}</span>
          <span class="chip">tokens: ${escapeHtml(String(item.tokens?.total_tokens || 0))}</span>
          <span class="chip">last: ${escapeHtml(formatTime(item.last_event_at || item.started_at))}</span>
        </div>
      </div>
    `).join("");
  }

  function renderAbacus(payload) {
    const abacus = panelState.abacus?.abacus || payload.abacus || {};
    abacusGrid.innerHTML = [
      miniCard(
        "Browser",
        abacus.browserReady ? "ready" : "not ready",
        [
          { text: `mode: ${safeText(abacus.browserMode, "unknown")}` },
          { text: `auth: ${abacus.browserAuthenticatedLikely ? "likely" : "unclear"}`, tone: abacus.browserAuthenticatedLikely ? "good" : "warn" },
          { text: `account: ${safeText(abacus.accountEmail, "unknown")}` }
        ]
      ),
      miniCard(
        "Desktop",
        abacus.desktop?.installed ? `${abacus.desktop?.runningCount || 0} processes` : "not installed",
        [
          { text: `listening: ${Number(abacus.desktop?.listeningCount || 0)}` },
          { text: `cli: ${abacus.desktop?.cliExists ? "yes" : "no"}` },
          { text: `window: ${safeText(asArray(abacus.desktop?.mainWindowTitles)[0], "n/a")}` }
        ]
      ),
      miniCard(
        "Listener",
        abacus.listener?.installed ? `${abacus.listener?.runningCount || 0} processes` : "not installed",
        [
          { text: `ports: ${Number(abacus.listener?.listeningCount || 0)}` }
        ]
      ),
      miniCard(
        "CLI",
        abacus.cli?.mcpReady ? "mcp list works" : "limited",
        [
          { text: `print mode: ${abacus.cli?.printReady ? "ready" : "not ready"}`, tone: abacus.cli?.printReady ? "good" : "warn" },
          { text: `interactive fallback: ${abacus.cli?.interactiveFallbackDetected ? "yes" : "no"}` },
          { text: `broken paths: ${abacus.cli?.brokenResourcePathsDetected ? "yes" : "no"}`, tone: abacus.cli?.brokenResourcePathsDetected ? "warn" : "" }
        ]
      )
    ].join("");

    const issues = asArray(abacus.knownIssues);
    abacusIssues.innerHTML = issues.length
      ? issues.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : "<li>No Abacus-specific issues reported.</li>";
  }

  function renderDispatches(payload) {
    const source = panelState.work || payload;
    const dispatches = asArray(source.workerRouter?.dispatches);
    dispatchList.innerHTML = dispatches.length
      ? dispatches.map((dispatch) => `
          <div class="feed-item">
            <h3>${escapeHtml(dispatch.title || dispatch.id)}</h3>
            <p>${escapeHtml(dispatch.resultSummary || dispatch.error || "Dispatch recorded.")}</p>
            <div class="feed-meta">
              <span class="chip">${escapeHtml(dispatch.workerId || "unknown")}</span>
              <span class="chip">${escapeHtml(dispatch.dispatchMode || "unknown")}</span>
              <span class="chip">${escapeHtml(dispatch.taskType || "unknown")}</span>
              ${dispatch.issueIdentifier ? `<span class="chip good">${escapeHtml(dispatch.issueIdentifier)}</span>` : ""}
            </div>
          </div>
        `).join("")
      : `<div class="feed-item"><h3>No worker dispatches</h3><p>No routed work has been recorded yet.</p></div>`;

    const tasks = asArray(source.taskLedger?.openTasks);
    taskList.innerHTML = tasks.length
      ? tasks.map((task) => `
          <div class="feed-item">
            <h3>${escapeHtml(task.title || task.id)}</h3>
            <p>${escapeHtml(task.description || "No description")}</p>
            <div class="feed-meta">
              <span class="chip">${escapeHtml(task.status || "unknown")}</span>
              <span class="chip">${escapeHtml(task.owner || "unassigned")}</span>
              <span class="chip">${escapeHtml(task.projectScope || "no-scope")}</span>
              <span class="chip">progress: ${escapeHtml(String(task.progress || 0))}%</span>
            </div>
          </div>
        `).join("")
      : `<div class="feed-item"><h3>No open tasks</h3><p>The task ledger has no open tasks in the current slice.</p></div>`;
  }

  function renderCleanup(payload) {
    const cleanup = payload.cleanup || {};
    cleanupGrid.innerHTML = [
      miniCard(
        "Night Ops",
        `${Number(cleanup.staleCount || 0)} stale PID files`,
        [
          { text: `zero-length: ${Number(cleanup.zeroLengthCount || 0)}` },
          { text: `total pid files: ${asArray(cleanup.pidFiles).length}` }
        ]
      )
    ].join("");
    cleanupPre.textContent = JSON.stringify(cleanup, null, 2);
  }

  function render(payload) {
    const cache = payload.cache || {};
    let liveText = `Live ${formatTime(payload.generatedAt)}`;
    let liveTone = "good";
    if (cache.partial) {
      liveText = `Partial ${formatTime(payload.generatedAt)}`;
      liveTone = "warn";
    } else if (cache.stale) {
      liveText = `Cached ${formatTime(payload.generatedAt)}`;
      liveTone = "warn";
    }
    if (cache.refreshing) {
      liveText += " | refreshing";
    }
    if (cache.lastError) {
      liveText += " | degraded";
      if (liveTone === "good") {
        liveTone = "warn";
      }
    }
    setPill(livePill, liveText, liveTone);
    setPill(brainPill, `Brain ${safeText(payload.brainLeader?.selectedProvider, "unknown")} / ${safeText(payload.brainLeader?.selectedModel, "unknown")}`, payload.brainLeader?.lastError ? "warn" : "good");
    const colonySource = panelState.colony?.agentColony || payload.agentColony || {};
    const symphonySource = panelState.symphony?.symphony || payload.symphony || {};
    const abacusSource = panelState.abacus?.abacus || payload.abacus || {};
    setPill(colonyPill, `Colony ${Number(colonySource?.counts?.active || 0)} active / ${Number(colonySource?.counts?.online || 0)} online`, Number(colonySource?.counts?.online || 0) > 0 ? "good" : "warn");
    setPill(symphonyPill, `Symphony ${Number(symphonySource?.liveState?.summary?.running || 0)} running`, symphonySource?.status?.process?.running ? "good" : "warn");
    setPill(abacusPill, `Abacus ${safeText(abacusSource?.workerLane?.tier, "unknown")}`, abacusSource?.browserReady || abacusSource?.desktop?.installed ? "good" : "warn");
    renderMetrics(payload);
    renderCore(payload);
    renderAgents(payload);
    renderSymphony(payload);
    renderAbacus(payload);
    renderDispatches(payload);
    renderCleanup(payload);
  }

  async function requestJson(url, timeoutMs) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller && timeoutMs
      ? window.setTimeout(() => {
          try {
            controller.abort();
          } catch (_error) {
            // ignore
          }
        }, timeoutMs)
      : null;
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json"
        },
        signal: controller ? controller.signal : undefined
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(safeText(payload?.error || response.statusText, "worker_runtime_failed"));
      }
      return payload;
    } finally {
      if (timer) {
        window.clearTimeout(timer);
      }
    }
  }

  async function loadFast() {
    return requestJson("/api/worker-runtime/fast", 5000);
  }

  async function loadPanel(key, url, timeoutMs) {
    const payload = await requestJson(url, timeoutMs);
    panelState[key] = payload;
    if (latestPayload) {
      render(latestPayload);
    }
    return payload;
  }

  async function loadPanels() {
    return Promise.allSettled([
      loadPanel("colony", "/api/worker-runtime/colony", 8000),
      loadPanel("symphony", "/api/worker-runtime/symphony", 9000),
      loadPanel("abacus", "/api/worker-runtime/abacus", 9000),
      loadPanel("work", "/api/worker-runtime/work", 9000)
    ]);
  }

  async function refreshRuntime(options = {}) {
    const preferFast = Boolean(options.preferFast);
    if (preferFast || !latestPayload) {
      const fastPayload = await loadFast();
      latestPayload = fastPayload;
      render(fastPayload);
    }
    await loadPanels();
    const fullPayload = await requestJson("/api/worker-runtime/status", 15000);
    latestPayload = fullPayload;
    panelState.colony = { agentColony: fullPayload.agentColony };
    panelState.symphony = { symphony: fullPayload.symphony };
    panelState.abacus = { abacus: fullPayload.abacus };
    panelState.work = {
      taskLedger: fullPayload.taskLedger,
      workerRouter: fullPayload.workerRouter
    };
    render(fullPayload);
  }

  refreshRuntime({ preferFast: true }).catch((error) => {
    setPill(livePill, `Error ${safeText(error?.message, "load_failed")}`, "bad");
  });
  window.setInterval(() => {
    refreshRuntime({ preferFast: false }).catch((error) => {
      if (latestPayload) {
        latestPayload = {
          ...latestPayload,
          cache: {
            ...(latestPayload.cache || {}),
            stale: true,
            refreshing: false,
            lastError: safeText(error?.message, "refresh_failed")
          }
        };
        render(latestPayload);
        return;
      }
      setPill(livePill, `Error ${safeText(error?.message, "refresh_failed")}`, "bad");
    });
  }, 15000);
})();
