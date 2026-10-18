(function () {
  const tokenInput = document.getElementById("tokenInput");
  const saveTokenBtn = document.getElementById("saveTokenBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const statusFilter = document.getElementById("statusFilter");
  const criticalOnly = document.getElementById("criticalOnly");
  const statusBox = document.getElementById("status");
  const list = document.getElementById("list");
  const enablePushBtn = document.getElementById("enablePushBtn");
  const disablePushBtn = document.getElementById("disablePushBtn");
  const pushStatusBox = document.getElementById("pushStatus");
  const PUSH_SW_PATH = "/mobile-push-sw.js?v=20260222-1";
  const PUSH_SYNC_MIN_INTERVAL_MS = 45 * 1000;
  const APPROVAL_POLL_INTERVAL_MS = 30000;
  let pushRegistration = null;
  let pushSyncInFlight = null;
  let lastPushSyncAt = 0;
  let lastPushSyncEndpoint = "";
  let lastPendingCount = null;

  function getStoredToken() {
    return String(localStorage.getItem("asolaria.mobile.token") || "").trim();
  }

  function setStoredToken(value) {
    const token = String(value || "").trim();
    if (!token) {
      localStorage.removeItem("asolaria.mobile.token");
      return;
    }
    localStorage.setItem("asolaria.mobile.token", token);
  }

  function getQuery(name) {
    const params = new URLSearchParams(window.location.search);
    return String(params.get(name) || "").trim();
  }

  function stripQueryTokenFromUrl() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("token")) return;
      url.searchParams.delete("token");
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", next || "/");
    } catch (_error) {
      // ignore history/local URL edge cases
    }
  }

  function detectChannel() {
    const fromQuery = getQuery("channel");
    if (fromQuery) return fromQuery;
    const host = String(window.location.hostname || "").trim().toLowerCase();
    if (host === "127.0.0.1" || host === "localhost") {
      return "usb";
    }
    return "private_internet";
  }

  function authToken() {
    const queryToken = getQuery("token");
    if (queryToken) {
      setStoredToken(queryToken);
      stripQueryTokenFromUrl();
      return queryToken;
    }
    const stored = getStoredToken();
    if (stored) return stored;
    return "";
  }

  function hasToken() {
    return Boolean(authToken());
  }

  // If opened with ?token=..., persist it and scrub it from the URL immediately.
  authToken();

  async function api(path, options = {}) {
    const headers = Object.assign({}, options.headers || {});
    const token = authToken();
    const channel = detectChannel();
    if (token) {
      headers["x-asolaria-mobile-token"] = token;
      headers["x-asolaria-token"] = token;
    }
    if (channel) {
      headers["x-asolaria-channel"] = channel;
    }

    const response = await fetch(path, Object.assign({}, options, { headers }));
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  }

  function riskClass(level) {
    const value = String(level || "low").toLowerCase();
    if (value === "critical") return "risk-critical";
    if (value === "high") return "risk-high";
    if (value === "medium") return "risk-medium";
    return "risk-low";
  }

  function setStatus(message) {
    statusBox.textContent = String(message || "Ready");
  }

  function setPushStatus(message) {
    if (pushStatusBox) {
      pushStatusBox.textContent = String(message || "Push: unavailable");
    }
  }

  function getAndroidBridge() {
    try {
      return window.AsolariaAndroid || null;
    } catch {
      return null;
    }
  }

  function androidNativeNotify(title, message) {
    const bridge = getAndroidBridge();
    if (!bridge || typeof bridge.nativeNotify !== "function") {
      return "bridge_unavailable";
    }
    try {
      return String(bridge.nativeNotify(String(title || ""), String(message || "")) || "");
    } catch (error) {
      return `error:${error.message}`;
    }
  }

  function maybeNotifyPendingIncrease(nextPending) {
    const nextValue = Number.isFinite(Number(nextPending)) ? Number(nextPending) : 0;
    const previousValue = Number.isFinite(Number(lastPendingCount)) ? Number(lastPendingCount) : null;
    lastPendingCount = nextValue;
    if (previousValue === null || nextValue <= previousValue) {
      return;
    }
    if (nextValue < 1) {
      return;
    }
    androidNativeNotify(
      "Asolaria Approval Alert",
      `${nextValue} pending approvals need review.`
    );
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function ensurePushRegistration() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service worker is not supported on this browser.");
    }
    if (!pushRegistration) {
      pushRegistration = await navigator.serviceWorker.register(PUSH_SW_PATH);
      await navigator.serviceWorker.ready;
    }
    return pushRegistration;
  }

  function canUseWebPush() {
    return typeof Notification !== "undefined" && ("PushManager" in window);
  }

  async function syncPushSubscription(options = {}) {
    const allowCreate = options.allowCreate === true;
    const force = options.force === true;
    const minIntervalMs = Math.max(0, Number(options.minIntervalMs || PUSH_SYNC_MIN_INTERVAL_MS));

    if (!hasToken()) {
      return { ok: false, skipped: "token_missing" };
    }
    if (!canUseWebPush()) {
      return { ok: false, skipped: "unsupported" };
    }
    if (Notification.permission !== "granted") {
      return { ok: false, skipped: `permission_${Notification.permission || "unknown"}` };
    }
    if (pushSyncInFlight) {
      return pushSyncInFlight;
    }

    pushSyncInFlight = (async () => {
      const registration = await ensurePushRegistration();
      let subscription = await registration.pushManager.getSubscription();
      const hadSubscription = Boolean(subscription);
      if (!subscription && allowCreate) {
        const keyInfo = await api("/api/mobile/push/public-key");
        if (!keyInfo.publicKey) {
          throw new Error("Push public key is not available on server.");
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyInfo.publicKey)
        });
      }
      if (!subscription) {
        return { ok: false, skipped: "no_subscription" };
      }

      const endpoint = String(subscription.endpoint || "").trim();
      const now = Date.now();
      if (
        !force
        && endpoint
        && endpoint === lastPushSyncEndpoint
        && (now - lastPushSyncAt) < minIntervalMs
      ) {
        return { ok: true, skipped: "throttled", endpoint };
      }

      await api("/api/mobile/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceName: navigator.userAgent
        })
      });

      lastPushSyncAt = now;
      lastPushSyncEndpoint = endpoint;
      return {
        ok: true,
        synced: true,
        endpoint,
        created: !hadSubscription
      };
    })();

    try {
      return await pushSyncInFlight;
    } finally {
      pushSyncInFlight = null;
    }
  }

  async function refreshPushStatus() {
    try {
      if (!hasToken()) {
        setPushStatus("Push: token required (paste token and tap Save Token)");
        return;
      }
      const permission = canUseWebPush() ? Notification.permission : "unsupported";
      let status = await api("/api/mobile/push/status");
      let subscriptions = Number(status.push?.subscriptions ?? 0);
      let syncHint = "";
      if (permission === "granted" && subscriptions < 1) {
        try {
          const syncResult = await syncPushSubscription({
            allowCreate: false,
            force: true
          });
          if (syncResult?.ok && syncResult?.synced) {
            status = await api("/api/mobile/push/status");
            subscriptions = Number(status.push?.subscriptions ?? 0);
            syncHint = " | sync=ok";
          } else if (syncResult?.skipped === "no_subscription") {
            syncHint = " | action=tap Enable Push Alerts";
          } else if (syncResult?.skipped) {
            syncHint = ` | sync=${syncResult.skipped}`;
          }
        } catch (syncError) {
          syncHint = ` | sync=${String(syncError?.message || "failed").slice(0, 64)}`;
        }
      }
      const actionHint = permission === "default"
        ? " | action=allow notifications"
        : (permission === "denied" ? " | action=notification blocked" : "");
      const bridge = getAndroidBridge();
      const nativeReady = Boolean(bridge && typeof bridge.nativeNotify === "function");
      setPushStatus(
        `Push: ${status.push?.enabled ? "server-ready" : "off"} | subscriptions=${subscriptions} | permission=${permission} | native=${nativeReady ? "ready" : "off"}${actionHint}${syncHint}`
      );
    } catch (error) {
      setPushStatus(`Push: ${error.message}`);
    }
  }

  async function enablePushAlerts() {
    try {
      if (!canUseWebPush()) {
        const nativeResult = androidNativeNotify(
          "Asolaria Alerts Enabled",
          "Web push is unsupported here. Native alerts are enabled while this app is open."
        );
        if (nativeResult === "ok") {
          setPushStatus("Push API unsupported. Native in-app alerts are enabled.");
          await refreshPushStatus();
          return;
        }
        throw new Error(`Push unsupported and native alert bridge unavailable (${nativeResult || "unknown"}).`);
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(`Notification permission is ${permission}.`);
      }
      const syncResult = await syncPushSubscription({
        allowCreate: true,
        force: true
      });
      if (!syncResult?.ok) {
        if (syncResult?.skipped === "no_subscription") {
          throw new Error("Push subscription could not be created.");
        }
        if (syncResult?.skipped && !String(syncResult.skipped).startsWith("permission_")) {
          throw new Error(`Push sync skipped: ${syncResult.skipped}`);
        }
      }
      setPushStatus("Push enabled. Alerts can arrive while screen is off.");
    } catch (error) {
      setPushStatus(`Enable push failed: ${error.message}`);
    }
    await refreshPushStatus();
  }

  async function disablePushAlerts() {
    try {
      const registration = await ensurePushRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api("/api/mobile/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
      lastPushSyncAt = 0;
      lastPushSyncEndpoint = "";
      setPushStatus("Push disabled for this browser.");
    } catch (error) {
      setPushStatus(`Disable push failed: ${error.message}`);
    }
    await refreshPushStatus();
  }

  async function loadDetails(card, id, options = {}) {
    const pre = card.querySelector(".details");
    if (!pre) return;
    const toggle = options.toggle !== false;
    if (toggle && pre.style.display === "block") {
      pre.style.display = "none";
      return;
    }

    pre.style.display = "block";
    pre.textContent = "Loading details...";
    try {
      const data = await api(`/api/mobile/approvals/${encodeURIComponent(id)}`);
      pre.textContent = JSON.stringify(data.approval || {}, null, 2);
    } catch (error) {
      pre.textContent = `Error: ${error.message}`;
    }
  }

  async function decide(id, decision, execute) {
    setStatus(`${decision.toUpperCase()} ${id}...`);
    try {
      if (decision === "approve") {
        const data = await api(`/api/mobile/approvals/${encodeURIComponent(id)}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            execute: Boolean(execute),
            by: "mobile-ui"
          })
        });
        const runState = data.execution?.job?.id
          ? `, resumed as job ${data.execution.job.id}`
          : data.execution?.mode
            ? `, resumed (${data.execution.mode})`
            : "";
        setStatus(`${id} approved${runState}.`);
      } else {
        await api(`/api/mobile/approvals/${encodeURIComponent(id)}/deny`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ by: "mobile-ui" })
        });
        setStatus(`${id} denied.`);
      }
      await loadApprovals();
    } catch (error) {
      setStatus(`Decision failed: ${error.message}`);
    }
  }

  function renderItem(item) {
    const id = String(item?.id || "");
    const riskLevel = String(item?.risk?.level || "low").toLowerCase();
    const createdAt = item?.createdAt ? new Date(item.createdAt).toLocaleString() : "n/a";
    const expiresAt = item?.expiresAt ? new Date(item.expiresAt).toLocaleString() : "n/a";
    const status = String(item?.status || "pending");
    const action = String(item?.action || "unknown");
    const preview = String(item?.messagePreview || "(no preview)");
    const reasons = Array.isArray(item?.risk?.reasons) ? item.risk.reasons.join("; ") : "";

    const card = document.createElement("article");
    card.className = "card";
    card.dataset.approvalId = id;
    card.innerHTML = `
      <div class="row">
        <div class="id">${id}</div>
        <span class="badge ${riskClass(riskLevel)}">${riskLevel}</span>
      </div>
      <div class="hint">status: ${status} | action: ${action}</div>
      <div class="preview">${preview}</div>
      <div class="hint">created: ${createdAt} | expires: ${expiresAt}</div>
      <div class="hint">reasons: ${reasons || "(none)"}</div>
      <div class="actions">
        <button type="button" class="warn see-btn">See what it is about</button>
        <button type="button" class="ok approve-btn">Approve</button>
        <button type="button" class="ok approve-run-btn">Approve + Run</button>
        <button type="button" class="no deny-btn">Deny</button>
      </div>
      <pre class="details"></pre>
    `;

    card.querySelector(".see-btn").addEventListener("click", () => loadDetails(card, id));
    card.querySelector(".approve-btn").addEventListener("click", () => decide(id, "approve", false));
    card.querySelector(".approve-run-btn").addEventListener("click", () => decide(id, "approve", true));
    card.querySelector(".deny-btn").addEventListener("click", () => decide(id, "deny", false));
    return card;
  }

  async function focusApprovalFromQuery() {
    const focusId = getQuery("focus") || getQuery("id");
    if (!focusId) return;
    const cards = Array.from(list.querySelectorAll(".card[data-approval-id]"));
    const match = cards.find((card) => String(card.dataset.approvalId || "") === focusId);
    if (!match) return;

    cards.forEach((card) => card.classList.remove("focused"));
    match.classList.add("focused");
    match.scrollIntoView({ behavior: "smooth", block: "start" });
    await loadDetails(match, focusId, { toggle: false });
  }

  async function loadApprovals() {
    const status = String(statusFilter?.value || "pending").trim();
    const onlyCritical = Boolean(criticalOnly?.checked);
    if (!hasToken()) {
      list.innerHTML = "";
      setStatus("Token missing. Paste the mobile approval token and tap Save Token.");
      await refreshPushStatus();
      return;
    }
    try {
      const channel = detectChannel();
      const session = await api(`/api/mobile/session?channel=${encodeURIComponent(channel)}`);
      const data = await api(`/api/mobile/approvals?status=${encodeURIComponent(status)}&criticalOnly=${onlyCritical ? "true" : "false"}&limit=60`);
      const rows = Array.isArray(data.approvals) ? data.approvals : [];

      list.innerHTML = "";
      if (rows.length === 0) {
        const empty = document.createElement("div");
        empty.className = "card";
        empty.textContent = "No approvals in this filter.";
        list.appendChild(empty);
      } else {
        for (const row of rows) {
          list.appendChild(renderItem(row));
        }
      }

      await focusApprovalFromQuery();

      setStatus(
        `Connected | pending=${session.pendingCount} | guardian=${session.guardian?.mode || "n/a"} | owner-for-critical=${session.guardian?.requireOwnerForCritical ? "on" : "off"} | path=${session.connectionRouting?.selected?.channel || "n/a"}`
      );
      maybeNotifyPendingIncrease(session.pendingCount);
      await refreshPushStatus();
    } catch (error) {
      list.innerHTML = "";
      setStatus(`Connection failed: ${error.message}`);
    }
  }

  saveTokenBtn?.addEventListener("click", () => {
    setStoredToken(tokenInput?.value || "");
    lastPushSyncAt = 0;
    lastPushSyncEndpoint = "";
    if (tokenInput) tokenInput.value = "";
    loadApprovals();
  });
  refreshBtn?.addEventListener("click", loadApprovals);
  statusFilter?.addEventListener("change", loadApprovals);
  criticalOnly?.addEventListener("change", loadApprovals);
  enablePushBtn?.addEventListener("click", enablePushAlerts);
  disablePushBtn?.addEventListener("click", disablePushAlerts);

  const seed = getStoredToken();
  if (tokenInput && seed) {
    tokenInput.value = seed;
  }
  ensurePushRegistration().catch(() => {
    setPushStatus("Push: service worker unavailable");
  });
  loadApprovals();
  window.setInterval(() => {
    if (document.hidden) {
      return;
    }
    loadApprovals();
  }, APPROVAL_POLL_INTERVAL_MS);
})();
