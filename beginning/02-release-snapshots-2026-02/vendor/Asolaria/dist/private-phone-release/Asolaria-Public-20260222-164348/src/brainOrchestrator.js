const { runCodex } = require("./connectors/codexConnector");
const { runVertexGemini } = require("./connectors/vertexConnector");
const { runGeminiApiGenerateContent } = require("./connectors/geminiApiConnector");
const {
  listConfiguredExternalProviders,
  runExternalProvider
} = require("./connectors/externalBrainConnector");
const { buildBrainSafetyPrefix } = require("./brainPolicy");
const DEFAULT_PROVIDER_CHAIN = Object.freeze(["codex", "vertex", "gemini-api", "cursor", "antigravity"]);

function shouldFallbackToAlternateProvider(error) {
  const text = String(error?.message || error || "").toLowerCase();
  if (!text) {
    return true;
  }

  const hardStops = [
    "guardian blocked",
    "blocked by policy",
    "owner denied",
    "approval denied",
    "deny",
    "denied"
  ];
  if (hardStops.some((term) => text.includes(term))) {
    return false;
  }

  const triggers = [
    "429",
    "quota",
    "credit",
    "insufficient",
    "rate limit",
    "temporarily unavailable",
    "timed out",
    "failed to start codex",
    "not configured",
    "forbidden",
    "unauthorized",
    "authentication",
    "model",
    "unavailable"
  ];
  return triggers.some((term) => text.includes(term)) || text.length > 0;
}

function buildLowCostResponse(message, providersTried) {
  const prompt = String(message || "").trim();
  return [
    "Asolaria switched to low-cost fallback mode.",
    `Providers tried: ${providersTried.join(" -> ") || "none"}.`,
    `I could not complete full reasoning for: "${prompt}".`,
    "Next step: use routed tools (screenshot, Chrome inspect, PAD, local ops) until provider health recovers."
  ].join("\n");
}

function clampMemoryForCost(memoryContext, costMode) {
  const text = String(memoryContext || "").trim();
  if (!text) {
    return "";
  }

  if (costMode === "quality") {
    return text;
  }

  if (costMode === "balanced") {
    const lines = text.split("\n");
    return lines.slice(-10).join("\n");
  }

  const lines = text.split("\n");
  return lines.slice(-6).join("\n");
}

function providerBudgetForCost(costMode) {
  if (costMode === "quality") {
    return { timeoutMs: 120000, maxTokens: 1200, temperature: 0.2 };
  }
  if (costMode === "balanced") {
    return { timeoutMs: 90000, maxTokens: 850, temperature: 0.2 };
  }
  return { timeoutMs: 70000, maxTokens: 600, temperature: 0.1 };
}

function orderExternalProviders(providers) {
  const priority = {
    cursor: 0,
    antigravity: 1
  };
  return [...(Array.isArray(providers) ? providers : [])]
    .sort((a, b) => {
      const left = priority[String(a?.id || "").toLowerCase()] ?? 99;
      const right = priority[String(b?.id || "").toLowerCase()] ?? 99;
      if (left !== right) {
        return left - right;
      }
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
}

function normalizeBrainProviderId(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (!raw) return "";
  if (raw === "gemini" || raw === "gemini-api" || raw === "geminiapi") return "gemini-api";
  if (raw === "vertex" || raw === "vertex-ai") return "vertex";
  if (raw === "codex") return "codex";
  if (raw === "cursor") return "cursor";
  if (raw === "antigravity") return "antigravity";
  return "";
}

function parseBrainProviderOrder(value, fallback = []) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;\n|]/)
      : [];
  const parsed = [];
  for (const entry of source) {
    const provider = normalizeBrainProviderId(entry);
    if (!provider) continue;
    parsed.push(provider);
  }
  if (parsed.length > 0) {
    return parsed;
  }
  return Array.isArray(fallback) ? fallback.map((entry) => normalizeBrainProviderId(entry)).filter(Boolean) : [];
}

function dedupeProviderOrder(items = []) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const provider = normalizeBrainProviderId(item);
    if (!provider || seen.has(provider)) {
      continue;
    }
    seen.add(provider);
    out.push(provider);
  }
  return out;
}

function buildEffectiveProviderOrder(settings = {}) {
  const primary = normalizeBrainProviderId(settings.brainPrimaryProvider) || "codex";
  const fallback = parseBrainProviderOrder(
    settings.brainFallbackOrder,
    ["vertex", "gemini-api", "cursor", "antigravity"]
  );
  return dedupeProviderOrder([primary, ...fallback, ...DEFAULT_PROVIDER_CHAIN]);
}

function redactSensitiveFragments(text) {
  const raw = String(text || "");
  if (!raw) {
    return "";
  }
  return raw
    .replace(/\b(password|passphrase|token|api key|secret|private key|session cookie)\b\s*[:=]\s*[^\s,\n]+/gi, "$1=[REDACTED]")
    .replace(/\b(bearer)\s+[a-z0-9._~+/=-]{16,}\b/gi, "$1 [REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, (match) => {
      const at = match.indexOf("@");
      if (at <= 1) return "[REDACTED_EMAIL]";
      return `${match.slice(0, 1)}***${match.slice(at)}`;
    });
}

function containsSensitiveMaterial(text) {
  const value = String(text || "");
  if (!value) {
    return false;
  }
  const patterns = [
    /\b(password|passphrase|token|api key|secret|private key|session cookie|oauth)\b/i,
    /\b(bearer)\s+[a-z0-9._~+/=-]{16,}\b/i
  ];
  return patterns.some((pattern) => pattern.test(value));
}

async function runBrainTask({ message, images, files, memoryContext, settings, toolPaths, onApprovalEscalated }) {
  const safeSettings = settings || {};
  const safeImages = Array.isArray(images) ? images : [];
  const safeFiles = Array.isArray(files) ? files : [];
  const costMode = String(safeSettings.costMode || "low").toLowerCase();
  const providersTried = [];
  const policyPrefix = buildBrainSafetyPrefix(safeSettings);
  const slimMemory = clampMemoryForCost(memoryContext, costMode);
  const composedPrompt = [policyPrefix, "Task:", String(message || "").trim()].join("\n\n");
  const budget = providerBudgetForCost(costMode);
  const externalProviders = orderExternalProviders(listConfiguredExternalProviders());
  const externalById = new Map(
    externalProviders.map((provider) => [String(provider?.id || "").trim().toLowerCase(), provider])
  );
  const providerOrder = buildEffectiveProviderOrder(safeSettings);
  const externalBlockedForSensitiveData =
    safeImages.length > 0
    || safeFiles.length > 0
    || containsSensitiveMaterial(message)
    || containsSensitiveMaterial(memoryContext);
  let externalSensitiveBlockNoted = false;

  for (const providerKey of providerOrder) {
    if (providerKey === "codex") {
      const codexEnabled = Boolean(toolPaths?.codexPath);
      if (!codexEnabled) {
        providersTried.push("codex-unavailable");
        continue;
      }
      providersTried.push("codex");
      try {
        const timeoutMs = costMode === "quality" ? 240000 : costMode === "balanced" ? 150000 : 90000;
        const effectiveTimeoutMs = String(safeSettings.approvalPreference || "balanced") === "pay_priority"
          ? Math.max(timeoutMs, 20 * 60 * 1000)
          : timeoutMs;
        const result = await runCodex({
          prompt: composedPrompt,
          images: safeImages,
          memoryContext: slimMemory,
          model: String(safeSettings.codexModel || "").trim(),
          modelReasoningEffort: String(safeSettings.codexModelReasoningEffort || "").trim().toLowerCase(),
          approvalMode: safeSettings.approvalMode || "smart",
          approvalPreference: safeSettings.approvalPreference || "balanced",
          webSearch: Boolean(safeSettings.codexWebSearch),
          timeoutMs: effectiveTimeoutMs,
          approvalWaitMs: Number(safeSettings.approvalWaitMs || 20 * 60 * 1000),
          onApprovalEscalated
        });
        return {
          provider: "codex",
          providersTried,
          ...result
        };
      } catch (error) {
        if (!shouldFallbackToAlternateProvider(error)) {
          throw error;
        }
        continue;
      }
    }

    if (providerKey === "vertex") {
      providersTried.push("vertex");
      try {
        const prompt = [
          policyPrefix,
          "Task:",
          String(message || "").trim(),
          slimMemory ? `Context:\n${slimMemory}` : ""
        ].filter(Boolean).join("\n\n");
        const result = await runVertexGemini({
          prompt,
          maxOutputTokens: budget.maxTokens,
          temperature: budget.temperature
        }, {
          enabled: true
        });
        return {
          provider: "vertex",
          providersTried,
          reply: result.reply,
          approvals: [],
          imagesUsed: safeImages,
          raw: result.raw,
          budget: result.budget || null
        };
      } catch (error) {
        if (!shouldFallbackToAlternateProvider(error)) {
          throw error;
        }
        continue;
      }
    }

    if (providerKey === "gemini-api") {
      providersTried.push("gemini-api");
      try {
        const prompt = [
          "Task:",
          String(message || "").trim(),
          slimMemory ? `Context:\n${slimMemory}` : ""
        ].filter(Boolean).join("\n\n");
        const result = await runGeminiApiGenerateContent({
          prompt,
          system: policyPrefix,
          maxOutputTokens: budget.maxTokens,
          temperature: budget.temperature
        }, {
          enabled: true
        });
        return {
          provider: "gemini-api",
          providersTried,
          reply: result.reply,
          approvals: [],
          imagesUsed: safeImages,
          raw: result.raw
        };
      } catch (error) {
        if (!shouldFallbackToAlternateProvider(error)) {
          throw error;
        }
        continue;
      }
    }

    if (providerKey === "cursor" || providerKey === "antigravity") {
      if (externalBlockedForSensitiveData) {
        if (!externalSensitiveBlockNoted) {
          providersTried.push("external-blocked-sensitive");
          externalSensitiveBlockNoted = true;
        }
        continue;
      }
      const provider = externalById.get(providerKey);
      if (!provider) {
        providersTried.push(`${providerKey}-not-configured`);
        continue;
      }
      providersTried.push(provider.id);
      try {
        const result = await runExternalProvider(provider, {
          prompt: [
            policyPrefix,
            "Task:",
            redactSensitiveFragments(String(message || "").trim()),
            slimMemory ? `Context:\n${redactSensitiveFragments(slimMemory)}` : ""
          ].filter(Boolean).join("\n\n"),
          timeoutMs: budget.timeoutMs,
          maxTokens: budget.maxTokens,
          temperature: budget.temperature
        });
        return {
          provider: provider.id,
          providersTried,
          reply: result.reply,
          approvals: [],
          imagesUsed: safeImages,
          raw: result.raw
        };
      } catch (_error) {
        // Continue to next external provider in configured order.
        continue;
      }
    }
  }

  providersTried.push("template-fallback");
  return {
    provider: "template-fallback",
    providersTried,
    reply: buildLowCostResponse(message, providersTried),
    approvals: [],
    imagesUsed: safeImages
  };
}

module.exports = {
  runBrainTask
};
