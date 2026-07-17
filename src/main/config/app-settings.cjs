const fs = require('fs');
const path = require('path');

function createAppSettings({ app, env = process.env, executablePath = process.execPath, validatePath } = {}) {
  if (!app) throw new Error('App Electron obrigatório para configurações.');

  const settingsPath = () => path.join(app.getPath('userData'), 'configuracoes.json');
  const defaultOutputFolder = () => {
    const baseFolder = app.isPackaged
      ? (env.PORTABLE_EXECUTABLE_DIR || path.dirname(executablePath))
      : app.getPath('userData');
    return path.join(baseFolder, 'Relatorios');
  };

  function get() {
    try {
      const filePath = settingsPath();
      const saved = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : {};
      const outputFolder = saved.defaultOutputFolder || defaultOutputFolder();
      fs.mkdirSync(outputFolder, { recursive: true });
      return { defaultOutputFolder: outputFolder };
    } catch (_) {
      return { defaultOutputFolder: '' };
    }
  }

  function save(settings = {}) {
    const outputFolder = validatePath
      ? validatePath(settings.defaultOutputFolder, { label: 'a pasta padrão' })
      : path.normalize(settings.defaultOutputFolder);
    const filePath = settingsPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ defaultOutputFolder: outputFolder }, null, 2), 'utf8');
    return { defaultOutputFolder: outputFolder };
  }

  return { get, save, settingsPath, defaultOutputFolder };
}

module.exports = { createAppSettings };
