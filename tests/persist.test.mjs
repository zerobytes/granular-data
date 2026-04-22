import test from 'node:test';
import assert from 'node:assert/strict';
import { persistedSignal, persistedState, indexedDbAdapter, whenReady } from '../src/persist.js';
import 'fake-indexeddb/auto';

function memoryAdapter() {
  const store = new Map();
  return {
    name: 'memory',
    async get(k) { return store.has(k) ? store.get(k) : undefined; },
    async set(k, v) { store.set(k, v); },
    async remove(k) { store.delete(k); },
    _store: store,
  };
}

test('persistedSignal: writes through to adapter on change', async () => {
  const adapter = memoryAdapter();
  const sig = persistedSignal('count', 0, { adapter });
  await whenReady(sig);
  sig.set(5);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(adapter._store.get('count'), 5);
});

test('persistedSignal: hydrates from stored value', async () => {
  const adapter = memoryAdapter();
  await adapter.set('seed', 42);
  const sig = persistedSignal('seed', 0, { adapter });
  await whenReady(sig);
  assert.equal(sig.get(), 42);
});

test('persistedState: persists object snapshots', async () => {
  const adapter = memoryAdapter();
  const st = persistedState('user', { name: 'A' }, { adapter });
  await whenReady(st);
  st.set({ name: 'B' });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(adapter._store.get('user').name, 'B');
});

test('indexedDbAdapter: get/set/remove round-trip', async () => {
  const adapter = indexedDbAdapter({ dbName: 'gtest-' + Date.now() });
  await adapter.set('a', { hi: 1 });
  const v = await adapter.get('a');
  assert.deepEqual(v, { hi: 1 });
  await adapter.remove('a');
  const empty = await adapter.get('a');
  assert.equal(empty, undefined);
});
