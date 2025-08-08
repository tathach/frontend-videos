const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '..', 'configs', 'settings.json');

function getSettings() {
  if (!fs.existsSync(settingsPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (err) {
    console.error('Failed to read settings:', err);
    return {};
  }
}

function saveSettings(data) {
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
}

module.exports = { getSettings, saveSettings };
