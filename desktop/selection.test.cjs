const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Selection } = require('./selection.cjs');
test('multiple E87 badges are listed; only a currently offered device can be chosen', () => {
  const views = []; const selected = [];
  const chooser = new Selection(value => views.push(value));
  chooser.update([{deviceId:'A',deviceName:'E87'},{deviceId:'B',deviceName:'E87'}], id => selected.push(id));
  assert.equal(selected.length, 0);
  assert.equal(views[0].devices.length, 2);
  assert.equal(chooser.finish(1, 'OTHER'), false);
  assert.equal(chooser.finish(1, 'B'), true);
  assert.deepEqual(selected, ['B']);
  assert.equal(chooser.finish(1, 'A'), false);
});
test('scan refresh, cancellation and stale response across requests', () => {
  const selected = []; const chooser = new Selection(() => {});
  chooser.update([{deviceId:'A',deviceName:'E87'}], id => selected.push(id));
  chooser.update([{deviceId:'B',deviceName:'E87'}], id => selected.push(id));
  assert.equal(chooser.finish(1, 'A'), false);
  chooser.cancel(); chooser.cancel();
  chooser.update([{deviceId:'B',deviceName:'E87'}], id => selected.push(id));
  assert.equal(chooser.finish(1, 'B'), false);
  chooser.finish(2, 'B');
  assert.deepEqual(selected, ['', 'B']);
});
test('scan timeout cancels callback once', async () => {
  const selected = []; const chooser = new Selection(() => {}, 10);
  chooser.update([], id => selected.push(id));
  await new Promise(resolve => setTimeout(resolve, 25));
  chooser.cancel();
  assert.deepEqual(selected, ['']);
});
