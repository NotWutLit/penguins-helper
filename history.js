// Newest first, skip a repeat of the top entry, keep at most `max`.
function add(list, entry, max = 50) {
  const top = list[0];
  if (top && top.type === entry.type && top.text === entry.text && top.path === entry.path) return list;
  return [entry, ...list].slice(0, max);
}
module.exports = { add };
