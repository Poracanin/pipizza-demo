const test = require('node:test');
const assert = require('node:assert/strict');
const {totals,searchAddresses,paymentDetails}=require('../checkout-model.js');
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

test('all online methods include the same card fee and voluntary tip',()=>{
 for(const method of ['card','apple-pay','google-pay']) {
  assert.deepEqual(totals(209,method,20),{subtotal:209,cardFee:3.11,tip:20,delivery:0,total:232.11});
  assert.equal(paymentDetails(method).online,true);
 }
});
test('handover methods cannot inherit an online tip',()=>{
 assert.deepEqual(totals(209,'cash',50),{subtotal:209,cardFee:0,tip:0,delivery:0,total:209});
 assert.deepEqual(totals(209,'card-on-delivery',50),{subtotal:209,cardFee:3.11,tip:0,delivery:0,total:212.11});
 assert.equal(paymentDetails('card-on-delivery').online,false);
});
test('unknown payment methods cannot silently receive cash totals',()=>{
 for(const method of ['unknown','toString','__proto__','']) assert.throws(()=>totals(209,method));
});
