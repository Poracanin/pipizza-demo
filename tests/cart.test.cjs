const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

for (const version of ['', 'verze-2/']) {
  const {Cart, BASES, EXTRAS, unitPrice, ingredients, priceBreakdown} = require('../' + version + 'cart-model.js');
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../' + version + 'menu-data.js'), 'utf8'), context);
  const products = context.window.PIPIZZA_MENU;
  const margarita = products.find(product => product.number === 1);
  const broccoli = products.find(product => product.number === 19);
  const oregon = products.find(product => product.number === 20);
  const custom = products.find(product => product.number === 26);
  const check = (name, fn) => test(`${version || 'root/'} ${name}`, fn);

  check('updates each original price tier once while retaining other product prices', () => {
    const lowerTier = [1,2,3,12,16];
    for (const product of products.filter(item => item.type === 'pizza')) {
      assert.equal(product.price, lowerTier.includes(product.number) ? 219 : 229);
    }
    assert.equal(products.find(item => item.id === '27-chleba').price, 89);
    assert.equal(products.find(item => item.id === 'napoj-fanta').price, 41);
  });

  check('keeps base and customized pizzas separate and calculates quantity totals', () => {
    const cart = new Cart(products);
    cart.add(margarita.id);
    cart.add(margarita.id, {removed:['oregáno'], extras:['Šunka']}, 2);
    assert.equal(cart.items.length, 2);
    assert.equal(cart.count, 3);
    assert.equal(cart.total, 219 + 2 * 248);
    assert.deepEqual(cart.items[1].removed, ['oregáno']);
  });

  check('identical configurations merge regardless of selection order', () => {
    const cart = new Cart(products);
    cart.add(margarita.id, {extras:['Šunka','Kuře']});
    cart.add(margarita.id, {extras:['Kuře','Šunka']}, 2);
    assert.equal(cart.items.length, 1);
    assert.equal(cart.total, 3 * 277);
  });

  check('editing replaces the line, merges matches and leaves other variants alone', () => {
    const cart = new Cart(products);
    cart.add(margarita.id);
    const changed = cart.add(margarita.id, {extras:['Šunka']}, 2);
    cart.update(changed, {}, 3);
    assert.equal(cart.items.length, 1);
    assert.equal(cart.count, 4);
    assert.equal(cart.total, 876);
    cart.setQuantity(cart.items[0].id, 0);
    assert.equal(cart.total, 0);
  });

  check('custom recipe retains its three included ingredients and charges only the fourth onwards', () => {
    assert.equal(unitPrice(custom, {extras:['Šunka','Kuře','Niva']}), 229);
    assert.equal(unitPrice(custom, {extras:['Šunka','Kuře','Niva','Kukuřice']}), 258);
    assert.equal(unitPrice(custom, {extras:['Šunka','Šunka','Kuře','Niva']}), 229);
    assert.equal(unitPrice(custom, {extras:['Camembert','Mořské plody','Jalapeños']}), 229);
  });

  check('invalid edits preserve the original order', () => {
    const cart = new Cart(products);
    const line = cart.add(margarita.id);
    assert.throws(() => cart.update(line, {extras:['Unknown']}, 2));
    assert.throws(() => cart.update(line, {}, -1));
    assert.throws(() => cart.update(line, {base:'toString'}, 1));
    assert.throws(() => cart.update(line, {halfProductId:'missing'}, 1));
    assert.equal(cart.count, 1);
    assert.equal(cart.total, 219);
    const drink = products.find(product => product.type === 'drinks');
    assert.throws(() => cart.add(drink.id, {extras:['Šunka']}));
    assert.throws(() => cart.add(drink.id, {base:'cream'}));
    assert.throws(() => cart.add(margarita.id, {halfProductId:drink.id}));
    assert.throws(() => cart.add(margarita.id, {halfProductId:margarita.id}));
  });

  check('all three bases are selectable without a charge and keep distinct cart lines', () => {
    const cart = new Cart(products);
    assert.deepEqual(Object.keys(BASES), ['tomato','cream','mustard']);
    for (const base of Object.keys(BASES)) cart.add(margarita.id, {base});
    assert.equal(cart.items.length, 3);
    assert.equal(cart.total, 3 * 219);
    assert.equal(cart.get(cart.add(broccoli.id)).base, 'cream');
    assert.equal(cart.get(cart.add(oregon.id)).base, 'mustard');
    assert.ok(ingredients(broccoli).includes('Mozzarella'));
    assert.ok(!ingredients(broccoli).includes('Smetanový základ'));
    assert.equal(products.filter(item => item.type === 'pizza' && item.base === 'tomato').length, 24);
  });

  check('all requested new extras cost 29 crowns and chilli sauce is in the spicy menu', () => {
    const required = ['Eidam','Uzený sýr','Balkánský sýr','Camembert','Tvarůžky','Vysočina','Poličan','Uzené maso','Klobása','Paprikáš','Mořské plody','Čerstvá paprika','Brokolice','Pórek','Kysané zelí','Beraní rohy','Jalapeños','Chilli omáčka'];
    for (const item of required) {
      assert.ok(EXTRAS.includes(item));
      assert.equal(unitPrice(margarita, {extras:[item]}), 248);
    }
    assert.equal(products.find(item => item.id === '28-chilli-omacka').spicy, true);
  });

  check('only standard meat and cheese exchange one for one, never vegetables or premium extras', () => {
    assert.equal(unitPrice(margarita, {removed:['Mozzarella'], extras:['Šunka']}), 219);
    assert.equal(unitPrice(margarita, {removed:['Mozzarella'], extras:['Šunka','Kuře']}), 248);
    assert.equal(unitPrice(margarita, {removed:['čerstvá rajčata'], extras:['Šunka']}), 248);
    assert.equal(unitPrice(margarita, {removed:['Mozzarella'], extras:['Kukuřice']}), 248);
    assert.equal(unitPrice(margarita, {removed:['Mozzarella'], extras:['Camembert']}), 248);
    assert.equal(unitPrice(oregon, {removed:['šunka','anglická slanina'], extras:['Kuře','Niva']}), 229);
    assert.equal(unitPrice(oregon, {removed:['hermelín'], extras:['Kuře']}), 258);
  });

  check('half pizzas use the dearer half plus 12 and the same extra and swap rules', () => {
    const half = {halfProductId:oregon.id};
    assert.equal(unitPrice(margarita, half, products), 241);
    assert.equal(unitPrice(oregon, {halfProductId:margarita.id}, products), 241);
    assert.equal(unitPrice(margarita, {...half, extras:['Camembert','Jalapeños']}, products), 299);
    assert.equal(unitPrice(margarita, {...half, removed:['Mozzarella'], extras:['Šunka']}, products), 241);
    assert.equal(unitPrice(margarita, {...half, removed:['čerstvá rajčata'], extras:['Šunka']}, products), 270);
    assert.equal(priceBreakdown(margarita, {...half, extras:['Eidam']}, products).extrasPrice, 29);
    assert.equal(unitPrice(margarita, {halfProductId:custom.id, extras:['Šunka','Kuře','Niva','Jalapeños']}, products), 270);
  });

  check('half choices, bases and notes survive edits and keep variants separate', () => {
    const cart = new Cart(products);
    cart.add(margarita.id);
    const half = cart.add(margarita.id, {halfProductId:oregon.id, base:'cream', halfBase:'tomato', extras:['Eidam'], [version ? 'halfRemoved' : 'removed']:['pórek'], note:'Prosím nakrájet.'}, 2);
    assert.equal(cart.items.length, 2);
    assert.equal(cart.get(half).unitPrice, 270);
    assert.equal(cart.total, 759);
    const edited = cart.update(half, {...cart.get(half), halfBase:'mustard', extras:['Eidam','Chilli omáčka']}, 3);
    assert.equal(cart.get(edited).base, 'cream');
    assert.equal(cart.get(edited).halfBase, 'mustard');
    assert.equal(cart.get(edited).halfProductId, oregon.id);
    assert.equal(cart.get(edited).note, 'Prosím nakrájet.');
    assert.deepEqual(cart.get(edited)[version ? 'halfRemoved' : 'removed'], ['pórek']);
    assert.equal(cart.get(edited).unitPrice, 299);
    assert.equal(cart.total, 1116);
  });
}
