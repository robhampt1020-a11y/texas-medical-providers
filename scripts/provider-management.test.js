const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const { validateProviders, buildProviders } = require('./build-providers');
const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'source/providers.json'), 'utf8'));
test('new providers generate filters and profiles without hardcoded counts', () => {
  const added = { name:'New Provider', slug:'new-provider', primarySpecialty:'New specialty', description:'Confirmed services.', cities:['New city'], services:['New service'] };
  assert.doesNotThrow(() => validateProviders([...source, added]));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'tmp-provider-test-'));
  fs.mkdirSync(path.join(project,'source'));
  fs.mkdirSync(path.join(project,'public/data'),{recursive:true});
  const fixtures = source.map(({image,imageAlt,...provider}) => provider);
  fs.writeFileSync(path.join(project,'source/providers.json'),JSON.stringify([...fixtures,added]));
  buildProviders(project);
  const context = {window:{}};
  vm.createContext(context);
  for (const file of ['providers.public.js','provider-profiles.js']) vm.runInContext(fs.readFileSync(path.join(project,'public/data',file),'utf8'),context);
  assert.equal(context.window.TMP_PROVIDERS.length, source.length + 1);
  assert.equal(Object.keys(context.window.TMP_PROFILES).length, source.length + 1);
  assert.ok(context.window.TMP_FILTERS.cities.includes('New city'));
  assert.ok(context.window.TMP_FILTERS.services.includes('New service'));
  assert.ok(context.window.TMP_FILTERS.specialties.includes('New specialty'));
  for (const provider of source) for (const city of provider.cities) assert.ok(context.window.TMP_FILTERS.cities.includes(city));
});
for (const [label, change, error] of [
  ['duplicate slug', p => p.slug = source[1].slug, /Duplicate slug/],
  ['missing description', p => p.description = '', /description/],
  ['invalid website', p => p.website = 'javascript:alert(1)', /HTTPS/],
  ['missing banner', p => p.image = 'assets/providers/missing.png', /missing/],
  ['private field', p => p.referralEmail = 'private', /Unknown field/],
  ['duplicate services', p => p.services = ['Consult','consult'], /Duplicate services/],
  ['empty cities', p => p.cities = [], /cities/]
]) test(`rejects ${label}`, () => {
  const data = structuredClone(source);
  change(data[0]);
  assert.throws(() => validateProviders(data), error);
});
