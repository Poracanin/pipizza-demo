(function(root) {
  'use strict';
  const {normalize,indexAddresses,searchAddresses} = root.PiAddressModel;
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let addressesPromise;
  function loadAddresses() {
    if (!addressesPromise) addressesPromise = fetch('data/addresses.json').then(response => {
      if (!response.ok) throw new Error('Adresář se nepodařilo načíst.');
      return response.json();
    }).then(indexAddresses).catch(error => {addressesPromise = null; throw error;});
    return addressesPromise;
  }
  function bindAddress({input, results, clear, status, onSelect, onInvalidate}) {
    let revision = 0, matches = [], active = -1, selected = null;
    function close() { revision++; results.hidden = true; input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); active = -1; }
    function invalidate() { selected = null; onInvalidate?.(); clear.hidden = !input.value; }
    function choose(index) {
      const item = matches[index]; if (!item) return;
      selected = item; input.value = item.label; clear.hidden = false; close();
      status.textContent = 'Adresa je v oblasti rozvozu.';
      onSelect(item); input.blur();
    }
    async function refresh() {
      close(); const request = revision;
      if (normalize(input.value).length < 3) {status.textContent = 'Napište alespoň 3 znaky a vyberte přesnou adresu.'; return;}
      status.textContent = 'Hledáme adresu…';
      try {
        const rows = await loadAddresses();
        if (request !== revision) return;
        matches = searchAddresses(rows, input.value);
        results.innerHTML = matches.map((item,index) => `<button type="button" role="option" aria-selected="false" id="${results.id}-${index}" data-address-index="${index}"><span>${escape(item.label)}<small>${escape(item.town)} · rozvoz zdarma</small></span><span aria-hidden="true">↗</span></button>`).join('');
        results.hidden = !matches.length; input.setAttribute('aria-expanded',String(!!matches.length));
        status.textContent = matches.length ? 'Vyberte přesnou adresu z nabídky.' : 'Adresu jsme v oblasti rozvozu nenašli. Zkuste obec a číslo domu, případně zavolejte 720 400 500.';
      } catch (_) { if (request === revision) status.textContent = 'Adresář se nepodařilo načíst. Zkuste psát znovu nebo zavolejte 720 400 500.'; }
    }
    input.addEventListener('input', () => { invalidate(); void refresh(); });
    input.addEventListener('focus', () => {if (!selected) void refresh();});
    input.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (event.key === 'Escape' && !results.hidden) {event.preventDefault();event.stopPropagation();close();}
      if (['ArrowDown','ArrowUp'].includes(event.key)) {
        event.preventDefault(); if (results.hidden) {void refresh(); return;} if (!matches.length) return;
        active = (active + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
        results.querySelectorAll('[role="option"]').forEach((option,index) => {option.setAttribute('aria-selected',String(index === active)); if (index === active) {input.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'});}});
      }
      if (event.key === 'Enter') {event.preventDefault(); if (!results.hidden && active >= 0) choose(active); else if (!selected) void refresh();}
      if (event.key === 'Tab') close();
    });
    results.addEventListener('pointerdown', event => {if (event.target.closest('[data-address-index]')) event.preventDefault();});
    results.addEventListener('click', event => {const option = event.target.closest('[data-address-index]'); if (option) choose(Number(option.dataset.addressIndex));});
    clear.addEventListener('click', () => {input.value = ''; invalidate(); close(); input.focus();});
    document.addEventListener('click', event => {if (!input.parentElement.contains(event.target)) close();});
    return {close, selected:() => selected, reset:() => {input.value = ''; invalidate(); close();}};
  }
  const maps = new WeakMap();
  function mapAt(container) {
    if (maps.has(container)) return maps.get(container);
    if (!root.L) { container.textContent = 'Mapu se nepodařilo načíst. Obnovte prosím stránku.'; return null; }
    const map = L.map(container, {scrollWheelZoom:false, zoomControl:true, zoomSnap:.25}).setView([49.7534022,18.1287856],11);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · ČÚZK / RÚIAN'}).addTo(map);
    const note = document.createElement('p');note.className='map-tile-note';note.hidden=true;note.textContent='Podklad mapy je dočasně nedostupný. Vybraná poloha a hranice zůstávají zobrazené.';container.append(note);
    tiles.on('tileerror',()=>{note.hidden=false;});tiles.on('tileload',()=>{note.hidden=true;});
    new ResizeObserver(()=>{
      map.invalidateSize();
      const current=maps.get(container);
      if(current?.bounds && !current.marker) map.fitBounds(current.bounds,{padding:[18,18],animate:false});
    }).observe(container);
    const state = {map,marker:null};maps.set(container,state);return state;
  }
  function showAddress(container, address) {
    container.hidden = false;
    const state = mapAt(container); if (!state) return;
    if (state.marker) {state.marker.remove(); state.marker = null;}
    if (!address?.point) {container.hidden = true;return;}
    const label = document.createElement('span'); label.textContent = address.label;
    state.marker = L.marker(address.point,{icon:L.divIcon({className:'house-pin',html:'<span aria-hidden="true">⌂</span>',iconSize:[36,44],iconAnchor:[18,44]}),title:address.label}).addTo(state.map).bindPopup(label);
    state.map.invalidateSize();state.map.setView(address.point,18,{animate:false});state.marker.openPopup();
    container.dataset.addressId = address.id;
  }
  root.PiDeliveryMap = {bindAddress, showAddress, loadAddresses, searchAddresses};
  const container = document.querySelector('#coverage-map');
  let coverage, loading;
  async function initCoverage() {
    if (coverage) return coverage;
    if (loading) return loading;
    loading = (async () => {
      const state = mapAt(container);if (!state) return null;
      const response = await fetch('data/delivery-areas.geojson');if (!response.ok) throw new Error('Map data');
      const data = await response.json();
      const brandGreen = getComputedStyle(document.documentElement).getPropertyValue('--brand-green').trim() || '#79b43e';
      const areas = L.geoJSON(data,{style:{color:'#50772a',weight:1.5,fillColor:brandGreen,fillOpacity:.2},onEachFeature(feature,layer) {
        layer.bindTooltip(escape(feature.properties.name),{sticky:true});
        const popup=document.createElement('div');popup.className='coverage-popup';popup.innerHTML=`<strong>${escape(feature.properties.name)}</strong><span>Rozvoz z Jistebníku · zdarma</span>`;layer.bindPopup(popup);
        layer.on('mouseover',()=>layer.setStyle({fillOpacity:.4,weight:2}));layer.on('mouseout',()=>layer.setStyle({fillOpacity:.2,weight:1.5}));
      }}).addTo(state.map);
      L.marker([49.7534022,18.1287856],{icon:L.divIcon({className:'pizzeria-pin',html:'<span>π</span>',iconSize:[34,34]}),title:'PiPizza · Jistebník 181'}).addTo(state.map).bindTooltip('PiPizza Jistebník',{permanent:true,direction:'bottom'});
      state.bounds=areas.getBounds();
      state.map.fitBounds(state.bounds,{padding:[18,18]});
      coverage={...state,areas};return coverage;
    })().catch(() => {
      document.querySelector('#coverage-status').textContent='Hranice se nepodařilo načíst. Kliknutím na Celá oblast načtení zopakujete.';
      return null;
    }).finally(()=>{loading=null;});
    return loading;
  }
  const homeInput = document.querySelector('#coverage-address');
  const homeStatus = document.querySelector('#coverage-status');
  let selectionRevision = 0;
  bindAddress({input:homeInput,results:document.querySelector('#coverage-results'),clear:document.querySelector('#coverage-clear'),status:homeStatus,
    onSelect: async address => {const request=++selectionRevision;await initCoverage();if(request!==selectionRevision)return;showAddress(container,address);homeStatus.textContent='Sem vám pizzu přivezeme zdarma · '+address.label;},
    onInvalidate:()=>{selectionRevision++;const state=maps.get(container);if(state?.marker){state.marker.remove();state.marker=null;}if(coverage)coverage.map.fitBounds(coverage.areas.getBounds(),{padding:[18,18]});}
  });
  const observer = new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){void initCoverage();observer.disconnect();}},{rootMargin:'300px'});observer.observe(container);
  document.querySelector('#coverage-reset').addEventListener('click',async()=>{const state=await initCoverage();if(state)state.map.fitBounds(state.areas.getBounds(),{padding:[18,18]});});
  const fullscreen = document.querySelector('#coverage-fullscreen');
  let modal, placeholder;
  fullscreen.addEventListener('click',async()=>{
    await initCoverage(); const shell=document.querySelector('.coverage-shell');
    if (modal?.open) {modal.close();return;}
    if(!modal){modal=document.createElement('dialog');modal.className='coverage-modal';modal.setAttribute('aria-label','Mapa rozvozu');document.body.append(modal);modal.addEventListener('close',()=>{placeholder.replaceWith(shell);fullscreen.textContent='Zvětšit ↗';fullscreen.setAttribute('aria-label','Zvětšit mapu na celou obrazovku');fullscreen.focus({preventScroll:true});});}
    placeholder=document.createElement('div');shell.replaceWith(placeholder);modal.append(shell);modal.showModal();fullscreen.textContent='Zavřít ×';fullscreen.setAttribute('aria-label','Zavřít mapu');fullscreen.focus();
  });
})(window);
