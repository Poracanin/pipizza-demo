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
    card: {label:'Karta online', online:true, cardFee:true, success:'Zaplaceno kartou'},
    'apple-pay': {label:'Apple Pay', online:true, cardFee:true, success:'Zaplaceno přes Apple Pay', logo:'apple-pay'},
    'google-pay': {label:'Google Pay', online:true, cardFee:true, success:'Zaplaceno přes Google Pay', logo:'google-pay'},
    cash: {label:'Hotově při převzetí', online:false, cardFee:false, success:'Hotově při převzetí'},
    'card-on-delivery': {label:'Kartou při převzetí', online:false, cardFee:true, success:'Kartou při převzetí'}
  };
  function paymentDetails(method) {
    if (!Object.hasOwn(PAYMENTS, method)) throw new Error('Neplatný způsob platby.');
    return PAYMENTS[method];
  }
  function totals(subtotal, payment = 'cash', tip = 0) {
    if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(tip) || tip < 0) throw new Error('Neplatná cena.');
    const method = paymentDetails(payment);
    const base = Math.round(subtotal * 100);
    const cardFee = method.cardFee ? Math.round(base * .0149) : 0;
    const gratuity = method.online ? Math.round(tip * 100) : 0;
    return {subtotal:base / 100, cardFee:cardFee / 100, tip:gratuity / 100, delivery:0, total:(base + cardFee + gratuity) / 100};
  }
  const api = {ADDRESSES, searchAddresses, paymentDetails, totals};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PiPizzaCheckoutModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
