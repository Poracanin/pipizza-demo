/* Only Google Maps is optional here. Analytics/Ads/Meta are not installed. */
(() => {
  'use strict';
  const key = 'pipizza-map-consent-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const frames = [...document.querySelectorAll('iframe[data-consent-src]')];
  let persistent = true;
  let expiryTimer;
  function parse(raw) {
    try {
      const value = JSON.parse(raw);
      if (value?.version === 1 && typeof value.maps === 'boolean' && Number.isFinite(value.updatedAt)
        && value.updatedAt <= Date.now() && Date.now() - value.updatedAt < lifetime) return value;
    } catch (_) { /* Invalid or outdated consent never activates external content. */ }
    return null;
  }
  function read() {
    try {
      const raw = localStorage.getItem(key);
      const value = parse(raw);
      if (raw !== null && !value) localStorage.removeItem(key);
      return value;
    } catch (_) { return null; }
  }
  let choice = read();
  function render() {
    clearTimeout(expiryTimer);
    if (choice && Date.now() - choice.updatedAt >= lifetime) {
      choice = null;
      try { localStorage.removeItem(key); } catch (_) { /* It remains invalid on the next visit. */ }
    }
    const allowed = choice?.maps === true;
    frames.forEach(frame => {
      if (allowed && !frame.hasAttribute('src')) frame.setAttribute('src', frame.dataset.consentSrc);
      if (!allowed && frame.hasAttribute('src')) frame.removeAttribute('src');
      frame.hidden = !allowed;
    });
    document.querySelectorAll('[data-map-placeholder]').forEach(element => { element.hidden = allowed; });
    document.querySelectorAll('[data-map-status]').forEach(element => {
      element.textContent = (allowed ? 'Google mapa je povolená. Souhlas můžete kdykoli odvolat.' : 'Google mapa je vypnutá. Bez povolení se nenačte.')
        + (persistent ? '' : ' Volbu se nepodařilo uložit; platí pouze v této otevřené stránce.');
    });
    document.querySelectorAll('[data-map-consent]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mapConsent === 'allow' ? allowed : !allowed));
    });
    if (choice) expiryTimer = setTimeout(render, Math.min(lifetime - (Date.now() - choice.updatedAt) + 1, 2147483647));
  }
  document.querySelectorAll('[data-map-consent]').forEach(button => button.addEventListener('click', () => {
    choice = {version:1, maps:button.dataset.mapConsent === 'allow', updatedAt:Date.now()};
    try { localStorage.setItem(key, JSON.stringify(choice)); persistent = true; }
    catch (_) { persistent = false; }
    render();
  }));
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { choice = read(); persistent = true; render(); }
  });
  window.addEventListener('pageshow', () => { if (persistent) choice = read(); render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  render();
})();
