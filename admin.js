(function () {
  'use strict';
  const model = window.PiPizzaAdmin;
  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('cs-CZ', {style:'currency', currency:'CZK', maximumFractionDigits: Number.isInteger(value) ? 0 : 2}).format(value);
  const dateLabel = date => new Intl.DateTimeFormat('cs-CZ', {day:'numeric', month:'numeric', year:'numeric', timeZone:'UTC'}).format(new Date(date));
  const shortDate = date => new Intl.DateTimeFormat('cs-CZ', {day:'numeric', month:'numeric', timeZone:'UTC'}).format(new Date(date));
  const storageKey = 'pipizza-admin-demo-v1';
  let state = model.createState();
  let selectedDate = model.DEMO_DATE;
  let confirmAction = null;
  let storageAvailable = true;
  try { state = model.restoreState(JSON.parse(localStorage.getItem(storageKey))); } catch (_) { storageAvailable = false; }

  function status(message, error = false) {
    $('admin-status').textContent = message;
    $('admin-status').classList.toggle('error', error);
    $('admin-status').hidden = false;
  }
  function persist(message) {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    status(storageAvailable ? message : `${message} Prohlížeč nepovolil uložení; změna platí jen do obnovení stránky.`);
  }
  function summaryLine(label, value, total = false) {
    return `<div class="closure-line${total ? ' total' : ''}"><dt>${label}</dt><dd>${value}</dd></div>`;
  }
  function render() {
    const day = model.summarize(selectedDate);
    const received = model.receipts(selectedDate, state);
    const debts = model.outstanding(selectedDate, state);
    const closed = state.closures[selectedDate];
    const debtTotal = debts.reduce((sum, row) => sum + row.amount, 0);
    const periods = [['day', 'Denní tržba'], ['two-days', 'Dvoudenní tržba'], ['month', 'Měsíční tržba']];
    $('revenue-cards').innerHTML = periods.map(([period, label]) => {
      const report = model.summarize(selectedDate, period);
      const range = report.from === report.to ? dateLabel(report.to) : `${shortDate(report.from)} – ${dateLabel(report.to)}`;
      return `<article class="kpi-card"><p class="kpi-label">${label}</p><p class="kpi-value">${money(report.total)}</p><p class="kpi-meta"><span>${range}</span><span class="kpi-orders">${report.count} objednávek</span></p></article>`;
    }).join('');
    $('daily-date').textContent = shortDate(selectedDate);
    const cancelled = model.ORDERS.filter(order => order.date === selectedDate && order.status === 'cancelled').length;
    $('daily-metrics').innerHTML = [[day.count, 'Dokončené objednávky'], [money(Math.round(day.average)), 'Průměrná objednávka'], [cancelled, 'Stornované objednávky']].map(([value, label]) => `<div class="daily-metric"><strong>${value}</strong><span>${label}</span></div>`).join('');
    $('fulfillment').innerHTML = `<div class="fulfillment-labels"><span>Rozvoz <strong>${day.delivery} objednávek</strong></span><span>Vyzvednutí <strong>${day.pickup} objednávek</strong></span></div><div class="fulfillment-bar" aria-hidden="true"><span style="width:${day.count ? day.delivery / day.count * 100 : 0}%"></span></div>`;
    $('recent-orders').innerHTML = model.ORDERS.filter(order => order.date === selectedDate).sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5).map(order => {
      const unpaid = debts.some(debt => debt.id === order.id);
      const text = order.status === 'cancelled' ? 'Storno' : unpaid ? 'Neuhrazeno' : 'Uhrazeno';
      const css = order.status === 'cancelled' ? ' cancelled' : unpaid ? ' unpaid' : '';
      return `<tr><td><strong>${order.id}</strong><small>${order.time} · ${order.fulfillment === 'delivery' ? 'Rozvoz' : 'Vyzvednutí'}</small></td><td><span class="order-status${css}">${text}</span></td><td class="align-right"><strong>${money(order.amount)}</strong></td></tr>`;
    }).join('');
    $('received-total').textContent = money(received.total);
    const symbols = {cash:'Kč', card:'▰', qr:'▦', online:'↗'};
    $('payment-list').innerHTML = Object.entries(model.METHODS).map(([method, label]) => `<div class="payment-row"><div class="payment-row-head"><span class="payment-label"><span class="payment-mark" aria-hidden="true">${symbols[method]}</span>${label}</span><strong>${money(received.byMethod[method])}</strong></div><div class="payment-bar" aria-hidden="true"><span style="width:${received.total ? received.byMethod[method] / received.total * 100 : 0}%"></span></div></div>`).join('');
    const todaysDebt = debts.filter(order => order.date === selectedDate).reduce((sum, row) => sum + row.amount, 0);
    $('payment-note').innerHTML = `Z dnešních objednávek zbývá uhradit <strong>${money(todaysDebt)}</strong>.<br>Inkaso starších dluhů: <strong>${money(received.debtReceived)}</strong>.<br>Online zahrnuje platby přes platební bránu. Poplatek za platbu kartou je 0 Kč.`;
    $('debt-nav-count').textContent = debts.length;
    $('debt-total').textContent = money(debtTotal);
    const blockedByClosure = Object.keys(state.closures).some(date => date >= selectedDate);
    $('debt-list').innerHTML = debts.length ? debts.map(order => {
      const paidLater = Boolean(state.settlements[order.id]);
      const disabled = blockedByClosure || paidLater;
      const caption = paidLater ? `Uhrazeno ${shortDate(state.settlements[order.id].date)}` : blockedByClosure ? 'Den je uzavřený' : 'Zapsat úhradu';
      return `<div class="debt-row"><span class="debt-icon" aria-hidden="true">!</span><div class="debt-order"><strong>${order.id}</strong><small>Objednávka z ${dateLabel(order.date)} · ${order.fulfillment === 'delivery' ? 'rozvoz' : 'vyzvednutí'}</small></div><span class="debt-amount">${money(order.amount)}</span><button type="button" class="button button-outline" data-settle="${order.id}" ${disabled ? 'disabled' : ''}>${caption}</button></div>`;
    }).join('') : '<div class="empty-debts"><strong>Všechno je vyrovnané.</strong><p>K vybranému dni neevidujeme žádnou neuhrazenou objednávku.</p></div>';
    $('closure-summary').innerHTML = summaryLine('Tržba dokončených objednávek', money(day.total)) + summaryLine('Přijaté platby celkem', money(received.total)) + summaryLine('Z toho inkaso starších dluhů', money(received.debtReceived)) + summaryLine('Dluhy celkem k tomuto dni', money(debtTotal)) + summaryLine('Očekávaná hotovost', money(received.byMethod.cash), true);
    $('closure-tag').textContent = closed ? `Uzavřeno v ukázce · ${dateLabel(selectedDate)}` : 'Čeká na uzavření';
    $('closure-tag').classList.toggle('saved', Boolean(closed));
    $('closure-form').hidden = Boolean(closed);
    $('saved-closure').hidden = !closed;
    if (closed) $('saved-closure').innerHTML = `<div class="saved-box"><strong>Uzávěrka je uložená v této ukázce.</strong><p>Skutečná hotovost: ${money(closed.countedCash)}<br>Rozdíl proti přehledu: ${money(closed.cashDifference)}<br>Žádná data nebyla odeslána do účetnictví.</p></div>`;
    updateCashDifference();
  }
  function updateCashDifference() {
    const value = $('counted-cash').value;
    const amount = Number(value);
    const difference = Math.round((amount - model.receipts(selectedDate, state).byMethod.cash) * 100) / 100;
    $('cash-difference').textContent = value === '' || !Number.isFinite(amount) || amount < 0 ? '' : difference === 0 ? 'Hotovost souhlasí s přehledem.' : `Rozdíl proti přehledu: ${difference > 0 ? '+' : ''}${money(difference)}`;
    $('cash-difference').classList.toggle('mismatch', value !== '' && difference !== 0);
  }
  function openAction(title, body, button, callback) {
    $('action-title').textContent = title;
    $('action-body').innerHTML = body;
    $('action-confirm').textContent = button;
    confirmAction = callback;
    $('action-dialog').showModal();
  }
  $('report-date').addEventListener('change', event => {
    const date = event.target.value;
    try { model.summarize(date); }
    catch (error) { event.target.value = selectedDate; status(error.message, true); return; }
    selectedDate = date;
    $('counted-cash').value = '';
    $('admin-status').hidden = true;
    render();
  });
  $('debt-list').addEventListener('click', event => {
    const button = event.target.closest('[data-settle]');
    if (!button || button.disabled) return;
    const order = model.ORDERS.find(order => order.id === button.dataset.settle);
    if (!order) return;
    const methodOptions = Object.entries(model.METHODS).filter(([method]) => method !== 'online').map(([method, label]) => `<option value="${method}">${label}</option>`).join('');
    openAction('Zapsat úhradu dluhu', `<p>Objednávka <strong>${order.id}</strong><br>Částka <strong>${money(order.amount)}</strong></p><p>Úhrada se připíše k <strong>${dateLabel(selectedDate)}</strong> pouze v této ukázce.</p><label>Způsob úhrady<select id="settlement-method">${methodOptions}</select></label>`, 'Zapsat ukázkovou úhradu', () => {
      state = model.settleDebt(state, order.id, selectedDate, $('settlement-method').value);
      persist(`Ukázková úhrada ${order.id} ve výši ${money(order.amount)} byla zapsána k ${dateLabel(selectedDate)}.`);
    });
  });
  $('counted-cash').addEventListener('input', updateCashDifference);
  $('closure-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!$('closure-form').reportValidity()) return;
    const cash = Number($('counted-cash').value);
    let preview;
    try { preview = model.closeDay(state, selectedDate, cash).closures[selectedDate]; }
    catch (error) { status(error.message, true); return; }
    openAction('Uzavřít tento den?', `<p>Kontrola dne <strong>${dateLabel(selectedDate)}</strong>. Uloženou uzávěrku nelze v ukázce upravovat.</p><dl class="dialog-summary">${summaryLine('Dokončené objednávky', preview.count)}${summaryLine('Denní tržba', money(preview.revenue))}${summaryLine('Přijaté platby', money(preview.received))}${summaryLine('Očekávaná hotovost', money(preview.expectedCash))}${summaryLine('Skutečná hotovost', money(preview.countedCash))}${summaryLine('Rozdíl hotovosti', money(preview.cashDifference), true)}</dl>${preview.cashDifference ? '<p class="dialog-warning">Hotovost se liší od očekávané částky. Zkontrolujte ji, nebo potvrďte ukázkovou uzávěrku s tímto rozdílem.</p>' : ''}<p class="small">Potvrzení uloží pouze místní ukázku. Neprovede účetní operaci.</p>`, 'Uložit ukázkovou uzávěrku', () => {
      state = model.closeDay(state, selectedDate, cash);
      persist(`Uzávěrka ${dateLabel(selectedDate)} byla uložena v této ukázce.`);
    });
  });
  $('reset-demo').addEventListener('click', () => {
    openAction('Obnovit ukázková data?', '<p>Smažou se jen úhrady a uzávěrky, které jste vytvořili v této ukázce. Původní smyšlené objednávky zůstanou.</p>', 'Obnovit ukázku', () => {
      state = model.createState();
      $('counted-cash').value = '';
      persist('Ukázkové úhrady a uzávěrky byly obnoveny do výchozího stavu.');
    });
  });
  $('action-cancel').addEventListener('click', () => $('action-dialog').close());
  $('action-dialog').addEventListener('close', () => { confirmAction = null; });
  $('action-confirm').addEventListener('click', () => {
    if (!confirmAction) return;
    try { confirmAction(); render(); }
    catch (error) { status(error.message, true); }
    $('action-dialog').close();
  });
  render();
  if (!storageAvailable) status('Místní úložiště není dostupné. Ukázkové změny platí jen do obnovení stránky.');
})();
