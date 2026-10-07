(function (root) {
  'use strict';
  const EXTRA_PRICE = 29;
  const HALF_PRICE = 12;
  const BASES = {tomato:'Rajčatový', cream:'Smetanový', mustard:'Hořčicový'};
  const SWAP_INGREDIENTS = ['Mozzarella','Niva','Šunka','Kuře','Anglická slanina'];
  const EXTRA_GROUPS = [
    {title:'Klasické suroviny', icon:'sliders', items:SWAP_INGREDIENTS},
    {title:'Sýry', icon:'cheese', premium:true, items:['Eidam','Uzený sýr','Balkánský sýr','Camembert','Tvarůžky']},
    {title:'Maso', icon:'meat', premium:true, items:['Vysočina','Poličan','Uzené maso','Klobása','Paprikáš','Mořské plody']},
    {title:'Zelenina navíc', icon:'leaf', items:['Žampiony','Kukuřice','Olivy','Červená cibule','Čerstvá rajčata','Čerstvá paprika','Brokolice','Pórek','Kysané zelí','Beraní rohy','Jalapeños']},
    {title:'Něco ostřejšího', icon:'pepper', items:['Feferony','Česnek','Chilli omáčka']}
  ];
  const EXTRAS = EXTRA_GROUPS.flatMap(group => group.items);
  const defaultBase = product => product.type === 'pizza' ? product.base || (product.number === 19 ? 'cream' : product.number === 20 ? 'mustard' : 'tomato') : null;
  const findProduct = (products, id) => products instanceof Map ? products.get(id) : products.find(product => product.id === id);

  function ingredients(product) {
    if (product.type !== 'pizza' || product.number === 26) return [];
    return [...new Set(product.description.replace(/^(?:Rajčatový|Smetanový|Hořčicový) základ\.\s*/i, '').split(/,\s*/).map(value => value.trim().replace(/\.$/, '')).filter(Boolean))];
  }

  function configuration(product, changes = {}, products = []) {
    const halfProductId = changes.halfProductId || null;
    const half = halfProductId && findProduct(products, halfProductId);
    if (halfProductId && (product.type !== 'pizza' || !half || half.type !== 'pizza' || half.id === product.id)) throw new Error('Neplatná druhá polovina pizzy.');
    const base = changes.base || defaultBase(product);
    const halfBase = half ? changes.halfBase || defaultBase(half) : null;
    if (product.type === 'pizza' ? !Object.hasOwn(BASES, base) : base !== null) throw new Error('Neplatný základ pizzy.');
    if (halfBase && !Object.hasOwn(BASES, halfBase)) throw new Error('Neplatný základ druhé poloviny.');
    const allowedExtras = product.type === 'pizza' ? EXTRAS : [];
    const removed = [...new Set(changes.removed || [])].sort();
    const extras = [...new Set(changes.extras || [])].sort();
    const halfRemoved = [...new Set(changes.halfRemoved || [])].sort();
    const halfExtras = [...new Set(changes.halfExtras || [])].sort();
    if (removed.some(value => !ingredients(product).includes(value)) || extras.some(value => !allowedExtras.includes(value)) || halfRemoved.some(value => !half || !ingredients(half).includes(value)) || halfExtras.some(value => !half || !EXTRAS.includes(value))) throw new Error('Neplatná surovina.');
    const note = String(changes.note || '').trim().slice(0, 240);
    return {removed, extras, halfRemoved, halfExtras, note, base, halfProductId, halfBase};
  }

  function priceBreakdown(product, changes = {}, products = []) {
    const config = configuration(product, changes, products);
    const half = config.halfProductId && findProduct(products, config.halfProductId);
    // The custom recipe includes three ingredients once, also when selected as a half.
    const included = product.number === 26 || half?.number === 26 ? 3 : 0;
    const pizzaPrice = half ? Math.max(product.price, half.price) + HALF_PRICE : product.price;
    const swapNames = SWAP_INGREDIENTS.map(item => item.toLocaleLowerCase('cs'));
    let includedRemaining = included;
    // Allocate each free ingredient once. The UI and cart use this same breakdown.
    const scopeCharges = (id, removed, extras) => {
      const swapSlots = included ? 0 : removed.filter(item => swapNames.includes(item.toLocaleLowerCase('cs'))).length;
      let swapsRemaining = swapSlots;
      const charges = extras.map(ingredient => {
        if (includedRemaining > 0) {includedRemaining--; return {ingredient, price:0, reason:'included'};}
        if (swapsRemaining > 0 && SWAP_INGREDIENTS.includes(ingredient)) {swapsRemaining--; return {ingredient, price:0, reason:'swap'};}
        return {ingredient, price:EXTRA_PRICE, reason:'extra'};
      });
      return {id, charges, swapSlots, swapsRemaining, swaps:swapSlots - swapsRemaining};
    };
    const scopes = [scopeCharges('first', config.removed, config.extras), ...(half ? [scopeCharges('second', config.halfRemoved, config.halfExtras)] : [])];
    const swaps = scopes.reduce((sum, scope) => sum + scope.swaps, 0);
    const extrasPrice = scopes.flatMap(scope => scope.charges).reduce((sum, charge) => sum + charge.price, 0);
    return {pizzaPrice, extrasPrice, included, includedRemaining, swaps, scopes, total:pizzaPrice + extrasPrice};
  }
  const unitPrice = (product, changes = {}, products = []) => priceBreakdown(product, changes, products).total;

  function describeChanges(config, product, products = []) {
    const half = config.halfProductId && findProduct(products, config.halfProductId);
    const scopes = [[half ? `½ ${product.name}` : '', config.removed || [], config.extras || []], ...(half ? [[`½ ${half.name}`, config.halfRemoved || [], config.halfExtras || []]] : [])];
    return scopes.flatMap(([name, removed, extras]) => [removed.length ? `${name ? name + ' · ' : ''}Bez: ${removed.join(', ')}` : '', extras.length ? `${name ? name + ' · ' : ''}Navíc: ${extras.join(', ')}` : ''].filter(Boolean));
  }

  class Cart {
    constructor(products) {
      this.products = new Map(products.map(product => [product.id, product]));
      this.lines = new Map();
      this.sequence = 0;
    }
    get items() { return [...this.lines.values()]; }
    get count() { return this.items.reduce((sum, line) => sum + line.quantity, 0); }
    get total() { return this.items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0); }
    get(id) { return this.lines.get(id); }
    prepare(productId, changes, quantity) {
      const product = this.products.get(productId);
      if (!product) throw new Error('Neznámá položka.');
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Neplatný počet kusů.');
      const config = configuration(product, changes, this.products);
      return {productId, ...config, quantity, unitPrice: unitPrice(product, config, this.products), signature: JSON.stringify([productId, config.base, config.halfProductId, config.halfBase, config.removed, config.extras, config.halfRemoved, config.halfExtras, config.note])};
    }
    insert(prepared) {
      const existing = this.items.find(line => line.signature === prepared.signature);
      if (existing) { existing.quantity += prepared.quantity; return existing.id; }
      const id = `line-${++this.sequence}`;
      this.lines.set(id, {...prepared, id});
      return id;
    }
    add(productId, changes = {}, quantity = 1) { return this.insert(this.prepare(productId, changes, quantity)); }
    update(lineId, changes, quantity) {
      const existing = this.get(lineId);
      if (!existing) throw new Error('Položka už v objednávce není.');
      const prepared = this.prepare(existing.productId, changes, quantity);
      this.lines.delete(lineId);
      return this.insert(prepared);
    }
    setQuantity(lineId, quantity) {
      if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Neplatný počet kusů.');
      if (quantity === 0) this.remove(lineId);
      else if (this.get(lineId)) this.get(lineId).quantity = quantity;
    }
    remove(lineId) { this.lines.delete(lineId); }
    clear() { this.lines.clear(); }
  }
  const api = {describeChanges, Cart, BASES, EXTRA_GROUPS, SWAP_INGREDIENTS, EXTRAS, EXTRA_PRICE, HALF_PRICE, defaultBase, ingredients, configuration, priceBreakdown, unitPrice};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PiPizzaCart = api;
})(typeof window !== 'undefined' ? window : globalThis);
