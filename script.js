(() => {
  'use strict';
  const products = window.PIPIZZA_MENU || [];
  const {Cart, BASES, EXTRA_GROUPS, defaultBase, ingredients, priceBreakdown} = window.PiPizzaCart;
  const cart = new Cart(products);
  const grid = document.querySelector('#product-grid');
  const search = document.querySelector('#menu-search');
  const heading = document.querySelector('#menu-heading');
  const sort = document.querySelector('#menu-sort');
  const cartDialog = document.querySelector('#cart-dialog');
  const productPage = document.querySelector('#product-page');
  const infoDialog = document.querySelector('#info-dialog');
  let category = 'pizza';
  let toastTimer;
  let editor = null;
  const money = value => new Intl.NumberFormat('cs-CZ', {maximumFractionDigits: 0}).format(value) + ' Kč';
  const normalize = value => value.toLocaleLowerCase('cs').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const find = id => products.find(product => product.id === id);
  const categoryTitles = {pizza:'Všechny naše pizzy', vegetarian:'Bez masa. Plné chuti', spicy:'Trochu to přiostříme', drinks:'Něco na zapití', extras:'Ještě něco navíc?'};
  const matchesCategory = product => category === 'vegetarian' ? product.vegetarian : category === 'spicy' ? product.spicy : product.type === category;
  const plural = (count, variants) => variants[count === 1 ? 0 : count > 1 && count < 5 ? 1 : 2];

  function renderProducts() {
    const query = normalize(search.value.trim());
    const visible = products.filter(product => matchesCategory(product) && (!query || normalize(product.name + ' ' + product.description).includes(query)));
    visible.sort((a, b) => sort.value === 'price-asc' ? a.price - b.price : sort.value === 'price-desc' ? b.price - a.price : sort.value === 'name' ? a.name.localeCompare(b.name, 'cs') : (a.number || products.indexOf(a)) - (b.number || products.indexOf(b)));
    heading.textContent = query ? 'Tohle by vám mohlo chutnat' : categoryTitles[category];
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
      return `<article class="product-card product-card-${escape(product.type)}${product.name.length > 12 ? ' product-card-long-name' : ''}" style="--title-length:${Math.max(8, product.name.length)}"><a href="?pizza=${encodeURIComponent(product.id)}" class="product-image-button" data-detail="${escape(product.id)}" aria-label="Prohlédnout ${escape(product.name)}">${art}${number}${badge}</a><div class="product-info"><h2><a href="?pizza=${encodeURIComponent(product.id)}" class="product-title" data-detail="${escape(product.id)}">${escape(product.name)}</a></h2><p class="product-description">${escape(product.description)}</p><div class="product-bottom"><span class="product-price">${money(product.price)}</span><div class="card-actions"><button class="add-button" data-add="${escape(product.id)}" aria-label="Přidat ${escape(product.name)} do objednávky">${icon('cart')}<span>Přidat do košíku</span></button>${product.type === 'pizza' ? `<button class="edit-button" data-detail="${escape(product.id)}" aria-label="Upravit ${escape(product.name)}"><span>Upravit podle sebe</span>${icon('arrow')}</button>` : ''}</div></div></div></article>`;
    }).join('');
  }

  function selectCategory(next) {
    category = next;
    search.value = '';
    search.placeholder = next === 'drinks' ? 'Najít oblíbený nápoj…' : next === 'extras' ? 'Najít něco navíc…' : 'Najít pizzu nebo surovinu…';
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

  function addToCart(id) {
    const product = find(id);
    if (!product) return;
    if (product.number === 26) {openDetail(id); return;}
    cart.add(id);
    renderCart();
    notify(`${product.name} je ve vaší objednávce.`);
  }

  function renderCart() {
    document.querySelectorAll('.cart-count').forEach(element => element.textContent = cart.count);
    document.querySelectorAll('.cart-toggle').forEach(button => button.setAttribute('aria-label', `Otevřít moji objednávku, počet položek: ${cart.count}`));
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
      const changes = `${baseText ? `<span class="cart-modification">${escape(baseText)}</span>` : ''}${line.removed.length ? `<span class="cart-modification">Bez: ${escape(line.removed.join(', '))}</span>` : ''}${line.extras.length ? `<span class="cart-modification">Navíc: ${escape(line.extras.join(', '))}</span>` : ''}${line.note ? `<span class="cart-modification">Poznámka: ${escape(line.note)}</span>` : ''}`;
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

  function editorChanges() {return {removed:[...editor.removed], extras:[...editor.extras], note:editor.note, base:editor.base, halfProductId:editor.halfProductId, halfBase:editor.halfBase};}
  function updateEditorPrice() {
    if (!editor) return;
    const product = find(editor.productId);
    const breakdown = priceBreakdown(product, editorChanges(), products);
    const price = breakdown.total;
    productPage.querySelectorAll('[data-editor-count]').forEach(element => element.textContent = editor.quantity);
    productPage.querySelectorAll('[data-editor-quantity="-1"]').forEach(button => button.disabled = editor.quantity === 1);
    productPage.querySelectorAll('[data-unit-price]').forEach(element => element.textContent = money(price));
    productPage.querySelectorAll('[data-total-price]').forEach(element => element.textContent = money(price * editor.quantity));
    productPage.querySelector('#editor-extra-summary').textContent = [editor.halfProductId ? `Dražší polovina +12 Kč: ${money(breakdown.pizzaPrice)}` : '', breakdown.extrasPrice ? `Suroviny navíc +${money(breakdown.extrasPrice)} / kus` : '', breakdown.swaps ? `${breakdown.swaps}× výměna v ceně` : '', breakdown.included ? `${Math.min(editor.extras.size, 3)} ze 3 surovin v ceně` : ''].filter(Boolean).join(' · ') || 'Bez příplatku';
    productPage.querySelectorAll('[data-ingredient]').forEach(button => {
      const selected = (button.dataset.kind === 'remove' ? editor.removed : editor.extras).has(button.dataset.ingredient);
      button.setAttribute('aria-pressed', String(selected));
      button.querySelector('.ingredient-indicator').innerHTML = selected ? icon('check') : '';
      button.closest('.ingredient-row').classList.toggle('selected', selected);
    });
    productPage.querySelectorAll('.ingredient-group').forEach(group => {
      const selected = group.querySelectorAll('[aria-pressed="true"]').length;
      const badge = group.querySelector('.group-selection');
      badge.textContent = selected ? `${selected} vybráno` : '';
      badge.hidden = !selected;
    });
    const changes = [...editor.removed].map(item => `Bez: ${item}`).concat([...editor.extras].map(item => `+ ${item}`));
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
  function ingredientRows(items, kind, custom) {
    return `<div class="ingredient-rows">${items.map(item => `<button type="button" class="ingredient-row ingredient-toggle" data-kind="${kind}" data-ingredient="${escape(item)}" aria-pressed="false" aria-label="${kind === 'remove' ? 'Vynechat' : 'Přidat navíc'} ${escape(item)}"><span class="ingredient-indicator" aria-hidden="true"></span><strong>${escape(item)}</strong><small>${kind === 'remove' ? 'zdarma' : custom ? '3 v ceně' : '+29 Kč'}</small></button>`).join('')}</div>`;
  }
  function ingredientGroup(title, groupIcon, items, kind, custom, open = false) {
    const titleContent = `<span class="group-icon">${icon(groupIcon)}</span><span class="group-title">${title}</span><span class="group-selection" hidden></span>`;
    if (kind === 'remove') return `<details class="ingredient-group ingredient-removal" ${open ? 'open' : ''}><summary>${titleContent}${icon('chevron')}</summary>${ingredientRows(items, kind, custom)}</details>`;
    return `<section class="ingredient-group ingredient-extra-group" aria-label="${escape(title)}"><div class="ingredient-group-heading">${titleContent}</div>${ingredientRows(items, kind, custom)}</section>`;
  }
  function baseOptions(name, selected) {
    return `<div class="pizza-base-options">${Object.entries(BASES).map(([value, label]) => `<label><input type="radio" name="${name}" value="${value}" ${selected === value ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div>`;
  }
  function halfBaseOptions() {
    return editor.halfProductId ? `<fieldset class="pizza-base-field"><legend>Základ druhé poloviny · ${escape(find(editor.halfProductId).name)}</legend>${baseOptions('halfBase', editor.halfBase)}</fieldset>` : '';
  }
  function pizzaOptions(product) {
    return `<section class="pizza-recipe-options" aria-label="Podoba a základ pizzy"><fieldset class="pizza-base-field"><legend>Základ · ${escape(product.name)}</legend>${baseOptions('base', editor.base)}<small>Všechny tři základy jsou v ceně.</small></fieldset><div class="pizza-half-field"><label class="pizza-half-label" for="pizza-half">Pizza napůl <span>Vyberte druhou polovinu</span></label><select id="pizza-half"><option value="">Celá ${escape(product.name)}</option>${products.filter(item => item.type === 'pizza' && item.id !== product.id).map(item => `<option value="${escape(item.id)}" ${editor.halfProductId === item.id ? 'selected' : ''}>½ ${escape(product.name)} + ½ ${escape(item.name)} · ${money(Math.max(product.price, item.price) + 12)}</option>`).join('')}</select><p class="pizza-half-rule">Cena dražší poloviny +12 Kč. Suroviny navíc se účtují stejně jako u celé pizzy.</p></div><div id="half-base-options">${halfBaseOptions()}</div></section>`;
  }
  function ingredientChoices(product) {
    const half = editor.halfProductId && find(editor.halfProductId);
    const custom = product.number === 26 || half?.number === 26;
    const original = [...new Set([...ingredients(product), ...(half ? ingredients(half) : [])])];
    const standard = EXTRA_GROUPS.filter(group => !group.premium);
    const premium = EXTRA_GROUPS.filter(group => group.premium);
    return `${original.length ? ingredientGroup('Co vynecháme?', 'sliders', original, 'remove', false) : ''}<p class="ingredient-swap-rule">Výměna „něco za něco“: za odebranou mozzarellu, nivu, šunku, kuře nebo anglickou slaninu vyberte jednu klasickou surovinu zdarma. Zelenina se do výměny nepočítá ani při odebrání, ani při přidání. Prémiové suroviny jsou vždy za +29 Kč${custom ? '; u pizzy Podle vašeho přání zůstávají první 3 vybrané suroviny v ceně' : ''}.</p>${half ? '<p class="ingredient-scope-note">Přidané suroviny patří na celou pizzu. Vynechanou surovinu odebereme z obou polovin, pokud ji obsahují.</p>' : ''}${ingredientGroup(standard[0].title, standard[0].icon, standard[0].items, 'extra', custom, custom)}<section class="premium-ingredients" aria-labelledby="premium-title"><h3 id="premium-title">Prémiové suroviny <span>+29 Kč</span></h3><p>Maso a sýry navíc. Nevztahuje se na ně bezplatná výměna.</p>${premium.map(group => ingredientGroup(group.title, group.icon, group.items, 'extra', custom)).join('')}</section>${standard.slice(1).map(group => ingredientGroup(group.title, group.icon, group.items, 'extra', custom)).join('')}`;
  }
  function renderDetail(product, lineId = null) {
    const line = lineId ? cart.get(lineId) : null;
    editor = {productId:product.id, lineId:line?.id || null, removed:new Set(line?.removed || []), extras:new Set(line?.extras || []), note:line?.note || '', quantity:line?.quantity || 1, base:line?.base || defaultBase(product), halfProductId:line?.halfProductId || null, halfBase:line?.halfBase || null};
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
    productPage.innerHTML = `<div class="detail-page-layout"><div class="detail-overview"><figure class="detail-hero-photo">${picture}</figure><section class="detail-intro" aria-labelledby="detail-title"><span class="eyebrow">${pizza ? 'ČERSTVĚ Z NAŠÍ PECE' : 'K VAŠÍ PIZZE'}</span><div class="detail-title-row"><h1 id="detail-title" tabindex="-1">${escape(product.name)}</h1><strong data-unit-price></strong></div><p class="detail-description">${escape(product.description)}</p>${product.allergens.length ? `<p class="detail-allergens-line">Alergeny: ${product.allergens.join(', ')}</p>` : ''}</section><a class="detail-back" href="#menu" data-detail-back>${icon('arrow')} Zpět na nabídku</a></div><form id="customize-form" class="detail-customization"><div class="customization-heading"><h2>${pizza ? 'Upravte si ji podle sebe' : 'Ještě něco k objednávce?'}</h2><p>${custom ? 'První 3 suroviny máte v ceně. Každá další +29 Kč.' : pizza ? 'Něco vynechat, něco přidat. Přesně podle vaší chuti.' : 'Vyberte počet kusů a přidejte do košíku.'}</p></div>${pizza ? pizzaOptions(product) : ''}<div class="detail-builder-layout ${pizza ? '' : 'detail-builder-simple'}">${choices}<aside class="detail-side-panel"><label class="product-note"><span>Poznámka k ${pizza ? 'pizze' : 'produktu'}</span><textarea id="product-note" maxlength="240" rows="3" placeholder="Máte nějaké přání? Napište nám ho…">${escape(editor.note)}</textarea><small>0 / 240</small></label>${variants}${product.allergens.length ? '<p class="detail-note">Uvedené alergeny platí pro základní recepturu. Složení po úpravách upřesníme při objednávce.</p>' : ''}<p class="detail-price-promise">Krabice v ceně. Rozvoz zdarma.<br>Platba kartou bez poplatku.</p></aside></div><div class="detail-order-bar"><div class="detail-order-summary"><div><span>Celkem</span><strong data-total-price></strong></div><small id="editor-extra-summary" aria-live="polite"></small><p id="selected-ingredients"></p></div><div class="detail-bottom-order">${quantityControl()}${saveControl(line)}</div></div></form></div>`;
    productPage.querySelector('.product-note small').textContent = `${editor.note.length} / 240`;
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
    const button = event.target.closest('[data-ingredient]');
    if (!button || !editor) return;
    const selection = button.dataset.kind === 'remove' ? editor.removed : editor.extras;
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
    if (event.target.id === 'pizza-half') {
      editor.halfProductId = event.target.value || null;
      editor.halfBase = editor.halfProductId ? defaultBase(find(editor.halfProductId)) : null;
      const product = find(editor.productId);
      const allowed = [...ingredients(product), ...(editor.halfProductId ? ingredients(find(editor.halfProductId)) : [])];
      editor.removed = new Set([...editor.removed].filter(item => allowed.includes(item)));
      productPage.querySelector('#half-base-options').innerHTML = halfBaseOptions();
      productPage.querySelector('#ingredient-choices').innerHTML = ingredientChoices(product);
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
    notify(edited ? 'Úpravy jsou uložené v objednávce.' : `${find(editor.productId).name} je ve vaší objednávce.`);
    returnToMenu();
  });

  document.querySelector('.category-list').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (button) {selectCategory(button.dataset.category); if (document.body.classList.contains('categories-pinned')) document.querySelector('#menu').scrollIntoView({behavior:'instant'});}
  });
  search.addEventListener('input', renderProducts);
  sort.addEventListener('change', renderProducts);
  document.querySelector('#reset-search').addEventListener('click', () => selectCategory('pizza'));
  document.querySelector('#pick-pizzas').addEventListener('click', () => {selectCategory('pizza'); document.querySelector('#menu').scrollIntoView({behavior:'smooth'});});

  document.addEventListener('click', event => {
    const add = event.target.closest('[data-add]');
    if (add) addToCart(add.dataset.add);
    const detail = event.target.closest('[data-detail]');
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
    if (homeLink && !productPage.hidden) {event.preventDefault(); goHomeAnchor(homeLink.getAttribute('href'));}
    const close = event.target.closest('.close-dialog');
    if (close) close.closest('dialog').close();
  });

  document.querySelectorAll('.cart-toggle').forEach(button => button.addEventListener('click', () => {renderCart(); cartDialog.showModal();}));
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
    if (event.key === '/' && !editor && !document.querySelector('dialog[open]') && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) {event.preventDefault();search.focus();}
  });

  const categorySlot = document.querySelector('#category-slot');
  const categoryBrowser = document.querySelector('.menu-browser');
  let categoryHeight = 0;
  let pinThreshold = 150;
  let scrollScheduled = false;
  function measureCategories() {
    if (home.hidden) return;
    document.body.classList.remove('categories-pinned');
    categorySlot.style.height = '';
    categoryHeight = categorySlot.getBoundingClientRect().height;
    const compactHeight = matchMedia('(max-width:700px)').matches ? 64 : 70;
    pinThreshold = categorySlot.getBoundingClientRect().top + scrollY + categoryBrowser.querySelector('.menu-browser-top').offsetHeight + 30 - compactHeight;
    updateHeader();
  }
  function updateHeader() {
    document.body.classList.toggle('header-compact', window.scrollY > 72);
    const pinned = !home.hidden && window.scrollY > pinThreshold;
    document.body.classList.toggle('categories-pinned', pinned);
    categorySlot.style.height = pinned ? `${categoryHeight}px` : '';
    scrollScheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollScheduled) {scrollScheduled = true; requestAnimationFrame(updateHeader);}
  }, {passive:true});
  window.addEventListener('resize', measureCategories);
  document.fonts.ready.then(measureCategories);

  document.querySelector('#show-delivery-map').addEventListener('click', () => {
    document.querySelector('#info-title').textContent = 'Pizza až k vám domů.';
    document.querySelector('#info-content').innerHTML = `<p>Rozvážíme z Jistebníku do okolí zdarma. Oblast rozvozu najdete na mapě. Nejste si jistí adresou? Zavolejte nám.</p><img src="assets/images/rozvoz.png" alt="Původní mapa oblasti rozvozu PiPizza z Jistebníku" width="603" height="524"><a href="tel:+420720400500" class="button button-green">${icon('phone')} 720 400 500</a>`;
    infoDialog.showModal();
  });
  document.querySelector('#payment-info').addEventListener('click', () => {
    document.querySelector('#info-title').textContent = 'Ukázka objednávání';
    document.querySelector('#info-content').innerHTML = '<h3>Vyzkoušejte celou objednávku</h3><p>Vyberte si pizzu, upravte suroviny a pokračujte z košíku k doručení a platbě. Na místě můžete platit hotově, kartou nebo QR kódem. QR kód bude také na účtence. Online platby zde používají jen testovací údaje.</p><h3>Je to jen demo</h3><p>Objednávka se neodesílá pizzerii, žádná platba neproběhne a údaje zůstávají pouze v paměti této stránky. Našeptávač nabízí ukázkové adresy; můžete také zadat vlastní.</p><h3>Ceny v ukázce</h3><p>Cena za pizzu je konečná, bez skrytých poplatků za krabici, dovoz nebo špatné počasí. Za platbu kartou nic navíc neplatíte. Suroviny navíc stojí 29 Kč. Pizza napůl stojí cenu dražší poloviny +12 Kč; stejné příplatky za suroviny platí i u ní. Demo používá standardní ceny menu, akci 3 + 1 zatím nepřepočítává.</p>';
    infoDialog.showModal();
  });

  const weekday = new Intl.DateTimeFormat('en-US', {timeZone:'Europe/Prague', weekday:'short'}).format(new Date());
  const opening = ['Fri','Sat','Sun'].includes(weekday) ? '11:00' : '15:00';
  const closing = ['Fri','Sat'].includes(weekday) ? '23:54' : '21:54';
  document.querySelector('#today-hours').textContent = `Dnes ${opening}–${closing}`;
  window.PiPizzaCheckout.create({cart, products, onComplete:renderCart});
  renderProducts();
  renderCart();
  measureCategories();
  syncRoute(true);
})();
