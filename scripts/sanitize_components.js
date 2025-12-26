const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'frontend', 'src');
const IGNORES = new Set(['node_modules']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (IGNORES.has(ent.name)) continue;
    if (ent.isDirectory()) walk(full);
    else {
      if (full.endsWith('.ts')) sanitizeTs(full);
      if (full.endsWith('.css')) balanceCss(full);
    }
  }
}

function sanitizeTs(file) {
  let data = fs.readFileSync(file, 'utf8');
  data = mergeImports(data, file);
  const clsMatches = [...data.matchAll(/export\s+class\s+/g)];
  if (clsMatches.length === 0) return;
  console.log('Sanitizing (trim to first class) ->', path.relative(process.cwd(), file));
  // Find first 'export class' index
  const firstIndex = clsMatches[0].index;
  // find the opening brace '{' after the class declaration
  const braceStart = data.indexOf('{', firstIndex);
  if (braceStart === -1) {
    // can't find class body, skip
    return;
  }
  // scan to find matching closing brace
  let depth = 0;
  let i = braceStart;
  for (; i < data.length; i++) {
    const ch = data[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        // include this closing brace and stop
        i++;
        break;
      }
    }
  }
  const newData = data.slice(0, i);
  fs.writeFileSync(file, newData, 'utf8');
}

function mergeImports(data, file) {
  const lines = data.split(/\r?\n/);
  const imports = [];
  const rest = [];
  for (const line of lines) {
    if (/^\s*import\s/.test(line)) imports.push(line);
    else rest.push(line);
  }
  if (imports.length === 0) return data;

  const byModule = new Map();
  const sideEffects = [];
  for (const imp of imports) {
    const side = imp.match(/^\s*import\s+['"]([^'"]+)['"];?\s*$/);
    if (side) { sideEffects.push(side[1]); continue; }
    const named = imp.match(/^\s*import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]\s*;?\s*$/);
    if (named) {
      const names = named[1].split(',').map(s => s.trim()).filter(Boolean);
      const mod = named[2];
      const entry = byModule.get(mod) || { default: null, namespace: null, named: new Set() };
      names.forEach(n => entry.named.add(n));
      byModule.set(mod, entry);
      continue;
    }
    const ns = imp.match(/^\s*import\s+\*\s+as\s+([^\s]+)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/);
    if (ns) {
      const name = ns[1], mod = ns[2];
      const entry = byModule.get(mod) || { default: null, namespace: null, named: new Set() };
      entry.namespace = entry.namespace || name;
      byModule.set(mod, entry);
      continue;
    }
    const def = imp.match(/^\s*import\s+([^\s,{]+)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/);
    if (def) {
      const name = def[1], mod = def[2];
      const entry = byModule.get(mod) || { default: null, namespace: null, named: new Set() };
      entry.default = entry.default || name;
      byModule.set(mod, entry);
      continue;
    }
    // if we couldn't parse, keep as-is
    rest.unshift(imp);
  }

  const merged = [];
  for (const [mod, entry] of byModule.entries()) {
    let parts = [];
    if (entry.default) parts.push(entry.default);
    if (entry.namespace) parts.push(`* as ${entry.namespace}`);
    if (entry.named.size) parts.push(`{ ${[...entry.named].sort().join(', ')} }`);
    if (parts.length === 0) continue;
    merged.push(`import ${parts.join(', ')} from '${mod}';`);
  }
  for (const se of sideEffects) merged.push(`import '${se}';`);

  const out = merged.join('\n') + '\n\n' + rest.join('\n');
  try { fs.writeFileSync(file, out, 'utf8'); } catch (e) {}
  return out;
}

function balanceCss(file) {
  let data = fs.readFileSync(file, 'utf8');
  const open = (data.match(/\{/g) || []).length;
  const close = (data.match(/\}/g) || []).length;
  if (open === close) return;
  console.log('Balancing CSS ->', path.relative(process.cwd(), file), 'opens', open, 'closes', close);
  // Attempt: trim file to last position where braces balanced
  let depth = 0;
  let lastBalancedPos = -1;
  for (let i = 0; i < data.length; i++) {
    const ch = data[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) lastBalancedPos = i + 1;
    }
  }
  if (lastBalancedPos > 0) {
    const newData = data.slice(0, lastBalancedPos) + '\n';
    fs.writeFileSync(file, newData, 'utf8');
  }
}

console.log('Scanning', ROOT);
walk(ROOT);
console.log('Done');
