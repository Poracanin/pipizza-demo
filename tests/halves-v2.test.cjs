const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {Cart, unitPrice, describeChanges, priceBreakdown} = require('../verze-2/cart-model.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../verze-2/menu-data.js'),'utf8'),context);
const products = context.window.PIPIZZA_MENU;
const ham = products.find(p=>p.number===2), oregon = products.find(p=>p.number===20), custom = products.find(p=>p.number===26);
test('v2 half toppings stay scoped, and equal-priced opposite configurations do not merge',()=>{
  const cart=new Cart(products);
  const left=cart.add(ham.id,{halfProductId:oregon.id,extras:['Camembert'],halfRemoved:['pórek']});
  const right=cart.add(ham.id,{halfProductId:oregon.id,halfExtras:['Camembert'],halfRemoved:['pórek']});
  assert.equal(cart.items.length,2); assert.equal(cart.total,540);
  assert.deepEqual(cart.get(left).extras,['Camembert']);assert.deepEqual(cart.get(left).halfExtras,[]);
  const edited=cart.update(right,{...cart.get(right),halfBase:'cream',halfExtras:['Camembert','Kuře']},2);
  assert.equal(cart.get(edited).unitPrice,299);
  assert.deepEqual(cart.get(edited).halfRemoved,['pórek']);
  assert.ok(describeChanges(cart.get(edited),ham,products).includes('½ Oregon · Navíc: Camembert, Kuře'));
});
test('v2 removed ingredients only fund swaps on the same half',()=>{
  const split={halfProductId:oregon.id,removed:['šunka'],halfExtras:['Niva']};
  assert.equal(unitPrice(ham,split,products),270);
  assert.equal(unitPrice(ham,{...split,halfRemoved:['šunka']},products),241);
  assert.equal(unitPrice(ham,{halfProductId:oregon.id,extras:['Camembert'],halfExtras:['Camembert']},products),299);
});
test('v2 rejects removals from the wrong half and extra half state on whole pizza atomically',()=>{
  const cart=new Cart(products); const id=cart.add(ham.id);
  assert.throws(()=>cart.update(id,{halfProductId:oregon.id,removed:['pórek']},1));
  assert.throws(()=>cart.update(id,{halfProductId:oregon.id,halfRemoved:['kukuřice']},1));
  assert.throws(()=>cart.update(id,{halfExtras:['Camembert']},1));
  assert.equal(cart.total,219);
});
test('v2 custom pizza includes three ingredients total even when split between both halves',()=>{
  assert.equal(unitPrice(ham,{halfProductId:custom.id,extras:['Niva'],halfExtras:['Camembert','Kuře']},products),241);
  assert.equal(unitPrice(ham,{halfProductId:custom.id,extras:['Niva','Kukuřice'],halfExtras:['Camembert','Kuře']},products),270);
});
test('v2 displayed ingredient charges match totals and exclude vegetable and premium exchanges',()=>{
  const scenarios = [
    {removed:['šunka'], extras:['Niva'], total:219, free:1},
    {removed:['kukuřice'], extras:['Niva'], total:248, free:0},
    {removed:['šunka'], extras:['Eidam'], total:248, free:0},
    {removed:['šunka'], extras:['Kukuřice'], total:248, free:0},
    {removed:['Mozzarella','šunka'], extras:['Niva','Kuře','Kukuřice'], total:248, free:2},
    {removed:['šunka'], extras:[], total:219, free:0}
  ];
  for (const scenario of scenarios) {
    const breakdown = priceBreakdown(ham, scenario, products);
    const charges = breakdown.scopes.flatMap(scope=>scope.charges);
    assert.equal(breakdown.total, scenario.total);
    assert.equal(charges.filter(charge=>charge.price===0).length, scenario.free);
    assert.equal(breakdown.pizzaPrice + charges.reduce((sum,charge)=>sum+charge.price,0), breakdown.total);
  }
  const cheese = products.find(p=>p.number===4);
  const premiumRemoval = priceBreakdown(cheese,{removed:['eidam'],extras:['Kuře']},products);
  assert.equal(premiumRemoval.swaps,0);
  assert.equal(premiumRemoval.extrasPrice,29);
});
test('v2 free ingredient allocations cannot cross halves or consume custom allowances twice',()=>{
  const split=priceBreakdown(ham,{halfProductId:oregon.id,removed:['šunka'],extras:['Niva'],halfExtras:['Kuře']},products);
  assert.equal(split.scopes[0].charges[0].reason,'swap');
  assert.equal(split.scopes[1].charges[0].price,29);
  assert.equal(split.scopes[1].swapSlots,0);
  const recipe=priceBreakdown(ham,{halfProductId:custom.id,extras:['Niva','Kukuřice'],halfExtras:['Camembert','Kuře']},products);
  assert.equal(recipe.scopes.flatMap(scope=>scope.charges).filter(charge=>charge.reason==='included').length,3);
  assert.equal(recipe.includedRemaining,0);
  assert.equal(recipe.extrasPrice,29);
});
test('v2 restoring a removed ingredient recalculates every ordered piece and undo restores the free swap',()=>{
  const cart=new Cart(products);
  let id=cart.add(ham.id,{removed:['šunka'],extras:['Niva']},2);
  assert.equal(cart.total,438);
  id=cart.update(id,{extras:['Niva']},2);
  assert.equal(cart.total,496);
  id=cart.update(id,{removed:['šunka'],extras:['Niva']},2);
  assert.equal(cart.total,438);
  assert.equal(cart.get(id).unitPrice,219);
});
