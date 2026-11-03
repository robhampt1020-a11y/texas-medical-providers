const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const allowed = new Set(['name', 'slug', 'primarySpecialty', 'services', 'cities', 'publicPhone', 'phoneHref', 'website', 'description', 'image', 'imageAlt', 'otherSpecialties']);

function validateProviders(providers, projectRoot = root) {
  if (!Array.isArray(providers) || !providers.length) throw new Error('Add at least one provider to source/providers.json.');
  const slugs = new Set();
  const names = new Set();
  for (const provider of providers) {
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) throw new Error('Each provider must be an object.');
    const label = provider.name || provider.slug || 'Unnamed provider';
    const fail = message => { throw new Error(`${label}: ${message}`); };
    for (const key of Object.keys(provider)) if (!allowed.has(key)) fail(`Unknown field "${key}". Keep private request routing in Netlify.`);
    for (const key of ['name', 'slug', 'primarySpecialty', 'description']) {
      if (typeof provider[key] !== 'string' || !provider[key].trim() || provider[key] !== provider[key].trim()) fail(`Fill in ${key}, without leading or trailing spaces.`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(provider.slug) || provider.slug.length > 160) fail('Use a slug with lowercase letters, numbers, and single hyphens.');
    if (slugs.has(provider.slug)) fail('Duplicate slug. Each provider needs a unique slug.');
    if (names.has(provider.name.toLowerCase())) fail('Duplicate provider name.');
    slugs.add(provider.slug); names.add(provider.name.toLowerCase());
    for (const key of ['cities', 'services', 'otherSpecialties']) {
      if (key === 'otherSpecialties' && provider[key] === undefined) continue;
      if (!Array.isArray(provider[key]) || (key !== 'otherSpecialties' && !provider[key].length)) fail(`${key} must be a list of nonempty text values.`);
      const seen = new Set();
      for (const value of provider[key]) {
        if (typeof value !== 'string' || !value.trim() || value !== value.trim()) fail(`Invalid ${key} entry.`);
        if (seen.has(value.toLowerCase())) fail(`Duplicate ${key} entry: ${value}.`);
        seen.add(value.toLowerCase());
      }
    }
    for (const key of ['publicPhone', 'phoneHref', 'website', 'image', 'imageAlt']) if (provider[key] !== undefined && typeof provider[key] !== 'string') fail(`${key} must be text.`);
    if (Boolean(provider.publicPhone) !== Boolean(provider.phoneHref)) fail('Fill in both publicPhone and phoneHref, or leave both blank.');
    if (provider.phoneHref && !/^\+[1-9]\d{7,14}$/.test(provider.phoneHref)) fail('phoneHref must be an international phone number, such as +12105550100.');
    if (provider.website) {
      let url;
      try { url = new URL(provider.website); } catch { fail('Website must be a complete https:// URL.'); }
      if (url.protocol !== 'https:' || url.username || url.password) fail('Website must use HTTPS without embedded credentials.');
    }
    if (provider.image) {
      if (!/^assets\/providers\/[a-z0-9-]+\.(png|jpe?g|webp)$/i.test(provider.image)) fail('Banner must be an image in assets/providers/.');
      if (!fs.existsSync(path.join(projectRoot, 'public', provider.image))) fail(`Banner file is missing: ${provider.image}.`);
      if (!provider.imageAlt?.trim()) fail('Add imageAlt to describe the provider banner.');
    }
    const emails = JSON.stringify(provider).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    if (emails.some(email => !email.toLowerCase().endsWith('@texasmedicalproviders.com'))) fail('Do not put provider/private email addresses in public provider data.');
  }
  return providers;
}

function buildProviders(projectRoot = root) {
  const providers = validateProviders(JSON.parse(fs.readFileSync(path.join(projectRoot, 'source/providers.json'), 'utf8')), projectRoot);
  const publicProviders = providers.map(({ image, imageAlt, otherSpecialties, ...provider }) => provider);
  const unique = field => [...new Set(providers.flatMap(provider => provider[field]))].sort((a, b) => a.localeCompare(b, 'en'));
  const filters = { cities: unique('cities'), specialties: [...new Set(providers.map(provider => provider.primarySpecialty))].sort(), services: unique('services') };
  const profiles = Object.fromEntries(providers.map(provider => [provider.slug, {
    ...(provider.image ? { image: provider.image, imageAlt: provider.imageAlt } : {}),
    ...(provider.otherSpecialties ? { otherSpecialties: provider.otherSpecialties } : {})
  }]));
  const data = path.join(projectRoot, 'public/data');
  fs.writeFileSync(path.join(data, 'providers.public.js'), '// Generated from source/providers.json. Do not edit directly.\nwindow.TMP_PROVIDERS = ' + JSON.stringify(publicProviders, null, 2) + ';\nwindow.TMP_FILTERS = ' + JSON.stringify(filters, null, 2) + ';\n');
  fs.writeFileSync(path.join(data, 'provider-profiles.js'), '// Generated from source/providers.json. Do not edit directly.\nwindow.TMP_PROFILES = ' + JSON.stringify(profiles, null, 2) + ';\n');
  console.log(`Generated ${providers.length} providers, profiles, and search filters.`);
}

if (require.main === module) buildProviders();
module.exports = { validateProviders, buildProviders };
