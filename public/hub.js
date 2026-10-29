const escapeText = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.getElementById('updatesGrid').innerHTML = window.TMP_UPDATES.map(post => '<article class="update-card"><div class="update-category">'+escapeText(post.category)+'</div>'+(post.date ? '<time datetime="'+escapeText(post.date)+'">'+escapeText(new Date(post.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}))+'</time>':'')+'<h3>'+escapeText(post.title)+'</h3><p>'+escapeText(post.body)+'</p><a class="text-link" href="directory.html'+(post.providerSlug ? '?provider='+encodeURIComponent(post.providerSlug):'')+'">'+(post.providerSlug ? 'View provider':'Search directory')+' →</a></article>').join('');


(() => {
  const providers = window.TMP_PROVIDERS.filter(provider => window.TMP_PROFILES[provider.slug]?.image);
  if (!providers.length) return;
  const carousel = document.getElementById('providerCarousel');
  const image = document.getElementById('bannerImage');
  const link = document.getElementById('bannerLink');
  const profileLink = document.getElementById('bannerProfile');
  const name = document.getElementById('bannerName');
  const dots = document.getElementById('bannerDots');
  const pause = document.getElementById('bannerPause');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let paused = reducedMotion.matches;
  const interval = 15000;
  let remaining = interval;
  let lastTick = performance.now();
  let cleanupAnimation;
  let hovered = false;
  let focused = false;
  const buttons = providers.map((provider, position) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Show ' + provider.name);
    button.addEventListener('click', () => { show(position, position < index ? -1 : 1); schedule(); });
    dots.appendChild(button);
    return button;
  });
  function show(position, direction = 1) {
    clearTimeout(cleanupAnimation);
    link.querySelector('.banner-outgoing')?.remove();
    image.classList.remove('banner-incoming', 'banner-incoming-reverse');
    const nextIndex = (position + providers.length) % providers.length;
    const animate = nextIndex !== index && !reducedMotion.matches;
    if (animate) {
      const outgoing = image.cloneNode();
      outgoing.removeAttribute('id');
      outgoing.alt = '';
      outgoing.setAttribute('aria-hidden', 'true');
      outgoing.className = 'banner-outgoing' + (direction < 0 ? ' banner-outgoing-reverse' : '');
      link.appendChild(outgoing);
    }
    index = (position + providers.length) % providers.length;
    const provider = providers[index];
    const artwork = window.TMP_PROFILES[provider.slug];
    image.src = artwork.image;
    image.alt = artwork.imageAlt || provider.name + ' branded banner';
    if (animate) {
      // Move both artworks together in the selected navigation direction.
      void image.offsetWidth;
      image.classList.add(direction < 0 ? 'banner-incoming-reverse' : 'banner-incoming');
      cleanupAnimation = setTimeout(() => {
        link.querySelector('.banner-outgoing')?.remove();
        image.classList.remove('banner-incoming', 'banner-incoming-reverse');
      }, 700);
    }
    remaining = interval;
    name.textContent = provider.name;
    document.getElementById('bannerSpecialty').textContent = provider.primarySpecialty;
    link.href = profileLink.href = 'directory.html?provider=' + encodeURIComponent(provider.slug);
    link.setAttribute('aria-label', 'View ' + provider.name + ' profile');
    buttons.forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
    // Load the next artwork ahead of the next change.
    const nextImage = new Image();
    nextImage.src = window.TMP_PROFILES[providers[(index + 1) % providers.length].slug].image;
  }
  pause.innerHTML = '<span class="banner-countdown" aria-hidden="true"><svg viewBox="0 0 36 36"><circle class="timer-track" cx="18" cy="18" r="15"/><circle class="timer-ring" cx="18" cy="18" r="15" pathLength="100"/></svg></span><span class="banner-pause-action" aria-hidden="true"></span>';
  const countdownText = pause.querySelector('.banner-countdown');
  const actionText = pause.querySelector('.banner-pause-action');
  function renderCountdown() {
    const seconds = Math.ceil(remaining / 1000) + 's';
    const action = paused ? 'Play' : 'Pause';
    countdownText.style.setProperty('--timer-remaining', String(100 * remaining / interval));
    if (actionText.textContent !== action) actionText.textContent = action;
    pause.classList.toggle('is-paused', paused);
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? 'Play automatic provider banners' : 'Pause automatic provider banners');
    pause.title = paused ? 'Resume provider banners' : 'Next provider in ' + Math.ceil(remaining / 1000) + ' seconds';
  }
  function schedule() {
    lastTick = performance.now();
    renderCountdown();
  }
  function updatePause() { schedule(); }
  pause.addEventListener('click', () => { paused = !paused; updatePause(); });
  document.getElementById('bannerPrevious').addEventListener('click', () => { show(index - 1, -1); schedule(); });
  document.getElementById('bannerNext').addEventListener('click', () => { show(index + 1); schedule(); });
  carousel.addEventListener('mouseenter', () => { hovered = true; schedule(); });
  carousel.addEventListener('mouseleave', () => { hovered = false; schedule(); });
  const section = carousel.closest('section');
  section.addEventListener('focusin', () => { focused = true; schedule(); });
  section.addEventListener('focusout', event => { focused = section.contains(event.relatedTarget); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', event => { paused = event.matches; updatePause(); });
  show(0);
  updatePause();
  setInterval(() => {
    const now = performance.now();
    if (!paused && !hovered && !focused && !document.hidden) {
      remaining = Math.max(0, remaining - (now - lastTick));
      if (remaining === 0) show(index + 1);
    }
    lastTick = now;
    renderCountdown();
  }, 100);

})();
