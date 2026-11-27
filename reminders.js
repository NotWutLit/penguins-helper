// Decides which reminders should show right now. Pure so it can be tested.
// items: { id, kind: 'event' | 'task', title, start?: ISO datetime, date?: 'YYYY-MM-DD' }
const LEAD_MS = 15 * 60 * 1000;

const localDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function dueReminders(items, now, shown) {
  const today = localDate(now);
  const tomorrow = localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const out = [];
  for (const it of items) {
    let label = null;
    if (it.start) {
      const ms = new Date(it.start) - now;
      if (ms > 0 && ms <= LEAD_MS) label = `In ${Math.ceil(ms / 60000)} min`;
    } else if (it.date && it.kind === 'task') {
      if (it.date < today) label = 'Overdue';
      else if (it.date === today) label = 'Due today';
      else if (it.date === tomorrow) label = 'Due tomorrow';
    } else if (it.date === today) {
      label = 'Today';
    }
    // One reminder per item and label, so "Due tomorrow" can still be followed by "Due today".
    const key = `${it.id}|${label && label.startsWith('In ') ? 'soon' : label}`;
    if (label && !shown.has(key)) out.push({ key, label, title: it.title });
  }
  return out;
}

module.exports = { dueReminders, localDate };
