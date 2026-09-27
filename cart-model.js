(function (root) {
  'use strict';
  const EXTRA_PRICE = 29;
  const EXTRAS = ['Mozzarella', 'Šunka', 'Kuře', 'Žampiony', 'Kukuřice', 'Olivy', 'Niva', 'Červená cibule', 'Anglická slanina', 'Feferony', 'Česnek', 'Čerstvá rajčata'];

  function ingredients(product) {
    if (product.type !== 'pizza' || product.number === 26) return [];
    return [...new Set(product.description.split(/,\s*|\.\s+(?=Mozzarella)/i).map(value => value.trim().replace(/\.$/, '')).filter(Boolean))];
  }

  function configuration(product, changes = {}) {
    const allowedRemoved = ingredients(product);
    const allowedExtras = product.type === 'pizza' ? EXTRAS : [];
    const removed = [...new Set(changes.removed || [])].sort();
    const extras = [...new Set(changes.extras || [])].sort();
    if (removed.some(value => !allowedRemoved.includes(value)) || extras.some(value => !allowedExtras.includes(value))) throw new Error('Neplatná surovina.');
    const note = String(changes.note || '').trim().slice(0, 240);
    return {removed, extras, note};
  }

  function unitPrice(product, changes = {}) {
    const {extras} = configuration(product, changes);
    const included = product.number === 26 ? 3 : 0;
    return product.price + Math.max(0, extras.length - included) * EXTRA_PRICE;
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
      const config = configuration(product, changes);
      return {productId, ...config, quantity, unitPrice: unitPrice(product, config), signature: JSON.stringify([productId, config.removed, config.extras, config.note])};
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
  const api = {Cart, EXTRAS, EXTRA_PRICE, ingredients, configuration, unitPrice};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PiPizzaCart = api;
})(typeof window !== 'undefined' ? window : globalThis);
