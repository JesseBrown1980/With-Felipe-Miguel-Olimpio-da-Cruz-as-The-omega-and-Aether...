const { spawn } = require("child_process");
const path = require("path");
const { resolveToolPaths } = require("./systemPaths");

function clipText(value, maxChars = 500) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 3)}...`;
}

function firstNonEmptyLine(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function resolveClaudeExecutable(options = {}) {
  const explicit = String(options.executable || "").trim();
  if (explicit) {
    return explicit;
  }

  const envOverride = String(process.env.ASOLARIA_CLAUDE_PATH || "").trim();
  if (envOverride) {
    return envOverride;
  }

  const toolPaths = resolveToolPaths();
  const detected = String(toolPaths.claudePath || "").trim();
  if (detected) {
    return detected;
  }

  return "claude";
}

function inferAuthIssue(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return "";
  if (
    value.includes("api key")
    || value.includes("not authenticated")
    || value.includes("login")
    || value.includes("subscription")
    || value.includes("auth")
    || value.includes("token")
  ) {
    return "Anthropic CLI appears unauthenticated. Set `ANTHROPIC_API_KEY` or run Claude login/setup.";
  }
  return "";
}

function runClaudeCli(args, options = {}) {
  return new Promise((resolve, reject) => {
    const executable = resolveClaudeExecutable(options);
    const timeoutMs = Math.max(10000, Number(options.timeoutMs || 120000));

    let child;
    if (process.platform === "win32") {
      const parsed = path.parse(executable);
      const hasDir = Boolean(parsed.dir);
      const hasSpaces = /\s/.test(executable);
      const launchCommand = (hasDir && hasSpaces) ? parsed.base : executable;
      const launchCwd = (hasDir && hasSpaces) ? parsed.dir : process.cwd();
      child = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", launchCommand, ...args], {
        windowsHide: true,
        cwd: launchCwd,
        env: process.env
      });
    } else {
      child = spawn(executable, args, {
        windowsHide: true,
        cwd: process.cwd(),
        env: process.env
      });
    }

    let stdout = "";
    let stderr = "";
    if (child.stdin && typeof child.stdin.end === "function") {
      child.stdin.end();
    }
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Anthropic CLI timed out."));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start Anthropic CLI: ${error.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      const cleanStdout = String(stdout || "").trim();
      const cleanStderr = String(stderr || "").trim();
      if (code !== 0) {
        const summary = clipText(cleanStderr || cleanStdout || `exit code ${code}`, 450);
        return reject(new Error(`Anthropic CLI exited with code ${code}. ${summary}`.trim()));
      }
      return resolve({
        executable,
        exitCode: Number(code || 0),
        stdout: cleanStdout,
        stderr: cleanStderr
      });
    });
  });
}

async function runAnthropicCli(prompt, options = {}) {
  const text = String(prompt || "").trim();
  if (!text) {
    throw new Error("Prompt is required for Anthropic CLI execution.");
  }

  const timeoutMs = Math.max(15000, Number(options.timeoutMs || 120000));
  const outputFormat = String(options.outputFormat || "text").trim() || "text";
  const permissionMode = String(options.permissionMode || "plan").trim() || "plan";
  const args = ["--print", "--output-format", outputFormat, "--permission-mode", permissionMode];

  const model = String(options.model || "").trim();
  if (model) {
    args.push("--model", model);
  }

  const maxBudgetUsd = Number(options.maxBudgetUsd);
  if (Number.isFinite(maxBudgetUsd) && maxBudgetUsd > 0) {
    args.push("--max-budget-usd", String(maxBudgetUsd));
  }

  args.push(text);

  const raw = await runClaudeCli(args, {
    timeoutMs,
    executable: options.executable
  });
  const reply = String(raw.stdout || "").trim();
  if (!reply) {
    const combined = [raw.stderr, raw.stdout].filter(Boolean).join("\n");
    const authHint = inferAuthIssue(combined);
    const hint = authHint || "Anthropic CLI returned no reply text.";
    throw new Error(`${hint} ${clipText(combined, 400)}`.trim());
  }

  return {
    reply,
    raw
  };
}

function detectAuthSourceFromEnv() {
  if (String(process.env.ANTHROPIC_API_KEY || "").trim()) {
    return "env:ANTHROPIC_API_KEY";
  }
  if (String(process.env.CLAUDE_CODE_OAUTH_TOKEN || "").trim()) {
    return "env:CLAUDE_CODE_OAUTH_TOKEN";
  }
  if (String(process.env.CLAUDE_API_KEY || "").trim()) {
    return "env:CLAUDE_API_KEY";
  }
  return "";
}

async function getAnthropicCliStatus(options = {}) {
  const executable = resolveClaudeExecutable(options);
  const timeoutMs = Math.max(8000, Number(options.timeoutMs || 15000));
  const verifyCapabilities = Boolean(options.verifyCapabilities);

  try {
    const versionResult = await runClaudeCli(["--version"], {
      timeoutMs,
      executable
    });
    const version = firstNonEmptyLine(versionResult.stdout || versionResult.stderr) || null;

    let supportsHeadless = true;
    if (verifyCapabilities) {
      try {
        const helpResult = await runClaudeCli(["--help"], {
          timeoutMs,
          executable
        });
        const helpText = [helpResult.stdout, helpResult.stderr].filter(Boolean).join("\n");
        supportsHeadless = /--print/i.test(helpText) && /--output-format/i.test(helpText);
      } catch (_error) {
        supportsHeadless = true;
      }
    }

    const authSource = detectAuthSourceFromEnv();
    const authVerified = authSource ? true : false;
    const statusText = authSource
      ? `Detected ${authSource}.`
      : "Authentication not verified from environment variables.";

    if (!supportsHeadless) {
      return {
        available: false,
        executable,
        version,
        authenticated: authVerified,
        authentication: authSource || "unknown",
        statusText,
        error: "Installed Claude CLI does not expose required non-interactive flags (`--print`, `--output-format`)."
      };
    }

    return {
      available: true,
      executable,
      version,
      authenticated: authVerified,
      authentication: authSource || "unknown",
      statusText,
      error: null
    };
  } catch (error) {
    return {
      available: false,
      executable,
      version: null,
      authenticated: false,
      authentication: "unknown",
      statusText: "",
      error: clipText(error.message, 800)
    };
  }
}

module.exports = {
  runClaudeCli,
  runAnthropicCli,
  getAnthropicCliStatus
};
