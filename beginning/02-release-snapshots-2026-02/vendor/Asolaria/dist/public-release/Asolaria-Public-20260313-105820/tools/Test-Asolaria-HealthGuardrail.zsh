#!/usr/bin/env bash
set -euo pipefail

HTTP_PORT=4781
HTTPS_PORT=5443
OLI_PORT=8787
TIMEOUT_SEC=5
JSON_OUTPUT=0
SKIP_OLI=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -HttpPort|--http-port)
      HTTP_PORT="${2:-4781}"
      shift 2
      ;;
    -HttpsPort|--https-port)
      HTTPS_PORT="${2:-5443}"
      shift 2
      ;;
    -OliPort|--oli-port)
      OLI_PORT="${2:-8787}"
      shift 2
      ;;
    -TimeoutSec|--timeout)
      TIMEOUT_SEC="${2:-5}"
      shift 2
      ;;
    -Json|--json)
      JSON_OUTPUT=1
      shift
      ;;
    -SkipOli|--skip-oli)
      SKIP_OLI=1
      shift
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: zsh ./tools/Test-Asolaria-HealthGuardrail.zsh [options]

Options:
  -HttpPort <port>      Asolaria HTTP port (default: 4781)
  -HttpsPort <port>     Asolaria HTTPS port (default: 5443)
  -OliPort <port>       Oli status port (default: 8787)
  -TimeoutSec <sec>     Probe timeout seconds (default: 5)
  -Json                 Emit JSON only
  -SkipOli              Skip Oli status probe
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

iso_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

compact_json() {
  node -e 'try{const x=JSON.parse(process.argv[1]);process.stdout.write(JSON.stringify(x));}catch(e){process.exit(2)}' "$1"
}

probe_path() {
  local scheme="$1"
  local host="$2"
  local port="$3"
  local path="$4"
  local insecure="$5"
  local timeout="$6"

  local url="${scheme}://${host}:${port}${path}"
  local tmp_body=""
  local tmp_err=""
  tmp_body="$(mktemp)"
  tmp_err="$(mktemp)"

  local status="000"
  if [[ "$insecure" == "1" ]]; then
    status="$(curl -k -sS -m "$timeout" -o "$tmp_body" -w "%{http_code}" "$url" 2>"$tmp_err" || true)"
  else
    status="$(curl -sS -m "$timeout" -o "$tmp_body" -w "%{http_code}" "$url" 2>"$tmp_err" || true)"
  fi
  local err_msg=""
  if [[ ! -s "$tmp_body" ]]; then
    err_msg="$(cat "$tmp_err" 2>/dev/null || true)"
  fi
  local body
  body="$(cat "$tmp_body" 2>/dev/null || true)"
  rm -f "$tmp_body" "$tmp_err"

  local parsed=""
  if [[ -n "$body" ]]; then
    if parsed="$(compact_json "$body" 2>/dev/null)"; then
      :
    else
      parsed=""
      if [[ -z "$err_msg" ]]; then
        err_msg="non-json response"
      fi
    fi
  fi

  printf '%s\037%s\037%s\037%s\037%s\n' "$url" "$status" "$err_msg" "$path" "$parsed"
}

probe_health_with_fallback() {
  local scheme="$1"
  local port="$2"
  local insecure="$3"
  local timeout="$4"

  local first
  first="$(probe_path "$scheme" "127.0.0.1" "$port" "/api/health" "$insecure" "$timeout")"
  IFS=$'\037' read -r url1 status1 err1 path1 data1 <<<"$first"

  if [[ "$status1" == "404" ]]; then
    local second
    second="$(probe_path "$scheme" "127.0.0.1" "$port" "/health" "$insecure" "$timeout")"
    IFS=$'\037' read -r url2 status2 err2 path2 data2 <<<"$second"
    printf '%s\037%s\037%s\037%s\037%s\n' "$url2" "$status2" "$err2" "$path2" "$data2"
    return
  fi
  printf '%s\037%s\037%s\037%s\037%s\n' "$url1" "$status1" "$err1" "$path1" "$data1"
}

probe_oli_status() {
  local port="$1"
  local timeout="$2"
  probe_path "https" "$HOSTNAME_LOCAL" "$port" "/api/status" "1" "$timeout"
}

HOSTNAME_LOCAL="127.0.0.1"

http_probe="$(probe_health_with_fallback "http" "$HTTP_PORT" "0" "$TIMEOUT_SEC")"
https_probe="$(probe_health_with_fallback "https" "$HTTPS_PORT" "1" "$TIMEOUT_SEC")"

IFS=$'\037' read -r http_url http_status http_err http_path http_data <<<"$http_probe"
IFS=$'\037' read -r https_url https_status https_err https_path https_data <<<"$https_probe"

oli_url=""
oli_status="000"
oli_err=""
oli_path="/api/status"
oli_data=""
if [[ "$SKIP_OLI" != "1" ]]; then
  oli_probe="$(probe_path "https" "$HOSTNAME_LOCAL" "$OLI_PORT" "/api/status" "1" "$TIMEOUT_SEC")"
  IFS=$'\037' read -r oli_url oli_status oli_err oli_path oli_data <<<"$oli_probe"
fi

http_pids="$(lsof -nP -iTCP:"$HTTP_PORT" -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $2}' | sort -u | paste -sd, - || true)"
https_pids="$(lsof -nP -iTCP:"$HTTPS_PORT" -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $2}' | sort -u | paste -sd, - || true)"
oli_pids="$(lsof -nP -iTCP:"$OLI_PORT" -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $2}' | sort -u | paste -sd, - || true)"

export HG_TIMESTAMP="$(iso_now)"
export HG_HTTP_PORT="$HTTP_PORT"
export HG_HTTPS_PORT="$HTTPS_PORT"
export HG_OLI_PORT="$OLI_PORT"
export HG_SKIP_OLI="$SKIP_OLI"
export HG_SHELL="${SHELL##*/}"
export HG_SHELL_VERSION="${ZSH_VERSION:-${BASH_VERSION:-unknown}}"

export HTTP_URL="$http_url"
export HTTP_STATUS="$http_status"
export HTTP_ERROR="$http_err"
export HTTP_PATH="$http_path"
export HTTP_DATA="$http_data"
export HTTP_PIDS="$http_pids"

export HTTPS_URL="$https_url"
export HTTPS_STATUS="$https_status"
export HTTPS_ERROR="$https_err"
export HTTPS_PATH="$https_path"
export HTTPS_DATA="$https_data"
export HTTPS_PIDS="$https_pids"

export OLI_URL="$oli_url"
export OLI_STATUS="$oli_status"
export OLI_ERROR="$oli_err"
export OLI_PATH="$oli_path"
export OLI_DATA="$oli_data"
export OLI_PIDS="$oli_pids"

result_json="$(node <<'NODE'
function parseJson(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function parseIntSafe(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : d;
}
function okFromStatus(status, payload) {
  const code = parseIntSafe(status, 0);
  if (code >= 200 && code < 300) {
    if (payload && typeof payload.ok === "boolean") return payload.ok;
    return true;
  }
  return false;
}
function pids(raw) {
  return String(raw || "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => parseIntSafe(x, 0)).filter((x) => x > 0);
}
function healthSummary(payload) {
  if (!payload || typeof payload !== "object") return null;
  return {
    ok: Boolean(payload.ok),
    app: String(payload.app || ""),
    uptimeSeconds: parseIntSafe(payload.uptimeSeconds, 0),
    voiceMode: String(payload?.voice?.outputMode || ""),
    avatarState: String(payload?.avatar?.state || "")
  };
}
function oliSummary(payload) {
  if (!payload || typeof payload !== "object") return null;
  return {
    ok: Boolean(payload.ok),
    bridgeRunning: Boolean(payload?.state?.bridgeRunning),
    voiceProvider: String(payload?.state?.voice?.provider || ""),
    avatar: String(payload?.state?.avatar || "")
  };
}

const httpPayload = parseJson(process.env.HTTP_DATA || "");
const httpsPayload = parseJson(process.env.HTTPS_DATA || "");
const oliPayload = parseJson(process.env.OLI_DATA || "");

const httpOk = okFromStatus(process.env.HTTP_STATUS, httpPayload);
const httpsOk = okFromStatus(process.env.HTTPS_STATUS, httpsPayload);
const skipOli = String(process.env.HG_SKIP_OLI || "0") === "1";
const oliOk = skipOli ? null : okFromStatus(process.env.OLI_STATUS, oliPayload);

const notes = [];
if (httpOk && httpsOk) {
  notes.push(`Asolaria main health contract is healthy on ${process.env.HG_HTTP_PORT}/${process.env.HG_HTTPS_PORT}.`);
} else if (!httpOk && httpsOk) {
  notes.push("HTTPS is healthy but HTTP probe failed. Check ASOLARIA_PORT and HTTP listener.");
} else if (httpOk && !httpsOk) {
  notes.push("HTTP is healthy but HTTPS probe failed. Check cert/bind or ASOLARIA_HTTPS_PORT.");
} else {
  notes.push("Both Asolaria health probes failed. Verify runtime start and listeners.");
}
if (!skipOli) {
  if (oliOk) {
    notes.push(`Oli gateway is reachable on ${process.env.HG_OLI_PORT}.`);
  } else if (httpOk || httpsOk) {
    notes.push(`Oli gateway probe failed on ${process.env.HG_OLI_PORT} while Asolaria is healthy. ${process.env.HG_OLI_PORT} is a separate service.`);
  }
}

const checks = {
  asolariaHttpHealth: {
    ok: httpOk,
    url: String(process.env.HTTP_URL || ""),
    statusCode: parseIntSafe(process.env.HTTP_STATUS, 0),
    pathUsed: String(process.env.HTTP_PATH || "/api/health"),
    error: String(process.env.HTTP_ERROR || ""),
    summary: healthSummary(httpPayload)
  },
  asolariaHttpsHealth: {
    ok: httpsOk,
    url: String(process.env.HTTPS_URL || ""),
    statusCode: parseIntSafe(process.env.HTTPS_STATUS, 0),
    pathUsed: String(process.env.HTTPS_PATH || "/api/health"),
    transport: "curl -k",
    error: String(process.env.HTTPS_ERROR || ""),
    summary: healthSummary(httpsPayload)
  },
  oliStatus: {
    skipped: skipOli,
    ok: skipOli ? null : oliOk,
    url: String(process.env.OLI_URL || `https://127.0.0.1:${process.env.HG_OLI_PORT}/api/status`),
    statusCode: skipOli ? 0 : parseIntSafe(process.env.OLI_STATUS, 0),
    pathUsed: String(process.env.OLI_PATH || "/api/status"),
    transport: "curl -k",
    error: skipOli ? "" : String(process.env.OLI_ERROR || ""),
    summary: skipOli ? null : oliSummary(oliPayload)
  }
};

const diagnostics = {
  timestamp: String(process.env.HG_TIMESTAMP || ""),
  shell: {
    name: String(process.env.HG_SHELL || "unknown"),
    version: String(process.env.HG_SHELL_VERSION || "unknown")
  },
  ports: {
    asolariaHttp: parseIntSafe(process.env.HG_HTTP_PORT, 4781),
    asolariaHttps: parseIntSafe(process.env.HG_HTTPS_PORT, 5443),
    oli: parseIntSafe(process.env.HG_OLI_PORT, 8787)
  },
  listeners: {
    asolariaHttpPids: pids(process.env.HTTP_PIDS || ""),
    asolariaHttpsPids: pids(process.env.HTTPS_PIDS || ""),
    oliPids: pids(process.env.OLI_PIDS || "")
  },
  notes
};

const out = {
  ok: Boolean(httpOk || httpsOk),
  checks,
  diagnostics
};
process.stdout.write(JSON.stringify(out, null, 2));
NODE
)"

if [[ "$JSON_OUTPUT" == "1" ]]; then
  printf '%s\n' "$result_json"
  exit 0
fi

export RESULT_JSON="$result_json"
node <<'NODE'
const r = JSON.parse(process.env.RESULT_JSON || "{}");
const c = r.checks || {};
const d = r.diagnostics || {};
console.log(`Asolaria health guardrail @ ${d.timestamp || ""}`);
console.log(`- Shell: ${(d.shell || {}).name || "unknown"} ${(d.shell || {}).version || "unknown"}`);
console.log(`- HTTP health: ${c.asolariaHttpHealth && c.asolariaHttpHealth.ok ? "OK" : "FAIL"} (${(c.asolariaHttpHealth || {}).statusCode || 0})`);
console.log(`- HTTPS health: ${c.asolariaHttpsHealth && c.asolariaHttpsHealth.ok ? "OK" : "FAIL"} (${(c.asolariaHttpsHealth || {}).statusCode || 0}) via curl -k`);
if (c.oliStatus && c.oliStatus.skipped) {
  console.log("- Oli status: SKIPPED");
} else {
  console.log(`- Oli status: ${c.oliStatus && c.oliStatus.ok ? "OK" : "FAIL"} (${(c.oliStatus || {}).statusCode || 0}) via curl -k`);
}
console.log("- Notes:");
for (const n of (d.notes || [])) {
  console.log(`  - ${n}`);
}
NODE

