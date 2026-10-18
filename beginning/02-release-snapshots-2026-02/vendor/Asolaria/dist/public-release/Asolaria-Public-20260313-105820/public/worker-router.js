(function () {
  const statusGrid = document.getElementById("workerStatusGrid");
  const defaultPill = document.getElementById("routerDefaultPill");
  const issuePill = document.getElementById("routerKnownIssuePill");
  const dispatchCountPill = document.getElementById("routerDispatchCountPill");
  const dispatchList = document.getElementById("workerDispatchList");
  const dispatchDetail = document.getElementById("workerDispatchDetail");
  const recommendationPills = document.getElementById("routerRecommendationPills");
  const recommendationBody = document.getElementById("routerRecommendationBody");

  const form = {
    title: document.getElementById("routerTitle"),
    objective: document.getElementById("routerObjective"),
    instructions: document.getElementById("routerInstructions"),
    paths: document.getElementById("routerPaths"),
    taskType: document.getElementById("routerTaskType"),
    sensitivity: document.getElementById("routerSensitivity"),
    size: document.getElementById("routerSize"),
    preferredWorker: document.getElementById("routerPreferredWorker"),
    repoWrite: document.getElementById("routerRepoWrite"),
    needsCloud: document.getElementById("routerNeedsCloud"),
    longRunning: document.getElementById("routerLongRunning"),
    canvas: document.getElementById("routerCanvas"),
    executeNow: document.getElementById("routerExecuteNow"),
    ensureService: document.getElementById("routerEnsureService")
  };

  const recommendBtn = document.getElementById("routerRecommendBtn");
  const dispatchBtn = document.getElementById("routerDispatchBtn");
  const refreshBtn = document.getElementById("routerRefreshBtn");

  const state = {
    status: null,
    recommendation: null,
    dispatches: [],
    selectedDispatchId: ""
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

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json"
      },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      throw new Error(safeText(payload?.error || response.statusText, "request_failed"));
    }
    return payload;
  }

  async function postJson(url, body) {
    return fetchJson(url, {
      method: "POST",
      body: JSON.stringify(body || {})
    });
  }

  function buildPayload() {
    return {
      title: form.title.value,
      objective: form.objective.value,
      instructions: form.instructions.value,
      allowedPaths: splitLines(form.paths.value),
      taskType: form.taskType.value,
      sensitivity: form.sensitivity.value,
      size: form.size.value,
      preferredWorker: form.preferredWorker.value,
      requiresRepoWrite: form.repoWrite.checked,
      needsCloudWorker: form.needsCloud.checked,
      needsLongRunning: form.longRunning.checked,
      needsInteractiveCanvas: form.canvas.checked,
      executeNow: form.executeNow.checked,
      ensureService: form.ensureService.checked
    };
  }

  function badgeClass(ok, warn) {
    if (!ok) return "pill bad";
    if (warn) return "pill warn";
    return "pill";
  }

  function renderStatus() {
    const status = state.status || {};
    defaultPill.textContent = `Default: ${safeText(status.defaultWorker, "unknown")}`;
    issuePill.textContent = `Known issues: ${asArray(status.knownIssues).length}`;
    dispatchCountPill.textContent = `Dispatches: ${state.dispatches.length}`;

    statusGrid.innerHTML = asArray(status.workers).map((worker) => {
      const available = Boolean(worker.available);
      const direct = Boolean(worker.directDispatchSupported);
      return `
        <article class="status-card">
          <div class="pill-row">
            <span class="${badgeClass(available, !direct)}">${escapeHtml(worker.title || worker.id)}</span>
            <span class="pill warn">dispatchable: ${escapeHtml(String(Boolean(worker.dispatchable)))}</span>
            <span class="pill ${direct ? "" : "warn"}">direct: ${escapeHtml(String(direct))}</span>
          </div>
          <h3>${escapeHtml(worker.title || worker.id)}</h3>
          <p>${escapeHtml(worker.id)}</p>
          <div>
            <strong>Strengths</strong>
            <ul>${asArray(worker.strengths).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
          <div>
            <strong>Limitations</strong>
            <ul>${asArray(worker.limitations).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
          <div>
            <strong>Mistakes To Avoid</strong>
            <ul>${asArray(worker.mistakes).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderRecommendation() {
    const recommendation = state.recommendation;
    if (!recommendation) {
      recommendationPills.innerHTML = "";
      recommendationBody.innerHTML = `<p class="muted">No recommendation yet.</p>`;
      return;
    }
    const worker = recommendation.recommendedWorker || {};
    const fallback = recommendation.fallbackWorker || {};
    recommendationPills.innerHTML = [
      `<span class="chip">recommended: ${escapeHtml(recommendation.recommendedWorkerId || "unknown")}</span>`,
      fallback.id ? `<span class="chip warn">fallback: ${escapeHtml(fallback.id)}</span>` : "",
      `<span class="chip ${recommendation.directDispatchSupported ? "" : "warn"}">direct dispatch: ${escapeHtml(String(Boolean(recommendation.directDispatchSupported)))}</span>`,
      recommendation.presetId ? `<span class="chip">preset: ${escapeHtml(recommendation.presetId)}</span>` : ""
    ].filter(Boolean).join("");
    recommendationBody.innerHTML = `
      <div>
        <strong>Why This Lane</strong>
        <ul>${asArray(recommendation.reasons).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div>
        <strong>Warnings</strong>
        <ul>${asArray(recommendation.warnings).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>None</li>"}</ul>
      </div>
      <div>
        <strong>Limitations</strong>
        <ul>${asArray(recommendation.limitations).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>None</li>"}</ul>
      </div>
      <div>
        <strong>Mistakes To Avoid</strong>
        <ul>${asArray(recommendation.mistakes).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>None</li>"}</ul>
      </div>
      <pre>${escapeHtml(JSON.stringify({
        taskType: recommendation.input?.taskType,
        sensitivity: recommendation.input?.sensitivity,
        size: recommendation.input?.size,
        preferredWorker: recommendation.input?.preferredWorker || "auto"
      }, null, 2))}</pre>
    `;
  }

  function renderDispatches() {
    if (!state.dispatches.length) {
      dispatchList.innerHTML = `<p class="muted">No worker dispatches yet.</p>`;
      renderDispatchDetail(null);
      return;
    }
    dispatchList.innerHTML = state.dispatches.map((dispatch) => {
      const active = state.selectedDispatchId === dispatch.id ? " style=\"border-color: rgba(50, 187, 255, 0.34);\"" : "";
      return `
        <div class="dispatch-card"${active}>
          <div class="chip-row">
            <span class="chip">${escapeHtml(dispatch.workerId || "unknown")}</span>
            <span class="chip warn">${escapeHtml(dispatch.recommendation?.input?.taskType || "unknown")}</span>
          </div>
          <strong>${escapeHtml(dispatch.title || dispatch.recommendation?.input?.title || dispatch.id)}</strong>
          <p class="muted">${escapeHtml(dispatch.result?.resultSummary || dispatch.error || "Dispatch recorded.")}</p>
          <button type="button" data-dispatch-id="${escapeHtmlAttr(dispatch.id)}">Inspect</button>
        </div>
      `;
    }).join("");
    for (const button of dispatchList.querySelectorAll("button[data-dispatch-id]")) {
      button.addEventListener("click", () => {
        state.selectedDispatchId = button.dataset.dispatchId || "";
        renderDispatches();
        renderDispatchDetail(state.dispatches.find((item) => item.id === state.selectedDispatchId) || null);
      });
    }
    if (!state.selectedDispatchId || !state.dispatches.some((item) => item.id === state.selectedDispatchId)) {
      state.selectedDispatchId = state.dispatches[0]?.id || "";
    }
    renderDispatchDetail(state.dispatches.find((item) => item.id === state.selectedDispatchId) || null);
  }

  function renderDispatchDetail(dispatch) {
    if (!dispatch) {
      dispatchDetail.innerHTML = `<p class="muted">Select a dispatch to inspect the recorded payload.</p>`;
      return;
    }
    dispatchDetail.innerHTML = `
      <div>
        <strong>${escapeHtml(dispatch.title || dispatch.id)}</strong>
        <p class="muted">${escapeHtml(dispatch.result?.resultSummary || dispatch.error || "Dispatch recorded.")}</p>
      </div>
      <div class="chip-row">
        <span class="chip">worker: ${escapeHtml(dispatch.workerId || "unknown")}</span>
        <span class="chip warn">task: ${escapeHtml(dispatch.taskId || "none")}</span>
      </div>
      <pre>${escapeHtml(JSON.stringify(dispatch, null, 2))}</pre>
    `;
  }

  async function loadAll() {
    const [statusPayload, dispatchPayload] = await Promise.all([
      fetchJson("/api/worker-router/status"),
      fetchJson("/api/worker-router/dispatches?limit=30")
    ]);
    state.status = statusPayload.status || null;
    state.dispatches = asArray(dispatchPayload.dispatches);
    renderStatus();
    renderRecommendation();
    renderDispatches();
  }

  async function recommend() {
    state.recommendation = (await postJson("/api/worker-router/recommend", buildPayload())).recommendation || null;
    renderRecommendation();
  }

  async function dispatch() {
    const result = await postJson("/api/worker-router/dispatch", buildPayload());
    const dispatchRecord = result.dispatch || null;
    if (dispatchRecord) {
      state.selectedDispatchId = dispatchRecord.id || "";
    }
    await loadAll();
    if (dispatchRecord) {
      state.selectedDispatchId = dispatchRecord.id || state.selectedDispatchId;
      renderDispatches();
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

  recommendBtn.addEventListener("click", async () => {
    try {
      await recommend();
    } catch (error) {
      recommendationBody.innerHTML = `<p class="muted">${escapeHtml(safeText(error?.message, "Failed to recommend worker."))}</p>`;
    }
  });

  dispatchBtn.addEventListener("click", async () => {
    try {
      await dispatch();
      await recommend();
    } catch (error) {
      recommendationBody.innerHTML = `<p class="muted">${escapeHtml(safeText(error?.message, "Failed to dispatch worker."))}</p>`;
    }
  });

  refreshBtn.addEventListener("click", async () => {
    try {
      await loadAll();
    } catch (error) {
      dispatchDetail.innerHTML = `<p class="muted">${escapeHtml(safeText(error?.message, "Failed to refresh worker router."))}</p>`;
    }
  });

  loadAll().catch((error) => {
    dispatchDetail.innerHTML = `<p class="muted">${escapeHtml(safeText(error?.message, "Failed to load worker router."))}</p>`;
  });
})();
