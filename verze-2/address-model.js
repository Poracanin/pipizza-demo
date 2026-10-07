(function(root) {
  'use strict';
  const normalize = text => String(text).toLocaleLowerCase('cs').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const indexAddresses = rows => rows.map(row => ({...row, search:normalize(row.label)}));
  function searchAddresses(rows, query) {
    const normalized = normalize(query);
    if (normalized.length < 3) return [];
    const tokens = normalized.split(' ').filter(Boolean);
    return rows.filter(row => tokens.every(token => /^\d+$/.test(token) ? row.search.split(' ').includes(token) : row.search.includes(token))).slice(0, 8);
  }
  const api = {normalize,indexAddresses,searchAddresses};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PiAddressModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
