const assert = require('assert');
const { add } = require('./history');

let l = add([], { type: 'text', text: 'a' });
l = add(l, { type: 'text', text: 'b' });
assert.deepStrictEqual(l.map(e => e.text), ['b', 'a'], 'newest first');
assert.strictEqual(add(l, { type: 'text', text: 'b' }).length, 2, 'duplicate of top dropped');
let big = [];
for (let i = 0; i < 60; i++) big = add(big, { type: 'text', text: String(i) }, 50);
assert.strictEqual(big.length, 50, 'capped');
assert.strictEqual(big[0].text, '59');
console.log('ok');

// reminders
const { dueReminders } = require('./reminders');
const now = new Date(2026, 10, 27, 9, 0); // 27 Nov 2026, 09:00 local
const at = (h, m) => new Date(2026, 10, 27, h, m).toISOString();
const items = [
  { id: 'e1', kind: 'event', title: 'Standup', start: at(9, 10) },
  { id: 'e2', kind: 'event', title: 'Lunch', start: at(12, 0) },
  { id: 'e3', kind: 'event', title: 'Started', start: at(8, 30) },
  { id: 'e4', kind: 'event', title: 'Holiday', date: '2026-11-27' },
  { id: 't1', kind: 'task', title: 'Essay', date: '2026-11-27' },
  { id: 't2', kind: 'task', title: 'Report', date: '2026-11-28' },
  { id: 't3', kind: 'task', title: 'Late', date: '2026-11-20' },
  { id: 't4', kind: 'task', title: 'Later', date: '2026-12-05' },
];
const shownSet = new Set();
const got = dueReminders(items, now, shownSet);
assert.deepStrictEqual(got.map((r) => `${r.label}: ${r.title}`),
  ['In 10 min: Standup', 'Today: Holiday', 'Due today: Essay', 'Due tomorrow: Report', 'Overdue: Late']);
got.forEach((r) => shownSet.add(r.key));
assert.strictEqual(dueReminders(items, new Date(+now + 60000), shownSet).length, 0, 'each reminder fires once');
console.log('reminders ok');
