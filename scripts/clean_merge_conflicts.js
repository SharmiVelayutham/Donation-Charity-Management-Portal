const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'frontend');
const IGNORES = new Set(['node_modules']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (IGNORES.has(ent.name)) continue;
    if (ent.isDirectory()) walk(full);
    else {
      if (ent.name === 'package-lock.json') continue;
      try { cleanFile(full); } catch (e) { console.error('ERR', full, e.message); }
    }
  }
}

function cleanFile(file) {
  const data = fs.readFileSync(file, 'utf8');
  if (!(/[<]{7}|[=]{7}|[>]{7}/.test(data))) return;
  const lines = data.split(/\r?\n/);
  const out = [];
  let changed = false;
  for (const line of lines) {
    if (line.startsWith('<<<<<<<') || line.startsWith('=======') || line.startsWith('>>>>>>>')) {
      changed = true;
      continue;
    }
    out.push(line);
  }
  if (changed) {
    fs.writeFileSync(file, out.join('\n'), 'utf8');
    console.log('Cleaned', path.relative(process.cwd(), file));
  }
}

console.log('Scanning', ROOT);
walk(ROOT);
console.log('Done');
