(function(root) {
  'use strict';
  // Local demo suggestions. No address or customer data is sent to a service.
  const ADDRESSES = [
    'Jistebník 181, 742 82 Jistebník',
    'Jistebník 25, 742 82 Jistebník',
    'Jistebník 120, 742 82 Jistebník',
    'Jistebník 256, 742 82 Jistebník',
    'Polanka nad Odrou, Ostrava',
    'Klimkovice', 'Košatka, Stará Ves nad Ondřejnicí',
    'Albrechtičky', 'Studénka', 'Velké Albrechtice'
  ];
  const normalize = text => String(text).toLocaleLowerCase('cs').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  function searchAddresses(query) {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return ADDRESSES.slice(0,4);
    return ADDRESSES.filter(address => tokens.every(token => normalize(address).includes(token))).slice(0,6);
  }
  const PAYMENTS = {
    card: {label:'Karta online', online:true, success:'Zaplaceno kartou'},
    'apple-pay': {label:'Apple Pay', online:true, success:'Zaplaceno přes Apple Pay', logo:'apple-pay'},
    'google-pay': {label:'Google Pay', online:true, success:'Zaplaceno přes Google Pay', logo:'google-pay'},
    cash: {label:'Hotově při převzetí', online:false, success:'Hotově při převzetí'},
    'card-on-delivery': {label:'Kartou při převzetí', online:false, success:'Kartou při převzetí'},
    'qr-on-delivery': {label:'QR kódem při převzetí', online:false, success:'QR kódem při převzetí · QR kód také na účtence'}
  };
  function paymentDetails(method) {
    if (!Object.hasOwn(PAYMENTS, method)) throw new Error('Neplatný způsob platby.');
    return PAYMENTS[method];
  }
  function totals(subtotal, payment = 'cash', tip = 0) {
    if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(tip) || tip < 0) throw new Error('Neplatná cena.');
    const method = paymentDetails(payment);
    const base = Math.round(subtotal * 100);
    const gratuity = method.online ? Math.round(tip * 100) : 0;
    return {subtotal:base / 100, cardFee:0, tip:gratuity / 100, delivery:0, total:(base + gratuity) / 100};
  }
  const TIME_ZONE = 'Europe/Prague';
  const MIN_LEAD_MINUTES = 75;
  const SLOT_MINUTES = 15;
  const SLOT_WINDOW_DAYS = 7;
  const pragueClock = new Intl.DateTimeFormat('en-GB', {timeZone:TIME_ZONE, weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  const slotLabel = new Intl.DateTimeFormat('cs-CZ', {timeZone:TIME_ZONE, weekday:'short', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit'});
  function withinOpeningHours(timestamp) {
    const parts = Object.fromEntries(pragueClock.formatToParts(timestamp).map(part=>[part.type,part.value]));
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    const opens = ['Fri','Sat','Sun'].includes(parts.weekday) ? 11 * 60 : 15 * 60;
    const closes = ['Fri','Sat'].includes(parts.weekday) ? 23 * 60 + 54 : 21 * 60 + 54;
    return minutes >= opens && minutes <= closes;
  }
  function isScheduledTimeValid(value, now = Date.now()) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(value)) return false;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value &&
      timestamp >= now + MIN_LEAD_MINUTES * 60000 &&
      timestamp <= now + SLOT_WINDOW_DAYS * 86400000 &&
      timestamp % (SLOT_MINUTES * 60000) === 0 && withinOpeningHours(timestamp);
  }
  function scheduledSlots(now = Date.now()) {
    if (!Number.isFinite(now)) throw new Error('Neplatný čas.');
    const interval = SLOT_MINUTES * 60000;
    const first = Math.ceil((now + MIN_LEAD_MINUTES * 60000) / interval) * interval;
    const end = now + SLOT_WINDOW_DAYS * 86400000;
    const slots = [];
    for (let timestamp = first; timestamp <= end; timestamp += interval) {
      if (withinOpeningHours(timestamp)) slots.push({value:new Date(timestamp).toISOString(), label:slotLabel.format(timestamp)});
    }
    return slots;
  }
  function deliveryEstimate(level = 1) {
    if (level !== 1 && level !== 2) throw new Error('Stav rozvozu musí být 1 nebo 2.');
    return Object.freeze(level === 1
      ? {level:1, label:'cca 40–60 minut', minutes:60}
      : {level:2, label:'cca 1 hodina 25 minut', minutes:85});
  }
  const api = {ADDRESSES, searchAddresses, paymentDetails, totals, scheduledSlots, isScheduledTimeValid, deliveryEstimate, TIME_ZONE, MIN_LEAD_MINUTES};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.PiPizzaCheckoutModel = api;
    let state = deliveryEstimate(1);
    root.PiDelivery = {
      get state() { return state; },
      setLevel(level) {
        const next = deliveryEstimate(level);
        if (next.level !== state.level) {
          state = next;
          root.dispatchEvent(new CustomEvent('pi-delivery-change', {detail:state}));
        }
        return state;
      }
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
