const fs = require('fs');

function firstExisting(paths) {
  for (const item of paths) {
    if (item && fs.existsSync(item)) {
      return item;
    }
  }
  return null;
}

function resolveToolPaths() {
  const localAppData = process.env.LOCALAPPDATA || '';

  return {
    chromePath: firstExisting([
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ]),
    padConsolePath: firstExisting([
      'C:\\Program Files (x86)\\Power Automate Desktop\\dotnet\\PAD.Console.Host.exe',
      'C:\\Program Files (x86)\\Power Automate Desktop\\PAD.Console.Host.exe'
    ]),
    padRobotPath: firstExisting([
      'C:\\Program Files (x86)\\Power Automate Desktop\\PAD.RobotV2.exe'
    ]),
    codexPath: firstExisting([
      'C:\\nvm4w\\nodejs\\codex.cmd',
      'C:\\nvm4w\\nodejs\\codex'
    ]),
    openclawPath: firstExisting([
      'C:\\nvm4w\\nodejs\\openclaw.cmd',
      'C:\\nvm4w\\nodejs\\openclaw'
    ]),
    wslPath: firstExisting([
      'C:\\Windows\\System32\\wsl.exe'
    ]),
    localAppData
  };
}

module.exports = {
  resolveToolPaths
};
