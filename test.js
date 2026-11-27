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
