const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../admin-model.js');

const fixtures = [
  {id:'a',date:'2026-09-30',amount:219,method:'cash',paid:true,status:'completed',fulfillment:'delivery'},
  {id:'b',date:'2026-10-01',amount:458,method:'card',paid:true,status:'completed',fulfillment:'pickup'},
  {id:'c',date:'2026-10-01',amount:229,method:'cash',paid:false,status:'completed',fulfillment:'delivery'},
  {id:'d',date:'2026-10-01',amount:916,method:'qr',paid:true,status:'cancelled',fulfillment:'delivery'},
  {id:'e',date:'2026-10-02',amount:687,method:'online',paid:true,status:'completed',fulfillment:'delivery'},
];

test('day, two-day and month reports include unpaid completed sales and exclude cancellations', () => {
  assert.equal(model.summarize('2026-10-01','day',fixtures).total,687);
  assert.equal(model.summarize('2026-10-01','day',fixtures).count,2);
  assert.equal(model.summarize('2026-10-01','two-days',fixtures).total,906);
  assert.equal(model.summarize('2026-10-01','month',fixtures).total,687);
  assert.equal(model.summarize('2026-10-02','month',fixtures).total,1374);
  assert.equal(model.summarize('2026-10-01','day',fixtures).pickup,1);
});

test('settling an earlier debt increases received payments without counting the sale twice', () => {
  const initial = model.createState();
  const next = model.settleDebt(initial,'c','2026-10-02','qr',fixtures);
  assert.deepEqual(model.receipts('2026-10-02',next,fixtures),{
    byMethod:{cash:0,card:0,qr:229,online:687},total:916,debtReceived:229,
  });
  assert.equal(model.summarize('2026-10-02','day',fixtures).total,687);
  assert.equal(model.outstanding('2026-10-02',next,fixtures).length,0);
  assert.equal(model.outstanding('2026-10-01',next,fixtures).length,1);
  assert.equal(model.outstanding('2026-10-02',initial,fixtures).length,1);
  assert.throws(() => model.settleDebt(next,'c','2026-10-02','cash',fixtures));
  assert.throws(() => model.settleDebt(initial,'c','2026-09-30','cash',fixtures));
  assert.throws(() => model.settleDebt(initial,'c','2026-10-02','unknown',fixtures));
});

test('closure snapshots reconcile actual cash and prevent operations that change a saved report', () => {
  const paid = model.settleDebt(model.createState(),'c','2026-10-02','cash',fixtures);
  const closed = model.closeDay(paid,'2026-10-02',200,fixtures);
  assert.equal(closed.closures['2026-10-02'].expectedCash,229);
  assert.equal(closed.closures['2026-10-02'].cashDifference,-29);
  assert.equal(closed.closures['2026-10-02'].received,916);
  assert.equal(closed.closures['2026-10-02'].revenue,687);
  assert.throws(() => model.closeDay(closed,'2026-10-02',229,fixtures));
  const unpaidClosed = model.closeDay(model.createState(),'2026-10-02',0,fixtures);
  assert.throws(() => model.settleDebt(unpaidClosed,'c','2026-10-01','cash',fixtures));
  assert.throws(() => model.settleDebt(unpaidClosed,'c','2026-10-02','cash',fixtures));
  assert.equal(model.settleDebt(unpaidClosed,'c','2026-10-03','cash',fixtures).settlements.c.date,'2026-10-03');
  for(const amount of [-1,NaN,Infinity,1.234]) assert.throws(() => model.closeDay(paid,'2026-10-02',amount,fixtures));
});

test('demo data supports the full first two-day period and sums by payment method consistently', () => {
  assert.ok(model.ORDERS.some(order => order.date === model.previousDay(model.FIRST_DATE)));
  const state = model.createState();
  for (const date of [model.FIRST_DATE,'2026-09-30','2026-10-01',model.DEMO_DATE]) {
    const day = model.summarize(date);
    const received = model.receipts(date,state);
    const newDebt = model.outstanding(date,state).filter(order => order.date === date).reduce((sum,order) => sum+order.amount,0);
    assert.equal(day.total,received.total + newDebt);
    assert.equal(received.total,Object.values(received.byMethod).reduce((sum,amount) => sum+amount,0));
  }
});

test('invalid dates and invalid stored demo records cannot enter the report', () => {
  for(const date of ['2026-10-32','2026-09-31','2026-10-06','2026-08-30','',null]) assert.throws(() => model.summarize(date));
  const debt = model.outstanding(model.DEMO_DATE,model.createState())[0];
  const paid = model.settleDebt(model.createState(),debt.id,model.DEMO_DATE,'qr');
  const closed = model.closeDay(paid,model.DEMO_DATE,model.receipts(model.DEMO_DATE,paid).byMethod.cash);
  assert.deepEqual(model.restoreState(JSON.parse(JSON.stringify(closed))),closed);
  assert.deepEqual(model.restoreState({settlements:{madeup:{date:model.DEMO_DATE,method:'cash'}},closures:{'2026-10-05':{countedCash:-1}}}),model.createState());
});
