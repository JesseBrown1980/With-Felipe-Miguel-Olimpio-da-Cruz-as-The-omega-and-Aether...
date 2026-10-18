(function () {
  const canvas = document.getElementById("graphRuntimeCanvas");
  const canvasShell = document.getElementById("graphCanvasShell");
  const canvasEmpty = document.getElementById("graphCanvasEmpty");
  const tooltip = document.getElementById("graphTooltip");
  const liveState = document.getElementById("graphLiveState");
  const updatedAt = document.getElementById("graphUpdatedAt");
  const snapshotLink = document.getElementById("graphSnapshotLink");
  const metricCards = document.getElementById("graphMetricCards");
  const riskCards = document.getElementById("graphRiskCards");
  const breakdownCards = document.getElementById("graphBreakdownCards");
  const inspectorOutput = document.getElementById("graphInspectorOutput");
  const eventsList = document.getElementById("graphEventsList");
  const manifestsList = document.getElementById("graphManifestsList");
  const eventsEmpty = document.getElementById("graphEventsEmpty");
  const manifestsEmpty = document.getElementById("graphManifestsEmpty");
  const refreshBtn = document.getElementById("graphRefreshBtn");
  const liveToggle = document.getElementById("graphLiveToggle");
  const includeLowRisk = document.getElementById("graphIncludeLowRisk");
  const windowMinutes = document.getElementById("graphWindowMinutes");
  const maxNodes = document.getElementById("graphMaxNodes");
  const componentFilter = document.getElementById("graphComponentFilter");
  const actionFilter = document.getElementById("graphActionFilter");
  const riskFilter = document.getElementById("graphRiskFilter");
  const colorMode = document.getElementById("graphColorMode");
  const presetSelect = document.getElementById("graphPresetSelect");
  const savedViewName = document.getElementById("graphSavedViewName");
  const saveViewBtn = document.getElementById("graphSaveViewBtn");
  const savedViewSelect = document.getElementById("graphSavedViewSelect");
  const deleteViewBtn = document.getElementById("graphDeleteViewBtn");
  const playbackBtn = document.getElementById("graphPlaybackBtn");
  const playbackRange = document.getElementById("graphPlaybackRange");
  const playbackLabel = document.getElementById("graphPlaybackLabel");
  const compareRange = document.getElementById("graphCompareRange");
  const compareLabel = document.getElementById("graphCompareLabel");
  const exportLink = document.getElementById("graphExportLink");
  const freezeCompareBtn = document.getElementById("graphFreezeCompareBtn");
  const diffReportLink = document.getElementById("graphDiffReportLink");
  const trainingExportLink = document.getElementById("graphTrainingExportLink");
  const legend = document.getElementById("graphLegend");
  const legendNote = document.getElementById("graphLegendNote");
  const activityChart = document.getElementById("graphActivityChart");
  const activityMeta = document.getElementById("graphActivityMeta");
  const diffSummary = document.getElementById("graphDiffSummary");
  const diffList = document.getElementById("graphDiffList");
  const diffEmpty = document.getElementById("graphDiffEmpty");
  const archetypeSummary = document.getElementById("graphArchetypeSummary");
  const suspiciousList = document.getElementById("graphSuspiciousList");
  const suspiciousEmpty = document.getElementById("graphSuspiciousEmpty");
  const selectedRecords = document.getElementById("graphSelectedRecords");
  const selectedRecordsEmpty = document.getElementById("graphSelectedRecordsEmpty");

  const riskColors = {
    critical: "#ff6767",
    high: "#ff9d5d",
    medium: "#ffc857",
    low: "#51b8ff",
    unknown: "#9fb1ce"
  };
  const componentPalette = [
    "#64c8ff",
    "#ffb55c",
    "#8ef2c6",
    "#f79dff",
    "#ffd76b",
    "#9bb7ff",
    "#ff8a8a",
    "#8de0ff",
    "#c7ff7a",
    "#ffb3d1"
  ];
  const freshnessColors = {
    hot: "#ff6767",
    warm: "#ffb55c",
    cool: "#64c8ff",
    cold: "#3f5d8f",
    unknown: "#9fb1ce"
  };

  const state = {
    snapshot: null,
    layout: { nodes: [], edges: [] },
    hover: null,
    selected: null,
    selectedRecord: null,
    liveSource: null,
    refreshTimer: null,
    fallbackPollTimer: null,
    playbackTimer: null,
    snapshotCache: new Map(),
    snapshotCacheOrder: [],
    savedViews: new Map(),
    frozenCompare: null,
    diffOverlay: {
      addedNodes: new Set(),
      changedNodes: new Set(),
      addedEdges: new Set(),
      changedEdges: new Set()
    }
  };

  const savedViewsStorageKey = "asolaria.graphRuntime.savedViews.v1";

  const presets = {
    all: {
      windowMinutes: "360",
      maxNodes: "48",
      component: "",
      action: "",
      minRisk: "",
      includeLowRisk: false,
      colorMode: "risk"
    },
    "phone-live": {
      windowMinutes: "360",
      maxNodes: "36",
      component: "phone-edge",
      action: "",
      minRisk: "",
      includeLowRisk: false,
      colorMode: "freshness"
    },
    providers: {
      windowMinutes: "1440",
      maxNodes: "36",
      component: "brain-orchestrator",
      action: "",
      minRisk: "high",
      includeLowRisk: false,
      colorMode: "risk"
    },
    "task-ledger": {
      windowMinutes: "1440",
      maxNodes: "36",
      component: "task-ledger",
      action: "",
      minRisk: "",
      includeLowRisk: true,
      colorMode: "component"
    },
    "chat-ingress": {
      windowMinutes: "1440",
      maxNodes: "24",
      component: "chat-ingress",
      action: "",
      minRisk: "",
      includeLowRisk: true,
      colorMode: "component"
    },
    "hot-risk": {
      windowMinutes: "1440",
      maxNodes: "48",
      component: "",
      action: "",
      minRisk: "high",
      includeLowRisk: false,
      colorMode: "risk"
    }
  };

  function loadSavedViews() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(savedViewsStorageKey) || "[]");
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        if (!item || typeof item !== "object") continue;
        const name = safeText(item.name, "");
        if (!name || !item.view || typeof item.view !== "object") continue;
        state.savedViews.set(name, item.view);
      }
    } catch (_error) {
      state.savedViews.clear();
    }
  }

  function persistSavedViews() {
    const payload = Array.from(state.savedViews.entries())
      .map(([name, view]) => ({ name, view }))
      .sort((a, b) => a.name.localeCompare(b.name));
    window.localStorage.setItem(savedViewsStorageKey, JSON.stringify(payload));
  }

  function renderSavedViews() {
    const current = savedViewSelect.value;
    savedViewSelect.innerHTML = '<option value="">none</option>';
    for (const name of Array.from(state.savedViews.keys()).sort((a, b) => a.localeCompare(b))) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      savedViewSelect.appendChild(option);
    }
    if (current && state.savedViews.has(current)) {
      savedViewSelect.value = current;
    }
  }

  function captureCurrentView() {
    return {
      windowMinutes: String(windowMinutes.value || "360"),
      maxNodes: String(maxNodes.value || "48"),
      component: componentFilter.value || "",
      action: actionFilter.value || "",
      minRisk: riskFilter.value || "",
      includeLowRisk: Boolean(includeLowRisk.checked),
      colorMode: colorMode.value || "risk",
      playbackPercent: String(clampInt(playbackRange.value, 0, 100, 100)),
      comparePercent: String(clampInt(compareRange.value, 0, 100, 70))
    };
  }

  function clearFrozenCompare() {
    state.frozenCompare = null;
    freezeCompareBtn.textContent = "Freeze Compare";
    freezeCompareBtn.classList.remove("is-active");
  }

  function updateFreezeCompareButton() {
    if (state.frozenCompare) {
      freezeCompareBtn.textContent = `Frozen ${formatTime(state.frozenCompare.compareCutoffAt)}`;
      freezeCompareBtn.classList.add("is-active");
      return;
    }
    freezeCompareBtn.textContent = "Freeze Compare";
    freezeCompareBtn.classList.remove("is-active");
  }

  function applySavedView(name, shouldFetch = true) {
    const view = state.savedViews.get(name);
    if (!view) {
      savedViewSelect.value = "";
      return;
    }
    windowMinutes.value = view.windowMinutes || "360";
    maxNodes.value = view.maxNodes || "48";
    componentFilter.value = view.component || "";
    actionFilter.value = view.action || "";
    riskFilter.value = view.minRisk || "";
    includeLowRisk.checked = Boolean(view.includeLowRisk);
    colorMode.value = view.colorMode || "risk";
    playbackRange.value = String(clampInt(view.playbackPercent, 0, 100, 100));
    compareRange.value = String(clampInt(view.comparePercent, 0, 100, 70));
    savedViewName.value = name;
    savedViewSelect.value = name;
    setPresetSelectValue("custom");
    clearFrozenCompare();
    clearSnapshotCache();
    state.selected = null;
    state.selectedRecord = null;
    stopPlayback();
    updatePlaybackLabel(state.snapshot);
    if (shouldFetch) {
      void fetchSnapshot();
    }
  }

  function clampInt(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.round(parsed)));
  }

  function safeText(value, fallback) {
    const text = String(value || "").trim();
    return text || fallback;
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

  function safeTimestamp(value) {
    const parsed = new Date(value || "");
    const time = parsed.getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function componentColor(name) {
    const normalized = String(name || "unknown").trim().toLowerCase() || "unknown";
    if (normalized === "unknown") {
      return riskColors.unknown;
    }
    let hash = 0;
    for (let index = 0; index < normalized.length; index += 1) {
      hash = ((hash * 31) + normalized.charCodeAt(index)) >>> 0;
    }
    return componentPalette[hash % componentPalette.length];
  }

  function freshnessColor(name) {
    return freshnessColors[String(name || "unknown").trim().toLowerCase()] || freshnessColors.unknown;
  }

  function formatDurationMs(value) {
    const totalSeconds = Math.max(0, Math.round(Number(value || 0) / 1000));
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes < 60) return `${minutes}m ${seconds}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  function clearSnapshotCache() {
    state.snapshotCache.clear();
    state.snapshotCacheOrder = [];
  }

  function setPresetSelectValue(name) {
    presetSelect.value = Object.prototype.hasOwnProperty.call(presets, name) ? name : "custom";
  }

  function applyPreset(name, shouldFetch = true) {
    const preset = presets[name];
    if (!preset) {
      setPresetSelectValue("custom");
      return;
    }
    windowMinutes.value = preset.windowMinutes;
    maxNodes.value = preset.maxNodes;
    componentFilter.value = preset.component;
    actionFilter.value = preset.action;
    riskFilter.value = preset.minRisk;
    includeLowRisk.checked = preset.includeLowRisk;
    colorMode.value = preset.colorMode;
    savedViewSelect.value = "";
    setPresetSelectValue(name);
    clearSnapshotCache();
    clearFrozenCompare();
    state.selected = null;
    state.selectedRecord = null;
    stopPlayback();
    if (shouldFetch) {
      void fetchSnapshot();
    }
  }

  function rememberSnapshot(urlKey, snapshot) {
    if (!urlKey || !snapshot) return;
    if (state.snapshotCache.has(urlKey)) {
      state.snapshotCacheOrder = state.snapshotCacheOrder.filter((value) => value !== urlKey);
    }
    state.snapshotCache.set(urlKey, snapshot);
    state.snapshotCacheOrder.push(urlKey);
    while (state.snapshotCacheOrder.length > 48) {
      const staleKey = state.snapshotCacheOrder.shift();
      if (staleKey) {
        state.snapshotCache.delete(staleKey);
      }
    }
  }

  function getCachedSnapshot(urlKey) {
    return state.snapshotCache.get(urlKey) || null;
  }

  function levelRank(level) {
    switch (String(level || "").toLowerCase()) {
      case "critical":
        return 4;
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
        return 1;
      default:
        return 0;
    }
  }

  function refsForRecord(record) {
    const refs = [];
    for (const key of ["actor", "subject", "target"]) {
      const ref = record?.[key];
      if (!ref || typeof ref !== "object") continue;
      const type = safeText(ref.type, "unknown");
      const id = safeText(ref.id || ref.label, "");
      if (!id) continue;
      refs.push(`${type}:${id}`);
    }
    return refs;
  }

  function edgeKeysForRecord(record) {
    const refs = refsForRecord(record);
    const actor = refs[0] || "";
    const subject = refs[1] || "";
    const target = refs[2] || "";
    const edges = [];
    if (record?.kind === "action_manifest") {
      if (actor && target && actor !== target) {
        edges.push(`${actor}=>${target}`);
      }
      return edges;
    }
    if (actor && subject && actor !== subject) {
      edges.push(`${actor}=>${subject}`);
    }
    if (subject && target && subject !== target) {
      edges.push(`${subject}=>${target}`);
    } else if (actor && target && actor !== target) {
      edges.push(`${actor}=>${target}`);
    }
    return edges;
  }

  function visibleRecords(snapshot) {
    const events = Array.isArray(snapshot?.records?.events) ? snapshot.records.events.map((record) => ({ ...record, _kind: "graph_event" })) : [];
    const manifests = Array.isArray(snapshot?.records?.manifests) ? snapshot.records.manifests.map((record) => ({ ...record, _kind: "action_manifest" })) : [];
    return [...events, ...manifests].sort((a, b) => safeTimestamp(b.at || b.createdAt) - safeTimestamp(a.at || a.createdAt));
  }

  function currentPlaybackCutoff(snapshot) {
    if (state.frozenCompare?.cutoffAt) {
      return state.frozenCompare.cutoffAt;
    }
    const earliest = safeTimestamp(snapshot?.timeline?.earliestAt);
    const latest = safeTimestamp(snapshot?.timeline?.latestAt);
    const percent = clampInt(arguments.length > 1 ? arguments[1] : playbackRange.value, 0, 100, 100);
    if (!earliest || !latest || percent >= 100) {
      return "";
    }
    return new Date(earliest + ((latest - earliest) * (percent / 100))).toISOString();
  }

  function currentCompareCutoff(snapshot) {
    if (state.frozenCompare?.compareCutoffAt) {
      return state.frozenCompare.compareCutoffAt;
    }
    const earliest = safeTimestamp(snapshot?.timeline?.earliestAt);
    const latest = safeTimestamp(snapshot?.timeline?.latestAt);
    const currentPercent = clampInt(playbackRange.value, 0, 100, 100);
    const comparePercent = Math.min(currentPercent, clampInt(compareRange.value, 0, 100, 70));
    if (!earliest || !latest || comparePercent >= 100) {
      return "";
    }
    return new Date(earliest + ((latest - earliest) * (comparePercent / 100))).toISOString();
  }

  function updatePlaybackLabel(snapshot) {
    const percent = clampInt(playbackRange.value, 0, 100, 100);
    const cutoff = currentPlaybackCutoff(snapshot);
    if (!snapshot?.timeline?.earliestAt || !snapshot?.timeline?.latestAt) {
      playbackLabel.textContent = "No timeline";
      return;
    }
    playbackLabel.textContent = state.frozenCompare
      ? `Frozen current ${formatTime(cutoff)}`
      : (percent >= 100 ? "Latest" : `<= ${formatTime(cutoff)}`);
    const comparePercent = Math.min(percent, clampInt(compareRange.value, 0, 100, 70));
    const compareCutoff = currentCompareCutoff(snapshot);
    compareLabel.textContent = state.frozenCompare
      ? `Compare frozen ${formatTime(compareCutoff)}`
      : (comparePercent >= 100 ? "Compare: latest" : `Compare: <= ${formatTime(compareCutoff)}`);
  }

  function setPlaybackRunning(running) {
    playbackBtn.textContent = running ? "Stop" : "Play";
  }

  function setLiveState(label, kind) {
    liveState.textContent = label;
    liveState.className = "graph-runtime-pill";
    if (kind) liveState.classList.add(`is-${kind}`);
  }

  function buildSnapshotUrl(basePath, options = {}) {
    const url = new URL(basePath, window.location.origin);
    url.searchParams.set("windowMinutes", String(clampInt(windowMinutes.value, 1, 4320, 360)));
    url.searchParams.set("maxNodes", String(clampInt(maxNodes.value, 8, 180, 48)));
    url.searchParams.set("includeLowRisk", includeLowRisk.checked ? "1" : "0");
    url.searchParams.set("component", componentFilter.value || "");
    url.searchParams.set("action", actionFilter.value || "");
    url.searchParams.set("minRisk", riskFilter.value || "");
    url.searchParams.set("eventLimit", "500");
    url.searchParams.set("manifestLimit", "220");
    url.searchParams.set("recentEventLimit", "18");
    url.searchParams.set("recentManifestLimit", "12");
    url.searchParams.set("timelineBuckets", "18");
    const cutoffAt = Object.prototype.hasOwnProperty.call(options, "cutoffAt")
      ? options.cutoffAt
      : currentPlaybackCutoff(options.timelineSnapshot || state.snapshot, options.rangeValue);
    const compareCutoffAt = Object.prototype.hasOwnProperty.call(options, "compareCutoffAt")
      ? options.compareCutoffAt
      : currentCompareCutoff(options.timelineSnapshot || state.snapshot);
    if (cutoffAt) {
      url.searchParams.set("cutoffAt", cutoffAt);
    }
    if (compareCutoffAt) {
      url.searchParams.set("compareCutoffAt", compareCutoffAt);
    }
    return url;
  }

  function snapshotUrl(options = {}) {
    return buildSnapshotUrl("/api/graph-runtime/snapshot", options);
  }

  function exportUrl(options = {}) {
    return buildSnapshotUrl("/api/graph-runtime/export", options);
  }

  function diffReportUrl(options = {}) {
    return buildSnapshotUrl("/api/graph-runtime/diff-report", options);
  }

  function trainingExportUrl(options = {}) {
    return buildSnapshotUrl("/api/graph-runtime/training-export", options);
  }

  function scheduleSnapshotRefresh(delayMs) {
    if (state.refreshTimer) {
      window.clearTimeout(state.refreshTimer);
    }
    state.refreshTimer = window.setTimeout(() => {
      state.refreshTimer = null;
      void fetchSnapshot();
    }, delayMs);
  }

  function buildMetricCard(label, value) {
    const card = document.createElement("div");
    card.className = "graph-runtime-metric";
    card.innerHTML = `<span class="graph-runtime-metric-label">${label}</span><span class="graph-runtime-metric-value">${value}</span>`;
    return card;
  }

  function buildRiskCard(label, value, level) {
    const card = document.createElement("div");
    card.className = "graph-runtime-risk-card";
    card.innerHTML = `<strong>${label}</strong><span style="color:${riskColors[level] || riskColors.unknown}">${value}</span>`;
    return card;
  }

  function buildBreakdownCard(label, items) {
    const card = document.createElement("div");
    card.className = "graph-runtime-breakdown-card";
    const text = (items || []).slice(0, 3).map((item) => `${item.value} (${item.count})`).join("\n") || "No data";
    card.innerHTML = `<strong>${label}</strong><span>${text.replace(/\n/g, "<br />")}</span>`;
    return card;
  }

  function buildLegendItem(label, color, suffix = "") {
    const item = document.createElement("span");
    item.className = "graph-runtime-legend-item";
    const swatch = document.createElement("span");
    swatch.className = "graph-runtime-legend-swatch";
    swatch.style.background = color;
    const text = document.createElement("span");
    text.textContent = suffix ? `${label} (${suffix})` : label;
    item.appendChild(swatch);
    item.appendChild(text);
    return item;
  }

  function buildMiniListItem(titleText, detailText, metaText) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = titleText;
    const detail = document.createElement("span");
    detail.textContent = detailText;
    item.appendChild(title);
    item.appendChild(detail);
    if (metaText) {
      const meta = document.createElement("span");
      meta.textContent = metaText;
      item.appendChild(meta);
    }
    return item;
  }

  function syncSelectOptions(selectElement, values) {
    const current = String(selectElement.value || "");
    const nextValues = ["", ...(values || [])];
    const signature = nextValues.join("|");
    if (selectElement.dataset.signature === signature) {
      if (nextValues.includes(current)) {
        selectElement.value = current;
      }
      return;
    }
    selectElement.dataset.signature = signature;
    selectElement.innerHTML = "";
    for (const value of nextValues) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value || "all";
      selectElement.appendChild(option);
    }
    selectElement.value = nextValues.includes(current) ? current : "";
  }

  function makeRiskPill(level) {
    const span = document.createElement("span");
    const normalized = safeText(level, "unknown").toLowerCase();
    span.className = `graph-runtime-risk-pill is-${normalized}`;
    span.textContent = normalized;
    return span;
  }

  function describeRecord(record) {
    const actor = safeText(record?.actor?.label || record?.actor?.id, "system");
    const subject = safeText(record?.subject?.label || record?.subject?.id, "");
    const target = safeText(record?.target?.label || record?.target?.id, "");
    if (subject && target) return `${actor} -> ${subject} -> ${target}`;
    if (target) return `${actor} -> ${target}`;
    if (subject) return `${actor} -> ${subject}`;
    return actor;
  }

  function renderLegend(snapshot) {
    legend.innerHTML = "";
    legendNote.textContent = "";
    if (!snapshot) return;

    if (colorMode.value === "freshness") {
      [
        ["hot", freshnessColors.hot],
        ["warm", freshnessColors.warm],
        ["cool", freshnessColors.cool],
        ["cold", freshnessColors.cold]
      ].forEach(([label, color]) => {
        legend.appendChild(buildLegendItem(label, color));
      });
      legendNote.textContent = "Freshness mode colors nodes and edges by how recently they were last seen within the current visible timeline.";
      return;
    }

    if (colorMode.value === "component") {
      const components = Array.isArray(snapshot?.breakdown?.eventComponents)
        ? snapshot.breakdown.eventComponents.slice(0, 8)
        : [];
      if (!components.length) {
        const fallback = (snapshot?.available?.components || []).slice(0, 8).map((value) => ({ value, count: 0 }));
        for (const item of fallback) {
          legend.appendChild(buildLegendItem(item.value, componentColor(item.value), item.count || ""));
        }
      } else {
        for (const item of components) {
          legend.appendChild(buildLegendItem(item.value, componentColor(item.value), item.count));
        }
      }
      legendNote.textContent = "Component mode colors nodes and edges by the dominant visible component in the current filtered slice.";
      return;
    }

    [
      ["critical", riskColors.critical],
      ["high", riskColors.high],
      ["medium", riskColors.medium],
      ["low", riskColors.low]
    ].forEach(([label, color]) => {
      legend.appendChild(buildLegendItem(label, color));
    });
    legendNote.textContent = "Risk mode colors nodes and edges by the maximum observed risk level in the current visible graph.";
    if (snapshot?.compare?.diff?.compareEnabled) {
      legend.appendChild(buildLegendItem("added overlay", "#58f0c9"));
      legend.appendChild(buildLegendItem("changed overlay", "#ffcf73"));
      legendNote.textContent += " Diff overlays highlight newly added and changed visible graph elements.";
    }
  }

  function renderSummary(snapshot) {
    metricCards.innerHTML = "";
    riskCards.innerHTML = "";
    breakdownCards.innerHTML = "";

    const counts = snapshot?.counts || {};
    metricCards.appendChild(buildMetricCard("Visible Events", counts.visibleEvents || 0));
    metricCards.appendChild(buildMetricCard("Visible Manifests", counts.visibleManifests || 0));
    metricCards.appendChild(buildMetricCard("Nodes", counts.nodes || 0));
    metricCards.appendChild(buildMetricCard("Edges", counts.edges || 0));

    const eventRisk = snapshot?.risk?.events || {};
    riskCards.appendChild(buildRiskCard("Critical", eventRisk.critical || 0, "critical"));
    riskCards.appendChild(buildRiskCard("High", eventRisk.high || 0, "high"));
    riskCards.appendChild(buildRiskCard("Medium", eventRisk.medium || 0, "medium"));
    riskCards.appendChild(buildRiskCard("Low", eventRisk.low || 0, "low"));

    const breakdown = snapshot?.breakdown || {};
    breakdownCards.appendChild(buildBreakdownCard("Components", breakdown.eventComponents));
    breakdownCards.appendChild(buildBreakdownCard("Event Actions", breakdown.eventActions));
    breakdownCards.appendChild(buildBreakdownCard("Manifest Actions", breakdown.manifestActions));

    syncSelectOptions(componentFilter, snapshot?.available?.components || []);
    syncSelectOptions(actionFilter, snapshot?.available?.actions || []);
    updatedAt.textContent = snapshot?.generatedAt
      ? `Snapshot ${formatTime(snapshot.generatedAt)}`
      : "No snapshot yet";
    snapshotLink.href = snapshotUrl().toString();
    exportLink.href = exportUrl().toString();
    diffReportLink.href = diffReportUrl().toString();
    trainingExportLink.href = trainingExportUrl().toString();
    updatePlaybackLabel(snapshot);
    updateFreezeCompareButton();
    renderLegend(snapshot);
  }

  function renderActivity(snapshot) {
    activityChart.innerHTML = "";
    const buckets = Array.isArray(snapshot?.activity?.buckets) ? snapshot.activity.buckets : [];
    if (!buckets.length) {
      activityMeta.textContent = "No visible activity buckets in the current slice.";
      return;
    }
    const compareCutoff = safeTimestamp(snapshot?.compare?.effectiveCutoffAt);
    for (const bucket of buckets) {
      const bar = document.createElement("div");
      bar.className = "graph-runtime-mini-bar";
      if (compareCutoff && safeTimestamp(bucket.endAt) <= compareCutoff) {
        bar.classList.add("is-compare");
      }
      const totalHeight = Math.max(18, Math.round(18 + (bucket.totalRatio * 126)));
      bar.style.height = `${totalHeight}px`;
      bar.style.setProperty("--risk-fill", `${Math.max(0, Math.min(100, Math.round(bucket.riskRatio * 100)))}%`);
      bar.title = `${formatTime(bucket.startAt)} - ${formatTime(bucket.endAt)} | total ${bucket.total} | weighted risk ${bucket.weightedRisk}`;
      activityChart.appendChild(bar);
    }
    activityMeta.textContent = `Buckets ${formatTime(snapshot.activity.earliestAt)} to ${formatTime(snapshot.activity.latestAt)}. Highlighted bars fall at or before the compare point.`;
  }

  function renderDiff(snapshot) {
    diffSummary.innerHTML = "";
    diffList.innerHTML = "";
    const compare = snapshot?.compare;
    const diff = compare?.diff;
    if (!compare || !diff?.compareEnabled) {
      diffEmpty.hidden = false;
      diffEmpty.textContent = "Move the compare slider to generate a diff.";
      return;
    }
    diffEmpty.hidden = false;
    diffEmpty.textContent = `Baseline ${formatTime(compare.effectiveCutoffAt)} against current ${formatTime(snapshot.latestAt || snapshot.generatedAt)}.`;

    [
      ["+ nodes", diff.summary.addedNodes],
      ["- nodes", diff.summary.removedNodes],
      ["~ nodes", diff.summary.changedNodes],
      ["+ edges", diff.summary.addedEdges],
      ["- edges", diff.summary.removedEdges],
      ["~ edges", diff.summary.changedEdges]
    ].forEach(([label, value]) => {
      const chip = document.createElement("span");
      chip.className = "graph-runtime-diff-chip";
      chip.textContent = `${label}: ${value}`;
      diffSummary.appendChild(chip);
    });

    const entries = [];
    for (const edge of diff.addedEdges || []) {
      entries.push(buildMiniListItem(
        `Added edge: ${edge.source} -> ${edge.target}`,
        `${safeText(edge.primaryComponent, "unknown")} | ${edge.maxRiskLevel} | count ${edge.count}`,
        `Last seen ${formatTime(edge.lastSeen)}`
      ));
    }
    for (const edge of diff.changedEdges || []) {
      entries.push(buildMiniListItem(
        `Changed edge: ${edge.source} -> ${edge.target}`,
        `count ${edge.countDelta >= 0 ? "+" : ""}${edge.countDelta} | ${edge.riskFrom} -> ${edge.riskTo}`,
        `${safeText(edge.componentFrom, "unknown")} -> ${safeText(edge.componentTo, "unknown")}`
      ));
    }
    for (const edge of diff.removedEdges || []) {
      entries.push(buildMiniListItem(
        `Removed edge: ${edge.source} -> ${edge.target}`,
        `${safeText(edge.primaryComponent, "unknown")} | ${edge.maxRiskLevel} | count ${edge.count}`,
        `Last seen ${formatTime(edge.lastSeen)}`
      ));
    }
    for (const node of diff.addedNodes || []) {
      entries.push(buildMiniListItem(
        `Added node: ${node.label}`,
        `${node.type} | ${safeText(node.primaryComponent, "unknown")} | ${node.maxRiskLevel}`,
        `Freshness ${safeText(node.freshnessBand, "unknown")}`
      ));
    }
    for (const node of diff.changedNodes || []) {
      entries.push(buildMiniListItem(
        `Changed node: ${node.label}`,
        `count ${node.countDelta >= 0 ? "+" : ""}${node.countDelta} | ${node.riskFrom} -> ${node.riskTo}`,
        `${safeText(node.componentFrom, "unknown")} -> ${safeText(node.componentTo, "unknown")}`
      ));
    }
    for (const node of diff.removedNodes || []) {
      entries.push(buildMiniListItem(
        `Removed node: ${node.label}`,
        `${node.type} | ${safeText(node.primaryComponent, "unknown")} | ${node.maxRiskLevel}`,
        `Last seen ${formatTime(node.lastSeen)}`
      ));
    }

    if (!entries.length) {
      diffEmpty.textContent = `No visible graph changes between ${formatTime(compare.effectiveCutoffAt)} and now.`;
      return;
    }
    diffEmpty.hidden = true;
    entries.slice(0, 12).forEach((entry) => diffList.appendChild(entry));
  }

  function renderInsights(snapshot) {
    archetypeSummary.innerHTML = "";
    suspiciousList.innerHTML = "";
    const archetypes = Array.isArray(snapshot?.insights?.archetypes) ? snapshot.insights.archetypes : [];
    const suspiciousEdges = Array.isArray(snapshot?.insights?.suspiciousEdges) ? snapshot.insights.suspiciousEdges : [];
    const prototypeLane = snapshot?.insights?.prototypeLane || {};
    const prototypeSummary = Array.isArray(prototypeLane.summary) ? prototypeLane.summary : [];
    const prototypeMatches = Array.isArray(prototypeLane.matches) ? prototypeLane.matches : [];

    if (!archetypes.length) {
      const chip = document.createElement("span");
      chip.className = "graph-runtime-diff-chip";
      chip.textContent = "No archetypes";
      archetypeSummary.appendChild(chip);
    } else {
      archetypes.slice(0, 8).forEach((item) => {
        const chip = document.createElement("span");
        chip.className = "graph-runtime-diff-chip";
        chip.textContent = `${item.value}: ${item.count}`;
        archetypeSummary.appendChild(chip);
      });
    }
    prototypeSummary.slice(0, 4).forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "graph-runtime-diff-chip";
      chip.textContent = `proto ${item.value}: ${item.count}`;
      archetypeSummary.appendChild(chip);
    });

    suspiciousEmpty.hidden = suspiciousEdges.length > 0;
    suspiciousEmpty.textContent = "No suspicious edges in the current slice.";
    suspiciousEdges.slice(0, 10).forEach((edge) => {
      const prototypeMatch = prototypeMatches.find((item) => item.edgeId === edge.id)?.bestPrototype || null;
      suspiciousList.appendChild(buildMiniListItem(
        `${edge.sourceLabel} -> ${edge.targetLabel}`,
        `score ${edge.suspiciousScore} | ${edge.maxRiskLevel} | ${safeText(edge.primaryComponent, "unknown")} | ${safeText(edge.freshnessBand, "unknown")}`,
        `${(edge.tags || []).join(", ") || "no tags"}${prototypeMatch ? ` | ${prototypeMatch.label} @ ${prototypeMatch.similarity}` : ""}`
      ));
    });
  }

  function renderFeed(listElement, emptyElement, records, emptyText, kindLabel) {
    listElement.innerHTML = "";
    const items = Array.isArray(records) ? records : [];
    emptyElement.hidden = items.length > 0;
    emptyElement.textContent = emptyText;
    for (const record of items) {
      const item = document.createElement("li");
      item.className = "graph-runtime-feed-item is-clickable";

      const header = document.createElement("div");
      header.className = "graph-runtime-feed-item-header";
      const title = document.createElement("strong");
      title.textContent = safeText(record?.action || record?.status, kindLabel);
      header.appendChild(title);
      header.appendChild(makeRiskPill(record?.risk?.level || "unknown"));

      const body = document.createElement("p");
      body.textContent = describeRecord(record);

      const meta = document.createElement("div");
      meta.className = "graph-runtime-feed-item-meta";
      meta.innerHTML = `
        <span>${formatTime(record?.at || record?.createdAt)}</span>
        <span>${safeText(record?.component, "unknown_component")}</span>
        <span>${Math.round(Number(record?.risk?.score || 0))}</span>
      `;

      item.appendChild(header);
      item.appendChild(body);
      item.appendChild(meta);
      item.addEventListener("click", () => {
        state.selectedRecord = { ...record, _kind: record?.kind || (kindLabel === "manifest" ? "action_manifest" : "graph_event") };
        renderInspector();
      });
      listElement.appendChild(item);
    }
  }

  function sameRecord(left, right) {
    if (!left || !right) return false;
    return String(left.id || "") === String(right.id || "")
      && String(left._kind || left.kind || "") === String(right._kind || right.kind || "");
  }

  function selectionMatchesRecord(record, selection) {
    if (!selection) return false;
    if (selection.type === "node") {
      return refsForRecord(record).includes(selection.payload.id);
    }
    if (selection.type === "edge") {
      return edgeKeysForRecord(record).includes(selection.payload.id);
    }
    return false;
  }

  function renderSelectedRecords(snapshot) {
    selectedRecords.innerHTML = "";
    if (!state.selected) {
      selectedRecordsEmpty.hidden = false;
      selectedRecordsEmpty.textContent = "Select a node or edge to see matching records.";
      return;
    }

    const matches = visibleRecords(snapshot).filter((record) => selectionMatchesRecord(record, state.selected)).slice(0, 12);
    selectedRecordsEmpty.hidden = matches.length > 0;
    selectedRecordsEmpty.textContent = "No matching filtered records for the current selection.";
    for (const record of matches) {
      const item = document.createElement("li");
      item.className = "graph-runtime-feed-item is-clickable";
      if (sameRecord(record, state.selectedRecord)) {
        item.classList.add("is-selected");
      }

      const header = document.createElement("div");
      header.className = "graph-runtime-feed-item-header";
      const title = document.createElement("strong");
      title.textContent = `${safeText(record.action || record.status, record._kind)} (${record._kind === "action_manifest" ? "manifest" : "event"})`;
      header.appendChild(title);
      header.appendChild(makeRiskPill(record?.risk?.level || "unknown"));

      const body = document.createElement("p");
      body.textContent = describeRecord(record);

      const meta = document.createElement("div");
      meta.className = "graph-runtime-feed-item-meta";
      meta.innerHTML = `
        <span>${formatTime(record?.at || record?.createdAt)}</span>
        <span>${safeText(record?.component, "unknown_component")}</span>
        <span>${Math.round(Number(record?.risk?.score || 0))}</span>
      `;

      item.appendChild(header);
      item.appendChild(body);
      item.appendChild(meta);
      item.addEventListener("click", () => {
        state.selectedRecord = record;
        renderInspector();
        renderSelectedRecords(snapshot);
      });
      selectedRecords.appendChild(item);
    }
  }

  function layoutGraph(graph, width, height) {
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes.slice() : [];
    const edges = Array.isArray(graph?.edges) ? graph.edges.slice() : [];
    if (!nodes.length) return { nodes: [], edges: [] };

    const centerX = width / 2;
    const centerY = height / 2;
    const ringSpacing = Math.max(120, Math.min(width, height) * 0.22);
    const capacities = [8, 16, 24, 40, 64];
    const positioned = new Map();
    const firstNode = nodes[0];
    const firstRiskBoost = Math.max(0, Number(firstNode.maxRiskScore || 0)) / 100;
    positioned.set(firstNode.id, {
      ...firstNode,
      x: centerX,
      y: centerY,
      radius: Math.max(12, Math.min(26, 12 + (firstNode.degree || 0) * 0.75 + firstRiskBoost * 10)),
      riskColor: riskColors[firstNode.maxRiskLevel] || riskColors.unknown,
      componentColor: componentColor(firstNode.primaryComponent)
    });

    let nodeIndex = 1;
    let ring = 1;
    while (nodeIndex < nodes.length) {
      const capacity = capacities[Math.min(ring - 1, capacities.length - 1)];
      const ringStart = nodeIndex;
      const ringEnd = Math.min(nodes.length, nodeIndex + capacity);
      const totalInRing = Math.max(1, ringEnd - ringStart);
      const radius = ringSpacing * ring;
      for (let slot = 0; nodeIndex < ringEnd; slot += 1, nodeIndex += 1) {
        const node = nodes[nodeIndex];
        const angle = ((Math.PI * 2) / totalInRing) * slot - (Math.PI / 2);
        const riskBoost = Math.max(0, Number(node.maxRiskScore || 0)) / 100;
        positioned.set(node.id, {
          ...node,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          radius: Math.max(10, Math.min(24, 10 + (node.degree || 0) * 0.65 + riskBoost * 10)),
          riskColor: riskColors[node.maxRiskLevel] || riskColors.unknown,
          componentColor: componentColor(node.primaryComponent)
        });
      }
      ring += 1;
    }

    return {
      nodes: Array.from(positioned.values()),
      edges: edges
        .map((edge) => ({
          ...edge,
          sourceNode: positioned.get(edge.source),
          targetNode: positioned.get(edge.target),
          riskColor: riskColors[edge.maxRiskLevel] || riskColors.unknown,
          componentColor: componentColor(edge.primaryComponent)
        }))
        .filter((edge) => edge.sourceNode && edge.targetNode)
    };
  }

  function resolveNodeColor(node) {
    if (colorMode.value === "freshness") {
      return freshnessColor(node.freshnessBand);
    }
    if (colorMode.value === "component") {
      return node.componentColor || componentColor(node.primaryComponent);
    }
    return node.riskColor || riskColors[node.maxRiskLevel] || riskColors.unknown;
  }

  function resolveEdgeColor(edge) {
    if (colorMode.value === "freshness") {
      return freshnessColor(edge.freshnessBand);
    }
    if (colorMode.value === "component") {
      return edge.componentColor || componentColor(edge.primaryComponent);
    }
    return edge.riskColor || riskColors[edge.maxRiskLevel] || riskColors.unknown;
  }

  function updateDiffOverlay(snapshot) {
    const diff = snapshot?.compare?.diff;
    state.diffOverlay = {
      addedNodes: new Set((diff?.addedNodes || []).map((item) => item.id)),
      changedNodes: new Set((diff?.changedNodes || []).map((item) => item.id)),
      addedEdges: new Set((diff?.addedEdges || []).map((item) => item.id)),
      changedEdges: new Set((diff?.changedEdges || []).map((item) => item.id))
    };
  }

  function resizeCanvas() {
    const rect = canvasShell.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(420, Math.floor(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function distanceToEdge(pointX, pointY, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(pointX - x1, pointY - y1);
    const t = Math.max(0, Math.min(1, ((pointX - x1) * dx + (pointY - y1) * dy) / ((dx * dx) + (dy * dy))));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    return Math.hypot(pointX - px, pointY - py);
  }

  function findHit(x, y) {
    for (const node of state.layout.nodes) {
      if (Math.hypot(x - node.x, y - node.y) <= node.radius + 5) {
        return { type: "node", payload: node };
      }
    }
    for (const edge of state.layout.edges) {
      const distance = distanceToEdge(x, y, edge.sourceNode.x, edge.sourceNode.y, edge.targetNode.x, edge.targetNode.y);
      if (distance <= 7) {
        return { type: "edge", payload: edge };
      }
    }
    return null;
  }

  function renderTooltip(hit, mouseX, mouseY) {
    if (!hit) {
      tooltip.classList.remove("is-visible");
      return;
    }
    let title = "";
    let subtitle = "";
    let detail = "";
    let overlayState = "";
    if (hit.type === "node") {
      title = hit.payload.label;
      subtitle = `${hit.payload.type} | degree ${hit.payload.degree} | ${hit.payload.maxRiskLevel}`;
      detail = `${hit.payload.domain || "local"} | ${hit.payload.entityId} | ${safeText(hit.payload.primaryComponent, "unknown")} | ${safeText(hit.payload.freshnessBand, "unknown")}`;
      if (state.diffOverlay.addedNodes.has(hit.payload.id)) overlayState = "added";
      else if (state.diffOverlay.changedNodes.has(hit.payload.id)) overlayState = "changed";
    } else {
      title = `${hit.payload.sourceNode.label} -> ${hit.payload.targetNode.label}`;
      subtitle = `${hit.payload.maxRiskLevel} | count ${hit.payload.count}`;
      detail = `${hit.payload.actions.join(", ")} | ${safeText(hit.payload.primaryComponent, "unknown")} | ${safeText(hit.payload.freshnessBand, "unknown")}`;
      if (state.diffOverlay.addedEdges.has(hit.payload.id)) overlayState = "added";
      else if (state.diffOverlay.changedEdges.has(hit.payload.id)) overlayState = "changed";
    }
    if (overlayState) {
      detail += ` | diff:${overlayState}`;
    }
    tooltip.innerHTML = `<strong>${title}</strong><div style="margin-top:4px;color:var(--ink-muted)">${subtitle}</div><div style="margin-top:6px">${detail}</div>`;
    tooltip.style.left = `${Math.min(canvas.width - 240, mouseX + 16)}px`;
    tooltip.style.top = `${Math.min(canvas.height - 120, mouseY + 18)}px`;
    tooltip.classList.add("is-visible");
  }

  function drawGraph() {
    resizeCanvas();
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvasEmpty.hidden = state.layout.nodes.length > 0;
    canvasEmpty.style.display = state.layout.nodes.length > 0 ? "none" : "grid";
    if (!state.layout.nodes.length) return;

    ctx.save();
    ctx.lineCap = "round";

    for (const edge of state.layout.edges) {
      const isSelected = state.selected && state.selected.type === "edge" && state.selected.payload.id === edge.id;
      const isHovered = state.hover && state.hover.type === "edge" && state.hover.payload.id === edge.id;
      const isAdded = state.diffOverlay.addedEdges.has(edge.id);
      const isChanged = state.diffOverlay.changedEdges.has(edge.id);
      ctx.beginPath();
      ctx.strokeStyle = resolveEdgeColor(edge);
      const freshnessAlpha = colorMode.value === "freshness"
        ? Math.max(0.16, 0.18 + (Number(edge.freshness || 0) * 0.78))
        : 0.32;
      ctx.globalAlpha = isSelected ? 0.95 : isHovered ? 0.72 : freshnessAlpha;
      ctx.lineWidth = Math.max(1, Math.min(6, 1 + edge.count * 0.18)) + (isAdded ? 1 : 0);
      if (isAdded) {
        ctx.setLineDash([10, 6]);
      } else if (isChanged) {
        ctx.setLineDash([4, 7]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(edge.sourceNode.x, edge.sourceNode.y);
      ctx.lineTo(edge.targetNode.x, edge.targetNode.y);
      ctx.stroke();
      if (isAdded || isChanged) {
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.strokeStyle = isAdded ? "#58f0c9" : "#ffcf73";
        ctx.globalAlpha = isSelected ? 0.98 : 0.85;
        ctx.lineWidth = isAdded ? 2.4 : 2;
        ctx.moveTo(edge.sourceNode.x, edge.sourceNode.y);
        ctx.lineTo(edge.targetNode.x, edge.targetNode.y);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;

    for (const node of state.layout.nodes) {
      const isSelected = state.selected && state.selected.type === "node" && state.selected.payload.id === node.id;
      const isHovered = state.hover && state.hover.type === "node" && state.hover.payload.id === node.id;
      const isAdded = state.diffOverlay.addedNodes.has(node.id);
      const isChanged = state.diffOverlay.changedNodes.has(node.id);
      const fillColor = resolveNodeColor(node);
      ctx.beginPath();
      ctx.fillStyle = fillColor;
      ctx.shadowColor = fillColor;
      ctx.shadowBlur = isSelected ? 24 : isHovered ? 18 : 10;
      ctx.globalAlpha = colorMode.value === "freshness"
        ? Math.max(0.55, 0.45 + (Number(node.freshness || 0) * 0.55))
        : 1;
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255,255,255,0.22)";
      ctx.stroke();
      if (isAdded || isChanged) {
        ctx.beginPath();
        ctx.lineWidth = isAdded ? 2.8 : 2.2;
        ctx.strokeStyle = isAdded ? "#58f0c9" : "#ffcf73";
        ctx.arc(node.x, node.y, node.radius + (isAdded ? 5 : 4), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "#eaf1ff";
      ctx.font = `${Math.max(11, Math.min(14, 10 + node.radius * 0.18))}px Sora, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(node.label.slice(0, 24), node.x, node.y + node.radius + 8);
    }

    ctx.restore();
  }

  function renderInspector() {
    if (!state.selected && state.selectedRecord) {
      inspectorOutput.textContent = JSON.stringify({
        selectionType: "record",
        rawRecord: state.selectedRecord
      }, null, 2);
      return;
    }
    if (!state.selected) {
      inspectorOutput.textContent = "Select a node or edge to inspect it.";
      return;
    }
    if (state.selectedRecord) {
      inspectorOutput.textContent = JSON.stringify({
        selectionType: state.selected.type,
        selectionId: state.selected.payload.id,
        rawRecord: state.selectedRecord
      }, null, 2);
      return;
    }
    const payload = { ...state.selected.payload };
    if (payload.sourceNode) {
      payload.sourceNode = { id: payload.sourceNode.id, label: payload.sourceNode.label, type: payload.sourceNode.type };
    }
    if (payload.targetNode) {
      payload.targetNode = { id: payload.targetNode.id, label: payload.targetNode.label, type: payload.targetNode.type };
    }
    inspectorOutput.textContent = JSON.stringify({ selectionType: state.selected.type, payload }, null, 2);
  }

  function renderGraph(snapshot) {
    updateDiffOverlay(snapshot);
    state.layout = layoutGraph(snapshot?.graph, canvas.clientWidth || 960, canvas.clientHeight || 640);
    if (state.selected) {
      const selectedId = state.selected.payload?.id;
      const collection = state.selected.type === "node" ? state.layout.nodes : state.layout.edges;
      const refreshed = collection.find((item) => item.id === selectedId);
      state.selected = refreshed ? { type: state.selected.type, payload: refreshed } : null;
      if (!state.selected) {
        state.selectedRecord = null;
      }
    }
    drawGraph();
    renderInspector();
    renderSelectedRecords(snapshot);
  }

  function renderSnapshot(snapshot) {
    state.snapshot = snapshot;
    renderSummary(snapshot);
    renderActivity(snapshot);
    renderDiff(snapshot);
    renderInsights(snapshot);
    renderFeed(eventsList, eventsEmpty, snapshot?.recent?.events, "No runtime events in the current window.", "event");
    renderFeed(manifestsList, manifestsEmpty, snapshot?.recent?.manifests, "No action manifests in the current window.", "manifest");
    renderGraph(snapshot);
  }

  function freezeCurrentCompare() {
    if (!state.snapshot) return;
    const cutoffAt = state.snapshot?.filtersApplied?.cutoffAt || state.snapshot.latestAt || state.snapshot.generatedAt || "";
    const compareCutoffAt = state.snapshot?.compare?.effectiveCutoffAt || currentCompareCutoff(state.snapshot);
    if (!cutoffAt || !compareCutoffAt) return;
    state.frozenCompare = {
      cutoffAt,
      compareCutoffAt,
      frozenAt: new Date().toISOString()
    };
    updatePlaybackLabel(state.snapshot);
    updateFreezeCompareButton();
  }

  function saveNamedView() {
    const name = safeText(savedViewName.value, "");
    if (!name) {
      savedViewName.focus();
      return;
    }
    state.savedViews.set(name, captureCurrentView());
    persistSavedViews();
    renderSavedViews();
    savedViewSelect.value = name;
  }

  function deleteSelectedView() {
    const name = savedViewSelect.value || safeText(savedViewName.value, "");
    if (!name || !state.savedViews.has(name)) {
      return;
    }
    state.savedViews.delete(name);
    persistSavedViews();
    renderSavedViews();
    if (savedViewSelect.value === name) {
      savedViewSelect.value = "";
    }
    if (safeText(savedViewName.value, "") === name) {
      savedViewName.value = "";
    }
  }

  async function fetchSnapshot(options = {}) {
    const url = snapshotUrl(options);
    const urlKey = url.toString();
    if (!options.background) {
      snapshotLink.href = urlKey;
      exportLink.href = exportUrl(options).toString();
      diffReportLink.href = diffReportUrl(options).toString();
      trainingExportLink.href = trainingExportUrl(options).toString();
    }
    const cached = !options.forceNetwork ? getCachedSnapshot(urlKey) : null;
    if (cached) {
      if (!options.background) {
        renderSnapshot(cached);
        setLiveState(liveToggle.checked ? "Live" : "Paused", liveToggle.checked ? "live" : "warn");
      }
      return cached;
    }
    try {
      const response = await fetch(urlKey, { cache: "no-store" });
      if (!response.ok) throw new Error(`snapshot_http_${response.status}`);
      const snapshot = await response.json();
      rememberSnapshot(urlKey, snapshot);
      if (!options.background) {
        renderSnapshot(snapshot);
        setLiveState(liveToggle.checked ? "Live" : "Paused", liveToggle.checked ? "live" : "warn");
      }
      return snapshot;
    } catch (error) {
      if (!options.background) {
        setLiveState("Viewer Error", "error");
        updatedAt.textContent = `Snapshot failed: ${String(error.message || error)}`;
      }
      return null;
    }
  }

  function stopPlayback() {
    if (state.playbackTimer) {
      window.clearInterval(state.playbackTimer);
      state.playbackTimer = null;
    }
    setPlaybackRunning(false);
  }

  function startPlayback() {
    stopPlayback();
    const current = clampInt(playbackRange.value, 0, 100, 100);
    if (current >= 100) {
      playbackRange.value = "0";
    }
    updatePlaybackLabel(state.snapshot);
    setPlaybackRunning(true);
    state.playbackTimer = window.setInterval(() => {
      const next = Math.min(100, clampInt(playbackRange.value, 0, 100, 0) + 5);
      playbackRange.value = String(next);
      updatePlaybackLabel(state.snapshot);
      void fetchSnapshot();
      const afterNext = Math.min(100, next + 5);
      if (afterNext > next) {
        void fetchSnapshot({ rangeValue: afterNext, timelineSnapshot: state.snapshot, background: true });
      }
      if (next >= 100) {
        stopPlayback();
      }
    }, 700);
  }

  function connectLiveStream() {
    if (state.liveSource) {
      state.liveSource.close();
      state.liveSource = null;
    }
    if (!liveToggle.checked || typeof window.EventSource !== "function") return;
    state.liveSource = new window.EventSource("/api/graph-runtime/stream");
    setLiveState("Connecting...", "warn");
    state.liveSource.addEventListener("open", () => setLiveState("Live", "live"));
    state.liveSource.addEventListener("hello", () => {
      clearSnapshotCache();
      scheduleSnapshotRefresh(80);
    });
    state.liveSource.addEventListener("graph_event", () => {
      clearSnapshotCache();
      scheduleSnapshotRefresh(180);
    });
    state.liveSource.addEventListener("action_manifest", () => {
      clearSnapshotCache();
      scheduleSnapshotRefresh(180);
    });
    state.liveSource.addEventListener("error", () => setLiveState("Reconnecting...", "warn"));
  }

  function installFallbackPolling() {
    if (state.fallbackPollTimer) {
      window.clearInterval(state.fallbackPollTimer);
    }
    state.fallbackPollTimer = window.setInterval(() => {
      if (!liveToggle.checked) return;
      void fetchSnapshot();
    }, 12000);
  }

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    state.hover = findHit(x, y);
    canvas.style.cursor = state.hover ? "pointer" : "default";
    renderTooltip(state.hover, x, y);
    drawGraph();
  });

  canvas.addEventListener("mouseleave", () => {
    state.hover = null;
    renderTooltip(null, 0, 0);
    drawGraph();
  });

  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    state.selected = findHit(x, y);
    state.selectedRecord = null;
    renderInspector();
    renderSelectedRecords(state.snapshot);
    drawGraph();
  });

  refreshBtn.addEventListener("click", () => void fetchSnapshot());
  [windowMinutes, maxNodes, includeLowRisk, componentFilter, actionFilter, riskFilter, colorMode].forEach((element) => {
    element.addEventListener("change", () => {
      stopPlayback();
      state.selectedRecord = null;
      setPresetSelectValue("custom");
      savedViewSelect.value = "";
      clearFrozenCompare();
      clearSnapshotCache();
      void fetchSnapshot();
    });
  });
  presetSelect.addEventListener("change", () => {
    if (presetSelect.value === "custom") {
      return;
    }
    applyPreset(presetSelect.value, true);
  });
  savedViewSelect.addEventListener("change", () => {
    if (!savedViewSelect.value) {
      return;
    }
    applySavedView(savedViewSelect.value, true);
  });
  saveViewBtn.addEventListener("click", saveNamedView);
  savedViewName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveNamedView();
    }
  });
  deleteViewBtn.addEventListener("click", deleteSelectedView);
  playbackRange.addEventListener("input", () => {
    stopPlayback();
    clearFrozenCompare();
    updatePlaybackLabel(state.snapshot);
    void fetchSnapshot({ background: true });
  });
  playbackRange.addEventListener("change", () => {
    state.selectedRecord = null;
    clearFrozenCompare();
    void fetchSnapshot();
  });
  compareRange.addEventListener("input", () => {
    stopPlayback();
    clearFrozenCompare();
    updatePlaybackLabel(state.snapshot);
    void fetchSnapshot({ background: true });
  });
  compareRange.addEventListener("change", () => {
    state.selectedRecord = null;
    clearFrozenCompare();
    clearSnapshotCache();
    void fetchSnapshot();
  });
  playbackBtn.addEventListener("click", () => {
    if (state.playbackTimer) {
      stopPlayback();
      return;
    }
    startPlayback();
  });
  freezeCompareBtn.addEventListener("click", () => {
    if (state.frozenCompare) {
      clearFrozenCompare();
      clearSnapshotCache();
      void fetchSnapshot();
      return;
    }
    freezeCurrentCompare();
    clearSnapshotCache();
    void fetchSnapshot();
  });
  liveToggle.addEventListener("change", () => {
    connectLiveStream();
    if (liveToggle.checked) {
      void fetchSnapshot();
    } else {
      setLiveState("Paused", "warn");
    }
  });

  const resizeObserver = new window.ResizeObserver(() => drawGraph());
  resizeObserver.observe(canvasShell);

  loadSavedViews();
  renderSavedViews();
  installFallbackPolling();
  connectLiveStream();
  applyPreset("all", false);
  void fetchSnapshot();
})();
