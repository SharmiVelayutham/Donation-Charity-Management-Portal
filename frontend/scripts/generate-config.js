// Generates public/config.js from frontend/.env for runtime API configuration.
// Run automatically before build.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), 'frontend', '.env') });

const apiUrl = process.env.API_URL || 'http://localhost:4000/api';
const socketUrl = process.env.SOCKET_URL || apiUrl.replace(/\/api$/, '');

const outDir = path.join(process.cwd(), 'frontend', 'public');
const outFile = path.join(outDir, 'config.js');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const content = `window.__env = { apiUrl: '${apiUrl}', socketUrl: '${socketUrl}' };`;
fs.writeFileSync(outFile, content, 'utf8');
console.log(`Generated ${path.relative(process.cwd(), outFile)} with API_URL=${apiUrl}`);
