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

function buildProviderCard(provider) {
  const article = document.createElement('article');
  article.className = 'provider-card';
  const cities = provider.cities.join(', ');
  const services = provider.services.length ? provider.services : ['Provider option'];
  const tags = services.slice(0, 8).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const website = provider.website ? `<a class="button secondary" href="${escapeHtml(provider.website)}" target="_blank" rel="noopener">Website</a>` : '';
  const phone = provider.publicPhone ? `<a class="button secondary" href="tel:${escapeHtml(provider.phoneHref || '')}">Call</a>` : '';

  article.innerHTML = `
    <header>
      <div class="specialty">${escapeHtml(provider.primarySpecialty)}</div>
      <h3>${escapeHtml(provider.name)}</h3>
    </header>
    <p>${escapeHtml(provider.description)}</p>
    <div class="tag-row" aria-label="Services">${tags}</div>
    <div class="card-meta">
      <span><strong>Cities:</strong> ${escapeHtml(cities)}</span>
      ${provider.publicPhone ? `<span><strong>Phone:</strong> ${escapeHtml(provider.publicPhone)}</span>` : ''}
    </div>
    <div class="card-links">
      <button class="button primary" type="button" data-provider-slug="${escapeHtml(provider.slug)}">Request Provider</button>
      ${website}
      ${phone}
    </div>
  `;
  return article;
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
  els.resultSummary.textContent = `${plural(matches.length, 'provider')} shown`;
}

function openRequest(provider = null) {
  els.requestForm.reset();
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
    els.selectedProviderText.textContent = 'General provider request';
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
  renderProviders();

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
