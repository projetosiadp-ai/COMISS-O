const fs = require('fs');
const path = require('path');

function sanitizeConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Configuração de corretoras inválida.');
  }
  const entries = Object.entries(config);
  if (entries.length > 100) throw new Error('A configuração excede o limite permitido.');
  return Object.fromEntries(entries.map(([name, aliases]) => {
    const safeName = String(name || '').trim().slice(0, 160);
    if (!safeName || !Array.isArray(aliases)) throw new Error('Mapeamento de corretora inválido.');
    return [safeName, aliases.map(alias => String(alias || '').trim().slice(0, 200)).filter(Boolean).slice(0, 100)];
  }));
}

function createCorretorasRepository({ app, env = process.env, bundledConfigPath } = {}) {
  if (!app || !bundledConfigPath) throw new Error('Dependências obrigatórias da configuração de corretoras ausentes.');
  const operationalRoot = app.isPackaged
    ? (env.PORTABLE_EXECUTABLE_DIR || app.getPath('userData'))
    : app.getPath('userData');
  const writablePath = path.join(operationalRoot, 'DadosCompartilhados', 'corretoras.json');
  let current;

  function load() {
    try {
      if (!fs.existsSync(writablePath)) {
        fs.mkdirSync(path.dirname(writablePath), { recursive: true });
        fs.copyFileSync(bundledConfigPath, writablePath);
      }
      current = sanitizeConfig(JSON.parse(fs.readFileSync(writablePath, 'utf8')));
    } catch (_) {
      current = sanitizeConfig(JSON.parse(fs.readFileSync(bundledConfigPath, 'utf8')));
    }
    return current;
  }

  function getAll() {
    return current || load();
  }

  function save(config) {
    const sanitized = sanitizeConfig(config);
    fs.mkdirSync(path.dirname(writablePath), { recursive: true });
    fs.writeFileSync(writablePath, JSON.stringify(sanitized, null, 2), 'utf8');
    current = sanitized;
    return current;
  }

  return { getAll, load, save, writablePath };
}

module.exports = { createCorretorasRepository, sanitizeConfig };
