(function(root) {
  'use strict';
  const normalize = text => String(text).toLocaleLowerCase('cs').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const indexAddresses = rows => rows.map(row => ({...row, search:normalize([row.label, ...(row.aliases || [])].join(' ')), placeSearch:normalize([row.town, ...(row.aliases || [])].join(' '))}));
  // A bare orientation number also finds its letter suffix (6 → 6s), never 60.
  const matchesToken = (search, token) => /^\d+[a-z]?$/.test(token)
    ? search.split(' ').some(word => word === token || (/^\d+$/.test(token) && new RegExp('^' + token + '[a-z]$').test(word)))
    : search.includes(token);
  function searchAddresses(rows, query) {
    const normalized = normalize(query);
    if (normalized.length < 3) return [];
    const tokens = normalized.split(' ').filter(Boolean);
    const placeTokens = tokens.filter(token => !/^\d/.test(token));
    const rank = row => placeTokens.length && placeTokens.every(token => row.placeSearch.includes(token)) ? 0 : 1;
    return rows.filter(row => tokens.every(token => matchesToken(row.search, token))).sort((a,b)=>rank(a)-rank(b)).slice(0, 8);
  }
  const api = {normalize,indexAddresses,searchAddresses};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PiAddressModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
