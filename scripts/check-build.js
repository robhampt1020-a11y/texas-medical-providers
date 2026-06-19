const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const publicDataPath = path.join(root, 'public', 'data', 'providers.public.js');
const indexPath = path.join(root, 'public', 'index.html');
const appPath = path.join(root, 'public', 'app.js');
const functionPath = path.join(root, 'netlify', 'functions', 'request-provider.js');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.netlify') return [];
    if (entry.isDirectory()) return listFiles(full);
    return [full];
  });
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read(publicDataPath), sandbox);

const providers = sandbox.window.TMP_PROVIDERS;
const filters = sandbox.window.TMP_FILTERS;

if (!Array.isArray(providers) || providers.length !== 8) {
  throw new Error(`Expected 8 public providers, found ${providers?.length || 0}.`);
}

if (!filters || !Array.isArray(filters.cities) || !Array.isArray(filters.specialties)) {
  throw new Error('Public filters are missing or invalid.');
}

const publicText = [indexPath, appPath, publicDataPath].map(read).join('\n');
if (/Request\s+Referral/i.test(publicText)) {
  throw new Error('Old CTA wording found. Use Request Provider.');
}

if (/referralEmail/i.test(publicText)) {
  throw new Error('Private routing field name appears in public files.');
}

const allProjectText = listFiles(root)
  .filter((file) => /\.(js|json|html|css|md|txt|toml|csv|example|gitignore)$/i.test(file))
  .map((file) => `${file}\n${read(file)}`)
  .join('\n');

const emailMatches = allProjectText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
const disallowedEmails = emailMatches.filter((email) => !email.toLowerCase().endsWith('@texasmedicalproviders.com'));
if (disallowedEmails.length) {
  throw new Error(`Do not commit provider/private emails to GitHub. Found: ${[...new Set(disallowedEmails)].join(', ')}`);
}

const oldPrivateRoutingPath = path.join(root, 'netlify', 'functions', 'providerRouting.private.js');
if (fs.existsSync(oldPrivateRoutingPath)) {
  throw new Error('Old Netlify function helper file still exists: netlify/functions/providerRouting.private.js. Delete it before deploying.');
}

const functionFiles = fs.readdirSync(path.join(root, 'netlify', 'functions'));
const invalidFunctionNames = functionFiles.filter((name) => !/^[A-Za-z0-9_-]+\.js$/.test(name));
if (invalidFunctionNames.length) {
  throw new Error(`Invalid Netlify function file names: ${invalidFunctionNames.join(', ')}`);
}

if (!read(functionPath).includes('PROVIDER_ROUTING_JSON_BASE64')) {
  throw new Error('Request function must load private routing from Netlify environment variables.');
}

console.log(`Build check passed: ${providers.length} providers, ${filters.cities.length} cities, ${filters.specialties.length} specialties.`);
