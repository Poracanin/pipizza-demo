const test = require('node:test');
const assert = require('node:assert/strict');
const {openingStatus} = require('../verze-2/checkout-model.js');
const status = time => openingStatus(Date.parse(time));

test('opening switches at the exact Prague opening and closing second', () => {
  const before = status('2026-10-07T12:59:59Z');
  assert.equal(before.isOpen, false);
  assert.equal(before.remainingSeconds, 1);
  const open = status('2026-10-07T13:00:00Z');
  assert.equal(open.isOpen, true);
  assert.equal(open.todayHours, '15:00–21:54');
  assert.equal(open.remainingSeconds, 6 * 3600 + 54 * 60);
  const lastSecond = status('2026-10-07T19:53:59Z');
  assert.equal(lastSecond.isOpen, true);
  assert.equal(lastSecond.remainingSeconds, 1);
  const closed = status('2026-10-07T19:54:00Z');
  assert.equal(closed.isOpen, false);
  assert.equal(new Date(closed.nextChange).toISOString(), '2026-10-08T13:00:00.000Z');
});

test('weekend schedules and the Sunday to Monday transition use the right day', () => {
  for (const day of ['09', '10']) {
    const result = status(`2026-10-${day}T21:30:00Z`);
    assert.equal(result.isOpen, true);
    assert.equal(result.todayHours, '11:00–23:54');
    assert.equal(result.remainingSeconds, 24 * 60);
  }
  assert.equal(status('2026-10-11T09:00:00Z').isOpen, true);
  const sunday = status('2026-10-11T19:54:00Z');
  assert.equal(sunday.isOpen, false);
  assert.equal(sunday.todayHours, '11:00–21:54');
  assert.equal(new Date(sunday.nextChange).toISOString(), '2026-10-12T13:00:00.000Z');
});

test('midnight and a year boundary retain the next opening', () => {
  const before = status('2026-12-31T22:59:59Z');
  const after = status('2026-12-31T23:00:00Z');
  assert.equal(before.nextChange, after.nextChange);
  assert.equal(before.remainingSeconds - after.remainingSeconds, 1);
  assert.equal(new Date(after.nextChange).toISOString(), '2027-01-01T10:00:00.000Z');
  assert.equal(after.todayHours, '11:00–23:54');
});

test('overnight countdown handles both Prague daylight-saving changes', () => {
  const spring = status('2026-03-28T22:54:00Z');
  assert.equal(new Date(spring.nextChange).toISOString(), '2026-03-29T09:00:00.000Z');
  assert.equal(spring.remainingSeconds, 10 * 3600 + 6 * 60);
  const autumn = status('2026-10-24T21:54:00Z');
  assert.equal(new Date(autumn.nextChange).toISOString(), '2026-10-25T10:00:00.000Z');
  assert.equal(autumn.remainingSeconds, 12 * 3600 + 6 * 60);
});

test('countdown is derived from absolute time and never shows zero before a change', () => {
  const start = Date.parse('2026-10-07T19:53:58Z');
  assert.equal(openingStatus(start + 1750).remainingSeconds, 1);
  assert.equal(openingStatus(start + 2000).isOpen, false);
  const resumed = openingStatus(start + 3600000);
  assert.equal(resumed.remainingSeconds, Math.ceil((resumed.nextChange - start - 3600000) / 1000));
  for (const invalid of [NaN, Infinity, '2026-10-07']) assert.throws(() => openingStatus(invalid));
});
