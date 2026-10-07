const test = require('node:test');
const assert = require('node:assert/strict');
const {totals,searchAddresses,paymentDetails,scheduledSlots,isScheduledTimeValid,deliveryEstimate}=require('../checkout-model.js');
const {Cart}=require('../cart-model.js');

test('pizza price includes card payment, delivery and box; only an optional tip is added',()=>{
 assert.deepEqual(totals(418,'card',20),{subtotal:418,cardFee:0,tip:20,delivery:0,total:438});
 assert.deepEqual(totals(418,'cash',20),{subtotal:418,cardFee:0,tip:0,delivery:0,total:418});
 assert.equal(totals(219,'card').total,219);
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

test('all online methods are free and include only the voluntary tip',()=>{
 for(const method of ['card','apple-pay','google-pay']) {
  assert.deepEqual(totals(209,method,20),{subtotal:209,cardFee:0,tip:20,delivery:0,total:229});
  assert.equal(paymentDetails(method).online,true);
 }
});
test('handover methods cannot inherit an online tip',()=>{
 assert.deepEqual(totals(209,'cash',50),{subtotal:209,cardFee:0,tip:0,delivery:0,total:209});
 assert.deepEqual(totals(209,'card-on-delivery',50),{subtotal:209,cardFee:0,tip:0,delivery:0,total:209});
 assert.deepEqual(totals(209,'qr-on-delivery',50),{subtotal:209,cardFee:0,tip:0,delivery:0,total:209});
 assert.equal(paymentDetails('card-on-delivery').online,false);
 assert.equal(paymentDetails('qr-on-delivery').online,false);
 assert.match(paymentDetails('qr-on-delivery').success,/účtence/);
});
test('unknown payment methods cannot silently receive cash totals',()=>{
 for(const method of ['unknown','toString','__proto__','']) assert.throws(()=>totals(209,method));
});


test('scheduled delivery has at least 75 minutes lead time and respects Prague opening hours',()=>{
 const now=Date.parse('2026-10-05T12:00:00Z'); // Monday, 14:00 in Prague.
 const slots=scheduledSlots(now);
 assert.equal(slots[0].value,'2026-10-05T13:15:00.000Z');
 assert.match(slots[0].label,/15:15/);
 assert.ok(slots.every(slot=>isScheduledTimeValid(slot.value,now)));
 assert.ok(slots.every(slot=>Date.parse(slot.value)-now>=75*60000));
 assert.equal(isScheduledTimeValid(slots[0].value,now),true);
 assert.equal(isScheduledTimeValid(slots[0].value,now+1),false);
 assert.equal(isScheduledTimeValid('2026-10-05T13:00:00.000Z',now),false);
 assert.equal(isScheduledTimeValid('2026-10-05T20:00:00.000Z',now),false); // 22:00, closed.
 assert.equal(isScheduledTimeValid('2026-10-05T13:17:00.000Z',now),false);
 for(const invalid of ['', 'not-a-date', '2026-10-05T15:15', '2026-10-05T13:15:00Z', '2026-10-20T13:15:00.000Z']) {
  assert.equal(isScheduledTimeValid(invalid,now),false);
 }
});
test('late orders offer the next opening and Friday supports later delivery',()=>{
 assert.equal(scheduledSlots(Date.parse('2026-10-05T19:50:00Z'))[0].value,'2026-10-06T13:00:00.000Z');
 const friday=Date.parse('2026-10-09T20:00:00Z');
 const slots=scheduledSlots(friday);
 assert.equal(slots[0].value,'2026-10-09T21:15:00.000Z');
 assert.ok(slots.some(slot=>slot.value==='2026-10-09T21:45:00.000Z'));
 assert.equal(isScheduledTimeValid('2026-10-09T22:00:00.000Z',friday),false);
});
test('Prague delivery slots remain at local opening time over both daylight-saving transitions',()=>{
 const spring=scheduledSlots(Date.parse('2026-03-28T22:00:00Z'))[0];
 const autumn=scheduledSlots(Date.parse('2026-10-24T22:00:00Z'))[0];
 assert.equal(spring.value,'2026-03-29T09:00:00.000Z');
 assert.equal(autumn.value,'2026-10-25T10:00:00.000Z');
 assert.match(spring.label,/11:00/);
 assert.match(autumn.label,/11:00/);
});
test('delivery radar has exactly the two requested levels',()=>{
 assert.deepEqual(deliveryEstimate(1),{level:1,label:'cca 40–60 minut',minutes:60});
 assert.deepEqual(deliveryEstimate(2),{level:2,label:'cca 1 hodina 25 minut',minutes:85});
 assert.throws(()=>deliveryEstimate(0));
 assert.throws(()=>deliveryEstimate(3));
 assert.ok(Object.isFrozen(deliveryEstimate(1)));
});
test('both design variants use identical checkout business rules',()=>{
 const second=require('../verze-2/checkout-model.js');
 const now=Date.parse('2026-10-05T12:00:00Z');
 assert.deepEqual(second.scheduledSlots(now),scheduledSlots(now));
 for(const method of ['card','apple-pay','google-pay','cash','card-on-delivery','qr-on-delivery']) {
  assert.deepEqual(second.totals(458,method,20),totals(458,method,20));
 }
});
test('shared browser delivery state emits a change once and rejects invalid levels',()=>{
 const vm=require('node:vm');
 const fs=require('node:fs');
 const events=[];
 const window={dispatchEvent:event=>events.push(event)};
 const context={window,Intl,CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../checkout-model.js'),'utf8'),context);
 assert.equal(window.PiDelivery.state.level,1);
 window.PiDelivery.setLevel(2);
 assert.equal(window.PiDelivery.state.level,2);
 assert.equal(events.length,1);
 assert.equal(events[0].type,'pi-delivery-change');
 assert.equal(events[0].detail.label,'cca 1 hodina 25 minut');
 window.PiDelivery.setLevel(2);
 assert.equal(events.length,1);
 assert.throws(()=>window.PiDelivery.setLevel(4));
 assert.equal(window.PiDelivery.state.level,2);
});
