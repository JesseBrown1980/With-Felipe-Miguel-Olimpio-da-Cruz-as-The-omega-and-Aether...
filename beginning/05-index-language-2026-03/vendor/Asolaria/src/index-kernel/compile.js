const fs = require("fs");
const path = require("path");
const { agentIndexRoot, SCHEMA_VERSION } = require("./schema");
const {
  cleanLine,
  normalizeArray,
  normalizeChainValue,
  normalizeCanonicalId,
  normalizeIxId,
  normalizeLxId,
  parseFrontMatter,
  buildSummaryFromBody,
  buildSnippet
} = require("./textIds");

function compareDocuments(left, right) {
  const layerWeight = (value) => (value === "canonical" ? 0 : 1);
  if (layerWeight(left.layer) !== layerWeight(right.layer)) {
    return layerWeight(left.layer) - layerWeight(right.layer);
  }
  if (String(left.type || "") !== String(right.type || "")) {
    return String(left.type || "").localeCompare(String(right.type || ""));
  }
  return String(left.id || "").localeCompare(String(right.id || ""));
}

function buildDocumentSearchText(document) {
  return [
    document.id,
    document.canonicalId,
    document.namespaceId,
    document.title,
    document.type,
    Array.isArray(document.tags) ? document.tags.join(" ") : "",
    Array.isArray(document.chain) ? document.chain.join(" ") : "",
    Array.isArray(document.agents) ? document.agents.join(" ") : "",
    document.summary,
    document.body
  ].filter(Boolean).join("\n");
}

function getCanonicalFallbackPrefix(file, parsed) {
  const sourceKindPrefix = String(file?.sourceKind || "").match(/^canonical_([a-z]{2})$/i);
  if (sourceKindPrefix) {
    return String(sourceKindPrefix[1] || "").toUpperCase();
  }
  const attrPrefix = ["lx", "am", "ro"].find((key) => cleanLine(parsed?.attrs?.[key]));
  if (attrPrefix) {
    return attrPrefix.toUpperCase();
  }
  const filePrefix = path.basename(String(file?.path || "")).match(/^([A-Za-z]{2})-\d{3,4}\.md$/i);
  return filePrefix ? String(filePrefix[1] || "").toUpperCase() : "LX";
}

function getCanonicalRawId(file, parsed, fallbackPrefix) {
  const attrKey = String(fallbackPrefix || "").toLowerCase();
  return parsed?.attrs?.canonicalId
    || parsed?.attrs?.namespaceId
    || (attrKey ? parsed?.attrs?.[attrKey] : "")
    || parsed?.attrs?.lx
    || parsed?.attrs?.am
    || parsed?.attrs?.ro
    || path.basename(file.path);
}

function buildDocumentFromFile(file, prefix) {
  const rawText = String(fs.readFileSync(file.path, "utf8") || "");
  const parsed = parseFrontMatter(rawText);
  const requestedPrefix = String(prefix || "").toUpperCase();
  const isCanonicalNamespace = ["LX", "AM", "RO"].includes(requestedPrefix);
  const fallbackPrefix = isCanonicalNamespace ? getCanonicalFallbackPrefix(file, parsed) : "IX";
  const id = isCanonicalNamespace
    ? normalizeCanonicalId(getCanonicalRawId(file, parsed, fallbackPrefix), fallbackPrefix)
    : normalizeIxId(parsed.attrs.ix || path.basename(file.path));
  const resolvedPrefix = String(id || "").split("-")[0] || fallbackPrefix;
  const isLx = resolvedPrefix === "LX";
  const title = cleanLine(parsed.attrs.name || id);
  const type = cleanLine(parsed.attrs.type || file.typeHint || "reference").toLowerCase();
  const tags = normalizeArray(parsed.attrs.tags || []);
  const chain = normalizeArray(parsed.attrs.chain || []).map((item) => normalizeChainValue(item));
  const agents = normalizeArray(parsed.attrs.agents || []);
  const body = String(parsed.body || "").trim();
  const summary = buildSummaryFromBody(body);
  const updatedAt = new Date(Number(file.mtimeMs || 0)).toISOString();
  const attributes = {};
  for (const [key, value] of Object.entries(parsed.attrs || {})) {
    if (["tags", "chain", "agents"].includes(key)) {
      attributes[key] = Array.isArray(value) ? value.slice() : normalizeArray(value);
      continue;
    }
    attributes[key] = cleanLine(value);
  }

  return {
    id,
    indexId: id,
    ix: id,
    canonicalId: isCanonicalNamespace ? id : "",
    namespaceId: isCanonicalNamespace ? id : "",
    lx: isLx ? id : "",
    canonicalPrefix: isCanonicalNamespace ? resolvedPrefix : "",
    namespacePrefix: isCanonicalNamespace ? resolvedPrefix : "",
    prefix: resolvedPrefix,
    number: String(id || "").split("-")[1] || "",
    title,
    type,
    tags,
    chain,
    agents,
    body,
    summary,
    source: file.relativePath,
    absolutePath: file.path,
    sourceKind: file.sourceKind,
    layer: file.layer,
    updatedAt,
    attributes
  };
}

function choosePreferredDocument(current, candidate) {
  if (!current) {
    return candidate;
  }
  if (current.layer !== candidate.layer) {
    return candidate.layer === "canonical" ? candidate : current;
  }
  if (String(candidate.updatedAt || "") !== String(current.updatedAt || "")) {
    return String(candidate.updatedAt || "") > String(current.updatedAt || "") ? candidate : current;
  }
  return String(candidate.source || "") < String(current.source || "") ? candidate : current;
}

function summarizeDocuments(inventory, documents) {
  const prefixCounts = {};
  const typeCounts = {};
  const layerCounts = {};
  for (const document of documents) {
    prefixCounts[document.prefix] = Number(prefixCounts[document.prefix] || 0) + 1;
    typeCounts[document.type] = Number(typeCounts[document.type] || 0) + 1;
    layerCounts[document.layer] = Number(layerCounts[document.layer] || 0) + 1;
  }
  return {
    canonicalFiles: inventory.canonicalFiles.length,
    auxiliaryFiles: inventory.auxiliaryFiles.length,
    documents: documents.length,
    canonicalDocuments: Number(layerCounts.canonical || 0),
    auxiliaryDocuments: Number(layerCounts.auxiliary || 0),
    prefixCounts,
    typeCounts,
    layerCounts
  };
}

function buildCompiledDocuments(inventory) {
  const documentsById = new Map();
  const canonicalDocuments = inventory.canonicalFiles.map((file) => {
    const sourceKindPrefix = String(file.sourceKind || "").match(/^canonical_([a-z]{2})$/i);
    return buildDocumentFromFile(file, sourceKindPrefix ? String(sourceKindPrefix[1]).toUpperCase() : "LX");
  });
  for (const document of canonicalDocuments) {
    documentsById.set(document.id, choosePreferredDocument(documentsById.get(document.id), document));
  }
  const auxiliaryDocuments = inventory.auxiliaryFiles.map((file) => buildDocumentFromFile(file, "IX"));
  for (const document of auxiliaryDocuments) {
    documentsById.set(document.id, choosePreferredDocument(documentsById.get(document.id), document));
  }
  return Array.from(documentsById.values()).sort(compareDocuments);
}

function buildPayload(profile, inventory, documents, meta = {}) {
  const summary = summarizeDocuments(inventory, documents);
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    profile: profile.profile,
    stage: profile.stage,
    sourceContract: profile.sourceContract,
    buildMode: meta.buildMode || "source-compile",
    promotedAt: meta.promotedAt || "",
    promotedFromProfile: meta.promotedFromProfile || "",
    validated: false,
    validatedAt: "",
    validationErrors: [],
    signature: inventory.signature,
    root: agentIndexRoot,
    cachePath: profile.cachePath,
    canonicalSourceFiles: inventory.canonicalFiles.map((row) => row.path),
    auxiliarySourceFiles: inventory.auxiliaryFiles.map((row) => row.path),
    sourceCounts: summary,
    documentCount: summary.documents,
    profileConfig: {
      allowSourceBuild: profile.allowSourceBuild,
      includeAuxiliaryIx: profile.includeAuxiliaryIx,
      strictSourceValidation: profile.strictSourceValidation
    },
    scanContract: meta.scanContract || null,
    gateReport: meta.gateReport || null,
    documents
  };
}

function buildEmptyPayload(profile, inventory = null, overrides = {}) {
  const sourceCounts = summarizeDocuments(
    inventory || { canonicalFiles: [], auxiliaryFiles: [] },
    []
  );
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: "",
    profile: profile.profile,
    stage: profile.stage,
    sourceContract: profile.sourceContract,
    buildMode: profile.allowSourceBuild
      ? "source-compile"
      : profile.usesManifestPointer
        ? "running-manifest"
        : "promoted-snapshot",
    promotedAt: "",
    promotedFromProfile: "",
    validated: false,
    validatedAt: "",
    validationErrors: [],
    signature: inventory?.signature || "",
    root: agentIndexRoot,
    cachePath: profile.cachePath,
    canonicalSourceFiles: inventory?.canonicalFiles?.map((row) => row.path) || [],
    auxiliarySourceFiles: inventory?.auxiliaryFiles?.map((row) => row.path) || [],
    sourceCounts,
    documentCount: 0,
    profileConfig: {
      allowSourceBuild: profile.allowSourceBuild,
      includeAuxiliaryIx: profile.includeAuxiliaryIx,
      strictSourceValidation: profile.strictSourceValidation
    },
    scanContract: overrides.scanContract || null,
    gateReport: overrides.gateReport || null,
    documents: [],
    ...overrides
  };
}

module.exports = {
  buildDocumentSearchText,
  buildCompiledDocuments,
  buildPayload,
  buildEmptyPayload
};
