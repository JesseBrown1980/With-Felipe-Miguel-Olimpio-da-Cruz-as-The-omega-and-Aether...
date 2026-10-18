function unquote(text) {
  const value = String(text || "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeExternalProviderToken(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "claude") {
    return "anthropic";
  }
  if (raw === "anthropic" || raw === "gemini" || raw === "cursor" || raw === "antigravity") {
    return raw;
  }
  return "";
}

function normalizeWebTarget(target) {
  const value = unquote(target).trim().replace(/[),.;!?]+$/g, "");
  if (!value) {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

function extractFirstWebTarget(message) {
  const text = String(message || "");
  const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch) {
    return normalizeWebTarget(urlMatch[0]);
  }
  const domainMatch = text.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s"'<>]*)?\b/i);
  if (domainMatch) {
    return normalizeWebTarget(domainMatch[0]);
  }
  return "";
}

function inferChromeUrl(message, lower) {
  if (
    /\b(my\s+email|gmail|inbox|mailbox|outlook|yahoo\s+mail)\b/i.test(lower) ||
    /\bgo\s+to\b[\s\S]*\bemail\b/i.test(lower)
  ) {
    return "https://mail.google.com";
  }
  const target = extractFirstWebTarget(message);
  if (target) {
    return target;
  }
  return "https://www.google.com";
}

function parseAsolariaUiTarget(text) {
  const value = String(text || "").toLowerCase();
  if (/remote[\s_-]*console|private[\s_-]*console/.test(value)) return "remote_console";
  if (/remote[\s_-]*approvals?|private[\s_-]*approvals?/.test(value)) return "remote_approvals";
  if (/mobile[\s_-]*console/.test(value)) return "local_console";
  if (/mobile[\s_-]*approvals?|approval[\s_-]*center/.test(value)) return "local_approvals";
  if (/secure|https/.test(value)) return "secure_ui";
  if (/local|http/.test(value)) return "local_ui";
  return "local_ui";
}

function parseAsolariaUiCloseScope(text) {
  const value = String(text || "").toLowerCase();
  if (/\ball\b/.test(value)) return "all";
  return "last";
}

function routeIntent(rawMessage) {
  const message = String(rawMessage || "").trim();
  const lower = message.toLowerCase();

  if (!message) {
    return { matched: false };
  }

  if (/^skills(?:\s+(?:list|show))?$/i.test(message) || /^skill\s+list$/i.test(message)) {
    return {
      matched: true,
      action: "skills_list",
      payload: {}
    };
  }

  const skillInfoMatch = message.match(/^skill\s+(?:info|show)\s+([a-zA-Z0-9._:-]{1,80})$/i);
  if (skillInfoMatch) {
    return {
      matched: true,
      action: "skills_get",
      payload: { id: unquote(skillInfoMatch[1]) }
    };
  }

  const skillRunMatch = message.match(/^skill\s+run\s+([a-zA-Z0-9._:-]{1,80})(?:\s+([\s\S]+))?$/i);
  if (skillRunMatch) {
    const rawInput = String(skillRunMatch[2] || "").trim();
    let input = {};
    if (rawInput) {
      try {
        input = JSON.parse(rawInput);
      } catch (_error) {
        input = { text: rawInput };
      }
    }
    return {
      matched: true,
      action: "skills_run",
      payload: {
        id: unquote(skillRunMatch[1]),
        input
      }
    };
  }

  const uiStatusIntent =
    /^asolaria\s+(?:ui|paths?|interface)\s+(?:status|show|list)$/i.test(message) ||
    /^(?:show|list)\s+asolaria\s+(?:ui|paths?|interface)$/i.test(message);
  if (uiStatusIntent) {
    return {
      matched: true,
      action: "asolaria_ui_paths_status",
      payload: {}
    };
  }

  const uiOpenMatch = message.match(/^(?:asolaria\s+)?(?:open|launch)\s+asolaria\s+(?:ui|interface|path)(?:\s+(.+))?$/i)
    || message.match(/^asolaria\s+(?:open|launch)\s+(?:ui|interface|path)(?:\s+(.+))?$/i);
  if (uiOpenMatch) {
    return {
      matched: true,
      action: "asolaria_ui_open",
      payload: {
        target: parseAsolariaUiTarget(uiOpenMatch[1] || "")
      }
    };
  }

  const uiCloseMatch = message.match(/^(?:asolaria\s+)?close\s+asolaria\s+(?:ui|interface|path)(?:\s+(.+))?$/i)
    || message.match(/^asolaria\s+close\s+(?:ui|interface|path)(?:\s+(.+))?$/i);
  if (uiCloseMatch) {
    return {
      matched: true,
      action: "asolaria_ui_close",
      payload: {
        scope: parseAsolariaUiCloseScope(uiCloseMatch[1] || "")
      }
    };
  }

  const chromeMatch = message.match(/^(?:open|launch)\s+chrome(?:\s+(.+))?$/i);
  if (chromeMatch) {
    const url = chromeMatch[1]
      ? normalizeWebTarget(chromeMatch[1])
      : inferChromeUrl(message, lower);
    return {
      matched: true,
      action: "open_chrome",
      payload: { url }
    };
  }

  const naturalChromeIntent =
    (/\b(?:open|launch)\b[\s\S]*\b(?:chrome|chrone)\b/i.test(message) ||
      /\b(?:chrome|chrone)\b[\s\S]*\b(?:open|launch)\b/i.test(message));
  if (naturalChromeIntent) {
    return {
      matched: true,
      action: "open_chrome",
      payload: { url: inferChromeUrl(message, lower) }
    };
  }

  if (/^(?:open|launch)\s+https?:\/\//i.test(message) || /^(?:open|launch)\s+\w[\w.-]*\.\w+/i.test(message)) {
    const openUrl = message.replace(/^(?:open|launch)\s+/i, "");
    return {
      matched: true,
      action: "open_chrome",
      payload: { url: unquote(openUrl) }
    };
  }

  const inspectMatch = message.match(/^inspect\s+(.+)$/i)
    || message.match(/^(?:analyze|summarize)\s+(?:site|page)\s+(.+)$/i);
  if (inspectMatch) {
    return {
      matched: true,
      action: "chrome_inspect",
      payload: {
        url: unquote(inspectMatch[1])
      }
    };
  }

  const screenshotMatch = message.match(/^screenshot\s+(.+?)(?:\s+as\s+(.+))?$/i);
  if (screenshotMatch) {
    return {
      matched: true,
      action: "screenshot",
      payload: {
        url: unquote(screenshotMatch[1]),
        fileName: screenshotMatch[2] ? unquote(screenshotMatch[2]) : ""
      }
    };
  }

  const workOrgStatusIntent =
    /^work\s+(?:org|organization|profile)\s+status$/i.test(message)
    || /^(?:org|organization|profile)\s+status$/i.test(message)
    || /^work\s+orgs$/i.test(message)
    || /^work\s+profiles?$/i.test(message);
  if (workOrgStatusIntent) {
    return {
      matched: true,
      action: "work_org_status",
      payload: {}
    };
  }

  const workOrgSetMatch = message.match(/^work\s+(?:org|organization|profile)\s+(?:set|use|switch)\s+(.+)$/i)
    || message.match(/^(?:set|use|switch)\s+(?:work\s+)?(?:org|organization|profile)\s+(.+)$/i);
  if (workOrgSetMatch) {
    return {
      matched: true,
      action: "work_org_set",
      payload: {
        organization: unquote(workOrgSetMatch[1])
      }
    };
  }

  if (/^local\s+ops\s+status$/i.test(message) || /^local\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "local_ops_status",
      payload: {}
    };
  }

  const localTaskMatch = message.match(/^local\s+(build|test)\s+(.+)$/i);
  if (localTaskMatch) {
    return {
      matched: true,
      action: `local_${String(localTaskMatch[1] || "").toLowerCase()}`,
      payload: {
        target: unquote(localTaskMatch[2])
      }
    };
  }

  const localScriptMatch = message.match(/^local\s+script\s+([a-zA-Z0-9:_-]{1,80})\s+on\s+(.+)$/i);
  if (localScriptMatch) {
    return {
      matched: true,
      action: "local_script",
      payload: {
        script: localScriptMatch[1],
        target: unquote(localScriptMatch[2])
      }
    };
  }

  const browserTaskMatch = message.match(/^(?:browser|backend\s+browser|headless\s+browser)\s+task\s+(.+)$/i);
  if (browserTaskMatch) {
    return {
      matched: true,
      action: "browser_task",
      payload: {
        url: unquote(browserTaskMatch[1])
      }
    };
  }

  if (/^slack\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "slack_status",
      payload: {}
    };
  }

  const slackChannelsMatch = message.match(/^slack\s+channels(?:\s+(\d{1,3}))?$/i);
  if (slackChannelsMatch) {
    return {
      matched: true,
      action: "slack_channels",
      payload: {
        limit: slackChannelsMatch[1] ? Number(slackChannelsMatch[1]) : 50
      }
    };
  }

  const slackReviewMatch = message.match(/^slack\s+(?:review|summarize|analyse|analyze)\s+(.+?)(?:\s+last\s+(\d{1,3}))?$/i);
  if (slackReviewMatch) {
    return {
      matched: true,
      action: "slack_review",
      payload: {
        channel: unquote(slackReviewMatch[1]),
        limit: slackReviewMatch[2] ? Number(slackReviewMatch[2]) : 40
      }
    };
  }

  if (/^telegram\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "telegram_status",
      payload: {}
    };
  }

  const telegramSendExplicit = message.match(/^telegram\s+send(?:\s+to)?\s+(-?\d{4,20})\s+([\s\S]+)$/i);
  if (telegramSendExplicit) {
    return {
      matched: true,
      action: "telegram_send",
      payload: {
        chatId: telegramSendExplicit[1],
        text: unquote(telegramSendExplicit[2])
      }
    };
  }

  const telegramSendDefault = message.match(/^telegram\s+send\s+([\s\S]+)$/i);
  if (telegramSendDefault) {
    return {
      matched: true,
      action: "telegram_send",
      payload: {
        text: unquote(telegramSendDefault[1])
      }
    };
  }

  if (/^github\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "github_status",
      payload: {}
    };
  }

  const githubReposMatch = message.match(/^github\s+(?:repos|repos\s+list|list\s+repos)(?:\s+(\d{1,3}))?$/i);
  if (githubReposMatch) {
    return {
      matched: true,
      action: "github_repos",
      payload: {
        limit: githubReposMatch[1] ? Number(githubReposMatch[1]) : 30
      }
    };
  }

  if (/^google\s+status$/i.test(message) || /^gmail\s+status$/i.test(message) || /^calendar\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "google_status",
      payload: {}
    };
  }

  if (/^atlassian\s+status$/i.test(message) || /^jira\s+status$/i.test(message) || /^confluence\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "atlassian_status",
      payload: {}
    };
  }

  const atlassianAuthStart = message.match(/^atlassian\s+(?:auth|oauth)\s+start(?:\s+([^\s]+))?$/i)
    || message.match(/^(?:jira|confluence)\s+connect(?:\s+([^\s]+))?$/i)
    || message.match(/^atlassian\s+connect(?:\s+([^\s]+))?$/i);
  if (atlassianAuthStart) {
    return {
      matched: true,
      action: "atlassian_auth_start",
      payload: {
        account: atlassianAuthStart[1] ? unquote(atlassianAuthStart[1]) : ""
      }
    };
  }

  const atlassianApiMatch = message.match(/^atlassian\s+api\s+(.+)$/i);
  if (atlassianApiMatch) {
    const rest = String(atlassianApiMatch[1] || "").trim();
    const parts = rest.split(/\s+/).filter(Boolean);
    let account = "";
    let url = rest;
    if (parts.length >= 2 && parts[0].includes("@")) {
      account = unquote(parts.shift());
      url = unquote(parts.join(" "));
    } else {
      url = unquote(rest);
    }
    return {
      matched: true,
      action: "atlassian_api_request",
      payload: {
        account,
        url
      }
    };
  }

  const googleAuthStart = message.match(/^google\s+(?:auth|oauth)\s+start(?:\s+([^\s]+))?$/i)
    || message.match(/^google\s+connect(?:\s+([^\s]+))?$/i);
  if (googleAuthStart) {
    return {
      matched: true,
      action: "google_auth_start",
      payload: {
        account: googleAuthStart[1] ? unquote(googleAuthStart[1]) : ""
      }
    };
  }

  const googleApiMatch = message.match(/^google\s+api\s+(.+)$/i);
  if (googleApiMatch) {
    const rest = String(googleApiMatch[1] || "").trim();
    const parts = rest.split(/\s+/).filter(Boolean);
    let account = "";
    let url = rest;
    if (parts.length >= 2 && parts[0].includes("@")) {
      account = unquote(parts.shift());
      url = unquote(parts.join(" "));
    } else {
      url = unquote(rest);
    }
    return {
      matched: true,
      action: "google_api_request",
      payload: {
        account,
        url
      }
    };
  }

  if (/^gcp\s+status$/i.test(message) || /^google\s+cloud\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "gcp_status",
      payload: {}
    };
  }

  if (/^(?:gemini|vertex)(?:\s+ai)?\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "vertex_status",
      payload: {}
    };
  }

  if (/^gemini\s+api\s+status$/i.test(message) || /^gemini\s+studio\s+status$/i.test(message) || /^ai\s+studio\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "gemini_api_status",
      payload: {}
    };
  }

  if (/^(?:gemini|vertex)(?:\s+ai)?\s+budget\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "vertex_budget_status",
      payload: {}
    };
  }

  if (/^(?:gemini|vertex)(?:\s+ai)?\s+budget\s+reset$/i.test(message)) {
    return {
      matched: true,
      action: "vertex_budget_reset",
      payload: {}
    };
  }

  const vertexBudgetSetMatch = message.match(/^(?:gemini|vertex)(?:\s+ai)?\s+budget\s+set\s+(.+)$/i);
  if (vertexBudgetSetMatch) {
    const payload = {};
    const rest = String(vertexBudgetSetMatch[1] || "").trim();
    const regex = /(requests|prompttokens|outputtokens|warnpercent|enabled)\s+([^\s]+)/ig;
    let match = null;
    while ((match = regex.exec(rest)) !== null) {
      const key = String(match[1] || "").toLowerCase();
      const value = String(match[2] || "").trim();
      if (!value) continue;
      if (key === "enabled") {
        payload.enabled = value.toLowerCase() !== "false";
      } else if (key === "requests") {
        payload.maxRequestsPerDay = Number(value);
      } else if (key === "prompttokens") {
        payload.maxPromptTokensPerDay = Number(value);
      } else if (key === "outputtokens") {
        payload.maxOutputTokensPerDay = Number(value);
      } else if (key === "warnpercent") {
        payload.warnPercent = Number(value);
      }
    }
    if (Object.keys(payload).length > 0) {
      return {
        matched: true,
        action: "vertex_budget_set",
        payload
      };
    }
  }

  const vertexAskMatch = message.match(/^(?:gemini|vertex)(?:\s+ai)?\s+(?:ask|chat)\s+(.+)$/i);
  if (vertexAskMatch) {
    return {
      matched: true,
      action: "vertex_ask",
      payload: {
        prompt: unquote(vertexAskMatch[1])
      }
    };
  }

  const geminiApiAskMatch = message.match(/^gemini\s+api\s+(?:ask|chat)\s+(.+)$/i)
    || message.match(/^gemini\s+studio\s+(?:ask|chat)\s+(.+)$/i)
    || message.match(/^ai\s+studio\s+(?:ask|chat)\s+(.+)$/i);
  if (geminiApiAskMatch) {
    return {
      matched: true,
      action: "gemini_api_ask",
      payload: {
        prompt: unquote(geminiApiAskMatch[1])
      }
    };
  }

  if (/^(?:notebooklm|notebook\s*lm)\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "notebooklm_status",
      payload: {}
    };
  }

  const notebookOpenMatch = message.match(/^(?:notebooklm|notebook\s*lm)\s+open$/i);
  if (notebookOpenMatch) {
    return {
      matched: true,
      action: "notebooklm_open",
      payload: {}
    };
  }

  const notebookAskMatch = message.match(/^(?:notebooklm|notebook\s*lm)\s+(?:ask|chat)\s+(.+)$/i);
  if (notebookAskMatch) {
    const rest = String(notebookAskMatch[1] || "").trim();
    const parts = rest.split(/\s+/).filter(Boolean);
    let account = "";
    let provider = "";
    let query = rest;

    if (parts.length >= 2 && parts[0].includes("@")) {
      account = unquote(parts.shift());
    }
    if (parts.length >= 3 && (parts[0].toLowerCase() === "provider" || parts[0].toLowerCase() === "--provider")) {
      parts.shift();
      provider = unquote(parts.shift());
    }
    query = unquote(parts.join(" "));

    return {
      matched: true,
      action: "notebooklm_ask",
      payload: {
        account,
        provider,
        query
      }
    };
  }

  if (/^(?:captures|capture)\s+stats$/i.test(message)) {
    return {
      matched: true,
      action: "captures_stats",
      payload: {}
    };
  }

  const capturesPruneMatch = message.match(/^captures\s+prune(?:\s+(.+))?$/i)
    || message.match(/^capture\s+prune(?:\s+(.+))?$/i);
  if (capturesPruneMatch) {
    const rest = String(capturesPruneMatch[1] || "").trim();
    const payload = {};

    if (/\b(?:dry\s*run|dry-run|dryrun|--dry-run)\b/i.test(rest)) {
      payload.dryRun = true;
    }

    const keepMatch = rest.match(/\bkeep\s+(\d{1,5})\b/i);
    if (keepMatch) {
      payload.keep = Number(keepMatch[1]);
    }

    const minAgeMatch = rest.match(/\b(?:minage|min_age|min)\s+(\d{1,4})\b/i);
    if (minAgeMatch) {
      payload.minAgeMinutes = Number(minAgeMatch[1]);
    }

    const modeMatch = rest.match(/\b(?:mode|prunemode)\s+(delete|trash)\b/i)
      || rest.match(/^(?:delete|trash)$/i);
    if (modeMatch) {
      payload.pruneMode = String(modeMatch[1] || modeMatch[0] || "").trim().toLowerCase();
    }

    return {
      matched: true,
      action: "captures_prune",
      payload
    };
  }

  const capturesImportantMatch = message.match(/^captures\s+important\s+(.+)$/i)
    || message.match(/^capture\s+important\s+(.+)$/i);
  if (capturesImportantMatch) {
    const rest = String(capturesImportantMatch[1] || "").trim();
    const parts = rest.split(/\s+/).filter(Boolean);
    const capturePath = parts.length ? unquote(parts.shift()) : "";
    const note = parts.length ? unquote(parts.join(" ")) : "";
    return {
      matched: true,
      action: "captures_mark_important",
      payload: {
        capturePath,
        note
      }
    };
  }

  const gcpServicesEnabledMatch = message.match(/^gcp\s+services\s+enabled\s+([^\s]+)(?:\s+(\d{1,3}))?$/i);
  if (gcpServicesEnabledMatch) {
    return {
      matched: true,
      action: "gcp_services_enabled",
      payload: {
        project: unquote(gcpServicesEnabledMatch[1]),
        pageSize: gcpServicesEnabledMatch[2] ? Number(gcpServicesEnabledMatch[2]) : 60
      }
    };
  }

  const gcpEnableMatch = message.match(/^gcp\s+service\s+enable\s+([^\s]+)\s+([^\s]+)$/i)
    || message.match(/^gcp\s+enable\s+([^\s]+)\s+([^\s]+)$/i);
  if (gcpEnableMatch) {
    return {
      matched: true,
      action: "gcp_service_enable",
      payload: {
        project: unquote(gcpEnableMatch[1]),
        serviceName: unquote(gcpEnableMatch[2])
      }
    };
  }

  const gcpApiMatch = message.match(/^gcp\s+api\s+(.+)$/i);
  if (gcpApiMatch) {
    const rest = String(gcpApiMatch[1] || "").trim();
    const parts = rest.split(/\s+/).filter(Boolean);
    let method = "GET";
    let url = rest;
    if (parts.length >= 2 && /^[A-Za-z]{3,7}$/.test(parts[0])) {
      method = parts.shift().toUpperCase();
      url = unquote(parts.join(" "));
    } else {
      url = unquote(rest);
    }
    const action = (method === "GET" || method === "HEAD") ? "gcp_api_request" : "gcp_api_mutation";
    return {
      matched: true,
      action,
      payload: {
        method,
        url
      }
    };
  }

  const gmailInboxMatch = message.match(/^gmail\s+inbox(?:\s+([^\s]+))?(?:\s+last\s+(\d{1,3}))?$/i);
  if (gmailInboxMatch) {
    return {
      matched: true,
      action: "gmail_inbox",
      payload: {
        account: gmailInboxMatch[1] ? unquote(gmailInboxMatch[1]) : "",
        limit: gmailInboxMatch[2] ? Number(gmailInboxMatch[2]) : 12
      }
    };
  }

  const gmailSearchMatch = message.match(/^gmail\s+search\s+([^\s]+)\s+(.+?)(?:\s+last\s+(\d{1,3}))?$/i);
  if (gmailSearchMatch) {
    return {
      matched: true,
      action: "gmail_search",
      payload: {
        account: unquote(gmailSearchMatch[1]),
        q: unquote(gmailSearchMatch[2]),
        limit: gmailSearchMatch[3] ? Number(gmailSearchMatch[3]) : 12
      }
    };
  }

  const calendarListMatch = message.match(/^calendar\s+list(?:\s+([^\s]+))?$/i);
  if (calendarListMatch) {
    return {
      matched: true,
      action: "calendar_list",
      payload: {
        account: calendarListMatch[1] ? unquote(calendarListMatch[1]) : "",
        limit: 50
      }
    };
  }

  const calendarUpcomingMatch = message.match(
    /^calendar\s+upcoming(?:\s+([^\s]+))?(?:\s+next\s+(\d{1,3}))?(?:\s+days\s+(\d{1,2}))?(?:\s+calendar\s+(.+))?$/i
  );
  if (calendarUpcomingMatch) {
    return {
      matched: true,
      action: "calendar_upcoming",
      payload: {
        account: calendarUpcomingMatch[1] ? unquote(calendarUpcomingMatch[1]) : "",
        limit: calendarUpcomingMatch[2] ? Number(calendarUpcomingMatch[2]) : 20,
        days: calendarUpcomingMatch[3] ? Number(calendarUpcomingMatch[3]) : 7,
        calendarId: calendarUpcomingMatch[4] ? unquote(calendarUpcomingMatch[4]) : "primary"
      }
    };
  }

  if (lower === "open pad" || lower === "launch pad" || lower === "open power automate desktop") {
    return {
      matched: true,
      action: "open_pad",
      payload: {}
    };
  }

  const padRunMatch = message.match(/^run\s+pad\s+(.+)$/i);
  if (padRunMatch) {
    return {
      matched: true,
      action: "run_pad",
      payload: {
        packagePath: unquote(padRunMatch[1]),
        mode: "LocalRun",
        disableScreenshots: false
      }
    };
  }

  if (/^openclaw\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "openclaw_status",
      payload: {}
    };
  }

  const openclawGateway = message.match(/^openclaw\s+gateway\s+(status|start|stop|restart)$/i);
  if (openclawGateway) {
    return {
      matched: true,
      action: `openclaw_gateway_${openclawGateway[1].toLowerCase()}`,
      payload: {}
    };
  }

  const openclawDaemon = message.match(/^openclaw\s+daemon\s+(status|start|stop|restart)$/i);
  if (openclawDaemon) {
    return {
      matched: true,
      action: `openclaw_daemon_${openclawDaemon[1].toLowerCase()}`,
      payload: {}
    };
  }

  if (/^openclaw\s+models\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "openclaw_models_status",
      payload: {}
    };
  }

  if (/^openclaw\s+cron\s+list$/i.test(message)) {
    return {
      matched: true,
      action: "openclaw_cron_list",
      payload: {}
    };
  }

  const openclawCronRun = message.match(/^openclaw\s+cron\s+run\s+([a-zA-Z0-9._:-]+)$/i);
  if (openclawCronRun) {
    return {
      matched: true,
      action: "openclaw_cron_run",
      payload: {
        name: openclawCronRun[1]
      }
    };
  }

  if (/^openclaw\s+approvals\s+get$/i.test(message)) {
    return {
      matched: true,
      action: "openclaw_approvals_get",
      payload: {}
    };
  }

  if (/^openclaw\s+nodes\s+list$/i.test(message)) {
    return {
      matched: true,
      action: "openclaw_nodes_list",
      payload: {}
    };
  }

  if (/^moltbook\s+mission$/i.test(message)) {
    return {
      matched: true,
      action: "moltbook_mission",
      payload: {}
    };
  }

  if (/^moltbook\s+(?:open|open\s+site|open\s+website)$/i.test(message)) {
    return {
      matched: true,
      action: "moltbook_open_site",
      payload: {}
    };
  }

  if (/^moltbook\s+account\s+(?:create|bootstrap|init)$/i.test(message)) {
    return {
      matched: true,
      action: "moltbook_account_bootstrap",
      payload: {}
    };
  }

  if (/^moltbook\s+account\s+(?:show|status)$/i.test(message)) {
    return {
      matched: true,
      action: "moltbook_account_show",
      payload: {}
    };
  }

  if (/^moltbook\s+account\s+reveal$/i.test(message)) {
    return {
      matched: true,
      action: "moltbook_account_reveal",
      payload: {}
    };
  }

  if (/^moltbook\s+account\s+registered$/i.test(message)) {
    return {
      matched: true,
      action: "moltbook_account_mark_registered",
      payload: {}
    };
  }

  if (/^moltbook\s+draft\s+post$/i.test(message)) {
    return {
      matched: true,
      action: "moltbook_draft_post",
      payload: {}
    };
  }

  if (/^moltbook\s+decide\s+proceed$/i.test(message)) {
    return {
      matched: true,
      action: "moltbook_decide_proceed",
      payload: {}
    };
  }

  if (/^antigravity\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "antigravity_status",
      payload: {}
    };
  }

  const antigravityAsk = message.match(/^antigravity\s+(?:ask|chat)\s+(.+)$/i);
  if (antigravityAsk) {
    return {
      matched: true,
      action: "antigravity_ask",
      payload: { prompt: unquote(antigravityAsk[1]) }
    };
  }

  if (/^cursor\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "cursor_status",
      payload: {}
    };
  }

  const cursorAsk = message.match(/^cursor\s+(?:ask|chat)\s+(.+)$/i);
  if (cursorAsk) {
    return {
      matched: true,
      action: "cursor_ask",
      payload: { prompt: unquote(cursorAsk[1]) }
    };
  }

  if (/^(?:anthropic|claude)\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "anthropic_status",
      payload: {}
    };
  }

  const anthropicAsk = message.match(/^(?:anthropic|claude)\s+(?:ask|chat)\s+(.+)$/i);
  if (anthropicAsk) {
    return {
      matched: true,
      action: "anthropic_ask",
      payload: { prompt: unquote(anthropicAsk[1]) }
    };
  }

  if (
    /^gemini\s+cli\s+status$/i.test(message)
    || /^(?:gemini\s+terminal|gemini\s+local)\s+status$/i.test(message)
  ) {
    return {
      matched: true,
      action: "gemini_cli_status",
      payload: {}
    };
  }

  const geminiCliAsk = message.match(/^gemini\s+cli\s+(?:ask|chat)\s+(.+)$/i)
    || message.match(/^(?:gemini\s+terminal|gemini\s+local)\s+(?:ask|chat)\s+(.+)$/i);
  if (geminiCliAsk) {
    return {
      matched: true,
      action: "gemini_cli_ask",
      payload: { prompt: unquote(geminiCliAsk[1]) }
    };
  }

  const externalModelsStatus = message.match(
    /^(?:external|provider)\s+models?\s+(?:status|show|list)(?:\s+(anthropic|claude|gemini|cursor|antigravity))?$/i
  ) || message.match(
    /^(?:default|observed)\s+models?(?:\s+(anthropic|claude|gemini|cursor|antigravity))?$/i
  );
  if (externalModelsStatus) {
    return {
      matched: true,
      action: "external_models_status",
      payload: {
        provider: normalizeExternalProviderToken(externalModelsStatus[1] || "")
      }
    };
  }

  const setDefaultModel = message.match(
    /^(?:set\s+)?default\s+model\s+(anthropic|claude|gemini|cursor|antigravity)\s+([\s\S]+)$/i
  );
  if (setDefaultModel) {
    return {
      matched: true,
      action: "external_model_default_set",
      payload: {
        provider: normalizeExternalProviderToken(setDefaultModel[1]),
        model: unquote(setDefaultModel[2])
      }
    };
  }

  const clearDefaultModel = message.match(
    /^(?:clear|unset|remove)\s+default\s+model\s+(anthropic|claude|gemini|cursor|antigravity)$/i
  );
  if (clearDefaultModel) {
    return {
      matched: true,
      action: "external_model_default_clear",
      payload: {
        provider: normalizeExternalProviderToken(clearDefaultModel[1])
      }
    };
  }

  const clearObservedModels = message.match(
    /^(?:clear|reset)\s+observed\s+models?(?:\s+(all|anthropic|claude|gemini|cursor|antigravity))?$/i
  );
  if (clearObservedModels) {
    const target = String(clearObservedModels[1] || "").trim().toLowerCase();
    const provider = target === "all" ? "all" : normalizeExternalProviderToken(target);
    return {
      matched: true,
      action: "external_models_observed_clear",
      payload: {
        provider: provider || "all"
      }
    };
  }

  const pruneObservedModels = message.match(
    /^(?:prune|cleanup)\s+observed\s+models?(?:\s+(all|anthropic|claude|gemini|cursor|antigravity))?(?:\s+(?:older\s+than\s+)?(\d{1,4})(?:\s*d(?:ays?)?|d(?:ays?)?)?)?$/i
  );
  if (pruneObservedModels) {
    const target = String(pruneObservedModels[1] || "").trim().toLowerCase();
    const provider = target === "all" ? "all" : normalizeExternalProviderToken(target);
    const rawDays = Number(pruneObservedModels[2] || 30);
    const maxAgeDays = Number.isFinite(rawDays)
      ? Math.max(1, Math.min(3650, Math.round(rawDays)))
      : 30;
    return {
      matched: true,
      action: "external_models_observed_prune",
      payload: {
        provider: provider || "all",
        maxAgeDays
      }
    };
  }

  if (/^guardian\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "guardian_status",
      payload: {}
    };
  }

  if (/^guardian\s+contacts\s+(?:show|status)$/i.test(message)) {
    return {
      matched: true,
      action: "guardian_contacts_show",
      payload: {}
    };
  }

  if (/^guardian\s+contacts\s+(?:bootstrap|init|create)$/i.test(message)) {
    return {
      matched: true,
      action: "guardian_contacts_bootstrap",
      payload: {}
    };
  }

  if (/^guardian\s+test\s+alert$/i.test(message) || /^guardian\s+alert\s+test$/i.test(message)) {
    return {
      matched: true,
      action: "guardian_alert_test",
      payload: {}
    };
  }

  if (/^guardian\s+whatsapp\s+(?:status|show)$/i.test(message)) {
    return {
      matched: true,
      action: "guardian_whatsapp_status",
      payload: {}
    };
  }

  if (/^guardian\s+approvals?\s+(?:pending|list|show)$/i.test(message)) {
    return {
      matched: true,
      action: "guardian_approvals_list",
      payload: {
        status: "pending",
        limit: 20
      }
    };
  }

  const approvalDecide = message.match(/^guardian\s+approval\s+(approve|deny|reject)\s+([a-z0-9_-]+)$/i);
  if (approvalDecide) {
    return {
      matched: true,
      action: "guardian_approval_decide",
      payload: {
        decision: approvalDecide[1].toLowerCase() === "approve" ? "approve" : "deny",
        id: approvalDecide[2]
      }
    };
  }

  const enablePayPriority =
    /(?:always|auto)\s+approve[\s\S]*\bp\s*(?:or|\/)\s*a\b[\s\S]*\by\b/i.test(message)
    || /\bapproval\s+(?:strategy|mode)[\s\S]*\bp\/a\/y\b/i.test(message)
    || /\buse\s+p\/a\/y\s+approval\b/i.test(message);
  if (enablePayPriority) {
    return {
      matched: true,
      action: "approval_strategy_pay_priority",
      payload: {}
    };
  }

  if (/^approval\s+(?:strategy|mode)\s+(?:default|balanced|smart)$/i.test(message)) {
    return {
      matched: true,
      action: "approval_strategy_balanced",
      payload: {}
    };
  }

  if (/^(?:night\s+ops|night\s+mode)\s+status$/i.test(message)) {
    return {
      matched: true,
      action: "night_ops_status",
      payload: {}
    };
  }

  if (/^(?:night\s+ops|night\s+mode)\s+(?:on|enable|start)$/i.test(message)) {
    return {
      matched: true,
      action: "night_ops_enable",
      payload: {}
    };
  }

  if (/^(?:night\s+ops|night\s+mode)\s+(?:off|disable|stop)$/i.test(message)) {
    return {
      matched: true,
      action: "night_ops_disable",
      payload: {}
    };
  }

  if (/^(?:night\s+ops|night\s+mode)\s+(?:run|run\s+now)$/i.test(message)) {
    return {
      matched: true,
      action: "night_ops_run_now",
      payload: {}
    };
  }

  const continuationVerb = /(continue|cotinnune|continnue|resume|proceed|keep\s+going|carry\s+on)/i;
  const continuationScope = /(task|tasks|job|jobs|session|work|codex|asolaria)/i;
  if (continuationVerb.test(message) && continuationScope.test(message)) {
    return {
      matched: true,
      action: "continue_primary_task",
      payload: {
        message
      }
    };
  }

  return { matched: false };
}

module.exports = {
  routeIntent
};
