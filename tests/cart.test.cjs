const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {Cart, unitPrice, ingredients} = require('../cart-model.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../menu-data.js'), 'utf8'), context);
const products = context.window.PIPIZZA_MENU;
const margarita = products.find(product => product.number === 1);
const custom = products.find(product => product.number === 26);

test('keeps base and customized pizzas separate and calculates quantity totals', () => {
  const cart = new Cart(products);
  cart.add(margarita.id);
  cart.add(margarita.id, {removed:['oregáno'], extras:['Šunka']}, 2);
  assert.equal(cart.items.length, 2);
  assert.equal(cart.count, 3);
  assert.equal(cart.total, 209 + 2 * 238);
  assert.deepEqual(cart.items[1].removed, ['oregáno']);
});

test('identical configurations merge regardless of selection order', () => {
  const cart = new Cart(products);
  cart.add(margarita.id, {extras:['Šunka','Kuře']});
  cart.add(margarita.id, {extras:['Kuře','Šunka']}, 2);
  assert.equal(cart.items.length, 1);
  assert.equal(cart.total, 3 * 267);
});

test('editing replaces the line, merges matches and leaves other variants alone', () => {
  const cart = new Cart(products);
  cart.add(margarita.id);
  const changed = cart.add(margarita.id, {extras:['Šunka']}, 2);
  cart.update(changed, {}, 3);
  assert.equal(cart.items.length, 1);
  assert.equal(cart.count, 4);
  assert.equal(cart.total, 836);
  cart.setQuantity(cart.items[0].id, 0);
  assert.equal(cart.total, 0);
});

test('custom pizza includes three ingredients and charges only the fourth onwards', () => {
  assert.equal(unitPrice(custom, {extras:['Šunka','Kuře','Niva']}), 219);
  assert.equal(unitPrice(custom, {extras:['Šunka','Kuře','Niva','Kukuřice']}), 248);
  assert.equal(unitPrice(custom, {extras:['Šunka','Šunka','Kuře','Niva']}), 219);
});

test('invalid edits preserve the original order', () => {
  const cart = new Cart(products);
  const line = cart.add(margarita.id);
  assert.throws(() => cart.update(line, {extras:['Unknown']}, 2));
  assert.throws(() => cart.update(line, {}, -1));
  assert.equal(cart.count, 1);
  assert.equal(cart.total, 209);
  assert.throws(() => cart.add(products.find(product => product.type === 'drinks').id, {extras:['Šunka']}));
});

test('cream and mustard bases can be selected independently of mozzarella', () => {
  const broccoli = products.find(product => product.number === 19);
  assert.ok(ingredients(broccoli).includes('Smetanový základ'));
  assert.ok(ingredients(broccoli).includes('Mozzarella'));
});

test('product notes survive edits and separate otherwise identical pizzas', () => {
  const cart = new Cart(products);
  cart.add(margarita.id);
  const line = cart.add(margarita.id, {note:'Prosím nakrájet.'});
  assert.equal(cart.items.length, 2);
  assert.equal(cart.get(line).note, 'Prosím nakrájet.');
  const updated = cart.update(line, {extras:['Niva'], note:'Prosím nakrájet.'}, 2);
  assert.equal(cart.get(updated).note, 'Prosím nakrájet.');
  assert.equal(cart.total, 685);
});
