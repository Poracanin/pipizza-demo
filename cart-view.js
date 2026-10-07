(function () {
  'use strict';

  // Presentation only: product prices and all cart actions still come from PiPizza.
  const dialog = document.querySelector('#cart-dialog');
  const items = document.querySelector('#cart-items');
  const drinks = document.querySelector('#cart-drinks');
  const upsell = dialog?.querySelector('.cart-upsell');
  if (!dialog || !items || !drinks || !upsell) return;

  const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const money = value => new Intl.NumberFormat('cs-CZ', {style: 'currency', currency: 'CZK', maximumFractionDigits: 0}).format(value);
  drinks.innerHTML = (window.PIPIZZA_MENU || []).filter(product => product.type === 'drinks').map(product => {
    const volume = product.description.split('·').pop().trim();
    return `<button type="button" class="cart-upsell-card" data-add="${escape(product.id)}" aria-label="Přidat ${escape(product.name)}, ${escape(volume)}, ${money(product.price)} do objednávky"><span class="cart-upsell-photo">${product.image ? `<img src="${escape(product.image)}" alt="" width="52" height="80">` : icon('drink')}</span><span class="cart-upsell-name">${escape(product.name)}<small>${escape(volume)}</small></span><strong>${money(product.price)}<span class="cart-upsell-add">${icon('plus')}</span></strong></button>`;
  }).join('');

  function syncPresentation() {
    const count = document.querySelector('.cart-count')?.textContent || '0';
    const headingCount = dialog.querySelector('.cart-heading-count');
    if (headingCount) headingCount.textContent = count;
    upsell.hidden = !items.querySelector('.cart-row') || !drinks.children.length;
  }

  new MutationObserver(syncPresentation).observe(items, {childList: true});
  syncPresentation();

  dialog.addEventListener('click', event => {
    const control = event.target.closest('[data-drinks-scroll]');
    if (!control) return;
    drinks.scrollBy({left: Number(control.dataset.drinksScroll) * 209, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  });
})();
