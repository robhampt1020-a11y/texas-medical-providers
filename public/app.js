const providers = Array.isArray(window.TMP_PROVIDERS) ? window.TMP_PROVIDERS : [];
const filters = window.TMP_FILTERS || { cities: [], specialties: [], services: [] };

const els = {
  header: document.querySelector('.site-header'),
  providerCount: document.getElementById('providerCount'),
  cityCount: document.getElementById('cityCount'),
  specialtyCount: document.getElementById('specialtyCount'),
  searchInput: document.getElementById('searchInput'),
  cityFilter: document.getElementById('cityFilter'),
  specialtyFilter: document.getElementById('specialtyFilter'),
  serviceFilter: document.getElementById('serviceFilter'),
  clearFilters: document.getElementById('clearFilters'),
  providerGrid: document.getElementById('providerGrid'),
  emptyState: document.getElementById('emptyState'),
  resultSummary: document.getElementById('resultSummary'),
  modal: document.getElementById('requestModal'),
  requestForm: document.getElementById('requestForm'),
  selectedProviderText: document.getElementById('selectedProviderText'),
  providerSlug: document.getElementById('providerSlug'),
  providerName: document.getElementById('providerName'),
  specialtyNeeded: document.getElementById('specialtyNeeded'),
  closeModal: document.getElementById('closeModal'),
  cancelRequest: document.getElementById('cancelRequest'),
  formStatus: document.getElementById('formStatus')
};

function createOption(value, label = value) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function populateFilter(select, values) {
  values.forEach((value) => select.appendChild(createOption(value)));
}

function plural(count, singular, pluralValue = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

let selectedSlug = new URLSearchParams(location.search).get('provider') || '';
let spotlightSlug = '';
// Shared four-calendar-day schedule, anchored October 29, 2026 (Central Time).
function nextSpotlight(now = new Date()) {
 if (!providers.length) return null;
 const parts = new Intl.DateTimeFormat('en-US', {
   timeZone: 'America/Chicago', year: 'numeric', month: 'numeric', day: 'numeric'
 }).formatToParts(now);
 const value = type => Number(parts.find(part => part.type === type).value);
 const calendarDay = Date.UTC(value('year'), value('month') - 1, value('day'));
 const anchorDay = Date.UTC(2026, 9, 29);
 const period = Math.floor((calendarDay - anchorDay) / (4 * 86400000));
 return providers[((period % providers.length) + providers.length) % providers.length];
}
function buildProviderCard(provider) {
 const button = document.createElement('button');
 button.type = 'button'; button.className = 'provider-list-item';
 button.dataset.selectProvider = provider.slug;
 button.setAttribute('aria-pressed',String(provider.slug === selectedSlug));
 button.innerHTML = '<span class="list-specialty">'+escapeHtml(provider.primarySpecialty)+'</span><strong>'+escapeHtml(provider.name)+'</strong><span class="list-cities">'+escapeHtml(provider.cities.join(' · '))+'</span><span class="list-view">View profile <span aria-hidden="true">→</span></span>';
 return button;
}
function renderDetail(provider) {
 const panel = document.getElementById('providerDetail');
 if (!provider) { panel.innerHTML = '<div class="detail-placeholder"><p class="eyebrow">Explore the network</p><h2 id="detailTitle">Select a provider.</h2><p>Choose a matching provider to view services and request options.</p></div>'; return; }
 const profile = (window.TMP_PROFILES || {})[provider.slug] || {};
 const services = [...new Set(provider.services.map(s => /non[- ]?invasive/i.test(s) ? 'Non-invasive' : s.toLowerCase() === 'pain management' ? 'Pain Management' : s.toLowerCase() === 'md consults' ? 'MD Consults' : s))];
 const specialties = profile.otherSpecialties || [];
 panel.innerHTML = '<button class="detail-back text-link" type="button">← Back to provider list</button><div class="provider-photo">'+(profile.image ? '<img src="'+escapeHtml(profile.image)+'" alt="'+escapeHtml(profile.imageAlt || provider.name)+'" />' : '<img class="placeholder-logo" src="assets/brand/logo-mark.png" alt="" /><span>Provider photo coming soon</span>')+'</div><div class="detail-content">'+(provider.slug === spotlightSlug ? '<p class="spotlight-label">Provider spotlight</p>' : '')+'<p class="eyebrow">'+escapeHtml(provider.primarySpecialty)+'</p><h2 id="detailTitle" tabindex="-1">'+escapeHtml(provider.name)+'</h2><p class="detail-description">'+escapeHtml(profile.description || provider.description)+'</p><div class="detail-actions"><button class="button primary" type="button" data-provider-slug="'+escapeHtml(provider.slug)+'">Request Provider</button>'+(provider.website ? '<a class="button secondary" target="_blank" rel="noopener" href="'+escapeHtml(provider.website)+'">Visit website ↗</a>':'')+'</div><div class="detail-section"><h3>Specialties</h3><div class="tag-row">'+[provider.primarySpecialty,...specialties].map(s => '<span class="tag">'+escapeHtml(s)+'</span>').join('')+'</div></div><div class="detail-section"><h3>Services &amp; capabilities</h3><ul class="service-list">'+services.map(s => '<li>'+escapeHtml(s)+'</li>').join('')+'</ul></div><div class="detail-section"><h3>Locations &amp; coverage</h3><div class="tag-row">'+provider.cities.map(s => '<span class="tag">'+escapeHtml(s)+'</span>').join('')+'</div></div>'+(provider.publicPhone ? '<div class="detail-section"><h3>Contact</h3><a class="text-link" href="tel:'+escapeHtml(provider.phoneHref)+'">'+escapeHtml(provider.publicPhone)+'</a></div>':'')+'<p class="detail-disclaimer">TMP is an independent directory and routing service. Confirm current services and availability directly with the provider.</p></div>';
 panel.querySelector('.detail-back').addEventListener('click', () => { document.querySelector('.directory-layout').classList.remove('mobile-detail-open'); document.querySelector('[data-select-provider="'+provider.slug+'"]').focus(); });
}
function selectProvider(provider, focus = false, spotlight = false) {
 spotlightSlug = spotlight ? provider.slug : '';
 selectedSlug = provider.slug;
 if (!spotlight) { const url = new URL(location.href); url.searchParams.set('provider',selectedSlug); history.replaceState(null,'',url); }
 document.querySelectorAll('[data-select-provider]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.selectProvider === selectedSlug)));
 renderDetail(provider);
 document.querySelector('.directory-layout').classList.add('mobile-detail-open');
 if (focus) document.getElementById('detailTitle').focus({preventScroll:true});
}

function providerMatches(provider) {
  const search = els.searchInput.value.trim().toLowerCase();
  const city = els.cityFilter.value;
  const specialty = els.specialtyFilter.value;
  const service = els.serviceFilter.value;
  const haystack = [provider.name, provider.primarySpecialty, provider.description, ...provider.cities, ...provider.services].join(' ').toLowerCase();

  return (!search || haystack.includes(search)) &&
    (!city || provider.cities.includes(city)) &&
    (!specialty || provider.primarySpecialty === specialty) &&
    (!service || provider.services.includes(service));
}

function renderProviders() {
  const matches = providers.filter(providerMatches);
  els.providerGrid.innerHTML = '';
  matches.forEach((provider) => els.providerGrid.appendChild(buildProviderCard(provider)));
  els.emptyState.hidden = matches.length !== 0;
  if (!matches.some(p => p.slug === selectedSlug)) { selectedSlug = ''; renderDetail(null); document.querySelector('.directory-layout').classList.remove('mobile-detail-open'); const url = new URL(location.href); url.searchParams.delete('provider'); history.replaceState(null,'',url); }
  els.resultSummary.textContent = `${plural(matches.length, 'provider')} shown`;
}

function openRequest(provider = null) {
  els.requestForm.reset();
  document.getElementById('requestModalTitle').textContent = provider ? 'Request Provider' : 'Let us help you find a provider';
  els.requestForm.querySelector('button[type="submit"]').textContent = provider ? 'Send Provider Request' : 'Send my provider search request';
  els.formStatus.textContent = '';
  els.formStatus.dataset.state = '';

  if (provider) {
    els.providerSlug.value = provider.slug;
    els.providerName.value = provider.name;
    els.specialtyNeeded.value = provider.primarySpecialty;
    els.selectedProviderText.textContent = `${provider.name} · ${provider.primarySpecialty}`;
  } else {
    els.providerSlug.value = '';
    els.providerName.value = 'General Provider Request';
    els.specialtyNeeded.value = '';
    els.selectedProviderText.textContent = 'Tell us the city, specialty, and case need. TMP will help identify provider options and route your request.';
  }

  if (typeof els.modal.showModal === 'function') {
    els.modal.showModal();
  } else {
    els.modal.setAttribute('open', '');
  }
}

function closeRequest() {
  els.modal.close();
}

function setStatus(message, state = '') {
  els.formStatus.textContent = message;
  els.formStatus.dataset.state = state;
}

async function submitRequest(event) {
  event.preventDefault();
  const submitButton = els.requestForm.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(els.requestForm).entries());
  data.acknowledgement = Boolean(els.requestForm.querySelector('input[name="acknowledgement"]').checked);

  submitButton.disabled = true;
  setStatus('Sending provider request...');

  try {
    const response = await fetch('/.netlify/functions/request-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'The provider request could not be sent.');
    }

    setStatus('Provider request sent. TMP received a copy for tracking.', 'success');
    setTimeout(closeRequest, 1400);
  } catch (error) {
    setStatus(error.message || 'The provider request could not be sent.', 'error');
  } finally {
    submitButton.disabled = false;
  }
}

function init() {
  els.providerCount.textContent = providers.length;
  els.cityCount.textContent = filters.cities.length;
  els.specialtyCount.textContent = filters.specialties.length;
  populateFilter(els.cityFilter, filters.cities);
  populateFilter(els.specialtyFilter, filters.specialties);
  populateFilter(els.serviceFilter, filters.services);
  if (!providers.some(provider => provider.slug === selectedSlug)) {
    const spotlight = nextSpotlight();
    if (spotlight) selectedSlug = spotlightSlug = spotlight.slug;
  }
  renderProviders();
  const initialProvider = providers.find(p => p.slug === selectedSlug);
  if (initialProvider) selectProvider(initialProvider, false, Boolean(spotlightSlug));

  [els.searchInput, els.cityFilter, els.specialtyFilter, els.serviceFilter].forEach((control) => {
    control.addEventListener('input', renderProviders);
    control.addEventListener('change', renderProviders);
  });

  els.clearFilters.addEventListener('click', () => {
    els.searchInput.value = '';
    els.cityFilter.value = '';
    els.specialtyFilter.value = '';
    els.serviceFilter.value = '';
    renderProviders();
  });

  document.addEventListener('click', (event) => {
    const selection = event.target.closest('[data-select-provider]');
    if (selection) selectProvider(providers.find(p => p.slug === selection.dataset.selectProvider), true);
    const requestButton = event.target.closest('[data-provider-slug]');
    if (requestButton) {
      const provider = providers.find((item) => item.slug === requestButton.dataset.providerSlug);
      openRequest(provider);
    }

    if (event.target.closest('[data-open-request]')) {
      openRequest(null);
    }
  });

  els.closeModal.addEventListener('click', closeRequest);
  els.cancelRequest.addEventListener('click', closeRequest);
  els.requestForm.addEventListener('submit', submitRequest);
}

init();
