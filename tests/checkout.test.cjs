const test = require('node:test');
const assert = require('node:assert/strict');
const {totals,searchAddresses}=require('../checkout-model.js');
const {Cart}=require('../cart-model.js');

test('card demo rounds fee to halers and includes a tip, cash has neither',()=>{
 assert.deepEqual(totals(418,'card',20),{subtotal:418,cardFee:6.23,tip:20,delivery:0,total:444.23});
 assert.deepEqual(totals(418,'cash',20),{subtotal:418,cardFee:0,tip:0,delivery:0,total:418});
 assert.equal(totals(209,'card').total,212.11);
});
test('address suggestions ignore accents and match all typed tokens',()=>{
 assert.deepEqual(searchAddresses('181 jistebnik'),['Jistebník 181, 742 82 Jistebník']);
 assert.equal(searchAddresses('Neznámá adresa').length,0);
 assert.ok(searchAddresses('').length>0);
});
test('completed demo clears lines without invalidating the cart for a new order',()=>{
 const cart=new Cart([{id:'pizza',name:'Pizza',type:'pizza',price:209,description:'Mozzarella'}]);
 cart.add('pizza',{},2);cart.clear();assert.equal(cart.count,0);assert.equal(cart.total,0);
 cart.add('pizza');assert.equal(cart.count,1);assert.equal(cart.total,209);
});
test('invalid checkout amounts are rejected',()=>{
 assert.throws(()=>totals(-1,'card'));
 assert.throws(()=>totals(209,'card',-20));
 assert.throws(()=>totals(NaN));
});
