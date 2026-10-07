(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.PiPizzaAdmin = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEMO_DATE = '2026-10-05';
  const FIRST_DATE = '2026-09-01';
  const METHODS = Object.freeze({cash: 'Hotově', card: 'Kartou na místě', qr: 'QR kódem', online: 'Online'});
  function validDate(date) {
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  }
  function previousDay(date) {
    if (!validDate(date)) throw new Error('Neplatné datum.');
    return new Date(Date.parse(date) - 86400000).toISOString().slice(0, 10);
  }
  function dateInDemo(date) {
    if (!validDate(date) || date < FIRST_DATE || date > DEMO_DATE) throw new Error('Vyberte den v ukázkovém období.');
  }
  function makeOrders() {
    const orders = [];
    // Include the preceding day so the first selectable two-day report is complete.
    let date = previousDay(FIRST_DATE);
    let day = 0;
    const methods = Object.keys(METHODS);
    while (date <= DEMO_DATE) {
      const count = 17 + (day * 7 % 16);
      for (let i = 0; i < count; i += 1) {
        const amount = [219, 229, 438, 458, 687, 916, 487, 716][(day + i) % 8];
        const id = `PP-${date.replaceAll('-', '').slice(2)}-${String(i + 1).padStart(3, '0')}`;
        const unpaid = (date === '2026-10-03' && i === 3) || (date === '2026-10-04' && i === 5) || (date === DEMO_DATE && i === 2);
        orders.push({id, date, amount, method: methods[(day + i) % 4], paid: !unpaid,
          status: i === count - 1 && day % 4 === 0 ? 'cancelled' : 'completed',
          fulfillment: i % 4 === 0 ? 'pickup' : 'delivery',
          time: `${String(15 + Math.floor(i / 5)).padStart(2, '0')}:${String((i * 11 + day) % 60).padStart(2, '0')}`});
      }
      date = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
      day += 1;
    }
    return orders;
  }
  const ORDERS = Object.freeze(makeOrders().map(order => Object.freeze(order)));
  function createState() { return {settlements: {}, closures: {}}; }
  function summarize(date, period = 'day', orders = ORDERS) {
    dateInDemo(date);
    if (!['day', 'two-days', 'month'].includes(period)) throw new Error('Neplatné období.');
    const from = period === 'month' ? date.slice(0, 7) + '-01' : period === 'two-days' ? previousDay(date) : date;
    const rows = orders.filter(order => order.status === 'completed' && order.date >= from && order.date <= date);
    const total = rows.reduce((sum, order) => sum + order.amount, 0);
    return {from, to: date, total, count: rows.length, average: rows.length ? total / rows.length : 0,
      delivery: rows.filter(order => order.fulfillment === 'delivery').length,
      pickup: rows.filter(order => order.fulfillment === 'pickup').length};
  }
  function outstanding(date, state, orders = ORDERS) {
    dateInDemo(date);
    return orders.filter(order => order.status === 'completed' && order.date <= date && !order.paid &&
      (!state.settlements[order.id] || state.settlements[order.id].date > date));
  }
  function receipts(date, state, orders = ORDERS) {
    dateInDemo(date);
    const byMethod = {cash: 0, card: 0, qr: 0, online: 0};
    let debtReceived = 0;
    for (const order of orders) {
      if (order.status !== 'completed') continue;
      if (order.paid && order.date === date) byMethod[order.method] += order.amount;
      const settlement = state.settlements[order.id];
      if (!order.paid && settlement && settlement.date === date) {
        byMethod[settlement.method] += order.amount;
        if (order.date < date) debtReceived += order.amount;
      }
    }
    return {byMethod, total: Object.values(byMethod).reduce((sum, value) => sum + value, 0), debtReceived};
  }
  function settleDebt(state, id, date, method, orders = ORDERS) {
    dateInDemo(date);
    if (!Object.hasOwn(METHODS, method)) throw new Error('Vyberte způsob úhrady.');
    if (state.closures[date]) throw new Error('Tento den už má uloženou uzávěrku.');
    if (Object.keys(state.closures).some(closedDate => closedDate >= date)) throw new Error('Úhradu nelze zapsat před již uloženou uzávěrku.');
    if (state.settlements[id]) throw new Error('Tento dluh už je v ukázce uhrazený.');
    if (!outstanding(date, state, orders).some(order => order.id === id)) throw new Error('Dluh nelze k vybranému dni uhradit.');
    return {...state, settlements: {...state.settlements, [id]: {date, method}}};
  }
  function closeDay(state, date, countedCash, orders = ORDERS) {
    dateInDemo(date);
    if (state.closures[date]) throw new Error('Uzávěrka tohoto dne už byla uložena.');
    if (!Number.isFinite(countedCash) || countedCash < 0 || Math.abs(countedCash * 100 - Math.round(countedCash * 100)) > 1e-6) throw new Error('Zadejte platnou hotovost na dvě desetinná místa.');
    const sales = summarize(date, 'day', orders);
    const received = receipts(date, state, orders);
    const debts = outstanding(date, state, orders);
    const closure = {date, revenue: sales.total, count: sales.count, received: received.total,
      payments: received.byMethod, debtReceived: received.debtReceived,
      unpaid: debts.reduce((sum, order) => sum + order.amount, 0),
      expectedCash: received.byMethod.cash, countedCash, cashDifference: Math.round((countedCash - received.byMethod.cash) * 100) / 100};
    return {...state, closures: {...state.closures, [date]: closure}};
  }
  // Restore only valid demo operations; browser storage is never trusted as business data.
  function restoreState(value) {
    let state = createState();
    if (!value || typeof value !== 'object') return state;
    const settlements = value.settlements && typeof value.settlements === 'object' ? value.settlements : {};
    for (const [id, payment] of Object.entries(settlements)) {
      if (!payment || typeof payment !== 'object') continue;
      try { state = settleDebt(state, id, payment.date, payment.method); } catch (_) { /* Ignore invalid demo records. */ }
    }
    const closures = value.closures && typeof value.closures === 'object' ? value.closures : {};
    for (const [date, closure] of Object.entries(closures)) {
      if (!closure || typeof closure !== 'object') continue;
      try { state = closeDay(state, date, closure.countedCash); } catch (_) { /* Ignore invalid demo records. */ }
    }
    return state;
  }
  return {DEMO_DATE, FIRST_DATE, METHODS, ORDERS, createState, summarize, outstanding, receipts, settleDebt, closeDay, restoreState, previousDay};
});
