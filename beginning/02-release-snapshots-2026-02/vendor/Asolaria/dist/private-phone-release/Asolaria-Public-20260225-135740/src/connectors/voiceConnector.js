const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function safeText(value, limit = 12000) {
  const text = String(value || "").trim();
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function splitSentences(text, maxLen = 240) {
  const value = safeText(text, 20000);
  if (!value) return [];
  const rough = value
    .split(/(?<=[\.\!\?])\s+|\n+/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks = [];
  for (const part of rough) {
    if (part.length <= maxLen) {
      chunks.push(part);
      continue;
    }
    let cursor = 0;
    while (cursor < part.length) {
      chunks.push(part.slice(cursor, cursor + maxLen).trim());
      cursor += maxLen;
    }
  }
  return chunks.filter(Boolean);
}

function resolveVoiceToolPaths() {
  const whisperCmd = String(process.env.ASOLARIA_WHISPER_CMD || "").trim();
  const piperCmd = String(process.env.ASOLARIA_PIPER_CMD || "").trim();
  return {
    whisperCmd,
    piperCmd
  };
}

function runCommand(exe, args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, Math.max(3000, timeoutMs));

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(`Command exited ${code}: ${(stderr || stdout).trim()}`));
      }
      return resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

function detectVoiceTools() {
  const tools = resolveVoiceToolPaths();
  return {
    tools,
    available: {
      whisper: Boolean(tools.whisperCmd),
      piper: Boolean(tools.piperCmd)
    },
    recommendations: {
      stt: tools.whisperCmd ? "local-whisper" : "configure ASOLARIA_WHISPER_CMD",
      tts: tools.piperCmd ? "local-piper" : "configure ASOLARIA_PIPER_CMD"
    }
  };
}

async function transcribeAudioFile(inputPath, options = {}) {
  const fullInput = path.resolve(String(inputPath || "").trim());
  if (!fs.existsSync(fullInput)) {
    throw new Error(`Audio file not found: ${fullInput}`);
  }
  const tools = resolveVoiceToolPaths();
  if (!tools.whisperCmd) {
    throw new Error("Whisper command is not configured. Set ASOLARIA_WHISPER_CMD.");
  }

  const language = String(options.language || "en").trim();
  const model = String(options.model || "").trim();
  const args = [fullInput, "--language", language];
  if (model) {
    args.push("--model", model);
  }
  const result = await runCommand(tools.whisperCmd, args, Number(options.timeoutMs || 180000));
  return {
    text: result.stdout || result.stderr || "",
    raw: result
  };
}

async function synthesizeSpeechToFile(text, outputPath, options = {}) {
  const content = safeText(text, 20000);
  if (!content) {
    throw new Error("Text is required for synthesis.");
  }
  const outPath = path.resolve(String(outputPath || "").trim());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const tools = resolveVoiceToolPaths();
  if (!tools.piperCmd) {
    fs.writeFileSync(outPath.replace(/\.\w+$/, ".txt"), content, "utf8");
    return {
      outputPath: outPath.replace(/\.\w+$/, ".txt"),
      mode: "fallback-text"
    };
  }

  const voice = String(options.voice || "").trim();
  const args = [];
  if (voice) {
    args.push("--model", voice);
  }
  args.push("--output_file", outPath);

  await new Promise((resolve, reject) => {
    const child = spawn(tools.piperCmd, args, {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Piper synthesis timed out."));
    }, Math.max(5000, Number(options.timeoutMs || 120000)));
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(`Piper exited ${code}: ${stderr.trim()}`));
      }
      return resolve();
    });
    child.stdin.write(content);
    child.stdin.end();
  });

  return {
    outputPath: outPath,
    mode: "audio"
  };
}

function buildVoicePlan() {
  return {
    priority: ["usb", "vpn", "private_internet"],
    freeStack: {
      stt: "whisper.cpp (local)",
      tts: "piper (local)",
      conversation: "Asolaria local/codex/external fallback",
      transport: "mobile approvals + private token + VPN/USB"
    },
    cloudFallback: {
      stt: "cloud transcribe only if local unavailable",
      tts: "cloud tts only for emergency fallback"
    }
  };
}

module.exports = {
  splitSentences,
  detectVoiceTools,
  transcribeAudioFile,
  synthesizeSpeechToFile,
  buildVoicePlan
};
