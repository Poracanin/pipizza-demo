(() => {
  'use strict';
  const products = window.PIPIZZA_MENU || [];
  const {Cart, BASES, EXTRA_GROUPS, SWAP_INGREDIENTS, EXTRA_PRICE, defaultBase, ingredients, priceBreakdown} = window.PiPizzaCart;
  const cart = new Cart(products);
  const grid = document.querySelector('#product-grid');
  const heading = document.querySelector('#menu-heading');
  const cartDialog = document.querySelector('#cart-dialog');
  const productPage = document.querySelector('#product-page');
  const halfDialog = document.querySelector('#half-picker-dialog');
  const floatingCart = document.querySelector('#floating-cart');
  const backToTop = document.querySelector('#back-to-top');
  const infoDialog = document.querySelector('#info-dialog');
  let category = 'pizza';
  let toastTimer;
  let editor = null;
  const money = value => new Intl.NumberFormat('cs-CZ', {maximumFractionDigits: 0}).format(value) + ' Kč';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const find = id => products.find(product => product.id === id);
  const categoryTitles = {pizza:'Pizzy', vegetarian:'Bez masa', spicy:'Pikantní', drinks:'Nápoje', extras:'Něco navíc'};
  const matchesCategory = product => category === 'vegetarian' ? product.vegetarian : category === 'spicy' ? product.spicy : product.type === category;
  const plural = (count, variants) => variants[count === 1 ? 0 : count > 1 && count < 5 ? 1 : 2];

  function renderProducts() {
    const visible = products.filter(matchesCategory);
    heading.textContent = categoryTitles[category];
    const unit = plural(visible.length, category === 'drinks' ? ['nápoj','nápoje','nápojů'] : category === 'extras' ? ['položka','položky','položek'] : ['pizza','pizzy','pizz']);
    document.querySelector('#menu-result-count').textContent = `${visible.length} ${unit}`;
    document.querySelector('#empty-results').hidden = visible.length !== 0;
    grid.hidden = visible.length === 0;
    grid.innerHTML = visible.map((product, index) => {
      const art = product.image
        ? `<img src="${escape(product.image)}" alt="${escape(product.name)} — ilustrační fotografie" width="900" height="900" ${index < 3 ? 'fetchpriority="high"' : 'loading="lazy"'}>`
        : `<div class="simple-product-art">${icon(product.type === 'drinks' ? 'drink' : 'box')}</div>`;
      const badge = product.spicy ? `<span class="product-label">${icon('pepper')} Pikantní</span>` : product.vegetarian ? `<span class="product-label vegetarian-label">${icon('leaf')} Bez masa</span>` : '';
      const number = product.number ? `<span class="product-number">${String(product.number).padStart(2, '0')}</span>` : '';
      return `<article data-card-detail="${escape(product.id)}" class="product-card product-card-${escape(product.type)}${product.name.length > 12 ? ' product-card-long-name' : ''}" style="--title-length:${Math.max(8, product.name.length)}"><a href="?pizza=${encodeURIComponent(product.id)}" class="product-image-button" data-detail="${escape(product.id)}" aria-label="Prohlédnout ${escape(product.name)}">${art}${number}${badge}</a><div class="product-info"><h2><a href="?pizza=${encodeURIComponent(product.id)}" class="product-title" data-detail="${escape(product.id)}">${escape(product.name)}</a></h2><p class="product-description">${escape(product.description)}</p><div class="product-bottom"><span class="product-price">${money(product.price)}</span><div class="card-actions"><button class="add-button" data-add="${escape(product.id)}" aria-label="Přidat ${escape(product.name)} do objednávky">${icon('cart')}<span>Přidat do košíku</span></button>${product.type === 'pizza' ? `<button class="edit-button" data-detail="${escape(product.id)}" aria-label="Upravit ${escape(product.name)}"><span>Upravit podle sebe</span>${icon('arrow')}</button>` : ''}</div></div></div></article>`;
    }).join('');
  }

  function selectCategory(next) {
    category = next;
    document.querySelectorAll('[data-category]').forEach(button => {
      const active = button.dataset.category === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderProducts();
  }

  function notify(message) {
    const toast = document.querySelector('#toast');
    toast.querySelector('span').textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2700);
  }

  function animateToCart(source) {
    const target = document.querySelector('.site-header .cart-toggle');
    const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const pulse = () => {
      if (!reducedMotion) target.animate([{transform:'scale(1)'},{transform:'scale(1.13)',offset:.4},{transform:'scale(1)'}], {duration:320,easing:'ease-out'});
    };
    const card = source?.closest('.product-card');
    if (reducedMotion || !card || document.querySelector('dialog[open]')) {pulse(); return;}
    const from = card.getBoundingClientRect(), to = target.getBoundingClientRect();
    if (!from.width || !to.width) return;
    // A decorative copy travels into the cart; the real card keeps its place and focus.
    const flight = card.cloneNode(true);
    flight.classList.add('cart-flight');
    flight.removeAttribute('data-card-detail');
    flight.setAttribute('aria-hidden', 'true');
    flight.inert = true;
    flight.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    Object.assign(flight.style, {left:`${from.left}px`,top:`${from.top}px`,width:`${from.width}px`,height:`${from.height}px`});
    const previous = document.querySelectorAll('.cart-flight');
    if (previous.length >= 4) {previous[0].getAnimations().forEach(animation => animation.cancel()); previous[0].remove();}
    document.body.append(flight);
    const dx = to.left + to.width / 2 - from.left - from.width / 2;
    const dy = to.top + to.height / 2 - from.top - from.height / 2;
    const animation = flight.animate([
      {transform:'translate(0,0) scale(1)',opacity:.95,offset:0},
      {transform:`translate(${dx * .08}px,-24px) scale(.92,.96) rotate(-3deg)`,opacity:1,offset:.18},
      {transform:`translate(${dx * .55}px,${dy * .55}px) scale(.43,.5) rotate(7deg)`,opacity:.9,offset:.58},
      {transform:`translate(${dx}px,${dy}px) scale(.08,.05) rotate(-12deg)`,opacity:.65,borderRadius:'80px',offset:.9},
      {transform:`translate(${dx}px,${dy}px) scale(.015)`,opacity:0,borderRadius:'100px',offset:1}
    ], {duration:820,easing:'cubic-bezier(.3,.05,.55,1)',fill:'forwards'});
    animation.finished.then(pulse).catch(() => {}).finally(() => flight.remove());
    card.animate([{opacity:1},{opacity:.62,offset:.2},{opacity:1}], {duration:620,easing:'ease-out'});
  }

  function addToCart(id, source) {
    const product = find(id);
    if (!product) return;
    if (product.number === 26) {openDetail(id); return;}
    cart.add(id);
    renderCart();
    animateToCart(source);
    notify(`${product.name} je ve vaší objednávce.`);
  }

  function renderCart() {
    document.querySelectorAll('.cart-count').forEach(element => element.textContent = cart.count);
    document.querySelectorAll('.cart-toggle').forEach(button => button.setAttribute('aria-label', `Otevřít moji objednávku, počet položek: ${cart.count}`));
    floatingCart.hidden = cart.count === 0;
    document.body.classList.toggle('has-cart', cart.count > 0);
    floatingCart.querySelector('[data-floating-count]').textContent = cart.count;
    floatingCart.querySelector('[data-floating-total]').textContent = money(cart.total);
    floatingCart.querySelector('.floating-cart-label small').textContent = `${cart.count} ${plural(cart.count, ['položka', 'položky', 'položek'])} v objednávce`;
    floatingCart.setAttribute('aria-label', `Zobrazit košík, ${cart.count} položek, ${money(cart.total)}`);
    const container = document.querySelector('#cart-items');
    document.querySelector('#cart-summary').hidden = cart.count === 0;
    if (!cart.count) {
      container.innerHTML = `<div class="cart-empty">${icon('cart')}<h3>Zatím tu voní jen očekávání.</h3><p>Vyberte si pizzu podle své chuti.<br>My se postaráme o zbytek.</p><button class="button button-green" data-back-to-menu>Vybrat pizzu ${icon('arrow')}</button></div>`;
      return;
    }
    container.innerHTML = cart.items.map(line => {
      const product = find(line.productId);
      const art = product.image ? `<img src="${escape(product.image)}" alt="" width="65" height="65">` : `<span class="simple-product-art">${icon(product.type === 'drinks' ? 'drink' : 'box')}</span>`;
      const name = line.halfProductId ? `${product.name} / ${find(line.halfProductId).name}` : product.name;
      const baseText = product.type === 'pizza' ? `Základ: ${BASES[line.base]}${line.halfProductId ? ' / ' + BASES[line.halfBase] : ''}` : '';
      const changes = [baseText, ...window.PiPizzaCart.describeChanges(line, product, products), line.note ? `Poznámka: ${line.note}` : ''].filter(Boolean).map(text => `<span class="cart-modification">${escape(text)}</span>`).join('');
      return `<article class="cart-row">${art}<div class="cart-line-copy"><div class="cart-line-title"><h3>${escape(name)}</h3><button class="cart-remove" data-remove="${line.id}" aria-label="Odstranit ${escape(product.name)}">${icon('close')}</button></div><div class="cart-line-meta">${product.type === 'pizza' ? `<button class="cart-edit" data-edit-line="${line.id}" aria-label="Upravit ${escape(product.name)} v objednávce">Upravit</button>` : ''}</div>${changes}<div class="cart-line-purchase"><strong>${money(line.unitPrice * line.quantity)}</strong><div class="quantity-controls"><button data-quantity="${line.id}" data-change="-1" aria-label="Odebrat jeden kus ${escape(product.name)}">${icon('minus')}</button><span aria-label="Počet kusů">${line.quantity}</span><button data-quantity="${line.id}" data-change="1" aria-label="Přidat jeden kus ${escape(product.name)}">${icon('plus')}</button></div></div></div></article>`;
    }).join('');
    document.querySelector('#cart-total').textContent = money(cart.total);
  }

  function goHomeAnchor(hash) {
    history.pushState({}, '', location.pathname + hash);
    returnContext = null;
    showHome();
    requestAnimationFrame(() => {if (hash.length > 1) document.querySelector(hash)?.scrollIntoView({behavior:'instant'}); else window.scrollTo({top:0,behavior:'instant'}); updateHeader();});
  }


  const home = document.querySelector('#home-page');
  let returnContext = null;
  const homeTitle = document.title;
  const detailUrl = id => `?pizza=${encodeURIComponent(id)}`;

  function editorChanges() {return {removed:[...editor.removed], extras:[...editor.extras], halfRemoved:[...editor.halfRemoved], halfExtras:[...editor.halfExtras], note:editor.note, base:editor.base, halfProductId:editor.halfProductId, halfBase:editor.halfBase};}
  function updateDetailOverview() {
    const product = find(editor.productId);
    const half = editor.halfProductId && find(editor.halfProductId);
    const overview = productPage.querySelector('.detail-overview');
    const title = productPage.querySelector('#detail-title');
    const photo = productPage.querySelector('.detail-hero-photo');
    const name = half ? `½ ${product.name} + ½ ${half.name}` : product.name;
    overview.classList.toggle('is-split', !!half);
    title.innerHTML = half ? [product, half].map(item => `<span class="detail-half-name"><small>½</small> ${escape(item.name)}</span>`).join(' ') : escape(product.name);
    title.setAttribute('aria-label', name);
    if (product.image) {
      photo.setAttribute('role', 'img');
      photo.setAttribute('aria-label', `${name} — ilustrační fotografie`);
      photo.innerHTML = [product, ...(half ? [half] : [])].map(item => `<img src="${escape(item.image)}" alt="" width="900" height="900">`).join('');
    }
    overview.querySelector('.detail-description').textContent = half ? 'Pizza napůl · dvě receptury podle vás' : product.description;
    const allergens = overview.querySelector('.detail-allergens-line');
    if (allergens) allergens.textContent = `Alergeny: ${[...new Set([...product.allergens, ...(half ? half.allergens : [])])].sort((a,b) => a-b).join(', ')}`;
    document.title = `${name} — PiPizza Jistebník`;
  }
  function updateEditorPrice() {
    if (!editor) return;
    const product = find(editor.productId);
    const breakdown = priceBreakdown(product, editorChanges(), products);
    const price = breakdown.total;
    productPage.querySelectorAll('[data-editor-count]').forEach(element => element.textContent = editor.quantity);
    productPage.querySelectorAll('[data-editor-quantity="-1"]').forEach(button => button.disabled = editor.quantity === 1);
    productPage.querySelectorAll('[data-unit-price]').forEach(element => element.textContent = money(price));
    productPage.querySelectorAll('[data-total-price]').forEach(element => element.textContent = money(price * editor.quantity));
    productPage.querySelector('#editor-extra-summary').textContent = [breakdown.swaps ? `${breakdown.swaps}× výměna zdarma` : '', breakdown.included ? `${breakdown.included - breakdown.includedRemaining} ze 3 surovin v ceně` : '', breakdown.extrasPrice ? `Navíc ${money(breakdown.extrasPrice)} / ks` : 'Bez příplatku za suroviny'].filter(Boolean).join(' · ');
    productPage.querySelector('#editor-price-calculation').textContent = editor.quantity > 1 ? `${editor.quantity} × ${money(price)} za kus` : `${editor.halfProductId ? 'Pizza napůl' : product.type === 'pizza' ? 'Pizza' : product.name} ${money(breakdown.pizzaPrice)}${breakdown.extrasPrice ? ` + suroviny ${money(breakdown.extrasPrice)}` : ' · krabice v ceně'}`;
    productPage.querySelectorAll('[data-ingredient]').forEach(button => {
      const selected = activeSelection(button.dataset.kind, button.dataset.half).has(button.dataset.ingredient);
      button.setAttribute('aria-pressed', String(selected));
      button.querySelector('.ingredient-indicator').innerHTML = selected ? icon('check') : '';
      button.closest('.ingredient-row').classList.toggle('selected', selected);
      if (button.dataset.kind === 'extra') {
        const scope = breakdown.scopes.find(item => item.id === button.dataset.half);
        const charge = scope.charges.find(item => item.ingredient === button.dataset.ingredient);
        const free = charge ? charge.price === 0 : breakdown.includedRemaining > 0 || (scope.swapsRemaining > 0 && SWAP_INGREDIENTS.includes(button.dataset.ingredient));
        const reason = charge?.reason || (breakdown.includedRemaining > 0 ? 'included' : 'swap');
        button.querySelector('small').textContent = free ? '0 Kč' : `+${money(EXTRA_PRICE)}`;
        button.classList.toggle('ingredient-free', free);
        button.setAttribute('aria-description', free ? (reason === 'swap' ? 'Výměna za odebranou klasickou surovinu zdarma.' : 'Surovina v ceně vlastní pizzy.') : `Příplatek ${money(EXTRA_PRICE)}.`);
      }
    });
    productPage.querySelectorAll('[data-exchange-status]').forEach(element => {
      const scope = breakdown.scopes.find(item => item.id === element.dataset.exchangeStatus);
      element.hidden = !scope.swapSlots;
      element.textContent = [scope.swaps ? `${scope.swaps}× výměna zdarma využita` : '', scope.swapsRemaining ? `${scope.swapsRemaining}× klasická surovina zdarma k výběru` : ''].filter(Boolean).join(' · ');
    });
    productPage.querySelectorAll('.ingredient-group').forEach(group => {
      const selected = group.querySelectorAll('[aria-pressed="true"]').length;
      const badge = group.querySelector('.group-selection');
      badge.textContent = selected ? `${selected} vybráno` : '';
      badge.hidden = !selected;
    });
    const changes = window.PiPizzaCart.describeChanges(editorChanges(), product, products);
    const summary = productPage.querySelector('#selected-ingredients');
    const bases = editor.base ? `Základ: ${BASES[editor.base]}${editor.halfProductId ? ' / ' + BASES[editor.halfBase] : ''}` : '';
    summary.textContent = [editor.halfProductId ? `Napůl: ${product.name} / ${find(editor.halfProductId).name}` : '', bases, ...changes].filter(Boolean).join(' · ') || 'Původní receptura';
  }

  function quantityControl() {
    return `<div class="detail-quantity"><button type="button" data-editor-quantity="-1" aria-label="Snížit počet kusů">${icon('minus')}</button><span data-editor-count>1</span><button type="button" data-editor-quantity="1" aria-label="Zvýšit počet kusů">${icon('plus')}</button></div>`;
  }
  function saveControl(line) {
    return `<button type="submit" form="customize-form" class="button button-green detail-buy">${icon(line ? 'check' : 'cart')}<span>${line ? 'Uložit změny' : 'Přidat do košíku'}</span></button>`;
  }
  function ingredientRows(items, kind, custom, scope = 'first') {
    return `<div class="ingredient-rows">${items.map(item => `<button type="button" class="ingredient-row ingredient-toggle" data-kind="${kind}" data-half="${scope}" data-ingredient="${escape(item)}" aria-pressed="false" aria-label="${kind === 'remove' ? 'Vynechat' : 'Přidat navíc'} ${escape(item)}"><span class="ingredient-indicator" aria-hidden="true"></span><strong>${escape(item)}</strong><small>${kind === 'remove' ? 'zdarma' : custom ? '3 v ceně' : '+29 Kč'}</small></button>`).join('')}</div>`;
  }
  function ingredientGroup(title, groupIcon, items, kind, custom, open = false, scope = 'first') {
    const titleContent = `<span class="group-icon">${icon(groupIcon)}</span><span class="group-title">${title}</span><span class="group-selection" hidden></span>`;
    if (kind === 'remove') return `<details class="ingredient-group ingredient-removal" ${open ? 'open' : ''}><summary>${titleContent}${icon('chevron')}</summary>${ingredientRows(items, kind, custom, scope)}</details>`;
    return `<section class="ingredient-group ingredient-extra-group" aria-label="${escape(title)}"><div class="ingredient-group-heading">${titleContent}</div>${ingredientRows(items, kind, custom, scope)}</section>`;
  }
  function activeSelection(kind, scope = 'first') {
    const second = editor.halfProductId && scope === 'second';
    return second ? (kind === 'remove' ? editor.halfRemoved : editor.halfExtras) : (kind === 'remove' ? editor.removed : editor.extras);
  }
  function baseOptions(name, selected) {
    const descriptions = {tomato:'Klasika z rajčat', cream:'Jemný a krémový', mustard:'Výraznější chuť'};
    return `<div class="pizza-base-options">${Object.entries(BASES).map(([value, label]) => `<label><input type="radio" name="${name}" value="${value}" ${selected === value ? 'checked' : ''}><span><i class="base-swatch base-${value}" aria-hidden="true"></i><strong>${label}</strong><small>${descriptions[value]}</small><b class="base-check" aria-hidden="true">${icon('check')}</b></span></label>`).join('')}</div>`;
  }
  function halfBaseOptions() {
    return editor.halfProductId ? `<fieldset class="pizza-base-field"><legend>Základ druhé poloviny · ${escape(find(editor.halfProductId).name)}</legend>${baseOptions('halfBase', editor.halfBase)}</fieldset>` : '';
  }
  function halfPicker(product) {
    const selected = editor.halfProductId && find(editor.halfProductId);
    return `<div class="pizza-half-field"><div class="recipe-label">Dvě chuti v jedné pizze <span>+12 Kč k dražší pizze</span></div><button type="button" class="half-picker" data-open-half aria-haspopup="dialog" aria-controls="half-picker-dialog"><span class="half-preview">${selected ? `<img src="${escape(product.image)}" alt=""><img src="${escape(selected.image)}" alt="">` : `<img src="${escape(product.image)}" alt="">`}</span><span><strong>${selected ? `½ ${escape(product.name)} + ½ ${escape(selected.name)}` : 'Chcete pizzu napůl?'}</strong><small>${selected ? 'Změnit druhou polovinu' : 'Vyberte si druhou polovinu s obrázkem'}</small></span>${icon('chevron')}</button><p class="pizza-half-rule">Základy i suroviny můžete upravit pro každou polovinu zvlášť.</p></div>`;
  }
  function openHalfPicker() {
    const product = find(editor.productId);
    halfDialog.querySelector('.half-picker-menu').innerHTML = `<button type="button" class="half-whole" data-half-id="" aria-pressed="${!editor.halfProductId}"><span>Nechat celou · ${escape(product.name)}</span><b>${money(product.price)}</b></button><div class="half-picker-grid">${products.filter(item => item.type === 'pizza' && item.id !== product.id).map(item => `<button type="button" data-half-id="${escape(item.id)}" class="half-choice" aria-pressed="${editor.halfProductId === item.id}"><img src="${escape(item.image)}" alt="" width="120" height="120" loading="lazy"><span><strong>${escape(item.name)}</strong><small>${escape(item.description)}</small><b>Celá pizza ${money(Math.max(product.price, item.price) + 12)}</b></span>${editor.halfProductId === item.id ? icon('check') : ''}</button>`).join('')}</div>`;
    halfDialog.showModal();
    halfDialog.querySelector('.half-picker-menu').scrollTop = 0;
  }
  halfDialog.addEventListener('click', event => {
    const choice = event.target.closest('[data-half-id]');
    if (!choice || !editor) return;
    const next = choice.dataset.halfId || null;
    if (next !== editor.halfProductId) {
      editor.halfProductId = next;
      editor.halfBase = next ? defaultBase(find(next)) : null;
      editor.halfRemoved.clear(); editor.halfExtras.clear();
    }
    const product = find(editor.productId);
    halfDialog.close();
    productPage.querySelector('.pizza-recipe-options').outerHTML = pizzaOptions(product);
    productPage.querySelector('#ingredient-choices').innerHTML = ingredientChoices(product);
    updateDetailOverview();
    updateEditorPrice();
    productPage.querySelector('[data-open-half]').focus({preventScroll:true});
  });
  function pizzaOptions(product) {
    return `<section class="pizza-recipe-options" aria-label="Podoba a základ pizzy"><fieldset class="pizza-base-field"><legend>Základ ${editor.halfProductId ? 'první poloviny' : 'pizzy'} · ${escape(product.name)} <span>V ceně</span></legend>${baseOptions('base', editor.base)}</fieldset>${halfPicker(product)}<div id="half-base-options">${halfBaseOptions()}</div></section>`;
  }
  function ingredientChoices(product) {
    const half = editor.halfProductId && find(editor.halfProductId);
    const custom = product.number === 26 || half?.number === 26;
    const standard = EXTRA_GROUPS.filter(group => !group.premium);
    const premium = EXTRA_GROUPS.filter(group => group.premium);
    const recipes = [{product, scope:'first', label:'První polovina'}, ...(half ? [{product:half, scope:'second', label:'Druhá polovina'}] : [])];
    const rule = `<p class="ingredient-swap-rule">Za odebrané klasické maso nebo sýr můžete vybrat jednu klasickou surovinu zdarma${half ? ' na stejné polovině' : ''}. Zelenina a prémiové suroviny se do výměny nepočítají.${custom ? ' První 3 suroviny jsou v ceně, dohromady za celou pizzu.' : ''}</p>`;
    return rule + recipes.map(recipe => {
      const original = ingredients(recipe.product);
      const group = item => ingredientGroup(item.title, item.icon, item.items, 'extra', custom, false, recipe.scope);
      return `<section class="half-ingredients" data-recipe-half="${recipe.scope}" aria-label="${half ? recipe.label + ' · ' : ''}${escape(recipe.product.name)}">${half ? `<header class="half-ingredients-heading"><img src="${escape(recipe.product.image)}" alt="" width="48" height="48"><div><small>${recipe.label}</small><h2>${escape(recipe.product.name)}</h2></div><span>½</span></header><p class="ingredient-scope-note">Úpravy jen pro tuto polovinu · surovina navíc +29 Kč</p>` : ''}<p class="ingredient-exchange-status" data-exchange-status="${recipe.scope}" role="status" hidden></p>${group(standard[0])}<section class="premium-ingredients" aria-labelledby="premium-title-${recipe.scope}"><h3 id="premium-title-${recipe.scope}">Prémiové suroviny <span>+29 Kč</span></h3><p>Maso a sýry navíc.</p>${premium.map(group).join('')}</section>${standard.slice(1).map(group).join('')}${original.length ? ingredientGroup('Co vynecháme?', 'sliders', original, 'remove', false, true, recipe.scope) : ''}</section>`;
    }).join('');
  }
  function renderDetail(product, lineId = null) {
    const line = lineId ? cart.get(lineId) : null;
    editor = {productId:product.id, lineId:line?.id || null, removed:new Set(line?.removed || []), extras:new Set(line?.extras || []), halfRemoved:new Set(line?.halfRemoved || []), halfExtras:new Set(line?.halfExtras || []), note:line?.note || '', quantity:line?.quantity || 1, base:line?.base || defaultBase(product), halfProductId:line?.halfProductId || null, halfBase:line?.halfBase || null};
    const pizza = product.type === 'pizza';
    const custom = product.number === 26;
    home.hidden = true;
    productPage.hidden = false;
    document.body.classList.add('product-view');
    document.body.classList.remove('categories-pinned');
    document.title = `${product.name} — PiPizza Jistebník`;
    const picture = product.image ? `<img src="${escape(product.image)}" alt="${escape(product.name)} — ilustrační fotografie" width="900" height="900" fetchpriority="high">` : `<div class="simple-product-art">${icon(product.type === 'drinks' ? 'drink' : 'box')}</div>`;
    const choices = pizza ? `<div id="ingredient-choices">${ingredientChoices(product)}</div>` : '';
    const variants = product.type === 'drinks' && product.variants?.[1]?.cena_kc ? `<p class="detail-note">Také 1,5 l / 2 l za ${money(product.variants[1].cena_kc)}. Větší balení si vyžádejte při telefonické objednávce.</p>` : '';
    productPage.innerHTML = `<div class="detail-page-layout"><div class="detail-overview"><figure class="detail-hero-photo">${picture}</figure><section class="detail-intro" aria-labelledby="detail-title"><span class="eyebrow">${pizza ? 'ČERSTVĚ Z NAŠÍ PECE' : 'K VAŠÍ PIZZE'}</span><div class="detail-title-row"><h1 id="detail-title" tabindex="-1">${escape(product.name)}</h1><strong data-unit-price></strong></div><p class="detail-description">${escape(product.description)}</p>${product.allergens.length ? `<p class="detail-allergens-line">Alergeny: ${product.allergens.join(', ')}</p>` : ''}</section><a class="detail-back" href="#menu" data-detail-back>${icon('arrow')} <span>Zpět</span></a></div><form id="customize-form" class="detail-customization"><div class="customization-heading"><h2>${pizza ? 'Upravte si ji podle sebe' : 'Ještě něco k objednávce?'}</h2><p>${custom ? 'První 3 suroviny máte v ceně. Každá další +29 Kč.' : pizza ? 'Něco vynechat, něco přidat. Přesně podle vaší chuti.' : 'Vyberte počet kusů a přidejte do košíku.'}</p></div>${pizza ? pizzaOptions(product) : ''}<div class="detail-builder-layout ${pizza ? '' : 'detail-builder-simple'}">${choices}<aside class="detail-side-panel"><label class="product-note"><span>Poznámka k ${pizza ? 'pizze' : 'produktu'}</span><textarea id="product-note" maxlength="240" rows="3" placeholder="Máte nějaké přání? Napište nám ho…">${escape(editor.note)}</textarea><small>0 / 240</small></label>${variants}${product.allergens.length ? '<p class="detail-note">Uvedené alergeny platí pro základní recepturu. Složení po úpravách upřesníme při objednávce.</p>' : ''}<p class="detail-price-promise">Krabice v ceně. Rozvoz zdarma.<br>Platba kartou bez poplatku.</p></aside></div><div class="detail-order-bar"><div class="detail-order-summary"><div><span>Celkem</span><strong data-total-price aria-live="polite" aria-atomic="true"></strong></div><small id="editor-price-calculation"></small><small id="editor-extra-summary"></small><p id="selected-ingredients"></p></div><div class="detail-bottom-order">${quantityControl()}${saveControl(line)}</div></div></form></div>`;
    productPage.querySelector('.product-note small').textContent = `${editor.note.length} / 240`;
    updateDetailOverview();
    observeDetailHeader();
    updateEditorPrice();
    requestAnimationFrame(() => {window.scrollTo({top:0,behavior:'instant'}); productPage.querySelector('h1').focus({preventScroll:true}); updateHeader();});
  }

  function openDetail(id, lineId = null) {
    const product = find(id);
    if (!product) return;
    returnContext = {url:location.pathname + location.search + location.hash, scroll:scrollY, cart:cartDialog.open, focus:document.activeElement};
    history.replaceState({...history.state, scroll:scrollY}, '', location.href);
    if (cartDialog.open) cartDialog.close();
    closeNavigation();
    history.pushState({pipizzaDetail:true, lineId}, '', detailUrl(id));
    renderDetail(product, lineId);
  }
  function returnToMenu() {
    if (history.state?.pipizzaDetail && returnContext) history.back();
    else {history.replaceState({}, '', location.pathname + '#menu'); showHome(); requestAnimationFrame(() => document.querySelector('#menu').scrollIntoView({behavior:'instant'}));}
  }
  function showHome() {
    editor = null;
    detailObserver?.disconnect();
    home.hidden = false;
    productPage.hidden = true;
    document.body.classList.remove('product-view');
    document.title = homeTitle;
    measureCategories();
  }
  function syncRoute(initial = false) {
    const id = new URLSearchParams(location.search).get('pizza');
    // Native hash navigation within the menu keeps its own anchor/scroll behavior.
    if (!id && !editor && !home.hidden && initial !== true) return;
    if (cartDialog.open) cartDialog.close();
    if (halfDialog.open) halfDialog.close();
    const product = id && find(id);
    if (product) {
      renderDetail(product, history.state?.lineId);
      if (returnContext?.cart) {renderCart(); cartDialog.showModal(); returnContext = null;}
    }
    else {
      showHome();
      if (id) {history.replaceState({},'',location.pathname + '#menu'); notify('Tuhle položku už v nabídce nemáme.');}
      requestAnimationFrame(() => {
        if (initial === true && location.hash.length > 1) document.querySelector(location.hash)?.scrollIntoView({behavior:'instant'});
        else window.scrollTo({top:history.state?.scroll || returnContext?.scroll || 0,behavior:'instant'});
        if (returnContext?.cart) {renderCart(); cartDialog.showModal();}
        else if (returnContext?.focus?.isConnected) returnContext.focus.focus({preventScroll:true});
        returnContext = null;
        updateHeader();
      });
    }
  }
  window.addEventListener('popstate', syncRoute);

  productPage.addEventListener('click', event => {
    const back = event.target.closest('[data-detail-back]');
    if (back) {event.preventDefault(); returnToMenu(); return;}
    if (event.target.closest('[data-open-half]') && editor) {openHalfPicker(); return;}
    const button = event.target.closest('[data-ingredient]');
    if (!button || !editor) return;
    const selection = activeSelection(button.dataset.kind, button.dataset.half);
    if (selection.has(button.dataset.ingredient)) selection.delete(button.dataset.ingredient); else selection.add(button.dataset.ingredient);
    updateEditorPrice();
  });
  productPage.addEventListener('input', event => {
    if (event.target.id !== 'product-note' || !editor) return;
    editor.note = event.target.value;
    productPage.querySelector('.product-note small').textContent = `${editor.note.length} / 240`;
  });
  productPage.addEventListener('change', event => {
    if (!editor) return;
    if (event.target.name === 'base' || event.target.name === 'halfBase') {
      editor[event.target.name] = event.target.value;
      updateEditorPrice();
    }

  });
  productPage.addEventListener('submit', event => {
    if (event.target.id !== 'customize-form' || !editor) return;
    event.preventDefault();
    const edited = !!editor.lineId;
    if (edited) cart.update(editor.lineId, editorChanges(), editor.quantity);
    else cart.add(editor.productId, editorChanges(), editor.quantity);
    renderCart();
    animateToCart();
    notify(edited ? 'Úpravy jsou uložené v objednávce.' : `${find(editor.productId).name} je ve vaší objednávce.`);
    returnToMenu();
  });

  document.querySelector('.category-list').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (button) {selectCategory(button.dataset.category); if (document.body.classList.contains('categories-pinned')) document.querySelector('#menu').scrollIntoView({behavior:'instant'});}
  });
  document.querySelector('#reset-search').addEventListener('click', () => selectCategory('pizza'));

  document.addEventListener('click', event => {
    const add = event.target.closest('[data-add]');
    if (add) addToCart(add.dataset.add, add);
    const detail = event.target.closest('[data-detail]');
    const card = event.target.closest('[data-card-detail]');
    if (card && !event.target.closest('button, a, input, select') && !window.getSelection().toString()) openDetail(card.dataset.cardDetail);
    if (detail && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {event.preventDefault(); openDetail(detail.dataset.detail);}
    const editLine = event.target.closest('[data-edit-line]');
    if (editLine) {const line = cart.get(editLine.dataset.editLine); if (line) openDetail(line.productId, line.id);}
    const editorQuantity = event.target.closest('[data-editor-quantity]');
    if (editorQuantity && editor) {editor.quantity = Math.max(1, editor.quantity + Number(editorQuantity.dataset.editorQuantity)); updateEditorPrice();}
    const quantity = event.target.closest('[data-quantity]');
    if (quantity) {const line = cart.get(quantity.dataset.quantity); if (line) cart.setQuantity(line.id, line.quantity + Number(quantity.dataset.change)); renderCart();}
    const remove = event.target.closest('[data-remove]');
    if (remove) {cart.remove(remove.dataset.remove); renderCart();}
    if (event.target.closest('[data-back-to-menu]')) {cartDialog.close(); goHomeAnchor('#menu');}
    const homeLink = event.target.closest('a[href^="#"]:not([data-detail-back])');
    if (homeLink && (!productPage.hidden || homeLink.getAttribute('href') === '#')) {event.preventDefault(); goHomeAnchor(homeLink.getAttribute('href'));}
    const close = event.target.closest('.close-dialog');
    if (close) close.closest('dialog').close();
  });

  document.querySelectorAll('.cart-toggle, #floating-cart').forEach(button => button.addEventListener('click', () => {renderCart(); cartDialog.showModal();}));
  document.querySelectorAll('dialog:not(#checkout-dialog)').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));

  const mobileMenu = document.querySelector('.mobile-menu');
  const navigation = document.querySelector('.main-nav');
  function closeNavigation() {navigation?.classList.remove('open'); mobileMenu?.setAttribute('aria-expanded', 'false'); mobileMenu?.setAttribute('aria-label', 'Otevřít navigaci');}
  mobileMenu?.addEventListener('click', () => {
    const open = navigation?.classList.toggle('open') || false;
    mobileMenu.setAttribute('aria-expanded', String(open));
    mobileMenu.setAttribute('aria-label', open ? 'Zavřít navigaci' : 'Otevřít navigaci');
  });
  navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    closeNavigation();
    navigation.querySelectorAll('a').forEach(item => item.classList.toggle('nav-active', item === link));
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeNavigation();
  });

  const categorySlot = document.querySelector('#category-slot');
  const categoryBrowser = document.querySelector('.menu-browser');
  let categoryHeight = 0;
  let pinThreshold = 150;
  let scrollScheduled = false;
  function measureCategories() {
    document.documentElement.style.setProperty('--viewport-width', document.documentElement.clientWidth + 'px');
    if (home.hidden) return;
    document.body.classList.remove('categories-pinned');
    categorySlot.style.height = '';
    categoryHeight = categorySlot.getBoundingClientRect().height;
    const compactHeight = matchMedia('(max-width:700px)').matches ? 64 : 70;
    pinThreshold = categorySlot.getBoundingClientRect().top + scrollY + 0 - compactHeight;
    updateHeader();
  }
  function updateHeader() {
    document.body.classList.toggle('header-scrolled', window.scrollY > 8);
    document.body.classList.toggle('header-compact', window.scrollY > 72);
    const pinned = !home.hidden && window.scrollY > pinThreshold;
    document.body.classList.toggle('categories-pinned', pinned);
    categorySlot.style.height = pinned ? `${categoryHeight}px` : '';
    backToTop.hidden = window.scrollY < 450;
    scrollScheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollScheduled) {scrollScheduled = true; requestAnimationFrame(updateHeader);}
  }, {passive:true});
  backToTop.addEventListener('click', () => window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth'}));
  let detailObserver;
  function observeDetailHeader() {
    detailObserver?.disconnect();
    const overview = productPage.querySelector('.detail-overview');
    detailObserver = new ResizeObserver(() => document.documentElement.style.setProperty('--detail-header-height', `${overview.getBoundingClientRect().height}px`));
    detailObserver.observe(overview);
  }
  const headerObserver = new ResizeObserver(entries => document.documentElement.style.setProperty('--site-header-height', `${entries[0].target.getBoundingClientRect().height}px`));
  headerObserver.observe(document.querySelector('.site-header'));
  window.addEventListener('resize', measureCategories);
  document.fonts.ready.then(measureCategories);

  document.querySelector('#show-delivery-map').addEventListener('click', () => {
    document.querySelector('#rozvoz').scrollIntoView({behavior:'smooth'});
    document.querySelector('#coverage-address').focus({preventScroll:true});
  });
  document.querySelector('#payment-info').addEventListener('click', () => {
    document.querySelector('#info-title').textContent = 'Ukázka objednávání';
    document.querySelector('#info-content').innerHTML = '<h3>Vyzkoušejte celou objednávku</h3><p>Vyberte si pizzu, upravte suroviny a pokračujte z košíku k doručení a platbě. Na místě můžete platit hotově, kartou nebo QR kódem. QR kód bude také na účtence. Online platby zde používají jen testovací údaje.</p><h3>Je to jen demo</h3><p>Objednávka se neodesílá pizzerii, žádná platba neproběhne a údaje zůstávají pouze v paměti této stránky. Našeptávač používá adresy ČÚZK / RÚIAN v zobrazené oblasti rozvozu. Po výběru ukáže polohu domu.</p><h3>Ceny v ukázce</h3><p>Cena za pizzu je konečná, bez skrytých poplatků za krabici, dovoz nebo špatné počasí. Za platbu kartou nic navíc neplatíte. Suroviny navíc stojí 29 Kč. Pizza napůl stojí cenu dražší poloviny +12 Kč; příplatky a výměny surovin se počítají pro každou polovinu zvlášť. Demo používá standardní ceny menu, akci 3 + 1 zatím nepřepočítává.</p>';
    infoDialog.showModal();
  });

  function updateOpeningStatus() {
    const status = window.PiPizzaCheckoutModel.openingStatus();
    const state = status.isOpen ? 'open' : 'closed';
    const label = status.isOpen ? 'Máme otevřeno' : 'Máme zavřeno';
    const stateLabel = document.querySelector('#opening-state-label');
    document.body.dataset.openingState = state;
    if (stateLabel.textContent !== label) stateLabel.textContent = label;
    document.querySelector('#opening-countdown-label').textContent = status.isOpen ? 'Zavíráme za' : 'Otevíráme za';
    const seconds = status.remainingSeconds;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remaining = seconds % 60;
    const countdown = document.querySelector('#opening-countdown');
    countdown.textContent = [hours, minutes, remaining].map(value => String(value).padStart(2, '0')).join(':');
    countdown.dateTime = `PT${seconds}S`;
    countdown.setAttribute('aria-label', `${hours} h ${minutes} min ${remaining} s`);
    document.querySelector('#opening-hours-label').textContent = `Dnes ${status.todayHours}`;
    document.querySelector('#today-hours').textContent = `Dnes ${status.todayHours}`;
  }
  updateOpeningStatus();
  setInterval(() => { if (!document.hidden) updateOpeningStatus(); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateOpeningStatus(); });
  window.PiPizzaCheckout.create({cart, products, onComplete:renderCart});
  renderProducts();
  renderCart();
  measureCategories();
  syncRoute(true);
})();
