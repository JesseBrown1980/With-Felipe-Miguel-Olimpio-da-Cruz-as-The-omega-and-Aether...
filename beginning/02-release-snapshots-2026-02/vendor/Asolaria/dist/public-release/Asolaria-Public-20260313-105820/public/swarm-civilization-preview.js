(function () {
  const liveState = document.getElementById("civilizationLiveState");
  const updatedAt = document.getElementById("civilizationUpdatedAt");
  const metrics = document.getElementById("civilizationMetrics");
  const mapSummary = document.getElementById("civilizationMapSummary");
  const districtFilter = document.getElementById("civilizationDistrictFilter");
  const kindFilter = document.getElementById("civilizationKindFilter");
  const riskFilter = document.getElementById("civilizationRiskFilter");
  const searchInput = document.getElementById("civilizationSearch");
  const trustedToggle = document.getElementById("civilizationTrustedToggle");
  const adminToggle = document.getElementById("civilizationAdminToggle");
  const hotToggle = document.getElementById("civilizationHotToggle");
  const autoRefreshToggle = document.getElementById("civilizationAutoRefresh");
  const refreshBtn = document.getElementById("civilizationRefreshBtn");
  const jsonLink = document.getElementById("civilizationJsonLink");
  const routesSvg = document.getElementById("civilizationRoutes");
  const districtLayer = document.getElementById("civilizationDistrictLayer");
  const nodeLayer = document.getElementById("civilizationNodeLayer");
  const districtList = document.getElementById("civilizationDistrictList");
  const inspector = document.getElementById("civilizationInspector");
  const claudeList = document.getElementById("civilizationClaudeList");
  const eventList = document.getElementById("civilizationEventList");

  const state = {
    world: null,
    dispatches: [],
    selectedEntityId: "",
    selectedRouteId: "",
    visiblePositions: new Map(),
    autoTimer: null,
    animationFrame: null,
    particles: [],
    refreshing: false
  };

  const MAP_WIDTH = 1200;
  const MAP_HEIGHT = 820;
  const DISTRICT_ANCHORS = {
    citadel: { x: 150, y: 160 },
    colony: { x: 170, y: 525 },
    perimeter: { x: 540, y: 130 },
    gate_ring: { x: 540, y: 370 },
    ledger_quarter: { x: 520, y: 665 },
    workshop: { x: 930, y: 230 },
    cloud_arc: { x: 930, y: 530 },
    world_bridge: { x: 940, y: 705 }
  };
  const RISK_ORDER = { low: 1, medium: 2, high: 3, critical: 4 };
  const STATUS_CLASS = {
    active: "running",
    running: "running",
    connected: "online",
    linked: "online",
    online: "online",
    review: "online",
    planned: "blocked",
    blocked: "blocked",
    offline: "offline"
  };
  const KIND_WEIGHT = {
    sovereign: 0,
    tower: 1,
    gate: 2,
    agent: 3,
    surface: 4,
    sub_colony: 4.5,
    runtime_node: 5,
    packet: 6,
    task: 7
  };

  function safeText(value, fallback = "") {
    const text = value === undefined || value === null ? "" : String(value).trim();
    return text || fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function riskAtLeast(level, minimum) {
    if (!minimum) return true;
    return (RISK_ORDER[safeText(level, "low")] || 0) >= (RISK_ORDER[minimum] || 0);
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
    if (!value) return "unknown";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "unknown";
    return new Intl.DateTimeFormat([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  async function requestJson(url) {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      throw new Error(safeText(payload?.error || response.statusText, "request_failed"));
    }
    return payload;
  }

  function buildWorldUrl() {
    const params = new URLSearchParams();
    if (trustedToggle.checked) params.set("trusted", "1");
    if (adminToggle.checked) params.set("admin", "1");
    const query = params.toString();
    return `/api/worker-runtime/civilization-world${query ? `?${query}` : ""}`;
  }

  function setLiveState(text, mode) {
    liveState.textContent = text;
    liveState.className = "civilization-pill";
    if (mode === "live") {
      liveState.classList.add("is-live");
    } else if (mode === "warn") {
      liveState.classList.add("is-warn");
    } else if (mode === "error") {
      liveState.classList.add("is-error");
    }
  }

  function entityStatusClass(entity) {
    return STATUS_CLASS[safeText(entity?.status).toLowerCase()] || "online";
  }

  function entityKindClass(entity) {
    const kind = safeText(entity?.kind, "runtime_node").toLowerCase();
    return `kind-${kind.replace(/[^a-z0-9_-]/g, "-")}`;
  }

  function entityIcon(entity) {
    const icon = safeText(entity?.icon, "");
    if (icon) return icon.slice(0, 3);
    const label = safeText(entity?.label || entity?.id, "?");
    const words = label.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
    }
    return label.slice(0, 2).toUpperCase();
  }

  function entitySort(a, b) {
    const aHot = a.hot ? 0 : 1;
    const bHot = b.hot ? 0 : 1;
    if (aHot !== bHot) return aHot - bHot;
    const aWeight = KIND_WEIGHT[safeText(a.kind, "runtime_node").toLowerCase()] ?? 9;
    const bWeight = KIND_WEIGHT[safeText(b.kind, "runtime_node").toLowerCase()] ?? 9;
    if (aWeight !== bWeight) return aWeight - bWeight;
    return safeText(a.label, a.id).localeCompare(safeText(b.label, b.id));
  }

  function visibleEntities() {
    if (!state.world) return [];
    const district = districtFilter.value;
    const kind = kindFilter.value;
    const query = safeText(searchInput.value).toLowerCase();
    return asArray(state.world.entities)
      .filter((entity) => {
        if (district && entity.district !== district) return false;
        if (kind && entity.kind !== kind) return false;
        if (hotToggle.checked && !entity.hot) return false;
        if (!query) return true;
        const haystack = [
          entity.id,
          entity.label,
          entity.kind,
          entity.subtype,
          entity.provider,
          entity.role,
          entity.model,
          entity.sourceRef
        ].map((value) => safeText(value).toLowerCase()).join(" ");
        return haystack.includes(query);
      })
      .sort(entitySort);
  }

  function visibleRoutes(positionMap) {
    const minimumRisk = riskFilter.value;
    return asArray(state.world?.routes)
      .filter((route) => {
        if (!positionMap.has(route.sourceId) || !positionMap.has(route.targetId)) return false;
        return riskAtLeast(route.riskLevel, minimumRisk);
      })
      .sort((a, b) => {
        const aRisk = RISK_ORDER[safeText(a.riskLevel, "low")] || 0;
        const bRisk = RISK_ORDER[safeText(b.riskLevel, "low")] || 0;
        return aRisk - bRisk;
      });
  }

  function syncDistrictFilterOptions() {
    const current = districtFilter.value;
    districtFilter.innerHTML = '<option value="">all</option>';
    for (const district of asArray(state.world?.districts)) {
      const option = document.createElement("option");
      option.value = district.id;
      option.textContent = `${safeText(district.label, district.id)} (${Number(district.count || 0)})`;
      districtFilter.appendChild(option);
    }
    districtFilter.value = current;
    if (districtFilter.value !== current) {
      districtFilter.value = "";
    }
  }

  function setJsonLink() {
    const url = buildWorldUrl();
    jsonLink.href = url;
  }

  function renderMetrics() {
    if (!state.world) {
      metrics.innerHTML = "";
      return;
    }
    const summary = state.world.summary || {};
    const projections = state.world.projections || {};
    const taskLedger = projections.taskLedger || {};
    const colony = projections.colony || {};
    metrics.innerHTML = [
      metricCard("Entities", summary.entities),
      metricCard("Routes", summary.routes),
      metricCard("Towers", summary.towers),
      metricCard("Gates", summary.gates),
      metricCard("Packets", summary.packets),
      metricCard("Tasks", summary.tasks),
      metricCard("Colony", `${Number(colony.online || 0)}/${Number(colony.total || 0)}`),
      metricCard("Open Tasks", taskLedger.openTasks),
      metricCard("Hot", summary.hotEntities)
    ].join("");
  }

  function metricCard(label, value) {
    return `<div class="civilization-metric"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(String(value ?? 0))}</span></div>`;
  }

  function chip(text, tone) {
    return `<span class="civilization-chip${tone ? ` is-${tone}` : ""}">${escapeHtml(text)}</span>`;
  }

  function computePositions(entities) {
    const grouped = new Map();
    for (const entity of entities) {
      const key = safeText(entity.district, "workshop");
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(entity);
    }

    const positions = new Map();
    for (const [districtId, items] of grouped.entries()) {
      const anchor = DISTRICT_ANCHORS[districtId] || DISTRICT_ANCHORS.workshop;
      const columns = Math.max(1, Math.ceil(Math.sqrt(items.length)));
      const rows = Math.max(1, Math.ceil(items.length / columns));
      const spacingX = districtId === "perimeter" ? 112 : 108;
      const spacingY = districtId === "ledger_quarter" ? 84 : 92;
      items.forEach((entity, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const x = anchor.x + ((column - (columns - 1) / 2) * spacingX);
        const y = anchor.y + ((row - (rows - 1) / 2) * spacingY);
        positions.set(entity.id, {
          x: Math.max(84, Math.min(MAP_WIDTH - 84, x)),
          y: Math.max(78, Math.min(MAP_HEIGHT - 78, y))
        });
      });
    }
    return positions;
  }

  function renderDistricts(entities, positions) {
    const grouped = new Map();
    for (const entity of entities) {
      const key = safeText(entity.district, "workshop");
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(entity);
    }
    districtLayer.innerHTML = "";
    districtList.innerHTML = "";

    for (const district of asArray(state.world?.districts)) {
      const districtEntities = grouped.get(district.id) || [];
      const anchor = DISTRICT_ANCHORS[district.id] || DISTRICT_ANCHORS.workshop;
      const tag = document.createElement("div");
      tag.className = "civilization-district-tag";
      tag.style.left = `${((anchor.x / MAP_WIDTH) * 100).toFixed(3)}%`;
      tag.style.top = `${((anchor.y / MAP_HEIGHT) * 100).toFixed(3)}%`;
      tag.innerHTML = `<strong>${escapeHtml(safeText(district.label, district.id))}</strong><span>${escapeHtml(safeText(district.purpose, ""))}</span>`;
      districtLayer.appendChild(tag);

      const counts = {
        towers: 0,
        gates: 0,
        agents: 0,
        packets: 0,
        tasks: 0
      };
      for (const entity of districtEntities) {
        if (entity.kind === "tower") counts.towers += 1;
        if (entity.kind === "gate") counts.gates += 1;
        if (entity.kind === "agent") counts.agents += 1;
        if (entity.kind === "packet") counts.packets += 1;
        if (entity.kind === "task") counts.tasks += 1;
      }
      const item = document.createElement("li");
      item.className = "civilization-feed-item";
      item.innerHTML = `
        <strong>${escapeHtml(safeText(district.label, district.id))}</strong>
        <span>${escapeHtml(`${districtEntities.length} visible | ${counts.towers} towers | ${counts.gates} gates | ${counts.agents} agents | ${counts.packets} packets | ${counts.tasks} tasks`)}</span>
      `;
      districtList.appendChild(item);
    }
  }

  function renderRoutes(positionMap) {
    routesSvg.innerHTML = "";
    const routes = visibleRoutes(positionMap);
    cancelAnimationFrame(state.animationFrame);
    state.particles = [];
    for (const route of routes) {
      const source = positionMap.get(route.sourceId);
      const target = positionMap.get(route.targetId);
      if (!source || !target) continue;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(source.x));
      line.setAttribute("y1", String(source.y));
      line.setAttribute("x2", String(target.x));
      line.setAttribute("y2", String(target.y));
      line.setAttribute("class", `civilization-route risk-${safeText(route.riskLevel, "low")}${route.id === state.selectedRouteId ? " is-selected" : ""}`);
      const dash = route.kind === "guarded_portal" ? "0" : route.packetId ? "12 10" : "8 8";
      if (dash !== "0") {
        line.setAttribute("stroke-dasharray", dash);
      }
      routesSvg.appendChild(line);

      if (route.status !== "offline") {
        const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        pulse.setAttribute("r", safeText(route.packetId, "") ? "3.8" : "2.6");
        pulse.setAttribute("class", "civilization-route-pulse");
        routesSvg.appendChild(pulse);
        state.particles.push({
          element: pulse,
          source,
          target,
          offset: Math.random(),
          speed: route.packetId ? 0.0048 : 0.0031
        });
      }
    }
    animateParticles();
  }

  function animateParticles() {
    if (!state.particles.length) return;
    const tick = (time) => {
      for (const particle of state.particles) {
        const progress = (particle.offset + (time * particle.speed)) % 1;
        const x = particle.source.x + ((particle.target.x - particle.source.x) * progress);
        const y = particle.source.y + ((particle.target.y - particle.source.y) * progress);
        particle.element.setAttribute("cx", x.toFixed(2));
        particle.element.setAttribute("cy", y.toFixed(2));
      }
      state.animationFrame = window.requestAnimationFrame(tick);
    };
    state.animationFrame = window.requestAnimationFrame(tick);
  }

  function renderNodes(positionMap) {
    const entities = visibleEntities();
    const selectedEntity = entities.find((entity) => entity.id === state.selectedEntityId) || null;
    const connectedIds = new Set();
    if (selectedEntity) {
      for (const route of asArray(state.world?.routes)) {
        if (route.sourceId === selectedEntity.id) connectedIds.add(route.targetId);
        if (route.targetId === selectedEntity.id) connectedIds.add(route.sourceId);
      }
    }
    nodeLayer.innerHTML = "";
    for (const entity of entities) {
      const position = positionMap.get(entity.id);
      if (!position) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = [
        "civilization-node",
        entityKindClass(entity),
        `status-${entityStatusClass(entity)}`,
        entity.hot ? "is-hot" : "",
        state.selectedEntityId === entity.id ? "is-selected" : "",
        selectedEntity && state.selectedEntityId !== entity.id && !connectedIds.has(entity.id) ? "is-dimmed" : ""
      ].filter(Boolean).join(" ");
      button.style.left = `${((position.x / MAP_WIDTH) * 100).toFixed(3)}%`;
      button.style.top = `${((position.y / MAP_HEIGHT) * 100).toFixed(3)}%`;
      button.title = `${safeText(entity.label, entity.id)}\n${safeText(entity.kind, "")} | ${safeText(entity.status, "")}`;
      button.innerHTML = `
        <div class="civilization-node-header">
          <span class="civilization-node-icon">${escapeHtml(entityIcon(entity))}</span>
          <span class="civilization-node-label">${escapeHtml(safeText(entity.label, entity.id))}</span>
        </div>
        <div class="civilization-node-meta">
          <span>${escapeHtml(safeText(entity.kind, "node"))}</span>
          <span>${escapeHtml(safeText(entity.status, "unknown"))}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.selectedEntityId = entity.id;
        state.selectedRouteId = "";
        renderAll();
      });
      nodeLayer.appendChild(button);
    }
  }

  function renderInspector() {
    const entity = asArray(state.world?.entities).find((item) => item.id === state.selectedEntityId) || null;
    if (!entity) {
      inspector.innerHTML = `<div class="civilization-empty">Select a node to inspect its routes and current runtime meaning.</div>`;
      return;
    }
    const connectedRoutes = asArray(state.world?.routes)
      .filter((route) => route.sourceId === entity.id || route.targetId === entity.id)
      .sort((a, b) => (RISK_ORDER[safeText(b.riskLevel, "low")] || 0) - (RISK_ORDER[safeText(a.riskLevel, "low")] || 0));

    const related = connectedRoutes.slice(0, 8).map((route) => {
      const otherId = route.sourceId === entity.id ? route.targetId : route.sourceId;
      const other = asArray(state.world?.entities).find((item) => item.id === otherId);
      return `
        <li class="civilization-feed-item">
          <strong>${escapeHtml(safeText(other?.label, otherId))}</strong>
          <span>${escapeHtml(`${safeText(route.kind, "route")} | ${safeText(route.status, "unknown")} | risk ${safeText(route.riskLevel, "low")}`)}</span>
          <p>${escapeHtml(safeText(route.notes, route.intent || "No notes."))}</p>
        </li>
      `;
    }).join("");

    inspector.innerHTML = `
      <div class="civilization-feed-item">
        <strong>${escapeHtml(safeText(entity.label, entity.id))}</strong>
        <div class="civilization-chip-row">
          ${chip(safeText(entity.kind, "node"), "")}
          ${chip(safeText(entity.status, "unknown"), entity.online ? "good" : "warn")}
          ${entity.provider ? chip(`provider ${safeText(entity.provider)}`, "") : ""}
          ${entity.district ? chip(`district ${safeText(entity.district)}`, "") : ""}
          ${entity.hot ? chip("hot", "warn") : ""}
        </div>
        <p>${escapeHtml(safeText(entity.summary || entity.role || entity.sourceRef || entity.subtype || "No detail."))}</p>
      </div>
      <div>
        <h3>Connected Routes</h3>
        <ul class="civilization-feed-list">${related || '<li class="civilization-feed-item"><strong>No routes</strong><span>This node is currently isolated in the visible filter.</span></li>'}</ul>
      </div>
      <div>
        <h3>Raw Snapshot</h3>
        <pre class="civilization-pre">${escapeHtml(JSON.stringify(entity, null, 2))}</pre>
      </div>
    `;
  }

  function renderClaudeDispatches() {
    const dispatches = state.dispatches
      .filter((dispatch) => safeText(dispatch.workerId) === "claude_max")
      .slice(0, 6);
    if (!dispatches.length) {
      claudeList.innerHTML = `<li class="civilization-feed-item"><strong>No Claude Max dispatches yet.</strong><span>Dispatch one through the worker router to populate this lane.</span></li>`;
      return;
    }
    claudeList.innerHTML = dispatches.map((dispatch) => {
      const result = dispatch.result || {};
      const summary = safeText(result.resultSummary || dispatch.error, "Recorded.");
      const reply = safeText(result.reply, "");
      const preview = reply ? reply.split(/\r?\n/).slice(0, 2).join(" ") : "";
      const tone = dispatch.failedAt ? "is-error" : dispatch.completedAt ? "is-good" : "is-warn";
      return `
        <li class="civilization-feed-item">
          <strong>${escapeHtml(safeText(dispatch.title, dispatch.id))}</strong>
          <div class="civilization-chip-row">
            <span class="civilization-chip ${tone}">${escapeHtml(dispatch.failedAt ? "failed" : dispatch.completedAt ? "completed" : "running")}</span>
            <span class="civilization-chip">${escapeHtml(formatTime(dispatch.completedAt || dispatch.createdAt))}</span>
          </div>
          <p>${escapeHtml(summary)}</p>
          ${preview ? `<span>${escapeHtml(preview)}</span>` : ""}
        </li>
      `;
    }).join("");
  }

  function renderEvents() {
    const events = asArray(state.world?.events).slice(0, 8);
    if (!events.length) {
      eventList.innerHTML = `<li class="civilization-feed-item"><strong>No world events.</strong><span>The event stream is currently empty.</span></li>`;
      return;
    }
    eventList.innerHTML = events.map((event) => {
      return `
        <li class="civilization-feed-item">
          <strong>${escapeHtml(safeText(event.eventType || event.intent, event.eventId))}</strong>
          <div class="civilization-chip-row">
            <span class="civilization-chip">${escapeHtml(safeText(event.priority, "normal"))}</span>
            <span class="civilization-chip ${riskTone(event.risk?.level)}">${escapeHtml(`risk ${safeText(event.risk?.level, "low")}`)}</span>
            <span class="civilization-chip">${escapeHtml(formatTime(event.timestamp))}</span>
          </div>
          <p>${escapeHtml(`${safeText(event.actorId, "unknown")} -> ${safeText(event.targetId, "unknown")}`)}</p>
        </li>
      `;
    }).join("");
  }

  function riskTone(level) {
    if (level === "critical" || level === "high") return "is-error";
    if (level === "medium") return "is-warn";
    return "";
  }

  function renderAll() {
    if (!state.world) return;
    syncDistrictFilterOptions();
    setJsonLink();
    renderMetrics();
    updatedAt.textContent = `Snapshot ${formatTime(state.world.generatedAt)}`;

    const entities = visibleEntities();
    const positionMap = computePositions(entities);
    state.visiblePositions = positionMap;
    if (!state.selectedEntityId || !entities.some((entity) => entity.id === state.selectedEntityId)) {
      state.selectedEntityId = entities[0]?.id || "";
    }
    renderDistricts(entities, positionMap);
    renderRoutes(positionMap);
    renderNodes(positionMap);
    renderInspector();
    renderClaudeDispatches();
    renderEvents();

    const routes = visibleRoutes(positionMap);
    const riskRoutes = state.world.summary?.riskRoutes || {};
    mapSummary.innerHTML = [
      chip(`${entities.length} visible`, "good"),
      chip(`${routes.length} routes`, ""),
      chip(`${entities.filter((entity) => entity.kind === "tower").length} towers`, ""),
      chip(`${entities.filter((entity) => entity.kind === "gate").length} gates`, ""),
      chip(`${entities.filter((entity) => entity.kind === "packet").length} packets`, ""),
      chip(`${entities.filter((entity) => entity.kind === "task").length} tasks`, ""),
      chip(`${entities.filter((entity) => entity.kind === "sub_colony").length} sub-colonies`, entities.filter((entity) => entity.kind === "sub_colony" && entity.online).length > 0 ? "good" : ""),
      chip(`critical ${Number(riskRoutes.critical || 0)}`, Number(riskRoutes.critical || 0) > 0 ? "error" : ""),
      chip(`high ${Number(riskRoutes.high || 0)}`, Number(riskRoutes.high || 0) > 0 ? "warn" : ""),
      chip(`medium ${Number(riskRoutes.medium || 0)}`, "warn"),
      chip(`low ${Number(riskRoutes.low || 0)}`, ""),
      chip(`online ${Number(state.world.summary?.onlineEntities || 0)}`, "good")
    ].join("");
  }

  function syncAutoRefresh() {
    window.clearTimeout(state.autoTimer);
    state.autoTimer = null;
    if (!autoRefreshToggle.checked) return;
    state.autoTimer = window.setTimeout(() => {
      void refreshWorld();
    }, 15000);
  }

  async function refreshWorld() {
    if (state.refreshing) return;
    state.refreshing = true;
    try {
      setLiveState("Refreshing...", "warn");
      const worldUrl = buildWorldUrl();
      const [worldPayload, dispatchPayload] = await Promise.all([
        requestJson(worldUrl),
        requestJson("/api/worker-router/dispatches?limit=12")
      ]);
      state.world = worldPayload;
      state.dispatches = asArray(dispatchPayload.dispatches);
      renderAll();
      setLiveState("Live local projection", "live");
    } catch (error) {
      setLiveState(`Refresh failed: ${error.message}`, "error");
    } finally {
      state.refreshing = false;
      syncAutoRefresh();
    }
  }

  function bind() {
    refreshBtn.addEventListener("click", () => {
      void refreshWorld();
    });
    for (const control of [districtFilter, kindFilter, riskFilter, searchInput, hotToggle]) {
      control.addEventListener("input", () => {
        renderAll();
      });
      control.addEventListener("change", () => {
        renderAll();
      });
    }
    for (const toggle of [trustedToggle, adminToggle]) {
      toggle.addEventListener("change", () => {
        void refreshWorld();
      });
    }
    autoRefreshToggle.addEventListener("change", syncAutoRefresh);
  }

  bind();
  syncAutoRefresh();
  void refreshWorld();
})();
