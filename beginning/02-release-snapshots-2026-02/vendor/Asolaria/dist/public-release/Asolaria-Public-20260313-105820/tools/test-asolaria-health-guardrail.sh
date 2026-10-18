#!/usr/bin/env bash
set -euo pipefail

HTTP_PORT=4781
HTTPS_PORT=5443
OLI_PORT=8787
TIMEOUT_SEC=5
OUTPUT_JSON=0
STRICT_MODE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --http-port)
      HTTP_PORT="${2:-4781}"
      shift 2
      ;;
    --https-port)
      HTTPS_PORT="${2:-5443}"
      shift 2
      ;;
    --oli-port)
      OLI_PORT="${2:-8787}"
      shift 2
      ;;
    --timeout)
      TIMEOUT_SEC="${2:-5}"
      shift 2
      ;;
    --json)
      OUTPUT_JSON=1
      shift
      ;;
    --strict)
      STRICT_MODE=1
      shift
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: test-asolaria-health-guardrail.sh [options]

Options:
  --http-port <port>   Asolaria HTTP port (default: 4781)
  --https-port <port>  Asolaria HTTPS port (default: 5443)
  --oli-port <port>    Optional Oli gateway port (default: 8787)
  --timeout <sec>      Probe timeout per request (default: 5)
  --json               Emit JSON output
  --strict             Exit 2 when Asolaria main probes fail
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "node is required." >&2
  exit 1
fi

timestamp_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

compact_json() {
  node -e 'try{const o=JSON.parse(process.argv[1]);process.stdout.write(JSON.stringify(o));}catch(e){process.stderr.write(String(e.message||e));process.exit(2)}' "$1"
}

probe_json() {
  local url="$1"
  local insecure="$2"
  local timeout="$3"
  local transport="curl"
  local output=""
  local exit_code=0

  if [[ "$insecure" == "1" ]]; then
    transport="curl -k"
    output="$(curl -k -sS -m "$timeout" "$url" 2>&1)" || exit_code=$?
  else
    output="$(curl -sS -m "$timeout" "$url" 2>&1)" || exit_code=$?
  fi

  if [[ "$exit_code" -ne 0 ]]; then
    printf '0\037%s\037%s\037%s\037null\n' "$transport" "$url" "$output"
    return
  fi

  local compact=""
  local parse_err=""
  if ! compact="$(compact_json "$output" 2> >(cat))"; then
    parse_err="non-json response"
    printf '0\037%s\037%s\037%s\037null\n' "$transport" "$url" "$parse_err"
    return
  fi
  printf '1\037%s\037%s\037\037%s\n' "$transport" "$url" "$compact"
}

probe_result_http="$(probe_json "http://127.0.0.1:${HTTP_PORT}/api/health" 0 "$TIMEOUT_SEC")"
probe_result_https="$(probe_json "https://127.0.0.1:${HTTPS_PORT}/api/health" 1 "$TIMEOUT_SEC")"
probe_result_oli="$(probe_json "https://127.0.0.1:${OLI_PORT}/api/status" 1 "$TIMEOUT_SEC")"

IFS=$'\037' read -r http_ok http_transport http_url http_error http_data <<<"$probe_result_http"
IFS=$'\037' read -r https_ok https_transport https_url https_error https_data <<<"$probe_result_https"
IFS=$'\037' read -r oli_ok oli_transport oli_url oli_error oli_data <<<"$probe_result_oli"

listener_pids() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2}' | sort -u | paste -sd, -
    return
  fi
  echo ""
}

http_pids_csv="$(listener_pids "$HTTP_PORT")"
https_pids_csv="$(listener_pids "$HTTPS_PORT")"
oli_pids_csv="$(listener_pids "$OLI_PORT")"

shell_name="${SHELL##*/}"
shell_name="${shell_name:-unknown}"
shell_version="${ZSH_VERSION:-${BASH_VERSION:-unknown}}"

export HG_TIMESTAMP="$(timestamp_now)"
export HG_HTTP_PORT="$HTTP_PORT"
export HG_HTTPS_PORT="$HTTPS_PORT"
export HG_OLI_PORT="$OLI_PORT"
export HG_SHELL_NAME="$shell_name"
export HG_SHELL_VERSION="$shell_version"

export HTTP_OK="$http_ok"
export HTTP_TRANSPORT="$http_transport"
export HTTP_URL="$http_url"
export HTTP_ERROR="$http_error"
export HTTP_DATA="$http_data"
export HTTP_PIDS="$http_pids_csv"

export HTTPS_OK="$https_ok"
export HTTPS_TRANSPORT="$https_transport"
export HTTPS_URL="$https_url"
export HTTPS_ERROR="$https_error"
export HTTPS_DATA="$https_data"
export HTTPS_PIDS="$https_pids_csv"

export OLI_OK="$oli_ok"
export OLI_TRANSPORT="$oli_transport"
export OLI_URL="$oli_url"
export OLI_ERROR="$oli_error"
export OLI_DATA="$oli_data"
export OLI_PIDS="$oli_pids_csv"

result_json="$(node <<'NODE'
function toBool(v) {
  return String(v || "") === "1" || String(v || "").toLowerCase() === "true";
}
function parseJson(v, fallback = null) {
  if (!v || v === "null") return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}
function pids(csv) {
  return String(csv || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}
function summaryHealth(data) {
  if (!data || typeof data !== "object") return null;
  const queue = data.queue || {};
  const voice = data.voice || {};
  const avatar = data.avatar || {};
  return {
    ok: Boolean(data.ok),
    app: String(data.app || ""),
    uptimeSeconds: Number.isFinite(Number(data.uptimeSeconds)) ? Math.round(Number(data.uptimeSeconds)) : 0,
    queueQueued: Number.isFinite(Number(queue.queued)) ? Number(queue.queued) : 0,
    queueRunning: Number.isFinite(Number(queue.running)) ? Number(queue.running) : 0,
    voiceMode: String(voice.outputMode || ""),
    voiceEnabled: Boolean(voice.enabled),
    avatarState: String(avatar.state || ""),
    avatarEnabled: Boolean(avatar.enabled)
  };
}
function summaryOli(data) {
  if (!data || typeof data !== "object") return null;
  const state = data.state || {};
  return {
    ok: Boolean(data.ok),
    bridgeRunning: Boolean(state.bridgeRunning),
    voiceProvider: String((state.voice || {}).provider || ""),
    avatar: String(state.avatar || "")
  };
}
const httpData = parseJson(process.env.HTTP_DATA, null);
const httpsData = parseJson(process.env.HTTPS_DATA, null);
const oliData = parseJson(process.env.OLI_DATA, null);
const httpOk = toBool(process.env.HTTP_OK);
const httpsOk = toBool(process.env.HTTPS_OK);
const oliOk = toBool(process.env.OLI_OK);
const notes = [];
if (httpOk && httpsOk) {
  notes.push(`Asolaria main health contract is healthy on ${process.env.HG_HTTP_PORT}/${process.env.HG_HTTPS_PORT}.`);
} else if (!httpOk && httpsOk) {
  notes.push("HTTPS is healthy but HTTP probe failed. Check ASOLARIA_PORT and local HTTP binding.");
} else if (httpOk && !httpsOk) {
  notes.push("HTTP is healthy but HTTPS probe failed. Check cert/bind or ASOLARIA_HTTPS_PORT.");
} else {
  notes.push("Both Asolaria health probes failed. Verify runtime start and listener ports.");
}
if (!oliOk && (httpOk || httpsOk)) {
  notes.push(`Oli gateway probe failed on ${process.env.HG_OLI_PORT} while Asolaria is healthy. ${process.env.HG_OLI_PORT} is a separate service.`);
}
if (oliOk) {
  notes.push(`Oli gateway is reachable on ${process.env.HG_OLI_PORT}.`);
}
const result = {
  ok: Boolean(httpOk || httpsOk),
  timestamp: String(process.env.HG_TIMESTAMP || ""),
  powershell: {
    edition: "N/A",
    version: "N/A"
  },
  shell: {
    name: String(process.env.HG_SHELL_NAME || "unknown"),
    version: String(process.env.HG_SHELL_VERSION || "unknown")
  },
  ports: {
    asolariaHttp: Number(process.env.HG_HTTP_PORT || 4781),
    asolariaHttps: Number(process.env.HG_HTTPS_PORT || 5443),
    oliGateway: Number(process.env.HG_OLI_PORT || 8787)
  },
  listeners: {
    http: { port: Number(process.env.HG_HTTP_PORT || 4781), pids: pids(process.env.HTTP_PIDS) },
    https: { port: Number(process.env.HG_HTTPS_PORT || 5443), pids: pids(process.env.HTTPS_PIDS) },
    oli: { port: Number(process.env.HG_OLI_PORT || 8787), pids: pids(process.env.OLI_PIDS) }
  },
  probes: {
    asolariaHttp: {
      url: String(process.env.HTTP_URL || ""),
      ok: httpOk,
      transport: String(process.env.HTTP_TRANSPORT || "curl"),
      error: String(process.env.HTTP_ERROR || ""),
      summary: summaryHealth(httpData)
    },
    asolariaHttps: {
      url: String(process.env.HTTPS_URL || ""),
      ok: httpsOk,
      transport: String(process.env.HTTPS_TRANSPORT || "curl -k"),
      error: String(process.env.HTTPS_ERROR || ""),
      summary: summaryHealth(httpsData)
    },
    oliGateway: {
      url: String(process.env.OLI_URL || ""),
      ok: oliOk,
      transport: String(process.env.OLI_TRANSPORT || "curl -k"),
      error: String(process.env.OLI_ERROR || ""),
      summary: summaryOli(oliData)
    }
  },
  notes
};
process.stdout.write(JSON.stringify(result, null, 2));
NODE
)"

if [[ "$OUTPUT_JSON" == "1" ]]; then
  printf '%s\n' "$result_json"
else
  export RESULT_JSON="$result_json"
  node <<'NODE'
const result = JSON.parse(process.env.RESULT_JSON || "{}");
const probes = result.probes || {};
const listeners = result.listeners || {};
console.log(`Asolaria health guardrail @ ${result.timestamp || ""}`);
console.log(`- Shell: ${(result.shell || {}).name || "unknown"} ${(result.shell || {}).version || "unknown"}`);
console.log(`- Asolaria HTTP (${(result.ports || {}).asolariaHttp}): ${probes.asolariaHttp && probes.asolariaHttp.ok ? "OK" : "FAIL"}`);
if (probes.asolariaHttp && !probes.asolariaHttp.ok && probes.asolariaHttp.error) {
  console.log(`  error: ${probes.asolariaHttp.error}`);
}
console.log(`- Asolaria HTTPS (${(result.ports || {}).asolariaHttps}): ${probes.asolariaHttps && probes.asolariaHttps.ok ? "OK" : "FAIL"} via ${(probes.asolariaHttps || {}).transport || "curl -k"}`);
if (probes.asolariaHttps && !probes.asolariaHttps.ok && probes.asolariaHttps.error) {
  console.log(`  error: ${probes.asolariaHttps.error}`);
}
console.log(`- Oli gateway (${(result.ports || {}).oliGateway}): ${probes.oliGateway && probes.oliGateway.ok ? "OK" : "FAIL"} via ${(probes.oliGateway || {}).transport || "curl -k"}`);
if (probes.oliGateway && !probes.oliGateway.ok && probes.oliGateway.error) {
  console.log(`  error: ${probes.oliGateway.error}`);
}
const httpPids = ((listeners.http || {}).pids || []).join(",");
const httpsPids = ((listeners.https || {}).pids || []).join(",");
const oliPids = ((listeners.oli || {}).pids || []).join(",");
console.log(`- Listeners: http=${httpPids} https=${httpsPids} oli=${oliPids}`);
console.log("- Notes:");
for (const note of (result.notes || [])) {
  console.log(`  - ${note}`);
}
NODE
fi

if [[ "$STRICT_MODE" == "1" ]]; then
  export RESULT_JSON="$result_json"
  strict_ok="$(node -e 'const r=JSON.parse(process.env.RESULT_JSON||"{}"); process.stdout.write(r.ok?"1":"0");')"
  if [[ "$strict_ok" != "1" ]]; then
    exit 2
  fi
fi

